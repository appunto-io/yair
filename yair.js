#!/usr/bin/env node

const ANDROID_RESOLUTIONS = [
  {path : 'mipmap-xxxhdpi', size : 192},
  {path : 'mipmap-xxhdpi',  size : 144},
  {path : 'mipmap-xhdpi',   size : 96},
  {path : 'mipmap-hdpi',    size : 72},
  {path : 'mipmap-mdpi',    size : 48},
  {path : 'mipmap-ldpi',    size : 36}
];

const IOS_RESOLUTIONS = [
  {size : 20,   filename : "icon-20@2x.png",   scale : 2},
  {size : 20,   filename : "icon-20@3x.png",   scale : 3},
  {size : 29,   filename : "icon-29@2x.png",   scale : 2},
  {size : 29,   filename : "icon-29@3x.png",   scale : 3},
  {size : 40,   filename : "icon-40@2x.png",   scale : 2},
  {size : 40,   filename : "icon-40@3x.png",   scale : 3},
  {size : 60,   filename : "icon-60@2x.png",   scale : 2},
  {size : 60,   filename : "icon-60@3x.png",   scale : 3},
  {size : 20,   filename : "icon-20.png",      scale : 1},
  {size : 20,   filename : "icon-20@2x.png",   scale : 2},
  {size : 29,   filename : "icon-29.png",      scale : 1},
  {size : 29,   filename : "icon-29@2x.png",   scale : 2},
  {size : 40,   filename : "icon-40.png",      scale : 1},
  {size : 40,   filename : "icon-40@2x.png",   scale : 2},
  {size : 76,   filename : "icon-76.png",      scale : 1},
  {size : 76,   filename : "icon-76@2x.png",   scale : 2},
  {size : 83.5, filename : "icon-83.5@2x.png", scale : 2},
  {size : 1024, filename : "icon.png",         scale : 1}
];

// yair <source-image> [<output-directory>] --masks <mask-directory>
const jimp        = require('jimp');
const fs          = require('fs');
const path        = require('path');
const CliProgress = require('cli-progress');
const camelCase   = require('lodash.camelcase');
const upperFirst  = require('lodash.upperfirst');

const yargs = require('yargs')
  .locale('en')
  .help()
  .demandCommand()
  .option('m', {
    description : 'Directory containing mask images',
    alias       : 'masks-directory',
    default     : '',
    type        : 'string'
  })
  .option('e', {
    description : 'Array of image extensions to be used for icon masks',
    alias       : 'masks-extensions',
    default     : ['png'],
    type        : 'array'
  })
  .options('default-variants', {
    description : 'Use defaults masks to create icon variants',
    default     : false,
    type        : 'boolean'
  })
  .options('react-native', {
    description : 'Output directory is a ReactNative project',
    default     : false,
    type        : 'boolean'
  })
  .argv;


/*
Parsed arguments
 */
const [source, output = '.'] = yargs._ || [];
const defaultVariants = yargs['default-variants'];
const masksDirectory  = defaultVariants ? `${__dirname}/masks` : yargs.m;
const extensions      = yargs.e;
const overwrite       = yargs.overwrite;
const isReactNative   = yargs['react-native'];

/*
Hanle ios and android paths
 */
const getAndroidPath = name =>
  isReactNative ?
    `${output}/android/app/src/${name.toLowerCase()}/res/` :
    `${output}/android/${name.toLowerCase()}/`;

const getIosPath = name =>
  isReactNative ?
    `${output}/ios/${getIosProjectName(output)}/Images.xcassets/${upperFirst(camelCase(name))}.appiconset/` :
    `${output}/ios/${upperFirst(camelCase(name))}.appiconsets/`;

const getIosProjectName = (() => {
  let projectName = '';

  return projectPath => {
    if (projectName) {
      return projectName;
    }

    try {
      projectName = (
        fs.readdirSync(`${output}/ios/`)
        .filter(file => file.endsWith('xcodeproj'))[0] || ''
      ).split('.')[0];
    }
    catch(error) {
      console.error("Unable to read ios directory.\nBe sure that distination dir is a ReactNative project or remove the --react-native flag.");
      process.exit(1);
    }

    return projectName;
  }
})();

/*
Scanning masks directory
 */
let masks = [];
if (masksDirectory) {
  try {
    masks = fs.readdirSync(masksDirectory)
      .map(file => `${masksDirectory}/${file}`)
      .filter(file => fs.statSync(file).isFile())
      .filter(file => extensions.some(extension => file.endsWith(extension)))
      .map(file => ({
        name : path.basename(file, path.extname(file)),
        file
      }))
  }
  catch(error) {
    console.error("Unable to scan masks directory. Error ", error);
    process.exit(1);
  }
}

/*
Test if output directory is writable
 */
if (!fs.existsSync(output) || !fs.statSync(output).isDirectory() ) {
  console.error("Output parameter is not a directory");
  process.exit(1);
}

/*
Initialize progress bar
 */
const progressBar = new CliProgress.Bar({});
progressBar.start((ANDROID_RESOLUTIONS.length + IOS_RESOLUTIONS.length)*(masks.length + 1));



const processAndroidIcons = async (image, name) => {
  // fs.mkdirSync(getAndroidPath(name), {recursive : true});

  for (let index = 0; index < ANDROID_RESOLUTIONS.length; index++) {
    const resolution = ANDROID_RESOLUTIONS[index];

    const clonedImage = image.clone();

    await clonedImage
      .resize(resolution.size, resolution.size)
      .writeAsync(`${getAndroidPath(name)}/${resolution.path}/ic_launcher.png`);

    progressBar.increment();
  }
};

const processIosIcons = async (image, name) => {
  // fs.mkdirSync(getIosPath(name), {recursive : true});

  for (let index = 0; index < IOS_RESOLUTIONS.length; index++) {
    const resolution = IOS_RESOLUTIONS[index];

    const clonedImage = image.clone();

    await clonedImage
      .resize(resolution.size*resolution.scale, resolution.size*resolution.scale)
      .writeAsync(`${getIosPath(name)}/${resolution.filename}`);

    progressBar.increment();
  }

  fs.copyFileSync(`${__dirname}/Contents.json`, `${getIosPath(name)}/Contents.json`);
};

const processImage = async (image, name) => {
  const androidName = name.android || name;
  const iosName     = name.ios     || name;

  await processAndroidIcons(image, androidName);
  await processIosIcons(image, iosName);
};


/*
Execute resizer program
 */
(async () => {
  // fs.mkdirSync(`${output}/iOS`);
  // fs.mkdirSync(`${output}/Android`);

  const images = await Promise.all([
    jimp.read(source),
    ...masks.map(
      ({file}) => jimp.read(file)
    )
  ]);

  const [sourceImage, ...masksImages] = images;

  const { width, height } = sourceImage.bitmap;

  if (width !== height) {
    console.error(`Source image should be square. Provided image dimensions are ${width}x${height}px.`);
    process.exit(1);
  }

  /*
  First export a resized copy of image without masks
   */
  await processImage(sourceImage, {ios : 'AppIcon', android : 'main'});

  for (let maskIndex in masksImages) {
    const maskImage = masksImages[maskIndex];
    const maskName  = masks[maskIndex].name

    const imageWithMask = sourceImage
      .clone()
      .blit(
        maskImage.resize(width, width),
        0, 0
      );

    await processImage(imageWithMask, maskName);
  }

  progressBar.stop();
})()
