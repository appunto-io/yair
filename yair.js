#!/usr/bin/env node

// yair <source-image> [<output-directory>] --masks <mask-directory>

const yargs = require('yargs')
  .locale('en')
  .help()
  .demandCommand()
  .option('m', {
    alias   : 'masks-directory',
    default : '',
    type    : 'string'
  })
  .argv;


/*
Parsed arguments
 */
const [source, output = '.'] = yargs._ || [];
const masksDirectory = yargs.m;
