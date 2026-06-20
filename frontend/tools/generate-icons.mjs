/**
 * @file generate-icons.mjs
 * @description Rasterises the brand SVG sources in assets/brand/ into the PNG
 * assets Expo consumes (app icon, Android adaptive foreground, splash mark).
 * Run from the frontend package: `node tools/generate-icons.mjs`
 * Requires `sharp` (install once with `npm i -D sharp`).
 */

import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * @constant root
 * @description Absolute path to the frontend package root.
 */
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * @constant jobs
 * @description SVG source → PNG output mapping consumed by app.config.ts.
 */
const jobs = [
    { src: 'assets/brand/icon.svg', out: 'assets/icon.png', size: 1024 }, /*!< iOS/Android store icon (opaque tile) */
    { src: 'assets/brand/adaptive-foreground.svg', out: 'assets/adaptive-icon.png', size: 1024 }, /*!< Android adaptive foreground (transparent) */
    { src: 'assets/brand/mark.svg', out: 'assets/splash-icon.png', size: 1024 } /*!< Splash logo (transparent, placed on backgroundColor) */
];

/**
 * @function run
 * @description Renders every job at high density then downscales to the target size.
 * @returns {Promise<void>}
 */
async function run() {
    for (const job of jobs) {
        await sharp(path.join(root, job.src), { density: 384 })
            .resize(job.size, job.size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .png()
            .toFile(path.join(root, job.out));

        console.log(`wrote ${job.out}`);
    }
}

run().catch((error) => {
    console.error(error);
    process.exit(1);
});
