// Walking for ground units. Buildings are solid (belts and inserters are flat and can be walked over), so a ground robot
// goes round them. Flying units ignore all this. A* on the tile grid, with the route straightened afterwards.
import { ENEMIES } from './enemies';
import { ROBOTS } from './robots';
import type { World } from './world';

const ENEMY_FLIES = (k: keyof typeof ENEMIES): boolean => ENEMIES[k].flying;

/** Can a ground unit stand on this tile? Belts, inserters, crossovers and splitters lie flat, everything else (machines, walls, the core) blocks. */
export function solidAt(w: World, tx: number, ty: number, terrainOnly = false): boolean {
  if (!w.inBounds(tx, ty) || !w.inArena(tx, ty) || w.hasTerrain(tx, ty)) return true; // the map edge, unexplored ground, rocks, trees and tar pits
  if (terrainOnly) return false; // the siege brute smashes through buildings, so only terrain stops it
  const e = w.entityAt(tx, ty);
  return !!e && e.kind !== 'belt' && e.kind !== 'inserter' && e.kind !== 'junction' && e.kind !== 'splitter';
}

/** Is the straight line free of solid tiles? Three parallel rays, so a unit with some width does not clip corners. */
export function clearLine(w: World, x1: number, y1: number, x2: number, y2: number, half = 0.28, terrainOnly = false): boolean {
  const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy);
  if (len < 0.01) return true;
  const nx = -dy / len * half, ny = dx / len * half;
  const steps = Math.ceil(len / 0.25);
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    for (const k of [0, -1, 1]) {
      if (solidAt(w, Math.floor(x1 + dx * t + nx * k), Math.floor(y1 + dy * t + ny * k), terrainOnly)) return false;
    }
  }
  return true;
}

/** A tile next to something solid (rock, trees, tar, pools, walls, machines). Big walkers (the Titan) keep clear of these so their large bodies do not scrape along them. */
function nearSolid(w: World, tx: number, ty: number, terrainOnly: boolean): boolean {
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && solidAt(w, tx + dx, ty + dy, terrainOnly)) return true;
  return false;
}

// scratch space reused between searches (the map is small, but this runs for many units)
let cap = 0;
let stamp = 0;
let seen = new Uint32Array(0), closed = new Uint32Array(0);
let gCost = new Float32Array(0), from = new Int32Array(0);

const DIRS: [number, number, number][] = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.4142], [1, -1, 1.4142], [-1, 1, 1.4142], [-1, -1, 1.4142]];

/** A route from (sx, sy) to near (gx, gy) as a list of world points to walk through, or null if there is nowhere to go. */
export function findPath(w: World, sx: number, sy: number, gx: number, gy: number, maxNodes = 3500, terrainOnly = false, wide = false): { x: number; y: number }[] | null {
  const blocked = (x: number, y: number): boolean => solidAt(w, x, y, terrainOnly) || (wide && nearSolid(w, x, y, terrainOnly));
  const W = w.w, N = w.w * w.h;
  if (cap < N) { cap = N; seen = new Uint32Array(N); closed = new Uint32Array(N); gCost = new Float32Array(N); from = new Int32Array(N); stamp = 0; }
  stamp++;
  const startX = Math.max(0, Math.min(w.w - 1, Math.floor(sx))), startY = Math.max(0, Math.min(w.h - 1, Math.floor(sy)));
  let goalX = Math.max(0, Math.min(w.w - 1, Math.floor(gx))), goalY = Math.max(0, Math.min(w.h - 1, Math.floor(gy)));
  if (blocked(goalX, goalY)) { // the goal is inside a building: aim for the closest free tile round it
    let best = -1, bd = Infinity;
    for (let r = 1; r <= 4 && best < 0; r++) {
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r || blocked(goalX + dx, goalY + dy)) continue;
        const d = Math.hypot(goalX + dx + 0.5 - gx, goalY + dy + 0.5 - gy);
        if (d < bd) { bd = d; best = (goalY + dy) * W + goalX + dx; }
      }
    }
    if (best < 0) return null;
    goalX = best % W; goalY = Math.floor(best / W);
  }
  const start = startY * W + startX, goal = goalY * W + goalX;
  if (start === goal) return [{ x: gx, y: gy }];

  const h = (x: number, y: number) => { const a = Math.abs(x - goalX), b = Math.abs(y - goalY); return Math.max(a, b) + 0.4142 * Math.min(a, b); };
  // binary heap of [f, index]
  const heap: number[] = [], heapF: number[] = [];
  const push = (idx: number, f: number) => {
    let i = heap.length; heap.push(idx); heapF.push(f);
    while (i > 0) { const p = (i - 1) >> 1; if (heapF[p] <= heapF[i]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; [heapF[p], heapF[i]] = [heapF[i], heapF[p]]; i = p; }
  };
  const pop = (): number => {
    const top = heap[0], last = heap.pop()!, lastF = heapF.pop()!;
    if (heap.length) {
      heap[0] = last; heapF[0] = lastF;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1; let m = i;
        if (l < heap.length && heapF[l] < heapF[m]) m = l;
        if (r < heap.length && heapF[r] < heapF[m]) m = r;
        if (m === i) break;
        [heap[m], heap[i]] = [heap[i], heap[m]]; [heapF[m], heapF[i]] = [heapF[i], heapF[m]]; i = m;
      }
    }
    return top;
  };

  seen[start] = stamp; gCost[start] = 0; from[start] = -1;
  push(start, h(startX, startY));
  let expanded = 0, bestIdx = start, bestH = h(startX, startY);
  while (heap.length && expanded < maxNodes) {
    const cur = pop();
    if (closed[cur] === stamp) continue;
    closed[cur] = stamp; expanded++;
    const cx = cur % W, cy = Math.floor(cur / W);
    const ch = h(cx, cy);
    if (ch < bestH) { bestH = ch; bestIdx = cur; }
    if (cur === goal) { bestIdx = cur; break; }
    for (const [dx, dy, cost] of DIRS) {
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= w.h || blocked(nx, ny)) continue;
      if (dx !== 0 && dy !== 0 && (blocked(cx + dx, cy) || blocked(cx, cy + dy))) continue; // no squeezing through a diagonal gap
      const ni = ny * W + nx;
      const g = gCost[cur] + cost;
      if (seen[ni] === stamp && g >= gCost[ni]) continue;
      seen[ni] = stamp; gCost[ni] = g; from[ni] = cur;
      push(ni, g + h(nx, ny));
    }
  }
  if (bestIdx === start) return null;
  const tiles: { x: number; y: number }[] = [];
  for (let i = bestIdx; i !== -1 && i !== start; i = from[i]) tiles.push({ x: (i % W) + 0.5, y: Math.floor(i / W) + 0.5 });
  tiles.reverse();
  if (bestIdx === goal) tiles[tiles.length - 1] = { x: gx, y: gy };
  // straighten: skip to the furthest point that can be reached in a straight line
  const out: { x: number; y: number }[] = [];
  let ax = sx, ay = sy, i = 0;
  while (i < tiles.length) {
    let j = tiles.length - 1;
    while (j > i && !clearLine(w, ax, ay, tiles[j].x, tiles[j].y, wide ? 0.9 : 0.28, terrainOnly)) j--;
    out.push(tiles[j]); ax = tiles[j].x; ay = tiles[j].y; i = j + 1;
  }
  return out;
}

// ---- walking: shared by the player's ground robots and ground enemies ----
export interface Walker { id: number; x: number; y: number; path?: { x: number; y: number }[]; pathT?: number; pathVer?: number }

const PATHS_PER_STEP = 14; // routes worked out per step across all units, so a big crowd cannot stall the game
let pathBudget = PATHS_PER_STEP;
export function resetPathBudget(): void { pathBudget = PATHS_PER_STEP; }

/**
 * Moves a ground unit one step towards (tx, ty), going round obstacles instead of over them. Returns the direction it
 * actually moved in, or null if it has nowhere to go. `terrainOnly` units (the siege brute) are stopped by rocks, not buildings.
 */
export function walkGround(world: World, u: Walker, tx: number, ty: number, speed: number, dt: number, terrainOnly = false, wide = false): { x: number; y: number } | null {
  const step = speed * dt * (world.mud[Math.floor(u.y) * world.w + Math.floor(u.x)] ? 0.55 : 1); // mud slows everything on foot
  const inside = solidAt(world, Math.floor(u.x), Math.floor(u.y), terrainOnly); // built on top of it, or lifted onto rock: let it walk free
  if (!inside && clearLine(world, u.x, u.y, tx, ty, wide ? 0.9 : 0.28, terrainOnly)) {
    u.path = undefined;
    const d = Math.hypot(tx - u.x, ty - u.y);
    if (d < 1e-6) return null;
    const k = Math.min(d, step) / d;
    const vx = tx - u.x, vy = ty - u.y;
    u.x += vx * k; u.y += vy * k;
    return { x: vx, y: vy };
  }
  u.pathT = (u.pathT ?? 0) - dt;
  if ((!u.path || u.pathT <= 0 || u.pathVer !== world.layoutVersion) && pathBudget > 0) {
    pathBudget--;
    let path = findPath(world, u.x, u.y, tx, ty, 3500, terrainOnly, wide);
    if (wide && (!path || !path.length || Math.hypot(path[path.length - 1].x - tx, path[path.length - 1].y - ty) > 2)) path = findPath(world, u.x, u.y, tx, ty, 3500, terrainOnly, false) ?? path; // a big walker takes the wide way if there is one that gets there, else the narrow way
    u.path = path ?? undefined;
    u.pathT = 0.5 + (u.id % 5) * 0.1; // re-plan now and then, since the target moves
    u.pathVer = world.layoutVersion;
  }
  while (u.path?.length && Math.hypot(u.path[0].x - u.x, u.path[0].y - u.y) < 0.2) u.path.shift();
  const p = u.path?.[0];
  if (!p) return null;
  const d = Math.hypot(p.x - u.x, p.y - u.y);
  const k = Math.min(d, step) / d;
  const vx = p.x - u.x, vy = p.y - u.y;
  let nx = u.x + vx * k, ny = u.y + vy * k;
  if (!inside && solidAt(world, Math.floor(nx), Math.floor(ny), terrainOnly)) { // clipped a corner: slide along whichever axis is free
    if (!solidAt(world, Math.floor(nx), Math.floor(u.y), terrainOnly)) ny = u.y;
    else if (!solidAt(world, Math.floor(u.x), Math.floor(ny), terrainOnly)) nx = u.x;
    else { u.path = undefined; u.pathT = 0; return null; } // wedged: work out a new route next step
  }
  u.x = nx; u.y = ny;
  return { x: vx, y: vy };
}

/** The nearest standable tile centre to (x, y), searching outwards; null if there is none close by. */
export function freeSpot(world: World, x: number, y: number, maxR = 5, minR = 0): { x: number; y: number } | null {
  const tx = Math.floor(x), ty = Math.floor(y);
  let best: { x: number; y: number } | null = null, bd = Infinity;
  for (let r = minR; r <= maxR && !best; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r || solidAt(world, tx + dx, ty + dy)) continue;
        const d = Math.hypot(tx + dx + 0.5 - x, ty + dy + 0.5 - y);
        if (d < bd) { bd = d; best = { x: tx + dx + 0.5, y: ty + dy + 0.5 }; }
      }
    }
  }
  return best;
}

/**
 * A ground unit that is walled in (boxed into a small pocket by buildings and scenery, so no route out exists) is lifted to the nearest
 * free ground outside the pocket. Returns null when it is not sealed in (the region it can reach is large) or no ground outside is near.
 */
export function escapeSpot(world: World, x: number, y: number, limit = 1200, maxR = 14): { x: number; y: number } | null {
  const W = world.w, sx = Math.floor(x), sy = Math.floor(y);
  const region = new Set<number>([sy * W + sx]);
  const queue = [sy * W + sx];
  for (let q = 0; q < queue.length; q++) {
    if (region.size >= limit) return null; // plenty of room: not sealed in
    const cx = queue[q] % W, cy = Math.floor(queue[q] / W);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx, ny = cy + dy, i = ny * W + nx;
      if (region.has(i) || solidAt(world, nx, ny)) continue;
      region.add(i); queue.push(i);
    }
  }
  let best: { x: number; y: number } | null = null, bd = Infinity;
  for (let r = 1; r <= maxR && !best; r++) {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const nx = sx + dx, ny = sy + dy;
      if (solidAt(world, nx, ny) || region.has(ny * W + nx)) continue;
      const d = Math.hypot(dx, dy);
      if (d < bd) { bd = d; best = { x: nx + 0.5, y: ny + 0.5 }; }
    }
  }
  return best;
}

/**
 * Called when something solid has just been put down: any ground enemy or robot standing where it now is gets moved to the
 * nearest free ground beside it, so a building placed on top of a unit can never trap it inside. Flyers are left alone.
 */
export function evictUnits(world: World, e: { x: number; y: number; w: number; h: number; kind: string }): void {
  if (e.kind === 'belt' || e.kind === 'inserter' || e.kind === 'junction' || e.kind === 'splitter') return; // flat: units walk over them
  const inside = (ux: number, uy: number) => ux >= e.x && ux < e.x + e.w && uy >= e.y && uy < e.y + e.h;
  const move = (u: { x: number; y: number; path?: unknown; pathT?: unknown }) => {
    const spot = freeSpot(world, u.x, u.y, 8, 0);
    if (!spot) return;
    u.x = spot.x; u.y = spot.y; u.path = undefined; u.pathT = undefined;
  };
  for (const en of world.enemies) {
    if (en.kind && ENEMY_FLIES(en.kind)) continue;
    if (inside(en.x, en.y)) move(en);
  }
  for (const s of world.soldiers) {
    if (ROBOTS[s.type].flying) continue;
    if (inside(s.x, s.y)) move(s);
  }
}
