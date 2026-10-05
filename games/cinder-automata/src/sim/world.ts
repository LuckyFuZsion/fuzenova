// Cinder Automata - simulation core. No rendering or DOM in here so it can be tested headless.
import { DEFAULT_MODS, type Mods } from './commanders';
import { researchFx, type ResearchFx } from './research';
import { ROBOTS, type RobotType, type Soldier } from './robots';
import { ENEMIES, type EnemyKind } from './enemies';

import { plotIdAt, plotsBounds } from './plots';
export type Dir = 0 | 1 | 2 | 3; // east, south, west, north
export const DX = [1, 0, -1, 0];
export const DY = [0, 1, 0, -1];
export const opposite = (d: Dir): Dir => ((d + 2) % 4) as Dir;

// Item, recipe and ammo data lives in items.ts; re-exported here so the rest of the code keeps one import.
import { AMMO, CORE_ITEMS, FUEL, ITEMS, ORE_ITEM, RECIPES, SMELTS, type ItemId, type Recipe } from './items';
import type { PowerInfo } from './power';
export { AMMO, FUEL, ITEMS, ORE_ITEM, RECIPES, SMELTS };
export type { ItemId, Recipe };

export const BELT_SPEED = 1.875; // tiles per second
export const ITEM_SPACING = 0.25; // tiles between items on a belt
export const MINE_TIME = 1.5; // seconds per ore
export const SMELT_TIME = 3.2;
export const SWING_TIME = 0.6; // one half of an inserter swing
export const FURNACE_IN_MAX = 6;
export const FURNACE_OUT_MAX = 5;

interface Base {
  id: number; x: number; y: number; w: number; h: number; dir: Dir; hp: number; maxHp: number;
  /** placed during the current build phase; cleared when a fight starts (it is then "locked in" and removal is no longer free) */
  fresh?: boolean;
}
/** `j` is a fixed sideways wobble (-1..1) so a full belt looks like a heap of ore, not a single-file line; it travels with the item */
export interface BeltItem { type: ItemId; pos: number; j?: number }
export interface Belt extends Base { kind: 'belt'; items: BeltItem[] }
export interface Miner extends Base { kind: 'miner'; progress: number; pending: ItemId | null; cursor: number }
export interface Inserter extends Base {
  kind: 'inserter'; state: 'idle' | 'toDrop' | 'back'; t: number; held: ItemId | null;
  /** false until its first successful transfer: until then it turns by itself to face whatever it can actually move items between */
  locked?: boolean;
  /** if set, it only moves this kind of item (null or missing = any item) */
  filter?: ItemId | null;
}
export interface Furnace extends Base {
  kind: 'furnace'; inType: ItemId | null; inCount: number; progress: number; outType: ItemId | null; outCount: number;
}
/** Shoots enemies. Pulls ammo from an adjacent belt (or an inserter) into a small stockpile. */
export interface Turret extends Base { kind: 'turret'; ammo: number; cooldown: number; pull: number; aim: number; dmg: number; /** ammo capacity; older saves have none and use the default */ maxAmmo?: number; /** gun, scatter or sniper (see turrets.ts); missing = the plain gun */ variant?: 'gun' | 'scatter' | 'sniper' }
/**
 * Makes one recipe at a time from items delivered by inserters (or a drill/belt end), and holds the result for an
 * inserter to collect. Click it (no building selected) to switch recipe.
 */
export interface Assembler extends Base {
  kind: 'assembler'; recipe: string; stock: Partial<Record<ItemId, number>>; out: number; progress: number;
}
/** The base the enemies are attacking. Lose it and the run is over. */
export interface Core extends Base {
  kind: 'core';
  /** the build budget: anything delivered to the core lands here, and buildings are paid for from it */
  stock: Partial<Record<ItemId, number>>;
}
/** A cheap blocker that soaks up enemy attention so turrets can do their work. */
export interface Wall extends Base { kind: 'wall' }
/** Turns iron plates into robot soldiers (only while a fight is on). Click it in-game to change what it builds. */
export interface RobotFab extends Base { kind: 'robotfab'; type: RobotType; stock: number; progress: number; pull: number }
/** Carries power. Anything within its supply area, and every pole within reach, joins one network. */
export interface Pole extends Base { kind: 'pole' }
/** Burns coal, charcoal or wood (delivered by inserter or belt) while a fight is on, and feeds its power network. */
export interface Generator extends Base { kind: 'generator'; fuelSecs: number }
/** A scrap bin: destroys whatever an inserter (or belt) gives it. Put a filtered inserter in front of it to clear just one kind of item. */
export interface ScrapBin extends Base { kind: 'scrapbin'; burned: number }
/** The Storm Coil: needs no ammo, but power. Its lightning jumps from one enemy to the next. */
export interface Coil extends Base { kind: 'coil'; cooldown: number; use: number; flash: number; /** stored energy, 0 to COIL_CHARGE_MAX; each bolt spends some */ charge: number }
/**
 * A crossover: two belts can cross through one tile. Items go straight on in the direction they came in, one lane
 * for each of the four directions, so a line running east-west and another running north-south never mix.
 */
export interface Junction extends Base { kind: 'junction'; lanes: BeltItem[][] }
/**
 * Splits one belt into two, or merges two belts into one. It is 1 tile wide and 2 long across the flow: belts feed it
 * from behind (either tile) and it hands items out to the two tiles in front, taking turns. With only one belt in
 * front it is a merger; with only one belt behind it is a splitter.
 */
export interface Splitter extends Base { kind: 'splitter'; items: BeltItem[]; rr: 0 | 1 }
export type Entity = Junction | Splitter | Belt | Miner | Inserter | Furnace | Turret | Core | RobotFab | Wall | Assembler | Pole | Generator | Coil | ScrapBin;
export type Kind = Entity['kind'];

export const KINDS: Record<Kind, { w: number; h: number; name: string }> = {
  belt: { w: 1, h: 1, name: 'Conveyor belt' },
  inserter: { w: 1, h: 1, name: 'Inserter' },
  miner: { w: 3, h: 2, name: 'Mining drill' },
  furnace: { w: 2, h: 2, name: 'Smelter' },
  turret: { w: 2, h: 2, name: 'Gun turret' },
  core: { w: 3, h: 3, name: 'Cinder Core' },
  robotfab: { w: 3, h: 3, name: 'Robot fabricator' },
  wall: { w: 1, h: 1, name: 'Wall' },
  assembler: { w: 3, h: 3, name: 'Assembler' },
  pole: { w: 1, h: 1, name: 'Power pole' },
  generator: { w: 2, h: 2, name: 'Ember generator' },
  coil: { w: 2, h: 2, name: 'Storm coil' },
  junction: { w: 1, h: 1, name: 'Crossover' },
  splitter: { w: 1, h: 2, name: 'Splitter / merger' },
  scrapbin: { w: 2, h: 2, name: 'Scrap bin' },
};

/** The tiles a building covers when facing this way (a splitter is long across its flow, so turning it swaps width and height). */
export function footprint(kind: Kind, dir: Dir): { w: number; h: number } {
  const k = KINDS[kind];
  // a splitter is long across its flow; a drill is long across the side it feeds. Turning either swaps width and height.
  const swap = (kind === 'splitter' && dir % 2 === 1) || (kind === 'miner' && dir % 2 === 0);
  return swap ? { w: k.h, h: k.w } : { w: k.w, h: k.h };
}

/** Structure health. Enemies attack turrets and walls first, so those are the toughest. */
export const STRUCTURE_HP: Record<Kind, number> = {
  belt: 40, inserter: 40, miner: 140, furnace: 140, turret: 280, core: 600, robotfab: 240, wall: 320, assembler: 160,
  pole: 140, generator: 220, coil: 260, junction: 40, splitter: 60, scrapbin: 120,
};

/** Largest fuel reserve a generator will hold, in seconds of running time. */
export const GENERATOR_MAX_FUEL = 120;

/** Fallback damage per shot when a turret's ammo was set directly (tests, old saves). */
export const DEFAULT_TURRET_DAMAGE = 8;
export const TURRET_MAX_AMMO = 40;
export const ASSEMBLER_BUFFER = 2; // crafts' worth of each input an assembler will hold
export const ASSEMBLER_OUT_MAX = 6;
export const CORE_HP = 600;

/** A hostile unit. Positions are in tile coordinates (floats). */
export interface Enemy {
  id: number; x: number; y: number; hp: number; maxHp: number; speed: number; dmg: number; born: number; kind?: EnemyKind;
  /** boss ability timer, seconds */ abil?: number;
  /** ground enemies: the route round obstacles, and when it was made */
  path?: { x: number; y: number }[]; pathT?: number; pathVer?: number;
  /** stragglers at the end of a fight get hurried along (see Run.hurryStragglers) */
  rushed?: boolean;
  /** stuck detection: where it was last checked, how long ago, and how many times it has been moved on */
  sx?: number; sy?: number; st?: number; nudged?: number;
}
/** A one-shot visual effect (explosion, muzzle flash, spark, smoke). Drawing only; it never affects the simulation. */
export interface Fx {
  name: string; x: number; y: number; age: number; dur: number;
  /** final size in tiles */
  size: number; rot: number;
  /** overall see-through-ness, 0..1 (default 1) */
  opacity?: number;
  /** drawn with additive light (fire, flashes) rather than normal alpha (smoke) */
  add: boolean;
  /** true = grows and fades like an explosion; false = quick pop */
  grow: boolean;
}
/** A bolt of chain lightning: the points it jumps through, and how long it stays visible. */
export interface Arc { pts: { x: number; y: number }[]; ttl: number; life: number }
/** A short-lived tracer line for a turret shot, for drawing only. */
export interface Shot { x1: number; y1: number; x2: number; y2: number; ttl: number; /** what it is, for drawing (default: a turret bullet) */ kind?: 'acid' | 'bullet'; /** seconds it takes to reach the target on screen (default: a short bullet flight) */ life?: number }

export function createEntity(kind: Kind, id: number, x: number, y: number, dir: Dir): Entity {
  const { w, h } = footprint(kind, dir);
  const base = { id, x, y, w, h, dir, hp: STRUCTURE_HP[kind], maxHp: STRUCTURE_HP[kind] };
  switch (kind) {
    case 'belt': return { ...base, kind, items: [] };
    case 'junction': return { ...base, kind, lanes: [[], [], [], []] };
    case 'splitter': return { ...base, kind, items: [], rr: 0 };
    case 'miner': return { ...base, kind, progress: 0, pending: null, cursor: 0 };
    case 'inserter': return { ...base, kind, state: 'idle', t: 0, held: null, locked: false };
    case 'furnace': return { ...base, kind, inType: null, inCount: 0, progress: 0, outType: null, outCount: 0 };
    case 'turret': return { ...base, kind, ammo: 0, cooldown: 0, pull: 0, aim: 0, dmg: DEFAULT_TURRET_DAMAGE };
    case 'assembler': return { ...base, kind, recipe: 'gunpowder', stock: {}, out: 0, progress: 0 };
    case 'pole': return { ...base, kind };
    case 'generator': return { ...base, kind, fuelSecs: 0 };
    case 'scrapbin': return { ...base, kind, burned: 0 };
    case 'coil': return { ...base, kind, cooldown: 0, use: 0, flash: 0, charge: 0 };
    case 'core': return { ...base, kind, stock: {} };
    case 'wall': return { ...base, kind };
    case 'robotfab': return { ...base, kind, type: 'scout', stock: 0, progress: 0, pull: 0 };
  }
}

/** The two tiles along the facing edge of a miner; ore goes onto whichever accepts it first. */
export function minerOutputs(m: { x: number; y: number; w: number; h: number; dir: Dir }): { x: number; y: number }[] {
  switch (m.dir) {
    case 0: return [{ x: m.x + m.w, y: m.y }, { x: m.x + m.w, y: m.y + 1 }];
    case 1: return [{ x: m.x, y: m.y + m.h }, { x: m.x + 1, y: m.y + m.h }];
    case 2: return [{ x: m.x - 1, y: m.y }, { x: m.x - 1, y: m.y + 1 }];
    default: return [{ x: m.x, y: m.y - 1 }, { x: m.x + 1, y: m.y - 1 }];
  }
}

/**
 * Every tile touching a miner's edge, tagged with the side it is on, facing side first. A drill can hand ore to
 * whatever is attached on ANY side, so placing it "the wrong way round" still works.
 */
export function minerContacts(m: { x: number; y: number; w: number; h: number; dir: Dir }): { x: number; y: number; side: Dir }[] {
  if (m.w === m.h) { // a drill from an older save is 2x2 and hands ore to any tile on any side
    const bySide = (side: Dir): { x: number; y: number; side: Dir }[] => {
      const t = side === 0 ? [...Array(m.h)].map((_, i) => ({ x: m.x + m.w, y: m.y + i }))
        : side === 1 ? [...Array(m.w)].map((_, i) => ({ x: m.x + i, y: m.y + m.h }))
          : side === 2 ? [...Array(m.h)].map((_, i) => ({ x: m.x - 1, y: m.y + i }))
            : [...Array(m.w)].map((_, i) => ({ x: m.x + i, y: m.y - 1 }));
      return t.map((p) => ({ ...p, side }));
    };
    const order: Dir[] = [m.dir, ((m.dir + 1) % 4) as Dir, ((m.dir + 3) % 4) as Dir, opposite(m.dir)];
    return order.flatMap(bySide);
  }
  // A drill is 3 long and 2 across. Ore leaves from the MIDDLE tile of each long side, so the belt always starts in the
  // middle of the drill and never hangs off to one side. The facing side comes first.
  const tall = m.h > m.w;
  const sides: { x: number; y: number; side: Dir }[] = tall
    ? [{ x: m.x + m.w, y: m.y + 1, side: 0 }, { x: m.x - 1, y: m.y + 1, side: 2 }]
    : [{ x: m.x + 1, y: m.y + m.h, side: 1 }, { x: m.x + 1, y: m.y - 1, side: 3 }];
  return sides.sort((p, q) => Number(q.side === m.dir) - Number(p.side === m.dir));
}

/** Would a drill at (m) be feeding this neighbour, or is that neighbour a belt heading INTO the drill? */
export function flowsIntoDrill(n: Entity, m: { x: number; y: number; w: number; h: number }): boolean {
  if (n.kind !== 'belt') return false;
  const fx = n.x + DX[n.dir], fy = n.y + DY[n.dir];
  return fx >= m.x && fx < m.x + m.w && fy >= m.y && fy < m.y + m.h;
}

export function accepts(dst: Entity, item: ItemId, pos = 0): boolean {
  switch (dst.kind) {
    case 'belt': return dst.items.every((i) => Math.abs(i.pos - pos) >= ITEM_SPACING - 1e-6);
    case 'core': return CORE_ITEMS.includes(item); // only what can be spent: plates and science packs
    case 'scrapbin': return true; // takes anything at all, and destroys it
    case 'generator': { const f = FUEL[item]; return !!f && dst.fuelSecs + f <= GENERATOR_MAX_FUEL; }
    case 'turret': { const a = AMMO[item]; return !!a && dst.ammo + a.shots <= (dst.maxAmmo ?? TURRET_MAX_AMMO); }
    case 'robotfab': return item === 'iron-plate' && dst.stock < ROBOTS[dst.type].cost * 2;
    case 'assembler': {
      const need = RECIPES[dst.recipe]?.inputs[item];
      return !!need && (dst.stock[item] ?? 0) < need * ASSEMBLER_BUFFER;
    }
    case 'furnace': {
      const out = SMELTS[item];
      return !!out && (dst.inCount === 0 || dst.inType === item) && dst.inCount < FURNACE_IN_MAX
        && (dst.outCount === 0 || dst.outType === out);
    }
    default: return false;
  }
}

export function insert(dst: Entity, item: ItemId, pos = 0, j?: number): void {
  switch (dst.kind) {
    case 'belt':
      dst.items.push({ type: item, pos, j: j ?? Math.random() * 2 - 1 });
      dst.items.sort((a, b) => b.pos - a.pos);
      break;
    case 'core': dst.stock[item] = (dst.stock[item] ?? 0) + 1; break;
    case 'generator': dst.fuelSecs += FUEL[item] ?? 0; break;
    case 'scrapbin': dst.burned++; break;
    case 'furnace': dst.inType = item; dst.inCount++; break;
    case 'turret': { const a = AMMO[item]!; dst.ammo += a.shots; dst.dmg = a.damage; break; }
    case 'robotfab': dst.stock++; break;
    case 'assembler': dst.stock[item] = (dst.stock[item] ?? 0) + 1; break;
  }
}

function findTakeable(src: Entity, pred: (i: ItemId) => boolean): ItemId | null {
  switch (src.kind) {
    case 'belt': for (const it of src.items) if (pred(it.type)) return it.type; return null;
    case 'furnace': return src.outCount > 0 && src.outType && pred(src.outType) ? src.outType : null;
    case 'assembler': { const o = RECIPES[src.recipe]?.output; return src.out > 0 && o && pred(o) ? o : null; }
    default: return null;
  }
}

function take(src: Entity, item: ItemId): void {
  switch (src.kind) {
    case 'belt': {
      const i = src.items.findIndex((it) => it.type === item);
      if (i >= 0) src.items.splice(i, 1);
      break;
    }
    case 'furnace': src.outCount--; if (src.outCount === 0) src.outType = null; break;
    case 'assembler': src.out--; break;
  }
}

export interface WorldState {
  w: number; h: number; nextId: number; nextSoldierId: number; kills: number; anim: number;
  ore: string; oreLeft: string; entities: Entity[]; soldiers: Soldier[];
  research?: Record<string, number>;
  plots?: number[];
  researching?: { id: string; left: number; total: number } | null;
  runLevel?: number;
}

function toB64(a: Uint8Array): string {
  let s = '';
  for (let i = 0; i < a.length; i += 8192) s += String.fromCharCode(...a.subarray(i, i + 8192));
  return btoa(s);
}
function fromB64(t: string): Uint8Array {
  const s = atob(t);
  const a = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i);
  return a;
}

export class World {
  readonly w: number;
  readonly h: number;
  readonly ore: Uint8Array; // 0 none, 1 iron, 2 copper
  readonly oreLeft: Uint16Array;
  private occ: Int32Array;
  entities = new Map<number, Entity>();
  private nextId = 1;
  /** Natural obstacles: 0 none, 1 boulders, 2 burnt trees, 3 tar pits. They cannot be built on or walked through. */
  readonly terrain: Uint8Array;
  /** 1 where there is mud: ground units walk through it at about half speed, and you can build on it */
  mud: Uint8Array;
  /** the level of the run (set by the Run), which gates the later levels of research */
  runLevel = 1;
  /** the research being worked on: it finishes once the factory has run for `left` more seconds */
  researching: { id: string; left: number; total: number } | null = null;
  /** The run's seed: its map, its omens and its offers all come from it. */
  seed = 1337;
  /** heaps of rubble left where a building was destroyed (drawing only; each lasts about 45 seconds of game time) */
  rubble: { x: number; y: number; size: number; pick: number; t0: number }[] = [];
  /** where things have been hurt lately (a building, the core or a robot), for the minimap's live "attack here" glow; each entry fades in about 1.5 seconds */
  hurt: { x: number; y: number; age: number }[] = [];
  markHurt(x: number, y: number): void {
    for (const h of this.hurt) if (Math.hypot(h.x - x, h.y - y) < 3) { h.age = 0; h.x = x; h.y = y; return; } // refresh the glow already there
    if (this.hurt.length < 60) this.hurt.push({ x, y, age: 0 });
  }
  /** sound cues raised by the simulation this frame (the game plays and clears them; the sim never touches audio) */
  sfx: string[] = [];
  cue(name: string): void { if (this.sfx.length < 80) this.sfx.push(name); }
  /** this fight's omen effects on the player's side: kill pay bonus, and how far turrets see (1 = normal) */
  bounty = 0;
  fog = 1;
  /** The part of the map in play. It starts small and grows with the level; outside it is unexplored and unbuildable. */
  arena = { x0: 0, y0: 0, x1: 0, y1: 0 };
  /** Plot mode (see plots.ts): the ids of the opened plots, or null for the old rectangular arena (tutorial, tests). */
  plots: Set<number> | null = null;
  /** plots on offer right now, and the one the player is pointing at (drawing only) */
  plotOffer: number[] = [];
  plotHover = -1;
  time = 0;
  /** the commander's multipliers (see commanders.ts) */
  mods: Mods = DEFAULT_MODS;
  /** research levels bought this run (tech id -> level), and their combined effect */
  research: Record<string, number> = {};
  rfx: ResearchFx = researchFx(this);
  /**
   * Clock for cosmetic animation only (belt arrows, robot bobbing, glows). It never stops, but runs slowly while the
   * factory is paused between fights, so the base looks alive without pretending the machines are working.
   */
  anim = 0;
  /** Combat state lives here so the renderer can draw it; the rules are in combat.ts. */
  enemies: Enemy[] = [];
  shots: Shot[] = [];
  fx: Fx[] = [];
  kills = 0;
  /** "Something has spawned here" pings, for drawing only: they fade out after a few seconds. */
  alerts: { x: number; y: number; age: number; life: number; big: boolean }[] = [];
  /** The player's robot army: it persists between rounds. */
  soldiers: Soldier[] = [];
  nextSoldierId = 1;
  core: Core | undefined;
  /** true = building is free (tutorial, tests). The real game turns this off and charges the core's stock. */
  freeBuild = true;
  /** bumped whenever a building is added or removed, so cached layouts (like the power network) know to rebuild */
  layoutVersion = 0;
  /** latest power state, filled in by power.ts; drawing and the coil read it */
  power: PowerInfo | undefined;
  /** lightning bolts currently on screen (drawing only) */
  arcs: Arc[] = [];
  private looseStock: Partial<Record<ItemId, number>> = {};
  /** The build budget. It lives on the core so it is saved with it; before a core exists it is a plain holder. */
  get stock(): Partial<Record<ItemId, number>> { return this.core ? this.core.stock : this.looseStock; }

  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.ore = new Uint8Array(w * h);
    this.oreLeft = new Uint16Array(w * h);
    this.occ = new Int32Array(w * h);
    this.terrain = new Uint8Array(w * h);
    this.mud = new Uint8Array(w * h);
    this.arena = { x0: 0, y0: 0, x1: w, y1: h };
  }

  /** Is this tile inside the part of the map that is in play? */
  inArena(x: number, y: number): boolean {
    if (this.plots) return this.plots.has(plotIdAt(x, y));
    return x >= this.arena.x0 && x < this.arena.x1 && y >= this.arena.y0 && y < this.arena.y1;
  }

  /** Switches to plot mode with these plots open (the bounding box becomes the arena, for the camera and minimap). */
  setPlots(open: Iterable<number>): void {
    this.plots = new Set(open);
    this.arena = plotsBounds(this.plots);
  }
  openPlot(id: number): void { if (this.plots) this.setPlots([...this.plots, id]); }
  /** Rock, tree or tar pit. */
  hasTerrain(x: number, y: number): boolean { return this.inBounds(x, y) && this.terrain[y * this.w + x] !== 0; }

  /** Sets the playable area to a square of this half-size round the core (the whole map if there is no core). */
  setArenaHalf(half: number): void {
    if (this.plots) return;
    const c = this.core;
    if (!c) { this.arena = { x0: 0, y0: 0, x1: this.w, y1: this.h }; return; }
    const cx = c.x + c.w / 2, cy = c.y + c.h / 2;
    this.arena = {
      x0: Math.max(0, Math.floor(cx - half)), y0: Math.max(0, Math.floor(cy - half)),
      x1: Math.min(this.w, Math.ceil(cx + half)), y1: Math.min(this.h, Math.ceil(cy + half)),
    };
  }

  /** Everything needed to rebuild this world later: terrain, buildings (with their contents), robots and counters. */
  exportState(): WorldState {
    return {
      w: this.w, h: this.h, nextId: this.nextId, nextSoldierId: this.nextSoldierId, kills: this.kills, anim: this.anim,
      ore: toB64(this.ore), oreLeft: toB64(new Uint8Array(this.oreLeft.buffer, this.oreLeft.byteOffset, this.oreLeft.byteLength)),
      entities: [...this.entities.values()], soldiers: this.soldiers.map(({ path: _p, pathT: _t, pathVer: _v, ...rest }) => rest), research: { ...this.research },
      plots: this.plots ? [...this.plots] : undefined,
      researching: this.researching ? { ...this.researching } : null, runLevel: this.runLevel,
    };
  }

  importState(s: WorldState): void {
    if (s.w !== this.w || s.h !== this.h) throw new Error('save is for a different map size');
    if (s.plots) this.setPlots(s.plots); else if (this.plots) { this.plots = null; this.arena = { x0: 0, y0: 0, x1: this.w, y1: this.h }; } // a save from before plots: the old arena
    this.researching = s.researching ?? null; this.runLevel = s.runLevel ?? 1;
    this.ore.set(fromB64(s.ore));
    const left = fromB64(s.oreLeft);
    this.oreLeft.set(new Uint16Array(left.buffer, left.byteOffset, left.byteLength / 2));
    this.occ.fill(0);
    this.entities.clear();
    this.core = undefined;
    const lostChests: Partial<Record<ItemId, number>> = {}; // storage chests were taken out of the game: their contents go to the core
    for (const e of s.entities) {
      if ((e as { kind: string }).kind === 'chest') {
        const inv = (e as unknown as { inv?: Partial<Record<ItemId, number>> }).inv ?? {};
        for (const k in inv) lostChests[k as ItemId] = (lostChests[k as ItemId] ?? 0) + (inv[k as ItemId] ?? 0);
        continue;
      }
      this.entities.set(e.id, e);
      for (let dy = 0; dy < e.h; dy++) for (let dx = 0; dx < e.w; dx++) this.occ[(e.y + dy) * this.w + e.x + dx] = e.id;
      if (e.kind === 'core') this.core = e;
    }
    if (this.core) for (const k in lostChests) this.core.stock[k as ItemId] = (this.core.stock[k as ItemId] ?? 0) + (lostChests[k as ItemId] ?? 0);
    this.layoutVersion++;
    this.power = undefined;
    this.nextId = s.nextId;
    this.nextSoldierId = s.nextSoldierId;
    this.soldiers = s.soldiers;
    this.kills = s.kills;
    this.research = { ...(s.research ?? {}) };
    this.rfx = researchFx(this);
    this.anim = s.anim;
    this.enemies = [];
    this.shots = [];
    this.fx = [];
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  entityAt(x: number, y: number): Entity | undefined {
    if (!this.inBounds(x, y)) return undefined;
    const id = this.occ[y * this.w + x];
    return id ? this.entities.get(id) : undefined;
  }

  canPlace(kind: Kind, x: number, y: number, dir: Dir = 0): boolean {
    const { w, h } = footprint(kind, dir);
    if (kind === 'belt' && this.entityAt(x, y)?.kind === 'belt') return true; // re-orient
    let ore = false;
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        if (!this.inBounds(x + dx, y + dy) || !this.inArena(x + dx, y + dy) || this.occ[(y + dy) * this.w + x + dx] || this.terrain[(y + dy) * this.w + x + dx]) return false;
        if (this.oreLeft[(y + dy) * this.w + x + dx] > 0) ore = true;
      }
    }
    if (this.enemies.length && kind !== 'belt' && kind !== 'inserter' && kind !== 'junction' && kind !== 'splitter') { // solid buildings cannot be dropped on top of walkers
      for (const en of this.enemies) {
        if (en.kind && ENEMIES[en.kind].flying) continue;
        if (en.x > x - 0.4 && en.x < x + w + 0.4 && en.y > y - 0.4 && en.y < y + h + 0.4) return false;
      }
    }
    return kind !== 'miner' || ore;
  }

  place(kind: Kind, x: number, y: number, dir: Dir): Entity | null {
    if (kind === 'belt') {
      const ex = this.entityAt(x, y);
      if (ex && ex.kind === 'belt') { ex.dir = dir; return ex; }
    }
    if (!this.canPlace(kind, x, y, dir)) return null;
    const e = createEntity(kind, this.nextId++, x, y, dir);
    if (e.kind === 'turret' || e.kind === 'wall') { e.maxHp = Math.round(e.maxHp * this.mods.defenceHp * this.rfx.defenceHp); e.hp = e.maxHp; }
    if (e.kind === 'turret') e.maxAmmo = Math.round(TURRET_MAX_AMMO * this.mods.turretAmmo);
    for (let dy = 0; dy < e.h; dy++) for (let dx = 0; dx < e.w; dx++) this.occ[(y + dy) * this.w + x + dx] = e.id;
    this.entities.set(e.id, e);
    this.layoutVersion++;
    if (e.kind === 'core') this.core = e;
    return e;
  }

  /** True if this entity, moved so its top-left corner is at (x, y), would sit on free ground (drills still need ore). */
  fits(e: Entity, x: number, y: number): boolean {
    let ore = false;
    for (let dy = 0; dy < e.h; dy++) {
      for (let dx = 0; dx < e.w; dx++) {
        if (!this.inBounds(x + dx, y + dy) || !this.inArena(x + dx, y + dy) || this.occ[(y + dy) * this.w + x + dx] || this.terrain[(y + dy) * this.w + x + dx]) return false;
        if (this.oreLeft[(y + dy) * this.w + x + dx] > 0) ore = true;
      }
    }
    return e.kind !== 'miner' || ore;
  }

  /**
   * Empties whatever a building is carrying: ammo, items waiting to be processed, fuel, a coil's charge. A building that is
   * moved to a new place arrives empty and has to be supplied again, so moving one can never be a way to keep it stocked.
   * Its settings (recipe, filter, robot type) and its health stay.
   */
  emptyContents(e: Entity): void {
    switch (e.kind) {
      case 'turret': e.ammo = 0; e.cooldown = 0; e.pull = 0; break;
      case 'furnace': e.inType = null; e.inCount = 0; e.outType = null; e.outCount = 0; e.progress = 0; break;
      case 'assembler': e.stock = {}; e.out = 0; e.progress = 0; break;
      case 'robotfab': e.stock = 0; e.progress = 0; e.pull = 0; break;
      case 'generator': e.fuelSecs = 0; break;
      case 'coil': e.charge = 0; e.cooldown = 0; break;
      case 'miner': e.pending = null; e.progress = 0; break;
      case 'inserter': e.held = null; e.state = 'idle'; e.t = 0; break;
      case 'belt': e.items = []; break;
      default: break;
    }
  }

  /** Puts an entity that was lifted with remove() back down at a new spot, keeping its settings and health (see emptyContents for what it carries). */
  putBack(e: Entity, x: number, y: number): boolean {
    if (!this.fits(e, x, y)) return false;
    e.x = x; e.y = y;
    for (let dy = 0; dy < e.h; dy++) for (let dx = 0; dx < e.w; dx++) this.occ[(y + dy) * this.w + x + dx] = e.id;
    this.entities.set(e.id, e);
    this.layoutVersion++;
    if (e.kind === 'core') this.core = e;
    return true;
  }

  remove(x: number, y: number): Entity | undefined {
    const e = this.entityAt(x, y);
    if (!e || (e.kind === 'core' && this.core === e && e.hp > 0)) return undefined; // the core can't be removed (only destroyed by losing)
    for (let dy = 0; dy < e.h; dy++) for (let dx = 0; dx < e.w; dx++) this.occ[(e.y + dy) * this.w + e.x + dx] = 0;
    this.entities.delete(e.id);
    this.layoutVersion++;
    return e;
  }

  step(dt: number): void {
    this.time += dt;
    for (const e of this.entities.values()) {
      switch (e.kind) {
        case 'miner': this.stepMiner(e, dt); break;
        case 'inserter': this.stepInserter(e, dt); break;
        case 'furnace': this.stepFurnace(e, dt); break;
        case 'assembler': this.stepAssembler(e, dt); break;
        case 'generator': e.fuelSecs = Math.max(0, e.fuelSecs - dt); break; // burning fuel is what powers the network
        case 'coil': e.flash = Math.max(0, e.flash - dt); break;
        case 'belt': this.stepBelt(e, dt); break;
        case 'junction': this.stepJunction(e, dt); break;
        case 'splitter': this.stepSplitter(e, dt); break;
      }
    }
  }

  private stepMiner(m: Miner, dt: number): void {
    if (!m.pending) {
      m.progress = Math.min(MINE_TIME, m.progress + dt);
      if (m.progress >= MINE_TIME) {
        const n = m.w * m.h;
        for (let k = 0; k < n; k++) {
          const i = (m.cursor + k) % n;
          const idx = (m.y + Math.floor(i / m.w)) * this.w + m.x + (i % m.w);
          if (this.oreLeft[idx] > 0) {
            this.oreLeft[idx]--;
            m.pending = ORE_ITEM[this.ore[idx]];
            if (this.oreLeft[idx] === 0) this.ore[idx] = 0;
            m.cursor = i + 1;
            m.progress = 0;
            break;
          }
        }
      }
    }
    if (m.pending) {
      // hand the ore to whatever is attached on any side, then turn to face it
      // alternate: the side used last goes to the back of the queue, so two connected belts share the ore evenly
      const contacts = minerContacts(m);
      for (const o of [...contacts.filter((c) => c.side !== m.dir), ...contacts.filter((c) => c.side === m.dir)]) {
        const dst = this.entityAt(o.x, o.y);
        if (!dst || flowsIntoDrill(dst, m)) continue;
        if (accepts(dst, m.pending, 0.5)) {
          insert(dst, m.pending, 0.5);
          m.pending = null;
          m.dir = o.side;
          break;
        }
      }
    }
  }

  private stepInserter(s: Inserter, dt: number): void {
    const ends = (d: Dir) => ({ src: this.entityAt(s.x - DX[d], s.y - DY[d]), dst: this.entityAt(s.x + DX[d], s.y + DY[d]) });
    const { src, dst } = ends(s.dir);
    switch (s.state) {
      case 'idle': {
        // Until its first delivery an inserter turns to face whatever it can really move items between, so the way
        // round it was placed doesn't matter. Its current direction is tried first; after that it stays put.
        const tries: Dir[] = s.locked ? [s.dir] : [s.dir, ...([0, 1, 2, 3] as Dir[]).filter((d) => d !== s.dir)];
        for (const d of tries) {
          const e = ends(d);
          if (!e.src || !e.dst || e.src === e.dst) continue;
          const item = findTakeable(e.src, (i) => (!s.filter || i === s.filter) && accepts(e.dst!, i, 0.5));
          if (item) { s.dir = d; take(e.src, item); s.held = item; s.state = 'toDrop'; s.t = 0; break; }
        }
        break;
      }
      case 'toDrop':
        s.t = Math.min(SWING_TIME, s.t + dt);
        if (s.t >= SWING_TIME && s.held && dst && accepts(dst, s.held, 0.5)) {
          insert(dst, s.held, 0.5);
          s.held = null; s.state = 'back'; s.t = 0;
          s.locked = true; // direction confirmed by a real delivery
        }
        break;
      case 'back':
        s.t += dt;
        if (s.t >= SWING_TIME) { s.state = 'idle'; s.t = 0; }
        break;
    }
  }

  private stepFurnace(f: Furnace, dt: number): void {
    if (f.inCount > 0 && f.outCount < FURNACE_OUT_MAX) {
      f.progress += dt;
      if (f.progress >= SMELT_TIME) {
        f.progress = 0;
        f.outType = SMELTS[f.inType!] ?? null;
        f.inCount--;
        f.outCount++;
        if (f.inCount === 0) f.inType = null;
      }
    } else if (f.inCount === 0) {
      f.progress = 0;
    }
  }

  private stepAssembler(a: Assembler, dt: number): void {
    const r = RECIPES[a.recipe];
    if (!r || a.out + r.count > ASSEMBLER_OUT_MAX) return;
    for (const k in r.inputs) if ((a.stock[k as ItemId] ?? 0) < (r.inputs[k as ItemId] ?? 0)) return; // waiting for inputs
    a.progress += dt;
    if (a.progress < r.time) return;
    a.progress = 0;
    for (const k in r.inputs) a.stock[k as ItemId] = (a.stock[k as ItemId] ?? 0) - (r.inputs[k as ItemId] ?? 0);
    a.out += r.count;
  }

  /** Hands an item that has reached the end of a conveyor piece to whatever is in front of it. True if it was taken. */
  private offer(next: Entity | undefined, item: ItemId, j: number | undefined, dir: Dir, fromX: number, fromY: number): boolean {
    if (!next) return false;
    const roomAtStart = (list: BeltItem[]) => list.every((i) => Math.abs(i.pos) >= ITEM_SPACING - 1e-6);
    switch (next.kind) {
      case 'core': insert(next, item); return true;
      case 'belt':
        if (next.dir !== opposite(dir) && accepts(next, item, 0)) { insert(next, item, 0, j); return true; }
        return false;
      case 'junction': {
        const lane = next.lanes[dir];
        if (!roomAtStart(lane)) return false;
        lane.push({ type: item, pos: 0, j }); lane.sort((a, b) => b.pos - a.pos);
        return true;
      }
      case 'splitter': {
        if (next.dir !== dir || !roomAtStart(next.items)) return false; // only from behind
        const across = dir % 2 === 0 ? fromY - next.y : fromX - next.x; // which of its two tiles the item came through
        next.items.push({ type: item, pos: 0, j: across >= 1 ? 1 : -1 });
        next.items.sort((a, b) => b.pos - a.pos);
        return true;
      }
    }
    return false;
  }

  private advance(items: BeltItem[], dt: number): void {
    const move = BELT_SPEED * dt;
    for (let i = 0; i < items.length; i++) {
      const limit = i === 0 ? 1 : items[i - 1].pos - ITEM_SPACING;
      items[i].pos = Math.max(items[i].pos, Math.min(items[i].pos + move, limit));
    }
  }

  private stepJunction(c: Junction, dt: number): void {
    for (let d = 0; d < 4; d++) {
      const lane = c.lanes[d];
      if (!lane.length) continue;
      this.advance(lane, dt);
      if (lane[0].pos >= 1 && this.offer(this.entityAt(c.x + DX[d], c.y + DY[d]), lane[0].type, lane[0].j, d as Dir, c.x, c.y)) lane.shift();
    }
  }

  private stepSplitter(s: Splitter, dt: number): void {
    if (!s.items.length) return;
    this.advance(s.items, dt);
    if (s.items[0].pos < 1) return;
    const d = s.dir;
    // the two tiles in front, taking turns; if one is blocked the other gets it
    const fronts = d === 0 ? [[s.x + 1, s.y], [s.x + 1, s.y + 1]] : d === 2 ? [[s.x - 1, s.y], [s.x - 1, s.y + 1]] : d === 1 ? [[s.x, s.y + 1], [s.x + 1, s.y + 1]] : [[s.x, s.y - 1], [s.x + 1, s.y - 1]];
    for (const k of [s.rr, 1 - s.rr]) {
      const [fx, fy] = fronts[k];
      const it = s.items[0];
      if (this.offer(this.entityAt(fx, fy), it.type, undefined, d, fx - DX[d], fy - DY[d])) { s.items.shift(); s.rr = (1 - k) as 0 | 1; return; }
    }
  }

  private stepBelt(b: Belt, dt: number): void {
    const items = b.items;
    if (!items.length) return;
    this.advance(items, dt);
    if (items[0].pos >= 1 && this.offer(this.entityAt(b.x + DX[b.dir], b.y + DY[b.dir]), items[0].type, items[0].j, b.dir, b.x, b.y)) items.shift();
  }
}

const BELT_TAKERS = new Set(['core', 'inserter', 'turret', 'robotfab', 'furnace', 'assembler', 'generator', 'scrapbin']);

/**
 * Belts that end in empty ground beside something that takes items turn to face it, so a line reads as running into the
 * machine, as a corner or a straight piece. Run whenever the layout changes; it only touches dead-end belts.
 */
export function faceBeltEnds(w: World): void {
  for (const b of w.entities.values()) {
    if (b.kind !== 'belt' || w.entityAt(b.x + DX[b.dir], b.y + DY[b.dir])) continue; // leads somewhere already
    const behind = opposite(b.dir);
    for (const d of [0, 1, 2, 3] as Dir[]) {
      if (d === behind) continue;
      const n = w.entityAt(b.x + DX[d], b.y + DY[d]);
      if (n && BELT_TAKERS.has(n.kind)) { b.dir = d; break; }
    }
  }
}
