#!/usr/bin/env node
//Streaming Regex-based macro preprocessor

"use strict";

require("magic-globals"); //__file, __line, __stack, __func, etc
require("colors").enabled = true; //for console output; https://github.com/Marak/colors.js/issues/127

const fs = require("fs");
const vm = require("vm"); //https://nodejs.org/api/vm.html
const pathlib = require("path"); //NOTE: called it something else to reserve "path" for other var names
//const JSON5 = require("json5"); //more reader-friendly JSON; https://github.com/json5/json5
const XRegExp = require("xregexp"); //https://github.com/slevithan/xregexp
const CaptureConsole = require("capture-console"); //https://github.com/joepie91/node-combined-stream2
//const debug = //TODO

//streams:
const EventEmitter = require('events');
//TODO? const miss = require("mississippi"); //stream utils
const thru2 = require("through2"); //https://www.npmjs.com/package/through2
const byline = require('byline'); //, {LineStream} = byline;
//kludge: LineStream() generates extra linefeeds when piped, so use wraper function API instead:
//NO WORKY: function LineStream(opts)
//{
//    if (!(this instanceof LineStream)) return new LineStream(opts);
////                .pipe(createStream(new shebang(opts), {keepEmptyLines: true}))
//    const instrm = new PassThrough(); //inner end-point
//    const outstrm = createStream(instrm, {keepEmptyLines: true, });
//    return new Duplex(outstrm, instrm); //return end-point wrapper so caller can use pipe(); CAUTION: swap in + out
//}
//const RequireFromString = require('require-from-string');
const DuplexStream = require("duplex-stream"); //https://github.com/samcday/node-duplex-stream
const CombinedStream = require("combined-stream2"); //
const {Readable, /*Writable, Duplex,*/ PassThrough} = require("stream");
const Duplex = DuplexStream; //TODO: API is different
//see also https://medium.freecodecamp.org/node-js-streams-everything-you-need-to-know-c9141306be93
//const {echo_stream} = require("./dsl.js");

//regex notes:
//https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
//https://stackoverflow.com/questions/7376238/javascript-regex-look-behind-alternative
//(?:x)  non-capturing match
//x(?=y)  positive lookahead
//x(?!y)  negative lookahead
//x(?<=y)  positive lookbehind
//x(?<!y)  negative lookbehind

//wrapper for real debug function:
//NOTE: Array.isArray throws on non-objects so use duck typing instead
//TODO: create debug output /xform stream?
const debug =
module.exports.debug =
function debug(args)
{
    if (!debug.nested) throw `debug(): hoisting error`.red_lt;
    return debug.nested.apply(debug, unshift_fluent(Array.from(arguments), +1)); //insert depth arg
//    debug.depth = 0; //reset for next time
}
Object.defineProperty(debug, "enabled",
{
    enumerable: true,
    get() { return this.bufs; }, //TODO: debug.enabled.push()/pop()?
    set(onoff) //pass [] to enable buffering
    {
//console.error(`debug.enabled <- ${typeof onoff} ${JSON5.stringify(onoff)} ${srcline()}`.blue_lt);
//console.error(JSON5.stringify(this.bufs, null, "  "), srcline());
        if (/*Array.isArray*/ (this.bufs || {}).forEach) this.bufs.forEach((args) => console.error.apply(console, args)); //flush buffers; duck typing
        this.bufs = onoff; //Array.isArray(onoff)? onoff: ; //? (this.bufs || []): null; //turn buffering on/off
    },
});
debug.enabled = []; //collect output until caller decides
//real debug function:
//"depth" compensates for nested calls
//Object.defineProperty(debug, "nested", //prevent accident overwrite
debug.nested =
function debug_nested(depth, args)
{
    if (!debug.enabled) return;
//    console.error.apply(console, shift_fluent(push_fluent(Array.from(arguments), srcline(depth))); //NOTE: stderr keeps diagnostics separate from preprocessor output (stdout)
//    return debug_nested; //fluent
    if (isNaN(++depth)) depth = 1;
//    args = Array.from(arguments).shift_fluent()/*drop depth*/.push_fluent(srcline(depth));
    args = push_fluent(shift_fluent(Array.from(arguments)), srcline(depth)); //exclude depth, append srcline info
//if (!Array.isArray(args)) throw "bad ary".red_lt;
    if (/*Array.isArray*/ (debug.enabled || {}).push) debug.enabled.push(args); //CAUTION: assumes arg refs won't change before flush
    else console.error.apply(console, args); //NOTE: use stderr to keep diagnostics separate from preprocessor output (stdout)
}
//append args to previous debug entry:
debug.more =
function debug_more(args)
{
    if (!debug.enabled) return;
    else if (/*Array.isArray*/ (debug.enabled || {}).top)
    {
        const debtop = debug.enabled.top;
//(?:x)  non-capturing match
//x(?=y)  positive lookahead
//x(?!y)  negative lookahead
//x(?<=y)  positive lookbehind
//x(?<!y)  negative lookbehind
//(?: . (?! (?<! \\\\ ) \\k<quotype> ))  #exclude escaped quotes; use negative lookahead because it's not a char class
        const DEDUPFILE_xre = XRegExp(`
            (?: ^ | , ) \\s*  #delimeter
            (?<first_file> [^:]+ ) : (?<first_line> [^,]+ ) ,  #first srcline()
            \\k<first_file> : (?<second_line> [^,]+ )  #second srcline()
            `, "gx");
        debtop.splice.apply(debtop, splice_fluent(Array.from(arguments), 0, 0, -1, 0)); //insert args ahead of trailing srcline(); CAUTION: assumes extensions() already called
        debtop.top = `${debtop.top},${srcline(+1)}`.replace(DEDUPFILE_xre, "$<first_file>:$<first_line>:$<second_line>"); //add additional srcline, coalesce dupl file names; kludge: +1 nesting level
    }
    else throw `debug.more: buffering not enabled ${srcline()}`.red_lt; //console.error.apply(console, args); //NOTE: use stderr to keep diagnostics separate from preprocessor output (stdout)
}
//debug.enabled = []; //collect output until debug option is decided
//debug_nested(0, "hello 0");
//debug_nested(1, "hello 1");
//debug_nested(2, "hello 2");
//debug("hello");

//CaptureConsole.startCapture(process.stdout, (outbuf) => { debug("regurge:", outbuf.replace(/\n/g, "\\n")); }); //include any stdout in input
//console.error("test1");
//console.log("test2");
//CaptureConsole.stopCapture(process.stdout);

extensions();
module.exports.version = "1.0";

//var ary = [];
//ary.push("line 1".red_lt);
//ary.push("line 2");
//ary.push("line 3".green_lt);
//console.error("test 1", ary.join("\n"));
//console.error("test 2", ary.join("\n").cyan_lt);
//console.error("test 3", ary.join("\n").cyan_lt.color_reset);
//process.exit(0);

//https://stackoverflow.com/questions/7376238/javascript-regex-look-behind-alternative
//use negative lookahead instead:   (?<!filename)\.js$   ==>  (?!.*filename\.js$).*\.js$
//const CommentsNewlines_re = /(?<![\\])#.*\n|\n/g;  //strip comments + newlines in case caller comments out parent line
//console.error(`test '${quostr("test").replace(/\t/g, "\\t").replace(/\n/g, "\\n")}'`.yellow_lt);

/*
const xre_test = XRegExp(`
    ^ \\s*  #start of string (leading white space should already have been skipped)
    ${quostr("inner")}  #optionally quoted string
#    (?<quotype1> ['"]) (?<inner> .*) \\k<quotype1>
    ( \\s* ; )?  #optional trailing ";"
    \\s* $  #ignore trailing white space
    `.replace(CommentsNewlines_re, ""), 'xi');
//console.error("here1".cyan_lt);
var test = " 'a \"string' ".match(xre_test);
if (!test) test = {quote: "NOPE", inner: "NOPE"};
console.error("match1?".cyan_lt, JSON5.stringify(test), `#${test.quotype2}#`, `#${test.inner}#`);
test = "\"this is \\\"another 'string'\"".match(xre_test);
console.error("match2?".cyan_lt, JSON5.stringify(test), `#${test.quotype2}#`, `#${test.inner}#`);
//process.exit(0);
*/

//debugger;
//console.log(JSON5.stringify(eval("'hi,' + ' there'")));
//const re_test = XRegExp(`(?<year>[0-9]{4} ) -?  # year
//          (?<month>[0-9]{2} ) -?  # month
//          (?<day>[0-9]{2} )     # day`, 'x');
//const result = "2015-01-02".match(re_test); //XRegExp.exec("2015-01-02", re_test);
//console.log(`match yr ${result.year}, mon ${result.month}, day ${result.day}, result ${JSON5.stringify(result)}`.blue_lt);
//console.log(`re ${JSON5.stringify(re_test)}`.blue_lt);
//process.exit(0);


////////////////////////////////////////////////////////////////////////////////
////
/// Echo input stream to stderr (for debug):
//

const echo_stream =
module.exports.echo_stream =
function echo_stream(opts)
{
    if (this instanceof echo_stream) throw `don't use "new" with echo_stream()`.red_lt;
//    var destfile = opts.filename || "prexproc"; //opts.filename.unquoted || opts.filename;
//console.error(typeof destfile, destfile, opts.filename);
//    destfile = /*destfile &&*/ pathlib.basename(destfile, pathlib.extname(destfile));
//debug(JSON5.stringify(opts.filename), JSON5.stringify(opts.filename.unquoted));
    const destfile = opts.filename? pathlib.basename(opts.filename.unquoted, pathlib.extname(opts.filename.unquoted)): __file;
    debug(`echo to ${destfile/*.cyan_lt*/}.txt ...`.pink_lt);
    const echostrm = /*opts.pass &&*/ fs.createWriteStream(`${destfile}.txt`) //`${destfile || "stdin"}${opts.pass? `-${opts.pass}`: ""}.txt`);
        .on("finish", () => debug(`echo finished writing to ${destfile}.txt`.green_lt));
    return thru2(xform, flush); //Object.assign(thru2(/*{objectMode: false},*/ xform, flush), {pushline});
//    const instrm = new PassThrough(); //wrapper end-point
//    const outstrm = instrm
//        .pipe(new LineStream({keepEmptyLines: true})) //preserve line#s (for easier debug)
//        .pipe(thru2(/*{objectMode: false},*/ xform, flush)); //syntax fixups
//    return new Duplex(outstrm, instrm); //return endpts so caller can use pipe(); CAUTION: swap in + out

    function xform(chunk, enc, cb)
    {
        if (isNaN(++this.numlines)) this.numlines = 1;
//debug(`here4 ${this.numlines}`);
        if (typeof chunk != "string") chunk = chunk.toString(); //TODO: enc?
//        chunk = chunk.replace(/\n/g, "\\n");
        if (echostrm) echostrm.write(chunk); // + "\n"); //to file
        else console.error(chunk.escnl/*.replace(/\n/g, "\\n")*/.cyan_lt); //echo to stderr so it doesn't interfere with stdout; omit newlines because console.error will add one anyway
//        {
//            if (this.numlines == 1) console.error("preproc out:");
//            /*if (opts.echo)*/ console.error(chunk/*.replace(/\n/gm, "\\n")*/.cyan_lt); //this.chunks.join("\n").cyan_lt); //echo to stderr so it doesn't interfere with stdout; drop newlines because console.error will send one anyway
//        }
//debug(this.pushline? `pushline ${chunk}`.green_lt: "no pushline".red_lt);
//NOTE: newlines are assumed present
        this.push/*line*/(chunk); // + "\n");
        cb();
    }
    function flush(cb) { if (echostrm) echostrm.end(); cb(); } //debug(`eof ${this.numlines} lines`); cb(); }
}


////////////////////////////////////////////////////////////////////////////////
////
/// Read a stream by lines:
//

const LineStream =
module.exports.LineStream =
function LineStream(opts)
{
    if (this instanceof LineStream) throw `don't use "new" with LineStream()`.red_lt;
//    return thru2(xform, flush)
    opts = Object.assign({}, opts || {}, {keepEmptyLines: true}); //don't alter caller's data; preserve line#s (for easier debug and correct #directive and #! handling)
//    opts = opts || {};
//    opts.keepEmptyLines = true; //preserve line#s (for easier debug and correct #directive and #! handling)
    const instrm = new PassThrough(); //inner end-point
    const outstrm = instrm
        .pipe(new byline.LineStream(opts)) //{keepEmptyLines: true, })) //preserve line#s (for easier debug and correct #directive handling)
        .pipe(Object.assign(thru2(/*{objectMode: false},*/ xform, flush), {opts, pushline, })); //eof: preproc_eof, })) //attach opts to stream for easier access across scope
    return new Duplex(outstrm, instrm); //return end-point wrapper so caller can use pipe(); CAUTION: swap in + out

    function xform(chunk, enc, cb)
    {
        if (typeof chunk != "string") chunk = chunk.toString(); //TODO: enc?
        this.pushline(chunk); //kludge: LineStream drops linefeeds; re-add them so LineStream is transparent to downstream pipes
        cb();
    }
    function flush(cb) { cb(); }
}


////////////////////////////////////////////////////////////////////////////////
////
/// Handle #! if found at start of stream:
//

const shebang =
module.exports.shebang =
function shebang(opts)
{
    if (this instanceof shebang) throw `don't use "new" with shebang()`.red_lt;
    opts = opts || {};
//    return Object.assign(thru2(xform, flush), {pushline}); //Object.assign(thru2(/*{objectMode: false},*/ xform, flush), {pushline});
    return thru2(xform, flush); //Object.assign(thru2(/*{objectMode: false},*/ xform, flush), {pushline});

    function xform(chunk, enc, cb)
    {
        const SHEBANG_xre = XRegExp(`
            ^  #start of line
#            (?<shebang>
            \\s* \\# \\s* !  #ignore white space (non-standard, though)
            [^\\n]*  #shebang args (greedy)
#            )
#            \\n?
            `, "x"); //NOTE: real shebang doesn't allow white space
        if (isNaN(++this.numchunks)) this.numchunks = 1;
        if (typeof chunk != "string") chunk = chunk.toString(); //TODO: enc?
//debug(`shebang[${this.numlines}]: '${chunk.escnl}'`); //replace(/\n/g, "\\n")}'`);
//        if (!opts.shebang && !this.chunks.length && chunk.match(/^\s*#\s*!/)) { this.chunks.push(`//${chunk} //${chunk.length}:line 1`); cb(); return; } //skip shebang; must occur before prepend()
//            if (!opts.shebang && (this.linenum == 1) && chunk.match(/^\s*#\s*!/)) { this.chunks.push("//" + chunk + "\n"); cb(); return; } //skip shebang; must occur before prepend()
//NOTE: input stream does not need to be split by newlines here, because #! is only checked first time
//        var parts;
        if (!opts.shebang && (this.numchunks == 1))
//            if (parts = chunk.match(SHEBANG_xre)) chunk = "//" + parts.shebang.blue_lt; //`${chunk} //${chunk.length}:line 0 ${opts.filename || "stdin"}`.blue_lt; //cb(); return; } //skip shebang; must be first line
//            else debug(`no shebang: ${chunk.slice(0, 100).escnl}`.blue_lt);
            chunk = chunk.replace(SHEBANG_xre, (match) => "//" + match.blue_lt); //.echo_stderr(`shebang replace: '${chunk.slice(0, 100).escnl}'...`); //`${chunk} //${chunk.length}:line 0 ${opts.filename || "stdin"}`.blue_lt; //cb(); return; } //skip shebang; must be first line
        this.push/*line*/(chunk);
        cb();
    }
    function flush(cb) { cb(); }
}


//split shebang string into separate args:
//shebang args are space-separated in argv[2]
//some test strings:
// #!./prexproc.js +debug +echo +hi#lo ./pic8-dsl.js "arg space" \#not-a-comment +preproc "not #comment" -DX -UX -DX=4 -DX="a b" +echo +ast -run -reduce -codegen  #comment out this line for use with .load in Node.js REPL
// #!./prexproc.js +debug +echo +hi\#lo ./pic8-dsl.js "arg space" \#not-a-comment +preproc "not #comment" -DX -UX -DX=4 -DX="a b" +echo +ast -run -reduce -codegen  #comment out this line for use with .load in Node.js REPL
// #!./prexproc.js +debug +echo ./pic8-dsl.js xyz"arg space"ab \#not-a-comment +preproc p"not #comment" -DX -UX -DX=4 -DX="a b"q +echo +ast -run -reduce -codegen  #comment out this line for use with .load in Node.js REPL
// #!./prexproc.js +debug +echo ./pic8-dsl.js -DX -UX -DX=4 -DX="a b" +preproc +ast -run -reduce -codegen  #comment out this line for Node.js REPL .load command
const shebang_args =
module.exports.shebang_args =
function shebang_args(str)
{
    debug(`shebang args from: ${str}`.blue_lt);
/*
    const COMMENT_xre = XRegExp(`
        \\s*  #skip white space
        (?<! [\\\\] )  #negative look-behind; don't want to match escaped "#"
        \\#  #in-line comment
        .* (?: \\n | $ )  #any string up until newline (non-capturing)
        `, "x");
    const UNQUO_SPACE_xre = /\s+/g;
//https://stackoverflow.com/questions/366202/regex-for-splitting-a-string-using-space-when-not-surrounded-by-single-or-double
    const xUNQUO_SPACE_xre = XRegExp(`
        ' ( .*? ) '  #non-greedy
     |  " ( .*? ) "  #non-greedy
     |  \\S+
        `, "xg");
    const KEEP_xre = XRegExp(`
        \\s*
        (  #quoted string
            (?<quotype> (?<! \\\\ ) ['"] )  #capture opening quote type; negative look-behind to skip escaped quotes
            (?<quostr>
                (?: . (?! (?<! \\\\ ) \\k<quotype> ))  #exclude escaped quotes; use negative lookahead because it's not a char class
                .*?  #capture anything up until trailing quote (non-greedy)
            )
            \\k<quotype>  #trailing quote same as leading quote
        |  #or bare (space-terminated) string
            (?<barestr>
#                ( (?<! [\\\\] ) [^\\s\\n\\#] )+  #any string up until non-escaped space, newline or "#"
                (?: . (?! (?<! \\\\ ) [\\s\\n\\#] )) +  #exclude escaped space, newline, or "#"; use negative lookahead because it's not a char class
                .*?  #capture anything not above (non-greedy)
                (?: [\\s\\n\\#] )
            )
        )
        \\s*
*/
//new Regex(@"(?< switch> -{1,2}\S*)(?:[=:]?|\s+)(?< value> [^-\s].*?)?(?=\s+[-\/]|$)");
    const KEEP_xre = XRegExp(`
#        (?<= \\s )  #leading white space (look-behind)
#        (?: ^ | \\s+ )  #skip leading white space (greedy, not captured)
        \\s*  #skip white space at start
        (?<argstr>  #kludge: need explicit capture here; match[0] will include leading/trailing stuff even if though non-capturing
            (
                (  #take quoted string as-is
                    (?: (?<quotype> (?<! \\\\ ) ['"] ))  #opening quote type; negative look-behind to skip escaped quotes
                    (
                        (?: . (?! (?<! \\\\ ) \\k<quotype> ))  #exclude escaped quotes; use negative lookahead because it's not a char class
                        .*?  #capture anything up until trailing quote (non-greedy)
                    )
                    (?: \\k<quotype> )  #trailing quote same as leading quote (not captured)
                )
            |
                (?<= \\\\ ) [\\s\\n\\#]  #or take escaped space/newline/"#" as regular chars; positive look-behind
            |
                [^\\s\\n\\#]  #or any other char
            )+  #multiple occurrences of above (greedy)
        )
        (?: \\s+ | \\# .* | $ )  #skip trailing white space or comment (greedy, not captured)
#        (?= \s )  #trailing white space (look-ahead)
        `, "xy"); //"gx"); //sticky to prevent skipping over anything; //no-NOTE: sticky ("y") no worky with .forEach //"gxy"); //"gmxy");
//        (?: \\n | $ )
//    str.replace(/\s*#.*$/, ""); //strip trailing comment
//    return (which < 0)? [str]: str.split(" "); //split into separate args
//    return (str || "").replace(COMMENT_xre, "").split(UNQUO_SPACE_xre).map((val) => { return val.unquoted || val}); //strip comment and split remaining string
//debug(`${"shebang str".cyan_lt}: '${str}'`);
//debug(!!"0");
    var matches = [];
//    for (var ofs = 0;;)
//    {
//        var match = XRegExp.exec(` ${str}` || "", KEEP_xre); //, ofs, "sticky");
//        if (!match) break;
    XRegExp.forEach(str || "", KEEP_xre, (match, inx) => matches.push(match.argstr)); //debug(`#![${inx}]: '${match[0]}' ${match.index}`); //no-kludge: exclude surrounding spaces, which are included even though non-captured; //`${match.quostr || match.barestr}`); // || ""}`);
//    {
//        debug(`match[${inx}]:`.blue_lt, JSON.stringify(match), match.trimmed.quoted.cyan_lt); //, ${"quostr".cyan_lt} '${match.quostr}', ${"barestr".cyan_lt} '${match.barestr}'`);
//        matches.push(match.trimmed); //kludge: exclude surrounding spaces, which are included even though non-captured; //`${match.quostr || match.barestr}`); // || ""}`);
//        ofs = match.index + match[0].length;
//    }
//    });
    return matches;
}
//(?:x)  non-capturing match
//x(?=y)  positive lookahead
//x(?!y)  negative lookahead
//x(?<=y)  positive lookbehind
//x(?<!y)  negative lookbehind


//function is_shebang(chunk)
//{
//    return (this.linenum == 1) && chunk.match(/^\s*#\s*!/);
//}

//split shebang string into separate args:
//function shebang_args(str, which)
//{
//    if (!which) str = str.replace(/\s*#.*$/, ""); //strip comments
//    return (which < 0)? [str]: str.split(" "); //split into separate args
//}


////////////////////////////////////////////////////////////////////////////////
////
/// Preprocessor stream:
//

const regexproc =
module.exports.regexproc =
function regexproc(opts) //{filename, replacements, prefix, suffix, echo, debug, run, ast, shebang}
{
    if (this instanceof regexproc) throw `don't use "new" with regexproc()`.red_lt;
//    if (!(this instanceof regexproc))
//    {
//        .pipe(shebang(opts))
//                .on("data", (buf) => { this.push/*line*/(`${buf}`.blue_lt.color_reset); }) //write to parent
//        .pipe(LineStream(opts)) //NOTE: stream needs to be read by line for #directives to be handled correctly
//        .pipe(Object.assign(thru2(/*{objectMode: false},*/ preproc_xform, preproc_flush), {opts, /*pushline,*/ })) //eof: preproc_eof, })) //attach opts to stream for easier access across scope
//    }
//    if (!opts) opts = {};
//    global.JSON5 = JSON5; //make accessible to child modules
//    global.opts = opts || {}; //make command line args accessible to child (dsl) module
    opts = opts || {};
    if (opts.nested) //input stream cleansing (recursive)
    {
        const instrm = new PassThrough(); //inner end-point
        const outstrm = instrm
            .pipe(shebang(opts))
//                .on("data", (buf) => { this.push/*line*/(`${buf}`.blue_lt.color_reset); }) //write to parent
            .pipe(LineStream(opts)) //NOTE: stream needs to be read by line for #directives to be handled correctly
            .pipe(Object.assign(thru2(/*{objectMode: false},*/ preproc_xform, preproc_flush), {opts, pushline, })); //eof: preproc_eof, })) //attach opts to stream for easier access across scope
        return new Duplex(outstrm, instrm); //return end-point wrapper so caller can use pipe(); CAUTION: swap in + out
    }
//    opts.file_stack = [{filename: opts.infilename}];
//    opts.nif_stack = Object.assign([], //true],
//#if/#else/#endif should be properly nested within #incl files, so only need a single stack here:
    Object.defineProperties(opts,
    {
        file_state: { get() { return opts.stack.top; }, },
        file_depth: { get() { return opts.stack.length; }, },
        nif_state: { get() { return (opts.file_state.nif_stack /*|| []*/).top || {}; }, },
        nif_depth: { get() { return opts.file_state.nif_stack.length; }, },
//        file_state: { get() { return opts.stack.top; }, }, //current state == top of stack
//non-enumerable properties:
        macros: { value: {require, console}, }, //vm context
        stack: { value: [], }, //#include and #if stack; //Object.assign([], stack_methods), }, //[{filename: opts.infilename}], //stack of include/exclude states (within files)
//    opts.bypass = /*opts.bypass ||*/ Object.assign([], //stack of include/exclude states
    });
    Object.assign(opts.stack, 
    {
//provide uniform calling convention for changing state (toggle and pop):
//NOTE: a single combined stack is used for #include and #if state
        toggle: function() { this.want_nif(true); opts.nif_state.bypass = !opts.nif_state.bypass; }, //this.want_file(false);
//        pop_if: function() { var svline = this.top.numlines; this.pop(); this.top.numlines = svline; },
//        pop_incl: function() { var svdepth = this.top.depth; this.pop(); this.top.depth = svdepth; },
//        unnest: function() { this.top.bypass.pop(); },
        replace: function(expr) { this.want_nif(true); Object.assign(opts.nif_state, {bypass: !vm.my_eval(expr, "#elif"), expr}); }, //CAUTION: inverted; expr for debug only; //this.want_file(false);
//        push_if: function(expr) { this.push({filename: this.top.filename, numlines: this.top.numlines, bypass: !vm.my_eval(expr, "#if"), }); }, //CAUTION: inverted
//        push_file: function(filename) { this.push({filename, depth: this.length, }); }, //start nested file with bypass = false
//    opts.state = opts.state || [true]; //set initial inclusion state
//        pop: function() { throw `don't use stack.pop() ${srcline(1)}`.red_lt; },
//        push: function() { throw `don't use stack.push() ${srcline(1)}`.red_lt; },
        pop_nif: function() { this.want_nif(true); opts.file_state.nif_stack.pop(); },
        push_nif: function(bypass, expr) { opts.file_state.nif_stack.push({bypass, expr}); },
        pop_file: function() { this.want_nif(false); opts.stack.pop(); },
        push_file: function(filename) { opts.stack.push({filename, nif_stack: []}); },
//        want_file: function(yesno)
//        {
//            if (yesno && !this.top.filename) throw "missing #include".red_lt;
//            if (!yesno && this.top.filename) throw "missing #if".red_lt;
//        },
        want_nif: function(yesno)
        {
            if (!(opts.file_state.nif_stack /*|| []*/).length != !yesno) throw `${yesno? "missing": "dangling"} #if`.red_lt;
        },
    });
    opts.stack.push_file(opts.infilename); //start with outer file open
//    opts.macros = opts.macros || {};
//debug("here1");
//    if (!vm.isContext(opts.macros || {}))
//    {
//        vm.createContext(opts.macros); //contextify (1x only)
//        const macros = {};
//no worky        const {define, defined} = require("dsl.js");
//this.macros = {};
//${define}
//${defined}
//        debug("__filename", __filename);
//            global.macros = {}; //this.macros = {}; //"this" = globals
//            debug("dsl imports", JSON.stringify(dsl));
//            debug("defined?", typeof defined);
    vm.runInNewContext(`
        const {define, defined, undef, dump_macros} = require("${__filename}");
//            debug("xyz defined? ", defined("XYZ"), defined("xyz"));
//            define("XYZ");
//            debug("xyz defined? ", defined("XYZ"), defined("xyz"));
        `/*.unindent.slice(1).echo_stderr("vm init")*/, opts.macros /*= {require, console}*/, {filename: "vm_init-heredoc", displayErrors: true}); //.echo_stderr("vm init");
    vm.my_eval = function(expr, why)
    {
        const VM_OPTS =
        {
        //        filename: opts.filename, //filename to show in stack traces
        //        lineOffset: this.srcline.slice(opts.filename.length + 1), //line# to display in stack traces
            displayErrors: true, //show code line that caused compile error
        };
//debug.nested(1, typeof expr, JSON5.stringify(expr));
        return this.runInContext(expr.echo_stderr(why.pink_lt), opts.macros, VM_OPTS);
    };
//    }
//debug(`is context now? ${vm.isContext(opts.macros)} ${__srcline}`);
debug(`${__file} opts: ${JSON.stringify(opts || {})}`.blue_lt);
    Object.defineProperty(opts, "nested", {value: true}); //setup complete; now just wrap stream logic with outer stream; !enumerable
    if (!opts.echo) return regexproc(opts); //skip PassThrough/Duplex overhead
    const instrm = new PassThrough(); //inner end-point
    const outstrm = instrm
//        .pipe((opts.echo && !opts.nested)? echo_stream(Object.assign({pass: "regexproc-in"}, opts)): new PassThrough()) //echo top-level only
        .pipe(opts.echo? echo_stream(Object.assign({}, opts, {filename: opts.infilename || `${__file}-in`})): new PassThrough()) //echo top-level only
//EXTRA NEWLINES?
//        .pipe(new LineStream({keepEmptyLines: true, })) //preserve line#s (for easier debug and correct #directive handling)
//        .pipe(byline.createStream(shebang(opts), {keepEmptyLines: true}))
//        .pipe(byline(shebang(opts), {keepEmptyLines: true}))
//        .pipe(shebang(opts))
//        .pipe(byline.createStream(shebang(opts), {keepEmptyLines: true}))
//        stream = byline.createStream(stream);
//        stream.pipe(fs.createWriteStream('nolines.txt'));
//        .pipe(LineStream(opts)) //NOTE: stream needs to be read by line for #directives to be handled correctly
//        .pipe(Object.assign(thru2(/*{objectMode: false},*/ preproc_xform, preproc_flush), {opts, /*pushline,*/ })) //eof: preproc_eof, })) //attach opts to stream for easier access across scope
        .pipe(regexproc(opts))
        .pipe(opts.echo? echo_stream(Object.assign({}, opts, {filename: opts.outfilename || `${__file}-out`})): new PassThrough()); //echo top-level only
//    const retval =
    return new Duplex(outstrm, instrm); //return end-point wrapper so caller can use pipe(); CAUTION: swap in + out
//    CaptureConsole.startCapture(process.stdout, (outbuf) => { xform.call(retval, "//stdout: " + outbuf, "utf8", function(){}); --retval.numlines; }); //send all stdout downstream thru pipeline
//    retval.opts = opts;
//    return retval;
}


function preproc_xform(chunk, enc, cb)
{
    const opts = this.opts;
//    const state = opts.state.top;
//    opts.preprocessed = true;
//        if (!this.chunks) this.chunks = [];
    if (isNaN(++opts.file_state.numlines)) opts.file_state.numlines = 1; //NOTE: input must be split by newlines
    if (typeof chunk != "string") chunk = chunk.toString(); //TODO: enc?
//no    chunk += "\n"; //add newlines back after byline stripped them
    if (chunk.slice(-1) == "\n") chunk = chunk.slice(0, -1); //drop newline to simplify linebuf handling
//        procline.call(this, chunk, cb);
//if (this.numlines == 1) debug(`xform ctor ${this.constructor.name}, tag ${this.djtag}`);
//debug(`${chunk} //${chunk.length}:line ${this.numlines} ${opts.filename || "stdin"}`.blue_lt);
//this.push(chunk);
//cb();
//return;
    if (chunk.length)
    {
//            if (this.chunks.top.slice(-1) == "\\") this.chunks.top = this.chunks.top.
        if (!this.linebuf) this.srcline = `${opts.file_state.filename || "stdin"}:${opts.file_state.numlines}`; //starting new line; remember line#
        if (chunk.slice(-1) == "\\") //line continuation (mainly for macros)
        {
            if (chunk.indexOf("//") != -1) warn(`single-line comment on ${opts.file_state.numlines} interferes with line continuation from ${this.srcline}`);
            this.linebuf = (this.linebuf || "") + chunk.slice(0, -1);
//                this.push(chunk.slice(0, -1)); //drop backslash and don't send newline
            cb();
            return;
        }
        this.linebuf = (this.linebuf || "") + chunk;
//            this.linenum = this.numlines;
//            prepend.call(this);
//            this.push(chunk + ` //line ${this.linenum}\n`); //add line delimiter (and line# for debug)
//            this.push(chunk + `; "line ${this.linenum}";\n`); //add line delimiter (and line# for debug)
//            this.push(chunk + "\n"); //NO- add line delimiter (and line# for debug)
    }
//        var linebuf = this.linebuf;
//        this.linebuf = null; //CAUTION: clear before calling cb() to avoid reentry problems
    if (this.linebuf) //run thru processor
    {
//    `(?<year>  [0-9]{4} ) -?  # year
//     (?<month> [0-9]{2} ) -?  # month
//     (?<day>   [0-9]{2} )     # day`, 'x');
//            debug(`preproc[${this.linenum}]: ${this.linebuf}`);
        const PREPROC_xre = new XRegExp //CAUTION: use "\\" because this is already within a string
        (`
            ^ \\s*  #start of line, ignore leading white space
            \\# \\s* (?<directive> \\w+ ) \\s*  #directive name; TODO: allow regex or special chars?
#                (?<details> [^\\s] .*? )? \\s*  #optional trailing stuff (non-greedy)
            (?<details> .+? )? \\s*  #optional trailing stuff; NOTE: non-greedy so white space matches surrounding patterns
            ;? \\s* ($ | //)  #ignore trailing delimiter and/or white space or comment
        `, "xi"); //TODO: use .anchorRE.CommentNewLine.spaceRE
//            var parts = this.linebuf.match(/^\s*#\s*([a-z0-9_]+)\s*(.*)\s*$/i);
//            var {directive, details} =
        var parts = this.linebuf.match(PREPROC_xre); // /* /^\s*#\s*([a-z0-9_]+)\s*(.*)\s*$/i */);
//        if (parts && opts.debug) debug(`preproc '${parts.directive}', details '${parts.details}', src line ${this.srcline}, bypass? ${opts.nif_state.bypass} ${__srcline}`.pink_lt);
//            if (parts) parts.details = parts.details.replace(/^\s+/, ""); //TODO: fix this
//if (parts) debug(this.numlines + " " + JSON5.stringify(parts)); //CAUTION: log() causes inf loop
//            if (!parts) return out(macro(this.linebuf)); //expand macros
        var old_bypass = opts.nif_state.bypass; //use pre-line bypass state when displaying line
        var processed = parts? (directive.call(this, parts.directive, parts.details) || this.linebuf): !opts.nif_state.bypass? expand_macros.call(this, this.linebuf): this.linebuf; //handle directives vs. expand macros
        this.linebuf = null; //CAUTION: must clear before starting nested stream to avoid reentry problems
//            linebuf = directive(parts.directive, parts.details, this.linenum, this.push, cb); //handle directives vs. expand macros
//            if (parts) { warn(`TODO: #${parts[1]} on line ${this.linenum}`); this.linebuf = "//" + this.linebuf; }
//            if (this.linebuf) this/*.chunks*/.push(`${this.linebuf} //${this.linebuf.length}:line ${this.linenum}\n`); //+ "\n"); //chunk); //re-add newline to compensate for LineStream
//            this.push(chunk);
//            if (this.linebuf) out(`${this.linebuf} //${this.linebuf.length}:line ${this.linenum}`); //+ "\n"); //chunk); //re-add newline to compensate for LineStream
/*
        if (processed.on) //pipe) //stream object (from #include)
        {
            this.push(`//start '${processed.filename}' ...`);
//                //eof ... '${relpath}'
            processed
                .pipe(new LineStream({keepEmptyLines: true})) //preserve line#s (for easier debug and correct #directive handling)
                .on("data", (buf) =>
                {
//                        if (isNaN(++processed.numlines)) processed.numlines = 1;
//                        if (buf) this.push(`${buf} //${buf.length}:line ${processed.numlines} '${processed.filename}'`);
                    xform.call(processed, buf, null, function(){}); //nested (recursive) call
                })
                .on("end", () =>
                {
                    flush.call(processed, function(){});
                    this.push(`//eof ... line ${processed.numlines || 0} '${processed.filename}'`);
                    cb();
                })
                .on("error", (err) =>
                {
                    error(`'${processed.filename}' read error on line ${processed.numlines || 0}: ${exc}`);
                    cb();
                });
            return; //NOTE: don't call cb() yet
        }
*/
        var nested_strm = null;
        if (processed)
        {
//debug(!!processed.pipe, !!processed.linebuf);
            if (processed.pipe) [nested_strm, processed] = [processed, processed.linebuf]; //extract+save stream object
//            if (processed != "\n") {
            processed = `${processed} //${processed.length}:line ${this.srcline}`; //+ "\n"); //chunk); //re-add newline to compensate for LineStream
//debug(processed);
            if (/*opts.bypass.top*/ old_bypass) processed = "//" + `${processed}`.gray_dk;
//if (this.numlines < 4) debug(processed.replace(/\n/gm, "\\n"));
            this.pushline(processed); ///*.replace(/\n/g, "\\n")*/ + ` if-depth ${opts.nif_stack.length}, file-depth ${opts.file_stack.length}`); //`${processed}`.cyan_lt.color_reset);
        }
        if (nested_strm) //stream object (from #include); expand in-place
        {
//                const THAT = this;
            this.pushline("//" + `start '${nested_strm.filename}', depth was ${opts.file_depth} ...`.green_lt);
if (false)            this.pause(); //no-; pause flow of input stream until nested file is done
//            const THAT = this;
//            THAT.opts = Object.assign({}, opts, {infilename: nested_strm.filename});
//            opts.file_state.depth = opts.nif_stack.length;
            opts.stack.push_file(nested_strm.filename); //NOTE: bypass would be false, otherwise wouldn't be processing this line
//this.push/*line*/("insert file contents here".red_lt);
//eof.call(this);
//            const THIS = this;
            nested_strm
//                .pipe(preproc(Object.assign({}, opts, {filename: processed.filename.quoted1, bypass_startlen: opts.bypass.length, nested: true})))
//                .pipe(createStream(new shebang(opts), {keepEmptyLines: true}))
//EXTRA NEWLINES?
//                .pipe(byline.createStream(new shebang(opts), {keepEmptyLines: true}))
//                .pipe(new LineStream({keepEmptyLines: true, })) //preserve line#s (for easier debug and correct #directive handling)
//        .pipe(byline.createStream(shebang(opts), {keepEmptyLines: true}))
//        .pipe(byline(shebang(opts), {keepEmptyLines: true}))
//                .pipe(shebang(opts))
//                .on("data", (buf) => { this.push/*line*/(`${buf}`.blue_lt.color_reset); }) //write to parent
//                .pipe(LineStream(opts)) //NOTE: stream needs to be read by line for #directives to be handled correctly
//                .pipe(Object.assign(thru2(/*{objectMode: false},*/ preproc_xform, preproc_flush), {opts, /*pushline,*/ })) //eof: preproc_eof, })) //attach opts to stream for easier access across scope
                .pipe(regexproc(opts))
                .on("data", (buf) => this.push(buf)) //as-is; linefeed was already added; //debug(`got-${nested_strm.filename} '${buf}'`.cyan_lt, this === THIS); THIS.push(buf); })
//                {
//                    this.push(buf);
//                    nested_strm.pause();
//                    const sv_linenum = THAT.numlines;
//                    preproc_xform.call(this, buf, null, () => {});
//                    {
//                        nested_strm.resume();
//                    });
//                })
                .on("end", () => inner_eof.call(this))
                .on("error", (err) => inner_eof.call(this, err));
            return; //NOTE: don't call cb() until nested file eof
        }
    }
    cb();
//        out(this.linebuf);

//        function out(str)
//        {
//            this.linebuf = null; //CAUTION: clear before calling cb() to avoid reentry problems
//            if (str) this.push(str);
//            cb();
//        }
    function inner_eof(err) //, cb)
    {
//        const state = this.opts.state.top;
//debug(`eof: file_stack depth was ${this.opts.file_stack.length}, top ${JSON5.stringify(opts.file_state)}`.cyan_lt);
//        this.state.pop();
        if (err) error(`${opts.file_state.filename} read error on line ${this.srcline}: ${exc}`);
//        this.push(`//err ... resume line ${this.numlines} ${processed.filename || "stdin"}`.red_lt);
        this.pushline("//" + `${err? "err": "eof"} file depth was ${opts.file_depth} ... resume line ${opts.file_state.filename || "stdin"}:${opts.file_state.numlines}`.red_lt);
if (false)        this.resume(); //no-; continue flow from input stream
//        if ((opts.bypass || []).length) error(`unterminated #if on line ${this.srcline}`);
//        opts.stack.pop_file();
//debug(`@nested eof: stack ${JSON5.stringify(opts.stack)}`);
        cb();
    }
}

function preproc_flush(cb)
{
    const opts = this.opts;
//    const state = opts.state.top;
//        CaptureConsole.stopCapture(process.stdout);
//        append.call(this);
//        if (opts.run) this.push(`const ast = require("${process.argv[1]}").walkAST(${opts.run});\n`);
//        if (!this.chunks) this.chunks = [];
//    if (opts.bypass.length != (opts.bypass_startlen || 0))
//already done!    opts.file_stack.pop();
//debug(`@flush: stack ${JSON5.stringify(opts.stack)}`);
//    opts.stack.want_nif(false);
//    opts.stack.pop_file();
//    if (opts.nif_stack.length != (opts.file_state.depth || 0)) error(`${opts.nif_stack.length - (opts.file_state.depth || 0)} unterminated #if level(s) on line ${this.srcline}`);
    if (this.linebuf)
    {
        warn(`dangling line continuation on line ${this.srcline}`);
//            this.chunks.push(this.linebuf + "\\"); //flush last partial line, don't expand macros since it was incomplete
//            this.linebuf += "\\"; //flush last partial line, don't expand macros since it was incomplete
//        this.push/*line*/(`${opts.bypass.top? "//": ""}${this.linebuf}\\`); //flush last partial line, don't expand macros since last line was incomplete
        var processed = `${this.linebuf}\\`.cyan_lt;
//can't have active #if at end of file:        if (opts.state.bypass) processed = "//" + `${processed}`.gray_dk;
        this.pushline(processed); //.cyan_lt.color_reset); //flush last partial line, don't expand macros since last line was incomplete
    }
    opts.stack.pop_file();
//    if (opts.dump_macros && isNaN(opts.bypass_startlen)) //dump macros at top-most level only
//        const stack = {symtab: {}};
//        stack.new_frame = function()
//        {
//            return {nest: (this.nest || 0) + 1, symtab: Object.assign({}, this.symtab || {}), new_frame: this.new_frame, }; //shallow copy to new stack frame
//        }
    cb();
//        out(this.linebuf);
}


//preprocessor directives:
function directive(cmd, linebuf) //, linenum)
{
    const CWD = ""; //param for pathlib.resolve()
    const opts = this.opts;
//    const state = opts.state.top;
//    function state() { return opts.state.top; } //get latest state
//    var parts;
//    if (arguments.length == 1) [cmd, linebuf] = [null, cmd];
//console.log(`macro: cmd '${cmd}', line '${(linebuf || "").replace(/\n/gm, "\\n")}'`);
//    switch ((opts.bypass || []).top? cmd.toUpperCase(): cmd.toLowerCase()) //upper => off, lower => on
    const Unconditionals = {else: "toggle", elif: "replace", endif: "pop_nif"}; //inclusion state always changes with these directives
    if (Unconditionals[cmd])
    {
//debug(opts.file_depth, opts.nif_depth, this.srcline, cmd, JSON5.stringify(opts.stack));
//        if (!opts.nif_depth) return error(`#${cmd} without #if on line ${this.srcline}`);
        opts.stack[Unconditionals[cmd]](linebuf); //apply state change
        return "//" + `'${this.linebuf}' => ${Unconditionals[cmd]} bypass ${opts.nif_state.bypass? "ON": "OFF"}, nif depth is now ${opts.nif_depth}`.yellow_lt;
    }
    if (opts.nif_state.bypass) return; //ignore all other directives
    switch (cmd)
    {
//messages:
//NOTE: execution is defered until run time to allow other consts to be embedded within message text
//        case "define"
        case "warning": //convert to console output (so that values will be expanded)
//NOTE: allow functions, etc; don't mess with quotes            if (!linebuf.match(/^[`'"].*[`'"]$/)) linebuf = "\"" + linebuf + "\"";
            return `console.error(\`${maybe_eval(linebuf/*.trim()*/, "#warn").replace(/`/g, "\\`")} ${this.srcline}\`.yellow_lt);`; //add outer () if not there (remove + readd)
        case "error": //convert to console output (so that values will be expanded)
//            if (!linebuf.match(/^`.*`$/)) linebuf = "`" + linebuf + "`";
//            return `console.error(${linebuf}); process.exit(1);`;
            return `throw \`${maybe_eval(linebuf, "#err").replace(/`/g, "\\`")} ${this.srcline}\`.red_lt`; //leave quotes, parens as is
//additional source file:
        case "include": //generate stmt to read file, but don't actually do it (REPL will decide)
//            debugger;
//            const QUOSTR_xre= new XRegExp
//            (`
//                ^  #don't allow anything else at start
//                ${quostr("quostr")}
//                $  #don't allow anything else at end
//            `, "x");
//            const INCLUDE_xre = new XRegExp //CAUTION: use "\\" because this is already within a string
//            (`
//                ^  #start of string (leading white space should already have been skipped)
//                (
//                    \\( \\s* ${quostr("paren_filename")} \\s* \\)  #quoted string within "()"
//                  | ${quostr("quo_filename")}  #or quoted string
//                  | (?<bare_filename> [^\\s]+ )  #or space-delimited string
//                )
//                ( \\s* ; )?  #optional trailing ";"
//                \\s* $  #ignore trailing white space
//            `, "xi");
//            linebuf = linebuf.replace(/^\(\s*|\s*\)$/g, ""); //strip "()"
//            linebuf = linebuf.unparen; //strip "()"
//            var parts = linebuf.unparen.match(QUOSTR_xre); //strip "()"
//            debug(`filename: '${(linebuf.unparen || linebuf).unquoted}'`);
//            debug(`filename: '${safe_eval(linebuf)}'`);
//            var filename = safe_eval(linebuf) || linebuf; //if eval fails, use as-is; //(linebuf.unparen || linebuf).unquoted || safe_eval(linebuf) || linebuf;
            var filename = vm.my_eval(linebuf, "#incl") || linebuf; //vm.runInContext(linebuf.echo_stderr("filename"), opts.macros, VM_OPTS) || linebuf; //allow macros within filename; use as-is if eval fails
//            const INCLUDE_xre = new XRegExp //CAUTION: use "\\" because this is already within a string
//            (`
//                ^  #start of string
//                \\s*  # leading white space should already have been skipped, but exclude it here just in case
//                [^\\s]+  #grab all non-space chars
//                \\s*  #trailing white space
//            debug(INCLUDE_xre.source.replace(/\\/g, " BSL ").pink_lt);
//            parts = linebuf.match(/^\s*(\(\s*([^"]+)\s*\)|"([^"]+)"|([^ ]+))(\s*;)?\s*$/); //quotes optional if no embedded spaces
//            parts = linebuf.match(INCLUDE_xre); //quotes optional if no embedded spaces
//            if (!parts) warn(`invalid #include file '${linebuf}' on line ${linenum}`);
//            else parts.filename = parts.filename1 || parts.filename2 || parts.filename3 || "(no file)";
//            debug(`'${linebuf}' => pname '${parts.pname}', qname '${parts.qname}', sname '${parts.sname}'`); //${JSON5.stringify(parts)}`);
//            const [instrm, outstrm] = [infile? fs.createReadStream(infile.slice(1, -1)): process.stdin, process.stdout];
//debug(`read file '${parts[2] || parts[3]}' ...`);
//            var contents = fs.readFileSync(parts[2] || parts[3]); //assumes file is small; contents needed in order to expand nested macros so just use sync read
//            return contents;
//wrong            return `include(${str_trim(linebuf)});`; //add outer () if not there (remove + readd)
//            debug(`include-1 file paren '${parts.paren_filename}', quo '${parts.quo_filename}', bare '${parts.bare_filename}'`.blue_lt);
//            var filename = parts.paren_filename || parts.quo_filename || parts.bare_filename || "nofile";
//            if (!filename.match(QUOSTR_xre)) filename = eval(filename);
//            debug(`include '${filename}' ...`);
//            filename = /*parts.expr? eval(parts.expr):*/ pathlib.resolve(CWD, filename); //pathlib.resolve(filename);
//            debug(`include-2 file '${filename}'`.cyan_lt);
//            console.log(fs.readFileSync(filename)); //TODO: stream?
//    fs.createReadStream(opts.filename);
//            var relpath = pathlib.relative(CWD, filename);
//            return `
//            console.log(`
//                //start '${relpath}' ...
//                ${fs.readFileSync(filename)} //TODO: stream?
//                //eof ... '${relpath}'
//                `); //stdout will be captured
            return Object.assign((filename == "-")? process.stdin: fs.createReadStream(pathlib.resolve(CWD, filename)),
            {
                linebuf: "//" + `'${this.linebuf}' => include file '${filename}'`.yellow_lt,
                filename: pathlib.relative(CWD, filename),
            });
//                .pipe(new LineStream({keepEmptyLines: true})) //preserve line#s (for easier debug and correct #directive handling)
//                .pipe(thru2(/*{objectMode: false},*/ xform, flush)); //syntax fixups
//            break;
//macro defs:
        case "undef": //delete macro name
            vm.my_eval(`undef("${linebuf}", "${this.srcline}");`, "#undef"); //runInContext(`undef("${linebuf}", "${this.srcline}");`.echo_stderr("define"), opts.macros, VM_OPTS);
            return "//" + `'${this.linebuf}' => delete macro '${linebuf}'`.yellow_lt;
        case "define": //save for later expansion
            var macname = vm.my_eval(`define("${linebuf.replace(/"/g, "\\\"")}", "${this.srcline}");`, "#def"); //runInContext(`define("${linebuf}", "${this.srcline}");`.echo_stderr("define"), opts.macros, VM_OPTS);
            return "//" + `'${this.linebuf}' => define macro '${macname}'`.yellow_lt;
//            if (!macro.defs) macro.defs = {};
//            const DEFINE_xre = XRegExp(`
//                (?<name>  ${MACRO_NAME} )  \\s*
//                (
//                    \\(
//                        \\s*
//                        (?<params>  [^)]*  )
//                        \\s*
//                    \\)  \\s*
//                )?  #optional param list
//                (?<body>  .* )  #body can be empty
//                `.anchorRE, "xi");
//TODO: allow reg ex name here, or special chars within name ~ awk patterns
//            parts = linebuf.match(/^([a-z0-9_]+)\s*(\(\s*([^)]*)\s*\)\s*)?(.*)$/i); //TODO: allow $ or @?
//            var parts = linebuf.match(DEFINE_xre);
//            if (!parts) return warn(`ignoring invalid macro definition on line ${this.srcline}`);
//            if (opts.macros[parts.name]) return warn(`ignoring duplicate macro '${parts.name}' definition on ${this.srcline}, previous was on ${opts.macros[parts.name].srcline}`);
//            opts.macros[parts.name] = {/*pattern: new Regexp("[^a-z0-9_]" + parts[1],*/ arglist: parts.params, body: parts.body, srcline: this.srcline};
//            return `function ${parts[1]}${parts[2] || "()"} { ${parts[4]} }`; //convert to function def
//            return `//define ${parts.name}`.pink_lt; //annotate source file (mainly for debug)
//            return; //no output from this line
        case "dump_macros": //list all macros
            vm.my_eval(`dump_macros("${this.srcline}");`, "#dump"); //runInContext(`dump_macros("${this.srcline}");`, opts.macros, VM_OPTS);
            return "//" + `'${this.linebuf}' => dump macros`.yellow_lt;
//conditional directives:
        case "ifdef":
        case "ifndef":
            linebuf = linebuf.replace(/^(\w+)/, `${"!".slice(cmd == "ifdef")}defined("$1")`); //rewrite as #if defined()
            //fall thru
        case "if":
//            const IFDEF_xre = XRegExp(`
//                (?<name>  ${MACRO_NAME} )  \\s*
//                `.anchorRE, "xi");
//            var parts = linebuf.match(IFDEF_xre);
            opts.stack.push_nif(!vm.my_eval(linebuf, "#if"), linebuf); //CAUTION: inverted; //runInContext(linebuf.echo_stderr("#if"), opts.macros, VM_OPTS)); //CAUTION: inverted
//            warn(`condtional: '${linebuf}' => ${opts.bypass.top}`.yellow_lt);
//debug(opts.file_depth, opts.nif_depth, this.srcline, cmd, JSON5.stringify(opts.stack));
            return "//"+ `'${this.linebuf}' => push bypass ${opts.nif_state.bypass? "ON": "OFF"}, nif depth is now ${opts.nif_depth}`.yellow_lt;
        default:
//            warn(`ignoring unrecognized pre-processor directive '${cmd}' (line ${this.srcline})`);
//            return linebuf; //leave as-is
//            return `throw "unrecognized pre-processor directive '${cmd}' at line ${this.srcline}";`.red_lt; //give down-stream compile-time error
            throw `unrecognized pre-processor directive '${cmd}' at line ${this.srcline}`.red_lt; //give down-stream compile-time error
    }

    function maybe_eval(str, why)
    {
        const EVAL_xre = XRegExp(`
        \\$  \\{
            (?<expr>  [^}]+ )
        \\}
        `, "xg");
        return str.replace(EVAL_xre, (match) =>
        {
            var expr = expand_macros(match.expr); //reduce expressions to consts within warn/error for more informational messages
            try { return vm.my_eval(expr, why); } //runInContext(expr, opts.macros, VM_OPTS); }
            catch(exc) { error(exc); return expr; } //use as-is
        });
    }
}


//collect all macros in one place:
module.exports.macros = {};

//expand macros:
//NOTE: regex is trickier than token parsing, but allows text to ignore Javascript syntax rules
//const MACRO_NAME = "\w+"; //word chars: [a-z0-9_] //TODO: allow $ or @ in name?; allow regex pattern in place of name?
function expand_macros(linebuf)
{
    const macros = module.exports.macros;
    if (isNaN(++expand_macros.calls)) { expand_macros.calls = 1; expand_macros.body_substs = expand_macros.arg_substs = expand_macros.perf_time = 0; }
    expand_macros.perf_time -= process.hrtime.bigint();
//keep expanding until nothing found:
//if (false)
    while (Object.keys(macros /*|| {}*/).some((macname) =>
    {
        var svline = linebuf;
        linebuf = linebuf.replace(macros[macname].xre, (match) =>
        {
            ++expand_macros.body_substs;
            var macbody = macros[macname].body || "";
            Object.keys(macros[macname].args_xre || {}).forEach((argname, inx, all) => //param substitution; TODO: safer parsing
            {
                debug(`macro '${macname}' arg[${inx}/${all.length}]: subst '${argname}' with '${match[argname]}'`);
                macbody = macbody.replace(macros[macname].args_xre[argname], function() { ++expand_macros.arg_substs; return match[argname]; });
            });
            return macbody;
        });
//TODO: "#str" and "token ## token"
//TODO: param list
//if (linebuf != svline) debug(`macros expanded from '${svline}' to '${linebuf}' ${__srcline}`);
        return (linebuf != svline);
//        if (linebuf.match)
//            if (macro.defs[m].arglist !== null) //with arg list
//                linebuf.replace()
    }));
    expand_macros.perf_time += process.hrtime.bigint();
    return linebuf;
}


//shim for #if eval:
//exported for simpler access by vm
const defined =
module.exports.defined =
function defined(name, where)
{
    const macros = module.exports.macros; //global.macros; //this.macros || {}; //"this" = globals
//    where = where || srcline(1);
//debug(`defined(${name})? ${!!macros[name]} ${srcline(1)}`);
    return !!macros[name];
}

//undefine a macro:
const undef =
module.exports.undef =
function undef(name, where)
{
    const macros = module.exports.macros; //global.macros; //this.macros || {}; //"this" = globals
    where = where || srcline(1);
    if (!macros[name]) warn(`undefined macro '${name}' on line ${where}`);
    delete macros[name]; //macros[name] = null;
    return name;
}

//define a new macro:
//exported for simpler access by vm
const define =
module.exports.define =
function define(linebuf, where)
{
    const macros = module.exports.macros; //global.macros; //this.macros || {}; //"this" = globals
    const DEFINE_xre = XRegExp(`
    (?<name>  \\w+ )  \\s*  #TODO: allow regex, special chars in name; //{MACRO_NAME}
    (
        \\(
            \\s*
            (?<params>  [^\\)]*  )  #optional param list
            \\s*
        \\)  \\s*
    )?
    (?<body>  .*? )  #take what's left (non-greedy to allow params to be captured); body can be empty
    `.anchorRE, "gx");
//TODO: allow reg ex name here, or special chars within name ~ awk patterns
//            parts = linebuf.match(/^([a-z0-9_]+)\s*(\(\s*([^)]*)\s*\)\s*)?(.*)$/i); //TODO: allow $ or @?
    where = where || srcline(1);
    var parts = linebuf.match(DEFINE_xre);
    if (!parts) return warn(`ignoring invalid macro definition '${linebuf}' at ${where}`);
    if (macros[parts.name]) return warn(`ignoring duplicate macro '${parts.name}' at ${where}, previous was at ${macros[parts.name].srcline}`);
//#            ${parts.params? `\\(${parts.params.replace(/map((p, inx) => { return `\\s* (?<arg${inx} [^,]* ) \\s*`; }).: ""}  #param list (optional)
    parts.params = parts.params && parts.params.split(/\s*,\s*/);
    macros[parts.name] =
    {
        xre: new XRegExp(`
            \\b ${parts.name} \\b  #macro name, word boundary or start/end of string
            ${parts.params? `\\( \\s* ${parts.params.map((param, inx) => `(?<${param}> [^,)]* )`).join("\\s*,\\s*")} \\s* \\)`: ""}  #TODO: __VARARGS__, ignore extra args
            `, "xg"), //.echo_stderr("macro xre"), "xg"),
//        re_string: 
        args_xre: parts.params && parts.params.reduce((dict, name) => { dict[name] = XRegExp(`\\b ${name} \\b`.echo_stderr(`arg[${name}] xre`), "gx"); return dict; }, {}), //|| null,
        body: parts.body,
        srcline: where,
    };
//debug(`define: ${parts.name || "NO-NAME"} (${parts.params || "NO-PARAMS"}) ${parts.body || "NO-BODY"} @${where}`);
//debug(`defined now? ${!!macros[parts.name]} ${srcline()}`);
//debug(`new macro: ${JSON5.stringify(macros[parts.name])}`);
    return parts.name;
}


const dump_macros =
module.exports.dump_macros =
function dump_macros(where)
{
    const macros = module.exports.macros; //global.macros; //this.macros || {}; //"this" = globals
    where = where || srcline(1);
//debug(`defined(${name})? ${!!macros[name]} ${srcline(1)}`);
    debug(`${Object.keys(macros).length} macros at ${where}:`.cyan_lt);
    Object.keys(macros).forEach((key, inx, all) =>
    {
        console.error(`${inx}/${all.length}. '${key}'(${Object.keys(macros[key].args_xre || {}).join(",") || "no params"}) ${macros[key].body || "no body"}`.cyan_lt);
    });
    debug(`macro performance: ${expand_macros.calls} calls (${Math.round(expand_macros.perf_time / expand_macros.calls / 100) / 10} usec avg), ${expand_macros.body_substs} body expansions (${pct(expand_macros.body_substs, expand_macros.calls)}%), ${expand_macros.arg_substs} arg expansions`.cyan_lt);
//    return !!macros[name];
}


/*
//read source file (for #include):
module.exports.include =
function include(filename)
{
    filename = pathlib.relative(CWD, filename); //pathlib.resolve(filename);
    debug(`include file '${filename}'`);
    console.log(fs.readFileSync(filename)); //TODO: stream?
//    fs.createReadStream(opts.filename);
}
*/


/////////////////////////////////////////////////////////////////////////////////
////
/// Array extensions/helpers:
//

//if (!Array.prototype.top)
//Object.defineProperty(Array.prototype, "last",
//{
//    get() { return this[this.length - 1]; }, //NOTE: will be undefined with array is empty
//    set(newval) { if (this.length) this[this.length - 1] = newval; else this.push(newval); return this; },
//});
//function top(ary, newval)
//{
//}


function plural(ary, suffix)
{
    return ((ary || []).length != 1)? (suffix || "s"): "";
}
function plurals(ary) { return plural(ary, "s"); }
function plurales(ary) { return plural(ary, "es"); }


function join_flush(ary, sep)
{
//debug("ary", typeof ary, JSON5.stringify(ary));
//debug.nested(+1, "ary", typeof ary, JSON5.stringify(ary));
//    const retval = (ary || []).join(sep);
//    /*if (retval)*/ ary.splice(0, ary.length);
    const retval = Array.prototype.join.apply(ary, Array.from(arguments).slice(1)); //Array.prototype.slice(arguments, 1)); //omit self
    ary.joined_count = ary.length;
    Array.prototype.splice.call(ary, 0, ary.length); //remove all entries
    return retval;
}

function push_fluent(ary, args)
{
//    (ary || []).push.apply(ary, Array.from(arguments).slice(1)); //omit self
//    if (Array.isArray(ary)) ary.push.apply(ary, Array.slice(arguments, 1)); //omit self
    Array.prototype.push.apply(ary, Array.from(arguments).slice(1)); //Array.prototype.slice.apply(arguments, 1)); //omit self
    return ary; //fluent
}

function pop_fluent(ary, args)
{
//    (ary || []).push.apply(ary, Array.from(arguments).slice(1)); //omit self
//    if (Array.isArray(ary)) ary.push.apply(ary, Array.slice(arguments, 1)); //omit self
    Array.prototype.pop.apply(ary, Array.from(arguments).slice(1)); //Array.prototype.slice.apply(arguments, 1)); //omit self
    return ary; //fluent
}

function shift_fluent(ary, args)
{
//    (ary || []).shift.apply(ary, Array.from(arguments).slice(1)); //omit self
//    if (Array.isArray(ary)) ary.shift.apply(ary, Array.slice(arguments, 1)); //omit self
    Array.prototype.shift.apply(ary, Array.from(arguments).slice(1)); //Array.prototype.shift.apply(arguments, 1)); //omit self
    return ary; //fluent
}

function unshift_fluent(ary, args)
{
//    (ary || []).unshift.apply(ary, Array.from(arguments).slice(1)); //omit self
//    if (Array.isArray(ary)) ary.unshift.apply(ary, Array.slice(arguments, 1)); //omit self
    Array.prototype.unshift.apply(ary, Array.from(arguments).slice(1)); //Array.prototype.slice.apply(arguments, 1)); //omit self
    return ary; //fluent
}

//NOTE:
//push = splice(this.length, 0, newvals)
//shift = splice(0, 1)
//unshift = splice(0, 0, newvals)
function splice_fluent(ary, args)
{
//    (ary || []).splice.apply(ary, Array.from(arguments).slice(1)); //omit self
//    if (Array.isArray(ary)) ary.splice.apply(ary, Array.slice(arguments, 1)); //omit self
//    [ary, args] = Array.isArray(this)? [this, arguments]: [ary, Array.prototype.slice(arguments, 1)];
    Array.prototype.splice.apply(ary, Array.from(arguments).slice(1)); //Array.prototype.slice.apply(arguments, 1)); //omit self
    return ary; //fluent
}


/////////////////////////////////////////////////////////////////////////////////
////
/// String extensions/helpers:
//


//NOTE: hard-coded date/time fmt
const date2str =
module.exports.date2str =
function date2str(when)
{
    if (!when) when = new Date(); //when ||= new Date(); //Date.now();
    return `${when.getMonth() + 1}/${when.getDate()}/${when.getFullYear()} ${when.getHours()}:${nn(when.getMinutes())}:${nn(when.getSeconds())}`;
}


//debug(unquoescape('"hello"'));
//debug(unquoescape('\\#not thing'));
//debug(unquoescape('-xa="b c"'));
//process.exit(0);
function unquoescape(str)
{
    const UNESC_QUOTE_xre = XRegExp(`
        (<! \\\\ ) ['"]  #unescaped quote; negative look-behind
    |
        [\\\\'"]  #esc and quote chars
        `, "gx"); //"gmxy");
    return (str || "").replace(UNESC_QUOTE_xre, "");
}
//(?: (?<quotype> (?<! \\\\ ) ['"] ))  #opening quote type; negative look-behind to skip escaped quotes

//remove comment:
//handles // or /**/
//TODO: handle quoted strings
//function nocomment(str)
//{
//    return str.replace(/(\/\/.*|\/\*.*\*\/)$/, "");
//}


//const nn =
//module.exports.nn =
function nn(val) { return (val < 10)? "0" + val: val; }


//regexp fragment for quoted string:
//handles embedded escaped quotes
//based on https://www.metaltoad.com/blog/regex-quoted-string-escapable-quotes
function quostr(name)
{
//https://stackoverflow.com/questions/7376238/javascript-regex-look-behind-alternative
//use negative lookahead instead:   (?<!filename)\.js$   ==>  (?!.*filename\.js$).*\.js$
    const CommentsNewlines_re = /(?<![\\])#.*\n|\n/g;  //strip comments + newlines in case caller comments out parent line
    const CommentsNewlines_xre = XRegExp(`
        (?<! [\\\\] )  #negative look-behind; don't want to match escaped "#"
        \\# .* \n  #in-line comment: any string up until newline
      |
        \n  #just match newline on non-comment lines
        `, "xg");
    if (isNaN(++quostr.count)) quostr.count = 1; //use unique name each time in case multiple included within same parent regex
//CAUTION: use "\\" because this is already within a string
    return `
#        \\s*  #skip leading white space
        (?<quotype${quostr.count}> ['"] )  #capture opening quote type; if it could be escaped, instead use  ((?<![\\])['"])
        (${name? `?<${name}>`: ""}  #start named string capture (optional)
#            [^\\k<quotype${quostr.count}>]+
            (?: . (?! (?<! [\\\\] ) \\k<quotype${quostr.count}>) )  #exclude escaped quotes; use negative lookahead because it's not a char class; CAUTION: double esc here
            *.?  #capture anything up until trailing quote
        )
        \\k<quotype${quostr.count}>  #trailing quote same as leading quote
#        \\s*  #skip trailing white space
        `.spaceRE.replace(CommentsNewlines_re, ""); //strip comments + newlines in case caller comments out parent line; //.replace(/\\/g, "\\\\"); //NO-re-esc for inclusion into parent string
}


//check for quoted string:
//function is_quostr(str)
//{
//    const QUOSTR_xre = XRegExp(`${quostr("inner").anchorRE}`, "x");
//    return ((str || "").match(QUOSTR_xre) || {}).inner;
//}

//add anchors around RE string:
function anchorRE(str) { return `^${str || ""}$`; }

//add white space around RE string:
function spaceRE(str) { return `\\s*${str || ""}\\s*`; }


//quote a string if it contains spaces:
function spquote(str, quotype)
{
    return (str || "").match(/\s/)? quote(str, quotype): str;
}


//escape all newlines:
//makes debug or detecting multiple lines easier
function escnl(str)
{
    return (str || "").replace(/\n/g, "\\n".cyan_lt); //draw attention to newlines (for easier debug)
}

//strip quotes from a string:
//NOTE: returns null if not quoted
function unquote(str)
{
//    const QUOTE_xre = XRegExp(`
//        (?<quotype> ['"] )
//        (?<inner> .* )
//        \\k<quotype>  #string must begin and end with same quote type
//    `/*.spaceRE*/.anchorRE, "x");
    const QUOTE_xre = XRegExp(`${quostr("inner")}`.anchorRE, "x");
//    if (!str.match(QUOTE_xre)) throw `"${str || ""}" is not quoted`.red_lt;
//    return XRegExp.replace(str || "", QUOTE_xre, "$<inner>");
//    return (str || "").replace(QUOTE_xre, "$<inner>");
//console.error(`unquote '${str || "NOSTR"}' = '${JSON.stringify(str.match(QUOTE_xre))}'`);
    return ((str || "").match(QUOTE_xre) || {}).inner || str || "";
}

//strip outer parens "()":
//NOTE: returns null if no parens
function unparen(str)
{
    const PAREN_xre = XRegExp(`
        \\( \\s*
        (?<inner> .* )
        \\s* \\)
    `.spaceRE.anchorRE, "x");
//    return str.replace(/^\(\s*|\s*\)$/g, ""); //strip "()"
//    return (str || "").replace(PAREN_xre, "$<inner>");
    return ((str || "").match(PAREN_xre) || {}).inner || str || "";
}

//add quotes around a string:
function quote(str, quotype) { return `${quotype || '"'}${str || ""}${quotype || '"'}`; }


//unindent a possibly multi-line string:
function unindent(str)
{
    const FIRST_INDENT_xre = XRegExp(`
        ^  #start of string or line ("m" flag)
        (?<indented>  [^\\S\\n]+ )  #white space but not newline; see https://stackoverflow.com/questions/3469080/match-whitespace-but-not-newlines
    `, "xgm");
    var parts = (str || "").match(FIRST_INDENT_xre);
//console.error(`str: '${str.replace(/\n/g, "\\n")}'`);
//console.error(`INDENT: ${parts? parts.indented.length: "NO INDENT"}`);
    return (parts && parts.indented)? str.replace(new RegExp(`^${parts.indented}`, "gm"), ""): str;
}


//strip colors from string:
function nocolors(str)
{
    const ANYCOLOR_xre = XRegExp(`
        \\x1B  #ASCII Escape char
        \\[
        (
            (?<code>  \\d ; \\d+ )  #begin color
          | 0  #or end color
        )
        m  #terminator
        `, "xg");
    return (str || "").replace(ANYCOLOR_xre, "");
}


//reset color whenever it goes back to default:
function color_reset(str, color)
{
//return str || "";
/*
    const COLORS_xre = XRegExp(`
        \\x1B  #ASCII Escape char
        \\[  (?<code> (\\d | ;)+ )  m
        `, "xg"); //ANSI color codes (all occurrences)
    const ANYCOLOR_xre = XRegExp(`
        \\x1B  #ASCII Escape char
        \\[  (?<code> \\d;\\d+ )  m
    `, "x"); //find first color only; not anchored so it doesn't need to be right at very start of string
    const NOCOLOR_xre = XRegExp(`
        \\x1B  #ASCII Escape char
        \\[  0  m
        (?!  $ )  #negative look-ahead: don't match at end of string
    `, "xg"); //`tput sgr0` #from http://stackoverflow.com/questions/5947742/how-to-change-the-output-color-of-echo-in-linux
//    const [init_color, code] = (str || "").match(/^x1B\[(\d;\d+)m/); //extra color code from start of string
//    const [init_color, code] = (str || "").match(ANYCOLOR_re) || ["", "NONE"]; //extract first color code from start of string
//console.error(`str ${str || ""}, code ${code}`);
//    return (str || "").replace(ENDCOLOR_re, color || init_color || "\x1B[0m");
    color = color || ((str || "").match(ANYCOLOR_xre) || [])[0]; //extract first color code from start of string
    return color? (str || "").replace(NOCOLOR_xre, color): str; //set color back to first color instead of no color
*/
    const FIRSTCOLOR_xre = XRegExp(`
        ^  #at start of string
        (?<escseq>
            \\x1B  #ASCII Escape char
            \\[  (?<code>  \\d;\\d+ )  m
        )
        `, "x");
    const UNCOLORED_xre = XRegExp(`
        ( ^ | (?<color_end>  \\x1B \\[ 0 m ))  #start or after previous color
        (?<substr>  .*? )  #string region with no color (non-greedy)
        ( $ | (?<color_start>  \\x1B \\[ \\d+ ; \\d+ m ))  #end or before next color
        `, "xgm"); //match start/end of line as well as string; //`tput sgr0` #from http://stackoverflow.com/questions/5947742/how-to-change-the-output-color-of-echo-in-linux
//    var first, last;
/*
    var uncolored = []; //(ofs, len) pairs where string has no color
    XRegExp.forEach(str || "", UNCOLORED_xre, (match, inx) => 
    {
//        if (match.code == "0") //no color
//        else
        console.error(`match[${inx}]: substr ${match.substr.length}:'${match.substr}', ofs ${match.index}, data ${JSON5.stringify(match)}`);
        if (match.substr.length) uncolored.push({ofs: match.index, len: match.substr.length, });
    });
    console.error(`areas not colored: ${JSON5.stringify(uncolored)}`);
*/
//    var matches = (str || "").match(COLORS_xre);
//    console.error(JSON5.stringify(matches, null, "  "));
    color = ((color || str || "").match(FIRSTCOLOR_xre) || {}).escseq; //extract first color from start if caller didn't specify
//    console.error(`\ncolor to apply: ${JSON.stringify(color)}`);
    return color? (str || "").replace(UNCOLORED_xre, (match, inx) =>
    {
//        console.error(`match[${inx}]: end ${JSON.stringify(match.color_end)}, substr ${match.substr.length}:'${match.substr}', ofs ${match.index}, start ${JSON.stringify(match.color_start)}, data ${JSON5.stringify(match)}`);
        return `${color}${match.substr}${match.color_start || "\x1B[0m"}`; //replace all color ends with new color; reset color at end of line
    }): str; //set color back to first color instead of no color
}


function CamelCase(str)
{
    return (str || "").replace(/([a-z])((\w|-)+)/gi, (match, first, other) => `${first.toUpperCase()}${other.toLowerCase()}`);
}

//return "file:line#":
//mainly for debug or warning/error messages
function srcline(depth)
{
    const want_path = (depth < 0);
//    if (isNaN(++depth)) depth = 1; //skip this function level
    const frame = __stack[Math.abs(depth || 0) + 1]; //skip this stack frame
//console.error(`filename ${frame.getFileName()}`);
    return `@${(want_path? nop: pathlib.basename)(frame.getFileName()/*.unquoted || frame.getFileName()*/, ".js")}:${frame.getLineNumber()}`; //.gray_dk; //.underline;
//    return `@${pathlib.basename(__stack[depth].getFileName(), ".js")}:${__stack[depth].getLineNumber()}`;
}


//convert string to readable stream:
//based on https://stackoverflow.com/questions/12755997/how-to-create-streams-from-string-in-node-js
function str2strm(str)
{
//debug(str.replace(/\n/g, "\\n"));
    const strm = new Readable();
    strm._read = function(){}; //kludge: need to define this for Readable stream
    strm.push(str);
    strm.push(null); //eof
//if (!i ) { strm.pipe(fs.createWriteStream("dj.txt")); continue; }
    return strm;
}


/////////////////////////////////////////////////////////////////////////////////
////
/// Misc extensions/helpers:
//

const error =
module.exports.error =
function error(msg)
{
    if (isNaN(++error.count)) error.count = 1;
    console.error(`[ERROR] ${msg} ${srcline(1)}`.red_lt);
}


const warn =
module.exports.warn =
function warn(msg)
{   
    if (isNaN(++warn.count)) warn.count = 1;
    console.error(`[WARNING] ${msg} ${srcline(1)}`.yellow_lt);
}


//function safe_eval(expr)
//{
//    try { return eval(expr); }
//    catch (exc) { return `ERROR: ${exc} on '${expr}'`; }
//}


//function numkeys(thing) { return Object.keys(thing || {}).length; }


function pct(num, den)
{
    return den? Math.round(100 * num / den): 0;
}

//convert array to dictionary (for faster lookups):
//function ary2dict(ary)
//{
//    return (ary || []).reduce((list, op) => { list[op] = true; return list; }, {});
//}

//function str_trim(str) //trim quotes and trailing semi-colon; NOTE: assumes only 1 param
//{
//    return str.replace(/;\s*$/, "").replace(/^\s*\(\s*(.*)\s*\)\s*$/, "$1");
//}


//placeholder function:
function nop(arg) { return arg; }


function pushline(str)
{
    /*if (str)*/ this.push(`${str || ""}\n`); //maintain correct line#
}

function emit_fluent_delayed(evt, data)
{
//debug("emit fluent", evt, JSON5.stringify(data));
//no    this.emit(evt, data); //kludge: allow caller to install event handlers before firing event
    process.nextTick(() => this.emit(evt, data)); //kludge: allow caller to install event handlers before firing event
    return this; //fluent
}


//safely evaluate a string expr:
//for warnings about eval(), see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/eval
//function safe_eval(expr, params)
//{
//    try { return eval(expr); }
//    catch(exc) { console.error(`EXC: ${exc}`.red_lt); }
//console.error(`safe eval ${(params || []).length} args: "use strict"; return ${expr}; `);
//    return Function(`"use strict"; return ${expr}; `).apply(null, params);
//}


function extensions()
{
//    if (extensions.installed) return; //1x only
//    extensions.installed = true;
    if (isNaN(++extensions.count)) extensions.count = 1;
    debug(`extensions installed ${extensions.count}x`.green_lt); //should only be
//console.error(debug? `debug already defined: ${debug.toString().slice(0, 100)} ...`.green_lt: "no debug yet".red_lt, srcline());
//    if (!debug) debug = function(args) { console.error.apply(console, Array.from(arguments).push_fluent(__srcline)); } //in case debug() not defined yet
//magic globals:
    Object.defineProperty(global, '__srcline', { get: function() { return srcline(1); }, });
//Array:
    [plurals, plurales, join_flush, push_fluent, pop_fluent, shift_fluent, unshift_fluent, splice_fluent].forEach((method) =>
    {
        Array.prototype[method.name] = function(args) //method.bind(no-this, no-this);
        {
            args = unshift_fluent(Array.from(arguments), this); //add self as first param
            return method.apply(this, args);
        };
    }); //bind(null); }); // /*.bind(null, this)*/; debug(`ary.${method.name}`.yellow_lt); });
//if (!Array.prototype.top)
    Object.defineProperty(Array.prototype, "top",
    {
        get() { return this[this.length - 1]; }, //NOTE: will be undefined when array is empty
        set(newval) { if (this.length) this[this.length - 1] = newval; else this.push(newval); }, //return this; },
    });
//process:
    process.hrtime.bigint = function() { var [sec, nsec] = process.hrtime(); return sec * 1e9 + nsec; }
//event emitter (streams):
//    Duplex.prototype.
    EventEmitter.prototype.emit_fluent_delayed = function(evt, data) { return emit_fluent_delayed.call(this, evt, data); }
//JSON:
//    JSON5.sv_stringify = JSON5.stringify;
//    JSON5.stringify = function(args)
//    {
////    console.error("json5.stringify: " + typeof sv_stringify);
//        return (this.sv_stringify.apply(JSON5, arguments) || "").replace(/,(?=\w)/gi, ", ").replace(/:/g, ": "); //put a space after ",:" for easier readability
//    }
//    const JSON5 = require("json5"); //more reader-friendly JSON; doesn't need to be visible to wider scope since we are replacing built-in JSON.stringify; https://github.com/json5/json5
//    const circJSON = require("circular-json");
    JSON.saved_stringify = JSON.stringify;
    JSON.stringify = function(args)
    {
//var test_val0 = JSON.doing_stringify;
//var test_val1 = ++JSON.doing_stringify;
//var test_val2 = ++JSON.doing_stringify? "yes": "no";
//console.error(typeof test_val0, test_val0, typeof test_val1, test_val1, typeof test_val2, test_val2);
//        if (++JSON.doing_stringify) return sv_json_stringify.apply(JSON, arguments); //JSON5 uses JSON; avoid infinite recursion
//        JSON.doing_stringify = 0;
//        return (JSON5.stringify.apply(JSON5, arguments) || "").replace(/,(?=\w)/gi, ", ").replace(/:/g, ": "); //put a space after ",:" for easier readability
//        const want_fixup = (arguments.length < 2) && "replace"; //leave as-is if caller is using custom fmter
        return (JSON.saved_stringify.apply(JSON, arguments) || "")
//            .replace(/"(\w+)":/g, want_fixup? "$1: ": "$1:") //remove quotes from key names, put space after if no fmter passed in
//            /*.replace*/ [want_fixup || "nop"](/,(?=\w)/gi, ", "); //also put a space after "," for easier readability
            .replace(/"(\w+)":/g, "$1: ") //remove quotes from key names, put space after if no fmter passed in
            .replace(/,(?=\w)/gi, ", "); //also put a space after "," for easier readability
}
//XRegExp is interchangeable with RE, so make the API interchangeable as well (allows named captures)
//    console.log(String.prototype.match.toString());
//    String.prototype.sv_match = String.prototype.match;
//NOTE: XRegExp.exec works with non-XRegExp RE also
    String.prototype.match = function(xre) { return XRegExp.exec(this, xre); }; //console.error("is xregexp? " + XRegExp.isRegExp(re)); return XRegExp.exec(this, re); } //XRegExp.isRegExp(re)? XRegExp.exec(this.toString(), re): this.sv_match(re); }
    String.prototype.replace = function(xre, newstr) { return XRegExp.replace(this, xre, newstr); };
//strings:
//    console.log(String.prototype.match.toString());
    String.prototype.quote = function(quotype) { return quote(this/*.toString()*/, quotype); }
//    String.prototype.unquote = function(quotype) { return unquote(this/*.toString()*/, quotype); }
//conflict with prop:    String.prototype.color_reset = function(color) { return color_reset(this.toString(), color); }
    String.prototype.echo_stderr = function(desc, depth) { console.error(`${desc || "echo_stderr"} ${srcline(1 + (depth || 0))}`, this/*.toString()*/); return this; }
    String.prototype.nop = function() { return this; } //for conditional fmting (fluent)
//define parameter-less functions as properties:
    Object.defineProperties(String.prototype,
    {
        quoted: { get() { return quote(this/*.toString()*/); }, },
        quoted1: { get() { return quote(this/*.toString()*/, "'"); }, },
        unquoted: { get() { return unquote(this/*.toString()*/); }, },
        unparen: { get() { return unparen(this/*.toString()*/); }, },
        unquoescaped: { get() { return unquoescape(this/*.toString()*/); }, },
        unindent: { get() { return unindent(this); }, },
//        spquote: { get() { return spquote(this); }, },
        anchorRE: { get() { return anchorRE(this/*.toString()*/); }, },
        spaceRE: { get() { return spaceRE(this/*.toString()*/); }, },
//        color_reset: { get() { return color_reset(this/*.toString()*/); }, },
        nocolors: { get() { return nocolors(this/*.toString()*/); }, },
//        echo_stderr: { get() { console.error("echo_stderr:", this.toString()); return this; }, },
        escnl: { get() { return escnl(this); }, },
    });
//unit tests:
    return;
    debug(`ary.join_flush: ${[1, 2, 3].join_flush(", ")}`);
    debug(`ary.push_fluent: ${[2, 4].push_fluent("3rd")}`);
    debug(`ary.unshift_fluent: ${[1, 5].unshift_fluent("first")}`);
    debug("is quoted?", !!is_quostr(` "quoted" `), !!is_quostr(`"hi" + "bye"`));
    debug("quoted".quoted, '"unquoted1"'.unquoted, "'unquoted2'".unquoted);
    debug(" ( hello ) ".unparen, "anchor".anchorRE, "space".spaceRE);
//    debug(["leader".blue_lt, "intro", "red".red_lt, "more", "green".green_lt, "trailer"].join(" ").color_reset, "hello");
//    debug(["intro", "red".red_lt, "more", "green".green_lt, "trailer"].join(" ").color_reset, "hello");
//    debug(color_reset(["intro", "red".red_lt, "more", "green".green_lt, "trailer"].join(" "), "".pink_lt), "hello");
//    debug(["leader".blue_lt, "intro", "red".red_lt, "more", "green".green_lt].join(" ").color_reset, "hello");
    process.exit(0);
}


/////////////////////////////////////////////////////////////////////////////////
////
/// Command-line interface (can be used in shebangs):
//

module.exports.version = "1.0";

const regexproc_CLI =
module.exports.CLI =
function regexproc_CLI(opts)
{
    const CWD = ""; //param for pathlib.resolve()
    opts = opts || {}; //state + options
//    const args = []; //unused args to be passed downstream
//    const defs = []; //macros to pre-define
//    const regurge = [];
//    CaptureConsole.startCapture(process.stdout, (outbuf) => { regurge.push(outbuf); }); //.replace(/\n$/, "").echo_stderr("regurge")); }); //include any stdout in input
    const files = []; //source files to process (in order)
//    debug.buffered = true; //collect output until debug option is decided (options can be in any order)
    const startup_code = [];
    const downstream_args = [];
//    process.argv_unused = {};
    for (var i = 0; i < process.argv.length; ++i)
        ((i == 2)? shebang_args(process.argv[i]): [process.argv[i]]).forEach((arg, inx, all) => //shebang might also have args (need to split and strip comments)
        {
            downstream_args.push(arg);
            const argdesc = `arg[${i}/${process.argv.length}${(all.length != 1)? `, #!${inx}/${all.length}`: ""}]`;
            debug(`${argdesc}: '${(i == 1)? pathlib.relative(CWD, arg): arg}' =>`.blue_lt);
            if (i < 2) { debug.more("SKIP".blue_lt); return; } //skip node + script file names
//            var parts = arg.match(/^([+-])?([^=]+)(=(.*))?$/);
            const OPTION_xre = XRegExp(`
                (?<onoff> [+-] )?  #turn on/off (optional); allows caller to override either orientation of defaults
                (?<name> [^=\\s]+ )  #name of option
                (
                    \\s*
                    =  #assign non-boolean value (optional)
                    \\s*
                    (?<value> .+ )
                )?
            `.anchorRE, "x");
//debug(debug_out.join_flush("\n"));
            const parts = arg.unquoescaped.match(OPTION_xre) || {name: arg.unquoescaped};
//            debug(parts.name, parts.value);
//            if (!parts /*|| ((parts.onoff == "+") && (parts.value !== undefined))*/) { debug_out.push("INVALID\n".red_lt); unused(argdesc, arg); return error(`invalid option in ${argdesc}: '${arg}'`); }
//debug(argdesc, arg.quoted, typeof parts.onoff, typeof parts.name, typeof parts.value, parts.value === undefined);
//            if (!parts.onoff && (parts.value === undefined)) parts = {name: "filename", value: parts.name/*.unquoted || parts.name).quoted1*/, }; //treat stand-alone value as filename; strip optional quotes //and then re-add
            if (parts.value === undefined) Object.assign(parts, parts.onoff? {value: (parts.onoff == "+")}: {value: parts.name, name: "filename"});
//            if (parts.onoff) parts.value = (parts.onoff == "+");
//            if (opts.changes[parts.name.toLowerCase()] > 1) //option was already specified
//            {
//                warn(`${argname} '${arg}' overrides prior option value`);
//                debug_out.top += "OVERRIDE ".yellow_lt;
//            }
//debug(typeof parts.onoff, typeof parts.name, typeof parts.value);
            debug.more(`${parts.name} = ${spquote(parts.value.toString(), "'")}`.cyan_lt); //${opts[parts.name.toLowerCase()]}`.cyan_lt;
            startup_code.push(`//${argdesc} '${arg}'`); //kludge: maintain arg count for error messages
            switch (parts.name)
            {
                case "echo":
                case "debug":
                    opts[parts.name] = parts.value;
                    debug.more("OPTS".blue_lt);
                    break;
                case "filename":
                    if (!files.length) opts.outfilename = parts.value; //`${parts.value}-out`; //assume first file is main
                    startup_code.top = `#include "${parts.value}"`;
                    files.push(parts.value);
                    debug.more("FILE".blue_lt);
                    downstream_args.pop(); //don't pass this one along
                    break;
//see case regex idea from: https://www.google.com/url?sa=t&rct=j&q=&esrc=s&source=web&cd=1&cad=rja&uact=8&ved=2ahUKEwjwy5qeqLTdAhVF2VMKHWnYC74QFjAAegQIAxAB&url=https%3A%2F%2Fstackoverflow.com%2Fquestions%2F2896626%2Fswitch-statement-for-string-matching-in-javascript&usg=AOvVaw2-zByz2vpbiILX3nCtu5xT
//                case parts.name.match(/^U/) && parts.name: startup_code.push(`#undef ${parts.name.substr(1)}`); break; //undef(parts.name); break;
                case (parts.name.match(/^[DU]/) || {}).input:
                    const Directives = {D: "#define", U: "#undef"}; //cmd line arg => #directive
                    startup_code.top = `${Directives[parts.name[0]]} ${parts.name.substr(1)}  ${parts.value || ""}`; //define(parts.name, parts.value); break;
                    debug.more("MACRO".blue_lt);
                    downstream_args.pop(); //don't pass this one along
                    break;
                default:
//                    unused(argdesc, arg);
                    debug.more("DEFER".blue_lt);
            }
        });
//    console.log(JSON.stringify(opts, null, "  "));
//    Object.keys(opts).forEach((key) =>
//    {
//        if (key.toLowerCase() in opts.changes) return;
//        debug_out.push(`default option: ${`${key} = ${opts[key]}`.cyan_lt}`); //show default options also
//    });
    debug.enabled = opts.debug; //flush or discard now that caller's intention is known
//#!./prexproc.js ./pic8-dsl.js +debug \#not-a-comment "arg with space" +preproc -DX  -UX  -DX=4  -DX="a b" +echo +ast -run -reduce -codegen  #comment out this line for use with .load in Node.js REPL
    debug(`${__file}: ${files.length} source file${files.plurals()} to process ...`.green_lt, files.join(", "));
    if (!files.length) startup_code.push("#include -"); //files.push("-"); //read from stdin if no other input files specified
//    if (opts.help) console.error(`usage: ${pathlib.basename(__filename)} [+-codegen] [+-debug] [+-echo] [+-help] [+-src] [filename]\n\tcodegen = don't generate code from ast\n\tdebug = show extra info\n\techo = show macro-expanded source code into REPL\n\tfilename = file to process (defaults to stdin if absent)\n\thelp = show usage info\n\tsrc = display source code instead of compiling it\n`.yellow_lt);
//    files.index = 0;
//    var regurge = [];
/*
    const instrm = CombinedStream.create();
//    const instrm = str2strm(regurge.join_flush("")); //CombinedStream.create();
//if (false)
    instrm.append((next) => //lazy load next file
    {
//        const filename = files[files.index], is_stdin = (filename == "-");
        var filename;
        const {strm, desc} =
            regurge.length? {strm: str2strm(regurge.join_flush("").echo_stderr("regurge:")), desc: `${regurge.joined_count} regurge line${regurge.plurals()}`}: //inject stdout back into input stream; allows self-modifying source code :)
//            (files.index < files.length)? {strm: is_stdin? process.stdin: fs.createReadStream(filename), desc: `file[${files.index || 0}/${files.length}] '${filename}'`}:
            (filename = files[files.index++])? {strm: (filename == "-")? process.stdin: fs.existsSync(filename) && fs.createReadStream(filename), desc: `file[${files.index - 1}/${files.length}] ${filename.quoted1 || "(end)"}`}:
            {desc: "eof"};
        debug(`next read ${desc} ...`.green_lt);
        next(strm);
    });
*/
//    debug("unused args:".yellow_lt, Object.keys(process.argv_unused || {}).map((key) => { return process.argv_unused[key]; }).join(", "));
//    files.forEach((filename) => { startup_code.push(`#include "${filename}"`); });
//    const instrm = str2strm(`${startup_code.join("\n").echo_stderr("startup code:")}`);
//    debug(`preproc: reading from ${opts.filename || "stdin"} ...`.green_lt);
//    const instrm = Readable({highWaterMark});
//    const [instrm, outstrm] = [opts.filename? fs.createReadStream(opts.filename.unquoted): process.stdin, process.stdout]; //fs.createWriteStream("dj.txt")];
//    const retstrm =
//    return instrm
    opts.infilename = `${__file}-cmdline-in`; //"startup_code";
//    process.argv = downstream_args;
//console.error("args->", JSON5.stringify(process.argv));
    return str2strm(startup_code.join("\n"))
//        .pipe(echo_stream(opts))
        .pipe(regexproc(opts)) //: new PassThrough())
        .emit_fluent_delayed("args", downstream_args)
//        .on("data", (data) => { debug(`data: ${data}`.blue_lt)}) //CAUTION: pauses flow
        .on("finish", () => eof("finish"))
        .on("close", () => eof("close"))
        .on("done", () => eof("done"))
        .on("end", () => eof("end"))
        .on("error", err => { eof(`ERROR ${err}`.red_lt); process.exit(); });
//    debug("preproc: finish asynchronously".green_lt);
//    retstrm.emit("dsl-opts", opts);
//    return retstrm;

    function eof(why)
    {
//        CaptureConsole.stopCapture(process.stdout);
        debug(`${__file} stream: ${why || "eof"}`.green_lt);
        console.error(`${warn.count || 0} warnings`.yellow_lt);
        console.error(`${error.count} errors`.red_lt);
    }
//    function unused(desc, val)
//    {
//        process.argv_unused = process.argv_unused || {};
//        process.argv_unused[desc] = val;
//    }
}

if (!module.parent) regexproc_CLI().pipe(process.stdout); //auto-run CLI, generated output to console

//eof