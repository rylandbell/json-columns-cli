#!/usr/bin/env node
"use strict";
const fs = require('fs'),
  open = require('open'),
  trumpet = require('trumpet'),
  program = require('commander'),
  jsStringEscape = require('js-string-escape'),
  columnsPageStream = require('json-columns-template'),
  currentVersion = require('./package.json').version;

//use the Commander package to parse user-supplied parameters and auto-generate a --help document
let inputPath;
program
  .version(currentVersion)
  .arguments('<path to JSON file>')
  .action(function (path) {
    inputPath = path;
  })
  .parse(process.argv);

fs.readFile(inputPath, processData);

//will receive readable stream from fs.readFile
function processData(err, data) {
  if (err) {
    console.error(err);
  } else {
    const fileContents = checkForValidJson(data.toString());
    createPageWithData(fileContents, true);
  }

  //abort the process and display an error msg if the provided user data isn't valid JSON
  function checkForValidJson(string) {
    try {
      JSON.parse(string);
      const escapedString = jsStringEscape(string);
      return escapedString;
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
}

function createPageWithData(userData, openPage) {
  const assetPath = '../node_modules/json-columns-template/build';
  const tempFile = 'temp/temp.html';
  const tr = trumpet();
  
  //add code defining a variable to a blank script in source HTML file.
  tr.select('#preload-data')
    .createWriteStream()
    .end(`var preloadedUserData = '${userData}'`);

  tr.select('#bundle')
    .setAttribute('src', assetPath + '/js/bundle.js')

  tr.select('#my-css')
    .setAttribute('href', assetPath + '/css/style.css')
    // .end();

  const writeTempFile = fs.createWriteStream(tempFile);

  columnsPageStream  
    .pipe(tr)
    .pipe(writeTempFile)
    .on('finish', () => openPage ? open(tempFile,'google chrome') : console.log('all done!'))
}
