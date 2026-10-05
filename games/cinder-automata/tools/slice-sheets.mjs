// Slices Gemini sprite sheets (flat magenta background) into individual transparent PNGs.
// Usage: node tools/slice-sheets.mjs [sheetId ...]
//   Reads art/raw/<sheet file>.(png|jpg|jpeg|webp) for every sheet in tools/sheet-plan.mjs that exists,
//   writes public/sprites/<name>.png, public/sprites/manifest.json and art/contact/<sheet>.png (a visual check).
import sharp from 'sharp';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { SHEETS } from './sheet-plan.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const rawDir = join(root, 'art', 'raw');
const outDir = join(root, 'public', 'sprites');
const contactDir = join(root, 'art', 'contact');
mkdirSync(outDir, { recursive: true });
mkdirSync(contactDir, { recursive: true });

const KEY_HI = 170; // magenta-ness at/above this is fully background
const KEY_LO = 90; // at/below this is fully opaque
const DILATE = 8; // px used only to merge parts of one object (cables, arms) when labelling
const MIN_AREA = 1200; // ignore specks smaller than this

const MAX_SIDE = 512; // px, longest side of a shipped sprite
const MAX_TILE = 384; // px, side of a shipped ground/ore tile
const TILE_INSET = 5; // px trimmed from every tile edge to remove magenta-blended pixels
const MIN_SIDE = 90; // px, an object's smaller dimension; anything thinner is text or a stray line (sheet.minSide overrides)
const STRIP_PINK = new Set(['lamp-on', 'refinery']);
const FADE_TOP = new Set(['base-core-damaged']);
const ROUND_MASK = new Set(['base-core']);
const PINK_HALO = new Set(['fx-bolt-zig', 'fx-bolt-thin', 'fx-bolt-zig-b', 'fx-bolt-fork', 'fx-burst', 'fx-orb', 'fx-ring', 'fx-sparks-blue', 'fx-swirl', 'nest-antenna', 'base-core', 'proj-grenade', 'proj-artillery', 'proj-shell']);
const FLATTEN_SHADING = new Set(['ground-1']); // base ground texture: keep the grain, drop the edge vignette
const STRIP_BLUE = new Set(['drill-big', 'pumpjack']); // blue glow halo that blended with the magenta background
const only = process.argv.slice(2);
const findRaw = (base) => ['png', 'jpg', 'jpeg', 'webp'].map((e) => `${base}.${e}`).find((f) => existsSync(join(rawDir, f)));

async function loadSheet(file, soft = false) {
  const { data, info } = await sharp(join(rawDir, file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const alpha = new Float32Array(w * h);
  if (soft) {
    // For neutral, soft-edged objects (smoke): treat each pixel as  P = a*S + (1-a)*B  with B the backdrop colour.
    // Magenta-ness m = min(r,b) - g is (1-a)*Bm for a grey S, so a = 1 - m/Bm, and the true colour is S = (P - (1-a)B)/a.
    const B = [data[5 * 4 + 5 * w * 4], data[5 * 4 + 5 * w * 4 + 1], data[5 * 4 + 5 * w * 4 + 2]];
    const Bm = Math.min(B[0], B[2]) - B[1];
    for (let i = 0; i < w * h; i++) {
      const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
      const a = Math.max(0, Math.min(1, 1 - (Math.min(r, b) - g) / Bm));
      alpha[i] = a < 0.03 ? 0 : a;
      if (a >= 0.03) {
        data[i * 4] = Math.max(0, Math.min(255, Math.round((r - (1 - a) * B[0]) / a)));
        data[i * 4 + 1] = Math.max(0, Math.min(255, Math.round((g - (1 - a) * B[1]) / a)));
        data[i * 4 + 2] = Math.max(0, Math.min(255, Math.round((b - (1 - a) * B[2]) / a)));
      }
      data[i * 4 + 3] = Math.round(alpha[i] * 255);
    }
    return { data, alpha, w, h };
  }
  for (let i = 0; i < w * h; i++) {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    const m = Math.min(r, b) - g;
    const a = Math.max(0, Math.min(1, (KEY_HI - m) / (KEY_HI - KEY_LO)));
    alpha[i] = a;
    // despill: pull the magenta tint out of edge pixels. Only where green is near zero (a real fringe pixel is
    // black or transparent blended with magenta); legit purples and pinks keep their green and are left alone.
    const edge = a > 0 && a < 1; // partly-keyed pixels are always background blends, whatever their green
    if (m > 20 && a > 0 && (g < 36 || edge)) {
      data[i * 4] = Math.min(r, g + 10);
      data[i * 4 + 2] = Math.min(b, g + 10);
    } else if (g > 90 && m > 15 && Math.abs(r - b) < 30) {
      // bright glow that picked up the magenta background: warm it instead of leaving it pink
      data[i * 4 + 2] = Math.min(b, Math.round(g * 0.8));
    }
    data[i * 4 + 3] = Math.round(a * 255);
  }
  return { data, alpha, w, h };
}

function dilate(mask, w, h, r) {
  const tmp = new Uint8Array(w * h), out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    let last = -1e9;
    const row = y * w;
    for (let x = 0; x < w; x++) if (mask[row + x]) last = x, tmp[row + x] = 1; else tmp[row + x] = x - last <= r ? 1 : 0;
    last = 1e9;
    for (let x = w - 1; x >= 0; x--) { if (mask[row + x]) last = x; if (last - x <= r) tmp[row + x] = 1; }
  }
  for (let x = 0; x < w; x++) {
    let last = -1e9;
    for (let y = 0; y < h; y++) if (tmp[y * w + x]) last = y, out[y * w + x] = 1; else out[y * w + x] = y - last <= r ? 1 : 0;
    last = 1e9;
    for (let y = h - 1; y >= 0; y--) { if (tmp[y * w + x]) last = y; if (last - y <= r) out[y * w + x] = 1; }
  }
  return out;
}

function components(mask, w, h) {
  const label = new Int32Array(w * h);
  const comps = [];
  const stack = [];
  for (let s = 0; s < w * h; s++) {
    if (!mask[s] || label[s]) continue;
    const id = comps.length + 1;
    const c = { id, x0: w, y0: h, x1: 0, y1: 0, area: 0 };
    label[s] = id; stack.push(s);
    while (stack.length) {
      const p = stack.pop();
      const x = p % w, y = (p / w) | 0;
      c.area++;
      if (x < c.x0) c.x0 = x; if (x > c.x1) c.x1 = x; if (y < c.y0) c.y0 = y; if (y > c.y1) c.y1 = y;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const q = ny * w + nx;
        if (mask[q] && !label[q]) { label[q] = id; stack.push(q); }
      }
    }
    comps.push(c);
  }
  return { label, comps };
}

function readingOrder(comps) {
  const items = comps.map((c) => ({ c, cx: (c.x0 + c.x1) / 2, cy: (c.y0 + c.y1) / 2, h: c.y1 - c.y0 }));
  const medH = items.map((i) => i.h).sort((a, b) => a - b)[items.length >> 1];
  items.sort((a, b) => a.cy - b.cy);
  const rows = [];
  for (const it of items) {
    const row = rows[rows.length - 1];
    if (row && it.cy - row.cy < medH * 0.5) { row.items.push(it); row.cy = row.items.reduce((s, i) => s + i.cy, 0) / row.items.length; }
    else rows.push({ cy: it.cy, items: [it] });
  }
  return rows.flatMap((r) => r.items.sort((a, b) => a.cx - b.cx).map((i) => i.c));
}

async function contactSheet(sprites, outFile) {
  const CELL = 220, COLS = 6;
  const layers = [];
  for (let i = 0; i < sprites.length; i++) {
    const c = sprites[i];
    const img = await sharp(c.buf, { raw: { width: c.bw, height: c.bh, channels: 4 } })
      .resize(CELL - 20, CELL - 40, { fit: 'inside' }).png().toBuffer();
    layers.push({ input: img, left: (i % COLS) * CELL + 10, top: Math.floor(i / COLS) * CELL + 10 });
    layers.push({
      input: Buffer.from(`<svg width="${CELL}" height="24"><text x="10" y="16" font-size="13" font-family="sans-serif" fill="#ccc">${c.name}</text></svg>`),
      left: (i % COLS) * CELL, top: Math.floor(i / COLS) * CELL + CELL - 26,
    });
  }
  await sharp({ create: { width: Math.min(COLS, sprites.length) * CELL, height: Math.ceil(sprites.length / COLS) * CELL, channels: 4, background: '#2a2521' } })
    .composite(layers).png().toFile(outFile);
}

/**
 * Ore-field tiles come with the ground baked in as a dark square, which makes a field look like a checkerboard.
 * Flood-fill inward from the tile edge over everything close to the background colour and make it transparent,
 * leaving just the ore clusters to sit on the real ground.
 */
function cutoutBackground(buf, w, h) {
  const TOL = 34;
  const ring = [];
  for (let i = 0; i < w; i++) for (const y of [0, 1, 2, h - 3, h - 2, h - 1]) ring.push((y * w + i) * 4);
  for (let j = 0; j < h; j++) for (const x of [0, 1, 2, w - 3, w - 2, w - 1]) ring.push((j * w + x) * 4);
  const med = (c) => ring.map((o) => buf[o + c]).sort((a, b) => a - b)[ring.length >> 1];
  const bg = [med(0), med(1), med(2)];
  const near = (p) => Math.hypot(buf[p * 4] - bg[0], buf[p * 4 + 1] - bg[1], buf[p * 4 + 2] - bg[2]);
  const seen = new Uint8Array(w * h);
  const stack = [];
  const push = (p) => { if (!seen[p] && near(p) < TOL) { seen[p] = 1; stack.push(p); } };
  for (let i = 0; i < w; i++) { push(i); push((h - 1) * w + i); }
  for (let j = 0; j < h; j++) { push(j * w); push(j * w + w - 1); }
  while (stack.length) {
    const p = stack.pop();
    const x = p % w, y = (p / w) | 0;
    if (x > 0) push(p - 1);
    if (x < w - 1) push(p + 1);
    if (y > 0) push(p - w);
    if (y < h - 1) push(p + w);
  }
  for (let p = 0; p < w * h; p++) if (seen[p]) buf[p * 4 + 3] = 0;
  // soften the cut edge by one pixel so clusters don't look sawn out
  const copy = Buffer.from(buf);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const p = y * w + x;
    if (copy[p * 4 + 3] === 0) continue;
    const gone = [p - 1, p + 1, p - w, p + w].filter((q) => copy[q * 4 + 3] === 0).length;
    if (gone) buf[p * 4 + 3] = Math.round(255 * (1 - 0.3 * gone));
  }
}

const manifest = {};
let total = 0;
for (const sheet of SHEETS) {
  if (only.length && !only.includes(sheet.id)) continue;
  const file = findRaw(sheet.file);
  if (!file) { if (sheet.done && !sheet.derived) console.warn(`! ${sheet.file}: image missing from art/raw`); continue; }
  const names = sheet.actual ?? sheet.items.map((i) => i[0]);
  const { data, alpha, w, h } = await loadSheet(file, !!sheet.softKey);
  const solid = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) solid[i] = alpha[i] > 0.5 ? 1 : 0;
  let label, kept;
  if (sheet.boxes) {
    // hand-specified crop boxes (in reading order), for sheets whose glowing objects overlap too much to auto-detect
    label = new Int32Array(w * h);
    kept = sheet.boxes.map(([bx0, by0, bx1, by1], i) => {
      for (let y = by0; y <= Math.min(h - 1, by1); y++) for (let x = bx0; x <= Math.min(w - 1, bx1); x++) if (alpha[y * w + x] > 0.15) label[y * w + x] = i + 1;
      return { id: i + 1, x0: bx0, y0: by0, x1: Math.min(w - 1, bx1), y1: Math.min(h - 1, by1), area: 1 };
    });
  } else {
    const found = components(dilate(solid, w, h, sheet.dilate ?? DILATE), w, h);
    label = found.label;
    // drop specks and caption text (thin in at least one direction) that Gemini sometimes adds despite instructions
    kept = readingOrder(found.comps.filter((c) => c.area >= MIN_AREA && Math.min(c.x1 - c.x0, c.y1 - c.y0) >= (sheet.minSide ?? MIN_SIDE)));
  }
  // tighten each box to the real (undilated) pixels of that object
  const boxes = kept.map((c, idx) => {
    let x0 = w, y0 = h, x1 = 0, y1 = 0;
    const clip = sheet.clip?.[names[idx]]; // optional [x0, y0, x1, y1] limit for objects fused to a neighbour
    for (let y = c.y0; y <= c.y1; y++) for (let x = c.x0; x <= c.x1; x++) {
      if (clip && (x < clip[0] || x > clip[2] || y < clip[1] || y > clip[3])) continue;
      const p = y * w + x;
      if (label[p] === c.id && alpha[p] > 0.15) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    if (sheet.kind === 'tile') { x0 += TILE_INSET; y0 += TILE_INSET; x1 -= TILE_INSET; y1 -= TILE_INSET; } // lose the blended edge pixels
    return { id: c.id, x0, y0, x1, y1, clip };
  });
  const flag = boxes.length === names.length ? 'ok' : `MISMATCH: found ${boxes.length}, plan has ${names.length}`;
  console.log(`sheet ${sheet.id} ${sheet.title}: ${flag}`);
  const sprites = [];
  for (let i = 0; i < boxes.length; i++) {
    const b = boxes[i];
    const name = i < names.length ? names[i] : `${sheet.slug}-extra-${i + 1}`;
    if (name === null) continue; // marked as junk in the plan
    const bw = b.x1 - b.x0 + 1, bh = b.y1 - b.y0 + 1;
    const buf = Buffer.alloc(bw * bh * 4);
    for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
      const sp = (b.y0 + y) * w + b.x0 + x;
      const dp = (y * bw + x) * 4;
      const sx = b.x0 + x, sy = b.y0 + y;
      const inClip = !b.clip || (sx >= b.clip[0] && sx <= b.clip[2] && sy >= b.clip[1] && sy <= b.clip[3]);
      const inObj = label[sp] === b.id && inClip; // drop pixels belonging to a neighbouring object
      buf[dp] = data[sp * 4]; buf[dp + 1] = data[sp * 4 + 1]; buf[dp + 2] = data[sp * 4 + 2];
      buf[dp + 3] = inObj ? data[sp * 4 + 3] : 0;
    }
    if (STRIP_PINK.has(name) || name.startsWith('ui-')) { // glowing sprites whose halo took on the magenta background: drop the pink pixels
      for (let p = 0; p < bw * bh; p++) {
        const r = buf[p * 4], g = buf[p * 4 + 1], bl = buf[p * 4 + 2];
        if (bl - g > 30 && r > 150) buf[p * 4 + 3] = 0;
      }
    }
    if (FADE_TOP.has(name)) { // smoke plumes that ran off the top of the canvas: fade the cut edge out instead of a hard line
      const fadeRows = Math.round(bh * 0.24);
      for (let y = 0; y < fadeRows; y++) for (let x = 0; x < bw; x++) buf[(y * bw + x) * 4 + 3] = Math.round(buf[(y * bw + x) * 4 + 3] * (y / fadeRows) ** 1.5);
    }
    if (name === 'fx-smoke-dust') { // beige smoke: the grey-assuming unmix leaves a red-brown rim, so blend the see-through edge toward the puff's own beige
      const beige = [182, 156, 138];
      for (let p = 0; p < bw * bh; p++) {
        const a = buf[p * 4 + 3];
        if (a === 0 || a > 250) continue;
        const t = 0.9 * (1 - a / 255) + 0.5; // the more see-through, the more it takes on the puff colour
        const lum = ((buf[p * 4] + buf[p * 4 + 1] + buf[p * 4 + 2]) / 3) / 150;
        for (let c = 0; c < 3; c++) buf[p * 4 + c] = Math.round(buf[p * 4 + c] * (1 - Math.min(1, t)) + beige[c] * Math.min(1.15, 0.85 + lum * 0.2) * Math.min(1, t));
      }
    }
    if (ROUND_MASK.has(name)) { // keep only a rounded rectangle: the glow outside the machine's corners is backdrop bleed
      const rad = Math.min(bw, bh) * 0.13;
      for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
        const cx = Math.max(rad - x, 0, x - (bw - 1 - rad)), cy = Math.max(rad - y, 0, y - (bh - 1 - rad));
        if (cx * cx + cy * cy > rad * rad) buf[(y * bw + x) * 4 + 3] = 0;
      }
    }
    if (PINK_HALO.has(name)) { // glowing objects whose halo took on the magenta backdrop: drop the pink glow entirely
      for (let p = 0; p < bw * bh; p++) {
        const r = buf[p * 4], g = buf[p * 4 + 1], bl = buf[p * 4 + 2];
        if (bl > g + 8 && r > g + 30 && Math.abs(r - bl) < 140) buf[p * 4 + 3] = 0; // blue above green while red is high = pink, never metal or fire
      }
    }
    if (!sheet.softKey && (name.startsWith('fx-') || name.startsWith('proj-') || name === 'base-core-damaged' || name === 'spawner-wreck' || name === 'charcoal-kiln' || name === 'base-core-destroyed' || name.startsWith('enemy-') || name.startsWith('nest-') || name.startsWith('worm-') || name === 'spawner-pod')) { // glowing effects blend with the magenta backdrop: pull the blue/pink out of edge pixels
      for (let p = 0; p < bw * bh; p++) {
        const r = buf[p * 4], g = buf[p * 4 + 1], bl = buf[p * 4 + 2];
        if (bl > g + 10 && r > g + 10 && Math.abs(r - bl) < 90) { // pinkish: red and blue both above green
          buf[p * 4 + 2] = Math.round(g + (bl - g) * 0.12);
          buf[p * 4] = Math.round(Math.min(r, g + (r - g) * 0.85));
        } else if (bl > g + 14 && bl > r) { // purple/blue halo on smoke and glow edges: drop it toward neutral grey
          buf[p * 4 + 2] = Math.round(g + (bl - g) * 0.2);
        }
      }
    }
    if (STRIP_BLUE.has(name)) { // keep the bright cyan LEDs (high green), drop the duller blue-violet haze
      for (let p = 0; p < bw * bh; p++) {
        const r = buf[p * 4], g = buf[p * 4 + 1], bl = buf[p * 4 + 2];
        // the haze is either a strongly blue/violet pixel, or a half-keyed blend on the outside edge of the glow
        if ((bl > 190 && g < 205 && r < 200 && bl - g > 45) || buf[p * 4 + 3] < 215) buf[p * 4 + 3] = 0;
      }
    }
    const isOreTile = sheet.kind === 'tile' && name.startsWith('ore-tile-');
    if (isOreTile) cutoutBackground(buf, bw, bh);
    if (FLATTEN_SHADING.has(name)) { // high-pass: remove the soft vignette so copies of the tile join without a visible grid
      const blurred = await sharp(buf, { raw: { width: bw, height: bh, channels: 4 } }).blur(Math.max(bw, bh) / 8).raw().toBuffer();
      const mean = [0, 0, 0];
      for (let p = 0; p < bw * bh; p++) for (let c = 0; c < 3; c++) mean[c] += blurred[p * 4 + c] / (bw * bh);
      for (let p = 0; p < bw * bh; p++) for (let c = 0; c < 3; c++) {
        buf[p * 4 + c] = Math.max(0, Math.min(255, Math.round(buf[p * 4 + c] - blurred[p * 4 + c] + mean[c])));
      }
    }
    // ship a compact copy: cap the longest side. Sprites: 8-bit palette PNG with alpha. Tiles are opaque
    // painterly gradients that would band in a palette, so they ship as high-quality JPEG.
    const isTile = sheet.kind === 'tile' && !isOreTile; // cut-out ore tiles keep their transparency, so they stay PNG
    const scale = Math.min(1, (isTile ? MAX_TILE : MAX_SIDE) / Math.max(bw, bh));
    const ow = Math.max(1, Math.round(bw * scale)), oh = Math.max(1, Math.round(bh * scale));
    let img = sharp(buf, { raw: { width: bw, height: bh, channels: 4 } });
    if (scale < 1) img = img.resize(ow, oh, { kernel: 'lanczos3' });
    const ext = isTile ? 'jpg' : 'png';
    await (isTile ? img.flatten({ background: '#000000' }).jpeg({ quality: 88 }) : img.png({ palette: true, quality: 92, effort: 8 }))
      .toFile(join(outDir, `${name}.${ext}`));
    manifest[name] = { file: `sprites/${name}.${ext}`, w: ow, h: oh, sheet: file };
    sprites.push({ name, buf, bw, bh });
  }
  for (const [newName, srcName] of Object.entries(sheet.mirror ?? {})) { // e.g. west = east flipped
    const src = sprites.find((s) => s.name === srcName);
    if (!src) continue;
    const flipped = await sharp(src.buf, { raw: { width: src.bw, height: src.bh, channels: 4 } }).flop().raw().toBuffer();
    const scale = Math.min(1, MAX_SIDE / Math.max(src.bw, src.bh));
    const ow = Math.max(1, Math.round(src.bw * scale)), oh = Math.max(1, Math.round(src.bh * scale));
    let img = sharp(flipped, { raw: { width: src.bw, height: src.bh, channels: 4 } });
    if (scale < 1) img = img.resize(ow, oh, { kernel: 'lanczos3' });
    await img.png({ palette: true, quality: 92, effort: 8 }).toFile(join(outDir, `${newName}.png`));
    manifest[newName] = { file: `sprites/${newName}.png`, w: ow, h: oh, sheet: file, mirrorOf: srcName };
    sprites.push({ name: newName, buf: flipped, bw: src.bw, bh: src.bh });
  }
  await contactSheet(sprites, join(contactDir, `${sheet.file}.png`));
  total += sprites.length;
}
// Sprites made from other sprites instead of generated: the express (blue) underground belt is the fast (red) one
// with its arrows recoloured, so it matches the rest of the belt set exactly.
async function recolourRedToBlue(fromName, toName) {
  const src = manifest[fromName];
  if (!src) return;
  const { data, info } = await sharp(join(outDir, `${fromName}.png`)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const arrow = new Uint8Array(w * h);
  for (let p = 0; p < w * h; p++) {
    const r = data[p * 4], g = data[p * 4 + 1], b = data[p * 4 + 2];
    if (data[p * 4 + 3] > 40 && r > 150 && r - g > 80 && r - b > 80) { // the glowing red arrows, not the rust-brown metal
      arrow[p] = 1;
      data[p * 4] = Math.round(r * 0.25);
      data[p * 4 + 1] = Math.round(60 + r * 0.5);
      data[p * 4 + 2] = Math.round(120 + r * 0.55);
    }
  }
  // the arrows' dark outline is a red-tinted dark: recolour reddish pixels within a few px of an arrow to navy
  const R = Math.max(3, Math.round(w / 90));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const p = y * w + x;
    if (arrow[p] || data[p * 4 + 3] === 0) continue;
    const r = data[p * 4], g = data[p * 4 + 1], b = data[p * 4 + 2];
    if (!(r - g > 12 && r - b > 12)) continue; // only warm pixels (this leaves the grey/brown-neutral metal alone)
    let near = false;
    for (let dy = -R; dy <= R && !near; dy++) for (let dx = -R; dx <= R; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < w && ny < h && arrow[ny * w + nx]) { near = true; break; }
    }
    if (near) {
      data[p * 4] = Math.round(r * 0.2);
      data[p * 4 + 1] = Math.round(g * 0.6 + 20);
      data[p * 4 + 2] = Math.round(b * 0.8 + 45);
    }
  }
  // soft cyan glow around the arrows, only on pixels that already belong to the sprite
  const glow = await sharp(Buffer.from(arrow.map((v) => v * 255)), { raw: { width: w, height: h, channels: 1 } })
    .blur(Math.max(2, w / 60)).raw().toBuffer();
  for (let p = 0; p < w * h; p++) {
    if (data[p * 4 + 3] === 0) continue;
    const t = Math.min(1, (glow[p] / 255) * 1.4) * 0.5;
    data[p * 4] = Math.round(data[p * 4] + (70 - data[p * 4]) * t);
    data[p * 4 + 1] = Math.round(data[p * 4 + 1] + (185 - data[p * 4 + 1]) * t);
    data[p * 4 + 2] = Math.round(data[p * 4 + 2] + (255 - data[p * 4 + 2]) * t);
  }
  await sharp(data, { raw: { width: w, height: h, channels: 4 } }).png({ palette: true, quality: 92, effort: 8 }).toFile(join(outDir, `${toName}.png`));
  manifest[toName] = { file: `sprites/${toName}.png`, w, h, sheet: `derived from ${fromName}` };
  console.log(`derived ${toName} from ${fromName}`);
}
if (!only.length) await recolourRedToBlue('underground-fast', 'underground-express');

if (!only.length) writeFileSync(join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`\n${total} sprites sliced -> public/sprites, previews in art/contact/`);

// re-made sprites in art/overrides/ win over the sliced ones
await (await import('./apply-overrides.mjs')).applyOverrides();
await (await import('./make-terrain-tiles.mjs')).makeTerrainTiles(); // tar tiles and edges cropped to lay edge to edge
