// Save and resume. The run is saved at the start of each build phase (and when the tab is hidden or closed during
// one), so you can leave between levels and pick up exactly where you were. Stored in this browser only.
import { markDirty } from './cloud';
import { withPerks } from './prestige';
import { commanderById, modsFor } from './sim/commanders';
import type { DifficultyId } from './sim/difficulty';
import { LEGACY_SEED, generateWorld } from './sim/mapgen';
import { Run, type RunOptions } from './sim/round';
import type { WorldState } from './sim/world';

const KEY = 'cinder-automata.save.v1';

export interface SaveData { v: 1; level: number; savedAt: number; world: WorldState; commander?: string; difficulty?: string; seed?: number }

export function saveRun(run: Run, commander?: string): boolean {
  if (run.phase !== 'build') return false; // mid-fight state (enemies, timers) isn't saved: resume always starts from a build phase
  try {
    const data: SaveData = { v: 1, level: run.level, savedAt: Date.now(), world: run.world.exportState(), commander, difficulty: run.difficulty.id, seed: run.world.seed };
    localStorage.setItem(KEY, JSON.stringify(data));
    markDirty();
    return true;
  } catch { return false; } // private window or storage full: the game still plays, it just can't resume
}

export function loadSave(): SaveData | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as SaveData;
    return d.v === 1 && d.world && Array.isArray(d.world.entities) ? d : null;
  } catch { return null; }
}

export function clearSave(): void {
  try { localStorage.removeItem(KEY); } catch { /* nothing to do */ }
  markDirty();
}

/** Rebuilds a run from a save, in its build phase with a fresh timer. */
export function restoreRun(save: SaveData, opts: RunOptions = {}): Run {
  const world = generateWorld(save.seed ?? LEGACY_SEED); // saves from before run seeds were the original fixed map
  world.mods = withPerks(modsFor(commanderById(save.commander)), commanderById(save.commander).id);
  world.importState(save.world);
  world.freeBuild = false;
  const run = new Run(world, { difficulty: save.difficulty as DifficultyId | undefined, omens: true, ...opts });
  run.level = save.level;
  run.applyArena();
  run.timer = run.buildLength();
  return run;
}
