#!/usr/bin/env node
//Javascript-based 8-bit PIC DSL

"use strict";
const JSON5 = require("json5");
const {CLI} = require("./dsl.js");

//add default opts but let caller override:
const my_opts =
{
    pic8: true,
};

const my_CLI =
module.exports.CLI =
function my_CLI(opts)
{
    opts = opts || {};
    return CLI(Object.assign({}, my_opts, opts))
        .on("astnode", data =>
        {
            if (!opts.codegen) return;
            (data.children || []).forEach((key) => { key = key.replace("[]", ""); if (data[key]) data[key] = key.toUpperCase(); });
            console.log(JSON5.stringify(data).cyan_lt);
        });
}


if (!module.parent) my_CLI(); //auto-run CLI

//eof