function Instrument(audioContext, serializedInstrument) {
    var instrument = this;
    instrument.instrument = {};
    this.audioContext = audioContext;

    var instrumentGain = audioContext.createGain();
    instrumentGain.gain.value = 0;
    instrumentGain.connect(audioContext.destination);
    instrument.serialize = function() {
        var obj = {};
        for (var nodeId in instrument.instrument) {
            obj[nodeId] = instrument.instrument[nodeId].serialize();
        }
        return obj;
    }
    instrument.newNode = function(type) {
        var nodeId = Math.random().toString(32).substr(2);
        instrument.instrument[nodeId] = new NodeTypes[type](nodeId);
    }
    instrument.deleteNode = function(nodeId) {
        instrument.instrument[nodeId].kill();
        delete instrument.instrument[nodeId];
    }
    instrument.kill = function() {
        for (var nodeId in instrument.instrument) {
            instrument.deleteNode(nodeId);
        }
    }
    instrument.fromSerialized = function(si) {
        instrument.kill();
        si = si || {
            "AudioContext": {type: "AudioContext", params: {}, connections: {}}
        }
        for (var nodeId in si) {
            var sn = si[nodeId] //serializedNode
            instrument.instrument[nodeId] = new NodeTypes[sn.type](nodeId, sn.params)
        }
        for (var nodeId in si) {
            instrument.instrument[nodeId].setConnections(si[nodeId].connections);
        }
        instrument.instrument.AudioContext.gain.connect(audioContext.destination);
    }


    instrument.fromSerialized(serializedInstrument);

    function Node(serializedParams, type, id) {
        this.type = type;
        this.id = id;
        this.ins = {};
        this.outs = {};
        this.audioNodes = [];
        this.connections = {};
        this.params = new Params(serializedParams);
    }
    Node.prototype = {
        serlialize: function() {
            var obj = {
                type: type,
                params: this.params.serialize(),
                connections: connections
            }
            return obj;
        },
        setConnections: function(connections) {
            this.connections = connections;
            for (var sourceEndName in this.connections) {
                var sourceEndConnections = this.connections[sourceEndName];
                for (var i = 0; i < sourceEndConnections.length; i++) {
                    var destinationEndName = sourceEndConnections[i];
                    destinationEndName = destinationEndName.split("_");
                    var destinationId = destinationEndName[0];
                    destinationEndName = destinationEndName[1];
                    this.connect(sourceEndName, destinationId, destinationEndName, true)
                }
            }
        },
        connect: function(sourceEndName, destinationId, destinationEndName, connectAll) {
            var destination = instrument.instrument[destinationId];

            var destinationEnd = destination.ins[destinationEndName];

            var sourceEnd = this.in[sourceEndName];
            destinationEndName = destinationId + "_" + destinationEndName;
            try {
                if (destination.type !== "Visualizer" || instrument.graphical) {
                    sourceEnd.connect(destinationEnd);
                }
                if (!connectAll) {
                    if (!this.connections[sourceEndName]) {
                        this.connections[sourceEndName] = [];
                    }
                    this.connections[sourceEndName].push(destinationEndName);
                }
            } catch (err) {
                sourceEndName = this.id + "_" + sourceEndName;
                console.log("cannot connect " + sourceEndName + " to " + destinationEndName + ".  ", err);
            }

        },
        disconnect: function(sourceEndName, destinationId, destinationEndName) {
            if (sourceEndName) {
                var sourceEnd = this.ins[sourceEndName];
                destinationEndName = destinationId + "_" + destinationEndName;
                var outputNumber = this.connections.ins[sourceEndName].indexOf(destinationEndName);
                try {
                    sourceEnd.disconnect(outputNumber);
                    this.connections[sourceEndName].splice(outputNumber, 1);
                } catch (err) {
                    sourceEndName = this.id + "_" + sourceEndName;
                    console.log("cannot disconnect " + sourceEndName + " from " + destinationEndName + ".  ", err);
                }
            } else {
                for (var endKey in this.outs) {
                    this.outs[endKey].disconnect();
                }
                for (var i = 0; i < this.audioNodes.length; i++) {
                    this.audioNodes[i].disconnect();
                }
            }
        },
        kill: function() {
            this.disconnect();
        },
        updateParams: function() {

        },
        play: function(freq, start, stop) {

        },
        getParamVal: function(freq, paramName) {
            return this.params.getParamVal(freq, paramName);
        }
    };
    var NodeTypes = {
        //we want to be able to create a new node.
        //we want to be able to create a node from a params object.
        //we want to be able to create a params object from a string.
        //we want to be able to boil a params object down to a string.
        AudioContext: function(id, serializedParams) {
            var node = new Node({t: {}, p: {}}, "AudioContext", "AudioContext");
            var gain = audioContext.createGain();
            gain.value = 0;
            node.ins.destination = gain;
            node.gain = gain;
            return node;
        },
        Carrier: function(id, serializedParams) {
            serializedParams = serializedParams || {
                t: {
                    Frequency: "fp",
                    "Wave Type": "w"
                },
                p: {
                    Frequency: {t: "d", f: "f", c: 0, d: 0},
                    "Wave Type": "sine"
                }
            }
            var node = new Node(serializedParams, "Carrier", id);
            node.params.hints = {
                Frequency: "The frequency of the oscillator.",
                "Wave Type": "The wave type of the oscillator."
            }
            var car = audioContext.createOscillator();
            car.start(0);
            node.play = function(freq, start) {
                car.frequency.setValueAtTime(node.getParamVal(freq, "Pitch"), start);
            }
            node.updateParams = function() {
                var freq = curFreq();
                car.type = node.getParamVal[freq, "Wave Type"];
                car.frequency.setValueAtTime(node.getParamVal(freq, "Pitch"), audioContext.currentTime);
            }
            node.kill = function() {
                car.stop();
                node.disconnect();
            }
            node.outs.out = car;
            node.ins.frequency = car.frequency;
            node.updateParams();
            return node;
        },
        Modulator: function(id, serializedParams) {
            serializedParams = serializedParams || {
                t: {
                    Frequency: "fp",
                    "Wave Type": "w",
                    Beta: "n",
                },
                p: {
                    Frequency: {t: "d", f: "f", c: 0, d: 0},
                    "Wave Type": "sine",
                    Beta: 3
                }
            }
            var node = new Node(serializedParams, "Modulator", id);
            node.params.hints = {
                Frequency: "The frequency of the modulator.",
                "Wave Type": "The wave type of the modulator.",
                Beta: "The index of modulation of the modulator.",
            }
            var mod = new NodeTypes.Carrier(serializedParams);
            var beta = new NodeTypes.Beta(serializedParams);
            mod.out.connect(beta.in);
            node.play = function(freq, start) {
                mod.play(freq, start);
                beta.play(freq, start);
            };
            node.kill = function() {
                mod.kill();
                beta.kill();
            };
            node.updateParams = function() {
                mod.updateParams();
                beta.updateParams();
            }
            node.outs.out = mod.out;
            node.ins.frequency = mod.frequency;
            node.outs.betaOut = beta.out;
            node.ins.betaGain = beta.gainIn;
            node.audioNodes.push(mod, beta);
            node.updateParams();
            return node;
        },
        Envelope: function(id, serializedParams) {
            serializedParams = serializedParams || {
                t: {
                    "Attack Duration": "fp",
                    "Attack Level": "fp",
                    "Decay Duration": "fp",
                    "Sustain Level": "fp",
                    "Release Duration": "fp"
                },
                p: {
                    "Attack Duration": {t: "c", f: "0", c: 0.005, d: 0},
                    "Attack Level": {t: "c", f: "0", c: 1, d: 0},
                    "Decay Duration": {t: "f", f: "440 / f / 4", c: 0.25, d: 0},
                    "Sustain Level": {t: "c", f: "0", c: 0, d: 0},
                    "Release Duration": {t: "c", f: "0", c: 0.1, d: 0}
                }
            }
            var node = new Node(serializedParams, "Envelope", id);
            node.params.hints = {
                "Attack Duration": "How long the attack phase lasts in seconds.",
                "Attack Level": "How loud the sound gets in the attack phase.  Usually 0 to 1.",
                "Decay Duration": "How long the decay phase lasts in seconds.",
                "Sustain Level": "The volume to which the sound decays. Usually 0 to 1.",
                "Release Duration": "How long the releasePhase phase lasts in seconds."
            }
            var envGain = audioContext.createGain();
            var releaseGain = audioContext.createGain();
            envGain.connect(releaseGain);
            node.play = function(freq, start, stop) {
                envGain.gain.setValueAtTime(0, start);
                envGain.gain.linearRampToValueAtTime(node.getParamVal(freq, "Attack Level"), start + node.getParamVal(freq, "Attack Duration"));
                envGain.gain.setTargetAtTime(node.getParamVal(freq, "Sustain Level"), start + node.getParamVal(freq, "Attack Duration"), node.getParamVal(freq, "Decay Duration"));
                envGain.gain.setValueAtTime(0, stop);

                var releaseAt = stop - node.getParamVal(freq, "Release Duration");
                releaseGain.gain.setValueAtTime(1, start);
                releaseGain.gain.setValueAtTime(1, releaseAt);
                releaseGain.gain.linearRampToValueAtTime(0, stop);
            }
            node.ends.in = envGain;
            node.ends.out = releaseGain;
            node.updateParams();
            return node;
        },
        Beta: function(id, serializedParams) {
            //This isn't going to work like its supposed to.  If I'm using modulation index,
            //then value of gain should be function of frequency of carrier.  But I currently
            //I set the value of the gain to a function of the frequency of the note.
            serializedParams = serializedParams || {
                t: {
                    Beta: "n"
                },
                p: {
                    Beta: 3
                }
            }
            var node = new Node(serializedParams, "Beta", id);
            node.params.hints = {
                Beta: "Index of modulation"
            }
            var beta = audioContext.createGain();
            node.play = function(freq, start) {
                beta.gain.setValueAtTime(freq * node.getParamVal(freq, "Beta"), start);
            }
            node.updateParams = function() {
                var freq = curFreq();
                beta.gain.setValueAtTime(freq * node.getParamVal(freq, "Beta"), audioContext.currentTime)
            }
            node.ends.out = beta;
            node.ends.in = beta;
            node.ends.gainIn = beta.gain;
            node.updateParams();
            return node;
        },
        "Biquad Filter": function(id, serializedParams) {
            serializedParams = serializedParams || {
                t: {
                    Type: "ft",
                    Frequency: "fp",
                    Q: "fp",
                    Gain: "fp",
                },
                p: {
                    Type: "lowpass",
                    Frequency: {t: "d", f: "f", c: 0, d: 0},
                    Q: {t: "c", f: "f", c: 1, d: 0},
                    Gain: {t: "c", f: "f", c: 1, d: 0},
                }
            }
            var node = new Node(serializedParams, "Biquad Filter", id);

            var biquad = audioContext.createBiquadFilter();
            node.play = function(freq, start) {
                biquad.frequency.setValueAtTime(node.getParamVal(freq, "Frequency"), start);
            }
            node.updateParams = function() {
                var freq = curFreq();
                biquad.type = node.getParamVal[freq, "Type"];
                biquad.q.setValueAtTime(node.getParamVal[freq, "Q"], audioContext.currentTime)
                biquad.gain.setValueAtTime(node.getParamVal[freq, "Gain"], audioContext.currentTime)
            }

            node.outs.out = biquad;
            node.ins.in = biquad;
            node.ins.frequency = biquad.frequency;
            node.ins.q = biquad.q;
            node.ins.gain = biquad.gain;
            node.updateParams();
            return node;
        },
        Visualizer: function(id, serializedParams) {
            serializedParams = serializedParams || {
                t: {
                },
                p: {
                }
            }
            var node = new Node(serializedParams, "Visualizer", id);

            var analyser = audioContext.createAnalyser();
            analyser.fftSize = 2048;
            var bufferLength = analyser.fftSize;
            var dataArray = new Uint8Array(bufferLength);

            node.play = function(freq, start, stop) {
                var delay = start - audioContext.currentTime;
                window.setTimeout(delay / 1000 + 10, draw);
            }
            function draw() {
                var canvas = $("#waveCanvas_" + id);
                if (canvas.length > 0) {
                    canvas = canvas[0];
                    var canvasCtx = canvas.getContext("2d");
                    var WIDTH = canvas.width;
                    var HEIGHT = canvas.height;
                    canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);
                    analyser.getByteTimeDomainData(dataArray);
                    canvasCtx.fillStyle = 'rgb(200, 200, 200)';
                    canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);
                    canvasCtx.lineWidth = 2;
                    canvasCtx.strokeStyle = 'rgb(0, 0, 0)';
                    canvasCtx.beginPath();
                    var sliceWidth = WIDTH * 1.0 / bufferLength;
                    var x = 0;
                    for (var i = 0; i < bufferLength; i++) {
                        var v = dataArray[i] / 128.0;
                        var y = v * HEIGHT / 2;
                        if (i === 0) {
                            canvasCtx.moveTo(x, y);
                        } else {
                            canvasCtx.lineTo(x, y);
                        }
                        x += sliceWidth;
                    }
                    canvasCtx.lineTo(canvas.width, canvas.height / 2);
                    canvasCtx.stroke();
                }
            }
            node.ins.in = analyser;
            node.updateParams();
            return node;
        }

    }
    instrument.nodeTypes = NodeTypes;

    var queuedFreqs = [];
    function trimQueuedFreqs() {
        var time = audioContext.currentTime;
        var i = 0;
        while (i < queuedFreqs.length && queuedFreqs[i][0] < time) {
            i++;
        }
        i--;
        queuedFreqs.splice(0, i)
    }
    function curFreq() {
        trimQueuedFreqs();
        return queuedFreqs[0] ? queuedFreqs[0][1] : 440;

    }
    instrument.play = function(freq, start, stop, level) {
        trimQueuedFreqs();
        queuedFreqs.push([start, freq]);
        for (var nodeId in instrument.instrument) {
            var node = instrument.instrument[nodeId];
            node.play(start, stop);

        }
        instrumentGain.gain.setValueAtTime(level, start);
        instrumentGain.gain.setValueAtTime(0, stop);
    }

    $(".logNodeTypess").click(function() {
        console.log(instrument.instrument);
    })
    $(".logInstrumentInfo").click(function() {
        console.log(instrumentInfo);
    })
}
