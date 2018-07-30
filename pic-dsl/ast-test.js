#!/usr/bin/env node

"use strict";
const toAST = require("to-ast"); //https://github.com/devongovett/to-ast
//const {spawn, exec} = require('child_process'); //https://stackoverflow.com/questions/20643470/execute-a-command-line-binary-with-node-js
const {PP, CodeGen} = require("./pic-dsl.js");
const my_code = require("./hello-dsl.js");

/*
//exec('cat *.js bad_file | wc -l', (err, stdout, stderr) => {
//  if (err) {
//    // node couldn't execute the command
//    return;
//  }
//  // the *entire* stdout and stderr (buffered)
//  console.log(`stdout: ${stdout}`);
//  console.log(`stderr: ${stderr}`);
//});
const child = spawn("cpp", ['-P', '/usr']);
cpp -P -H: https://news.ycombinator.com/item?id=14296225

// use child.stdout.setEncoding('utf8'); if you want text chunks
child.stdout.on('data', (chunk) => {
  // data from standard output is here as buffers
});

// since these are streams, you can pipe them elsewhere
child.stderr.pipe(dest);

child.on('close', (code) => {
  console.log(`child process exited with code ${code}`);
});
*/


const ast = toAST(my_code);

console.log(CodeGen(ast));

//eof
