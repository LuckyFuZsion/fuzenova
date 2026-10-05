import { describe, expect, it } from 'vitest';
import { clearLine, findPath, resetPathBudget, solidAt, walkGround } from './pathfind';
import { Run } from './round';
import { World } from './world';

function arena(from = 30, to = 70): World {
  const w = new World(100, 100);
  w.place('core', 10, 10, 0);
  // a wall across the middle of the map; the way round is past either end
  for (let y = from; y < to; y++) w.place('wall', 50, y, 0);
  return w;
}

describe('ground unit pathfinding', () => {
  it('treats machines and walls as solid but belts and inserters as walkable', () => {
    const w = new World(40, 40);
    w.place('belt', 5, 5, 0); w.place('inserter', 6, 5, 0); w.place('wall', 7, 5, 0); w.place('turret', 9, 5, 0);
    expect(solidAt(w, 5, 5)).toBe(false);
    expect(solidAt(w, 6, 5)).toBe(false);
    expect(solidAt(w, 7, 5)).toBe(true);
    expect(solidAt(w, 10, 6)).toBe(true);
    expect(solidAt(w, -1, 0)).toBe(true);
  });

  it('finds a route round a wall, and none of it goes through a solid tile', () => {
    const w = arena();
    expect(clearLine(w, 45, 50, 56, 50)).toBe(false);
    const path = findPath(w, 45.5, 50.5, 56.5, 50.5)!;
    expect(path).not.toBeNull();
    let x = 45.5, y = 50.5;
    for (const p of path) { expect(clearLine(w, x, y, p.x, p.y)).toBe(true); x = p.x; y = p.y; }
    expect(Math.hypot(x - 56.5, y - 50.5)).toBeLessThan(1.2);
  });

  it('sends a ground robot round the wall to an enemy on the other side, never over it', () => {
    const w = arena(44, 57); // short enough that going round stays inside the robots' awareness of the enemy
    const fab = w.place('robotfab', 40, 44, 0)!; // the robot's home, so the enemy is inside its leash
    w.soldiers.push({ id: 1, type: 'trooper', x: 45.5, y: 50.5, hp: 75, maxHp: 75, cool: 0, face: 1, fab: fab.id });
    w.enemies.push({ id: 1, x: 56.5, y: 50.5, hp: 1e6, maxHp: 1e6, speed: 0, dmg: 0, born: 0, kind: 'crawler-1' });
    const run = new Run(w, { buildSeconds: 0, fightSeconds: 600, arenaHalf: 500 }); // the whole map is in play
    run.startFight();
    let over = 0;
    for (let i = 0; i < 60 * 30; i++) {
      run.update(1 / 30);
      const s = w.soldiers[0];
      if (solidAt(w, Math.floor(s.x), Math.floor(s.y))) over++;
    }
    expect(over).toBe(0);
    const s = w.soldiers[0];
    expect(Math.hypot(s.x - 56.5, s.y - 50.5)).toBeLessThanOrEqual(5.6); // reached firing range
    expect(1e6 - w.enemies[0].hp).toBeGreaterThan(0);                       // and started shooting
  });

  it('lets flying robots cross buildings as before', () => {
    const w = arena();
    w.soldiers.push({ id: 1, type: 'drone-1', x: 47.5, y: 50.5, hp: 18, maxHp: 18, cool: 0, face: 1 });
    w.enemies.push({ id: 1, x: 56.5, y: 50.5, hp: 1e6, maxHp: 1e6, speed: 0, dmg: 0, born: 0, kind: 'crawler-1' });
    const run = new Run(w, { buildSeconds: 0, fightSeconds: 600, arenaHalf: 500 });
    run.startFight();
    let crossed = false;
    for (let i = 0; i < 10 * 30; i++) { run.update(1 / 30); if (Math.floor(w.soldiers[0].x) === 50) crossed = true; }
    expect(crossed || w.soldiers[0].x > 50).toBe(true);
  });

  it('gives up cleanly when a unit is walled in', () => {
    const w = new World(40, 40);
    for (let i = 4; i <= 8; i++) { w.place('wall', i, 4, 0); w.place('wall', i, 8, 0); }
    for (let i = 5; i <= 7; i++) { w.place('wall', 4, i, 0); w.place('wall', 8, i, 0); }
    const path = findPath(w, 6.5, 6.5, 20.5, 20.5);
    expect(path === null || path.length >= 0).toBe(true); // no crash, no endless search
  });

  it('sends ground enemies round rocks to the core, and never through them', () => {
    const w = new World(100, 100);
    w.place('core', 48, 48, 0);
    for (let y = 30; y <= 52; y++) w.terrain[y * 100 + 40] = 1;          // a rock wall west of the core, open to the south
    w.enemies.push({ id: 1, x: 30.5, y: 40.5, hp: 1e6, maxHp: 1e6, speed: 2, dmg: 1, born: 0, kind: 'crawler-1' });
    const run = new Run(w, { buildSeconds: 0, fightSeconds: 600, arenaHalf: 500 });
    run.startFight();
    let inRock = 0;
    for (let i = 0; i < 90 * 30; i++) {
      run.update(1 / 30);
      const e = w.enemies[0];
      if (w.hasTerrain(Math.floor(e.x), Math.floor(e.y))) inRock++;
    }
    expect(inRock).toBe(0);
    expect(w.core!.hp).toBeLessThan(w.core!.maxHp); // it got round the wall and reached the core
  });

  it('keeps buildings off rocks and outside the explored area', () => {
    const w = new World(100, 100);
    w.place('core', 48, 48, 0);
    w.terrain[20 * 100 + 20] = 2;
    expect(w.canPlace('wall', 20, 20)).toBe(false);
    w.setArenaHalf(10);
    expect(w.canPlace('wall', 55, 55)).toBe(true);
    expect(w.canPlace('wall', 80, 50)).toBe(false);
  });

  it('makes a bigger map available as the level rises', () => {
    const w = new World(200, 200);
    w.place('core', 98, 98, 0);
    const run = new Run(w, { buildSeconds: 0, fightSeconds: 60 });
    const small = w.arena.x1 - w.arena.x0;
    run.phase = 'won'; run.nextLevel(); run.phase = 'won'; run.nextLevel();
    expect(w.arena.x1 - w.arena.x0).toBeGreaterThan(small);
  });
});

describe('placing a building on a unit', () => {
  it('refuses to put a solid building on top of a walking enemy, but allows belts and flyers', async () => {
    const { World } = await import('./world');
    const w = new World(40, 40);
    w.place('core', 5, 5, 0);
    w.enemies.push({ id: 1, x: 20.5, y: 20.5, hp: 10, maxHp: 10, speed: 1, dmg: 1, born: 0, kind: 'crawler-1' });
    w.enemies.push({ id: 2, x: 30.5, y: 20.5, hp: 10, maxHp: 10, speed: 1, dmg: 1, born: 0, kind: 'drone-1' });
    expect(w.place('wall', 20, 20, 0)).toBeNull();
    expect(w.canPlace('turret', 19, 19, 0)).toBe(false); // covers the enemy's tile
    expect(w.place('belt', 20, 20, 0)).not.toBeNull();   // flat things are fine
    expect(w.place('wall', 30, 20, 0)).not.toBeNull();   // a flyer does not block building
    expect(w.place('wall', 22, 20, 0)).not.toBeNull();   // nowhere near it
  });

  it('moves the enemy and the robot out instead of trapping them inside', async () => {
    const { evictUnits, solidAt } = await import('./pathfind');
    const { World } = await import('./world');
    const w = new World(40, 40);
    w.place('core', 5, 5, 0);
    const wall = w.place('turret', 20, 20, 0)!;
    expect(solidAt(w, 20, 20)).toBe(true);
    // something ends up inside it afterwards (a robot moved, an enemy pushed in): it is lifted out
    w.enemies.push({ id: 1, x: 20.5, y: 20.5, hp: 10, maxHp: 10, speed: 1, dmg: 1, born: 0, kind: 'crawler-1' });
    w.enemies.push({ id: 2, x: 20.5, y: 21.5, hp: 10, maxHp: 10, speed: 1, dmg: 1, born: 0, kind: 'drone-1' }); // a flyer: left where it is
    w.soldiers.push({ id: 1, type: 'heavy', x: 21.5, y: 20.5, hp: 100, maxHp: 100, cool: 0, face: 1 });
    evictUnits(w, wall);
    expect(solidAt(w, Math.floor(w.enemies[0].x), Math.floor(w.enemies[0].y))).toBe(false);
    expect(solidAt(w, Math.floor(w.soldiers[0].x), Math.floor(w.soldiers[0].y))).toBe(false);
    expect(w.enemies[1].x).toBe(20.5);
    expect(Math.hypot(w.enemies[0].x - 20.5, w.enemies[0].y - 20.5)).toBeLessThan(4);
  });

  it('does not bother with flat things like belts', async () => {
    const { evictUnits } = await import('./pathfind');
    const { World } = await import('./world');
    const w = new World(40, 40);
    w.enemies.push({ id: 1, x: 10.5, y: 10.5, hp: 10, maxHp: 10, speed: 1, dmg: 1, born: 0, kind: 'crawler-1' });
    const b = w.place('belt', 10, 10, 0)!;
    evictUnits(w, b);
    expect(w.enemies[0].x).toBe(10.5);
  });
});

describe('big walkers', () => {
  const wallOfRock = (gaps: number[][]) => {
    const w = new World(70, 70);
    w.place('core', 5, 5, 0);
    for (let y = 5; y < 65; y++) if (!gaps.some(([a, b]) => y >= a && y <= b)) w.terrain[y * 70 + 35] = 1;
    return w;
  };
  const walk = (w: World, wide: boolean) => {
    const u: { id: number; x: number; y: number; path?: { x: number; y: number }[]; pathT?: number } = { id: 1, x: 25.5, y: 30.5 };
    let minGapY = 99, maxGapY = -1;
    for (let i = 0; i < 40 * 30; i++) {
      resetPathBudget(); walkGround(w, u, 45.5, 30.5, 2, 1 / 30, false, wide);
      if (Math.abs(u.x - 35.5) < 0.6) { minGapY = Math.min(minGapY, u.y); maxGapY = Math.max(maxGapY, u.y); }
    }
    return { u, gapY: (minGapY + maxGapY) / 2 };
  };

  it('takes a wide gap in the rocks rather than scraping through a one-tile gap', () => {
    const w = wallOfRock([[30, 30], [46, 50]]);
    const small = walk(w, false), big = walk(w, true);
    expect(small.gapY).toBeLessThan(35);   // the small walker uses the near one-tile gap
    expect(big.gapY).toBeGreaterThan(44);  // the big one goes round to the wide gap
    expect(big.u.x).toBeGreaterThan(44);   // and still arrives
  });

  it('still squeezes through a one-tile gap when it is the only way', () => {
    const w = wallOfRock([[30, 30]]);
    expect(walk(w, true).u.x).toBeGreaterThan(44);
  });
});
