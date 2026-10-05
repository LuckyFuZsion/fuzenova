// Difficulty levels, chosen when a new game starts. They change how much time you get, whether the next fight starts by
// itself, how tough the enemies are, and whether repairs between levels cost resources.

export type DifficultyId = 'easy' | 'normal' | 'hard' | 'extreme';

export interface Difficulty {
  id: DifficultyId;
  name: string;
  blurb: string;
  /** seconds of build phase; null = no timer, the player starts each fight when ready */
  buildSeconds: number | null;
  enemyHp: number;
  enemyDmg: number;
  /** fraction of a building's price charged per unit of damage when repairing between levels (0 = repairs are free) */
  repairCost: number;
  /** seconds after a won level (at level 1) in which the factory keeps running while you build; it shrinks as levels pass */
  cooldown: number;
}

export const DIFFICULTIES: Difficulty[] = [
  { id: 'easy', name: 'Easy', blurb: 'No timer: the next fight waits until you press start. Enemies are a little softer. Repairs are free.', buildSeconds: null, enemyHp: 0.85, enemyDmg: 0.85, repairCost: 0, cooldown: 50 },
  { id: 'normal', name: 'Normal', blurb: '90 seconds to build before each fight. Repairs are free.', buildSeconds: 90, enemyHp: 1, enemyDmg: 1, repairCost: 0, cooldown: 30 },
  { id: 'hard', name: 'Hard', blurb: '70 seconds to build. Tougher enemies. Repairs between levels cost resources.', buildSeconds: 70, enemyHp: 1.15, enemyDmg: 1.1, repairCost: 0.25, cooldown: 20 },
  { id: 'extreme', name: 'Extreme', blurb: '45 seconds to build. Much tougher enemies. Repairs cost a lot.', buildSeconds: 45, enemyHp: 1.3, enemyDmg: 1.25, repairCost: 0.5, cooldown: 12 },
];

export const DEFAULT_DIFFICULTY: DifficultyId = 'normal';

export const difficultyById = (id: string | undefined): Difficulty => DIFFICULTIES.find((d) => d.id === id) ?? DIFFICULTIES[1];
