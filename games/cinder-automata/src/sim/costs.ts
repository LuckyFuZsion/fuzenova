// What buildings cost. The player spends from the core's stock, which is topped up by anything delivered to the core
// (a belt running into it, or an inserter dropping into it), by kills, and by finishing levels.
import type { ItemId } from './items';
import type { Kind, World } from './world';

export type Cost = Partial<Record<ItemId, number>>;

export const COSTS: Record<Kind, Cost> = {
  belt: {}, // belts and inserters are always free: re-laying them is how you tune a factory
  inserter: {},
  miner: { 'iron-plate': 16 },
  furnace: { 'iron-plate': 10 },
  wall: { 'iron-plate': 4 },
  turret: { 'iron-plate': 30, 'copper-plate': 5 },
  assembler: { 'iron-plate': 40, 'copper-plate': 10 },
  robotfab: { 'iron-plate': 60, 'copper-plate': 20 },
  pole: { 'iron-plate': 2, 'copper-plate': 1 },
  generator: { 'iron-plate': 40, 'copper-plate': 10 },
  scrapbin: { 'iron-plate': 20 },
  coil: { 'iron-plate': 50, 'copper-plate': 30 },
  junction: {},
  splitter: {},
  core: {},
};

/** What a new run starts with, enough to build a first defence and start a supply line. */
export const START_STOCK: Cost = { 'iron-plate': 170, 'copper-plate': 45 };
/** Fraction of the cost handed back when you take a building down. */
export const REFUND = 0.75;
/** Belts and inserters are re-laid constantly while you tune a factory, so taking them down loses nothing. */
export const FREE_TO_REMOVE: Kind[] = ['belt', 'inserter', 'junction', 'splitter'];
export const KILL_REWARD: Cost = { 'iron-plate': 2 };
export const LEVEL_REWARD: Cost = { 'iron-plate': 30, 'copper-plate': 8 };

export function addStock(w: World, c: Cost, mult = 1): void {
  for (const k in c) w.stock[k as ItemId] = (w.stock[k as ItemId] ?? 0) + Math.floor((c[k as ItemId] ?? 0) * mult);
}

export function canAfford(w: World, kind: Kind): boolean {
  if (w.freeBuild) return true;
  const c = COSTS[kind];
  return Object.keys(c).every((k) => (w.stock[k as ItemId] ?? 0) >= (c[k as ItemId] ?? 0));
}

/** The first thing you cannot afford, for a "not enough ..." message. */
export function missing(w: World, kind: Kind): ItemId | null {
  if (w.freeBuild) return null;
  const c = COSTS[kind];
  for (const k in c) if ((w.stock[k as ItemId] ?? 0) < (c[k as ItemId] ?? 0)) return k as ItemId;
  return null;
}

/** Can the core stock pay this arbitrary cost (used by research)? */
export function canPay(w: World, c: Cost): boolean {
  return Object.keys(c).every((k) => (w.stock[k as ItemId] ?? 0) >= (c[k as ItemId] ?? 0));
}

export function pay(w: World, c: Cost): void {
  for (const k in c) w.stock[k as ItemId] = (w.stock[k as ItemId] ?? 0) - (c[k as ItemId] ?? 0);
}

export function spend(w: World, kind: Kind): void {
  if (w.freeBuild) return;
  const c = COSTS[kind];
  for (const k in c) w.stock[k as ItemId] = (w.stock[k as ItemId] ?? 0) - (c[k as ItemId] ?? 0);
}

/** `planned` = placed during this build phase and not yet locked in by a fight: taking it back costs nothing. */
export function refund(w: World, kind: Kind, planned = false): void {
  if (w.freeBuild) return;
  addStock(w, COSTS[kind], planned || FREE_TO_REMOVE.includes(kind) ? 1 : REFUND);
}

/** A compact price for the small build-bar buttons, like "30 + 5 cu". Iron is the default, so it gets no label. */
export const costShort = (kind: Kind): string => {
  const c = COSTS[kind];
  const parts = [`${c['iron-plate'] ?? 0}`];
  if (c['copper-plate']) parts.push(`${c['copper-plate']} cu`);
  return c['iron-plate'] || c['copper-plate'] ? parts.join(' + ') : 'free';
};

export const costText = (kind: Kind): string =>
  Object.entries(COSTS[kind]).map(([k, n]) => `${n} ${k.replace('-plate', '').replace('-', ' ')}`).join(', ') || 'free';
