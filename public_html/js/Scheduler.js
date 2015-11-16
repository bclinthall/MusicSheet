/* 
 * Copyright B. Clint Hall 2014-2015.  All rights reserved.
 * Contact the author to discuss licensing.  theaetetus7  gmail.com
 */
function Scheduler(audioContext, instruments, voices, tempo) {
    var _this = this;
    var sampleVoices = [
        {name: "V1", notes: [{pitch: "C4", value: 1 / 4}, {pitch: "r", value: 1 / 4}, {pitch: "D4", value: 1 / 4}, {pitch: "r", value: 1 / 4}, {pitch: "E4", value: 1 / 4}, {pitch: "r", value: 1 / 4}]},
        //{scheduledToTime: 0, noteIndex: 0, notes: [{pitch: "C4", value: 1 / 8}, {pitch: "E4", value: 1 / 8}, {pitch: "r", value: 1 / 4}, {pitch: "D4", value: 1 / 8}, {pitch: "F4", value: 1 / 8},{pitch: "r", value: 1 / 4}, {pitch: "E4", value: 1 / 8}, {pitch: "G4", value: 1 / 8},{pitch: "r", value: 1 / 4}]},
        {name: "V2", notes: [{pitch: "E4", value: 1 / 4}, {pitch: "r", value: 1 / 4}, {pitch: "F4", value: 1 / 4}, {pitch: "r", value: 1 / 4}, {pitch: "G4", value: 1 / 4}, {pitch: "r", value: 1 / 4}]},
    ];
    /*var sampleEnv = {
     type: "asr",
     attackTime: 0.005,
     releaseTime: 0.1,
     decayToLevel: 0,
     decayTime: .2
     };*/
    _this.playing = false;
    var beatValue = 1 / 4;
    var maxScheduledToTime = 0;
    var lookAheadTime = .1; //s;
    var checkingInterval = .025; //s
    var secondsPerWholeNote = 2;
    _this.setTempo = function(tempo) {
        secondsPerWholeNote = 60 / tempo / beatValue;
    }
    _this.setVoices = function(voices) {
        _this.voices = voices;
        for (var i = 0; i < voices.length; i++) {
            var voice = voices[i];
            voice.noteIndex = voice.noteIndex || 0;
            voice.scheduledToTime = voice.scheduledToTime || 0;
        }
    }
    _this.setInstruments = function(instruments){
        _this.instruments = instruments;
    }
    tempo = tempo || 160;
    voices = voices || sampleVoices;
    _this.setTempo(tempo);
    _this.setVoices(voices);
    _this.setInstruments(instruments);
    var timerID;
    _this.play = function() {
        var currentTime = audioContext.currentTime;
        var minScheduledToTime = getMinScheduledToTime();
        for (var i = 0; i < _this.voices.length; i++) {
            _this.voices[i].scheduledToTime = (_this.voices[i].scheduledToTime - minScheduledToTime) + currentTime;
        }
        scheduler();
        _this.playing = true;
    };
    _this.pause = function() {
        window.clearTimeout(timerID);
        _this.playing = false;
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
                addNotes(i, currentTime);
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
    function addNotes(i, currentTime) {
        //for each voice, go through yet to be scheduled notes.
        //until the time the note should end is past the lookaheadTime
        //
        var voice = _this.voices[i];
        
        while (voice.scheduledToTime < currentTime + lookAheadTime 
                && voice.noteIndex < voice.notes.length) {
            
            var startTime = voice.scheduledToTime;
            //startTime = startTime > audioContext.currentTime ? startTime : audioContext.currentTime;
            var note = voice.notes[voice.noteIndex];
            var duration = note.value * secondsPerWholeNote;
        
            if (note.pitch !== 0) {
                _this.instruments[i].play(note.pitch, startTime, startTime + duration, 1);
            }
            scheduleHighlighting(note, startTime, duration);
        
            voice.scheduledToTime += duration;
            voice.noteIndex++;
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
}
/*
 * When pause, find highlighted notes, and put a special class or something
 * on the bar they are in.
 * When you make bars playable, start with that bar.
 */