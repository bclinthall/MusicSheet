var numeric = new RegExp(/^\d+$/);
function isNumeric(a) {
    return numeric.test(a);
}

InstrumentNodeModelsCommon = {
    timeFreqArgs: "Accepts constants or functions of s (start time) e (end time), and f (frequency), e.g. 's+.01'."

}
InstrumentNodeModels = {
    Microphone: {
        createNode: function(audioContext) {
            navigator.getUserMedia = navigator.getUserMedia ||
                    navigator.webkitGetUserMedia ||
                    navigator.mozGetUserMedia;
            var node = this;
            function gotMic(stream) {
                node.audioNode = audioContext.createMediaStreamSource(stream);
            }
            navigator.getUserMedia({'audio': true}, gotMic, function(err) {
                console.log(err)
            });
            return {
                connect: function(x, y, z) {
                    console.log("Microphone Audio not ready yet");
                    setTimeout(function() {
                        node.audioNode.connect(x, y, z)
                    }, 1000);
                    return false;
                },
                disconnect: function(x, y, z) {
                    console.log("Microphone Audio not ready yet");
                    setTimeout(function() {
                        node.audioNode.connect(x, y, z)
                    }, 1000);
                    return false;
                },
                numberOfOutputs: 1,
                numberOfInputs: 0,
            }
        },
        params: {
        },
        playSpecial: function(freq, start, end) {

        },
        killSpecial: function() {

        }
    },
    CustomOscillatorByArrays: {
        createNode: function(audioContext) {
            return audioContext.createOscillator();
        },
        createPeriodicWave: function(node) {
            var params = node.params;
            if (params.real.value && params.real.value.length > 0
                    && params.imag.value && params.imag.value.length > 0) {
                var real = params.real.value;
                var imag = params.imag.value;
                try {
                    var realAry = math.eval(real).toArray();
                    var imagAry = math.eval(imag).toArray();
                    var length = realAry.length;
                    if (length !== imagAry.length) {
                        return false;
                    }
                    real = new Float32Array(length);
                    imag = new Float32Array(length);
                    for (var i = 0; i < length; i++) {
                        real[i] = realAry[i];
                        imag[i] = imagAry[i];
                    }
                    console.log(real);
                    var wave = node.instrument.audioContext.createPeriodicWave(real, imag);
                    node.audioNode.setPeriodicWave(wave);
                } catch (err) {
                    console.log(err);
                    return false;
                }
            }
            return true;
        },
        params: {
            frequency: {
                type: "audioParam",
                min: 10,
                max: null,
                hint: "hint",
                defaultVal: "f"
            },
            detune: {
                type: "audioParam",
                min: 0,
                max: null,
                hint: "Adjust the frequency in cents, i.e. hundedth of semitones"
            },
            real: {
                type: "otherInput",
                hint: "An array of the same length as imag.  For example [0, 1, 0, .25, 0, .125]",
                defaultVal: "[0, 1, 0, .25, 0, .125]",
                onSetValFunction: function(node, freq, start, end) {
                    node.createPeriodicWave(node);
                }
            },
            imag: {
                type: "otherInput",
                hint: "An array of the same length as real.  For example [0, 0, .5, 0, .25, 0]",
                defaultVal: "[0, 0, .5, 0, .25, 0]",
                onSetValFunction: function(node, freq, start, end) {
                    node.createPeriodicWave(node);
                }
            },
        },
        playSpecial: function(freq, start, end) {
            if (!this.isStarted) {
                this.audioNode.start();
                this.createPeriodicWave(this);
                this.isStarted = true;
            }
        },
        killSpecial: function() {
            this.audioNode.stop();
        }

    },
    CustomOscillatorByFunctions: {
        createNode: function(audioContext) {
            return audioContext.createOscillator();
        },
        createPeriodicWave: function(node) {
            var params = node.params;
            if (params.real.value && params.real.value.length > 0
                    && params.imag.value && params.imag.value.length > 0
                    && isNumeric(params.iter.value)) {
                var real = params.real.value;
                var imag = params.imag.value;
                var iter = parseInt(params.iter.value);
                var realMathCode;
                var imagMathCode;
                try {
                    realMathCode = math.parse(real).compile();
                    imagMathCode = math.parse(imag).compile();
                    real = new Float32Array(iter);
                    imag = new Float32Array(iter);
                    for (var i = 0; i < iter; i++) {
                        real[i] = realMathCode.eval({n: i});
                        imag[i] = imagMathCode.eval({n: i});
                    }
                    console.log(real);
                    var wave = node.instrument.audioContext.createPeriodicWave(real, imag);
                    node.audioNode.setPeriodicWave(wave);
                } catch (err) {
                    console.log(err);
                    return false;
                }
            }
            return true;
        },
        params: {
            frequency: {
                type: "audioParam",
                min: 10,
                max: null,
                hint: "hint",
                defaultVal: "f"
            },
            detune: {
                type: "audioParam",
                min: 0,
                max: null,
                hint: "Adjust the frequency in cents, i.e. hundedth of semitones"
            },
            real: {
                type: "otherInput",
                hint: "A function of n.",
                defaultVal: "1/n",
                onSetValFunction: function(node, freq, start, end) {
                    node.createPeriodicWave(node);
                }
            },
            imag: {
                type: "otherInput",
                hint: "A function of n.",
                defaultVal: "0",
                onSetValFunction: function(node, freq, start, end) {
                    node.createPeriodicWave(node);
                }
            },
            iter: {
                type: "otherInput",
                hint: "Positive Interger.  Times to run functions.",
                defaultVal: "1000",
                onSetValFunction: function(node, freq, start, end) {
                    node.createPeriodicWave(node);
                }
            }
        },
        playSpecial: function(freq, start, end) {
            if (!this.isStarted) {
                this.audioNode.start();
                this.createPeriodicWave(this);
                this.isStarted = true;
            }
        },
        killSpecial: function() {
            this.audioNode.stop();
        }

    },
    WaveForm: {
        createNode: function(audioContext) {
            return audioContext.createScriptProcessor(4096, 1, 1);
        },
        numberOfOutputs: 0,
        numberOfInputs: 1,
        params: {
            x: {
                type: "function",
                defaultVal: 1,
            },
            y: {
                type: "function",
                defaultVal: 25,
            },
            canvas: {
                type: "canvas"
            }
        },
        setup: function() {
            var context = this.instrument.audioContext;
            var sampleRate = context.sampleRate;
            var scriptProcessor = this.audioNode;
            var id = this.id;
            console.log(id);
            var canvas = $(".nodeDiv[data-nodeid=" + id + "] canvas")[0];//canvas = $(".nodeDiv[data-nodeid=8spm598] canvas")
            var ctx = canvas.getContext("2d");
            ctx.fillStyle = "#abc";
            var cw = canvas.width;
            var ch = canvas.height;
            var node = this;
            var bufferSize = scriptProcessor.bufferSize;
            scriptProcessor.onaudioprocess = function(audioProcessingEvent) {
                var curr = node.instrument.getCurrent();
                var time = context.currentTime;
                var runTime = time - curr.start;
                var runSamples = runTime * sampleRate;
                var samplesPerWave = sampleRate / curr.freq;
                var offset = Math.floor((Math.floor(runSamples / samplesPerWave) + 1) * samplesPerWave - runSamples);
//                console.log(offset);
//                var runBuffers = runSamples / bufferSize;


//                var waveStartTimes = curr.Start + (nWaves / curr.freq);

                var x = node.getCalculatedParamValue("x", curr.freq, curr.start, curr.end)
                var y = node.getCalculatedParamValue("y", curr.freq, curr.start, curr.end)
                ctx.clearRect(0, 0, cw, ch);
                // The input buffer is the song we loaded earlier
                var inputBuffer = audioProcessingEvent.inputBuffer;

                // Loop through the inputy channels (in this case there is only one)
                var channel = 0;
                var inputData = inputBuffer.getChannelData(channel);

                // Loop through the 4096 samples
                for (var sample = offset; sample - offset < (cw / x); sample++) {
                    var val = inputData[sample];
                    ctx.fillRect((sample - offset) * x, ch / 2 + val * y, 1, 1);
                }

            }
            scriptProcessor.connect(context.destination);

        },
        playSpecial: function(freq, start, end) {
            if (!this.isStarted) {
                this.setup();
                this.isStarted = true;
            }
        },
        killSpecial: function() {

        }
    },
    VolumeOverTime: {
        createNode: function(audioContext) {
            return audioContext.createAnalyser();
        },
        params: {
            fftSize: {
                type: "function",
                defaultVal: 2048,
                hint: "The size of the FFT used for frequency-domain analysis. This must be a power of two in the range 32 to 32768. Note that large FFT sizes can be costly to compute, but will draw data (especially for lower frequencies) more accurately."
            },
            minDecibels: {
                type: "nodeAttr",
                hint: "The minimum power value in the scaling range for the FFT analysis data for conversion to unsigned byte values. The default value is -100. If the value of this attribute is set to a value more than or equal to maxDecibels, an IndexSizeError exception must be thrown."
            },
            maxDecibels: {
                type: "nodeAttr",
                hint: "The maximum power value in the scaling range for the FFT analysis data for conversion to unsigned byte values. The default value is -30. If the value of this attribute is set to a value less than or equal to minDecibels, an IndexSizeError exception must be thrown."
            },
            smoothingTimeConstant: {
                type: "nodeAttr",
                defaultVal: 0,
                hint: "A value from 0 -> 1 where 0 represents no time averaging with the last analysis frame. The default value is 0.8. If the value of this attribute is set to a value less than 0 or more than 1, an IndexSizeError exception must be thrown."
            },
            scale: {
                type: "function",
                defaultVal: 200,
            },
            canvas: {
                type: "canvas"
            },
        },
        setup: function() {
            var context = this.instrument.audioContext;
            var sampleRate = context.sampleRate;

            var node = this;
            var scriptProcessor = context.createScriptProcessor(1024, 1, 1);
            this.scriptProcessor = scriptProcessor;
            var analyser = this.audioNode;
            var id = this.id;
            console.log(id);
            var canvas = $(".nodeDiv[data-nodeid=" + id + "] canvas")[0];//canvas = $(".nodeDiv[data-nodeid=8spm598] canvas")
            var ctx = canvas.getContext("2d");
            ctx.fillStyle = "#abc";
            var cw = canvas.width;
            var ch = canvas.height;
            var tempCanvas = document.createElement("canvas"),
                    tempCtx = tempCanvas.getContext("2d");
            tempCanvas.width = 300;
            tempCanvas.height = 150;
            var hot = new chroma.scale(['#000000', '#ff0000', '#ffff00', '#ffffff']).domain([0, 300]);

            // when the javascript node is called
            // we use information from the analyzer node
            // to draw the volume
            scriptProcessor.onaudioprocess = function() {



                var curr = node.instrument.getCurrent();
                var samplesPerWave = sampleRate / curr.freq;

                var scale = node.getCalculatedParamValue("scale", curr.freq, curr.start, curr.end)
                // get the average for the first channel
                var wholeWaves = Math.floor(analyser.fftSize / samplesPerWave) //The wholeWaves business smoothes things out a lot.
                var array = new Float32Array(samplesPerWave * wholeWaves);
                analyser.getFloatTimeDomainData(array);
                var average = getAverageVolume(array);


                var val = average;
                //val = average *array.length/1024;
                //val = Math.pow(val, 10);
                val *= scale;
                //val += 50;
                //console.log(Math.floor(average/5)*5, val);//, Math.floor(val/5)*5);
                addBar(val);
            }
            function getAverageVolume(array) {
                var min = 0;
                var max = 0;
                var values = 0;
                var average;

                var length = array.length;

                // get all the frequency amplitudes
                for (var i = 0; i < length; i++) {
                    var val = Math.abs(array[i]);
                    values += val;
                    min = Math.min(min, val);
                    max = Math.max(max, val);
                }
                //max = max*4;
                //values = Math.round(values/max)*max;
                average = values / length;
                //console.log(Math.round(min*100)/100, Math.round(average*100)/100, Math.round(max*100)/100);
                return average;
            }
            function addBar(y) {
                tempCtx.drawImage(canvas, 0, 0, cw, ch);

                ctx.fillStyle = "#000";
                ctx.fillRect(0, 0, cw, ch);

                ctx.fillStyle = "#abc";//hot(Math.floor(Math.random()*300));
                ctx.fillRect(cw - 1, ch - y, 1, y);
                // set translate on the canvas
                ctx.translate(-1, 0);
                // draw the copied image
                ctx.drawImage(tempCanvas, 0, 0, cw, ch, 0, 0, cw, ch);

                // reset the transformation matrix
                ctx.setTransform(1, 0, 0, 1, 0, 0);
            }

            scriptProcessor.connect(context.destination);
            analyser.connect(scriptProcessor);
        },
        playSpecial: function(freq, start, end) {
            if (!this.isStarted) {
                this.setup();
                this.isStarted = true;
            }
        },
        killSpecial: function() {

        }
    },
    TimeBasedSpectrogram: {
        createNode: function(audioContext) {
            return audioContext.createAnalyser();
        },
        params: {
            fftSize: {
                type: "nodeAttr",
                defaultVal: 512,
                hint: "The size of the FFT used for frequency-domain analysis. This must be a power of two in the range 32 to 32768, otherwise an IndexSizeError exception must be thrown. The default value is 2048. Note that large FFT sizes can be costly to compute."
            },
            minDecibels: {
                type: "nodeAttr",
                hint: "The minimum power value in the scaling range for the FFT analysis data for conversion to unsigned byte values. The default value is -100. If the value of this attribute is set to a value more than or equal to maxDecibels, an IndexSizeError exception must be thrown."
            },
            maxDecibels: {
                type: "nodeAttr",
                hint: "The maximum power value in the scaling range for the FFT analysis data for conversion to unsigned byte values. The default value is -30. If the value of this attribute is set to a value less than or equal to minDecibels, an IndexSizeError exception must be thrown."
            },
            smoothingTimeConstant: {
                type: "nodeAttr",
                defaultVal: 0,
                hint: "A value from 0 -> 1 where 0 represents no time averaging with the last analysis frame. The default value is 0.8. If the value of this attribute is set to a value less than 0 or more than 1, an IndexSizeError exception must be thrown."
            },
            canvas: {
                type: "canvas"
            }
        },
        setup: function() {
            var context = this.instrument.audioContext;
            var scriptProcessor = context.createScriptProcessor(2048, 1, 1);
            this.scriptProcessor = scriptProcessor;
            var analyser = this.audioNode;
            var id = this.id;
            var canvas = $(".nodeDiv[data-nodeid=" + id + "] canvas")[0];//canvas = $(".nodeDiv[data-nodeid=8spm598] canvas")
            var ctx = canvas.getContext("2d");
            ctx.fillStyle = "#abc";

            var tempCanvas = document.createElement("canvas"),
                    tempCtx = tempCanvas.getContext("2d");
            tempCanvas.width = 300;
            tempCanvas.height = 150;
            var hot = new chroma.scale(['#000000', '#ff0000', '#ffff00', '#ffffff']).domain([0, 300]);
            // when the javascript node is called
            // we use information from the analyzer node
            // to draw the volume
            scriptProcessor.onaudioprocess = function() {

                // get the average for the first channel
                var array = new Uint8Array(analyser.frequencyBinCount);
                analyser.getByteFrequencyData(array);
                drawSpectrogram(array);
            }
            function drawSpectrogram(array) {

                tempCtx.drawImage(canvas, 0, 0, 300, 150);

                // iterate over the elements from the array
                for (var i = 0; i < array.length; i++) {
                    // draw each pixel with the specific color
                    var value = array[i];
                    ctx.fillStyle = hot(value).hex();

                    // draw the line at the right side of the canvas
                    ctx.fillRect(300 - 1, 128 - i, 1, 1);
                }

                // set translate on the canvas
                ctx.translate(-1, 0);
                // draw the copied image
                ctx.drawImage(tempCanvas, 0, 0, 300, 150, 0, 0, 300, 150);

                // reset the transformation matrix
                ctx.setTransform(1, 0, 0, 1, 0, 0);
            }

            scriptProcessor.connect(context.destination);
            analyser.connect(scriptProcessor);
        },
        playSpecial: function(freq, start, end) {
            if (!this.isStarted) {
                this.setup();
                this.isStarted = true;
            }
        },
        killSpecial: function() {

        }
    },
    FrequencySpectrumAnalyser: {
        createNode: function(audioContext) {
            return audioContext.createAnalyser();
        },
        params: {
            fftSize: {
                type: "nodeAttr",
                defaultVal: 512,
                hint: "The size of the FFT used for frequency-domain analysis. This must be a power of two in the range 32 to 32768, otherwise an IndexSizeError exception must be thrown. The default value is 2048. Note that large FFT sizes can be costly to compute."
            },
            minDecibels: {
                type: "nodeAttr",
                hint: "The minimum power value in the scaling range for the FFT analysis data for conversion to unsigned byte values. The default value is -100. If the value of this attribute is set to a value more than or equal to maxDecibels, an IndexSizeError exception must be thrown."
            },
            maxDecibels: {
                type: "nodeAttr",
                hint: "The maximum power value in the scaling range for the FFT analysis data for conversion to unsigned byte values. The default value is -30. If the value of this attribute is set to a value less than or equal to minDecibels, an IndexSizeError exception must be thrown."
            },
            smoothingTimeConstant: {
                type: "nodeAttr",
                defaultVal: 0.3,
                hint: "A value from 0 -> 1 where 0 represents no time averaging with the last analysis frame. The default value is 0.8. If the value of this attribute is set to a value less than 0 or more than 1, an IndexSizeError exception must be thrown."
            },
            canvas: {
                type: "canvas"
            }
        },
        setup: function() {
            var context = this.instrument.audioContext;
            var scriptProcessor = context.createScriptProcessor(2048, 1, 1);
            this.scriptProcessor = scriptProcessor;
            var analyser = this.audioNode;
            var id = this.id;
            var canvas = $(".nodeDiv[data-nodeid=" + id + "] canvas")[0];//canvas = $(".nodeDiv[data-nodeid=8spm598] canvas")
            var ctx = canvas.getContext("2d");
            var gradient = ctx.createLinearGradient(0, 0, 0, 300);
            gradient.addColorStop(1, '#000000');
            gradient.addColorStop(0.75, '#ff0000');
            gradient.addColorStop(0.25, '#ffff00');
            gradient.addColorStop(0, '#ffffff');
            ctx.fillStyle = gradient;

            // when the javascript node is called
            // we use information from the analyzer node
            // to draw the volume
            scriptProcessor.onaudioprocess = function() {

                // get the average for the first channel
                var array = new Uint8Array(analyser.frequencyBinCount);
                analyser.getByteFrequencyData(array);

                // clear the current state
                ctx.clearRect(0, 0, 1000, 325);

                // set the fill style
                drawSpectrum(array);
            }
            function drawSpectrum(array) {
                for (var i = 0; i < (array.length); i++) {
                    var value = array[i];
                    ctx.fillRect(i * 5, 325 - value, 3, 325);
                }
            }
            ;


            scriptProcessor.connect(context.destination);
            analyser.connect(scriptProcessor);
        },
        playSpecial: function(freq, start, end) {
            if (!this.isStarted) {
                this.setup();
                this.isStarted = true;
            }
        },
        killSpecial: function() {

        }
    },
    VolumeBarAnalyser: {
        createNode: function(audioContext) {
            return audioContext.createAnalyser();
        },
        params: {
            fftSize: {
                type: "nodeAttr",
                defaultVal: 2048,
                hint: "The size of the FFT used for frequency-domain analysis. This must be a power of two in the range 32 to 32768, otherwise an IndexSizeError exception must be thrown. The default value is 2048. Note that large FFT sizes can be costly to compute."
            },
            minDecibels: {
                type: "nodeAttr",
                hint: "The minimum power value in the scaling range for the FFT analysis data for conversion to unsigned byte values. The default value is -100. If the value of this attribute is set to a value more than or equal to maxDecibels, an IndexSizeError exception must be thrown."
            },
            maxDecibels: {
                type: "nodeAttr",
                hint: "The maximum power value in the scaling range for the FFT analysis data for conversion to unsigned byte values. The default value is -30. If the value of this attribute is set to a value less than or equal to minDecibels, an IndexSizeError exception must be thrown."
            },
            smoothingTimeConstant: {
                type: "nodeAttr",
                defaultVal: 0.3,
                hint: "A value from 0 -> 1 where 0 represents no time averaging with the last analysis frame. The default value is 0.8. If the value of this attribute is set to a value less than 0 or more than 1, an IndexSizeError exception must be thrown."
            },
            canvas: {
                type: "canvas"
            }
        },
        setup: function() {
            var context = this.instrument.audioContext;
            var scriptProcessor = context.createScriptProcessor(2048, 1, 1);
            this.scriptProcessor = scriptProcessor;
            var analyser = this.audioNode;
            var id = this.id;
            // when the javascript node is called
            // we use information from the analyzer node
            // to draw the volume
            var canvas = $(".nodeDiv[data-nodeid=" + id + "] canvas")[0];//canvas = $(".nodeDiv[data-nodeid=8spm598] canvas")
            var ctx = canvas.getContext("2d");
            var gradient = ctx.createLinearGradient(0, 0, 0, 300);
            gradient.addColorStop(1, '#000000');
            gradient.addColorStop(0.75, '#ff0000');
            gradient.addColorStop(0.25, '#ffff00');
            gradient.addColorStop(0, '#ffffff');
            ctx.fillStyle = gradient;
            scriptProcessor.onaudioprocess = function() {

                // get the average, bincount is fftsize / 2
                var array = new Uint8Array(analyser.frequencyBinCount);
                analyser.getByteFrequencyData(array);
                var average = getAverageVolume(array)


                // clear the current state
                ctx.clearRect(0, 0, 60, 130);

                // create the meters
                ctx.fillRect(0, 130 - average, 25, 130);
            }

            function getAverageVolume(array) {
                var values = 0;
                var average;

                var length = array.length;

                // get all the frequency amplitudes
                for (var i = 0; i < length; i++) {
                    values += array[i];
                }

                average = values / length;
                return average;
            }

            scriptProcessor.connect(context.destination);
            analyser.connect(scriptProcessor);
        },
        playSpecial: function(freq, start, end) {
            if (!this.isStarted) {
                this.setup();
                this.isStarted = true;
            }
        },
        killSpecial: function() {

        }
    },
    BiquadFilter: {
        params: {
            frequency: {
                type: "audioParam",
                min: 10,
                max: null,
                hint: "hint"
            },
            detune: {
                type: "audioParam",
                min: 0,
                max: null,
                hint: "In cents, i.e. hundedth of semitones"
            },
            Q: {
                type: "audioParam",
                min: 0.0001,
                max: 1000,
                hint: "hint"
            },
            gain: {
                type: "audioParam",
                min: -40,
                max: 40,
                hint: "hint"
            },
            type: {
                type: "select",
                options: ["lowpass", "highpass", "bandpass", "lowshelf", "highshelf", "peaking", "notch", "allpass"]
            }
        },
        playSpecial: function(freq, start, end) {
        },
        killSpecial: function() {
        }
    },
    Buffer: {},
    BufferSource: {},
    ChannelMerger: {
        params: {
            dummy: "dummy"
        },
        playSpecial: function(freq, start, end) {
        },
        killSpecial: function() {
        }
    },
    ChannelSplitter: {
        params: {
            dummy: "dummy"
        },
        playSpecial: function(freq, start, end) {
        },
        killSpecial: function() {
        }},
    Convolver: {
    },
    Delay: {
        params: {
            delayTime: {
                type: "audioParam",
                min: 0,
                max: null,
                hint: "in seconds"
            }
        },
        playSpecial: function(freq, start, end) {
        },
        killSpecial: function() {
        }
    },
    Destination: {
        createNode: function(audioContext) {
            return audioContext.createGain();
        },
        params: {},
        playSpecial: function(freq, start, end, level) {
            this.audioNode.gain.cancelScheduledValues(start);
            this.audioNode.gain.setValueAtTime(level * this.instrument.getLevel(), start);
            if (end) {
                this.audioNode.gain.setValueAtTime(0, end);
            }
        },
        killSpecial: function() {
            this.audioNode.disconnect();
        }
    },
    DynamicsCompressor: {
        params: {
            threshold: {
                type: "audioParam",
                hint: 'The decibel value above which the compression will start taking effect. Its default value is -24, with a nominal range of -100 to 0.'
            },
            knee: {
                type: "audioParam",
                hint: 'A decibel value representing the range above the threshold where the curve smoothly transitions to the "ratio" portion. Its default value is 30, with a nominal range of 0 to 40.'
            },
            ratio: {
                type: "audioParam",
                hint: 'The amount of dB change in input for a 1 dB change in output. Its default value is 12, with a nominal range of 1 to 20.'
            },
            attack: {
                type: "audioParam",
                hint: "The amount of time (in seconds) to reduce the gain by 10dB. Its default value is 0.003, with a nominal range of 0 to 1."
            },
            release: {
                type: "audioParam",
                hint: 'The amount of time (in seconds) to increase the gain by 10dB. Its default value is 0.250, with a nominal range of 0 to 1.'
            }
        },
        playSpecial: function(freq, start, end) {
        },
        killSpecial: function() {
        }
    },
    Envelope: {
        createNode: function(audioContext) {
            return audioContext.createGain();
        },
        params: {
            AttackDuration: {
                type: "function",
                hint: "Time (in seconds) to rise from 0 to attack level.",
                defaultVal: .005
            },
            AttackLevel: {
                type: "function",
                hint: "Attack level. 1 is 100%. Can go above 1.",
                defaultVal: 1
            },
            DecayDuration: {
                type: "function",
                hint: "Time (in seconds) to fall from attack level to sustain level.",
                defaultVal: 0.25
            },
            SustainLevel: {
                type: "function",
                hint: "Sustain level. 1 is 100%. Can go above 1.",
                defaultVal: 0
            },
            ReleaseDuration: {
                type: "function",
                hint: "Time (in seconds) to fall from sustain level to 0.",
                defaultVal: .1
            },
            getValueAtTime: function(time, v0, v1, t0, timeConstant) {
                return v1 + (v0 - v1) * Math.exp(-((time - t0) / (timeConstant)));
            },
            getTimeConstant: function(dur) {
                return-(dur) / Math.log(0.005);
            },
            abortiveRelease: function(audioParam, releaseBeginTime, start, end, prevLevel) {
                if (end - start < .001) {
                    return;
                }
                var releaseTimeConstant = getTimeConstant(end - releaseBeginTime);
                var beginExpDecayTime = start + .001;
                var beginExpDecayValue = getValueAtTime(beginExpDecayTime, prevLevel, 0, releaseBeginTime, releaseTimeConstant);
                audioParam.linearRampToValueAtTime(beginExpDecayValue, beginExpDecayTime);
                audioParam.setTargetAtTime(0, beginExpDecayTime, releaseTimeConstant);

            },
            abortiveAttack: function(audioParam, attackLevel, start, attackEndTime, releaseBeginTime, end) {
                var attackSlope = (attackLevel) / (attackEndTime - start);
                var attackEndVal = attackSlope * (releaseBeginTime - start);
                audioParam.linearRampToValueAtTime(attackEndVal, releaseBeginTime);
                expRampTo(audioParam, attackEndVal, 0, releaseBeginTime, end);
                //        audioParam, endVal startVal?       beginTime, endTime
            },
            decayAndRelease: function(audioParam, attackLevel, sustainLevel, attackEndTime, decayDur, releaseBeginTime, end) {
                //decay
                var decayTimeConstant = getTimeConstant(decayDur);
                audioParam.setTargetAtTime(sustainLevel, attackEndTime, decayTimeConstant);

                //release
                var releaseBeginVal = getValueAtTime(releaseBeginTime, attackLevel, sustainLevel, attackEndTime, decayTimeConstant);
                audioParam.setValueAtTime(releaseBeginVal, releaseBeginTime);
                var releaseTimeConstant = getTimeConstant(end - releaseBeginTime);
                audioParam.setTargetAtTime(0, releaseBeginTime, releaseTimeConstant);

            }
        },
        playSpecial: function(freq, start, end) {
            var attackLevel = this.getCalculatedParamValue("AttackLevel", freq);
            var attackEndTime = this.getCalculatedParamValue("AttackDuration", freq) + start;
            var decayDuration = this.getCalculatedParamValue("DecayDuration", freq);
            var sustainLevel = this.getCalculatedParamValue("SustainLevel", freq);
            var releaseBeginTime = end - this.getCalculatedParamValue("ReleaseDuration", freq);
            this.audioParam.cancelScheduledValues(start);
            this.audioParam.setValueAtTime(0, start);
            var audioParam = this.audioParam;
            if (releaseBeginTime < start) {
                this.abortiveRelease(audioParam, releaseBeginTime, start, end, Math.max(sustainLevel, attackLevel));
                console.log("release began before note ended");
            } else {
                if (attackEndTime > releaseBeginTime) {
                    this.abortiveAttack(audioParam, attackLevel, start, attackEndTime, releaseBeginTime, end);
                    console.log("release began before attack ended");
                } else {
                    audioParam.linearRampToValueAtTime(attackLevel, attackEndTime);
                    this.decayAndRelease(audioParam, attackLevel, sustainLevel, attackEndTime, decayDuration, releaseBeginTime, end)
                }
            }
        },
        killSpecial: function() {
        }
    },
    setTargetAtTime: {
        scope: "audioParam",
        numberOfInputs: 0,
        numberOfOutputs: 1,
        doToConnected: function(param, data) {
            var audioParam = param.audioParam;
            var target = data.node.getCalculatedParamValue("target", data.freq, data.start, data.end);
            var startTime = data.node.getCalculatedParamValue("startTime", data.freq, data.start, data.end);
            var timeConstant = data.node.getCalculatedParamValue("timeConstant", data.freq, data.start, data.end);
            audioParam.setTargetAtTime(target, startTime, timeConstant);
        },
        params: {
            target: {
                type: "function",
                min: 0,
                defaultVal: 0,
                hint: "The value the parameter will start changing to at the given time. " + InstrumentNodeModelsCommon.timeFreqArgs,
                onSetValFunction: function(node, freq, start, end) {
                    node.instrument.cycleConnected(node.id, 0, node.doToConnected, {node: node, freq: freq, start: start, end: end})
                    return true;
                },
            },
            startTime: {
                type: "function",
                defaultVal: "s",
                hint: "The time at which the exponential approach will begin, in the same time coordinate system as the AudioContext's currentTime attribute. " + InstrumentNodeModelsCommon.timeFreqArgs,
                onSetValFunction: function(node, freq, start, end) {
                    node.instrument.cycleConnected(node.id, 0, node.doToConnected, {node: node, freq: freq, start: start, end: end})
                    return true;
                }
            },
            timeConstant: {
                type: "function",
                defaultVal: "1",
                hint: "The time-constant value of first-order filter (exponential) approach to the target value. The larger this value is, the slower the transition will be.  More precisely, timeConstant is the time it takes a first-order linear continuous time-invariant system to reach the value 1−1/e (around 63.2%) given a step input response (transition from 0 to 1 value). " + InstrumentNodeModelsCommon.timeFreqArgs
            }
        },
        playSpecial: function(freq, start, end) {
            this.instrument.cycleConnected(this.id, 0, this.doToConnected, {node: this, freq: freq, start: start, end: end})
        },
        killSpecial: function() {
        }
    },
    setValueAtTime: {
        scope: "audioParam",
        numberOfInputs: 0,
        numberOfOutputs: 1,
        doToConnected: function(param, data) {
            var audioParam = param.audioParam;
            var value = data.node.getCalculatedParamValue("value", data.freq, data.start, data.end);
            var endTime = data.node.getCalculatedParamValue("endTime", data.freq, data.start, data.end);
            audioParam.linearRampToValueAtTime(value, endTime);
        },
        params: {
            value: {
                type: "function",
                min: 0,
                defaultVal: 0,
                hint: "The value the parameter will linearly ramp to at the given time. " + InstrumentNodeModelsCommon.timeFreqArgs,
                onSetValFunction: function(node, freq, start, end) {
                    node.instrument.cycleConnected(node.id, 0, node.doToConnected, {node: node, freq: freq, start: start, end: end})
                    return true;
                },
            },
            endTime: {
                type: "function",
                min: 0,
                defaultVal: "e",
                hint: "The time in the same time coordinate system as the AudioContext's currentTime attribute where the linear ramp ends. " + InstrumentNodeModelsCommon.timeFreqArgs,
                onSetValFunction: function(node, freq, start, end) {
                    node.instrument.cycleConnected(node.id, 0, node.doToConnected, {node: node, freq: freq, start: start, end: end})
                    return true;
                }
            }
        },
        playSpecial: function(freq, start, end) {
            this.instrument.cycleConnected(this.id, 0, this.doToConnected, {node: this, freq: freq, start: start, end: end})
        },
        killSpecial: function() {
        }
    },
    LinearRampToValue: {
        scope: "audioParam",
        numberOfInputs: 0,
        numberOfOutputs: 1,
        doToConnected: function(param, data) {
            var audioParam = param.audioParam;
            var value = data.node.getCalculatedParamValue("value", data.freq, data.start, data.end);
            var endTime = data.node.getCalculatedParamValue("endTime", data.freq, data.start, data.end);
            audioParam.linearRampToValueAtTime(value, endTime);
        },
        params: {
            value: {
                type: "function",
                min: 0,
                defaultVal: 0,
                hint: "The value the parameter will linearly ramp to at the given time. " + InstrumentNodeModelsCommon.timeFreqArgs,
                onSetValFunction: function(node, freq, start, end) {
                    node.instrument.cycleConnected(node.id, 0, node.doToConnected, {node: node, freq: freq, start: start, end: end})
                    return true;
                },
            },
            endTime: {
                type: "function",
                min: 0,
                defaultVal: "e",
                hint: "The time in the same time coordinate system as the AudioContext's currentTime attribute where the linear ramp ends. " + InstrumentNodeModelsCommon.timeFreqArgs,
                onSetValFunction: function(node, freq, start, end) {
                    node.instrument.cycleConnected(node.id, 0, node.doToConnected, {node: node, freq: freq, start: start, end: end})
                    return true;
                }
            }
        },
        playSpecial: function(freq, start, end) {
            this.instrument.cycleConnected(this.id, 0, this.doToConnected, {node: this, freq: freq, start: start, end: end})
        },
        killSpecial: function() {
        }
    },
    ExponentialRampToValue: {
        scope: "audioParam",
        numberOfInputs: 0,
        numberOfOutputs: 1,
        doToConnected: function(param, data) {
            var audioParam = param.audioParam;
            var value = Math.max(data.node.getCalculatedParamValue("value", data.freq, data.start, data.end), 1e-44);
            var endTime = data.node.getCalculatedParamValue("endTime", data.freq, data.start, data.end);
            audioParam.exponentialRampToValueAtTime(value, endTime);
        },
        params: {
            value: {
                type: "function",
                min: 0,
                defaultVal: 1e-4,
                hint: "The value the parameter will exponentially ramp to at the given time. " + InstrumentNodeModelsCommon.timeFreqArgs,
                onSetValFunction: function(node, freq, start, end) {
                    node.instrument.cycleConnected(this.id, 0, node.doToConnected, {node: node, freq: freq, start: start, end: end})
                    return true;
                },
            },
            endTime: {
                type: "function",
                min: 0,
                defaultVal: "e",
                hint: "The time in the same time coordinate system as the AudioContext's currentTime attribute where the exponential ramp ends. " + InstrumentNodeModelsCommon.timeFreqArgs,
                onSetValFunction: function(node, freq, start, end) {
                    node.instrument.cycleConnected(this.id, 0, node.doToConnected, {node: node, freq: freq, start: start, end: end})
                    return true;
                }
            }
        },
        playSpecial: function(freq, start, end) {
            this.instrument.cycleConnected(this.id, 0, this.doToConnected, {node: this, freq: freq, start: start, end: end})
        },
        killSpecial: function() {
        }
    },
    Gain: {
        params: {
            gain: {
                type: "audioParam"
            }
        },
        playSpecial: function(freq, start, end) {
        },
        killSpecial: function() {
        }
    },
    MediaElementSource: {},
    MediaStreamDestination: {},
    MediaStreamSource: {},
    Oscillator: {
        params: {
            frequency: {
                type: "audioParam",
                min: 10,
                max: null,
                hint: "hint",
                defaultVal: "f"
            },
            detune: {
                type: "audioParam",
                min: 0,
                max: null,
                hint: "Adjust the frequency in cents, i.e. hundedth of semitones"
            },
            type: {
                type: "select",
                options: ["sine",
                    "square",
                    "sawtooth",
                    "triangle"/*,
                     "custom"*/]
            }
        },
        playSpecial: function(freq, start, end) {
            if (!this.isStarted) {
                this.audioNode.start();
                this.isStarted = true;
            }
        },
        killSpecial: function() {
            this.audioNode.stop();
        }
    },
    Panner: {
    },
    PeriodicWave: {},
    ScriptProcessor: {},
    StereoPanner: {
        params: {
            pan: {
                type: "audioParam",
                min: -1,
                max: 1,
                hint: "-1 for full left.  1 for full right."
            }
        },
        playSpecial: function(freq, start, end) {
        },
        killSpecial: function() {
        }
    },
    WaveShaper: {}
};


var modulator = {"name": null, "level": 1, "nodes": {"g1t7hc8": {"type": "Oscillator", "left": 594, "top": 240, "connections": [["Destination_0"]], "params": {"frequency": "f", "detune": 0, "type": "sine"}}, "pjld2j8": {"type": "Oscillator", "left": 50, "top": 367, "connections": [["3bkb2mo_0"]], "params": {"frequency": "f", "detune": 0, "type": "sine"}}, "3bkb2mo": {"type": "Gain", "left": 347, "top": 350, "connections": [["g1t7hc8_frequency"]], "params": {"gain": "f"}}}};
var echo = {"name": null, "level": 1, "nodes": {"7henf8": {"type": "Oscillator", "left": 60, "top": 180, "connections": [["pg9sc5_0"]], "params": {"frequency": "f", "detune": 0, "type": "sine"}}, "h2v72mo": {"type": "ExponentialRampToValue", "left": 1034, "top": 489, "connections": [[]], "params": {"value": 0.001, "endTime": "e"}}, "pg9sc5": {"type": "Gain", "left": 380, "top": 270, "connections": [["Destination_0", "4a2ek7g_0"]], "params": {"gain": 1}}, "r7crh7g": {"type": "ExponentialRampToValue", "left": 60, "top": 460, "connections": [["pg9sc5_gain"]], "params": {"value": "0.000001", "endTime": "e"}}, "be46kuo": {"type": "ExponentialRampToValue", "left": 720, "top": 440, "connections": [[]], "params": {"value": "1", "endTime": "(s+e)/2"}}, "mmn3rro": {"type": "Delay", "left": 1060, "top": 200, "connections": [["4a2ek7g_0", "Destination_0"]], "params": {"delayTime": "1"}}, "4a2ek7g": {"type": "Gain", "left": 808, "top": 200, "connections": [["mmn3rro_0"]], "params": {"gain": ".5"}}}};
var analysis = {"name": null, "level": 1, "nodes": {"37mv4k8": {"type": "Oscillator", "left": 120, "top": 180, "connections": [["ogf766_0"]], "params": {"frequency": "f", "detune": 0, "type": "sine"}}, "n8s2c7o": {"type": "VolumeBarAnalyser", "left": 610, "top": 180, "connections": [[]], "params": {"fftSize": 2048, "minDecibels": -100, "maxDecibels": -30, "smoothingTimeConstant": 0.3}}, "ogf766": {"type": "Gain", "left": 367, "top": 73, "connections": [["Destination_0", "n8s2c7o_0"]], "params": {"gain": 1}}, "fbjnjm": {"type": "ExponentialRampToValue", "left": 380, "top": 340, "connections": [["ogf766_gain"]], "params": {"value": "0.1", "endTime": "e"}}}};
var volAna = {"name": null, "level": 1, "nodes": {"4dc7s1g": {"type": "Oscillator", "left": 13, "top": 520, "connections": [["09at22_0"]], "params": {"frequency": "f", "detune": 0, "type": "triangle"}}, "09at22": {"type": "Gain", "left": 200, "top": 410, "connections": [["ohppcg_0"]], "params": {"gain": "0"}}, "ohppcg": {"type": "VolumeOverTime", "left": 14, "top": 20, "connections": [["Destination_0"]], "params": {"fftSize": 512, "minDecibels": -100, "maxDecibels": -30, "smoothingTimeConstant": 0.8, "scale": "200"}}, "m70r4u": {"type": "LinearRampToValue", "left": 213, "top": 560, "connections": [["09at22_gain"]], "params": {"value": "1", "endTime": "e"}}}};
var pluck = {"name": null, "level": 1, "nodes": {"agg3rt8": {"type": "Oscillator", "left": 226, "top": 80, "connections": [["86g3648_0"]], "params": {"frequency": "f", "detune": 0, "type": "sine"}}, "dg194gg": {"type": "Gain", "left": 287, "top": 280, "connections": [["agg3rt8_frequency"]], "params": {"gain": "f"}}, "6tj7618": {"type": "ExponentialRampToValue", "left": 328, "top": 448, "connections": [["dg194gg_gain", "86g3648_gain"]], "params": {"value": "0.1", "endTime": "e"}}, "5vm1irg": {"type": "Oscillator", "left": 72, "top": 394, "connections": [["dg194gg_0"]], "params": {"frequency": "f", "detune": 0, "type": "sine"}}, "86g3648": {"type": "Gain", "left": 451, "top": 134, "connections": [["fksvs1o_0", "rtucsqo_0"]], "params": {"gain": 1}}, "fksvs1o": {"type": "TimeBasedSpectrogram", "left": 934, "top": 168, "connections": [["Destination_0"]], "params": {"fftSize": 512, "minDecibels": -100, "maxDecibels": -30, "smoothingTimeConstant": 0}}, "rtucsqo": {"type": "VolumeOverTime", "left": 600, "top": 171, "connections": [[]], "params": {"fftSize": 512, "minDecibels": -100, "maxDecibels": -30, "smoothingTimeConstant": 0}}}};
var wave = {"name": null, "level": 1, "nodes": {"3gbjgsg": {"type": "Oscillator", "left": 607, "top": 212, "connections": [["r0ejkm_0", "Destination_0"]], "params": {"frequency": "f", "detune": 0, "type": "sine"}}, "r0ejkm": {"type": "WaveForm", "left": 829, "top": 100, "connections": [[]], "params": {"x": 1, "y": 10}}, "m5mvmqg": {"type": "Oscillator", "left": 160, "top": 394, "connections": [["p60nceo_0"]], "params": {"frequency": "f", "detune": 0, "type": "sine"}}, "p60nceo": {"type": "Gain", "left": 420, "top": 340, "connections": [["3gbjgsg_frequency"]], "params": {"gain": 1}}}};
var envTester = {"name": null, "level": 1, "nodes": {"4dc7s1g": {"type": "Oscillator", "left": 80, "top": 292, "connections": [["09at22_0"]], "params": {"frequency": "f", "detune": 0, "type": "triangle"}}, "09at22": {"type": "Gain", "left": 366, "top": 207, "connections": [["ohppcg_0"]], "params": {"gain": "0"}}, "ohppcg": {"type": "VolumeOverTime", "left": 646, "top": 60, "connections": [["Destination_0"]], "params": {"fftSize": 512, "minDecibels": -100, "maxDecibels": -30, "smoothingTimeConstant": 0}}}};
var custom = {"name": null, "level": 1, "nodes": {"gdd1jho": {"type": "Oscillator", "left": 10, "top": 10, "connections": [[]], "params": {"frequency": "f", "detune": 0, "type": "sine"}}, "t3s1618": {"type": "CustomOscillatorByFunctions", "left": 340, "top": 200, "connections": [["907gmpo_0", "Destination_0"]], "params": {"frequency": "f", "detune": 0, "real": "1/n", "imag": "0", "iter": "10"}}, "907gmpo": {"type": "WaveForm", "left": 660, "top": 112, "connections": [], "params": {"x": 1, "y": 25}}}};
var mic = {"name": null, "level": 1, "nodes": {"kjhjlto": {"type": "Oscillator", "left": 10, "top": 10, "connections": [[]], "params": {"frequency": "f", "detune": 0, "type": "sine"}}, "ttato1g": {"type": "Microphone", "left": 260, "top": 220, "connections": [["eot02e_0", "i8bs4ag_0", "kr41u7g_0"]], "params": {}}, "eot02e": {"type": "WaveForm", "left": 800, "top": 20, "connections": [], "params": {"x": 1, "y": 25}}, "i8bs4ag": {"type": "FrequencySpectrumAnalyser", "left": 820, "top": 300, "connections": [[]], "params": {"fftSize": 512, "minDecibels": -100, "maxDecibels": -30, "smoothingTimeConstant": 0.3}}, "kr41u7g": {"type": "TimeBasedSpectrogram", "left": 460, "top": 34, "connections": [[]], "params": {"fftSize": 512, "minDecibels": -100, "maxDecibels": -30, "smoothingTimeConstant": 0}}}};
var chordDetect = {"name": null, "level": 1, "nodes": {"ql4ello": {"type": "Oscillator", "left": 20, "top": 180, "connections": [[]], "params": {"frequency": "f", "detune": "0", "type": "triangle"}}, "9j1kq4o": {"type": "BiquadFilter", "left": 193, "top": 272, "connections": [["as81qgg_0"]], "params": {"frequency": "f", "detune": 0, "Q": "100", "gain": 0, "type": "bandpass"}}, "t34oba": {"type": "WaveForm", "left": 550, "top": 152, "connections": [], "params": {"x": 1, "y": 25}}, "bitv76g": {"type": "VolumeOverTime", "left": 900, "top": 151, "connections": [[]], "params": {"fftSize": 2048, "minDecibels": -100, "maxDecibels": -30, "smoothingTimeConstant": 0, "scale": 200}}, "7lfepvg": {"type": "Microphone", "left": 20, "top": 520, "connections": [["9j1kq4o_0"]], "params": {}}, "as81qgg": {"type": "Gain", "left": 200, "top": 73, "connections": [["t34oba_0", "bitv76g_0"]], "params": {"gain": 1}}}};
var semi = {"name": null, "level": 1, "nodes": {"p5vpgi8": {"type": "VolumeOverTime", "left": 349, "top": 300, "connections": [[]], "params": {"fftSize": 2048, "minDecibels": -100, "maxDecibels": -30, "smoothingTimeConstant": 0, "scale": "2000"}}, "blpamf8": {"type": "BiquadFilter", "left": 174, "top": 440, "connections": [[]], "params": {"frequency": "f", "detune": "-200", "Q": "100", "gain": 0, "type": "lowpass"}}, "b7uv90g": {"type": "BiquadFilter", "left": 147, "top": 260, "connections": [["3i8utho_0"]], "params": {"frequency": "f", "detune": "-100", "Q": "100", "gain": 0, "type": "bandpass"}}, "3i8utho": {"type": "VolumeOverTime", "left": 350, "top": 110, "connections": [[]], "params": {"fftSize": 2048, "minDecibels": -100, "maxDecibels": -30, "smoothingTimeConstant": 0, "scale": "2000"}}, "oc4d0rg": {"type": "VolumeOverTime", "left": 346, "top": -80, "connections": [[]], "params": {"fftSize": 2048, "minDecibels": -100, "maxDecibels": -30, "smoothingTimeConstant": 0, "scale": "2000"}}, "tavs728": {"type": "BiquadFilter", "left": 160, "top": 33, "connections": [["oc4d0rg_0"]], "params": {"frequency": "f", "detune": 0, "Q": "100", "gain": 0, "type": "bandpass"}}, "qmg0758": {"type": "VolumeOverTime", "left": 926, "top": 280, "connections": [[]], "params": {"fftSize": 2048, "minDecibels": -100, "maxDecibels": -30, "smoothingTimeConstant": 0, "scale": "2000"}}, "7qdctl": {"type": "BiquadFilter", "left": 727, "top": 433, "connections": [["qmg0758_0"]], "params": {"frequency": "f", "detune": "100", "Q": "100", "gain": 0, "type": "bandpass"}}, "qc8i6h": {"type": "VolumeOverTime", "left": 927, "top": 80, "connections": [[]], "params": {"fftSize": 2048, "minDecibels": -100, "maxDecibels": -30, "smoothingTimeConstant": 0, "scale": "2000"}}, "rv6i09g": {"type": "BiquadFilter", "left": 740, "top": 167, "connections": [["qc8i6h_0"]], "params": {"frequency": "f", "detune": "200", "Q": "100", "gain": 0, "type": "bandpass"}}, "mgbo0f8": {"type": "Microphone", "left": 20, "top": 340, "connections": [["r1tm4vg_0"]], "params": {}}, "r1tm4vg": {"type": "Gain", "left": 20, "top": 200, "connections": [["tavs728_0", "b7uv90g_0", "rv6i09g_0", "7qdctl_0"]], "params": {"gain": "100"}}}};


var scaleForMidi = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
function midiToFrequency(midi) {
    var aOffset = midi - 69;
    var a = 440;
    return a * Math.pow(2, aOffset / 12);
}
function noteToMidi(note) {
    var n = note[0];
    var o = parseInt(note.substring(note.length - 1));
    var noteIndex = scaleForMidi.indexOf(n);
    o++;
    return o * 12 + noteIndex;
}
function noteToFrequency(note) {
    return midiToFrequency(noteToMidi(note));
}