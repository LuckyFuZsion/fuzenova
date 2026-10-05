import { describe, expect, it } from 'vitest';
import { ENEMIES, bossForLevel } from './enemies';
import { BOSS_REWARD, Run } from './round';
import { World } from './world';

function base(): World {
  const w = new World(100, 100);
  w.place('core', 48, 48, 0);
  return w;
}
const drive = (run: Run, seconds: number) => { for (let i = 0; i < seconds * 30; i++) run.update(1 / 30); };

describe('bosses', () => {
  it('appear on every tenth level, cycling Brute, Colossus, Queen', () => {
    expect(bossForLevel(9)).toBeUndefined();
    expect(bossForLevel(10)).toBe('brute-3');
    expect(bossForLevel(20)).toBe('boss-colossus');
    expect(bossForLevel(30)).toBe('boss-queen');
    expect(bossForLevel(40)).toBe('brute-3');
    for (const k of ['brute-3', 'boss-colossus', 'boss-queen'] as const) expect(ENEMIES[k].boss).toBe(true);
  });

  it('are never picked for ordinary waves', () => {
    const w = base();
    const run = new Run(w, { buildSeconds: 0, fightSeconds: 60 });
    run.level = 12;
    run.startFight();
    drive(run, 10);
    expect(w.enemies.every((e) => !ENEMIES[e.kind!].boss)).toBe(true);
  });

  it('walk in part-way through the fight and keep the level open until they are dead', () => {
    const w = base();
    const run = new Run(w, { buildSeconds: 0, fightSeconds: 60 });
    run.level = 10;
    run.startFight();
    drive(run, 10);
    expect(run.bossId).toBe(0);
    expect(run.bossPending()).toBe(true);
    drive(run, 10); // past 30% of the fight
    const boss = w.enemies.find((e) => e.id === run.bossId);
    expect(boss?.kind).toBe('brute-3');
    // clear every normal enemy and run the clock out: the level must still not end while the boss lives
    w.enemies = w.enemies.filter((e) => e.id === run.bossId);
    run.timer = 0; run.spawned = run.toSpawn();
    const hp = w.core!.hp;
    w.core!.hp = w.core!.maxHp; void hp;
    run.update(1 / 30);
    expect(run.phase).toBe('fight');
    boss!.hp = 0; // kill it
    run.update(1 / 30);
    run.update(1 / 30);
    expect(run.phase).toBe('won');
  });

  it('pay a bonus on top of the level reward', () => {
    const w = base();
    w.freeBuild = false;
    const run = new Run(w, { buildSeconds: 0, fightSeconds: 20 });
    run.level = 10;
    run.startFight();
    drive(run, 8);
    w.enemies = [];
    run.timer = 0; run.spawned = run.toSpawn();
    const before = w.stock['iron-plate'] ?? 0;
    run.update(1 / 30);
    run.update(1 / 30);
    expect(run.phase).toBe('won');
    expect((w.stock['iron-plate'] ?? 0) - before).toBeGreaterThanOrEqual(BOSS_REWARD['iron-plate']!);
  });

  it('let the Hive Queen keep adding to her brood', () => {
    const w = base();
    const run = new Run(w, { buildSeconds: 0, fightSeconds: 60 });
    run.level = 30;
    run.startFight();
    drive(run, 19);
    const queen = w.enemies.find((e) => e.id === run.bossId);
    expect(queen?.kind).toBe('boss-queen');
    const others = () => w.enemies.filter((e) => e.id !== run.bossId).length;
    w.enemies = [queen!];
    drive(run, 13);
    expect(others()).toBeGreaterThan(0);
  });

  it('let the Colossus shell a turret from beyond turret range', () => {
    const w = base();
    const t = w.place('turret', 30, 48, 0);
    if (t?.kind !== 'turret') throw new Error('no turret');
    const run = new Run(w, { buildSeconds: 0, fightSeconds: 60 });
    run.level = 20;
    run.startFight();
    w.enemies = [{ id: 1, x: 30 + 8.8, y: 49, hp: 1e6, maxHp: 1e6, speed: 0.5, dmg: 10, born: 0, kind: 'boss-colossus' }];
    run.bossId = 1;
    t.ammo = 40;
    drive(run, 1.4); // long enough for the first shell, not long enough for it to walk into the turret's range
    expect(t.hp).toBeLessThan(t.maxHp); // it was hit
    expect(1e6 - w.enemies[0].hp).toBe(0); // and the turret could not answer at that distance
  });
});

describe('a boss hemmed in by scenery', () => {
  it('crushes through rock and trees and still reaches the core', () => {
    const w = base();
    for (let y = 0; y < 100; y++) for (let x = 0; x < 100; x++) {
      const r = Math.hypot(x - 49, y - 49);
      if (r >= 12 && r <= 16) w.terrain[y * 100 + x] = y % 3 === 0 ? 2 : 1; // a solid ring of rock and trees round the core
    }
    const run = new Run(w, { buildSeconds: 0, fightSeconds: 600 });
    run.level = 10;
    run.startFight();
    w.enemies.push({ id: 999, x: 49, y: 20, hp: 1e9, maxHp: 1e9, speed: 0.55, dmg: 1, born: 0, kind: 'brute-3' });
    run.bossId = 999;
    let near = false;
    for (let i = 0; i < 400 * 30 && !near; i++) {
      w.core!.hp = w.core!.maxHp;
      run.update(1 / 30);
      w.enemies = w.enemies.filter((e) => e.id === 999);
      const b = w.enemies[0];
      if (b && Math.hypot(b.x - 49, b.y - 49) < 6) near = true;
    }
    expect(near).toBe(true);
  });
});
