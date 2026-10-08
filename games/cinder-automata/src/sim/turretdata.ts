// The data for every turret type, in three families that each go: a base, two level-1 variants, and a level-2 weapon.
//   Projectile:  Gun turret -> Scatter gun / Sniper -> Artillery           (kinetic, ammunition from plates, bullets and shells)
//   Fire:        Flamer     -> Incendiary launcher / Focused torch -> Plasma  (flame and energy, fuelled by coal, charcoal and wood)
//   Lightning:   Storm coil -> Shield coil / Stun coil -> Railgun          (see COIL_VARIANTS; power instead of ammunition)
// Pure data with no game code, so the simulation and the screens can both read it.
import type { DamageType } from './enemies';
import type { ItemId } from './items';

export type Family = 'projectile' | 'fire';
export type TurretVariant = 'gun' | 'scatter' | 'sniper' | 'artillery' | 'flamer' | 'incendiary' | 'torch' | 'plasma';
export type PlateCost = Partial<Record<'iron-plate' | 'copper-plate', number>>;

export interface VariantDef {
  name: string;
  blurb: string;
  family: Family;
  /** 0 = the building you place, 1 = a first upgrade, 2 = the top weapon */
  tier: 0 | 1 | 2;
  /** tiles, before research */
  range: number;
  /** nearest it can hit (artillery and launchers cannot hit what is on top of them) */
  minRange?: number;
  /** seconds between shots, before research */
  cooldown: number;
  /** damage per ammunition shot, as a multiple of the ammunition's own damage */
  dmgMul: number;
  /** if set, one shot hits every enemy within this angle (radians, full width) of the aim, out to its range */
  cone?: number;
  /** if set, the shot bursts over this radius around its target */
  blast?: number;
  /** if set, whatever it hits is set alight: this damage a second for this many seconds */
  burn?: { dps: number; secs: number };
  type: DamageType;
  /** the items it takes as ammunition */
  ammo: ItemId[];
  /** price of upgrading to it (iron and copper, the only plates the Core holds) */
  cost: PlateCost;
  /** the research ('Turret designs' or 'Flame designs') and level that unlocks it */
  tech: string;
  unlock: number;
  colour: string;
}

const SHOT_AMMO: ItemId[] = ['iron-plate', 'bullet'];
const BULLET_AMMO: ItemId[] = ['bullet']; // the Sniper takes bullets only (the Gun turret and Scatter gun can also fire scrap iron)
const FUEL_AMMO: ItemId[] = ['coal', 'charcoal', 'wood'];

export const TURRET_BASE_COOLDOWN = 0.42;
export const TURRET_BASE_RANGE = 7;

export const VARIANTS: Record<TurretVariant, VariantDef> = {
  gun: { name: 'Gun turret', blurb: 'Fast, steady fire at medium range. The all-rounder.', family: 'projectile', tier: 0, range: TURRET_BASE_RANGE, cooldown: TURRET_BASE_COOLDOWN, dmgMul: 1, type: 'kinetic', ammo: SHOT_AMMO, cost: {}, tech: 'turret-designs', unlock: 0, colour: '#ffa03a' },
  scatter: { name: 'Scatter gun', blurb: 'Sprays a wide cone at short range, hitting every enemy in it. Superb against swarms, weak at a distance.', family: 'projectile', tier: 1, range: 4.6, cooldown: 0.95, dmgMul: 1.1, cone: 0.95, type: 'kinetic', ammo: SHOT_AMMO, cost: { 'iron-plate': 40, 'copper-plate': 15 }, tech: 'turret-designs', unlock: 1, colour: '#ff6a3a' },
  sniper: { name: 'Sniper', blurb: 'Reaches far and hits one enemy very hard, but slowly. Armour barely matters to it.', family: 'projectile', tier: 1, range: 12.5, cooldown: 2.1, dmgMul: 5, type: 'kinetic', ammo: BULLET_AMMO, cost: { 'iron-plate': 40, 'copper-plate': 25 }, tech: 'turret-designs', unlock: 2, colour: '#6cc8ff' },
  artillery: { name: 'Artillery', blurb: 'Lobs shells a very long way that burst over a patch of ground. It cannot hit what is close, and it needs artillery shells.', family: 'projectile', tier: 2, range: 16, minRange: 4, cooldown: 3.4, dmgMul: 1, blast: 2.4, type: 'kinetic', ammo: ['artillery-shell'], cost: { 'iron-plate': 80, 'copper-plate': 40 }, tech: 'turret-designs', unlock: 3, colour: '#d8b04a' },
  flamer: { name: 'Flamer', blurb: 'Sprays burning fuel in a short cone and sets enemies alight. Armour does not stop fire, and swarms burn well.', family: 'fire', tier: 0, range: 4, cooldown: 0.2, dmgMul: 1, cone: 0.8, burn: { dps: 4, secs: 2.5 }, type: 'flame', ammo: FUEL_AMMO, cost: {}, tech: 'flame-designs', unlock: 1, colour: '#ff7a2a' },
  incendiary: { name: 'Incendiary launcher', blurb: 'Lobs fire grenades that burst into flames over a patch of ground and keep burning. It cannot hit what is right beside it.', family: 'fire', tier: 1, range: 9, minRange: 2.5, cooldown: 2.4, dmgMul: 3.5, blast: 2.2, burn: { dps: 5, secs: 4 }, type: 'flame', ammo: FUEL_AMMO, cost: { 'iron-plate': 50, 'copper-plate': 25 }, tech: 'flame-designs', unlock: 2, colour: '#ff9a3a' },
  torch: { name: 'Focused torch', blurb: 'A narrow, white-hot flame on one enemy at a time, like a welding torch. Burns through almost anything at close range.', family: 'fire', tier: 1, range: 5.2, cooldown: 0.12, dmgMul: 1.4, burn: { dps: 8, secs: 2 }, type: 'flame', ammo: FUEL_AMMO, cost: { 'iron-plate': 45, 'copper-plate': 20 }, tech: 'flame-designs', unlock: 2, colour: '#ffe9a8' },
  plasma: { name: 'Plasma cannon', blurb: 'Fires bolts of plasma that burst on impact. Energy damage ignores armour entirely.', family: 'fire', tier: 2, range: 9.5, cooldown: 1.2, dmgMul: 7, blast: 1.3, type: 'energy', ammo: FUEL_AMMO, cost: { 'iron-plate': 90, 'copper-plate': 60 }, tech: 'flame-designs', unlock: 3, colour: '#8ad8ff' },
};

/** The type a placed building starts as. */
export const BASE_VARIANT = { turret: 'gun', flamer: 'flamer' } as const;
export const VARIANT_ORDER: TurretVariant[] = ['gun', 'scatter', 'sniper', 'artillery', 'flamer', 'incendiary', 'torch', 'plasma'];
export const familyVariants = (f: Family): TurretVariant[] => VARIANT_ORDER.filter((v) => VARIANTS[v].family === f);

// ---- the lightning family: one building (the Storm coil) that is upgraded in place ----
export type CoilVariant = 'coil' | 'shield' | 'stun' | 'railgun';
export interface CoilVariantDef {
  name: string;
  blurb: string;
  tier: 0 | 1 | 2;
  /** tiles */
  range: number;
  /** charge spent on each use (a shield spends charge as it absorbs damage instead) */
  charge: number;
  cooldown: number;
  cost: PlateCost;
  tech: string;
  unlock: number;
  colour: string;
}
export const COIL_VARIANTS: Record<CoilVariant, CoilVariantDef> = {
  coil: { name: 'Storm coil', blurb: 'Chain lightning that jumps from enemy to enemy. Great against crowds, weak against insulated machines.', tier: 0, range: 6.5, charge: 50, cooldown: 1.3, cost: {}, tech: 'coil-designs', unlock: 0, colour: '#6cc8ff' },
  shield: { name: 'Shield coil', blurb: 'Wraps the buildings round it in a field that halves the damage they take, for as long as it has charge. It does not attack.', tier: 1, range: 6, charge: 0, cooldown: 0, cost: { 'iron-plate': 50, 'copper-plate': 40 }, tech: 'coil-designs', unlock: 1, colour: '#7dffb0' },
  stun: { name: 'Stun coil', blurb: 'Every few seconds a pulse freezes every enemy near it in place for a moment, so your turrets get free shots. It does no damage itself.', tier: 1, range: 5, charge: 45, cooldown: 4.5, cost: { 'iron-plate': 50, 'copper-plate': 40 }, tech: 'coil-designs', unlock: 1, colour: '#ffe36a' },
  railgun: { name: 'Railgun', blurb: 'A slow, charged shot that tears through every enemy in a long straight line. Energy damage ignores armour.', tier: 2, range: 16, charge: 120, cooldown: 5, cost: { 'iron-plate': 100, 'copper-plate': 70 }, tech: 'coil-designs', unlock: 2, colour: '#c89bff' },
};
export const COIL_ORDER: CoilVariant[] = ['coil', 'shield', 'stun', 'railgun'];
