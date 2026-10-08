import { afterEach, describe, expect, it } from 'vitest';
import { COMMANDERS, DEFAULT_MODS, commanderById, modsFor, starsForLevel } from './commanders';
import { restoreRun, saveRun, loadSave } from '../save';
import { bestLevel, recordWin, starsFor } from '../progress';
import { generateWorld } from './mapgen';
import { researchFx } from './research';
import { Run } from './round';
import { World, isFab } from './world';
import { fabOf } from './robots';

// a tiny in-memory localStorage so the save and progress code can run under Node
const store = new Map<string, string>();
(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); }, removeItem: (k: string) => { store.delete(k); },
  clear: () => store.clear(), key: () => null, length: 0,
} as Storage;
afterEach(() => store.clear());

const withMods = (id: string): World => {
  const w = new World(100, 100);
  w.mods = modsFor(commanderById(id));
  w.place('core', 48, 48, 0);
  return w;
};

describe('commanders', () => {
  it('give every playable commander a real trade-off', () => {
    for (const c of COMMANDERS) {
      if (c.locked || c.id === 'wren') { expect(c.mods).toEqual({}); continue; } // the starter and the not-yet-built ones have no modifiers
      const changed = Object.entries(c.mods).filter(([k, v]) => v !== (DEFAULT_MODS as unknown as Record<string, number>)[k]);
      expect(changed.length).toBeGreaterThanOrEqual(2);
    }
    expect(COMMANDERS.filter((c) => !c.locked).length).toBe(9); // the starter plus eight to earn: every commander's weapon now exists
  });

  it('change turret strength, capacity and toughness', () => {
    const brakka = withMods('brakka'), grim = withMods('grimwald');
    const t = brakka.place('turret', 30, 30, 0)!, u = grim.place('turret', 30, 30, 0)!, plain = new World(100, 100).place('turret', 30, 30, 0)!;
    if (t.kind !== 'turret' || u.kind !== 'turret' || plain.kind !== 'turret') throw new Error('setup');
    expect(t.maxAmmo).toBe(60);
    expect(u.maxHp).toBe(plain.maxHp * 1.5);
    expect(t.maxHp).toBe(plain.maxHp);
  });

  it('make turrets hit harder for Brakka than for the Foundry Regent', () => {
    const shoot = (id: string) => {
      const w = withMods(id);
      const t = w.place('turret', 44, 44, 0)!;
      if (t.kind !== 'turret') throw new Error('setup');
      t.ammo = 5;
      w.enemies.push({ id: 1, x: 45, y: 47, hp: 1000, maxHp: 1000, speed: 0, dmg: 0, born: 0, kind: 'crawler-1' });
      const run = new Run(w, { buildSeconds: 0, fightSeconds: 60 });
      run.startFight();
      for (let i = 0; i < 20; i++) run.update(1 / 30);
      return 1000 - w.enemies[0].hp;
    };
    expect(shoot('brakka')).toBeGreaterThan(shoot('regent'));
  });

  it('make small robots build faster for Pim and big ones slower', () => {
    const fab = (id: string, type: 'trooper' | 'heavy') => {
      const w = withMods(id);
      w.research['robot-designs'] = 5; w.rfx = researchFx(w); // every robot design researched
      const f = w.place(fabOf(type), 30, 30, 0)!;
      if (!isFab(f)) throw new Error('setup');
      f.type = type; f.inv = { 'iron-plate': 400, 'copper-plate': 400, 'tin-plate': 400, 'lead-plate': 400 };
      const run = new Run(w, { buildSeconds: 0, fightSeconds: 600 });
      run.startFight();
      let t = 0;
      while (w.soldiers.length === 0 && t < 200) { run.update(1 / 30); t += 1 / 30; }
      return t;
    };
    const plain = 'tamsin'; // close to default on robots
    expect(fab('pim', 'trooper')).toBeLessThan(fab(plain, 'trooper'));
    expect(fab('pim', 'heavy')).toBeGreaterThan(fab(plain, 'heavy'));
  });

  it('offers a fourth module to the Forewoman', () => {
    expect(modsFor(commanderById('tamsin')).moduleChoices).toBe(4);
    expect(modsFor(commanderById('brakka')).moduleChoices).toBe(3);
  });

  it('remember the commander through a save', () => {
    const w = generateWorld();
    w.place('core', 79, 91, 0);
    const run = new Run(w, {});
    expect(saveRun(run, 'ilka')).toBe(true);
    const s = loadSave()!;
    expect(s.commander).toBe('ilka');
    expect(restoreRun(s).world.mods.coilJumps).toBe(2);
  });

  it('award a star at levels 10, 20 and 30', () => {
    expect([9, 10, 19, 20, 29, 30, 45].map(starsForLevel)).toEqual([0, 1, 1, 2, 2, 3, 3]);
    expect(recordWin('brakka', 5)).toBe(false);
    expect(recordWin('brakka', 10)).toBe(true);
    expect(recordWin('brakka', 12)).toBe(false);
    expect(bestLevel('brakka')).toBe(12);
    expect(starsFor('brakka')).toBe(1);
    expect(starsFor('regent')).toBe(0);
    expect(recordWin('brakka', 30)).toBe(true);
    expect(starsFor('brakka')).toBe(3);
  });
});
