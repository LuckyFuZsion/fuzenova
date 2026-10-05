import { describe, expect, it } from 'vitest';
import { stepCombat } from './combat';
import { fieldFor, reachable, reachableSpot, resetFields, routeAhead } from './flowfield';
import { Run } from './round';
import { World, type Enemy } from './world';

const foe = (id: number, x: number, y: number, speed = 2, kind: Enemy['kind'] = 'crawler-1'): Enemy => ({ id, x, y, hp: 1e6, maxHp: 1e6, speed, dmg: 0, born: 0, kind });
const rock = (w: World, x0: number, y0: number, x1: number, y1: number) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) w.terrain[y * w.w + x] = 1; };
const world = () => { const w = new World(100, 100); w.place('core', 48, 48, 0); return w; };
/** runs the fight for up to `secs` seconds and returns how many enemies ended up within 3 tiles of the core */
function arrived(w: World, secs: number): number {
  for (let i = 0; i < secs * 30; i++) { w.time += 1 / 30; stepCombat(w, 1 / 30); }
  return w.enemies.filter((e) => Math.hypot(e.x - 49.5, e.y - 49.5) < 3.5).length;
}

describe('flow field', () => {
  it('every enemy gets round a C-shaped obstacle that hides the core', () => {
    const w = world();
    rock(w, 34, 34, 35, 64); rock(w, 34, 34, 45, 35); rock(w, 34, 63, 45, 64); // a "C" opening to the east: the core sits inside its mouth
    for (let i = 0; i < 12; i++) w.enemies.push(foe(i + 1, 20 + (i % 3), 40 + i * 1.5));
    expect(arrived(w, 90)).toBe(12);
  });

  it('every enemy finds its way through a maze', () => {
    const w = world();
    // three long walls across the map, each with a gap at alternating ends
    rock(w, 15, 25, 85, 26); for (let x = 15; x <= 21; x++) w.terrain[25 * 100 + x] = 0; // gap at the west end
    rock(w, 15, 35, 85, 36); for (let x = 79; x <= 85; x++) w.terrain[35 * 100 + x] = 0; // gap at the east end
    rock(w, 15, 70, 85, 71); for (let x = 15; x <= 21; x++) w.terrain[70 * 100 + x] = 0;
    for (let i = 0; i < 10; i++) w.enemies.push(foe(i + 1, 40 + i * 3, 12));
    expect(arrived(w, 150)).toBe(10);
  });

  it('big enemies keep clear of one-tile gaps; small ones squeeze through', () => {
    const w = world();
    rock(w, 30, 0, 31, 49); rock(w, 30, 51, 31, 99); // a wall with a single one-tile gap at y=50
    expect(reachable(w, 'small', 10, 50)).toBe(true);
    expect(reachable(w, 'big', 10, 50)).toBe(false);
    rock(w, 30, 49, 31, 49); // make it a clear 3-tile gap instead
    for (let y = 48; y <= 52; y++) { w.terrain[y * 100 + 30] = 0; w.terrain[y * 100 + 31] = 0; }
    resetFields(w); // the test changed the rock behind the world's back
    expect(reachable(w, 'big', 10, 50)).toBe(true);
  });

  it('a core sealed in by walls is still reachable: enemies go for the cheapest wall and chew through it', () => {
    const w = world();
    const walls = [];
    for (let x = 45; x <= 53; x++) for (const y of [45, 53]) { const e = w.place('wall', x, y, 0); if (e) walls.push(e); }
    for (let y = 46; y <= 52; y++) for (const x of [45, 53]) { const e = w.place('wall', x, y, 0); if (e) walls.push(e); }
    expect(reachable(w, 'small', 20, 20)).toBe(true);
    w.enemies.push({ ...foe(1, 30, 30, 2), dmg: 40 });
    for (let i = 0; i < 60 * 30; i++) { w.time += 1 / 30; stepCombat(w, 1 / 30); }
    expect(walls.some((e) => e.hp < e.maxHp || !w.entities.has(e.id))).toBe(true);
  });

  it('a wall with a gap is gone round, not through', () => {
    const w = world();
    for (let y = 30; y <= 70; y++) if (y !== 60) w.place('wall', 40, y, 0); // a long wall of buildings, one gap
    const route = routeAhead(w, 'small', 30, 50, 40)!;
    expect(route.length).toBeGreaterThan(10);
    expect(route.some((p) => Math.floor(p.x) === 40 && Math.floor(p.y) === 60)).toBe(true); // it threads the gap
    expect(route.every((p) => !(Math.floor(p.x) === 40 && w.entityAt(40, Math.floor(p.y))))).toBe(true); // and never steps on a wall
  });

  it('the field follows the buildings: placing a wall changes the route after the rebuild delay', () => {
    const w = world();
    const before = fieldFor(w, 'small')![50 * 100 + 30];
    for (let y = 20; y <= 80; y++) w.place('wall', 40, y, 0);
    w.time += 1; // past the rebuild delay
    const after = fieldFor(w, 'small')![50 * 100 + 30];
    expect(after).toBeGreaterThan(before + 5);
  });

  it('snaps a start point out of rock to somewhere the core can be reached from', () => {
    const w = world();
    rock(w, 10, 10, 20, 20);
    expect(reachable(w, 'small', 15, 15)).toBe(false);
    const s = reachableSpot(w, 'small', 15, 15)!;
    expect(reachable(w, 'small', s.x, s.y)).toBe(true);
  });

  it('enemies do not pile onto one tile: a crowd spreads out', () => {
    const w = world();
    for (let i = 0; i < 30; i++) w.enemies.push(foe(i + 1, 30, 30, 0.01)); // all start on the same spot and barely move
    for (let i = 0; i < 5 * 30; i++) { w.time += 1 / 30; stepCombat(w, 1 / 30); }
    const xs = w.enemies.map((e) => e.x), ys = w.enemies.map((e) => e.y);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(1.5);
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(1.5);
  });

  it('a run sends waves that all reach a core hidden behind a wall of rock', () => {
    const w = world();
    rock(w, 20, 35, 80, 36); // a long wall of rock north of the core with a gap at each end
    const run = new Run(w, { buildSeconds: 0, fightSeconds: 600, arenaHalf: 500 });
    run.startFight();
    for (let i = 0; i < 150 * 30; i++) { run.update(1 / 30); if (w.core) w.core.hp = w.core.maxHp; }
    expect(w.enemies.length === 0 || w.enemies.every((e) => e.y > 30)).toBe(true); // none left trapped behind the wall
  });
});

describe('which side a wave comes from', () => {
  it('later waves lean towards the sides that are least defended', async () => {
    const { generateWorld, CORE_TILE } = await import('./mapgen');
    const { plotCandidates, CORE_PLOT_ID } = await import('./plots');
    const w = generateWorld(77);
    w.place('core', CORE_TILE.x, CORE_TILE.y, 0);
    const first = plotCandidates(w.plots!);
    for (const id of first) w.openPlot(id); // open all four neighbours: the explored land is a plus shape
    // pile turrets and walls on the west side
    for (let i = 0; i < 12; i++) w.place('turret', CORE_TILE.x - 14 - (i % 3) * 3, CORE_TILE.y - 6 + Math.floor(i / 3) * 4, 0);
    const run = new Run(w, { buildSeconds: 0, fightSeconds: 600 });
    run.startFight();
    // force "a later wave": the opening wave is a free pick, later ones are weighted
    (run as unknown as { waveIdx: number }).waveIdx = 2;
    let west = 0, other = 0;
    for (let i = 0; i < 400; i++) {
      const a = run.chooseBearing();
      if (Math.cos(a) < -0.7) west++; else other++;
    }
    void CORE_PLOT_ID;
    expect(west).toBeLessThan(other * 0.4); // the defended west gets far fewer than its even share of 1 in 4+
  });

  it('the opening wave of a level is a free pick', async () => {
    const { generateWorld, CORE_TILE } = await import('./mapgen');
    const w = generateWorld(78);
    w.place('core', CORE_TILE.x, CORE_TILE.y, 0);
    const run = new Run(w, { buildSeconds: 0, fightSeconds: 600 });
    run.startFight();
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) seen.add(Math.round(run.chooseBearing() * 10).toString());
    expect(seen.size).toBeGreaterThanOrEqual(3); // all four edges of the single starting square
  });
});

describe('mud and toxic pools', () => {
  it('maps contain both, and every pool and patch stays off the ore and away from the core', async () => {
    const { generateWorld, CORE_TILE } = await import('./mapgen');
    for (const seed of [5, 77, 4242, 31337]) {
      const w = generateWorld(seed);
      let mud = 0, pools = 0;
      for (let i = 0; i < w.w * w.h; i++) {
        if (w.mud[i]) { mud++; expect(w.ore[i]).toBe(0); expect(w.terrain[i]).toBe(0); }
        if (w.terrain[i] === 4) pools++;
      }
      expect(mud).toBeGreaterThan(100);
      expect(pools).toBeGreaterThan(10);
      for (let y = CORE_TILE.y - 4; y < CORE_TILE.y + 7; y++) for (let x = CORE_TILE.x - 4; x < CORE_TILE.x + 7; x++) expect(w.mud[y * w.w + x]).toBe(0);
    }
  });

  it('mud slows enemies and robots on foot, not flyers', () => {
    const w = world();
    for (let y = 30; y < 70; y++) for (let x = 20; x < 40; x++) w.mud[y * 100 + x] = 1;
    w.enemies.push(foe(1, 25, 40, 2), foe(2, 60, 40, 2));                  // one in the mud, one on firm ground
    w.enemies.push(foe(3, 25, 45, 2, 'drone-1'), foe(4, 60, 45, 2, 'drone-1')); // and a flyer in each
    for (let i = 0; i < 2 * 30; i++) { w.time += 1 / 30; stepCombat(w, 1 / 30); }
    const moved = (e: Enemy, x: number, y: number) => Math.hypot(e.x - x, e.y - y);
    const [a, b, c, d] = w.enemies;
    expect(moved(a, 25, 40)).toBeLessThan(moved(b, 60, 40) * 0.8);
    expect(moved(c, 25, 45)).toBeGreaterThan(moved(d, 60, 45) * 0.9);
  });

  it('a toxic pool cannot be built on or walked through', async () => {
    const w = world();
    w.terrain[30 * 100 + 30] = 4;
    expect(w.canPlace('wall', 30, 30)).toBe(false);
    expect(w.hasTerrain(30, 30)).toBe(true);
    const mudTile = 31 * 100 + 31; w.mud[mudTile] = 1;
    expect(w.canPlace('wall', 31, 31)).toBe(true);                         // mud can be built on
  });
});
