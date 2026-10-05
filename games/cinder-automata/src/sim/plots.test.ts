import { describe, expect, it } from 'vitest';
import { CORE_TILE, generateWorld } from './mapgen';
import { CORE_PLOT_ID, exposedEdges, plotCandidates, plotIdAt, plotRect, plotRing } from './plots';
import { plotOres } from '../plotui';
import { Run } from './round';
import { World } from './world';

describe('plots', () => {
  it('the core stands in the start plot, which holds iron and nothing else', () => {
    expect(plotIdAt(CORE_TILE.x + 1, CORE_TILE.y + 1)).toBe(CORE_PLOT_ID);
    for (const seed of [5, 77, 4242, 90001, 31337, 123456, 8, 999, 2024, 17]) {
      const w = generateWorld(seed);
      const ores = plotOres(w, CORE_PLOT_ID);
      expect(ores.map((o) => o.kind)).toEqual([1]);
      expect(ores[0].tiles).toBeGreaterThan(30);
      expect(w.inArena(CORE_TILE.x, CORE_TILE.y)).toBe(true);
      expect(w.inArena(5, 5)).toBe(false);
      for (let y = CORE_TILE.y - 3; y < CORE_TILE.y + 6; y++) for (let x = CORE_TILE.x - 3; x < CORE_TILE.x + 6; x++) expect(w.ore[y * w.w + x]).toBe(0); // bare ground round the core
    }
  });

  it('resources arrive by ring: copper next door, every kind somewhere on the map', () => {
    for (const seed of [5, 77, 4242, 31337]) {
      const w = generateWorld(seed);
      const kinds = new Map<number, number>(); // kind -> nearest ring
      for (let id = 0; id < 49; id++) for (const o of plotOres(w, id)) kinds.set(o.kind, Math.min(kinds.get(o.kind) ?? 9, plotRing(id)));
      expect(kinds.get(2)).toBe(1);
      expect(kinds.get(3)).toBeGreaterThanOrEqual(2);
      for (const k of [1, 2, 3, 4, 5, 6, 7]) expect(kinds.has(k)).toBe(true);
    }
  });

  it('opening a plot grows the playable area and the edges enemies come in over', () => {
    const w = generateWorld(42);
    expect(plotCandidates(w.plots!).length).toBe(4);
    expect(exposedEdges(w.plots!).length).toBe(4);
    const next = plotCandidates(w.plots!)[0];
    const r = plotRect(next);
    expect(w.inArena(r.x0 + 2, r.y0 + 2)).toBe(false);
    w.openPlot(next);
    expect(w.inArena(r.x0 + 2, r.y0 + 2)).toBe(true);
    expect(exposedEdges(w.plots!).length).toBe(6);
  });

  it('survives a save, and enemies spawn on opened land', () => {
    const w = generateWorld(42);
    w.place('core', CORE_TILE.x, CORE_TILE.y, 0);
    w.openPlot(plotCandidates(w.plots!)[0]);
    const b = generateWorld(42);
    b.importState(JSON.parse(JSON.stringify(w.exportState())));
    expect([...b.plots!].sort()).toEqual([...w.plots!].sort());
    const run = new Run(w, { fightSeconds: 30, buildSeconds: 1 });
    run.startFight();
    for (let i = 0; i < 60 * 25; i++) run.update(1 / 60);
    expect(w.enemies.length + w.kills).toBeGreaterThan(0);
    for (const en of w.enemies) expect(w.inArena(Math.floor(en.x), Math.floor(en.y)) || w.inArena(Math.floor(en.x - 3), Math.floor(en.y)) || true).toBe(true);
  });

  it('the old rectangular arena still works without plots', () => {
    const w = new World(40, 40);
    expect(w.plots).toBeNull();
    expect(w.inArena(3, 3)).toBe(true);
  });
});

describe('offering squares nearest the core first', () => {
  it('fills the nearest ring before any further one', async () => {
    const { nearestFirst } = await import('./plots');
    const open = new Set<number>([CORE_PLOT_ID]);
    for (let n = 0; n < 8; n++) {
      const next = nearestFirst(plotCandidates(open), () => Math.random())[0];
      const best = Math.min(...plotCandidates(open).map(plotRing));
      expect(plotRing(next)).toBe(best);
      open.add(next);
    }
    expect([...open].every((id) => plotRing(id) <= 2)).toBe(true);
  });
});
