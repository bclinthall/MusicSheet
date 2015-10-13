function SynthUi(tabDiv, nodeMakerDiv, instruments) {
    var synthUiDiv = $("<div>").addClass("synthUiDiv").appendTo(tabDiv);
    var synthUi = this;
    var plumber = jsPlumb.getInstance();
    for (var nodeType in InstrumentNodeModels) {
        if (nodeType !== "Destination") {
            if (InstrumentNodeModels[nodeType] === "categoryMarker") {
                $("<div>")/*.text(nodeType)*/.addClass("menuSpacer").appendTo(nodeMakerDiv);
            } else {
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
    }
    nodeMakerDiv.parent().find(".debugInstrument").click(function() {
        plumber.repaintEverything();
    })
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
        var serializedNode = node.serialize();
        serializedNode.left += 10;
        serializedNode.top += 10;
        for (var i = 0; i < serializedNode.connections.length; i++) {
            serializedNode.connections = [];
        }
        addNode(node.type, null, serializedNode);
    }
    function deleteNode(nodeDiv) {
        var nodeId = nodeDiv.attr("data-nodeid");
        for (var i = 0; i < instruments.length; i++) {
            instruments[i].removeNode(nodeId);
        }
        plumber.remove(nodeDiv);
    }
    function ParamUiMaker() {
        function selectUi(paramName, param, uiParts) {
            var options = param.options;
            var s = $("<select>").appendTo(uiParts.inputEl);
            for (var i = 0; i < options.length; i++) {
                $("<option>").text(options[i]).val(options[i]).appendTo(s);
            }
            s.val(param.value);
            s.change(function() {
                var nodeId = $(this).closest(".nodeDiv").attr("data-nodeid")
                var val = $(this).val();
                for (var i = 0; i < instruments.length; i++) {
                    instruments[i].setParamValue(nodeId, paramName, val);
                }
            });
        }
        function functionUi(paramName, param, uiParts) {
            var s = $("<input>").appendTo(uiParts.inputEl);
            s.val(param.value);
            s.keyup(function() {
                var ok = true;
                var nodeId = $(this).closest(".nodeDiv").attr("data-nodeid");
                var value = $(this).val();
                for (var i = 0; i < instruments.length; i++) {
                    var ok = ok && instruments[i].setParamValue(nodeId, paramName, value);
                }
                if (ok) {
                    $(this).removeClass("error");
                } else {
                    $(this).addClass("error");
                }
            });
        }
        function canvasUi(paramName, param, uiParts) {
            var canvasDiv = $("<div>").addClass("canvasDiv");
            $("<canvas>").appendTo(canvasDiv).attr({
                height: 150,
                width: 300,
            });
            uiParts.paramUi = canvasDiv;
            uiParts.hintTarget = canvasDiv;
        }
        function fileUi(paramName, param, uiParts) {
            var s = $("<input>").attr("type", "file").appendTo(uiParts.inputEl).css("display", "none");
            s.change(function(evt) {
                var ok = true;
                var file = evt.target.files[0];
                var fileName = file.name;
                var labelTd = $(this).parents("tr").children().first();
                var btnDisplay = $(this).siblings("div").text("Change");
                labelTd.text("file: " + fileName);
                $(this).text("Change");
                console.log(file);
                var nodeId = $(this).closest(".nodeDiv").attr("data-nodeid");
                for (var i = 0; i < instruments.length; i++) {
                    var ok = ok && instruments[i].setParamValue(nodeId, paramName, file);
                }
                if (ok) {
                    $(this).removeClass("error");
                } else {
                    $(this).addClass("error");
                }
            });
            var s2 = $("<div>").text("Choose").addClass("buttonMimic").appendTo(uiParts.inputEl).click(function() {
                s.click();
            });
        }
        function booleanUi(paramName, param, uiParts) {
            uiParts.inputEl.html("&nbsp;");
            var s = $("<input>").attr("type", "checkbox").appendTo(uiParts.inputEl);
            s.prop("checked", param.value);
            s.change(function() {
                var val = $(this).is(':checked');
                console.log("bool", val);
                var nodeId = $(this).closest(".nodeDiv").attr("data-nodeid");
                for (var i = 0; i < instruments.length; i++) {
                    instruments[i].setParamValue(nodeId, paramName, val);
                }

            });
        }
        ;
        function rangeUi(paramName, param, uiParts) {
            var text = $("<input>").appendTo(uiParts.inputEl);
            text.attr({
                type: "number",
                max: param.max,
                min: param.min,
                step: param.step,
            })
            text.val(param.value);
            text[0].oninput = function() {
                var ok = true;
                var nodeId = $(this).closest(".nodeDiv").attr("data-nodeid");
                var value = $(this).val();
                console.log(nodeId, value);
                for (var i = 0; i < instruments.length; i++) {
                    var ok = ok && instruments[i].setParamValue(nodeId, paramName, value);
                }
                if (ok) {
                    $(this).removeClass("error");
                    range.val(value);
                } else {
                    $(this).addClass("error");
                }
            };
            var rangeEl = $("<tr>");
            var rangeTd = $("<td>").attr("colspan", 2).appendTo(rangeEl);
            rangeTd.html("&nbsp;")
            var range = $("<input>").appendTo(rangeTd);
            range.attr({
                type: "range",
                max: param.max,
                min: param.min,
                step: param.step,
            })
            range.val(param.value);
            range[0].oninput = function() {
                var value = $(this).val();
                text.val(value);
                text.trigger("input")
            };
            var paramUi = uiParts.paramUi.add(rangeEl);
            console.log(paramUi);
            uiParts.paramUi=(paramUi);
        }
        return{
            audioParam: functionUi,
            input: functionUi,
            select: selectUi,
            canvas: canvasUi,
            file: fileUi,
            boolean: booleanUi,
            range: rangeUi
        };
    }
    var paramUiMaker = new ParamUiMaker();
    function makeParamUi(paramName, param, nodeId) {
        var paramUi = $("<tr>");
        var labelEl = $("<td>").text(paramName).appendTo(paramUi);
        var inputEl = $("<td>").appendTo(paramUi);
        var uiParts = {
            paramUi: paramUi,
            labelEl: labelEl,
            inputEl: inputEl,
            hintTarget: labelEl
        }
        paramUiMaker[param.type](paramName, param, uiParts);
        
        var hint = param.hint ? param.hint : "";
        if(param.hintAttr){
            hint = "\"" + hint + "\"";
        }
        hint += musicTools.isNumeric(param.max) ? " max: " + param.max+ ";" : "";
        hint += musicTools.isNumeric(param.min) ? " min: " + param.min+ ";" : "";
        if(param.hintAttr){
            var hintAttr = param.hintAttr.src;
            hintAttr = hintAttr.replace(/\_SUBPATH\_/g, param.hintAttr.subPath);
            if(param.hintAttr.srcTitle){
                hintAttr = hintAttr.replace(/\_SRCTITLE\_/g, param.hintAttr.srcTitle);
            }
            hint += " <small>" + hintAttr+"</small>";
        }
        if (hint) {
            uiParts.hintTarget.attr("data-hint", hint);
        }
        return uiParts.paramUi;
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
        paramsDiv.find(".canvasDiv").insertAfter(paramsDiv);

        if (node.type !== "Destination") {
            var position = node.getPosition();
            nodeDiv.css({
                top: position.top + "px",
                left: position.left + "px",
            });
            $("<span>").addClass("contract fa fa-minus-square").appendTo(header).click(function() {
                var nodeDiv = $(this).parents(".nodeDiv");
                nodeDiv.find(".paramsDiv").hide();
                nodeDiv.find(".expand").show();
                $(this).hide();
                plumber.repaintEverything();
            });
            $("<span>").addClass("expand fa fa-plus-square").appendTo(header).click(function() {
                var nodeDiv = $(this).parents(".nodeDiv");
                nodeDiv.find(".paramsDiv").show();
                nodeDiv.find(".contract").show();
                $(this).hide();
                plumber.repaintEverything();
            }).hide();

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
        var anchors = [];
        var anchorCount = 40;
        var anchorMargin = 3;
        for (var i = 0; i < anchorCount; i++) {
            var x = (i + anchorMargin) / (anchorCount + 2 * anchorMargin);
            //anchors.push([x, 0, 0, -1]);
            anchors.push([x, 1, 0, 1]);
        }
        function addSourceEndpoint(left, paramName, instrumentNode) {
            var nodeId = instrumentNode.id;
            var endPoint = {
                uuid: nodeId + "_" + paramName,
                endpoint: "Dot",
                anchor: [left, 0, 0, -1],
                maxConnections: -1,
                dragOptions: {},
                paintStyle: {width: 25, height: 21, fillStyle: '#888', outlineColor: "#000"},
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
                var label = musicTools.isNumeric(paramName) ? "in " + (parseInt(paramName) + 1) : paramName;
                var target = $("<div>")
                        .text(label)
                        /*.css({"background-color": getColor(nodeId)})*/
                        .appendTo(flexBox);
            }
            target.attr("data-paramname", paramName);
            plumber.makeTarget(target, {
                anchor: anchors, //["Perimeter", {shape: "Rectangle"}],
                paintStyle: {fillStyle: "#888", radius: 7, outlineColor: "#000"},
                //uuid: nodeId + "_" + paramName,
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
                        for (var i = 0; i < instruments.length; i++) {
                            instruments[i].setNodePosition(id, {
                                top: parseInt($(el).css("top")),
                                left: parseInt($(el).css("left"))
                            })
                        }
                    }
                });
            }
        }
        function getTargetEndpointFromId(id) {
            id = id.split("_");
            var nodeId = id[0];
            var paramName = id[1];
            var el = synthUiDiv.find("[data-nodeid=" + nodeId + "]");
            if (nodeId !== "Destination") {
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
                    var targetId = connections[i][j];
                    var target = getTargetEndpointFromId(targetId);
                    var source = plumber.getEndpoint(sourceUUID);
                    plumber.connect({
                        source: source,
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
                paramName = musicTools.isNumeric(paramName) ? parseInt(paramName) : paramName;
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
                paramName = musicTools.isNumeric(paramName) ? parseInt(paramName) : paramName;
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
            $(window).resize(function() {
                plumber.repaintEverything();
            })
        }
        return {plumbNode: plumbNode, connectNode: connectNode, plumbJsSetup: plumbJsSetup}
    }
    Plumbing.plumbJsSetup();
    var instrument = instruments[0];
    if (instrument.name && ExampleInstruments[instrument.name] && ExampleInstruments[instrument.name].exampleText) {
        $("<div>").addClass("exampleTextDiv").html(ExampleInstruments[instrument.name].exampleText).appendTo(synthUiDiv);
    }
    if (instrument.name) {
        instrument.name = parseInt(instrument.name.replace("Tutorial", ""));
    }
    if (instrument.name && ExampleInstruments[instrument.name] && ExampleInstruments[instrument.name].tutorial) {
        var tutorial = ExampleInstruments[instrument.name].tutorial;
        var tutorialDiv = $("[data-tutorial=" + tutorial + "]").clone()
                .addClass("exampleTextDiv")
                .css("z-index", 12)
                .appendTo(synthUiDiv);
        var bottomBtn = $("<div>").addClass("bottomBtn styledBtn").html("&darr;").appendTo(tutorialDiv);
    }

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

    function footerSetup() {
        var footer = $("<div>").addClass("footer").appendTo(tabDiv);
        $('<span>Zoom: <input class="synthUiZoom" type="range" min="0.25" max="1" step="0.25" value="1"></span>').appendTo(footer);
        var zoomInput = footer.find(".synthUiZoom");
        zoomInput.on("input", function() {
            var zoom = $(this).val();
            synthUiDiv.css("transform", "scale(" + zoom + ")");
            plumber.setZoom(zoom);
        });
        var instrumentTestDiv = $("<span>").addClass("instrumentTestDiv").appendTo(footer).attr({
            "data-hint": 'When you click "play" the instrument will begin playing now and end playing after the specified duration.  A note name, e.g. A#3, may be given for frequency.  Leaving duration blank will start instrument and not stop it till you click play with a specified duration.'
        })
        $("<label>").text("Frequency:").appendTo(instrumentTestDiv);
        var playFreqInput = $("<input>").appendTo(instrumentTestDiv).val("A3");
        $("<label>").text("Duration:").appendTo(instrumentTestDiv);
        var playDurationInput = $("<input>").appendTo(instrumentTestDiv).val(1);
        $("<button>").text("play").appendTo(instrumentTestDiv).click(function() {
            var freq = playFreqInput.val()
            if (musicTools.isNumeric(freq)) {
                freq = parseFloat(freq);
            } else {
                freq = musicTools.noteToFrequency(freq);
            }
            var dur = parseFloat(playDurationInput.val());
            console.log(freq, dur, instruments[0]);
            instruments[0].playNow(freq, dur);
        })
        $("<button>").text("stop").appendTo(instrumentTestDiv).click(function() {
            var freq = playFreqInput.val()
            if (musicTools.isNumeric(freq)) {
                freq = parseFloat(freq);
            } else {
                freq = musicTools.noteToFrequency(freq);
            }
            instruments[0].playNow(freq, 0.00001);
        })

    }
    footerSetup();

    return {addNode: addNode}
}

