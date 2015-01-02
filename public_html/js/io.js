function Io(ioDiv, type, callbacks) {//callbacks.getJSONForSave, callbacks.onLoad, callbacks.onNewItem) {
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
    var getItem = function(whatKind, name) {
        return JSON.parse(localStorage.getItem(whatKind + "-" + name));
    }
    var saveItem = function(whatKind, name, json) {
        name = whatKind + "-" + name;
        localStorage.setItem(name, json);
        console.log(name, json);
    }
    var deleteItem = function(whatKind, name) {
        localStorage.removeItem(whatKind + "-" + name);
    }
    function save() {
        var json = callbacks.getJSONForSave();
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
        var json = callbacks.getJSONForSave();
        var name = prompt("Name your " + type + ".");
        saveItem(type, name, json)
        ioDiv.find(".save").attr("data-name", name);
        refreshNames();
    }

    $("<select>").addClass("select").appendTo(ioDiv).on("change", function() {
        var name = $(this).find("option:selected").text();
        ioDiv.find(".save").attr("data-name", name);
        var sysObj = getItem(type, name);
        if (!sysObj) {
            alert("Couldn't find " + name);
            return;
        }
        if (sysObj) {
            callbacks.onLoad(sysObj);
        }
    });
    $("<div>").addClass("ioDiv").text("Save " + type).addClass("save").appendTo(ioDiv).click(save);
    $("<div>").addClass("ioDiv").text("Save " + type + " as").addClass("saveAs").appendTo(ioDiv).click(saveAs);
    $("<div>").addClass("ioDiv").text("Delete " + type).addClass("ioDelete").appendTo(ioDiv).click(function() {
        var name = ioDiv.find(".save").attr("data-name");
        if (!name) {
            alert("Open a " + type + " to delete it.");
        } else {
            var response = confirm("Really delete " + name + "?  This can't be undone.");
            if (response) {
                deleteItem(type, name);
                ioDiv.find(".save").removeAttr("data-name");
            }
        }

        refreshNames();
    });
    $("<div>").addClass("ioDiv").text("New " + type).addClass("new").appendTo(ioDiv).click(function() {
        callbacks.onNewItem();
        ioDiv.find(".save").removeAttr("data-name");
        ioDiv.find(".select")[0].selectedIndex = 0
    });
    refreshNames();
}
