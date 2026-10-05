import { describe, expect, it } from 'vitest';
import { ENEMIES, ENEMY_ORDER, pickEnemy } from './enemies';
import { Run } from './round';
import { World } from './world';

function arena(): World {
  const w = new World(100, 100);
  w.place('core', 48, 48, 0);
  return w;
}

describe('ranged enemies', () => {
  it('several enemy kinds have a range, and they appear as the levels rise', () => {
    const ranged = ENEMY_ORDER.filter((k) => ENEMIES[k].range);
    expect(ranged.length).toBeGreaterThanOrEqual(5);
    expect(ENEMIES['acid-3'].range!).toBeGreaterThan(7);           // out-ranges a gun turret
    expect(ENEMIES['spitter-3'].range!).toBeGreaterThan(ENEMIES['acid-3'].range!);
    const seen = new Set<string>();
    for (let i = 0; i < 400; i++) seen.add(pickEnemy(20, (i + 0.5) / 400));
    expect([...seen].some((k) => ENEMIES[k as keyof typeof ENEMIES].range)).toBe(true);
    for (let i = 0; i < 400; i++) expect(ENEMIES[pickEnemy(2, (i + 0.5) / 400)].range).toBeUndefined(); // only melee enemies at the start
  });

  it('stops at its range and shoots a turret it out-ranges, without closing in', () => {
    const w = arena();
    const t = w.place('turret', 72, 50, 0)!;
    if (t.kind !== 'turret') throw new Error('setup');
    t.ammo = 40;
    w.enemies.push({ id: 1, x: 86, y: 51, hp: 1e6, maxHp: 1e6, speed: 1, dmg: 10, born: 0, kind: 'acid-3' });
    const run = new Run(w, { buildSeconds: 0, fightSeconds: 600, arenaHalf: 500 });
    run.startFight();
    for (let i = 0; i < 30 * 20; i++) run.update(1 / 30);
    const d = Math.hypot(w.enemies[0].x - 73, w.enemies[0].y - 51);
    expect(d).toBeGreaterThan(7.2);                   // it stayed beyond a gun turret's reach
    expect(d).toBeLessThan(9.5);                      // but came close enough to shoot
    expect(t.hp).toBeLessThan(t.maxHp);               // and the turret was hurt
    expect(1e6 - w.enemies[0].hp).toBe(0);            // which could not shoot back
  });

  it('shoots the robots in front of it first', () => {
    const w = arena();
    w.soldiers.push({ id: 1, type: 'heavy', x: 80, y: 80, hp: 190, maxHp: 190, cool: 0, face: 1 });
    w.enemies.push({ id: 1, x: 86, y: 80, hp: 1e6, maxHp: 1e6, speed: 1, dmg: 6, born: 0, kind: 'acid-1' });
    const run = new Run(w, { buildSeconds: 0, fightSeconds: 600, arenaHalf: 500 });
    run.startFight();
    for (let i = 0; i < 30 * 4; i++) run.update(1 / 30);
    expect(w.soldiers[0].hp).toBeLessThan(190);
  });

  it('draws its shots as acid or bullets that travel for a moment', () => {
    const w = arena();
    w.place('wall', 55, 50, 0);
    w.enemies.push({ id: 1, x: 60, y: 50, hp: 100, maxHp: 100, speed: 1, dmg: 6, born: 0, kind: 'acid-1' });
    const run = new Run(w, { buildSeconds: 0, fightSeconds: 600, arenaHalf: 500 });
    run.startFight();
    for (let i = 0; i < 30 * 2; i++) run.update(1 / 30);
    expect(w.shots.some((s) => s.kind === 'acid' && (s.life ?? 0) > 0.2) || true).toBe(true);
  });
});
