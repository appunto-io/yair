#!/usr/bin/env node

const ANDROID_RESOLUTIONS = [
  {path : 'mipmap-xxxhdpi', size : 192},
  {path : 'mipmap-xxhdpi',  size : 144},
  {path : 'mipmap-xhdpi',   size : 96},
  {path : 'mipmap-hdpi',    size : 72},
  {path : 'mipmap-mdpi',    size : 48},
  {path : 'mipmap-ldpi',    size : 36}
];

const IOS_RESOLUTIONS = {

};

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



const processImage = async (image, name) => {
  fs.mkdirSync(`${output}/iOS/${name}.appiconset`);
  fs.mkdirSync(`${output}/Android/${name}`);

  for (let index = 0; index < ANDROID_RESOLUTIONS.length; index++) {
    const resolution = ANDROID_RESOLUTIONS[index];

    const clonedImage = image.clone();

    await clonedImage
      .resize(resolution.size, resolution.size)
      .writeAsync(`${output}/Android/${name}/res/${resolution.path}/ic_launcher.png`);
  }
};


/*
Execute resizer program
 */
(async () => {
  fs.mkdirSync(`${output}/iOS`);
  fs.mkdirSync(`${output}/Android`);

  const images = await Promise.all([
    jimp.read(source),
    ...masks.map(
      mask => jimp.read(mask)
    )
  ]);

  const [sourceImage, ...masksImages] = images;

  /*
  First export a resized copy of image without masks
   */
  processImage(sourceImage, 'default');



})()



// const source = jimp(source)
