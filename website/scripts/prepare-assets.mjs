// Regenerate optimized scenery and logo from the included source assets.
import sharp from 'sharp';
import { copyFile } from 'node:fs/promises';
await sharp('source-assets/coast-master.png')
  .webp({ quality: 86 })
  .toFile('public/images/coast-wide.webp');
await sharp('source-assets/coast-master.png')
  .resize(1200)
  .webp({ quality: 84 })
  .toFile('public/images/coast-medium.webp');
await sharp('source-assets/coast-tablet-master.png')
  .resize(1100)
  .webp({ quality: 85 })
  .toFile('public/images/coast-tablet.webp');
await sharp('source-assets/logo-transparent.png')
  .trim()
  .resize({ width: 120, height: 120, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .webp({ quality: 93 })
  .toFile('public/images/logo.webp');
await sharp('source-assets/logo-transparent.png')
  .trim()
  .resize({ width: 48, height: 48, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toFile('public/favicon.png');
for (const name of [
  'calculator',
  'chart-line',
  'notebook',
  'arrow-up-right',
  'arrow-right',
  'chevron-down',
  'info-circle',
  'x',
  'external-link',
])
  await copyFile(
    `node_modules/@tabler/icons/icons/outline/${name}.svg`,
    `public/icons/${name}.svg`,
  );
