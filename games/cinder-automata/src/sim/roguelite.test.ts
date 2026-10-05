import { describe, expect, it } from 'vitest';
import { CORE_TILE, generateWorld } from './mapgen';
import { BOONS, OMENS, boonById, omenFor, rollBoons } from './roguelite';
import { bumpLevel } from './research';
import { Run } from './round';

const nearest = (w: ReturnType<typeof generateWorld>, type: number): number => {
  const cx = CORE_TILE.x + 1.5, cy = CORE_TILE.y + 1.5;
  let best = 1e9;
  for (let y = 0; y < w.h; y++) for (let x = 0; x < w.w; x++) if (w.ore[y * w.w + x] === type) best = Math.min(best, Math.hypot(x - cx, y - cy));
  return best;
};

describe('run seeds', () => {
  it('give different maps, with iron and copper close to the core on every one', () => {
    const maps = new Set<string>();
    for (const seed of [5, 77, 4242, 90001, 31337, 123456, 8, 999]) {
      const w = generateWorld(seed);
      maps.add(Array.from(w.ore.slice(0, 20000)).join(''));
      expect(nearest(w, 1)).toBeLessThan(16);
      expect(nearest(w, 2)).toBeLessThan(32);
      for (const t of [3, 4, 5, 6, 7]) expect(nearest(w, t)).toBeLessThan(100); // everything the ammo chain needs exists
    }
    expect(maps.size).toBe(8);
  });

  it('the same seed gives the same map', () => {
    expect(Array.from(generateWorld(321).ore)).toEqual(Array.from(generateWorld(321).ore));
  });
});

describe('omens', () => {
  it('are deterministic, never on level 1, and cover several kinds over a run', () => {
    expect(omenFor(555, 1)).toBeNull();
    const seen = new Set<string>();
    for (let l = 2; l <= 40; l++) {
      expect(omenFor(555, l)?.id).toBe(omenFor(555, l)?.id);
      const o = omenFor(555, l);
      if (o) seen.add(o.id);
    }
    expect(seen.size).toBeGreaterThanOrEqual(5);
  });

  it('change the size of the wave', () => {
    const w = generateWorld(9);
    const plain = new Run(w, { omens: false });
    plain.level = 6;
    const base = plain.toSpawn();
    const swarm = OMENS.find((o) => o.id === 'swarm')!;
    let level = 0;
    for (let l = 2; l < 400 && !level; l++) if (omenFor(9, l)?.id === swarm.id) level = l;
    const run = new Run(w, { omens: true });
    run.level = level;
    const off = new Run(w, { omens: false });
    off.level = level;
    expect(run.toSpawn()).toBeGreaterThan(off.toSpawn());
    expect(base).toBeGreaterThan(0);
  });
});

describe('boons', () => {
  it('offers three different boons, the same three for the same seed and level', () => {
    const a = rollBoons(12, 4).map((b) => b.id);
    expect(new Set(a).size).toBe(3);
    expect(rollBoons(12, 4).map((b) => b.id)).toEqual(a);
    expect(rollBoons(12, 5).map((b) => b.id)).not.toEqual(a);
  });

  it('stacking boons raise the multipliers, and instant boons pay out', () => {
    const w = generateWorld(3);
    w.place('core', CORE_TILE.x, CORE_TILE.y, 0);
    const before = w.rfx.turretDmg;
    bumpLevel(w, 'boon-dmg');
    expect(w.rfx.turretDmg).toBeCloseTo(before + 0.05, 5);
    const iron = w.stock['iron-plate'] ?? 0;
    boonById('windfall')!.apply!(w);
    expect(w.stock['iron-plate']).toBe(iron + 50);
    const n = w.soldiers.length;
    boonById('scouts')!.apply!(w);
    expect(w.soldiers.length).toBe(n + 2);
    expect(BOONS.every((b) => b.kind === 'stack' || b.apply)).toBe(true);
  });
});
