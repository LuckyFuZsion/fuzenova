// Gun turret branches. A plain gun turret can be upgraded in place (double-click it) into a Scatter gun, which sprays a cone at
// short range, or a Sniper, which reaches far and hits very hard but slowly. Each is unlocked by the "Turret designs" research.
import { canPay, pay, type Cost } from './costs';
import { levelOf } from './research';
import type { Turret, World } from './world';

export type TurretVariant = 'gun' | 'scatter' | 'sniper';

export interface VariantDef {
  name: string;
  blurb: string;
  /** tiles, before research */
  range: number;
  /** seconds between shots, before research */
  cooldown: number;
  /** damage per ammunition shot, as a multiple of the ammunition's own damage */
  dmgMul: number;
  /** if set, one shot hits every enemy within this angle (radians, full width) of the aim, out to its range */
  cone?: number;
  cost: Cost;
  /** the research level of 'Turret designs' that unlocks it */
  unlock: number;
  colour: string;
}

export const TURRET_BASE_COOLDOWN = 0.42;
export const TURRET_BASE_RANGE = 7;

export const VARIANTS: Record<TurretVariant, VariantDef> = {
  gun: { name: 'Gun turret', blurb: 'Fast, steady fire at medium range. The all-rounder.', range: TURRET_BASE_RANGE, cooldown: TURRET_BASE_COOLDOWN, dmgMul: 1, cost: {}, unlock: 0, colour: '#ffa03a' },
  scatter: { name: 'Scatter gun', blurb: 'Sprays a wide cone at short range, hitting every enemy in it. Superb against swarms, weak at a distance.', range: 4.6, cooldown: 0.95, dmgMul: 1.1, cone: 0.95, cost: { 'iron-plate': 40, 'copper-plate': 15 }, unlock: 1, colour: '#ff6a3a' },
  sniper: { name: 'Sniper', blurb: 'Reaches far and hits one enemy very hard, but slowly. Armour barely matters to it.', range: 12.5, cooldown: 2.1, dmgMul: 5, cost: { 'iron-plate': 40, 'copper-plate': 25 }, unlock: 2, colour: '#6cc8ff' },
};

export const variantOf = (t: Turret): TurretVariant => t.variant ?? 'gun';
export const variantUnlocked = (w: World, v: TurretVariant): boolean => w.freeBuild || levelOf(w, 'turret-designs') >= VARIANTS[v].unlock;

export type UpgradeResult = 'ok' | 'same' | 'locked' | 'short';

/** Changes a turret into another kind, paying the new kind's price (going back to the plain gun is free). Its ammunition stays. */
export function setVariant(w: World, t: Turret, v: TurretVariant): UpgradeResult {
  if (variantOf(t) === v) return 'same';
  if (!variantUnlocked(w, v)) return 'locked';
  const cost = VARIANTS[v].cost;
  if (!w.freeBuild && !canPay(w, cost)) return 'short';
  if (!w.freeBuild) pay(w, cost);
  t.variant = v;
  t.cooldown = 0.3;
  return 'ok';
}
