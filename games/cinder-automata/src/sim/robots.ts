// The player's robot soldiers. Four kinds of building make them, each from plates: the Drone Workshop (copper + iron), the Gunship Hangar
// (+ tin), the Walker Foundry (+ lead) and the Heavy Works (+ tin and lead). Each building holds FAB_CAPACITY space of robots at once.
import type { ItemId } from './items';

export type RobotType = 'drone-1' | 'drone-2' | 'scout' | 'trooper' | 'heavy' | 'quad' | 'artillery' | 'titan' | 'bomber' | 'carrier' | 'interceptor';

export type Plates = Partial<Record<ItemId, number>>;

export interface RobotDef {
  name: string;
  /** plates to build one */
  cost: Plates;
  /** seconds to build one while a fight is on */
  buildTime: number;
  hp: number;
  /** tiles per second */
  speed: number;
  /** tiles */
  range: number;
  /** damage per second while shooting */
  dps: number;
  /** seconds between shots */
  cooldown: number;
  /** drawn size in tiles */
  scale: number;
  /** flyers can't be reached by melee crawlers */
  flying: boolean;
  /** a bomber: it flies over a ground enemy and drops bombs that burst over a small area; it cannot hit flyers */
  bomb?: { radius: number };
  /** a carrier: it keeps up to `max` of its own small drones, launching a new one every `every` seconds */
  carries?: { drone: RobotType; max: number; every: number };
  /** a tank: ground enemies within this many tiles are drawn to it, and ranged ones favour it as a target */
  taunt?: number;
  /** health it mends by itself, as a share of its maximum each second */
  regen?: number;
  /** its shots burst over this radius, hurting everything near the target */
  splash?: number;
  /** a second weapon with its own reload (the Titan's cannon); `dps` and `cooldown` above are its fast guns */
  alt?: { dps: number; cooldown: number };
  /** damage multiplier against flying enemies */
  airBonus?: number;
}

/** The buildings that make robots, and what each makes. 'robotfab' is the Drone Workshop (it used to make every robot). */
export type FabKind = 'robotfab' | 'hangar' | 'foundry' | 'heavyworks';
export const FAB_KINDS: FabKind[] = ['robotfab', 'hangar', 'foundry', 'heavyworks'];
export const FAB_ROBOTS: Record<FabKind, RobotType[]> = {
  robotfab: ['drone-1', 'scout'],
  hangar: ['drone-2', 'bomber', 'interceptor'],
  foundry: ['trooper', 'heavy', 'quad'],
  heavyworks: ['artillery', 'titan', 'carrier'],
};
export const fabOf = (t: RobotType): FabKind => FAB_KINDS.find((k) => FAB_ROBOTS[k].includes(t)) ?? 'robotfab';

/** How much of a building's room each robot takes up. A building has FAB_CAPACITY: twelve scouts, or four Heavy walkers, or two Artillery, or one Titan or Carrier. */
export const ROBOT_SPACE: Record<RobotType, number> = { 'drone-1': 1, scout: 1, 'drone-2': 2, trooper: 2, bomber: 4, heavy: 3, interceptor: 2, quad: 6, artillery: 6, titan: 12, carrier: 12 };
export const FAB_CAPACITY = 12;

export const ROBOT_ORDER: RobotType[] = ['drone-1', 'scout', 'drone-2', 'bomber', 'interceptor', 'trooper', 'quad', 'heavy', 'artillery', 'titan', 'carrier'];

const I = 'iron-plate', C = 'copper-plate', T = 'tin-plate', L = 'lead-plate';
export const ROBOTS: Record<RobotType, RobotDef> = {
  'drone-1': { name: 'Scout drone', cost: { [I]: 2, [C]: 1 }, buildTime: 6, hp: 18, speed: 3.0, range: 4.5, dps: 6, cooldown: 0.5, scale: 0.85, flying: true },
  scout: { name: 'Scout walker', cost: { [I]: 4, [C]: 2 }, buildTime: 9, hp: 55, speed: 2.4, range: 4, dps: 10, cooldown: 0.45, scale: 1.25, flying: false },
  'drone-2': { name: 'Gunship drone', cost: { [I]: 4, [C]: 2, [T]: 2 }, buildTime: 9, hp: 30, speed: 2.8, range: 5, dps: 14, cooldown: 0.4, scale: 1.2, flying: true },
  bomber: { name: 'Sapper drone', cost: { [I]: 6, [C]: 3, [T]: 3 }, buildTime: 12, hp: 40, speed: 2.4, range: 0.9, dps: 40, cooldown: 1.3, scale: 1.45, flying: true, bomb: { radius: 2.1 } },
  interceptor: { name: 'Interceptor', cost: { [I]: 5, [C]: 2, [T]: 3 }, buildTime: 10, hp: 26, speed: 4.4, range: 4.5, dps: 12, cooldown: 0.3, scale: 1.25, flying: true, airBonus: 2.5 },
  trooper: { name: 'Trooper', cost: { [I]: 5, [C]: 2, [L]: 2 }, buildTime: 12, hp: 75, speed: 1.9, range: 5.5, dps: 16, cooldown: 0.5, scale: 1.4, flying: false },
  quad: { name: 'Turret walker', cost: { [I]: 12, [C]: 5, [L]: 5 }, buildTime: 20, hp: 150, speed: 1.0, range: 7.5, dps: 52, cooldown: 0.8, scale: 1.85, flying: false },
  heavy: { name: 'Heavy walker', cost: { [I]: 10, [C]: 4, [L]: 6 }, buildTime: 18, hp: 420, speed: 1.2, range: 4, dps: 12, cooldown: 0.45, scale: 1.75, flying: false, taunt: 7, regen: 0.02 },
  artillery: { name: 'Mobile artillery', cost: { [I]: 14, [C]: 6, [T]: 4, [L]: 4 }, buildTime: 24, hp: 110, speed: 1.1, range: 10, dps: 40, cooldown: 3.0, scale: 1.75, flying: false, splash: 2.2 },
  titan: { name: 'Titan', cost: { [I]: 28, [C]: 10, [T]: 8, [L]: 8 }, buildTime: 40, hp: 720, speed: 1.0, range: 6, dps: 100, cooldown: 0.2, scale: 3.0, flying: false, alt: { dps: 100, cooldown: 2.5 } },
  carrier: { name: 'Carrier', cost: { [I]: 30, [C]: 12, [T]: 10, [L]: 8 }, buildTime: 45, hp: 900, speed: 1.5, range: 6, dps: 0, cooldown: 0.5, scale: 3.4, flying: true, carries: { drone: 'drone-1', max: 5, every: 7 } },
};

/** "2 iron + 1 copper": a robot's price in words. */
export const plateText = (p: Plates): string => Object.entries(p).map(([k, n]) => `${n} ${k.replace('-plate', '')}`).join(' + ');

export interface Soldier {
  id: number; type: RobotType; x: number; y: number; hp: number; maxHp: number; cool: number;
  /** 1 = facing right, -1 = facing left (the art faces the camera and is mirrored) */
  face: 1 | -1;
  /** set by the simulation each step; drawing uses it to walk, sway and lean only while actually moving */
  moving?: boolean;
  /** sideways speed component, -1..1, so the sprite leans into the direction of travel */
  lean?: number;
  /** heading in radians (0 = facing right); top-down robots rotate to this, easing round rather than snapping */
  angle?: number;
  /** ground units: the route round buildings to where they are going (world points), and when it was made */
  path?: { x: number; y: number }[];
  pathT?: number;
  pathVer?: number;
  /** where this robot stands guard when there is nothing to fight (chosen round the edge of the base) */
  post?: { x: number; y: number; ver: number };
  /** the building that made it: its robots share that building's room */
  fab?: number;
  /** a drone launched by a Carrier: the Carrier's id (these do not use any building's room, and are lost if the Carrier is) */
  carrier?: number;
  /** a Carrier: seconds until it launches its next drone */
  launchT?: number;
  /** the Titan's cannon reload */
  cool2?: number;

  /** stuck detection: where it was a moment ago, and how many checks in a row it made no headway */
  chkT?: number; chkX?: number; chkY?: number; stuck?: number;
}
