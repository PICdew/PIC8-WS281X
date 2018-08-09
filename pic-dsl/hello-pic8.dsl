#!./pic8-dsl.js -Xrun -ast -Xecho -Xreduce -Xcodegen -debug
//"use strict";
//require("magic-globals"); //__file, __line, __func, etc
//require("colors").enabled = true; //for console output; https://github.com/Marak/colors.js/issues/127
console.log("opts: " + JSON5.stringify(opts));

//#include "pic16f1827.h"
var TRISA, PORTA, TMR1, T1IF;

//this function called by -run command-line arg:
function run()
{
//    console.error("dsl run ...".green_lt);
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


function simple_func(x) { return x + 4; }


//main entry point:
//(generator function only for debug/sim)
function* main()
{
    console.log("//this is added to src output");
    console.error("//this is not");
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

//eof