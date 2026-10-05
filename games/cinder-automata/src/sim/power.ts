// The power network. Poles link to nearby poles (wire reach) and supply anything inside their supply area.
// Each connected group of poles is one network: its generators add supply, its coils add demand, and everything on
// it gets the same satisfaction (supply / demand, at most 1). Coils fire weaker when a network is short.
import type { Entity, World } from './world';

export const POLE_REACH = 7.5; // tiles between two poles that will connect
export const POLE_SUPPLY = 3.5; // tiles from a pole that machines are still powered
export const GEN_OUTPUT = 100;
/** A Storm coil stores energy: it charges up to COIL_CHARGE_MAX at up to COIL_USE_CHARGING power, spends COIL_SHOT_COST per bolt, and sips almost nothing once full. */
export const COIL_CHARGE_MAX = 200;
export const COIL_SHOT_COST = 50;
export const COIL_USE_CHARGING = 60; // power a charging coil asks for
export const COIL_CHARGE_RATE = 20; // charge it actually gains per second at full power: a bolt costs 50, so about one every 2.5 seconds once the stored 200 (four bolts) is spent
export const COIL_USE_FULL = 2;

export interface PowerInfo {
  version: number;
  /** entity id -> network number, for everything that is wired to a pole */
  netOf: Map<number, number>;
  /** poles joined by a wire, for drawing */
  links: [Entity, Entity][];
  /** network number -> satisfaction (0..1) */
  sat: Map<number, number>;
  supply: number;
  demand: number;
}

const centre = (e: Entity) => ({ x: e.x + e.w / 2, y: e.y + e.h / 2 });

/** Distance from a point to the nearest edge of a building's footprint (0 when inside it). */
function distToRect(px: number, py: number, e: Entity): number {
  const dx = Math.max(e.x - px, 0, px - (e.x + e.w));
  const dy = Math.max(e.y - py, 0, py - (e.y + e.h));
  return Math.hypot(dx, dy);
}

let cache: { world: World; version: number; netOf: Map<number, number>; links: [Entity, Entity][]; nets: number } | undefined;

/** Works out which poles connect and which machines each pole feeds. Only redone when buildings are added or removed. */
function topology(world: World) {
  if (cache && cache.world === world && cache.version === world.layoutVersion) return cache;
  const poles = [...world.entities.values()].filter((e) => e.kind === 'pole');
  const parent = poles.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const links: [Entity, Entity][] = [];
  for (let i = 0; i < poles.length; i++) {
    for (let j = i + 1; j < poles.length; j++) {
      const a = centre(poles[i]), b = centre(poles[j]);
      if (Math.hypot(a.x - b.x, a.y - b.y) <= POLE_REACH) { parent[find(i)] = find(j); links.push([poles[i], poles[j]]); }
    }
  }
  const netIds = new Map<number, number>();
  poles.forEach((_, i) => { const r = find(i); if (!netIds.has(r)) netIds.set(r, netIds.size); });
  const netOf = new Map<number, number>();
  poles.forEach((p, i) => netOf.set(p.id, netIds.get(find(i))!));
  for (const e of world.entities.values()) {
    if (e.kind !== 'generator' && e.kind !== 'coil') continue;
    let best = -1, bestD = POLE_SUPPLY;
    poles.forEach((p, i) => { const c = centre(p); const d = distToRect(c.x, c.y, e); if (d <= bestD) { best = i; bestD = d; } });
    if (best >= 0) netOf.set(e.id, netIds.get(find(best))!);
  }
  cache = { world, version: world.layoutVersion, netOf, links, nets: netIds.size };
  return cache;
}

/** Recomputes every network's supply, demand and satisfaction. Cheap enough to run every step. */
export function updatePower(world: World): PowerInfo {
  const t = topology(world);
  const supplyBy = new Map<number, number>(), demandBy = new Map<number, number>();
  let supply = 0, demand = 0;
  for (const e of world.entities.values()) {
    const net = t.netOf.get(e.id);
    if (net === undefined) continue;
    if (e.kind === 'generator' && e.fuelSecs > 0) { supplyBy.set(net, (supplyBy.get(net) ?? 0) + GEN_OUTPUT); supply += GEN_OUTPUT; }
    if (e.kind === 'coil') { demandBy.set(net, (demandBy.get(net) ?? 0) + e.use); demand += e.use; }
  }
  const sat = new Map<number, number>();
  for (let n = 0; n < t.nets; n++) {
    const d = demandBy.get(n) ?? 0, s = supplyBy.get(n) ?? 0;
    sat.set(n, d <= 0 ? (s > 0 ? 1 : 0) : Math.min(1, s / d));
  }
  const info: PowerInfo = { version: world.layoutVersion, netOf: t.netOf, links: t.links, sat, supply, demand };
  world.power = info;
  return info;
}

/** How well powered a machine is right now: 0 if it is not wired to a pole or its network has no fuel burning. */
export function satisfaction(world: World, e: Entity): number {
  const p = world.power ?? updatePower(world);
  const net = p.netOf.get(e.id);
  return net === undefined ? 0 : (p.sat.get(net) ?? 0);
}
