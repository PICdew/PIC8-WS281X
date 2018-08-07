#!./dsl.js -run -echo -Xast -debug
//"use strict";
//require("magic-globals"); //__file, __line, __func, etc
//require("colors").enabled = true; //for console output; https://github.com/Marak/colors.js/issues/127
//const RUN = false; //debug/sim vs. code gen
//function* wrapper(){

RUN_TIME(function(){
//const {step} = require("./dsl.js");
//module.exports.run =
//function()
//{
//    const {step, walkAST} = require("./dsl.js");
    var ticker = 
    setInterval(function() //simulate timer 1
    {
        T1IF = 1;
        if (isNaN(++this.count)) this.count = 1;
        console.error(`tick#${this.count}`);
        if (this.count > 5 * 1000/65.536) stop_timer(); //free up event loop for clean exit after 5 sec
    }, 65.536);
//    step(main); //run (sim); for logic debug only
    function stop_timer()
    {
        clearInterval(ticker);
        ticker = null;
    }
});


COMPILE_TIME(function*(){
//#include "pic16f1827.h"
var TRISA, PORTA, TMR1, T1IF;
//if (RUN)
/*
//const {step} = require("./dsl.js");
module.exports.run =
function()
{
//    const {step, walkAST} = require("./dsl.js");
    var ticker = 
    setInterval(function() //simulate timer 1
    {
        T1IF = 1;
        if (isNaN(++this.count)) this.count = 1;
        console.error(`tick#${this.count}`);
        if (this.count > 5 * 1000/65.536) stop_timer(); //free up event loop for clean exit after 5 sec
    }, 65.536);
    step(main); //run (sim); for logic debug only
    function stop_timer()
    {
        clearInterval(ticker);
        ticker = null;
    }
}
*/


//module.exports.execode = function*(){

function simple_func(x) { return x + 4; }
//function wrapper() { main(); }


function* main()
{
    TRISA = 0x3;
    PORTA = 0;
    for (;;)
    {
        PORTA ^= 0x1;
        console.error(`PORTA = ${PORTA}`);
        yield* wait_1sec();
    }
}

function* wait_1sec()
{
    const LIMIT = Math.round(1000000 / 65536);
    var loop = LIMIT; //PIC.Reg({value: LIMIT}); //shared RAM 0x70

    while (loop-- > 0)
    {
//        console.error(`loop = ${loop}`);
        TMR1 = Math.round(1000000 / LIMIT);
        T1IF = 0;
        while (!T1IF) yield step; //process.nextTick();
    }
}


yield* main(); });

//}
//const {step, walkAST} = require("./dsl.js");
//yield* main();
//}
//const gen = main();
//walkAST("wait_1sec", "wait_1sec");
//if (RUN)
//    step(wrapper); //run (sim); for logic debug only
//else
//    walkAST("wrapper"); //, true); //{type: "CallExpression", callee: {type: "Identifier", name: "main"}, arguments: []});
//    walkAST("wrapper"); //"simple_func"); //"main");

//eof