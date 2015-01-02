function Instrument(audioContext, instrumentInfo, dynamic) {
    var _this = this;
    var nodes = {};
    this.audioContext = audioContext;

    //var analyser = audioContext.createAnalyser();
    //analyser.connect(audioContext.destination);

    var outGain = audioContext.createGain();
    outGain.gain.value = 0;
    outGain.connect(audioContext.destination);

    var Node = {
        Carrier: function(params) {
            var car = audioContext.createOscillator();
            car.start(0);
            this.setFrequency = function(freq, start) {
                if (params.pitchMode === "detune") {
                    car.frequency.setValueAtTime(freq * Math.pow(2, params.detune / 12), start);
                } else if (params.pitchMode === "frequency") {
                    car.frequency.setValueAtTime(params.frequency, start);
                } else if (params.pitchMode === "ratio") {
                    car.frequency.setValueAtTime(freq * params.ratio, start);
                }
                car.type = params.waveType;
            }
            this.disconnect = function() {
                car.disconnect();
            }
            this.kill = function() {
                car.stop();
                car.disconnect();
            }
            this.out = car;
            this.frequency = car.frequency;
        },
        Modulator: function(params) {
            var mod = new Node.Carrier(params);
            var beta = new Node.Beta(params);
            mod.out.connect(beta.in);
            this.setFrequency = function(freq, start) {
                mod.setFrequency(freq, start);
                beta.setFrequency(freq, start);
            }
            this.disconnect = function() {
                mod.disconnect();
                beta.disconnect();
                mod.out.connect(beta.in);
            }
            this.kill = function() {
                mod.kill();
                beta.kill();
            }
            this.out = mod.out;
            this.frequency = mod.frequency;
            this.betaOut = beta.out;
            this.betaGain = beta.gainIn;
        },
        Envelope: function(params) {
            var envGain = audioContext.createGain();
            var releaseGain = audioContext.createGain();
            envGain.connect(releaseGain);
            this.play = function(start, stop) {
                envGain.gain.setValueAtTime(0, start);
                envGain.gain.linearRampToValueAtTime(params.attackLevel, start + params.attackDuration);
                envGain.gain.setTargetAtTime(params.sustainLevel, start + params.attackDuration, params.decayDuration);
                envGain.gain.setValueAtTime(0, stop);

                var releaseAt = stop - params.releaseDuration;
                releaseGain.gain.setValueAtTime(1, start);
                releaseGain.gain.setValueAtTime(1, releaseAt);
                releaseGain.gain.linearRampToValueAtTime(0, stop);
            }
            this.disconnect = function() {
                envGain.disconnect();
                releaseGain.disconnect();
                envGain.connect(releaseGain);
            }
            this.kill = function() {
                envGain.disconnect();
                releaseGain.disconnect();
            }
            this.in = envGain;
            this.out = releaseGain;
        },
        Beta: function(params) {
            var beta = audioContext.createGain();
            this.setFrequency = function(freq, start) {
                beta.gain.setValueAtTime(freq * params.beta, start);
            }
            this.disconnect = function() {
                beta.disconnect();
            }
            this.kill = function() {
                beta.disconnect();
            }
            this.out = beta;
            this.in = beta;
            this.gainIn = beta.gain;
        },
        Biquad: function(params) {
            var biquad = audioContext.createBiquadFilter();
            this.setFrequency = function(freq, start) {
                if (params.pitchMode === "detune") {
                    biquad.frequency.setValueAtTime(freq * Math.pow(2, params.detune / 12), start);
                } else if (params.pitchMode === "frequency") {
                    biquad.frequency.setValueAtTime(params.frequency, start);
                } else if (params.pitchMode === "ratio") {
                    biquad.frequency.setValueAtTime(freq * params.ratio, start);
                }
                biquad.type = params.filterType;
                biquad.q = params.q;
                biquad.gain = params.gain;
            }
            this.disconnect = function() {
                biquad.disconnect();
            }
            this.kill = function() {
                biquad.disconnect();
            }
            this.out = biquad;
            this.in = biquad;
            this.frequency = biquad.frequency;
            this.q = biquad.q;
            this.gain = biquad.gain;
        },
        Visualizer: function(params) {
            var analyser = audioContext.createAnalyser();


            //
            //var drawVisual;
            var canvas = $("#waveCanvas")[0];
            var canvasCtx = canvas.getContext("2d");
            var WIDTH = canvas.width;
            var HEIGHT = canvas.height;
            analyser.fftSize = 2048;
            var bufferLength = analyser.fftSize;
            var dataArray = new Uint8Array(bufferLength);
            canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);
            function draw() {
                //drawVisual = requestAnimationFrame(draw);
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

            draw();
            //


            this.play = function(start, stop) {
                envGain.gain.setValueAtTime(0, start);
                envGain.gain.linearRampToValueAtTime(params.attackLevel, start + params.attackDuration);
                envGain.gain.setTargetAtTime(params.sustainLevel, start + params.attackDuration, params.decayDuration);
                envGain.gain.setValueAtTime(0, stop);

                var releaseAt = stop - params.releaseDuration;
                releaseGain.gain.setValueAtTime(1, start);
                releaseGain.gain.setValueAtTime(1, releaseAt);
                releaseGain.gain.linearRampToValueAtTime(0, stop);
            }
            this.disconnect = function() {
                envGain.disconnect();
                releaseGain.disconnect();
                envGain.connect(releaseGain);
            }
            this.kill = function() {
                envGain.disconnect();
                releaseGain.disconnect();
            }
            this.in = envGain;
            this.out = releaseGain;
        }

    }
    function makeNode(params) {
        return new Node[params.type](params);
    }
    function updateNodes() {
        if (!nodes.audioContext) {
            nodes.audioContext = {
                destination: outGain
            }
        }
        for (var key in nodes) {
            if (key !== "audioContext") {
                nodes[key].disconnect();
                if (!instrumentInfo[key]) {
                    nodes[key].kill();
                    delete nodes[key];
                }
            }
        }
        for (var key in instrumentInfo) {
            if (!nodes[key] && instrumentInfo[key].type) {
                nodes[key] = makeNode(instrumentInfo[key]);
            }
        }
        for (var key in instrumentInfo) {
            var node = nodes[key];
            var connections = instrumentInfo[key].connections;
            for (var connectionPoint in connections) {
                for (var i = 0; i < connections[connectionPoint].length; i++) {
                    var dest = connections[connectionPoint][i].split("_");
                    node[connectionPoint].connect(nodes[dest[0]][dest[1]]);
                }
            }
        }
    }
    updateNodes();
    this.play = function(freq, start, stop, level) {
        if (dynamic) {
            instrumentInfo.update();
            updateNodes();
        }
        for (var key in nodes) {
            var node = nodes[key];
            if (node.setFrequency) {
                node.setFrequency(freq, start);
            }
            if (node.play) {
                node.play(start, stop);
            }
        }
        outGain.gain.setValueAtTime(level, start);
        outGain.gain.setValueAtTime(0, stop);

    }
    this.kill = function() {
        for (var key in nodes) {
            var node = nodes[key];
            if (node.kill) {
                node.kill();
            }
        }
    }
}
