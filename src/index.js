#!/usr/bin/env node
const acorn = require('acorn');
const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');
const escodegen = require('escodegen');
const inquirer = require('inquirer');
const args = require('minimist')(process.argv.slice(2));

const bundleLocation = args._[0] || args.input || args.i;
const outputLocation = args.output || args.o;

const config = JSON.parse(fs.readFileSync(args.config || args.c));

function convertToIntegerKey(obj) {
  return Object.keys(obj).reduce((acc, i) => {
    acc[parseInt(i)] = obj[i];
    return acc;
  }, {});
}

config.knownPaths = convertToIntegerKey(config.knownPaths);


if (!(bundleLocation || outputLocation)) {
  console.log(`${process.argv[1]} [bundle location] [-o output folder] [-c config]`);
  console.log();
  console.log(`  -o Output folder to put the decompiled code.`);
  console.log(`  -c Path to configuration`);
  process.exit(1);
}

const bundleContents = fs.readFileSync(bundleLocation);

let ast = acorn.parse(bundleContents, {});

// TODO
// KNOWN BUGS
// - If a package has a nonstandard location for it's root file (ie, not in index.js), and that
// location is in a folder, then we aren't smart enough to put that in the right location.
// ie, blueprint has it's root in `src/index.js` and it requires `./common` from that file, which
// when the root file is put in `index.js` it can't resolve.

// let iifeModules = ast.body[0].expression.argument.arguments[0].arguments[0];

// Browserify bundles start with an IIFE. Fetch the IIFE and get it's arguments (what we care about,
// and where all the module code is located)
// let iifeModules = ast.body[0].expression.arguments[0];


// Webpack bundle
let iifeModules = ast.body[0].expression.arguments[0];






// const webpackDecoder = require('./decoders/webpack');
// let modules = webpackDecoder(iifeModules);

// const browserifyDecoder = require('./decoders/browserify');
// let modules = browserifyDecoder(iifeModules);

const webpackDecoder = require('./decoders/webpack');
let modules = webpackDecoder(iifeModules, config.knownPaths);

const lookupTableResolver = require('./resolvers/lookupTable');
const files = lookupTableResolver(modules, config.knownPaths, outputLocation);



function writeFile(filePath, contents) {
  console.log(`* Writing file ${filePath}`);
  return fs.writeFileSync(filePath, contents);
}

function writeToDisk(files) {
  return files.forEach(({filePath, code}) => {
    let directory = path.dirname(filePath);
    try {
      code = escodegen.generate(code);
    } catch(e) {
      // FIXME: why does the code generator hickup here?
      console.log(`* Couldn't parse ast to file for ${filePath}.`);
      return
    }

    if (fs.existsSync(directory)) {
      return writeFile(`${filePath}.js`, code);
    } else {
      console.log(`* ${directory} doesn't exist, creating...`);
      mkdirp(directory, (err, resp) => {
        if (err) {
          throw err;
        } else {
          return writeFile(`${filePath}.js`, code);
        }
      });
    }
  });
}

writeToDisk(files);