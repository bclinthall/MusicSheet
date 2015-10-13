/**
 * jQuery mousehold plugin - fires an event while the mouse is clicked down.
 * Additionally, the function, when executed, is passed a single
 * argument representing the count of times the event has been fired during
 * this session of the mouse hold.
 *
 * @author Remy Sharp (leftlogic.com)
 * @date 2006-12-15
 * @example $("img").mousehold(200, function(i){  })
 * @desc Repeats firing the passed function while the mouse is clicked down
 *
 * @name mousehold
 * @type jQuery
 * @param Number timeout The frequency to repeat the event in milliseconds
 * @param Function fn A function to execute
 * @cat Plugin
 */

jQuery.fn.mousehold = function(timeout, f) {
    if (timeout && typeof timeout == 'function') {
        f = timeout;
        timeout = 100;
    }
    if (f && typeof f == 'function') {
        var timer = 0;
        var fireStep = 0;
        return this.each(function() {
            jQuery(this).mousedown(function() {
                fireStep = 1;
                var ctr = 0;
                var t = this;
                timer = setInterval(function() {
                    ctr++;
                    f.call(t, ctr);
                    fireStep = 2;
                }, timeout);
            })

            clearMousehold = function() {
                clearInterval(timer);
                if (fireStep == 1)
                    f.call(this, 1);
                fireStep = 0;
            }

            jQuery(this).mouseout(clearMousehold);
            jQuery(this).mouseup(clearMousehold);
        })
    }
}

////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
/*
 * Copyright B. Clint Hall 2014-2015.  All rights reserved.
 * Contact the author to discuss licensing.  theaetetus7  gmail.com
*/
////////////////////////////////////////////////////////////////////////////////


function TabManager() {
    var thisTabManager = {};
    function verifySetup() {
        var verifyMsg = "";
        $(".tabContainer").each(function(index, item) {
            var tabContainer = $(item);
            var tabHeaderBar = tabContainer.children(".tabHeaderBar");
            var tabHeaders = tabHeaderBar.children(".tabHeaders");
            var tabBodies = tabContainer.children(".tabBodies");
            var msg = "";
            if (tabHeaderBar.length !== 1) {
                msg += tabHeaderBar.length + ' div.tabHeaderBar where there should be 1';
            }
            if (tabHeaders.length !== 1) {
                msg += msg == "" ? "" : ", \n\t"
                msg += tabHeaders.length + ' div.tabHeaders where there should be 1';
            }
            if (tabBodies.length !== 1) {
                msg += msg == "" ? "" : ", \n\t"
                msg += tabBodies.length + ' div.tabBodies where there should be 1';
            }
            var tabHeader = tabHeaders.children(".tabHeader");
            var tabBody = tabBodies.children(".tabBody");
            if (tabBody.length > tabHeader.length) {
                msg += msg == "" ? "" : ", \n\t"
                msg += "more div.tabBody than div.tabHeader"
            }
            if (tabBody.length < tabHeader.length) {
                msg += msg == "" ? "" : ", \n\t"
                msg += "fewer div.tabBody than div.tabHeader"
            }
            tabHeader = tabHeader.filter("[data-tab-id]");
            tabHeader.each(function(index, item) {
                var id = $(item).attr("data-tab-id");
                var sameId = tabHeaders.children(".tabHeader[data-tab-id=" + id + "]");
                if (sameId.length > 1) {
                    msg += msg == "" ? "" : ", \n\t"
                    msg += "more than one .tabHeader[data-tab-id=" + id + "]"
                }
                var body = tabBodies.children(".tabBody[data-tab-id=" + id + "]");
                if (body.length === 0) {
                    msg += msg == "" ? "" : ", \n\t"
                    msg += "no .tabBody[data-tab-id=" + id + "] to match the .tabHeader[data-tab-id=" + id + "]"
                }
            })
            tabHeaders.children(".tabHeader");
            tabBody = tabBody.filter("[data-tab-id]");
            tabBody.each(function(index, item) {
                var id = $(item).attr("data-tab-id");
                var sameId = tabBodies.children(".tabBody[data-tab-id=" + id + "]");
                if (sameId.length > 1) {
                    msg += msg == "" ? "" : ", \n\t"
                    msg += "more than one .tabBody[data-tab-id=" + id + "]"
                }
                var body = tabHeaders.children(".tabHeader[data-tab-id=" + id + "]");
                if (body.length === 0) {
                    msg += msg == "" ? "" : ", \n\t"
                    msg += "no .tabHeader[data-tab-id=" + id + "] to match the .tabBody[data-tab-id=" + id + "]"
                }
            })

            if (msg != "") {
                msg = 'In $(".tabContainer").eq(' + index + '), there are problems: \n\t' + msg + ".  "
                verifyMsg += msg;
            }
            var tabHeader = tabHeaders.children(".tabHeader:not([data-tab-id])");
            var tabBody = tabBodies.children(".tabBody:not([data-tab-id])");
            if (tabHeader.length === tabBody.length) {
                for (var i = 0; i < tabHeader.length; i++) {
                    var id = Math.random().toString(32).substr(2);
                    tabHeader.eq(i).attr("data-tab-id", id);
                    tabBody.eq(i).attr("data-tab-id", id);
                }
            }

        })
        if (verifyMsg)
            alert(verifyMsg);
        return verifyMsg == "";
    }
    var setupGood = verifySetup();
    if (!setupGood) {
        return;
    }


    function tabDisplay(tabContainers) {
        tabContainers.each(function(index, item) {
            var tc = $(item);
            var activeTab = tc.children(".tabHeaderBar").children(".tabHeaders").children(".tabHeader.active").attr("data-tab-id");
            tc.children(".tabBodies").children(".tabBody[data-tab-id]").hide();
            tc.children(".tabBodies").children(".tabBody[data-tab-id=" + activeTab + "]").show();
        })
    }
    function TabScroller() {
        function rightEdgeOfLastTab(tabHeaders) {
            var last = tabHeaders.children(".tabHeader").last();
            var rect = last[0].getBoundingClientRect();
            return rect.right;
        }
        function rightEdgeOfRightBtn(rightBtn) {
            return rightBtn.getBoundingClientRect().right;
        }
        function rightBtnHold() {
            var tabHeaders = $(this).siblings(".tabHeaders");
            var left = parseInt(tabHeaders.css("left"));
            console.log(left);
            // keep right edge of last tab from moving left of right edge of right btn;
            if (rightEdgeOfLastTab(tabHeaders) > rightEdgeOfRightBtn(this) - 3) {
                tabHeaders.css("left", left - 3 + "px");
            }
            showScrollButtons($(this).closest(".tabContainer"));
        }

        function leftEdgeOfFirstTab(tabHeaders) {
            var first = tabHeaders.children(".tabHeader").first();
            if (first[0]) {
                var rect = first[0].getBoundingClientRect();
                return rect.left;
            } else {
                return 0;
            }
        }
        function leftEdgeOfLeftBtn(rightBtn) {
            return rightBtn.getBoundingClientRect().left;
        }
        function leftBtnHold() {
            var tabHeaders = $(this).siblings(".tabHeaders");
            var left = parseInt(tabHeaders.css("left"));
            if (leftEdgeOfFirstTab(tabHeaders) < leftEdgeOfLeftBtn(this) + 3) {
                tabHeaders.css("left", left + 3 + "px");
            }
            showScrollButtons($(this).closest(".tabContainer"));
        }
        function showScrollButtons(tabContainer) {
            var tabHeaderBar = tabContainer.children(".tabHeaderBar");
            var tabHeaders = tabHeaderBar.children(".tabHeaders");
            var leftBtn = tabHeaderBar.children(".left.tabScrollControl")[0];
            var rightBtn = tabHeaderBar.children(".right.tabScrollControl")[0];
            if (leftEdgeOfFirstTab(tabHeaders) < leftEdgeOfLeftBtn(leftBtn)) {
                $(leftBtn).css("visibility", "visible");
            } else {
                $(leftBtn).css("visibility", "hidden");
            }

            if (rightEdgeOfLastTab(tabHeaders) > rightEdgeOfRightBtn(rightBtn)) {
                $(rightBtn).css("visibility", "visible");
            } else {
                $(rightBtn).css("visibility", "hidden");
            }

        }
        return {rightBtnHold: rightBtnHold, leftBtnHold: leftBtnHold, showScrollButtons: showScrollButtons};
    }
    var tabScroller = new TabScroller();
    function removeTab(tabContainer, id) {
        var tabHeader = tabContainer.children(".tabHeaderBar").children(".tabHeaders").children(".tabHeader[data-tab-id=" + id + "]");
        var tabBody = tabContainer.children(".tabBodies").children(".tabBody[data-tab-id=" + id + "]")
        var wasActive = tabHeader.hasClass("active");
        var next;
        if (wasActive) {
            next = tabHeader.next();
            if (next.length === 0) {
                next = tabHeader.prev();
            }
            next.click();
        }
        tabHeader.remove();
        tabBody.remove();
        tabScroller.showScrollButtons(tabContainer);
    }
    var tabHeaderBars = $(".tabHeaderBar");

    //scroll controls for tab headers
    tabHeaderBars.each(function(index, item) {
        var tabHeaderBar = $(item);
        var tabHeaders = tabHeaderBar.children(".tabHeaders");
        var tabHeader = tabHeaders.children(".tabHeader");
        var headerBarControls = tabHeaderBar.children(".headerBarControls");
        if (tabHeader.filter(".active").length !== 1) {
            tabHeader.removeClass("active");
            tabHeader.eq(0).addClass("active");

        }
        var leftStart = tabHeaders.attr("data-leftstart");
        var rightEnd = tabHeaders.attr("data-rightend");

        var leftBtn = $("<div>")
                .addClass("tabScrollControl left")
                .text("<")
                .css({"left": leftStart, "visibility": "hidden"})
                .prependTo(tabHeaderBar)
                .mousehold(10, tabScroller.leftBtnHold);
        if (parseInt(leftStart) > 0) {
            $("<div>")
                    .addClass("tabHeaderBarSpacer")
                    .css({left: 0, width: leftStart})
                    .prependTo(tabHeaderBar)
        }
        var rightBtn = $("<div>")
                .addClass("tabScrollControl right")
                .text(">")
                .css({"right": rightEnd, "visibility": "hidden"})
                .appendTo(tabHeaderBar)
                .mousehold(10, tabScroller.rightBtnHold);
        //headerBarControls.css("width", rightEnd);
        if (parseInt(rightEnd) > 0) {
            $("<div>")
                    .addClass("tabHeaderBarSpacer")
                    .css({right: 0, width: rightEnd})
                    .prependTo(tabHeaderBar)
        }
        tabDisplay(tabHeaderBar.closest(".tabContainer"));
    });

    function activate(tabContainer, tabId) {
        tabContainer.children(".tabHeaderBar").children(".tabHeaders").children(".tabHeader").removeClass("active");
        tabContainer.children(".tabHeaderBar").children(".tabHeaders").children(".tabHeader[data-tab-id=" + tabId + "]").addClass("active");
        tabDisplay(tabContainer);
        if(thisTabManager.afterActivation && thisTabManager.afterActivation[tabContainer[0]]){
            thisTabManager.afterActivation[tabContainer[0]]();
        }
    }
    $("body").on("click", ".tabHeader", function() {
        var tabContainer = $(this).closest(".tabContainer");
        var tabId = $(this).attr("data-tab-id");
        activate(tabContainer, tabId);
//        tabContainer.children(".tabHeaderBar").children(".tabHeaders").children(".tabHeader").removeClass("active");
//        $(this).addClass("active");
//        tabDisplay(tabContainer);
    })
    function newTab(tabContainer, tabLabel) {
        var id = Math.random().toString(32).substr(2);
        var tabHeaders = tabContainer.children(".tabHeaderBar").children(".tabHeaders");
        var tabBodies = tabContainer.children(".tabBodies");
        tabHeaders.children(".active[data-tab-id]").removeClass("active");
        var newHeader = $("<div>").addClass("tabHeader active").attr("data-tab-id", id).appendTo(tabHeaders);
        tabLabel = tabLabel || "New Tab " + id;
        $("<span>").addClass("tabLabel").text(tabLabel).appendTo(newHeader);
        /*$("<i>").addClass("removeTabBtn tabBtn").appendTo(newHeader).text("x").click(function(){
         var rmBtn = $(this);
         var id = rmBtn.closest(".tabHeader[data-tab-id]").attr("data-tab-id");
         var tabContainer = rmBtn.closest(".tabContainer");
         removeTab(tabContainer, id);
         });*/
        $("<div>").addClass("tabBody").attr("data-tab-id", id).appendTo(tabBodies);
        tabDisplay(tabContainer);
        tabScroller.showScrollButtons(tabContainer);
        return id;
    }
    function makeMenu(menuLabel) {
        var settingsDiv = $("<div>").addClass("settings");
        var menuLabelSpan = $("<span>").appendTo(settingsDiv);
        if (menuLabel) {
            menuLabelSpan.text(menuLabel).addClass("buttonMimic");
        } else {
            menuLabelSpan.addClass("settingsIcon")
            $("<i>").addClass("fa fa-cog fa-lg").appendTo(menuLabelSpan);
        }
        var menuContent = $("<div>").addClass("settingsDiv").appendTo(settingsDiv);
        menuLabelSpan.click(function() {
            settingsDiv.addClass("active");
            menuContent.position({
                my: "left top",
                at: "left bottom;",
                of: menuLabelSpan
            });
            var rect = menuContent[0].getBoundingClientRect();
            var winRect = $(this).closest(".tabContainer")[0].getBoundingClientRect();
            var menuTop = rect.top - winRect.top;
            var maxHeight = winRect.height - menuTop - 25;
            menuContent.css("max-height", maxHeight + "px");
            if (maxHeight < rect.height) {
                var moreIndicator = $("<div>")
                        .addClass("menuMoreIndicator")
                        .html("&#9660;")
                        .width(menuContent.width())
                        .appendTo(menuContent)
                        .css({left: rect.left, top: (maxHeight + rect.top + 5)})

            }
            console.log(rect, winRect, maxHeight);

            $(".settingsOverlay").show();
        });
        return settingsDiv;
    }
    $(".settingsOverlay").click(function() {
        $(".settings.active").removeClass("active");
        $(".settingsOverlay").hide();
        $(".menuMoreIndicator").remove();
    })
    $(".settings").on("click", function(e) {
        e.stopPropagation();
    })
    $(window).resize(function(){
        $(".tabContainer").each(function(index, item){
            tabScroller.showScrollButtons($(item));
        })
    })
    function tooltipSetup() {
        $("body").on("mouseenter", "[data-hint]", function() {
            var hint = $(this).attr("data-hint");
            var tooltipId = $(this).attr("data-tooltipid");
            if (!tooltipId) {
                tooltipId = Math.random().toString(32).substr(2);
                $(this).attr("data-tooltipid", tooltipId);
            }
            var tooltip = $("<div>").addClass("tooltip").attr("data-tooltipid", tooltipId).html(hint).appendTo(this);
            tooltip.position({
                my: "left top",
                at: "center bottom",/*"right+15px top",*/
                of: $(this)
            });
        })
        $("body").on("mouseleave", "[data-hint]", function() {
            var tooltipId = $(this).attr("data-tooltipid");
            $(".tooltip[data-tooltipid=" + tooltipId + "]").remove();
        })
    }
    function toast(msg) {
        $(".toastInner").text(msg);
        $(".toastOverlay").show().fadeOut(2000);

    }
    /*return{
        removeTab: removeTab,
        newTab: newTab,
        activate: activate,
        makeMenu: makeMenu,
        tooltipSetup: tooltipSetup,
        toast: toast
    }*/
        thisTabManager.removeTab= removeTab;
        thisTabManager.newTab= newTab;
        thisTabManager.activate= activate;
        thisTabManager.makeMenu= makeMenu;
        thisTabManager.tooltipSetup= tooltipSetup;
        thisTabManager.toast= toast;
        return thisTabManager;
    
}


