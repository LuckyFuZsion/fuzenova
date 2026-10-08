import { describe, expect, it } from 'vitest';
import { stepCombat } from './combat';
import { COMMANDERS, DEFAULT_MODS } from './commanders';
import { PERKS, balance, mergePrestige, spent } from './prestige';
import { STARTING_TALENTS, TALENTS, TALENT_SLOTS, applyTalents, owns, setSlot, talentsFor, unlockTalent, type TalentState } from './talents';
import { World, type Turret } from './world';

const none: TalentState = { unlocked: [], loadout: {} };
const foe = (id: number, x: number, y: number, hp = 1e6) => ({ id, x, y, hp, maxHp: hp, speed: 1, dmg: 0, born: 0, kind: 'crawler-1' as const });
const tick = (w: World, s: number) => { for (let i = 0; i < s * 30; i++) stepCombat(w, 1 / 30); };

describe('talents', () => {
  it('every commander starts with three talents they already own', () => {
    for (const c of COMMANDERS) {
      expect(STARTING_TALENTS[c.id]).toHaveLength(TALENT_SLOTS);
      expect(talentsFor(c.id, none)).toEqual(STARTING_TALENTS[c.id]);
    }
  });
  it('more talents are bought, and only then can be slotted on any commander', () => {
    expect(setSlot(none, 'ilka', 0, 'pyre')).toBeNull();
    const s = unlockTalent(none, 'pyre')!;
    expect(owns(TALENTS.find((t) => t.id === 'pyre')!, s)).toBe(true);
    expect(unlockTalent(s, 'pyre')).toBeNull();
    const next = setSlot(s, 'ilka', 0, 'pyre')!;
    expect(talentsFor('ilka', next)[0]).toBe('pyre');
    expect(talentsFor('brakka', next)).toEqual(STARTING_TALENTS.brakka); // other commanders keep theirs
  });
  it('putting a worn talent in another slot swaps rather than doubling up', () => {
    const next = setSlot(none, 'wren', 2, 'salvage')!;
    const worn = talentsFor('wren', next);
    expect(new Set(worn).size).toBe(worn.length);
    expect(worn).toContain('salvage');
  });
  it('talents change the run modifiers, and unlock prices count as spent Embers', () => {
    const m = applyTalents({ ...DEFAULT_MODS }, 'brakka', none);
    expect(m.splash).toBeGreaterThan(0);
    expect(m.stunChance).toBeGreaterThan(0);
    expect(m.turretRange).toBeGreaterThan(1);
    const s = { earned: 100, levels: {}, unlocked: ['pyre'] };
    expect(spent(s)).toBe(40);
    expect(balance(s)).toBe(60);
    expect(PERKS.length).toBeGreaterThan(0);
  });
  it('two copies of a profile keep every talent either one unlocked', () => {
    const m = mergePrestige({ earned: 5, levels: {}, unlocked: ['pyre'] }, { earned: 9, levels: {}, unlocked: ['arcing'] });
    expect(m.unlocked!.sort()).toEqual(['arcing', 'pyre']);
  });

  it('Tar shot slows enemies the gun hits', () => {
    const w = new World(80, 80);
    w.place('core', 38, 60, 0);
    w.freeBuild = true;
    const t = w.place('turret', 40, 30, 0)! as Turret; t.ammo = 50;
    w.mods = { ...DEFAULT_MODS, slowHit: 0.5 };
    w.enemies.push(foe(1, 43, 31));
    tick(w, 1);
    expect(w.enemies[0].slow?.f).toBe(0.5);
  });
  it('Shrapnel rounds hurt enemies beside the target', () => {
    const w = new World(80, 80);
    w.place('core', 38, 60, 0);
    const t = w.place('turret', 40, 30, 0)! as Turret; t.ammo = 50;
    w.mods = { ...DEFAULT_MODS, splash: 0.4 };
    w.enemies.push(foe(1, 43, 31), foe(2, 43.6, 31.3));
    tick(w, 1);
    expect(w.enemies[1].hp).toBeLessThan(w.enemies[1].maxHp);
  });
  it('Concussive rounds stun now and then, the same way every run', () => {
    const run = () => {
      const w = new World(80, 80);
      w.place('core', 38, 60, 0);
      const t = w.place('turret', 40, 30, 0)! as Turret; t.ammo = 80;
      w.mods = { ...DEFAULT_MODS, stunChance: 0.5 };
      w.enemies.push(foe(1, 43, 31));
      let stuns = 0;
      for (let i = 0; i < 150; i++) { const before = w.enemies[0].stun ?? 0; stepCombat(w, 1 / 30); if ((w.enemies[0].stun ?? 0) > before) stuns++; }
      return stuns;
    };
    expect(run()).toBeGreaterThan(0);
    expect(run()).toBe(run());
  });
});
