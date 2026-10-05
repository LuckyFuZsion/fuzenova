import { World } from './world';
import { CORE_PLOT, CORE_PLOT_ID, PLOT_COLS, PLOT_ROWS, plotCentre, plotCol, plotRect, plotRing, plotRow } from './plots';

function hash(x: number, y: number, seed: number): number {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(seed, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function smoothNoise(x: number, y: number, seed: number): number {
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const fx = x - x0, fy = y - y0;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = hash(x0, y0, seed), b = hash(x0 + 1, y0, seed);
  const c = hash(x0, y0 + 1, seed), d = hash(x0 + 1, y0 + 1, seed);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

interface Patch { type: number; cx: number; cy: number; r: number }

export const LEGACY_SEED = 1337;
/** Where the core stands (its top-left tile), which the map is built round. */
export const CORE_TILE = { x: 99, y: 99 };
/** The old fixed map (tutorial, old saves, tests) is 160x160 with the core here. */
export const LEGACY_CORE = { x: 79, y: 91 };
export const RUN_MAP_SIZE = 200;

/**
 * Every run has its own seed and so its own map: where the near iron and copper are, which way each of the ammo-chain
 * resources lies and how far, and the rocks, trees and tar. Seed 1337 (old saves and the tests) is the original fixed map.
 */
export function generateWorld(seed = LEGACY_SEED, size = seed === LEGACY_SEED ? 160 : RUN_MAP_SIZE): World {
  const world = new World(size, size);
  world.seed = seed;
  if (seed !== LEGACY_SEED) {
    const cx = CORE_TILE.x + 1.5, cy = CORE_TILE.y + 1.5;
    const rnd = (k: number) => hash(k, 7, seed);
    const order = <T,>(arr: T[], key: number): T[] => arr.map((v, i) => ({ v, r: rnd(key * 131 + i) })).sort((p, q) => p.r - q.r).map((o) => o.v);
    // the plot round the core holds one small iron patch and nothing else: the first level is about iron alone
    const start = plotRect(CORE_PLOT_ID);
    const spot = [{ x: cx - 8.8, y: cy }, { x: cx + 8.8, y: cy }, { x: cx, y: cy - 8.8 }, { x: cx, y: cy + 8.8 }][Math.floor(rnd(1) * 4)];
    addOrePatch(world, 1, spot.x + (rnd(2) - 0.5) * 1.2, spot.y + (rnd(3) - 0.5) * 1.2, 5.4, seed, 1.7); // a generous first patch: plenty of tiles for several drills, and deep
    // everything else is handed out ring by ring, so new resources arrive slowly as the map opens up
    const ringPlots = (r: number) => { const out: number[] = []; for (let id = 0; id < PLOT_COLS * PLOT_ROWS; id++) if (plotRing(id) === r) out.push(id); return out; };
    const orth = (id: number) => plotCol(id) === CORE_PLOT.i || plotRow(id) === CORE_PLOT.j;
    const RINGS: number[][] = [[], [2, 1, 2, 1], [3, 4, 1, 2, 1, 7], [5, 6, 2, 1, 3, 7, 1, 2, 4, 7, 5, 6, 3, 1, 2]];
    for (let r = 1; r <= 3; r++) {
      let plots = order(ringPlots(r), r);
      if (r === 1) plots = [...plots.filter(orth), ...plots.filter((p) => !orth(p))]; // next-door copper must be straight up, down, left or right
      RINGS[r].forEach((type, k) => {
        const id = plots[k];
        if (id === undefined) return;
        const c = plotCentre(id);
        addOrePatch(world, type, c.x + (rnd(200 + id) - 0.5) * 5, c.y + (rnd(300 + id) - 0.5) * 5, (type === 6 ? 4.5 : 5.5) + rnd(400 + id) * 1.2, seed, r >= 3 ? 1.2 : 1);
      });
    }
    // nothing but that first iron patch inside the starting plot
    for (let y = start.y0; y < start.y1; y++) for (let x = start.x0; x < start.x1; x++) { const i = y * size + x; if (world.ore[i] > 1) { world.ore[i] = 0; world.oreLeft[i] = 0; } }
    // keep a clear margin of bare ground round the core (the core is 3x3): no ore within 3 tiles of it
    for (let y = CORE_TILE.y - 3; y < CORE_TILE.y + 6; y++) for (let x = CORE_TILE.x - 3; x < CORE_TILE.x + 6; x++) { const i = y * size + x; world.ore[i] = 0; world.oreLeft[i] = 0; }
    addTerrain(world, seed, cx, cy);
    world.setPlots([CORE_PLOT_ID]);
    return world;
  }
  const mid = size / 2;
  const patches: Patch[] = [
    { type: 1, cx: mid - 5, cy: mid - 4, r: 9 },
    { type: 2, cx: mid + 13, cy: mid + 5, r: 7 },
    { type: 1, cx: mid - 38, cy: mid + 26, r: 11 },
    { type: 2, cx: mid + 34, cy: mid - 30, r: 10 },
    // the ammo-chain resources, a fair walk from the core so the player has to plan a supply line
    { type: 3, cx: mid - 22, cy: mid + 22, r: 7 }, // coal
    { type: 4, cx: mid + 22, cy: mid - 18, r: 6 }, // tin
    { type: 5, cx: mid - 24, cy: mid - 20, r: 6 }, // lead
    { type: 6, cx: mid + 26, cy: mid + 24, r: 5 }, // sulfur
    { type: 7, cx: mid + 3, cy: mid - 30, r: 8 }, // forest
  ];
  for (const p of patches) addOrePatch(world, p.type, p.cx, p.cy, p.r, seed);
  addTerrain(world, seed, mid + 0, mid + 11);
  return world;
}

const T_ROCK = 1, T_TREE = 2, T_PIT = 3, T_POOL = 4; // 3 = tar pit, 4 = toxic pool (both impassable and unbuildable)

/**
 * Scatters natural obstacles: boulder fields, stands of burnt trees, tar pits, and a few long rock ridges with gaps that
 * funnel the enemy. Nothing lands on ore or close to the core, and any pocket the obstacles would wall off is opened up.
 */
export function addTerrain(world: World, seed: number, coreX: number, coreY: number): void {
  const W = world.w, H = world.h;
  const free = (x: number, y: number) => world.inBounds(x, y) && !world.ore[y * W + x] && Math.hypot(x - coreX, y - coreY) > 8 && !world.entityAt(x, y);
  const put = (x: number, y: number, t: number) => { if (free(x, y)) world.terrain[y * W + x] = t; };
  const rnd = (i: number, k: number) => hash(i, k, seed + 99);

  // blobs: boulder fields and tar pits (noise-edged discs), and loose stands of trees
  const CLUSTERS = 150;
  for (let i = 0; i < CLUSTERS; i++) {
    const ang = rnd(i, 1) * Math.PI * 2;
    const dist = 11 + Math.sqrt(rnd(i, 2)) * 66;     // plenty inside the first small arena, more further out
    const cx = coreX + Math.cos(ang) * dist, cy = coreY + Math.sin(ang) * dist;
    const kind = rnd(i, 3);
    const r = 1.6 + rnd(i, 4) * 2.6;
    const type = kind < 0.46 ? T_ROCK : kind < 0.74 ? T_TREE : kind < 0.89 ? T_PIT : T_POOL;
    for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++) {
      for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) {
        const d = Math.hypot(x - cx, y - cy);
        const edge = r * (0.75 + 0.5 * smoothNoise(x / 2.5, y / 2.5, seed + i));
        if (type === T_TREE) { if (d < r * 1.6 && hash(x, y, seed + 5) < 0.3) put(x, y, T_TREE); } // trees are scattered, not solid
        else if (d < edge) put(x, y, type);
      }
    }
  }

  // ridges: long rock lines with a gap or two, so the enemy has to funnel through
  const RIDGES = 16;
  for (let i = 0; i < RIDGES; i++) {
    const ang = rnd(i, 11) * Math.PI * 2;
    const dist = 12 + rnd(i, 12) * 46;
    const sx = coreX + Math.cos(ang) * dist, sy = coreY + Math.sin(ang) * dist;
    const dir = rnd(i, 13) * Math.PI;                 // the line's direction
    const len = 8 + Math.floor(rnd(i, 14) * 8);
    const gapAt = 2 + Math.floor(rnd(i, 15) * (len - 5));
    for (let k = 0; k < len; k++) {
      if (k >= gapAt && k < gapAt + 3) continue;       // a three-tile gap
      const x = Math.round(sx + Math.cos(dir) * k), y = Math.round(sy + Math.sin(dir) * k);
      put(x, y, T_ROCK);
      if (hash(x, y, seed + 21) < 0.5) put(x + (Math.abs(Math.sin(dir)) > 0.7 ? 1 : 0), y + (Math.abs(Math.sin(dir)) > 0.7 ? 0 : 1), T_ROCK); // thicken it a little
    }
  }
  addMud(world, seed, coreX, coreY);
  openPockets(world, coreX, coreY);
}

/** Mud flats: soft ground that slows anything walking through it. Never on ore, rock, trees or pools, and not near the core. */
export function addMud(world: World, seed: number, coreX: number, coreY: number): void {
  const W = world.w;
  const rnd = (i: number, k: number) => hash(i, k, seed + 313);
  for (let i = 0; i < 26; i++) {
    const ang = rnd(i, 1) * Math.PI * 2, dist = 13 + Math.sqrt(rnd(i, 2)) * 62;
    const cx = coreX + Math.cos(ang) * dist, cy = coreY + Math.sin(ang) * dist, r = 2.4 + rnd(i, 3) * 3.2;
    for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++) {
      for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) {
        if (!world.inBounds(x, y)) continue;
        const idx = y * W + x;
        if (world.ore[idx] || world.terrain[idx] || Math.hypot(x - coreX, y - coreY) < 9) continue;
        const edge = r * (0.7 + 0.55 * smoothNoise(x / 2.2, y / 2.2, seed + 500 + i));
        if (Math.hypot(x - cx, y - cy) < edge) world.mud[idx] = 1;
      }
    }
  }
}

/** Flood-fills from the core over free ground; any free ground it cannot reach gets a rock removed beside it, until everything connects. */
function openPockets(world: World, coreX: number, coreY: number): void {
  const W = world.w, H = world.h;
  for (let pass = 0; pass < 12; pass++) {
    const seen = new Uint8Array(W * H);
    const q: number[] = [Math.round(coreY) * W + Math.round(coreX)];
    seen[q[0]] = 1;
    for (let h = 0; h < q.length; h++) {
      const x = q[h] % W, y = Math.floor(q[h] / W);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy, ni = ny * W + nx;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen[ni] || world.terrain[ni]) continue;
        seen[ni] = 1; q.push(ni);
      }
    }
    let opened = 0;
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const i = y * W + x;
        if (seen[i] || world.terrain[i]) continue; // reachable, or itself rock
        // an unreachable free tile: clear the rock around it so the pocket joins the rest
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const j = (y + dy) * W + x + dx; if (world.terrain[j]) { world.terrain[j] = 0; opened++; } }
      }
    }
    if (!opened) return;
  }
}

/**
 * Stamps a patch of resource onto the map. Tiles under buildings are skipped so a patch never lands on top of the base.
 * Returns how many tiles it filled, so callers can refuse a patch that would mostly miss.
 */
export function addOrePatch(world: World, type: number, cx: number, cy: number, r: number, seed = 1337, richness = 1): number {
  let filled = 0;
  const reach = Math.ceil(r * 1.4);
  for (let y = Math.floor(cy - reach); y <= cy + reach; y++) {
    for (let x = Math.floor(cx - reach); x <= cx + reach; x++) {
      if (!world.inBounds(x, y) || world.entityAt(x, y) || world.terrain[y * world.w + x]) continue;
      const d = Math.hypot(x - cx, y - cy);
      const rEff = r * (0.75 + 0.5 * smoothNoise(x / 4, y / 4, seed + type));
      if (d < rEff) {
        const i = y * world.w + x;
        world.ore[i] = type;
        world.oreLeft[i] = Math.floor((300 + (1 - d / rEff) * 1200) * richness);
        filled++;
      }
    }
  }
  return filled;
}

export { hash };
