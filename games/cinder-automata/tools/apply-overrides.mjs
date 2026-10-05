// Hand-made or re-made sprites: any transparent PNG in art/overrides/ replaces the sliced sprite of the same name.
// The slicer runs this last, so a re-slice never brings the old art back.
// Usage: node tools/apply-overrides.mjs
import sharp from 'sharp';
import { readdirSync, existsSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const dir = join(root, 'art', 'overrides');
const MAX_SIDE = 512;

export async function applyOverrides() {
  if (!existsSync(dir)) return;
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.png'))) {
    const out = join(root, 'public', 'sprites', f);
    const trimmed = await sharp(join(dir, f)).ensureAlpha().trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 8 }).toBuffer();
    const buf = await sharp(trimmed).resize({ width: MAX_SIDE, height: MAX_SIDE, fit: 'inside', withoutEnlargement: true }).png({ palette: true, quality: 95 }).toBuffer();
    writeFileSync(out, buf);
    const m = await sharp(buf).metadata();
    console.log(`override ${f} -> ${m.width}x${m.height}`);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await applyOverrides();
