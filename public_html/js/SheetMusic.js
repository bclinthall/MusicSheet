function System(systemDiv) {
    if (!systemDiv || !$.contains(document, systemDiv[0])) {
        return {};
    }
    systemDiv.addClass("system");
    if ($(".system").length === 1) {
        $(document).on("keydown", function(e) {
            if (e.which === 32) {
                e.preventDefault();
                scheduler.pause();
            }
        })
    }
    var scale = "CDEFGAB";
    var posValuesAry = ["0.015625", "0.046875", "0.0625", "0.09375", "0.125", "0.1875", "0.25", "0.375", "0.5", "0.75", "1", "1.5"]
    var notesSym = {
        t: "&#x72;",
        s: "x",
        e: "e",
        q: "q",
        h: "h",
        w: "w"
    };
    var restSym = {
        t: "&#xa8;",
        s: "&#xc5;",
        e: "&#xe4;",
        q: "&#xce;",
        h: "&#xee;",
        w: "&#xee;"
    }
    var durSym = {
        t: "1D162",
        s: "1D161",
        e: "1D160",
        q: "1D15F",
        h: "1D15E",
        w: "1D15D",
    }
    var otherSym = {
        f: "\\1D12C",
        s: "\\1D130",
        n: "\\1D12E",
        x: ""
    }
    var dotSym = ["", "\\1D16D"]

    var valsLtoN = {
        t: 1 / 64,
        dt: 1 / 32 + 1 / 64,
        s: 1 / 16,
        ds: 1 / 16 + 1 / 32,
        e: 1 / 8,
        de: 1 / 8 + 1 / 16,
        q: 1 / 4,
        dq: 1 / 4 + 1 / 8,
        h: 1 / 2,
        dh: 1 / 2 + 1 / 4,
        w: 1,
        dw: 1.5,
    };
    var centralOctaves = {treble: 4, alto: 4, bass: 3};
    var valsNtoL = {};
    for (var key in valsLtoN) {
        valsNtoL[valsLtoN[key]] = key;
    }

    //Utilities
    var Utilities = {
        nextIndex: function(ary, item) {
            var index = ary.indexOf(item);
            if (index === ary.length - 1) {
                return 0;
            } else {
                return index + 1;
            }
        },
        prevIndex: function(ary, item) {
            var index = ary.indexOf(item);
            if (index === 0) {
                return ary.length - 1;
            } else {
                return index - 1;
            }
        }
    }
    var Notes = new function() {
        var _this = this;
        this.getVoiceNotes = function(voice) {
            var notes = $();
            systemDiv.find(".systemLine").each(function(index, sysLine) {
                $.merge(notes, Notes.getSysLineVoiceNotes($(sysLine), voice));
            })
            return notes;
        };
        this.getSysLineVoiceBars = function(sysLine, voice) {
            var bars = sysLine.find(".bar");
            var voiceBars = $();
            bars.each(function(index, bar) {
                var voiceBar = $(bar).find(".voiceBar").eq(voice);
                voiceBars = $.merge(voiceBars, voiceBar);
            });
            return voiceBars;
        };
        this.getSysLineVoiceNotes = function(sysLine, voice) {
            return _this.getSysLineVoiceBars(sysLine, voice).find(".note");
        };
        this.insertNewNote = function(focusItem, char) {
            var voiceBar = focusItem.parents().addBack().filter(".voiceBar");
            var voice = parseInt(voiceBar.attr("data-voice"));
            var notes = $(".voiceBar[data-voice='" + voice + "'] .note");
            var pitch = char;
            var value = 1 / 4;
            var octave = centralOctaves[voiceBar.attr("data-clef")];
            if (char === "R") {
                octave = "";
            }
            if (char !== "R" && notes.not("[data-pitch=R]").length > 0) {
                var prevNote = focusItem;
                while (!prevNote.hasClass("noteInner") || prevNote.parent().attr("data-pitch") === "R") {
                    prevNote = FocusHandlers.nextFocusItem(-1, prevNote);
                }
                prevNote = prevNote.parent();
                value = parseFloat(prevNote.attr("data-value"));
                var prevPitch = prevNote.attr("data-pitch");
                octave = prevPitch[prevPitch.length - 1];
                prevPitch = prevPitch[0];
                var forward = 0;
                var backward = 0;
                var testOctFor = octave;
                var testOctBac = octave;
                var testPitchFor = prevPitch;
                var testPitchBac = prevPitch;
                while (testPitchFor != pitch) {
                    testPitchFor = scale[Utilities.nextIndex(scale, testPitchFor)];
                    if (scale.indexOf(testPitchFor) === 0) {
                        testOctFor++;
                    }
                    forward++;
                }
                while (testPitchBac != pitch) {
                    testPitchBac = scale[Utilities.prevIndex(scale, testPitchBac)];
                    if (scale.indexOf(testPitchBac) === scale.length - 1) {
                        testOctBac--;
                    }
                    backward++;
                }
                if (backward > forward) {
                    octave = testOctFor;
                } else {
                    octave = testOctBac;
                }
            }
            var newNote = Notes.fillNoteSpan(value, pitch + octave);
            if (focusItem.hasClass("voiceBar")) {
                if (focusItem.children().is(".keySignature")) {
                    focusItem.find(".keySignature").after(newNote);
                } else {
                    focusItem.prepend(newNote);
                }
            } else {
                focusItem.parent().after(newNote);
            }
            Formatting.wrapBars(newNote.parents(".systemLine"));
            newNote.find(".noteInner").focus();
            FocusHandlers.scrollToFocus();
        };
        this.fillNoteSpan = function(value, pitch, noteSpan) {
            var acc = "";
            var accReg = /[b\#n]/;
            if (accReg.test(pitch)) {
                acc = accReg.exec(pitch)[0];
                pitch = pitch.replace(accReg, "");
            }

            var lValue = valsNtoL[value];
            var dot = "";
            if (lValue[0] === "d") {
                dot = ".";
                lValue = lValue[1];
            }
            ;
            noteSpan = noteSpan || $("<span>").addClass("note").append($("<span>").addClass("noteInner").attr("tabindex", 0));
            var noteInner = noteSpan.find(".noteInner");
            if (pitch === "R") {
                noteInner.html("&nbsp" + acc + dot + restSym[lValue]);
                return noteSpan
                        .attr({
                            "data-value": value,
                            "data-pitch": pitch,
                            "data-accidental": acc,
                        });
            }

            noteInner.html("&nbsp" + acc + dot + notesSym[lValue]);
            return noteSpan
                    .attr({
                        "data-value": value,
                        "data-pitch": pitch,
                        "data-accidental": acc,
                    });
        }
    }



    var KeySignature = new function() {
        var _this = this;
        var orderOfSharps = "FCGDAEB";
        var circleOfFifthsAsc = ["C", "G", "D", "A", "E", "B", "F#", "C#"];
        var orderOfFlats = "BEADGCF";
        var circleOfFifthsDes = ["C", "F", "Bb", "Eb", "Ab", "Db", "Gb", "Cb"];
        var circleOfFifths = ["Cb", "Gb", "Db", "Ab", "Eb", "Bb", "F", "C", "G", "D", "A", "E", "B", "F#", "C#"];
        var cOctaves = {
            treble: 5,
            bass: 3,
            alto: 4
        }
        var octaveAdjusts = {
            sharps: [0, 0, 0, 0, -1, 0, -1],
            flats: [-1, 0, -1, 0, -1, 0, -1]
        }
        function makeSymbol(pitch, sym) {
            return $("<span>")
                    .addClass("keySigSymbol")
                    .attr({
                        "data-pitch": pitch
                    })
                    .html(sym);
        }
        this.appendKeySig = function(bar, stop, rewrap) {
            var firstVoiceBar = bar.find(".voiceBar").first();
            var key = firstVoiceBar.attr("data-key");
            var bars = systemDiv.find(".bar");
            var barIndex = bars.index(bar);
            function finish() {
                if (stop && rewrap) {
                    Formatting.wrapBars(bar.parents(".systemLine"));
                }
                if (!stop && barIndex < bars.length) {
                    var nextBar = bars.eq(barIndex + 1);
                    _this.appendKeySig(nextBar, true, rewrap);
                }

            }
            bar.find(".voiceBar").each(function(index, item) {
                if ($(item).find(".keySignature").length === 0) {
                    $("<div>").addClass("keySignature").attr("tabindex", 0).prependTo(item);
                }
            });
            bar.find(".keySignature").empty();
            if (barIndex !== 0) {
                if (bars.eq(barIndex - 1).find(".voiceBar").is("[data-key='" + key + "']")) {
                    finish();
                    return;
                }
            }
            var showNaturalsForC = false;
            if (barIndex !== 0 && key === "C") {
                showNaturalsForC = true;
                key = bars.eq(barIndex - 1).find(".voiceBar").first().attr("data-key");
            }
            bar.find(".voiceBar").each(function(index, item) {
                var voiceBar = $(item);
                var clef = voiceBar.attr("data-clef");
                var div = voiceBar.find(".keySignature");
                var index = circleOfFifthsAsc.indexOf(key);
                if (index !== -1) {
                    var sharps = orderOfSharps.substr(0, index);
                    for (var i = 0; i < sharps.length; i++) {
                        var pitch = sharps[i];
                        pitch += (cOctaves[clef] + octaveAdjusts.sharps[i]);
                        makeSymbol(pitch, "#").appendTo(div);
                    }
                } else {
                    index = circleOfFifthsDes.indexOf(key);
                    var flats = orderOfFlats.substr(0, index);
                    for (var i = 0; i < flats.length; i++) {
                        var pitch = flats[i];
                        pitch += (cOctaves[clef] + octaveAdjusts.flats[i]);
                        makeSymbol(pitch, "b").appendTo(div);
                    }
                }
            });

            if (showNaturalsForC) {
                bar.find(".keySigSymbol").html("n");
            }
            finish();
        }
        this.doAll = function() {
            systemDiv.find(".bar").each(function(index, item) {
                _this.appendKeySig($(item), true, false);
            })
        }
        this.keyDown = function(e) {
            if (e.which === 39 || e.which === 37) {
                var voiceBar = $(this).parent();
                var oldKey = voiceBar.attr("data-key");
                var bar = $(this).parents(".bar");
                var newKey;
                if (e.which === 39) {  //right
                    newKey = circleOfFifths[Utilities.nextIndex(circleOfFifths, oldKey)];
                }
                if (e.which === 37) {  //left
                    newKey = circleOfFifths[Utilities.prevIndex(circleOfFifths, oldKey)];
                }
                bar.find(".voiceBar").attr("data-key", newKey)
                _this.appendKeySig(bar, false, true);

            }
        }

        var scaleForMidi = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        function midiToFrequency(midi) {
            var aOffset = midi - 69;
            var a = 440;
            return a * Math.pow(2, aOffset / 12);
        }
        var noteToMidi = function(note) {
            var n = note[0];
            var o = parseInt(note.substring(note.length - 1));
            var noteIndex = scaleForMidi.indexOf(n);
            o++;
            return o * 12 + noteIndex;
        }
        var getNoteMidi = function(pitch, key) {
            if (pitch == "R") {
                return 0;
            }
            var shift = 0;
            var keyIndex = circleOfFifthsAsc.indexOf(key);
            if (keyIndex != -1) {
                var sharps = orderOfSharps.substr(0, keyIndex);
                if (sharps.indexOf(pitch[0]) !== -1) {
                    shift++;
                }
            } else {
                keyIndex = circleOfFifthsDes.indexOf(key);
                if (keyIndex != -1) {
                    var flats = orderOfFlats.substr(0, keyIndex);
                    if (flats.indexOf(pitch[0]) !== -1) {
                        shift--;
                    }
                }
            }
            if (pitch.length === 3) {
                if (pitch[1] === "b") {
                    shift--;
                } else if (pitch[1] === "#") {
                    shift++;
                } else if (pitch[1] === "n") {
                    shift = 0;
                }
            }
            return noteToMidi(pitch) + shift;
        }

        this.getFrequency = function(pitch, key) {
            if (pitch === "R") {
                return 0;
            }
            var midi = getNoteMidi(pitch, key);
            return midiToFrequency(midi);
        }
        function carryKeyForward(fromThisKeySigDiv) {
            var key = fromThisKeySigDiv.parent().attr("data-key");
            var bar = fromThisKeySigDiv.parents(".bar");
            var bars = systemDiv.find(".bar");
            var barIndex = bars.index(bar);
            console.log(key);
            for (var i = barIndex; i < bars.length; i++) {
                bars.eq(i).find(".voiceBar").attr("data-key", key);
                _this.appendKeySig(bars.eq(i), true /*stop*/, false/*rewrap*/)
            }
            var sysLineDiv = bar.parents(".systemLine");
            Formatting.wrapBars(sysLineDiv);
        }
        $(systemDiv).on("keydown", ".keySignature", _this.keyDown);
        $(systemDiv).on("dblclick", ".keySignature", function() {
            carryKeyForward($(this))
        });
    }
    //Shane Watson: 828-964-5295
    //
    //
    //Andrew Byrd: 843-743-5191, andrewdbyrd@gmail.com
    //worked as music director for Catholic St. Mary's CHarlston SC.
    //How consistently are you available? Summers? Wednesday?
    //Have experience?
    //

    var FocusHandlers = new function() {
        var _this = this;
        this.nextFocusItem = function(increment, item) {
            var voiceBar = item.parents().addBack().filter(".voiceBar");
            var voice = parseInt(voiceBar.attr("data-voice"));
            var tabItems = $(".voiceBar[data-voice='" + voice + "'],.voiceBar[data-voice='" + voice + "'] .noteInner");
            var index = tabItems.index(item);
            index += increment;
            return tabItems.eq(index);
        };
        this.scrollToFocus = function() {
            var focus = $(":focus");
            if (focus.length > 0) {
                var docViewTop = $(window).scrollTop();
                var docViewBottom = docViewTop + $(window).height();
                var elemTop = $(focus).offset().top;
                var elemBottom = elemTop + $(focus).height();
                if (!((elemBottom <= docViewBottom) && (elemTop >= docViewTop))) {
                    focus[0].scrollIntoView();
                }
            }
        };
        this.voiceBarKeydown = function(e) {
            e.stopPropagation();
            e.preventDefault();
            if (e.which === 9) {
                if (e.shiftKey) {
                    _this.nextFocusItem(-1, $(this)).focus();
                } else {
                    var next = _this.nextFocusItem(1, $(this));
                    if (next.length > 0) {
                        next.focus();
                    } else {
                        _this.addBarAfterFocusItem($(this));
                    }
                }
            }
            var char = String.fromCharCode(e.which)
            if (scale.indexOf(char) !== -1 || char === "R") {
                Notes.insertNewNote($(this), char);
            }
        };

        this.addBarAfterFocusItem = function(focusItem) {
            var voice = focusItem.parents().addBack().filter(".voiceBar").attr("data-voice");
            var sysLineDiv = focusItem.parents(".systemLine");
            var bar = focusItem.parents(".bar");
            var newBar = BarEventHandlers.makeNewBar(bar);
            newBar.insertAfter(bar);
            KeySignature.appendKeySig(newBar, false, true);
            Formatting.wrapBars(sysLineDiv);
            Formatting.adjLineSpacing(sysLineDiv);
            newBar.find(".voiceBar").eq(voice).focus();
            ConnectionHandlers.rectifyConnections();
        }
        this.noteInnerKeydown = function(e) {
            e.stopPropagation();
            e.preventDefault();
            var note = $(this).parent();
            var pitch = note.attr("data-pitch");
            var value = note.attr("data-value");
            var oct;
            if (pitch === "R") {
                oct = "";
            } else {
                oct = pitch[1];
            }
            pitch = pitch[0];
            if (e.which === 38 && pitch !== "R") {  //up
                pitch = scale[Utilities.nextIndex(scale, pitch)];
                if (scale.indexOf(pitch) === 0) {
                    oct++;
                }
                var voiceIndex = parseInt($(this).parents(".voiceBar").attr("data-voice"))
                Formatting.adjLineVoiceSpacing($(this).parents(".systemLine"), voiceIndex);
                if (voiceIndex < $(this).parents(".bar").find(".voiceBar").length - 1) {
                    Formatting.adjLineVoiceSpacing($(this).parents(".systemLine"), voiceIndex + 1);
                }
                Notes.fillNoteSpan(parseFloat(value), pitch + note.attr("data-accidental") + oct, note);
                ConnectionHandlers.rectifyConnections();
            }
            if (e.which === 40 && pitch !== "R") {  //down
                pitch = scale[Utilities.prevIndex(scale, pitch)];
                if (scale.indexOf(pitch) === scale.length - 1) {
                    oct--;
                }
                var voiceIndex = parseInt($(this).parents(".voiceBar").attr("data-voice"))
                Formatting.adjLineVoiceSpacing($(this).parents(".systemLine"), voiceIndex);
                if (voiceIndex < $(this).parents(".bar").find(".voiceBar").length - 1) {
                    Formatting.adjLineVoiceSpacing($(this).parents(".systemLine"), voiceIndex + 1);
                }
                Notes.fillNoteSpan(parseFloat(value), pitch + note.attr("data-accidental") + oct, note);
                ConnectionHandlers.rectifyConnections();
            }
            if (e.which === 39) {  //right
                value = posValuesAry[Utilities.nextIndex(posValuesAry, value)];
                Notes.fillNoteSpan(parseFloat(value), pitch + note.attr("data-accidental") + oct, note);
            }
            if (e.which === 37) {  //left
                value = posValuesAry[Utilities.prevIndex(posValuesAry, value)];
                Notes.fillNoteSpan(parseFloat(value), pitch + note.attr("data-accidental") + oct, note);
            }
            if (e.which === 9) {  //tab
                if (e.shiftKey) {
                    _this.nextFocusItem(-1, $(this)).focus();
                } else {
                    var next = _this.nextFocusItem(1, $(this));
                    if (next.length > 0) {
                        next.focus();
                    } else {
                        _this.addBarAfterFocusItem($(this));
                    }
                }
            }
            if (e.which === 8 || e.which === 46) { //delete
                var focus = _this.nextFocusItem(-1, $(this));
                note.remove();
                if (focus.parents(".systemLine").prev().hasClass("systemLine")) {
                    Formatting.wrapBars(focus.parents(".systemLine").prev());
                }
                focus.focus();
                _this.scrollToFocus();
                ConnectionHandlers.rectifyConnections();
            }
            if (e.which === 190) { // . or > for sharp
                if (note.attr("data-accidental") !== "#") {
                    pitch += "#";
                }
                Notes.fillNoteSpan(parseFloat(value), pitch + oct, note);
                ConnectionHandlers.rectifyConnections();
            }
            if (e.which === 188) { // , or < for flat
                if (note.attr("data-accidental") !== "b") {
                    pitch += "b";
                }
                Notes.fillNoteSpan(parseFloat(value), pitch + oct, note);
                ConnectionHandlers.rectifyConnections();
            }
            if (e.which === 61) { // = for natural
                if (note.attr("data-accidental") !== "n") {
                    pitch += "n";
                }
                Notes.fillNoteSpan(parseFloat(value), pitch + oct, note);
                ConnectionHandlers.rectifyConnections();
            }
            if (e.which === 173) { // - or _.  Tries to connect to next note.
                ConnectionHandlers.connectNote(note, true);
            }
            var char = String.fromCharCode(e.which);
            console.log(e.which);
            if (scale.indexOf(char) !== -1 || char === "R") {
                Notes.insertNewNote($(this), char);
                ConnectionHandlers.rectifyConnections();
            }
        }
        $(systemDiv).on("keydown", ".voiceBar", _this.voiceBarKeydown);
        $(systemDiv).on("keydown", ".noteInner", _this.noteInnerKeydown)

    }
    var BarEventHandlers = new function() {
        var _this = this;
        this.makeNewBar = function(modelBar) {
            var voiceBars = modelBar.find(".voiceBar");
            var newBar = $("<div>").addClass("bar");
            for (var i = 0; i < voiceBars.length; i++) {
                var voiceBar = $(voiceBars[i]);
                $("<div>")
                        .addClass("voiceBar")
                        .attr({
                            "data-clef": voiceBar.attr("data-clef"),
                            "tabindex": 0,
                            "data-voice": i,
                            "data-key": voiceBar.attr("data-key"),
                            "data-voicename": voiceBar.attr("data-voicename")
                        })
                        .attr("tabindex", 0)
                        .appendTo(newBar)
                        .append($("<div>").addClass("keySignature").attr("tabindex", 0));
            }
            KeySignature.appendKeySig(newBar, false, true);
            return newBar;
        }
        function playBar(bar) {
            var bars = systemDiv.find(".bar");
            var barIndex = bars.index(bar);
            var voices = makeBarsPlayable(barIndex, barIndex);
            scheduler.setVoices(voices);
            scheduler.play();
        }
        function playFromBar(bar) {
            var bars = systemDiv.find(".bar");
            var barIndex = bars.index(bar);
            var voices = makeBarsPlayable(barIndex);
            scheduler.setVoices(voices);
            scheduler.play();
        }
        function deleteBar(bar) {
            var parent = bar.parent();
            bar.remove();
            Formatting.wrapBars(parent);
        }
        function addBarAfter(bar) {
            var sysLineDiv = bar.parents(".systemLine");
            var newBar = _this.makeNewBar(bar)
            newBar.insertAfter(bar);
            KeySignature.appendKeySig(newBar, false, true);
            Formatting.wrapBars(sysLineDiv);
            Formatting.adjLineSpacing(sysLineDiv);
            ConnectionHandlers.rectifyConnections();
        }
        function addBarBefore(bar) {
            var sysLineDiv = bar.parents(".systemLine");
            var newBar = _this.makeNewBar(bar)
            newBar.insertBefore(bar);
            KeySignature.appendKeySig(newBar, false, true);
            Formatting.wrapBars(sysLineDiv);
            Formatting.adjLineSpacing(sysLineDiv);
            ConnectionHandlers.rectifyConnections();
        }
        var makePopup = function(bar) {
            var popup = $("<div>").addClass("barPopup");
            $("<button>").text("Play Bar").click(function() {
                playBar(bar)
            }).appendTo(popup);
            $("<button>").text("Play From").click(function() {
                playFromBar(bar)
            }).appendTo(popup);
            $("<button>").text("Delete Bar").click(function() {
                deleteBar(bar)
            }).appendTo(popup);
            $("<button>").text("Add Bar Before").click(function() {
                addBarBefore(bar)
            }).appendTo(popup);
            $("<button>").text("Add Bar After").click(function() {
                addBarAfter(bar)
            }).appendTo(popup);
            bar.append(popup);
            
        }
        var destroyPopup = function(bar) {
            bar.find(".barPopup").remove();
        }
        $("body").on("mouseenter", ".bar", function() {
            makePopup($(this))
        });
        $("body").on("mouseleave", ".bar", function() {
            destroyPopup($(this))
        });

    }

    var Formatting = new function() {
        var _this = this;
        this.makeDynamicStyle = function(zoom, qNoteWidth) {
            zoom /= 2;
            $(".noteStyle").empty();
            var str = "";
            var keyboard = [];
            for (var j = 0; j < 8; j++) {
                for (var i = 0; i < scale.length; i++) {
                    keyboard.push(scale[i] + j);
                }
            }
            var f4Index = keyboard.indexOf("F4");
            function noteStyleForClef(i, f4Pos, noteTop, clef) {
                noteTop += f4Pos;
                if (keyboard[i] == "C4" && clef == "treble") {
                    i = i;
                }
                if (noteTop < -110) {
                    var x = -30 - noteTop;
                    str += "[data-clef=" + clef + "] [data-pitch=" + keyboard[i] + "]{" +
                            "top: " + noteTop * zoom + "px; " +
                            "padding-bottom: " + x * zoom + "px;}\n";
                    str += "[data-clef=" + clef + "] [data-pitch=" + keyboard[i] + "]::before{" +
                            "content:' '; " +
                            "height: " + (-1 * noteTop - 20) * zoom + "px; " +
                            "background-position: " + 7 * zoom + "px " + ((noteTop - 2) % 20 === 0 ? +(20 - 2) * zoom + "px;}\n" : +(10 - 2) * zoom + "px;}\n");
                } else if (noteTop < 0) {
                    str += "[data-clef=" + clef + "] [data-pitch=" + keyboard[i] + "]{top: " + noteTop * zoom + "px;}\n";
                } else {
                    str += "[data-clef=" + clef + "] [data-pitch=" + keyboard[i] + "]{" +
                            "top: 0px;" +
                            "padding-top: " + noteTop * zoom + "px;}\n";
                    str += "[data-clef=" + clef + "] [data-pitch=" + keyboard[i] + "]::before{" +
                            "top:  0px;" +
                            "content:' ';" +
                            "background-position: " + 7 * zoom + "px 0px;}\n";
                }
                if (noteTop === -8) {
                    str += "[data-clef=" + clef + "] [data-pitch=" + keyboard[i] + "]::before{" +
                            "top:  0px;" +
                            "content:' ';" +
                            "background-position: " + 7 * zoom + "px " + 8 * zoom + "px;}\n";
                }
            }
            for (var i = 0; i < keyboard.length; i++) {
                var noteTop = (f4Index - i) * 10;
                noteStyleForClef(i, noteTop, -38, "treble");
                noteStyleForClef(i, noteTop, -158, "bass");
                noteStyleForClef(i, noteTop, -98, "alto");
            }

            var wNoteWidth = qNoteWidth * 4;
            for (var key in valsLtoN) {
                str += ".note[data-value='" + valsLtoN[key] + "']{width: " + (wNoteWidth * valsLtoN[key]) * zoom + "px;}\n";
                str += ".note[data-value='" + valsLtoN[key] + "'] .noteInner:after{width: " + ((wNoteWidth * valsLtoN[key] + 52) * zoom + 2) + "px;}\n";
            }
            str += "[data-pitch=R]{top: " + -68 * zoom + "px;}\n";
            str += "[data-pitch=R][data-value='1'],[data-pitch=R][data-value='1.5']{top: -" + 78 * zoom + "px;}\n";
            str += "[data-pitch]{height: " + 110 * zoom + "px;}\n";
            str += ".noteInner{width: " + 60 * zoom + "px;}\n";
            str += "[data-pitch]::before{background-size: " + 35 * zoom + "px " + 20 * zoom + "px;}\n";
            str += "[data-pitch]{font-size: " + (78 * zoom) + "px;}\n;"
            str += ".bar{margin-top: " + (40 * zoom) + "px; margin-bottom: " + (40 * zoom) + "px;}\n";
            var block = ".voiceBar{" +
                    "height: " + (80 * zoom + 1) + "px;\n" +
                    "background-size: " + (20 * zoom) + "px " + (20 * zoom) + "px;\n" +
                    "padding-right: " + (26 * zoom) + "px;\n" +
                    "margin-top: " + (60 * zoom) + "px;}\n"// +
            str += block;
            str += ".systemConnector{width: " + (20 * zoom) + "px;}\n";
            str += ".bar:first-of-type .voiceBar::before {" +
                    "width:" + (60 * zoom) + "px; " +
                    "font-size: " + (78 * zoom) + "px; " +
                    "top: " + (-29 * zoom) + "px}\n";
            str += ".keySigSymbol{width: " + 26 * zoom + "px}\n"
            str += ".keySignature{\n" +
                    "padding-left: " + 26 * zoom + "px;}\n "

            $(".noteStyle").text(str);
            Formatting.wrapBars(systemDiv.find(".systemLine").first());
        }


        this.adjLineVoiceSpacing = function(sysLine, voice) {
            //first get all notes in one voice in one system line;
            var voiceBars = Notes.getSysLineVoiceBars(sysLine, voice);
            var notes = voiceBars.find(".note");
            var high = -voiceBars.first().height() / 2;
            var low = -high;
            var highNote;
            var lowNote;
            var lineTop = voiceBars.first().offset().top;
            notes.each(function(index, note) {
                var top = $(note).offset().top - lineTop;
                var bottom = parseFloat($(note).css("padding-top")) + $(note).height() * .4;
                if (top < high) {
                    high = top;
                    highNote = note;
                }
                if (bottom > low) {
                    low = bottom;
                    lowNote = note;
                }
            });
            voiceBars.first().attr("data-bottom", low);
            high = -high;
            if (voice > 0) {
                var prevVoiceBar = Notes.getSysLineVoiceBars(sysLine, voice - 1).first();
                if (prevVoiceBar.attr("data-bottom")) {
                    high += parseFloat(prevVoiceBar.attr("data-bottom"));
                }
            }
            voiceBars.css("margin-top", high + "px");
            voiceBars.css("margin-bottom", low + "px");
            _this.adjSysLineConnector(sysLine);
        }
        this.adjLineSpacing = function(sysLine) {
            var voices = sysLine.find(".bar").first().find(".voiceBar").length;
            for (var i = 0; i < voices; i++) {
                _this.adjLineVoiceSpacing(sysLine, i);
            }
        }
        this.adjAllVoiceSpacing = function() {
            var sysLines = systemDiv.find(".systemLine");
            var voices = sysLines.first().find(".bar").first().find(".voiceBar").length;
            sysLines.each(function(index, sysLine) {
                for (var i = 0; i < voices; i++) {
                    sysLine = $(sysLine);
                    _this.adjLineVoiceSpacing(sysLine, i);
                }
            })
        }
        this.adjSysLineConnector = function(sysLineDiv) {
            var rect = sysLineDiv.find(".voiceBar").get(0).getClientRects();
            var oTop = rect[0].top;
            var mTop = parseInt(sysLineDiv.find(".voiceBar").eq(0).css("margin-top"));
            mTop += parseInt(sysLineDiv.find(".bar").eq(0).css("marginTop"));
            rect = sysLineDiv.find(".voiceBar").get(-1).getClientRects();
            var oBottom = rect[0].bottom;
            var h = oBottom - oTop - 2;
            sysLineDiv.find(".systemConnector")
                    .css("margin-top", mTop + "px")
                    .height(h);
        }
        this.postpendSysLine = function(sysLineDiv) {
            var newSysLineDiv = $("<div>").addClass("systemLine").insertAfter(sysLineDiv);
            $("<i>").addClass("systemConnector").appendTo(newSysLineDiv);
            return newSysLineDiv;
        }
        this.toNextSysLine = function(bars, sysLineDiv) {
            var nextSysLine = sysLineDiv.next().hasClass("systemLine") ? sysLineDiv.next() : _this.postpendSysLine(sysLineDiv);
            nextSysLine.find(".systemConnector").after(bars);
        }
        this.wrapBars = function(sysLineDiv) {
            var bars = sysLineDiv.find(".bar");
            var next;
            if (bars.length === 0) {
                next = sysLineDiv.next();
                sysLineDiv.remove();
            } else {
                var maxW = sysLineDiv.parent().width();
                var tooBig = false;
                var w = sysLineDiv.find(".systemConnector").width();
                var bar;
                for (var i = 0; i < bars.length; i++) {
                    bar = bars[i];
                    w += $(bar).width();
                    if (w > maxW && i > 0) {
                        _this.toNextSysLine($(bar).nextAll().addBack(), sysLineDiv);
                        tooBig = true;
                        break;
                    }
                }
                if (!tooBig) {
                    bars = sysLineDiv.parent().find(".bar");
                    var index = bars.index(bar) + 1;
                    while (index < bars.length && w + $(bars[index]).width() < maxW) {
                        sysLineDiv.append(bars[index]);
                        index++;
                        w += $(bars[index]).width();
                    }
                }
                _this.adjSysLineConnector(sysLineDiv);
            }
            next = next || sysLineDiv.next();
            if (next && next.hasClass("systemLine")) {
                _this.wrapBars(next);
            }
            var voices = sysLineDiv.find(".bar").first().find(".voiceBar").length;
            _this.adjLineSpacing(sysLineDiv);
        }

    }


    function makeRandomSystemObj() {
        var durOpts = [[1], [0.5, 0.5], [0.0625, 0.375, 0.125, 0.125, 0.25, 0.0625], [0.25, 0.75], [0.0625, 0.1875, 0.75], [0.1875, 0.09375, 0.25, 0.375, 0.09375], [0.0625, 0.125, 0.125, 0.25, 0.1875, 0.25], [0.125, 0.5, 0.375], [0.375, 0.1875, 0.1875, 0.25], [0.75, 0.09375, 0.09375, 0.0625], [0.75, 0.25], [0.1875, 0.0625, 0.25, 0.5], [0.25, 0.25, 0.5], [0.1875, 0.1875, 0.125, 0.5], [0.25, 0.5, 0.125, 0.125], [0.375, 0.125, 0.5], [0.25, 0.25, 0.125, 0.25, 0.0625, 0.0625], [0.25, 0.25, 0.125, 0.375], [0.0625, 0.1875, 0.1875, 0.125, 0.1875, 0.25], [0.125, 0.25, 0.25, 0.375]];
        var acc = ["#", "b", "n", false, false, false, false, false];
        function randInAry(str) {
            return str[Math.floor(Math.random() * str.length)];
        }
        var voices = [
            {clef: "treble", name: "S", bars: []},
            {clef: "alto", name: "A", bars: []},
            {clef: "bass", name: "T", bars: []},
            {clef: "bass", name: "B", bars: []},
        ];
        var barKeys = [];
        for (var i = 0; i < 25; i++) {
            barKeys.push(randInAry(scale));
        }
        for (var i = 0; i < voices.length; i++) {
            var voice = voices[i];
            var bars = voice.bars;
            for (var barIndex = 0; barIndex < barKeys.length; barIndex++) {
                var dist = randInAry(durOpts);
                var bar = {key: barKeys[barIndex], notes: []};
                for (var j = 0; j < dist.length; j++) {
                    var note = {
                        value: dist[j],
                        pitch: randInAry(scale) + (randInAry(acc) || "") + Math.floor(Math.random() * 1 + centralOctaves[voice.clef]),
                    }
                    bar.notes.push(note);
                }
                bars.push(bar);
            }
        }
        return voices;
    }
    function renderSystemObj(systemObj) {
        systemObj = systemObj || [
            {clef: "treble", name: "S", bars: [{key: "F", notes: []}]},
            {clef: "treble", name: "A", bars: [{key: "F", notes: []}]},
            {clef: "bass", name: "T", bars: [{key: "F", notes: []}]},
            {clef: "bass", name: "B", bars: [{key: "F", notes: []}]},
        ]
        systemDiv.empty();
        var sysLineDiv = $("<div>").addClass("systemLine").appendTo(systemDiv);
        $("<i>").addClass("systemConnector").appendTo(sysLineDiv);
        for (var voiceIndex = 0; voiceIndex < systemObj.length; voiceIndex++) {
            var voiceClef = systemObj[voiceIndex].clef;
            var voiceName = systemObj[voiceIndex].name;
            var bars = systemObj[voiceIndex].bars;
            for (var barIndex = 0; barIndex < bars.length; barIndex++) {
                var barDiv = sysLineDiv.find(".bar").get(barIndex);
                if (!barDiv) {
                    barDiv = $("<div>").addClass("bar").appendTo(sysLineDiv);
                }
                var voiceBarDiv = $("<div>")
                        .addClass("voiceBar")
                        .attr({
                            "data-clef": voiceClef,
                            "tabindex": 0,
                            "data-voice": voiceIndex,
                            "data-voicename": voiceName,
                            "data-key": bars[barIndex].key
                        })
                        .attr("tabindex", 0)
                        .appendTo(barDiv);
                var barNotes = bars[barIndex].notes;
                for (var noteIndex = 0; noteIndex < barNotes.length; noteIndex++) {
                    var noteObj = barNotes[noteIndex];
                    Notes.fillNoteSpan(noteObj.value, noteObj.pitch)
                            .attr("data-connectid", noteObj.connectid)
                            .appendTo(voiceBarDiv);
                }

            }
        }
        KeySignature.doAll();
        Formatting.wrapBars(systemDiv.find(".systemLine").first());
        ConnectionHandlers.rectifyConnections();
    }
    var newSongHandlers = new function() {
        var _this = this;
        var reset = function() {
            $("#trebleInput").val(2);
            $("#altoInput").val(0);
            $("#bassInput").val(2);
        }
        var cancel = function() {
            reset();
            $("#newSongOverlay").hide();
        }
        var openNewSongDialog = function() {
            $("#newSongOverlay").show();
        }
        var makeNewSong = function() {
            var voices = [];
            function voicesForClef(count, clef, key) {
                for (var i = 0; i < count; i++) {
                    voices.push({
                        clef: clef,
                        name: clef[0] + (i + 1),
                        bars: [{key: key, notes: []}]
                    })
                }
            }
            var ts = $("#trebleInput").val();
            var as = $("#altoInput").val();
            var bs = $("#bassInput").val();
            var key = $("#keySelect :selected").val();
            voicesForClef(ts, "treble", key);
            voicesForClef(as, "alto", key);
            voicesForClef(bs, "bass", key);
            renderSystemObj(voices);
            reset();
            $("#newSongOverlay").hide();
        }
        reset();
        $("#newSong").click(openNewSongDialog);
        $("#newSongCancel").click(cancel);
        $("#newSongOk").click(makeNewSong);
        $("#newSongOverlay input, #newSongOverlay select").keydown(function(e) {
            if (e.which === 13) {
                makeNewSong();
            }
        })
    }
    var ConnectionHandlers = new function() {
        var _this = this;
        function reject(giveAlert, note, msg) {
            msg = msg || "";
            msg = "You can only connect the last note in a measure to a note with the same pitch at the beginning of the following measure. " + msg;
            note.removeClass("beginConnect connect");
            if (giveAlert) {
                alert(msg);
            } else {
                console.log(note, msg);
            }
        }
        this.connectNote = function(note, giveAlert) {
            var voiceBar = note.parent();
            var vbNotes = voiceBar.find(".note");
            var noteIndex = vbNotes.index(note);
            if (noteIndex != vbNotes.length - 1) {
                reject(giveAlert, note, "This isn't the last note in a measure");
                return;
            }
            var voice = voiceBar.attr("data-voice");
            var bar = voiceBar.parent();
            var bars = systemDiv.find(".bar");
            var barIndex = bars.index(bar);
            if (barIndex === bars.length - 1) {
                reject(giveAlert, note, "There is no next measure.");
                return;
            }
            var nextBar = bars.eq(barIndex + 1);
            var nextVoiceBar = nextBar.find(".voiceBar[data-voice='" + voice + "']");
            var nextNotes = nextVoiceBar.find(".note");
            if (nextNotes.length === 0) {
                reject(giveAlert, note, "There are no notes in the next measure.")
                return;
            }
            var nextNote = nextNotes.eq(0);
            if (!isSamePitch(note, nextNote)) {
                reject(giveAlert, note, "The first note of the next measure is not the same pitch.");
                return;
            }
            var connectid;
            note.addClass("connect");
            nextNote.addClass("connect");
            if (note.hasClass("endConnect")) {
                connectid = note.attr("data-connectid");
                note.removeClass("endConnect");
            } else {
                note.addClass("beginConnect");
            }
            if (nextNote.hasClass("beginConnect")) {
                nextNote.removeClass("beginConnect");
                if (connectid) {
                    var otherConnectId = nextNote.attr("data-connectid");
                    $("[data-connectid='" + otherConnectId + "']").attr("data-connectid", connectid);
                } else {
                    connectid = nextNote.attr("data-connectid");
                }
            } else {
                nextNote.addClass("endConnect");
            }
            connectid = connectid || Math.random().toString(32).substr(2);
            note.attr("data-connectid", connectid);
            nextNote.attr("data-connectid", connectid);
        }
        function isSamePitch(noteA, noteB) {
            var pitchA = noteA.attr("data-pitch") + noteA.attr("data-accidental");
            var pitchB = noteB.attr("data-pitch") + noteB.attr("data-accidental");
            pitchA = KeySignature.getFrequency(pitchA, noteA.parent().attr("data-key"));
            pitchB = KeySignature.getFrequency(pitchB, noteB.parent().attr("data-key"));
            return pitchA === pitchB;
        }
        function makeGroup(items) {
            if (!items)
                return null;
            if (items.length >= 2) {
                var connectid = Math.random().toString(32).substr(2);
                items.attr("data-connectid", connectid);
                items.addClass("connect");
                items.eq(0).addClass("beginConnect");
                items.eq(-1).addClass("endConnect");
                return items;
            }
        }
        function checkGroup(group) {
            if (!group || group.length === 0)
                return;
            makeGroup(group);
            var voice = group.eq(0).parent().attr("data-voice");
            var notes = systemDiv.find("[data-voice='" + voice + "'] .note");
            var groupBeginIndex = notes.index(group.first());
            var bars = systemDiv.find(".bar");
            for (var i = 0; i < group.length; i++) {
                var doesNotBelong = false;
                if (!group.eq(i).is(notes.eq(i + groupBeginIndex))) {
                    doesNotBelong = true;
                } else if (!isSamePitch(group.eq(0), group.eq(i))) {
                    doesNotBelong = true;
                } else if (i > 0) {
                    var barAIndex = bars.index(group.eq(i - 1).parents(".bar"));
                    var barBIndex = bars.index(group.eq(i).parents(".bar"))
                    if (barAIndex + 1 !== barBIndex) {
                        doesNotBelong = true;
                    }
                }
                if (doesNotBelong) {
                    group.removeClass("beginConnect endConnect connect");
                    group.removeAttr("data-connectid");
                    if (i > 0) {
                        var groupA = group.slice(0, i - 1);
                        checkGroup(groupA);
                    }
                    var groupB = group.slice(i);
                    checkGroup(groupB);
                    return;
                }
            }
        }
        this.rectifyConnections = function() {
            var connected = $("[data-connectid]");
            if (connected.length > 0) {
                var connectids = [];
                for (var i = 0; i < connected.length; i++) {
                    var connectid = connected.eq(i).attr("data-connectid");
                    if (connectids.indexOf(connectid) === -1) {
                        connectids.push(connectid);
                    }
                }
                for (var i = 0; i < connectids.length; i++) {
                    var connectid = connectids[i];
                    var group = connected.filter("[data-connectid='" + connectid + "']");
                    checkGroup(group);
                }
            }
        }
    }
    renderSystemObj()//(comfortComfort)//(makeRandomSystemObj());

    function rescale(scale, spacing) {
        Formatting.makeDynamicStyle(scale, spacing);
        Formatting.adjAllVoiceSpacing()
    }

    function getSystemObj(forPlaying) {
        var bars = systemDiv.find(".bar");
        function getVoiceBarDuration(voiceBar) {
            var vbDur = 0;
            voiceBar.find(".note").each(function(index, note) {
                vbDur += parseFloat($(note).attr("data-value"));
            })
            return vbDur;
        }
        function getBarDuration(voiceBarIndex) {
            var bar = bars.eq(voiceBarIndex);
            var dur = 0;
            bar.find(".voiceBar").each(function(index, voiceBar) {
                var vbDur = getVoiceBarDuration($(voiceBar));
                dur = dur > vbDur ? dur : vbDur;
            });
            return dur;
        }
        var voices = [];
        var firstBar = bars.first();
        firstBar.find(".voiceBar").each(function(index, item) {
            item = $(item);
            var voice = {
                name: item.attr("data-voicename"),
                clef: item.attr("data-clef"),
                bars: []
            };
            voices.push(voice);
        })
        for (var i = 0; i < voices.length; i++) {
            var voiceBars = $(".voiceBar[data-voicename='" + voices[i].name + "']");
            voiceBars.each(function(index, voiceBar) {
                voiceBar = $(voiceBar);
                var bar = {
                    key: voiceBar.attr("data-key"),
                    notes: []
                }
                voices[i].bars.push(bar);
                voiceBar.find(".note").each(function(index, note) {
                    note = $(note);
                    var pitch = note.attr("data-pitch");
                    if (pitch !== "R") {
                        var accidental = note.attr("data-accidental");
                        var octave = pitch[1];
                        pitch = pitch[0] + accidental + octave;
                    }
                    var noteObj = {
                        pitch: pitch,
                        value: note.attr("data-value")
                    }
                    if (note.attr("data-connectid")) {
                        noteObj.connectid = note.attr("data-connectid");
                    }
                    if (forPlaying) {
                        noteObj.el = note;
                    }
                    bar.notes.push(noteObj);
                })
                if (forPlaying) {
                    var vbDur = getVoiceBarDuration(voiceBar);
                    var barDur = getBarDuration(index);
                    var extraDur = barDur - vbDur;
                    if (extraDur > 0) {
                        bar.notes.push({pitch: "R", value: extraDur});
                    }
                }
            })
        }
        console.log(voices);
        return voices;
    }
    function makeBarsPlayable(startBar, endBar) {
        var forPlaying = true;
        var sysObj = getSystemObj(forPlaying);
        for (var i = 0; i < sysObj.length; i++) {
            var voice = sysObj[i];
            voice.notes = [];
            startBar = startBar || 0;
            if (isNaN(endBar)) {
                endBar = voice.bars.length;
            }
            endBar = endBar >= voice.bars.length ? voice.bars.length - 1 : endBar;
            for (var barIndex = startBar; barIndex < endBar + 1; barIndex++) {
                var bar = voice.bars[barIndex];
                var key = bar.key;
                for (var noteIndex = 0; noteIndex < bar.notes.length; noteIndex++) {
                    var note = bar.notes[noteIndex];
                    if (note.connectid && voice.notes[voice.notes.length - 1].connectid === note.connectid) {
                        voice.notes[voice.notes.length - 1].value += parseFloat(note.value);
                    } else {
                        var playNote = {
                            value: parseFloat(note.value),
                            pitch: KeySignature.getFrequency(note.pitch, key),
                            el: note.el
                        }
                        if(note.connectid){
                            playNote.connectid = note.connectid;
                        }
                        voice.notes.push(playNote);
                    }
                }
            }
        }
        return sysObj;
    }

    return {rescale: rescale, renderSystemObj: renderSystemObj, getSystemObj: getSystemObj, makeBarsPlayable: makeBarsPlayable};

}



function makeDemoBars() {
    var scale = "CDEFGABC";
    var durs = ["s", "e", "q", "h", "w", "ds", "de", "dq", "dh"];
    //var durs = ["e", "q", "h", "w"]
    var vals = {
        t: 1 / 64,
        dt: 1 / 32 + 1 / 64,
        s: 1 / 16,
        ds: 1 / 16 + 1 / 32,
        e: 1 / 8,
        de: 1 / 8 + 1 / 16,
        q: 1 / 4,
        dq: 1 / 4 + 1 / 8,
        h: 1 / 2,
        dh: 1 / 2 + 1 / 4,
        w: 1,
        dw: 1.5,
    }
    var good = [];
    function randInAry(str) {
        return str[Math.floor(Math.random() * str.length)];
    }
    while (good.length < 20) {
        var seq = "";
        var sum = 0;
        var jMax = Math.floor(Math.random() * 7 + 1);
        for (var j = 0; j < jMax; j++) {
            var dur = randInAry(durs);
            sum += vals[dur];
            seq += dur;
        }
        if (sum === 1 && good.indexOf(seq) === -1) {
            good.push(seq);
        }
    }
    console.log(JSON.stringify(good));
}
