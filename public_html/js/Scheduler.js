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
        _this.voices = voices;
        for (var i = 0; i < _this.voices.length; i++) {
            var voice = _this.voices[i];
            voice.noteIndex = voice.noteIndex || 0;
            voice.scheduledToTime = voice.scheduledToTime || 0;
            voice.env = voice.env || sampleEnv;
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
    
    function playNote(note, voice, startTime, duration) {
        console.log(voice.name, note.pitch, duration)
        var osc = makeFMNode(audioContext, note.pitch, parseInt($("#courseDetune").val()), parseInt($("#fineDetune").val()), parseFloat($("#beta").val()), startTime, startTime + duration, voice);
        var envGain = connectEnvelope(osc, audioContext, voice.env, startTime, duration);
        var levelGain = audioContext.createGain();
        envGain.connect(levelGain);
        levelGain.gain.value = $("#" + voice.name + "Level").val();
        levelGain.connect(audioContext.destination);
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
    function makeFMNode(audioContext, freq, courseDetune, fineDetune, beta, start, stop) {
        var car = audioContext.createOscillator();
        car.frequency.value = freq;
        var mod = audioContext.createOscillator();
        var detune = courseDetune + fineDetune / 100;
        var modFreq = freq * Math.pow(2, detune / 12);
        var modGain = audioContext.createGain();
        mod.frequency.value = modFreq;
        modGain.gain.value = freq * beta;
        mod.connect(modGain);
        modGain.connect(car.frequency);
        car.start(start);
        car.stop(stop);
        mod.start(start);
        mod.stop(stop);
        return car;
    }
    function makePluck(audioContext, freq, courseDetune, fineDetune, beta, start, stop, voice) {
        var car = audioContext.createOscillator();
        car.frequency.value = freq;
        var mod = audioContext.createOscillator();
        var detune = courseDetune + fineDetune / 100;
        var modFreq = freq * Math.pow(2, detune / 12);
        var modGain = audioContext.createGain();
        mod.frequency.value = modFreq;
        modGain.gain.value = freq * beta;
        mod.connect(modGain);
        //modGain.connect(car.frequency);
        var envGain = connectEnvelope(modGain, audioContext, voice.env, start, stop - start);
        modGain.connect(envGain);
        envGain.connect(car.frequency);
        car.start(start);
        car.stop(stop);
        mod.start(start);
        mod.stop(stop);
        return car;
    }
    var connectEnvelope = function(node, audioContext, voiceEnv, startTime, duration) {
        return connectEnvelope.envelopes[voiceEnv.type](node, audioContext, voiceEnv, startTime, duration);
    }
    connectEnvelope.connectReleaseGain = function(node, audioContext, voiceEnv, startTime, duration) {
        var currentTime = audioContext.currentTime;
        var releaseGain = audioContext.createGain();
        releaseGain.gain.setValueAtTime(1, startTime);
        releaseGain.gain.setValueAtTime(1, startTime + duration - voiceEnv.releaseTime);
        releaseGain.gain.linearRampToValueAtTime(0, startTime + duration);
        node.connect(releaseGain);
        return releaseGain;
    }
    connectEnvelope.envelopes = {
        ar: function(node, audioContext, voiceEnv, startTime, duration) {
            var attackTime = voiceEnv.attackTime;
            var releaseTime = voiceEnv.releaseTime;
            var envGain = audioContext.createGain();
            envGain.gain.cancelScheduledValues(startTime);
            envGain.gain.setValueAtTime(0, startTime);
            envGain.gain.linearRampToValueAtTime(1, startTime + attackTime);
            var releaseAt = startTime + attackTime + releaseTime;
            envGain.gain.exponentialRampToValueAtTime(0.01, releaseAt);
            node.connect(envGain);
            return envGain;
        },
        asr: function(node, audioContext, voiceEnv, startTime, duration) {
            var attackTime = voiceEnv.attackTime;
            var envGain = audioContext.createGain();
            envGain.gain.cancelScheduledValues(startTime);
            envGain.gain.setValueAtTime(0, startTime);
            envGain.gain.linearRampToValueAtTime(1, startTime + attackTime);
            node.connect(envGain);
            return connectEnvelope.connectReleaseGain(envGain, audioContext, voiceEnv, startTime, duration);
        },
        adr: function(node, audioContext, voiceEnv, startTime, duration) {
            var attackTime = voiceEnv.attackTime;
            var decayTime = voiceEnv.decayTime;
            var decayToLevel = voiceEnv.decayToLevel;
            var envGain = audioContext.createGain();
            envGain.gain.cancelScheduledValues(startTime);
            envGain.gain.setValueAtTime(0, startTime);
            envGain.gain.linearRampToValueAtTime(1, startTime + attackTime);

            envGain.gain.setTargetAtTime(decayToLevel, startTime + attackTime, decayTime);
            node.connect(envGain);
            return connectEnvelope.connectReleaseGain(envGain, audioContext, voiceEnv, startTime, duration);
        },
    }
    function makeEnvelope(voice) {
        var attackTime = voice.instrument.env.attackTime;
        var releaseTime = voice.instrument.env.releaseTime;

        var envGain = audioContext.createGain();
        envGain.gain.cancelScheduledValues(startTime);
        envGain.gain.setValueAtTime(0, startTime);
        envGain.gain.linearRampToValueAtTime(1, startTime + attackTime);
        envGain.gain.linearRampToValueAtTime(0, startTime + duration - releaseTime);
    }
}