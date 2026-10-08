import { describe, expect, it } from 'vitest';
import { stepCombat } from './combat';
import { addOrePatch } from './mapgen';
import { RECIPE_LIST } from './items';
import { World, type Assembler, type Belt, type ItemId } from './world';

const run = (w: World, s: number) => { for (let i = 0; i < s * 60; i++) w.step(1 / 60); };

/** a belt that keeps being topped up -> inserter -> assembler -> inserter -> core, all in a row, west to east */
function line(recipe: string, feed: Partial<Record<ItemId, number>>) {
  const w = new World(40, 12);
  const src = w.place('belt', 2, 5, 2) as Belt; // points west into nothing: whatever is on it waits at the end for the inserter
  w.place('inserter', 3, 5, 0);
  const a = w.place('assembler', 4, 4, 0) as Assembler;
  w.place('inserter', 7, 5, 0);
  const dst = w.place('belt', 8, 5, 0) as Belt; // the product waits on this belt (the core would refuse it: it only takes plates and science packs)
  a.recipe = recipe;
  const topUp = () => {
    for (const k of Object.keys(feed) as ItemId[]) {
      if (src.items.some((i) => i.type === k)) continue;
      for (const pos of [1, 0.75, 0.5, 0.25, 0]) if (src.items.every((i) => Math.abs(i.pos - pos) >= 0.25)) { src.items.push({ type: k, pos }); src.items.sort((p, q) => q.pos - p.pos); break; }
    }
  };
  return { w, a, dst, fed: (s: number) => { for (let i = 0; i < s * 60; i++) { if (i % 30 === 0) topUp(); w.step(1 / 60); } } };
}

describe('ammo chain', () => {
  it('has the recipes that were designed', () => {
    const ids = RECIPE_LIST.map((r) => r.id);
    for (const id of ['gunpowder', 'bullet', 'bronze', 'steel', 'shell-casing', 'artillery-shell']) expect(ids).toContain(id);
  });

  it('an assembler turns two inputs into gunpowder and an inserter carries it out', () => {
    const { fed, dst } = line('gunpowder', { coal: 10, sulfur: 10 });
    fed(40);
    expect(dst.items.filter((i) => i.type === 'gunpowder').length).toBeGreaterThan(0);
  });

  it('waits when an ingredient is missing', () => {
    const { fed, a, dst } = line('gunpowder', { coal: 10 }); // no sulfur
    fed(20);
    expect(dst.items.filter((i) => i.type === 'gunpowder').length).toBe(0);
    expect(a.progress).toBe(0);
  });

  it('a smelter turns wood into charcoal', () => {
    const w = new World(20, 10);
    const f = w.place('furnace', 5, 4, 0)!;
    if (f.kind !== 'furnace') throw new Error('setup');
    f.inType = 'wood'; f.inCount = 2;
    run(w, 8);
    expect(f.outType).toBe('charcoal');
    expect(f.outCount).toBeGreaterThan(0);
  });

  it('bullets hit harder than iron plates', () => {
    const w = new World(60, 60);
    w.place('core', 28, 40, 0);
    const a = w.place('turret', 20, 20, 0)!, b = w.place('turret', 40, 20, 0)!;
    const p = w.place('belt', 22, 20, 2)!, q = w.place('belt', 42, 20, 2)!;
    if (a.kind !== 'turret' || b.kind !== 'turret' || p.kind !== 'belt' || q.kind !== 'belt') throw new Error('setup');
    p.items.push({ type: 'iron-plate', pos: 0.5 });
    q.items.push({ type: 'bullet', pos: 0.5 });
    for (let i = 0; i < 30; i++) stepCombat(w, 1 / 30);
    expect(a.ammo).toBe(4);
    expect(b.ammo).toBe(10);
    expect(b.dmg).toBeGreaterThan(a.dmg);
  });

  it('a resource module stamps a patch, and never on top of a building', () => {
    const w = new World(60, 60);
    w.place('wall', 30, 30, 0);
    const n = addOrePatch(w, 5, 30, 30, 4.2, 1, 1.5);
    expect(n).toBeGreaterThan(20);
    expect(w.ore[30 * 60 + 30]).toBe(0); // the building's tile stays clear
    expect(w.ore[30 * 60 + 32]).toBe(5);
    expect(w.oreLeft[30 * 60 + 32]).toBeGreaterThan(300);
  });
});

describe('the core only takes what can be spent', () => {
  it('refuses ore and ammunition, accepts plates and science packs', async () => {
    const { accepts } = await import('./world');
    const w = new World(20, 20);
    const core = w.place('core', 5, 5, 0)!;
    for (const ok of ['iron-plate', 'copper-plate', 'science-projectile', 'science-em', 'science-robotics'] as const) expect(accepts(core, ok)).toBe(true);
    for (const no of ['iron-ore', 'copper-ore', 'coal', 'wood', 'gunpowder', 'bullet', 'tin-plate', 'charcoal'] as const) expect(accepts(core, no)).toBe(false);
  });

  it('covers everything buildings and research are paid in', async () => {
    const { COSTS } = await import('./costs');
    const { TECHS } = await import('./research');
    const { CORE_ITEMS } = await import('./items');
    const spent = new Set<string>();
    for (const c of Object.values(COSTS)) for (const k of Object.keys(c)) spent.add(k);
    for (const t of TECHS) for (const c of t.costs) for (const k of Object.keys(c)) spent.add(k);
    for (const k of spent) expect(CORE_ITEMS).toContain(k);
  });
});
