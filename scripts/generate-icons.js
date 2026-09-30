import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Resvg } from '@resvg/resvg-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const svgPath = join(root, 'public', 'icons', 'icon.svg');
const outDir = join(root, 'public', 'icons');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

const svgContent = readFileSync(svgPath, 'utf-8');

for (const size of sizes) {
  const resvg = new Resvg(svgContent, {
    fitTo: { mode: 'width', value: size },
  });
  const png = resvg.render().asPng();
  const outFile = join(outDir, `icon-${size}x${size}.png`);
  writeFileSync(outFile, png);
  console.log(`Generated ${outFile}`);
}

console.log('Done — all PWA icons regenerated.');
