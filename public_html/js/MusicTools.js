/* 
 * Copyright B. Clint Hall 2014-2015.  All rights reserved.
 * Contact the author to discuss licensing.  theaetetus7  gmail.com
 */
function MusicTools(){
    var numeric = new RegExp(/^\d+$/);
    function isNumeric(a) {
        return numeric.test(a);
    }
    var scaleForMidi = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    var flatScaleForMidi = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
    function midiToFrequency(midi) {
        var aOffset = midi - 69;
        var a = 440;
        return a * Math.pow(2, aOffset / 12);
    }
    function noteToMidi(note) {
        var n = note.substring(0,note.length - 1);
        var o = parseInt(note.substring(note.length - 1));
        var noteIndex = scaleForMidi.indexOf(n);
        if(noteIndex === -1){
            noteIndex = flatScaleForMidi.indexOf(n);
            if(noteIndex === -1){
                return false;
            }
        }
        
        o++;
        return o * 12 + noteIndex;
    }
    function midiToNote(midi, useFlats){
        if(midi===false) return false;
        var o = Math.floor(midi/scaleForMidi.length);
        var n = midi % scaleForMidi.length;
        n = useFlats ? flatScaleForMidi[n] : scaleForMidi[n];
        o--;
        return n+o;
    }
    function noteToFrequency(note) {
        return midiToFrequency(noteToMidi(note));
    }
    
    return {isNumeric: isNumeric, 
        midiToFrequency: midiToFrequency, 
        noteToMidi: noteToMidi, 
        noteToFrequency: noteToFrequency,
        midiToNote: midiToNote
    };
}
window.musicTools = new MusicTools();
/*
var svg = '<svg xmlns="http://www.w3.org/2000/svg" height="32" width="32">_    <circle cx="orbitX" cy="orbitY" r="orbitR" stroke="black" stroke-width="orbitS" fill="transparent"/>_    <circle cx="planetX" cy="planetY" r="planetR" stroke-width="0" fill="#888"/>_    <ellipse cx="planetX" cy="planetY" rx="ringRx" ry="ringRy" stroke="black" stroke-width="ringS" fill="transparent"/>_    <path d="M pax1 planetY A planetR planetR 0 0 1 pax2 planetY" stroke-width="0" fill="#888"/>_</svg>'
var p = {
    orbitX:-23,
    orbitY:-34,
    orbitR:64,
    orbitS:2,
    planetX:18,
    planetY:16,
    planetR:9,
    ringRx:13,
    ringRy:3,
    ringS:2,
    "_":"\n" 
}
function makeSvg(p,svg){
    p.pax1 = p.planetX - p.planetR;
    p.pax2 = p.planetX + p.planetR;
    for(var key in p){
        var val = p[key];
        var reg = new RegExp(key,"g");
        svg = svg.replace(reg, val);
    }
    return svg;
}
function moveXY(dx, dy){
    p.orbitX+=dx;
    p.orbitY+=dy;
    p.planetX+=dx;
    p.planetY+=dy;
}
function scale(s){
    p.planetR*=s;
    p.ringRx= p.planetR+5;
    p.ringRy = 4;
}

moveXY(-2,1);
scale(10/9);
*/