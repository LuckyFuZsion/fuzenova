// Spotting things that are placed wrong or cannot work, so the map can show a warning over them instead of leaving
// the player to work out why nothing moves. Purely a reading of the current layout; it never changes anything.
import { ROBOTS } from './robots';
import { BASE_VARIANT, VARIANTS } from './turretdata';
import { AMMO, CORE_ITEMS, FUEL, ITEMS, ORE_ITEM, RECIPES, SMELTS, type ItemId } from './items';
import { KINDS, TUNNEL_MAX_GAP, flowsIntoDrill, minerContacts, type Entity, type Miner, type World } from './world';

export interface Problem {
  /** error: it will never work as placed. warn: it is not working yet, but could be. */
  level: 'error' | 'warn';
  text: string;
}

/** Could this machine ever take this item, however long you wait? (Different from "has room right now".) */
export function willEverAccept(dst: Entity, item: ItemId): boolean {
  switch (dst.kind) {
    case 'belt': case 'core': return true;
    case 'turret': case 'flamer': return !!AMMO[item] && VARIANTS[dst.variant ?? BASE_VARIANT[dst.kind]].ammo.includes(item);
    case 'furnace': return !!SMELTS[item];
    case 'assembler': return !!RECIPES[dst.recipe]?.inputs[item];
    case 'robotfab': case 'hangar': case 'foundry': case 'heavyworks': return (ROBOTS[dst.type].cost[item] ?? 0) > 0;
    case 'generator': return !!FUEL[item];
    case 'scrapbin': return true;
    default: return false;
  }
}

const name = (e: Entity): string => KINDS[e.kind].name.toLowerCase();
const item = (i: ItemId): string => ITEMS[i].name.toLowerCase();

/** The ore a drill would dig, whether or not the factory is running. */
function drillItem(m: Miner, w: World): ItemId | null {
  if (m.pending) return m.pending;
  for (let dy = 0; dy < m.h; dy++) {
    for (let dx = 0; dx < m.w; dx++) {
      const i = (m.y + dy) * w.w + m.x + dx;
      if (w.oreLeft[i] > 0) return ORE_ITEM[w.ore[i]] ?? null;
    }
  }
  return null;
}

/** Everything touching an entity's four sides. */
function neighbours(w: World, e: Entity): Entity[] {
  const seen = new Set<number>(), out: Entity[] = [];
  const add = (x: number, y: number) => { const n = w.entityAt(x, y); if (n && n !== e && !seen.has(n.id)) { seen.add(n.id); out.push(n); } };
  for (let i = 0; i < e.w; i++) { add(e.x + i, e.y - 1); add(e.x + i, e.y + e.h); }
  for (let j = 0; j < e.h; j++) { add(e.x - 1, e.y + j); add(e.x + e.w, e.y + j); }
  return out;
}

export function problemOf(w: World, e: Entity): Problem | null {
  switch (e.kind) {
    case 'miner': {
      const it = drillItem(e, w);
      if (!it) return null; // dug out
      const around = minerContacts(e).map((o) => w.entityAt(o.x, o.y)).filter((n): n is Entity => !!n && !flowsIntoDrill(n, e));
      if (!around.length) return { level: 'warn', text: `Not connected: nothing beside this drill to take its ${item(it)}. Put a belt or a smelter against it.` };
      if (!around.some((n) => willEverAccept(n, it))) {
        return { level: 'error', text: `Wrong connection: a ${name(around[0])} cannot take ${item(it)}. Drills need a belt or a smelter (to make plates first).` };
      }
      return null;
    }
    case 'inserter': {
      if (e.held) {
        const dst = w.entityAt(e.x + (e.dir === 0 ? 1 : e.dir === 2 ? -1 : 0), e.y + (e.dir === 1 ? 1 : e.dir === 3 ? -1 : 0));
        if (dst && !willEverAccept(dst, e.held)) return { level: 'error', text: `Stuck holding ${item(e.held)}: a ${name(dst)} cannot take it.` };
      }
      return null;
    }
    case 'turret':
      return e.ammo <= 0 ? { level: 'warn', text: 'Needs ammo.' } : null;
    case 'tunnel': {
      if (e.role === 'in' && !w.tunnelLink(e)) return { level: 'warn', text: `No exit: place another underground piece, facing the same way, in line within ${TUNNEL_MAX_GAP + 1} tiles in front of this one.` };
      return null;
    }
    case 'belt': {
      const front = e.items[0];
      if (!front || front.pos < 0.98) return null;
      const next = w.entityAt(e.x + (e.dir === 0 ? 1 : e.dir === 2 ? -1 : 0), e.y + (e.dir === 1 ? 1 : e.dir === 3 ? -1 : 0));
      if (next?.kind === 'core' && !CORE_ITEMS.includes(front.type)) return { level: 'warn', text: `The core refuses ${item(front.type)}: it only takes iron and copper plates and science packs. Smelt or use it before the core.` };
      if (next && (next.kind === 'core' || next.kind === 'belt' || next.kind === 'junction' || next.kind === 'splitter' || next.kind === 'tunnel')) return null;
      // turrets and fabricators pull straight off a belt, and inserters lift from it: anything like that counts as a taker
      const takers = neighbours(w, e).filter((n) => n.kind === 'inserter' || ((n.kind === 'turret' || n.kind === 'robotfab') && willEverAccept(n, front.type)));
      if (takers.length) return null;
      return { level: 'warn', text: `Dead end: this belt is full of ${item(front.type)} and nothing takes it. Put an inserter, turret or the core at the end.` };
    }
    default: return null;
  }
}
