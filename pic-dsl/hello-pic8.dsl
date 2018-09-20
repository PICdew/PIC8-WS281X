#!./pic8-dsl.js +debug +echo -DX -UX -DX=4 -DX="a b" +preproc +ast -run -reduce -codegen  #comment out this line for Node.js REPL .load command
//NOTE: console.log (stdout) goes to Javascript; use console.error (stderr) to go to screen without interference

//"use strict";
//require("magic-globals"); //__file, __line, __func, etc
//require("colors").enabled = true; //for console output; https://github.com/Marak/colors.js/issues/127
const JSON5 = require("json5");
console.log("opts: " + JSON5.stringify(opts));

#ifdef XYZ
 #warning `XYZ = '${XYZ}'`
#else
 #warning "no XYZ"
#endif
#define XYZ  hello
#ifdef XYZ
 #warning `XYZ = '${XYZ}'`
#else
 #warning "no XYZ"
#endif
#undef XYZ
#ifdef XYZ
 #warning `XYZ = '${XYZ}'`
#else
 #warning "no XYZ"
#endif


#include "pic16f1827.h"
//const TRISA_ADDR = 0x91, PORTA_ADDR = 0x11;
//function reg8(addr) { return {addr, }; }
//var TRISA = reg8(0x91), PORTA = reg8(0x11), TMR1, T1IF;
PIC.clock = 32 MHz;


#include("./hello-helper.dsl");
#include "./hello-helper.dsl";
//invalid #include ./hello-helper.dsl
#include "./hello-" + "helper.dsl" ;

console.log("hello " + simple_func(4)); \
    console.log("bye");
#warning "message"
#warning ("hi")
//#error `error# ${simple_func(3+4)}`
#warning `error# ${simple_func(3+4)}`.red_lt
#warning simple_func(5)

console.log("args: " + JSON.stringify(process.argv, null, "  "));

//const a = [1, 2, 3];
//a.forEach((v) => { console.error("loop: " + v + " " + simple_func(v)); });


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

#dump_macros //for debug only
//eof