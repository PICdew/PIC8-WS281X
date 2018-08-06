#!/usr/bin/env node
//Javascript-based PIC DSL

"use strict";
const {DSL} = require("./dsl.js");


/////////////////////////////////////////////////////////////////////////////////
////
/// PIC DSL stream wrapper:
//

const DuplexStream = require("duplex-stream"); //https://github.com/samcday/node-duplex-stream
//const thru2 = require("through2"); //https://www.npmjs.com/package/through2
const {/*Readable, Writable,*/ PassThrough} = require("stream");


const PIC8_DSL =
module.exports.PIC8_DSL =
function PIC8_DSL(opts) //{filename, replacements, prefix, suffix}
{
    if (!opts) opts = {};
//TODO: define custom ops
    const instrm = new PassThrough(); //wrapper end-point
//    const instrm = new LineStream({keepEmptyLines: true}); //preserve line#s (for easier debug)
    var outstrm = instrm
        .pipe(new DSL(opts));
    return new DuplexStream(outstrm, instrm); //return endpts for more pipelining; CAUTION: swap in + out
}


/////////////////////////////////////////////////////////////////////////////////
////
/// Code generator:
//

const toAST = require("to-ast"); //https://github.com/devongovett/to-ast

const CodeGen =
module.exports.CodeGen =
function CodeGen(func)
{
    console.log(JSON.stringify(toAST(func), null, "  "));
//    recursively walk ast;
//    for each function call, add func to list
    if (func.toString().match(/main/))
        console.log(CodeGen(wait_1sec));
//look up regs; track bank/page
//emit asm
}


/////////////////////////////////////////////////////////////////////////////////
////
/// Unit test/command-line interface:
//

if (!module.parent) //auto-run CLI
{
//    const {LineStream} = require('byline');
    const pathlib = require("path");
    const fs = require("fs");
    const CWD = "";
    const filename = (process.argv.length > 2)? `'${pathlib.relative(CWD, process.argv.slice(-1)[0])}'`: null;
    console.error(`PIC8-DSL: reading from ${filename || "stdin"} ...`.green_lt);
    const [instrm, outstrm] = [filename? fs.createReadStream(filename.slice(1, -1)): process.stdin, process.stdout]; //fs.createWriteStream("dj.txt")];
    instrm
//        .pipe(prepend())
//        .pipe(new LineStream({keepEmptyLines: true})) //preserve line#s (for easier debug)
//        .pipe(PreProc(infile))
//        .pipe(fixups())
        .pipe(PIC8_DSL({filename, debug: true, run: "main"}))
//        .pipe(asm_optimize())
//    .pipe(text_cleanup())
//        .pipe(append())
        .pipe(outstrm)
//        .on("data", (data) => { console.error(`data: ${data}`.blue_lt)})
        .on("finish", () => { console.error("finish".green_lt); })
        .on("close", () => { console.error("close".green_lt); })
        .on("done", () => { console.error("done".green_lt); })
        .on("end", () => { console.error("end".green_lt); })
        .on("error", err =>
        {
            console.error(`error: ${err}`.red_lt);
            process.exit();
        });
    console.error("PIC8-DSL: finish asynchronously".green_lt);
}

//eof