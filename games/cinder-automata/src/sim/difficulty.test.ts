import { afterEach, describe, expect, it } from 'vitest';
import { ACHIEVEMENTS } from './achievements';
import { COMMANDERS } from './commanders';
import { addStock } from './costs';
import { DIFFICULTIES, difficultyById } from './difficulty';
import { generateWorld } from './mapgen';
import { Run } from './round';
import { World } from './world';
import { isUnlocked, unlockCommander } from '../progress';
import { loadSave, restoreRun, saveRun } from '../save';

const store = new Map<string, string>();
(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); }, removeItem: (k: string) => { store.delete(k); },
  clear: () => store.clear(), key: () => null, length: 0,
} as Storage;
afterEach(() => store.clear());

const base = (): World => {
  const w = new World(100, 100);
  w.place('core', 48, 48, 0);
  return w;
};
const drive = (run: Run, s: number) => { for (let i = 0; i < s * 30; i++) run.update(1 / 30); };

describe('difficulty levels', () => {
  it('has four levels that get shorter and tougher', () => {
    expect(DIFFICULTIES.map((d) => d.id)).toEqual(['easy', 'normal', 'hard', 'extreme']);
    expect(difficultyById('nonsense').id).toBe('normal');
    const t = DIFFICULTIES.filter((d) => d.buildSeconds !== null).map((d) => d.buildSeconds!);
    expect(t).toEqual([...t].sort((a, b) => b - a));
  });

  it('Easy waits for the player to start the fight; Extreme starts it sooner than Normal', () => {
    const easy = new Run(base(), { difficulty: 'easy' });
    drive(easy, 600);
    expect(easy.phase).toBe('build');
    easy.startFight();
    expect(easy.phase).toBe('fight');
    const normal = new Run(base(), { difficulty: 'normal' }), extreme = new Run(base(), { difficulty: 'extreme' });
    drive(normal, 60); drive(extreme, 60);
    expect(normal.phase).toBe('build');
    expect(extreme.phase).toBe('fight');
  });

  it('makes enemies tougher on harder levels', () => {
    const hp = (id: 'easy' | 'extreme') => {
      const run = new Run(base(), { difficulty: id, buildSeconds: 0, fightSeconds: 30 });
      run.startFight();
      drive(run, 8);
      return run.world.enemies[0]?.maxHp ?? 0;
    };
    expect(hp('extreme')).toBeGreaterThan(hp('easy'));
  });

  it('charges for repairs on Hard and Extreme, only as far as the stock allows, and never on Normal', () => {
    const fight = (id: 'normal' | 'hard', iron: number) => {
      const w = base();
      w.freeBuild = false;
      addStock(w, { 'iron-plate': iron, 'copper-plate': 50 });
      const t = w.place('turret', 40, 40, 0)!;
      t.hp = t.maxHp / 2;
      const run = new Run(w, { difficulty: id, buildSeconds: 0, fightSeconds: 10 });
      run.phase = 'won';
      run.nextLevel();
      return { run, t, w };
    };
    const n = fight('normal', 100);
    expect(n.t.hp).toBe(n.t.maxHp);
    expect(n.run.repairBill).toBe(0);
    const h = fight('hard', 100);
    expect(h.t.hp).toBe(h.t.maxHp);
    expect(h.run.repairBill).toBeGreaterThan(0);
    const poor = fight('hard', 0);
    expect(poor.t.hp).toBeLessThan(poor.t.maxHp); // could not pay, so it stays damaged
  });

  it('is saved with the run', () => {
    const w = generateWorld();
    w.place('core', 79, 91, 0);
    saveRun(new Run(w, { difficulty: 'hard' }), 'brakka');
    expect(restoreRun(loadSave()!).difficulty.id).toBe('hard');
  });
});

describe('commander unlocks', () => {
  it('starts with one neutral commander and locks the rest behind achievements', () => {
    const starters = COMMANDERS.filter((c) => c.starter).map((c) => c.id);
    expect(starters).toEqual(['wren']);
    expect(isUnlocked('wren')).toBe(true);
    expect(isUnlocked('brakka')).toBe(false);
    expect(isUnlocked('ilka')).toBe(false);
    expect(unlockCommander('ilka')).toBe(true);
    expect(isUnlocked('ilka')).toBe(true);
    expect(unlockCommander('ilka')).toBe(false); // only announced once
  });

  it('recognises the achievements', () => {
    const w = base();
    const ilka = ACHIEVEMENTS.find((a) => a.commander === 'ilka')!;
    const grim = ACHIEVEMENTS.find((a) => a.commander === 'grimwald')!;
    const pim = ACHIEVEMENTS.find((a) => a.commander === 'pim')!;
    expect(ilka.check(w)).toBe(false);
    for (let i = 0; i < 5; i++) w.place('coil', 10 + i * 3, 10, 0);
    expect(ilka.check(w)).toBe(true);
    for (let i = 0; i < 20; i++) w.place('wall', 10 + i, 30, 0);
    expect(grim.check(w)).toBe(true);
    expect(pim.check(w)).toBe(false);
    for (let i = 0; i < 10; i++) w.soldiers.push({ id: i, type: 'scout', x: 1, y: 1, hp: 1, maxHp: 1, cool: 0, face: 1 });
    expect(pim.check(w)).toBe(true);
  });
});
