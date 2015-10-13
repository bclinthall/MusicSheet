function Manager() {
    var audioContext = new AudioContext();
    var tabManager = new TabManager();
    var instrumentIo = new Io("instrument");
    var tabContainer = $(".tabContainer.main");
    var toast = tabManager.toast;
    var makeMenu = tabManager.makeMenu;
    function newTab(label) {
        var tabId = tabManager.newTab(tabContainer, label);
        var tabHeader = $(".tabHeader[data-tab-id=" + tabId + "]");
        makeMenu().appendTo(tabHeader);
        return tabId;
    }


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
    function getNewInstrumentName() {
        return prompt("Please name your new instrument.");
    }
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
    function openInstrumentEditor(typeName) {
        if (instrumentTypeEditors[typeName]) {  //editor already open
            var editor = instrumentTypeEditors[typeName];
            tabManager.activate(tabContainer, editor.tabId);
        } else {
            var instrument = newInstrumentInstance(typeName, true);
            if (!instrument) {
                return;
            }
            typeName = instrument.name;
            var tabId = newTab(typeName);
            var settingsDiv = $(".tabHeader[data-tab-id=" + tabId + "]").find(".settingsDiv");
            $("<div>").addClass("nodeMaker").attr("data-tab-id", tabId).appendTo(settingsDiv);
            $("<div>").addClass("menuSpacer").appendTo(settingsDiv);
            $("<div>")
                    .addClass("saveInstrumentBtn menuItem")
                    .text("Save Instrument")
                    .attr({
                        "data-instrname": typeName
                    }).appendTo(settingsDiv).click(function() {
                var name = $(this).attr("data-instrname");
                saveInstrumentType(name);
            });
            $("<div>")
                    .addClass("saveInstrumentAsBtn menuItem")
                    .text("Save Instrument As...")
                    .attr({
                        "data-instrname": typeName
                    }).appendTo(settingsDiv).click(function() {
                var name = $(this).attr("data-instrname");
                var savedName = saveInstrumentTypeAs(name);
                if (savedName) {
                    var tabHeader = $(this).closest(".tabHeader");
                    tabHeader.find(".tabLabel").text(savedName);
                    tabHeader.find("[data-instrName]").attr("data-instrName", savedName);
                }
            });
            $("<div>")
                    .addClass("closeInstrumentEditorBtn menuItem")
                    .text("Close")
                    .attr({
                        "data-instrname": typeName
                    }).appendTo(settingsDiv).click(function() {
                var name = $(this).attr("data-instrname");
                closeInstrumentEditor(name);
            });
            $("<div>")
                    .addClass("deleteInstrumentType menuItem")
                    .text("Delete Instrument")
                    .attr({
                        "data-instrname": typeName
                    }).appendTo(settingsDiv).click(function() {
                var name = $(this).attr("data-instrname");
                deleteInstrumentType(name);
            });
            $("<div>")
                    .addClass("debugInstrument menuItem")
                    .text("Debug Instrument")
                    .attr({
                        "data-instrname": typeName
                    }).appendTo(settingsDiv).click(function() {
                var name = $(this).attr("data-instrname");
                var inst = activeInstrumentInstances[name][0].serialize();
                //inst.tutorial = name;
                console.log(JSON.stringify(inst, null, 4));

            });
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
        }
        var instruments = activeInstrumentInstances[typeName];
        var synthUi = new SynthUi($(".tabBody[data-tab-id=" + tabId + "]"), $(".nodeMaker[data-tab-id=" + tabId + "]"), instruments);
        instrumentTypeEditors[typeName] = {
            tabId: tabId,
            synthUi: synthUi
        }
        return tabId
    }

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

    function makeControls() {
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
        $(window).resize(function() {
            getActiveTypeEditor().synthUi.repaint();
        })
        tabManager.afterActivation = {};
        tabManager.afterActivation[$(".tabContainer")[0]] = function() {
            getActiveTypeEditor().synthUi.repaint();
        }
        var tabHeaderControls = $(".headerBarControls");
        makeMenu("Open Instrument").appendTo(tabHeaderControls);
        var settingsDiv = tabHeaderControls.find(".settingsDiv");
        instrumentIo.setupOpenMenu(settingsDiv, function(typeName) {
            openInstrumentEditor(typeName);
        });

        instrumentIo.refreshNames();
        //new instrument btn
        var newInstrBtn = $("<span>").addClass("newInstrBtn buttonMimic").text("New Instrument").appendTo(tabHeaderControls);
        newInstrBtn.on("click", function() {
            openInstrumentEditor();
        })


    }
    makeControls();

    tabManager.tooltipSetup();
}
$(function() {
    new Manager();
})