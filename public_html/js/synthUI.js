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
        var plumbFilter = function(toId) {
            addSourceEndpoint(fillColor, .5, "out", toId);
            addTargetEndpoint("gray", .0, "in", toId);
            addTargetEndpoint("gray", .3, "frequency", toId);
            addTargetEndpoint("gray", .6, "Q", toId);
            addTargetEndpoint("gray", .9, "gain", toId);

        }
        var destDiv = $("<div>").attr("id", "audioContext").text("audioContext").appendTo(synthUIDiv);
        addTargetEndpoint("gray", .5, "destination", "audioContext");

        return {plumbCarrier: plumbCarrier, plumbModulator: plumbModulator, plumbGeneric: plumbGeneric, plumbGain: plumbGain}
    };

    var inputDivValue = function(inputDiv, value) {
        if (value === 0.005) {
            value = value;
        }
        if (isNaN(value)) {
            var whole = inputDiv.find(".wholeInput").val();
            whole = whole || "0";
            var partial = inputDiv.find(".partialInput").val();
            partial = partial || "0";
            return parseFloat(whole + "." + partial);
        } else {
            value = value.toString().split(".");
            var whole = value[0];
            var partial;
            if (value.length > 1) {
                partial = value[1];
            } else {
                partial = 0;
            }
            inputDiv.find(".wholeInput").val(whole);
            inputDiv.find(".partialInput").val(partial);

        }
    }
    var Controls = (function() {
        var appendInput = function(uuid, div, label, useClass, defaultVal, hint) {
            var inputDiv = $("<div>").appendTo(div).addClass(useClass).addClass("inputDiv").attr({id: uuid + "_" + label, "data-inputfor": useClass});
            if (hint) {
                inputDiv.attr("data-hint", hint);
            }
            $("<label>").text(label).attr("for", uuid + "_" + label).appendTo(inputDiv);
            $("<input>").addClass("wholeInput").attr({id: uuid + "_" + label, type: "number", step: 1}).appendTo(inputDiv);
            $("<span>").text(".").appendTo(inputDiv);
            $("<input>").addClass("partialInput").appendTo(inputDiv);
            inputDivValue(inputDiv, defaultVal);
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
            appendInput(uuid, pitchDiv, "detune", "detune", 0, "Number of semitones to alter note pitch.  Examples: 0, 12.19, 5, -5");
            appendInput(uuid, pitchDiv, "frequency", "frequency", 5, "Frequency to use for this oscillator in Hz.").hide();
            appendInput(uuid, pitchDiv, "ratio", "ratio", 1, "Ratio to note pitch.  Examples: 1, 4, 2/5, 1.618").hide();
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
            appendInput(uuid, div, "beta", "beta", 1, "controls the amount of modulation");

        }
        var addDeleteControls = function(div) {
            var deleteDuplicateDiv = $("<div>").addClass("controlsDiv").appendTo(div);
            $("<button>").addClass("delete").text("Delete").appendTo(deleteDuplicateDiv).click(function() {
                jsPlumb.remove(div);
            })
            $("<button>").addClass("duplicate").text("Duplicate").appendTo(deleteDuplicateDiv).click(function() {
                var nodeType = div.attr("data-nodeType");
                var newNode = addNodeEl[nodeType]();
                div.find(".inputDiv").each(function(index, inputDiv) {
                    inputDiv = $(inputDiv);
                    var inputFor = inputDiv.attr("data-inputFor");
                    var value = inputDivValue(inputDiv);
                    inputDivValue(newNode.find("[data-inputFor=" + inputFor + "]"), value);
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
                appendInput(id, env, "Attack Duration", "attackDuration", 0.005, "How long the attack phase lasts in seconds.");
                appendInput(id, env, "Attack Level", "attackLevel", 1, "How loud the sound gets in the attack phase.  1 is the default.");
                appendInput(id, env, "Decay Duration", "decayDuration", 0, "How long the decay phase lasts in seconds.");
                appendInput(id, env, "Sustain Level", "sustainLevel", 1, "The volume to which the sound decays.  1 is the default.");
                appendInput(id, env, "Release Duration", "releaseDuration", 0.1, "How long the releasePhase phase lasts in seconds.");
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
            },
            Biquad: function(id) {
                if (typeof id !== 'string') {
                    id = makeId()
                }
                var biquad = $("<div>")
                        .addClass("plumbNode")
                        .attr({
                            id: id,
                            "data-nodetype": "Biquad"
                        })
                        .css({
                            top: randPos(),
                            left: randPos()
                        })
                        .appendTo(synthUIDiv);
                var select = $("<select>").attr("data-selectfor", "filterType").appendTo(biquad);
                var appendOption = function(type) {
                    $("<option>")
                            .val(type)
                            .text(type)
                            .appendTo(select);
                }
                var types = ["lowpass", "highpass", "bandpass", "lowshelf", "highshelf", "peaking", "notch", "allpass"];
                for (var i = 0; i < types.length; i++) {
                    appendOption(types[i]);
                }
                addPitchControls(biquad);
                appendInput(id, biquad, "Q", "q", 1, "A double representing a Q factor, or quality factor. See http://en.wikipedia.org/wiki/Q_factor");
                appendInput(id, biquad, "Gain", "gain", 1, "A double representing the gain used in the current filtering algorithm.");
                Plumbing.plumbGeneric(id, "gray");



            },
            Visualizer: function(id) {
                if (typeof id !== 'string') {
                    id = makeId()
                }
                var visualizer = $("<div>")
                        .addClass("plumbNode")
                        .attr({
                            id: id,
                            "data-nodetype": "Visualizer"
                        })
                        .css({
                            top: randPos(),
                            left: randPos()
                        });
                addDeleteControls(visualizer);
                visualizer.appendTo(synthUIDiv);
                Plumbing.plumbGeneric(id, "purple");
                return visualizer;
            }
        }



        $("#addCarrier").click(addNodeEl.Carrier);
        $("#addModulator").click(addNodeEl.Modulator);
        $("#addEnvelope").click(addNodeEl.Envelope);
        $("#addBeta").click(addNodeEl.Beta);
        $("#addBiquad").click(addNodeEl.Biquad);
        $("#addVisualizer").click(addNodeEl.Visualizer);

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
            plumbNode.find(".inputDiv").each(function(index, inputDiv) {
                inputDiv = $(inputDiv);
                node[inputDiv.attr("data-inputFor")] = inputDivValue(inputDiv);
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
        });
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
            newNode.find("input").each(function(index, inputDiv) {
                inputDiv = $(inputDiv);
                var inputFor = inputDiv.attr("data-inputFor");
                inputDivValue(inputDiv, nodeInfo[inputFor]);
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

