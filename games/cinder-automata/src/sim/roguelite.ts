// The roguelite part: every run has its own seed (its own map), every level rolls an OMEN (a twist on the coming fight),
// and every win offers a choice of three random BOONS. Nothing here is saved except the run's seed and the boons you took
// (kept as counters in world.research, next to the real research), because omens and offers are worked out from the seed.
import { hash } from './mapgen';
import { addStock } from './costs';
import { ROBOTS } from './robots';
import type { ItemId } from './items';
import type { World } from './world';

// ---------------------------------------------------------------- omens

export interface Omen {
  id: string;
  name: string;
  /** shown in the top bar before the fight so you can prepare */
  blurb: string;
  /** multipliers on the level's enemies */
  count: number; hp: number; speed: number; dmg: number;
  /** how much more often ranged enemies are picked (1 = normal) */
  ranged?: number;
  /** enemies arrive from two opposite sides */
  twoFronts?: boolean;
  /** kills pay this much more */
  bounty?: number;
  /** turret range multiplier while it lasts */
  fog?: number;
}

const O = (o: Omen): Omen => o;
export const OMENS: Omen[] = [
  O({ id: 'swarm', name: 'Swarm', blurb: 'a great many weaker enemies', count: 1.5, hp: 0.7, speed: 1, dmg: 0.9 }),
  O({ id: 'ironhide', name: 'Ironhide', blurb: 'fewer, much tougher enemies', count: 0.7, hp: 1.5, speed: 0.95, dmg: 1 }),
  O({ id: 'swift', name: 'Swift', blurb: 'enemies move a third faster', count: 1, hp: 0.9, speed: 1.33, dmg: 1 }),
  O({ id: 'acid-rain', name: 'Acid rain', blurb: 'ranged spitters in numbers', count: 1, hp: 1, speed: 1, dmg: 1, ranged: 3.5 }),
  O({ id: 'two-fronts', name: 'Two fronts', blurb: 'they come from opposite sides', count: 1, hp: 1, speed: 1, dmg: 1, twoFronts: true }),
  O({ id: 'bounty', name: 'Bounty', blurb: 'more enemies, and kills pay double', count: 1.25, hp: 1, speed: 1, dmg: 1, bounty: 1 }),
  O({ id: 'brutal', name: 'Brutal', blurb: 'enemies hit a quarter harder', count: 1, hp: 1, speed: 1, dmg: 1.25 }),
  O({ id: 'fog', name: 'Ash fog', blurb: 'your turrets see 20% less far', count: 1, hp: 1, speed: 1, dmg: 1, fog: 0.8 }),
  O({ id: 'lull', name: 'A lull', blurb: 'a thin wave; take the breather', count: 0.65, hp: 0.9, speed: 1, dmg: 1 }),
];

/** The omen for a level of a run, or null for a plain level. The same seed always gives the same omens. */
export function omenFor(seed: number, level: number): Omen | null {
  if (level <= 1) return null; // the first level is always plain
  const r = hash(level, 3, seed + 404);
  if (r < 0.25) return null;
  return OMENS[Math.floor(hash(level, 5, seed + 405) * OMENS.length) % OMENS.length];
}

// ---------------------------------------------------------------- boons

export interface Boon {
  id: string;
  name: string;
  desc: string;
  /** how often it is offered (relative) */
  weight: number;
  /** a permanent counter kept in world.research under 'boon-<id>' (so it is saved and feeds the research multipliers), or an instant reward */
  kind: 'stack' | 'instant';
  apply?: (w: World) => void;
}

const give = (items: Partial<Record<ItemId, number>>) => (w: World) => addStock(w, items, 1);

export const BOONS: Boon[] = [
  { id: 'dmg', name: 'Sharpshooters', desc: 'Gun turrets hit 5% harder, for the rest of the run.', weight: 3, kind: 'stack' },
  { id: 'rate', name: 'Overclocked guns', desc: 'Gun turrets fire 4% faster.', weight: 2.5, kind: 'stack' },
  { id: 'range', name: 'Long sight', desc: 'Gun turrets reach 5% further.', weight: 2, kind: 'stack' },
  { id: 'coil', name: 'Live wire', desc: 'Storm coils hit 7% harder.', weight: 2.5, kind: 'stack' },
  { id: 'hop', name: 'Extra conductor', desc: 'Lightning jumps to one more enemy.', weight: 1, kind: 'stack' },
  { id: 'plate', name: 'Hardened robots', desc: 'Your robots have 6% more health.', weight: 2.5, kind: 'stack' },
  { id: 'robo', name: 'Robot rounds', desc: 'Your robots hit 6% harder.', weight: 2.5, kind: 'stack' },
  { id: 'fort', name: 'Bulwark', desc: 'Turrets and walls have 7% more health.', weight: 2.5, kind: 'stack' },
  { id: 'windfall', name: 'Windfall', desc: 'Right now: +50 iron plates and +15 copper plates.', weight: 2, kind: 'instant', apply: give({ 'iron-plate': 50, 'copper-plate': 15 }) },
  { id: 'grant', name: 'Research grant', desc: 'Right now: 3 science packs of every kind.', weight: 1.5, kind: 'instant', apply: give({ 'science-projectile': 3, 'science-em': 3, 'science-robotics': 3 }) },
  {
    id: 'scouts', name: 'Spare parts', desc: 'Right now: two free scout walkers join your army.', weight: 1, kind: 'instant',
    apply: (w) => {
      const c = w.core;
      for (let i = 0; i < 2; i++) {
        const def = ROBOTS.scout;
        w.soldiers.push({ id: w.nextSoldierId++, type: 'scout', x: (c ? c.x + c.w / 2 : w.w / 2) + (i - 0.5) * 1.2, y: (c ? c.y + c.h + 1.5 : w.h / 2), hp: def.hp * w.mods.robotHp * w.rfx.robotHp, maxHp: def.hp * w.mods.robotHp * w.rfx.robotHp, cool: 0, face: 1 });
      }
    },
  },
  { id: 'workshop', name: 'Field workshop', desc: 'Right now: every building is repaired, and robots are patched up too.', weight: 0.8, kind: 'instant', apply: (w) => { for (const e of w.entities.values()) if (e.kind !== 'core') e.hp = e.maxHp; for (const s of w.soldiers) s.hp = s.maxHp; } },
];

export const boonById = (id: string): Boon | undefined => BOONS.find((b) => b.id === id);
export const boonLevel = (w: World, id: string): number => w.research[`boon-${id}`] ?? 0;

/** Three different boons for a level of a run, picked by weight; the same seed always offers the same three. */
export function rollBoons(seed: number, level: number, n = 3): Boon[] {
  const pool = [...BOONS];
  const out: Boon[] = [];
  for (let k = 0; k < n && pool.length; k++) {
    const total = pool.reduce((a, b) => a + b.weight, 0);
    let t = hash(level, 11 + k, seed + 909) * total;
    let i = 0;
    for (; i < pool.length - 1; i++) { t -= pool[i].weight; if (t < 0) break; }
    out.push(pool.splice(i, 1)[0]);
  }
  return out;
}
