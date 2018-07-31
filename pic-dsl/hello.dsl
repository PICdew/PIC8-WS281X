#!./dsl.js
"use strict";

include("file.h");


function include(filename)
{
    console.error(`ins '${filename}' contents here`);
}


function func1(v)
{
    return v + 3;
}

console.log("hello " + func1(4));

const a = [1, 2, 3];
a.forEach((v) => { console.log("loop: " + v); });

console.log("args: " + JSON.stringify(process.argv, null, "  "));

//REPL-only:
console.log("previous: " + _);
.help
.load ./hello-helper.dsl


//eof