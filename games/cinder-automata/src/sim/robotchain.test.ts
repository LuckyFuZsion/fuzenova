import { describe, expect, it } from 'vitest';
import { stepCombat } from './combat';
import { researchFx } from './research';
import { FAB_CAPACITY, FAB_ROBOTS, ROBOTS, ROBOT_SPACE, fabOf, type RobotType } from './robots';
import { Run } from './round';
import { World, accepts, isFab } from './world';

const FULL = { 'iron-plate': 500, 'copper-plate': 500, 'tin-plate': 500, 'lead-plate': 500 };
function base(): World {
  const w = new World(100, 100);
  w.place('core', 48, 48, 0);
  w.research['robot-designs'] = 5; w.rfx = researchFx(w);
  return w;
}
function fielded(type: RobotType, secs = 500) {
  const w = base();
  const f = w.place(fabOf(type), 30, 30, 0)!;
  if (!isFab(f)) throw new Error('setup');
  f.type = type;
  const run = new Run(w, { buildSeconds: 0, fightSeconds: 2000, enemies: false });
  run.startFight();
  for (let i = 0; i < secs * 30; i++) { f.inv = { ...FULL }; run.update(1 / 30); w.enemies = []; }
  return w.soldiers.filter((s) => s.type === type && s.fab === f.id).length;
}

describe('the robot buildings', () => {
  it('each makes only its own robots', () => {
    expect(FAB_ROBOTS.robotfab).toEqual(['drone-1', 'scout']);
    expect(FAB_ROBOTS.hangar).toEqual(['drone-2', 'bomber', 'interceptor']);
    expect(FAB_ROBOTS.foundry).toEqual(['trooper', 'heavy', 'quad']);
    expect(FAB_ROBOTS.heavyworks).toEqual(['artillery', 'titan', 'carrier']);
    expect(fabOf('carrier')).toBe('heavyworks');
  });

  it('each step up needs another kind of plate', () => {
    const kinds = (t: RobotType) => Object.keys(ROBOTS[t].cost).sort().join(',');
    expect(kinds('scout')).toBe('copper-plate,iron-plate');
    expect(kinds('drone-2')).toBe('copper-plate,iron-plate,tin-plate');
    expect(kinds('trooper')).toBe('copper-plate,iron-plate,lead-plate');
    expect(kinds('titan')).toBe('copper-plate,iron-plate,lead-plate,tin-plate');
  });

  it('only takes in the plates its current robot needs', () => {
    const w = base();
    const hangar = w.place('hangar', 30, 30, 0)!, foundry = w.place('foundry', 40, 30, 0)!;
    expect(accepts(hangar, 'tin-plate')).toBe(true);
    expect(accepts(hangar, 'lead-plate')).toBe(false);
    expect(accepts(foundry, 'lead-plate')).toBe(true);
    expect(accepts(foundry, 'tin-plate')).toBe(false);
  });

  it('waits for every kind of plate before it builds', () => {
    const w = base();
    const f = w.place('foundry', 30, 30, 0)!;
    if (!isFab(f)) throw new Error('setup');
    f.type = 'trooper';
    f.inv = { 'iron-plate': 50, 'copper-plate': 50 }; // no lead
    for (let i = 0; i < 40 * 30; i++) stepCombat(w, 1 / 30);
    expect(w.soldiers.length).toBe(0);
    f.inv['lead-plate'] = 10;
    for (let i = 0; i < 40 * 30; i++) stepCombat(w, 1 / 30);
    expect(w.soldiers.length).toBeGreaterThanOrEqual(1);
  });

  it('a Walker Foundry holds four Heavy walkers; a Heavy Works holds two Artillery, or one Titan, or one Carrier', () => {
    expect(fielded('heavy')).toBe(4);
    expect(fielded('artillery')).toBe(2);
    expect(fielded('titan', 800)).toBe(1);
    expect(fielded('carrier', 800)).toBe(1);
    expect(FAB_CAPACITY / ROBOT_SPACE.heavy).toBe(4);
  });

  it('a fabricator from an old save keeps its iron plates and becomes a Drone Workshop that makes small robots', () => {
    const w = base();
    const f = w.place('robotfab', 30, 30, 0)!;
    const state = w.exportState();
    const ent = state.entities.find((e) => e.id === f.id) as unknown as { stock?: number; inv?: unknown; type: string };
    delete ent.inv; ent.stock = 17; ent.type = 'titan'; // how a fabricator looked before the chain
    const w2 = new World(100, 100);
    w2.importState(state);
    const g = [...w2.entities.values()].find(isFab)!;
    if (!isFab(g)) throw new Error('lost');
    expect(g.inv['iron-plate']).toBe(17);
    expect(FAB_ROBOTS.robotfab).toContain(g.type);
  });
});

describe('the Sapper drone', () => {
  const enemy = (id: number, x: number, y: number, kind: string) => ({ id, x, y, hp: 300, maxHp: 300, speed: 0, dmg: 0, born: 0, kind }) as never;
  it('bombs a cluster of ground enemies at once, and ignores flyers', () => {
    const w = base();
    w.soldiers.push({ id: 1, type: 'bomber', x: 60, y: 60, hp: 70, maxHp: 70, cool: 0, face: 1 });
    w.enemies.push(enemy(1, 60.4, 60, 'crawler-1'), enemy(2, 61.2, 60.5, 'crawler-1'), enemy(3, 60.8, 59.5, 'crawler-1'), enemy(4, 60.3, 60.2, 'drone-1'));
    for (let i = 0; i < 6 * 30; i++) stepCombat(w, 1 / 30);
    const hp = (id: number) => w.enemies.find((e) => e.id === id)?.hp ?? 0;
    expect(hp(1)).toBeLessThan(300);
    expect(hp(2)).toBeLessThan(300);
    expect(hp(3)).toBeLessThan(300);   // the burst reached all the ground enemies
    expect(hp(4)).toBe(300);           // the flyer was left alone
  });
});

describe('the Carrier', () => {
  it('launches drones up to its limit, and they are lost with it', () => {
    const w = base();
    w.nextSoldierId = 60;
    w.soldiers.push({ id: 50, type: 'carrier', x: 70, y: 70, hp: 900, maxHp: 900, cool: 0, face: 1 });
    for (let i = 0; i < 60 * 30; i++) stepCombat(w, 1 / 30);
    const drones = () => w.soldiers.filter((s) => s.carrier === 50);
    expect(drones().length).toBe(ROBOTS.carrier.carries!.max);
    expect(drones().every((s) => s.type === 'drone-1')).toBe(true);
    w.soldiers = w.soldiers.filter((s) => s.type !== 'carrier'); // the Carrier is destroyed
    stepCombat(w, 1 / 30);
    expect(drones().length).toBe(0);
  });
});

describe('robot roles', () => {
  const foe = (id: number, x: number, y: number, kind: 'crawler-1' | 'drone-1' = 'crawler-1', hp = 1e6) => ({ id, x, y, hp, maxHp: hp, speed: 1, dmg: 4, born: 0, kind });
  const tick = (w: World, s: number) => { for (let i = 0; i < s * 30; i++) stepCombat(w, 1 / 30); };
  const base = () => { const w = new World(80, 80); w.place('core', 38, 60, 0); return w; };

  it('a Heavy walker mends itself, and pulls nearby enemies onto it', () => {
    const w = base();
    w.soldiers.push({ id: 1, type: 'heavy', x: 40, y: 40, hp: 100, maxHp: 420, cool: 0, face: 1 });
    w.soldiers.push({ id: 2, type: 'scout', x: 43, y: 40, hp: 55, maxHp: 55, cool: 0, face: 1 });
    w.enemies.push(foe(1, 44, 40));
    tick(w, 2);
    const heavy = w.soldiers.find((s) => s.id === 1)!, scout = w.soldiers.find((s) => s.id === 2)!;
    expect(scout.hp).toBe(55); // the crawler ignores the scout beside it
    expect(w.enemies[0].x).toBeLessThan(44); // and walks at the Heavy walker
    expect(heavy.hp).toBeGreaterThan(100 - 4 * 2);
  });
  it('the Titan fires fast guns and a slow cannon', () => {
    const w = base();
    w.soldiers.push({ id: 1, type: 'titan', x: 40, y: 40, hp: 720, maxHp: 720, cool: 0, face: 1 });
    w.enemies.push(foe(1, 44, 40));
    tick(w, 5);
    expect(1e6 - w.enemies[0].hp).toBeGreaterThan(5 * 150); // about 200 a second between the two
  });
  it('Artillery bursts over everything near the target', () => {
    const w = base();
    w.soldiers.push({ id: 1, type: 'artillery', x: 40, y: 40, hp: 110, maxHp: 110, cool: 0, face: 1 });
    w.enemies.push(foe(1, 47, 40), foe(2, 48.2, 40));
    tick(w, 1);
    expect(w.enemies[1].hp).toBeLessThan(1e6);
  });
  it('an Interceptor hits flyers harder than ground enemies', () => {
    const dmgTo = (kind: 'crawler-1' | 'drone-1') => {
      const w = base();
      w.soldiers.push({ id: 1, type: 'interceptor', x: 40, y: 40, hp: 26, maxHp: 26, cool: 0, face: 1 });
      w.enemies.push(foe(1, 43, 40, kind));
      tick(w, 1);
      return 1e6 - w.enemies[0].hp;
    };
    expect(dmgTo('drone-1')).toBeGreaterThan(dmgTo('crawler-1') * 2);
  });
  it('a Carrier stays at its building while its drones range far', () => {
    const w = base();
    const f = w.place('heavyworks', 30, 30, 0)!;
    w.soldiers.push({ id: 1, type: 'carrier', x: 31, y: 34, hp: 900, maxHp: 900, cool: 0, face: 1, fab: f.id });
    w.soldiers.push({ id: 2, type: 'drone-1', x: 31, y: 35, hp: 18, maxHp: 18, cool: 0, face: 1, carrier: 1 });
    w.enemies.push(foe(1, 31, 75));
    tick(w, 6);
    const c = w.soldiers.find((s) => s.id === 1)!, d = w.soldiers.find((s) => s.id === 2)!;
    expect(Math.hypot(c.x - 31.5, c.y - 34)).toBeLessThan(5);
    expect(d.y).toBeGreaterThan(40); // the drone set off after an enemy 40 tiles away
  });
});
