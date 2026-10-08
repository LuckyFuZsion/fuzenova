import { describe, expect, it } from 'vitest';
import { fabRoomUsed, stepCombat } from './combat';
import { researchFx } from './research';
import { ROBOTS, fabOf } from './robots';
import { Run } from './round';
import { World, isFab } from './world';

function baseWorld(): World {
  const w = new World(100, 100);
  w.place('core', 48, 48, 0);
  return w;
}
const enemy = (id: number, x: number, y: number, hp = 24) => ({ id, x, y, hp, maxHp: hp, speed: 1, dmg: 3, born: 0 });

describe('robot soldiers', () => {
  it('a fabricator builds a robot once it has the plates', () => {
    const w = baseWorld();
    const fab = w.place('robotfab', 40, 40, 0);
    if (fab?.kind !== 'robotfab') throw new Error('fab not placed');
    fab.type = 'drone-1';
    fab.inv = { ...ROBOTS['drone-1'].cost };
    for (let i = 0; i < (ROBOTS['drone-1'].buildTime + 1) * 30; i++) stepCombat(w, 1 / 30);
    expect(w.soldiers.length).toBe(1);
    expect(w.soldiers[0].type).toBe('drone-1');
    expect(Object.values(fab.inv).every((n) => n === 0)).toBe(true); // the plates were used up
  });

  it('pulls plates from a belt beside it', () => {
    const w = baseWorld();
    const fab = w.place('robotfab', 40, 40, 0);
    const belt = w.place('belt', 43, 41, 2); // touches the fab's right side
    if (fab?.kind !== 'robotfab' || belt?.kind !== 'belt') throw new Error('setup failed');
    belt.items.push({ type: 'iron-plate', pos: 0.5 });
    for (let i = 0; i < 30; i++) stepCombat(w, 1 / 30);
    expect(fab.inv['iron-plate']).toBe(1);
    expect(belt.items.length).toBe(0);
  });

  it('a trooper walks out and shoots an approaching enemy', () => {
    const w = baseWorld();
    w.soldiers.push({ id: 1, type: 'trooper', x: 50, y: 53, hp: 75, maxHp: 75, cool: 0, face: 1 });
    w.enemies.push(enemy(1, 50, 60, 24));
    for (let i = 0; i < 30 * 10 && w.enemies.length; i++) stepCombat(w, 1 / 30);
    expect(w.enemies.length).toBe(0);
    expect(w.kills).toBe(1);
    expect(w.soldiers.length).toBe(1);
  });

  it('crawlers chew on ground robots but cannot reach flying ones', () => {
    const w = baseWorld();
    w.soldiers.push({ id: 1, type: 'trooper', x: 30, y: 30, hp: 75, maxHp: 75, cool: 99, face: 1 });
    w.soldiers.push({ id: 2, type: 'drone-1', x: 60, y: 60, hp: 18, maxHp: 18, cool: 99, face: 1 });
    w.enemies.push(enemy(1, 30.2, 30, 9999), enemy(2, 60.2, 60, 9999));
    for (let i = 0; i < 30 * 5; i++) stepCombat(w, 1 / 30);
    const trooper = w.soldiers.find((s) => s.id === 1);
    const drone = w.soldiers.find((s) => s.id === 2);
    expect(trooper!.hp).toBeLessThan(75);
    expect(drone!.hp).toBe(18);
  });

  it('the army survives into the next level, still wounded (robots do not heal)', () => {
    const w = baseWorld();
    w.soldiers.push({ id: 1, type: 'trooper', x: 50, y: 53, hp: 100, maxHp: 190, cool: 0, face: 1 });
    const run = new Run(w, { buildSeconds: 1, fightSeconds: 5 });
    run.startFight();
    run.spawned = run.toSpawn(); w.enemies = []; // the swarm is over (the level is won by the army or otherwise; here we only care what happens next)
    run.update(1 / 30);
    expect(run.phase).toBe('won');
    run.nextLevel();
    expect(w.soldiers.length).toBe(1);
    expect(w.soldiers[0].hp).toBeLessThanOrEqual(100); // not repaired between rounds
  });
});

describe('fabricator room', () => {
  const FULL = { 'iron-plate': 400, 'copper-plate': 400, 'tin-plate': 400, 'lead-plate': 400 };
  const built = (type: 'scout' | 'heavy' | 'titan' | 'trooper', plates: number, secs: number) => {
    const w = baseWorld();
    w.research['robot-designs'] = 5; w.rfx = researchFx(w);
    const f = w.place(fabOf(type), 30, 30, 0)!;
    if (!isFab(f)) throw new Error('setup');
    f.type = type; f.inv = { ...FULL };
    const run = new Run(w, { buildSeconds: 0, fightSeconds: 1000, enemies: false });
    run.startFight();
    for (let i = 0; i < secs * 30; i++) { f.inv = { ...FULL }; run.update(1 / 30); w.enemies = []; }
    void plates;
    return { w, f };
  };

  it('stops at twelve space: twelve scouts, or six troopers, or one Titan and nothing else', () => {
    expect(built('scout', 50, 500).w.soldiers.length).toBe(12);
    expect(built('trooper', 50, 500).w.soldiers.length).toBe(6);
    const t = built('titan', 200, 700);
    expect(t.w.soldiers.length).toBe(1);
    expect(fabRoomUsed(t.w, t.f.id)).toBe(12);
  });

  it('builds more when a robot is lost', () => {
    const { w, f } = built('heavy', 100, 400);          // a heavy takes 4: three fit exactly
    expect(w.soldiers.length).toBe(4);
    w.soldiers.pop();
    const run = new Run(w, { buildSeconds: 0, fightSeconds: 1000, enemies: false });
    run.startFight();
    for (let i = 0; i < 100 * 30; i++) { f.inv = { ...FULL }; run.update(1 / 30); w.enemies = []; }
    expect(w.soldiers.length).toBe(4);
  });

  it('gives each fabricator its own twelve', () => {
    const w = baseWorld();
    const a = w.place('robotfab', 30, 30, 0)!, b = w.place('robotfab', 40, 30, 0)!;
    if (a.kind !== 'robotfab' || b.kind !== 'robotfab') throw new Error('setup');
    a.type = b.type = 'scout';
    const run = new Run(w, { buildSeconds: 0, fightSeconds: 2000, enemies: false });
    run.startFight();
    for (let i = 0; i < 600 * 30; i++) { a.inv = { ...FULL }; b.inv = { ...FULL }; run.update(1 / 30); w.enemies = []; }
    expect(w.soldiers.length).toBe(24);
  });
});
