#!/usr/bin/env node
"use strict";

const fs = require('fs'),
  open = require('open'),
  trumpet = require('trumpet'),
  program = require('commander'),
  temp = require('temp'),
  jsStringEscape = require('js-string-escape'),
  columnsPageStream = require('json-columns-template');

//Detect if the script is receiving data from process.stdin or is being passed a file path as an argument (or neither):
let data = '';
let pipeFound = false;

process.stdin.on('readable', function() {
  var chunk = this.read();
  if (chunk !== null) {
    pipeFound = true;
    data += chunk;
  } else if (pipeFound) {
    //do nothing, wait for end event
  } else {
    withoutPipe();
    this.end();
  }
});

process.stdin.on('end', function() {
  if (data.length > 0) {
    withPipe(data);
  } else {
    console.log('Input stream ended, but no data was found.');
  }
});

//handle the piped data
function withPipe(data) {
  processData(null, data.trim());
}

//use the Commander package to parse user-supplied parameters and auto-generate a --help document
function withoutPipe() {
  let inputPath;
  const currentVersion = require('./package.json').version;

  program
    .version(currentVersion)
    .arguments('<path to JSON file>')
    .action(function (path) {
      inputPath = path;
    })
    .parse(process.argv);
  
  if (inputPath && inputPath.length > 0) {
    fs.readFile(inputPath, processData);
  } else {
    console.error('\nNo path found. Try: \n\njson-columns <path to JSON file>\n')
  }
}

//will receive readable stream from fs.readFile
function processData(err, data) {
  if (err) {
    console.error(err);
  } else {
    const fileContents = data.toString();
    const escapedString = jsStringEscape(fileContents);
    
    checkForValidJson(fileContents);
    createPageWithData(escapedString, true);
  }
}

//abort the process and display an error msg if the provided user data isn't valid JSON
function checkForValidJson(string) {
  try {
    JSON.parse(string);
    return true;
  } catch (err) {
    if (err instanceof SyntaxError) {
      console.log('Error: not a valid JSON string. ', err.message);
    } else {
      console.log('Unexpected error.');
      console.error(err);
    }
    process.exit();
  }
}

function createPageWithData(userData, openPage) {
  const assetPath = __dirname + '/node_modules/json-columns-template/build';
  const tempFile = temp.path({suffix: '.html'});
  const tr = trumpet();
  
  //add code defining a variable to a blank script in source HTML file.
  tr.select('#preload-data')
    .createWriteStream()
    .end(`var preloadedUserData = '${userData}'`);

  //direct generated page to local versions of assets
  tr.select('#bundle')
    .setAttribute('src', assetPath + '/js/bundle.min.js')
  tr.select('#my-css')
    .setAttribute('href', assetPath + '/css/style.css')

  const writeTempFile = fs.createWriteStream(tempFile);

  columnsPageStream  
    .pipe(tr)
    .pipe(writeTempFile)
    .on('finish', () => openPage ? open(tempFile) : console.log('all done!'))
}
