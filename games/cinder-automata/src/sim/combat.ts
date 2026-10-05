// Fight rules: enemies march on the core, turrets and robot soldiers shoot them, fabricators build more robots.
import { COSTS, KILL_REWARD, addStock, canPay, pay, type Cost } from './costs';
import { AMMO, type ItemId } from './items';
import { COIL_CHARGE_MAX, COIL_CHARGE_RATE, COIL_SHOT_COST, COIL_USE_CHARGING, COIL_USE_FULL, satisfaction, updatePower } from './power';
import { ENEMIES, armouredDamage } from './enemies';
import { VARIANTS } from './turrets';
import { isBigRobot } from './commanders';
import { flowWalk, reachable, variantFor } from './flowfield';
import { escapeSpot, freeSpot, resetPathBudget, solidAt, walkGround } from './pathfind';
import { FAB_CAPACITY, ROBOTS, ROBOT_ORDER, ROBOT_SPACE, type Soldier } from './robots';
import { robotUnlocked } from './research';
import { DX, DY, TURRET_MAX_AMMO, accepts, insert, type Belt, type Enemy, type Entity, type Turret, type World } from './world';


export const TURRET_RANGE = 7;
export const TURRET_DAMAGE = 8;
export const TURRET_COOLDOWN = 0.42;
export const MAX_SOLDIERS = 200; // a safety limit; the real limit is each fabricator's room (see ROBOT_SPACE)

/** Room used by the living robots a fabricator has built. */
export function fabRoomUsed(world: World, fabId: number): number {
  let n = 0;
  for (const s of world.soldiers) if (s.fab === fabId) n += ROBOT_SPACE[s.type];
  return n;
}
export const SHOT_LIFE = 0.13; // seconds a bullet takes to reach its target on screen
const PULL_INTERVAL = 0.25;
const TURRET_PULL_INTERVAL = 0.08;
const ATTACK_REACH = 2.4; // tiles from the core's centre at which an enemy starts hitting it
const SOLDIER_AGGRO = 16; // tiles: soldiers go after enemies this close to them
const SOLDIER_RALLY = 90; // tiles: with nothing close, they still march to help against the nearest enemy (but only one inside their leash)
const SOLDIER_SELF_DEFENCE = 9; // tiles: anything this close is fought wherever the robot happens to be
export const SOLDIER_LEASH = 30; // tiles: robots only go after enemies within this distance of the fabricator that built them (or the core, if it is gone)
const MELEE_REACH = 1.2; // tiles: crawlers stop to chew on a ground robot this close

/** Tiles touching an entity's footprint on its four sides (corners don't count as adjacent). */
function adjacentTiles(t: Entity): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i < t.w; i++) out.push({ x: t.x + i, y: t.y - 1 }, { x: t.x + i, y: t.y + t.h });
  for (let j = 0; j < t.h; j++) out.push({ x: t.x - 1, y: t.y + j }, { x: t.x + t.w, y: t.y + j });
  return out;
}

/** Takes one item the entity will accept off any belt touching it; returns true if it got one. */
function pullFromBelts(world: World, e: Entity): boolean {
  for (const p of adjacentTiles(e)) {
    const b = world.entityAt(p.x, p.y);
    if (b?.kind !== 'belt') continue;
    const belt: Belt = b;
    const i = belt.items.findIndex((it) => accepts(e, it.type));
    if (i >= 0) {
      const [it] = belt.items.splice(i, 1);
      insert(e, it.type);
      return true;
    }
  }
  return false;
}

/** Enemies hit buildings for a bit less than they hit the core, so a lost turret is a setback rather than a disaster. */
const STRUCTURE_DAMAGE = 0.7;
const THREAT_RANGE = 7; // tiles: enemies notice turrets and walls this close
const POWER_THREAT_RANGE = 4.5; // tiles: poles and generators are only noticed this close, so they are hit last and only by what has got right up to them
const NEAR_RANGE = 2.2; // tiles: other machines are only attacked when an enemy is practically touching them

/** The building an enemy should attack: the nearest turret, wall, coil, power pole or generator in range (poles and generators only within 4.5 tiles and count 4 tiles farther), else something it is right up against. */
function pickStructure(world: World, en: Enemy): Entity | undefined {
  let best: Entity | undefined;
  let bestD = Infinity;
  for (const e of world.entities.values()) {
    if (e.kind === 'core' || e.kind === 'belt' || e.kind === 'inserter' || e.kind === 'junction' || e.kind === 'splitter') continue;
    const d = Math.hypot(e.x + e.w / 2 - en.x, e.y + e.h / 2 - en.y);
    const power = e.kind === 'pole' || e.kind === 'generator'; // cutting the power is a real threat, but a wall, turret or coil that is nearly as close is hit first
    const priority = e.kind === 'turret' || e.kind === 'wall' || e.kind === 'coil' || power;
    if (power ? d > POWER_THREAT_RANGE : priority ? d > THREAT_RANGE : d > NEAR_RANGE + Math.max(e.w, e.h) / 2) continue;
    const score = d + (power ? 4 : priority ? 0 : 6); // priority targets win unless a machine is far closer
    if (score < bestD) { best = e; bestD = score; }
  }
  return best;
}

const BRUTE_SMASH = 2.5; // the Siege Brute hits buildings this much harder than other enemies do
const COLOSSUS_RANGE = 9; // outranges the gun turret (7)
const COLOSSUS_REACH = 6.2; // it opens fire from 9 tiles but keeps walking until its target is this close, inside turret range
const COLOSSUS_RELOAD = 2.4; // seconds between shells
const QUEEN_HOLD = 9; // the Hive Queen stops this many tiles from the core

/** Anything solid the Siege Brute is up against (it ignores turrets that are not in its way). */
function pickBlocking(world: World, en: Enemy): Entity | undefined {
  let best: Entity | undefined, bestD = Infinity;
  for (const e of world.entities.values()) {
    if (e.kind === 'core' || e.kind === 'belt' || e.kind === 'inserter' || e.kind === 'junction' || e.kind === 'splitter') continue;
    const d = Math.hypot(e.x + e.w / 2 - en.x, e.y + e.h / 2 - en.y) - Math.max(e.w, e.h) / 2;
    if (d < 2.6 && d < bestD) { best = e; bestD = d; }
  }
  return best;
}

/** The Colossus shells the nearest turret, coil or wall in range, else the core. */
function colossusTarget(world: World, en: Enemy): { x: number; y: number; hit: (dmg: number) => void } | undefined {
  let best: Entity | undefined, bestD = COLOSSUS_RANGE;
  for (const e of world.entities.values()) {
    if (e.kind !== 'turret' && e.kind !== 'coil' && e.kind !== 'wall') continue;
    const d = Math.hypot(e.x + e.w / 2 - en.x, e.y + e.h / 2 - en.y);
    if (d < bestD) { best = e; bestD = d; }
  }
  if (best) {
    const b = best;
    return { x: b.x + b.w / 2, y: b.y + b.h / 2, hit: (dmg) => { b.hp -= dmg; world.markHurt(b.x + b.w / 2, b.y + b.h / 2); if (b.hp <= 0) destroyStructure(world, b); } };
  }
  const core = world.core;
  if (core && Math.hypot(core.x + core.w / 2 - en.x, core.y + core.h / 2 - en.y) < COLOSSUS_RANGE) {
    return { x: core.x + core.w / 2, y: core.y + core.h / 2, hit: (dmg) => { core.hp = Math.max(0, core.hp - dmg); world.cue('core-hit'); world.markHurt(core.x + core.w / 2, core.y + core.h / 2); } };
  }
  return undefined;
}

function destroyStructure(world: World, e: Entity): void {
  world.cue('structure-destroyed');
  if (e.kind !== 'belt' && e.kind !== 'inserter' && e.kind !== 'junction' && e.kind !== 'splitter') {
    world.rubble.push({ x: e.x + e.w / 2, y: e.y + e.h / 2, size: Math.max(e.w, e.h), pick: e.id % 4, t0: world.time });
    if (world.rubble.length > 40) world.rubble.shift();
  }
  const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
  const size = Math.max(e.w, e.h);
  addFx(world, size >= 2 ? 'fx-explosion-large' : 'fx-explosion-small', cx, cy, size * 1.4 + 0.6, 0.7);
  addFx(world, 'fx-smoke-1', cx, cy - 0.2, size * 1.3 + 0.5, 1.6, { add: false });
  world.remove(e.x, e.y);
}

/** Between rounds every surviving structure is patched up for free (repairs are cheap). Destroyed ones have to be re-placed. */
export function repairAll(world: World): void {
  for (const e of world.entities.values()) if (e.kind !== 'core') e.hp = e.maxHp; // the core has its own slower repair
}

/**
 * Paid repairs (Hard and Extreme): each damaged structure costs a share of its price in proportion to the damage,
 * most damaged first, as far as the core stock allows. Returns the iron plates spent.
 */
export function repairPaid(world: World, factor: number): number {
  const damaged = [...world.entities.values()].filter((e) => e.kind !== 'core' && e.hp < e.maxHp).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp);
  let iron = 0;
  for (const e of damaged) {
    const share = (1 - e.hp / e.maxHp) * factor;
    const cost = COSTS[e.kind];
    const scaled: Cost = {};
    for (const k in cost) scaled[k as ItemId] = Math.max(1, Math.ceil((cost[k as ItemId] ?? 0) * share));
    if (!canPay(world, scaled)) continue;
    pay(world, scaled);
    iron += scaled['iron-plate'] ?? 0;
    e.hp = e.maxHp;
  }
  return iron;
}

const MAX_FX = 90;
let ambientTimer = 0;

function addFx(world: World, name: string, x: number, y: number, size: number, dur: number, opts: { rot?: number; add?: boolean; grow?: boolean; opacity?: number } = {}): void {
  if (world.fx.length >= MAX_FX) world.fx.shift();
  world.fx.push({ name, x, y, age: 0, dur, size, rot: opts.rot ?? 0, add: opts.add ?? true, grow: opts.grow ?? true, opacity: opts.opacity });
}

/** A burst where an enemy died, sized to the enemy. */
function deathFx(world: World, en: Enemy): void {
  world.cue('enemy-death');
  const big = en.kind ? ENEMIES[en.kind].scale : 1.1;
  const rot = (en.id * 2.1) % (Math.PI * 2);
  const smoke = en.id % 3 === 0 ? 'fx-smoke-dust' : en.id % 2 === 0 ? 'fx-smoke-1' : 'fx-smoke-2'; // vary the plume so deaths don't look identical
  if (big >= 1.9) {
    addFx(world, 'fx-explosion-large', en.x, en.y, big * 1.9, 0.75, { rot });
    addFx(world, smoke, en.x, en.y - 0.2, big * 1.7, 1.5, { rot: -rot, add: false });
  } else {
    addFx(world, 'fx-explosion-small', en.x, en.y, big * 1.6 + 0.4, 0.5, { rot });
    if (big >= 1.3) addFx(world, smoke, en.x, en.y - 0.15, big * 1.2, 1.1, { rot: -rot, add: false });
  }
}

function nearestEnemy(world: World, cx: number, cy: number, range: number): Enemy | undefined {
  let best: Enemy | undefined;
  let bestD = range * range;
  for (const en of world.enemies) {
    const d = (en.x - cx) ** 2 + (en.y - cy) ** 2;
    if (d <= bestD) { best = en; bestD = d; }
  }
  return best;
}

/** The nearest enemy within `range` of the robot that is also within `leash` of its home, so robots never wander off after something far away. */
function nearestEnemyNear(world: World, x: number, y: number, range: number, hx: number, hy: number, leash: number): Enemy | undefined {
  let best: Enemy | undefined, bestD = range * range;
  const l2 = leash * leash;
  for (const en of world.enemies) {
    const d = (en.x - x) ** 2 + (en.y - y) ** 2;
    if (d <= bestD && (en.x - hx) ** 2 + (en.y - hy) ** 2 <= l2) { best = en; bestD = d; }
  }
  return best;
}

/**
 * Turrets that are fed from the same belt line share it out: the first one along the belt would otherwise take every item until it
 * was full while the ones after it went hungry. A turret only pulls while it is no fuller than the emptiest turret on its line
 * (plus a little slack), so the ammunition flows on down the belt to whoever has least.
 */
const SHARE_SLACK = 0.001; // strictly emptier counts: the supply alternates between the turrets on a line
let lineCache: { world: World; ver: number; beltLine: Map<number, number>; hops: Map<number, number>; mates: Map<number, Turret[]> } | undefined;
function turretLines(world: World) {
  if (lineCache && lineCache.world === world && lineCache.ver === world.layoutVersion) return lineCache;
  const parent = new Map<number, number>();
  const find = (i: number): number => { let r = i; while (parent.get(r) !== r) r = parent.get(r)!; return r; };
  for (const e of world.entities.values()) if (e.kind === 'belt') parent.set(e.id, e.id);
  for (const e of world.entities.values()) {
    if (e.kind !== 'belt') continue;
    const next = world.entityAt(e.x + DX[e.dir], e.y + DY[e.dir]);
    if (next?.kind === 'belt') parent.set(find(e.id), find(next.id)); // belts that lead into one another are one line
  }
  const beltLine = new Map<number, number>(), mates = new Map<number, Turret[]>();
  for (const id of parent.keys()) beltLine.set(id, find(id));
  const hops = new Map<number, number>(); // how many belts an item still has to travel before the end of the line
  const hopsOf = (b: Belt): number => {
    const known = hops.get(b.id);
    if (known !== undefined) return known;
    hops.set(b.id, 0); // guards against a loop of belts
    const next = world.entityAt(b.x + DX[b.dir], b.y + DY[b.dir]);
    const h = next?.kind === 'belt' ? 1 + hopsOf(next) : 0;
    hops.set(b.id, h);
    return h;
  };
  for (const e of world.entities.values()) if (e.kind === 'belt') hopsOf(e);
  for (const e of world.entities.values()) {
    if (e.kind !== 'turret') continue;
    const lines = new Set<number>();
    for (const p of adjacentTiles(e)) { const b = world.entityAt(p.x, p.y); if (b?.kind === 'belt') lines.add(beltLine.get(b.id)!); }
    for (const l of lines) { const list = mates.get(l) ?? []; list.push(e); mates.set(l, list); }
  }
  lineCache = { world, ver: world.layoutVersion, beltLine, hops, mates };
  return lineCache;
}
const ammoFill = (t: Turret): number => t.ammo / (t.maxAmmo ?? TURRET_MAX_AMMO);
/** How far down its belt line a turret sits: the fewest belts left to the end among the belts it touches (smaller = further downstream). */
function lineEnd(lc: NonNullable<typeof lineCache>, world: World, t: Turret, line: number): number {
  let best = Infinity;
  for (const p of adjacentTiles(t)) { const b = world.entityAt(p.x, p.y); if (b?.kind === 'belt' && lc.beltLine.get(b.id) === line) best = Math.min(best, lc.hops.get(b.id) ?? 0); }
  return best;
}
/** Is this turret allowed to take another item now? Not if the turrets further down the same belt line (counting what is already on the way to them) are a good deal emptier. */
function mayPull(world: World, t: Turret): boolean {
  const lc = turretLines(world);
  const mine = ammoFill(t);
  for (const p of adjacentTiles(t)) {
    const b = world.entityAt(p.x, p.y);
    if (b?.kind !== 'belt') continue;
    const line = lc.beltLine.get(b.id)!, here = lineEnd(lc, world, t, line);
    const down = (lc.mates.get(line) ?? []).filter((m) => m !== t && lineEnd(lc, world, m, line) < here);
    if (!down.length) continue;
    let shots = 0; // ammunition already on the belts below this turret, on its way to those turrets
    for (const e of world.entities.values()) {
      if (e.kind !== 'belt' || lc.beltLine.get(e.id) !== line || (lc.hops.get(e.id) ?? 0) >= here) continue;
      for (const it of e.items) shots += AMMO[it.type]?.shots ?? 0;
    }
    const share = shots / down.length;
    for (const m of down) if (ammoFill(m) + share / (m.maxAmmo ?? TURRET_MAX_AMMO) + SHARE_SLACK < mine) return false;
  }
  return true;
}

function stepTurrets(world: World, dt: number): void {
  for (const e of world.entities.values()) {
    if (e.kind !== 'turret') continue;
    const v = VARIANTS[e.variant ?? 'gun'];
    e.cooldown = Math.max(0, e.cooldown - dt);
    e.pull -= dt;
    if (e.pull <= 0) { e.pull = TURRET_PULL_INTERVAL; if (mayPull(world, e)) pullFromBelts(world, e); } // looks often, so an item passing along the belt is caught
    const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
    const range = v.range * world.rfx.turretRange * world.fog;
    const target = nearestEnemy(world, cx, cy, range);
    if (!target) continue;
    e.aim = Math.atan2(target.y - cy, target.x - cx);
    if (e.cooldown > 0 || e.ammo <= 0) continue;
    e.ammo--;
    e.cooldown = v.cooldown * world.rfx.turretCooldown;
    const dmg = e.dmg * v.dmgMul * world.mods.turretDmg * world.rfx.turretDmg;
    world.cue('bullet-hit');
    addFx(world, 'fx-muzzle-flash', cx + Math.cos(e.aim) * 1.42, cy + Math.sin(e.aim) * 1.42, v.cone ? 1.5 : 0.95, 0.09, { rot: e.aim, grow: false });
    if (v.cone) { // scatter: every enemy inside the cone takes the hit
      let shown = 0;
      for (const en of world.enemies) {
        const dx = en.x - cx, dy = en.y - cy, d = Math.hypot(dx, dy);
        if (d > range) continue;
        let da = Math.atan2(dy, dx) - e.aim; da = Math.atan2(Math.sin(da), Math.cos(da));
        if (Math.abs(da) > v.cone / 2) continue;
        en.hp -= armouredDamage(en.kind, dmg);
        if (shown++ < 6) { world.shots.push({ x1: cx + Math.cos(e.aim) * 1.1, y1: cy + Math.sin(e.aim) * 1.1, x2: en.x, y2: en.y, ttl: SHOT_LIFE }); addFx(world, 'fx-spark', en.x, en.y, 0.5, 0.14, { rot: en.id, grow: false }); }
      }
    } else {
      target.hp -= (e.variant === 'sniper') ? Math.max(dmg * 0.6, dmg - (ENEMIES[target.kind ?? 'crawler-1']?.armor ?? 0) * 0.4) : armouredDamage(target.kind, dmg); // the sniper shrugs off most armour
      world.shots.push({ x1: cx + Math.cos(e.aim) * 1.3, y1: cy + Math.sin(e.aim) * 1.3, x2: target.x, y2: target.y, ttl: SHOT_LIFE });
      addFx(world, 'fx-spark', target.x, target.y, e.variant === 'sniper' ? 0.8 : 0.55, 0.14, { rot: e.id, grow: false });
    }
  }
}

export const COIL_RANGE = 6.5;
export const COIL_DAMAGE = 30;
export const COIL_COOLDOWN = 1.3;
export const COIL_JUMPS = 2; // extra enemies the bolt hops on to after the first
export const COIL_JUMP_RANGE = 3.4;
export const COIL_FALLOFF = 0.75; // each hop hits for this fraction of the last

/** Jagged points between two spots, so a bolt looks like lightning instead of a ruler line. */
function zigzag(a: { x: number; y: number }, b: { x: number; y: number }, seed: number): { x: number; y: number }[] {
  const pts = [{ ...a }];
  const n = Math.max(3, Math.round(Math.hypot(b.x - a.x, b.y - a.y) * 2.2));
  const nx = -(b.y - a.y), ny = b.x - a.x, len = Math.hypot(nx, ny) || 1;
  for (let i = 1; i < n; i++) {
    const t = i / n, j = (Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453) % 1; // deterministic jitter
    const off = (j - 0.5) * 0.55 * Math.min(1, Math.sin(Math.PI * t) * 1.6);
    pts.push({ x: a.x + (b.x - a.x) * t + (nx / len) * off, y: a.y + (b.y - a.y) * t + (ny / len) * off });
  }
  pts.push({ ...b });
  return pts;
}

/** Storm coils: power in, chain lightning out. No ammo, but no power means no lightning. */
function stepCoils(world: World, dt: number): void {
  for (const e of world.entities.values()) {
    if (e.kind !== 'coil') continue;
    e.cooldown = Math.max(0, e.cooldown - dt);
    const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
    const target = nearestEnemy(world, cx, cy, COIL_RANGE * world.rfx.coilRange);
    e.charge = e.charge ?? 0; // coils from an old save had no charge
    const full = e.charge >= COIL_CHARGE_MAX - 1e-6;
    e.use = (full ? COIL_USE_FULL : COIL_USE_CHARGING) * world.mods.coilPower; // a full coil asks for almost nothing; a charging one asks for a lot
    if (!full) e.charge = Math.min(COIL_CHARGE_MAX, e.charge + COIL_CHARGE_RATE * satisfaction(world, e) * dt); // it gains what the network can give it
    if (!target || e.cooldown > 0 || e.charge < COIL_SHOT_COST) continue; // no enemy, reloading, or not charged enough for a bolt
    e.charge -= COIL_SHOT_COST;
    e.cooldown = COIL_COOLDOWN;
    e.flash = 0.35;
    addFx(world, 'fx-ring', cx, cy, 3.6, 0.42, { grow: true, rot: e.id }); // a ripple of electricity leaves the coil
    const hit = new Set<number>([target.id]);
    let from = { x: cx, y: cy - 0.3 }, cur: Enemy = target, dmg = COIL_DAMAGE * world.mods.coilDmg * world.rfx.coilDmg;
    for (let i = 0; i <= COIL_JUMPS + world.mods.coilJumps + world.rfx.coilJumps; i++) {
      cur.hp -= armouredDamage(cur.kind, dmg, true);
      world.cue('coil-zap');
      const to = { x: cur.x, y: cur.y };
      world.arcs.push({ pts: zigzag(from, to, e.id * 7 + i + world.anim), ttl: 0.24, life: 0.24 });
      addFx(world, 'fx-burst', to.x, to.y, 1.1 - i * 0.12, 0.2, { grow: true, rot: i * 1.7 });
      addFx(world, 'fx-sparks-blue', to.x, to.y, 0.85, 0.32, { grow: true, rot: i * 2.3 });
      // hop on to the closest enemy that has not been hit yet
      let next: Enemy | undefined, nd = COIL_JUMP_RANGE * COIL_JUMP_RANGE;
      for (const en of world.enemies) {
        if (hit.has(en.id)) continue;
        const d = (en.x - cur.x) ** 2 + (en.y - cur.y) ** 2;
        if (d < nd) { next = en; nd = d; }
      }
      if (!next) break;
      hit.add(next.id);
      from = to; cur = next; dmg *= COIL_FALLOFF;
    }
  }
}

/** Fabricators pull plates from adjacent belts and, when they have enough, roll a new soldier out of the bottom. */
function stepFabs(world: World, dt: number): void {
  for (const e of world.entities.values()) {
    if (e.kind !== 'robotfab') continue;
    e.pull -= dt;
    if (e.pull <= 0) { e.pull = PULL_INTERVAL; pullFromBelts(world, e); }
    if (!robotUnlocked(world, e.type)) { e.type = ROBOT_ORDER.find((t) => robotUnlocked(world, t)) ?? 'scout'; e.progress = 0; } // an old save may name a robot that is not researched yet
    const def = ROBOTS[e.type];
    if (e.stock < def.cost || world.soldiers.length >= MAX_SOLDIERS) continue;
    if (fabRoomUsed(world, e.id) + ROBOT_SPACE[e.type] > FAB_CAPACITY) continue; // no room left for this robot: it waits until one is lost
    e.progress += dt;
    if (e.progress >= def.buildTime * (isBigRobot(e.type) ? world.mods.bigBuildTime : world.mods.smallBuildTime)) {
      e.progress = 0;
      e.stock -= def.cost;
      world.soldiers.push({
        id: world.nextSoldierId++, type: e.type, x: e.x + e.w / 2, y: e.y + e.h + 0.6, hp: def.hp * world.mods.robotHp * world.rfx.robotHp, maxHp: def.hp * world.mods.robotHp * world.rfx.robotHp, cool: 0, face: 1, fab: e.id,
      });
    }
  }
}

let radiusCache = { ver: -1, r: 6 };
/** How far the base reaches from the core: the robots stand guard just outside it, not inside it. */
function baseRadius(world: World, cx: number, cy: number): number {
  if (radiusCache.ver === world.layoutVersion) return radiusCache.r;
  let r = 5;
  for (const e of world.entities.values()) {
    if (e.kind === 'belt' || e.kind === 'inserter' || e.kind === 'junction' || e.kind === 'splitter') continue;
    r = Math.max(r, Math.hypot(e.x + e.w / 2 - cx, e.y + e.h / 2 - cy) + Math.max(e.w, e.h) / 2);
  }
  radiusCache = { ver: world.layoutVersion, r: Math.min(18, r) };
  return radiusCache.r;
}

/** Each robot has its own guard post on a free tile just outside the base, spread evenly round it. */
function guardPost(world: World, s: Soldier, cx: number, cy: number): { x: number; y: number } {
  if (s.post && s.post.ver === world.layoutVersion) return s.post;
  const a = s.id * 2.399963, r = baseRadius(world, cx, cy) + 1.5 + (s.id % 3) * 1.1;
  const want = { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
  const spot = freeSpot(world, want.x, want.y, 5) ?? want;
  s.post = { x: spot.x, y: spot.y, ver: world.layoutVersion };
  return s.post;
}

/** Robots push gently apart so they do not pile up on one spot. */
function separateSoldiers(world: World, dt: number): void {
  const list = world.soldiers;
  const ease = Math.min(1, dt * 7);
  for (let i = 0; i < list.length; i++) {
    const a = list[i], ra = 0.3 * ROBOTS[a.type].scale + 0.12;
    for (let j = i + 1; j < list.length; j++) {
      const b = list[j], rb = 0.3 * ROBOTS[b.type].scale + 0.12;
      let dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.hypot(dx, dy), min = ra + rb;
      if (d >= min) continue;
      if (d < 1e-4) { const t = (a.id * 7 + b.id) * 1.3; dx = Math.cos(t); dy = Math.sin(t); } else { dx /= d; dy /= d; }
      const push = (min - Math.max(d, 1e-4)) * 0.5 * ease;
      for (const [u, sign] of [[a, -1], [b, 1]] as [Soldier, number][]) {
        const nx = u.x + dx * push * sign, ny = u.y + dy * push * sign;
        if (!ROBOTS[u.type].flying && solidAt(world, Math.floor(nx), Math.floor(ny)) && !solidAt(world, Math.floor(u.x), Math.floor(u.y))) continue; // never shove a walker into a wall
        u.x = nx; u.y = ny;
      }
    }
  }
}

/** A robot that has been trying to move without getting anywhere re-plans, and if that does not help it is lifted onto the nearest free tile. */
function checkStuck(world: World, s: Soldier, wantsToMove: boolean, dt: number): void {
  s.chkT = (s.chkT ?? 0) + dt;
  if (s.chkT < 1) return;
  const moved = Math.hypot(s.x - (s.chkX ?? s.x), s.y - (s.chkY ?? s.y));
  s.chkT = 0; s.chkX = s.x; s.chkY = s.y;
  if (!wantsToMove || moved > 0.25) { s.stuck = 0; return; }
  s.stuck = (s.stuck ?? 0) + 1;
  s.path = undefined; s.pathT = 0;                 // work out a fresh route
  if (s.stuck >= 3) {                              // still going nowhere: get out of the jam
    const spot = escapeSpot(world, s.x, s.y) ?? freeSpot(world, s.x, s.y, 6, 2); // walled in: out to the ground outside; else at least two tiles away
    if (spot) { s.x = spot.x; s.y = spot.y; }
    s.post = undefined; s.stuck = 0;
  }
}

function stepSoldiers(world: World, dt: number): void {
  const core = world.core;
  const cx = core ? core.x + core.w / 2 : world.w / 2, cy = core ? core.y + core.h / 2 : world.h / 2;
  for (const s of world.soldiers) {
    const def = ROBOTS[s.type];
    s.cool = Math.max(0, s.cool - dt);
    const home = s.fab !== undefined ? world.entities.get(s.fab) : undefined; // its creator, else the core
    const hx = home ? home.x + home.w / 2 : cx, hy = home ? home.y + home.h / 2 : cy;
    const target = nearestEnemy(world, s.x, s.y, SOLDIER_SELF_DEFENCE) ?? nearestEnemyNear(world, s.x, s.y, SOLDIER_AGGRO, hx, hy, SOLDIER_LEASH) ?? nearestEnemyNear(world, s.x, s.y, SOLDIER_RALLY, hx, hy, SOLDIER_LEASH); // an attack anywhere in the base brings every robot, but never far beyond it
    let tx: number, ty: number, speed = def.speed * world.mods.robotSpeed;
    let chasing = false; // wants to reach an enemy that is out of range
    if (target) {
      const d = Math.hypot(target.x - s.x, target.y - s.y);
      s.face = target.x >= s.x ? 1 : -1;
      if (d <= def.range * world.rfx.robotRange) {
        tx = s.x; ty = s.y; // in range: hold position and shoot
        if (s.cool <= 0) {
          s.cool = def.cooldown;
          target.hp -= armouredDamage(target.kind, def.dps * world.mods.robotDps * world.rfx.robotDps * def.cooldown);
          world.cue('robot-shot');
          world.shots.push({ x1: s.x, y1: s.y - 0.4, x2: target.x, y2: target.y, ttl: SHOT_LIFE });
          addFx(world, 'fx-spark', target.x, target.y, 0.4, 0.12, { rot: s.id + world.time, grow: false });
        }
      } else { tx = target.x; ty = target.y; chasing = true; }
    } else {
      // nothing to fight: go to this robot's guard post just outside the base and stand there
      const post = guardPost(world, s, cx, cy);
      tx = post.x; ty = post.y;
      speed *= 0.8;
    }
    let dx = tx - s.x, dy = ty - s.y, d = Math.hypot(dx, dy);
    s.moving = d > 0.15;
    s.lean = 0;
    if (s.moving && !def.flying) { // ground robots walk round buildings rather than over them
      const v = walkGround(world, s, tx, ty, speed, dt, false, def.scale >= 2.2); // the Titan keeps a tile clear of rocks, trees and buildings when there is room
      if (v && Math.hypot(v.x, v.y) > 1e-6) { dx = v.x; dy = v.y; d = Math.hypot(dx, dy); s.lean = dx / d; if (!target && Math.abs(dx) > 0.05) s.face = dx >= 0 ? 1 : -1; } else s.moving = false;
    }
    // turn to face the enemy being shot at, otherwise the way we are walking; ease round instead of snapping
    if (!def.flying) checkStuck(world, s, s.moving || chasing || (d > 0.6 && !target), dt);
    // on guard, it faces outward, away from the core
    const want = target ? Math.atan2(target.y - s.y, target.x - s.x) : s.moving ? Math.atan2(dy, dx) : Math.atan2(s.y - cy, s.x - cx);
    const cur = s.angle ?? want;
    const diff = Math.atan2(Math.sin(want - cur), Math.cos(want - cur));
    s.angle = cur + diff * Math.min(1, dt * (def.flying ? 9 : 5 / (0.5 + def.scale * 0.35)));
    if (s.moving && def.flying) {
      const step = Math.min(d, speed * dt);
      s.x += (dx / d) * step; s.y += (dy / d) * step;
      s.lean = dx / d;
      if (!target && Math.abs(dx) > 0.05) s.face = dx >= 0 ? 1 : -1;
    }
  }
  separateSoldiers(world, dt);
}

/**
 * Runs between fights (build phase, level won): the factory and turrets stay paused, but bullets, explosions and smoke
 * finish playing out and your robots wander back to their positions round the core.
 */
export function stepAmbient(world: World, dt: number): void {
  resetPathBudget();
  stepSoldiers(world, dt);
  ambientTimer -= dt;
  const puff = ambientTimer <= 0;
  if (puff) ambientTimer = 1.1;
  for (const e of world.entities.values()) {
    if (e.kind === 'turret' && !nearestEnemy(world, e.x + 1, e.y + 1, TURRET_RANGE)) e.aim += dt * (e.id % 2 ? 0.45 : -0.45); // slow scanning sweep
    if (puff && e.kind === 'furnace') {
      addFx(world, 'fx-smoke-wisp', e.x + 1 + (Math.random() - 0.5) * 0.5, e.y + 0.2, 1.5, 2.6, { add: false, grow: true, opacity: 0.5, rot: Math.random() * 6 });
    }
    if (puff && e.kind === 'core' && Math.random() < 0.6) {
      addFx(world, 'fx-spark', e.x + 0.4 + Math.random() * 2.2, e.y + 0.4 + Math.random() * 2.2, 0.35, 0.5, { grow: false, opacity: 0.7, rot: Math.random() * 6 });
    }
  }
  for (const s of world.shots) s.ttl -= dt;
  world.shots = world.shots.filter((s) => s.ttl > 0);
  for (const f of world.fx) f.age += dt;
  world.fx = world.fx.filter((f) => f.age < f.dur);
  for (const a of world.arcs) a.ttl -= dt;
  world.arcs = world.arcs.filter((a) => a.ttl > 0);
  updatePower(world); // keeps the on-screen power readout right while building
}

/** Moves an enemy one step. Flyers go straight; ground enemies go round rocks and buildings. True if it made progress. */
function moveEnemy(world: World, en: Enemy, tx: number, ty: number, dt: number): boolean {
  if (en.kind && ENEMIES[en.kind].flying) {
    const dx = tx - en.x, dy = ty - en.y, d = Math.hypot(dx, dy);
    if (d < 1e-6) return false;
    const k = Math.min(d, en.speed * dt) / d;
    en.x += dx * k; en.y += dy * k;
    return true;
  }
  const def = en.kind ? ENEMIES[en.kind] : undefined;
  const v = flowWalk(world, en, tx, ty, en.speed, dt, variantFor(en.kind, def?.scale ?? 1)); // straight at it when it can see it, else along the shared flow field
  if (v) return Math.hypot(v.x, v.y) > 1e-6;
  if (reachable(world, variantFor(en.kind, def?.scale ?? 1), en.x, en.y)) return false; // on the field but blocked by a building: the caller attacks it
  const w2 = walkGround(world, en, tx, ty, en.speed, dt, en.kind === 'brute-3'); // not on the field (no core, or boxed in): the old route search
  return !!w2 && Math.hypot(w2.x, w2.y) > 1e-6;
}

/** Light crowding steering: ground enemies that overlap push each other apart, so a wave spreads out instead of stacking on one tile. */
function separateEnemies(world: World, dt: number): void {
  const list = world.enemies;
  if (list.length < 2 || list.length > 220) return;
  const R = 0.55;
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    if (a.kind && (ENEMIES[a.kind].flying || ENEMIES[a.kind].boss)) continue;
    for (let j = i + 1; j < list.length; j++) {
      const b = list[j];
      if (Math.abs(a.x - b.x) > R || Math.abs(a.y - b.y) > R) continue;
      if (b.kind && (ENEMIES[b.kind].flying || ENEMIES[b.kind].boss)) continue;
      let dx = a.x - b.x, dy = a.y - b.y, d = Math.hypot(dx, dy);
      if (d >= R) continue;
      if (d < 1e-4) { dx = Math.cos(a.id); dy = Math.sin(a.id); d = 1; } // exactly on top of each other: split in an arbitrary direction
      const push = ((R - d) / R) * 1.4 * dt, ux = (dx / d) * push, uy = (dy / d) * push;
      if (!solidAt(world, Math.floor(a.x + ux), Math.floor(a.y + uy), a.kind === 'brute-3')) { a.x += ux; a.y += uy; }
      if (!solidAt(world, Math.floor(b.x - ux), Math.floor(b.y - uy), b.kind === 'brute-3')) { b.x -= ux; b.y -= uy; }
    }
  }
}

/** A ground enemy that cannot get any closer chews on the building in its way. */
function smashBlocker(world: World, en: Enemy, dt: number): void {
  let best: Entity | undefined, bestD = 1.7;
  for (const e of world.entities.values()) {
    if (e.kind === 'core' || e.kind === 'belt' || e.kind === 'inserter' || e.kind === 'junction' || e.kind === 'splitter') continue;
    const dx = Math.max(e.x - en.x, 0, en.x - (e.x + e.w)), dy = Math.max(e.y - en.y, 0, en.y - (e.y + e.h));
    const d = Math.hypot(dx, dy);
    if (d < bestD) { best = e; bestD = d; }
  }
  if (!best) return;
  best.hp -= en.dmg * STRUCTURE_DAMAGE * dt;
  world.cue('structure-hit'); world.markHurt(best.x + best.w / 2, best.y + best.h / 2);
  if (best.hp <= 0) destroyStructure(world, best);
}

const RANGED_INTERVAL = 1.4; // seconds between a ranged enemy's shots; the damage per shot keeps its damage per second the same as a melee enemy's

/**
 * A ranged enemy picks the nearest thing it can shoot (a robot, turret, wall or coil within its range), else walks towards
 * its usual target until something is in range. It stands and fires rather than closing in. Returns true if it handled the enemy.
 */
function rangedStep(world: World, en: Enemy, dt: number, cx: number, cy: number): boolean {
  const def = en.kind ? ENEMIES[en.kind] : undefined;
  if (!def?.range || def.boss) return false;
  en.abil = Math.max(0, (en.abil ?? 0) - dt);
  let best: { x: number; y: number; hit: (d: number) => void } | undefined, bd = def.range;
  for (const s of world.soldiers) { // robots first: the ones on the front line are the ones in reach
    const d = Math.hypot(s.x - en.x, s.y - en.y);
    if (d < bd) { bd = d; best = { x: s.x, y: s.y, hit: (dmg) => { s.hp -= dmg; world.markHurt(s.x, s.y); } }; }
  }
  for (const e of world.entities.values()) {
    if (e.kind !== 'turret' && e.kind !== 'wall' && e.kind !== 'coil' && e.kind !== 'pole' && e.kind !== 'generator') continue;
    const d = Math.hypot(e.x + e.w / 2 - en.x, e.y + e.h / 2 - en.y) - Math.max(e.w, e.h) / 2 + (e.kind === 'pole' || e.kind === 'generator' ? 4 : 0);
    if (d < bd) { bd = d; best = { x: e.x + e.w / 2, y: e.y + e.h / 2, hit: (dmg) => { e.hp -= dmg * STRUCTURE_DAMAGE; world.markHurt(e.x + e.w / 2, e.y + e.h / 2); if (e.hp <= 0) destroyStructure(world, e); } }; }
  }
  const core = world.core;
  if (core) {
    const d = Math.hypot(cx - en.x, cy - en.y) - 1.5;
    if (d < bd) { bd = d; best = { x: cx, y: cy, hit: (dmg) => { core.hp = Math.max(0, core.hp - dmg); world.cue('core-hit'); world.markHurt(core.x + core.w / 2, core.y + core.h / 2); } }; }
  }
  if (!best) { // nothing in range yet: keep walking on the usual target (the nearest turret or wall, else the core)
    const t = pickStructure(world, en);
    const tx = t ? t.x + t.w / 2 : cx, ty = t ? t.y + t.h / 2 : cy;
    if (!moveEnemy(world, en, tx, ty, dt)) smashBlocker(world, en, dt);
    return true;
  }
  if (en.abil <= 0) {
    en.abil = RANGED_INTERVAL;
    best.hit(en.dmg * RANGED_INTERVAL);
    world.shots.push({ x1: en.x, y1: en.y, x2: best.x, y2: best.y, ttl: 0.4, life: 0.4, kind: def.shot ?? 'acid' });
    addFx(world, 'fx-spark', best.x, best.y, 0.5, 0.15, { rot: en.id, grow: false });
  }
  return true; // it stands its ground while it shoots
}

export function stepCombat(world: World, dt: number): void {
  resetPathBudget();
  updatePower(world); // generators burn during fights (see World.step), so supply and demand are read fresh each step
  stepTurrets(world, dt);
  stepCoils(world, dt);
  stepFabs(world, dt);
  stepSoldiers(world, dt);

  separateEnemies(world, dt);
  const before = world.enemies.length;
  for (const en of world.enemies) if (en.hp <= 0) deathFx(world, en);
  world.enemies = world.enemies.filter((en) => en.hp > 0);
  const killed = before - world.enemies.length;
  world.kills += killed;
  if (killed > 0 && !world.freeBuild) addStock(world, KILL_REWARD, killed * (1 + world.bounty));

  // enemies march on the core. Gentle rules: they stop for a ground robot in their way, and otherwise
  // go after turrets and walls first (then other machines that are right beside them), before the core.
  const core = world.core;
  if (core) {
    const cx = core.x + core.w / 2, cy = core.y + core.h / 2;
    for (const en of world.enemies) {
      if (rangedStep(world, en, dt, cx, cy)) continue;
      let victim: (typeof world.soldiers)[number] | undefined;
      let vd = MELEE_REACH;
      for (const s of world.soldiers) {
        if (ROBOTS[s.type].flying) continue;
        const d = Math.hypot(s.x - en.x, s.y - en.y);
        if (d < vd) { victim = s; vd = d; }
      }
      if (victim) { victim.hp -= en.dmg * dt; world.markHurt(victim.x, victim.y); continue; }

      if (en.kind === 'boss-queen' && Math.hypot(cx - en.x, cy - en.y) <= QUEEN_HOLD) continue; // parks and lets her brood do the work
      if (en.kind === 'boss-colossus') {
        en.abil = Math.max(0, (en.abil ?? 1) - dt);
        const t = colossusTarget(world, en);
        if (t) {
          const d = Math.hypot(t.x - en.x, t.y - en.y);
          if (d > COLOSSUS_REACH) moveEnemy(world, en, t.x, t.y, dt);
          if (en.abil <= 0) {
            en.abil = COLOSSUS_RELOAD;
            t.hit(en.dmg * 2.5);
            world.shots.push({ x1: en.x, y1: en.y, x2: t.x, y2: t.y, ttl: SHOT_LIFE * 2 });
            addFx(world, 'fx-explosion-small', t.x, t.y, 2.2, 0.45);
            addFx(world, 'fx-muzzle-flash', en.x, en.y, 2.4, 0.15, { grow: false });
          }
          continue;
        }
      }
      const brute = en.kind === 'brute-3';
      const target = brute ? pickBlocking(world, en) : pickStructure(world, en);
      if (target) {
        const tx = target.x + target.w / 2, ty = target.y + target.h / 2;
        const d = Math.hypot(tx - en.x, ty - en.y);
        const reach = Math.max(target.w, target.h) / 2 + 0.9;
        if (d > reach) {
          if (!moveEnemy(world, en, tx, ty, dt)) smashBlocker(world, en, dt);
        } else {
          target.hp -= en.dmg * STRUCTURE_DAMAGE * (brute ? BRUTE_SMASH : 1) * dt;
          world.cue('structure-hit'); world.markHurt(target.x + target.w / 2, target.y + target.h / 2);
          if (target.hp <= 0) destroyStructure(world, target);
        }
        continue;
      }
      const dx = cx - en.x, dy = cy - en.y;
      const d = Math.hypot(dx, dy);
      if (d > ATTACK_REACH) {
        if (!moveEnemy(world, en, cx, cy, dt)) smashBlocker(world, en, dt);
      } else {
        core.hp = Math.max(0, core.hp - en.dmg * dt);
        world.cue('core-hit'); world.markHurt(cx, cy);
      }
    }
  }
  world.soldiers = world.soldiers.filter((s) => s.hp > 0);

  for (const s of world.shots) s.ttl -= dt;
  world.shots = world.shots.filter((s) => s.ttl > 0);
  for (const f of world.fx) f.age += dt;
  world.fx = world.fx.filter((f) => f.age < f.dur);
  for (const a of world.arcs) a.ttl -= dt;
  world.arcs = world.arcs.filter((a) => a.ttl > 0);
}

