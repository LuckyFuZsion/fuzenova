import { describe, expect, it } from 'vitest';
import { World, type Belt, type Dir, type ItemId } from './world';

const run = (w: World, s: number) => { for (let i = 0; i < s * 60; i++) w.step(1 / 60); };
/** a belt that points away into nothing, so whatever is put on it waits at its end for an inserter to lift */
const supply = (w: World, x: number, y: number, items: ItemId[]): Belt => {
  const b = w.place('belt', x, y, 2 as Dir);
  if (b?.kind !== 'belt') throw new Error('no belt');
  items.forEach((type, k) => b.items.push({ type, pos: Math.max(0, 1 - k * 0.25) }));
  return b;
};

describe('inserter turns itself round', () => {
  it('faces the machine even when placed pointing the wrong way', () => {
    const w = new World(30, 10);
    supply(w, 2, 4, ['iron-ore', 'iron-ore', 'iron-ore']);
    const ins = w.place('inserter', 3, 4, 2 as Dir)!; // placed facing WEST, back towards the smelter
    const f = w.place('furnace', 4, 4, 0)!;
    if (ins.kind !== 'inserter' || f.kind !== 'furnace') throw new Error('setup');
    run(w, 4);
    expect(ins.dir).toBe(0); // now facing east, the supply behind and the smelter in front
    expect(f.inCount + f.outCount).toBeGreaterThan(0);
  });

  it('works out a vertical connection too', () => {
    const w = new World(20, 20);
    supply(w, 5, 5, ['iron-ore', 'iron-ore', 'iron-ore']);
    const ins = w.place('inserter', 5, 6, 0 as Dir)!; // placed facing east, but the supply is above and the smelter below
    const f = w.place('furnace', 5, 7, 0)!;
    if (ins.kind !== 'inserter' || f.kind !== 'furnace') throw new Error('setup');
    run(w, 4);
    expect(ins.dir).toBe(1);
    expect(f.inCount + f.outCount).toBeGreaterThan(0);
  });

  it('locks after the first delivery, so it never starts pulling plates back onto the input side', () => {
    const w = new World(30, 10);
    const src = supply(w, 2, 4, ['iron-ore']);
    const ins = w.place('inserter', 3, 4, 0 as Dir)!;
    const f = w.place('furnace', 4, 4, 0)!;
    if (ins.kind !== 'inserter' || f.kind !== 'furnace') throw new Error('setup');
    run(w, 12); // the single ore is delivered and smelted; the plate waits in the smelter's output
    expect(ins.locked).toBe(true);
    expect(f.outCount).toBe(1);
    run(w, 6);
    expect(ins.dir).toBe(0);
    expect(src.items.filter((i) => i.type === 'iron-plate').length).toBe(0); // not carried back onto the supply belt
  });
});

describe('inserter filter', () => {
  const mixed = () => {
    const w = new World(30, 10);
    const src = supply(w, 5, 5, ['iron-plate', 'copper-plate', 'iron-plate', 'copper-plate']);
    const ins = w.place('inserter', 6, 5, 0)!;
    const dst = w.place('core', 7, 4, 0)!;
    if (ins.kind !== 'inserter' || dst.kind !== 'core') throw new Error('setup');
    const topUp = () => { if (src.items.length < 4) for (const t of ['iron-plate', 'copper-plate'] as ItemId[]) for (const pos of [1, 0.75, 0.5, 0.25, 0]) if (src.items.every((i) => Math.abs(i.pos - pos) >= 0.25)) { src.items.push({ type: t, pos }); src.items.sort((p, q) => q.pos - p.pos); break; } };
    const fed = (s: number) => { for (let i = 0; i < s * 60; i++) { if (i % 20 === 0) topUp(); w.step(1 / 60); } };
    return { w, ins, dst, fed };
  };

  it('moves any item by default', () => {
    const { fed, dst } = mixed();
    fed(30);
    expect(dst.stock['iron-plate']).toBeGreaterThan(0);
    expect(dst.stock['copper-plate']).toBeGreaterThan(0);
  });

  it('moves only the chosen item when filtered, and leaves the rest alone', () => {
    const { ins, dst, fed } = mixed();
    ins.filter = 'copper-plate';
    fed(30);
    expect(dst.stock['copper-plate']).toBeGreaterThanOrEqual(2);
    expect(dst.stock['iron-plate'] ?? 0).toBe(0);
  });

  it('keeps its filter through a save', () => {
    const { w, ins } = mixed();
    ins.filter = 'iron-plate';
    const w2 = new World(30, 10);
    w2.importState(JSON.parse(JSON.stringify(w.exportState())));
    const back = w2.entityAt(6, 5)!;
    expect(back.kind === 'inserter' && back.filter).toBe('iron-plate');
  });
});
