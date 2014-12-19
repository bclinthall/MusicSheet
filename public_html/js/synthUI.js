function SynthUI(synthUIDiv) {
    var instrumentInfo = {};
    var Plumbing = new function() {
        function addSourceEndpoint(fillStyle, left, name, toId) {
            var stub = [Math.floor(Math.random() * 8 + 2) * 2, Math.floor(Math.random() * 8 + 2) * 2];
            var endPoint = {
                uuid: toId + "_" + name,
                endpoint: "Dot",
                anchor: [left, 0, 0, -1],
                paintStyle: {fillStyle: fillStyle, radius: 11},
                isSource: true,
                maxConnections: -1,
                connector: ["Flowchart", {stub: stub, gap: 10, cornerRadius: 5, alwaysRespectStubs: false}],
                dragOptions: {},
                overlays: [
                    ["Label", {
                            location: [0.5, 1.5],
                            label: name,
                        }]
                ]
            }
            var out = jsPlumb.addEndpoint(toId, endPoint);
            out.setDragAllowedWhenFull(false);
        }
        function addTargetEndpoint(fillStyle, left, name, toId) {
            var endPoint = {
                uuid: toId + "_" + name,
                endpoint: "Dot",
                anchor: [left, 1, 0, 1],
                maxConnections: -1,
                paintStyle: {fillStyle: fillStyle, radius: 11},
                dropOptions: {hoverClass: "hover", activeClass: "active"},
                isTarget: true,
                overlays: [
                    ["Label", {location: [0.5, -0.5], label: name}]
                ]
            }
            jsPlumb.addEndpoint(toId, endPoint);
        }

        var plumbCarrier = function(toId) {
            addSourceEndpoint("gray", .5, "out", toId);
            addTargetEndpoint("gray", .5, "frequency", toId);
            jsPlumb.draggable($("#" + toId), {grid: [20, 20]});
        }
        var plumbModulator = function(toId) {
            addSourceEndpoint("gray", .33, "out", toId);
            addTargetEndpoint("gray", .33, "frequency", toId);
            addSourceEndpoint("orange", .67, "betaOut", toId);
            addTargetEndpoint("orange", .67, "betaGain", toId);
            jsPlumb.draggable($("#" + toId), {grid: [20, 20]});
        }
        var plumbGeneric = function(toId, fillColor) {
            addSourceEndpoint(fillColor, .5, "out", toId);
            addTargetEndpoint("gray", .5, "in", toId);
            jsPlumb.draggable($("#" + toId), {grid: [20, 20]});
        }
        var plumbGain = function(toId, fillColor) {
            addSourceEndpoint(fillColor, .5, "out", toId);
            addTargetEndpoint("gray", .2, "in", toId);
            addTargetEndpoint(fillColor, .8, "gainIn", toId);
            jsPlumb.draggable($("#" + toId), {grid: [20, 20]});
        }
        $("<div>").attr("id", "audioContext").text("audioContext").appendTo(synthUIDiv);
        addTargetEndpoint("gray", .5, "destination", "audioContext");

        //jsPlumb.makeTarget("destination", destEndpoint);
        return {plumbCarrier: plumbCarrier, plumbModulator: plumbModulator, plumbGeneric: plumbGeneric, plumbGain: plumbGain}
    };
    var Controls = (function() {
        var appendInput = function(uuid, div, label, useClass, hint) {
            var inputDiv = $("<div>").appendTo(div).addClass(useClass).addClass("inputDiv");
            if (hint) {
                inputDiv.attr("data-hint", hint);
            }
            $("<label>").text(label).attr("for", uuid + "_" + label).appendTo(inputDiv);
            $("<input>").attr({id: uuid + "_" + label, "data-inputfor": useClass}).appendTo(inputDiv);
            return inputDiv;
        }
        var addPitchControls = function(div) {
            var pitchDiv = $("<div>").addClass("controlsDiv pitchControls").appendTo(div);
            $("<div>").addClass("controlsHeader").text("Pitch Controls").appendTo(pitchDiv);
            var pitchModeSelect = $("<select>").addClass("pitchModeSelect").attr("data-selectfor", "pitchMode").appendTo(pitchDiv);
            $("<option>")
                    .val("detune")
                    .text("Detune from Note Pitch")
                    .attr("data-hint", "Take the frequency of the note and optionally add or subtract semitones.")
                    .appendTo(pitchModeSelect);
            $("<option>")
                    .val("frequency")
                    .text("Independent Frequency")
                    .attr("data-hint", "Choose a frequency for the oscillator independent of the note pitch.")
                    .appendTo(pitchModeSelect);
            $("<option>")
                    .val("ratio")
                    .text("Ratio of Note Pitch")
                    .attr("data-hint", "Take the frequency of the note and multiply it by a number.")
                    .appendTo(pitchModeSelect);
            var uuid = div.attr("id");
            appendInput(uuid, pitchDiv, "detune", "detune", "Number of semitones to alter note pitch.  Examples: 0, 12.19, 5, -5");
            appendInput(uuid, pitchDiv, "frequency", "frequency", "Frequency to use for this oscillator in Hz.").hide();
            appendInput(uuid, pitchDiv, "ratio", "ratio", "Ratio to note pitch.  Examples: 1, 4, 2/5, 1.618").hide();
            pitchModeSelect.on("change", function() {
                pitchDiv.find(".inputDiv").hide();
                var val = $(this).find("option:selected").val();
                pitchDiv.find(".inputDiv." + val).show();
            })
        }
        var addWaveformControls = function(div) {
            var waveDiv = $("<div>").addClass("controlsDiv").appendTo(div);
            $("<span>").text("type").appendTo(waveDiv);
            var select = $("<select>").attr("data-selectfor", "waveType").appendTo(waveDiv);
            var appendOption = function(type) {
                $("<option>")
                        .val(type)
                        .text(type)
                        .appendTo(select);
            }
            appendOption("sine");
            appendOption("square");
            appendOption("sawtooth");
            appendOption("triangle");
        }
        var addBetaControls = function(div) {
            var uuid = div.attr("id");
            appendInput(uuid, div, "beta", "beta", "controls the amount of modulation");

        }
        var addDeleteControls = function(div) {
            var deleteDuplicateDiv = $("<div>").addClass("controlsDiv").appendTo(div);
            $("<button>").addClass("delete").text("Delete").appendTo(deleteDuplicateDiv).click(function() {
                jsPlumb.remove(div);
            })
            $("<button>").addClass("duplicate").text("Duplicate").appendTo(deleteDuplicateDiv).click(function() {
                var nodeType = div.attr("data-nodeType");
                var newNode = addNodeEl[nodeType]();
                div.find("input").each(function(index, input) {
                    input = $(input);
                    var inputFor = input.attr("data-inputFor");
                    newNode.find("[data-inputFor=" + inputFor + "]").val(input.val());
                })
                div.find("select").each(function(index, select) {
                    select = $(select);
                    var selectFor = select.attr("data-selectFor");
                    var newSelect = newNode.find("[data-selectFor=" + selectFor + "]");
                    newSelect[0].selectedIndex = select[0].selectedIndex;
                    newSelect.change();
                })
            })

        }
        var makeId = function() {
            return Math.random().toString(32).substr(2);
        }
        var randPos = function() {
            return Math.floor(Math.random() * 20 + 10);
        }
        var addNodeEl = {
            Carrier: function(id) {
                if (typeof id !== 'string') {
                    id = makeId()
                }
                var car = $("<div>")
                        .addClass("plumbNode")
                        .attr({
                            id: id,
                            "data-nodetype": "Carrier"
                        })
                        .css({
                            top: randPos(),
                            left: randPos()
                        });
                addPitchControls(car);
                addWaveformControls(car);
                addDeleteControls(car);
                car.appendTo(synthUIDiv);
                Plumbing.plumbCarrier(id);
                return car;
            },
            Modulator: function(id) {
                //inputs: amplitude, frequency
                //outputs: raw out, beta out
                if (typeof id !== 'string') {
                    id = makeId()
                }
                var mod = $("<div>")
                        .addClass("plumbNode")
                        .attr({
                            id: id,
                            "data-nodetype": "Modulator"
                        })
                        .css({
                            top: randPos(),
                            left: randPos()
                        });
                addPitchControls(mod);
                addWaveformControls(mod);
                addBetaControls(mod);
                addDeleteControls(mod);
                mod.appendTo(synthUIDiv);
                Plumbing.plumbModulator(id);
                return mod;
            },
            Envelope: function(id) {
                if (typeof id !== 'string') {
                    id = makeId()
                }
                var env = $("<div>")
                        .addClass("plumbNode")
                        .attr({
                            id: id,
                            "data-nodetype": "Envelope"
                        })
                        .css({
                            top: randPos(),
                            left: randPos()
                        });
                appendInput(id, env, "Attack Duration", "attackDuration", "How long the attack phase lasts in seconds.");
                appendInput(id, env, "Attack Level", "attackLevel", "How loud the sound gets in the attack phase.  1 is the default.");
                appendInput(id, env, "Decay Duration", "decayDuration", "How long the decay phase lasts in seconds.");
                appendInput(id, env, "Sustain Level", "sustainLevel", "The volume to which the sound decays.  1 is the default.");
                appendInput(id, env, "Release Duration", "releaseDuration", "How long the releasePhase phase lasts in seconds.");
                addDeleteControls(env);
                env.appendTo(synthUIDiv);
                Plumbing.plumbGeneric(id, "green");
                return env;
            },
            Beta: function(id) {
                if (typeof id !== 'string') {
                    id = makeId()
                }
                var beta = $("<div>")
                        .addClass("plumbNode")
                        .attr({
                            id: id,
                            "data-nodetype": "Beta"
                        })
                        .css({
                            top: randPos(),
                            left: randPos()
                        });
                addBetaControls(beta);
                addDeleteControls(beta);
                beta.appendTo(synthUIDiv);
                Plumbing.plumbGain(id, "orange");
                return beta;
            }
        }



        $("#addCarrier").click(addNodeEl.Carrier);
        $("#addModulator").click(addNodeEl.Modulator);
        $("#addEnvelope").click(addNodeEl.Envelope);
        $("#addBeta").click(addNodeEl.Beta);

        return {addNodeEl: addNodeEl}
    })();
    function updateInstrumentInfo() {
        synthUIDiv.find(".plumbNode").each(function(index, plumbNode) {
            plumbNode = $(plumbNode);
            var node = instrumentInfo[plumbNode.attr("id")];
            if (!node) {
                var node = {};
                instrumentInfo[plumbNode.attr("id")] = node;
            }
            node.connections = {};
            node.type = plumbNode.attr("data-nodetype");
            node.top = plumbNode.css("top");
            node.left = plumbNode.css("left");
            plumbNode.find("input").each(function(index, input) {
                input = $(input);
                node[input.attr("data-inputFor")] = parseFloat(input.val());
            })
            plumbNode.find("select").each(function(index, select) {
                select = $(select);
                node[select.attr("data-selectFor")] = select.find("option:selected").val();
            });

        })
        for (var id in instrumentInfo) {
            var node = synthUIDiv.find("#" + id);
            if (node.length === 0 && id !== "update") {
                delete instrumentInfo[id];
            }
        }
        var connections = jsPlumb.getAllConnections();
        for (var i = 0; i < connections.length; i++) {
            var ends = connections[i].endpoints;
            var source = ends[0].getUuid();
            var dest = ends[1].getUuid();
            source = source.split("_");
            if (!instrumentInfo[source[0]].connections[source[1]]) {
                instrumentInfo[source[0]].connections[source[1]] = [];
            }
            instrumentInfo[source[0]].connections[source[1]].push(dest);
        }
        return instrumentInfo;
    }
    function newInstrument() {
        synthUIDiv.find(".plumbNode").each(function(index, nodeEl) {
            jsPlumb.remove(nodeEl);
        })
        updateInstrumentInfo();
    }
    ;
    function loadSave(obj) {
        newInstrument();
        jsPlumb.setSuspendDrawing(true, false);
        console.log(obj);
        for (var id in obj) {
            var nodeInfo = obj[id];
            var nodeType = nodeInfo.type;
            var newNode = Controls.addNodeEl[nodeType](id);
            newNode.find("input").each(function(index, input) {
                input = $(input);
                var inputFor = input.attr("data-inputFor");
                input.val(nodeInfo[inputFor]);
            })
            newNode.find("select").each(function(index, select) {
                select = $(select);
                var selectFor = select.attr("data-selectFor");
                select.val(nodeInfo[selectFor]);
                select.change();
            })
            newNode.css("top", nodeInfo.top);
            newNode.css("left", nodeInfo.left);

        }
        for (var id in obj) {
            var connections = obj[id].connections;
            for (var endpoint in connections) {
                var sourceUUID = id + "_" + endpoint;
                var targets = connections[endpoint];
                for (var i = 0; i < targets.length; i++) {
                    var targetUUID = targets[i];
                    jsPlumb.connect({uuids: [sourceUUID, targetUUID]});
                }
            }
        }
        updateInstrumentInfo();
        jsPlumb.setSuspendDrawing(false, true);

    }
    instrumentInfo.update = updateInstrumentInfo;
    return {updateInstrumentInfo: updateInstrumentInfo, instrumentInfo: instrumentInfo, loadSave: loadSave, newInstrument: newInstrument};
}
function Instrument(audioContext, instrumentInfo, dynamic) {
    var _this = this;
    var nodes = {};
    this.audioContext = audioContext;
    var outGain = audioContext.createGain();
    outGain.gain.value = 0;
    outGain.connect(audioContext.destination);
    var Node = {
        Carrier: function(params) {
            var car = audioContext.createOscillator();
            car.start(0);
            this.setFrequency = function(freq) {
                if (params.pitchMode === "detune") {
                    car.frequency.value = freq * Math.pow(2, params.detune / 12);
                } else if (params.pitchMode === "frequency") {
                    car.frequency.value = params.frequency;
                } else if (params.pitchMode === "ratio") {
                    car.frequency.value = freq * params.ratio;
                }
                car.type = params.waveType;
            }
            this.disconnect = function() {
                car.disconnect();
            }
            this.kill = function() {
                car.stop();
                car.disconnect();
            }
            this.out = car;
            this.frequency = car.frequency;
        },
        Modulator: function(params) {
            var mod = new Node.Carrier(params);
            var beta = new Node.Beta(params);
            mod.out.connect(beta.in);
            this.setFrequency = function(freq) {
                mod.setFrequency(freq);
                beta.setFrequency(freq);
            }
            this.disconnect = function() {
                mod.disconnect();
                beta.disconnect();
                mod.out.connect(beta.in);
            }
            this.kill = function() {
                mod.kill();
                beta.kill();
            }
            this.out = mod.out;
            this.frequency = mod.frequency;
            this.betaOut = beta.out;
            this.betaGain = beta.gainIn;
        },
        Envelope: function(params) {
            var envGain = audioContext.createGain();
            var releaseGain = audioContext.createGain();
            envGain.connect(releaseGain);
            this.play = function(start, stop) {
                envGain.gain.setValueAtTime(0, start);
                envGain.gain.linearRampToValueAtTime(params.attackLevel, start + params.attackDuration);
                envGain.gain.setTargetAtTime(params.sustainLevel, start + params.attackDuration, params.decayDuration);
                envGain.gain.setValueAtTime(0, stop);

                var releaseAt = stop - params.releaseDuration;
                releaseGain.gain.setValueAtTime(1, start);
                releaseGain.gain.setValueAtTime(1, releaseAt);
                releaseGain.gain.linearRampToValueAtTime(0, stop);
            }
            this.disconnect = function() {
                envGain.disconnect();
                releaseGain.disconnect();
                envGain.connect(releaseGain);
            }
            this.kill = function() {
                envGain.disconnect();
                releaseGain.disconnect();
            }
            this.in = envGain;
            this.out = releaseGain;
        },
        Beta: function(params) {
            var beta = audioContext.createGain();
            this.setFrequency = function(freq) {
                beta.gain.value = freq * params.beta;
            }
            this.disconnect = function() {
                beta.disconnect();
            }
            this.kill = function() {
                beta.disconnect();
            }
            this.out = beta;
            this.in = beta;
            this.gainIn = beta.gain;
        }

    }
    function makeNode(params) {
        return new Node[params.type](params);
    }
    function updateNodes() {
        if (!nodes.audioContext) {
            nodes.audioContext = {
                destination: outGain
            }
        }
        for (var key in nodes) {
            if (key !== "audioContext") {
                nodes[key].disconnect();
                if (!instrumentInfo[key]) {
                    nodes[key].kill();
                    delete nodes[key];
                }
            }
        }
        for (var key in instrumentInfo) {
            if (!nodes[key] && instrumentInfo[key].type) {
                nodes[key] = makeNode(instrumentInfo[key]);
            }
        }
        for (var key in instrumentInfo) {
            var node = nodes[key];
            var connections = instrumentInfo[key].connections;
            for (var connectionPoint in connections) {
                for (var i = 0; i < connections[connectionPoint].length; i++) {
                    var dest = connections[connectionPoint][i].split("_");
                    node[connectionPoint].connect(nodes[dest[0]][dest[1]]);
                }
            }
        }
    }
    updateNodes();
    this.play = function(freq, start, stop, level) {
        if (dynamic) {
            instrumentInfo.update();
            updateNodes();
        }
        for (var key in nodes) {
            var node = nodes[key];
            if (node.setFrequency) {
                node.setFrequency(freq);
            }
            if (node.play) {
                node.play(start, stop);
            }
        }
        outGain.gain.setValueAtTime(level, start);
        outGain.gain.setValueAtTime(0, stop);
    }
}


function Io(ioDiv, type, getJSONForSave, onLoad, onNewItem) {
    var getNames = function(whatKind) {
        var names = [];
        var regExp = new RegExp("^" + whatKind + "-");
        for (var i = 0; i < localStorage.length; i++) {
            var key = localStorage.key(i);
            if (regExp.test(key)) {
                names.push(key.replace(regExp, ""));
            }
        }
        return names;
    }
    var getItem = function(whatKind, name) {
        return JSON.parse(localStorage.getItem(whatKind + "-" + name));
    }
    var saveItem = function(whatKind, name, json) {
        name = whatKind + "-" + name;
        localStorage.setItem(name, json);
    }
    var deleteItem = function(whatKind, name) {
        localStorage.removeItem(whatKind + "-" + name);
    }
    function save() {
        var json = getJSONForSave();
        var name = ioDiv.find(".save").attr("data-name");
        if (!name) {
            name = prompt("Name your " + type + ".");
        }
        if (!name)
            return;
        saveItem(type, name, json)
        ioDiv.find(".save").attr("data-name", name);
        refreshNames();
    }
    function saveAs() {
        var json = getJSONForSave();
        var name = prompt("Name your " + type + ".");
        saveItem(type, name, json)
        ioDiv.find(".save").attr("data-name", name);
    }
    function refreshNames() {
        var s = ioDiv.find(".select").empty();
        $("<option>").text("--").appendTo(s);
        var names = getNames(type);
        var curName = ioDiv.find(".save").attr("data-name");
        for (var i = 0; i < names.length; i++) {
            var opt = $("<option>").text(names[i]).appendTo(s);
            if (names[i] == curName) {
                opt.attr("selected", true);
            }
        }
    }
    $("<select>").addClass("select").appendTo(ioDiv).on("change", function() {
        if (ioDiv.find(".save").attr("data-name"))
            save();
        var name = $(this).find("option:selected").text();
        ioDiv.find(".save").attr("data-name", name);
        var sysObj = getItem(type, name);
        if (!sysObj) {
            alert("Couldn't find " + name);
            return;
        }
        if (sysObj) {
            onLoad(sysObj);
        }
    });
    $("<button>").text("Save " + type).addClass("save").appendTo(ioDiv).click(save);
    $("<button>").text("Save " + type + " as").addClass("saveAs").appendTo(ioDiv).click(saveAs);
    $("<button>").text("Delete " + type).addClass("ioDelete").appendTo(ioDiv).click(function() {
        var name = ioDiv.find(".save").attr("data-name");
        if (!name) {
            alert("Open a " + type + " to delete it.");
        } else {
            var response = confirm("Really delete " + name + "?  This can't be undone.");
            if (response) {
                deleteItem(type, name);
            }
        }
        refreshNames();
    });
    $("<button>").text("New " + type).addClass("new").appendTo(ioDiv).click(function() {
        onNewItem();
        ioDiv.find(".save").removeAttr("data-name");
        ioDiv.find(".select")[0].selectedIndex = 0
    });
    refreshNames();
}

