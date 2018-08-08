#!/usr/bin/env node
//Javascript-based 8-bit PIC DSL

"use strict";
const {CLI} = require("./dsl.js");

const my_opts =
{
    pic8: true,
};

const my_CLI =
module.exports.CLI =
function my_CLI(opts)
{
    return CLI(Object.assign({}, opts || {}, my_opts))
        .on("astnode", data => { console.log(`ast node ${JSON.stringify(data)}`.cyan_lt); });
}


if (!module.parent) my_CLI(); //auto-run CLI

//eof