function Instrument(audioContext, serializedInstrument) {
    var instrument = this;

    instrument.serialize = function() {
        var obj = {};
        for (var nodeId in instrument.nodes) {
            obj[nodeId] = instrument.nodes[nodeId].serialize();
        }
        return obj;
    }
    instrument.addNode = function(type, serializedParams) {
        var nodeId = Math.random().toString(32).substr(2);
        var node = new NodeTypes[type](nodeId, serializedParams)
        instrument.nodes[nodeId] = node;
        return node;
    }
    instrument.deleteNode = function(nodeId) {
        instrument.nodes[nodeId].kill();
        delete instrument.nodes[nodeId];
    }
    instrument.kill = function() {
        for (var nodeId in instrument.nodes) {
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
            instrument.nodes[nodeId] = new NodeTypes[sn.type](nodeId, sn.params, true);
            instrument.nodes[nodeId].top = sn.top;
            instrument.nodes[nodeId].left = sn.left;
        }
        for (var nodeId in si) {
            instrument.nodes[nodeId].setConnections(si[nodeId].connections);
        }
        var time = audioContext.currentTime + .02;
        for (var nodeId in si) {
            if (instrument.nodes[nodeId].start) {
                instrument.nodes[nodeId].start(time);
            }
        }

        for (var nodeId in si) {
            instrument.nodes[nodeId].setConnections(si[nodeId].connections);
        }
        instrument.nodes.AudioContext.gain.connect(audioContext.destination);
        console.log("==========")
    }

    var getNodeIn = function(nodeId, inName) {
        return instrument.nodes[nodeId].ins[inName];
    };
    var getNodeOut = function(nodeId, outName) {
        return instrument.nodes[nodeId].outs[outName];
    };

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
        serialize: function() {
            var obj = {
                type: this.type,
                params: this.params.serialize(),
                connections: this.connections,
                top: this.top,
                left: this.left,
            }
            return obj;
        },
        makeConnections: function() {
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
        setConnections: function(connections) {
            this.connections = connections;
            this.makeConnections();
        },
        connect: function(sourceEndName, destinationId, destinationEndName, connectAll) {

            //var destination = instrument.nodes[destinationId];

            var destinationEnd = getNodeIn(destinationId, destinationEndName);//destination.ins[destinationEndName];

            var sourceEnd = this.outs[sourceEndName];
            destinationEndName = destinationId + "_" + destinationEndName;
            try {
                sourceEnd.connect(destinationEnd);
                if (!connectAll) {
                    if (!this.connections[sourceEndName]) {
                        this.connections[sourceEndName] = [];
                    }
                    this.connections[sourceEndName].push(destinationEndName);
                    this.onConnect(sourceEndName, destinationId, destinationEndName, connectAll);
                }
            } catch (err) {
                sourceEndName = this.id + "_" + sourceEndName;
                console.log("cannot connect " + sourceEndName + " to " + destinationEndName + ".  ", err);
            }

        },
        onConnect: function(sourceEndName, destinationId, destinationEndName, connectAll) {

        },
        disconnect: function(sourceEndName, destinationId, destinationEndName) {
            if (sourceEndName) {
                var sourceEnd = this.outs[sourceEndName];
                console.log("disconnect source", sourceEnd)
                destinationEndName = destinationId + "_" + destinationEndName;
                var outputNumber = this.connections[sourceEndName].indexOf(destinationEndName);
                try {
                    sourceEnd.disconnect();
                    this.connections[sourceEndName].splice(outputNumber, 1);
                    this.makeConnections();
                    this.onDisconnect(sourceEndName, destinationId, destinationEndName);
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
        onDisconnect: function(sourceEndName, destinationId, destinationEndName) {

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
        },
        setValueAtTime: function(audioParam, freq, paramName, time) {
            var val = this.getParamVal(freq, paramName);
            audioParam.setValueAtTime(val, time);
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
            gain.gain.value = 0;
            node.ins.destination = gain;
            node.gain = gain;
            node.audioNodes.push(gain);
            return node;
        },
        Oscillator: function(id, serializedParams, waitToStart) {
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
            var node = new Node(serializedParams, "Oscillator", id);
            node.params.hints = {
                Frequency: "The frequency of the oscillator.",
                "Wave Type": "The wave type of the oscillator."
            }
            var car = audioContext.createOscillator();
            if (!waitToStart) {
                car.start(0);
                console.log("oscillator started out of phase")
            }
            node.start = function(time) {
                console.log("late start: ", time < audioContext.currentTime, time - audioContext.currentTime);
                car.start(time);
            }
            node.play = function(freq, start) {
                node.setValueAtTime(car.frequency, freq, "Frequency", start);

                //car.frequency.setValueAtTime(node.getParamVal(freq, "Frequency"), start);
            }

            node.updateParams = function() {
                var freq = curFreq();
                car.type = node.getParamVal(freq, "Wave Type");
                node.setValueAtTime(car.frequency, freq, "Frequency", audioContext.currentTime)
                //car.frequency.setValueAtTime(node.getParamVal(freq, "Frequency"), audioContext.currentTime);
            }
            node.kill = function() {
                car.stop();
                node.disconnect();
            }
            node.outs.out = car;
            node.ins.frequency = car.frequency;
            node.ins.detune = car.detune;
            node.updateParams();
            return node;
        },
        Carrier: function(id, serializedParams, waitToStart) {
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
            if (!waitToStart) {
                car.start(0);
                console.log("oscillator started out of phase")
            }
            node.start = function(time) {
                console.log("late start: ", time < audioContext.currentTime, time - audioContext.currentTime);
                car.start(time);
            }
            node.play = function(freq, start) {
                car.frequency.setValueAtTime(node.getParamVal(freq, "Frequency"), start);
            }
            node.updateParams = function() {
                var freq = curFreq();
                car.type = node.getParamVal(freq, "Wave Type");
                car.frequency.setValueAtTime(node.getParamVal(freq, "Frequency"), audioContext.currentTime);
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
        "Modulation Index": function(id, serializedParams) {
            serializedParams = serializedParams = serializedParams || {
                t: {
                    "Modulation Index": "n"
                },
                p: {
                    "Modulation Index": 3
                }
            }
            var node = new Node(serializedParams, "Modulation Index", id);
            node.params.hints = {
                "Modulation Index": "Index of modulation"
            }
            var beta = audioContext.createGain();
            node.play = function(freq, start) {
                if (!node.connections.out) {
                    node.connections.out = [];
                }
                if (node.connections.out.length > 0) {
                    var destInfo = node.connections.out[0];
                    destInfo = destInfo.split("_");
                    var carrierNode = instrument.nodes[destInfo[0]];
                    var carrierFreq = carrierNode.getParamVal(freq, "Frequency");
                    var gain = node.getParamVal(freq, "Modulation Index") * carrierFreq;
                    beta.gain.setValueAtTime(gain, start);
                    console.log(carrierFreq);
                }

            }
            node.updateParams = function() {
                var freq = curFreq();
                if (!node.connections.out) {
                    node.connections.out = [];
                }
                if (node.connections.out.length > 0) {
                    var destInfo = node.connections.out[0];
                    destInfo = destInfo.split("_");
                    var carrierNode = instrument.nodes[destInfo[0]];
                    var carrierFreq = carrierNode.getParamVal(freq, "Frequency");
                    var gain = node.getParamVal(freq, "Modulation Index") * carrierFreq;
                    beta.gain.setValueAtTime(gain, audioContext.currentTime);
                }
            }
            node.outs["mod. out"] = beta;
            node.ins.in = beta;
            node.updateParams();
            return node;
        },
        Modulator: function(id, serializedParams, waitToStart) {
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
            var mod = new NodeTypes.Carrier(null, serializedParams, waitToStart);
            var beta = new NodeTypes.Beta(null, serializedParams);
            mod.outs.out.connect(beta.ins.in);
            node.start = function(time) {
                mod.start(time);
            }
            node.play = function(freq, start) {
                mod.play(freq, start);
                beta.play(freq, start);
            };
            node.kill = function() {
                mod.kill();
                beta.kill();
            };
            node.updateParams = function() {
                mod.params.params.Frequency = node.params.params.Frequency;
                mod.params.params["Wave Type"] = node.params.params["Wave Type"];
                beta.params.params.Beta = node.params.params.Beta;
                mod.updateParams();
                beta.updateParams();
            }
            node.outs.out = mod.outs.out;
            node.ins.frequency = mod.ins.frequency;
            node.outs.betaOut = beta.outs.out;
            node.ins.betaGain = beta.ins.gainIn;
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
                "Decay Duration": "Time it would take for parameter value to decay exponentially 99.5% of the way from attack level to sustain level.",
                "Sustain Level": "The volume to which the sound decays. Usually 0 to 1.",
                "Release Duration": "How long the releasePhase phase lasts in seconds."
            }
            var envGain = audioContext.createGain();
            function getValueAtTime(time, v0, v1, t0, timeConstant) {
                return v1 + (v0 - v1) * Math.exp(-((time - t0) / (timeConstant)));
            }
            function getTimeConstant(dur) {
                return-(dur) / Math.log(0.005);
            }

            function abortiveRelease(audioParam, releaseBeginTime, start, stop, prevLevel) {
                if (stop - start < .001) {
                    return;
                }
                var releaseTimeConstant = getTimeConstant(stop - releaseBeginTime);
                var beginExpDecayTime = start + .001;
                var beginExpDecayValue = getValueAtTime(beginExpDecayTime, prevLevel, 0, releaseBeginTime, releaseTimeConstant);
                audioParam.linearRampToValueAtTime(beginExpDecayValue, beginExpDecayTime);
                audioParam.setTargetAtTime(0, beginExpDecayTime, releaseTimeConstant);

            }
            function abortiveAttack(audioParam, attackLevel, start, attackEndTime, releaseBeginTime, stop) {
                var attackSlope = (attackLevel) / (attackEndTime - start);
                var attackEndVal = attackSlope * (releaseBeginTime - start);
                audioParam.linearRampToValueAtTime(attackEndVal, releaseBeginTime);
                expRampTo(audioParam, attackEndVal, 0, releaseBeginTime, stop);
            }
            function decayAndRelease(audioParam, attackLevel, sustainLevel, attackEndTime, decayDur, releaseBeginTime, stop) {
                //decay
                var decayTimeConstant = getTimeConstant(decayDur);
                audioParam.setTargetAtTime(sustainLevel, attackEndTime, decayTimeConstant);

                //release
                var releaseBeginVal = getValueAtTime(releaseBeginTime, attackLevel, sustainLevel, attackEndTime, decayTimeConstant);
                audioParam.setValueAtTime(releaseBeginVal, releaseBeginTime);
                var releaseTimeConstant = getTimeConstant(stop - releaseBeginTime);
                audioParam.setTargetAtTime(0, releaseBeginTime, releaseTimeConstant);

            }
            node.play = function(freq, start, stop) {
                if (!node.connections.out) {
                    node.connections.out = [];
                }
                for (var i = 0; i < node.connections.out.length; i++) {
                    var destInfo = node.connections.out[i];
                    destInfo = destInfo.split("_");
                    var audioParam = getNodeIn(destInfo[0], destInfo[1]);

                    var attackLevel = node.getParamVal(freq, "Attack Level");
                    var attackEndTime = node.getParamVal(freq, "Attack Duration") + start;
                    var decayDuration = node.getParamVal(freq, "Decay Duration");
                    var sustainLevel = node.getParamVal(freq, "Sustain Level");
                    var releaseBeginTime = stop - node.getParamVal(freq, "Release Duration");
                    audioParam.cancelScheduledValues(start);
                    audioParam.setValueAtTime(0, start);

                    if (releaseBeginTime < start) {
                        abortiveRelease(audioParam, releaseBeginTime, start, stop, Math.max(sustainLevel, attackLevel));
                        console.log("release began before note ended");
                    } else {
                        if (attackEndTime > releaseBeginTime) {
                            abortiveAttack(audioParam, attackLevel, start, attackEndTime, releaseBeginTime, stop);
                            console.log("release began before attack ended");
                        } else {
                            audioParam.linearRampToValueAtTime(attackLevel, attackEndTime);
                            decayAndRelease(audioParam, attackLevel, sustainLevel, attackEndTime, decayDuration, releaseBeginTime, stop)
                        }
                    }
                }
            }
            node.outs.out = envGain;
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
            node.outs.out = beta;
            node.ins.in = beta;
            node.ins.gainIn = beta.gain;
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
            node.params.hints = {
                Type: "Type of filter",
                Frequency: "",
                Q: "",
                Gain: ""
            }
            var biquad = audioContext.createBiquadFilter();
            node.play = function(freq, start) {
                biquad.frequency.setValueAtTime(node.getParamVal(freq, "Frequency"), start);
                biquad.Q.setValueAtTime(node.getParamVal(freq, "Q"), start)
                biquad.gain.setValueAtTime(node.getParamVal(freq, "Gain"), start)
            }
            node.updateParams = function() {
                var freq = curFreq();
                biquad.type = node.getParamVal[freq, "Type"];
                biquad.frequency.setValueAtTime(node.getParamVal(freq, "Frequency"), audioContext.currentTime);
                biquad.Q.setValueAtTime(node.getParamVal(freq, "Q"), audioContext.currentTime)
                biquad.gain.setValueAtTime(node.getParamVal(freq, "Gain"), audioContext.currentTime)
            }

            node.outs.out = biquad;
            node.ins.in = biquad;
            node.ins.frequency = biquad.frequency;
            node.ins.q = biquad.q;
            node.ins.gain = biquad.gain;
            node.updateParams();
            return node;
        },
        Gain: function(id, serializedParams) {
            serializedParams = serializedParams || {
                t: {
                    Gain: "fp"
                },
                p: {
                    Gain: {t: "c", f: "f", c: 1, d: 0}
                }
            }
            var node = new Node(serializedParams, "Gain", id);
            node.params.hints = {
                Gain: "Gain level, 1 by default",
            }
            var gain = audioContext.createGain();
            node.play = function(freq, start) {
                gain.gain.setValueAtTime(node.getParamVal(freq, "Gain"), start);
            }
            node.updateParams = function() {
                var freq = curFreq();
                gain.gain.setValueAtTime(node.getParamVal(freq, "Gain"), audioContext.currentTime)
            }
            node.outs.out = gain;
            node.ins.in = gain;
            node.ins.gainIn = gain.gain;
            node.updateParams();
            return node;
        },
        Visualizer: function(id, serializedParams) {
            serializedParams = serializedParams || {
                t: {
                    "Horizontal Scale": "fp",
                    Type: "v"
                },
                p: {
                    "Horizontal Scale": {t: "c", f: "f", c: 10, d: 0},
                    Type: "Waveform"
                }
            }
            var node = new Node(serializedParams, "Visualizer", id);
            node.params.hints = {
                "Horizontal Scale": "",
                Type: ""
            }
            var analyser = audioContext.createAnalyser();
            analyser.smoothingTimeConstant = 0;
            var bufferLength;
            var dataArray;
            node.updateParams = function() {
                var freq = curFreq();
                analyser.smoothingTimeConstant = 0;
                //32, 2048
                var fft = Math.pow(2, node.getParamVal(freq, "Horizontal Scale")) || 1024;
                fft = Math.max(32, fft);
                fft = Math.min(2048, fft);
                analyser.fftSize = fft;
                bufferLength = analyser.fftSize;
                dataArray = new Uint8Array(bufferLength);
            }

            function draw() {
                var canvas = $("#visualizerCanvas_" + id);
                if (canvas.length > 0) {
                    canvas = canvas[0];
                    var canvasCtx = canvas.getContext("2d");
                    var WIDTH = canvas.width;
                    var HEIGHT = canvas.height;
                    canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);
                    analyser.getByteTimeDomainData(dataArray);
                    canvasCtx.fillStyle = 'rgb(200, 200, 200)';
                    canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);
                    canvasCtx.lineWidth = 1;
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
            node.play = function(freq, start, stop) {
                var delay = start - audioContext.currentTime + 100;
                window.setTimeout(draw, delay / 1000 + 10);
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
        for (var nodeId in instrument.nodes) {
            var node = instrument.nodes[nodeId];
            node.play(freq, start, stop);

        }
        instrument.nodes.AudioContext.audioNodes[0].gain.setValueAtTime(level, start);
        instrument.nodes.AudioContext.audioNodes[0].gain.setValueAtTime(0, stop);
    }

    //init
    instrument.nodes = {};
    this.audioContext = audioContext;
    instrument.fromSerialized(serializedInstrument);

}


function Thing1() {
    var thisThing1 = this;
    thisThing1.a = 1;
    thisThing1.b = 2;
    thisThing1.c = 3;
    function Thing2() {
        var thisThing2 = this;
        var a = 11;
        var b = 12;
        var c = 13;
        var thing1 = thisThing1;
        function getThing1sA() {
            return thing1.a;
        }
        return {a: a, b: b, c: c, getThing1sA: getThing1sA};
    }
    thisThing1.thing2 = new Thing2();
}

var thing1 = new Thing1();