//#!./dsl.js
"use strict";
require("magic-globals"); //__file, __line, __func, etc
require("colors").enabled = true; //for console output; https://github.com/Marak/colors.js/issues/127
const RUN = false; //debug/sim vs. code gen
function* wrapper(){

//#include "pic16f1827.h"
var TRISA, PORTA, TMR1, T1IF;
if (RUN)
    setInterval(function(){ T1IF = 1; /*console.error("tick")*/; }, 65.536); //simulate Timer 1

function simple_func(x) { return x + 4; }
//function wrapper() { main(); }


function* main()
{
    TRISA = 0x3;
    PORTA = 0;
    for (;;)
    {
        PORTA ^= 0x1;
        console.error(`PORTA = ${PORTA}`);
        yield* wait_1sec();
    }
}

function* wait_1sec()
{
    const LIMIT = Math.round(1000000 / 65536);
    var loop = LIMIT; //PIC.Reg({value: LIMIT}); //shared RAM 0x70

    while (loop-- > 0)
    {
//        console.error(`loop = ${loop}`);
        TMR1 = Math.round(1000000 / LIMIT);
        T1IF = 0;
        while (!T1IF) yield step; //process.nextTick();
    }
}


yield* main();
}
//const gen = main();
//step thru generator function:
function step(gen)
{
    if (!step.gen || (typeof gen == "function")) step.gen = gen(); //start main entry point
    const {done, retval} = step.gen.next();
    while (typeof retval == "function") retval = retval();
    if (done) return retval;
    setImmediate(step); //give other events a chance to fire, then step main again
}
//for (;;) { if (gen.next().done) break; }
//walkAST("wait_1sec", "wait_1sec");
if (RUN)
    step(wrapper); //run (sim); for logic debug only
else
    walkAST("wrapper", true); //{type: "CallExpression", callee: {type: "Identifier", name: "main"}, arguments: []});
//    walkAST("wrapper"); //"simple_func"); //"main");

//function startup() { main(); }
function walkAST(entpt, want_raw)
{
    const toAST = require("to-ast"); //https://github.com/devongovett/to-ast
    if (want_raw === true) want_raw = entpt.toString();
    entpt = (typeof entpt == "function")? entpt: safe_eval(entpt || "main");
    if (want_raw) { console.error(want_raw, JSON.stringify(toAST(entpt), null, "  ")); return; }
//    return console.log(JSON.stringify(toAST(simple_func), null, "  "));
//    const ast = toAST(main);
//    traverse(ast);
//    traverse.funclist = [startup];
//    for (var i = 0; i < traverse.funclist.length; ++i)
//    traverse.seen = {entpt || "main": null};
//    traverse(entpt);
//    if ((typeof ast_node != "object") || !ast_node.type) ast_node = toAST(eval(ast_node || "main")); //ast_node = toAST(eval(ast_node || "main")); //{type: "CallExpression", callee: {type: "Identifier", name: "main"}, arguments: []}); //top level node
    traverse(toAST(entpt), "entpt");
    while (Object.keys(traverse.seen).some((name, inx, all) => //traverse ASTs of dependent objects
    {
//        if (traverse.seen[name]) return false;
//        traverse(traverse.seen[name] = toAST(eval(name)));
//        return true;
        return !traverse.seen[name] && (traverse(traverse.seen[name] = toAST(safe_eval(name)), `dependent ${name}`));
    }));
    console.error(`${Object.keys(traverse.seen).length} things enumerated: ${Object.keys(traverse.seen).join(", ")}`);
}

function traverse(ast_node, name, nest) //, want_type)
{
    const THIS = traverse, LEVEL = "  ";
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
    switch (ast_node.type)
    {
        case "FunctionExpression": //{type, id{}, params[], defaults[], body{}, generator, expression}
            console.error(`${nest}'${name}': func expr, ${ast_node.params.length} params, ${ast_node.defaults.length} defaults, gen? ${ast_node.generator}, expr? ${ast_node.expression}`);
//            if (!want_type) funclist.push(ast_node.id.name);; //add to active function list
            (ast_node.params || []).forEach((param, inx, all) => { console.error(`${nest}param ${param}`); });
            (ast_node.defaults || []).forEach((def, inx, all) => { traverse(def, `def[${inx}/${all.length}]`, nest + LEVEL); });
            traverse(ast_node.body, `${name} body`, nest + LEVEL);
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
            console.error(`${nest}'${name}': def name '${nameof(ast_node)}', kind ${ast_node.kind}`);
            traverse(ast_node.init, `${nameof(ast_node)}.init`, nest + LEVEL);
            THIS.symtab[nameof(ast_node)] = ast_node;
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
            console.error(`${nest}'${name}': binary expr, op ${ast_node.operator}`);
            traverse(ast_node.left, "binop lhs", nest + LEVEL);
            traverse(ast_node.right, "binop rhs", nest + LEVEL);
            break;
        case "LogicalExpression": //{type, operator, left{}, right{}}
            console.error(`${nest}'${name}': logical expr, op ${ast_node.operator}`);
            traverse(ast_node.left, "logop lhs", nest + LEVEL);
            traverse(ast_node.right, "logop rhs", nest + LEVEL);
            break;
        case "UnaryExpression": //{type, operator, argument{}}
            console.error(`${nest}'${name}': unary expr, op ${ast_node.operator}`);
            traverse(ast_node.argument, "unop arg", nest + LEVEL);
            break;
        case "UpdateExpression": //{type, operator, argument{}, prefix}
            console.error(`${nest}'${name}': upd expr, op ${ast_node.operator}, prefix? ${ast_node.prefix}`);
            traverse(ast_node.argument, "updop arg", nest + LEVEL);
            break;
        case "AssignmentExpression": //{type, operator, left{}, right{}}
            console.error(`${nest}'${name}': asst expr, op ${ast_node.operator}`);
            traverse(ast_node.left, "asst lhs", nest + LEVEL);
            traverse(ast_node.right, "asst rhs", nest + LEVEL);
            break;
        case "NewExpression": //{type, callee{}, arguments[]}
            console.error(`${nest}'${name}': new expr to ${nameof(ast_node.callee)}: ${arguments.length} args!!THIS.seen[nameof(ast_node.callee)]}`); //, ${JSON.stringify(ast_node.callee)}`);
//            var callee = (ast_node.callee.type == "MemberExpression")? `${ast_node.callee.object.name}.${ast_node.callee.property.name}`: ast_node.callee.name;
            (ast_node.arguments || []).forEach((arg, inx, all) => { traverse(arg, `arg[${inx}/${all.length}]`, nest + LEVEL); });
            if (!THIS.seen[nameof(ast_node.callee)]) THIS.seen[nameof(ast_node.callee)] = null; //leave placeholder for AST; traverse later; //toAST(ast_node.callee); //{ THIS.funclist.push(nameof(ast_node.callee)); }
            break;
        case "ForStatement": //{type, init{}, test{}, update{}, body{}}
            console.error(`${nest}'${name}': for stmt, init ${ast_node.init}, test ${ast_node.test}, upd ${ast_node.update}`)
            traverse(ast_node.init, "for init", nest + LEVEL);
            traverse(ast_node.test, "for test", nest + LEVEL);
            traverse(ast_node.update, "for upd", nest + LEVEL);
            traverse(ast_node.body, "for body", nest + LEVEL);
            break;
        case "WhileStatement": //{type, test{}, body{}}
            console.error(`${nest}'${name}': while stmt, test ${ast_node.test}`)
            traverse(ast_node.test, "while test", nest + LEVEL);
            traverse(ast_node.body, "while body", nest + LEVEL);
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
            console.error(`${nest}'${name}': if stmt, test ${ast_node.test}`)
            traverse(ast_node.test, "if test", nest + LEVEL);
            traverse(ast_node.consequent, "if true", nest + LEVEL);
            traverse(ast_node.alternate, "if false", nest + LEVEL);
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
            console.error(`${nest}'${name}': break stmt, label '${ast_node.label}'`)
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

function nameof(ast_node)
{
    switch (ast_node.type)
    {
        case "MemberExpression": return `${ast_node.object.name}.${ast_node.property.name}`;
        case "FunctionExpression": return ast_node.id.name;
        case "Identifier": return ast_node.name;
        default: return `unamed ${typeof(ast_node)} ${ast_node.type}`;
//            throw `AST nameof: unhandled node type: '${JSON.stringify(ast_node)}'`.red_lt; //for debug
    }
}

function safe_eval(expr)
{
    try { return eval(expr); }
    catch (exc) { return `ERROR: ${exc} on '${expr}'`; }
}

//    function expected(name, what, want, is)
//    {
//        if (what != want) throw `AST: expected '${name}' to be a ${want}, not ${is}`.red_lt;
//    }


//eof