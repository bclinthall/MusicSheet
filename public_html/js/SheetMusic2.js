/* 
 * Copyright B. Clint Hall 2014-2015.  All rights reserved.
 * Contact the author to discuss licencing.  theaetetus7  gmail.com
 */

function MusicSheet(musicSheetOvercontainer, audioContext) {
    var instruments = [];
    var scheduler = new Scheduler(audioContext, instruments);
    var musicSheetDiv = musicSheetOvercontainer;
    //var footerDiv = $("<div>").appendTo(musicSheetOvercontainer);
    musicSheetDiv.addClass("musicSheet");
    //footerDiv.addClass("footer");

    var Utls = MusicSheet.Utls;
    var Notes = new function() {
        var _this = this;
        this.getVoiceNotes = function(voice) {
            var notes = $();
            musicSheetDiv.find(".systemLine").each(function(index, sysLine) {
                $.merge(notes, Notes.getSysLineVoiceNotes($(sysLine), voice));
            });
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
            var notes = focusItem.closest(".musicSheet").find(".voiceBar[data-voice='" + voice + "'] .note");
            var pitch = char;
            var value = 1 / 4;
            var octave = Utls.centralOctaves[voiceBar.attr("data-clef")];
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
                while (testPitchFor !== pitch) {
                    testPitchFor = Utls.scale[Utls.nextIndex(Utls.scale, testPitchFor)];
                    if (Utls.scale.indexOf(testPitchFor) === 0) {
                        testOctFor++;
                    }
                    forward++;
                }
                while (testPitchBac != pitch) {
                    testPitchBac = Utls.scale[Utls.prevIndex(Utls.scale, testPitchBac)];
                    if (Utls.scale.indexOf(testPitchBac) === Utls.scale.length - 1) {
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
            return newNote;
        };
        this.fillNoteSpan = function(value, pitch, noteSpan) {
            var acc = "";
            var accReg = /[b\#n]/;
            if (accReg.test(pitch)) {
                acc = accReg.exec(pitch)[0];
                pitch = pitch.replace(accReg, "");
            }

            var lValue = Utls.valsNtoL[value];
            var dot = "";
            if (lValue[0] === "d") {
                dot = ".";
                lValue = lValue[1];
            }
            ;
            noteSpan = noteSpan || $("<span>").addClass("note").append($("<span>").addClass("noteInner").attr("tabindex", 0));
            var noteInner = noteSpan.find(".noteInner");
            var blank = "<i class='blank'></i>";
            if (pitch === "R") {
                noteInner.html(blank + acc + dot + Utls.restSym[lValue]);
                return noteSpan
                        .attr({
                            "data-value": value,
                            "data-pitch": pitch,
                            "data-accidental": acc,
                        });
            }

            noteInner.html(blank + acc + dot + Utls.notesSym[lValue]);
            return noteSpan
                    .attr({
                        "data-value": value,
                        "data-pitch": pitch,
                        "data-accidental": acc,
                    });
        };
        return _this;
    };
    var KeySignature = new function() {
        var _this = this;
        var orderOfSharps = "FCGDAEB";
        var circleOfFifthsAsc = ["C", "G", "D", "A", "E", "B", "F#", "C#"];
        var orderOfFlats = "BEADGCF";
        var circleOfFifthsDes = ["C", "F", "Bb", "Eb", "Ab", "Db", "Gb", "Cb"];
        var circleOfFifths = ["Cb", "Gb", "Db", "Ab", "Eb", "Bb", "F", "C", "G", "D", "A", "E", "B", "F#", "C#"];
        _this.circleOfFifths = circleOfFifths;
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
            var bars = musicSheetDiv.find(".bar");
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
            musicSheetDiv.find(".bar").each(function(index, item) {
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
                    newKey = circleOfFifths[Utls.nextIndex(circleOfFifths, oldKey)];
                }
                if (e.which === 37) {  //left
                    newKey = circleOfFifths[Utls.prevIndex(circleOfFifths, oldKey)];
                }
                bar.find(".voiceBar").attr("data-key", newKey)
                _this.appendKeySig(bar, false, true);

            }
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
            return musicTools.noteToMidi(pitch) + shift;
        }

        this.getFrequency = function(pitch, key) {
            if (pitch === "R") {
                return 0;
            }
            var midi = getNoteMidi(pitch, key);
            return musicTools.midiToFrequency(midi);
        }
        function carryKeyForward(fromThisKeySigDiv) {
            var key = fromThisKeySigDiv.parent().attr("data-key");
            var bar = fromThisKeySigDiv.parents(".bar");
            var bars = musicSheetDiv.find(".bar");
            var barIndex = bars.index(bar);
            console.log(key);
            for (var i = barIndex; i < bars.length; i++) {
                bars.eq(i).find(".voiceBar").attr("data-key", key);
                _this.appendKeySig(bars.eq(i), true /*stop*/, false/*rewrap*/)
            }
            var sysLineDiv = bar.parents(".systemLine");
            Formatting.wrapBars(sysLineDiv);
        }
        $(musicSheetDiv).on("keydown", ".keySignature", _this.keyDown);
        $(musicSheetDiv).on("dblclick", ".keySignature", function() {
            carryKeyForward($(this))
        });
        return _this;
    };
    var FocusHandlers = new function() {
        var _this = this;
        this.nextFocusItem = function(increment, item) {
            var voiceBar = item.closest(".voiceBar");
            var voice = parseInt(voiceBar.attr("data-voice"));
            var tabItems = item.closest(".musicSheet").find(".voiceBar[data-voice='" + voice + "'],.voiceBar[data-voice='" + voice + "'] .noteInner");
            var index = tabItems.index(item);
            index += increment;
            return tabItems.eq(index);
        };
        window.nextFocusItem = this.nextFocusItem;
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
            if (Utls.scale.indexOf(char) !== -1 || char === "R") {
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
            //Formatting.adjLineSpacing(sysLineDiv);
            newBar.find(".voiceBar").eq(voice).focus();
            tieHandlers.checkEndOfBar(bar);
            var bars = bar.closest(".musicSheet").find(".bar");
            var newBarIndex = bars.index(bar);
            tieHandlers.checkStartOfBar(bars.eq(newBarIndex+1));
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
                pitch = Utls.scale[Utls.nextIndex(Utls.scale, pitch)];
                if (Utls.scale.indexOf(pitch) === 0) {
                    oct++;
                }
                var voiceIndex = parseInt($(this).parents(".voiceBar").attr("data-voice"))
                Formatting.adjLineVoiceSpacing($(this).parents(".systemLine"), voiceIndex);
                if (voiceIndex < $(this).parents(".bar").find(".voiceBar").length - 1) {
                    Formatting.adjLineVoiceSpacing($(this).parents(".systemLine"), voiceIndex + 1);
                }
                Notes.fillNoteSpan(parseFloat(value), pitch + note.attr("data-accidental") + oct, note);
                tieHandlers.checkTieOnNote(note);
            }
            if (e.which === 40 && pitch !== "R") {  //down
                pitch = Utls.scale[Utls.prevIndex(Utls.scale, pitch)];
                if (Utls.scale.indexOf(pitch) === Utls.scale.length - 1) {
                    oct--;
                }
                var voiceIndex = parseInt($(this).parents(".voiceBar").attr("data-voice"))
                Formatting.adjLineVoiceSpacing($(this).parents(".systemLine"), voiceIndex);
                if (voiceIndex < $(this).parents(".bar").find(".voiceBar").length - 1) {
                    Formatting.adjLineVoiceSpacing($(this).parents(".systemLine"), voiceIndex + 1);
                }
                Notes.fillNoteSpan(parseFloat(value), pitch + note.attr("data-accidental") + oct, note);
                tieHandlers.checkTieOnNote(note);
            }
            if (e.which === 39) {  //right
                value = Utls.posValuesAry[Utls.nextIndex(Utls.posValuesAry, value)];
                Notes.fillNoteSpan(parseFloat(value), pitch + note.attr("data-accidental") + oct, note);
                var voiceIndex = parseInt($(this).parents(".voiceBar").attr("data-voice"))
                Formatting.wrapBars($(this).parents(".systemLine"));
                tieHandlers.checkEndOfBar($(this).closest(".bar"));
            }
            if (e.which === 37) {  //left
                value = Utls.posValuesAry[Utls.prevIndex(Utls.posValuesAry, value)];
                Notes.fillNoteSpan(parseFloat(value), pitch + note.attr("data-accidental") + oct, note);
                var voiceIndex = parseInt($(this).parents(".voiceBar").attr("data-voice"))
                Formatting.wrapBars($(this).parents(".systemLine"));
                tieHandlers.checkEndOfBar($(this).closest(".bar"));
            }
            if (e.which === 9) {  //tab
                if (e.shiftKey) {
                    var prev = _this.nextFocusItem(-1, $(this)).focus();
                    console.log(prev);
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

                tieHandlers.onRemoveNote(note);
                note.remove();
                if (focus.parents(".systemLine").prev().hasClass("systemLine")) {
                    Formatting.wrapBars(focus.parents(".systemLine").prev());
                }
                focus.focus();
                _this.scrollToFocus();
            }
            if (e.which === 190) { // . or > for sharp
                if (note.attr("data-accidental") !== "#") {
                    pitch += "#";
                }
                Notes.fillNoteSpan(parseFloat(value), pitch + oct, note);
                tieHandlers.checkTieOnNote(note);
            }
            if (e.which === 188) { // , or < for flat
                if (note.attr("data-accidental") !== "b") {
                    pitch += "b";
                }
                Notes.fillNoteSpan(parseFloat(value), pitch + oct, note);
                tieHandlers.checkTieOnNote(note);
            }
            if (e.which === 61) { // = for natural
                if (note.attr("data-accidental") !== "n") {
                    pitch += "n";
                }
                Notes.fillNoteSpan(parseFloat(value), pitch + oct, note);
                tieHandlers.checkTieOnNote(note);
            }
            if (e.which === 173) { // - or _.  Tries to connect to previous note.
                tieHandlers.tie(note);
            }
            var char = String.fromCharCode(e.which);
            if (Utls.scale.indexOf(char) !== -1 || char === "R") {
                var newNote = Notes.insertNewNote($(this), char);
                tieHandlers.onInsertNote(newNote);
            }
        }
        $(musicSheetDiv).on("keydown", ".voiceBar", _this.voiceBarKeydown);
        $(musicSheetDiv).on("keydown", ".noteInner", _this.noteInnerKeydown);
        return _this;
    };
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
            var bars = musicSheetDiv.find(".bar");
            var barIndex = bars.index(bar);
            var voices = makeBarsPlayable(barIndex, barIndex);
            scheduler.setVoices(voices);
            scheduler.play();
        }
        function playFromBar(bar) {
            var bars = musicSheetDiv.find(".bar");
            var barIndex = bars.index(bar);
            var voices = makeBarsPlayable(barIndex);
            scheduler.setVoices(voices);
            scheduler.play();
        }
        function deleteBar(bar) {
            var parent = bar.parent();
            var bars = bar.closest(".musicSheet").find(".bar");
            var index = bars.index(bar);
            bar.remove();
            tieHandlers.checkStartOfBar(bars.eq(index+1));
            tieHandlers.checkEndOfBar(bars.eq(index-1));
            console.log(bars.eq(index+1)[0], bars.eq(index-1)[0])
            Formatting.wrapBars(parent);
        }
        function addBarAfter(bar) {
            var sysLineDiv = bar.parents(".systemLine");
            var newBar = _this.makeNewBar(bar)
            newBar.insertAfter(bar);
            KeySignature.appendKeySig(newBar, false, true);
            Formatting.wrapBars(sysLineDiv);
            tieHandlers.checkEndOfBar(bar);
            var bars = bar.closest(".musicSheet").find(".bar");
            var newBarIndex = bars.index(newBar);
            tieHandlers.checkStartOfBar(bars.eq(newBarIndex+1));
        }
        function addBarBefore(bar) {
            var sysLineDiv = bar.parents(".systemLine");
            var newBar = _this.makeNewBar(bar)
            newBar.insertBefore(bar);
            KeySignature.appendKeySig(newBar, false, true);
            Formatting.wrapBars(sysLineDiv);
            tieHandlers.checkStartOfBar(bar);
            var bars = bar.closest(".musicSheet").find(".bar");
            var newBarIndex = bars.index(newBar);
            if(newBarIndex>0){
                tieHandlers.checkEndOfBar(bars.eq(newBarIndex-1));
            }
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
        $(musicSheetDiv).on("mouseenter", ".bar", function() {
            makePopup($(this))
        });
        $(musicSheetDiv).on("mouseleave", ".bar", function() {
            destroyPopup($(this))
        });
        return _this;
    };
    var Formatting = function() {
        var Formatting = {};
        Formatting.adjLineVoiceSpacing = function(sysLine, voice) {
            //first get all notes in one voice in one musicSheet line;
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
            Formatting.adjSysLineConnector(sysLine);
        }
        Formatting.adjLineSpacing = function(sysLine) {
            var voices = sysLine.find(".bar").first().find(".voiceBar").length;
            for (var i = 0; i < voices; i++) {
                Formatting.adjLineVoiceSpacing(sysLine, i);
            }
        }
        Formatting.adjAllVoiceSpacing = function() {
            var sysLines = musicSheetDiv.find(".systemLine");
            var voices = sysLines.first().find(".bar").first().find(".voiceBar").length;
            sysLines.each(function(index, sysLine) {
                for (var i = 0; i < voices; i++) {
                    sysLine = $(sysLine);
                    Formatting.adjLineVoiceSpacing(sysLine, i);
                }
            })
        }
        Formatting.adjSysLineConnector = function(sysLineDiv) {
            var rect = sysLineDiv.find(".voiceBar").get(0).getClientRects();
            if (rect.length > 0) {
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
        }
        Formatting.postpendSysLine = function(sysLineDiv) {
            var newSysLineDiv = $("<div>").addClass("systemLine").insertAfter(sysLineDiv);
            $("<i>").addClass("systemConnector").appendTo(newSysLineDiv);
            return newSysLineDiv;
        }
        Formatting.toNextSysLine = function(bars, sysLineDiv) {
            var nextSysLine = sysLineDiv.next().hasClass("systemLine") ? sysLineDiv.next() : Formatting.postpendSysLine(sysLineDiv);
            nextSysLine.find(".systemConnector").after(bars);
        }
        Formatting.wrapBars = function(sysLineDiv) {
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
                        Formatting.toNextSysLine($(bar).nextAll().addBack(), sysLineDiv);
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
                Formatting.adjSysLineConnector(sysLineDiv);
            }
            next = next || sysLineDiv.next();
            if (next && next.hasClass("systemLine")) {
                Formatting.wrapBars(next);
            }
            var voices = sysLineDiv.find(".bar").first().find(".voiceBar").length;
            Formatting.adjLineSpacing(sysLineDiv);
        }
        Formatting.redraw = function() {
            Formatting.wrapBars(musicSheetDiv.find(".systemLine").first());
            Formatting.adjAllVoiceSpacing()
        }

        return Formatting;
    }();
    function TieHandlers(){
    function mark(el) {
        $(".marked").removeClass("marked");
        el.addClass("marked");
        console.log("mark", el);
    }
    function prevNote(el) {
        var voice = el.closest(".voiceBar").attr("data-voice")
        var notes = el.closest(".musicSheet").find(".voiceBar[data-voice='" + voice + "'] .note");
        var index = notes.index(el);
        index--;
        if(index>=0){
            return notes.eq(index);
        }
    }
    function nextNote(el) {
        var voice = el.closest(".voiceBar").attr("data-voice")
        var notes = el.closest(".musicSheet").find(".voiceBar[data-voice='" + voice + "'] .note");
        var index = notes.index(el);
        index++;
        if(index<notes.length){
            return notes.eq(index);
        }
    }
    function isFirstInBar(el) {
        var bar = el.closest(".voiceBar");
        var noteInners = bar.find(".note");
        var index = noteInners.index(el);
        return index === 0;
    }
    function areSamePitch(noteA, noteB) {
        var pitchA = noteA.attr("data-pitch") + noteA.attr("data-accidental");
        var pitchB = noteB.attr("data-pitch") + noteB.attr("data-accidental");
        pitchA = KeySignature.getFrequency(pitchA, noteA.parent().attr("data-key"));
        pitchB = KeySignature.getFrequency(pitchB, noteB.parent().attr("data-key"));
        return pitchA === pitchB;
    }
    function isEndOfBar(el) {
        var bar = el.closest(".bar");
        var voiceBar = el.closest(".voiceBar");
        var voiceBars = bar.find(".voiceBar");
        var myVbIndex = voiceBars.index(voiceBar);
        var myVbLength = 0;
        var maxVbLength = 0;
        voiceBars.each(function(index, voiceBar) {
            var length = 0;
            var notes = $(voiceBar).find(".note");
            notes.each(function(index, note) {
                length += parseFloat($(note).attr("data-value"));
            })
            if (index === myVbIndex) {
                myVbLength = length;
            }
            maxVbLength = Math.max(maxVbLength, length);
        })
        return myVbLength === maxVbLength;
    }
    function areAdjacentBars(former, latter){
        var formerVb = former.closest(".voiceBar");
        var latterVb = latter.closest(".voiceBar");
        var formerVoice = formerVb.attr("data-voice");
        var latterVoice = latterVb.attr("data-voice");
        if(formerVoice !== latterVoice) return false;
        var vbs = former.closest(".musicSheet").find(".voiceBar[data-voice="+formerVoice+"]")
        var formerIndex = vbs.index(formerVb);
        if(formerIndex<0) return;
        var latterIndex = vbs.index(latterVb);
        if(latterIndex !== formerIndex + 1) return;
        return true;
        
    }
    function canBeTied(former, latter) {
        if(!areAdjacentBars(former, latter))
            return false;
        if (!isFirstInBar(latter))
            return false;
        if (!areSamePitch(latter, former))
            return false;
        if (!isEndOfBar(former)) {
            return false;
        }
        return true;
    }
    function reconnectAfter(connected, index){
        if(index<0) return;
        var newConnectId = Math.random().toString(32).substr(2);
        for (var i = index+1; i < connected.length; i++) {
            connected.eq(i).attr("data-connectid", newConnectId);
        }
        checkTieOnNote(connected.eq(index + 1));
    }
    function reconnectBefore(connected, index){
        var newConnectId = Math.random().toString(32).substr(2);
        for (var i = 0; i < index; i++) {
            connected.eq(i).attr("data-connectid", newConnectId);
        }
        checkTieOnNote(connected.eq(index - 1));
    }

    function onRemoveNote(note) {
        var connectid = note.attr("data-connectid");
        if (connectid) {
            var connected = musicSheetDiv.find("[data-connectid=" + connectid + "]");
            note.removeAttr("data-connectid")
            var connectIndex = connected.index(note);
            if (connectIndex === 0) {
                checkTieOnNote(connected.eq(1));
            } else if (connectIndex === connected.length - 1) {
                checkTieOnNote(connected.eq(connectIndex - 1));
            } else {
                reconnectAfter(connected, connectIndex)
                checkTieOnNote(connected.eq(connectIndex - 1));

            }
        }
        var bar = note.closest(".bar");
        checkEndOfBar(bar);
    }
    function onInsertNote(note) {
        var next = nextNote(note);
        var prev = prevNote(note);
        if(next && next[0].hasAttribute("data-connectid") && !next.hasClass("beginConnect")){
            var connectId = next.attr("data-connectid");
            var connected = note.closest(".musicSheet").find("[data-connectid="+connectId+"]");
            var connectIndex = connected.index(next);
            reconnectAfter(connected, connectIndex-1);
        }
        if(prev && prev[0].hasAttribute("data-connectid") && !prev.hasClass("endConnect")){
            var connectId = prev.attr("data-connectid");
            var connected = note.closest(".musicSheet").find("[data-connectid="+connectId+"]");
            var connectIndex = connected.index(next);
            reconnectBefore(connected, connectIndex+1);
        }
        var bar = note.closest(".bar");
        checkEndOfBar(bar);
    }
    function removeTie() {
        for (var i = 0; i < arguments.length; i++) {
            var noteEl = arguments[i];
            noteEl.removeClass("connect beginConnect endConnect");
            noteEl.removeAttr("data-connectid");
        }

    }
    function displayAllTies(){
        var connected = musicSheetDiv.find("[data-connectid]");
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
                    tieDisplay(group);
                }
            }
    }
    function tieDisplay(connected) {
        connected.removeClass("beginConnect endConnect");
        connected.addClass("connect")
        connected.eq(0).addClass("beginConnect");
        connected.eq(-1).addClass("endConnect");
    }
    function checkEndOfBar(bar) {
        var voiceBars = bar.find(".voiceBar");
        voiceBars.each(function(index, voiceBar) {
            checkTieOnNote($(voiceBar).find(".note").last());
        })
    }
    function checkStartOfBar(bar) {
        var voiceBars = bar.find(".voiceBar");
        voiceBars.each(function(index, voiceBar) {
            checkTieOnNote($(voiceBar).find(".note").first());
        })
    }
    //on pitch change, length change
    function checkTieOnNote(noteEl, depth) {
        depth = depth || 0;
        if(depth>15){
            console.log("in too deep");
            return;
        }
        window.checkingNoteEl = noteEl;
        var connectid = noteEl.attr("data-connectid");
        if (!connectid)
            return false;
        var connected = $(noteEl).closest(".musicSheet").find("[data-connectid=" + connectid + "]");
        if (connected.length <= 1) {
            removeTie(noteEl);
        }
        var index = connected.index(noteEl);
        if (index === 0) { //is at beginning
            if (!canBeTied(noteEl, connected.eq(1))) {
                removeTie(noteEl);
                checkTieOnNote(connected.eq(1), depth+1);
                return;
            }
        }
        if (index === connected.length - 1) {  //is at end (it's possible to be at beginning and end
            if (!canBeTied(connected.eq(index - 1), noteEl)) {
                removeTie(noteEl);
                checkTieOnNote(connected.eq(index - 1), depth+1);
                return;
            }
        } else if(index!==0){ //is in middle (not at end, not at beginning).
            if (!canBeTied(connected.eq(index - 1), noteEl)) {
                reconnectAfter(connected, index-1);
                checkTieOnNote(connected.eq(index - 1), depth+1);
                return;
            } else if (!canBeTied(noteEl, connected.eq(index + 1))) {
                reconnectAfter(connected, index);
                checkTieOnNote(noteEl, depth+1);
                return;
            }
        }
        tieDisplay(connected)
    }

    function tie(noteInner) {
        var el = noteInner.parent();
        if(el.hasClass("connect") && !el.hasClass("beginConnect")) return;
        var prev = prevNote(el);
        if(!prev) return;
        if (!canBeTied(prev, el))
            return;
        var connectid
        if(prev.hasClass("endConnect") && el.hasClass("beginConnect")){
            connectid = prev.attr("data-connectid");
            var elId = el.attr("data-connectid");
            el.closest(".musicSheet").find("[data-connectid="+elId+"]").attr("data-connectid", connectid);
        }else if(el.hasClass("beginConnect")){
            connectid = el.attr("data-connectid");
            prev.attr("data-connectid", connectid);
        }else if(prev.hasClass("endConnect")){
            connectid = prev.attr("data-connectid");
            el.attr("data-connectid", connectid);
        }
        if (!connectid) {
            connectid = Math.random().toString(32).substr(2);
            prev.attr("data-connectid", connectid);
            el.attr("data-connectid", connectid);
        }
        tieDisplay(el.closest(".musicSheet").find("[data-connectid=" + connectid + "]"))
    }
    
    
    return {
        tie: tie,
        onInsertNote: onInsertNote,
        onRemoveNote: onRemoveNote,
        checkEndOfBar: checkEndOfBar,
        checkStartOfBar: checkStartOfBar,
        checkTieOnNote: checkTieOnNote,
        displayAllTies: displayAllTies
    }
}
var tieHandlers = new TieHandlers();
    /*var ConnectionHandlers = new function() {
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
            var bars = musicSheetDiv.find(".bar");
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
            if (!areSamePitch(note, nextNote)) {
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
                    note.closest(".musicSheet").find("[data-connectid='" + otherConnectId + "']").attr("data-connectid", connectid);
                } else {
                    connectid = nextNote.attr("data-connectid");
                }
            } else {
                nextNote.addClass("endConnect");
            }
            connectid = connectid || Math.random().toString(32).substr(2);
            note.attr("data-connectid", connectid);
            nextNote.attr("data-connectid", connectid);
            //var begin = $(".beginConnect[data-connectid="+connectid+"]");
            //var end = $(".endConnect[data-connectid="+connectid+"]");
            //bezier(begin.find(".noteInner")[0], end.find(".noteInner")[0]);
        }
        function areSamePitch(noteA, noteB) {
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
            var notes = musicSheetDiv.find("[data-voice='" + voice + "'] .note");
            var groupBeginIndex = notes.index(group.first());
            var bars = musicSheetDiv.find(".bar");
            for (var i = 0; i < group.length; i++) {
                var doesNotBelong = false;
                if (!group.eq(i).is(notes.eq(i + groupBeginIndex))) {
                    doesNotBelong = true;
                } else if (!areSamePitch(group.eq(0), group.eq(i))) {
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
        $("body").on("dblclick", ".noteInner", function() {
            console.log("double clicked")
            tieHandlers.tie($(this));
            //_this.connectNote($(this), false);
            //window.dblClick($(this));
        })
        return _this;
    };*/

    var makeNewSong = function(ts, as, bs, key) {
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
        voicesForClef(ts, "treble", key);
        voicesForClef(as, "alto", key);
        voicesForClef(bs, "bass", key);
        renderMusicSheetObj(voices);
        return voices;
    }
    var SchedulerUI = function() {
        $("#toBeginning").click(function() {
            var playing = scheduler.playing;
            pause();
            $(".pauseBar").removeClass("pauseBar");
            if (playing) {
                play()
            }
        });
        $("#back").click(function() {
            var playing = scheduler.playing;
            pause();
            var bars = $(".bar");
            var barIndex = $(".bar").index($(".pauseBar"));
            $(".pauseBar").removeClass("pauseBar");
            bars.eq(barIndex - 1).addClass("pauseBar");
            if (playing) {
                play()
            }
        })
        $("#forward").click(function() {
            var playing = scheduler.playing;
            pause();
            var bars = $(".bar");
            var barIndex = $(".bar").index($(".pauseBar"));
            $(".pauseBar").removeClass("pauseBar");
            bars.eq(barIndex + 1).addClass("pauseBar");
            if (playing) {
                play()
            }
        })
        function play() {
            var voices;
            if ($(".pauseBar").length > 0) {
                var barIndex = $(".bar").index($(".pauseBar"));
                voices = makeBarsPlayable(barIndex);
                $(".pauseBar").removeClass("pauseBar");
            } else {
                voices = makeBarsPlayable();
            }
            scheduler.setVoices(voices);
            scheduler.play();
        }
        $("#play").click(play);
        function pause() {
            $(".highlight").parents(".bar").addClass("pauseBar");
            scheduler.pause();
        }
        $("#pause").click(pause);

        $("#tempo").on("input", function() {
            scheduler.setTempo($("#tempo").val());
        });
        $("#logInstruments").click(function() {
            console.log("logInstruments", instruments.length);
            for (var i = 0; i < instruments.length; i++) {
                console.log(instruments[i]);
            }
        })
    }();
    var Compression = function() {
        function expandBars(cBars) {
            var bars = [];
            for (var i = 0; i < cBars.length; i++) {
                var notes = [];
                var cBar = cBars[i]
                var bar = {
                    key: KeySignature.circleOfFifths[cBar[0]],
                    notes: notes
                };
                bars.push(bar);
                var cNotes = cBar[1];
                for (var j = 0; j < cNotes.length; j++) {
                    var cNote = cNotes[j];
                    var value = cNote[1];
                    value = value ? 1 / value : 1.5;
                    var note = {
                        pitch: musicTools.midiToNote(cNote[0]) || "R",
                        value: value + ""
                    }
                    if (cNote.length === 3) {
                        note.connectid = cNote[2];
                    }
                    notes.push(note);
                }
            }
            return bars;
        }
        function expand(compressed) {
            var expanded = [];
            var clefs = {
                t: "treble",
                a: "alto",
                b: "bass"
            }
            for (var i = 0; i < compressed.length; i++) {
                var cVoice = compressed[i];
                var voice = {
                    name: cVoice[0],
                    clef: clefs[cVoice[1]],
                    bars: expandBars(cVoice[2]),
                    instrument: {name: cVoice[3][0], level: cVoice[3][1]}
                };
                expanded.push(voice)
            }
            return expanded;
        }
        function compressBars(bars) {
            var cBars = new Array(bars.length);
            for (var i = 0; i < bars.length; i++) {
                var cBar = new Array(2);
                cBars[i] = cBar;
                var bar = bars[i];
                var cNotes = new Array(bar.notes.length);
                cBar[0] = KeySignature.circleOfFifths.indexOf(bar.key);
                cBar[1] = cNotes;
                for (var j = 0; j < cNotes.length; j++) {
                    var note = bar.notes[j];
                    var val = parseFloat(note.value)
                    if (val === 1.5) {
                        val = 0;
                    } else {
                        val = 1 / val;
                    }
                    cNotes[j] = [musicTools.noteToMidi(note.pitch), val];
                    if (note.connectid) {
                        cNotes[j].push(note.connectid);
                    }
                }
            }
            return cBars;
        }
        function compress(serialized) {
            //var precompressedL = LZString.compressToUTF16(JSON.stringify(serialized)).length;
            var compressed = new Array(serialized.length);
            for (var i = 0; i < serialized.length; i++) {
                var cVoice = new Array(4);
                compressed[i] = cVoice;
                var voice = serialized[i];
                cVoice[0] = voice.name;
                cVoice[1] = voice.clef[0];
                cVoice[2] = compressBars(voice.bars)
                cVoice[3] = [voice.instrument.name, voice.instrument.level];
            }
            return compressed;
        }

        return {expand: expand, compress: compress}
    }()
    function renderMusicSheetObj(musicSheetObj, expandFirst) {
        if (expandFirst) {
            musicSheetObj = Compression.expand(musicSheetObj);
        }
        console.log(musicSheetObj);
        if (instruments.length > 0) {
            alert("To music has already been rendered in this instance.  Create" +
                    "a new instance of MusicSheet to render again.");
            return;
        }
        for (var i = 0; i < musicSheetObj.length; i++) {
            instruments.push(musicSheetObj[i].instrument);
        }
        /*      function makeVoiceControls(voices) {  //this should be moved to the new song function in SheetMusic.js, and then it can be simplified.
         //Options in the select should be the saved instruments as well as an option 
         //named 'last save'.  
         //when something other than 'last save' is selected and the song is saved,
         //the select should be set back to last save.
         for (var i = 0; i < instruments.length; i++) {
         instruments[i].kill();
         }
         instruments = [];
         $("#voiceControls").empty();
         var table = $("<table>").appendTo("#voiceControls");
         var headerRow = $("<tr>").appendTo(table);
         $("<th>").text("Voice").appendTo(headerRow);
         $("<th>").text("Instrument").appendTo(headerRow);
         $("<th>").text("Dynamic").attr("data-hint", "Instrument for selected voice can be modified in Instrument Synth tab.").appendTo(headerRow);
         $("<th>").text("Volume").appendTo(headerRow);
         
         for (var i = 0; i < voices.length; i++) {
         try {
         instruments.push(new Instrument(audioContext, voices[i].instrument));
         } catch (err) {
         console.log("couldn't make saved instrument for voice " + (i + 1) + ".", err);
         instruments.push(new Instrument(audioContext));
         }
         var tr = $("<tr>").appendTo(table);
         voices[i].name = voices[i].name || i;
         var nameTd = $("<td>").text(voices[i].name).appendTo(tr);
         var instrumentTd = $("<td>").appendTo(tr);
         //$("<select>").attr({"data-for": i}).addClass("selectinstrument").attr({
         // "data-serializedInstr": JSON.stringify(instruments[i].serialize())
         // }).appendTo(instrumentTd);
         var dynamicRadioTd = $("<td>").appendTo(tr);
         //$("<input>").attr({type: "checkbox", name: "dynamicInstrument", "data-for": i}).appendTo(dynamicRadioTd);
         var volumeTd = $("<td>").appendTo(tr);
         $("<input>").attr({
         type: "range",
         min: 0,
         max: 1,
         step: 0.1,
         id: voices[i].name + "Level"
         }).val(1).appendTo(volumeTd);
         }
         table.on("change", "input[name=dynamicInstrument]", function() {
         var checked = $(this);
         if (!$(this).prop("checked")) {
         checked = $();
         }
         table.find("input[name=dynamicInstrument]").prop("checked", false);
         checked.prop("checked", true);
         if (checked.length === 1) {
         var voiceIndex = checked.attr("data-for");
         synthUi.setInstrument(instruments[voiceIndex]);
         } else {
         synthUi.setInstrument(new Instrument(audioContext));
         }
         })
         table.on("change", ".selectinstrument", function() {
         var voiceIndex = $(this).attr("data-for");
         var selected = $(this).find("option:selected");
         var instrName = selected.text();
         var serializedInstr;
         if (instrName === "Last Save") {
         serializedInstr = JSON.parse(selected.parents("select").attr("data-serializedInstr"));
         } else {
         serializedInstr = instrumentIo.getItem(instrName);
         }
         instruments[voiceIndex].fromSerialized(serializedInstr);
         var synthUiVoiceIndex = table.find("input[name=dynamicInstrument]:checked").attr("data-for");
         if (voiceIndex === synthUiVoiceIndex) {
         synthUi.setInstrument(instruments[voiceIndex]);
         }
         })
         }
         */
        function writeSheet() {
            musicSheetDiv.empty();
            var sysLineDiv = $("<div>").addClass("systemLine").appendTo(musicSheetDiv);
            $("<i>").addClass("systemConnector").appendTo(sysLineDiv);
            for (var voiceIndex = 0; voiceIndex < musicSheetObj.length; voiceIndex++) {
                var voiceClef = musicSheetObj[voiceIndex].clef;
                var voiceName = musicSheetObj[voiceIndex].name;
                var bars = musicSheetObj[voiceIndex].bars;
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
            Formatting.wrapBars(musicSheetDiv.find(".systemLine").first());
            tieHandlers.displayAllTies();
            // ConnectionHandlers.rectifyConnections();
        }
        musicSheetObj = musicSheetObj || [
            {clef: "treble", name: "S", bars: [{key: "F", notes: []}]},
            {clef: "treble", name: "A", bars: [{key: "F", notes: []}]},
            {clef: "bass", name: "T", bars: [{key: "F", notes: []}]},
            {clef: "bass", name: "B", bars: [{key: "F", notes: []}]},
        ]
        writeSheet();
        return musicSheetObj;
    }
    function getVoiceName(index) {
        var bars = musicSheetDiv.find(".bar");
        var firstBar = bars.first();
        return firstBar.find(".voiceBar").eq(index).attr("data-voicename");
    }
    function serialize(forPlaying, compressIt) {
        var bars = musicSheetDiv.find(".bar");
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
                bars: [],
                instrument: {name: instruments[index].name, level: instruments[index].getLevel()}
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
        if (compressIt) {
            return Compression.compress(voices);
        }
        return voices;
    }
    function makeBarsPlayable(startBar, endBar) {
        var forPlaying = true;
        var sysObj = serialize(forPlaying);
        for (var i = 0; i < sysObj.length; i++) {
            var voice = sysObj[i];
            voice.instrument = instruments[i];
            voice.notes = [];
            startBar = startBar || 0;
            if (isNaN(endBar)) {
                endBar = voice.bars.length - 1;
            }
            endBar = endBar >= voice.bars.length ? voice.bars.length - 1 : endBar;
            for (var barIndex = startBar; barIndex < endBar + 1; barIndex++) {
                var bar = voice.bars[barIndex];
                var key = bar.key;
                for (var noteIndex = 0; noteIndex < bar.notes.length; noteIndex++) {
                    var note = bar.notes[noteIndex];
                    if (note.connectid && voice.notes.length>0 && voice.notes[voice.notes.length - 1].connectid === note.connectid) {
                        voice.notes[voice.notes.length - 1].value += parseFloat(note.value);
                    } else {
                        var playNote = {
                            value: parseFloat(note.value),
                            pitch: KeySignature.getFrequency(note.pitch, key),
                            el: note.el
                        }
                        if (note.connectid) {
                            playNote.connectid = note.connectid;
                        }
                        voice.notes.push(playNote);
                    }
                }
            }
        }
        return sysObj;
    }
    window.KeySignature = KeySignature;
    return {
        renderMusicSheetObj: renderMusicSheetObj,
        makeNewSong: makeNewSong,
        serialize: serialize,
        redraw: Formatting.redraw,
        instruments: instruments,
        getVoiceName: getVoiceName,
        setTempo: scheduler.setTempo

    }
    /*
     * Need an option for opening saved and another for a blank.
     */
}
MusicSheet.Utls = function() {
    var thisUtls = {};
    thisUtls.scale = "CDEFGAB"
    thisUtls.nextIndex = function(ary, item) {
        var index = ary.indexOf(item);
        if (index === ary.length - 1) {
            return 0;
        } else {
            return index + 1;
        }
    };
    thisUtls.prevIndex = function(ary, item) {
        var index = ary.indexOf(item);
        if (index === 0) {
            return ary.length - 1;
        } else {
            return index - 1;
        }
    }
    thisUtls.posValuesAry = ["0.015625", "0.046875", "0.0625", "0.09375", "0.125", "0.1875", "0.25", "0.375", "0.5", "0.75", "1", "1.5"]
    thisUtls.notesSym = {
        t: "&#x72;",
        s: "x",
        e: "e",
        q: "q",
        h: "h",
        w: "w"
    };
    thisUtls.restSym = {
        t: "&#xa8;",
        s: "&#xc5;",
        e: "&#xe4;",
        q: "&#xce;",
        h: "&#xee;",
        w: "&#xee;"
    }
    thisUtls.durSym = {
        t: "1D162",
        s: "1D161",
        e: "1D160",
        q: "1D15F",
        h: "1D15E",
        w: "1D15D",
    }
    thisUtls.otherSym = {
        f: "\\1D12C",
        s: "\\1D130",
        n: "\\1D12E",
        x: ""
    }
    thisUtls.dotSym = ["", "\\1D16D"]

    thisUtls.valsLtoN = {
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
    thisUtls.centralOctaves = {treble: 4, alto: 4, bass: 3};
    thisUtls.valsNtoL = {};
    for (var key in thisUtls.valsLtoN) {
        thisUtls.valsNtoL[thisUtls.valsLtoN[key]] = key;
    }
    return thisUtls;
}();
MusicSheet.makeDynamicStyle = function(zoom, qNoteWidth) {
    var Utls = MusicSheet.Utls;
    zoom /= 2;
    var noteStyleEl = $("style.noteStyle");
    if (noteStyleEl.length === 0) {
        noteStyleEl = $("<style>").addClass("noteStyle").appendTo("head");
    }
    noteStyleEl.empty();
    var str = "";
    var keyboard = [];
    for (var j = 0; j < 8; j++) {
        for (var i = 0; i < Utls.scale.length; i++) {
            keyboard.push(Utls.scale[i] + j);
        }
    }
    var f4Index = keyboard.indexOf("F4");
    function noteStyleForClef(i, f4Pos, noteTop, clef) {
        noteTop += f4Pos;
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
    for (var key in Utls.valsLtoN) {
        str += ".note[data-value='" + Utls.valsLtoN[key] + "']{width: " + (wNoteWidth * Utls.valsLtoN[key]) * zoom + "px;}\n";
        str += ".note[data-value='" + Utls.valsLtoN[key] + "'] .noteInner:after{width: " + ((wNoteWidth * Utls.valsLtoN[key] + 60) * zoom + 2) + "px;}\n";
    }
    str += "[data-pitch=R]{top: " + -68 * zoom + "px;}\n";
    str += "[data-pitch=R][data-value='1'],[data-pitch=R][data-value='1.5']{top: -" + 78 * zoom + "px;}\n";
    str += "[data-pitch]{height: " + 110 * zoom + "px;}\n";
    str += ".noteInner{width: " + 70 * zoom + "px;}\n";
    str += "[data-pitch]::before{background-size: " + 44 * zoom + "px " + 20 * zoom + "px;}\n";
    str += "[data-pitch]{font-size: " + (78 * zoom) + "px;}\n;"
    str += ".bar{margin-top: " + (40 * zoom) + "px; margin-bottom: " + (40 * zoom) + "px;}\n";
    var block = ".voiceBar{" +
            "height: " + (80 * zoom + 1) + "px;\n" +
            "background-size: " + (20 * zoom) + "px " + (20 * zoom) + "px;\n" +
            "padding-right: " + (26 * zoom) + "px;\n" +
            "margin-top: " + (60 * zoom) + "px;}\n";
    str += block;
    str += ".systemConnector{width: " + (20 * zoom) + "px;}\n";
    str += ".bar:first-of-type .voiceBar::before {" +
            "width:" + (60 * zoom) + "px; " +
            "font-size: " + (78 * zoom) + "px; " +
            "top: " + (-29 * zoom) + "px}\n";
    str += ".keySigSymbol{width: " + 26 * zoom + "px}\n";
    str += ".keySignature{\n" +
            "padding-left: " + 26 * zoom + "px;}\n ";
    str += ".blank{width:" + (11 * zoom) + "px}\n";
    str += ".musicSheet.tabBody{padding-top:" + (100 * zoom) + "px}\n";
    noteStyleEl.text(str);
};
function resizeTieCanvas(musicSheetDiv) {
    var c = musicSheetDiv.find(".tieCanvas");
    if (c.length === 0) {
        c = $("<canvas>").addClass("tieCanvas").appendTo(musicSheetDiv);
    }
    var rect = musicSheetDiv[0].getBoundingClientRect()
    var h = musicSheetDiv[0].scrollHeight;
    var w = rect.width;
    c.height(h);
    c.width(w);
    c.prop({
        height: h,
        width: w
    })
}
var bezier = function(el1, el2) {
    console.log(el1, el2)
    //el1 = el1[0];
    //el2 = el2[0];
    resizeTieCanvas($(".musicSheet"));
    var r1 = el1.getBoundingClientRect();
    var r2 = el2.getBoundingClientRect();
    /*function adjustRect(el, rect){
     var outline = $(el).css("outline");
     console.log(outline);
     if($(el).is(":focus")){
     //rect.left-=2;
     rect.right-=4;
     rect.bottom-=4;
     }
     }
     adjustRect(el1, r1);
     adjustRect(el2, r2);
     var backwards = r1.left >= r2.left;
     if(backwards){
     var r3 = r1;
     r1 = r2;
     r2 = r3;
     }*/
    var constant = $(el1).width();
    var offset = constant * 0.15;
    var p1 = {
        x: r1.left + constant * 0.1,
        y: r1.bottom - 2
    }
    var p2 = {
        x: r2.left + constant * 0.75,
        y: r2.bottom
    }
    console.log(JSON.stringify([p1, p2]));
    var c1 = {
        x: p1.x,
        y: p1.y + offset
    }
    var c2 = {
        x: p2.x,
        y: p2.y + offset
    }
    /* var left = p1.x;
     var top = Math.min(p1.y, p2.y)
     var cw = Math.abs(p1.x-p2.x);
     var ch = Math.abs(p1.y-p2.y)+offset;*/
    var scrollParent = $(el1).closest(".musicSheet");
    var scrollParentRect = scrollParent[0].getBoundingClientRect();
    var s = {
        x: scrollParent.scrollLeft() - scrollParentRect.left,
        y: scrollParent.scrollTop() - scrollParentRect.top - constant * 1.25
    }
    function adjust(p) {
        p.x += s.x;
        p.y += s.y;

    }
    adjust(p1);
    adjust(p2);
    adjust(c1);
    adjust(c2);
    var tieCanvas = $(".tieCanvas");

    var p1a = {
        x: $(el1).closest(".voiceBar")[0].getBoundingClientRect().right + constant * 0.1,
        y: c1.y
    }
    var p2a = {
        x: $(el2).closest(".voiceBar")[0].getBoundingClientRect().left - constant * 0.1,
        y: c2.y
    }

    var ctx = tieCanvas[0].getContext("2d");
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    //ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, p2.x, p2.y);
    ctx.quadraticCurveTo(c1.x, c1.y, (c1.x + p1a.x) / 2, p1a.y);
    ctx.lineTo(p1a.x, p1a.y);
    ctx.stroke();
    ctx.moveTo(p2.x, p2.y);
    ctx.quadraticCurveTo(c2.x, c2.y, (c2.x + p2a.x) / 2, p2a.y);
    ctx.lineTo(p2a.x, p2a.y);

    ctx.stroke();
}
$(function() {
    $("<style>canvas.tieCanvas{position:absolute; top:0;left:0; z-index: 400; pointer-events: none; } .marked{background-color: teal}</style>").appendTo("head");

    /* $("body").on("click", ".noteInner", function() {
     var marked = $(".marked");
     if (marked.length === 0) {
     $(this).addClass("marked");
     } else if (marked.length === 1) {
     $(this).addClass("marked");
     marked = $(".marked");
     bezier(marked[0], marked[1]);
     marked.removeClass("marked");
     }else if(marked.length===2){
     
     }
     })*/
})
