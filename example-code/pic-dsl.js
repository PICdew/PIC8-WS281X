#!/usr/bin/env node
//Javascript-based DSL for 8-bit Microchip PIC
//NOTE: this is a static model only (for code gen), *not* a run-time model (ie, sim)

"use strict";
require("colors").enabled = true; //for console output; https://github.com/Marak/colors.js/issues/127
const thru2 = require("through2"); //https://www.npmjs.com/package/through2

module.exports.Register = Register; //h/w model
module.exports.PreProc = PreProc;
module.exports.CodeGen = CodeGen;


/////////////////////////////////////////////////////////////////////////////////
////
/// Static representation (h/w model):
//

//ctor
function Register(opts)
{
    if (!(this instanceof Register)) return new Register(opts);
    this.opts = opts || {};
}
//sub-registers:
Register.prototype.BitOf = function(bits)
{
    return new Register(Object.assign({}, this.opts, {bits}));
}
/* BROKEN
//https://github.com/devongovett/to-ast
Register.prototype.toAST = function()
{
    const retval =
    {
        type: "Register",
        addr: this.addr,
        bits: this.bits,
//        value: this.value, //no need for initial value?
    };
    return retval;
}
*/


/////////////////////////////////////////////////////////////////////////////////
////
/// Preprocessor transform:
//

function PreProc(infile)
{
    const retval = thru2(xform, flush); //{ objectMode: true, allowHalfOpen: false },
    retval.infile = infile;
    PreProc.latest = retval;
    return retval;

    function xform(chunk, enc, cb)
    {
        if (isNaN(++this.linenum)) this.linenum = 1;
        if (typeof chunk != "string") chunk = chunk.toString(); //TODO: enc?
//        chunk = chunk.replace(/[{,]\s*([a-z\d]+)\s*:/g, (match, val) => { return match[0] + '"' + val + '":'; }); //JSON fixup: numeric keys need to be quoted :(
        if (chunk.length)
        {
            if (!this.buf) this.buf = "";
            this.buf += chunk;
            if (this.buf.slice(-1) == "\\") { this.buf = this.buf.slice(0, -1); return; } //line continuation
            this.push(this.linenum + ": " + this.buf + "\n");
            this.buf = null;
        }
        cb(); //null, chunk);
    }

    function flush(cb)
    {
        const now = new Date(); //Date.now();
        if (this.buf) this.push(this.buf + "\\"); //reinstate line continuation char on last partial line
        this.push(`//eof; lines: ${this.linenum || 0}, src: ${this.infile}, timestamp: ${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()} ${now.getHours()}:${nn(now.getMinutes())}:${nn(now.getSeconds())}`);
        cb();
    }
}


function nn(val) { return (val < 10)? "0" + val: val; }


/////////////////////////////////////////////////////////////////////////////////
////
/// Code generator transform:
//

function CodeGen(ast)
{
    return thru2(xform, flush); //{ objectMode: true, allowHalfOpen: false },

    function xform(chunk, enc, cb)
    {
        if (isNaN(++this.linenum)) this.linenum = 1;
        if (typeof chunk != "string") chunk = chunk.toString(); //TODO: enc?
//        chunk = chunk.replace(/[{,]\s*([a-z\d]+)\s*:/g, (match, val) => { return match[0] + '"' + val + '":'; }); //JSON fixup: numeric keys need to be quoted :(
        if (chunk.length)
        {
            this.push(chunk); //+ "\n");
        }
        cb(); //null, chunk);
    }

    function flush(cb)
    {
//        this.push(`//eof; lines: ${this.linenum || 0}, src: ${}, timestamp: ${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()} ${now.getHours()}:${nn(now.getMinutes())}:${nn(now.getSeconds())}`);
        cb();
    }
//    return JSON.stringify(ast, null, 2); //TODO: traverse, emit asm opcodes + directives
}


/////////////////////////////////////////////////////////////////////////////////
////
/// Unit test/command-line interface:
//

const fs = require("fs");
const {LineStream} = require('byline');

if (!module.parent) //auto-run CLI
{
    const infile = (process.argv.length > 2)? `'${process.argv.slice(-1)[0]}'`: null;
    console.error(`reading from ${infile || "stdin"} ...`.green_lt);
    const [instrm, outstrm] = [infile? fs.createReadStream(infile.slice(1, -1)): process.stdin, process.stdout];
//if (instm.isTTY) instm = fs.createReadStream("build/ssr-ws281x.asm");
//fs.createReadStream(process.argv[2] || "(no file)")
    instrm
        .pipe(new LineStream()) //{keepEmptyLines: false}))
        .pipe(PreProc(infile))
//        .pipe(asm_optimize())
        .pipe(CodeGen())
//    .pipe(text_cleanup())
        .pipe(outstrm)
        .on("end", () => { console.error("done".green_lt); })
        .on("error", err =>
        {
            console.error(`ERROR on read#${PreProc.latest.linenum}: ${err}`.red_lt);
            process.exit();
        });
}


//eof
