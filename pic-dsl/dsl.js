#!/usr/bin/env node
//DSL parser for Javascript

"use strict";
require("colors").enabled = true; //for console output; https://github.com/Marak/colors.js/issues/127
//const thru2 = require("through2"); //https://www.npmjs.com/package/through2
console.error("dsl running ...".green_lt);
for (var a in process.argv)
    console.error(`arg[${a}/${process.argv.length}]: '${process.argv[a]}'`.blue_lt);


/////////////////////////////////////////////////////////////////////////////////
////
/// DSL wrapper:
//


const DSL =
module.exports.DSL =
function DSL(filename, prefix, suffix)
{
    pipeline.pipe(fixups());
    return pipeline;
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
/// Fix up syntax before processing by Node.js:
//

const DuplexStream = require("duplex-stream"); //https://github.com/samcday/node-duplex-stream
const thru2 = require("through2"); //https://www.npmjs.com/package/through2
const {Writable} = require("stream");
const {LineStream} = require('byline');

function fixups(prefix, suffix)
{
    const in = new Writable(), out = new Writable;
    in
        .pipe(new LineStream({keepEmptyLines: true})) //preserve line#s (for easier debug)
        .pipe(thru2(xform, flush)) //{ objectMode: true, allowHalfOpen: false },
        .pipe(out);
//    retval.infile = infile;
//    PreProc.latest = retval;
    return new DuplexStream(out, in); //return endpts; CAUTION: swap in + out

    function xform(chunk, enc, cb)
    {
        prepend.call(this);
        if (isNaN(++this.numlines)) this.numlines = 1;
        if (typeof chunk != "string") chunk = chunk.toString(); //TODO: enc?
//        chunk = chunk.replace(/[{,]\s*([a-z\d]+)\s*:/g, (match, val) => { return match[0] + '"' + val + '":'; }); //JSON fixup: numeric keys need to be quoted :(
//        inject.call(this);
        if (chunk.length)
        {
//            if (!this.buf) this.linenum = this.numlines;
//            this.buf = (this.buf || "") + chunk; //.slice(0, -1);
//console.error(`line ${this.numlines}: last char ${this.buf.slice(-1)}`);
//            if (chunk.slice(-1) == "\\") //line continuation (mainly for macros)
//            {
//                if (chunk.indexOf("//") != -1) warn(`single-line comment on ${this.numlines} interferes with line continuation`);
  //              this.buf = this.buf.slice(0, -1);
//                this.push(chunk.slice(0, -1)); //drop backslash and don't send newline
//                cb();
//                return;
//            }
//            else
            this.linenum = this.numlines;
//TODO: define custom op
            this.push(this.linenum + ". " + chunk + "\n"); //add line delimiter
        }
//        if (this.buf) //process or flush
////        {
//            var parts = this.buf.match(/^\s*#\s*([a-z0-9_]+)\s*(.*)\s*$/i);
//            this.buf = parts? macro(parts[1], parts[2], this.linenum): macro(this.buf); //handle directives vs. expand macros
//            if (this.buf) this.push(/-*this.linenum + ": " +*-/ this.buf + "\n");
//            this.buf = null;
//        }
//        this.push(chunk);
        cb();
    }
    function flush(cb)
    {
//        inject.call(this);
//        const now = new Date(); //Date.now();
//        if (this.buf) this.push(this.buf + "\\\n"); //reinstate line continuation char on last partial line
//TODO: why is this.numlines off by 1?
//        this.push(`//eof; lines: ${this.linenum || 0}, warnings: ${warn.count || 0}, errors: ${error.count || 0}, src: ${this.infile}, when: ${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()} ${now.getHours()}:${nn(now.getMinutes())}:${nn(now.getSeconds())}\n`);
//        dump_macros();
//        this.push("console.log(\"end\");");
        append.call(this);
        cb();
    }
    function prepend()
    {
        if (this.prepended) return; //only do once
        this.push(prefix || "console.log(\"code start\");\n");
        this.prepended = true;
    }
    function append()
    {
        prepend.call(this); //in case not done yet
        this.push(suffix || "console.log(\"code end\");\n");
    }
}


/////////////////////////////////////////////////////////////////////////////////
////
/// Helper functions:
//

function error(msg)
{
    if (isNaN(++error.count)) error.count = 1;
    console.error(("[ERROR] " + msg).red_lt);
}


function warn(msg)
{   
    if (isNaN(++warn.count)) warn.count = 1;
    console.error(("[WARNING] " + msg).yellow_lt);
}


//NOTE: hard-coded date/time fmt
function date2str(when)
{
    if (!when) when = new Date(); //when ||= new Date(); //Date.now();
    return `${when.getMonth() + 1}/${when.getDate()}/${when.getFullYear()} ${when.getHours()}:${nn(when.getMinutes())}:${nn(when.getSeconds())}`;
}


function nn(val) { return (val < 10)? "0" + val: val; }


/*
var original = require.extensions['.js']
require.extensions['.js'] = function(module, filename) {
  if (filename !== file) return original(module, filename)
  var content = fs.readFileSync(filename).toString()
  module._compile(stripBOM(content + replCode), filename)
}
*/


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
    console.error(`DSL: reading from ${filename || "stdin"} ...`.green_lt);
    const [instrm, outstrm] = [infile? fs.createReadStream(filename.slice(1, -1)): process.stdin, process.stdout]; //fs.createWriteStream("dj.txt")];
    instrm
//        .pipe(prepend())
//        .pipe(new LineStream({keepEmptyLines: true})) //preserve line#s (for easier debug)
//        .pipe(PreProc(infile))
//        .pipe(fixups())
        .pipe(DSL(filename))
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
    console.error("DSL: finish asynchronously".green_lt);
}

//eof