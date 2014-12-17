function Scheduler(tempo, voices) {
    var _this = this;
    var sampleVoices = [
        {name: "V1", notes: [{pitch: "C4", value: 1 / 4}, {pitch: "r", value: 1 / 4}, {pitch: "D4", value: 1 / 4}, {pitch: "r", value: 1 / 4}, {pitch: "E4", value: 1 / 4}, {pitch: "r", value: 1 / 4}]},
        //{scheduledToTime: 0, noteIndex: 0, notes: [{pitch: "C4", value: 1 / 8}, {pitch: "E4", value: 1 / 8}, {pitch: "r", value: 1 / 4}, {pitch: "D4", value: 1 / 8}, {pitch: "F4", value: 1 / 8},{pitch: "r", value: 1 / 4}, {pitch: "E4", value: 1 / 8}, {pitch: "G4", value: 1 / 8},{pitch: "r", value: 1 / 4}]},
        {name: "V2", notes: [{pitch: "E4", value: 1 / 4}, {pitch: "r", value: 1 / 4}, {pitch: "F4", value: 1 / 4}, {pitch: "r", value: 1 / 4}, {pitch: "G4", value: 1 / 4}, {pitch: "r", value: 1 / 4}]},
    ];
    var sampleEnv = {
        type: "asr",
        attackTime: 0.005,
        releaseTime: 0.1,
        decayToLevel: 0,
        decayTime: .2
    };
    
    var beatValue = 1 / 4;
    var maxScheduledToTime = 0;
    var lookAheadTime = .1; //s;
    var checkingInterval = .025; //s
    var secondsPerWholeNote = 2;
    var audioContext = new AudioContext();
    _this.setTempo = function(tempo) {
        secondsPerWholeNote = 60 / tempo / beatValue;
    }
    _this.setVoices = function(voices) {
        if(_this.voices){
            for (var i = 0; i < _this.voices.length; i++) {
                _this.voices[i].instrument.kill();
            }
        }
        _this.voices = voices;
        for (var i = 0; i < _this.voices.length; i++) {
            var voice = _this.voices[i];
            voice.noteIndex = voice.noteIndex || 0;
            voice.scheduledToTime = voice.scheduledToTime || 0;
            voice.env = voice.env || sampleEnv;
            voice.instrument = new Plucker_Old(audioContext);
        }
        makeVoiceLevelControls(voices);
    }
    tempo = tempo || 160;
    voices = voices || sampleVoices;
    _this.setTempo(tempo);
    _this.setVoices(voices);
    var timerID;
    _this.play = function() {
        var currentTime = audioContext.currentTime;
        var minScheduledToTime = getMinScheduledToTime();
        for (var i = 0; i < _this.voices.length; i++) {
            var voice = _this.voices[i];
            voice.scheduledToTime = (voice.scheduledToTime - minScheduledToTime) + currentTime;
        }
        scheduler();
    };
    _this.pause = function() {
        window.clearTimeout(timerID);
    }
    function makeVoiceLevelControls(voices) {
        $("#voiceLevels").empty();
        for (var i = 0; i < voices.length; i++) {
            voices[i].name = voices[i].name || i;
            var div = $("<div>").text(voices[i].name).appendTo("#voiceLevels");
            $("<input>").attr({
                type: "range",
                min: 0,
                max: 1,
                step: 0.1,
                id: voices[i].name + "Level"
            }).val(1).appendTo(div);

        }
    }
    function getParams(){
        var paramTypes = {
            ar:{
                envType: "ar",
                attackDur: .25,
                releaseDur: .25
            },
            organ:{
                envType:"asr",
                attackDur:.005,
                releaseDur:.1
            },
            pluck:{
                envType:"adr"
            }
        }
        var params = {
            envType: "adr",
            attackDur: parseFloat($("#attackDur").val()),
            decayDur: parseFloat($("#decayDur").val()),
            releaseDur: parseFloat($("#releaseDur").val()),
            decayToLevel: 0
        }
        params.courseDetune = parseFloat($("#courseDetune").val());
        params.fineDetune = parseFloat($("#fineDetune").val());
        params.beta= parseFloat($("#beta").val());
        return params;
    }
    function scheduler() {
        // while there are notes that will need to play before the next interval, 
        // schedule them and advance the pointer.
        lookAhead(audioContext.currentTime);
        timerID = window.setTimeout(scheduler, checkingInterval * 1000);
    }
    function lookAhead(currentTime) {
        for (var i = 0; i < _this.voices.length; i++) {
            var voice = _this.voices[i];
            if (voice.scheduledToTime < currentTime + lookAheadTime) {
                addNotes(voice, currentTime);
            }
        }
        setMaxScheduledToTime();
        var end = true;
        for (var i = 0; i < _this.voices.length; i++) {
            var voice = _this.voices[i];
            if (voice.noteIndex < voice.notes.length) {
                end = false;
            }
        }
        if (end) {
            _this.pause();
        }
    }

    function getMinScheduledToTime() {
        var minScheduledToTime = maxScheduledToTime;
        for (var i = 0; i < _this.voices.length; i++) {
            minScheduledToTime = minScheduledToTime > _this.voices[i].scheduledToTime ? _this.voices[i].scheduledToTime : minScheduledToTime;
        }
        return minScheduledToTime;
    }
    function setMaxScheduledToTime() {
        for (var i = 0; i < _this.voices.length; i++) {
            maxScheduledToTime = maxScheduledToTime < _this.voices[i].scheduledToTime ? _this.voices[i].scheduledToTime : maxScheduledToTime;
        }
    }
    function addNotes(voice, currentTime) {
        //for each voice, go through yet to be scheduled notes.
        //until the time the note should end is past the lookaheadTime
        //
        while (voice.scheduledToTime < currentTime + lookAheadTime && voice.noteIndex < voice.notes.length) {
            voice.scheduledToTime += scheduleNote(voice.scheduledToTime, voice.notes[voice.noteIndex], voice);
            voice.noteIndex++;
        }
    }
    function scheduleNote(startTime, note, voice) {
        var duration = note.value * secondsPerWholeNote;
        if (startTime < audioContext.currentTime) {
            //    duration -= audioContext.currentTime - startTime;
            startTime = audioContext.currentTime;
        }

        if (note.pitch !== 0) {
            playNote(note, voice, startTime, duration);
        }
        scheduleHighlighting(note, startTime, duration);
        return duration;
    }

    function playNote(note, voice, start, duration) {
        var voiceLevel = $("#" + voice.name + "Level").val()
        if(voiceLevel>0){
            voice.instrument.play(start, start+duration, note.pitch, getParams(), voiceLevel);
        }
    }
    function scheduleHighlighting(note, startTime, duration) {
        if (note.el && note.el.length > 0) {
            var startHighlight = (startTime - audioContext.currentTime) * 1000;
            var endHighlight = startHighlight + (duration * 1000);
            setTimeout(function() {
                note.el.addClass("highlight")
            }, startHighlight);
            setTimeout(function() {
                note.el.removeClass("highlight")
            }, endHighlight);
        }
    }
    function Osc(audioContext){
        var _this = this;
        _this.osc = audioContext.createOscillator();
        _this.osc.start(0);
        _this.gain = audioContext.createGain();
        _this.gain.gain.value = 0;
        _this.osc.connect(_this.gain);
        _this.out = _this.gain;
        _this.addEnvelope = function(){
            _this.releaseGain = audioContext.createGain();
            _this.releaseGain.gain.value = 0;
            _this.gain.connect(_this.releaseGain);
            _this.out = _this.releaseGain;
        }
        _this.play = function(start, stop, freq, params, gainLevel){
            gainLevel = isNaN(gainLevel) ? 1 : gainLevel;
            _this.osc.frequency.value = freq;
            if(_this.releaseGain){
                scheduleEnvelope(start, stop, _this.gain, _this.releaseGain, params, gainLevel);
            }else{
                _this.gain.gain.setValueAtTime(gainLevel, start);
                _this.gain.gain.setValueAtTime(0, stop);
            }
        }
        _this.connect = function(to){
            _this.out.connect(to);
        }
        _this.kill = function(){
            _this.osc.disconnect();
            _this.gain.disconnect();
            if(_this.releaseGain){
                _this.releaseGain.disconnect();
            }
            _this.osc.stop(0);
        };
    }
    function FMNode(audioContext) {
        var detune, modFreq;
        var car = new Osc(audioContext);
        var mod = new Osc(audioContext);
        car.addEnvelope();
        mod.connect(car.osc.frequency);
        car.connect(audioContext.destination);
        this.play = function(start, stop, freq, params, voiceLevel) {
            car.play(start, stop, freq, params, voiceLevel);
            detune = params.courseDetune + params.fineDetune / 100;
            modFreq = freq * Math.pow(2, detune / 12);
            mod.play(start, stop, modFreq, params, freq * params.beta);
        };
        this.kill = function(){
            car.kill();
            mod.kill();
        };
    }

    function scheduleEnvelope(start, stop, envGain, releaseGain, params, voiceLevel) {
        var envelopeTypes = {
            ar: function(start, stop, envGain, releaseGain, params, voiceLevel) {
                envGain.gain.cancelScheduledValues(start);
                envGain.gain.linearRampToValueAtTime(voiceLevel, start + params.attackDur);
                var releaseAt = start + params.attackDur + params.releaseDur;
                envGain.gain.exponentialRampToValueAtTime(0.01, releaseAt);
                envGain.gain.setValueAtTime(0, releaseAt);
                //doesn't do anything here;
                releaseGain.gain.cancelScheduledValues(start);
                releaseGain.gain.setValueAtTime(1, start);
                releaseGain.gain.setValueAtTime(0, releaseAt);
            },
            asr: function(start, stop, envGain, releaseGain, params, voiceLevel){
                envGain.gain.linearRampToValueAtTime(voiceLevel, start + params.attackDur);
                envGain.gain.setValueAtTime(0, stop);
                
                var releaseAt = stop - params.releaseDur;
                releaseGain.gain.setValueAtTime(1, start);
                releaseGain.gain.setValueAtTime(1, releaseAt);
                releaseGain.gain.linearRampToValueAtTime(0,stop);
            },
            adr: function(start, stop, envGain, releaseGain, params, voiceLevel){
                envGain.gain.linearRampToValueAtTime(voiceLevel, start + params.attackDur);
                envGain.gain.setTargetAtTime(params.decayToLevel, start + params.attackDur, params.decayDur);
                envGain.gain.setValueAtTime(0, stop);
                
                var releaseAt = stop - params.releaseDur;
                releaseGain.gain.setValueAtTime(1, start);
                releaseGain.gain.setValueAtTime(1, releaseAt);
                releaseGain.gain.linearRampToValueAtTime(0,stop);
            }
        }
        envelopeTypes[params.envType](start, stop, envGain, releaseGain, params, voiceLevel);
    }
    function Plucker(audioContext) {
        var detune, modFreq;
        var car = new Osc(audioContext);
        var mod = new Osc(audioContext);
        car.addEnvelope();
        mod.addEnvelope();
        mod.connect(car.osc.frequency);
        car.connect(audioContext.destination);
        this.play = function(start, stop, freq, params, voiceLevel) {
            car.play(start, stop, freq, params, voiceLevel);
            detune = params.courseDetune + params.fineDetune / 100;
            modFreq = freq * Math.pow(2, detune / 12);
            mod.play(start, stop, modFreq, params, freq * params.beta);
        };
        this.kill = function(){
            car.kill();
            mod.kill();
        };
    }
    function Plucker_Old(audioContext) {
        var detune, modFreq;
        var car = audioContext.createOscillator();
        var mod = audioContext.createOscillator();
        var modGain = audioContext.createGain();
        var envGain = audioContext.createGain();
        var releaseGain = audioContext.createGain();
        var modEnvGain = audioContext.createGain();
        var modReleaseGain = audioContext.createGain();
        
        releaseGain.gain.value = 0;
        mod.connect(modGain);
        modGain.connect(modEnvGain);
        modEnvGain.connect(modReleaseGain);
        modReleaseGain.connect(car.frequency);
        car.connect(envGain);
        envGain.connect(releaseGain);
        releaseGain.connect(audioContext.destination);
        car.start(0);
        mod.start(0);
        this.kill = function(){};
        this.play = function(start, stop, freq, params, voiceLevel) {
            car.frequency.value = freq;
            detune = params.courseDetune + params.fineDetune / 100;
            modFreq = freq * Math.pow(2, detune / 12);
            mod.frequency.value = modFreq;
            modGain.gain.value = freq * params.beta;
            scheduleEnvelope(start, stop, envGain, releaseGain, params, voiceLevel);
            scheduleEnvelope(start, stop, modEnvGain, modReleaseGain, params, voiceLevel);
            //{Optional???
            //car.start(start);
            //car.stop(stop);
            //mod.start(start);
            //mod.stop(stop);
            //}

        }
    }
}