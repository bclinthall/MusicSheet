/* 
 * Copyright B. Clint Hall 2014-2015.  All rights reserved.
 * Contact the author to discuss licensing.  theaetetus7  gmail.com
 */


var tutorialEx = [
    {
        title: "MyStep 1",
        html: "<p>Click the button with the shift key pressed</p>",
        selector: ".testButton",
        event: "click",
        test: function(e){
            return e.shiftKey;
        }
    },
    {
        html: "<p>Click the button five times</p>",
        selector: ".testButton",
        event: "click",
        times: 5
    },
    {
        title: "MyStep 3",
        html: "<p>Type the letter d</p>",
        selector: "body",
        event: "keyup",
        test: function(e){
            return e.which === 68;
        }
    },
    {
        title: "Congrats",
        html: "<p>Great! You're done.  Click 'ok' to finish.</p><button class='endTutorial'>ok</button>",
        selector: ".endTutorial",
        event: "click",
    },
]

var TutorialEngine = function(tutorialOutline, tutorialStartButton, onStart, onEnd){
    var step;
    var tutorialDiv;
    var tutorialBody;
    var tutorialHead;
    var tutorialCountDiv;
    var timesDone;
    function test(e){
        var thisStep = tutorialOutline[step];
        if(!thisStep.test || (thisStep.test && thisStep.test(e))){
            timesDone++;
            if(thisStep.times>1){
                tutorialCountDiv.text("Good, you've done it " + (timesDone) + " times. We will continue after you've done it " + (thisStep.times - timesDone) + " more times.")
            }
        }
        if(timesDone>=thisStep.times){
            setupStep(step+1);
        }
    }
    function setupStep(newStep){
        if(newStep>=tutorialOutline.length){
            end();
            return;
        }
        tearDownStep();
        step = newStep;
        var thisStep = tutorialOutline[step];
        thisStep.times = thisStep.times || 0;
        timesDone = 0;
        tutorialHead.html(thisStep.title || "Step " + (step+1));
        tutorialBody.html(thisStep.html);
        $("html").on(thisStep.event, thisStep.selector, test);
    }
    function tearDownStep(){
        if(!isNaN(step)){
            var thisStep = tutorialOutline[step];
            $("html").off(thisStep.event, thisStep.selector, test);
        }
        tutorialCountDiv.empty();
    }
    function run(){
        if(tutorialStartButton && tutorialStartButton.hide){
            tutorialStartButton.hide();
        }
        tutorialDiv = $("<div>").addClass("tutorialDiv").appendTo("body");
        var tutorialSelect = $("<select>").addClass("tutorialSelect").appendTo(tutorialDiv);
        tutorialHead = $("<h1>").addClass(tutorialHead).appendTo(tutorialDiv);
        tutorialBody = $("<div>").addClass("tutorialBody").appendTo(tutorialDiv);
        tutorialCountDiv = $("<div>").addClass("tutorialCount").appendTo(tutorialDiv);
        for(var i=0; i<tutorialOutline.length; i++){
            $("<option>").text(tutorialOutline[i].title || "Step " + (i+1)).appendTo(tutorialSelect);
        }
        $("<option>").text("Close Tutorial").appendTo(tutorialSelect);
        tutorialSelect.change(function(){
            var selected = tutorialSelect[0].selectedIndex;
            setupStep(selected);
        })
        setupStep(0);
        if(onStart){
            onStart();
        }
    }
    function end(){
        tearDownStep();
        tutorialDiv.remove();
        if(tutorialStartButton && tutorialStartButton.show){
            tutorialStartButton.show();
        }
        if(onEnd){
            onEnd();
        }
    }
    if(tutorialStartButton && tutorialStartButton.click){
        tutorialStartButton.click(run)
    }
    return {run: run, end: end, goToStep: setupStep}
}