#!/usr/bin/env node
//DSL parser for Javascript

"use strict";
require("colors").enabled = true; //for console output; https://github.com/Marak/colors.js/issues/127
//const thru2 = require("through2"); //https://www.npmjs.com/package/through2
//TODO: define custom op
console.error("dsl running ...".green_lt);
for (var a in process.argv)
    console.error(`arg[${a}/${process.argv.length}]: '${process.argv[a]}'`.blue_lt);


/////////////////////////////////////////////////////////////////////////////////
////
/// Inject (prepend) into command stream:
//

//const thru2 = require("through2"); //https://www.npmjs.com/package/through2

/*
function prepend()
{
    const retval = thru2(xform, flush); //{ objectMode: true, allowHalfOpen: false },
//    retval.infile = infile;
//    PreProc.latest = retval;
    retval.push("console.log(\"start\");");
    return retval;

    function xform(chunk, enc, cb)
    {
//        if (isNaN(++this.numlines)) this.numlines = 1;
        if (typeof chunk != "string") chunk = chunk.toString(); //TODO: enc?
//        chunk = chunk.replace(/[{,]\s*([a-z\d]+)\s*:/g, (match, val) => { return match[0] + '"' + val + '":'; }); //JSON fixup: numeric keys need to be quoted :(
//        inject.call(this);
        if (chunk.length)
        {
//            if (!this.buf) this.linenum = this.numlines;
//            this.buf = (this.buf || "") + chunk; //.slice(0, -1);
//console.error(`line ${this.numlines}: last char ${this.buf.slice(-1)}`);
            if (chunk.slice(-1) == "\\") //line continuation (mainly for macros)
            {
                if (chunk.indexOf("//") != -1) warn(`single-line comment on ${this.numlines} interferes with line continuation`);
  //              this.buf = this.buf.slice(0, -1);
                this.push(chunk.slice(0, -1)); //drop backslash and don't send newline
//                cb();
//                return;
            }
            else this.push(chunk + "\n"); //add line delimiter
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
        cb();
    }
    function x_inject()
    {
        if (this.injected) return;
        this.push("//top of file\n");
        this.injected = true; //once only
    }
}
*/


/////////////////////////////////////////////////////////////////////////////////
////
/// DSL stream transform:
//

//const REPL = require("repl");
const DuplexStream = require("duplex-stream"); //https://github.com/samcday/node-duplex-stream
const {spawn} = require("child_process");
const thru2 = require("through2"); //https://www.npmjs.com/package/through2
//const miss = require("mississippi"); //https://github.com/maxogden/mississippi

//wrap REPL as a Duplex stream so it can be used in a pipeline:
//stdin == script input, stdout == generated code, stderr == info/error info to screen
function DSL(filename)
{
    if (!filename) filename = "stdin"; //filename ||= "stdin";
    console.error(`reading from ${filename} ...`.green_lt);
//    const retval = thru2(xform, flush); //{ objectMode: true, allowHalfOpen: false },
//    retval.filename = filename;
//    console.log("thru2: " + JSON.stringify(retval, null, "  "));
//    PreProc.latest = retval;
/*
    const rdstrm = new Readable(
    {
        read(size)
        {

        }
    });
    const wrstrm = new Writable(
    {
        write(chunk, enc, cb)
        {
            if (typeof chunk != "string") chunk = chunk.toString(); //TODO: enc?
//            rdstrm.push("gotit: " + chunk + "\n");
            console.log("got: " + chunk);
        }
    });
    return wrstrm;
*/
//NOTE: use Duplex stream so input and output can be piped *independently* (they seem to be connected in a through stream)
//http://codewinds.com/blog/2013-08-31-nodejs-duplex-streams.html
//see https://nodejs.org/api/stream.html#stream_an_example_duplex_stream
/*
    const iostrm = new Duplex(
    {
//        allowHalfOpen: true, //automatically close write side when read side closes
//useful?        highWaterMark: TBD,
        read(size)
        {
            var retval;
            if (!this.buf) this.buf = ""; //this.buf ||= "";
            if (isNaN(++this.rdcount)) this.rdcount = 1;
            console.log(`get[${this.rdcount}]: ${arguments.length? size: "all"} of ${this.buf.length}`);
//            this.push((this.count <= 4)? `input[${this.count}]\n`: null);
//            [retval, this.buf] = arguments.length? [this.buf.slice(0, size), this.buf.slice(size)]: [this.buf, ""];
            this.push(retval); //enc?
        },
        write(chunk, enc, cb)
        {
            if (isNaN(++this.wrcount)) this.wrcount = 1;
            if (typeof chunk != "string") chunk = chunk.toString(); //TODO: enc?
  //          rdstrm.push("gotit: " + chunk + "\n");
            console.log(`got[${this.wrcount}]: ${chunk.length}:'${chunk.replace(/\n/gm, "\\n")}'`);
//            this.buf = (this.buf || "") + chunk;
            repl.stdin.push(chunk + "\n");
//            this.push(chunk + "\n");
            cb();
        },
    });
*/
    const repl = spawn("node", [],
    {
//        cwd: //inherits from parent
//        env: process.env, //redundant (default); inherits from parent
        stdio: ["pipe", "pipe", "inherit"], //https://stackoverflow.com/questions/34967278/nodejs-child-process-spawn-custom-stdio
    });
//    prepend(repl.stdin);
//debug:
    repl.on("error", (err) => { console.log(`repl error: ${err}`.red_lt)});
    repl.stdin.on("open", (data) => { console.log(`repl stdin open: ${typeof data}${data}`); });
    repl.stdin.on("error", (err) => { console.log(`repl stdin error: ${typeof err} ${err}`); });
    repl.stdin.on("done", (data) => { append(repl.stdin); console.log(`repl stdin done: ${typeof data} ${data}`); });
    repl.stdin.on("end", (data) => { console.log(`repl stdin end: ${typeof data} ${data}`); });
    repl.stdin.on("finish", (data) => { console.log(`repl stdin finish: ${typeof data} ${data}`); }); //for request, after end/flush
    repl.stdin.on("close", (data) => { console.log(`repl stdin close: ${typeof data} ${data}`); }); //NOTE: only for files

    repl.stdout.on("data", (data) => { console.log(`repl stdout data: ${typeof data} '${data.toString().replace(/\n/gm, "\\n")}'`); });
    repl.stdout.on("end", () => { console.log("repl stdout end"); });
    repl.stdout.on("close", (code) => { console.log(`repl stdout close: ${typeof code} ${code}`);});
//wrap repl so it can participate in pipeline:
    const iostrm = new DuplexStream(repl.stdout, repl.stdin); //CAUTION: swap stdin and stdout
    return iostrm;
//    const wrapper = new thru2(xform, flush);
//    wrapper.pipe(iostrm).pipe(wrapper);
//    return wrapper; //iostrm;

//    function prepend(strm)
//    {
//        strm.write("console.log(\"starting ...\");");
//    }
//    function append(strm)
//    {
//        strm.write("console.log(\"... ending\");");
//    }
/*
//    iostrm.pipe(repl.stdin);
//    repl.stdout.pipe(iostrm);
    if (finished) //not in older versions of Node.js?
    finished(iostrm, (err) =>
    {
        if (err) console.error(`duplex stream error: ${err}`.red_lt);
        else console.error("duplex stream done".green_lt);
    });
*/
//    console.log("io", JSON.stringify(iostrm, null, "  "));
//    return iostrm;
/*
    const repl = REPL.start(
    {
//    prompt: ">",
        Xeval: my_eval,
        Xwriter: my_out, //default util.inspect()
//        input: iostrm, //retval, //stdin,
//        output: iostrm, //retval, //stdout,
        XignoreUndefined: true, //don't want undef command return values
        XreplMode: REPL.REPL_MODE_STRICT,
    });
    repl.on("exit", () => { console.error("repl exit"); });
    repl.defineCommand("include",
    //function incl() { console.log("incl"); });
    {
        help: "embed another file contents here",
        action(filename)
        {
            this.clearBufferedCommand();
            console.log(`include '${filename}' here`);
            this.displayPrompt();
    //        this.close();
        }
    });
    return repl; //iostrm; //retval;
*/
/*
    function xform(chunk, enc, cb)
    {
//        if (isNaN(++this.numlines)) this.numlines = 1;
        if (typeof chunk != "string") chunk = chunk.toString(); //TODO: enc?
//        this.linenum = this.numlines;
//        console.log(`input[${this.linenum}]: '${chunk}'`);
//        this.push(/-*this.linenum + ": " +*-/ chunk + "\n");
        if (!this.prepended) { this.push("console.log(\"starting ...\");"); this.prepended = true; }
        cb(null, chunk);
    }
    function flush(cb)
    {
//        const now = new Date(); //Date.now();
//        if (this.buf) this.push(this.buf + "\\\n"); //reinstate line continuation char on last partial line
//TODO: why is this.numlines off by 1?
//        this.push(`//eof; lines: ${this.linenum || 0}, warnings: ${warn.count || 0}, errors: ${error.count || 0}, src: ${this.filename}, when: ${date2str()}\n`);
//        dump_macros();
//        this.push("console.log(\"... ending\");");
//        cb(null, "//EOF\n");
        cb(null, "console.log(\"... ending\");");
    }
*/
}


//example code from https://nodejs.org/api/repl.html
function my_eval(cmd, context, filename, callback)
{
    const os = require("os");
    const empty = "(" + os.EOL + ")"; //https://maxogden.com/node-repl.html
//    callback(null, cmd);
    let result;
    if (cmd === empty) return callback();
    try { result = eval(cmd); } //vm.runInThisContext(cmd); }
    catch (exc) { if (isRecoverableError(exc)) return callback(new repl.Recoverable(exc)); } //incomplete; get additional input
    callback(null, result);
}

//example code from https://nodejs.org/api/repl.html
function isRecoverableError(error)
{
    if (error.name === 'SyntaxError') return /^(Unexpected end of input|Unexpected token)/.test(error.message);
    return false;
}

//example code from https://nodejs.org/api/repl.html
function my_out(output)
{
    return output.toUpperCase();
}


function xDSL(infile)
{
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


/////////////////////////////////////////////////////////////////////////////////
////
/// Inject (append) into command stream:
//

//const thru2 = require("through2"); //https://www.npmjs.com/package/through2

/*
function append()
{
    const retval = thru2(xform, flush); //{ objectMode: true, allowHalfOpen: false },
//    retval.infile = infile;
//    PreProc.latest = retval;
    return retval;

    function xform(chunk, enc, cb)
    {
//        if (isNaN(++this.numlines)) this.numlines = 1;
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
            this.push(chunk + "\n"); //add line delimiter
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
        this.push("console.log(\"end\");");
        cb();
    }
    function x_inject()
    {
        if (this.injected) return;
        this.push("//top of file\n");
        this.injected = true; //once only
    }
}
*/


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
//repl.stdin.on("open", () =>
{
    const {spawn} = require("child_process");
    const pathlib = require("path");
    const fs = require("fs");
    const CWD = "";
//const {LineStream} = require('byline');
//    const infile = (process.argv.length > 2)? `'${pathlib.resolve(process.argv.slice(-1)[0])}'`: null;
    const infile = (process.argv.length > 2)? `'${pathlib.relative(CWD, process.argv.slice(-1)[0])}'`: null;
    const [instrm, outstrm] = [infile? fs.createReadStream(infile.slice(1, -1)): process.stdin, fs.createWriteStream("dj.txt")]; //process.stdout];
//if (instm.isTTY) instm = fs.createReadStream("build/ssr-ws281x.asm");
//fs.createReadStream(process.argv[2] || "(no file)")
//    if (false)
    instrm
//        .pipe(prepend())
//        .pipe(new LineStream({keepEmptyLines: true})) //preserve line#s for easier debug
//        .pipe(PreProc(infile))
        .pipe(DSL(infile))
//        .pipe(asm_optimize())
//        .pipe(CodeGen())
//    .pipe(text_cleanup())
//        .pipe(append())
        .pipe(outstrm)
        .on("data", (data) => { console.error(`data: ${data}`.blue_lt)})
        .on("finish", () => { console.error("finish".green_lt); })
        .on("close", () => { console.error("close".green_lt); })
        .on("done", () => { console.error("done".green_lt); })
        .on("end", () => { console.error("end".green_lt); })
        .on("error", err =>
        {
            console.error(`ERROR on line#${DSL.numlines}: ${err}`.red_lt);
            process.exit();
        });

/*
//GOOD:
    const repl = spawn("node", [], {stdio: ["pipe", "pipe", "inherit"]}); //https://stackoverflow.com/questions/34967278/nodejs-child-process-spawn-custom-stdio
    instrm.pipe(repl.stdin);
    repl.stdout.pipe(outstrm);
*/
//    instrm.on("open", function() //https://github.com/nodejs/node-v0.x-archive/issues/4030
//    setTimeout(
//    function()
//    {
//        const repl = spawn("node", [], {stdio: [instrm, outstrm, process.stderr]});
//    }, 2000);
//    DSL(infile);
//    setTimeout(function(){ console.log("timeout".yellow_lt); }, 2000);
//    if (infile) instrm.pipe(process.stdin);
    console.error("finish asynchronously".green_lt);
/*
//from https://docs.nodejitsu.com/articles/advanced/streams/how-to-use-stream-pipe/
    var myREPL = spawn('node');
    myREPL.stdout.pipe(outstrm, { end: false });
    instrm.resume();
    instrm.pipe(myREPL.stdin, { end: false });
    myREPL.stdin.on('end', function()
    {
        outstrm.write('REPL stream ended.');
    });
    myREPL.on('exit', function (code)
    {
        process.exit(code);
    });
*/
}//);

//eof