// Loads the sliced Gemini sprites and pre-scales them once so drawing stays cheap.
// Until (or unless) they load, render.ts falls back to its procedural drawings.
import { ITEMS, type ItemId } from './sim/world';
import { hash } from './sim/mapgen';
import { ROBOTS, ROBOT_ORDER } from './sim/robots';
import { BOSS_ORDER, ENEMIES, ENEMY_ORDER } from './sim/enemies';

const PX = 96; // pre-scaled pixels per tile

export interface Prepared { canvas: HTMLCanvasElement; x: number; y: number; w: number; h: number }
type Fit = 'stretch' | 'contain' | 'height' | 'arm';
interface Spec {
  file: string; fit: Fit; foot: [number, number]; inset?: number;
  /** 'arm' only: the joint the sprite swings around (fraction of the image) and how far it reaches, in tiles. */
  pivot?: [number, number]; reach?: number;
}

/** Sprites are keyed by role; x/y/w/h on a Prepared are in tiles, relative to the footprint's top-left. */
const SPECS: Record<string, Spec> = {
  belt: { file: 'belt-straight', fit: 'stretch', foot: [1, 1] },
  // 'belt-curve' is built from the straight belt (see buildCurve): the drawn curve art had a much narrower lane
  miner: { file: 'drill-2x2', fit: 'height', foot: [2, 2] }, // output chute overhangs the footprint on the right
  furnace: { file: 'furnace-stone', fit: 'contain', foot: [2, 2], inset: 1 },
  // the glowing lab dome is a stand-in for the Cinder Core until the real base-core art (sheet 47) exists
  core: { file: 'base-core', fit: 'contain', foot: [3, 3], inset: 1.04 },
  'core-damaged': { file: 'base-core-damaged', fit: 'contain', foot: [3, 3], inset: 1.3 },
  'proj-bullet': { file: 'proj-bullet', fit: 'contain', foot: [1, 1], inset: 1 },
  'proj-acid': { file: 'proj-acid', fit: 'contain', foot: [1, 1], inset: 1 },
  'proj-piercing': { file: 'proj-piercing', fit: 'contain', foot: [1, 1], inset: 1 },
  // the gun turret: a fixed pedestal plus a barrel that rotates around its gear hub to aim
  'turret-base': { file: 'turret-gun-base', fit: 'contain', foot: [2, 2], inset: 1 },
  'turret-barrel': { file: 'turret-gun-barrel', fit: 'arm', foot: [1, 1], pivot: [0.18, 0.51], reach: 1.5 },
  // the Scatter gun and the Sniper: their own pedestals and barrels (the barrel points right, hub on the left)
  'turret-scatter-base': { file: 'turret-scatter-base', fit: 'contain', foot: [2, 2], inset: 1 },
  'turret-scatter-barrel': { file: 'turret-scatter-barrel', fit: 'arm', foot: [1, 1], pivot: [0.222, 0.488], reach: 1.4 },
  'turret-sniper-base': { file: 'turret-sniper-base', fit: 'contain', foot: [2, 2], inset: 1 },
  'turret-artillery-base': { file: 'turret-artillery-base', fit: 'contain', foot: [2, 2], inset: 1 },
  'turret-artillery-barrel': { file: 'turret-artillery-barrel', fit: 'arm', foot: [1, 1], pivot: [0.2, 0.5], reach: 2.2 },
  'turret-flamer-base': { file: 'turret-flame-base', fit: 'contain', foot: [2, 2], inset: 1 },
  'turret-flamer-barrel': { file: 'turret-flame-nozzle', fit: 'arm', foot: [1, 1], pivot: [0.27, 0.5], reach: 1.4 },
  'turret-incendiary-base': { file: 'turret-rocket-base', fit: 'contain', foot: [2, 2], inset: 1 },
  'turret-incendiary-barrel': { file: 'turret-rocket-launcher', fit: 'arm', foot: [1, 1], pivot: [0.22, 0.5], reach: 1.6 },
  'turret-torch-base': { file: 'turret-torch-base', fit: 'contain', foot: [2, 2], inset: 1 },
  'turret-torch-barrel': { file: 'turret-torch-nozzle', fit: 'arm', foot: [1, 1], pivot: [0.12, 0.5], reach: 1.8 },
  'turret-plasma-base': { file: 'turret-laser-base', fit: 'contain', foot: [2, 2], inset: 1 },
  'turret-plasma-barrel': { file: 'turret-laser-lens', fit: 'arm', foot: [1, 1], pivot: [0.17, 0.5], reach: 2.0 },
  'coil-shield-idle': { file: 'coil-shield-idle', fit: 'contain', foot: [2, 2], inset: 1.305 }, // the picture has room round the base for what sticks out (prongs, rails, glow)
  'coil-shield-charged': { file: 'coil-shield-charged', fit: 'contain', foot: [2, 2], inset: 1.305 }, // the picture has room round the base for what sticks out (prongs, rails, glow)
  'coil-stun-idle': { file: 'coil-stun-idle', fit: 'contain', foot: [2, 2], inset: 1.56 }, // the picture has room round the base for what sticks out (prongs, rails, glow)
  'coil-stun-charged': { file: 'coil-stun-charged', fit: 'contain', foot: [2, 2], inset: 1.56 }, // the picture has room round the base for what sticks out (prongs, rails, glow)
  'coil-railgun-idle': { file: 'coil-railgun-idle', fit: 'contain', foot: [2, 2], inset: 2.756 }, // the picture has room round the base for what sticks out (prongs, rails, glow)
  'coil-railgun-charged': { file: 'coil-railgun-charged', fit: 'contain', foot: [2, 2], inset: 2.756 }, // the picture has room round the base for what sticks out (prongs, rails, glow)
  'turret-sniper-barrel': { file: 'turret-sniper-barrel', fit: 'arm', foot: [1, 1], pivot: [0.147, 0.61], reach: 2.4 },
  // crossover (one tile, no arrows: belts may cross either way) and the splitter gate (two lanes wide, one deep, flowing right)
  crossover: { file: 'crossover', fit: 'contain', foot: [1, 1], inset: 1.02 },
  'splitter-gate': { file: 'splitter-gate', fit: 'contain', foot: [1, 2], inset: 1 },
  assembler: { file: 'assembler-1', fit: 'contain', foot: [3, 3], inset: 1 },
  // the assembler looks like a different machine for each kind of recipe
  'asm-gunpowder': { file: 'gunpowder-mill', fit: 'contain', foot: [3, 3], inset: 1 },
  'asm-press': { file: 'ammo-press', fit: 'contain', foot: [3, 3], inset: 1 },
  'asm-alloy': { file: 'alloy-furnace', fit: 'contain', foot: [3, 3], inset: 1 },
  'asm-forge': { file: 'shell-forge', fit: 'contain', foot: [3, 3], inset: 1 },
  'robot-fab': { file: 'robot-fab-1', fit: 'contain', foot: [3, 3], inset: 1 },
  hangar: { file: 'hangar', fit: 'contain', foot: [3, 3], inset: 1 },
  foundry: { file: 'foundry', fit: 'contain', foot: [3, 3], inset: 1 },
  heavyworks: { file: 'heavyworks', fit: 'contain', foot: [3, 3], inset: 1 },
  pole: { file: 'pole-steel', fit: 'contain', foot: [1, 1], inset: 1.05 },
  'tunnel-in': { file: 'tunnel-in', fit: 'contain', foot: [1, 1], inset: 1 },
  'tunnel-out': { file: 'tunnel-out', fit: 'contain', foot: [1, 1], inset: 1 },
  tunnel: { file: 'tunnel-in', fit: 'contain', foot: [1, 1], inset: 1 },
  scrapbin: { file: 'scrap-bin-idle', fit: 'contain', foot: [2, 2], inset: 1.02 },
  'scrapbin-idle': { file: 'scrap-bin-idle', fit: 'contain', foot: [2, 2], inset: 1.02 },
  'scrapbin-active': { file: 'scrap-bin-active', fit: 'contain', foot: [2, 2], inset: 1.02 },
  'gen-lit': { file: 'generator-lit', fit: 'contain', foot: [2, 2], inset: 1.02 },
  'gen-cold': { file: 'generator-cold', fit: 'contain', foot: [2, 2], inset: 1.02 },
  'coil-idle': { file: 'coil-idle', fit: 'contain', foot: [2, 2], inset: 1.02 },
  'coil-charged': { file: 'coil-charged', fit: 'contain', foot: [2, 2], inset: 1.02 },
  'icon-no-power': { file: 'icon-no-power', fit: 'contain', foot: [1, 1], inset: 1 },
  // wall pieces are stretched to the tile; the renderer picks the piece and rotation from a wall's neighbours
  'wall-straight': { file: 'wall-straight', fit: 'stretch', foot: [1, 1] },
  'wall-corner': { file: 'wall-corner', fit: 'stretch', foot: [1, 1] },
  'wall-t': { file: 'wall-t', fit: 'stretch', foot: [1, 1] },
  'wall-cross': { file: 'wall-cross', fit: 'stretch', foot: [1, 1] },
  'wall-end': { file: 'wall-end', fit: 'stretch', foot: [1, 1] }, // a lone wall block
  // cracked (d1, below 66% health) and broken (d2, below 33%) versions of every piece
  'wall-straight-d1': { file: 'wall-straight-d1', fit: 'stretch', foot: [1, 1] }, 'wall-straight-d2': { file: 'wall-straight-d2', fit: 'stretch', foot: [1, 1] },
  'wall-corner-d1': { file: 'wall-corner-d1', fit: 'stretch', foot: [1, 1] }, 'wall-corner-d2': { file: 'wall-corner-d2', fit: 'stretch', foot: [1, 1] },
  'wall-t-d1': { file: 'wall-t-d1', fit: 'stretch', foot: [1, 1] }, 'wall-t-d2': { file: 'wall-t-d2', fit: 'stretch', foot: [1, 1] },
  'wall-cross-d1': { file: 'wall-cross-d1', fit: 'stretch', foot: [1, 1] }, 'wall-cross-d2': { file: 'wall-cross-d2', fit: 'stretch', foot: [1, 1] },
  'wall-end-d1': { file: 'wall-end-d1', fit: 'stretch', foot: [1, 1] }, 'wall-end-d2': { file: 'wall-end-d2', fit: 'stretch', foot: [1, 1] },
  'inserter-base': { file: 'inserter-base', fit: 'contain', foot: [1, 1], inset: 0.92 },
  // arms are positioned relative to their pivot, so draw them with the pivot at the tile centre
  'inserter-arm': { file: 'inserter-arm', fit: 'arm', foot: [1, 1], pivot: [0.096, 0.45], reach: 0.95 },
  'inserter-arm-open': { file: 'inserter-arm-open', fit: 'arm', foot: [1, 1], pivot: [0.124, 0.516], reach: 0.95 },
};

// one sprite per robot type, fitted into a square of the robot's drawn size (they face the camera and are mirrored to face left/right)
for (const type of ROBOT_ORDER) {
  SPECS[`robot-${type}`] = { file: `robot-${type}`, fit: 'contain', foot: [ROBOTS[type].scale, ROBOTS[type].scale], inset: 1 };
  // the top-down versions that rotate to face where the robot is heading (the front-on ones above stay as a fallback)
  SPECS[`robot-top-${type}`] = { file: `robot-top-${type}`, fit: 'contain', foot: [ROBOTS[type].scale * 1.15, ROBOTS[type].scale * 1.15], inset: 1 };
}

for (const name of ['fx-muzzle-flash', 'fx-explosion-small', 'fx-explosion-large', 'fx-spark', 'fx-smoke-2', 'fx-smoke-1', 'fx-smoke-dust', 'fx-smoke-wisp', 'fx-burst', 'fx-ring', 'fx-sparks-blue', 'fx-orb']) SPECS[name] = { file: name, fit: 'contain', foot: [1, 1], inset: 1 };
for (const kind of [...ENEMY_ORDER, ...BOSS_ORDER]) SPECS[`enemy-${kind}`] = { file: `enemy-${kind}`, fit: 'contain', foot: [ENEMIES[kind].scale, ENEMIES[kind].scale], inset: 1 };

const prepared = new Map<string, Prepared>();

/** Item id -> sliced sprite file. Items without art fall back to a coloured square. */
const ITEM_FILE: Partial<Record<ItemId, string>> = {
  'iron-ore': 'ore-iron',
  'copper-ore': 'ore-copper',
  'iron-plate': 'plate-iron',
  'copper-plate': 'plate-copper',
  coal: 'coal',
  'tin-ore': 'ore-tin',
  'lead-ore': 'ore-lead',
  sulfur: 'sulfur',
  wood: 'wood',
  'tin-plate': 'plate-tin',
  'lead-plate': 'plate-lead',
  charcoal: 'charcoal',
  gunpowder: 'gunpowder',
  'bullet-casing': 'casing-bullet',
  bullet: 'ammo-basic',
  'bronze-plate': 'plate-bronze',
  'steel-plate': 'plate-steel',
  'shell-casing': 'casing-shell',
  'artillery-shell': 'ammo-shell',
  'science-projectile': 'sci-projectile',
  'science-em': 'sci-em',
  'science-robotics': 'sci-robotics',
  'science-advanced': 'sci-advanced',
};
const ICON_PX = 64;
const icons = new Map<ItemId, HTMLCanvasElement>();

export const itemIconUrl = (id: ItemId): string | undefined =>
  ITEM_FILE[id] ? `${import.meta.env.BASE_URL}sprites/${ITEM_FILE[id]}.png` : undefined;

/** Draws an item centred on (cx, cy) in tile units, using its icon when loaded. */
export function drawItem(ctx: CanvasRenderingContext2D, id: ItemId, cx: number, cy: number, size: number): void {
  const icon = icons.get(id);
  if (icon) { ctx.drawImage(icon, cx - size / 2, cy - size / 2, size, size); return; }
  ctx.fillStyle = ITEMS[id].color;
  ctx.fillRect(cx - size / 3, cy - size / 3, size * 0.66, size * 0.66);
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth = 0.035;
  ctx.strokeRect(cx - size / 3, cy - size / 3, size * 0.66, size * 0.66);
}

export const getSprite = (role: string): Prepared | undefined => prepared.get(role);

// ---- natural obstacles: boulders, burnt trees and tar pits are plain images, drawn at their own proportions ----
const TERRAIN_IMAGES = [
  'rock-1', 'rock-2', 'rock-3', 'rock-4', 'rock-5', 'rock-6', 'rock-7', 'rock-8', 'rock-cluster-1', 'rock-cluster-2', 'rock-cluster-3', 'rock-cluster-4',
  'tree-1', 'tree-2', 'tree-3', 'tree-4', 'tree-5', 'tree-6', 'tree-8', 'obstacle-trees-extra-11', 'stump-1', 'stump-2', 'tree-7',
  'decor-pebbles', 'decor-shrub', 'decor-bones', 'decor-scrap-metal', 'decor-scrap-pile', 'decor-wreck', 'decor-fungus', 'decor-crater', 'decor-arm', 'decor-ash', 'decor-pipe',
  'ground-mud-1', 'ground-mud-2', 'ground-mud-3', 'ground-mud-4', 'ground-lava-1', 'ground-lava-2', 'ground-lava-3', 'ground-crater', 'ground-dune-1', 'ground-dune-2', 'ground-salt-1', 'ground-salt-2',
  'rubble-1', 'rubble-2', 'rubble-3', 'rubble-4',
  'tar-fill-a', 'tar-fill-b', 'tar-fill-c', 'tar-fill-d', 'tar-fill-e', 'tar-fill-f', 'tar-fill-g', 'tar-edge-straight', 'tar-edge-corner', 'tar-edge-u',
];
const terrainImages = new Map<string, HTMLImageElement>();
/** A loaded terrain image by file name, or undefined until (unless) it exists. */
export const terrainImage = (name: string): HTMLImageElement | undefined => terrainImages.get(name);

// ---- terrain: one seamless ground texture (drawn 4x4 tiles at a time) and several ore-field tile variants ----
const GROUND_PX = 256;
const ORE_TILE_PX = 96;
// Which sliced tiles belong to which ore kind. Names that don't exist yet (tin, lead, sulfur arrive with sheet 46)
// are simply skipped, and those ores keep their coloured-square look until the art is generated.
const ORE_TILE_FILES: Record<number, string[]> = {
  1: ['ore-tile-iron-1', 'ore-tile-iron-2'],
  2: ['ore-tile-copper-1', 'ore-tile-copper-2', 'ore-tile-copper-3'],
  3: ['ore-tile-coal-1', 'ore-tile-coal-2'],
  4: ['ore-tile-tin-1', 'ore-tile-tin-2'],
  5: ['ore-tile-lead-1', 'ore-tile-lead-2', 'ore-tile-lead-4'],
  6: ['ore-tile-sulfur-1', 'ore-tile-sulfur-2'],
  7: ['forest-1', 'forest-2', 'forest-3'], // trees: opaque ground tiles, so a forest reads as a patch of woodland
};
let groundTex: HTMLCanvasElement | undefined;
const oreTiles = new Map<number, HTMLCanvasElement[]>();
let manifest: Record<string, { file: string }> = {};

export const getGround = (): HTMLCanvasElement | undefined => groundTex;

/** True if the sliced sprite exists (so callers can pick the best available art). */
export const hasSprite = (name: string): boolean => name in manifest;

/** A stable ore-field tile variant and orientation for this map position, or undefined until loaded. */
export function getOreTile(kind: number, x: number, y: number): { img: HTMLCanvasElement; turns: number; flip: boolean } | undefined {
  const list = oreTiles.get(kind);
  if (!list?.length) return undefined;
  return {
    img: list[Math.floor(hash(x, y, 31) * list.length)],
    turns: Math.floor(hash(x, y, 47) * 4),
    flip: hash(x, y, 53) < 0.5,
  };
}

async function loadTile(name: string, px: number): Promise<HTMLCanvasElement | undefined> {
  const entry = manifest[name];
  if (!entry) return undefined;
  const img = await load(`${import.meta.env.BASE_URL}${entry.file}`);
  if (!img) return undefined;
  const c = document.createElement('canvas');
  c.width = c.height = px;
  const cx = c.getContext('2d')!;
  cx.imageSmoothingQuality = 'high';
  cx.drawImage(img, 0, 0, px, px);
  return c;
}

async function loadTerrain(): Promise<void> {
  try {
    manifest = await (await fetch(`${import.meta.env.BASE_URL}sprites/manifest.json`)).json();
  } catch { manifest = {}; }
  groundTex = await loadTile('ground-1', GROUND_PX);
  for (const [kind, files] of Object.entries(ORE_TILE_FILES)) {
    const tiles = await Promise.all(files.map((f) => loadTile(f, ORE_TILE_PX)));
    oreTiles.set(Number(kind), tiles.filter((t): t is HTMLCanvasElement => !!t));
  }
}

function load(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export async function loadSprites(): Promise<void> {
  const base = import.meta.env.BASE_URL;
  await loadTerrain();
  await Promise.all(TERRAIN_IMAGES.map(async (n) => { const img = await load(`${base}sprites/${n}.png`); if (img) terrainImages.set(n, img); }));
  await Promise.all((Object.keys(ITEM_FILE) as ItemId[]).map(async (id) => {
    const img = await load(itemIconUrl(id)!);
    if (!img) return;
    const c = document.createElement('canvas');
    c.width = c.height = ICON_PX;
    const cx = c.getContext('2d')!;
    cx.imageSmoothingQuality = 'high';
    const s = Math.min(ICON_PX / img.width, ICON_PX / img.height);
    cx.drawImage(img, (ICON_PX - img.width * s) / 2, (ICON_PX - img.height * s) / 2, img.width * s, img.height * s);
    icons.set(id, c);
  }));
  await Promise.all(Object.entries(SPECS).map(async ([role, spec]) => {
    const img = await load(`${base}sprites/${spec.file}.png`);
    if (!img) return;
    const [fw, fh] = spec.foot;
    const ratio = img.width / img.height;
    let w = fw, h = fh, x = 0, y = 0;
    if (spec.fit === 'contain') {
      const inset = spec.inset ?? 1;
      const fitRatio = fw / fh;
      if (ratio > fitRatio) { w = fw * inset; h = w / ratio; } else { h = fh * inset; w = h * ratio; }
      x = (fw - w) / 2;
      y = (fh - h) / 2;
    } else if (spec.fit === 'height') {
      h = fh;
      w = fh * ratio;
    } else if (spec.fit === 'arm') {
      const [fx, fy] = spec.pivot!;
      const s = spec.reach! / (img.width * (1 - fx)); // pivot -> claw tip spans `reach` tiles
      w = img.width * s;
      h = img.height * s;
      x = -fx * w;
      y = -fy * h;
    }
    const c = document.createElement('canvas');
    c.width = Math.round(w * PX);
    c.height = Math.round(h * PX);
    const cx = c.getContext('2d')!;
    cx.imageSmoothingEnabled = true;
    cx.imageSmoothingQuality = 'high';
    cx.drawImage(img, 0, 0, c.width, c.height);
    prepared.set(role, { canvas: c, x, y, w, h });
    if (role === 'belt') prepared.set('belt-curve', buildCurve(img));
  }));
}

/**
 * Bends the straight belt image around a tile corner, so a turn has exactly the same lane width and rails
 * as the straight pieces on either side. The belt runs east -> south around the tile's bottom-left corner:
 * its inner rail collapses to that corner point and its outer rail becomes the quarter circle of radius 1.
 * Flip / rotate it in the renderer for the other turns. Drawn as thin wedges, each clipped and stretched
 * from a slice of the straight image.
 */
function buildCurve(img: HTMLImageElement): Prepared {
  const S = 192, SLICES = 96;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const cx = c.getContext('2d')!;
  cx.imageSmoothingQuality = 'high';
  cx.scale(S, S); // work in tile units, y pointing down
  const corner = { x: 0, y: 1 };
  const eps = 0.006; // slight overlap between wedges hides hairline gaps
  for (let i = 0; i < SLICES; i++) {
    const a0 = -Math.PI / 2 + (i / SLICES) * (Math.PI / 2) - eps;
    const a1 = -Math.PI / 2 + ((i + 1) / SLICES) * (Math.PI / 2) + eps;
    const am = (a0 + a1) / 2;
    const e0 = { x: Math.cos(a0), y: Math.sin(a0) }, e1 = { x: Math.cos(a1), y: Math.sin(a1) };
    const em = { x: Math.cos(am), y: Math.sin(am) };
    const dx = e1.x - e0.x, dy = e1.y - e0.y;
    cx.save();
    cx.beginPath();
    cx.moveTo(corner.x, corner.y);
    cx.lineTo(corner.x + e0.x * 1.02, corner.y + e0.y * 1.02);
    cx.lineTo(corner.x + e1.x * 1.02, corner.y + e1.y * 1.02);
    cx.closePath();
    cx.clip();
    // unit square (a across the slice, b from outer rail = 0 to inner rail = 1) -> the wedge
    cx.transform(dx, dy, -em.x, -em.y, corner.x + em.x - 0.5 * dx, corner.y + em.y - 0.5 * dy);
    cx.drawImage(img, ((i / SLICES) * img.width), 0, img.width / SLICES + 1, img.height, 0, 0, 1, 1);
    cx.restore();
  }
  return { canvas: c, x: 0, y: 0, w: 1, h: 1 };
}

export function drawSprite(ctx: CanvasRenderingContext2D, p: Prepared, tx: number, ty: number): void {
  ctx.drawImage(p.canvas, tx + p.x, ty + p.y, p.w, p.h);
}
