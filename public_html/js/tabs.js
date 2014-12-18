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
    $(".settingsIcon").hover(function() {
        $(this).next().show();
    },
            function() {
                $(this).next().hide();
            })
    tabDisplay();
})