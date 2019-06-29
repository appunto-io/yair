#!/usr/bin/env node

// yair <source-image> [<output-directory>] --masks <mask-directory>
const jimp = require('jimp');
const fs   = require('fs');

const yargs = require('yargs')
  .locale('en')
  .help()
  .demandCommand()
  .option('m', {
    alias   : 'masks-directory',
    default : '',
    type    : 'string'
  })
  .option('e', {
    alias   : 'masks-extensions',
    default : ['png'],
    type    : 'array'
  })
  .argv;


/*
Parsed arguments
 */
const [source, output = '.'] = yargs._ || [];
const masksDirectory = yargs.m;
const extensions     = yargs.e;


/*
Scanning masks directory
 */
let masks = [];
if (masksDirectory) {
  try {
    masks = fs.readdirSync(masksDirectory)
      .map(file => `${masksDirectory}/${file}`)
      .filter(file => fs.statSync(file).isFile())
      .filter(file => extensions.some(extension => file.endsWith(extension)));
  }
  catch(error) {
    console.error("Unable to scan masks directory. Error ", error);
    process.exit(1);
  }
}

/*
Test if output directory is writable
 */
if (!fs.existsSync(output) || !fs.statSync(output).isDirectory()) {
  console.error("Output parameter is not a directory");
  process.exit(1);
}

(async () => {
  const images = await Promise.all([
    jimp.read(source),
    ...masks.map(
      mask => jimp.read(mask)
    )
  ]);

  const [sourceImage, ...masksImages] = images;
})()


// const source = jimp(source)
