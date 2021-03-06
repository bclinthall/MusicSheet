/* 
 * Copyright B. Clint Hall 2014-2015.  All rights reserved.
 * Contact the author to discuss licensing.  theaetetus7  gmail.com
 */

function Manager() {
    var audioContext = new AudioContext();
    var tabManager = new TabManager();
    var tabContainer = $(".tabContainer.main");
    var toast = tabManager.toast;
    var makeMenu = tabManager.makeMenu;
    var mainMenu;
    function makeMainMenu(){
        mainMenu = makeMenu(null, "mainMenuContainer", "fa fa-cog fa-lg").appendTo(".headerBarControls").find(".menuContent");
        mainMenu.addClass("mainMenuContent");
    }   
    makeMainMenu();
    
    function newTab(label) {
        var tabId = tabManager.newTab(tabContainer, label);
        var tabHeader = $(".tabHeader[data-tab-id=" + tabId + "]");
        makeMenu(null, "settingsIcon", "fa fa-cog fa-lg").appendTo(tabHeader);
        return tabId;
    }
    function addFileMenuItems(menuContent, name, label, fileMenuItemFunctions) {
        $("<div>")
                .addClass("save" + label + "Btn menuItem closeIt")
                .text("Save " + label)
                .attr({
                    "data-filename": name
                }).appendTo(menuContent).click(function() {
            var name = $(this).attr("data-filename");
            fileMenuItemFunctions.save(name);
        });
        $("<div>")
                .addClass("save" + label + "AsBtn menuItem closeIt")
                .text("Save " + label + " As...")
                .attr({
                    "data-filename": name
                }).appendTo(menuContent).click(function() {
            var name = $(this).attr("data-filename");
            var savedName = fileMenuItemFunctions.saveAs(name);
            if (savedName) {
                var tabHeader = $(this).closest(".tabHeader");
                tabHeader.find(".tabLabel").text(savedName);
                tabHeader.find("[data-filename]").attr("data-filename", savedName);
            }
        });
        $("<div>")
                .addClass("close" + label + "EditorBtn menuItem closeIt")
                .text("Close")
                .attr({
                    "data-filename": name
                }).appendTo(menuContent).click(function() {
            var name = $(this).attr("data-filename");
            fileMenuItemFunctions.close(name);
        });
        $("<div>")
                .addClass("delete" + label + "Type menuItem closeIt")
                .text("Delete " + label)
                .attr({
                    "data-filename": name
                }).appendTo(menuContent).click(function() {
            var name = $(this).attr("data-filename");
            fileMenuItemFunctions.delete(name);
        });
    }

    var InstrumentManager = function() {
        var instrumentIo = new Io("instrument");
        /*
         * activeInstrumentInstances:
         * keys are instrumentTypeNames;
         * values are arrays of instruments;
         * these arrays are master lists.  They will be passed to 
         * synthUi's as they are created.
         */
        var activeInstrumentInstances = {};
        /*
         * instrumentTypeEditors
         * keys are instrumentTypeNames
         * values {tabId: xxx, synthUi:xxx}
         * 
         */
        var instrumentTypeEditors = {};
        function newInstrumentInstance(typeName, forEditor) {
            /*
             * make an instrument instance.  Add it to activeInstrumentInstances.
             * if(guiOpenInstrumentTypes[typeName]) 
             * return instrumentInstanceId?
             */
            var instrument;
            if (typeName) {
                var serializedInstr = instrumentIo.getItem(typeName);
                if (serializedInstr) {
                    instrument = new Instrument(audioContext, serializedInstr);
                }
            }
            if (!instrument) {
                instrument = new Instrument(audioContext);
                typeName = instrumentIo.saveAs(instrument.serialize());
                if (!typeName) {
                    return;
                }
            }
            var group;
            if (!activeInstrumentInstances[typeName]) {
                activeInstrumentInstances[typeName] = [];
            }
            group = activeInstrumentInstances[typeName];
            if (forEditor) {
                group.unshift(instrument);
            } else {
                group.push(instrument);
            }
            instrument.name = typeName
            return instrument;
        }
        function closeInstrumentInstance(instrument) {
            instrument.kill();
            var group = activeInstrumentInstances[instrument.name];
            var index = group.indexOf(instrument);
            group.splice(index, 1);
        }
        var instrumentFileMenuItemFunctions = function() {
            function closeInstrumentEditor(typeName) {
                var editor = instrumentTypeEditors[typeName];
                var instruments = activeInstrumentInstances[typeName];
                closeInstrumentInstance(instruments[0]);
                tabManager.removeTab(tabContainer, editor.tabId);
                delete instrumentTypeEditors[typeName];
            }
            function deleteInstrumentType(typeName) {
                var doIt = instrumentIo.deleteItem(typeName, " Projects that rely on " + typeName + " may malfunction.");
                if (doIt) {
                    closeInstrumentEditor(typeName);
                    var group = activeInstrumentInstances[typeName];
                    for (var i = 0; i < group; i++) {
                        group[i].kill();
                    }
                    delete activeInstrumentInstances[typeName];
                }
            }
            function saveInstrumentType(typeName) {
                var serialized = activeInstrumentInstances[typeName][0].serialize();
                var savedName = instrumentIo.saveItem(typeName, serialized);
                if (savedName) {
                    toast(savedName + " saved successfully.");
                } else {
                    toast(typeName + " failed to save.");
                }
            }
            function saveInstrumentTypeAs(oldTypeName) {
                var group = activeInstrumentInstances[oldTypeName];
                var serialized = group[0].serialize();
                var savedName = instrumentIo.saveAs(serialized);
                if (savedName) {
                    toast(savedName + " saved successfully.");
                    for (var i = 0; i < group.length; i++) {
                        group[i].name = savedName;
                    }
                    activeInstrumentInstances[savedName] = group;
                    delete activeInstrumentInstances[oldTypeName];
                    instrumentTypeEditors[savedName] = instrumentTypeEditors[oldTypeName]
                    delete instrumentTypeEditors[oldTypeName];
                    return savedName;
                }
                return false;
            }
            return {
                close: closeInstrumentEditor,
                delete: deleteInstrumentType,
                save: saveInstrumentType,
                saveAs: saveInstrumentTypeAs
            }
        }();
        function openInstrumentEditor(typeName) {
            var tabId
            if (instrumentTypeEditors[typeName]) {  //editor already open
                var editor = instrumentTypeEditors[typeName];
                tabManager.activate(tabContainer, editor.tabId);
                tabId = editor.tabId;
            } else {
                var instrument = newInstrumentInstance(typeName, true);
                if (!instrument) {
                    return;
                }
                typeName = instrument.name;
                tabId = newTab(typeName);
                var menuContent = $(".tabHeader[data-tab-id=" + tabId + "]").find(".menuContent");
                addFileMenuItems(menuContent, typeName, "Instrument", instrumentFileMenuItemFunctions);
                $("<div>").text("Export Instrument").addClass("exportInstrument menuItem closeIt").appendTo(menuContent);
                $("<div>").addClass("menuSpacer").appendTo(menuContent);
                $("<div>").addClass("nodeMaker").attr("data-tab-id", tabId).appendTo(menuContent);
                $("<div>").addClass("menuSpacer").appendTo(menuContent);
                /*$("<div>")
                 .addClass("saveInstrumentBtn menuItem")
                 .text("Save Instrument")
                 .attr({
                 "data-filename": typeName
                 }).appendTo(menuContent).click(function() {
                 var name = $(this).attr("data-filename");
                 saveInstrumentType(name);
                 });
                 $("<div>")
                 .addClass("saveInstrumentAsBtn menuItem")
                 .text("Save Instrument As...")
                 .attr({
                 "data-filename": typeName
                 }).appendTo(menuContent).click(function() {
                 var name = $(this).attr("data-filename");
                 var savedName = saveInstrumentTypeAs(name);
                 if (savedName) {
                 var tabHeader = $(this).closest(".tabHeader");
                 tabHeader.find(".tabLabel").text(savedName);
                 tabHeader.find("[data-filename]").attr("data-filename", savedName);
                 }
                 });
                 $("<div>")
                 .addClass("closeInstrumentEditorBtn menuItem")
                 .text("Close")
                 .attr({
                 "data-filename": typeName
                 }).appendTo(menuContent).click(function() {
                 var name = $(this).attr("data-filename");
                 closeInstrumentEditor(name);
                 });
                 $("<div>")
                 .addClass("deleteInstrumentType menuItem")
                 .text("Delete Instrument")
                 .attr({
                 "data-filename": typeName
                 }).appendTo(menuContent).click(function() {
                 var name = $(this).attr("data-filename");
                 deleteInstrumentType(name);
                 });*/
                $("body").on("click", ".exampleTextDiv", function() {
                    $(this).css("zIndex", 12);
                })
                $("body").on("click", ".bottomBtn", function(e) {
                    e.stopPropagation();
                    var exTxt = $(this).closest(".exampleTextDiv").css("z-index", "");
                    exTxt.prependTo(exTxt.parent());
                })
                $("body").on("click", ".nodeDiv", function(e) {
                    var exTxt = $(this).closest(".synthUiDiv").find(".exampleTextDiv");
                    if (exTxt.length) {
                        exTxt.css("z-index", "");
                        exTxt.prependTo(exTxt.parent());
                    }
                })

                var instruments = activeInstrumentInstances[typeName];
                var synthUi = new SynthUi($(".tabBody[data-tab-id=" + tabId + "]"), $(".nodeMaker[data-tab-id=" + tabId + "]"), instruments);
                instrumentTypeEditors[typeName] = {
                    tabId: tabId,
                    synthUi: synthUi
                }
                refreshActiveTab();
            }
            return tabId;
        }

        function makeControls() {
            var openInstrumentMenu = makeMenu("Open Instrument", "menuItem mainMenuItem", null, {
                my: "left top",
                at: "right+6 top;",
            }).appendTo(mainMenu);
            instrumentIo.setupOpenMenu(openInstrumentMenu.find(".menuContent"), function(typeName) {
                openInstrumentEditor(typeName);
            });

            instrumentIo.refreshNames();
            var newInstrBtn = $("<span>").addClass("newInstrBtn menuItem  closeIt mainMenuItem").text("New Instrument").appendTo(mainMenu);
            newInstrBtn.on("click", function() {
                openInstrumentEditor();
            })
            $("<div>").addClass("menuItem  closeIt mainMenuItem importInstrument").text("Import Instrument").appendTo(mainMenu);
            $("body").on("click", ".exportInstrument", function() {
                var name = $(".tabHeader.active .tabLabel").text();
                var instrumentInstanceOfActiveType = activeInstrumentInstances[name][0];
                var serialized = instrumentInstanceOfActiveType.serialize();
                importExportManager.showExport(JSON.stringify([name, serialized]));
            })
            $("body").on("click", ".importInstrument", function() {
                importExportManager.showImport(function() {
                    var val = $("#importExportText").val();
                    val = JSON.parse(val);
                    try {
                        var name = val[0];
                        val = val[1];
                        instrumentIo.saveItem(name, val, true);
                        val = instrumentIo.getItem(name);
                        openInstrumentEditor(name, val, true);
                    } catch (err) {
                        alert("error, cannot import.")
                    }
                });
            })
            $("<div>").addClass("menuSpacer").appendTo(mainMenu);

        }
        makeControls();
        function getActiveTypeEditor() {
            var activeTabId = $(".tabHeader.active").attr("data-tab-id");
            var tabId;
            for (var key in instrumentTypeEditors) {
                tabId = instrumentTypeEditors[key].tabId;
                if (tabId === activeTabId) {
                    return instrumentTypeEditors[key];
                }
            }
        }
        function repaintActive() {
            var activeTypeEditor = getActiveTypeEditor();
            if (activeTypeEditor) {
                activeTypeEditor.synthUi.repaint();
                $("#musicSheetFooter").hide();
            }
        }
        return {
            openInstrumentEditor: openInstrumentEditor,
            newInstrumentInstance: newInstrumentInstance,
            repaintActive: repaintActive,
            getActive: getActiveTypeEditor,
            closeInstrumentInstance: closeInstrumentInstance,
            io: instrumentIo
        };
    }
    var instrumentManager = new InstrumentManager();
    var SheetMusicManager = function() {
        var musicIo = new Io("song");
        var openMusicSheets = {}
        var songFileMenuItemFunctions = function() {
            function close(songName) {
                var musicSheet = openMusicSheets[songName];
                tabManager.removeTab(tabContainer, musicSheet.tabId);
                musicSheet = musicSheet.musicSheet;
                for (var i = 0; i < musicSheet.instruments.length; i++) {
                    instrumentManager.closeInstrumentInstance(musicSheet.instruments[i]);
                }
                delete openMusicSheets[songName];
            }
            function deleteItem(songName) {
                var doIt = musicIo.deleteItem(songName, "");
                if (doIt) {
                    close(songName);
                    delete openMusicSheets[songName];
                }
            }
            function save(songName) {
                var serialized = openMusicSheets[songName].musicSheet.serialize(false, true);
                var savedName = musicIo.saveItem(songName, serialized);
                if (savedName) {
                    toast(savedName + " saved successfully.");
                } else {
                    toast(songName + " failed to save.");
                }
            }
            function saveAs(oldSongName) {
                var musicSheet = openMusicSheets[oldSongName];
                var serialized = musicSheet.musicSheet.serialize(false, true);
                var savedName = musicIo.saveAs(serialized);
                if (savedName) {
                    toast(savedName + " saved successfully.");
                    openMusicSheets[savedName] = musicSheet;
                    delete openMusicSheets[oldSongName];
                    return savedName;
                }
                return false;
            }
            return {
                close: close,
                delete: deleteItem,
                save: save,
                saveAs: saveAs
            }
        }();
        function fillInstrument(index, instrumentsArray) {
            console.log(instrumentsArray);
            var instrName = instrumentsArray[index];
            if (typeof instrName !== "string") {
                instrName = "TutorialEX_pluck";
            }
            instrName = instrName || "TutorialEX_pluck";
            instrumentsArray[index] = instrumentManager.newInstrumentInstance(instrName);
            //This needs work.  
        }
        function getInstrName(index, instrumentsArray) {
            var instrName;
            if (instrumentsArray[index] && instrumentsArray[index].name) {
                instrName = instrumentsArray[index].name;
            }
            if (typeof instrName !== "string") {
                instrName = "TutorialEX_pluck";
            }
            instrName = instrName || "TutorialEX_pluck";
            var savedInstrNames = instrumentManager.io.getNames();
            if (savedInstrNames.indexOf(instrName) === -1) {
                toast("Couldn't find " + instrName + ". Using default instrument instead");
                instrName = "TutorialEX_pluck";
                var key = "EX_pluck";
                ExampleInstruments[key].name = "Tutorial" + key;
                localStorage.setItem("instrument-Tutorial" + key, LZString.compressToUTF16(JSON.stringify(ExampleInstruments[key])));
            }
            return instrName;
        }
        function makeInstrumentAndControls(index, instrumentsArray, appendTo, musicSheet) {
            var name = musicSheet.getVoiceName(index);
            var el = appendTo;
            $("<div>").text(name).appendTo(el);

            //select
            var selectEl = $("<div>").appendTo(el);
            var select = $("<select>").appendTo(selectEl).attr("data-index", index);
            instrumentManager.io.setupOpenSelect(select, function(name, item, select) {
                var index = select.attr("data-index");
                var oldInstrument = instrumentsArray[index];
                if (oldInstrument instanceof Instrument) {
                    var curr = oldInstrument.getCurrent();
                    var now = oldInstrument.audioContext.currentTime;
                    if (curr.end) {
                        setTimeout(function() {
                            oldInstrument.kill()
                        }, (curr.end - now * 1000))
                    } else {
                        oldInstrument.kill()
                    }
                }
                instrumentsArray[index] = instrumentManager.newInstrumentInstance(name);
            });
            instrumentManager.io.refreshNames();
            //var instrLevel = instrumentsArray[index].level;
            var instrName = getInstrName(index, instrumentsArray);
            select.val(instrName);
            select.change();

            //levelRange
            var levelEl = $("<div>").appendTo(el);
            $("<span>").text("level").appendTo(levelEl);
            var levelRange = $("<input>").attr({
                type: "range",
                "data-index": index,
                max: 1,
                min: 0,
                step: 0.01
            }).appendTo(levelEl);
            levelRange[0].oninput = function() {
                var index = $(this).attr("data-index");
                instrumentsArray[index].setLevel($(this).val());
            }

            //edit
            var editEl = $("<button>")
                    .attr("data-index", index)
                    .text("Edit Instrument")
                    .appendTo(el)
                    .click(function() {
                        var index = $(this).attr("data-index");
                        var name = instrumentsArray[index].name;
                        instrumentManager.openInstrumentEditor(name);
                    });

        }
        function afterOpen(tabId, songName, sheetMusicObj, musicSheet) {
            musicIo.saveItem(songName, sheetMusicObj);
            openMusicSheets[songName] = {
                tabId: tabId,
                musicSheet: musicSheet
            }
            refreshActiveTab();

            var menuContent = $(".tabHeader[data-tab-id=" + tabId + "]").find(".menuContent");
            
            addFileMenuItems(menuContent, songName, "MusicSheet", songFileMenuItemFunctions);
            $("<div>").text("Export MusicSheet").addClass("exportSong menuItem closeIt").appendTo(menuContent);
                
            $("<div>").addClass("menuSpacer").appendTo(menuContent);

            //tempo control
            var defaultTempo = 160;
            var tempoDiv = $("<div>").addClass("menuItem").appendTo(menuContent);
            $("<span>").text("tempo ").appendTo(tempoDiv);
            var tempoRange = $("<input>").attr({
                type: "range",
                min: 10,
                max: 1000,
                step: 1
            }).val(defaultTempo).appendTo(tempoDiv);
            $("<span>").text(defaultTempo).appendTo(tempoDiv);
            tempoRange[0].oninput = function() {
                var value = $(this).val();
                $(this).next().text(value);
                musicSheet.controls.setTempo(value);
            }
            musicSheet.controls.setTempo(defaultTempo);

            //instrumentControls;
            var instruments = musicSheet.instruments;
            for (var i = 0; i < instruments.length; i++) {
                //fillInstrument(i, instruments);
                $("<div>").addClass("menuSpacer").appendTo(menuContent);
                var appendTo = $("<div>").appendTo(menuContent).addClass("menuItem");
                makeInstrumentAndControls(i, instruments, appendTo, musicSheet);

            }
            console.log(musicSheet.instruments);
        }
        var NewSongControls = function() {
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
            reset();
            var makeNewSong = function() {
                var songName = $("#songNameInput").val();
                if(!songName){
                    alert("Please enter a name for your song.");
                    return;
                }
                var savedName = musicIo.saveItem(songName, {})
                if (!musicIo.saveItem(songName, {})) {
                    return;
                }
                var ts = $("#trebleInput").val();
                var as = $("#altoInput").val();
                var bs = $("#bassInput").val()
                var key = $("#keySelect").val();
                var tabId = newTab(songName);
                var musicSheet = new MusicSheet($(".tabBody[data-tab-id=" + tabId + "]"), audioContext);
                var sheetMusicObj = musicSheet.makeNewSong(ts, as, bs, key);
                $("#newSongOverlay").hide();
                afterOpen(tabId, songName, sheetMusicObj, musicSheet)
            }
            $("#newSong").click(openNewSongDialog);
            $("#newSongCancel").click(cancel);
            $("#newSongOk").click(makeNewSong);
            $("#newSongOverlay input, #newSongOverlay select").keydown(function(e) {
                if (e.which === 13) {
                    makeNewSong();
                }
            })
            return {openNewSongDialog: openNewSongDialog};
        }();
        function openMusicSheet(songName, sheetMusicObject, alreadyExpanded) {
            if (openMusicSheets[songName]) {  //editor already open
                var song = openMusicSheets[songName];
                tabManager.activate(tabContainer, song.tabId);
            } else {
                var tabId = newTab(songName);
                var musicSheet = new MusicSheet($(".tabBody[data-tab-id=" + tabId + "]"), audioContext);
                musicSheet.renderMusicSheetObj(sheetMusicObject, !alreadyExpanded);
                afterOpen(tabId, songName, sheetMusicObject, musicSheet)
            }
        }
        function getActiveMusicSheet() {
            var activeTabId = $(".tabHeader.active").attr("data-tab-id");
            var tabId;
            for (var key in openMusicSheets) {
                tabId = openMusicSheets[key].tabId;
                if (tabId === activeTabId) {
                    return openMusicSheets[key];
                }
            }
        }
        var repaintActive = function() {
            var activeMusicSheet = getActiveMusicSheet();
            if (activeMusicSheet) {
                activeMusicSheet.musicSheet.redraw();
                $("#musicSheetFooter").show();
            }
        }
        function makeControls() {
            var openSongMenu = makeMenu("Open MusicSheet", "menuItem mainMenuItem", null, {
                my: "left top",
                at: "right+6 top;",
            }).appendTo(mainMenu);
            musicIo.setupOpenMenu(openSongMenu.find(".menuContent"), function(songName, sheetMusicObject) {
                openMusicSheet(songName, sheetMusicObject);
            });
            musicIo.refreshNames();
            var newSongBtn = $("<span>").addClass("newSongBtn menuItem  closeIt mainMenuItem").text("New MusicSheet").appendTo(mainMenu);
            newSongBtn.on("click", function() {
                NewSongControls.openNewSongDialog();
            })

            function rescale() {
                var scale = $("#scaleRange").val();
                var spacing = $("#spacingRange").val();
                $("#scaleRange").next().text(scale);
                $("#spacingRange").next().text(spacing);
                MusicSheet.makeDynamicStyle(scale, spacing);
                repaintActive();
            }
            rescale();
            $("#scaleRange,#spacingRange").on("change input", rescale)
            $("#musicSheetMainControls").on("click", ".buttonMimic", function() {
                var activeMusicSheet = getActiveMusicSheet();
                if (activeMusicSheet) {
                    var id = this.id;
                    if (activeMusicSheet.musicSheet.controls[id]) {
                        activeMusicSheet = activeMusicSheet.musicSheet.controls[id]();
                    }
                }
            })
            $("body").on("click",".exportSong", function() {
                var activeMusicSheet = getActiveMusicSheet();
                var name = $(".tabHeader.active .tabLabel").text();
                var serialized = activeMusicSheet.musicSheet.serialize();
                importExportManager.showExport(JSON.stringify([name, serialized]));
            })
            $("<div>").text("Import Song").addClass("importSong menuItem  closeIt mainMenuItem").appendTo(mainMenu);
            $("body").on("click",".importSong", function() {
                importExportManager.showImport(function() {
                    var val = $("#importExportText").val();
                    val = JSON.parse(val);
                    try {
                        var name = val[0];
                        val = val[1];
                        musicIo.saveItem(name, val, true);
                        val = musicIo.getItem(name);
                        openMusicSheet(name, val, true);
                    } catch (err) {
                        alert("error, cannot import.")
                    }
                });
            })

        }

        makeControls();
        return {
            repaintActive: repaintActive,
            getActive: getActiveMusicSheet,
            close: songFileMenuItemFunctions.close,
            open: openMusicSheet
        }
    }
    var sheetMusicManager = new SheetMusicManager();
    var ImportExportManager = function() {
        function close() {
            var ov = $("#importExportOverlay")
            ov.hide();
        }
        function setup(isExport) {
            var ov = $("#importExportOverlay")
            var di = $("#importExportDialog")
            ov.show();
            ov.find(".export").toggle(isExport);
            ov.find(".import").toggle(!isExport);
            di.click(function(e) {
                //e.stopPropagation();
            });
            $("#importExportOverlay").click(function(e){
                if(e.target===this){
                    close();
                }
            });
        }
        function showExport(text) {
            setup(true);
            var ta = $("#importExportText");
            ta.val(text);
            ta.focus();
            ta.select();
            $("#exportOk").on("click", close);
        }
        function showImport(onImport) {
            setup(false);
            var ta = $("#importExportText");
            ta.val("");
            ta.focus();
            var ib = $("#importBtn");
            ib.off();
            ib.on("click", function() {
                onImport();
                close();
            })
        }
        ;
        return {
            showExport: showExport,
            showImport: showImport
        }
    }
    var importExportManager = new ImportExportManager();
    function refreshActiveTab() {
        instrumentManager.repaintActive();
        sheetMusicManager.repaintActive();
    }
    function makeControls() {
        tabManager.afterActivation = {};
        tabManager.afterActivation[tabContainer[0]] = refreshActiveTab;
        window.onresize = function() {
            refreshActiveTab();
        }
        var msTutBtn = $("<div>").addClass("menuItem closeIt mainMenuItem msTutBtn").text("MusicSheet Tutorial").appendTo(mainMenu);
        function tutorialStart(){
            var blank = ["--Tutorial--",[{"name":"t1","clef":"treble","bars":[{"key":"C","notes":[]}],"instrument":{"name":"TutorialEX_pluck","level":1}},{"name":"t2","clef":"treble","bars":[{"key":"C","notes":[]}],"instrument":{"name":"TutorialEX_pluck","level":1}},{"name":"b1","clef":"bass","bars":[{"key":"C","notes":[]}],"instrument":{"name":"TutorialEX_pluck","level":1}},{"name":"b2","clef":"bass","bars":[{"key":"C","notes":[]}],"instrument":{"name":"TutorialEX_pluck","level":1}}]];
            console.log(sheetMusicManager);
            sheetMusicManager.open(blank[0], blank[1], true);
        }
        function tutorialEnd(){
            sheetMusicManager.close("--Tutorial--");
        }
        new TutorialEngine(SheetMusicTutorial, msTutBtn, tutorialStart, tutorialEnd);
        $("body").on("keydown", function(e) {
            if (e.which === 32) { //spacebar
                var activeMusicSheet = sheetMusicManager.getActive();
                if (activeMusicSheet) {
                    activeMusicSheet = activeMusicSheet.musicSheet.controls.toggle();
                } else {
                    var activeTypeEditor = instrumentManager.getActive();
                    if (activeTypeEditor && !activeTypeEditor.synthUi.playControls.isPlaying) {
                        activeTypeEditor.synthUi.playControls.isPlaying = true;
                        activeTypeEditor.synthUi.playControls.playDuration(0);
                    }
                }
            }
        })
        $("body").on("keyup", function(e) {
            if (e.which === 32) { //spacebar
                var activeTypeEditor = instrumentManager.getActive();
                if (activeTypeEditor) {
                    activeTypeEditor.synthUi.playControls.isPlaying = false;
                    activeTypeEditor.synthUi.playControls.stop(0);
                }
            }
        })
        $("body").on("click", ".closeIt", function(){
            $(".menuOverlay").click();
        })
    }
    makeControls();

    tabManager.tooltipSetup();
//return {openMusicSheet: openMusicSheet}
}
$(function() {
    window.newMS = new Manager().openMusicSheet;
})


/*
 * Things I still need to do: 
 * Include ties.  DoubleClick to tie to next note. 
 *    if(lastNoteInBar && firstNoteNextBar is same pitch).
 *    Break tie if either changes pitch, a note is added between them.
 */