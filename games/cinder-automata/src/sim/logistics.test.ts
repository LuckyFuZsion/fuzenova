import { describe, expect, it } from 'vitest';
import { World, footprint, type Belt, type Dir, type ItemId } from './world';

const run = (w: World, s: number) => { for (let i = 0; i < s * 60; i++) w.step(1 / 60); };
const belt = (w: World, x: number, y: number, d: Dir): Belt => { const b = w.place('belt', x, y, d); if (b?.kind !== 'belt') throw new Error('no belt'); return b; };
const load = (b: Belt, type: ItemId, n: number) => { for (let k = 0; k < n; k++) b.items.push({ type, pos: 0.05 + k * 0.25 }); };
const count = (b: Belt) => b.items.length;

describe('crossover', () => {
  it('lets two lines cross without mixing', () => {
    const w = new World(40, 40);
    // an east-going line and a south-going line crossing at (10,10)
    for (const x of [6, 7, 8, 9]) belt(w, x, 10, 0);
    for (const y of [6, 7, 8, 9]) belt(w, 10, y, 1);
    const eastEnd = [11, 12, 13].map((x) => belt(w, x, 10, 0));
    const southEnd = [11, 12, 13].map((y) => belt(w, 10, y, 1));
    expect(w.place('junction', 10, 10, 0)).not.toBeNull();
    load(w.entityAt(6, 10) as Belt, 'iron-ore', 3);
    load(w.entityAt(10, 6) as Belt, 'copper-ore', 3);
    run(w, 20);
    const east = eastEnd.flatMap((b) => b.items.map((i) => i.type));
    const south = southEnd.flatMap((b) => b.items.map((i) => i.type));
    expect(east.sort()).toEqual(['iron-ore', 'iron-ore', 'iron-ore']);
    expect(south.sort()).toEqual(['copper-ore', 'copper-ore', 'copper-ore']);
  });
});

describe('splitter and merger', () => {
  it('turns with the flow: long across it', () => {
    expect(footprint('splitter', 0)).toEqual({ w: 1, h: 2 });
    expect(footprint('splitter', 1)).toEqual({ w: 2, h: 1 });
    const w = new World(20, 20);
    const s = w.place('splitter', 5, 5, 1)!;
    expect([s.w, s.h]).toEqual([2, 1]);
    expect(w.entityAt(6, 5)?.id).toBe(s.id);
  });

  it('splits one belt between two, evenly', () => {
    const w = new World(40, 40);
    const inBelt = belt(w, 9, 10, 0);
    expect(w.place('splitter', 10, 10, 0)).not.toBeNull(); // covers (10,10) and (10,11)
    const outA = [11, 12, 13].map((x) => belt(w, x, 10, 0)), outB = [11, 12, 13].map((x) => belt(w, x, 11, 0));
    load(inBelt, 'iron-plate', 4);
    for (let k = 0; k < 12; k++) { run(w, 3); if (count(inBelt) < 4) load(inBelt, 'iron-plate', 4 - count(inBelt)); }
    const a = outA.reduce((n, b) => n + count(b), 0), b = outB.reduce((n, bb) => n + count(bb), 0);
    expect(a).toBeGreaterThan(0);
    expect(b).toBeGreaterThan(0);
    expect(Math.abs(a - b)).toBeLessThanOrEqual(2);
  });

  it('sends everything to the other side when one exit is missing (and so merges two belts into one)', () => {
    const w = new World(40, 40);
    const in1 = belt(w, 9, 10, 0), in2 = belt(w, 9, 11, 0);
    w.place('splitter', 10, 10, 0);
    const out = [11, 12, 13].map((x) => belt(w, x, 10, 0)); // only the top exit exists
    load(in1, 'iron-ore', 3);
    load(in2, 'copper-ore', 3);
    run(w, 30);
    const got = out.flatMap((b) => b.items.map((i) => i.type));
    expect(got.length).toBe(6);                  // nothing lost, nothing duplicated
    expect(got.filter((t) => t === 'iron-ore').length).toBe(3);
    expect(got.filter((t) => t === 'copper-ore').length).toBe(3);
  });

  it('only takes items from behind', () => {
    const w = new World(40, 40);
    w.place('splitter', 10, 10, 0);
    const side = belt(w, 10, 9, 1); // a belt above it pointing down into its side
    load(side, 'iron-ore', 2);
    run(w, 10);
    expect(count(side)).toBe(2);
  });
});
