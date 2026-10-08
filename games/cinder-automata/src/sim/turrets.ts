// Turret upgrades. Each family goes base -> two level-1 variants -> one level-2 weapon (see turretdata.ts). A building is upgraded in place by
// double-clicking it. A level-2 weapon needs a level-1 variant first (either one will do); going back down is free. Each is unlocked by research.
import { canPay, pay } from './costs';
import { levelOf } from './research';
import { BASE_VARIANT, COIL_VARIANTS, VARIANTS, type CoilVariant, type PlateCost, type TurretVariant } from './turretdata';
import type { Coil, Turret, World } from './world';

export * from './turretdata';

export const variantOf = (t: Turret): TurretVariant => t.variant ?? BASE_VARIANT[t.kind];
export const variantUnlocked = (w: World, v: TurretVariant): boolean => w.freeBuild || levelOf(w, VARIANTS[v].tech) >= VARIANTS[v].unlock;
export const coilVariantOf = (c: Coil): CoilVariant => c.variant ?? 'coil';
export const coilVariantUnlocked = (w: World, v: CoilVariant): boolean => w.freeBuild || levelOf(w, COIL_VARIANTS[v].tech) >= COIL_VARIANTS[v].unlock;

/** 'wrong': a different family, or a level-2 weapon with no level-1 variant yet. */
export type UpgradeResult = 'ok' | 'same' | 'locked' | 'short' | 'wrong';

function change(w: World, curTier: number, newTier: number, cost: PlateCost, unlocked: boolean): UpgradeResult {
  if (!unlocked) return 'locked';
  if (newTier === 2 && curTier < 1) return 'wrong';
  const goingDown = newTier < curTier;
  if (!goingDown && !w.freeBuild && !canPay(w, cost)) return 'short';
  if (!goingDown && !w.freeBuild) pay(w, cost);
  return 'ok';
}

/** Changes a turret into another of its family, paying the new kind's price (going down a tier is free). */
export function setVariant(w: World, t: Turret, v: TurretVariant): UpgradeResult {
  const cur = variantOf(t);
  if (cur === v) return 'same';
  if (VARIANTS[v].family !== VARIANTS[cur].family) return 'wrong';
  const r = change(w, VARIANTS[cur].tier, VARIANTS[v].tier, VARIANTS[v].cost, variantUnlocked(w, v));
  if (r !== 'ok') return r;
  t.variant = v;
  if (v === 'artillery' || cur === 'artillery') t.ammo = 0; // shells and plates are different ammunition
  t.cooldown = 0.3;
  return 'ok';
}

/** The same for a Storm coil (Shield, Stun, Railgun). Its stored charge stays. */
export function setCoilVariant(w: World, c: Coil, v: CoilVariant): UpgradeResult {
  const cur = coilVariantOf(c);
  if (cur === v) return 'same';
  const r = change(w, COIL_VARIANTS[cur].tier, COIL_VARIANTS[v].tier, COIL_VARIANTS[v].cost, coilVariantUnlocked(w, v));
  if (r !== 'ok') return r;
  c.variant = v;
  c.cooldown = 0.5;
  return 'ok';
}
