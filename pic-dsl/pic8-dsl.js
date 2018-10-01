#!/usr/bin/env node
//Javascript-based 8-bit PIC DSL

"use strict";
require("colors").enabled = true; //for console output; https://github.com/Marak/colors.js/issues/127
//const JSON5 = require("json5");
const {debug, warn, error, objclone, CLI} = require("./dsl.js");
//console.error("CLI", typeof CLI, CLI);


////////////////////////////////////////////////////////////////////////////////
////
/// Custom AST processing:
//

//TODO: move some of this logic into dsl #include file?
function process_node(ast_node, /*state,*/ parent, root, opts)
{
//    opts = process_node.opts; //kludge; get from caller
    if (!opts.codegen) return; //false; //not interested
    opts.opcodes || (opts.opcodes = []);
    if (!ast_node.uid) error(`unknown ast node: ${JSON.stringify(objclone(ast_node, 1))}`); //, show_object_placeholder)}`);
//    if (!ast_node) return;
    switch (ast_node.type)
    {
        case "VariableDeclarator": //{type, id, init{}, kind-inherited}
//            traverse(ast_node.init, symtab);
//            parent ${(parent || {}).type || `ary-${(parent || []).length}`}`.blue_lt, JSON.stringify(objclone(ast_node, 1)).blue_lt);
            opts.opcodes.push(`\tvar ${ast_node.id.name}; //kind ${ast_node.kind}, uid ${ast_node.uid}, parent ${(parent || {}).uid || "NONE"}, scope ${ast_node.which_scope}`.blue_lt);
            return;
//don't care about these ones:
        case "CallExpression": //{type, callee{}, arguments[]}
//            (ast_node.arguments || []).forEach((arg, inx, all) => { traverse(arg, symtab); });
//            break;
        case "BinaryExpression": //{type, operator, left{}, right{}}
        case "LogicalExpression": //{type, operator, left{}, right{}}
        case "AssignmentExpression": //{type, operator, left{}, right{}}
//            traverse(ast_node.left, symtab);
//            traverse(ast_node.right, symtab);
//            break;
        case "BlockStatement": //{type, body[]}
        case "ClassBody": //{type, body[]
//            (ast_node.body || []).forEach((stmt, inx, all) => { traverse(stmt, symtab); });
//            break;
        case "ExpressionStatement": //{type, expression{}}
//            traverse(ast_node.expression, symtab);
//            break;
        case "Identifier": //{type, name}
//            symtab[nameof(ast_node)] = symtab[nameof(ast_node)] || null; //create fwd ref if not defined yet
//            break;
        case "FunctionExpression": //{type, id{}, params[], defaults[], body{}, generator, expression}
        case "FunctionDeclaration": //{type, id{}, params[], defaults[], body{}, generator, expression}
        case "ArrowFunctionExpression": //{type, id{}, params[], defaults[], body{}, generator, expression}
//            const locals = Object.assign({}, symtab); //shallow copy to new stack frame
//            (ast_node.params || []).forEach((param, inx, all) => { traverse(param, locals); }); //treat as defined vars
//            (ast_node.defaults || []).forEach((def, inx, all) => { traverse(def, locals); });
//            traverse(ast_node.body, locals);
//            break;
        case "IfStatement": //{type, test{}, consequent{}, alternate{}}
        case "ConditionalExpression": //{type, test{}, consequent{}, alternate{}}
//            traverse(ast_node.test, symtab);
//            traverse(ast_node.consequent, symtab);
//            traverse(ast_node.alternate, symtab);
//            break;
        case "ForStatement": //{type, init{}, test{}, update{}, body{}}
//            traverse(ast_node.init, symtab);
//            traverse(ast_node.test, symtab);
//            traverse(ast_node.update, symtab);
//            traverse(ast_node.body, symtab);
//            break;
        case "ForInStatement": //{type, left{}, right{}, body{}}
//            break;
        case "WhileStatement": //{type, test{}, body{}}
//            traverse(ast_node.test, symtab);
//            traverse(ast_node.body, symtab);
//            break;
        case "UnaryExpression": //{type, operator, argument{}}
        case "UpdateExpression": //{type, operator, argument{}, prefix}
//            traverse(ast_node.argument, symtab);
//            break;
        case "YieldExpression": //{type, argument{}, delegate}
//            traverse(ast_node.argument, symtab);
//            break;
//////////////
        case "MethodDefinition": //{type, key{}, computed, value{}}
//            break;
        case "ClassDeclaration": //{type, id{}, superClass{}, body{}}
//            break;
        case "VariableDeclaration": //{type, declarations[], kind}
//            (ast_node.declarations || []).forEach((dcl, inx, all) => { traverse(dcl, symtab); });
//            break;
        case "ObjectExpression": //{type, properties[]}
//            break;
        case "Property": //{type, key{}, computed, value{}, kind, method, shorthand}
//            break;
        case "ArrayExpression": //{type, elements[]}
//            (ast_node.elements || []).forEach((expr, inx, all) => { traverse(expr, symtab); });
//            break;
        case "ThrowStatement": //{type, argument{}}
        case "ReturnStatement": //{type, argument{}}
        case "ThisExpression": //{type}
        case "Super": //{type}
//            traverse(ast_node.argument, symtab);
//            break;
        case "NewExpression": //{type, callee{}, arguments[]}
//            (ast_node.arguments || []).forEach((arg, inx, all) => { traverse(arg, symtab); });
//            traverse(ast_node.callee, symtab);
//            break;
        case "SwitchStatement": //{type, discriminant{}, cases[]}
//            traverse(ast_node.discriminant, symtab);
//            (ast_node.cases || []).forEach((casestmt, inx, all) => { traverse(casestmt, symtab); });
//            break;
        case "SwitchCase": //{type, test{}, consequent[]}
//            traverse(ast_node.test, symtab);
//            (ast_node.consequent || []).forEach((conseq, inx, all) => { traverse(conseq, symtab); });
//            break;
        case "TemplateLiteral": //{type, quasis[], expressions[]}
//            (ast_node.quasis || []).forEach((quasi, inx, all) => { traverse(quasi, symtab); });
//            (ast_node.expressions || []).forEach((expr, inx, all) => { traverse(expr, symtab); });
//            break;
        case "TemplateElement": //{type, value{}, tail}
//            traverse(ast_node.value, symtab);
//            break;
        case "MemberExpression": //{type, computed, object{}, property{}}
//            traverse(ast_node.object, symtab);
//            traverse(ast_node.property, symtab);
//            break;
        case "BreakStatement": //{type, label}
        case "EmptyStatement": //{type}
        case "Literal" : //{type, value, raw}
//            break;
//            debug("PIC8-ignore", JSON.stringify({type: ast_node.type, uid: ast_node.uid}).blue_lt);
            break; //true; //quietly ignore ast node, but continue processing
        default: //for debug
            /*throw*/ error(`PIC8-DSL node evt: unhandled node type '${`${ast_node.type}`.cyan_lt}', parent type '${(parent || {}).type}', node ${JSON.stringify(objclone(ast_node, 2), null, 2)}`.red_lt);
            return;
    }
    debug(`PIC8: ignore type ${ast_node.type}, node ${ast_node.uid}, parent ${ast_node.parent_uid}`.blue_lt);
//    if (opts.debug)
//    {
//no        const node = AstNode(ast_node);
//        Object.keys(node).forEach((key) =>
//        {
//            if (typeof node[key] == "object") //node[key] = "[object]";
//                for (var k in node[key])
//no; don't change node data                    if (typeof node[key][k] == "object") node[key][k] = `[${k.toUpperCase()}]`;
//                    else if()
//        }); //reduce clutter
//        function show_object_placeholder(key, value) //this[key] === value
//        {
//            return (typeof value != "object")? value:
//                (key == "id")? `[${value.name || "ID"}]`:
//                key? `[${key.toUpperCase()}]`:
//                value;
//        }
//        debug(`PIC8 node: parent ${(parent || {}).type || `ary-${(parent || []).length}`}`.blue_lt, JSON.stringify(objclone(ast_node, 1)).blue_lt);
//    }
//    return ast_node;
//    return true; //continue processing
}


////////////////////////////////////////////////////////////////////////////////
////
/// Command line interface:
//

//add default opts but let caller override:
const my_opts =
{
    pic8: true,
//    traverse: process_ast,
};

const pic8_CLI =
module.exports.CLI =
function pic8_CLI(opts)
{
//    debug("opts", JSON.stringify(opts));
//    const state = {};
//    opts = opts || {};
//    if (opts.codegen) opts.codegen = {};
    return CLI(Object.assign({}, my_opts, opts || {})) //caller opts override my defaults
//        .on("dsl-opts", (opts) => { console.log(JSON5.stringify(opts).green_lt); my_CLI.save_opts = opts; })
        .on("ast-node", (node_data, parent, root) => process_node(node_data, parent, root, CLI.opts)) //my_CLI.save_opts); });
//        .on("ast-node", (node_data_wrapper) => { node_data_wrapper.wanted = process_node(node_data_wrapper.ast_node, state, CLI.opts); }); //my_CLI.save_opts); });
//        {
//            if (!opts.codegen) return;
//            (data.children || []).forEach((key) => { key = key.replace("[]", ""); if (data[key]) data[key] = key.toUpperCase(); });
//            console.log(JSON5.stringify(data).cyan_lt);
//        });
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
            debug(`${CLI.opts.opcodes.length} opcodes:\n${CLI.opts.opcodes.join("\n")}`.cyan_lt);
//            console.error(`${warn.count || 0} warnings`.yellow_lt);
//            console.error(`${error.count} errors`.red_lt);
        }
//console.error(typeof retval);
//    return retval
}

if (!module.parent) pic8_CLI().pipe(process.stdout); //auto-run CLI, generated output to console

//eof