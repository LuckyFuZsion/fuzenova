import { describe, expect, it } from 'vitest';
import { stepCombat } from './combat';
import { World, accepts, insert, type Belt, type Turret } from './world';

describe('turrets sharing one belt', () => {
  it('share a scarce supply instead of the first filling up before the next gets any', () => {
    const w = new World(60, 30);
    w.place('core', 50, 20, 0);
    for (let x = 3; x < 19; x++) w.place('belt', x, 10, 0);
    const a = w.place('turret', 8, 11, 0) as Turret, b = w.place('turret', 17, 11, 0) as Turret;
    a.ammo = b.ammo = 0;
    const first = w.entityAt(3, 10) as Belt;
    let fed = 0;
    for (let i = 0; i < 40 * 30; i++) {
      if (fed < 10 && i % 15 === 0 && accepts(first, 'iron-plate', 0)) { insert(first, 'iron-plate', 0); fed++; }
      w.step(1 / 30); stepCombat(w, 1 / 30);
    }
    expect(fed).toBe(10);
    expect(a.ammo + b.ammo).toBe(40);                     // all ten plates ended up in a turret
    expect(Math.abs(a.ammo - b.ammo)).toBeLessThanOrEqual(4);  // shared out, not 40 against 0
  });
});
