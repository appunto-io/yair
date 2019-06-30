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
  {
    size : 20,
    filename : "icon-20@2x.png",
    scale : 2
  },
  {
    size : 20,
    filename : "icon-20@3x.png",
    scale : 3
  },
  {
    size : 29,
    filename : "icon-29@2x.png",
    scale : 2
  },
  {
    size : 29,
    filename : "icon-29@3x.png",
    scale : 3
  },
  {
    size : 40,
    filename : "icon-40@2x.png",
    scale : 2
  },
  {
    size : 40,
    filename : "icon-40@3x.png",
    scale : 3
  },
  {
    size : 60,
    filename : "icon-60@2x.png",
    scale : 2
  },
  {
    size : 60,
    filename : "icon-60@3x.png",
    scale : 3
  },
  {
    size : 20,
    filename : "icon-20.png",
    scale : 1
  },
  {
    size : 20,
    filename : "icon-20@2x.png",
    scale : 2
  },
  {
    size : 29,
    filename : "icon-29.png",
    scale : 1
  },
  {
    size : 29,
    filename : "icon-29@2x.png",
    scale : 2
  },
  {
    size : 40,
    filename : "icon-40.png",
    scale : 1
  },
  {
    size : 40,
    filename : "icon-40@2x.png",
    scale : 2
  },
  {
    size : 76,
    filename : "icon-76.png",
    scale : 1
  },
  {
    size : 76,
    filename : "icon-76@2x.png",
    scale : 2
  },
  {
    size : 83.5,
    filename : "icon-83.5@2x.png",
    scale : 2
  },
  {
    size : 1024,
    filename : "icon.png",
    scale : 1
  }
];

// yair <source-image> [<output-directory>] --masks <mask-directory>
const jimp = require('jimp');
const fs   = require('fs');

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
  .options('overwrite', {
    description : 'Replace existing files',
    default     : false,
    type        : 'boolean'
  })
  .argv;


/*
Parsed arguments
 */
const [source, output = '.'] = yargs._ || [];
const masksDirectory = yargs.m;
const extensions     = yargs.e;
const overwrite      = yargs.overwrite;


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
if (!fs.existsSync(output) || !fs.statSync(output).isDirectory() ) {
  console.error("Output parameter is not a directory");
  process.exit(1);
}

/*
Test if output directory is empty
 */
// if (!overwrite && !fs.readdirSync(output).length) {
//   console.error("Output diretory is not empty");
//   process.exit(1);
// }



const processAndroidIcons = async (image, name) => {
  fs.mkdirSync(`${output}/Android/${name}`);

  for (let index = 0; index < ANDROID_RESOLUTIONS.length; index++) {
    const resolution = ANDROID_RESOLUTIONS[index];

    const clonedImage = image.clone();

    await clonedImage
      .resize(resolution.size, resolution.size)
      .writeAsync(`${output}/Android/${name}/res/${resolution.path}/ic_launcher.png`);
  }
};

const processIosIcons = async (image, name) => {
  fs.mkdirSync(`${output}/iOS/${name}.appiconset`);

  for (let index = 0; index < IOS_RESOLUTIONS.length; index++) {
    const resolution = IOS_RESOLUTIONS[index];

    const clonedImage = image.clone();

    await clonedImage
      .resize(resolution.size*resolution.scale, resolution.size*resolution.scale)
      .writeAsync(`${output}/iOS/${name}.appiconset/${resolution.filename}`);
  }

  fs.copyFileSync(`${__dirname}/Contents.json`, `${output}/iOS/${name}.appiconset/Contents.json`);
};

const processImage = async (image, name) => {
  await processAndroidIcons(image, name);
  await processIosIcons(image, name);
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

  const { width, height } = sourceImage.bitmap;

  if (width !== height) {
    console.error(`Source image should be square. Provided image dimensions are ${width}x${height}px.`);
    process.exit(1);
  }

  /*
  First export a resized copy of image without masks
   */
  processImage(sourceImage, 'default');

  for (let maskIndex in masksImages) {
    const maskImage   = masksImages[maskIndex];

    const imageWithMask = sourceImage
      .clone()
      .blit(
        maskImage.resize(width, width),
        0, 0
      );

    processImage(imageWithMask, 'composite'+maskIndex);
  }



})()



// const source = jimp(source)
