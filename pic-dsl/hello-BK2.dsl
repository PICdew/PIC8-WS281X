#!./dsl.js -arg1 -arg2 #comment out this line for .load in Node.js REPL
//NOTE: console.log (stdout) goes to Javascript; use console.error (stderr) to go to screen without interference

//function include(filename) //must be defined before used in REPL
//{
//    console.log(`insert '${filename}' contents here`);
//}
#include("./hello-helper.dsl");
#include "./hello-helper.dsl";
#include "./hello-" + "helper.dsl"

function func1(v)
{
    return v + 3;
}

console.log("hello " + func1(4)); \
    console.log("bye");
#warning "message"
#warning ("hi")
#error `${func1(3+4)}`
#warning func1(5)

function main()
{
    const a = [1, 2, 3];
    a.forEach((v) => { console.error("loop: " + v + " " + func1(v)); });

    console.log("args: " + JSON.stringify(process.argv, null, "  "));
}

//REPL-only:
//console.log("previous: " + _);
//.help
//.load ./hello-helper.dsl

main();

//eof