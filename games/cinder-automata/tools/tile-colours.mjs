// Average colour of each ore-field tile (ignoring transparent pixels): node tools/tile-colours.mjs
import sharp from 'sharp';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const dir = join(fileURLToPath(new URL('..', import.meta.url)), 'public', 'sprites');
for (const f of readdirSync(dir).filter((n) => /^ore-tile-.*\.png$/.test(n)).sort()) {
  const { data, info } = await sharp(join(dir, f)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < info.width * info.height; i++) if (data[i * 4 + 3] > 200) { r += data[i * 4]; g += data[i * 4 + 1]; b += data[i * 4 + 2]; n++; }
  const cover = (100 * n / (info.width * info.height)).toFixed(0);
  console.log(f.padEnd(24), `rgb(${Math.round(r / n)}, ${Math.round(g / n)}, ${Math.round(b / n)})`, `covers ${cover}% of the tile`);
}
