// Cuts the game logos out of their magenta backgrounds: node tools/make-logos.mjs
//   art/raw/logo-shield.(jpg|png)  ->  public/logo/logo-shield.png   (badge with the shield and the automaton head)
//   art/raw/logo.(jpg|png)         ->  public/logo/logo-text.png     (the lettering on its own)
import sharp from 'sharp';
import { existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const out = join(root, 'public', 'logo');
mkdirSync(out, { recursive: true });
const find = (base) => ['png', 'jpg', 'jpeg', 'webp'].map((e) => join(root, 'art', 'raw', `${base}.${e}`)).find(existsSync);

const KEY_HI = 150; // magenta-ness at or above this is fully background
const KEY_LO = 60; // at or below this is fully opaque

async function cut(srcBase, name, maxWidth) {
  const file = find(srcBase);
  if (!file) { console.log(`skipped ${name}: no art/raw/${srcBase}.(png|jpg)`); return; }
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  for (let i = 0; i < w * h; i++) {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    const m = Math.min(r, b) - g; // how magenta the pixel is
    const a = Math.max(0, Math.min(1, (KEY_HI - m) / (KEY_HI - KEY_LO)));
    if (a < 1 && a > 0) { // an edge blended with the backdrop: pull the pink out of the colour
      data[i * 4] = Math.min(r, g + 14);
      data[i * 4 + 2] = Math.min(b, g + 14);
    } else if (a >= 1 && m > 25) { // a solid pixel that still leans pink (the purple drop shadow on the logo's underside)
      const k = Math.min(1, (m - 25) / 60);
      data[i * 4] = Math.round(r - (r - Math.min(r, g + 14)) * k);
      data[i * 4 + 2] = Math.round(b - (b - Math.min(b, g + 14)) * k);
    }
    data[i * 4 + 3] = Math.round(a * 255);
  }
  // trim to the artwork, leave a little breathing room, and scale to a sensible size for a web page
  let img = sharp(data, { raw: { width: w, height: h, channels: 4 } }).png();
  const trimmed = await sharp(await img.toBuffer()).trim({ threshold: 8 }).png().toBuffer();
  const meta = await sharp(trimmed).metadata();
  const scale = Math.min(1, maxWidth / meta.width);
  await sharp(trimmed)
    .resize(Math.round(meta.width * scale), Math.round(meta.height * scale), { kernel: 'lanczos3' })
    .extend({ top: 6, bottom: 6, left: 6, right: 6, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(join(out, `${name}.png`));
  const m2 = await sharp(join(out, `${name}.png`)).metadata();
  console.log(`${name}.png  ${m2.width}x${m2.height}`);
}

await cut('logo-shield', 'logo-shield', 1000);
await cut('logo', 'logo-text', 1400);

// a preview of both on the game's dark background, to check the edges
const bg = { create: { width: 1500, height: 1000, channels: 4, background: '#1a1512' } };
const layers = [];
for (const [n, top] of [['logo-shield', 20], ['logo-text', 520]]) {
  const f = join(out, `${n}.png`);
  if (existsSync(f)) layers.push({ input: await sharp(f).resize({ width: 1100, height: 470, fit: 'inside' }).toBuffer(), left: 200, top });
}
if (layers.length) await sharp(bg).composite(layers).png().toFile(join(root, 'art', 'logo-preview.png'));
