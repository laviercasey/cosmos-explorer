#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const svgPath = resolve(root, 'public/og-image.svg');
const pngPath = resolve(root, 'public/og-image.png');

if (!existsSync(svgPath)) {
  console.error(`[og] source not found: ${svgPath}`);
  process.exit(1);
}

let sharp;
try {
  ({ default: sharp } = await import('sharp'));
} catch {
  console.error('[og] `sharp` is not installed. Run:');
  console.error('     npm i -D sharp');
  console.error('     node scripts/generate-og-png.mjs');
  process.exit(1);
}

const svg = readFileSync(svgPath);
const png = await sharp(svg, { density: 192 })
  .resize(1200, 630, { fit: 'contain', background: '#00000a' })
  .png({ compressionLevel: 9 })
  .toBuffer();

writeFileSync(pngPath, png);
console.log(`[og] wrote ${pngPath} (${String(png.length)} bytes)`);
