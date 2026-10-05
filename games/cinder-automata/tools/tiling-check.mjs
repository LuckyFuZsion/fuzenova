// Lays each named tile out 3x3 so visible seams are easy to spot: node tools/tiling-check.mjs ground-1 gravel-1 ...
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

const root = fileURLToPath(new URL('..', import.meta.url));
const names = process.argv.slice(2);
if (!names.length) { console.error('usage: node tools/tiling-check.mjs <sprite name> ...'); process.exit(1); }
const T = 150, N = 3, PAD = 16, COLS = 4;
const layers = [];
for (let k = 0; k < names.length; k++) {
  const file = ['jpg', 'png'].map((e) => join(root, 'public', 'sprites', `${names[k]}.${e}`)).find((f) => existsSync(f));
  const base = await sharp(file).resize(T, T, { fit: 'fill' }).png().toBuffer();
  const ox = (k % COLS) * (T * N + PAD), oy = Math.floor(k / COLS) * (T * N + PAD);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) layers.push({ input: base, left: ox + x * T, top: oy + y * T });
}
await sharp({
  create: { width: Math.min(COLS, names.length) * (T * N + PAD), height: Math.ceil(names.length / COLS) * (T * N + PAD), channels: 3, background: '#ff00ff' },
}).composite(layers).png().toFile(join(root, 'art', 'tiling-check.png'));
console.log('wrote art/tiling-check.png');
