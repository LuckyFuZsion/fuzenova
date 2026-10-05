import { describe, expect, it } from 'vitest';
import { World, type Belt, type Inserter } from './world';

describe('scrap bin', () => {
  it('destroys only what its filtered inserter takes, leaving the rest on the belt', () => {
    const w = new World(40, 40);
    const belt = w.place('belt', 10, 10, 0) as Belt;
    belt.items.push({ type: 'gunpowder', pos: 0.5, j: 0 }, { type: 'iron-plate', pos: 0.1, j: 0 });
    const ins = w.place('inserter', 10, 11, 1) as Inserter; // takes from the belt above, drops below
    ins.filter = 'gunpowder';
    const bin = w.place('scrapbin', 10, 12, 0);
    expect(bin).not.toBeNull();
    for (let i = 0; i < 300; i++) w.step(1 / 30);
    expect((bin as { burned: number }).burned).toBe(1);
    expect(belt.items.map((i) => i.type)).toEqual(['iron-plate']);
  });
});
