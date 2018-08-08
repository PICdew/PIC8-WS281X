#!/usr/bin/env node
//DSL-to-Javascript AST streamer

"use strict";
require("magic-globals"); //__file, __line, __func, etc
require("colors").enabled = true; //for console output; https://github.com/Marak/colors.js/issues/127


/////////////////////////////////////////////////////////////////////////////////
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
    if (opts.debug)
    {
        console.error(`${process.argv.length} dsl args:`.blue_lt);
        for (var a in process.argv)
            console.error(`arg[${a}/${process.argv.length}]: '${process.argv[a]}'`.blue_lt);
    }
    const outstrm = instrm
        .pipe(new LineStream({keepEmptyLines: true})) //preserve line#s (for easier debug and correct #directive handling)
//        .pipe(preproc())
        .pipe(thru2(xform, flush)); //syntax fixups
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
    outstrm.prefix = prefix;
    outstrm.suffix = suffix;
    return new DuplexStream(outstrm, instrm); //return endpts for more pipelining; CAUTION: swap in + out

    function xform(chunk, enc, cb)
    {
        if (!this.chunks) this.chunks = [];
        if (typeof chunk != "string") chunk = chunk.toString(); //TODO: enc?
        if (!opts.shebang && !this.chunks.length && chunk.match(/^\s*#\s*!/)) { this.chunks.push("//" + /*chunk.length + ":" +*/ chunk + "\n"); cb(); return; } //skip shebang; must occur before prepend()
        if (chunk.length)
        {
//            if (!opts.shebang && (this.linenum == 1) && chunk.match(/^\s*#\s*!/)) { this.chunks.push("//" + chunk + "\n"); cb(); return; } //skip shebang; must occur before prepend()
//            prepend.call(this);
//            this.push(chunk + ` //line ${this.linenum}\n`); //add line delimiter (and line# for debug)
//            this.push(chunk + `; "line ${this.linenum}";\n`); //add line delimiter (and line# for debug)
//            this.push(chunk + "\n"); //NO- add line delimiter (and line# for debug)
            this.prefix();
            this.chunks.push(chunk);
//            this.push(chunk);
        }
        cb();
    }
    function flush(cb)
    {
//        append.call(this);
//        if (opts.run) this.push(`const ast = require("${process.argv[1]}").walkAST(${opts.run});\n`);
        if (this.chunks)
        {
            this.suffix();
            const module = RequireFromString(this.chunks.join("\n"));
            if (opts.echo) console.error(this.chunks.join("\n").cyan_lt); //show source code input
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
            console.error("run ...".green_lt);
            module(); //execute load-time logic; start run-time sim if -run flag is present (see suffix)
            console.error("... ran".red_lt);
//            }
            const ast = JSON.stringify(toAST(module), null, "  ");
            if (opts.ast) console.error(ast); //show raw ast
            /*if (opts.ast)*/ this.push(/*"const ast = " +*/ ast + "\n"); //send downstream
//            else this.push("TODO: code gen\n");
//            compiled.execode
        }
        else this.push("no output :(\n");
        cb();
    }

    function prefix()
    {
        console.error("dsl prefix: start stdout capture".pink_lt);
        CaptureConsole.startCapture(process.stdout, (output) => { this.chunks.push("//stdout: " + output); }); //send all stdout downstream thru pipeline
//        global.abc = function() { console.log("goodbye."); }; //NOTE: this is accessible in child module
//        global.opts = opts; //make command line args accessible in child module
//        this.chunks.push(`console.log("begin");\n`);
//        if (false)
        this.chunks.push(`
            "use strict";
            const {step/*, walkAST*/} = require("./dsl.js");
            module.exports = function(){ //wrap all logic so it's included within AST
            `.replace(/^\s+/gm, "")); //drop leading spaces; heredoc idea from https://stackoverflow.com/questions/4376431/javascript-heredoc
        this.prefix = function(){}; //only call this function once
    }
    function suffix()
    {
        CaptureConsole.stopCapture(process.stdout);
        console.error("dsl suffix: end stdout capture".pink_lt);
        this.chunks.push(`
//            if (typeof run == "function") run();
            ${!opts.run? "//": ""}run();
            } //end of wrapper
            `.replace(/^\s+/gm, ""));
    }
}


///////////////////////////////////////////////////////////////////////////////
////
/// Traverse AST, emit nodes:
//

const walkAST =
module.exports.walkAST =
function walkAST(opts) //{}
{
    const instrm = new PassThrough(); //wrapper end-point
//    const instrm = new LineStream({keepEmptyLines: true}); //preserve line#s (for easier debug)
    const outstrm = instrm
//        .pipe(preproc())
        .pipe(thru2(xform, flush)); //syntax fixups
    outstrm.traverse = traverse;
    return new DuplexStream(outstrm, instrm); //return endpts for more pipelining; CAUTION: swap in + out

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
            const ast = JSON.parse(this.chunks.join("\n"));
            this.traverse(ast, "entpt");
//            else this.push("TODO: code gen\n");
//            compiled.execode
        }
        else this.push("no output :(\n");
        cb();
    }

    function traverse(ast_node, name, nest) //, want_type)
    {
        const THIS = /*traverse*/ this, LEVEL = "  ";
//    if (!ast_node) ast_node = eval(ast_node); else
//    if ((typeof ast_node != "object") || !ast_node.type) ast_node = toAST(eval(ast_node || "main")); //ast_node = toAST(eval(ast_node || "main")); //{type: "CallExpression", callee: {type: "Identifier", name: "main"}, arguments: []}); //top level node
//    if (!nest) ast_node = toAST(ast_node);
//    ast_node = ast_node || toAST(main); //startup);
        if (!THIS.seen) THIS.seen = {}; //{ ast_node = toAST(ast_node || main); THIS.seen = {}; } //keep list of other ASTs needed
        if (!THIS.symtab) THIS.symtab = {};
        if (!ast_node) return;
        name = name || nameof(ast_node); //(ast_node.id || {}).name || "";
        nest = nest || "";

//    if (want_type && (ast_node.type != want_type)) throw `AST traverse: expected '${name}' to be ${want_type}, not ${ast_node.type}`.red_lt;
//    return console.error(JSON.stringify(ast_node, null, "  "));
//        this.emit(short_type(ast_node.type), ast_node); //pass to downstream event handlers
//        var evttype = "ast-" + ast_node.type //reduce verbosity
//            .replace(/Function/i, "func")
//            .replace(/Expression/i, "expr")
//            .replace(/Declaration/i, "decl")
//            .replace(/Statement/i, "stmt")
//            .replace(/Variable/i, "var")
//            .replace(/Template/i, "templ")
//            .replace(/Assignment/i, "asst")
//            .replace(/Literal/i, "lit")
//            .replace(/Identifier/i, "ident")
//            .toLowerCase();
        this.emit("astnode", Object.assign({}, ast_node, {nest, name})); //NOTE: shallow copy
        switch (ast_node.type)
        {
            case "FunctionExpression": //{type, id{}, params[], defaults[], body{}, generator, expression}
            case "FunctionDeclaration": //{type, id{}, params[], defaults[], body{}, generator, expression}
                console.error(`${nest}'${name}': func ${ast_node.type.replace(/^.*(Expr|Decl).*$/i, "$1")} '${nameof(ast_node.id)}' expr, ${ast_node.params.length} params, ${ast_node.defaults.length} defaults, gen? ${ast_node.generator}, expr? ${ast_node.expression}`);
//                evttype = ast_node.type.replace(/Function/i, "func")
                THIS.symtab[nameof(ast_node.id)] = ast_node;
//            if (!want_type) funclist.push(ast_node.id.name);; //add to active function list
                (ast_node.params || []).forEach((param, inx, all) => { traverse(param, `param[${inx}/${all.length}]`, nest + LEVEL); });
                (ast_node.defaults || []).forEach((def, inx, all) => { traverse(def, `def[${inx}/${all.length}]`, nest + LEVEL); });
                traverse(ast_node.body, `${nameof(ast_node.id)} body`, nest + LEVEL);
                break;
            case "BlockStatement": //{type, body[]}
                console.error(`${nest}'${name}': block stmt, ${ast_node.body.length} stmts`);
//                if (!ast_node.body) throw `AST: expected body for ${name}`.red_lt;
                (ast_node.body || []).forEach((stmt, inx, all) => { traverse(stmt, `blk stmt[${inx}/${all.length}]`, nest + LEVEL); });
                break;
            case "VariableDeclaration": //{type, declarations[], kind}
                console.error(`${nest}'${name}': var decl, ${ast_node.declarations.length} dcls, kind ${ast_node.kind}`);
                (ast_node.declarations || []).forEach((dcl, inx, all) => { traverse(Object.assign({kind: ast_node.kind}, dcl), `${ast_node.kind} decl[${inx}/${all.length}]`, nest + LEVEL); });
                break;
            case "VariableDeclarator": //{type, id, init{}, kind-inherited}
                console.error(`${nest}'${name}': def name '${nameof(ast_node.id)}', kind ${ast_node.kind}`);
                THIS.symtab[nameof(ast_node.id)] = ast_node;
                traverse(ast_node.init, `${nameof(ast_node.id)}.init`, nest + LEVEL);
                break;
            case "ArrayExpression": //{type, elements[]}
                console.error(`${nest}'${name}': arr expr, ${ast_node.elements.length} exprs`);
                (ast_node.elements || []).forEach((expr, inx, all) => { traverse(expr, `expr[${inx}/${all.length}]`, nest + LEVEL); });
                break;
            case "ExpressionStatement": //{type, expression{}}
                console.error(`${nest}'${name}': expr stmt`);
                traverse(ast_node.expression, "expr stmt", nest + LEVEL);
                break;
            case "CallExpression": //{type, callee{}, arguments[]}
//            if (!THIS.seen) THIS.seen = {};
//            if (!THIS.funclist) THIS.funclist = [];
                console.error(`${nest}'${name}': call expr to ${nameof(ast_node.callee)}: ${arguments.length} args, already seen? ${!!THIS.seen[nameof(ast_node.callee)]}`); //, ${JSON.stringify(ast_node.callee)}`);
//            var callee = (ast_node.callee.type == "MemberExpression")? `${ast_node.callee.object.name}.${ast_node.callee.property.name}`: ast_node.callee.name;
                (ast_node.arguments || []).forEach((arg, inx, all) => { traverse(arg, `arg[${inx}/${all.length}]`, nest + LEVEL); });
                if (!THIS.seen[nameof(ast_node.callee)]) THIS.seen[nameof(ast_node.callee)] = null; //leave placeholder for AST; traverse later; //toAST(ast_node.callee); //{ THIS.funclist.push(nameof(ast_node.callee)); }
                break;
            case "ArrowFunctionExpression": //{type, id{}, params[], defaults[], body{}, generator, expression}
                console.error(`${nest}'${name}': arrow expr '${name || ast_node.id.name}', ${ast_node.params.length} params, ${ast_node.defaults.length} defaults`);
                (ast_node.params || []).forEach((param, inx, all) => { console.error(`${nest}param ${param}`); });
                (ast_node.defaults || []).forEach((def, inx, all) => { traverse(def, `def[${inx}/${all.length}]`, nest + LEVEL); });
                traverse(ast_node.body, "ArrowFunctionExpression", nest + LEVEL);
                break;
            case "BinaryExpression": //{type, operator, left{}, right{}}
            case "LogicalExpression": //{type, operator, left{}, right{}}
                console.error(`${nest}'${name}': ${ast_node.type.slice(0, 3)} expr, op ${ast_node.operator}`);
                traverse(ast_node.left, "lhs", nest + LEVEL);
                traverse(ast_node.right, "rhs", nest + LEVEL);
                break;
            case "UnaryExpression": //{type, operator, argument{}}
                console.error(`${nest}'${name}': unary expr, op ${ast_node.operator}`);
                traverse(ast_node.argument, "unop-arg", nest + LEVEL);
                break;
            case "UpdateExpression": //{type, operator, argument{}, prefix}
                console.error(`${nest}'${name}': upd expr, op ${ast_node.operator}, prefix? ${ast_node.prefix}`);
                traverse(ast_node.argument, "updop-arg", nest + LEVEL);
                break;
            case "AssignmentExpression": //{type, operator, left{}, right{}}
                console.error(`${nest}'${name}': asst expr, op ${ast_node.operator}`);
                traverse(ast_node.left, "asst-lhs", nest + LEVEL);
                traverse(ast_node.right, "asst-rhs", nest + LEVEL);
                break;
            case "NewExpression": //{type, callee{}, arguments[]}
                console.error(`${nest}'${name}': new expr to ${nameof(ast_node.callee)}: ${arguments.length} args!!THIS.seen[nameof(ast_node.callee)]}`); //, ${JSON.stringify(ast_node.callee)}`);
//            var callee = (ast_node.callee.type == "MemberExpression")? `${ast_node.callee.object.name}.${ast_node.callee.property.name}`: ast_node.callee.name;
                (ast_node.arguments || []).forEach((arg, inx, all) => { traverse(arg, `arg[${inx}/${all.length}]`, nest + LEVEL); });
                if (!THIS.seen[nameof(ast_node.callee)]) THIS.seen[nameof(ast_node.callee)] = null; //leave placeholder for AST; traverse later; //toAST(ast_node.callee); //{ THIS.funclist.push(nameof(ast_node.callee)); }
                break;
            case "ForStatement": //{type, init{}, test{}, update{}, body{}}
                console.error(`${nest}'${name}': for stmt`)
                traverse(ast_node.init, "for-init", nest + LEVEL);
                traverse(ast_node.test, "for-test", nest + LEVEL);
                traverse(ast_node.update, "for-upd", nest + LEVEL);
                traverse(ast_node.body, "for-body", nest + LEVEL);
                break;
            case "WhileStatement": //{type, test{}, body{}}
                console.error(`${nest}'${name}': while stmt`)
                traverse(ast_node.test, "while-test", nest + LEVEL);
                traverse(ast_node.body, "while-body", nest + LEVEL);
                break;
            case "SwitchStatement": //{type, discriminant{}, cases[]}
                console.error(`${nest}'${name}': switch stmt, ${ast_node.cases.length} cases`);
                traverse(ast_node.discriminant, "switch val", nest + LEVEL);
                (ast_node.cases || []).forEach((casestmt, inx, all) => { traverse(casestmt, `case[${inx}/${all.length}]`, nest + LEVEL); });
                break;
            case "SwitchCase": //{type, test{}, consequent[]}
                console.error(`${nest}'${name}': switch case, ${ast_node.consequent.length} consequents`)
                traverse(ast_node.test, "switch test", nest + LEVEL);
                (ast_node.consequent || []).forEach((conseq, inx, all) => { traverse(conseq, `consequent[${inx}/${all.length}]`, nest + LEVEL); });
                break;
            case "ThrowStatement": //{type, argument{}}
                console.error(`${nest}'${name}': throw stmt`)
                traverse(ast_node.test, "throw stmt", nest + LEVEL);
                break;
            case "IfStatement": //{type, test{}, consequent{}, alternate{}}
                console.error(`${nest}'${name}': if stmt`)
                traverse(ast_node.test, "if test", nest + LEVEL);
                traverse(ast_node.consequent, "if-true", nest + LEVEL);
                traverse(ast_node.alternate, "if-false", nest + LEVEL);
                break;
            case "YieldExpression": //{type, argument{}, delegate}
                console.error(`${nest}'${name}': yield expr, delegate? ${ast_node.delegate}`);
                traverse(ast_node.argument, "yield expr", nest + LEVEL);
                break;
            case "TemplateLiteral": //{type, quasis[], expressions[]}
                console.error(`${nest}'${name}': template lit, ${ast_node.quasis.length} quasis, ${ast_node.expressions.length} exprs`);
                (ast_node.quasis || []).forEach((quasi, inx, all) => { traverse(quasi, `quasi[${inx}/${all.length}]`, nest + LEVEL); });
                (ast_node.expressions || []).forEach((expr, inx, all) => { traverse(expr, `expr[${inx}/${all.length}]`, nest + LEVEL); });
                break;
            case "ReturnStatement": //{type, argument{}}
                console.error(`${nest}'${name}': return stmt`);
                traverse(ast_node.argument, "ret stmt", nest + LEVEL);
                break;
            case "ExpressionStatement": //{type, expression}
                console.error(`${nest}'${name}': expr stmt`);
                traverse(ast_node.expression, "expr stmt", nest + LEVEL);
                break;
            case "Identifier": //{type, name}
                console.error(`${nest}'${name}': ident '${ast_node.name}'`);
                if (!THIS.seen[nameof(ast_node)]) THIS.seen[nameof(ast_node)] = null; //leave placeholder for AST; traverse later
                break;
            case "TemplateElement": //{type, value{}, tail}
                console.error(`${nest}'${name}': templ element, raw '${ast_node.value.raw}', cooked '${ast_node.value.cooked}', tail? ${ast_node.tail}`)
                break;
            case "BreakStatement": //{type, label}
                console.error(`${nest}'${name}': break stmt, label '${ast_node.label}'`);
                break;
            case "EmptyStatement": //{type}
                console.error(`${nest}'${name}': empty stmt`);
                break;
            case "Literal" : //{type, value, raw}
                console.error(`${nest}'${name}': literal value '${ast_node.value}', raw '${ast_node.raw}'`);
                break;
            case "MemberExpression": //{type, computed, object{}, property{}}
                console.error(`${nest}'${name}': member expr '${ast_node.object}' '${ast_node.property}'`);
                if (!THIS.seen[nameof(ast_node)]) THIS.seen[nameof(ast_node)] = null; //leave placeholder for AST; traverse later
                break;
            default: //for debug
                throw `AST traverse: unhandled node type for ${name}: type '${ast_node.type}', node ${JSON.stringify(ast_node, null, "  ")}`.red_lt;
        }
        return true;
//        return ast;
    }

//cut down on verbosity:
//    function short_type(str)
//    {
//        return str.replace(/Expression/i, "expr").replace(/Statement/i, "stmt").replace()
//    }

    function nameof(ast_node)
    {
//    ast_node = ast_node || {};
        switch ((ast_node || {}).type)
        {
            case "MemberExpression": return `${ast_node.object.name}.${ast_node.property.name}`;
            case "FunctionExpression": return ast_node.id.name;
            case "Identifier": return ast_node.name;
            default: return `unamed ${(ast_node || {type: "(no type)"}).type}`;
//            throw `AST nameof: unhandled node type: '${JSON.stringify(ast_node)}'`.red_lt; //for debug
        }
    }

//    function expected(name, what, want, is)
//    {
//        if (what != want) throw `AST: expected '${name}' to be a ${want}, not ${is}`.red_lt;
//    }
}


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


function shebang_args(str, which)
{
    if (!which) str = str.replace(/\s*#.*$/, ""); //strip comments
    return (which < 0)? [str]: str.split(" "); //split into separate args
}

//function is_shebang(chunk)
//{
//    return (this.linenum == 1) && chunk.match(/^\s*#\s*!/);
//}


/////////////////////////////////////////////////////////////////////////////////
////
/// Unit test/Command-line interface:
//

const pathlib = require("path");
const fs = require("fs");

const CLI =
module.exports.CLI =
function CLI(more_opts)
{
//    const RequireFromString = require('require-from-string');
//    const Collect = require("collect-strean");
//    const {LineStream} = require('byline');
    const CWD = "";
//    const filename = (process.argv.length > 2)? `'${pathlib.relative(CWD, process.argv.slice(-1)[0])}'`: null;
    const opts = {}, debug_out = [];
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
        .pipe(dsl2ast(Object.assign(opts, more_opts || {})))
//        .pipe(!opts.src? dsl2js(opts): new PassThrough()) //{filename, debug: true})) //, run: "main"}))
//        .pipe((!opts.src && !opts.codegen)? js2ast(opts): new PassThrough())
//        .pipe(asm_optimize())
//    .pipe(text_cleanup())
//        .pipe(append())
//        .pipe(RequireStream())
//        .pipe(json2ast())
//        .pipe((opts.codegen /*!= undefined*/)? new PassThrough(): js2ast(opts))
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
    console.error("DSL engine: finish asynchronously".green_lt);
    return retstrm;
}
//                  ____________________________
//                 /                            \
//file or stdin ---\--> macro expand -> REPL ---/----> AST

if (!module.parent) CLI(); //auto-run CLI

//eof