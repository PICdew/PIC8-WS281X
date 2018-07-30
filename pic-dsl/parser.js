#!/usr/bin/env node
//based on example code from http://zaa.ch/jison/docs/#installation

"use strict";

const fs = require("fs");
const {Parser} = require("jison");
const thru2 = require("through2"); //https://www.npmjs.com/package/through2
const {LineStream} = require('byline');


// mygenerator.js
//var Parser = jison.Parser;

if (false) //inline_grammar_example
var grammar = {
    "lex": {
        "rules": [
           ["\\s+", "/* skip whitespace */"],
           ["[a-f0-9]+", "return 'HEX';"]
        ]
    },

    "bnf": {
        "hex_strings" :[ "hex_strings HEX",
                         "HEX" ]
    }
};
else //grammar in external file
var grammar = fs.readFileSync("calculator.bnf", "utf8");

var parser = new Parser(grammar);

// generate source, ready to be written to disk
//var parserSource = parser.generate();

// you can also use the parser directly from memory

//parser.parse("adfe34bc e82a");
// returns true

//parser.parse("adfe34bc zxg");
// throws lexical error

var [instm, outstm] = [process.stdin, process.stdout];
//if (instm.isTTY) instm = fs.createReadStream("build/ssr-ws281x.asm");
//fs.createReadStream(process.argv[2] || "(no file)")
instm
    .pipe(new LineStream()) //{keepEmptyLines: false}))
    .pipe(calculator())
    .pipe(outstm);


function calculator()
{
    return thru2(xform, flush); //{ objectMode: true, allowHalfOpen: false },

    function xform(chunk, enc, cb)
    {
        if (typeof chunk != "string") chunk = chunk.toString(); //TODO: enc?
        if (chunk.length)
        {
//            this.push(chunk);
            parser.parse(chunk);
        }
        cb(); //null, chunk);
    }
    function flush(cb) { cb(); }
}


//eof