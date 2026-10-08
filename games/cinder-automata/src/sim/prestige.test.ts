import { describe, expect, it } from 'vitest';
import { DEFAULT_MODS } from './commanders';
import { PERKS, applyPerks, balance, buy, emberReward, mergePrestige, nextCost, perkById, spent, type PrestigeState } from './prestige';
import { World } from './world';
import { mergeProfile } from '../cloud';

const state = (earned: number, levels: Record<string, number> = {}): PrestigeState => ({ earned, levels });

describe('Embers', () => {
  it('pays for the levels a run got through, more for deeper ones, with no difference between a win and a loss', () => {
    expect(emberReward(0)).toBe(0);
    expect(emberReward(3)).toBe(3);
    expect(emberReward(10)).toBe(22);
    expect(emberReward(30)).toBeGreaterThan(emberReward(10) * 5);
    expect(emberReward(31)).toBeGreaterThan(emberReward(30)); // Endless keeps paying
  });
  it('pays more on harder difficulties', () => {
    expect(emberReward(12, 'extreme')).toBeGreaterThan(emberReward(12, 'normal'));
    expect(emberReward(12, 'easy')).toBeLessThan(emberReward(12, 'normal'));
  });
});

describe('the Workshop', () => {
  it('a level costs more each time, and cannot be bought without the Embers', () => {
    const p = perkById('dmg')!;
    expect(nextCost(p, 0)).toBe(p.base);
    expect(nextCost(p, 1)).toBe(p.base * 2);
    expect(buy(state(p.base - 1), 'dmg')).toBeNull();
    const s = buy(state(100), 'dmg')!;
    expect(s.levels.dmg).toBe(1);
    expect(balance(s)).toBe(100 - p.base);
  });
  it('stops at the maximum level', () => {
    const p = perkById('survey')!;
    const s = buy(state(1000), 'survey')!;
    expect(s.levels.survey).toBe(p.max);
    expect(buy(s, 'survey')).toBeNull();
  });
  it('the balance is what was earned minus what the owned levels cost', () => {
    const s = state(50, { dmg: 2, ammo: 1 });
    expect(spent(s)).toBe(4 + 8 + 3);
    expect(balance(s)).toBe(50 - 15);
  });
  it('perks change a run\'s modifiers, and nothing else', () => {
    const m = applyPerks({ ...DEFAULT_MODS }, state(0, { dmg: 10, plating: 5, core: 2, survey: 1, assembly: 4 }));
    expect(m.turretDmg).toBeCloseTo(1.3);
    expect(m.defenceHp).toBeCloseTo(1.2);
    expect(m.coreHp).toBeCloseTo(1.1);
    expect(m.moduleChoices).toBe(DEFAULT_MODS.moduleChoices + 1);
    expect(m.smallBuildTime).toBeCloseTo(0.88);
    expect(m.robotHp).toBe(1);
    expect(applyPerks({ ...DEFAULT_MODS }, state(0)).turretDmg).toBe(1);
  });
  it('every perk applies without error at its maximum level', () => {
    const levels = Object.fromEntries(PERKS.map((p) => [p.id, p.max]));
    const m = applyPerks({ ...DEFAULT_MODS }, state(0, levels));
    expect(m.turretDmg).toBeGreaterThan(1);
    expect(m.bigBuildTime).toBeLessThan(1);
    expect(m.bigBuildTime).toBeGreaterThan(0.5);
  });
  it('core armour makes a stronger Core', () => {
    const w = new World(60, 60);
    w.mods = applyPerks({ ...DEFAULT_MODS }, state(0, { core: 10 }));
    const c = w.place('core', 20, 20, 0)!;
    expect(c.maxHp).toBe(Math.round(600 * 1.5));
    expect(c.hp).toBe(c.maxHp);
  });
});

describe('keeping progress between devices', () => {
  it('joins two copies without counting anything twice', () => {
    const m = mergePrestige(state(80, { dmg: 3, ammo: 1 }), state(60, { dmg: 2, core: 4 }));
    expect(m.earned).toBe(80);
    expect(m.levels).toEqual({ dmg: 3, ammo: 1, core: 4 });
  });
  it('the account merge handles the Workshop too', () => {
    const merged = mergeProfile({ prestige: JSON.stringify(state(40, { dmg: 2 })) }, { prestige: JSON.stringify(state(70, { dmg: 1, core: 1 })) });
    expect(JSON.parse(merged.prestige!)).toMatchObject({ earned: 70, levels: { dmg: 2, core: 1 } });
  });
});

describe('the Embers ledger', () => {
  it('adds up what was earned, what was bought, and the play from before the ledger', async () => {
    const { ledgerView, withEntry } = await import('./prestige');
    let s: PrestigeState = { earned: 185, levels: { dmg: 2 }, unlocked: ['pyre'] };
    s = withEntry(s, { t: 2, n: 30, why: 'Run ended after 8 levels' });
    const v = ledgerView(s);
    expect(v.earned).toBe(185);
    expect(v.spent).toBe(4 + 8 + 40);
    expect(v.balance).toBe(185 - 52);
    expect(v.before).toBe(155); // everything not in the log
    expect(v.spentOn.map((l) => l.embers).sort((a, b) => a - b)).toEqual([12, 40]);
    expect(v.rows[0].why).toContain('8 levels');
  });
  it('keeps the newest lines only, and joins two devices without doubling any line', () => {
    const a: PrestigeState = { earned: 10, levels: {}, log: [{ t: 1, n: 10, why: 'x' }] };
    const b: PrestigeState = { earned: 12, levels: {}, log: [{ t: 1, n: 10, why: 'x' }, { t: 2, n: 2, why: 'y' }] };
    const m = mergePrestige(a, b);
    expect(m.log).toHaveLength(2);
    let s: PrestigeState = { earned: 0, levels: {} };
    for (let i = 0; i < 300; i++) s = withEntryFn(s, { t: i, n: 1, why: 'r' });
    expect(s.log!.length).toBe(200);
    expect(s.log![199].t).toBe(299);
  });
});
import { withEntry as withEntryFn } from './prestige';
