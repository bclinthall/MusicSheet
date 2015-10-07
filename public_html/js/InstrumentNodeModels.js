
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
            this.audioNode = audioContext.createOscillator();
            this.audioNode.start();
            return this.audioNode;
        },
        createPeriodicWave: function(node, freq, start, end) {
            var params = node.params;
            if (params.real.value && params.real.value.length > 0
                    && params.imag.value && params.imag.value.length > 0) {
                var real = params.real.value;
                var imag = params.imag.value;
                try {
                    if(node.instrument){
                        console.log(node.getCalculatedParamValue("real", freq, start, end).toArray())
                    }
                    var realAry = math.eval(real).toArray();
                    var imagAry = math.eval(imag).toArray();
                    var length = realAry.length;
                    
                    if (length !== imagAry.length) {
                        length = Math.max(length, imagAry.length);
                        console.log("Real and imaginary must be arrays of same length.  Shorter array is being filled in with zeros.")
                        return true;
                    }
                    real = new Float32Array(length);
                    imag = new Float32Array(length);
                    for (var i = 0; i < length; i++) {
                        real[i] = realAry[i] || 0;
                        imag[i] = imagAry[i] || 0;
                    }
                    console.log(real);
                    var wave = node.audioNode.context.createPeriodicWave(real, imag);
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
                type: "input",
                hint: "An array of the same length as imag.  For example [0, 1, 0, .25, 0, .125]",
                defaultVal: "[0, 1, 0, .25, 0, .125]",
                onSetValFunction: function(node, freq, start, end) {
                    return node.createPeriodicWave(node, freq, start, end);
                }
            },
            imag: {
                type: "input",
                hint: "An array of the same length as real.  For example [0, 0, .5, 0, .25, 0]",
                defaultVal: "[0, 0, .5, 0, .25, 0]",
                onSetValFunction: function(node, freq, start, end) {
                    return node.createPeriodicWave(node, freq, start, end);
                }
            },
        },
        playSpecial: function(freq, start, end) {

        },
        killSpecial: function() {
            this.audioNode.stop();
        }

    },
    CustomOscillatorByFunctions: {
        createNode: function(audioContext) {
            this.audioNode = audioContext.createOscillator();
            this.audioNode.start();
            return this.audioNode;
        },
        hint: "allows you to recursively create the arrays for a custom oscillator node.",
        createPeriodicWave: function(node, freq, start, end) {
            var params = node.params;
            if (params.real.value && params.real.value.length > 0
                    && params.imag.value && params.imag.value.length > 0) {
                var real = params.real.value;
                var imag = params.imag.value;
                var iter = node.getCalculatedParamValue("iter", freq, start, end);
                var realMathCode;
                var imagMathCode;
                try {
                    realMathCode = math.parse(real).compile();
                    imagMathCode = math.parse(imag).compile();
                    real = new Float32Array(iter);
                    imag = new Float32Array(iter);
                    for (var i = 0; i < iter; i++) {
                        real[i] = realMathCode.eval({n: i, f: freq, s: start, e: end});
                        imag[i] = imagMathCode.eval({n: i, f: freq, s: start, e: end});
                    }
                    console.log(real);
                    var wave = node.audioNode.context.createPeriodicWave(real, imag);
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
                type: "input",
                hint: "A function of n.",
                defaultVal: "1/n",
                onSetValFunction: function(node, freq, start, end) {
                    return node.createPeriodicWave(node, freq, start, end);
                }
            },
            imag: {
                type: "input",
                hint: "A function of n.",
                defaultVal: "0",
                onSetValFunction: function(node, freq, start, end) {
                    return node.createPeriodicWave(node, freq, start, end);
                }
            },
            iter: {
                type: "input",
                hint: "Positive Interger.  Times to run functions.",
                defaultVal: "1000",
                onSetValFunction: function(node, freq, start, end) {
                    return node.createPeriodicWave(node, freq, start, end);
                }
            }
        },
        playSpecial: function(freq, start, end) {

        },
        killSpecial: function() {
            this.audioNode.stop();
        }

    },
    WaveFormGraph: {
        createNode: function(audioContext) {
            this.audioNode = audioContext.createScriptProcessor(4096, 1, 1);
            this.setup(audioContext);
            return this.audioNode;

        },
        numberOfOutputs: 0,
        numberOfInputs: 1,
        params: {
            x: {
                type: "input",
                defaultVal: 1,
            },
            y: {
                type: "input",
                defaultVal: 25,
            },
            paused: {
                type: "boolean",
                defaultVal: false
            },
            canvas: {
                type: "canvas"
            }
        },
        setup: function(audioContext) {
            var context = audioContext;
            var sampleRate = context.sampleRate;
            var scriptProcessor = this.audioNode;
            var node = this;
            var canvas, ctx, cw, ch, ctx;
            scriptProcessor.onaudioprocess = function(audioProcessingEvent) {
                if (!canvas) {
                    var id = node.id;
                    canvas = $(".nodeDiv[data-nodeid=" + id + "] canvas")[0];//canvas = $(".nodeDiv[data-nodeid=8spm598] canvas")
                    if (canvas) {
                        ctx = canvas.getContext("2d");
                        ctx.fillStyle = "#fff";
                        cw = canvas.width;
                        ch = canvas.height;
                    } else {
                        return;
                    }

                }
                if (node.params.paused.value)
                    return;
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

        },
        killSpecial: function() {

        }
    },
    VolumeOverTimeGraph: {
        createNode: function(audioContext) {
            this.audioNode = audioContext.createAnalyser();
            this.setup(audioContext);
            return this.audioNode;
        },
        params: {
            fftSize: {
                type: "input",
                defaultVal: 2048,
                hint: "The size of the FFT used for frequency-domain analysis. This must be a power of two in the range 32 to 32768. Note that large FFT sizes can be costly to compute, but will draw data (especially for lower frequencies) more accurately."
            },
            minDecibels: {
                type: "input",
                hint: "The minimum power value in the scaling range for the FFT analysis data for conversion to unsigned byte values. The default value is -100. If the value of this attribute is set to a value more than or equal to maxDecibels, an IndexSizeError exception must be thrown."
            },
            maxDecibels: {
                type: "input",
                hint: "The maximum power value in the scaling range for the FFT analysis data for conversion to unsigned byte values. The default value is -30. If the value of this attribute is set to a value less than or equal to minDecibels, an IndexSizeError exception must be thrown."
            },
            smoothingTimeConstant: {
                type: "input",
                defaultVal: 0,
                hint: "A value from 0 -> 1 where 0 represents no time averaging with the last analysis frame. The default value is 0.8. If the value of this attribute is set to a value less than 0 or more than 1, an IndexSizeError exception must be thrown."
            },
            scale: {
                type: "input",
                defaultVal: 200,
            },
            canvas: {
                type: "canvas"
            },
        },
        setup: function(context) {
            var sampleRate = context.sampleRate;

            var node = this;
            var scriptProcessor = context.createScriptProcessor(1024, 1, 1);
            this.scriptProcessor = scriptProcessor;
            var analyser = this.audioNode;
            var tempCanvas = document.createElement("canvas");
            var tempCtx = tempCanvas.getContext("2d");
            tempCanvas.width = 300;
            tempCanvas.height = 150;

            var canvas, ctx, cw, ch, ctx;
            scriptProcessor.onaudioprocess = function(audioProcessingEvent) {
                if (!canvas) {
                    var id = node.id;
                    canvas = $(".nodeDiv[data-nodeid=" + id + "] canvas")[0];//canvas = $(".nodeDiv[data-nodeid=8spm598] canvas")
                    if (canvas) {
                        ctx = canvas.getContext("2d");
                        ctx.fillStyle = "#abc";
                        cw = canvas.width;
                        ch = canvas.height;
                    } else {
                        return;
                    }

                }
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
                ctx.fillStyle = "#abc";
                
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

        },
        killSpecial: function() {

        }
    },
    TimeBasedSpectrogram: {
        createNode: function(audioContext) {
            this.audioNode = audioContext.createAnalyser();
            this.setup(audioContext);
            return this.audioNode;
        },
        params: {
            fftSize: {
                type: "input",
                defaultVal: 512,
                hint: "The size of the FFT used for frequency-domain analysis. This must be a power of two in the range 32 to 32768, otherwise an IndexSizeError exception must be thrown. The default value is 2048. Note that large FFT sizes can be costly to compute."
            },
            minDecibels: {
                type: "input",
                hint: "The minimum power value in the scaling range for the FFT analysis data for conversion to unsigned byte values. The default value is -100. If the value of this attribute is set to a value more than or equal to maxDecibels, an IndexSizeError exception must be thrown."
            },
            maxDecibels: {
                type: "input",
                hint: "The maximum power value in the scaling range for the FFT analysis data for conversion to unsigned byte values. The default value is -30. If the value of this attribute is set to a value less than or equal to minDecibels, an IndexSizeError exception must be thrown."
            },
            smoothingTimeConstant: {
                type: "input",
                defaultVal: 0,
                hint: "A value from 0 -> 1 where 0 represents no time averaging with the last analysis frame. The default value is 0.8. If the value of this attribute is set to a value less than 0 or more than 1, an IndexSizeError exception must be thrown."
            },
            canvas: {
                type: "canvas"
            }
        },
        setup: function(context) {
            var scriptProcessor = context.createScriptProcessor(2048, 1, 1);
            this.scriptProcessor = scriptProcessor;
            var analyser = this.audioNode;
            var node = this;

            var tempCanvas = document.createElement("canvas"),
                    tempCtx = tempCanvas.getContext("2d");
            tempCanvas.width = 300;
            tempCanvas.height = 150;
            var hot = new chroma.scale(['#000000', '#ff0000', '#ffff00', '#ffffff']).domain([0, 300]);
            // when the javascript node is called
            // we use information from the analyzer node
            // to draw the volume
            var canvas, ctx, cw, ch, ctx;
            scriptProcessor.onaudioprocess = function(audioProcessingEvent) {
                if (!canvas) {
                    var id = node.id;
                    canvas = $(".nodeDiv[data-nodeid=" + id + "] canvas")[0];//canvas = $(".nodeDiv[data-nodeid=8spm598] canvas")
                    if (canvas) {
                        ctx = canvas.getContext("2d");
                        ctx.fillStyle = "#abc";
                        cw = canvas.width;
                        ch = canvas.height;
                    } else {
                        return;
                    }
                }
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

        },
        killSpecial: function() {

        }
    },
    FrequencySpectrumAnalyser: {
        createNode: function(audioContext) {
            this.audioNode = audioContext.createAnalyser();
            this.setup(audioContext);
            return this.audioNode;
        },
        params: {
            fftSize: {
                type: "input",
                defaultVal: 512,
                hint: "The size of the FFT used for frequency-domain analysis. This must be a power of two in the range 32 to 32768, otherwise an IndexSizeError exception must be thrown. The default value is 2048. Note that large FFT sizes can be costly to compute."
            },
            minDecibels: {
                type: "input",
                hint: "The minimum power value in the scaling range for the FFT analysis data for conversion to unsigned byte values. The default value is -100. If the value of this attribute is set to a value more than or equal to maxDecibels, an IndexSizeError exception must be thrown."
            },
            maxDecibels: {
                type: "input",
                hint: "The maximum power value in the scaling range for the FFT analysis data for conversion to unsigned byte values. The default value is -30. If the value of this attribute is set to a value less than or equal to minDecibels, an IndexSizeError exception must be thrown."
            },
            smoothingTimeConstant: {
                type: "input",
                defaultVal: 0.3,
                hint: "A value from 0 -> 1 where 0 represents no time averaging with the last analysis frame. The default value is 0.8. If the value of this attribute is set to a value less than 0 or more than 1, an IndexSizeError exception must be thrown."
            },
            canvas: {
                type: "canvas"
            }
        },
        setup: function(context) {
            var scriptProcessor = context.createScriptProcessor(2048, 1, 1);
            this.scriptProcessor = scriptProcessor;
            var analyser = this.audioNode;
            var node = this;


            // when the javascript node is called
            // we use information from the analyzer node
            // to draw the volume
            var node = this;
            var canvas, ctx, cw, ch, ctx;
            scriptProcessor.onaudioprocess = function(audioProcessingEvent) {
                if (!canvas) {
                    var id = node.id;
                    canvas = $(".nodeDiv[data-nodeid=" + id + "] canvas")[0];//canvas = $(".nodeDiv[data-nodeid=8spm598] canvas")
                    if (canvas) {
                        ctx = canvas.getContext("2d");
                        var gradient = ctx.createLinearGradient(0, 0, 0, 300);
                        gradient.addColorStop(1, '#000000');
                        gradient.addColorStop(0.75, '#ff0000');
                        gradient.addColorStop(0.25, '#ffff00');
                        gradient.addColorStop(0, '#ffffff');
                        ctx.fillStyle = gradient;
                        cw = canvas.width;
                        ch = canvas.height;
                    } else {
                        return;
                    }
                }

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

        },
        killSpecial: function() {

        }
    },
    VolumeBar: {
        createNode: function(audioContext) {
            this.audioNode = audioContext.createAnalyser();
            this.setup(audioContext);
            return this.audioNode;
        },
        params: {
            fftSize: {
                type: "input",
                defaultVal: 2048,
                hint: "The size of the FFT used for frequency-domain analysis. This must be a power of two in the range 32 to 32768, otherwise an IndexSizeError exception must be thrown. The default value is 2048. Note that large FFT sizes can be costly to compute."
            },
            minDecibels: {
                type: "input",
                hint: "The minimum power value in the scaling range for the FFT analysis data for conversion to unsigned byte values. The default value is -100. If the value of this attribute is set to a value more than or equal to maxDecibels, an IndexSizeError exception must be thrown."
            },
            maxDecibels: {
                type: "input",
                hint: "The maximum power value in the scaling range for the FFT analysis data for conversion to unsigned byte values. The default value is -30. If the value of this attribute is set to a value less than or equal to minDecibels, an IndexSizeError exception must be thrown."
            },
            smoothingTimeConstant: {
                type: "input",
                defaultVal: 0.3,
                hint: "A value from 0 -> 1 where 0 represents no time averaging with the last analysis frame. The default value is 0.8. If the value of this attribute is set to a value less than 0 or more than 1, an IndexSizeError exception must be thrown."
            },
            canvas: {
                type: "canvas"
            }
        },
        setup: function(context) {
            var scriptProcessor = context.createScriptProcessor(2048, 1, 1);
            this.scriptProcessor = scriptProcessor;
            var analyser = this.audioNode;
            var node = this;
            var canvas, ctx, cw, ch, ctx;
            scriptProcessor.onaudioprocess = function(audioProcessingEvent) {
                if (!canvas) {
                    var id = node.id;
                    canvas = $(".nodeDiv[data-nodeid=" + id + "] canvas")[0];//canvas = $(".nodeDiv[data-nodeid=8spm598] canvas")
                    if (canvas) {
                        ctx = canvas.getContext("2d");
                        var gradient = ctx.createLinearGradient(0, 0, 0, 300);
                        gradient.addColorStop(1, '#000000');
                        gradient.addColorStop(0.75, '#ff0000');
                        gradient.addColorStop(0.25, '#ffff00');
                        gradient.addColorStop(0, '#ffffff');
                        ctx.fillStyle = gradient;
                        cw = canvas.width;
                        ch = canvas.height;
                    } else {
                        return;
                    }
                }

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
    /*Buffer: {},*/
    BufferSource: {},
    ChannelMerger: {
        params: {
        },
        playSpecial: function(freq, start, end) {
        },
        killSpecial: function() {
        }
    },
    ChannelSplitter: {
        params: {
        },
        playSpecial: function(freq, start, end) {
        },
        killSpecial: function() {
        }},
    Convolver: {
        createNode: function(audioContext) {
            this.audioNode = audioContext.createConvolver();
            return this.audioNode;
        },
        buffer: null,
        params: {
            file: {
                type: "file",
                default: "null",
                onSetValFunction: function(node, freq, start, end) {
                    node.buffer = null;
                    node.gettingBuffer = true;
                    var file = node.getCalculatedParamValue("file");
                    console.log("file", file);

                    var reader = new FileReader();
                    reader.onload = function(evt) {
                        var data = evt.target.result;
                        node.instrument.audioContext.decodeAudioData(data, function(buffer) {
                            node.buffer = buffer;
                            node.gettingBuffer = false;
                            //if (node.audioNode === node.lastBufferedNode || !node.audioNode) {
                            //node.refreshAudioNode();
                            //return;
                            //}
                            node.audioNode.buffer = node.buffer;
                            //node.lastBufferedNode = node.audioNode;
                        });
                    }
                    reader.onerror = function(err) {
                        console.log(err);
                    }
                    function updateProgress(evt) {
                        // evt is an ProgressEvent.
                        if (evt.lengthComputable) {
                            var percentLoaded = Math.round((evt.loaded / evt.total) * 100);
                            console.log(percentLoaded);
                            // Increase the progress bar length.
                        }
                    }
                    reader.onprogress = updateProgress;

                    reader.readAsArrayBuffer(file);
                },
                onRefresh: function(node) {
                    if (node.buffer && node.buffer instanceof AudioBuffer) {
                        console.log(node.buffer);
                        node.audioNode.buffer = node.buffer;
                        node.lastBufferedNode = node.audioNode;

                    }
                },
            },
            normalize: {
                type: "boolean",
                hint: "Controls whether the impulse response from the buffer will be scaled by an equal-power normalization when the buffer atttribute is set. Its default value is true in order to achieve a more uniform output level from the convolver when loaded with diverse impulse responses. If normalize is set to false, then the convolution will be rendered with no pre-processing/scaling of the impulse response. Changes to this value do not take effect until the next time the buffer attribute is set."
            }
        },
        playSpecial: function(freq, start, end) {
            /*var node = this;
             if (!node.audioNode || node.audioNode === node.lastStartedNode) {
             if (node.audioNode) {
             var stopOldTime = start + node.getCalculatedParamValue("***maxOverlap", freq, start, end);
             node.audioNode.stop(stopOldTime);
             }
             node.refreshAudioNode();
             return;  //refreshAudioNode will call play again with a fresh audioNode installed.
             }
             
             if (node.buffer && node.buffer instanceof AudioBuffer) {
             var offset = node.getCalculatedParamValue("offset", freq, start, end);
             node.lastStartedNode = node.audioNode;
             if (end) {
             node.audioNode.start(start, offset, end - start);
             } else {
             node.audioNode.start(start, offset);
             }
             
             } else if (this.gettingBuffer) {
             setTimeout(function() {
             node.playSpecial(freq, start, end);
             }, 100);
             }*/

        },
        killSpecial: function() {
            this.audioNode.stop();
        }
    },
    "***PhaseShift":{
        createNode: function(context){
            this.audioNode = context.createDelay();
            return this.audioNode;
        },
        params: {
            Shift: {
                type: "range",
                min: 0,
                max: 360,
                step: 1,
                hint: "<p>In degrees, uses instrument frequency. </p><p>The Web Audio api has no phase controls and says nothing about phase.  Oscillators are not guaranteed to to have the same phase, and it seems that an oscillator's phase can shift because the computer had some hard work to do, so the phase shift node will not give consistent results.</p><p> ***PhaseShift is merely a wrapper for a DelayNode with DelayTime set to (1/instrumentFrequency) * (Shift/360).</p>",
                onSetValFunction: function(node, freq, start, end) {
                    var shift = node.params.Shift.value;
                    var delay = 1/freq * shift/360;
                    try{
                        node.audioNode.delayTime.setValueAtTime(delay, start)
                    }catch(err){
                        console.log(err);
                        return false;
                    }
                    return true;
                }
            }
        },
        playSpecial: function(freq, start, end) {
        },
        killSpecial: function() {
        }
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
    /*Envelope: {
     createNode: function(audioContext) {
     return audioContext.createGain();
     },
     params: {
     AttackDuration: {
     type: "input",
     hint: "Time (in seconds) to rise from 0 to attack level.",
     defaultVal: .005
     },
     AttackLevel: {
     type: "input",
     hint: "Attack level. 1 is 100%. Can go above 1.",
     defaultVal: 1
     },
     DecayDuration: {
     type: "input",
     hint: "Time (in seconds) to fall from attack level to sustain level.",
     defaultVal: 0.25
     },
     SustainLevel: {
     type: "input",
     hint: "Sustain level. 1 is 100%. Can go above 1.",
     defaultVal: 0
     },
     ReleaseDuration: {
     type: "input",
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
     },*/
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
                type: "input",
                min: 0,
                defaultVal: 0,
                hint: "The value the parameter will start changing to at the given time. " + InstrumentNodeModelsCommon.timeFreqArgs,
                onSetValFunction: function(node, freq, start, end) {
                    if (node.instrument)
                        node.instrument.cycleConnected(node.id, 0, node.doToConnected, {node: node, freq: freq, start: start, end: end})
                    return true;
                },
            },
            startTime: {
                type: "input",
                defaultVal: "s",
                hint: "The time at which the exponential approach will begin, in the same time coordinate system as the AudioContext's currentTime attribute. " + InstrumentNodeModelsCommon.timeFreqArgs,
                onSetValFunction: function(node, freq, start, end) {
                    if (node.instrument)
                        node.instrument.cycleConnected(node.id, 0, node.doToConnected, {node: node, freq: freq, start: start, end: end})
                    return true;
                }
            },
            timeConstant: {
                type: "input",
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
            audioParam.setValueAtTime(value, endTime);
        },
        params: {
            value: {
                type: "input",
                min: 0,
                defaultVal: 0,
                hint: "The value the parameter will linearly ramp to at the given time. " + InstrumentNodeModelsCommon.timeFreqArgs,
                onSetValFunction: function(node, freq, start, end) {
                    if (node.instrument)
                        node.instrument.cycleConnected(node.id, 0, node.doToConnected, {node: node, freq: freq, start: start, end: end})
                    return true;
                },
            },
            endTime: {
                type: "input",
                min: 0,
                defaultVal: "e",
                hint: "The time in the same time coordinate system as the AudioContext's currentTime attribute where the linear ramp ends. " + InstrumentNodeModelsCommon.timeFreqArgs,
                onSetValFunction: function(node, freq, start, end) {
                    if (node.instrument)
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
                type: "input",
                min: 0,
                defaultVal: 0,
                hint: "The value the parameter will linearly ramp to at the given time. " + InstrumentNodeModelsCommon.timeFreqArgs,
                onSetValFunction: function(node, freq, start, end) {
                    if (node.instrument)
                        node.instrument.cycleConnected(node.id, 0, node.doToConnected, {node: node, freq: freq, start: start, end: end})
                    return true;
                },
            },
            endTime: {
                type: "input",
                min: 0,
                defaultVal: "e",
                hint: "The time in the same time coordinate system as the AudioContext's currentTime attribute where the linear ramp ends. " + InstrumentNodeModelsCommon.timeFreqArgs,
                onSetValFunction: function(node, freq, start, end) {
                    if (node.instrument)
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
                type: "input",
                min: 0,
                defaultVal: 1e-4,
                hint: "The value the parameter will exponentially ramp to at the given time. " + InstrumentNodeModelsCommon.timeFreqArgs,
                onSetValFunction: function(node, freq, start, end) {
                    if (node.instrument)
                        node.instrument.cycleConnected(node.id, 0, node.doToConnected, {node: node, freq: freq, start: start, end: end})
                    return true;
                },
            },
            endTime: {
                type: "input",
                min: 0,
                defaultVal: "e",
                hint: "The time in the same time coordinate system as the AudioContext's currentTime attribute where the exponential ramp ends. " + InstrumentNodeModelsCommon.timeFreqArgs,
                onSetValFunction: function(node, freq, start, end) {
                    if (node.instrument)
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
    /*MediaElementSource: {},
     MediaStreamDestination: {},
     MediaStreamSource: {},*/
    Oscillator: {
        createNode: function(audioContext) {
            var audioNode = audioContext.createOscillator();
            audioNode.start();
            return audioNode;
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

        },
        killSpecial: function() {
            this.audioNode.stop();
        }
    },
    /*Panner: {
     },*/
    PeriodicWave: {},
    /*ScriptProcessor: {},*/
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
    /*WaveShaper: {},*/
    FileSource: {
        createNode: function(audioContext) {
            var node = this;
            this.audioNode = audioContext.createBufferSource();
            this.audioNode.onended = function() {
                this.audionNode = null;
            };
            window.fileNode = this;
            window.audioContext = audioContext;
            return this.audioNode;
        },
        buffer: null,
        gettingBuffer: false,
        startTime: 0,
        params: {
            file: {
                type: "file",
                default: "null",
                onSetValFunction: function(node, freq, start, end) {
                    if (!node.getCalculatedParamValue)
                        return;
                    node.buffer = null;
                    node.gettingBuffer = true;
                    var file = node.getCalculatedParamValue("file");
                    console.log("file", file);

                    var reader = new FileReader();
                    reader.onload = function(evt) {
                        var data = evt.target.result;
                        node.instrument.audioContext.decodeAudioData(data, function(buffer) {
                            node.buffer = buffer;
                            node.gettingBuffer = false;
                            //if (node.audioNode === node.lastBufferedNode || !node.audioNode) {
                            node.refreshAudioNode();
                            return;
                            //}
                            //node.audioNode.buffer = node.buffer;
                            //node.lastBufferedNode = node.audioNode;
                        });
                    }
                    reader.onerror = function(err) {
                        console.log(err);
                    }
                    function updateProgress(evt) {
                        // evt is an ProgressEvent.
                        if (evt.lengthComputable) {
                            var percentLoaded = Math.round((evt.loaded / evt.total) * 100);
                            console.log(percentLoaded);
                            // Increase the progress bar length.
                        }
                    }
                    reader.onprogress = updateProgress;

                    reader.readAsArrayBuffer(file);
                },
                onRefresh: function(node) {
                    if (node.buffer && node.buffer instanceof AudioBuffer) {
                        console.log(node.buffer);
                        node.audioNode.buffer = node.buffer;
                        node.lastBufferedNode = node.audioNode;

                    }
                },
            },
            detune: {
                type: "audioParam",
                min: -1200,
                max: 1200,
                hint: "detuning of oscillation in cents."
            },
            loop: {
                type: "boolean",
            },
            loopStart: {
                type: "input"
            },
            loopEnd: {
                type: "input"},
            playbackRate: {
                type: "audioParam",
                hint: "defines the speed factor at which the audio asset will be played. Since no pitch correction is applied on the output, this can be used to change the pitch of the sample."
            },
            offset: {
                type: "input",
                defaultVal: 0

            },
            "***maxOverlap": {
                type: "input",
                hint: "Each time FileSource is asked to play, a new BufferSourceNode is created to play.  This parameter controls how long the previous BufferSource node will be allowed to play after the new one has started.",
                defaultVal: 3
            }
        },
        playSpecial: function(freq, start, end) {
            var node = this;
            if (!node.audioNode || node.audioNode === node.lastStartedNode) {
                if (node.audioNode) {
                    var stopOldTime = start + node.getCalculatedParamValue("***maxOverlap", freq, start, end);
                    node.audioNode.stop(stopOldTime);
                }
                node.refreshAudioNode();
                return;  //refreshAudioNode will call play again with a fresh audioNode installed.
            }

            if (node.buffer && node.buffer instanceof AudioBuffer) {
                var offset = node.getCalculatedParamValue("offset", freq, start, end);
                node.lastStartedNode = node.audioNode;
                if (end) {
                    node.audioNode.start(start, offset, end - start);
                } else {
                    node.audioNode.start(start, offset);
                }

            } else if (this.gettingBuffer) {
                setTimeout(function() {
                    node.playSpecial(freq, start, end);
                }, 100);
            }

        },
        killSpecial: function() {
            this.audioNode.stop();
        }
    },
};

var ExampleInstruments = {}
ExampleInstruments["EX1_FM_Modulator"] = {
    "name": "FM_Modulator",
    "level": 1,
    "exampleText":"<p>This is an FM synth example.  The frequency of one "+
            "oscillator is modified by another.</p><p>  When the web audio api "+
            "connects an output to an AudioParam (here it is the output of the "+
            "gain to the frequency AudioParam of the second oscillator (the "+
            "carrier), the output is added to the basic value.</p><p>The amount "+
            "of frequency modulation is controlled by the GainNode.  Typically "+
            "amount of modulation is measured by modulation index.  In this "+
            "context, the modulation index is gain / the frequency of the first "+
            "oscillator (the modulator).  So, when the modultor's frequency is <code>f*2</code>, and the gain is <code>f*2 *1</code>, the index of modulation is 1. "+
            "If you leave the modulator's frequency at <code>f*2</code>, you can get a "+
            "modulation index of 3 by setting the gain to <code>f*2*3</code>.  If you change the modulator's frequency "+
            "to <code>f*1</code>, but want to keep a modulation index of 1, change the gain to <code>f*1 *1</code></p><p>The phase difference between "+
            "the modulator and the carrier doesn't really affect (throw a "+
            "TimeBasedSpectrogram in there to have a look), but it does unfortunately "+
            "affect the volume a bit (throw in a VolumeOverTimeGraph).  But most of all, "+
            "it affects the shape of the wave form.  If you want to get the WaveForm graph to \n\
            look something like it does in <a "+
            "href='https://commons.wikimedia.org/wiki/File%3AFrequencymodulationdemo-td.png' target='_blank'>this"+
            "</a> image, you'll need to fool with the phase shift some.</p>",
    "nodes": {
        "ve5lfe": {
            "type": "Oscillator",
            "left": 32,
            "top": 500,
            "connections": [
                [
                    "mvhl8a_0"
                ]
            ],
            "params": {
                "frequency": "f*2",
                "detune": "0",
                "type": "sine"
            }
        },
        "ruivl88": {
            "type": "Gain",
            "left": 40,
            "top": 220,
            "connections": [
                [
                    "h3e7o2o_frequency"
                ]
            ],
            "params": {
                "gain": "f*2 *1"
            }
        },
        "h3e7o2o": {
            "type": "Oscillator",
            "left": 26,
            "top": 49,
            "connections": [
                [
                    "foo2h7_0",
                    "Destination_0"
                ]
            ],
            "params": {
                "frequency": "f",
                "detune": 0,
                "type": "sine"
            }
        },
        "foo2h7": {
            "type": "WaveFormGraph",
            "left": 408,
            "top": 60,
            "connections": [],
            "params": {
                "x": 1,
                "y": "75"
            }
        },
        "mvhl8a": {
            "type": "***PhaseShift",
            "left": 60,
            "top": 340,
            "connections": [
                [
                    "ruivl88_0"
                ]
            ],
            "params": {
                "Shift": "130"
            }
        }
    }
}
 
ExampleInstruments["EX1_echo"] = {"name": "echo", "level": 1, "nodes": {"dh8b7g": {"type": "Oscillator", "left": 107, "top": 160, "connections": [["1lknah8_0"]], "params": {"frequency": "f", "detune": 0, "type": "sine"}}, "1lknah8": {"type": "Gain", "left": 353, "top": 140, "connections": [["ipuj44g_0"]], "params": {"gain": 1}}, "0855u": {"type": "Delay", "left": 871, "top": 146, "connections": [["ipuj44g_0"]], "params": {"delayTime": "1"}}, "ipuj44g": {"type": "Gain", "left": 640, "top": 149, "connections": [["0855u_0", "Destination_0"]], "params": {"gain": "0.75"}}, "4aop63g": {"type": "setTargetAtTime", "left": 540, "top": 412, "connections": [["1lknah8_gain"]], "params": {"target": 0, "startTime": "s", "timeConstant": "1"}}}}
var analysis = {"name": "analysis", "level": 1, "nodes": {"37mv4k8": {"type": "Oscillator", "left": 120, "top": 180, "connections": [["ogf766_0"]], "params": {"frequency": "f", "detune": 0, "type": "sine"}}, "n8s2c7o": {"type": "VolumeBarAnalyser", "left": 610, "top": 180, "connections": [[]], "params": {"fftSize": 2048, "minDecibels": -100, "maxDecibels": -30, "smoothingTimeConstant": 0.3}}, "ogf766": {"type": "Gain", "left": 367, "top": 73, "connections": [["Destination_0", "n8s2c7o_0"]], "params": {"gain": 1}}, "fbjnjm": {"type": "ExponentialRampToValue", "left": 380, "top": 340, "connections": [["ogf766_gain"]], "params": {"value": "0.1", "endTime": "e"}}}};
var volAna = {"name": "volAna", "level": 1, "nodes": {"4dc7s1g": {"type": "Oscillator", "left": 13, "top": 520, "connections": [["09at22_0"]], "params": {"frequency": "f", "detune": 0, "type": "triangle"}}, "09at22": {"type": "Gain", "left": 200, "top": 410, "connections": [["ohppcg_0"]], "params": {"gain": "0"}}, "ohppcg": {"type": "VolumeOverTime", "left": 14, "top": 20, "connections": [["Destination_0"]], "params": {"fftSize": 512, "minDecibels": -100, "maxDecibels": -30, "smoothingTimeConstant": 0.8, "scale": "200"}}, "m70r4u": {"type": "LinearRampToValue", "left": 213, "top": 560, "connections": [["09at22_gain"]], "params": {"value": "1", "endTime": "e"}}}};
ExampleInstruments["EX2_pluck"] = {"name": "pluck", "level": 1, "nodes": {"3lamov": {"type": "Oscillator", "left": 320, "top": 90, "connections": [["jr8v4pg_0"]], "params": {"frequency": "f", "detune": 0, "type": "sine"}}, "seb59a8": {"type": "Oscillator", "left": 60, "top": 467, "connections": [["ft27k2o_0"]], "params": {"frequency": "f", "detune": 0, "type": "sine"}}, "ft27k2o": {"type": "Gain", "left": 160, "top": 280, "connections": [["3lamov_frequency"]], "params": {"gain": "f"}}, "jr8v4pg": {"type": "Gain", "left": 600, "top": 69, "connections": [["Destination_0"]], "params": {"gain": 1}}, "k6ieo6g": {"type": "ExponentialRampToValue", "left": 586, "top": 507, "connections": [["ft27k2o_gain", "3lamov_detune", "jr8v4pg_gain"]], "params": {"value": 0.0001, "endTime": "e"}}}};
var wave = {"name": "wave", "level": 1, "nodes": {"3gbjgsg": {"type": "Oscillator", "left": 607, "top": 212, "connections": [["r0ejkm_0", "Destination_0"]], "params": {"frequency": "f", "detune": 0, "type": "sine"}}, "r0ejkm": {"type": "WaveForm", "left": 829, "top": 100, "connections": [[]], "params": {"x": 1, "y": 10}}, "m5mvmqg": {"type": "Oscillator", "left": 160, "top": 394, "connections": [["p60nceo_0"]], "params": {"frequency": "f", "detune": 0, "type": "sine"}}, "p60nceo": {"type": "Gain", "left": 420, "top": 340, "connections": [["3gbjgsg_frequency"]], "params": {"gain": 1}}}};
var envTester = {"name": "envTester", "level": 1, "nodes": {"4dc7s1g": {"type": "Oscillator", "left": 80, "top": 292, "connections": [["09at22_0"]], "params": {"frequency": "f", "detune": 0, "type": "triangle"}}, "09at22": {"type": "Gain", "left": 366, "top": 207, "connections": [["ohppcg_0"]], "params": {"gain": "0"}}, "ohppcg": {"type": "VolumeOverTime", "left": 646, "top": 60, "connections": [["Destination_0"]], "params": {"fftSize": 512, "minDecibels": -100, "maxDecibels": -30, "smoothingTimeConstant": 0}}}};
var custom = {"name": "custom", "level": 1, "nodes": {"gdd1jho": {"type": "Oscillator", "left": 10, "top": 10, "connections": [[]], "params": {"frequency": "f", "detune": 0, "type": "sine"}}, "t3s1618": {"type": "CustomOscillatorByFunctions", "left": 340, "top": 200, "connections": [["907gmpo_0", "Destination_0"]], "params": {"frequency": "f", "detune": 0, "real": "1/n", "imag": "0", "iter": "10"}}, "907gmpo": {"type": "WaveForm", "left": 660, "top": 112, "connections": [], "params": {"x": 1, "y": 25}}}};

var mic = {"name": "mic", "level": 1, "nodes": {"kjhjlto": {"type": "Oscillator", "left": 10, "top": 10, "connections": [[]], "params": {"frequency": "f", "detune": 0, "type": "sine"}}, "ttato1g": {"type": "Microphone", "left": 260, "top": 220, "connections": [["eot02e_0", "i8bs4ag_0", "kr41u7g_0"]], "params": {}}, "eot02e": {"type": "WaveForm", "left": 800, "top": 20, "connections": [], "params": {"x": 1, "y": 25}}, "i8bs4ag": {"type": "FrequencySpectrumAnalyser", "left": 820, "top": 300, "connections": [[]], "params": {"fftSize": 512, "minDecibels": -100, "maxDecibels": -30, "smoothingTimeConstant": 0.3}}, "kr41u7g": {"type": "TimeBasedSpectrogram", "left": 460, "top": 34, "connections": [[]], "params": {"fftSize": 512, "minDecibels": -100, "maxDecibels": -30, "smoothingTimeConstant": 0}}}};
var chordDetect = {"name": "chordDetect", "level": 1, "nodes": {"ql4ello": {"type": "Oscillator", "left": 20, "top": 180, "connections": [[]], "params": {"frequency": "f", "detune": "0", "type": "triangle"}}, "9j1kq4o": {"type": "BiquadFilter", "left": 193, "top": 272, "connections": [["as81qgg_0"]], "params": {"frequency": "f", "detune": 0, "Q": "100", "gain": 0, "type": "bandpass"}}, "t34oba": {"type": "WaveForm", "left": 550, "top": 152, "connections": [], "params": {"x": 1, "y": 25}}, "bitv76g": {"type": "VolumeOverTime", "left": 900, "top": 151, "connections": [[]], "params": {"fftSize": 2048, "minDecibels": -100, "maxDecibels": -30, "smoothingTimeConstant": 0, "scale": 200}}, "7lfepvg": {"type": "Microphone", "left": 20, "top": 520, "connections": [["9j1kq4o_0"]], "params": {}}, "as81qgg": {"type": "Gain", "left": 200, "top": 73, "connections": [["t34oba_0", "bitv76g_0"]], "params": {"gain": 1}}}};
var semi = {"name": "semi", "level": 1, "nodes": {"p5vpgi8": {"type": "VolumeOverTime", "left": 349, "top": 300, "connections": [[]], "params": {"fftSize": 2048, "minDecibels": -100, "maxDecibels": -30, "smoothingTimeConstant": 0, "scale": "2000"}}, "blpamf8": {"type": "BiquadFilter", "left": 174, "top": 440, "connections": [[]], "params": {"frequency": "f", "detune": "-200", "Q": "100", "gain": 0, "type": "lowpass"}}, "b7uv90g": {"type": "BiquadFilter", "left": 147, "top": 260, "connections": [["3i8utho_0"]], "params": {"frequency": "f", "detune": "-100", "Q": "100", "gain": 0, "type": "bandpass"}}, "3i8utho": {"type": "VolumeOverTime", "left": 350, "top": 110, "connections": [[]], "params": {"fftSize": 2048, "minDecibels": -100, "maxDecibels": -30, "smoothingTimeConstant": 0, "scale": "2000"}}, "oc4d0rg": {"type": "VolumeOverTime", "left": 346, "top": -80, "connections": [[]], "params": {"fftSize": 2048, "minDecibels": -100, "maxDecibels": -30, "smoothingTimeConstant": 0, "scale": "2000"}}, "tavs728": {"type": "BiquadFilter", "left": 160, "top": 33, "connections": [["oc4d0rg_0"]], "params": {"frequency": "f", "detune": 0, "Q": "100", "gain": 0, "type": "bandpass"}}, "qmg0758": {"type": "VolumeOverTime", "left": 926, "top": 280, "connections": [[]], "params": {"fftSize": 2048, "minDecibels": -100, "maxDecibels": -30, "smoothingTimeConstant": 0, "scale": "2000"}}, "7qdctl": {"type": "BiquadFilter", "left": 727, "top": 433, "connections": [["qmg0758_0"]], "params": {"frequency": "f", "detune": "100", "Q": "100", "gain": 0, "type": "bandpass"}}, "qc8i6h": {"type": "VolumeOverTime", "left": 927, "top": 80, "connections": [[]], "params": {"fftSize": 2048, "minDecibels": -100, "maxDecibels": -30, "smoothingTimeConstant": 0, "scale": "2000"}}, "rv6i09g": {"type": "BiquadFilter", "left": 740, "top": 167, "connections": [["qc8i6h_0"]], "params": {"frequency": "f", "detune": "200", "Q": "100", "gain": 0, "type": "bandpass"}}, "mgbo0f8": {"type": "Microphone", "left": 20, "top": 340, "connections": [["r1tm4vg_0"]], "params": {}}, "r1tm4vg": {"type": "Gain", "left": 20, "top": 200, "connections": [["tavs728_0", "b7uv90g_0", "rv6i09g_0", "7qdctl_0"]], "params": {"gain": "100"}}}};


ExampleInstruments["1"] = {"name":"1","level":1,"nodes":{"3aos7i":{"type":"Oscillator","left":392,"top":133,"connections":[["Destination_0"]],"params":{"frequency":"f","detune":0,"type":"triangle"}}},"tutorial":"1"}
ExampleInstruments["2"] = {"name":"2","level":1,"nodes":{"3aos7i":{"type":"Oscillator","left":460,"top":254,"connections":[["13jtkso_0"]],"params":{"frequency":"f","detune":0,"type":"triangle"}},"13jtkso":{"type":"Gain","left":460,"top":70,"connections":[["Destination_0"]],"params":{"gain":1}}},"tutorial":"2"}
ExampleInstruments["3"] = {"name":"3","level":1,"nodes":{"nv76ovo":{"type":"Oscillator","left":32,"top":100,"connections":[["Destination_0"]],"params":{"frequency":"f","detune":0,"type":"sine"}},"akau63g":{"type":"Oscillator","left":29,"top":289,"connections":[["Destination_0"]],"params":{"frequency":"f*2","detune":0,"type":"sine"}}},"tutorial":"3"}
ExampleInstruments["4"] = {"name":"4","level":1,"nodes":{"nv76ovo":{"type":"Oscillator","left":11,"top":434,"connections":[["n0f03qg_0"]],"params":{"frequency":"f","detune":0,"type":"sine"}},"n0f03qg":{"type":"Gain","left":20,"top":280,"connections":[["lapac1_0","Destination_0"]],"params":{"gain":1}},"akau63g":{"type":"Oscillator","left":220,"top":433,"connections":[["n0f03qg_gain"]],"params":{"frequency":"1/2","detune":0,"type":"sine"}},"lapac1":{"type":"VolumeOverTimeGraph","left":180,"top":28,"connections":[[]],"params":{"fftSize":2048,"minDecibels":-100,"maxDecibels":-30,"smoothingTimeConstant":0,"scale":"100"}}},"tutorial":"4"}
ExampleInstruments["5"] = {"name":"5","level":1,"nodes":{"3aos7i":{"type":"Oscillator","left":20,"top":140,"connections":[["cg63oj8_0"]],"params":{"frequency":"f","detune":0,"type":"triangle"}},"cg63oj8":{"type":"Gain","left":146,"top":31,"connections":[["tie91gg_0","Destination_0"]],"params":{"gain":"0"}},"86ea7c":{"type":"ExponentialRampToValue","left":228,"top":431,"connections":[["cg63oj8_gain"]],"params":{"value":0.0001,"endTime":"e"}},"tie91gg":{"type":"VolumeOverTimeGraph","left":332,"top":60,"connections":[[]],"params":{"fftSize":2048,"minDecibels":-100,"maxDecibels":-30,"smoothingTimeConstant":0,"scale":200}},"b5m74c8":{"type":"LinearRampToValue","left":34,"top":380,"connections":[["cg63oj8_gain"]],"params":{"value":"1","endTime":"s+0.25"}}},"tutorial":"5"}
ExampleInstruments["6"] = {"name":"6","level":1,"nodes":{"ve5lfe":{"type":"Oscillator","left":32,"top":500,"connections":[["mvhl8a_0"]],"params":{"frequency":"f*2","detune":"0","type":"sine"}},"ruivl88":{"type":"Gain","left":40,"top":220,"connections":[["h3e7o2o_frequency"]],"params":{"gain":"f*2 *1"}},"h3e7o2o":{"type":"Oscillator","left":26,"top":49,"connections":[["foo2h7_0","Destination_0"]],"params":{"frequency":"f","detune":0,"type":"sine"}},"foo2h7":{"type":"WaveFormGraph","left":231,"top":48,"connections":[],"params":{"x":1,"y":"75"}},"mvhl8a":{"type":"***PhaseShift","left":60,"top":340,"connections":[["ruivl88_0"]],"params":{"Shift":"130"}}},"tutorial":"6"}
ExampleInstruments["7"] = {"name":"7","level":1,"nodes":{"5kc83e":{"type":"FileSource","left":20,"top":230,"connections":[["sap97ug_0","Destination_0"]],"params":{"detune":0,"loop":false,"loopStart":0,"loopEnd":0,"playbackRate":1,"offset":0,"***maxOverlap":3}},"sap97ug":{"type":"Convolver","left":66,"top":54,"connections":[["Destination_0"]],"params":{"normalize":true}}},"tutorial":"7"}

for (var key in ExampleInstruments) {
    localStorage.setItem("instrument-" + key, JSON.stringify(ExampleInstruments[key]));
}
