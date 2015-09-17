var Params = function(serialized) {
    this.params = {};
    this.paramTypes = {};
    //fp floatParameter
    //n number
    //s string
    //w waveType
    //ft filterType
    //v visualizer type        
    this.getParamVal = function(freq, paramName) {
        var type = this.paramTypes[paramName];
        var param = this.params[paramName];
        if (type === "fp") {
            return param.getValue(freq);
        } else {
            return param;
        }
    }
    this.serialize = function() {
        var obj = {};
        obj.t = {};
        obj.p = {};
        for (var paramName in this.paramTypes) {
            var type = this.paramTypes[paramName];
            var param = this.params[paramName];
            obj.t[paramName] = type;
            if (type === "fp") {
                obj.p[paramName] = param.serialize();
            } else {
                obj.p[paramName] = param;
            }
        }
        return obj;
    }
    for (var paramName in serialized.t) {
        var type = serialized.t[paramName];
        var param = serialized.p[paramName];
        this.paramTypes[paramName] = type;
        if (type === "fp") {
            this.params[paramName] = new FloatParam(param.t, param.f, param.c, param.d);
        } else if (type === "n" || type === "s" || type === "w" || type === "ft") {
            this.params[paramName] = param;
        }
    }
    
}
Params.selectOptions = {
    w: ["sine", "square", "sawtooth", "triangle"],
    ft: ["lowpass","highpass","bandpass","lowshelf","highshelf","peaking","notch","allpass"],
    v: ["Waveform", "Frequency"]
}

var FloatParam = function(type, func, constant, detune) {
    this.t = type || "c";
    this.f = "f";
    this.c = 1;
    this.d = 0;
    var parser = math.parser();
    this.setParam = function(param, val) {
        var ok = true;
        if (param === "f") {
            try {
                parser.eval("g(f) = " + val);
                this.f = val;
            } catch (err) {
                ok = false;
            }
        } else {
            if (isNaN(val) || val ==="") {
                ok = false;
            } else {
                this[param] = val;
            }
        }
        return ok;
    }
    this.setParam("f", func);
    this.setParam("c", constant);
    this.setParam("d", detune);
    this.getValue = function(freq) {
        if (this.t === "f") {
            return parseFloat(parser.eval("g(" + freq + ")"));
        } else if (this.t === "c") {
            return parseFloat(this.c);
        } else if (this.t === "d") {
            return freq * Math.pow(2, parseFloat(this.d) / 12);
        }
    }
    this.serialize = function() {
        return {t: this.t, f: this.f, c: this.c, d: this.d};
    }
}

function FloatParamUi(name, floatParam, node) {
    var div = $("<div>").addClass("floatParamUi");
    $("<label>").text(name).appendTo(div);
    function makeRadio(abrev, hint) {
        $("<span>").text(abrev).attr({"data-hint": hint, "data-for": abrev}).addClass(abrev + " radio").appendTo(div);
    }
    makeRadio("c", "constant");
    makeRadio("d", "detune");
    makeRadio("f", "function");
    div.on("input", "input.param", function() {
        var dataFor = $(this).attr("data-for");
        var ok = floatParam.setParam(dataFor, $(this).val());
        if (ok) {
            $(this).removeClass("error");
            node.updateParams();
        } else {
            $(this).addClass("error");
        }
    });
    function makeInput(abrev, val, hint) {
        var span = $("<span>").attr("data-hint", hint).appendTo(div);
        $("<input>").addClass("param").attr({"data-for": abrev}).val(val).appendTo(span).trigger("input");
    }
    makeInput("c", floatParam.c, "The parameter value will be set to the constant entered, e.g. 440, 1.618, -12");
    makeInput("d", floatParam.d, "For each note played, the parameter value will be set to the frequency of the note plus the number of semitones entered.  E.g. If 1 is entered, when an A is played, the parameter will be set to the frequency of an A#.");
    makeInput("f", floatParam.f, "Enter a mathmatical expression for a function of note frequency.  Use 'f' for frequency.  If you enter, 'f * 1.681', for each note played, the parameter value will be set to the frequency of the note times 1.681.  Other possibilities: 'f^2', '2^f', '3f^2 + 2f + 7'");
    function activate(dataFor) {
        div.find(".radio.active").removeClass("active");
        div.find(".radio[data-for=" + dataFor + "]").addClass("active");
        div.find("input.param").hide();
        div.find("input[data-for=" + dataFor + "]").show();
        floatParam.t = dataFor;
    }
    div.on("click", "span.radio", function() {
        var dataFor = $(this).attr("data-for");
        activate(dataFor);
    })

    /*$("<i>").text("freq:").appendTo(div);
    $("<input>").addClass("freq").appendTo(div);
    $("<button>").text("get").appendTo(div).click(function() {
        var val = floatParam.getValue(div.find(".freq").val());
        div.find(".result").text(val);
    })
    $("<i>").addClass("result").appendTo(div);*/
    activate(floatParam.t);
    return div;
}
