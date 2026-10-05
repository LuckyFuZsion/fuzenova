import { describe, expect, it } from 'vitest';
import { stepCombat } from './combat';
import { updatePower } from './power';
import { World, type Coil, type Enemy, type Generator } from './world';

const foe = (id: number, x: number, y: number, hp = 1000): Enemy => ({ id, x, y, hp, maxHp: hp, speed: 0, dmg: 0, born: 0 });
const tick = (w: World, s: number) => { for (let i = 0; i < s * 30; i++) { w.step(1 / 30); stepCombat(w, 1 / 30); } };

/** generator - pole - coil, all close together; returns the pieces */
function grid(fuel = 60) {
  const w = new World(80, 80);
  w.place('core', 60, 60, 0);
  const gen = w.place('generator', 10, 10, 0) as Generator;
  w.place('pole', 12, 13, 0);
  const coil = w.place('coil', 14, 10, 0) as Coil;
  gen.fuelSecs = fuel;
  return { w, gen, coil };
}

describe('power and the storm coil', () => {
  it('a wired coil with a fuelled generator hits enemies, and the lightning jumps between them', () => {
    const { w, coil } = grid();
    coil.charge = 200; // charged up: a new coil needs about ten seconds on the network first
    w.enemies.push(foe(1, 19, 11), foe(2, 20.5, 12), foe(3, 21.5, 13.5), foe(4, 40, 40));
    tick(w, 2);
    expect(w.enemies[0].hp).toBeLessThan(1000);
    expect(w.enemies[1].hp).toBeLessThan(1000);
    expect(w.enemies[2].hp).toBeLessThan(1000);
    expect(w.enemies[3].hp).toBe(1000); // out of range and out of jumping distance
    expect(w.enemies[0].hp).toBeLessThan(w.enemies[1].hp); // each hop hits for less
  });

  it('does nothing without a pole connecting it', () => {
    const w = new World(80, 80);
    w.place('core', 60, 60, 0);
    const gen = w.place('generator', 10, 10, 0) as Generator;
    w.place('coil', 14, 10, 0);
    gen.fuelSecs = 60;
    w.enemies.push(foe(1, 19, 11));
    tick(w, 3);
    expect(w.enemies[0].hp).toBe(1000);
  });

  it('does nothing when the generator has no fuel', () => {
    const { w } = grid(0);
    w.enemies.push(foe(1, 19, 11));
    tick(w, 3);
    expect(w.enemies[0].hp).toBe(1000);
  });

  it('burns fuel only while the world is running, and runs dry', () => {
    const { w, gen } = grid(10);
    tick(w, 4);
    expect(gen.fuelSecs).toBeLessThan(7);
    tick(w, 10);
    expect(gen.fuelSecs).toBe(0);
    expect(updatePower(w).supply).toBe(0);
  });

  it('an inserter loads a generator with coal, up to a limit', () => {
    const w = new World(40, 20);
    const src = w.place('belt', 2, 5, 2)!; // a supply that is topped up with coal (and a stray plate, which it must ignore)
    if (src.kind !== 'belt') throw new Error('setup');
    w.place('inserter', 3, 5, 0);
    const gen = w.place('generator', 4, 5, 0) as Generator;
    for (let i = 0; i < 60 * 60; i++) {
      if (i % 30 === 0 && !src.items.some((it) => it.type === 'coal')) src.items.push({ type: 'coal', pos: 1 });
      if (i === 0) src.items.push({ type: 'iron-plate', pos: 0.5 });
      w.step(1 / 60);
    }
    expect(gen.fuelSecs).toBeGreaterThan(60);
    expect(gen.fuelSecs).toBeLessThanOrEqual(120);
  });

  it('a coil charges up to 200 from the network, then draws almost nothing', () => {
    const { w, coil } = grid();
    coil.charge = 0;
    tick(w, 1);
    expect(coil.charge).toBeGreaterThan(15);          // charging at about 20 a second
    expect(coil.use).toBeGreaterThan(40);             // and asking for a lot of power while it does
    tick(w, 16);
    expect(coil.charge).toBeCloseTo(200, 3);                    // full, and no more
    tick(w, 0.2);
    expect(coil.use).toBeLessThan(5);                 // a full coil sips power
  });

  it('every bolt spends charge, so a coil fires a burst and then only as fast as it recharges', () => {
    const { w, coil } = grid();
    coil.charge = 200;
    w.enemies.push(foe(1, 19, 11, 1e6));
    const before = coil.charge;
    tick(w, 1.4);                                     // one bolt (cooldown 1.3 s)
    expect(coil.charge).toBeLessThan(before);         // it spent some, less what it recharged meanwhile
    expect(1e6 - w.enemies[0].hp).toBeGreaterThan(0);
    coil.charge = 10;                                 // nearly empty: not enough for a bolt yet
    const hp = w.enemies[0].hp;
    tick(w, 0.3);
    expect(w.enemies[0].hp).toBe(hp);
  });

  it('a network short of power recharges its coils slower, it does not weaken the bolts', () => {
    const solo = grid();
    solo.coil.charge = 0;
    tick(solo.w, 1);
    const gainSolo = solo.coil.charge;

    const shared = grid();                            // a second coil on the same generator: demand 120 against 100 supply
    const other = shared.w.place('coil', 14, 14, 0) as Coil;
    shared.coil.charge = 0; other.charge = 0;
    tick(shared.w, 1);
    expect(shared.w.power!.sat.get(0)!).toBeLessThan(1);
    expect(shared.coil.charge).toBeLessThan(gainSolo);
  });

  it('poles link across a gap up to their reach, not beyond', () => {
    const w = new World(80, 20);
    w.place('pole', 5, 5, 0); w.place('pole', 11, 5, 0); w.place('pole', 30, 5, 0);
    const p = updatePower(w);
    expect(p.links.length).toBe(1);
    expect(new Set(p.netOf.values()).size).toBe(2);
  });
});
