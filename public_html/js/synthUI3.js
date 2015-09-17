function SynthUi(synthUiDiv, nodeMakerDiv, instrument) {
    var numeric = new RegExp(/^\d+$/);
    function isNumeric(a) {
        return numeric.test(a);
    }
    var synthUi = this;
    var plumber = jsPlumb.getInstance();
    for (var nodeType in InstrumentNodeModels) {
        if (Object.keys(InstrumentNodeModels[nodeType]).length > 0) {
            $("<div>")
                    .text("Add " + nodeType)
                    .addClass("menuItem")
                    .attr("data-nodetype", nodeType)
                    .appendTo(nodeMakerDiv)
                    .click(function() {
                        addNode($(this).attr("data-nodetype"), Math.random().toString(32).substr(2));
                        $(".settingsOverlay").click();
                    });
        }
    }

    var instruments = [instrument];
    addInstrument = function(instrument) {
        instruments.push(instrument);
    }
    removeInstrument = function(instrument) {
        var index = instruments.indexOf(instrument);
        instruments.splice(index, 1);
    }
    function updateNodePosition(nodeDiv) {
        var nodeId = nodeDiv.attr("data-nodeid")
        for (var i = 0; i < instruments.length; i++) {
            instruments[i].setNodePosition(nodeId, {
                top: parseInt(nodeDiv.css("top")),
                left: parseInt(nodeDiv.css("left"))
            })
        }
    }
    function addNode(type, nodeId, serializedNode) {
        for (var i = 0; i < instruments.length; i++) {
            var node = instruments[i].addNode(type, nodeId, serializedNode);
            if (i === 0) {
                makeNodeUi(node.id, node)
            }
        }
    }
    function duplicateNode(nodeDiv) {
        var nodeId = nodeDiv.attr("data-nodeid");
        var node = instruments[0].instrumentNodes[nodeId];
        var serializedParams = node.serialize();
        addNode(node.type, null, serializedParams);
    }
    function deleteNode(nodeDiv) {
        var nodeId = nodeDiv.attr("data-nodeid");
        for (var i = 0; i < instruments.length; i++) {
            instruments[i].removeNode(nodeId);
        }
        plumber.remove(nodeId);
    }
    function makeNodeUi(nodeId, node) {
        var nodeDiv = $("<div>").addClass("nodeDiv").attr({
            "data-nodeid": nodeId,
        }).appendTo(synthUiDiv);

        nodeDiv.css("background-color", getColor(nodeId));

        var header = $("<div>").addClass("nodeTypeLabel").appendTo(nodeDiv);
        $("<span>").text(node.type).appendTo(header);

        var paramsDiv = $("<table>").addClass("paramsDiv").appendTo(nodeDiv);
        var params = node.params;
        for (var paramName in params) {
            var paramUI = makeParamUi(paramName, params[paramName], nodeId);
            if (paramUI)
                paramUI.appendTo(paramsDiv);

        }

        if (node.type !== "Destination") {
            var position = node.getPosition();
            nodeDiv.css({
                top: position.top + "px",
                left: position.left + "px",
            });
            $("<span>").addClass("contract fa fa-minus-square").appendTo(header).click(function() {
                $(this).parents(".nodeDiv").find(".paramsDiv").hide();
                plumber.repaintEverything();
            });
            $("<span>").addClass("expand fa fa-plus-square").appendTo(header).click(function() {
                $(this).parents(".nodeDiv").find(".paramsDiv").show();
                plumber.repaintEverything();
            });

            $("<span>").addClass("delete fa fa-remove").appendTo(header).click(function() {
                deleteNode($(this).parents(".nodeDiv"));
            })
            $("<span>").addClass("duplicate fa fa-copy").appendTo(header).click(function() {
                duplicateNode($(this).parents(".nodeDiv"));
            })
        }

        //flex experiment
        $("<div>").addClass("targetFlex").appendTo(nodeDiv);


        Plumbing.plumbNode(node);
    }

    function makeSelectParamUi(paramName, param) {
        var options = param.options;
        var paramDiv = $("<tr>");
        $("<td>").text(paramName).appendTo(paramDiv);
        var selectTd = $("<td>").appendTo(paramDiv);
        
        var s = $("<select>").appendTo(selectTd);
        for (var i = 0; i < options.length; i++) {
            $("<option>").text(options[i]).val(options[i]).appendTo(s);
        }
        s.val(options[0]);
        s.change(function() {
            for (var i = 0; i < instruments.length; i++) {
                instruments[i].setParamValue($(this).closest(".nodeDiv").attr("data-nodeid"), paramName, $(this).val());
            }
        });
        return paramDiv;
    }
    function makeFunctionParamUi(paramName, param) {
        var paramDiv = $("<tr>");
        $("<td>").text(paramName).appendTo(paramDiv);
        var inputTd = $("<td>").appendTo(paramDiv);
        var s = $("<input>").appendTo(inputTd);
        s.val(param.value);
        s.change(function() {
            var ok = true;
            for (var i = 0; i < instruments.length; i++) {
                var nodeId = $(this).closest(".nodeDiv").attr("data-nodeid");
                var value = $(this).val();
                console.log(nodeId, value);
                var ok = ok && instruments[i].setParamValue(nodeId, paramName, value);
            }
            if (ok) {
                $(this).removeClass("error");
            } else {
                $(this).addClass("error");
            }
        });
        return paramDiv;
    }
    function makeCanvas(){
        var paramDiv = $("<tr>");
        var canvasTd = $("<td>").attr("colspan", 2).appendTo(paramDiv);
        $("<canvas>").appendTo(canvasTd);
        return paramDiv;
    }
    function makeParamUi(paramName, param, nodeId) {
        var paramDiv;
        if (param.type === "audioParam" 
                || param.type === "function" 
                || param.type === "nodeAttr"
                || param.type === "otherInput") {
            paramDiv = makeFunctionParamUi(paramName, param);
        } else if (param.type === "select") {
            paramDiv = makeSelectParamUi(paramName, param);
        } else if (param.type === "canvas") {
            console.log("canvas")
            paramDiv = makeCanvas();//???? going to have to think more about how adding and removing instruments will work.  I might have to say if(instrument === instruments[0])... so that I only get back anayzer data from one.
        }
        var hint = param.hint ? param.hint : "";
        hint += param.max ? " max: " + param.max : "";
        hint += param.min ? " min: " + param.min : "";
        if (hint)
            paramDiv.find("label").attr("data-hint", hint);
        return paramDiv;
    }
    /*    function makeParamInput(paramName, param, node, params, type) {
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
     }*/
    /*    function makeVisualizer(node) {
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
     }*/

    function getColor(nodeId) {
        if (nodeId === "Destination")
            return "#DDD";
        var getComponent = function(start) {
            var c = nodeId.substr(start, 2);
            c = parseInt(c, 32);
            c = Math.floor(c / 9);
            c += 127;
            return c;
        };
        return "rgba(" + getComponent(0) + "," + getComponent(2) + "," + getComponent(4) + ", 0.8)";
    }


    var Plumbing = new function() {
        function addSourceEndpoint(left, paramName, instrumentNode) {
            var nodeId = instrumentNode.id;
            var endPoint = {
                uuid: nodeId + "_" + paramName,
                endpoint: "Dot",
                anchor: [left, 0, 0, -1],
                maxConnections: -1,
                dragOptions: {},
                paintStyle: {width: 25, height: 21, fillStyle: '#666'},
                isSource: true,
                connectorStyle: {strokeStyle: getColor(nodeId), outlineColor: "#888", lineWidth: 3},
            };

            if (instrumentNode.scope) {
                endPoint.scope = instrumentNode.scope;
            }
            var source = synthUiDiv.find(".nodeDiv[data-nodeid=" + nodeId + "]");
            source.attr("data-paramname", paramName);
            var out = plumber.addEndpoint(synthUiDiv.find(".nodeDiv[data-nodeid=" + nodeId + "]"), endPoint);
            $(out).attr("data-paramname", paramName);
            out.setDragAllowedWhenFull(false);
        }
        function addTargetEndpoint(paramName, instrumentNode) {
            var nodeId = instrumentNode.id;
            var scope = plumber.getDefaultScope()
            if (paramName === "frequency") {
                scope += " frequency";
            }
            if (instrumentNode.params[paramName] && instrumentNode.params[paramName].type === "audioParam") {
                scope += " audioParam";
            }
            if (nodeId === "Destination") {
                var target = synthUiDiv.find(".nodeDiv[data-nodeid=" + nodeId + "]");


            } else {
                var flexBox = synthUiDiv.find(".nodeDiv[data-nodeid=" + nodeId + "] .targetFlex");
                var label = isNumeric(paramName) ? "in " + (parseInt(paramName) + 1) : paramName;
                var target = $("<div>")
                        .text(label)
                        .css({"background-color": getColor(nodeId)})
                        .appendTo(flexBox);
            }
            target.attr("data-paramname", paramName);
            plumber.makeTarget(target, {
                anchor: ["Perimeter", {shape: "Rectangle"}],
                paintStyle: {fillStyle: "gray", radius: 6, outlineColor: "#000"},
                uuid: nodeId + "_" + paramName,
                scope: scope
            });
            /*
             var endPoint = {
             uuid: nodeId + "_" + paramName,
             endpoint: "Dot",
             anchor: [left, 1, 0, 1],
             maxConnections: -1,
             paintStyle: {fillStyle: fillStyle, radius: 11},
             connectorPaintStyle: {strokeStyle: "yellow", lineWidth: 10},
             dropOptions: {hoverClass: "hover", activeClass: "active"},
             isTarget: true,
             overlays: [
             ["Label", {location: [0.5, 0.5], label: paramName}]
             ]
             }
             if (paramName === "frequency") {
             endPoint.scope = plumber.getDefaultScope() + " frequency";
             }
             
             plumber.addEndpoint($(".nodeDiv[data-nodeid=" + nodeId + "]"), endPoint);
             */
        }
        function makeAnchorPosition(names, i) {
            var space = 1 / (names.length + 1);
            return space * (i + 1);
        }
        function plumbIns(node) {
            for (var i = 0; i < node.ins.length; i++) {
                addTargetEndpoint(node.ins[i], node);
            }
        }
        function plumbOuts(node) {
            if (node.type === "Destination")
                return;
            for (var i = 0; i < node.numberOfOutputs; i++) {
                addSourceEndpoint(makeAnchorPosition(new Array(node.numberOfOutputs), i), i, node);
            }
        }
        function plumbNode(node) {
            plumbIns(node);
            plumbOuts(node);
            if (node.type !== "Destination") {
                plumber.draggable(synthUiDiv.find(".nodeDiv[data-nodeid=" + node.id + "]"), {
                    grid: [20, 20],
                    stop: function(params) {
                        var el = params.el;
                        var id = $(el).attr("data-nodeid");
                        instrument.setNodePosition(id, {
                            top: parseInt($(el).css("top")),
                            left: parseInt($(el).css("left"))
                        })
                    }
                });
            }
        }
        function getEndpointElFromId(id) {
            id = id.split("_");
            var nodeId = id[0];
            var paramName = id[1];
            var el = synthUiDiv.find("[data-nodeid=" + nodeId + "]");
            if (!el.is("[data-paramname=" + paramName + "]")) {
                el = el.find("[data-paramname=" + paramName + "]");
            }
            return el;
        }
        function connectNode(node) {
            var connections = node.connections;
            var id = node.id;
            for (var i = 0; i < connections.length; i++) {
                var sourceUUID = id + "_" + i;
                for (var j = 0; j < connections[i].length; j++) {
                    var target = connections[i][j];
                    console.log("connecting", sourceUUID, target);
                    target = target.split("_");
                    var nodeId = target[0];
                    var paramName = target[1];
                    var target = synthUiDiv.find("[data-nodeid=" + nodeId + "]");
                    if (!target.is("[data-paramname=" + paramName + "]")) {
                        target = target.find("[data-paramname=" + paramName + "]");
                    }
                    plumber.connect({
                        source: plumber.getEndpoint(sourceUUID),
                        target: target
                    });
                }
            }
        }
        function plumbJsSetup() {
            //Here I put listeners on connect, disconnect, and drag events
            plumber.setContainer(synthUiDiv);
            function sourceNodeAndParamNames(endpoint) {
                var info = endpoint.getUuid();
                info = info.split("_");
                if (info.length < 2)
                    return;
                paramName = info[1]
                paramName = isNumeric(paramName) ? parseInt(paramName) : paramName;
                return{
                    nodeName: info[0],
                    paramName: paramName
                }
            }
            function getTargetNodeAndParamNames(endpoint) {
                var el = endpoint.element;
                var paramName = $(el).closest("[data-paramname]").attr("data-paramname");
                var nodeName = $(el).closest("[data-nodeid]").attr("data-nodeid")
                if (!paramName || !nodeName)
                    return;
                paramName = isNumeric(paramName) ? parseInt(paramName) : paramName;
                return{
                    nodeName: nodeName,
                    paramName: paramName
                }
            }
            var onConnect = function(sourceEndpoint, targetEndpoint) {
                var sourceInfo = sourceNodeAndParamNames(sourceEndpoint);
                var targetInfo = getTargetNodeAndParamNames(targetEndpoint);
                if (!sourceInfo)
                    return;
                for (var i = 0; i < instruments.length; i++) {
                    instruments[i].connect(sourceInfo.nodeName, sourceInfo.paramName, targetInfo.nodeName, targetInfo.paramName);
                }
            }
            var onDisconnect = function(sourceEndpoint, targetEndpoint) {
                var sourceInfo = sourceNodeAndParamNames(sourceEndpoint);
                var targetInfo = getTargetNodeAndParamNames(targetEndpoint);
                if (!sourceInfo)
                    return;
                for (var i = 0; i < instruments.length; i++) {
                    instruments[i].disconnect(sourceInfo.nodeName, sourceInfo.paramName, targetInfo.nodeName, targetInfo.paramName);
                }
            }

            plumber.bind("connection", function(info, originalEvent) {
                if (originalEvent) {
                    var ends = info.connection.endpoints;
                    var sourceEndpoint = ends[0];
                    var targetEndpoint = ends[1];
                    onConnect(sourceEndpoint, targetEndpoint);
                }
            });
            plumber.bind("connectionDetached", function(info, originalEvent) {
                if (originalEvent) {
                    var ends = info.connection.endpoints;
                    var sourceEndpoint = ends[0];
                    var targetEndpoint = ends[1];
                    onDisconnect(sourceEndpoint, targetEndpoint);
                }
            });
            plumber.bind("connectionMoved", function(info, originalEvent) {
                if (originalEvent) {
                    onDisconnect(info.originalSourceEndpoint, info.originalTargetEndpoint)
                }
            })
        }
        return {plumbNode: plumbNode, connectNode: connectNode, plumbJsSetup: plumbJsSetup}
    }
    Plumbing.plumbJsSetup();

    for (var nodeId in instrument.instrumentNodes) {
        makeNodeUi(nodeId, instrument.instrumentNodes[nodeId]);
    }
    for (var nodeId in instrument.instrumentNodes) {
        Plumbing.connectNode(instrument.instrumentNodes[nodeId]);
    }

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
    return {addNode: addNode}
}

