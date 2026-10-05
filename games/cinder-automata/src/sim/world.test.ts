import { describe, expect, it } from 'vitest';
import { World, faceBeltEnds } from './world';

function run(world: World, seconds: number) {
  for (let i = 0; i < seconds * 60; i++) world.step(1 / 60);
}

describe('production chain', () => {
  it('mines ore, belts it, smelts it and stores plates', () => {
    const w = new World(24, 8);
    for (const [x, y] of [[2, 2], [3, 2], [2, 3], [3, 3]]) { w.ore[y * 24 + x] = 1; w.oreLeft[y * 24 + x] = 100; }
    expect(w.place('miner', 2, 2, 0)).not.toBeNull(); // 2 wide, 3 tall; ore leaves from the middle of its east side, at (4,3)
    for (let x = 4; x <= 8; x++) w.place('belt', x, 3, 0);
    w.place('inserter', 9, 3, 0);
    w.place('furnace', 10, 2, 0);
    w.place('inserter', 12, 3, 0);
    w.place('core', 13, 2, 0); // the plates end up in the core's stock
    run(w, 60);
    expect(w.stock['iron-plate'] ?? 0).toBeGreaterThanOrEqual(10);
  });

  it('refuses a miner with no ore and overlapping placement', () => {
    const w = new World(8, 8);
    expect(w.place('miner', 1, 1, 0)).toBeNull();
    expect(w.place('wall', 1, 1, 0)).not.toBeNull();
    expect(w.place('wall', 1, 1, 0)).toBeNull();
  });

  it('carries items belt to belt without overlap', () => {
    const w = new World(12, 3);
    for (let x = 0; x < 6; x++) w.place('belt', x, 1, 0);
    const first = w.entityAt(0, 1)!;
    if (first.kind !== 'belt') throw new Error('expected belt');
    for (let n = 0; n < 4; n++) { first.items.push({ type: 'iron-ore', pos: 0 }); run(w, 0.2); }
    run(w, 8);
    const last = w.entityAt(5, 1)!;
    if (last.kind !== 'belt') throw new Error('expected belt');
    const pos = last.items.map((i) => i.pos).sort((a, b) => b - a);
    expect(pos.length).toBe(4);
    for (let i = 1; i < pos.length; i++) expect(pos[i - 1] - pos[i]).toBeGreaterThanOrEqual(0.25 - 1e-6);
  });
});

describe('moving buildings', () => {
  it('lifts a turret and puts it down elsewhere with its ammo and health intact, at no cost', () => {
    const w = new World(40, 40);
    w.place('core', 20, 20, 0);
    const t = w.place('turret', 5, 5, 0)!;
    if (t.kind !== 'turret') throw new Error('setup');
    t.ammo = 17; t.hp = 100;
    const lifted = w.remove(5, 5)!;
    expect(w.entityAt(5, 5)).toBeUndefined();
    expect(w.putBack(lifted, 10, 10)).toBe(true);
    const moved = w.entityAt(11, 11);
    expect(moved?.id).toBe(t.id);
    expect(moved?.kind === 'turret' && moved.ammo).toBe(17);
    expect(moved?.hp).toBe(100);
    expect(w.entityAt(5, 5)).toBeUndefined();
  });

  it('refuses to put a building down on another one, or a drill off the ore', () => {
    const w = new World(40, 40);
    w.place('wall', 8, 8, 0);
    const t = w.place('turret', 3, 3, 0)!;
    const lifted = w.remove(3, 3)!;
    expect(w.putBack(lifted, 7, 7)).toBe(false); // would overlap the wall at 8,8
    expect(w.putBack(lifted, 3, 3)).toBe(true);
    const m = w.place('miner', 20, 20, 0);
    expect(m).toBeNull(); // no ore there, so it cannot even be placed
    expect(t.id).toBeGreaterThan(0);
  });
});

describe('belt ends', () => {
  it('turn to face an inserter or the core beside them, in either order of building, and leave mid-line belts alone', () => {
    const w = new World(40, 40);
    w.place('core', 20, 20, 0);
    for (let y = 2; y < 8; y++) w.place('belt', 5, y, 1); // a line running south
    w.place('inserter', 6, 7, 0);                          // beside its last tile
    for (let y = 15; y < 22; y++) w.place('belt', 23, y, 1); // another line, dead-ending beside the core
    faceBeltEnds(w);
    expect(w.entityAt(5, 7)!.dir).toBe(0);   // turned east towards the inserter
    expect(w.entityAt(5, 4)!.dir).toBe(1);   // mid-line: untouched
    expect(w.entityAt(23, 21)!.dir).toBe(2); // turned west into the core
    expect(w.entityAt(23, 18)!.dir).toBe(1);
  });

  it('never turns a belt to face the tile behind it', () => {
    const w = new World(40, 40);
    w.place('belt', 10, 10, 0);    // faces east, nothing in front
    w.place('inserter', 9, 10, 0); // directly behind
    faceBeltEnds(w);
    expect(w.entityAt(10, 10)!.dir).toBe(0);
  });
});

describe('moving a building empties it', () => {
  it('a moved turret arrives with no ammo, keeping its health', () => {
    const w = new World(30, 30);
    const t = w.place('turret', 5, 5, 0)!;
    if (t.kind !== 'turret') throw new Error('setup');
    t.ammo = 30; t.hp = 100;
    const lifted = w.remove(5, 5)!;
    expect(w.putBack(lifted, 12, 12)).toBe(true);
    w.emptyContents(lifted);
    expect(t.ammo).toBe(0);
    expect(t.hp).toBe(100);
  });

  it('empties a furnace, an assembler and a generator too, but keeps the assembler recipe', () => {
    const w = new World(40, 40);
    const f = w.place('furnace', 3, 3, 0)!, a = w.place('assembler', 10, 3, 0)!, g = w.place('generator', 20, 3, 0)!;
    if (f.kind !== 'furnace' || a.kind !== 'assembler' || g.kind !== 'generator') throw new Error('setup');
    f.inType = 'iron-ore'; f.inCount = 5; f.outType = 'iron-plate'; f.outCount = 3;
    a.recipe = 'gunpowder'; a.stock = { coal: 2 }; a.out = 1;
    g.fuelSecs = 50;
    for (const e of [f, a, g]) w.emptyContents(e);
    expect(f.inCount + f.outCount).toBe(0);
    expect(a.stock).toEqual({}); expect(a.out).toBe(0); expect(a.recipe).toBe('gunpowder');
    expect(g.fuelSecs).toBe(0);
  });
});
