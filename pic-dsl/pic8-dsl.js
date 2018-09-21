#!/usr/bin/env node
//Javascript-based 8-bit PIC DSL

"use strict";
require("colors").enabled = true; //for console output; https://github.com/Marak/colors.js/issues/127
const JSON5 = require("json5");
const {debug, warn, error, AstNode, CLI} = require("./dsl.js");
//console.error("CLI", typeof CLI, CLI);


////////////////////////////////////////////////////////////////////////////////
////
/// Custom AST processing:
//

//TODO: move some of this logic into dsl #include file?
function process_node(ast_node, state, opts)
{
//    opts = process_node.opts; //kludge; get from caller
    if (opts.no_codegen) return;
//    if (!ast_node) return;
    switch (ast_node.type)
    {
        case "VariableDeclarator": //{type, id, init{}, kind-inherited}
//            traverse(ast_node.init, symtab);
            break;
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
            return; //quietly ignore these ones
        default: //for debug
            throw `PIC8-DSL node evt: unhandled node type '${ast_node.type}', node ${JSON5.stringify(ast_node, null, "  ")}`.red_lt;
    }
    if (opts.debug)
    {
        const node = AstNode(ast_node);
        Object.keys(node).forEach((key) =>
        {
            if (typeof node[key] == "object") //node[key] = "[object]";
                for (var k in node[key])
                    if (typeof node[key][k] == "object") node[key][k] = `[${k.toUpperCase()}]`;
//                    else if()
        }); //reduce clutter
        console.error(JSON5.stringify(node).blue_lt);
    }
//    return ast_node;
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

const my_CLI =
module.exports.CLI =
function my_CLI(opts)
{
    const state = {};
//    opts = opts || {};
    return CLI(Object.assign({}, my_opts, opts || {})) //caller opts override my defaults
//        .on("dsl-opts", (opts) => { console.log(JSON5.stringify(opts).green_lt); my_CLI.save_opts = opts; })
        .on("ast-node", (node_data) => { process_node(node_data, state, CLI.opts); }); //my_CLI.save_opts); });
//        {
//            if (!opts.codegen) return;
//            (data.children || []).forEach((key) => { key = key.replace("[]", ""); if (data[key]) data[key] = key.toUpperCase(); });
//            console.log(JSON5.stringify(data).cyan_lt);
//        });
//console.error(typeof retval);
//    return retval
}

if (!module.parent) my_CLI(); //auto-run CLI

//eof