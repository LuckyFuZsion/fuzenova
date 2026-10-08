// Commanders: each run starts by choosing one. A commander is a set of multipliers with a bonus and a drawback.
// The simulation reads them from world.mods; everything defaults to 1 (no change).
import type { RobotType } from './robots';

export interface Mods {
  /** damage per turret shot */
  turretDmg: number;
  /** how much ammo a turret can hold */
  turretAmmo: number;
  /** health of turrets and walls */
  defenceHp: number;
  /** robot health, damage, walking speed */
  robotHp: number;
  robotDps: number;
  robotSpeed: number;
  /** robot build time: small (drones, scouts, troopers) and big (heavy, turret walker, artillery, Titan) */
  smallBuildTime: number;
  bigBuildTime: number;
  /** Storm coil damage, extra chain jumps, and power demand */
  coilDmg: number;
  coilJumps: number;
  coilPower: number;
  /** starting plates, and how many resource modules are offered after a level */
  startStock: number;
  moduleChoices: number;
  /** health of the Core (Workshop upgrades) */
  coreHp: number;
  /** artillery, launchers and plasma: burst radius and damage */
  blastMul: number;
  blastDmg: number;
  /** flame and plasma damage (and how hard they burn) */
  fireDmg: number;
  /** talents: share of a shot's damage dealt around the target (0 = none), chance to stun, slow strength (0-1) from turret hits and from coil bolts, extra plates per kill, turret reach */
  splash: number;
  stunChance: number;
  slowHit: number;
  coilSlow: number;
  killBonus: number;
  turretRange: number;
}

export const DEFAULT_MODS: Mods = {
  turretDmg: 1, turretAmmo: 1, defenceHp: 1, robotHp: 1, robotDps: 1, robotSpeed: 1, smallBuildTime: 1, bigBuildTime: 1,
  coilDmg: 1, coilJumps: 0, coilPower: 1, startStock: 1, moduleChoices: 3, coreHp: 1, blastMul: 1, blastDmg: 1, fireDmg: 1,
  splash: 0, stunChance: 0, slowHit: 0, coilSlow: 0, killBonus: 0, turretRange: 1,
};

export interface Commander {
  id: string;
  name: string;
  /** short title under the name */
  theme: string;
  bonus: string;
  drawback: string;
  /** accent colour for the card */
  colour: string;
  mods: Partial<Mods>;
  /** commanders whose signature weapon does not exist yet cannot be chosen */
  locked?: string;
  /** available from the first run; the others unlock through an achievement (sim/achievements.ts) */
  starter?: boolean;
}

export const COMMANDERS: Commander[] = [
  {
    // the commander everyone starts with: no bonus and no drawback. The others are earned, each by playing in their style.
    id: 'wren', starter: true, name: 'Captain Wren Halloway', theme: 'Standard issue', colour: '#b9b0a4',
    bonus: 'No bonus', drawback: 'No drawback', mods: {},
  },
  {
    id: 'brakka', name: 'Gunnery Chief Brakka Vesh', theme: 'Arsenal', colour: '#e8730c',
    bonus: 'Turrets hit 30% harder and hold 50% more ammo', drawback: 'Robots have 25% less health and hit 20% softer',
    mods: { turretDmg: 1.3, turretAmmo: 1.5, robotHp: 0.75, robotDps: 0.8 },
  },
  {
    id: 'regent', name: 'The Foundry Regent', theme: 'Robot army', colour: '#2f7fd6',
    bonus: 'Robots build 30% faster and have 30% more health', drawback: 'Turrets hit 20% softer',
    mods: { smallBuildTime: 0.7, bigBuildTime: 0.7, robotHp: 1.3, turretDmg: 0.8 },
  },
  {
    id: 'ilka', name: 'Stormwarden Ilka Thorne', theme: 'Lightning', colour: '#6cc8ff',
    bonus: 'Storm coils hit 40% harder and chain 2 extra jumps', drawback: 'Coils draw 50% more power and turrets hit 20% softer',
    mods: { coilDmg: 1.4, coilJumps: 2, coilPower: 1.5, turretDmg: 0.8 },
  },
  {
    id: 'tamsin', name: 'Forewoman Tamsin Brassgate', theme: 'Pure factory', colour: '#d8b04a',
    bonus: 'Starts with 50% more plates and is offered a fourth map square to choose from', drawback: 'Turrets hit 10% softer and robots 10% less health',
    mods: { startStock: 1.5, moduleChoices: 4, turretDmg: 0.9, robotHp: 0.9 },
  },
  {
    id: 'pim', name: 'Doctor Pim Quillfeather', theme: 'Drone swarm', colour: '#7bd88f',
    bonus: 'Small robots (drones, scouts, troopers) build in half the time', drawback: 'Big robots take 50% longer to build',
    mods: { smallBuildTime: 0.5, bigBuildTime: 1.5 },
  },
  {
    id: 'grimwald', name: 'Bastion Grimwald Oaksworn', theme: 'Fortress', colour: '#9a8f83',
    bonus: 'Turrets and walls have 50% more health', drawback: 'Robots walk 25% slower',
    mods: { defenceHp: 1.5, robotSpeed: 0.75 },
  },
  {
    id: 'ozric', name: 'Marshal Ozric Bellwether', theme: 'Artillery', colour: '#b05a3a',
    bonus: 'Artillery, incendiary launchers and plasma burst 30% wider and hit 25% harder', drawback: 'All turrets hit 10% softer, so the guns do little against fast things up close',
    mods: { blastMul: 1.3, blastDmg: 1.25, turretDmg: 0.9 },
  },
  {
    id: 'ysolde', name: 'Cinder Queen Ysolde Ash', theme: 'Fire', colour: '#ff5a3a',
    bonus: 'Flamers, torches, launchers and plasma hit 50% harder, and their fire burns harder too', drawback: 'Storm coils hit 20% softer, and every turret 10% softer',
    mods: { fireDmg: 1.5, coilDmg: 0.8, turretDmg: 0.9 },
  },
];

export const DEFAULT_COMMANDER = COMMANDERS[0].id;

export const commanderById = (id: string | undefined): Commander => COMMANDERS.find((c) => c.id === id) ?? COMMANDERS[0];

export const modsFor = (c: Commander): Mods => ({ ...DEFAULT_MODS, ...c.mods });

const BIG: RobotType[] = ['heavy', 'quad', 'artillery', 'titan'];
export const isBigRobot = (t: RobotType): boolean => BIG.includes(t);

/** Stars are earned by completing these levels. */
export const STAR_LEVELS = [10, 20, 30];
export const starsForLevel = (level: number): number => STAR_LEVELS.filter((l) => level >= l).length;
