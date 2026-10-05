// The player's robot soldiers: built in a Robot Fabricator from iron plates, they defend the base on their own.

export type RobotType = 'drone-1' | 'drone-2' | 'scout' | 'trooper' | 'heavy' | 'quad' | 'artillery' | 'titan';

export interface RobotDef {
  name: string;
  /** iron plates to build one */
  cost: number;
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
}

/** How much of a fabricator's room each robot takes up. A fabricator has FAB_CAPACITY, so it can field twelve small scouts, or one Titan. */
export const ROBOT_SPACE: Record<RobotType, number> = { 'drone-1': 1, scout: 1, 'drone-2': 2, trooper: 2, heavy: 4, quad: 6, artillery: 6, titan: 12 };
export const FAB_CAPACITY = 12;

export const ROBOT_ORDER: RobotType[] = ['drone-1', 'drone-2', 'scout', 'trooper', 'heavy', 'quad', 'artillery', 'titan'];

export const ROBOTS: Record<RobotType, RobotDef> = {
  'drone-1': { name: 'Scout drone', cost: 3, buildTime: 6, hp: 18, speed: 3.0, range: 4.5, dps: 6, cooldown: 0.5, scale: 0.85, flying: true },
  'drone-2': { name: 'Gunship drone', cost: 6, buildTime: 9, hp: 30, speed: 2.8, range: 5, dps: 14, cooldown: 0.4, scale: 1.2, flying: true },
  scout: { name: 'Scout walker', cost: 6, buildTime: 9, hp: 55, speed: 2.4, range: 4, dps: 10, cooldown: 0.45, scale: 1.25, flying: false },
  trooper: { name: 'Trooper', cost: 8, buildTime: 12, hp: 75, speed: 1.9, range: 5.5, dps: 16, cooldown: 0.5, scale: 1.4, flying: false },
  heavy: { name: 'Heavy walker', cost: 16, buildTime: 18, hp: 190, speed: 1.4, range: 5, dps: 34, cooldown: 0.45, scale: 1.75, flying: false },
  quad: { name: 'Turret walker', cost: 20, buildTime: 20, hp: 240, speed: 1.3, range: 6.5, dps: 40, cooldown: 0.6, scale: 1.85, flying: false },
  artillery: { name: 'Mobile artillery', cost: 24, buildTime: 24, hp: 130, speed: 1.1, range: 10, dps: 22, cooldown: 1.4, scale: 1.75, flying: false },
  titan: { name: 'Titan', cost: 50, buildTime: 40, hp: 720, speed: 1.0, range: 6, dps: 110, cooldown: 0.4, scale: 3.0, flying: false },
};

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
  /** the fabricator that built it: its robots share that fabricator's room */
  fab?: number;
  /** stuck detection: where it was a moment ago, and how many checks in a row it made no headway */
  chkT?: number; chkX?: number; chkY?: number; stuck?: number;
}
