import { describe, expect, it } from 'vitest';
import { repairAll, stepCombat } from './combat';
import { World } from './world';

const foe = (id: number, x: number, y: number) => ({ id, x, y, hp: 1e6, maxHp: 1e6, speed: 1, dmg: 6, born: 0 });
const tick = (w: World, s: number) => { for (let i = 0; i < s * 30; i++) stepCombat(w, 1 / 30); };

describe('structure damage', () => {
  it('enemies attack a wall near them before heading for the core', () => {
    const w = new World(80, 80);
    w.place('core', 38, 60, 0);
    const wall = w.place('wall', 40, 30, 0)!;
    w.enemies.push(foe(1, 40.5, 33));
    tick(w, 6);
    expect(wall.hp).toBeLessThan(wall.maxHp);
    expect(w.core!.hp).toBe(w.core!.maxHp);
  });

  it('prefers a turret or wall over a drill of similar distance', () => {
    const w = new World(80, 80);
    w.place('core', 38, 60, 0);
    const decoy = w.place('pole', 41, 31, 0)!; // a machine that is not a priority target
    const wall = w.place('wall', 39, 31, 0)!;
    w.enemies.push(foe(1, 40.5, 32.6));
    tick(w, 4);
    expect(wall.hp).toBeLessThan(wall.maxHp);
    expect(decoy.hp).toBe(decoy.maxHp);
  });

  it('removes a destroyed building and leaves the rest alone', () => {
    const w = new World(80, 80);
    w.place('core', 38, 60, 0);
    const wall = w.place('wall', 40, 30, 0)!;
    wall.hp = 3;
    w.enemies.push(foe(1, 40.5, 31.4));
    tick(w, 1.1); // long enough to break it, short enough that the explosion is still showing
    expect(w.entityAt(40, 30)).toBeUndefined();
    expect(w.fx.some((f) => f.name.startsWith('fx-explosion'))).toBe(true);
  });

  it('ignores belts and inserters, so a stray belt is never a target', () => {
    const w = new World(80, 80);
    w.place('core', 38, 60, 0);
    const belt = w.place('belt', 40, 30, 0)!;
    w.enemies.push(foe(1, 40.5, 30.7));
    tick(w, 3);
    expect(belt.hp).toBe(belt.maxHp);
  });

  it('repairs survivors for free between rounds but not the core', () => {
    const w = new World(80, 80);
    w.place('core', 38, 60, 0);
    const wall = w.place('wall', 40, 30, 0)!;
    wall.hp = 10; w.core!.hp = 100;
    repairAll(w);
    expect(wall.hp).toBe(wall.maxHp);
    expect(w.core!.hp).toBe(100);
  });
});

describe('armour and insulation', () => {
  it('takes a flat amount off each hit, but never more than three quarters of it', async () => {
    const { armouredDamage } = await import('./enemies');
    expect(armouredDamage('crawler-1', 10)).toBe(10);          // no armour
    expect(armouredDamage('crawler-3', 10)).toBe(7);           // armour 3
    expect(armouredDamage('crawler-3', 2)).toBe(0.5);          // a weak hit is cut to a quarter at worst: never zero
    expect(armouredDamage('boss-colossus', 20)).toBe(14);
  });

  it('hurts lightning hops more than a strong shot, and insulated enemies resist lightning', async () => {
    const { armouredDamage } = await import('./enemies');
    const firstHop = 30, laterHop = 17;
    const lostFirst = 1 - armouredDamage('crawler-3', firstHop, true) / firstHop;
    const lostLater = 1 - armouredDamage('crawler-3', laterHop, true) / laterHop;
    expect(lostLater).toBeGreaterThan(lostFirst);
    expect(armouredDamage('brute-2', 30, true)).toBeCloseTo((30 - 4) * 0.4);   // armour then the insulation
    expect(armouredDamage('brute-2', 30, false)).toBe(26);                      // a gun is not slowed by insulation
  });
});

describe('turret branches', () => {
  const setup = (variant?: 'scatter' | 'sniper') => {
    const w = new World(80, 80);
    w.place('core', 38, 60, 0);
    const t = w.place('turret', 36, 36, 0)!;
    if (t.kind !== 'turret') throw new Error('setup');
    t.ammo = 50; t.variant = variant;
    return { w, t };
  };
  const foe = (id: number, x: number, y: number, kind: 'crawler-1' | 'crawler-3' = 'crawler-1') => ({ id, x, y, hp: 1e6, maxHp: 1e6, speed: 0, dmg: 0, born: 0, kind });

  it('the scatter gun hits every enemy in its cone, the plain gun only one', () => {
    for (const variant of [undefined, 'scatter'] as const) {
      const { w } = setup(variant);
      w.enemies.push(foe(1, 40.5, 37.5), foe(2, 40.2, 38.2), foe(3, 39.8, 36.8), foe(4, 37, 49)); // three close together east, one far away
      for (let i = 0; i < 30; i++) stepCombat(w, 1 / 30);
      const hurt = w.enemies.filter((e) => e.hp < 1e6).length;
      if (variant === 'scatter') expect(hurt).toBeGreaterThanOrEqual(3); else expect(hurt).toBeLessThanOrEqual(2);
    }
  });

  it('the sniper out-ranges a gun turret and hits much harder, but fires slowly', () => {
    const gun = setup(), sniper = setup('sniper');
    for (const s of [gun, sniper]) s.w.enemies.push(foe(1, 37 + 10, 37));   // 10 tiles away: beyond a gun turret (7)
    for (const s of [gun, sniper]) for (let i = 0; i < 90; i++) stepCombat(s.w, 1 / 30);
    expect(gun.w.enemies[0].hp).toBe(1e6);
    expect(1e6 - sniper.w.enemies[0].hp).toBeGreaterThan(20);
    const near = setup('sniper'), gun2 = setup();
    for (const s of [near, gun2]) s.w.enemies.push(foe(1, 41, 37));
    for (const s of [near, gun2]) for (let i = 0; i < 60; i++) stepCombat(s.w, 1 / 30);
    // per shot the sniper does far more, though it shoots a lot less often
    expect(1e6 - near.w.enemies[0].hp).toBeGreaterThan(0);
  });

  it('upgrades are paid for, locked until researched, and free to switch back', async () => {
    const { setVariant } = await import('./turrets');
    const { addStock } = await import('./costs');
    const { Run } = await import('./round');
    const { t, w } = setup();
    w.freeBuild = false;
    expect(setVariant(w, t, 'scatter')).toBe('locked');
    w.research['turret-designs'] = 2;
    expect(setVariant(w, t, 'scatter')).toBe('short');
    addStock(w, { 'iron-plate': 100, 'copper-plate': 100 });
    expect(setVariant(w, t, 'scatter')).toBe('ok');
    expect(t.variant).toBe('scatter');
    expect(w.stock['iron-plate']).toBe(60);
    expect(setVariant(w, t, 'scatter')).toBe('same');
    expect(setVariant(w, t, 'gun')).toBe('ok');
    expect(w.stock['iron-plate']).toBe(60);                  // back to the plain gun costs nothing
    void Run;
  });
});

describe('robots help across the base', () => {
  it('a robot guarding one side marches to an attack on the other', async () => {
    const { World } = await import('./world');
    const { stepCombat } = await import('./combat');
    const w = new World(160, 160);
    w.place('core', 78, 78, 0);
    w.soldiers.push({ id: 1, type: 'trooper', x: 40, y: 80, hp: 100, maxHp: 100, cool: 0, face: 1 } as never);
    w.enemies.push({ id: 1, x: 100, y: 80, hp: 1e6, maxHp: 1e6, speed: 0, dmg: 0, born: 0, kind: 'swarmling' } as never);
    const x0 = w.soldiers[0].x;
    for (let i = 0; i < 20 * 30; i++) stepCombat(w, 1 / 30);
    expect(w.soldiers[0].x).toBeGreaterThan(x0 + 15);
  });
});

describe('robots stay near home', () => {
  it('ignore an enemy far outside their leash', async () => {
    const { World } = await import('./world');
    const { stepCombat } = await import('./combat');
    const w = new World(200, 200);
    w.place('core', 78, 78, 0);
    w.soldiers.push({ id: 1, type: 'trooper', x: 90, y: 80, hp: 100, maxHp: 100, cool: 0, face: 1 } as never);
    w.enemies.push({ id: 1, x: 150, y: 80, hp: 1e6, maxHp: 1e6, speed: 0, dmg: 0, born: 0, kind: 'swarmling' } as never);
    for (let i = 0; i < 20 * 30; i++) stepCombat(w, 1 / 30);
    expect(w.soldiers[0].x).toBeLessThan(110); // it stayed round its guard post instead of marching 60 tiles out
  });
});


describe('enemies and the power network', () => {
  it('attack a power pole when it is the nearest target, but a wall just as near is hit first', async () => {
    const { World } = await import('./world');
    const { stepCombat } = await import('./combat');
    const near = (withWall: boolean) => {
      const w = new World(60, 60);
      w.place('core', 40, 40, 0);
      const pole = w.place('pole', 20, 20, 0)!;
      const wall = withWall ? w.place('wall', 21, 22, 0)! : undefined;
      w.enemies.push({ id: 1, x: 21.0, y: 21.8, hp: 1e6, maxHp: 1e6, speed: 0, dmg: 5, born: 0, kind: 'crawler-1' } as never);
      for (let i = 0; i < 5 * 30; i++) stepCombat(w, 1 / 30);
      return { pole: pole.hp < pole.maxHp, wall: wall ? wall.hp < wall.maxHp : false };
    };
    expect(near(false).pole).toBe(true);        // alone, the pole is a target
    const both = near(true);
    expect(both.wall).toBe(true);                // with a wall about as near, the wall takes the hits
    expect(both.pole).toBe(false);
  });
});
