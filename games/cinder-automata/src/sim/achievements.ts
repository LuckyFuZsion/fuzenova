// Achievements that unlock commanders. Each is checked against the live world, for example "five Storm coils standing".
import type { World } from './world';

export interface Achievement {
  commander: string;
  /** shown on the locked card, so the player knows what to do */
  hint: string;
  check: (w: World) => boolean;
}

const count = (w: World, kind: string): number => [...w.entities.values()].filter((e) => e.kind === kind).length;

export const ACHIEVEMENTS: Achievement[] = [
  { commander: 'brakka', hint: 'Have 8 gun turrets standing at the same time.', check: (w) => count(w, 'turret') >= 8 },
  { commander: 'regent', hint: 'Have 3 robot-making buildings (workshops, hangars, foundries or heavy works) standing at the same time.', check: (w) => [...w.entities.values()].filter((e) => e.kind === 'robotfab' || e.kind === 'hangar' || e.kind === 'foundry' || e.kind === 'heavyworks').length >= 3 },
  { commander: 'tamsin', hint: 'Have 6 mining drills and 4 smelters standing at the same time.', check: (w) => count(w, 'miner') >= 6 && count(w, 'furnace') >= 4 },
  { commander: 'ilka', hint: 'Have 5 Storm coils standing at the same time in one run.', check: (w) => count(w, 'coil') >= 5 },
  { commander: 'pim', hint: 'Have 10 robots alive at the same time.', check: (w) => w.soldiers.length >= 10 },
  { commander: 'ozric', hint: 'Have 3 Artillery turrets standing at the same time.', check: (w) => [...w.entities.values()].filter((e) => e.kind === 'turret' && e.variant === 'artillery').length >= 3 },
  { commander: 'ysolde', hint: 'Have 4 Flamers (any fire turret) standing at the same time.', check: (w) => count(w, 'flamer') >= 4 },
  { commander: 'grimwald', hint: 'Have 20 walls standing at the same time in one run.', check: (w) => count(w, 'wall') >= 20 },
];

export const achievementFor = (commander: string): Achievement | undefined => ACHIEVEMENTS.find((a) => a.commander === commander);
