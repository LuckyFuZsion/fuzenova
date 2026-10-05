// Makes the app icons from the Cinder Core sprite: node tools/make-icons.mjs  ->  public/icons/*.png
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const out = join(root, 'public', 'icons');
mkdirSync(out, { recursive: true });
const core = join(root, 'public', 'sprites', 'base-core.png');

/** A dark rounded-square tile with a warm glow and the core in the middle. `pad` is the empty margin (bigger for maskable icons). */
async function icon(size, pad, file, round = true) {
  const inner = Math.round(size * (1 - pad * 2));
  const sprite = await sharp(core).resize(inner, inner, { fit: 'contain' }).png().toBuffer();
  const r = round ? Math.round(size * 0.2) : 0;
  const bg = Buffer.from(`<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <defs><radialGradient id="g" cx="50%" cy="50%" r="60%"><stop offset="0" stop-color="#3a2416"/><stop offset="1" stop-color="#0d0a09"/></radialGradient></defs>
    <rect width="${size}" height="${size}" rx="${r}" fill="url(#g)"/></svg>`);
  await sharp(bg).composite([{ input: sprite, gravity: 'centre' }]).png().toFile(join(out, file));
  console.log(file);
}

await icon(192, 0.14, 'icon-192.png');
await icon(512, 0.14, 'icon-512.png');
await icon(512, 0.24, 'icon-maskable-512.png', false); // full-bleed, with a safe margin so any mask shape keeps the core visible
await icon(180, 0.14, 'apple-touch-icon.png', false);
await icon(64, 0.1, 'favicon.png');
