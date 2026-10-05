import { describe, expect, it } from 'vitest';
import { problemOf } from './status';
import { World } from './world';

function ore(w: World, x: number, y: number, n = 2) {
  for (let dy = 0; dy < n; dy++) for (let dx = 0; dx < n; dx++) { w.ore[(y + dy) * w.w + x + dx] = 1; w.oreLeft[(y + dy) * w.w + x + dx] = 50; }
}

describe('placement problems', () => {
  it('flags a drill beside a turret as a wrong connection', () => {
    const w = new World(40, 40);
    ore(w, 5, 5);
    const d = w.place('miner', 5, 5, 0)!;
    w.place('turret', 7, 5, 0); // covers (7,5)-(8,6), which includes the middle port at (7,6)
    const p = problemOf(w, d);
    expect(p?.level).toBe('error');
    expect(p?.text).toContain('iron ore');
  });

  it('flags a drill with nothing beside it, and clears once a belt is attached', () => {
    const w = new World(40, 40);
    ore(w, 5, 5);
    const d = w.place('miner', 5, 5, 0)!;
    expect(problemOf(w, d)?.level).toBe('warn');
    w.place('belt', 7, 5, 0); // beside the drill, but not at its middle port: still nothing attached
    expect(problemOf(w, d)?.level).toBe('warn');
    w.place('belt', 7, 6, 0);  // the middle of its east side
    expect(problemOf(w, d)).toBeNull();
  });

  it('accepts a drill feeding a smelter, but not a smelter with plates going into a drill line wrongly', () => {
    const w = new World(40, 40);
    ore(w, 5, 5);
    const d = w.place('miner', 5, 5, 0)!;
    w.place('furnace', 7, 5, 0);
    expect(problemOf(w, d)).toBeNull();
  });

  it('flags an empty turret and clears when it has ammo', () => {
    const w = new World(40, 40);
    const t = w.place('turret', 10, 10, 0)!;
    expect(problemOf(w, t)?.level).toBe('warn');
    if (t.kind === 'turret') t.ammo = 5;
    expect(problemOf(w, t)).toBeNull();
  });

  it('flags a belt dead end holding items nobody takes, but not one feeding a turret', () => {
    const w = new World(40, 40);
    const b = w.place('belt', 10, 10, 0)!;
    if (b.kind !== 'belt') throw new Error('setup');
    b.items.push({ type: 'iron-ore', pos: 1 });
    expect(problemOf(w, b)?.text).toContain('Dead end');
    const w2 = new World(40, 40);
    const b2 = w2.place('belt', 10, 10, 0)!;
    if (b2.kind !== 'belt') throw new Error('setup');
    b2.items.push({ type: 'iron-ore', pos: 1 });
    w2.place('turret', 11, 10, 0);
    expect(problemOf(w2, b2)?.text ?? 'dead end').toContain('Dead end'); // ore is not ammo, so the turret cannot help
    b2.items[0].type = 'iron-plate';
    expect(problemOf(w2, b2)).toBeNull();
  });
});
