// What is in a plot, described for the player, and the short lesson shown the first time each resource turns up.
import { ORE_NAMES } from './sim/items';
import { plotRect } from './sim/plots';
import type { World } from './sim/world';

/** Ore kinds in a plot with how many tiles of each, biggest first. */
export function plotOres(world: World, id: number): { kind: number; tiles: number }[] {
  const r = plotRect(id), count = new Map<number, number>();
  for (let y = r.y0; y < r.y1; y++) for (let x = r.x0; x < r.x1; x++) {
    const i = y * world.w + x;
    if (world.ore[i] && world.oreLeft[i] > 0) count.set(world.ore[i], (count.get(world.ore[i]) ?? 0) + 1);
  }
  return [...count].map(([kind, tiles]) => ({ kind, tiles })).sort((a, b) => b.tiles - a.tiles);
}

function terrainNote(world: World, id: number): string {
  const r = plotRect(id);
  let n = 0;
  for (let y = r.y0; y < r.y1; y++) for (let x = r.x0; x < r.x1; x++) if (world.terrain[y * world.w + x]) n++;
  return n > 140 ? 'lots of rocks and trees' : n > 50 ? 'some rocks and trees' : 'mostly open ground';
}

/** A plot as pieces for the choice tile: its ores (with a size word) and what the ground is like. */
export function plotSummary(world: World, id: number): { ores: { kind: number; name: string; size: string }[]; note: string } {
  return {
    ores: plotOres(world, id).map((o) => ({ kind: o.kind, name: ORE_NAMES[o.kind], size: o.tiles > 70 ? 'Big patch' : o.tiles > 35 ? 'Medium patch' : 'Small patch' })),
    note: terrainNote(world, id),
  };
}

export function describePlot(world: World, id: number): string {
  const ores = plotOres(world, id);
  const what = ores.length ? ores.map((o) => `${ORE_NAMES[o.kind]} (${o.tiles > 70 ? 'big' : o.tiles > 35 ? 'medium' : 'small'} patch)`).join(', ') : 'no ore';
  return `${what}; ${terrainNote(world, id)}`;
}

/** Shown the first time a kind of ore comes into the explored land. */
export const ORE_INTRO: Record<number, string> = {
  1: 'Iron ore: smelt it into iron plates. Plates pay for buildings and are your first ammunition.',
  2: 'Copper ore: smelt it into copper plates. Turrets, research and wiring need them.',
  3: 'Coal: fuel for generators and half of gunpowder. Storm coils run on the power it makes.',
  4: 'Tin ore: smelt it into tin plates for better gear.',
  5: 'Lead ore: smelt it into lead plates, which stronger ammunition and research need.',
  6: 'Sulfur: mix it with coal to make gunpowder, which makes proper bullets.',
  7: 'Forest: wood, a weaker fuel you can burn in generators when coal is scarce.',
};

/** Ore kinds that exist in the opened plots. */
export function knownOres(world: World): Set<number> {
  const out = new Set<number>();
  for (const id of world.plots ?? []) for (const o of plotOres(world, id)) out.add(o.kind);
  return out;
}
