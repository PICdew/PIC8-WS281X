# PIC8-WS281X
Use an 8-bit Microchip PIC (8 MIPS) to decode WS281X data stream and control DIYC SSRs (8 channels dedicated or 56 channels chipiplexed), send to other WS281X data streams, etc.

*work in progress
details TBD


#refs
DIY compiler: http://lisperator.net/pltut/

DSL rationale:
http://strd6.com/2012/12/dsls-in-coffeescript/

#resources/examples
astexplorer.net

https://hacks.mozilla.org/2013/05/compiling-to-javascript-and-debugging-with-source-maps/

http://zaa.ch/jison/
http://zaa.ch/jison/try/usf/index.html

http://www.algo-prog.info/ocapic/web/index.php?id=ocapic

https://reasonml.github.io/docs/en/faq.html

https://www.npmjs.com/package/rollup

http://nicolasgallagher.com/custom-css-preprocessing/

https://github.com/camshaft/coffee-dsl

https://medium.com/@jbscript/intro-to-peg-js-writing-parsers-for-custom-dsls-28376a081e1b

https://jlongster.com/Stop-Writing-JavaScript-Compilers--Make-Macros-Instead

https://medium.com/byteagenten/conditional-compilation-for-javascript-using-babel-5a6db5964422

codemods:
https://webcache.googleusercontent.com/search?q=cache:lRp8k8BTWioJ:https://www.toptal.com/javascript/write-code-to-rewrite-your-code+
jscodeshift:
https://github.com/facebook/jscodeshift/wiki/jscodeshift-Documentation

#options
cpp -P -H: https://news.ycombinator.com/item?id=14296225

https://pegjs.org/

http://mcpp.sourceforge.net/

https://github.com/andrei-markeev/ts2c

https://haxe.org/

https://github.com/PaulBernier/castl

https://github.com/acornjs/acorn

https://glot.io/

https://tomassetti.me/antlr-mega-tutorial/

https://stackoverflow.com/questions/13171616/c-parser-in-javascript
http://clang.llvm.org/

https://www.npmjs.com/package/ast-source

https://superdevelopment.com/2017/07/24/asts-and-javascript-write-code-that-writes-code/

http://www.syntaxsuccess.com/viewarticle/javascript-ast

#other:
from http://sriku.org/blog/2012/04/14/creating-dsls-in-javascript-using-j-expressions/
function render(show, duration_ms) {
    var startTime_ms = Date.now();
    requestAnimationFrame(function () {
        var t = Date.now() - startTime_ms;
        context.draw(show(t));
        if (t < duration_ms) {
            requestAnimationFrame(arguments.callee);
        }
    });
}
function delay(show, dt_ms) {
    return function (t) {
        return show(t - dt_ms);
    };
}

function cut(when, show1, show2) {
    return function (t) {
        return (t < when ? show1 : show2)(t);
    };
}
