// The rogue automata that attack the base. Multipliers apply to the per-level base stats in round.ts.

export type EnemyKind =
  | 'crawler-1' | 'crawler-2' | 'crawler-3' | 'spider-1' | 'spider-2' | 'spider-3'
  | 'drone-1' | 'drone-2' | 'drone-3' | 'swarmling'
  | 'brute-3' | 'boss-colossus' | 'boss-queen'
  | 'acid-1' | 'spitter-1' | 'acid-3' | 'brute-2' | 'spitter-3';

export interface EnemyDef {
  name: string;
  /** first level this can appear */
  from: number;
  /** how common it is once unlocked */
  weight: number;
  hp: number; speed: number; dmg: number;
  /** drawn size in tiles */
  scale: number;
  flying: boolean;
  /** bosses are never picked for ordinary waves; the run spawns one at levels 10, 20 and 30 */
  boss?: boolean;
  /** ranged enemies stop this many tiles from their target and shoot it (melee enemies leave this out) */
  range?: number;
  /** what it fires, for drawing */
  shot?: 'acid' | 'bullet';
  /** flat damage taken off every hit (never less than a quarter of the hit): weak shots and the later hops of lightning barely scratch it */
  armor?: number;
  /** insulated against lightning: Storm coils do only 40 percent damage to it */
  insulated?: boolean;
}

/**
 * The four kinds of damage. Kinetic (guns, shells) is stopped by flat armour; flame and energy ignore armour; lightning keeps its rule that
 * insulated machines shrug it off. On top of that, every enemy is weak to some kinds and resists others (see WEAKNESS).
 */
export type DamageType = 'kinetic' | 'flame' | 'energy' | 'lightning';
export const DAMAGE_TYPES: DamageType[] = ['kinetic', 'flame', 'energy', 'lightning'];
export const DAMAGE_NAMES: Record<DamageType, string> = { kinetic: 'Kinetic', flame: 'Flame', energy: 'Energy', lightning: 'Lightning' };

/** Multipliers on damage of each type, per enemy. Missing means 1. Weak is up to 1.4, resistant down to 0.7: never immune. */
export const WEAKNESS: Partial<Record<EnemyKind, Partial<Record<DamageType, number>>>> = {
  'crawler-1': { flame: 1.4 },
  'crawler-2': { kinetic: 0.9, flame: 1.2, energy: 1.3 },
  'crawler-3': { flame: 1.1, energy: 1.2 },
  'spider-1': { flame: 1.3, lightning: 0.85 },
  'spider-2': { flame: 1.3, lightning: 0.85 },
  'spider-3': { flame: 1.2, lightning: 0.85, energy: 0.8 },
  'drone-1': { lightning: 1.4, flame: 0.75 },
  'drone-2': { lightning: 1.4, flame: 0.75 },
  'drone-3': { lightning: 1.3, energy: 1.2, flame: 0.75 },
  'acid-1': { flame: 1.4, lightning: 0.8 },
  'spitter-1': { flame: 1.4, lightning: 0.8 },
  'acid-3': { flame: 1.3, lightning: 0.8 },
  'spitter-3': { flame: 1.3, lightning: 0.8 },
  'brute-2': { kinetic: 0.85, energy: 1.3, flame: 0.8 },
  'brute-3': { kinetic: 0.85, energy: 1.3, flame: 0.8 },
  'boss-colossus': { kinetic: 0.9, energy: 1.25 },
  'boss-queen': { flame: 1.2, energy: 1.2 },
};
export const damageMul = (kind: EnemyKind | undefined, type: DamageType): number => (kind ? WEAKNESS[kind]?.[type] ?? 1 : 1);
/** Damage types an enemy is clearly weak to (1.15 or more) and clearly resists (0.9 or less). */
export function weaknessTags(kind: EnemyKind): { weak: DamageType[]; resists: DamageType[] } {
  return { weak: DAMAGE_TYPES.filter((t) => damageMul(kind, t) >= 1.15), resists: DAMAGE_TYPES.filter((t) => damageMul(kind, t) <= 0.9) };
}
/** Damage after armour and weakness. Flat armour only stops kinetic damage; flame and energy ignore it. */
export function typedDamage(kind: EnemyKind | undefined, dmg: number, type: DamageType): number {
  const m = damageMul(kind, type);
  if (type === 'kinetic') return armouredDamage(kind, dmg) * m;
  if (type === 'lightning') return armouredDamage(kind, dmg, true) * m;
  return dmg * m;
}

/** Damage after armour (and insulation, for lightning). */
export function armouredDamage(kind: EnemyKind | undefined, dmg: number, lightning = false): number {
  const def = kind ? ENEMIES[kind] : undefined;
  if (!def) return dmg;
  let d = Math.max(dmg * 0.25, dmg - (def.armor ?? 0));
  if (lightning && def.insulated) d *= 0.4;
  return d;
}

export const ENEMY_ORDER: EnemyKind[] = [
  'swarmling', 'crawler-1', 'crawler-2', 'spider-1', 'acid-1', 'drone-1', 'crawler-3', 'spider-2', 'spitter-1', 'drone-2', 'brute-2', 'spider-3', 'acid-3', 'drone-3', 'spitter-3',
];

export const ENEMIES: Record<EnemyKind, EnemyDef> = {
  swarmling: { name: 'Swarmling', from: 2, weight: 3, hp: 0.4, speed: 1.8, dmg: 0.5, scale: 0.7, flying: false },
  'crawler-1': { name: 'Crawler', from: 1, weight: 10, hp: 1, speed: 1, dmg: 1, scale: 1.1, flying: false },
  'crawler-2': { name: 'Armoured crawler', from: 3, weight: 5, hp: 2.2, speed: 0.9, dmg: 1.6, scale: 1.5, flying: false, armor: 1 },
  'spider-1': { name: 'Spider-walker', from: 4, weight: 4, hp: 1.6, speed: 1.3, dmg: 1.2, scale: 1.4, flying: false },
  'drone-1': { name: 'Scout drone', from: 5, weight: 4, hp: 0.8, speed: 1.6, dmg: 0.7, scale: 1.2, flying: true },
  'crawler-3': { name: 'Siege crawler', from: 8, weight: 3, hp: 5, speed: 0.75, dmg: 3, scale: 2.2, flying: false, armor: 3 },
  'spider-2': { name: 'Blade spider', from: 8, weight: 3, hp: 2.4, speed: 1.5, dmg: 2, scale: 1.8, flying: false },
  'drone-2': { name: 'Combat drone', from: 9, weight: 4, hp: 1.8, speed: 1.4, dmg: 1.5, scale: 1.7, flying: true, range: 4.5, shot: 'bullet' },
  // ranged enemies: they stop short of their target and shoot it, so they hurt from behind the melee
  'acid-1': { name: 'Acid spitter', from: 4, weight: 6, hp: 0.9, speed: 1.0, dmg: 0.9, scale: 1.5, flying: false, range: 5, shot: 'acid' },
  'spitter-1': { name: 'Acid sprayer', from: 9, weight: 4, hp: 1.6, speed: 0.95, dmg: 1.3, scale: 1.8, flying: false, range: 6.5, shot: 'acid' },
  'brute-2': { name: 'Gatling brute', from: 11, weight: 3, hp: 6, speed: 0.7, dmg: 1.6, scale: 2.6, flying: false, range: 5.5, shot: 'bullet', armor: 4, insulated: true },
  'acid-3': { name: 'Acid cannon', from: 13, weight: 3, hp: 2.5, speed: 0.85, dmg: 2.2, scale: 2.0, flying: false, range: 8.5, shot: 'acid', armor: 2 }, // outranges a gun turret (7)
  'spitter-3': { name: 'Siege spitter', from: 17, weight: 2, hp: 3.5, speed: 0.8, dmg: 3, scale: 2.4, flying: false, range: 10.5, shot: 'acid', armor: 3 }, // out-ranges everything but artillery
  'spider-3': { name: 'Laser spider', from: 12, weight: 2, hp: 6, speed: 0.9, dmg: 3.5, scale: 2.4, flying: false, range: 6.5, shot: 'bullet', armor: 3, insulated: true },
  'drone-3': { name: 'Bomber drone', from: 14, weight: 2, hp: 5, speed: 1.0, dmg: 3, scale: 2.4, flying: true, armor: 2 },
  // Siege Brute: walks straight at the core, ignoring turrets, and smashes whatever is in its way.
  'brute-3': { name: 'Siege Brute', from: 10, weight: 0, hp: 30, speed: 0.55, dmg: 4, scale: 4.2, flying: false, boss: true, armor: 5 },
  // Colossus Walker: shells your buildings from beyond turret range, so it takes coils, artillery or robots to reach it.
  'boss-colossus': { name: 'Colossus Walker', from: 20, weight: 0, hp: 30, speed: 0.5, dmg: 2, scale: 5.5, flying: false, boss: true, armor: 6 },
  // Hive Queen: parks near the base and keeps spawning escorts until she is killed.
  'boss-queen': { name: 'Hive Queen', from: 30, weight: 0, hp: 50, speed: 0.4, dmg: 1.5, scale: 6, flying: false, boss: true, armor: 3 },
};

export const BOSS_ORDER: EnemyKind[] = ['brute-3', 'boss-colossus', 'boss-queen'];

/** The boss for a level (every tenth), cycling Brute, Colossus, Queen; undefined on other levels. */
export function bossForLevel(level: number): EnemyKind | undefined {
  return level > 0 && level % 10 === 0 ? BOSS_ORDER[(level / 10 - 1) % BOSS_ORDER.length] : undefined;
}

/** Picks a kind for the given level using a 0..1 random number. Early on it's all plain crawlers. */
export function pickEnemy(level: number, r: number, rangedMult = 1): EnemyKind {
  const pool = ENEMY_ORDER.filter((k) => ENEMIES[k].from <= level);
  const w = (k: EnemyKind) => ENEMIES[k].weight * (ENEMIES[k].range ? rangedMult : 1);
  const total = pool.reduce((a, k) => a + w(k), 0);
  let t = r * total;
  for (const k of pool) { t -= w(k); if (t < 0) return k; }
  return pool[pool.length - 1];
}
