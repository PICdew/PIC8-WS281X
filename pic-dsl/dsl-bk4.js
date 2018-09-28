#!/usr/bin/env node
//DSL-to-Javascript transform stream + AST node emitter

"use strict";
require("magic-globals"); //__file, __line, __stack, __func, etc
require("colors").enabled = true; //for console output; https://github.com/Marak/colors.js/issues/127
const fs = require("fs");
//const vm = require("vm"); //https://nodejs.org/api/vm.html
//const pathlib = require("path"); //NOTE: called it something else to reserve "path" for other var names
const XRegExp = require("xregexp"); //https://github.com/slevithan/xregexp
//const JSON5 = require("json5"); //more reader-friendly JSON; https://github.com/json5/json5
//TODO? const miss = require("mississippi"); //stream utils
const {LineStream} = require('byline');
//streams see also https://medium.freecodecamp.org/node-js-streams-everything-you-need-to-know-c9141306be93
const DuplexStream = require("duplex-stream"); //https://github.com/samcday/node-duplex-stream
const Duplex = DuplexStream; //TODO: API is different
const {/*Readable, Writable, Duplex,*/ PassThrough} = require("stream");
const thru2 = require("through2"); //https://www.npmjs.com/package/through2
const {error, warn, debug, echo_stream, CLI /*, regexproc, date2str*/} = require("./prexproc");

//extensions();
module.exports.version = "1.0";
Object.assign(module.exports, {debug, warn, error}); //expose to caller

//const CWD = ""; //param for pathlib.resolve()


////////////////////////////////////////////////////////////////////////////////
////
/// Transform DSL source code to Javascript (stream):
//

//const {LineStream} = require('byline');
//const DuplexStream = require("duplex-stream"); //https://github.com/samcday/node-duplex-stream
//const {/*Readable, Writable,*/ PassThrough} = require("stream");
//const thru2 = require("through2"); //https://www.npmjs.com/package/through2
//const RequireFromString = require('require-from-string');
//const CaptureConsole = require("capture-console");
//const toAST = require("to-ast"); //https://github.com/devongovett/to-ast
//const REPL = require("repl"); //https://nodejs.org/api/repl.html


const dsl2js =
module.exports.dsl2js =
function dsl2js(opts) //{filename, replacements, prefix, suffix, echo, debug, run, ast, shebang}
{
    const instrm = new PassThrough(); //end-point wrapper
    const outstrm = instrm
        .pipe(opts.echo? echo_stream(Object.assign({filename: "dsl2js-in" || `${__file}-in`}, opts)): new PassThrough())
        .pipe(new LineStream({keepEmptyLines: true})) //preserve line#s (for easier debug and correct #directive handling)
//        .pipe(preproc())
        .pipe(Object.assign(thru2(/*{objectMode: false},*/ xform, flush), {opts, pushline, })) //eof: preproc_eof, })) //attach opts to stream for easier access across scope
//        .pipe(Object.assign(thru2(/*{objectMode: false},*/ xform, flush)), {wrapper}) //syntax fixups
    return new Duplex(outstrm, instrm); //return endpts for more pipelining; CAUTION: swap in + out

    function xform(chunk, enc, cb)
    {
//        if (!this.chunks) this.chunks = [];
//        if (isNaN(++this.numlines)) this.numlines = 1;
        if (typeof chunk != "string") chunk = chunk.toString(); //TODO: enc?
//        if (!opts.shebang && !this.chunks.length && chunk.match(/^\s*#\s*!/)) { this.chunks.push(`//${chunk} //${chunk.length}:line 1`); cb(); return; } //skip shebang; must occur before prepend()
        leader.call(this); //this.wrapper();
        if (chunk.length) this.pushline(chunk); //.nocolors); //`${linebuf} //${this.linebuf.length}:line ${this.linenum}`); //+ "\n"); //chunk); //re-add newline to compensate for LineStream
        cb();
    }

    function flush(cb)
    {
        leader.call(this); //this.wrapper();
//append trailer code:
        this.push("//" + `
            SUFFIX:
//            if (typeof run == "function") run();
            ${opts.suffix || ""}
            ${!opts.run? "//": ""}run();
            } //end of wrapper+suffix
            `.trim().unindent.blue_lt); //replace(/^\s+/gm, ""));
        cb();
    }

//prepend leader code (1x only):
    function leader()
    {
        if (this.has_leader) return;
        this.push("//" + `
            PREFIX:
            "use strict";
            const {/*include, walkAST,*/ debug, warn, error, parentify, step} = require("${__filename}");
            module.exports = function(){ //wrap all logic so it's included within AST
            ${opts.prefix || ""}
            //end prefix
            `.trim().unindent.blue_lt); //replace(/^\s+/gm, "")); //drop leading spaces; heredoc idea from https://stackoverflow.com/questions/4376431/javascript-heredoc
//        this.wrapper = function() {}; //only need to do this 1x
        this.has_leader = true; //1x only
    }
}


function pushline(str)
{
    /*if (str)*/ this.push(`${str || ""}\n`); //maintain correct line#
}


////////////////////////////////////////////////////////////////////////////////
////
/// Transform JS source code to AST (emit events):
//

//const {LineStream} = require('byline');
//const DuplexStream = require("duplex-stream"); //https://github.com/samcday/node-duplex-stream
//const {/*Readable, Writable,*/ PassThrough} = require("stream");
//const thru2 = require("through2"); //https://www.npmjs.com/package/through2
const RequireFromString = require('require-from-string');
const CaptureConsole = require("capture-console");
const toAST = require("to-ast"); //https://github.com/devongovett/to-ast
//const REPL = require("repl"); //https://nodejs.org/api/repl.html


const js2ast =
module.exports.js2ast =
function js2ast(opts) //{filename, replacements, prefix, suffix, echo, debug, run, ast, shebang}
{
//    if (!opts) opts = {};
//    global.JSON5 = JSON5; //make accessible to child modules
//    global.opts = opts || {}; //make command line args accessible to child (dsl) module
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
    const instrm = new PassThrough(); //end-point wrapper
//    const instrm = new LineStream({keepEmptyLines: true}); //preserve line#s (for easier debug)
//    if (opts.debug)
//    {
//        console.error(`${process.argv.length} dsl args:`.blue_lt);
//        for (var a in process.argv)
//            console.error(`arg[${a}/${process.argv.length}]: '${process.argv[a]}'`.blue_lt);
//    }
    const outstrm = instrm
        .pipe(opts.echo? echo_stream(Object.assign({filename: "js2ast-in" || `${__file}-in`}, opts)): new PassThrough())
        .pipe(new LineStream({keepEmptyLines: true})) //preserve line#s (for easier debug and correct #directive handling)
//        .pipe(preproc())
        .pipe(thru2(/*{objectMode: false},*/ xform, flush)); //collect and compile code
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
    const retval = new Duplex(outstrm, instrm); //return endpts for more pipelining; CAUTION: swap in + out
    CaptureConsole.startCapture(process.stdout, (outbuf) => { xform.call(retval, "//stdout: " + outbuf, "utf8", function(){}); --retval.numlines; }); //send all stdout downstream thru pipeline
    return retval;

    function xform(chunk, enc, cb)
    {
        if (!this.chunks) this.chunks = [];
//        if (isNaN(++this.numlines)) this.numlines = 1;
        if (typeof chunk != "string") chunk = chunk.toString(); //TODO: enc?
        if (!opts.shebang && !this.chunks.length && chunk.match(/^\s*#\s*!/)) { this.chunks.push(`//${chunk} //${chunk.length}:line 1`); cb(); return; } //skip shebang; must occur before prepend()
        if (chunk.length) this.chunks.push(chunk); //`${linebuf} //${this.linebuf.length}:line ${this.linenum}`); //+ "\n"); //chunk); //re-add newline to compensate for LineStream
        cb();
    }

    function flush(cb)
    {
        CaptureConsole.stopCapture(process.stdout);
//        append.call(this);
//        if (opts.run) this.push(`const ast = require("${process.argv[1]}").walkAST(${opts.run});\n`);
        if (!this.chunks) this.chunks = [];
//compile and get AST:
//        console.error(`${this.chunks.length} chunks at flush`);
//        if (opts.echo) console.error(`js dsl ${this.chunks.length} in:`, this.chunks.join("\n").cyan_lt.color_reset); //show source code input
        global.opts = opts || {}; //make command line args accessible to child (dsl) module
        const module = RequireFromString(this.chunks.join("\n").nocolors);
        if (opts.debug) Object.keys(module).forEach((key, inx, all) => debug(`dsl export[${inx}/${all.length}]: ${typeof module[key]} '${key}'`.blue_lt), this);
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
        delete global.opts;
//            console.error("... ran".red_lt);
//            }
//debugger; //c = continue, n = step next, s = step in, o = step out, pause, run, repl, exec, kill, scripts, version, help
        const ast_raw = new AstNode(toAST(module)).add_ident("DSL_top"); //make it easier to identify in debug/error messages
        parentify(ast_raw, (ast_node, parent) =>
        {
//            if (isNaN(ast_node.uid = ++parentify.uid)) ast_node.uid = parentify.uid = 0.1; //assign unique id# to each node for easier debug; decimal allows text editor search for exact value rather than substring
            ast_node.uid = ++parentify.uid || (parentify.uid = 0.1); //assign unique id# to each node for easier debug; decimal allows text editor search for exact value rather than substring
//            ast_node.uid += 0.1; //`${ast_node.uid}$`; //make text search easier (for debug)
            ast_node.parent_uid = (parent || {}).uid; //debug only
            return (ast_node || {}).type || (ast_node || []).length; //add parent refs to all ast nodes that have a type or length (array)
        });
        if (opts.ast) fs.createWriteStream(`${opts.filename || "stdin"}-ast.txt`) //console.error(JSON5.stringify(ast_raw, null, "  ")); //show raw AST; TODO: make this more stream-friendly?
            .on("finish", () => debug(`dsl finished writing ast to ${opts.filename || "stdin"}-ast.txt`.green_lt))
            .end(JSON.stringify(ast_raw, null, 2)); //show raw AST + close
//        /*if (opts.ast)*/ this.push(/*"const ast = " +*/ ast + "\n"); //send downstream
//            this.vars = {};
//            this.funcs = {};
//            this.consts = {};
//cb(); return;
        const ast = opts.reduce? reduce(ast_raw): ast_raw;
        if (opts.ast && opts.reduce)
        {
            if (opts.debug) debug(`${numkeys(ast.context)} consts during reduce: ${Object.keys(ast.context || {}).join(", ")}`.blue_lt);
//            console.error(JSON5.stringify(ast, null, "  ").pink_lt); //show reduced AST
            fs.createWriteStream(`${opts.filename || "stdin"}-reduced.txt`)
                .on("finish", () => debug(`dsl finished writing reduced ast to ${opts.filename || "stdin"}-ast.txt`.green_lt))
                .end(JSON.stringify(ast, null, 2)) //show reduced (optimized) AST + close
        }
//        traverse(ast, function(evttype, data) { this.emit(evttype, data); }); //emit events for AST nodes
//        const tree = {};
//        callgraph(ast, tree); //for 
//            else this.push("TODO: code gen\n");
//            compiled.execode
//            this.push(`walked ast, ${Object.keys(this.consts).length} consts: ${Object.keys(this.consts).join(", ")}\n`);
        debug(`flushed ${this.chunks.length} chunks, walked ast`);
//            console.error(`walked ast`);
//            console.error(`${Object.keys(this.vars).length} vars: ${Object.keys(this.vars).join(", ")}`);
//            console.error(`${Object.keys(this.funcs).length} funcs: ${Object.keys(this.funcs).map((key) =>
        const stack = {symtab: {}};
        stack.new_frame = function()
        {
            return {nest: (this.nest || 0) + 1, symtab: Object.assign({}, this.symtab || {}), new_frame: this.new_frame, }; //shallow copy to new stack frame
        };
//        parentify(ast, (ast_node) => (ast_node || {}).type); //add parent refs to all ast nodes that have a type
        traverse(ast, stack, (evt, data) => retval.emit(evt, data));
        Object.keys(stack.symtab || {}).forEach((key) => { if (!stack.symtab[key]) warn(`undefined symbol in '${nameof(ast)}': ${symtype(stack.symtab[key])}:'${key}'`); }); //check for undefined stuff within this context
//        if (opts.debug)
        debug(`${numkeys(stack.symtab)} symbols: ${Object.keys(stack.symtab).map((key) =>
        {
            return `${symtype(stack.symtab[key])}:'${key}'`; //|| "(UNDEF)"}`;
        }).join(", ")}`.blue_lt);
//        if (opts.traverse) opts.traverse(ast.body, opts); //strip off wrapper before passing to custom DSL processor
//            else this.push("TODO: code gen\n");
//            compiled.execode
        cb();
    }
}


//single-step thru generator function (for sim/debug):
const step =
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


//AST helpers:

//allow func calls to be distinguished from vars:
//NOTE: both must be falsey
const UNDEF_FUNC = false, UNDEF_VAR = 0;

//reduce typos by using symbolic names for AST node types:
const CallExpression = "CallExpression"; //{type, callee{}, arguments[]}
const BinaryExpression = "BinaryExpression"; //{type, operator, left{}, right{}}
const LogicalExpression = "LogicalExpression"; //{type, operator, left{}, right{}}
const AssignmentExpression = "AssignmentExpression"; //{type, operator, left{}, right{}}
const BlockStatement = "BlockStatement"; //{type, body[]}
const ClassDeclaration = "ClassDeclaration"; //{type, id{}, superClass{}, body[]}
const ExpressionStatement = "ExpressionStatement"; //{type, expression{}}
const VariableDeclarator = "VariableDeclarator"; //{type, id, init{}, kind-inherited}
const FunctionExpression = "FunctionExpression"; //{type, id{}, params[], defaults[], body{}, generator, expression}
const FunctionDeclaration = "FunctionDeclaration"; //{type, id{}, params[], defaults[], body{}, generator, expression}
const ArrowFunctionExpression = "ArrowFunctionExpression"; //{type, id{}, params[], defaults[], body{}, generator, expression}
const IfStatement = "IfStatement"; //{type, test{}, consequent{}, alternate{}}
const ConditionalExpression = "ConditionalExpression"; //{type, test{}, consequent{}, alternate{}}
const ForStatement = "ForStatement"; //{type, init{}, test{}, update{}, body{}}
const ForInStatement = "ForInStatement"; //{type, left{}, right{}, body{}}
const WhileStatement = "WhileStatement"; //{type, test{}, body{}}
const UnaryExpression = "UnaryExpression"; //{type, operator, argument{}}
const UpdateExpression = "UpdateExpression"; //{type, operator, argument{}, prefix}
const YieldExpression = "YieldExpression"; //{type, argument{}, delegate}
const VariableDeclaration = "VariableDeclaration"; //{type, declarations[], kind}
const ClassBody = "ClassBody"; //{type, body{}}
const MethodDefinition = "MethodDefinition"; //{type, key{}, computed, value{}}
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
const Super = "Super"; //{type}


//add some props and methods to raw AST nodes:
const AstNode =
module.exports.AstNode =
function AstNode(props, parent)
{
    props.context = props.context || (parent || {}).context || {}; //inherit from parent
//    if (!(this instanceof AstNode)) return new AstNode(opts, parent);
//    if (!(this instanceof AstNode)) return Object.create(AstNode.prototype, opts);
    return Object.assign((this instanceof AstNode)? this: Object.create(AstNode.prototype), props, {uid: -1});
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
//set additional props (all fluent):
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
            if (opts.ast && !opts.reduce) console.error(JSON5.stringify(ast, null, 2).pink_lt); //show reduced AST also
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


//optimization:
//coalesce compile-time constants, drop extraneous code, etc.
//NOTE: this is an optional pass; caller can disable so ast traversal later should not depend on reduce()
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
            (ast_node.arguments || []).forEach((arg, inx, all) => all[inx] = reduce(arg, ast_node)); //reduce args before calling function
            ast_node.callee = reduce(ast_node.callee, ast_node);
//            if (ignore(nameof(ast_node.callee))) return NULL_EXPR.why("ignore ext func"); //NULL_EXPR; //exclude Node.js run-time functions
            if (ast_node.arguments.every((arg) => isconst(arg)))
            {
                warn(`call to ${nameof(ast_node.callee)} with all const args; could be reduced if no side-effects`);
                if (nameof(ast_node.callee).match(/^Math\./)) 
//                    if (isconst(ast_node)) return makeconst(eval(`${nameof(ast_node.callee)}()
                    return makeconst(`${nameof(ast_node.callee)}(${ast_node.arguments.map((arg) => arg.value).join(", ")})`).why("built-in(all const) eval");
            }
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
            if (isfalsey(ast_node.right))
            {
                if (BENIGN_OPS[ast_node.operator]) return ast_node.left.why("rhs not needed");
                if (ZERO_OPS[ast_node.operator])
                    if (ast_node.type == AssignmentExpression) return ast_node.assn_value(0).why("asst to 0");
                    else return makeconst(0).why("op rhs 0");
            }
            if (isfalsey(ast_node.left) && (ast_node.type != AssignmentExpression))
            {
                if (BENIGN_OPS[ast_node.operator]) return ast_node.right.why("lhs not needed");
                if (ZERO_OPS[ast_node.operator]) return makeconst(0).why("op lhs 0");
            }
            break;
        case BlockStatement: //{type, body[]}
        case ClassBody: //{type, body[]}
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
            ast_node.init = reduce(ast_node.init, ast_node); //reduce init value first
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
            if (nameof(ast_node) == "run") return NULL_EXPR.why("drop run"); //NULL_EXPR; //drop run-time sim logic
            const locals = ast_node.stack_frame(); //{context: Object.assign({}, ast_node.context || {})}; //shallow copy to new stack frame
            (ast_node.params || []).forEach((param, inx, all) => all[inx] = reduce(param, locals)); //param2var(reduce(param)); }); //treat as defined vars
            (ast_node.defaults || []).forEach((def, inx, all) => all[inx] = reduce(def, locals));
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
        case ClassDeclaration: //{type, id{}, superClass{}, body{}}
            ast_node.body = reduce(ast_node.body, ast_node);
            break;
        case MethodDefinition: //{type, key{}, computed, value{}}
            ast_node.value = reduce(ast_node.value, ast_node);
            break;
        case IfStatement: //{type, test{}, consequent{}, alternate{}}
        case ConditionalExpression: //{type, test{}, consequent{}, alternate{}}
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
            if (isfalsey(ast_node.test)) return ast_node.init.why("for(;0;)"); //no body needed
            break;
        case ForInStatement: //{type, left{}, right{}, body{}}
            ast_node.left = reduce(ast_node.left, ast_node);
            ast_node.right = reduce(ast_node.right, ast_node);
            ast_node.body = reduce(ast_node.body, ast_node);
            break;
        case WhileStatement: //{type, test{}, body{}}
            ast_node.test = reduce(ast_node.test, ast_node);
            ast_node.body = reduce(ast_node.body, ast_node);
            if (isfalsey(ast_node.test)) return NULL_EXPR.why("while(0)"); //no body needed
            break;
        case UnaryExpression: //{type, operator, argument{}}
        case UpdateExpression: //{type, operator, argument{}, prefix}
            ast_node.argument = reduce(ast_node.argument, ast_node);
            if (isconst(ast_node.argument)) return makeconst(`${(ast_node.prefix !== false)? ast_node.operator: ""} ${ast_node.argument.value} ${(ast_node.prefix === false)? ast_node.operator: ""}`).why("unary(const)");
            break;
        case YieldExpression: //{type, argument{}, delegate}
            ast_node.argument = reduce(ast_node.argument, ast_node);
            return ast_node.argument.why("drop 'yield'"); //drop yield and just use target function/expression
//            break;
//node types as-is:
        case ObjectExpression: //{type, properties[]}
            (ast_node.properties || []).forEach((prop, inx, all) => all[inx] = reduce(prop, ast_node));
            break;
        case Property: //{type, key{}, computed, value{}, kind, method, shorthand}
            ast_node.key = reduce(ast_node.key, ast_node);
            ast_node.value = reduce(ast_node.value, ast_node);
            break;
        case ArrayExpression: //{type, elements[]}
            (ast_node.elements || []).forEach((expr, inx, all) => all[inx] = reduce(expr, ast_node));
            break;
        case ThrowStatement: //{type, argument{}}
        case ReturnStatement: //{type, argument{}}
            ast_node.argument = reduce(ast_node.argument, ast_node);
            break;
        case NewExpression: //{type, callee{}, arguments[]}
            (ast_node.arguments || []).forEach((arg, inx, all) => all[inx] = reduce(arg, ast_node));
            ast_node.callee = reduce(ast_node.callee);
            break;
        case SwitchStatement: //{type, discriminant{}, cases[]}
            ast_node.discriminant = reduce(ast_node.discriminant, ast_node);
            (ast_node.cases || []).forEach((casestmt, inx, all) => all[inx] = reduce(casestmt, ast_node));
            if (isconst(ast_node.discriminant)) debug("TODO: reduce switch stmt".red_lt);
            break;
        case SwitchCase: //{type, test{}, consequent[]}
            ast_node.test = reduce(ast_node.test, ast_node);
            (ast_node.consequent || []).forEach((conseq, inx, all) => all[inx] = reduce(conseq, ast_node));
            break;
        case TemplateLiteral: //{type, quasis[], expressions[]}
            (ast_node.quasis || []).forEach((quasi, inx, all) => all[inx] = reduce(quasi, ast_node));
            (ast_node.expressions || []).forEach((expr, inx, all) => all[inx] = reduce(expr, ast_node));
//TODO                if (isconst(ast_node....)) console.error("TODO: reduce string".red_lt);
            break;
        case TemplateElement: //{type, value{}, tail}
//no; leaf node            ast_node.value = reduce(ast_node.value, ast_node);
            break;
        case MemberExpression: //{type, computed, object{}, property{}}
            ast_node.object = reduce(ast_node.object, ast_node);
            ast_node.property = reduce(ast_node.property, ast_node);
            break;
        case Literal: //{type, value, raw}
        case BreakStatement: //{type, label}
        case EmptyStatement: //{type}
        case ThisExpression: //{type}
        case Super: //{type}
            break;
        default: //for debug
            /*throw*/ error(`AST reduce: unhandled node type '${`${ast_node.type}`.cyan_lt}', parent type '${(ast_node.parent || {}).type}', node ${JSON.stringify(ast_node, null, 2)}`.red_lt);
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
//    if (isNaN(ast_node.uid = ++traverse.uid)) ast_node.uid = traverse.uid = 1; //make debug easier by giving unique id# to each node
    ast_node.nest = context.nest || 0; //send call-graph (nesting level) downstream
//    const evth = {ast_node};
//if (false)
//{
//    emitter("ast-node", evth); //ast_node); //pass downstream for custom processing so caller can handle nodes of interest
//    if (!evth.wanted) return warn(`AST traverse: evt handler doesn't want node type '${`${ast_node.type}`.cyan_lt}', parent type '${(ast_node.parent || {}).type}', node ${JSON.stringify(ast_node, null, 2)}`.yellow_lt);
//    if (!evth.wanted) return; //event handler (called synchronously) doesn't want this branch of ast
//}
    switch (ast_node.type)
    {
//node types that affect nesting level, symbol table:
        case CallExpression: //{type, callee{}, arguments[]}
            var locals = context; //.new_frame(); //dynamic nesting not supported
//if (!(ast_node.arguments || []).forEach) debug(JSON.stringify(ast_node));
            (ast_node.arguments || []).forEach((arg) => traverse(arg, locals, emitter));
            traverse(ast_node.callee, locals, emitter);
//            symtab[nameof(ast_node.callee)] = symtab[nameof(ast_node.callee)] || null; //create fwd ref if not defined yet
            context.symtab[nameof(ast_node.callee)] = context.symtab[nameof(ast_node.callee)] || UNDEF_FUNC; //create fwd ref if not defined yet
            break;
        case FunctionExpression: //{type, id{}, params[], defaults[], body{}, generator, expression}
        case FunctionDeclaration: //{type, id{}, params[], defaults[], body{}, generator, expression}
        case ArrowFunctionExpression: //{type, id{}, params[], defaults[], body{}, generator, expression}
            if (context.symtab[nameof(ast_node)]) /*throw*/ error(`duplicate func def: '${nameof(ast_node)}' uid ${ast_node.uid}`.red_lt);
            var locals = context.new_frame(); //static nesting
            (ast_node.params || []).forEach((param, inx, all) => traverse(param2var(param), locals, emitter)); //locals.symtab[nameof(param)] = param2var(param); }); //treat params as defined vars
            (ast_node.defaults || []).forEach((def, inx, all) => traverse(def, locals, emitter));
            traverse(ast_node.body, locals, emitter);
//                console.error(`upon ${nameof(ast_node)} exit, local symbols are: ${Object.keys(locals).map((key) => { return `${symtype(locals[key])}:${key}`; })}`);
//                console.error(`upon ${nameof(ast_node)} exit, parent symbols are: ${Object.keys(symtab).map((key) => { return `${symtype(symtab[key])}:${key}`; })}`);
            debug(`${numkeys(locals.symtab) - numkeys(context.symtab)} symbols defined/used in '${nameof(ast_node)}' uid ${ast_node.uid}: \n${Object.keys(locals.symtab).reduce((all_mine, key) => { if (!(key in context.symtab)) all_mine.push(`${symtype(locals.symtab[key])}:'${key}'`); return all_mine; }, []).join(", ")}`.cyan_lt); //NOTE: mine undef === null, sibling undef === false
//no, could be siblings, defined after                Object.keys(locals).forEach((key) => { if (!locals[key]) warn(`undefined symbol in '${nameof(ast_node)}': '${key}'`); }); //check for undefined stuff within this context
            Object.keys(locals.symtab).forEach((key) => { if (!locals.symtab[key]) context.symtab[key] = context.symtab[key] || locals.symtab[key]; }); //warn(`undefined symbol in '${nameof(ast_node)}': '${key}'`); }); //check for undefined stuff later within this context; defer to parent; skip "false", which were defered from a sibling/child
            context.symtab[nameof(ast_node)] = ast_node; //"TODO: func val?"; //update parent context
            break;
        case BlockStatement: //{type, body[]}
        case ClassBody: //{type, body[]
            var locals = context; //.new_frame(); //TODO: bump nesting level here for better var space usage?
            (ast_node.body || []).forEach((stmt, inx, all) => traverse(stmt, locals, emitter));
            break;
        case VariableDeclarator: //{type, id, init{}, kind-inherited}
            if (context.symtab[nameof(ast_node)]) /*throw*/ error(`duplicate ${ast_node.kind || "var?"} def: '${nameof(ast_node)}' uid ${ast_node.uid}`.red_lt);
//            if (symtab[nameof(ast_node)]) throw `duplicate ${ast_node.kind || "var?"} def: ${nameof(ast_node)}`.red_lt;
//            symtab[nameof(ast_node)] = (ast_node.kind == "const")? (isconst(ast_node.init)? makeconst(ast_node.init.value): ast_node.init): ast_node; //"TODO: eval?";
            context.symtab[nameof(ast_node)] = ast_node;
            traverse(ast_node.init, context, emitter);
            break;
        case Identifier: //{type, name}
            context.symtab[nameof(ast_node)] = context.symtab[nameof(ast_node)] || UNDEF_VAR; //create fwd ref if not defined yet
            break;
//as-is node types:
        case ClassDeclaration: //{type, id{}, superClass{}, body{}}
            traverse(ast_node.body, context, emitter);
            break;
        case MethodDefinition: //{type, key{}, computed, value{}}
            traverse(ast_node.value, context, emitter);
            break;
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
        case ConditionalExpression: //{type, test{}, consequent{}, alternate{}}
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
        case ForInStatement: //{type, left{}, right{}, body{}}
            traverse(ast_node.left, context, emitter);
            traverse(ast_node.right, context, emitter);
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
            (ast_node.declarations || []).forEach((dcl, inx, all) => traverse(dcl, context, emitter));
//            if (context.symtab[nameof(ast_node)]) throw `duplicate var def: ${nameof(ast_node)}`.red_lt;
//            context.symtab[nameof(ast_node)] = ast_node; //"TODO: func val?"; //update parent context
            break;
        case ObjectExpression: //{type, properties[]}
            (ast_node.properties || []).forEach((prop, inx, all) => traverse(prop, context, emitter));
            break;
        case Property: //{type, key{}, computed, value{}, kind, method, shorthand}
            traverse(ast_node.key, context, emitter);
            traverse(ast_node.value, context, emitter);
            break;
        case ArrayExpression: //{type, elements[]}
            (ast_node.elements || []).forEach((expr, inx, all) => traverse(expr, context, emitter));
            break;
        case ThrowStatement: //{type, argument{}}
        case ReturnStatement: //{type, argument{}}
            traverse(ast_node.argument, context, emitter);
            break;
        case NewExpression: //{type, callee{}, arguments[]}
            (ast_node.arguments || []).forEach((arg, inx, all) => traverse(arg, context, emitter));
            traverse(ast_node.callee, context, emitter);
            break;
        case SwitchStatement: //{type, discriminant{}, cases[]}
            traverse(ast_node.discriminant, context, emitter);
            (ast_node.cases || []).forEach((casestmt, inx, all) => traverse(casestmt, context, emitter));
            break;
        case SwitchCase: //{type, test{}, consequent[]}
            traverse(ast_node.test, context, emitter);
            (ast_node.consequent || []).forEach((conseq, inx, all) => traverse(conseq, context, emitter));
            break;
        case TemplateLiteral: //{type, quasis[], expressions[]}
            (ast_node.quasis || []).forEach((quasi, inx, all) => traverse(quasi, context, emitter));
            (ast_node.expressions || []).forEach((expr, inx, all) => traverse(expr, context, emitter));
            break;
        case TemplateElement: //{type, value{}, tail}
//no; leaf node            traverse(ast_node.value, context, emitter);
            break;
        case MemberExpression: //{type, computed, object{}, property{}}
            traverse(ast_node.object, context, emitter);
            traverse(ast_node.property, context, emitter);
            break;
        case BreakStatement: //{type, label}
        case EmptyStatement: //{type}
        case ThisExpression: //{type}
        case Super: //{type}
        case Literal : //{type, value, raw}
            break;
        default: //for debug
            /*throw*/ error(`AST traverse: unhandled node type '${`${ast_node.type}`.cyan_lt}' uid ${ast_node.uid}, parent type '${(ast_node.parent || {}).type}', node ${JSON.stringify(ast_node, null, 2)}`.red_lt);
    }
//    ast_node.nest = context.nest || 0; //send call-graph (nesting level) downstream
//if (false)
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
        case ArrowFunctionExpression: //{type, id{}, params[], defaults[], body{}, generator, expression}
            return (ast_node.id || {name: "UNNAMED"}).name;
        case Identifier: //{type, name}
            return ast_node.name;
        case Super: //{type}
            return "super";
        default:
            /*throw*/ error(`AST nameof: unhandled node type: '${JSON.stringify(ast_node, null, 2)}' uid ${ast_node.uid}`.red_lt); //for debug
            return `unamed ${(ast_node || {type: "(no type)"}).type}`;
    }
}

//function ignore(funcname)
//{
//    const IGNORES = [/^console\..*$/, /^setInterval$/, /^clearInterval$/, /^step$/];
//    return IGNORES.some((pattern, inx, all) =>
//    {
////            console.error(`drop[${inx}/${all.length}] call to '${funcname}'? ${!!funcname.match(pattern)}`);
//        return funcname.match(pattern);
//    });
//}

//add comment:
//function why(ast_node, why)
//{
//    ast_node.why = why;
//    return ast_node;
//}

function makeconst(value)
{
    if (typeof value == "string") value = eval(value);
//    {
//            console.error(`mkconst('${value}') = ${eval(value)}`);
//        value = eval(value);
//    }
    return new AstNode({type: Literal, value, raw: value, }); //allow caller to use .why()
}

function isfalsey(ast_node) { return isconst(ast_node) && !ast_node.value; }
function isconst(ast_node)
{
//    ast_node = ast_node || {};
/*
    if (!ast_node) return false;
    if (ast_node.type == Identifier) return nameof(ast_node) in (ast_node.context || {});
    return (ast_node.type == Literal);
*/
//        const CONST_TYPES = "Literal,"
//    if ((ast_node || {}).type == Literal) return true;
//        if ((ast_node || {}).kind == "const")
//        if (((ast_node || {}).type == "Identifier") && (ast_node.name in this.consts)) return true;
//    return false;
    switch ((ast_node || {}).type)
    {
        case Identifier: return nameof(ast_node) in (ast_node.context || {});
        case Literal: return true;
        default: return false;
    }
}
function getconst(ast_node)
{
//    if (!ast_node) return null;
/*
    if (ast_node.type == Identifier) return (ast_node.context || {})[nameof(ast_node)];
    return (ast_node.type == Literal)? ast_node.value: null;
*/
    switch ((ast_node || {}).type)
    {
        case Identifier: return (ast_node.context || {})[nameof(ast_node)];
        case Literal: return ast_node.value;
        default: return null;
    }
}

//var param ident in var decl:
//allows caller to handle vars more consistently (function params behave like local vars)
function param2var(param_node)
{
//    return new AstNode({type: VariableDeclarator, id: param_node, init: null, kind: "var"});
//    return new AstNode({type: VariableDeclarator, kind: "var", }).add_ident(param_node.name);
    const retval = {type: VariableDeclarator, id: param_node, kind: "var-param", uid: param_node.uid || -2, parent_uid: param_node.parent_uid, };
    Object.defineProperty(retval, "parent", {value: param_node.parent, }); //non-enumerable
    return retval;
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
    debug(JSON.stringify(copy_node).blue_lt);
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
/// String helper functions/exports:
//


//NOTE: hard-coded date/time fmt
//const date2str =
//module.exports.date2str =
//function date2str(when)
//{
//    if (!when) when = new Date(); //when ||= new Date(); //Date.now();
//    return `${when.getMonth() + 1}/${when.getDate()}/${when.getFullYear()} ${when.getHours()}:${nn(when.getMinutes())}:${nn(when.getSeconds())}`;
//}


//remove comment:
//handles // or /**/
//TODO: handle quoted strings
//function nocomment(str)
//{
//    return str.replace(/(\/\/.*|\/\*.*\*\/)$/, "");
//}


//const nn =
//module.exports.nn =
//function nn(val) { return (val < 10)? "0" + val: val; }


//regexp fragment for quoted string:
//handles embedded escaped quotes
//based on https://www.metaltoad.com/blog/regex-quoted-string-escapable-quotes
/*
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
    if (isNaN(++quostr.count)) quostr.count = 1; //use unique name each time
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
*/


//check for quoted string:
//function is_quostr(str)
//{
//    const QUOSTR_xre = XRegExp(`${quostr("inner").anchorRE}`, "x");
//    return ((str || "").match(QUOSTR_xre) || {}).inner;
//}

//function is_shebang(chunk)
//{
//    return (this.linenum == 1) && chunk.match(/^\s*#\s*!/);
//}

//add anchors around RE string:
//function anchorRE(str) { return `^${str || ""}$`; }

//add white space around RE string:
//function spaceRE(str) { return `\\s*${str || ""}\\s*`; }


//strip quotes from a string:
//NOTE: returns null if not quoted
/*
function unquote(str)
{
//    const QUOTE_xre = XRegExp(`
//        (?<quotype> ['"] )
//        (?<inner> .* )
//        \\k<quotype>  #string must begin and end with same quote type
//    `/-*.spaceRE*-/.anchorRE, "x");
    const QUOTE_xre = XRegExp(`${quostr("inner")}`.anchorRE, "x");
//    if (!str.match(QUOTE_xre)) throw `"${str || ""}" is not quoted`.red_lt;
//    return XRegExp.replace(str || "", QUOTE_xre, "$<inner>");
//    return (str || "").replace(QUOTE_xre, "$<inner>");
//console.error(`unquote '${str || "NOSTR"}' = '${JSON.stringify(str.match(QUOTE_xre))}'`);
    return ((str || "").match(QUOTE_xre) || {}).inner;
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
    return ((str || "").match(PAREN_xre) || {}).inner;
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
/-*
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
*-/
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
/-*
    var uncolored = []; //(ofs, len) pairs where string has no color
    XRegExp.forEach(str || "", UNCOLORED_xre, (match, inx) => 
    {
//        if (match.code == "0") //no color
//        else
        console.error(`match[${inx}]: substr ${match.substr.length}:'${match.substr}', ofs ${match.index}, data ${JSON5.stringify(match)}`);
        if (match.substr.length) uncolored.push({ofs: match.index, len: match.substr.length, });
    });
    console.error(`areas not colored: ${JSON5.stringify(uncolored)}`);
*-/
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
*/


//return "file:line#":
//mainly for debug or warning/error messages
/*
function srcline(level)
{
    const want_path = (level < 0);
    const frame = __stack[Math.abs(level || 0) + 1]; //skip self
//console.error(`filename ${frame.getFileName()}`);
    return `${(want_path? nop: pathlib.basename)(frame.getFileName().unquoted || frame.getFileName(), ".js")}:${frame.getLineNumber()}`.underline;
}
*/


/////////////////////////////////////////////////////////////////////////////////
////
/// Misc helper functions/exports:
//

function numkeys(thing) { return Object.keys(thing || {}).length; }


//tag object with parent node references:
//inspired by https://stackoverflow.com/questions/2980763/javascript-objects-get-parent
//TODO: npm publish
const parentify =
module.exports.parentify =
function parentify(node, filter, label, parent) //, key) //, depth) //, grparent)
{
//    if (depth > 4) return debug("too deep".red_lt);
    if (node && (typeof node == "object")) //NOTE: typeof null = "object" :(
    {
//const circJSON = require("circular-json");
//try{
        label = label || "parent";
//    obj.parent = parent; //CAUTION: creates circular refs
//        if (parent)
        if (!filter || filter(node, parent)) //tag this node
//            if (!Object.hasOwnProperty(node, label)) //only do it first time (same)
//            if (!node[label])
            Object.defineProperty(node, label, {value: parent}); //CAUTION: if enumerable must be excluded from key loop below; //, enumerable: true}); //!enumerable, !writable; CAUTION: creates circular refs
//            else if (!++node.DUPL_PARENT) node.DUPL_PARENT = 1; //debug("dupl parent".red_lt);
//            else if (node.DUPL_PARENT > 10) return;
//            else if (isNaN(++node[`${label}-count`])) node[`${label}-count`] = 2;
//}catch(exc){ debug(circJSON.stringify(node).red_lt, `exc ${exc}`.red_lt); }
//    for (var i in obj)
//    {
//        if (typeof obj[i] == "object") obj[i].parent = obj;
//        parent_tags(obj[i], obj);
//    }
//debug(typeof node, node == undefined, node === null); //Object.keys(node).length);
//debug(key || "UNNAMED", Object.keys(node).map((key) => `${key} = ${typeof node[key]}: ${node[key]}`).join(","));
        Object.keys(node).forEach((key) => parentify(node[key], filter, label, node)); //, key)); //, (depth || 0) + 1)); //CAUTION: recursion
//        Object.keys(node).forEach((key) => 
//        {
//            if ((node[key] || {}).uid == 62.1) debug(typeof node.length, node.length, JSON.stringify(clone(node, 2), null, 2));
//        });
//debug(`parentify: ${circJSON.stringify(node)}`);
    }
    return node; //fluent
}


//deep copy:
function clone(obj, max_depth)
{
//no    JSON.parse(JSON.stringify(obj)); //only copies one level deep
//    if (typeof obj != "obj") return (max_depth > 0)? obj: "[TOO DEEP]";
    const retval = {};
    Object.keys(obj).forEach((key) => retval[key] = (!obj[key] || (typeof(obj[key]) != "object"))? obj[key]: max_depth? clone(obj[key], max_depth - 1): "[TOO DEEP]");
    return retval;
}

//give each node a unique id# for easier debug:
//const uniqify =
//module.exports.uniqify =
//function uniqift(node)
//{
//    if (isNaN(ast_node.uid = ++traverse.uid)) ast_node.uid = traverse.uid = 1;
//}


/*
const error =
module.exports.error =
function error(msg)
{
    if (isNaN(++error.count)) error.count = 1;
    console.error(`[ERROR] ${msg}`.red_lt);
}


const warn =
module.exports.warn =
function warn(msg)
{   
    if (isNaN(++warn.count)) warn.count = 1;
    console.error(`[WARNING] ${msg}`.yellow_lt);
}


//function safe_eval(expr)
//{
//    try { return eval(expr); }
//    catch (exc) { return `ERROR: ${exc} on '${expr}'`; }
//}


//split shebang string into separate args:
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

//function str_trim(str) //trim quotes and trailing semi-colon; NOTE: assumes only 1 param
//{
//    return str.replace(/;\s*$/, "").replace(/^\s*\(\s*(.*)\s*\)\s*$/, "$1");
//}


//placeholder function:
function nop(arg) { return arg; }


function pushline(str)
{
    this.push(str);
    this.push("\n");
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

//prototype extensions:
function extensions()
{
//    if (extensions.did) return; //1x only
//    extensions.did = true;
    if (isNaN(++extensions.count)) extensions.count = 1;
    console.error(`extensions: count ${extensions.count} @${__line}`);
//arrays:
    if (!Array.prototype.last)
        Object.defineProperty(Array.prototype, "last",
        {
            get() { return this[this.length - 1]; }, //NOTE: will be undefined with array is empty
            set(newval) { if (this.length) this[this.length - 1] = newval; else this.push(newval); return this; },
        });
//strings:
    JSON5.sv_stringify = JSON5.stringify;
    JSON5.stringify = function(args)
    {
//    console.error("json5.stringify: " + typeof sv_stringify);
        return (this.sv_stringify.apply(JSON5, arguments) || "").replace(/,(?=\w)/gi, ", ").replace(/:/g, ": "); //put a space after ",:" for easier readability
    }
//XRegExp is interchangeable with RE, so make the API interchangeable as well:
//    console.log(String.prototype.match.toString());
//    String.prototype.sv_match = String.prototype.match;
//NOTE: XRegExp.exec works with non-XRegExp RE also
    String.prototype.match = function(xre) { return XRegExp.exec(this, xre); }; //console.error("is xregexp? " + XRegExp.isRegExp(re)); return XRegExp.exec(this, re); } //XRegExp.isRegExp(re)? XRegExp.exec(this.toString(), re): this.sv_match(re); }
    String.prototype.replace = function(xre, newstr) { return XRegExp.replace(this, xre, newstr); };
//    console.log(String.prototype.match.toString());
    String.prototype.quote = function(quotype) { return quote(this/-*.toString()*-/, quotype); }
    String.prototype.unquote = function(quotype) { return unquote(this/-*.toString()*-/, quotype); }
//conflict with prop:    String.prototype.color_reset = function(color) { return color_reset(this.toString(), color); }
    String.prototype.echo_stderr = function(desc) { console.error(`${desc || "echo_stderr"} @${srcline(1)}`, this/-*.toString()*-/); return this; }
    Object.defineProperties(String.prototype,
    {
    quoted: { get() { return quote(this/-*.toString()*-/); }, },
        quoted1: { get() { return quote(this/-*.toString()*-/, "'"); }, },
unquoted: { get() { return unquote(this/-*.toString()*-/); }, },
unparen: { get() { return unparen(this/-*.toString()*-/); }, },
        unindent: { get() { return unindent(this); }, },
anchorRE: { get() { return anchorRE(this/-*.toString()*-/); }, },
spaceRE: { get() { return spaceRE(this/-*.toString()*-/); }, },
color_reset: { get() { return color_reset(this/-*.toString()*-/); }, },
nocolors: { get() { return nocolors(this/-*.toString()*-/); }, },
//        echo_stderr: { get() { console.error("echo_stderr:", this.toString()); return this; }, },
    });
//unit tests:
    return;
    console.error("is quoted?", !!is_quostr(` "quoted" `), !!is_quostr(`"hi" + "bye"`));
    console.error("quoted".quoted, '"unquoted1"'.unquoted, "'unquoted2'".unquoted);
    console.error(" ( hello ) ".unparen, "anchor".anchorRE, "space".spaceRE);
    console.error(["leader".blue_lt, "intro", "red".red_lt, "more", "green".green_lt, "trailer"].join(" ").color_reset, "hello");
    console.error(["intro", "red".red_lt, "more", "green".green_lt, "trailer"].join(" ").color_reset, "hello");
    console.error(color_reset(["intro", "red".red_lt, "more", "green".green_lt, "trailer"].join(" "), "".pink_lt), "hello");
    console.error(["leader".blue_lt, "intro", "red".red_lt, "more", "green".green_lt].join(" ").color_reset, "hello");
    process.exit(0);
}
*/


/////////////////////////////////////////////////////////////////////////////////
////
/// Unit test/Command-line interface:
//

//initial option values:
//overridable by command line and/or shebang line
const DEFAULT_OPTS =
{
    debug: false, //diagnostic info
    echo: false, //echo preprocessed input to stderr (for debug)
    shebang: false, //don't keep shebang (comment it out)
    entpt: "main",
//optional phases:
    preproc: true, //macro preprocessor
    run: false, //run-time initialization/sim
    ast: true, //generate ast
    reduce: true, //reduce/optimize ast
    codegen: true, //generate code (emit ast events)
};


const dsl_CLI =
module.exports.CLI =
function dsl_CLI(more_opts)
{
//console.error("args<-", JSON5.stringify(process.argv));
//    const RequireFromString = require('require-from-string');
//    const Collect = require("collect-strean");
//    const {LineStream} = require('byline');
//    const CWD = "";
//    const filename = (process.argv.length > 2)? `'${pathlib.relative(CWD, process.argv.slice(-1)[0])}'`: null;
    const opts = dsl_CLI.opts = new Proxy(
        Object.assign({}, DEFAULT_OPTS, more_opts || {}), //start with shallow copy
        {
//            get: function(target, propname) //debug only
//            {
//                if (!(propname in target)) warn(`access undef prop '${propname || "NONAME"}'`);
//                return target[propname];
//            },
            set: function(target, propname, newvalue) //, real_target) //keep track of changed values
            {
//for unique changes?                if (target[propname] === newvalue) return; //no change
                if (propname == "changes") { target.changes = newvalue; return true; } //kludge: allow caller to mess with tracked changes
                target[propname] = newvalue;
                if (!target.changes) Object.defineProperty(target, "changes", {value: {}, writable: true, }); //defaults to !changeable, !enumerable
//                if (isNaN(++target.changes[propname])) target.changes[propname] = 1; //count #changes
                ++target.changes[propname] || (target.changes[propname] = 1); //count #changes
                return true; //assigned successfully
            },
        });
//    const [instrm, outstrm] = [opts.filename? fs.createReadStream(opts.filename.unquoted): process.stdin, process.stdout]; //fs.createWriteStream("dj.txt")];
//    const retstrm =
//        instrm
//    const retstrm =
    debug("DSL engine: finish asynchronously".green_lt);
    return CLI(opts)
        .on("args", (argv) => set_opts(argv, opts))
//        .pipe(prepend())
//        .pipe(new LineStream({keepEmptyLines: true})) //preserve line#s (for easier debug)
//        .pipe(PreProc(infile))
//        .pipe(fixups())
//        .pipe(opts.echo? echo_stream(Object.assign({pass: "input"}, opts)): new PassThrough())
//        .pipe(opts.preproc? preproc(opts): new PassThrough())
//        .pipe(opts.echo? echo_stream(opts): new PassThrough())
//        .pipe(ReplStream(opts))
        .pipe(dsl2js(opts)) //Object.assign(opts, more_opts || {})))
        .pipe(opts.ast? js2ast(opts): new PassThrough()) //Object.assign(opts, more_opts || {})))
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
        .on("finish", () => eof("finish"))
        .on("close", () => eof("close"))
        .on("done", () => eof("done"))
        .on("end", () => eof("end"))
        .on("error", err => { eof(`ERROR ${err}`.red_lt); process.exit(); });
//    debug("DSL engine: finish asynchronously".green_lt);
//    retstrm.emit("dsl-opts", opts);
//console.error(typeof retstrm);
//    return retstrm;

    function eof(why)
    {
//        CaptureConsole.stopCapture(process.stdout);
        debug(`${__file} stream: ${why || "eof"}`.green_lt);
        console.error(`${warn.count || 0} warnings`.yellow_lt);
        console.error(`${error.count} errors`.red_lt);
    }
}
//                  _____<____________<_________
//                 /                            \
//file or stdin ---\--> macro expand -> REPL ---/----> AST


function set_opts(argv, opts)
{
//debug(`dsl args ${JSON.stringify(argv)}`.pink_lt);
//debug("dsl beginning opts", opts);
//            debug.enabled.push([]); //collect output until caller decides
    var sv_debug_enabled;
    if (sv_debug_enabled = debug.enabled) debug.enabled = []; //turn on buffering so debug.more() will work
    opts.changes = {}; //kludge: exclude initial values from change tracking
    /*process.*/argv.forEach((arg, i, all) =>
    {
        const /*arg = process.argv[i],*/ argname = `arg[${i}/${/*process.*/argv.length}]`;
        debug(`${argname}: '${arg}' =>`.blue_lt);
        if (i < 2) { debug.more("SKIP".blue_lt); return; } //skip node + script file names
//            var parts = arg.match(/^([+-])?([^=]+)(=(.*))?$/);
        const OPTION_xre = XRegExp(`
            (?<onoff> [+-] )?  #allow turn on/off (allows caller to override defaults)
            (?<name> [^=]+ )  #name of option
            (
                =  #assign non-boolean value (optional)
                (?<value> .* )
            )?
        `.anchorRE, "x");
        var parts = arg.match(OPTION_xre);
        if (!parts || (parts.onoff && parts.value)) { debug.more("INVALID".red_lt); return error(`invalid option in ${argname}: '${arg}'`); }
        if (!parts.onoff && !parts.value) parts = {name: "filename", value: (parts.name.unquoted || parts.name).quoted1, }; //treat stand-alone value as filename; strip optional quotes and then re-add
//                parts.name = parts.name.toLowerCase();
        var sv_value = opts[parts.name.toLowerCase()];
        opts[parts.name.toLowerCase()] = parts.onoff? (parts.onoff == "+"): parts.value;
        debug.more(`${parts.name} = ${opts[parts.name.toLowerCase()]}`.cyan_lt);
        if (opts.changes[parts.name.toLowerCase()] > 1) //option was already specified
        {
            warn(`${argname} '${arg}' overrides prior value '${JSON.stringify(sv_value)}'`);
            debug.more("OVERRIDE".yellow_lt);
        }
    });
//            debug.enabled.pop();
    debug.enabled = sv_debug_enabled;
//    const debug_out = []; //collect output until debug option is decided (options can be in any order)
//    for (var i = 0; i < process.argv.length; ++i) //command line options; NOTE: shebang in input file might also have args (split and strip comments)
//        shebang_args(process.argv[i], i - 2).forEach((arg, inx, all) =>
//    console.log(JSON.stringify(opts, null, "  "));
    Object.keys(opts).forEach((key) =>
    {
        if (key.toLowerCase() in opts.changes) return;
        debug("default option:".blue_lt, `${key} = ${opts[key]}`.cyan_lt); //show default options also
    });
//    if (opts.debug) console.error(debug_out.join("\n").blue_lt.color_reset);
    if (opts.help) console.error(`usage: ${pathlib.basename(__filename)} [+-codegen] [+-debug] [+-echo] [+-help] [+-src] [filename]\n\tcodegen = don't generate code from ast\n\tdebug = show extra info\n\techo = show macro-expanded source code into REPL\n\tfilename = file to process (defaults to stdin if absent)\n\thelp = show usage info\n\tsrc = display source code instead of compiling it\n`.yellow_lt);
    debug(`DSL engine: reading from ${opts.filename || "stdin"} ...`.green_lt);
}


if (!module.parent) dsl_CLI().pipe(process.stdout); //auto-run CLI, generated output to console

//eof