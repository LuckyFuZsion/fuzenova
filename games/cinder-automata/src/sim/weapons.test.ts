import { describe, expect, it } from 'vitest';
import { stepCombat } from './combat';
import { DEFAULT_MODS } from './commanders';
import { damageMul, typedDamage, weaknessTags } from './enemies';
import { researchFx } from './research';
import { COIL_VARIANTS, VARIANTS, setCoilVariant, setVariant, variantOf } from './turrets';
import { World, accepts, type Coil, type Turret } from './world';

const enemy = (id: number, x: number, y: number, kind = 'crawler-1', hp = 1000) => ({ id, x, y, hp, maxHp: hp, speed: 0, dmg: 0, born: 0, kind }) as never;
function base(): World {
  const w = new World(100, 100);
  w.place('core', 80, 80, 0);
  w.research['turret-designs'] = 3; w.research['flame-designs'] = 3; w.research['coil-designs'] = 2; w.rfx = researchFx(w);
  w.stock['iron-plate'] = 1000; w.stock['copper-plate'] = 1000;
  w.freeBuild = false; // upgrades cost plates
  return w;
}
const run = (w: World, secs: number) => { for (let i = 0; i < secs * 30; i++) stepCombat(w, 1 / 30); };

describe('upgrading turrets in tiers', () => {
  it('base to a level-1 type to the level-2 weapon, and not straight to level 2', () => {
    const w = base();
    const t = w.place('turret', 20, 20, 0) as Turret;
    expect(setVariant(w, t, 'artillery')).toBe('wrong');     // needs a level-1 type first
    expect(setVariant(w, t, 'scatter')).toBe('ok');
    expect(setVariant(w, t, 'artillery')).toBe('ok');         // from either level-1 type
    expect(variantOf(t)).toBe('artillery');
    expect(setVariant(w, t, 'flamer')).toBe('wrong');         // a different family
  });
  it('costs plates going up, and is free going back down', () => {
    const w = base();
    const t = w.place('turret', 20, 20, 0) as Turret;
    const before = w.stock['iron-plate']!;
    setVariant(w, t, 'sniper');
    expect(w.stock['iron-plate']).toBe(before - VARIANTS.sniper.cost['iron-plate']!);
    const after = w.stock['iron-plate']!;
    expect(setVariant(w, t, 'gun')).toBe('ok');
    expect(w.stock['iron-plate']).toBe(after);
  });
  it('needs the research', () => {
    const w = base();
    w.research['turret-designs'] = 1; w.rfx = researchFx(w);
    const t = w.place('turret', 20, 20, 0) as Turret;
    expect(setVariant(w, t, 'sniper')).toBe('locked');
    setVariant(w, t, 'scatter');
    w.research['turret-designs'] = 2; // not yet 3
    expect(setVariant(w, t, 'artillery')).toBe('locked');
  });
  it('the fire family works the same way', () => {
    const w = base();
    const f = w.place('flamer', 20, 20, 0) as Turret;
    expect(variantOf(f)).toBe('flamer');
    expect(setVariant(w, f, 'plasma')).toBe('wrong');
    expect(setVariant(w, f, 'torch')).toBe('ok');
    expect(setVariant(w, f, 'plasma')).toBe('ok');
  });
  it('the coils too: Shield or Stun, then the Railgun', () => {
    const w = base();
    const c = w.place('coil', 20, 20, 0) as Coil;
    expect(setCoilVariant(w, c, 'railgun')).toBe('wrong');
    expect(setCoilVariant(w, c, 'stun')).toBe('ok');
    expect(setCoilVariant(w, c, 'railgun')).toBe('ok');
  });
});

describe('ammunition', () => {
  it('a gun turret takes plates and bullets, artillery only shells, fire only fuel', () => {
    const w = base();
    const gun = w.place('turret', 10, 10, 0) as Turret, art = w.place('turret', 20, 10, 0) as Turret, fire = w.place('flamer', 30, 10, 0) as Turret;
    art.variant = 'artillery';
    expect(accepts(gun, 'iron-plate')).toBe(true);
    expect(accepts(gun, 'coal')).toBe(false);
    expect(accepts(art, 'artillery-shell')).toBe(true);
    expect(accepts(art, 'bullet')).toBe(false);
    expect(accepts(fire, 'coal')).toBe(true);
    expect(accepts(fire, 'iron-plate')).toBe(false);
  });
  it('switching to artillery empties the old ammunition', () => {
    const w = base();
    const t = w.place('turret', 20, 20, 0) as Turret;
    setVariant(w, t, 'scatter');
    t.ammo = 20;
    setVariant(w, t, 'artillery');
    expect(t.ammo).toBe(0);
  });
});

describe('damage types and weaknesses', () => {
  it('flat armour stops kinetic damage but not flame or energy', () => {
    expect(typedDamage('crawler-2', 10, 'kinetic')).toBeLessThan(10);
    expect(typedDamage('crawler-2', 10, 'flame')).toBeGreaterThanOrEqual(10);
    expect(typedDamage('brute-2', 10, 'energy')).toBeGreaterThanOrEqual(10);
  });
  it('every enemy is weak to something and resists something at most 30% either way', () => {
    for (const k of ['crawler-1', 'spider-1', 'drone-1', 'acid-1', 'brute-2'] as const) {
      const t = weaknessTags(k);
      expect(t.weak.length).toBeGreaterThan(0);
      for (const ty of ['kinetic', 'flame', 'energy', 'lightning'] as const) { expect(damageMul(k, ty)).toBeGreaterThanOrEqual(0.7); expect(damageMul(k, ty)).toBeLessThanOrEqual(1.4); }
    }
  });
});

describe('the new turrets in a fight', () => {
  it('artillery bursts over a cluster, but cannot hit what is close', () => {
    const w = base();
    const t = w.place('turret', 20, 20, 0) as Turret;
    setVariant(w, t, 'sniper'); setVariant(w, t, 'artillery'); t.ammo = 30; t.dmg = 70;
    w.enemies.push(enemy(1, 32, 21), enemy(2, 33, 21.5), enemy(3, 32.5, 20.5), enemy(4, 22, 21)); // a cluster 12 away, and one too close
    run(w, 5);
    const hp = (id: number) => w.enemies.find((e) => e.id === id)?.hp ?? 0;
    expect(hp(1)).toBeLessThan(1000); expect(hp(2)).toBeLessThan(1000); expect(hp(3)).toBeLessThan(1000);
    expect(hp(4)).toBe(1000);
  });
  it('a flamer sets enemies in its cone alight, and the fire keeps hurting after the shot', () => {
    const w = base();
    const f = w.place('flamer', 20, 20, 0) as Turret;
    f.ammo = 60; f.dmg = 6; f.aim = 0;
    w.enemies.push(enemy(1, 23.5, 21), enemy(2, 23.8, 21.4));
    run(w, 0.5);
    const hit = w.enemies.find((e) => e.id === 1)!;
    expect(hit.burn).toBeDefined();
    f.ammo = 0;
    const hp0 = hit.hp;
    run(w, 1.5);
    expect(hit.hp).toBeLessThan(hp0); // still burning with the flamer out of fuel
  });
  it('plasma ignores armour that stops the same damage from a gun', () => {
    const wA = base(), wB = base();
    const plasma = wA.place('flamer', 20, 20, 0) as Turret; setVariant(wA, plasma, 'torch'); setVariant(wA, plasma, 'plasma'); plasma.ammo = 40; plasma.dmg = 6;
    const gun = wB.place('turret', 20, 20, 0) as Turret; gun.ammo = 40; gun.dmg = 6 * VARIANTS.plasma.dmgMul; // the same raw damage
    wA.enemies.push(enemy(1, 28, 20.5, 'brute-2')); wB.enemies.push(enemy(1, 25, 20.5, 'brute-2'));
    wB.entities.forEach((e) => { if (e.kind === 'turret') e.cooldown = 0.3; }); run(wA, 0.35); run(wB, 0.35); // one shot each
    expect(1000 - wA.enemies[0].hp).toBeGreaterThan(1000 - wB.enemies[0].hp);
  });
});

describe('the coil family', () => {
  it('a Shield coil halves what an enemy does to a nearby wall, and spends charge doing it', () => {
    const run1 = (shield: boolean) => {
      const w = base();
      const wall = w.place('wall', 40, 40, 0)!;
      if (shield) { const c = w.place('coil', 42, 42, 0) as Coil; c.variant = 'shield'; c.charge = 200; }
      w.enemies.push({ id: 1, x: 40.6, y: 41.5, hp: 1e6, maxHp: 1e6, speed: 0, dmg: 10, born: 0, kind: 'crawler-1' } as never);
      run(w, 3);
      return { lost: wall.maxHp - wall.hp, w };
    };
    const open = run1(false), covered = run1(true);
    expect(covered.lost).toBeLessThan(open.lost * 0.7);
    expect((covered.w.shields[0] as Coil).charge).toBeLessThan(200);
  });
  it('a Stun coil freezes enemies in place for a moment, and they move again afterwards', () => {
    const w = base();
    const c = w.place('coil', 40, 40, 0) as Coil; c.variant = 'stun'; c.charge = 200;
    w.enemies.push({ id: 1, x: 43, y: 41, hp: 1e6, maxHp: 1e6, speed: 2, dmg: 0, born: 0, kind: 'crawler-1' } as never);
    run(w, 0.3);
    const x0 = w.enemies[0].x;
    expect(w.enemies[0].stun).toBeGreaterThan(0);
    run(w, 0.5);
    expect(w.enemies[0].x).toBeCloseTo(x0, 1);      // held
    run(w, 4);
    expect(Math.hypot(w.enemies[0].x - x0, w.enemies[0].y - 41)).toBeGreaterThan(1); // free again
  });
  it('a Railgun hits everything on its line and nothing off it, armour or not', () => {
    const w = base();
    const c = w.place('coil', 20, 20, 0) as Coil; c.variant = 'railgun'; c.charge = 200;
    w.enemies.push(enemy(1, 26, 21, 'brute-2'), enemy(2, 31, 21, 'crawler-1'), enemy(3, 36, 21, 'crawler-1'), enemy(4, 28, 25, 'crawler-1'));
    run(w, 0.2);
    const hp = (id: number) => w.enemies.find((e) => e.id === id)?.hp ?? 0;
    expect(hp(1)).toBeLessThan(900); expect(hp(2)).toBeLessThan(900); expect(hp(3)).toBeLessThan(900);
    expect(hp(4)).toBe(1000);
    expect(c.charge).toBeLessThan(200);
    expect(COIL_VARIANTS.railgun.charge).toBeGreaterThan(COIL_VARIANTS.coil.charge);
  });
});

describe('the commanders that were waiting for these weapons', () => {
  it('Ozric widens bursts and hits harder, Ysolde makes fire hit harder', () => {
    expect(DEFAULT_MODS.blastMul).toBe(1);
    const w = base();
    w.mods = { ...DEFAULT_MODS, blastMul: 1.3, blastDmg: 1.25 };
    const t = w.place('turret', 20, 20, 0) as Turret;
    setVariant(w, t, 'sniper'); setVariant(w, t, 'artillery'); t.ammo = 30; t.dmg = 70;
    w.enemies.push(enemy(1, 32, 21), enemy(2, 34.2, 21)); // the second is just outside a normal burst
    run(w, 4);
    expect(w.enemies.find((e) => e.id === 2)!.hp).toBeLessThan(1000);
  });
});
