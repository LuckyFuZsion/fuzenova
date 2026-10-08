import { describe, expect, it } from 'vitest';
import { addStock } from './costs';
import { RECIPE_LIST } from './items';
import { ROBOT_ORDER } from './robots';
import { TECHS, advanceResearch, buyResearch as rawBuy, levelOf, maxLevel, recipeUnlocked, researchFx, robotUnlocked, type BuyResult } from './research';
import { Run } from './round';
import { World } from './world';

/** Buys a level and lets the research time pass, so most tests can stay about what the research does. */
const buyResearch = (w: World, id: string): BuyResult => {
  const r = rawBuy(w, id);
  if (r === 'started') { advanceResearch(w, 1e6); return 'ok'; }
  return r;
};

const rich = (): World => {
  const w = new World(100, 100);
  w.place('core', 48, 48, 0);
  w.freeBuild = false;
  w.runLevel = 30; // every level of research is open
  addStock(w, { 'science-projectile': 500, 'science-em': 500, 'science-robotics': 500, 'science-advanced': 500 });
  return w;
};

describe('research', () => {
  it('is paid for in science packs, not plates', () => {
    const w = new World(100, 100);
    w.place('core', 48, 48, 0);
    w.freeBuild = false;
    w.runLevel = 30;
    addStock(w, { 'iron-plate': 5000, 'copper-plate': 5000 }); // plates buy nothing here
    expect(buyResearch(w, 'proj-damage')).toBe('short');
    addStock(w, { 'science-projectile': 7 });
    expect(buyResearch(w, 'proj-damage')).toBe('ok');
    expect(levelOf(w, 'proj-damage')).toBe(1);
    expect(w.stock['science-projectile']).toBe(2); // 7 minus level 1's 5
    expect(w.stock['iron-plate']).toBe(5000);      // untouched
  });

  it('uses the right kind of pack for each branch', () => {
    const w = new World(100, 100);
    w.place('core', 48, 48, 0);
    w.freeBuild = false;
    w.runLevel = 30;
    addStock(w, { 'science-projectile': 500 });
    expect(buyResearch(w, 'em-damage')).toBe('short');      // wants electromagnetic packs
    expect(buyResearch(w, 'robot-plating')).toBe('short');  // wants robotics packs
    expect(buyResearch(w, 'proj-rate')).toBe('ok');
  });

  it('stops at the maximum level', () => {
    const w = rich();
    const t = TECHS.find((x) => x.id === 'proj-damage')!;
    for (let i = 0; i < maxLevel(t); i++) expect(buyResearch(w, t.id)).toBe('ok');
    expect(buyResearch(w, t.id)).toBe('maxed');
  });

  it('holds chain conductors back until electromagnetic damage is level 2', () => {
    const w = rich();
    expect(buyResearch(w, 'em-hops')).toBe('locked');
    buyResearch(w, 'em-damage'); buyResearch(w, 'em-damage');
    expect(buyResearch(w, 'em-hops')).toBe('ok');
    expect(researchFx(w).coilJumps).toBe(1);
  });

  it('adds range to turrets, coils and robots', () => {
    const w = rich();
    buyResearch(w, 'proj-range'); buyResearch(w, 'em-range'); buyResearch(w, 'robot-range');
    const fx = researchFx(w);
    expect(fx.turretRange).toBeCloseTo(1.1); expect(fx.coilRange).toBeCloseTo(1.1); expect(fx.robotRange).toBeCloseTo(1.1);
  });

  it('makes gun turrets hit harder and fire faster', () => {
    const shoot = (levels: number) => {
      const w = rich();
      for (let i = 0; i < levels; i++) { buyResearch(w, 'proj-damage'); buyResearch(w, 'proj-rate'); }
      const t = w.place('turret', 44, 44, 0)!;
      if (t.kind !== 'turret') throw new Error('setup');
      t.ammo = 40;
      w.enemies.push({ id: 1, x: 45, y: 47, hp: 1e6, maxHp: 1e6, speed: 0, dmg: 0, born: 0, kind: 'crawler-1' });
      const run = new Run(w, { buildSeconds: 0, fightSeconds: 60 });
      run.startFight();
      for (let i = 0; i < 90; i++) run.update(1 / 30);
      return 1e6 - w.enemies[0].hp;
    };
    expect(shoot(3)).toBeGreaterThan(shoot(0) * 1.5);
  });

  it('is saved with the run', () => {
    const w = rich();
    buyResearch(w, 'fortify');
    const w2 = new World(100, 100);
    w2.importState(w.exportState());
    expect(levelOf(w2, 'fortify')).toBe(1);
    expect(w2.rfx.defenceHp).toBeCloseTo(1.15);
  });

  it('toughens existing turrets and walls when fortification is bought', () => {
    const w = rich();
    const wall = w.place('wall', 20, 20, 0)!;
    const before = wall.maxHp;
    buyResearch(w, 'fortify');
    expect(wall.maxHp).toBe(Math.round(before * 1.15));
  });
});

describe('what research unlocks', () => {
  it('starts with only the two smallest robots and opens the rest one design level at a time', () => {
    const w = rich();
    expect(ROBOT_ORDER.filter((t) => robotUnlocked(w, t)).sort()).toEqual(['drone-1', 'scout']);
    buyResearch(w, 'robot-designs');
    expect(robotUnlocked(w, 'trooper')).toBe(true);
    expect(robotUnlocked(w, 'heavy')).toBe(false);
    for (let i = 0; i < 4; i++) buyResearch(w, 'robot-designs');
    expect(ROBOT_ORDER.every((t) => robotUnlocked(w, t))).toBe(true);
  });

  it('makes a fabricator fall back to a robot that is unlocked', () => {
    const w = rich();
    const f = w.place('robotfab', 30, 30, 0)!;
    if (f.kind !== 'robotfab') throw new Error('setup');
    f.type = 'titan'; f.inv = { 'iron-plate': 100, 'copper-plate': 100 };
    const run = new Run(w, { buildSeconds: 0, fightSeconds: 600 });
    run.startFight();
    for (let i = 0; i < 30; i++) run.update(1 / 30);
    expect(['scout', 'drone-1']).toContain(f.type);
  });

  it('keeps bullets and shells out of the Assembler until the ammunition research is done', () => {
    const w = rich();
    const open = () => RECIPE_LIST.filter((r) => recipeUnlocked(w, r.id)).map((r) => r.id);
    expect(open()).toContain('science-projectile');
    expect(open()).toContain('gunpowder');
    expect(open()).not.toContain('bullet');
    buyResearch(w, 'ammo-bullets');
    expect(open()).toContain('bullet');
    expect(open()).not.toContain('artillery-shell');
    buyResearch(w, 'ammo-bullets');
    expect(open()).toContain('artillery-shell');
  });
});

describe('research takes time, packs and a high enough level', () => {
  const fresh = (level: number, packs: Partial<Record<string, number>>): World => {
    const w = new World(100, 100);
    w.place('core', 48, 48, 0);
    w.freeBuild = false;
    w.runLevel = level;
    addStock(w, packs);
    return w;
  };

  it('spends the packs at once but only finishes after the factory has run for a while', () => {
    const w = fresh(1, { 'science-projectile': 10 });
    expect(rawBuy(w, 'proj-damage')).toBe('started');
    expect(w.stock['science-projectile']).toBe(5);
    expect(levelOf(w, 'proj-damage')).toBe(0);              // not yet
    expect(advanceResearch(w, 5)).toBeNull();
    expect(w.researching?.left).toBeCloseTo(10);
    expect(advanceResearch(w, 10.1)).toBe('proj-damage');   // 15 seconds of factory time
    expect(levelOf(w, 'proj-damage')).toBe(1);
    expect(w.researching).toBeNull();
  });

  it('researches one thing at a time', () => {
    const w = fresh(1, { 'science-projectile': 50, 'science-robotics': 50 });
    expect(rawBuy(w, 'proj-damage')).toBe('started');
    expect(rawBuy(w, 'proj-rate')).toBe('busy');
    advanceResearch(w, 100);
    expect(rawBuy(w, 'proj-rate')).toBe('started');
  });

  it('holds the later levels back until the run has reached a level', () => {
    const w = fresh(1, { 'science-projectile': 500, 'science-em': 500, 'science-advanced': 500 });
    expect(buyResearch(w, 'proj-damage')).toBe('ok');          // level 1 of the tech: open from the start
    expect(buyResearch(w, 'proj-damage')).toBe('gated');       // level 2 needs run level 3
    w.runLevel = 3;
    expect(buyResearch(w, 'proj-damage')).toBe('ok');
    expect(buyResearch(w, 'proj-damage')).toBe('gated');       // level 3 needs run level 6
    w.runLevel = 6;
    expect(buyResearch(w, 'proj-damage')).toBe('ok');
  });

  it('needs a second kind of pack from level 2 and the Advanced pack from level 3', () => {
    const w = fresh(30, { 'science-projectile': 1000 });
    expect(buyResearch(w, 'proj-damage')).toBe('ok');
    expect(buyResearch(w, 'proj-damage')).toBe('short');       // level 2 also wants electromagnetic packs
    addStock(w, { 'science-em': 100 });
    expect(buyResearch(w, 'proj-damage')).toBe('ok');
    expect(buyResearch(w, 'proj-damage')).toBe('short');       // level 3 also wants Advanced packs
    addStock(w, { 'science-advanced': 100 });
    expect(buyResearch(w, 'proj-damage')).toBe('ok');
  });

  it('is instant in the tutorial, and the research in progress is saved', () => {
    const t = new World(100, 100);
    expect(rawBuy(t, 'proj-damage')).toBe('ok');
    const w = fresh(2, { 'science-projectile': 20 });
    rawBuy(w, 'proj-damage');
    advanceResearch(w, 4);
    const w2 = new World(100, 100);
    w2.importState(w.exportState());
    expect(w2.researching?.id).toBe('proj-damage');
    expect(w2.researching?.left).toBeCloseTo(11);
    expect(w2.runLevel).toBe(2);
  });
});
