import { describe, expect, it } from 'vitest';
import { World, footprint, minerContacts, type Dir } from './world';

function oreWorld(): World {
  const w = new World(30, 12);
  for (const [x, y] of [[5, 5], [6, 5], [5, 6], [6, 6], [7, 5], [7, 6]]) { w.ore[y * 30 + x] = 1; w.oreLeft[y * 30 + x] = 100; }
  return w;
}
const run = (w: World, s: number) => { for (let i = 0; i < s * 60; i++) w.step(1 / 60); };

describe('drill shape', () => {
  it('is 3 long and 2 across, and turning it swaps the two', () => {
    expect(footprint('miner', 1)).toEqual({ w: 3, h: 2 }); // facing south or north: wide
    expect(footprint('miner', 3)).toEqual({ w: 3, h: 2 });
    expect(footprint('miner', 0)).toEqual({ w: 2, h: 3 }); // facing east or west: tall
    expect(footprint('miner', 2)).toEqual({ w: 2, h: 3 });
  });

  it('lets ore out only from the middle of its two long sides', () => {
    const wide = minerContacts({ x: 5, y: 5, w: 3, h: 2, dir: 1 });
    expect(wide.map((c) => [c.x, c.y, c.side])).toEqual([[6, 7, 1], [6, 4, 3]]); // middle of the bottom edge first (it faces south)
    const tall = minerContacts({ x: 5, y: 5, w: 2, h: 3, dir: 2 });
    expect(tall.map((c) => [c.x, c.y, c.side])).toEqual([[4, 6, 2], [7, 6, 0]]);
  });
});

describe('drill output', () => {
  it('feeds a belt at the middle port on the far side, and turns to face it', () => {
    const w = oreWorld();
    const m = w.place('miner', 5, 5, 3 as Dir); // faces north...
    const belt = w.place('belt', 6, 7, 1); // ...but the belt is at the middle of the bottom edge
    if (m?.kind !== 'miner' || belt?.kind !== 'belt') throw new Error('setup');
    run(w, 4);
    expect(belt.items.length).toBeGreaterThan(0);
    expect(m.dir).toBe(1);
  });

  it('does not feed a belt at the corner of a long side, only the middle', () => {
    const w = oreWorld();
    const m = w.place('miner', 5, 5, 1 as Dir);
    const corner = w.place('belt', 5, 7, 1);
    if (m?.kind !== 'miner' || corner?.kind !== 'belt') throw new Error('setup');
    run(w, 4);
    expect(corner.items.length).toBe(0);
    expect(m.pending).not.toBeNull(); // holding its ore, waiting for a belt at the port
  });

  it('feeds a smelter that touches the middle port', () => {
    const w = oreWorld();
    const m = w.place('miner', 5, 5, 3 as Dir);
    const f = w.place('furnace', 6, 7, 0); // covers (6,7)-(7,8)
    if (m?.kind !== 'miner' || f?.kind !== 'furnace') throw new Error('setup');
    run(w, 4);
    expect(f.inCount + f.outCount).toBeGreaterThan(0);
    expect(m.dir).toBe(1);
  });

  it('does not push ore onto a belt that is heading into the drill', () => {
    const w = oreWorld();
    const m = w.place('miner', 5, 5, 1 as Dir);
    const inbound = w.place('belt', 6, 4, 1); // points south, into the drill
    const outbound = w.place('belt', 6, 7, 1);
    if (m?.kind !== 'miner' || inbound?.kind !== 'belt' || outbound?.kind !== 'belt') throw new Error('setup');
    run(w, 4);
    expect(inbound.items.length).toBe(0);
    expect(outbound.items.length).toBeGreaterThan(0);
  });

  it('still runs a 2x2 drill from an older save the old way', () => {
    const w = oreWorld();
    const m = w.place('miner', 5, 5, 0 as Dir)!;
    if (m.kind !== 'miner') throw new Error('setup');
    m.w = 2; m.h = 2; // as it would be restored from an old save
    expect(minerContacts(m).length).toBe(8); // every tile round it, as before
  });
});

describe('drill with two belts', () => {
  it('shares its ore between both sides instead of using only one', () => {
    const w = oreWorld();
    const m = w.place('miner', 5, 5, 1 as Dir);
    const down = w.place('belt', 6, 7, 1); // below the middle
    const up = w.place('belt', 6, 4, 3); // above the middle
    if (m?.kind !== 'miner' || down?.kind !== 'belt' || up?.kind !== 'belt') throw new Error('setup');
    let a = 0, b = 0;
    for (let i = 0; i < 30 * 60; i++) { w.step(1 / 60); if (i % 10 === 0) { a += down.items.length; down.items = []; b += up.items.length; up.items = []; } }
    expect(a).toBeGreaterThan(3);
    expect(b).toBeGreaterThan(3);
  });
});
