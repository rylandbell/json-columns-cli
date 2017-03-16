#!/usr/bin/env node
"use strict";

const fs = require('fs'),
  // through = require('through2'),
  temp = require('temp'),
  open = require('open'),
  trumpet = require('trumpet'),
  program = require('commander'),
  jsStringEscape = require('js-string-escape'),
  columnsPageStream = require('json-columns-template');

const assetPath = process.argv[1] + '/node_modules/json-columns-template/build/';
const tempFile = temp.openSync({suffix: '.html'});

fs.readFile(process.argv[2], processData);

//will receive readable stream from fs.readFile
function processData(err, data) {
  if (err) {
    console.log('error found: ', err);
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
  const tr = trumpet();
  
  //add code defining a variable to a blank script in source HTML file.
  tr.select('#preload-data')
    .createWriteStream()
    .end(`var preloadedUserData = '${userData}'`);

  tr.select('#bundle')
    .setAttribute('src', assetPath + '/js/bundle.js')
    // .end();

  const writeTempFile = fs.createWriteStream(tempFile.path);

  columnsPageStream  
    .pipe(tr)
    .pipe(writeTempFile)
    .on('finish', () => openPage ? open(tempFile.path,'google chrome') : console.log('all done!'))
}
