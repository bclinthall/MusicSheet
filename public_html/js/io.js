function Io(ioDiv, type, callbacks) {//callbacks.getJSONForSave, callbacks.onLoad, callbacks.onNewItem) {
    var getNames = function() {
        var names = [];
        var regExp = new RegExp("^" + type + "-");
        for (var i = 0; i < localStorage.length; i++) {
            var key = localStorage.key(i);
            if (regExp.test(key)) {
                names.push(key.replace(regExp, ""));
            }
        }
        return names;
    }
    function refreshNames() {
        var names = getNames();
        var curName;
        $(".select" + type).each(function(index, select) {
            select = $(select);
            curName = select.val();
            select.empty();
            $("<option>").text("--").appendTo(select);
            for (var i = 0; i < names.length; i++) {
                $("<option>").text(names[i]).appendTo(select);
            }
            if(curName){
                select.val(curName);
                if(!select.val()){
                    select.change();
                }
            }
        })

        var s = ioDiv.find(".select");
        curName = ioDiv.find(".save").attr("data-name");
        s.val(curName);
        if(callbacks.afterNameRefresh) callbacks.afterNameRefresh();
    }

    var getItem = function(name) {
        var json = localStorage.getItem(type + "-" + name);
        return JSON.parse(json);
    }
    var saveItem = function(name, json) {
        name = type + "-" + name;
        localStorage.setItem(name, json);
        console.log(name, JSON.parse(json));
    }
    var deleteItem = function(name) {
        localStorage.removeItem(type + "-" + name);
    }
    function save() {
        var json = callbacks.getJSONForSave();
        var name = ioDiv.find(".save").attr("data-name");
        if (!name) {
            name = prompt("Name your " + type + ".");
        }
        if (!name)
            return;
        saveItem(name, json)
        ioDiv.find(".save").attr("data-name", name);
        refreshNames();
        if(callbacks.afterSave) callbacks.afterSave();
    }
    function saveAs() {
        var json = callbacks.getJSONForSave();
        var name = prompt("Name your " + type + ".");
        saveItem(name, json)
        ioDiv.find(".save").attr("data-name", name);
        refreshNames();
        if(callbacks.afterSave) callbacks.afterSave();
    }
    function deleteOne(name){
        deleteItem(name);
        ioDiv.find(".save").removeAttr("data-name");
        newOne();
        if(callbacks.afterDelete) callbacks.afterDelete();
    }
    function newOne(){
        callbacks.onNewItem();
        ioDiv.find(".save").removeAttr("data-name");
        save();
    }
    $("<select>").addClass("select select" + type).appendTo(ioDiv).on("change", function() {
        var name = $(this).find("option:selected").text();
        ioDiv.find(".save").attr("data-name", name);
        var sysObj = getItem(name);
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
                deleteOne(name);
            }
        }

        refreshNames();
    });
    $("<div>").addClass("ioDiv").text("New " + type).addClass("new").appendTo(ioDiv).click(newOne);
    refreshNames();
    return {
        refreshNames: refreshNames,
        getItem: getItem
    }
}
