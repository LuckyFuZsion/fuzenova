// Collects single-purpose style references for Gemini into art/refs, so you never have to hunt for the right image.
// node tools/make-refs.mjs
import sharp from 'sharp';
import { copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const out = join(root, 'art', 'refs');
mkdirSync(out, { recursive: true });

// whole sheets, copied under a clear name
const sheets = {
  'ref-large-enemies.jpg': 'sheet-26-enemies-large.jpg',
  'ref-combat-effects.webp': 'sheet-30-fx-combat.webp',
  'ref-turrets.jpg': 'sheet-23-turrets.jpg',
  'ref-crafters.jpg': 'sheet-17-crafters.jpg',
  'ref-robots.jpg': 'sheet-44-robots-player.jpg',
  'ref-small-enemies.jpg': 'sheet-25-enemies-small.jpg',
  'ref-raw-and-plates.jpg': 'sheet-04-raw-and-plates.jpg',
  'ref-ore-fields.jpg': 'sheet-34-ore-fields.jpg',
};
for (const [name, src] of Object.entries(sheets)) {
  const from = join(root, 'art', 'raw', src);
  if (existsSync(from)) copyFileSync(from, join(out, name));
}

// single sprites placed centred on a magenta canvas, so Gemini sees one object in the right backdrop
const singles = { 'ref-base-core.png': 'base-core', 'ref-robot-fabricator.png': 'robot-fab-2' };
for (const [name, sprite] of Object.entries(singles)) {
  const file = join(root, 'public', 'sprites', `${sprite}.png`);
  if (!existsSync(file)) continue;
  const img = await sharp(file).resize(640, 640, { fit: 'inside' }).toBuffer();
  await sharp({ create: { width: 1024, height: 1024, channels: 3, background: '#ff00ff' } })
    .composite([{ input: img, gravity: 'centre' }]).png().toFile(join(out, name));
}
console.log('references written to art/refs');
