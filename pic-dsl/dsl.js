#!/usr/bin/env node
//DSL-to-Javascript AST streamer

"use strict";
require("magic-globals"); //__file, __line, __func, etc
require("colors").enabled = true; //for console output; https://github.com/Marak/colors.js/issues/127
const fs = require("fs");
const pathlib = require("path");
const XRegExp = require("xregexp"); //https://github.com/slevithan/xregexp
const JSON5 = require("json5"); //more reader-friendly JSON; https://github.com/json5/json5
extensions();

//https://stackoverflow.com/questions/7376238/javascript-regex-look-behind-alternative
//use negative lookahead instead:   (?<!filename)\.js$   ==>  (?!.*filename\.js$).*\.js$
const CommentsNewlines_re = /(?<![\\])#.*\n|\n/g;  //strip comments + newlines in case caller comments out parent line
console.error(`test ${JSON5.stringify(quostr("test"))}`.yellow_lt);

const xre_test = XRegExp(`
    ^ \\s*  #start of string (leading white space should already have been skipped)
    ${quostr("inner")}  #optionally quoted string
#    (?<quotype1> ['"]) (?<inner> .*) \\k<quotype1>
    ( \\s* ; )?  #optional trailing ";"
    \\s* $  #ignore trailing white space
    `.replace(CommentsNewlines_re, ""), 'xi');
        
var test = " 'a \"string' ".match(xre_test);
if (!test) test = {quote: "NOPE", inner: "NOPE"};
console.error("match1?".cyan_lt, JSON5.stringify(test), `#${test.quotype1}#`, `#${test.inner}#`);
//test = "\"this is \\\"another 'string'\"".match(xre_test);
//console.error("match2?".cyan_lt, JSON5.stringify(test), `#${test.quotype2}#`, `#${test.inner}#`);
process.exit(0);

//debugger;
//console.log(JSON5.stringify(eval("'hi,' + ' there'")));
//const re_test = XRegExp(`(?<year>[0-9]{4} ) -?  # year
//          (?<month>[0-9]{2} ) -?  # month
//          (?<day>[0-9]{2} )     # day`, 'x');
//const result = "2015-01-02".match(re_test); //XRegExp.exec("2015-01-02", re_test);
//console.log(`match yr ${result.year}, mon ${result.month}, day ${result.day}, result ${JSON5.stringify(result)}`.blue_lt);
//console.log(`re ${JSON5.stringify(re_test)}`.blue_lt);
//process.exit(0);

const CWD = ""; //param for pathlib.resolve()


////////////////////////////////////////////////////////////////////////////////
////
/// Transform DSL source code to Javascript (stream):
//

const {LineStream} = require('byline');
const DuplexStream = require("duplex-stream"); //https://github.com/samcday/node-duplex-stream
const {/*Readable, Writable,*/ PassThrough} = require("stream");
const thru2 = require("through2"); //https://www.npmjs.com/package/through2
const RequireFromString = require('require-from-string');
const CaptureConsole = require("capture-console");
const toAST = require("to-ast"); //https://github.com/devongovett/to-ast
//const REPL = require("repl"); //https://nodejs.org/api/repl.html


const dsl2ast =
module.exports.dsl2ast =
function dsl2ast(opts) //{filename, replacements, prefix, suffix, echo, debug, run, ast, shebang}
{
//    if (!opts) opts = {};
    global.JSON5 = JSON5; //make accessible to child modules
    global.opts = opts || {}; //make command line args accessible to child (dsl) module
//TODO: define custom ops
//    const instrm = new Readable();
//    const outstrm = //new Writable();
//    instrm
//        .pipe(new LineStream({keepEmptyLines: true})) //preserve line#s (for easier debug)
//        .pipe(thru2(xform, flush)); //{ objectMode: true, allowHalfOpen: false },
//        .pipe(outstrm);
//    retval.infile = infile;
//    PreProc.latest = retval;
//    return new DuplexStream(outstrm, instrm); //return endpts; CAUTION: swap in + out
//    instrm.pipe = function(strm) { return outstrm.pipe(strm); };
//    return instrm;
    const instrm = new PassThrough(); //wrapper end-point
//    const instrm = new LineStream({keepEmptyLines: true}); //preserve line#s (for easier debug)
//    if (opts.debug)
//    {
//        console.error(`${process.argv.length} dsl args:`.blue_lt);
//        for (var a in process.argv)
//            console.error(`arg[${a}/${process.argv.length}]: '${process.argv[a]}'`.blue_lt);
//    }
    const outstrm = instrm
        .pipe(new LineStream({keepEmptyLines: true})) //preserve line#s (for easier debug and correct #directive handling)
//        .pipe(preproc())
        .pipe(thru2(/*{objectMode: false},*/ xform, flush)); //syntax fixups
/*NOTE: REPL doesn't really add any value - can load module from source code instead
    if ("run" in opts) //execute logic
    {
        const [replin, replout] = [outstrm, new PassThrough()]; //new end-point
        const repl = REPL.start(
        {
            prompt: "", //don't want prompt
            input: replin, //send output from DSL code to repl
            output: replout, //send repl output to caller
//            eval: "tbd",
//            writer: "tbd",
            replMode: REPL.REPL_MODE_STRICT, //easier debug
            ignoreUndefined: true, //only generate real output
//            useColors: true,
        });
//        repl.defineCommand(kywd, func);
        if (opts.debug) repl
            .on("exit", data => { if (!data) data = ""; console.error(`repl exit: ${typeof data} ${data.toString().length}:${data.toString()}`.cyan_lt); })
        if (opts.debug) replin
            .on("data", data => { if (!data) data = ""; console.error(`repl in len ${data.toString().length}: ${data.toString().replace(/\n/gm, "\\n")}`.blue_lt); })
            .on("end", data => { if (!data) data = ""; console.error(`repl in end: ${typeof data} ${data.toString().length}:${data.toString()}`.cyan_lt); })
            .on("finish", data => { if (!data) data = ""; console.error(`repl in finish: ${typeof data} ${data.toString().length}:${data.toString()}`.cyan_lt); })
            .on("close", data => { if (!data) data = ""; console.error(`repl in close: ${typeof data} ${data.toString().length}:${data.toString()}`.cyan_lt); })
            .on("error", data => { if (!data) data = ""; console.error(`repl in error: ${typeof data} ${data.toString().length}:${data.toString()}`.red_lt); });
//        const module = RequireFromString()[opts.run]();: new PassThrough());
        if (opts.debug) replout
            .on("data", data => { if (!data) data = ""; console.error(`repl out len ${data.toString().length}: ${data.toString().replace(/\n/gm, "\\n")}`.blue_lt); })
            .on("end", data => { if (!data) data = ""; console.error(`repl out end: ${typeof data} ${data.toString().length}:${data.toString()}`.cyan_lt); })
            .on("finish", data => { if (!data) data = ""; console.error(`repl out finish: ${typeof data} ${data.toString().length}:${data.toString()}`.cyan_lt); })
            .on("close", data => { if (!data) data = ""; console.error(`repl out close: ${typeof data} ${data.toString().length}:${data.toString()}`.cyan_lt); })
            .on("error", data => { if (!data) data = ""; console.error(`repl out error: ${typeof data} ${data.toString().length}:${data.toString()}`.red_lt); });
        outstrm = replout;
//        outstrm.on("exit", () => { });
//        console.log(JSON.stringify(toAST(func), null, "  "));
//    recursively walk ast;
//    for each function call, add func to list
//           if (func.toString().match(/main/))
//             console.log(CodeGen(wait_1sec));
    }
*/
    const retval = new DuplexStream(outstrm, instrm); //return endpts for more pipelining; CAUTION: swap in + out
    CaptureConsole.startCapture(process.stdout, (outbuf) => { xform.call(retval, "//stdout: " + outbuf, "utf8", function(){}); --retval.numlines; }); //send all stdout downstream thru pipeline
    return retval;

    function xform(chunk, enc, cb)
    {
        if (!this.chunks) this.chunks = [];
        if (isNaN(++this.numlines)) this.numlines = 1;
        if (typeof chunk != "string") chunk = chunk.toString(); //TODO: enc?
        if (!opts.shebang && !this.chunks.length && chunk.match(/^\s*#\s*!/)) { this.chunks.push(`//${chunk} //${chunk.length}:line 1`); cb(); return; } //skip shebang; must occur before prepend()
        if (chunk.length)
        {
//            if (this.chunks.last.slice(-1) == "\\") this.chunks.last = this.chunks.last.
//            if (!opts.shebang && (this.linenum == 1) && chunk.match(/^\s*#\s*!/)) { this.chunks.push("//" + chunk + "\n"); cb(); return; } //skip shebang; must occur before prepend()
            if (!this.linebuf) this.linenum = this.numlines; //starting new line; remember line#
            if (chunk.slice(-1) == "\\") //line continuation (mainly for macros)
            {
                if (chunk.indexOf("//") != -1) warn(`single-line comment on ${this.numlines} interferes with line continuation from ${this.linenum}`);
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
        if (this.linebuf) //process or flush
        {
//    `(?<year>  [0-9]{4} ) -?  # year
//     (?<month> [0-9]{2} ) -?  # month
//     (?<day>   [0-9]{2} )     # day`, 'x');
            const PREPROC_xre = new XRegExp //CAUTION: use "\\" because this is already within a string
            (`
                ^ \\s*  #start of line, ignore leading white space
                \\# \\s* (?<directive> [a-z]+ ) \\s*  #directive name; TODO: allow regex or special chars?
#                (?<trailer> [^\\s] .*? )? \\s*  #optional trailing stuff (non-greedy)
                (?<trailer> .+? )? \\s*  #optional trailing stuff; NOTE: non-greedy so white space matches surrounding patterns
                ;? \\s* ($ | //)  #ignore trailing delimiter and/or white space
            `, "xi");
//            var parts = this.linebuf.match(/^\s*#\s*([a-z0-9_]+)\s*(.*)\s*$/i);
//            var {directive, trailer} =
            var parts = this.linebuf.match(PREPROC_xre /* /^\s*#\s*([a-z0-9_]+)\s*(.*)\s*$/i */);
if (parts) console.error(`dir '${parts.directive}', trailer '${parts.trailer}'`);
//            if (parts) parts.trailer = parts.trailer.replace(/^\s+/, ""); //TODO: fix this
//if (parts) console.error(this.numlines + " " + JSON5.stringify(parts)); //CAUTION: log() causes inf loop
            this.linebuf = parts? preproc(parts.directive, parts.trailer, this.linenum): macro(this.linebuf); //handle directives vs. expand macros
//            if (parts) { warn(`TODO: #${parts[1]} on line ${this.linenum}`); this.linebuf = "//" + this.linebuf; }
            if (this.linebuf) this.chunks.push(`${this.linebuf} //${this.linebuf.length}:line ${this.linenum}`); //+ "\n"); //chunk); //re-add newline to compensate for LineStream
    //            this.push(chunk);
            this.linebuf = null;
        }
        cb();
    }

    function flush(cb)
    {
        CaptureConsole.stopCapture(process.stdout);
//        append.call(this);
//        if (opts.run) this.push(`const ast = require("${process.argv[1]}").walkAST(${opts.run});\n`);
        if (!this.chunks) this.chunks = [];
        if (this.linebuf)
        {
            warn(`line continuation at end of file ${this.linenum}`);
            this.chunks.push(this.linebuf + "\\"); //flush last partial line, don't expand macros since it was incomplete
        }
//prepend/append wrapper code:
        this.chunks.splice(0, 0, `
            //PREFIX:
            "use strict";
            const {/*include, walkAST,*/ step} = require("./dsl.js");
            module.exports = function(){ //wrap all logic so it's included within AST
            ${opts.prefix || ""}
            `.replace(/^\s+/gm, "")); //drop leading spaces; heredoc idea from https://stackoverflow.com/questions/4376431/javascript-heredoc
        this.chunks.push(`
            //SUFFIX:
//            if (typeof run == "function") run();
            ${opts.suffix || ""}
            ${!opts.run? "//": ""}autoexec();
            } //end of wrapper
            `.replace(/^\s+/gm, ""));
//compile and get AST:
//        console.error(`${this.chunks.length} chunks at flush`);
        if (opts.echo) console.error(this.chunks.join("\n").cyan_lt); //show source code input
        const module = RequireFromString(this.chunks.join("\n"));
        if (opts.debug) Object.keys(module).forEach((key, inx, all) => { console.error(`dsl export[${inx}/${all.length}]: ${typeof module[key]} '${key}'`.blue_lt); }, this);
//            this.push(JSON.stringify(compiled, null, "  ") + "\n");
//            this.push(Object.keys(compiled).join(", ") + "\n");
//            if (opts.ast)
//            {
//                if (opts.run) warn("ignoring -run (overridden by -ast)");
//                this.push(/*"const ast = " +*/ JSON.stringify(toAST(module), null, "  ") + "\n");
//            } else
//            if (opts.run) //always run module so load-time logic will execute; -run flag will control nested debug/sim via suffix
//            {
//            console.error("run ...".green_lt);
        module(); //execute load-time logic; start run-time sim if -run flag is present (see suffix)
//            console.error("... ran".red_lt);
//            }
//debugger; //c = continue, n = step next, s = step in, o = step out, pause, run, repl, exec, kill, scripts, version, help
        const ast_raw = new AstNode(toAST(module)).add_ident("DSL_top"); //make it easier to identify in debug/error messages
        if (opts.ast) console.error(JSON5.stringify(ast_raw, null, "  ")); //show raw AST; TODO: make this more stream-friendly?
//        /*if (opts.ast)*/ this.push(/*"const ast = " +*/ ast + "\n"); //send downstream
//            this.vars = {};
//            this.funcs = {};
//            this.consts = {};
//cb(); return;
        const ast = !opts.no_reduce? reduce(ast_raw): ast_raw;
        if (opts.ast && !opts.no_reduce)
        {
            if (opts.debug) console.error(`${numkeys(ast.context)} consts during reduce: ${Object.keys(ast.context || {}).join(", ")}`.blue_lt);
            console.error(JSON5.stringify(ast, null, "  ").pink_lt); //show reduced AST
        }
//        traverse(ast, function(evttype, data) { this.emit(evttype, data); }); //emit events for AST nodes
//        const tree = {};
//        callgraph(ast, tree); //for 
//            else this.push("TODO: code gen\n");
//            compiled.execode
//            this.push(`walked ast, ${Object.keys(this.consts).length} consts: ${Object.keys(this.consts).join(", ")}\n`);
        console.error(`flushed ${this.chunks.length} chunks, walked ast`);
//            console.error(`walked ast`);
//            console.error(`${Object.keys(this.vars).length} vars: ${Object.keys(this.vars).join(", ")}`);
//            console.error(`${Object.keys(this.funcs).length} funcs: ${Object.keys(this.funcs).map((key) =>
        const stack = {symtab: {}};
        stack.new_frame = function()
        {
            return {nest: (this.nest || 0) + 1, symtab: Object.assign({}, this.symtab || {}), new_frame: this.new_frame, }; //shallow copy to new stack frame
        }
        traverse(ast, stack, (evt, data) => { retval.emit(evt, data); });
        Object.keys(stack.symtab || {}).forEach((key) => { if (!stack.symtab[key]) warn(`undefined symbol in '${nameof(ast)}': ${symtype(stack.symtab[key])}:'${key}'`); }); //check for undefined stuff within this context
        if (opts.debug)
        console.error(`${numkeys(stack.symtab)} symbols: ${Object.keys(stack.symtab).map((key) =>
        {
            return `${symtype(stack.symtab[key])}:'${key}'`; //|| "(UNDEF)"}`;
        }).join(", ")}`.blue_lt);
//        if (opts.traverse) opts.traverse(ast.body, opts); //strip off wrapper before passing to custom DSL processor
//            else this.push("TODO: code gen\n");
//            compiled.execode
        cb();
    }
}


//expand macros:
function macro(linebuf)
{
//keep expanding while there is more to do:
    while (Object.keys(macro.defs || {}).some((macro_name) =>
    {
        if (linebuf.match)
//            if (macro.defs[m].arglist !== null) //with arg list
//                linebuf.replace()
//also: "#str" and "token ## token"
        return false;
    }));
    return linebuf;
}

//preprocessor directives:
function preproc(cmd, linebuf, linenum)
{
    var parts;
//    if (arguments.length == 1) [cmd, linebuf] = [null, cmd];
//console.log(`macro: cmd '${cmd}', line '${(linebuf || "").replace(/\n/gm, "\\n")}'`);
    switch (cmd)
    {
//        case "define"
        case "warning": //convert to console output (so that values will be expanded)
//NOTE: allow functions, etc; don't mess with quotes            if (!linebuf.match(/^[`'"].*[`'"]$/)) linebuf = "\"" + linebuf + "\"";
            return `console.error(${str_trim(linebuf)});`; //add outer () if not there (remove + readd)
        case "error": //convert to console output (so that values will be expanded)
//            if (!linebuf.match(/^`.*`$/)) linebuf = "`" + linebuf + "`";
//            return `console.error(${linebuf}); process.exit(1);`;
            return `throw ${linebuf}`; //leave quotes, parens as is
        case "include": //generate stmt to read file, but don't actually do it (REPL will decide)
            debugger;
            const INCLUDE_xre = new XRegExp //CAUTION: use "\\" because this is already within a string
            (`
                ^  #start of string (leading white space should already have been skipped)
                (
                    \\( \\s* ${quostr("paren_filename")} \\s* \\)  #quoted string within "()"
                  | ${quostr("quo_filename")}  #or quoted string
                  | (?<bare_filename> [^\\s]+ )  #or space-delimited string
                )
                ( \\s* ; )?  #optional trailing ";"
                \\s* $  #ignore trailing white space
            `, "xi");
            console.error(INCLUDE_xre.source.replace(/\\/g, " BSL ").pink_lt);
//            parts = linebuf.match(/^\s*(\(\s*([^"]+)\s*\)|"([^"]+)"|([^ ]+))(\s*;)?\s*$/); //quotes optional if no embedded spaces
            parts = linebuf.match(INCLUDE_xre); //quotes optional if no embedded spaces
            if (!parts) warn(`invalid #include file '${linebuf}' on line ${linenum}`);
//            else parts.filename = parts.filename1 || parts.filename2 || parts.filename3 || "(no file)";
//            console.error(`'${linebuf}' => pname '${parts.pname}', qname '${parts.qname}', sname '${parts.sname}'`); //${JSON5.stringify(parts)}`);
//            const [instrm, outstrm] = [infile? fs.createReadStream(infile.slice(1, -1)): process.stdin, process.stdout];
//console.error(`read file '${parts[2] || parts[3]}' ...`);
//            var contents = fs.readFileSync(parts[2] || parts[3]); //assumes file is small; contents needed in order to expand nested macros so just use sync read
//            return contents;
//wrong            return `include(${str_trim(linebuf)});`; //add outer () if not there (remove + readd)
            console.error(`include-1 file paren '${parts.paren_filename}', quo '${parts.quo_filename}', bare '${parts.bare_filename}'`);
            var filename = parts.paren_filename || parts.quo_filename || `"${parts.bare_filename || "nofile"}"`;
            var filename = /*parts.expr? eval(parts.expr):*/ pathlib.resolve(CWD, eval(filename)); //pathlib.resolve(filename);
            console.error(`include-2 file '${filename}'`);
//            console.log(fs.readFileSync(filename)); //TODO: stream?
//    fs.createReadStream(opts.filename);
            return fs.readFileSync(filename); //TODO: stream?
        case "define": //save for later expansion
            if (!macro.defs) macro.defs = {};
//TODO: allow reg ex name here, or special chars within name ~ awk patterns
            parts = linebuf.match(/^([a-z0-9_]+)\s*(\(\s*([^)]*)\s*\)\s*)?(.*)$/i); //TODO: allow $ or @?
            if (!parts) warn(`ignoring invalid macro definition on line ${linenum}`);
            else if (macro.defs[parts[1]]) warn(`ignoring duplicate macro '${parts[1]}' definition on line ${linenum}, prior was ${macro.defs[parts[1]].linenum}`);
            else macro.defs[parts[1]] = {/*pattern: new Regexp("[^a-z0-9_]" + parts[1],*/ arglist: parts[3], body: parts[4], linenum};
            return `function ${parts[1]}${parts[2] || "()"} { ${parts[4]} }`; //convert to function def
//            return; //no output
        default:
            warn(`ignoring unrecognized pre-processor directive '${cmd}' (line ${linenum})`);
            return linebuf;
    }
}


////////////////////////////////////////////////////////////////////////////////
////
/// AST helpers:
//

//allow func calls to be distinguished from vars:
//NOTE: both must be falsey
const UNDEF_FUNC = false, UNDEF_VAR = 0;

//reduce typos by using symbolic names for AST node types:
const CallExpression = "CallExpression"; //{type, callee{}, arguments[]}
const BinaryExpression = "BinaryExpression"; //{type, operator, left{}, right{}}
const LogicalExpression = "LogicalExpression"; //{type, operator, left{}, right{}}
const AssignmentExpression = "AssignmentExpression"; //{type, operator, left{}, right{}}
const BlockStatement = "BlockStatement"; //{type, body[]}
const ExpressionStatement = "ExpressionStatement"; //{type, expression{}}
const VariableDeclarator = "VariableDeclarator"; //{type, id, init{}, kind-inherited}
const FunctionExpression = "FunctionExpression"; //{type, id{}, params[], defaults[], body{}, generator, expression}
const FunctionDeclaration = "FunctionDeclaration"; //{type, id{}, params[], defaults[], body{}, generator, expression}
const ArrowFunctionExpression = "ArrowFunctionExpression"; //{type, id{}, params[], defaults[], body{}, generator, expression}
const IfStatement = "IfStatement"; //{type, test{}, consequent{}, alternate{}}
const ForStatement = "ForStatement"; //{type, init{}, test{}, update{}, body{}}
const WhileStatement = "WhileStatement"; //{type, test{}, body{}}
const UnaryExpression = "UnaryExpression"; //{type, operator, argument{}}
const UpdateExpression = "UpdateExpression"; //{type, operator, argument{}, prefix}
const YieldExpression = "YieldExpression"; //{type, argument{}, delegate}
const VariableDeclaration = "VariableDeclaration"; //{type, declarations[], kind}
const ObjectExpression = "ObjectExpression"; //{type, properties[]}
const Property = "Property"; //{type, key{}, computed, value{}, kind, method, shorthand}
const ArrayExpression = "ArrayExpression"; //{type, elements[]}
const ThrowStatement = "ThrowStatement"; //{type, argument{}}
const ReturnStatement = "ReturnStatement"; //{type, argument{}}
const NewExpression = "NewExpression"; //{type, callee{}, arguments[]}
const SwitchStatement = "SwitchStatement"; //{type, discriminant{}, cases[]}
const SwitchCase = "SwitchCase"; //{type, test{}, consequent[]}
const TemplateLiteral = "TemplateLiteral"; //{type, quasis[], expressions[]}
const TemplateElement = "TemplateElement"; //{type, value{}, tail}
const MemberExpression = "MemberExpression"; //{type, computed, object{}, property{}}
const Literal = "Literal"; //{type, value, raw}
const BreakStatement = "BreakStatement"; //{type, label}
const Identifier = "Identifier"; //{type, name}
const EmptyStatement = "EmptyStatement"; //{type}
const ThisExpression = "ThisExpression"; //{type}


//add some props and methods to raw AST nodes:
const AstNode =
module.exports.AstNode =
function AstNode(props, parent)
{
    props.context = props.context || (parent || {}).context || {}; //inherit from parent
//    if (!(this instanceof AstNode)) return new AstNode(opts, parent);
//    if (!(this instanceof AstNode)) return Object.create(AstNode.prototype, opts);
    return Object.assign((this instanceof AstNode)? this: Object.create(AstNode.prototype), props);
/*
    if (this instanceof AstNode) return this;
//    {
        opts.prototype = AstNode; //make it a typed object
        return opts;
//    }
//    Object.assign(this, opts || {});
//    this.consts = this.consts || {}; //used for const expr reduction
*/
}
AstNode.prototype.stack_frame = function() { return {context: Object.assign({}, this.context)}; } //shallow copy to new stack frame
//set additional props (fluent):
AstNode.prototype.why = function(comment) { this.comment = comment; return this; }
AstNode.prototype.add_ident = function(name) { this.id = this.id || {type: Identifier, name}; return this; }
AstNode.prototype.assn_value = function(val) { this.operator = "="; this.right = makeconst(val); return this; }
AstNode.prototype.add_const = function(val) { this.context = this.context || {}; this.context[nameof(this)] = val; return this; }
//AstNode.prototype.set_context = function(parent, force) { if (!this.context || force) this.context = parent.context; return this; }

/*
const walkAST =
module.exports.walkAST =
function walkAST(opts) //{}
{
    const instrm = new PassThrough(); //wrapper end-point
//    const instrm = new LineStream({keepEmptyLines: true}); //preserve line#s (for easier debug)
    const outstrm = instrm
//        .pipe(preproc())
        .pipe(thru2(xform, flush)); //syntax fixups
//    outstrm.reduce = reduce;
//    outstrm.traverse = traverse;
    const retstrm = new DuplexStream(outstrm, instrm); //return endpts for more pipelining; CAUTION: swap in + out
    return retstrm;

    function xform(chunk, enc, cb)
    {
        if (!this.chunks) this.chunks = [];
        if (typeof chunk != "string") chunk = chunk.toString(); //TODO: enc?
        if (chunk.length) this.chunks.push(chunk);
        cb();
    }
    function flush(cb)
    {
        if (this.chunks)
        {
            const ast_raw = JSON5.parse(this.chunks.join("\n")); //rebuild AST in memory
            if (!ast_raw.id) ast_raw.id = {type: "Identifier", name: "DSL-top-level"}; //make it easier to identify in debug/error messages
//            this.vars = {};
//            this.funcs = {};
//            this.consts = {};
            this.symtab = {};
            const ast = !opts.reduce? reduce(ast_raw, this.symtab): ast_raw;
            if (opts.ast && !opts.reduce) console.error(JSON5.stringify(ast, null, "  ").pink_lt); //show reduced AST also
            traverse(ast, "entpt"); //emit events for AST nodes
//            else this.push("TODO: code gen\n");
//            compiled.execode
//            this.push(`walked ast, ${Object.keys(this.consts).length} consts: ${Object.keys(this.consts).join(", ")}\n`);
            this.push("walked ast\n");
//            console.error(`walked ast`);
//            console.error(`${Object.keys(this.vars).length} vars: ${Object.keys(this.vars).join(", ")}`);
//            console.error(`${Object.keys(this.funcs).length} funcs: ${Object.keys(this.funcs).map((key) =>
            Object.keys(this.symtab).forEach((key) => { if (!this.symtab[key]) warn(`undefined symbol in '${nameof(ast_raw)}': '${key}'`); }); //check for undefined stuff within this context
            console.error(`walked ast, ${Object.keys(this.symtab).length} symbols: ${Object.keys(this.symtab).map((key) =>
            {
                return `${symtype(this.symtab[key])}:${key}`; //|| "(UNDEF)"}`;
            }).join(", ")}`);
//            console.error(`${Object.keys(this.consts).length} consts: ${Object.keys(this.consts).join(", ")}`);
        }
        else this.push("no output :(\n");
        cb();
    }
}
*/


//coalesce compile-time constants, drop run-time functions:
//NOTE: this is an optional pass; caller can disable
function reduce(ast_node, parent) //, symtab)
{
//        const EMPTY_STMT = {type: "EmptyStatement"};
    const NULL_EXPR = makeconst(null); //{type: "Literal", value: null, raw: null};
//    NULL_EXPR.why = function(comment) { return AstNode(this).why(comment); } //kludge: clone before setting comment
//        context = context || this.symtab; //default to globals

//TODO: inline short or explicitly requested functions
    if (!ast_node) return;
    ast_node = AstNode(ast_node, parent); //add helper methods
    switch (ast_node.type)
    {
//node types with optimization:
        case CallExpression: //{type, callee{}, arguments[]}
            ast_node.callee = reduce(ast_node.callee, ast_node);
            if (ignore(nameof(ast_node.callee))) return NULL_EXPR.why("ignore ext func"); //NULL_EXPR; //exclude Node.js run-time functions
            (ast_node.arguments || []).forEach((arg, inx, all) => { all[inx] = reduce(arg, ast_node); });
            if (nameof(ast_node.callee).match(/^Math\./)) 
//                    if (isconst(ast_node)) return makeconst(eval(`${nameof(ast_node.callee)}()
                if (ast_node.arguments.every((arg) => { return isconst(arg); }))
                    return makeconst(`${nameof(ast_node.callee)}(${ast_node.arguments.map((arg) => { return arg.value; }).join(", ")})`).why("built-in(all const) eval");
//                if ((this.symtab[nameof(ast_node)] || {}).my_type ==)
//            symtab[nameof(ast_node.callee)] = symtab[nameof(ast_node.callee)] || null; //create fwd ref if not defined yet
            break;
        case BinaryExpression: //{type, operator, left{}, right{}}
        case LogicalExpression: //{type, operator, left{}, right{}}
        case AssignmentExpression: //{type, operator, left{}, right{}}
//TODO: reduce/recast MAD (multiply-add) instr?
            ast_node.left = reduce(ast_node.left, ast_node);
            ast_node.right = reduce(ast_node.right, ast_node);
//                console.error(`coalese lhs ${ast_node.left.type} ${ast_node.operator} rhs ${ast_node.right.type}? ${isconst(ast_node.left) && isconst(ast_node.right)}`);
//check for const result:
            const BENIGN_OPS = ary2dict(["!=",  "|", "^", "+", "-",  "|=", "^=", "+=", "-="]);
            const ZERO_OPS = ary2dict(["&", "*", "&=", "*="]);
//debug_node(AstNode(ast_node.left).why(ast_node.operator + " lhs is const? " + isconst(ast_node.left)));
//debug_node(AstNode(ast_node.right).why(ast_node.operator + " rhs is const? " + isconst(ast_node.right)));
            if (isconst(ast_node.left) && isconst(ast_node.right)) return makeconst(`${ast_node.left.value} ${ast_node.operator} ${ast_node.right.value}`).why("lhs + rhs const");
            if (isconst0(ast_node.right))
            {
                if (BENIGN_OPS[ast_node.operator]) return ast_node.left.why("rhs not needed");
                if (ZERO_OPS[ast_node.operator])
                    if (ast_node.type == AssignmentExpression) return ast_node.assn_value(0).why("asst to 0");
                    else return makeconst(0).why("op rhs 0");
            }
            if (isconst0(ast_node.left) && (ast_node.type != AssignmentExpression))
            {
                if (BENIGN_OPS[ast_node.operator]) return ast_node.right.why("lhs not needed");
                if (ZERO_OPS[ast_node.operator]) return makeconst(0).why("op lhs 0");
            }
            break;
        case BlockStatement: //{type, body[]}
            var numdrop = 0;
            (ast_node.body || []).forEach((stmt, inx, all) => { if (isconst(all[inx - numdrop] = reduce(stmt, ast_node))) ++numdrop; });
            if (numdrop) //prune stmt array
                if (numdrop == ast_node.body.length) return NULL_EXPR.why("all const stmts"); //NULL_EXPR;
                else ast_node.body.splice(-numdrop, numdrop);
            break;
        case VariableDeclaration: //{type, declarations[], kind}
            var numdrop = 0;
            (ast_node.declarations || []).forEach((dcl, inx, all) => { dcl.kind = ast_node.kind; /*inherit*/ if (isconst(all[inx - numdrop] = reduce(dcl, ast_node))) ++numdrop; }); //propogate const attr down to vars
            if (numdrop) //prune decl array
                if (numdrop == ast_node.declarations.length) return NULL_EXPR.why("all consts"); //NULL_EXPR;
                else ast_node.declarations.splice(-numdrop, numdrop);
            break;
        case ExpressionStatement: //{type, expression{}}
            ast_node.expression = reduce(ast_node.expression, ast_node);
            if (isconst(ast_node.expression)) return NULL_EXPR.why("const expr stmt"); //EMPTY_STMT; //stmt has no effect; drop it
            break;
        case VariableDeclarator: //{type, id, init{}, kind-inherited}
            ast_node.init = reduce(ast_node.init, ast_node);
//                const type = (ast_node.kind == "const")? "consts": "vars";
//            if (symtab[nameof(ast_node)]) throw `duplicate ${ast_node.kind || "var?"} def: ${nameof(ast_node)}`.red_lt;
//            symtab[nameof(ast_node)] = (ast_node.kind == "const")? (isconst(ast_node.init)? makeconst(ast_node.init.value): ast_node.init): ast_node; //"TODO: eval?";
            if ((ast_node.kind == "const") && isconst(ast_node.init))
            {
                ast_node.add_const(ast_node.init.value);
                return NULL_EXPR.why("var promoted to const");
            }
            break;
        case Identifier: //{type, name}
            if (isconst(ast_node)) return makeconst(getconst(ast_node)).why("const deref");
            break;
        case FunctionExpression: //{type, id{}, params[], defaults[], body{}, generator, expression}
        case FunctionDeclaration: //{type, id{}, params[], defaults[], body{}, generator, expression}
        case ArrowFunctionExpression: //{type, id{}, params[], defaults[], body{}, generator, expression}
            if (nameof(ast_node) == "autoexec") return NULL_EXPR.why("drop autoexec"); //NULL_EXPR; //drop run-time sim logic
            const locals = ast_node.stack_frame(); //{context: Object.assign({}, ast_node.context || {})}; //shallow copy to new stack frame
            (ast_node.params || []).forEach((param, inx, all) => { all[inx] = reduce(param, locals); }); //param2var(reduce(param)); }); //treat as defined vars
            (ast_node.defaults || []).forEach((def, inx, all) => { all[inx] = reduce(def, locals); });
            ast_node.body = reduce(ast_node.body, locals);
//                console.error(`upon ${nameof(ast_node)} exit, local symbols are: ${Object.keys(locals).map((key) => { return `${symtype(locals[key])}:${key}`; })}`);
//                console.error(`upon ${nameof(ast_node)} exit, parent symbols are: ${Object.keys(symtab).map((key) => { return `${symtype(symtab[key])}:${key}`; })}`);
//            console.error(`${Object.keys(locals).length - Object.keys(symtab).length} symbols defined/used in '${nameof(ast_node)}': ${Object.keys(locals).reduce((all_mine, key) => { if (!(key in symtab)) all_mine.push(`${symtype(locals[key])}:${key}`); return all_mine; }, []).join(", ")}`.cyan_lt); //NOTE: mine undef === null, sibling undef === false
//no, could be siblings, defined after                Object.keys(locals).forEach((key) => { if (!locals[key]) warn(`undefined symbol in '${nameof(ast_node)}': '${key}'`); }); //check for undefined stuff within this context
//            Object.keys(locals).forEach((key) => { if (!locals[key] && !(key in symtab)) symtab[key] = false; }); //warn(`undefined symbol in '${nameof(ast_node)}': '${key}'`); }); //check for undefined stuff later within this context; defer to parent; skip "false", which were defered from a sibling/child
//            if (symtab[nameof(ast_node)]) throw `duplicate func def: ${nameof(ast_node)}`.red_lt;
//            symtab[nameof(ast_node)] = isconst(ast_node.body)? makeconst(ast_node.body.value): ast_node; //"TODO: func val?"; //update parent context
            if (isconst(ast_node.body))
            {
                ast_node.add_const(ast_node.body.value); //remember const values for expr optimization
                return makeconst(ast_node.body.value).why("const func body");
            }
//TODO?            if (ast_node.body.type != BlockStatement) ast_node.body = {type: BlockStatement, body: []}; //insert block stmt to hang var dcls from
            break;
        case IfStatement: //{type, test{}, consequent{}, alternate{}}
            ast_node.test = reduce(ast_node.test, ast_node);
            ast_node.consequent = reduce(ast_node.consequent, ast_node);
            ast_node.alternate = reduce(ast_node.alternate, ast_node);
            if (isconst(ast_node.test)) return (ast_node.test.value? ast_node.consequent: ast_node.alternate).why("const IF");
            break;
        case ForStatement: //{type, init{}, test{}, update{}, body{}}
            ast_node.init = reduce(ast_node.init, ast_node);
            ast_node.test = reduce(ast_node.test, ast_node);
            ast_node.update = reduce(ast_node.update, ast_node);
            ast_node.body = reduce(ast_node.body, ast_node);
            if (isconst0(ast_node.test)) return ast_node.init.why("for(;0;)"); //no body needed
            break;
        case WhileStatement: //{type, test{}, body{}}
            ast_node.test = reduce(ast_node.test, ast_node);
            ast_node.body = reduce(ast_node.body, ast_node);
            if (isconst0(ast_node.test)) return NULL_EXPR.why("while(0)"); //no body needed
            break;
        case UnaryExpression: //{type, operator, argument{}}
        case UpdateExpression: //{type, operator, argument{}, prefix}
            ast_node.argument = reduce(ast_node.argument, ast_node);
            if (isconst(ast_node.argument)) return makeconst(`${(ast_node.prefix !== false)? ast_node.operator: ""} ${ast_node.argument.value} ${(ast_node.prefix === false)? ast_node.operator: ""}`).why("unary(const)");
            break;
        case YieldExpression: //{type, argument{}, delegate}
            ast_node.argument = reduce(ast_node.argument, ast_node);
            return ast_node.argument.why("drop 'yield'"); //drop yield and just use target function/expression
            break;
//node types as-is:
        case ObjectExpression: //{type, properties[]}
            (ast_node.properties || []).forEach((prop, inx, all) => { all[inx] = reduce(prop, ast_node); });
            break;
        case Property: //{type, key{}, computed, value{}, kind, method, shorthand}
            ast_node.key = reduce(ast_node.key, ast_node);
            ast_node.value = reduce(ast_node.value, ast_node);
            break;
        case ArrayExpression: //{type, elements[]}
            (ast_node.elements || []).forEach((expr, inx, all) => { all[inx] = reduce(expr, ast_node); });
            break;
        case ThrowStatement: //{type, argument{}}
        case ReturnStatement: //{type, argument{}}
            ast_node.argument = reduce(ast_node.argument, ast_node);
            break;
        case NewExpression: //{type, callee{}, arguments[]}
            (ast_node.arguments || []).forEach((arg, inx, all) => { all[inx] = reduce(arg, ast_node); });
            ast_node.callee = reduce(ast_node.callee);
            break;
        case SwitchStatement: //{type, discriminant{}, cases[]}
            ast_node.discriminant = reduce(ast_node.discriminant, ast_node);
            (ast_node.cases || []).forEach((casestmt, inx, all) => { all[inx] = reduce(casestmt, ast_node); });
            if (isconst(ast_node.discriminant)) console.error("TODO: reduce switch stmt".red_lt);
            break;
        case SwitchCase: //{type, test{}, consequent[]}
            ast_node.test = reduce(ast_node.test, ast_node);
            (ast_node.consequent || []).forEach((conseq, inx, all) => { all[inx] = reduce(conseq, ast_node); });
            break;
        case TemplateLiteral: //{type, quasis[], expressions[]}
            (ast_node.quasis || []).forEach((quasi, inx, all) => { all[inx] = reduce(quasi, ast_node); });
            (ast_node.expressions || []).forEach((expr, inx, all) => { all[inx] = reduce(expr, ast_node); });
//TODO                if (isconst(ast_node....)) console.error("TODO: reduce string".red_lt);
            break;
        case TemplateElement: //{type, value{}, tail}
            ast_node.value = reduce(ast_node.value, ast_node);
            break;
        case MemberExpression: //{type, computed, object{}, property{}}
            ast_node.object = reduce(ast_node.object, ast_node);
            ast_node.property = reduce(ast_node.property, ast_node);
            break;
        case Literal: //{type, value, raw}
        case BreakStatement: //{type, label}
        case EmptyStatement: //{type}
        case ThisExpression: //{type}
            break;
        default: //for debug
            throw `AST reduce: unhandled node type '${ast_node.type}', node ${JSON5.stringify(ast_node, null, "  ")}`.red_lt;
    }
    return AstNode(ast_node);
}

//traverse AST, send nodes downstream:
//call graph is represented by nested levels
function traverse(ast_node, context, emitter) //, nested)
{
    if (!ast_node) return;
//    var stack_frame = context;
//    context.nested = context.nested || 0;
//    const stack_frame = context; //{nested: (context.nested || 0) + 1, symtab: Object.assign({}, context.symtab}; //shallow copy to new stack frame
//    stack_frame.nesting = 
    switch (ast_node.type)
    {
//node types that affect nesting level, symbol table:
        case CallExpression: //{type, callee{}, arguments[]}
            var locals = context; //.new_frame(); //dynamic nesting not supported
            (ast_node.arguments || []).forEach((arg) => { traverse(arg, locals, emitter); });
            traverse(ast_node.callee, locals, emitter);
//            symtab[nameof(ast_node.callee)] = symtab[nameof(ast_node.callee)] || null; //create fwd ref if not defined yet
            context.symtab[nameof(ast_node.callee)] = context.symtab[nameof(ast_node.callee)] || UNDEF_FUNC; //create fwd ref if not defined yet
            break;
        case FunctionExpression: //{type, id{}, params[], defaults[], body{}, generator, expression}
        case FunctionDeclaration: //{type, id{}, params[], defaults[], body{}, generator, expression}
        case ArrowFunctionExpression: //{type, id{}, params[], defaults[], body{}, generator, expression}
            if (context.symtab[nameof(ast_node)]) throw `duplicate func def: ${nameof(ast_node)}`.red_lt;
            var locals = context.new_frame(); //static nesting
            (ast_node.params || []).forEach((param, inx, all) => { traverse(param2var(param), locals, emitter); }); //locals.symtab[nameof(param)] = param2var(param); }); //treat params as defined vars
            (ast_node.defaults || []).forEach((def, inx, all) => { traverse(def, locals, emitter); });
            traverse(ast_node.body, locals, emitter);
//                console.error(`upon ${nameof(ast_node)} exit, local symbols are: ${Object.keys(locals).map((key) => { return `${symtype(locals[key])}:${key}`; })}`);
//                console.error(`upon ${nameof(ast_node)} exit, parent symbols are: ${Object.keys(symtab).map((key) => { return `${symtype(symtab[key])}:${key}`; })}`);
            console.error(`${numkeys(locals.symtab) - numkeys(context.symtab)} symbols defined/used in '${nameof(ast_node)}': ${Object.keys(locals.symtab).reduce((all_mine, key) => { if (!(key in context.symtab)) all_mine.push(`${symtype(locals.symtab[key])}:'${key}'`); return all_mine; }, []).join(", ")}`.cyan_lt); //NOTE: mine undef === null, sibling undef === false
//no, could be siblings, defined after                Object.keys(locals).forEach((key) => { if (!locals[key]) warn(`undefined symbol in '${nameof(ast_node)}': '${key}'`); }); //check for undefined stuff within this context
            Object.keys(locals.symtab).forEach((key) => { if (!locals.symtab[key]) context.symtab[key] = context.symtab[key] || locals.symtab[key]; }); //warn(`undefined symbol in '${nameof(ast_node)}': '${key}'`); }); //check for undefined stuff later within this context; defer to parent; skip "false", which were defered from a sibling/child
            context.symtab[nameof(ast_node)] = ast_node; //"TODO: func val?"; //update parent context
            break;
        case BlockStatement: //{type, body[]}
            var locals = context; //.new_frame(); //TODO: bump nesting level here for better var space usage?
            (ast_node.body || []).forEach((stmt, inx, all) => { traverse(stmt, locals, emitter); });
            break;
        case VariableDeclarator: //{type, id, init{}, kind-inherited}
            if (context.symtab[nameof(ast_node)]) throw `duplicate ${ast_node.kind || "var?"} def: ${nameof(ast_node)}`.red_lt;
//            if (symtab[nameof(ast_node)]) throw `duplicate ${ast_node.kind || "var?"} def: ${nameof(ast_node)}`.red_lt;
//            symtab[nameof(ast_node)] = (ast_node.kind == "const")? (isconst(ast_node.init)? makeconst(ast_node.init.value): ast_node.init): ast_node; //"TODO: eval?";
            context.symtab[nameof(ast_node)] = ast_node;
            traverse(ast_node.init, context, emitter);
            break;
        case Identifier: //{type, name}
            context.symtab[nameof(ast_node)] = context.symtab[nameof(ast_node)] || UNDEF_VAR; //create fwd ref if not defined yet
            break;
//as-is node types:
        case BinaryExpression: //{type, operator, left{}, right{}}
        case LogicalExpression: //{type, operator, left{}, right{}}
        case AssignmentExpression: //{type, operator, left{}, right{}}
            traverse(ast_node.left, context, emitter);
            traverse(ast_node.right, context, emitter);
//                console.error(`coalese lhs ${ast_node.left.type} ${ast_node.operator} rhs ${ast_node.right.type}? ${isconst(ast_node.left) && isconst(ast_node.right)}`);
            break;
        case ExpressionStatement: //{type, expression{}}
            traverse(ast_node.expression, context, emitter);
            break;
        case IfStatement: //{type, test{}, consequent{}, alternate{}}
            traverse(ast_node.test, context, emitter);
            traverse(ast_node.consequent, context, emitter);
            traverse(ast_node.alternate, context, emitter);
            break;
        case ForStatement: //{type, init{}, test{}, update{}, body{}}
            traverse(ast_node.init, context, emitter);
            traverse(ast_node.test, context, emitter);
            traverse(ast_node.update, context, emitter);
            traverse(ast_node.body, context, emitter);
            break;
        case WhileStatement: //{type, test{}, body{}}
            traverse(ast_node.test, context, emitter);
            traverse(ast_node.body, context, emitter);
            break;
        case UnaryExpression: //{type, operator, argument{}}
        case UpdateExpression: //{type, operator, argument{}, prefix}
        case YieldExpression: //{type, argument{}, delegate}
            traverse(ast_node.argument, context, emitter);
            break;
        case VariableDeclaration: //{type, declarations[], kind}
            (ast_node.declarations || []).forEach((dcl, inx, all) => { traverse(dcl, context, emitter); });
//            if (context.symtab[nameof(ast_node)]) throw `duplicate var def: ${nameof(ast_node)}`.red_lt;
//            context.symtab[nameof(ast_node)] = ast_node; //"TODO: func val?"; //update parent context
            break;
        case ObjectExpression: //{type, properties[]}
            (ast_node.properties || []).forEach((prop, inx, all) => { traverse(prop, context, emitter); });
            break;
        case Property: //{type, key{}, computed, value{}, kind, method, shorthand}
            traverse(ast_node.key, context, emitter);
            traverse(ast_node.value, context, emitter);
            break;
        case ArrayExpression: //{type, elements[]}
            (ast_node.elements || []).forEach((expr, inx, all) => { traverse(expr, context, emitter); });
            break;
        case ThrowStatement: //{type, argument{}}
        case ReturnStatement: //{type, argument{}}
            traverse(ast_node.argument, context, emitter);
            break;
        case NewExpression: //{type, callee{}, arguments[]}
            (ast_node.arguments || []).forEach((arg, inx, all) => { traverse(arg, context, emitter); });
            traverse(ast_node.callee, context, emitter);
            break;
        case SwitchStatement: //{type, discriminant{}, cases[]}
            traverse(ast_node.discriminant, context, emitter);
            (ast_node.cases || []).forEach((casestmt, inx, all) => { traverse(casestmt, context, emitter); });
            break;
        case SwitchCase: //{type, test{}, consequent[]}
            traverse(ast_node.test, context, emitter);
            (ast_node.consequent || []).forEach((conseq, inx, all) => { traverse(conseq, context, emitter); });
            break;
        case TemplateLiteral: //{type, quasis[], expressions[]}
            (ast_node.quasis || []).forEach((quasi, inx, all) => { traverse(quasi, context, emitter); });
            (ast_node.expressions || []).forEach((expr, inx, all) => { traverse(expr, context, emitter); });
            break;
        case TemplateElement: //{type, value{}, tail}
            traverse(ast_node.value, context, emitter);
            break;
        case MemberExpression: //{type, computed, object{}, property{}}
            traverse(ast_node.object, context, emitter);
            traverse(ast_node.property, context, emitter);
            break;
        case BreakStatement: //{type, label}
        case EmptyStatement: //{type}
        case ThisExpression: //{type}
        case Literal : //{type, value, raw}
            break;
        default: //for debug
            throw `AST traverse: unhandled node type '${ast_node.type}', node ${JSON5.stringify(ast_node, null, "  ")}`.red_lt;
    }
    ast_node.nest = context.nest || 0; //send call-graph (nesting level) downstream
    emitter("ast-node", ast_node); //pass downstream for custom processing so caller can handle nodes of interest
//    return ast_node;
}


function nameof(ast_node)
{
//    ast_node = ast_node || {};
    switch ((ast_node || {}).type)
    {
        case MemberExpression: //{type, computed, object{}, property{}}
            return `${ast_node.object.name}.${ast_node.property.name}`;
        case VariableDeclarator: //{type, id, init{}, kind-inherited}
            return ast_node.id.name;
        case FunctionExpression: //{type, id{}, params[], defaults[], body{}, generator, expression}
        case FunctionDeclaration: //{type, id{}, params[], defaults[], body{}, generator, expression}
            return (ast_node.id || {name: "UNNAMED"}).name;
        case Identifier: //{type, name}
            return ast_node.name;
        default:
            throw `AST nameof: unhandled node type: '${JSON.stringify(ast_node)}'`.red_lt; //for debug
            return `unamed ${(ast_node || {type: "(no type)"}).type}`;
    }
}

function ignore(funcname)
{
    const IGNORES = [/^console\..*$/, /^setInterval$/, /^clearInterval$/, /^step$/];
    return IGNORES.some((pattern, inx, all) =>
    {
//            console.error(`drop[${inx}/${all.length}] call to '${funcname}'? ${!!funcname.match(pattern)}`);
        return funcname.match(pattern);
    });
}

//add comment:
//function why(ast_node, why)
//{
//    ast_node.why = why;
//    return ast_node;
//}

function makeconst(value)
{
    if (typeof value == "string")
    {
//            console.error(`mkconst('${value}') = ${eval(value)}`);
        value = eval(value);
    }
    return new AstNode({type: Literal, value, raw: value, }); //allow caller to use .why()
}

function isconst0(ast_node) { return isconst(ast_node) && !ast_node.value; }
function isconst(ast_node)
{
//    ast_node = ast_node || {};
    if (!ast_node) return false;
    if (ast_node.type == Identifier) return nameof(ast_node) in (ast_node.context || {});
    return (ast_node.type == Literal);
//        const CONST_TYPES = "Literal,"
//    if ((ast_node || {}).type == Literal) return true;
//        if ((ast_node || {}).kind == "const")
//        if (((ast_node || {}).type == "Identifier") && (ast_node.name in this.consts)) return true;
//    return false;
}
function getconst(ast_node)
{
//    if (!ast_node) return null;
    if (ast_node.type == Identifier) return (ast_node.context || {})[nameof(ast_node)];
    return (ast_node.type == Literal)? ast_node.value: null;
}

//var param ident in var decl:
//allows caller to handle vars more consistently (function params behave like local vars)
function param2var(param_node)
{
//    return new AstNode({type: VariableDeclarator, id: param_node, init: null, kind: "var"});
//    return new AstNode({type: VariableDeclarator, kind: "var", }).add_ident(param_node.name);
    return {type: VariableDeclarator, id: param_node, kind: "var", };
}

function symtype(ast_node)
{
    if (ast_node === UNDEF_VAR) return "VAR?";
    if (ast_node === UNDEF_FUNC) return "FUNC?";
    const Types = {Undef: "undef", Funct: "func", Liter: "lit", Varia: "var"};
    return Types[((ast_node || {}).type || "Undefined").slice(0, 5)] || "UNKN";
}

function debug_node(node_data)
{
//    retval.emit("ast-node", node_data);
    const copy_node = AstNode(node_data);
    Object.keys(copy_node).forEach((key) => { if (typeof copy_node[key] == "object") copy_node[key] = "[object]"; }); //reduce clutter
    console.error(JSON5.stringify(copy_node).blue_lt);
}

//    function isempty(ast_node) { return ((ast_node || {}).type == "EmptyStatement"); }

//cut down on verbosity:
//    function short_type(str)
//    {
//        return str.replace(/Expression/i, "expr").replace(/Statement/i, "stmt").replace()
//    }

//    function expected(name, what, want, is)
//    {
//        if (what != want) throw `AST: expected '${name}' to be a ${want}, not ${is}`.red_lt;
//    }


/////////////////////////////////////////////////////////////////////////////////
////
/// Helper functions/misc exports:
//

//single-step thru generator function (for sim/debug):
module.exports.step =
function step(gen)
{
    if (!step.gen || (typeof gen == "function")) step.gen = gen(); //instantiat generator from main entry point
    const {done, retval} = step.gen.next();
    while (typeof retval == "function") retval = retval(); //TODO: add flag to control this? (caller might want function instead of value)
    if (done) return retval;
    setImmediate(step); //give other events a chance to fire, then step main again
}
//for (;;) { if (gen.next().done) break; }


/*
//read source file (for #include):
module.exports.include =
function include(filename)
{
    filename = pathlib.relative(CWD, filename); //pathlib.resolve(filename);
    console.error(`include file '${filename}'`);
    console.log(fs.readFileSync(filename)); //TODO: stream?
//    fs.createReadStream(opts.filename);
}
*/


const error =
module.exports.error =
function error(msg)
{
    if (isNaN(++error.count)) error.count = 1;
    console.error(("[ERROR] " + msg).red_lt);
}


const warn =
module.exports.warn =
function warn(msg)
{   
    if (isNaN(++warn.count)) warn.count = 1;
    console.error(("[WARNING] " + msg).yellow_lt);
}


//NOTE: hard-coded date/time fmt
const date2str =
module.exports.date2str =
function date2str(when)
{
    if (!when) when = new Date(); //when ||= new Date(); //Date.now();
    return `${when.getMonth() + 1}/${when.getDate()}/${when.getFullYear()} ${when.getHours()}:${nn(when.getMinutes())}:${nn(when.getSeconds())}`;
}


function safe_eval(expr)
{
    try { return eval(expr); }
    catch (exc) { return `ERROR: ${exc} on '${expr}'`; }
}


//remove comment:
//handles // or /**/
//TODO: handle quoted strings
function nocomment(str)
{
    return str.replace(/(\/\/.*|\/\*.*\*\/)$/, "");
}


//const nn =
//module.exports.nn =
function nn(val) { return (val < 10)? "0" + val: val; }


function numkeys(thing) { return Object.keys(thing || {}).length; }


function shebang_args(str, which)
{
    if (!which) str = str.replace(/\s*#.*$/, ""); //strip comments
    return (which < 0)? [str]: str.split(" "); //split into separate args
}

//convert array to dictionary (for faster lookups):
function ary2dict(ary)
{
    return (ary || []).reduce((list, op) => { list[op] = true; return list; }, {});
}

function str_trim(str) //trim quotes and trailing semi-colon; NOTE: assumes only 1 param
{
    return str.replace(/;\s*$/, "").replace(/^\s*\(\s*(.*)\s*\)\s*$/, "$1");
}


//regexp fragment for quoted string:
//handles embedded escaped quotes
//based on https://www.metaltoad.com/blog/regex-quoted-string-escapable-quotes
function quostr(name)
{
    if (isNaN(++quostr.count)) quostr.count = 1; //use unique name each time
//CAUTION: use "\\" because this is already within a string
    return `
        \\s*  #skip leading white space
        (?<quotype${quostr.count}> ['"] )  #capture opening quote type; if it could be escaped, instead use  ((?<![\\])['"])
        (${name? `?<${name}>`: ""}  #start named string capture (optional)
#            [^\\k<quotype${quostr.count}>]+
            (?: . (?! (?<! [\\] ) \\k<quotype${quostr.count}>) )  #exclude escaped quotes; use negative lookahead because it's not a char class
            *.?  #capture anything up until same quote used at start
        )
        \\k<quotype${quostr.count}>  #trailing quote same as leading quote
        `).replace(CommentsNewlines_re, ""); //strip comments + newlines in case caller comments out parent line; //.replace(/\\/g, "\\\\"); //NO-re-esc for inclusion into parent string
}


//function is_shebang(chunk)
//{
//    return (this.linenum == 1) && chunk.match(/^\s*#\s*!/);
//}

//prototype extensions:
function extensions()
{
/*
    if (!Array.prototype.last)
        Object.defineProperty(Array.prototype, "last",
        {
            get() { return this[this.length - 1]; },
            set(newval) { if (this.length) this[this.length - 1] = newval; else this.push(newval); return this; },
        });
*/
    JSON5.sv_stringify = JSON5.stringify;
    JSON5.stringify = function(args)
    {
//    console.error("json5.stringify: " + typeof sv_stringify);
        return this.sv_stringify.apply(JSON5, Array.from(arguments)).replace(/,([a-z0-9])/gi, ", $1").replace(/:/g, ": "); //put a space after comma and color for easier readability
    }
//XRegExp is interchangeable with RE, so make the API interchangeable as well:
//    console.log(String.prototype.match.toString());
//    String.prototype.sv_match = String.prototype.match;
//NOTE: XRegExp.exec works with non-XRegExp RE also
    String.prototype.match = function(re) { return XRegExp.exec(this, re); }; //console.error("is xregexp? " + XRegExp.isRegExp(re)); return XRegExp.exec(this, re); } //XRegExp.isRegExp(re)? XRegExp.exec(this.toString(), re): this.sv_match(re); }
//    console.log(String.prototype.match.toString());
}


/////////////////////////////////////////////////////////////////////////////////
////
/// Unit test/Command-line interface:
//

const CLI =
module.exports.CLI =
function CLI(more_opts)
{
//    const RequireFromString = require('require-from-string');
//    const Collect = require("collect-strean");
//    const {LineStream} = require('byline');
//    const CWD = "";
//    const filename = (process.argv.length > 2)? `'${pathlib.relative(CWD, process.argv.slice(-1)[0])}'`: null;
    const opts = CLI.opts = Object.assign({}, more_opts || {}), debug_out = [];
    for (var i = 0; i < process.argv.length; ++i) //command line options; NOTE: shebang in input file might also have args (split and strip comments)
        shebang_args(process.argv[i], i - 2).forEach((arg, inx, all) =>
        {
            const argname = `arg[${i}/${process.argv.length}${(all.length != 1)? `,${inx}/${all.length}`: ""}]`;
            debug_out.push(`${argname}: '${arg}'`); //remember debug output in case wanted (options can be in any order)
            if (i < 2) return; //skip prog names
            var parts = arg.match(/^([+-])?([^=]+)(=(.*))?$/);
            if (!parts || (parts[1] && parts[3])) { console.error(`invalid option in ${argname}: '${arg}'`.red_lt); return; }
            if (!parts[1] && !parts[4]) opts.filename = `'${parts[2].replace(/^['"](.*)['"]$/, "&1")}'`; //strip optional quotes and then re-add
            else opts[parts[2].toLowerCase()] = /*(parts[1] == "-")? false: (parts[1] == "+")*/ parts[1]? true: parts[4];
        });
//    console.log(JSON.stringify(opts, null, "  "));
    if (opts.debug /*!= undefined*/) console.error(debug_out.join("\n").blue_lt);
    if (opts.help /*!= undefined*/) console.error(`usage: ${pathlib.basename(__filename)} [+-codegen] [+-debug] [+-echo] [+-help] [+-src] [filename]\n\tcodegen = don't generate code from ast\n\tdebug = show extra info\n\techo = show macro-expanded source code into REPL\n\tfilename = file to process (defaults to stdin if absent)\n\thelp = show usage info\n\tsrc = display source code instead of compiling it\n`.yellow_lt);
    console.error(`DSL engine: reading from ${opts.filename || "stdin"} ...`.green_lt);
    const [instrm, outstrm] = [opts.filename? fs.createReadStream(opts.filename.slice(1, -1)): process.stdin, process.stdout]; //fs.createWriteStream("dj.txt")];
    const retstrm =
        instrm
//        .pipe(prepend())
//        .pipe(new LineStream({keepEmptyLines: true})) //preserve line#s (for easier debug)
//        .pipe(PreProc(infile))
//        .pipe(fixups())
//        .pipe(preproc(opts))
//        .pipe(ReplStream(opts))
        .pipe(dsl2ast(opts)) //Object.assign(opts, more_opts || {})))
//        .pipe(!opts.src? dsl2js(opts): new PassThrough()) //{filename, debug: true})) //, run: "main"}))
//        .pipe((!opts.src && !opts.codegen)? js2ast(opts): new PassThrough())
//        .pipe(asm_optimize())
//    .pipe(text_cleanup())
//        .pipe(append())
//        .pipe(RequireStream())
//        .pipe(json2ast())
//        .pipe((opts.codegen /*!= undefined*/)? new PassThrough(): js2ast(opts))
////        .pipe(walkAST(opts))
//        .on("astnode", data => { console.error(`ast node: ${JSON5.stringify(data)}`.cyan_lt)})
//??        .pipe(outstrm)
//        .on("data", (data) => { console.error(`data: ${data}`.blue_lt)})
        .on("finish", () => { console.error("ast strm: finish".green_lt); })
        .on("close", () => { console.error("ast strm: close".green_lt); })
        .on("done", () => { console.error("ast strm: done".green_lt); })
        .on("end", () => { console.error("ast strm: end".green_lt); })
        .on("error", err =>
        {
            console.error(`ast strm error: ${err}`.red_lt);
            process.exit();
        });
    console.error("DSL engine: finish asynchronously".green_lt);
//    retstrm.emit("dsl-opts", opts);
    return retstrm;
}
//                  ____________________________
//                 /                            \
//file or stdin ---\--> macro expand -> REPL ---/----> AST

if (!module.parent) CLI(); //auto-run CLI

//eof