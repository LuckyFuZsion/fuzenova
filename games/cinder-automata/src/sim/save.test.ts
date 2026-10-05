import { describe, expect, it } from 'vitest';
import { canAfford, missing, refund, spend, COSTS, START_STOCK, addStock } from './costs';
import { generateWorld } from './mapgen';
import { World } from './world';

describe('costs', () => {
  it('charges from the core stock and refuses when short', () => {
    const w = new World(40, 40);
    w.place('core', 10, 10, 0);
    w.freeBuild = false;
    addStock(w, { 'iron-plate': 30 });
    expect(canAfford(w, 'belt')).toBe(true);
    expect(canAfford(w, 'turret')).toBe(false); // needs copper too
    expect(missing(w, 'turret')).toBe('copper-plate');
    spend(w, 'wall');
    expect(w.stock['iron-plate']).toBe(30 - (COSTS.wall['iron-plate'] ?? 0));
    refund(w, 'wall');
    expect(w.stock['iron-plate']).toBeGreaterThan(30 - (COSTS.wall['iron-plate'] ?? 0));
    spend(w, 'belt'); spend(w, 'inserter'); // belts and inserters are always free
    expect(w.stock['iron-plate']).toBeGreaterThan(30 - (COSTS.wall['iron-plate'] ?? 0));
    expect(Object.keys(COSTS.belt).length + Object.keys(COSTS.inserter).length).toBe(0);
  });

  it('is free in free-build mode (the tutorial)', () => {
    const w = new World(20, 20);
    expect(canAfford(w, 'robotfab')).toBe(true);
  });

  it('a belt running into the core delivers to the build stock', () => {
    const w = new World(40, 20);
    w.place('core', 20, 5, 0);
    const b = w.place('belt', 19, 6, 0)!; // points east, straight into the core
    if (b.kind !== 'belt') throw new Error('setup');
    b.items.push({ type: 'iron-plate', pos: 0.9 });
    for (let i = 0; i < 60; i++) w.step(1 / 60);
    expect(w.stock['iron-plate']).toBe(1);
  });

  it('start stock is enough for a first defence', () => {
    const w = new World(20, 20);
    w.place('core', 5, 5, 0);
    addStock(w, START_STOCK);
    expect(canAfford(w, 'turret')).toBe(true);
  });
});

describe('save and resume', () => {
  it('rebuilds the same world from an export, including contents', () => {
    const a = generateWorld();
    a.place('core', 79, 91, 0);
    a.place('miner', 74, 78, 1);
    const belt = a.place('belt', 74, 80, 1)!;
    if (belt.kind === 'belt') belt.items.push({ type: 'iron-ore', pos: 0.4 });
    const asm = a.place('assembler', 60, 60, 0)!;
    if (asm.kind === 'assembler') { asm.recipe = 'bullet'; asm.stock = { gunpowder: 1 }; asm.out = 2; }
    a.soldiers.push({ id: 5, type: 'titan', x: 10, y: 11, hp: 300, maxHp: 720, cool: 0, face: 1 });
    a.oreLeft[100] = 4321; a.ore[100] = 3;
    a.core!.stock['iron-plate'] = 77;
    a.kills = 12;

    const json = JSON.stringify(a.exportState()); // what actually goes into localStorage
    const b = generateWorld();
    b.importState(JSON.parse(json));

    expect(b.entities.size).toBe(a.entities.size);
    expect(b.oreLeft[100]).toBe(4321);
    expect(b.ore[100]).toBe(3);
    expect(b.core!.stock['iron-plate']).toBe(77);
    expect(b.stock['iron-plate']).toBe(77);
    expect(b.soldiers[0].type).toBe('titan');
    expect(b.kills).toBe(12);
    const belt2 = b.entityAt(74, 80)!;
    expect(belt2.kind === 'belt' && belt2.items[0].type).toBe('iron-ore');
    const asm2 = b.entityAt(61, 61)!; // any tile of the 3x3 finds the assembler again
    expect(asm2.kind === 'assembler' && asm2.recipe).toBe('bullet');
    expect(b.canPlace('wall', 74, 80)).toBe(false); // the footprint map was rebuilt
    // ids keep counting from where they were, so new buildings never clash with restored ones
    const fresh = b.place('wall', 100, 100, 0)!;
    expect(a.entities.has(fresh.id)).toBe(false);
  });

  it('a saved world keeps running after it is restored', () => {
    const a = generateWorld();
    a.place('core', 79, 91, 0);
    a.place('miner', 74, 78, 1); // 3 wide, 2 tall: its port is the middle of the bottom edge, (75,80)
    a.place('belt', 75, 80, 1);
    const b = generateWorld();
    b.importState(JSON.parse(JSON.stringify(a.exportState())));
    for (let i = 0; i < 60 * 6; i++) b.step(1 / 60);
    const belt = b.entityAt(75, 80)!;
    expect(belt.kind === 'belt' && belt.items.length).toBeGreaterThan(0);
  });
});

describe('removal refunds', () => {
  it('belts and inserters are free both ways, other buildings refund 75%', () => {
    const w = new World(40, 40);
    w.place('core', 10, 10, 0);
    w.freeBuild = false;
    refund(w, 'belt'); refund(w, 'inserter'); // they cost nothing, so there is nothing to give back
    expect(w.stock['iron-plate'] ?? 0).toBe(0);
    const before = w.stock['iron-plate'] ?? 0;
    refund(w, 'turret');
    expect((w.stock['iron-plate'] ?? 0) - before).toBe(Math.floor((COSTS.turret['iron-plate'] ?? 0) * 0.75));
  });
});

describe('blueprint (planned) buildings', () => {
  it('lock in when the fight starts, so removal is no longer free', async () => {
    const { Run } = await import('./round');
    const w = new World(40, 40);
    w.place('core', 10, 10, 0);
    const t = w.place('turret', 20, 20, 0)!;
    t.fresh = true;
    const run = new Run(w, { buildSeconds: 100, fightSeconds: 30 });
    expect(t.fresh).toBe(true);
    run.startFight();
    expect(t.fresh).toBeUndefined();
    w.freeBuild = false;
    refund(w, 'turret', !!t.fresh);
    expect(w.stock['iron-plate']).toBe(Math.floor((COSTS.turret['iron-plate'] ?? 0) * 0.75));
    refund(w, 'turret', true);
    expect(w.stock['iron-plate']).toBe(Math.floor((COSTS.turret['iron-plate'] ?? 0) * 0.75) + (COSTS.turret['iron-plate'] ?? 0));
  });
});

describe('chests are gone', () => {
  it('an old save with a chest loads without it, and its contents go to the core', () => {
    const a = new World(40, 40);
    a.place('core', 10, 10, 0);
    const state = JSON.parse(JSON.stringify(a.exportState()));
    state.entities.push({ id: 99, kind: 'chest', x: 20, y: 20, w: 1, h: 1, dir: 0, hp: 90, maxHp: 90, inv: { 'iron-plate': 30, coal: 4 } });
    const b = new World(40, 40);
    b.importState(state);
    expect(b.entityAt(20, 20)).toBeUndefined();
    expect(b.stock['iron-plate']).toBe(30);
    expect(b.stock.coal).toBe(4);
  });
});
