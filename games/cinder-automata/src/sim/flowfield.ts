// A flow field for ground enemies. Every ground enemy is heading for the same place (the core), so instead of one route search
// per enemy there is ONE search, run outward from the core across the map, that gives every tile its cost to the core. An
// enemy then just steps to the cheapest neighbouring tile ("reads the arrow under its feet"). It is rebuilt when buildings
// change (at most a few times a second), not every frame.
//
// Tile costs: rock, trees, tar and ground outside the opened land are impassable. Belts, inserters, crossovers and splitters
// are flat and cost the same as open ground. Every other building is passable at a high cost, so enemies go round a wall when
// there is a gap, but if the core is sealed in they head for the cheapest wall and chew through it.
// Three variants: ordinary enemies; big ones (siege crawlers, brutes, bosses), which also keep a tile clear of rock so they do
// not squeeze through one-tile gaps; and the Siege Brute, which smashes through buildings and is only stopped by terrain.
import { clearLine, solidAt } from './pathfind';
import type { World } from './world';

export type Variant = 'small' | 'big' | 'brute';

/** What passing through a building tile costs, compared with 1 for open ground. */
export const BUILDING_COST = 14;
const REBUILD_EVERY = 0.25; // seconds of game time

interface Field { dist: Float64Array; key: string; builtAt: number }
const fields = new WeakMap<World, Partial<Record<Variant, Field>>>();

const FLAT = new Set(['belt', 'inserter', 'junction', 'splitter']);
const DIRS: [number, number][] = [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, 1], [-1, -1], [1, -1]];

function terrainBlocked(w: World, x: number, y: number): boolean {
  return !w.inBounds(x, y) || !w.inArena(x, y) || w.hasTerrain(x, y);
}

/** Cost of stepping onto a tile, or Infinity if it cannot be entered. */
function tileCost(w: World, x: number, y: number, v: Variant): number {
  if (terrainBlocked(w, x, y)) return Infinity;
  if (v === 'big') { // keep a tile clear of rock
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && w.inBounds(x + dx, y + dy) && w.hasTerrain(x + dx, y + dy)) return Infinity;
  }
  const e = w.entityAt(x, y);
  const slow = w.mud[y * w.w + x] ? 0.8 : 0; // mud: enemies would rather go round it if the detour is short
  if (!e || FLAT.has(e.kind) || e.kind === 'core') return 1 + slow;
  return v === 'brute' ? 1 : BUILDING_COST;
}

class Heap {
  private k: number[] = [];
  private v: number[] = [];
  get size(): number { return this.k.length; }
  push(key: number, val: number): void {
    let i = this.k.length; this.k.push(key); this.v.push(val);
    while (i > 0) { const p = (i - 1) >> 1; if (this.k[p] <= key) break; this.k[i] = this.k[p]; this.v[i] = this.v[p]; i = p; }
    this.k[i] = key; this.v[i] = val;
  }
  pop(): number {
    const top = this.v[0], lk = this.k.pop()!, lv = this.v.pop()!;
    const n = this.k.length;
    if (n > 0) {
      let i = 0;
      for (;;) {
        let c = 2 * i + 1; if (c >= n) break;
        if (c + 1 < n && this.k[c + 1] < this.k[c]) c++;
        if (this.k[c] >= lk) break;
        this.k[i] = this.k[c]; this.v[i] = this.v[c]; i = c;
      }
      this.k[i] = lk; this.v[i] = lv;
    }
    return top;
  }
  popKey(): number { return this.k[0]; }
}

function build(w: World, v: Variant, key: string): Field {
  const W = w.w, H = w.h;
  const dist = new Float64Array(W * H).fill(Infinity);
  const heap = new Heap();
  const core = w.core;
  if (core) for (let dy = 0; dy < core.h; dy++) for (let dx = 0; dx < core.w; dx++) { const i = (core.y + dy) * W + core.x + dx; dist[i] = 0; heap.push(0, i); }
  const cost = new Float64Array(W * H).fill(-1); // -1 = not looked up yet
  const costAt = (x: number, y: number): number => { const i = y * W + x; if (cost[i] < 0) cost[i] = tileCost(w, x, y, v); return cost[i]; };
  while (heap.size) {
    const d0 = heap.popKey(), i = heap.pop();
    if (d0 > dist[i]) continue;
    const x = i % W, y = (i / W) | 0;
    for (const [dx, dy] of DIRS) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const c = costAt(nx, ny);
      if (c === Infinity) continue;
      const diag = dx !== 0 && dy !== 0;
      if (diag && (costAt(x + dx, y) === Infinity || costAt(x, y + dy) === Infinity)) continue; // never cut a corner of rock
      const nd = d0 + c * (diag ? 1.4142 : 1);
      const ni = ny * W + nx;
      if (nd < dist[ni]) { dist[ni] = nd; heap.push(nd, ni); }
    }
  }
  return { dist, key, builtAt: w.time };
}

/** The field for this kind of enemy, rebuilt when the buildings or the explored land have changed (not more than a few times a second). */
export function fieldFor(w: World, v: Variant): Float64Array | null {
  if (!w.core) return null;
  let set = fields.get(w);
  if (!set) { set = {}; fields.set(w, set); }
  const key = `${w.layoutVersion}:${w.plots?.size ?? 0}:${w.core.id}`;
  const cur = set[v];
  if (!cur || (cur.key !== key && w.time - cur.builtAt >= REBUILD_EVERY) || w.time < cur.builtAt) set[v] = build(w, v, key);
  return set[v]!.dist;
}

/** Forgets the fields (a test changed the terrain behind the world's back). */
export function resetFields(w: World): void { fields.delete(w); }

/** How fast a ground unit moves where it stands: 1 on firm ground, about half in mud. */
export const groundSpeedMul = (w: World, x: number, y: number): number => (w.inBounds(Math.floor(x), Math.floor(y)) && w.mud[Math.floor(y) * w.w + Math.floor(x)] ? 0.55 : 1);

export const variantFor = (kind: string | undefined, scale: number): Variant => (kind === 'brute-3' ? 'brute' : scale >= 2.2 ? 'big' : 'small');

/** The cheapest neighbour of a tile (never cutting a corner), or null if none is cheaper. */
function bestNeighbour(w: World, dist: Float64Array, x: number, y: number): { x: number; y: number } | null {
  const W = w.w;
  let best: { x: number; y: number } | null = null, bd = dist[y * W + x];
  for (const [dx, dy] of DIRS) {
    const nx = x + dx, ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= W || ny >= w.h) continue;
    const d = dist[ny * W + nx];
    if (!(d < bd)) continue;
    if (dx !== 0 && dy !== 0 && (dist[y * W + x + dx] === Infinity || dist[(y + dy) * W + x] === Infinity)) continue;
    bd = d; best = { x: nx, y: ny };
  }
  return best;
}

/** Walks the arrows from (x, y): up to `steps` tile centres along the route, or null when the position is not on the field. */
export function routeAhead(w: World, v: Variant, x: number, y: number, steps: number): { x: number; y: number }[] | null {
  const dist = fieldFor(w, v);
  if (!dist) return null;
  let tx = Math.floor(x), ty = Math.floor(y);
  if (!w.inBounds(tx, ty) || dist[ty * w.w + tx] === Infinity) return null;
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i < steps; i++) {
    const n = bestNeighbour(w, dist, tx, ty);
    if (!n) break;
    tx = n.x; ty = n.y;
    out.push({ x: tx + 0.5, y: ty + 0.5 });
  }
  return out;
}

/** Is this position somewhere an enemy can get to the core from? */
export function reachable(w: World, v: Variant, x: number, y: number): boolean {
  const dist = fieldFor(w, v);
  const tx = Math.floor(x), ty = Math.floor(y);
  return !!dist && w.inBounds(tx, ty) && dist[ty * w.w + tx] < Infinity;
}

/** The nearest tile centre from which the core can be reached, searching outward; null if there is none close by. */
export function reachableSpot(w: World, v: Variant, x: number, y: number, maxR = 10): { x: number; y: number } | null {
  const dist = fieldFor(w, v);
  if (!dist) return null;
  const tx = Math.floor(x), ty = Math.floor(y);
  let best: { x: number; y: number } | null = null, bd = Infinity;
  for (let r = 0; r <= maxR && !best; r++) {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const nx = tx + dx, ny = ty + dy;
      if (!w.inBounds(nx, ny) || dist[ny * w.w + nx] === Infinity) continue;
      const d = Math.hypot(nx + 0.5 - x, ny + 0.5 - y);
      if (d < bd) { bd = d; best = { x: nx + 0.5, y: ny + 0.5 }; }
    }
  }
  return best;
}

export interface FlowUnit { x: number; y: number; id: number }

/**
 * Moves a ground enemy one step. With a clear line to its target it walks straight at it; otherwise it follows the flow field
 * towards the core, aiming at the furthest point of the route it can see in a straight line (so it does not zig-zag tile by
 * tile). Returns the direction moved, or null if it is blocked (by a building in its way, which the caller then attacks) or off the field.
 */
export function flowWalk(w: World, u: FlowUnit, tx: number, ty: number, speed: number, dt: number, v: Variant): { x: number; y: number } | null {
  const terrainOnly = v === 'brute';
  const step = speed * dt * groundSpeedMul(w, u.x, u.y);
  const move = (px: number, py: number): { x: number; y: number } | null => {
    const vx = px - u.x, vy = py - u.y, d = Math.hypot(vx, vy);
    if (d < 1e-6) return null;
    const k = Math.min(d, step) / d;
    const nx = u.x + vx * k, ny = u.y + vy * k;
    if (solidAt(w, Math.floor(nx), Math.floor(ny), terrainOnly)) { // clipped a corner or ran into a building: slide along a free axis
      if (!solidAt(w, Math.floor(nx), Math.floor(u.y), terrainOnly)) { u.x = nx; return { x: vx, y: vy }; }
      if (!solidAt(w, Math.floor(u.x), Math.floor(ny), terrainOnly)) { u.y = ny; return { x: vx, y: vy }; }
      return null;
    }
    u.x = nx; u.y = ny;
    return { x: vx, y: vy };
  };
  const inside = solidAt(w, Math.floor(u.x), Math.floor(u.y), terrainOnly);
  if (inside) { // built on top of, or lifted onto rock: let it walk free towards the target
    const vx = tx - u.x, vy = ty - u.y, d = Math.hypot(vx, vy);
    if (d < 1e-6) return null;
    const k = Math.min(d, step) / d;
    u.x += vx * k; u.y += vy * k;
    return { x: vx, y: vy };
  }
  // can it see the target? A building (or the core) is solid, so look at a point just short of it, not at its middle
  const td = Math.hypot(tx - u.x, ty - u.y), back = Math.min(1.1, td * 0.5);
  const lx = td > 1e-6 ? tx - ((tx - u.x) / td) * back : tx, ly = td > 1e-6 ? ty - ((ty - u.y) / td) * back : ty;
  if (clearLine(w, u.x, u.y, lx, ly, 0.28, terrainOnly)) return move(tx, ty);
  const route = routeAhead(w, v, u.x, u.y, 5);
  if (!route || !route.length) return null;
  let aim = route[0];
  for (let i = 1; i < route.length; i++) { if (clearLine(w, u.x, u.y, route[i].x, route[i].y, 0.28, terrainOnly)) aim = route[i]; else break; }
  return move(aim.x, aim.y);
}
