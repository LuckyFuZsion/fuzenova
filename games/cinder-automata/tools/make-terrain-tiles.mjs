// Turns the tar-pit art into tiles the game can lay edge to edge: crops the thick outline and rounded corners off each
// square, so neighbouring tiles join without a visible grid. Run after the slicer (slice-sheets.mjs calls it).
// Usage: node tools/make-terrain-tiles.mjs
import sharp from 'sharp';
import { existsSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const out = join(root, 'public', 'sprites');
const OUT_PX = 128;

export async function makeTerrainTiles() {
  // --- tar surface: the eight squares on sheet 54 (2 rows of 4). The two blue-grey ones are the wrong colour, so they are left out. ---
  const raw = join(root, 'art', 'raw', 'sheet-54-obstacle-tar-fill.jpg');
  if (existsSync(raw)) {
    const meta = await sharp(raw).metadata();
    const W = meta.width, H = meta.height;
    const xs = [0.0325, 0.2715, 0.5105, 0.75], ys = [0.0595, 0.52], cw = 0.2175, ch = 0.4175; // fractions of the sheet, measured from the picture
    const keep = { a: [0, 0], b: [1, 0], c: [0, 1], d: [1, 1], e: [2, 1], f: [3, 1] }; // [column, row]
    for (const [name, [col, row]] of Object.entries(keep)) {
      const inset = 0.09; // drop the outline, the rounded corner and the bevel
      const left = Math.round((xs[col] + cw * inset) * W), top = Math.round((ys[row] + ch * inset) * H);
      const width = Math.round(cw * (1 - 2 * inset) * W), height = Math.round(ch * (1 - 2 * inset) * H);
      await sharp(raw).extract({ left, top, width, height }).resize(OUT_PX, OUT_PX).png().toFile(join(out, `tar-fill-${name}.png`));
    }
  }
  // --- tar edges: the crust pieces, cropped inside their outline ---
  for (const [src, dst] of [['tar-rim-straight', 'tar-edge-straight'], ['tar-rim-corner-out', 'tar-edge-corner'], ['fx-tar-bubble', 'tar-edge-u'], ['fx-tar-burst', 'tar-fill-g']]) {
    const f = join(out, `${src}.png`);
    if (!existsSync(f)) continue;
    const m = await sharp(f).metadata();
    const k = 0.035;
    const left = Math.round(m.width * k), top = Math.round(m.height * k);
    await sharp(f).extract({ left, top, width: m.width - 2 * left, height: m.height - 2 * top }).resize(OUT_PX, OUT_PX).png().toFile(join(out, `${dst}.png`));
  }
  // the slicer mistook the white-backed tar sheet for one object; its output is not wanted
  console.log('terrain tiles made');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await makeTerrainTiles();
