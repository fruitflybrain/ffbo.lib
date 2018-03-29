function ScriptLoader(func) {
    return function (script, i) {
        if (func !== undefined)
            func();
        if (i === undefined)
            i = 0;
        setTimeout( function() {
            script[i][1]();
            ++i;
            if (i === script.length)
                return;
            if (script[i][0] === null) {
                $("body").on( "demoproceed", function(event, e) {
                    $("body").off( "demoproceed" );
                    if (e === "success")
                        script_loader(script, i);
                    else
                        Notify("Stopping the demo due to the previous error...", null, null, 'danger');
                })
            } else
                script_loader(script, i);
        }, script[i][0] )
    }
}

function AutoTyper(element) {
    return function(str, second_element, speed) {
        return function () {
            var query_str = str;
            var i = 0, text;
            speed = speed || 80;
            (function type() {
                text = query_str.slice(0, ++i);
                element.value = text;
                element.focus();
                element.scrollLeft = element.scrollWidth;
                if (second_element !== undefined)
                    second_element.innerHTML += query_str[i-1];
                if (text === query_str) {
                    $("body").trigger("demoproceed","success")
                    return;
                }
                setTimeout(type, speed);
            }());
        }
    }
}

function checkOnMobile() {

    if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) )
        return true;
    else
        return false;
}
