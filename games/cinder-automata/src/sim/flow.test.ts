import { describe, expect, it } from 'vitest';
import { Run } from './round';
import { World } from './world';

function defended(): World {
  const w = new World(100, 100);
  w.place('core', 48, 48, 0);
  for (const [x, y] of [[43, 43], [53, 43], [43, 53], [53, 53], [43, 48], [54, 48]]) {
    const t = w.place('turret', x, y, 0);
    if (t?.kind === 'turret') t.ammo = 40;
  }
  return w;
}

describe('ending a level', () => {
  it('ends as soon as the last enemy is dead, without waiting for the clock', () => {
    const w = defended();
    const run = new Run(w, { buildSeconds: 0, fightSeconds: 600, arenaHalf: 40 });
    run.startFight();
    for (let i = 0; i < 600 * 30 && run.phase === 'fight'; i++) {
      for (const e of w.entities.values()) if (e.kind === 'turret') e.ammo = 40;
      run.update(1 / 30);
    }
    expect(run.phase).toBe('won');
    expect(run.timer).toBeGreaterThan(0); // there was still time on the clock
    expect(w.enemies.length).toBe(0);
  });

  it('does not end while enemies are still to come', () => {
    const w = defended();
    const run = new Run(w, { buildSeconds: 0, fightSeconds: 600, arenaHalf: 40 });
    run.startFight();
    for (let i = 0; i < 10 * 30; i++) run.update(1 / 30); // early: nothing has spawned yet, or only the first pack
    expect(run.spawned).toBeLessThan(run.toSpawn());
    expect(run.phase).toBe('fight');
  });
});

describe('spawn pings', () => {
  it('marks where each pack appears, and lets the mark fade', () => {
    const w = defended();
    const run = new Run(w, { buildSeconds: 0, fightSeconds: 60, arenaHalf: 40 });
    run.startFight();
    for (let i = 0; i < 40 * 30 && w.alerts.length === 0; i++) run.update(1 / 30);
    expect(w.alerts.length).toBeGreaterThan(0);
    const a = w.alerts[0];
    expect(w.enemies.some((e) => Math.hypot(e.x - a.x, e.y - a.y) < 8)).toBe(true); // it is where the pack appeared
    expect(a.life).toBeGreaterThan(2);
  });

  it('gives a boss a bigger ping', () => {
    const w = defended();
    const run = new Run(w, { buildSeconds: 0, fightSeconds: 60, arenaHalf: 40 });
    run.level = 10;
    run.startFight();
    for (let i = 0; i < 25 * 30 && !run.bossId; i++) run.update(1 / 30);
    expect(w.alerts.some((a) => a.big)).toBe(true);
  });
});
