function tabDisplay() {
    var activeTab = $(".tabHeader.active").attr("data-tabfor");
    $("[data-tab]").hide();
    $("[data-tab=" + activeTab + "]").show();
}
$(function() {
    $(".tabHeader").click(function() {
        $(".tabHeader").removeClass("active");
        $(this).addClass("active");
        tabDisplay();
    })
    $(".settingsIcon").click(function(){
        $(this).parents(".settings").addClass("active");
        $(".settingsOverlay").show();
    })
    $(".settingsOverlay").click(function(){
        $(".settings.active").removeClass("active");
        $(".settingsOverlay").hide();
    })
    tabDisplay();
})