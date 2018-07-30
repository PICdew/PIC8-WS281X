#!./dsl.js
"use strict";
function reg(adrs, value)
{
    this.adrs = adrs; this.value = value || 0;
    console.error(`reg 0x${adrs.toString(16)} = ${value }`);
}

const TRISA = new reg(0x91, 0xff);
const PORTA = new reg(0x11);
const TMR1 = new reg(0xc);
const T1IF = new reg(0x33);

include("file.h");

function main()
{
    TRISA = 0x3;
    PORTA = 0;
    for (;;)
    {
        PORTA ^= 0x1;
        wait_1sec();
    }
}

function wait_1sec()
{
    const LIMIT = Math.round(1000000 / 65536);
    const loop = new reg(0x70, LIMIT);
    while (loop-- > 0)
    {
        TMR1 = Math.round(1000000 / LIMIT);
        T1IF = 0;
        while (!T1IF);
    }
}


function include(filename)
{
    console.error(`ins '${filename}' contents here`);
}
/*
REPL?
function func1(v)
{
    return v + 3;
}

console.log("hello " + func1(4));

const a = [1, 2, 3];
a.forEach((v) => { console.log("loop: " + v); });

console.log(JSON.stringify(process.argv, null, "  "));

//console.log("previous: " + _);
//.help
//.load xyz.js
*/


//eof