// The guided tutorial level: a short, forgiving map with one iron patch near the core, and a checklist that
// watches what the player builds. Each step completes by itself when the world shows the thing was built.
import { DX, DY, type Entity, type World } from './sim/world';
import type { Run } from './sim/round';

export interface TutorialCtx { world: World; run: Run }
export interface Marker { x: number; y: number; r: number }
export interface Step {
  title: string;
  html: string;
  done: (c: TutorialCtx) => boolean;
  marker?: (c: TutorialCtx) => Marker | null;
}

/** Centre of the small iron patch added next to the core for the tutorial. */
export const TUTORIAL_PATCH = { x: 68, y: 83, r: 3.3 };

const all = (w: World): Entity[] => [...w.entities.values()];
const count = (w: World, kind: Entity['kind']): number => all(w).filter((e) => e.kind === kind).length;
/** The two things an inserter sits between on either axis. Inserters turn themselves once running, so we ignore which way they currently face. */
function between(w: World, i: Entity): [Entity | undefined, Entity | undefined][] {
  return [0, 1].map((d) => [w.entityAt(i.x - DX[d], i.y - DY[d]), w.entityAt(i.x + DX[d], i.y + DY[d])] as [Entity | undefined, Entity | undefined]);
}
/** Number of inserters that have a smelter on one side and a belt on the other. */
function smelterInserters(w: World): number {
  return all(w).filter((e) => e.kind === 'inserter'
    && between(w, e).some(([a, b]) => (a?.kind === 'furnace' && b?.kind === 'belt') || (a?.kind === 'belt' && b?.kind === 'furnace'))).length;
}

/** Any belt tile touching a turret's footprint. */
function turretHasBelt(w: World): boolean {
  for (const t of all(w)) {
    if (t.kind !== 'turret') continue;
    for (let i = 0; i < t.w; i++) for (const y of [t.y - 1, t.y + t.h]) if (w.entityAt(t.x + i, y)?.kind === 'belt') return true;
    for (let j = 0; j < t.h; j++) for (const x of [t.x - 1, t.x + t.w]) if (w.entityAt(x, t.y + j)?.kind === 'belt') return true;
  }
  return false;
}

export const TUTORIAL_STEPS: Step[] = [
  {
    title: 'Dig for iron',
    html: 'Press <kbd>3</kbd> to pick the <b>Mining drill</b>, then click on the blue-grey iron patch (the pulsing ring) to place it. Don\'t worry about which way it faces: it hands ore to any belt or machine touching it, on any side.',
    done: ({ world }) => count(world, 'miner') > 0,
    marker: () => ({ x: TUTORIAL_PATCH.x, y: TUTORIAL_PATCH.y, r: 3.8 }),
  },
  {
    title: 'Lay a conveyor',
    html: 'Press <kbd>1</kbd> for <b>Conveyor belt</b>. Click and <b>drag</b> from the drill\'s arrow towards the base to lay at least 4 belts. Start the first belt at the <b>glowing port in the middle of one of the drill\'s long sides</b> (press <kbd>R</kbd> before placing the drill to turn it). Belts turn corners by themselves.',
    done: ({ world }) => count(world, 'belt') >= 4,
    marker: ({ world }) => {
      const m = all(world).find((e) => e.kind === 'miner');
      return m ? { x: m.x + m.w / 2, y: m.y + m.h / 2, r: 2.4 } : null;
    },
  },
  {
    title: 'Smelt the ore',
    html: 'Ore must become plates. End your belt next to a spot for a <b>Smelter</b> (<kbd>4</kbd>), then put an <b>Inserter</b> (<kbd>2</kbd>) in the gap between the belt and the smelter. Inserters are the little arms that move items between machines, and they turn themselves to face the right way once ore arrives.',
    done: ({ world }) => smelterInserters(world) >= 1,
  },
  {
    title: 'Feed a turret',
    html: 'Now use the plates. Put a second <b>Inserter</b> on the smelter\'s far side, then a <b>Conveyor belt</b> from it, and finish with a <b>Gun turret</b> (<kbd>6</kbd>) touching the end of that belt. Turrets pull iron plates off any belt beside them.',
    done: ({ world }) => turretHasBelt(world) && smelterInserters(world) >= 2,
  },
  {
    title: 'Start the fight',
    html: 'Your factory <b>only runs during fights</b>, and you can keep building while it runs. Press <b>Start fight now</b> at the top. Enemies will march on the glowing core from the map edge.',
    done: ({ run }) => run.phase !== 'build',
  },
  {
    title: 'Hold the line',
    html: 'Watch the belt carry plates to your turret: the dots around its rim show its ammo. Anything can still be fixed or added mid-fight. Survive until the timer ends and the last enemy falls. Tip: more turrets, or a <b>Drone workshop</b> (<kbd>7</kbd>) fed with copper and iron plates to build robots, make a stronger defence. Later you can build the Gunship hangar, Walker foundry and Heavy works for stronger robots.',
    done: ({ run }) => run.phase === 'won' || run.phase === 'lost',
  },
  {
    title: 'You\'re ready',
    html: 'That\'s the loop: <b>mine, smelt, move, defend</b>, then do it bigger each level. Robots you build guard the base, and they do not heal. Ready for the real game?',
    done: () => false,
  },
];
