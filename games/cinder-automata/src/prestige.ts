// The player's Embers and Workshop perks, kept in this browser and in their account (see cloud.ts). Rules are in sim/prestige.ts.
import { markDirty } from './cloud';
import { DEFAULT_MODS, type Mods } from './sim/commanders';
import { EMPTY_PRESTIGE, applyPerks, balance, buy, emberReward, perkById, withEntry, type LedgerEntry, type PrestigeState } from './sim/prestige';
import { commanderById } from './sim/commanders';
import { DIFFICULTIES } from './sim/difficulty';
import { applyTalents, setSlot, talentById, talentsFor, unlockTalent, type TalentState } from './sim/talents';

const KEY = 'cinder-automata.prestige.v1';

export function loadPrestige(): PrestigeState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...EMPTY_PRESTIGE, levels: {} };
    const p = JSON.parse(raw) as Partial<PrestigeState>;
    const levels: Record<string, number> = {};
    for (const [k, v] of Object.entries(p.levels ?? {})) if (typeof v === 'number' && v > 0) levels[k] = Math.floor(v);
    const unlocked = Array.isArray(p.unlocked) ? p.unlocked.filter((x): x is string => typeof x === 'string' && !!talentById(x)) : [];
    const loadout: Record<string, string[]> = {};
    for (const [k, v] of Object.entries(p.loadout ?? {})) if (Array.isArray(v)) loadout[k] = v.filter((x): x is string => typeof x === 'string').slice(0, 3);
    const log: LedgerEntry[] = Array.isArray(p.log) ? p.log.filter((e): e is LedgerEntry => !!e && typeof e.t === 'number' && typeof e.n === 'number' && typeof e.why === 'string') : [];
    return { earned: typeof p.earned === 'number' && p.earned > 0 ? Math.floor(p.earned) : 0, levels, unlocked, loadout, log };
  } catch { return { ...EMPTY_PRESTIGE, levels: {} }; }
}
function save(s: PrestigeState): void {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* cannot store: the change lasts this session only */ }
  markDirty();
}

export const embers = (): number => balance(loadPrestige());

/** Pays out a finished (or abandoned) run: `levelsDone` is how many levels it completed. Returns the Embers earned. */
export function awardRun(levelsDone: number, difficulty?: string, commander?: string, how: 'lost' | 'left' = 'lost'): number {
  const done = Math.max(0, Math.floor(levelsDone));
  const n = emberReward(done, difficulty);
  if (n <= 0) return 0;
  const s = loadPrestige();
  const diff = DIFFICULTIES.find((d) => d.id === difficulty)?.name ?? 'Normal';
  const who = commander ? `, ${commanderById(commander).name.split(' ').slice(-1)[0]}` : '';
  const why = `${how === 'lost' ? 'Run ended' : 'Run left behind'} after ${done} level${done === 1 ? '' : 's'} (${diff}${who})`;
  save(withEntry({ ...s, earned: s.earned + n }, { t: Date.now(), n, why }));
  return n;
}

/** Buys one level of a perk. True if it was bought. */
export function buyPerk(id: string): boolean {
  const before = loadPrestige();
  const next = buy(before, id);
  if (!next) return false;
  const p = perkById(id)!, lvl = next.levels[id] ?? 1;
  save(withEntry(next, { t: Date.now(), n: -p.base * lvl, why: `Bought ${p.name} level ${lvl}` }));
  return true;
}

const talentState = (s: PrestigeState): TalentState => ({ unlocked: s.unlocked ?? [], loadout: s.loadout ?? {} });

/** A run's modifiers with the player's Workshop perks and the commander's talents applied. */
export const withPerks = (mods: Mods = DEFAULT_MODS, commander = 'wren'): Mods => {
  const s = loadPrestige();
  return applyTalents(applyPerks(mods, s), commander, talentState(s));
};

/** The talents a commander will take into the next run. */
export const talentsOf = (commander: string): string[] => talentsFor(commander, talentState(loadPrestige()));
export const talentsOwned = (id: string): boolean => { const t = talentById(id); return !!t && (t.cost === 0 || (loadPrestige().unlocked ?? []).includes(id)); };

/** Buys a talent with Embers. True if it was bought. */
export function buyTalent(id: string): boolean {
  const s = loadPrestige(), t = talentById(id);
  if (!t || balance(s) < t.cost) return false;
  const next = unlockTalent(talentState(s), id);
  if (!next) return false;
  save(withEntry({ ...s, unlocked: next.unlocked }, { t: Date.now(), n: -t.cost, why: `Unlocked talent: ${t.name}` }));
  return true;
}

/** Puts a talent in one of a commander's slots (null empties it). */
export function setTalentSlot(commander: string, slot: number, id: string | null): boolean {
  const s = loadPrestige();
  const next = setSlot(talentState(s), commander, slot, id);
  if (!next) return false;
  save({ ...s, loadout: next.loadout });
  return true;
}
