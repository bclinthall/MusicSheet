/*
 * credit for TimeBasedSpectrogram,  FrequencySpectrumAnalyser, and VolumeBarAnalyser 
 * goes to jos.dirksen (Wed, 10/17/2012) "Exploring the HTML5 Web Audio: visualizing sound", 
 * http://www.smartjava.org/content/exploring-html5-web-audio-visualizing-sound
 * 
 */

function Instrument(audioContext, serializedInstrument) {
    var thisInstrument = this;
    
    function hasProperty(obj, prop){
        for(var key in obj){
            if(key===prop) return true;
        }
        return false;
    }
    function InstrumentNode(type, myNodeId, serializedNode) {
        var model = InstrumentNodeModels[type];
        var node = {};
        extend(node, model);
        console.log("===============", node);
        var params = node.params;
        var audioNode;
        if (node.createNode) {
            audioNode = node.createNode(audioContext);
        } else if (audioContext["create" + type]) {
            audioNode = audioContext["create" + type]();
        } else {
            audioNode = {
                connect: function() {
                },
                disconnect: function() {
                }
            }
        }
        var numberOfInputs = musicTools.isNumeric(node.numberOfInputs) ? node.numberOfInputs : audioNode.numberOfInputs;
        var numberOfOutputs = musicTools.isNumeric(node.numberOfOutputs) ? node.numberOfOutputs : audioNode.numberOfOutputs;
        /*        var numberOfOutputs;
         if(!musicTools.isNumeric(node.numberOfOutputs) ){
         numberOfOutputs = audioNode.numberOfOutputs;
         }else{
         numberOfOutputs = node.numberOfOutputs;
         }*/

        //connections
        var connections;
        if (serializedNode && serializedNode.connections) {
            connections = serializedNode.connections;
        } else {
            connections = new Array(numberOfOutputs);
            for (var i = 0; i < numberOfOutputs; i++) {
                connections[i] = [];
            }
        }
        node.connections = connections;

        var getParamValue = function(paramName) {
            return params[paramName].value;
        };
        function getCalculatedValue(param, freq, start, end) {
            if (typeof param === "string") {
                param = params[param];
            }
            if (param.type === "audioParam" || param.type === "function") {
                return param.mathCode.eval({f: freq, s: start, e: end});
            } else {
                return param.value;
            }
        }
        var setParamValue = function(paramName, value, refreshing) {
            var param = params[paramName];
            param.value = value;
            if (param.type === "audioParam" || param.type === "function") {
                try {
                    param.mathCode = math.parse(value).compile();
                } catch (err) {
                    console.log(err);
                    return false;
                }
            }
            var cur = getCurrent();
            if (param.type === "audioParam") {
                var calculatedValue = getCalculatedValue(param, cur.freq, cur.start, cur.end);
                param.audioParam.setValueAtTime(calculatedValue, audioContext.currentTime);
            } else if (hasProperty(audioNode, paramName)) {
                audioNode[paramName] = value;
            }
            if (param.onSetValFunction && node.play && !refreshing) {
                //  "&& node.play is to see whether the new Node Constructor has returned.  
                //   If not, we don't want to call the onSetValFunction.
                var ok = param.onSetValFunction(node, cur.freq, cur.start, cur.end)
                if (!ok) {
                    return false;
                }
            }
            if(refreshing && param.onRefresh){
                param.onRefresh(node);
            }
            return true;
        };
        function refreshAudioNode() {
            if (node.createNode) {
                audioNode = node.createNode(audioContext);
            } else if (audioContext["create" + type]) {
                audioNode = audioContext["create" + type]();
            } else {
                audioNode = {
                    connect: function() {
                    },
                    disconnect: function() {
                    }
                }
            }
            node.audioNode = audioNode;
            for (var paramName in params) {
                var param = params[paramName];
                if (param.type === "audioParam") {
                    param.audioParam = audioNode[paramName];
                }
                var value = param.value;
                setParamValue(paramName, value, true);
            }
            thisInstrument.reconnectNode(myNodeId);
            
            trimQueueLog();
            if(queueLog.length>1){
                try{
                    node.play(queueLog[1].freq, queueLog[1].start, queueLog[1].end);
                }catch(err){
                    console.log(err);
                }
            }   else if(queueLog.length===1){
                node.play(queueLog[0].freq, queueLog[0].start, queueLog[0].end);
            }
        }


        for (var paramName in params) {
            var param = params[paramName];
            if (param.type === "audioParam") {
                param.audioParam = audioNode[paramName];
            }
            if (serializedNode) {
                setParamValue(paramName, serializedNode.params[paramName]);
            } else {
                var value;
                if (param.defaultVal || musicTools.isNumeric(param.defaultVal)) {
                    value = param.defaultVal;
                } else if (param.type === "audioParam") {
                    value = audioNode[paramName].value;
                } else {
                    value = audioNode[paramName];
                }
                setParamValue(paramName, value);
            }
        }


        //ins
        var ins = [];
        for (var i = 0; i < numberOfInputs; i++) {
            ins.push(i);
        }
        for (var paramName in params) {
            var param = params[paramName];
            if (param.type === "audioParam") {
                ins.push(paramName);
            }
        }

        //positions
        var position = {
            left: 10,
            top: 10
        };
        function setPosition(newPosition) {
            position.left = newPosition.left;
            position.top = newPosition.top;
        }
        function getPosition() {
            return position;
        }
        if (serializedNode && serializedNode.left) {
            setPosition(serializedNode)
        }

        var serialize = function() {
            var obj = {
                type: type,
                left: position.left,
                top: position.top,
                connections: connections,
                params: {}
            };
            for (var paramName in params) {
                obj.params[paramName] = params[paramName].value;
            }
            return obj;
        };
        var play = function(freq, start, end, level) {
            this.playSpecial(freq, start, end, level);
            for (var paramName in params) {
                var param = params[paramName];
                if (param.type === "audioParam") {
                    var calculatedValue = getCalculatedValue(param, freq, start, end);
                    param.audioParam.setValueAtTime(calculatedValue, start);
                }
            }

        };


        var kill = function() {
            thisInstrument.disconnectNode(myNodeId);
            this.killSpecial();
        };
        node.instrument = thisInstrument;
        node.type = type;
        node.id = myNodeId;
        node.audioNode = audioNode;
        node.getParamValue = getParamValue;
        node.setParamValue = setParamValue;
        node.getCalculatedParamValue = getCalculatedValue;
        node.setPosition = setPosition;
        node.getPosition = getPosition;
        node.ins = ins;
        node.numberOfOutputs = numberOfOutputs;
        node.serialize = serialize;
        node.play = play;
        node.kill = kill;
        node.refreshAudioNode = refreshAudioNode;
        return node;
    }
    var instrumentLevel = 0;
    var instrumentName = null;
    var instrumentNodes = {};
    thisInstrument.instrumentNodes = instrumentNodes;
    thisInstrument.audioContext = audioContext;

    var queueLog = [];
    function trimQueueLog() {
        var time = audioContext.currentTime;
        var i = 0;
        while (i < queueLog.length && queueLog[i].start < time) {
            i++;
        }
        i--;
        queueLog.splice(0, i);
    }
    function getCurrent() {
        trimQueueLog();
        return queueLog[0] ? queueLog[0] : {freq: 440, start: audioContext.currentTime, end: audioContext.currentTime};

    }
    thisInstrument.getCurrent = getCurrent;
    thisInstrument.cycleConnected = function(sourceNodeName, sourceOutIndex, doToConnected, data) {
        var connections = thisInstrument.instrumentNodes[sourceNodeName].connections[sourceOutIndex];
        for (var i = 0; i < connections.length; i++) {
            var connection = connections[i];
            connection = connection.split("_");
            var destNodeName = connection[0];
            var destInName = connection[1];
            var target = thisInstrument.instrumentNodes[destNodeName];
            if (!musicTools.isNumeric(destInName)) {
                target = target.params[destInName];
            }
            doToConnected(target, data);
        }
    };
    thisInstrument.connect = function(sourceNodeName, sourceOutIndex, destNodeName, destInName) {
        //takes node, in, and out names as arguments.
        sourceOutIndex = parseInt(sourceOutIndex);
        destInName = musicTools.isNumeric(destInName) ? parseInt(destInName) : destInName;
        var sourceNode = instrumentNodes[sourceNodeName];
        var destNode = instrumentNodes[destNodeName];
        if (typeof destInName === "number") {
            sourceNode.audioNode.connect(destNode.audioNode, sourceOutIndex, destInName);

        } else {
            var destParam = destNode.audioNode[destInName];
            sourceNode.audioNode.connect(destParam, sourceOutIndex);
        }
        var uuid = destNodeName + "_" + destInName;
        if (sourceNode.connections[sourceOutIndex].indexOf(uuid) === -1) {
            //this condition prevents looping in case we are setting up a synth ui
            //from the instrument.
            sourceNode.connections[sourceOutIndex].push(uuid);
        }
    };
    thisInstrument.disconnect = function(sourceNodeName, sourceOutIndex, destNodeName, destInName) {
        sourceOutIndex = parseInt(sourceOutIndex);
        destInName = musicTools.isNumeric(destInName) ? parseInt(destInName) : destInName;
        var sourceNode = instrumentNodes[sourceNodeName];
        var destNode = instrumentNodes[destNodeName];
        if (typeof destInName === "number") {
            sourceNode.audioNode.disconnect(destNode.audioNode, sourceOutIndex, destInName);
        } else {
            var destParam = destNode.audioNode[destInName];
            sourceNode.audioNode.disconnect(destParam, sourceOutIndex);
        }
        var connections = sourceNode.connections[sourceOutIndex];
        var index = connections.indexOf(destNodeName + "_" + destInName);
        connections.splice(index, 1);
    };
    thisInstrument.reconnectNode = function(nodeId){
        var instrumentNodes = thisInstrument.instrumentNodes;
        for (var srcNodeId in instrumentNodes) {
            var connections = instrumentNodes[srcNodeId].connections;
            for (var i = 0; i < connections.length; i++) {
                var connectionsLength = connections[i].length;
                for (var j = 0; j < connectionsLength; j++) {
                    var conStr = connections[i][j];
                    var conAry = conStr.split("_");
                    conAry[1] = musicTools.isNumeric(conAry[1]) ? parseInt(conAry[1]) : conAry[1];
                    var destNodeId = conAry[0];
                    if(srcNodeId === nodeId || destNodeId===nodeId){
                        thisInstrument.connect(srcNodeId, i, destNodeId, conAry[1]);
                    }
                }
            }
        }
    }
    thisInstrument.disconnectNode = function(nodeId){
        var instrumentNodes = thisInstrument.instrumentNodes;
        for (var srcNodeId in instrumentNodes) {
            var connections = instrumentNodes[srcNodeId].connections;
            for (var i = 0; i < connections.length; i++) {
                var connectionsLength = connections[i].length;
                for (var j = 0; j < connectionsLength; j++) {
                    var conStr = connections[i][j];
                    var conAry = conStr.split("_");
                    conAry[1] = musicTools.isNumeric(conAry[1]) ? parseInt(conAry[1]) : conAry[1];
                    var destNodeId = conAry[0];
                    if(srcNodeId === nodeId || destNodeId===nodeId){
                        thisInstrument.disconnect(srcNodeId, i, destNodeId, conAry[1]);
                    }
                }
            }
        }
    }
    thisInstrument.addNode = function(type, id, serializedNode) {
        id = id || Math.random().toString(32).substr(2);
        instrumentNodes[id] = new InstrumentNode(type, id, serializedNode);
        return instrumentNodes[id];
    };
    thisInstrument.removeNode = function(id) {
        instrumentNodes[id].kill();
        delete instrumentNodes[id];
    };
    thisInstrument.setLevel = function(level) {
        instrumentLevel = level;
    };
    thisInstrument.getLevel = function() {
        return instrumentLevel < 0 ? 0 : instrumentLevel > 1 ? 1 : instrumentLevel;
    };

    thisInstrument.getParamValue = function(nodeId, paramName) {
        instrumentNodes[nodeId].getParamValue(paramName);
    };
    thisInstrument.setParamValue = function(nodeId, paramName, value) {
        return instrumentNodes[nodeId].setParamValue(paramName, value);
    };
    thisInstrument.setNodePosition = function(nodeId, position) {
        instrumentNodes[nodeId].setPosition(position);
    };
    thisInstrument.serialize = function() {
        var obj = {
            name: instrumentName,
            level: instrumentLevel,
            nodes: {}

        };
        for (var nodeId in instrumentNodes) {
            if (nodeId !== "Destination")
                obj.nodes[nodeId] = instrumentNodes[nodeId].serialize();
        }
        return obj;
    };
    thisInstrument.play = function(freq, start, end, level) {
        trimQueueLog();
        queueLog.push({freq: freq, start: start, end: end});
        for (var nodeId in instrumentNodes) {
            instrumentNodes[nodeId].play(freq, start, end, level);
        }
    };
    thisInstrument.playNow = function(freq, duration, level) {
        freq = freq || 440;
        level = level || 1;
        thisInstrument.play(freq, audioContext.currentTime + .1, duration ? audioContext.currentTime + .1 + duration : null, level);
    }
    thisInstrument.kill = function(){
        for(var id in instrumentNodes){
            instrumentNodes[id].kill();
        }
    }
    var instrumentGain = thisInstrument.addNode("Destination", "Destination");
    thisInstrument.setLevel(1);
    instrumentGain.audioNode.gain.value = 0;
    instrumentGain.audioNode.connect(audioContext.destination);


    //from serialized
    if (serializedInstrument) {
        instrumentName = serializedInstrument.name;
        instrumentLevel = serializedInstrument.level;
        for (var nodeId in serializedInstrument.nodes) {
            var serializedNode = serializedInstrument.nodes[nodeId];
            thisInstrument.addNode(serializedNode.type, nodeId, serializedNode);
        }
        for (var nodeId in instrumentNodes) {
            var connections = instrumentNodes[nodeId].connections;
            for (var i = 0; i < connections.length; i++) {
                var connectionsLength = connections[i].length;
                for (var j = 0; j < connectionsLength; j++) {
                    var conStr = connections[i][j];
                    var conAry = conStr.split("_");
                    conAry[1] = musicTools.isNumeric(conAry[1]) ? parseInt(conAry[1]) : conAry[1];
                    thisInstrument.connect(nodeId, i, conAry[0], conAry[1]);
                }
            }
        }
    }
    //do not return anything.
}


function extend(x, y) {
    if (typeof x !== "object"
            && typeof y !== "object"
            && typeof x !== "array"
            && typeof y !== "array") {
        return;
    }
    ;
    for (var key in y) {
        var item = y[key];
        if (Array.isArray(item)) {
            x[key] = [];
            extend(x[key], item);
        } else if (typeof item === "object") {
            x[key] = {};
            extend(x[key], item);
        } else {
            x[key] = item;
        }
    }
}


