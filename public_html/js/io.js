/*
 * Copyright B. Clint Hall 2014-2015.  All rights reserved.
 * Contact the author to discuss licensing.  theaetetus7  gmail.com
*/

function Io(type) {
    /*
     * callbacks.getJSONForSave, 
     * callbacks.onLoad, 
     * callbacks.onNewItem,
     * callbacks.afterNameRefresh
     * 
     * controls.openSelect
     * controls.saveBtn
     * controls.saveAsBtn
     * controls.deleteBtn
     * controls.newBtn
     */
    var tutorialRE = new RegExp(/^Tutorial\d+$/);
    var regExp = new RegExp("^" + type + "-");
    var getNames = function() {
        var names = [];
        for (var i = 0; i < localStorage.length; i++) {
            var key = localStorage.key(i);
            if (regExp.test(key)) {
                names.push(key.replace(regExp, ""));
            }
        }
        names.sort(function(a,b){
            if(tutorialRE.test(a) && !tutorialRE.test(b)) return -1;
            if(tutorialRE.test(b) && !tutorialRE.test(a)) return 1;
            return a.localeCompare(b);
        });
        return names;
    }
    var clearAll = function() {
        for (var i = 0; i < localStorage.length; i++) {
            var key = localStorage.key(i);
            if (regExp.test(key)) {
                localStorage.removeItem(key);
                i--;
            }
        }
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
            if (curName && names.indexOf(curName)!==-1) {
                select.val(curName);
                if (!select.val()) {
                    select.change();
                }
            }
        })
        $(".ioMenu"+type).each(function(index, menu) {
            menu = $(menu);
            menu.empty();
            for (var i = 0; i < names.length; i++) {
                $("<div>").text(names[i]).addClass("menuItem").appendTo(menu);
            }
        })
    }
    var _getItem = function(name) {
        var item = localStorage.getItem(type + "-" + name)
        try{
            item = JSON.parse(item);
        }catch(err){
            item = JSON.parse(LZString.decompressFromUTF16(item));
        }
        return item;
    }
    var getItem = function(name) {
        var item = _getItem(name);
        if (!item) {
            alert("Couldn't find " + name);
            return;
        } else {
            return item;
        }
    }
    var _saveItem = function(name, item) {
        if (typeof item === "object") {
            item = JSON.stringify(item);
        }
        item = LZString.compressToUTF16(item);
        localStorage.setItem(type + "-" + name, item);
    }
    var saveItem = function(name, item) {
        var needRefresh = false;
        if (!name) {
            name = prompt("Name your " + type + ".");
            if (_getItem(name)) {
                var overwrite = confirm("There is already an " + type + " named " + name + ". Overwrite it?");
                if (!overwrite) {
                    return;
                }
            }
            needRefresh = true;
        }
        if (!name) {
            return;
        }

        _saveItem(name, item)
        if (needRefresh) {
            refreshNames();
        }
        return name;
    }
    function saveAs(json) {
        return saveItem(null, json);
    }
    var _deleteItem = function(name) {
        localStorage.removeItem(type + "-" + name);
    }
    function deleteItem(name, extrMsg) {
        var doIt = confirm("Are you sure you want to delete the " + type + " " + name + "?  This can't be undone. " + extrMsg)
        if (!doIt) {
            return doIt;
        }
        _deleteItem(name);
        refreshNames();
        return doIt;
    }
    function setupOpenSelect(select, onChange) {
        select.addClass("select select" + type).on("change", function() {
            var name = $(this).find("option:selected").text();
            var item = getItem(name);
            if (!item) {
                alert("Couldn't find " + name);
                return;
            }
            if (item) {
                onChange(name, item, $(this))
            }
        });

    }
    function setupOpenMenu(menu, onChange) {
        menu.addClass("ioMenu ioMenu" + type).on("click", ".menuItem", function() {
            var name = $(this).text();
            var item = getItem(name);
            if (!item) {
                alert("Couldn't find " + name);
                return;
            }
            if (item) {
                onChange(name, item, $(this))
                $(".menuOverlay").click();
            }
        });

    }
    refreshNames();
    return {
        refreshNames: refreshNames,
        getItem: getItem,
        saveItem: saveItem,
        saveAs: saveAs,
        deleteItem: deleteItem,
        setupOpenSelect: setupOpenSelect,
        setupOpenMenu: setupOpenMenu,
        getNames: getNames,
        clearAll: clearAll
    }
}
