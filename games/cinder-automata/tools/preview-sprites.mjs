// Puts the named sprites side by side on the game's ground colour: node tools/preview-sprites.mjs a b c  ->  art/preview.png
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

const root = fileURLToPath(new URL('..', import.meta.url));
const names = process.argv.slice(2);
if (!names.length) { console.error('usage: node tools/preview-sprites.mjs <sprite name> ...'); process.exit(1); }
const CELL = 260;
const layers = [];
for (let i = 0; i < names.length; i++) {
  const file = ['png', 'jpg'].map((e) => join(root, 'public', 'sprites', `${names[i]}.${e}`)).find((f) => existsSync(f));
  if (!file) { console.error(`no sprite named ${names[i]}`); continue; }
  const img = await sharp(file).resize(CELL - 30, CELL - 50, { fit: 'inside' }).png().toBuffer();
  layers.push({ input: img, left: i * CELL + 15, top: 15 });
  layers.push({ input: Buffer.from(`<svg width="${CELL}" height="24"><text x="15" y="16" font-size="13" font-family="sans-serif" fill="#ccc">${names[i]}</text></svg>`), left: i * CELL, top: CELL - 30 });
}
await sharp({ create: { width: names.length * CELL, height: CELL, channels: 4, background: '#2a2521' } }).composite(layers).png().toFile(join(root, 'art', 'preview.png'));
console.log('wrote art/preview.png');
