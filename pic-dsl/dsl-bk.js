#!/usr/bin/env node
//Javascript-based DSL for 8-bit Microchip PIC
//NOTE: this is a static model only (for code gen), *not* a run-time model (ie, sim)
//However, #directives use static model properties, so Javascript objects are used to represent the model
//NOTE: macro pre-processor is *similar* to C pre-processor, but there are some differences

"use strict";
require("colors").enabled = true; //for console output; https://github.com/Marak/colors.js/issues/127
const thru2 = require("through2"); //https://www.npmjs.com/package/through2

//module.exports.Register = Register; //h/w model
module.exports.PreProc = PreProc; //macros
module.exports.CodeGen = CodeGen; //asm emitter


/////////////////////////////////////////////////////////////////////////////////
////
/// Preprocessor transform:
//

function PreProc(infile)
{
//define built-in macros:
    macro("define", `__FILE__ ${infile}`);
    macro("define", `__LINE__ function() { return PreProc.latest.linenum; }`);
    macro("define", `__COUNTER__ function() { if (isNaN(++PreProc.counter)) PreProc.counter = 1; return PreProc.counter; }`);
    macro("define", `__VA_ARGS__ function() { return "TBD": }`);

    const retval = thru2(xform, flush); //{ objectMode: true, allowHalfOpen: false },
    retval.infile = infile;
    PreProc.latest = retval;
    return retval;

    function xform(chunk, enc, cb)
    {
        if (isNaN(++this.numlines)) this.numlines = 1;
        if (typeof chunk != "string") chunk = chunk.toString(); //TODO: enc?
//        chunk = chunk.replace(/[{,]\s*([a-z\d]+)\s*:/g, (match, val) => { return match[0] + '"' + val + '":'; }); //JSON fixup: numeric keys need to be quoted :(
        if (chunk.length)
        {
            if (!this.buf) this.linenum = this.numlines;
            this.buf = (this.buf || "") + chunk; //.slice(0, -1);
//console.error(`line ${this.numlines}: last char ${this.buf.slice(-1)}`);
            if (chunk.slice(-1) == "\\") //line continuation (mainly for macros)
            {
                if (chunk.indexOf("//") != -1) warn(`single-line comment on ${this.numlines} interferes with line continuation`);
                this.buf = this.buf.slice(0, -1);
                cb();
                return;
            }
        }
        if (this.buf) //process or flush
        {
            var parts = this.buf.match(/^\s*#\s*([a-z0-9_]+)\s*(.*)\s*$/i);
            this.buf = parts? macro(parts[1], parts[2], this.linenum): macro(this.buf); //handle directives vs. expand macros
            if (this.buf) this.push(/*this.linenum + ": " +*/ this.buf + "\n");
            this.buf = null;
        }
        cb();
    }

    function flush(cb)
    {
        const now = new Date(); //Date.now();
        if (this.buf) this.push(this.buf + "\\\n"); //reinstate line continuation char on last partial line
//TODO: why is this.numlines off by 1?
        this.push(`//eof; lines: ${this.linenum || 0}, warnings: ${warn.count || 0}, errors: ${error.count || 0}, src: ${this.infile}, when: ${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()} ${now.getHours()}:${nn(now.getMinutes())}:${nn(now.getSeconds())}\n`);
//        dump_macros();
        cb();
    }
}


function macro(cmd, linebuf, linenum)
{
    var parts;
    if (arguments.length == 1) [cmd, linebuf] = [null, cmd];
//console.log("macro cmd " + cmd + ", line " + linenum);
    switch (cmd)
    {
//        case "define"
        case null: //expand macros
            for (;;) //keep expanding while there is more to do
            {
                var expanded = 0;
                for (var m in macro.defs || {})
                {
                    break;
                    if (macro.defs[m].arglist !== null) //with arg list
                        linebuf.replace()
                }
                break;
            }
            return linebuf;
        case "warning": //convert to console output (so that values will be expanded)
            if (!linebuf.match(/^`.*`$/)) linebuf = "`" + linebuf + "`";
            return `console.error(${linebuf});`;
        case "include":
            parts = linebuf.match(/^\s*("([^"]+)"|([^ ])\s?)/);
            if (!parts) return warn(`invalid include file '${linebuf}' on line ${linenum}`);
//            const [instrm, outstrm] = [infile? fs.createReadStream(infile.slice(1, -1)): process.stdin, process.stdout];
console.error(`read file '${parts[2] || parts[3]}' ...`);
            var contents = fs.readFileSync(parts[2] || parts[3]); //assumes file is small; contents needed in order to expand nested macros so just use sync read
            return contents;
        case "define": //save for later expansion
            if (!macro.defs) macro.defs = {};
            parts = linebuf.match(/^([a-z0-9_]+)\s*(\(\s*([^)]*)\s*\)\s*)?(.*)$/i);
            if (!parts) warn(`invalid macro definition ignored on line ${linenum}`);
            else if (macro.defs[parts[1]]) warn(`duplicate macro '${parts[1]}' definition (line ${linenum}, prior was ${macro.defs[parts[1]].linenum})`);
            else macro.defs[parts[1]] = {arglist: parts[3], body: parts[4], linenum};
            return; //no output
        default:
            warn(`ignoring unrecognized pre-processor directive '${cmd}' (line ${linenum})`);
            return linebuf;
    }
}


function dump_macros()
{
//    Object.keys(macro.defs || {}).forEach(m =>
    for (var m in macro.defs || {})
    {
        var has_args = macro.defs[m][0];
        console.error(`macro '${m.cyan_lt + "".blue_lt}': ${has_args? "(" + macro.defs[m].arglist + ")": ""} '${macro.defs[m].body} line ${macro.defs[m].linenum}'`.blue_lt);
    }
}


/////////////////////////////////////////////////////////////////////////////////
////
/// Code generator transform:
//

function CodeGen(ast)
{
    return thru2(xform, flush); //{ objectMode: true, allowHalfOpen: false },

    function xform(chunk, enc, cb)
    {
        if (isNaN(++this.numlines)) this.numlines = 1;
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
//        this.push(`//eof; lines: ${this.numlines || 0}, src: ${}, timestamp: ${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()} ${now.getHours()}:${nn(now.getMinutes())}:${nn(now.getSeconds())}`);
        cb();
    }
//    return JSON.stringify(ast, null, 2); //TODO: traverse, emit asm opcodes + directives
}


/////////////////////////////////////////////////////////////////////////////////
////
/// Helpers:
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


function nn(val) { return (val < 10)? "0" + val: val; }


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
        .pipe(new LineStream({keepEmptyLines: true})) //preserve line#s for easier debug
        .pipe(PreProc(infile))
//        .pipe(asm_optimize())
        .pipe(CodeGen())
//    .pipe(text_cleanup())
        .pipe(outstrm)
        .on("end", () => { console.error("done".green_lt); })
        .on("error", err =>
        {
            console.error(`ERROR on read#${PreProc.latest.numlines}: ${err}`.red_lt);
            process.exit();
        });
}


//eof