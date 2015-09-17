function SynthUi(synthUiDiv) {
    var synthUi = this;
    synthUi.setInstrument = function(instrument) {
        $("#nodeMakerDiv").empty();
        for (var nodeType in instrument.nodeTypes) {
            $("<div>")
                    .text("Add " + nodeType)
                    .addClass("menuItem")
                    .attr("data-nodetype", nodeType)
                    .appendTo("#nodeMakerDiv")
                    .click(function() {
                        addNode($(this).attr("data-nodetype"));
                    });
        }
        synthUiDiv.find(".nodeDiv").each(function(index, item) {
            jsPlumb.remove(item.id);
        });
        synthUi.instrument = instrument;
        for (var nodeId in instrument.nodes) {
            makeNodeUi(instrument.nodes[nodeId]);
        }
        for (var nodeId in instrument.nodes) {
            Plumbing.connectNode(instrument.nodes[nodeId]);
        }
    }
    function updateNodePosition(nodeId) {
        synthUi.instrument.nodes[nodeId].top = parseInt($("#" + nodeId).css("top"));
        synthUi.instrument.nodes[nodeId].left = parseInt($("#" + nodeId).css("left"));
    }
    function addNode(type, serializedParams) {
        var node = synthUi.instrument.addNode(type, serializedParams);
        makeNodeUi(node);
        updateNodePosition(node.id);
    }
    function duplicateNode(nodeDiv) {
        var nodeId = nodeDiv.attr("id");
        console.log(synthUi.instrument.nodes[nodeId]);
        var node = synthUi.instrument.nodes[nodeId];
        var serializedParams = node.params.serialize();
        console.log(serializedParams);
        addNode(node.type, serializedParams);
    }
    function deleteNode(nodeDiv) {
        var nodeId = nodeDiv.attr("id");
        synthUi.instrument.deleteNode(nodeId);
        jsPlumb.remove(nodeId);
    }
    function makeNodeUi(node) {
        node.top = node.top || Math.floor(Math.random() * 20 + 10);
        node.left = node.left || Math.floor(Math.random() * 20 + 10);
        var nodeDiv = $("<div>").addClass("nodeDiv").attr({
            id: node.id,
        }).appendTo(synthUiDiv);
        nodeDiv.on("dragstart", function() {
            console.log(this);
        })
        var header = $("<div>").addClass("nodeTypeLabel").appendTo(nodeDiv);
        $("<span>").text(node.type).appendTo(header);
        $("<span>").addClass("contract fa fa-minus-square").appendTo(header).click(function(){
            $(this).parents(".nodeDiv").find(".paramsDiv").hide();
            jsPlumb.repaintEverything();
        });
        $("<span>").addClass("expand fa fa-plus-square").appendTo(header).click(function(){
            $(this).parents(".nodeDiv").find(".paramsDiv").show();
            jsPlumb.repaintEverything();
        });

        var paramsDiv = $("<div>").addClass("paramsDiv").appendTo(nodeDiv);
        var params = node.params;
        for (var paramName in params.paramTypes) {
            makeParamUi(paramName, params, node).appendTo(paramsDiv);
        }
        if (node.type !== "AudioContext") {
            nodeDiv.css({
                top: node.top + "px",
                left: node.left + "px"
            });
            var ddDiv = $("<div>").addClass("ddDiv").appendTo(paramsDiv);
            $("<button>").text("delete").addClass("delete").appendTo(ddDiv).click(function() {
                deleteNode($(this).parents(".nodeDiv"));
            })
            $("<button>").text("duplicate").addClass("duplicate").appendTo(ddDiv).click(function() {
                duplicateNode($(this).parents(".nodeDiv"));
            })
        }
        Plumbing.plumbNode(node);
    }
    function makeParamUi(paramName, params, node) {
        var type = params.paramTypes[paramName];
        var param = params.params[paramName];
        var paramDiv;
        if (type === "fp") {
            paramDiv = new FloatParamUi(paramName, param, node);
        } else {
            paramDiv = $("<div>");
            $("<label>").text(paramName).appendTo(paramDiv);
            if (type === "w" || type === "ft" || type === "v") {
                makeParamSelect(paramName, param, node, Params.selectOptions[type]).appendTo(paramDiv);
                if (type === "v") {
                    makeVisualizer(node).appendTo(paramDiv);
                }
            } else {
                makeParamInput(paramName, param, node, params, type).appendTo(paramDiv);
            }
        }
        paramDiv.find("label").attr("data-hint", params.hints[paramName]);
        return paramDiv;
    }
    function makeParamSelect(paramName, param, node, options) {
        var s = $("<select>");
        for (var i = 0; i < options.length; i++) {
            $("<option>").text(options[i]).val(options[i]).appendTo(s);
        }
        s.val(param);
        s.change(function() {
            node.params.params[paramName] = s.val();
            node.updateParams();
        })
        return s;
    }
    function makeParamInput(paramName, param, node, params, type) {
        var input = $("<input>");
        input.val(param);
        input.on("input", function() {
            if (type !== "n" || !isNaN(input.val())) {
                node.params.params[paramName] = parseFloat(input.val());
                node.updateParams();
            }
        });
        input.on("blur", function() {
            $(this).val(params.params[paramName]);
        })
        return input;
    }
    function makeVisualizer(node) {
        var div = $("<div>").addClass("visualizerCanvasDiv");
        var canvas = $("<canvas>")
                .addClass("visualizerCanvas")
                .attr({
                    id: "visualizerCanvas_" + node.id,
                    height: 100,
                    width: 300
                })
                .css({
                    height: 100,
                    width: 300
                })
                .appendTo(div);
        return div;
    }
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
                            location: [0.5, 0.5], //-0.5],
                            label: name,
                        }]
                ]
            }
            if(name==="mod. out"){
                console.log("mod. out")
                endPoint.scope = "frequency";
            }
            if(name !== "out"){
                endPoint.maxConnections = 1;
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
                    ["Label", {location: [0.5, 0.5], label: name}]
                ]
            }
            if(name === "frequency"){
                endPoint.scope = jsPlumb.getDefaultScope() + " frequency";
                console.log("frequency");
            }
            
            jsPlumb.addEndpoint(toId, endPoint);
        }
        function makeEndPosition(names, i) {
            var space = 1 / (names.length + 1);
            return space * (i + 1);
        }
        function plumbIns(node) {
            var inNames = [];
            for (var inName in node.ins) {
                inNames.push(inName);
            }
            if (inNames.length === 1) {
                addTargetEndpoint("gray", 0.5, inNames[0], node.id)
            } else {
                for (var i = 0; i < inNames.length; i++) {
                    addTargetEndpoint("gray", makeEndPosition(inNames, i), inNames[i], node.id)
                }
            }

        }
        function plumbOuts(node) {
            var outNames = [];
            for (var outName in node.outs) {
                outNames.push(outName);
            }
            if (outNames.length === 1) {
                addSourceEndpoint("gray", 0.5, outNames[0], node.id)
            } else {
                for (var i = 0; i < outNames.length; i++) {
                    addSourceEndpoint("gray", makeEndPosition(outNames, i), outNames[i], node.id)
                }

            }
        }
        function plumbNode(node) {
            plumbIns(node);
            plumbOuts(node);
            if (node.type !== "AudioContext") {
                jsPlumb.draggable($("#" + node.id), {
                    grid: [20, 20],
                    stop: function(params) {
                        var el = params.el;
                        var id = el.id;
                        var node = synthUi.instrument.nodes[id];
                        node.top = parseInt($(el).css("top"));
                        node.left = parseInt($(el).css("left"));
                    }
                });
            }
        }
        function connectNode(node) {
            var connections = node.connections;
            var id = node.id;
            for (var endpoint in connections) {
                var sourceUUID = id + "_" + endpoint;
                var targets = connections[endpoint];
                for (var i = 0; i < targets.length; i++) {
                    var targetUUID = targets[i];
                    jsPlumb.connect({uuids: [sourceUUID, targetUUID]});
                }
            }
        }
        function plumbJsSetup() {
            //Here I put listeners on connect, disconnect, and drag events
            jsPlumb.setContainer(synthUiDiv);
            var onConnect = function(sourceEndpoint, targetEndpoint) {
                var sourceName = sourceEndpoint.getUuid();
                var destName = targetEndpoint.getUuid();
                sourceName = sourceName.split("_");
                destName = destName.split("_");
                if (!sourceName[0] || !sourceName[1])
                    return;
                var source = synthUi.instrument.nodes[sourceName[0]];
                source.connect(sourceName[1], destName[0], destName[1]);
            }
            var onDisconnect = function(sourceEndpoint, targetEndpoint) {
                var sourceName = sourceEndpoint.getUuid();
                var destName = targetEndpoint.getUuid();
                sourceName = sourceName.split("_");
                destName = destName.split("_");
                if (!sourceName[0] || !sourceName[1])
                    return;
                var source = synthUi.instrument.nodes[sourceName[0]];
                source.disconnect(sourceName[1], destName[0], destName[1]);
            }
            jsPlumb.bind("connection", function(info, originalEvent) {
                if (originalEvent) {
                    var ends = info.connection.endpoints;
                    onConnect(ends[0], ends[1]);
                }
            });
            jsPlumb.bind("connectionDetached", function(info, originalEvent) {
                if (originalEvent) {
                    var ends = info.connection.endpoints;
                    onDisconnect(ends[0], ends[1]);
                }
            });
            jsPlumb.bind("connectionMoved", function(info, originalEvent) {
                if (originalEvent) {
                    onDisconnect(info.originalSourceEndpoint, info.originalTargetEndpoint)
                }
            })
        }
        return {plumbNode: plumbNode, connectNode: connectNode, plumbJsSetup: plumbJsSetup}
    }
    Plumbing.plumbJsSetup();
    $(".logInstruments").click(function() {
        if (synthUi.instrument)
            console.log("synthUi instrument", synthUi.instrument.nodes);
    })
    $(".tabHeader[data-tabfor=2]").click(function() {
        jsPlumb.repaintEverything();
    })
    synthUiDiv.on("keydown", "input", function(e) {
        var val = $(this).val();
        if (!isNaN(val)) {
            val = parseFloat(val);
            if (e.which === 38) {
                $(this).val(val + 1);
                $(this).trigger("input");
            } else if (e.which === 40) {
                $(this).val(val - 1);
                $(this).trigger("input");
            }
        }
    })
}