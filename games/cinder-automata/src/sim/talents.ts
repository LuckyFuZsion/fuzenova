// Talents: small special abilities a commander takes into a run. Every commander has 3 slots and begins with 3 talents of their own.
// More talents are unlocked with Embers (the Workshop); once unlocked, a talent can be slotted on any commander. Pure rules; storage is in prestige.ts.
import type { Mods } from './commanders';

export const TALENT_SLOTS = 3;

export interface Talent {
  id: string;
  name: string;
  blurb: string;
  /** Embers to unlock; 0 = every player has it from the start */
  cost: number;
  apply: (m: Mods) => void;
}

export const TALENTS: Talent[] = [
  // known from the start (each commander begins with three of these)
  { id: 'shrapnel', name: 'Shrapnel rounds', blurb: 'Gun and Sniper shots also hit enemies within 1.2 tiles for 40% damage.', cost: 0, apply: (m) => { m.splash = Math.max(m.splash, 0.4); } },
  { id: 'concussive', name: 'Concussive rounds', blurb: 'Gun and Sniper shots have a 12% chance to stun the target for 1 second.', cost: 0, apply: (m) => { m.stunChance += 0.12; } },
  { id: 'tar', name: 'Tar shot', blurb: 'Gun and Sniper hits slow the enemy by 50% for 2 seconds.', cost: 0, apply: (m) => { m.slowHit = Math.max(m.slowHit, 0.5); } },
  { id: 'static', name: 'Static field', blurb: 'Storm coil bolts slow every enemy they strike by 40% for 2 seconds.', cost: 0, apply: (m) => { m.coilSlow = Math.max(m.coilSlow, 0.4); } },
  { id: 'salvage', name: 'Salvage crews', blurb: 'Kills pay 40% more plates.', cost: 0, apply: (m) => { m.killBonus += 0.4; } },
  { id: 'swift', name: 'Swift boots', blurb: 'Robots walk 15% faster.', cost: 0, apply: (m) => { m.robotSpeed *= 1.15; } },
  { id: 'bulwark', name: 'Bulwark', blurb: 'Turrets and walls have 15% more health.', cost: 0, apply: (m) => { m.defenceHp *= 1.15; } },
  { id: 'longsight', name: 'Long sight', blurb: 'Turrets reach 10% further.', cost: 0, apply: (m) => { m.turretRange *= 1.1; } },
  // unlocked with Embers
  { id: 'arcing', name: 'Arcing current', blurb: 'Storm coil bolts chain 1 extra jump.', cost: 30, apply: (m) => { m.coilJumps += 1; } },
  { id: 'bombardier', name: 'Bombardier', blurb: 'Artillery, launchers and plasma burst 20% wider.', cost: 40, apply: (m) => { m.blastMul *= 1.2; } },
  { id: 'pyre', name: 'Pyre', blurb: 'Fire and plasma hit 25% harder.', cost: 40, apply: (m) => { m.fireDmg *= 1.25; } },
  { id: 'ironclad', name: 'Ironclad core', blurb: 'The Core has 20% more health.', cost: 25, apply: (m) => { m.coreHp *= 1.2; } },
  { id: 'stockpile', name: 'Stockpile', blurb: 'Turrets hold 30% more ammunition.', cost: 20, apply: (m) => { m.turretAmmo *= 1.3; } },
  { id: 'foremen', name: 'Foremen', blurb: 'Robots build 15% faster.', cost: 30, apply: (m) => { m.smallBuildTime *= 0.85; m.bigBuildTime *= 0.85; } },
];

export const talentById = (id: string): Talent | undefined => TALENTS.find((t) => t.id === id);

/** What each commander begins with (their own three). */
export const STARTING_TALENTS: Record<string, string[]> = {
  wren: ['salvage', 'bulwark', 'swift'],
  brakka: ['shrapnel', 'concussive', 'longsight'],
  regent: ['swift', 'bulwark', 'salvage'],
  ilka: ['static', 'concussive', 'longsight'],
  tamsin: ['salvage', 'swift', 'bulwark'],
  pim: ['swift', 'tar', 'salvage'],
  grimwald: ['bulwark', 'tar', 'shrapnel'],
  ozric: ['shrapnel', 'longsight', 'bulwark'],
  ysolde: ['tar', 'salvage', 'longsight'],
};

export interface TalentState {
  /** talents bought with Embers */
  unlocked: string[];
  /** the talents a player has set on each commander (missing = the commander's starting three) */
  loadout: Record<string, string[]>;
}

export const owns = (t: Talent, s: TalentState): boolean => t.cost === 0 || s.unlocked.includes(t.id);

/** The talents a commander takes into a run: their loadout, minus any not owned, falling back to the starting three. */
export function talentsFor(commander: string, s: TalentState): string[] {
  const chosen = s.loadout[commander] ?? STARTING_TALENTS[commander] ?? STARTING_TALENTS.wren;
  const out: string[] = [];
  for (const id of chosen) { const t = talentById(id); if (t && owns(t, s) && !out.includes(id) && out.length < TALENT_SLOTS) out.push(id); }
  return out;
}

/** Puts a talent in a slot (or null to empty it). Returns the new state, or null if the talent is unknown or not owned. */
export function setSlot(s: TalentState, commander: string, slot: number, id: string | null): TalentState | null {
  if (slot < 0 || slot >= TALENT_SLOTS) return null;
  const cur = [...talentsFor(commander, s)];
  while (cur.length < TALENT_SLOTS) cur.push('');
  if (id !== null) {
    const t = talentById(id);
    if (!t || !owns(t, s)) return null;
    const at = cur.indexOf(id);
    if (at >= 0) cur[at] = cur[slot]; // already worn: swap places with this slot
  }
  cur[slot] = id ?? '';
  return { unlocked: s.unlocked, loadout: { ...s.loadout, [commander]: cur.filter(Boolean) } };
}

export const talentCost = (id: string): number => talentById(id)?.cost ?? 0;
export const talentSpent = (s: TalentState): number => s.unlocked.reduce((n, id) => n + talentCost(id), 0);

/** Unlocks a talent. Returns the new state, or null if it is already owned or unknown. The caller checks the Ember balance. */
export function unlockTalent(s: TalentState, id: string): TalentState | null {
  const t = talentById(id);
  if (!t || t.cost === 0 || s.unlocked.includes(id)) return null;
  return { unlocked: [...s.unlocked, id], loadout: s.loadout };
}

export function applyTalents(mods: Mods, commander: string, s: TalentState): Mods {
  const m: Mods = { ...mods };
  for (const id of talentsFor(commander, s)) talentById(id)?.apply(m);
  return m;
}

export function mergeTalents(a: TalentState, b: TalentState): TalentState {
  return { unlocked: [...new Set([...a.unlocked, ...b.unlocked])], loadout: { ...b.loadout, ...a.loadout } };
}
