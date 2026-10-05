import { describe, expect, it } from 'vitest';
import { generateWorld } from './mapgen';
import { Run, enemyCount, fightSeconds } from './round';
import { World } from './world';

const drive = (run: Run, seconds: number) => { for (let i = 0; i < seconds * 30; i++) run.update(1 / 30); };

function baseWorld(): World {
  const w = new World(100, 100);
  w.place('core', 48, 48, 0);
  return w;
}

describe('rounds', () => {
  it('fights grow from 3 minutes toward 10', () => {
    expect(fightSeconds(1)).toBe(180);
    expect(fightSeconds(30)).toBeCloseTo(600, 0);
    expect(fightSeconds(200)).toBe(600);
  });

  it('runs the factory only during the fight', () => {
    const w = new World(40, 40);
    for (const [x, y] of [[2, 2], [3, 2], [2, 3], [3, 3]]) { w.ore[y * 40 + x] = 1; w.oreLeft[y * 40 + x] = 50; }
    const miner = w.place('miner', 2, 2, 0);
    if (miner?.kind !== 'miner') throw new Error('miner not placed');
    w.place('core', 30, 30, 0);
    const run = new Run(w, { buildSeconds: 1000, fightSeconds: 30 });
    drive(run, 20);
    expect(run.phase).toBe('build');
    expect(miner.progress).toBe(0); // nothing moved while building
    run.startFight();
    drive(run, 5);
    expect(miner.progress + (miner.pending ? 1 : 0)).toBeGreaterThan(0);
  });

  it('starts the fight by itself when the build timer runs out', () => {
    const run = new Run(baseWorld(), { buildSeconds: 5, fightSeconds: 30 });
    drive(run, 6);
    expect(run.phase).toBe('fight');
  });

  it('loses when enemies destroy an undefended core', () => {
    const run = new Run(baseWorld(), { buildSeconds: 1, fightSeconds: 120 });
    drive(run, 400);
    expect(run.phase).toBe('lost');
  });

  it('wins when turrets with ammo clear the level, then moves to the next build phase', () => {
    const w = baseWorld();
    for (const [x, y] of [[44, 44], [52, 44], [44, 52], [52, 52]]) {
      const t = w.place('turret', x, y, 0);
      if (t?.kind === 'turret') t.ammo = 24;
    }
    const run = new Run(w, { buildSeconds: 1, fightSeconds: 60 });
    // keep the turrets topped up like a working supply line would
    for (let i = 0; i < 400 * 30 && run.phase !== 'won' && run.phase !== 'lost'; i++) {
      for (const e of w.entities.values()) if (e.kind === 'turret') e.ammo = 24;
      run.update(1 / 30);
    }
    if (run.phase === 'lost') throw new Error('core fell with turrets in place');
    expect(run.phase).toBe('won');
    expect(w.kills).toBe(enemyCount(1));
    run.nextLevel();
    expect(run.phase).toBe('build');
    expect(run.level).toBe(2);
  });

  it('feeds a turret from a belt that touches it', () => {
    const w = baseWorld();
    const t = w.place('turret', 44, 44, 0);
    const belt = w.place('belt', 46, 44, 2); // touches the turret's right side
    if (t?.kind !== 'turret' || belt?.kind !== 'belt') throw new Error('setup failed');
    belt.items.push({ type: 'iron-plate', pos: 0.5 });
    const run = new Run(w, { buildSeconds: 0, fightSeconds: 30 });
    run.startFight();
    drive(run, 1);
    expect(t.ammo).toBeGreaterThan(0);
    expect(belt.items.length).toBe(0);
  });

  it('lets bullets and explosions finish, and robots move, after a level is won', () => {
    const w = baseWorld();
    w.soldiers.push({ id: 1, type: 'trooper', x: 40, y: 40, hp: 75, maxHp: 75, cool: 0, face: 1 });
    const run = new Run(w, { buildSeconds: 1, fightSeconds: 5 });
    run.phase = 'won';
    w.shots.push({ x1: 0, y1: 0, x2: 1, y2: 1, ttl: 0.1 });
    w.fx.push({ name: 'fx-spark', x: 5, y: 5, age: 0, dur: 0.3, size: 1, rot: 0, add: true, grow: false });
    const start = { x: w.soldiers[0].x, y: w.soldiers[0].y };
    for (let i = 0; i < 30 * 3; i++) run.update(1 / 30);
    expect(w.shots.length).toBe(0);
    expect(w.fx.some((f) => f.x === 5 && f.y === 5)).toBe(false); // ambient core sparks may still be playing; the one we placed is gone
    expect(w.soldiers[0].x !== start.x || w.soldiers[0].y !== start.y).toBe(true);
    expect(run.phase).toBe('won'); // still waiting for the player
  });

  it('generates a playable map with the core placeable', () => {
    const w = generateWorld();
    expect(w.place('core', 80, 91, 0)).not.toBeNull();
  });
});

describe('cooldown after a win', () => {
  it('keeps the factory running for a while at the start of the build phase, then pauses it', () => {
    const w = baseWorld();
    w.freeBuild = false;
    const run = new Run(w, { buildSeconds: 1000 });
    run.phase = 'won';
    run.nextLevel();
    const total = run.cooldownLength();
    expect(total).toBeGreaterThanOrEqual(20); // normal: about 30 seconds at the start
    expect(run.cooldownLeft).toBe(total);
    const t0 = w.time;
    for (let i = 0; i < 10 * 30; i++) run.update(1 / 30);
    expect(w.time).toBeGreaterThan(t0 + 9); // the world ran
    expect(run.cooldownLeft).toBeLessThan(total - 9);
    for (let i = 0; i < (total + 5) * 30; i++) run.update(1 / 30);
    const t1 = w.time;
    for (let i = 0; i < 5 * 30; i++) run.update(1 / 30);
    expect(w.time).toBe(t1); // paused again
  });

  it('is longest on easy and shrinks as the levels climb', () => {
    const w = baseWorld();
    const easy = new Run(w, { difficulty: 'easy' }), hard = new Run(w, { difficulty: 'extreme' });
    expect(easy.cooldownLength()).toBe(50);
    expect(hard.cooldownLength()).toBeLessThan(easy.cooldownLength());
    easy.level = 30;
    expect(easy.cooldownLength()).toBeLessThan(25);
  });
});

describe('lull between waves', () => {
  it('is reported when a wave is cleared and the next is still a while off, and not while enemies remain', () => {
    const w = baseWorld();
    const run = new Run(w, { buildSeconds: 0 });
    run.startFight();
    let sawLull = false, enemiesDuringLull = false;
    for (let i = 0; i < 90 * 30 && run.phase === 'fight'; i++) {
      run.update(1 / 30);
      if (run.spawned >= 1) w.enemies = []; // every enemy that comes in is killed at once, so the wave clears and the breather starts
      if (run.inLull()) { sawLull = true; if (w.enemies.length) enemiesDuringLull = true; }
      if (w.core) w.core.hp = w.core.maxHp;
    }
    expect(sawLull).toBe(true);
    expect(enemiesDuringLull).toBe(false);
  });
});

describe('stragglers', () => {
  it('ends the fight even when the last enemy cannot be reached', () => {
    const w = baseWorld();
    const run = new Run(w, { buildSeconds: 0, fightSeconds: 60 });
    run.startFight();
    run.spawned = run.toSpawn(); // everything has come in...
    w.enemies = [{ id: 9999, x: 5, y: 5, hp: 1e9, maxHp: 1e9, speed: 0, dmg: 0, born: 0, kind: 'crawler-1' }]; // ...except one that never moves and cannot be hurt
    for (let i = 0; i < 40 * 30 && run.phase === 'fight'; i++) run.update(1 / 30);
    expect(run.phase).toBe('won');
    expect(w.enemies.length).toBe(0);
  });
});

describe('enemies caught on scenery', () => {
  it('are pushed on, and given up on if they keep getting caught, so a fight cannot hang on rocks', () => {
    const w = baseWorld();
    const run = new Run(w, { buildSeconds: 0, fightSeconds: 60, enemies: false });
    run.startFight();
    // a far-away enemy walled in by rocks on every side
    const ex = 8.5, ey = 8.5;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (Math.max(Math.abs(dx), Math.abs(dy)) === 2) w.terrain[(8 + dy) * w.w + 8 + dx] = 1;
    w.enemies = [{ id: 7, x: ex, y: ey, hp: 1e6, maxHp: 1e6, speed: 1, dmg: 0, born: 0, kind: 'crawler-1' }];
    let nudged = false;
    for (let i = 0; i < 20 * 30; i++) { run.update(1 / 30); const e = w.enemies[0]; if (e && Math.hypot(e.x - ex, e.y - ey) > 2.5) nudged = true; if (!w.enemies.length) break; }
    expect(nudged || w.enemies.length === 0).toBe(true); // it was moved out within seconds
  });

  it('brings an enemy sealed deep inside rock out and on to the core', () => {
    const w = baseWorld();
    const run = new Run(w, { buildSeconds: 0, fightSeconds: 60, enemies: false });
    run.startFight();
    for (let dy = -9; dy <= 9; dy++) for (let dx = -9; dx <= 9; dx++) w.terrain[(20 + dy) * w.w + 20 + dx] = 1;
    w.terrain[20 * w.w + 20] = 0;
    w.enemies = [{ id: 7, x: 20.5, y: 20.5, hp: 1e6, maxHp: 1e6, speed: 1, dmg: 0, born: 0, kind: 'crawler-1' }];
    for (let i = 0; i < 80 * 30 && w.enemies.length; i++) run.update(1 / 30);
    const e = w.enemies[0];
    expect(!e || Math.hypot(e.x - 49.5, e.y - 49.5) < 10).toBe(true); // it got free and reached the core (or gave up)
  });
});

describe('spawn pings', () => {
  it('fade out in every phase, never freezing as a still ring', () => {
    const w = baseWorld();
    const run = new Run(w, { buildSeconds: 100, enemies: false });
    w.alerts.push({ x: 50, y: 50, age: 0, life: 4, big: true });
    expect(run.phase).toBe('build');
    for (let i = 0; i < 6 * 30; i++) run.update(1 / 30);
    expect(w.alerts.length).toBe(0);
  });
  it('are cleared when the level is won', () => {
    const w = baseWorld();
    const run = new Run(w, { buildSeconds: 0, fightSeconds: 60 });
    run.startFight();
    run.spawned = run.toSpawn(); w.enemies = [];
    w.alerts.push({ x: 50, y: 50, age: 0, life: 6, big: true });
    run.update(1 / 30);
    expect(run.phase).toBe('won');
    expect(w.alerts.length).toBe(0);
  });
});

describe('live attack glow', () => {
  it('marks where buildings and the core are hit, merges nearby hits, and fades', () => {
    const w = baseWorld();
    w.place('wall', 70, 70, 0);
    const run = new Run(w, { buildSeconds: 0, enemies: false });
    run.startFight();
    w.enemies = [{ id: 5, x: 69.5, y: 70.5, hp: 1e6, maxHp: 1e6, speed: 0, dmg: 5, born: 0, kind: 'crawler-1' }];
    for (let i = 0; i < 3 * 30; i++) run.update(1 / 30);
    expect(w.hurt.length).toBe(1); // one glow on the wall, not one per hit
    expect(Math.hypot(w.hurt[0].x - 70.5, w.hurt[0].y - 70.5)).toBeLessThan(1);
    w.enemies = [];
    for (let i = 0; i < 2 * 30; i++) run.update(1 / 30);
    expect(w.hurt.length).toBe(0); // gone a moment after the attack stops
  });
});

describe('breather between waves', () => {
  it('waits the full gap after a wave is destroyed, and the waves grow through the level', async () => {
    const { waveGap, waveCount } = await import('./round');
    const w = baseWorld();
    const run = new Run(w, { buildSeconds: 0, fightSeconds: 600 });
    run.level = 5;
    run.startFight();
    const sizes: number[] = [];
    let last = 0, clearedAt = -1, minGap = 1e9, t = 0;
    for (let i = 0; i < 400 * 30 && run.phase === 'fight'; i++) {
      run.update(1 / 30); t += 1 / 30;
      if (w.core) w.core.hp = w.core.maxHp;
      if (run.spawned > last) { // enemies arrived: count them into the current wave and note how long since the last kill
        if (clearedAt >= 0) { minGap = Math.min(minGap, t - clearedAt); sizes.push(run.spawned - last); clearedAt = -1; } else if (sizes.length) sizes[sizes.length - 1] += run.spawned - last; else sizes.push(run.spawned - last);
        last = run.spawned;
      }
      if (w.enemies.length && run.spawned >= last && !run.inLull()) { /* alive: wait */ }
      if (w.enemies.length === 0 && run.waveInfo().breather !== null && clearedAt < 0 && last > 0) clearedAt = t;
      if (t > 3 && w.enemies.length) w.enemies = []; // every wave is destroyed 3 seconds after it begins
    }
    expect(waveCount(5)).toBeGreaterThanOrEqual(4);
    expect(sizes.length).toBeGreaterThanOrEqual(3);
    expect(minGap).toBeGreaterThanOrEqual(waveGap(5) - 1.5); // never closer than the gap
    expect(sizes[sizes.length - 1]).toBeGreaterThan(sizes[0]); // the last wave is bigger than the first
  });
});

describe('calling the next wave early', () => {
  it('skips the breather and pays plates, but only during a breather', () => {
    const w = baseWorld();
    w.freeBuild = false;
    const run = new Run(w, { buildSeconds: 0, fightSeconds: 600 });
    run.level = 4;
    run.startFight();
    expect(run.callNextWave()).toBe(-1); // nothing to skip before the first wave
    for (let i = 0; i < 4 * 30; i++) run.update(1 / 30);
    w.enemies = [];
    for (let i = 0; i < 3 * 30; i++) run.update(1 / 30);
    expect(run.waveInfo().breather).not.toBeNull();
    const before = w.stock['iron-plate'] ?? 0, spawnedBefore = run.spawned;
    const bonus = run.callNextWave();
    expect(bonus).toBeGreaterThan(10);
    expect(w.stock['iron-plate'] ?? 0).toBe(before + bonus);
    for (let i = 0; i < 3 * 30; i++) run.update(1 / 30);
    expect(run.spawned).toBeGreaterThan(spawnedBefore); // the next wave came at once
    expect(run.callNextWave()).toBe(-1); // and cannot be called again while it is on
  });
});
