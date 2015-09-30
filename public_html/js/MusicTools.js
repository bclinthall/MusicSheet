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
    function noteToFrequency(note) {
        return midiToFrequency(noteToMidi(note));
    }
    return {isNumeric: isNumeric, midiToFrequency: midiToFrequency, noteToMidi: noteToMidi, noteToFrequency: noteToFrequency};
}
window.musicTools = new MusicTools();