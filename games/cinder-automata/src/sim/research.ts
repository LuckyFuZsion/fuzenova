// Per-run research. It is paid for with SCIENCE PACKS, which you have to craft in an Assembler and send into the core:
// one kind for projectile weapons, one for electromagnetic weapons, one for robotics. Some research makes things better;
// some unlocks things (robot designs, ammunition). Levels are kept in world.research and saved with the run.
import { canPay, pay, type Cost } from './costs';
import type { ItemId } from './items';
import type { RobotType } from './robots';
import type { World } from './world';

export type Branch = 'projectile' | 'electromagnetic' | 'robotics' | 'fortification';

export interface Tech {
  id: string;
  name: string;
  branch: Branch;
  /** the science pack it is paid in */
  pack: ItemId;
  /** one line: what each level does */
  effect: string;
  /** cost of reaching level 1, 2, 3 ... in packs (so its length is the maximum level) */
  costs: Cost[];
  /** must have this much of another tech first */
  requires?: { id: string; level: number };
}

const P: ItemId = 'science-projectile', E: ItemId = 'science-em', R: ItemId = 'science-robotics', A: ItemId = 'science-advanced';
/**
 * Costs per level. Level 1 uses only the branch's own pack. From level 2 a second kind of pack is added (a different supply
 * chain), and from level 3 the Advanced pack, which needs steel, bullets and bronze: the whole ammunition chain.
 */
const packs = (pack: ItemId, other: ItemId, ...n: number[]): Cost[] => n.map((k, i) => {
  const c: Cost = { [pack]: k };
  if (i >= 1) c[other] = Math.max(1, Math.ceil(k * 0.5));
  if (i >= 2) c[A] = Math.max(1, Math.ceil(k * 0.4));
  return c;
});

/** The run level needed for each level of a tech (1st, 2nd, 3rd ...): the later ones cannot be rushed. */
export const LEVEL_GATES = [1, 3, 6, 10, 15];
/** Seconds of factory time each level takes to research (it only runs during fights and the cooldown after them). */
export const researchSeconds = (levelIndex: number): number => 15 + 10 * levelIndex;

export const TECHS: Tech[] = [
  // ---- projectile weapons ----
  { id: 'proj-damage', name: 'Projectile damage', branch: 'projectile', pack: P, effect: '+12% damage per shot from gun turrets', costs: packs(P, E, 5, 8, 12, 18, 26) },
  { id: 'proj-rate', name: 'Rate of fire', branch: 'projectile', pack: P, effect: 'Gun turrets fire 6% faster', costs: packs(P, E, 4, 7, 11, 16, 24) },
  { id: 'proj-range', name: 'Targeting optics', branch: 'projectile', pack: P, effect: '+10% range for gun turrets', costs: packs(P, E, 6, 10, 16) },
  { id: 'ammo-bullets', name: 'Ammunition', branch: 'projectile', pack: P, effect: 'Level 1 unlocks bullets (copper plate + coal in the Assembler). Level 2 unlocks steel and artillery shells.', costs: packs(P, E, 8, 16) },
  { id: 'turret-designs', name: 'Turret designs', branch: 'projectile', pack: P, effect: 'Level 1 unlocks the Scatter gun (short range, hits everything in a cone). Level 2 unlocks the Sniper (long range, slow, hits very hard). Level 3 unlocks Artillery (a very long range, bursts over an area, needs shells; upgrade a Scatter gun or Sniper into it). Upgrade a gun turret by double-clicking it.', costs: packs(P, E, 6, 12, 20) },
  { id: 'flame-designs', name: 'Flame designs', branch: 'projectile', pack: P, effect: 'Level 1 unlocks the Flamer (build it from the Defence group; it burns coal, charcoal or wood). Level 2 unlocks the Incendiary launcher and the Focused torch. Level 3 unlocks the Plasma cannon. Upgrade a Flamer by double-clicking it.', costs: packs(P, E, 6, 10, 18) },
  { id: 'fortify', name: 'Reinforced structures', branch: 'fortification', pack: P, effect: '+15% health for turrets and walls', costs: packs(P, E, 6, 10, 16, 24) },
  // ---- electromagnetic weapons ----
  { id: 'em-damage', name: 'Electromagnetic damage', branch: 'electromagnetic', pack: E, effect: '+15% lightning damage from Storm coils', costs: packs(E, R, 5, 9, 14, 21, 30) },
  { id: 'coil-designs', name: 'Coil designs', branch: 'electromagnetic', pack: E, effect: 'Level 1 unlocks the Shield coil (protects nearby buildings) and the Stun coil (freezes enemies for a moment). Level 2 unlocks the Railgun (a long piercing shot). Upgrade a Storm coil by double-clicking it.', costs: packs(E, P, 6, 12) },
  { id: 'em-hops', name: 'Chain conductors', branch: 'electromagnetic', pack: E, effect: 'Lightning jumps to 1 more enemy', costs: packs(E, R, 8, 14, 22), requires: { id: 'em-damage', level: 2 } },
  { id: 'em-range', name: 'Field focusing', branch: 'electromagnetic', pack: E, effect: '+10% range for Storm coils', costs: packs(E, R, 6, 10, 16) },
  // ---- robotics: designs, ammunition, armour, sights ----
  { id: 'robot-designs', name: 'Robot designs', branch: 'robotics', pack: R, effect: 'Unlocks new robots: 1 Trooper and Gunship drone, 2 Heavy walker and Sapper drone, 3 Turret walker and Interceptor, 4 Mobile artillery, 5 Titan and Carrier', costs: packs(R, P, 6, 10, 16, 24, 36) },
  { id: 'robot-weapons', name: 'Robot ammunition', branch: 'robotics', pack: R, effect: 'Better rounds for your robots: +12% robot damage (hardened, piercing, incendiary, plasma)', costs: packs(R, P, 6, 10, 16, 24) },
  { id: 'robot-plating', name: 'Robot plating', branch: 'robotics', pack: R, effect: '+12% robot health', costs: packs(R, P, 6, 10, 16, 24) },
  { id: 'robot-range', name: 'Robot sights', branch: 'robotics', pack: R, effect: '+10% weapon range for your robots', costs: packs(R, P, 8, 14, 22) },
];

export const BRANCH_NAMES: Record<Branch, string> = {
  projectile: 'Projectile weapons', electromagnetic: 'Electromagnetic weapons', robotics: 'Robotics: designs and ammunition', fortification: 'Fortification',
};

export const techById = (id: string): Tech | undefined => TECHS.find((t) => t.id === id);
export const levelOf = (w: World, id: string): number => w.research[id] ?? 0;
export const maxLevel = (t: Tech): number => t.costs.length;

/** The combined effect of everything researched so far, as multipliers the combat code reads. */
export interface ResearchFx {
  turretDmg: number; turretCooldown: number; coilDmg: number; coilJumps: number; robotHp: number; robotDps: number; defenceHp: number;
  turretRange: number; coilRange: number; robotRange: number;
}

export function researchFx(w: World): ResearchFx {
  const l = (id: string) => levelOf(w, id);
  // the 'boon-...' counters are the random upgrades picked after each win (see roguelite.ts); they stack with research
  return {
    turretDmg: 1 + 0.12 * l('proj-damage') + 0.05 * l('boon-dmg'),
    turretCooldown: Math.max(0.35, 1 - 0.06 * l('proj-rate') - 0.04 * l('boon-rate')),
    coilDmg: 1 + 0.15 * l('em-damage') + 0.07 * l('boon-coil'),
    coilJumps: l('em-hops') + l('boon-hop'),
    robotHp: 1 + 0.12 * l('robot-plating') + 0.06 * l('boon-plate'),
    robotDps: 1 + 0.12 * l('robot-weapons') + 0.06 * l('boon-robo'),
    defenceHp: 1 + 0.15 * l('fortify') + 0.07 * l('boon-fort'),
    turretRange: 1 + 0.1 * l('proj-range') + 0.05 * l('boon-range'),
    coilRange: 1 + 0.1 * l('em-range'),
    robotRange: 1 + 0.1 * l('robot-range'),
  };
}

// ---- things research unlocks ----

/** The research level of 'Robot designs' at which each robot type becomes available. */
export const ROBOT_UNLOCK: Record<RobotType, number> = {
  'drone-1': 0, scout: 0, trooper: 1, 'drone-2': 1, bomber: 2, heavy: 2, interceptor: 3, quad: 3, artillery: 4, titan: 5, carrier: 5,
};
export const robotUnlocked = (w: World, t: RobotType): boolean => levelOf(w, 'robot-designs') >= ROBOT_UNLOCK[t];

/** Assembler recipes that need research (everything else, including the science packs themselves, is open from the start). */
export const RECIPE_UNLOCK: Record<string, { tech: string; level: number }> = {
  bullet: { tech: 'ammo-bullets', level: 1 },
  steel: { tech: 'ammo-bullets', level: 2 },
  'science-advanced': { tech: 'ammo-bullets', level: 2 },
  'shell-casing': { tech: 'ammo-bullets', level: 2 },
  'artillery-shell': { tech: 'ammo-bullets', level: 2 },
};
export const recipeUnlocked = (w: World, id: string): boolean => {
  const u = RECIPE_UNLOCK[id];
  return !u || levelOf(w, u.tech) >= u.level;
};

export type BuyResult = 'ok' | 'started' | 'maxed' | 'short' | 'locked' | 'gated' | 'busy';

export function nextCost(w: World, t: Tech): Cost | null {
  const lvl = levelOf(w, t.id);
  return lvl >= maxLevel(t) ? null : t.costs[lvl];
}

export function isLocked(w: World, t: Tech): boolean {
  return !!t.requires && levelOf(w, t.requires.id) < t.requires.level;
}

/** The run level at which the next level of this tech opens up. */
export const gateFor = (w: World, t: Tech): number => LEVEL_GATES[Math.min(levelOf(w, t.id), LEVEL_GATES.length - 1)];

/**
 * Buys the next level of a tech with science packs from the core stock. The packs are spent at once and the research then
 * takes factory time (see researchSeconds); only one thing is researched at a time. In the tutorial it is instant.
 */
export function buyResearch(w: World, id: string): BuyResult {
  const t = techById(id);
  if (!t) return 'locked';
  const cost = nextCost(w, t);
  if (!cost) return 'maxed';
  if (isLocked(w, t)) return 'locked';
  if (!w.freeBuild && w.runLevel < gateFor(w, t)) return 'gated';
  if (!w.freeBuild && w.researching) return 'busy';
  if (!w.freeBuild && !canPay(w, cost)) return 'short';
  if (!w.freeBuild) pay(w, cost);
  if (w.freeBuild) { bumpLevel(w, id); return 'ok'; }
  const total = researchSeconds(levelOf(w, id));
  w.researching = { id, left: total, total };
  return 'started';
}

/** Moves the research in progress forward while the factory runs; completes it when the time is up. Returns the tech id when one finishes. */
export function advanceResearch(w: World, dt: number): string | null {
  const r = w.researching;
  if (!r) return null;
  r.left -= dt;
  if (r.left > 0) return null;
  w.researching = null;
  bumpLevel(w, r.id);
  return r.id;
}

/** Raises a research (or boon) counter by one and recomputes every multiplier, toughening what is already standing if health went up. */
export function bumpLevel(w: World, id: string): void {
  const before = researchFx(w).defenceHp;
  w.research[id] = levelOf(w, id) + 1;
  w.rfx = researchFx(w);
  if (w.rfx.defenceHp !== before) { // toughen what is already standing, keeping its damage
    const k = w.rfx.defenceHp / before;
    for (const e of w.entities.values()) if (e.kind === 'turret' || e.kind === 'wall') { e.maxHp = Math.round(e.maxHp * k); e.hp = Math.min(e.maxHp, Math.round(e.hp * k)); }
  }
}
