// Inspect mode (F3): hover anything on the map and get a card saying what it is, what it needs, how to connect it
// and what it is doing right now. Pure functions that build HTML, so they can be tested without a browser.
import { COIL_COOLDOWN, COIL_DAMAGE, COIL_JUMPS, COIL_RANGE, TURRET_COOLDOWN, TURRET_RANGE, fabRoomUsed } from './sim/combat';
import { COSTS } from './sim/costs';
import { ENEMIES } from './sim/enemies';
import { AMMO, FUEL, ITEMS, ORE_NAMES, RECIPES, SMELTS, type ItemId } from './sim/items';
import { COIL_CHARGE_MAX, COIL_CHARGE_RATE, COIL_SHOT_COST, COIL_USE_CHARGING, COIL_USE_FULL, GEN_OUTPUT, POLE_REACH, POLE_SUPPLY, satisfaction } from './sim/power';
import { FAB_CAPACITY, ROBOTS, ROBOT_SPACE } from './sim/robots';
import { problemOf } from './sim/status';
import { KINDS, STRUCTURE_HP, TURRET_MAX_AMMO, type Enemy, type Entity, type World } from './sim/world';
import type { Soldier } from './sim/robots';
import { TOOL_HELP } from './toolhelp';

export type Target =
  | { t: 'entity'; e: Entity }
  | { t: 'enemy'; en: Enemy }
  | { t: 'soldier'; s: Soldier }
  | { t: 'ore'; x: number; y: number; ore: number; left: number };

/** What is under a point on the map (world tiles), in priority order: enemy, robot, building, ore. */
export function pickTarget(world: World, wx: number, wy: number): Target | null {
  for (const en of world.enemies) {
    const r = (en.kind ? ENEMIES[en.kind].scale : 1.1) / 2 + 0.25;
    if (Math.hypot(en.x - wx, en.y - wy) <= r) return { t: 'enemy', en };
  }
  for (const s of world.soldiers) if (Math.hypot(s.x - wx, s.y - wy) <= ROBOTS[s.type].scale / 2 + 0.2) return { t: 'soldier', s };
  const tx = Math.floor(wx), ty = Math.floor(wy);
  const e = world.entityAt(tx, ty);
  if (e) return { t: 'entity', e };
  if (world.inBounds(tx, ty)) {
    const i = ty * world.w + tx;
    if (world.ore[i] && world.oreLeft[i] > 0) return { t: 'ore', x: tx, y: ty, ore: world.ore[i], left: world.oreLeft[i] };
  }
  return null;
}

const nm = (i: ItemId): string => ITEMS[i].name.toLowerCase();
const list = (items: Partial<Record<ItemId, number>>): string =>
  (Object.entries(items) as [ItemId, number][]).map(([k, n]) => `${n}&times; ${nm(k)}`).join(' + ');
const li = (items: string[]): string => `<ul>${items.map((t) => `<li>${t}</li>`).join('')}</ul>`;
const sec = (title: string, body: string): string => (body ? `<h5>${title}</h5>${body}` : '');
const cost = (kind: keyof typeof COSTS): string => list(COSTS[kind]) || 'free';

function neededAndNow(e: Entity, w: World): { needs: string[]; now: string[] } {
  const needs: string[] = [], now: string[] = [];
  switch (e.kind) {
    case 'belt':
      needs.push('Something putting items onto it: a drill, an inserter, or another belt.');
      now.push(e.items.length ? `Carrying ${e.items.length} item(s), mostly ${nm(e.items[0].type)}.` : 'Empty.');
      break;
    case 'miner': {
      needs.push('Sitting on ore. It only digs the ore under its 2x2 footprint.', 'A belt or smelter at the middle of a long side to take the ore.');
      let left = 0;
      for (let dy = 0; dy < e.h; dy++) for (let dx = 0; dx < e.w; dx++) left += w.oreLeft[(e.y + dy) * w.w + e.x + dx];
      now.push(`${left} ore left under it.`, e.pending ? `Holding ${nm(e.pending)} waiting for a taker.` : 'Digging.', 'The factory only runs during fights and the breather after one.');
      break;
    }
    case 'inserter':
      needs.push('A source on one side (belt, smelter, assembler...) and a target on the other.', 'No power needed.');
      now.push(e.held ? `Carrying ${nm(e.held)}.` : 'Idle, waiting for something it can move.', e.filter ? `Filter: moves only <b>${nm(e.filter)}</b>. Double-click it to change.` : 'Filter: any item. Double-click it to choose one kind of item.');
      break;
    case 'furnace':
      needs.push(`Ore, delivered by an inserter or a drill: ${(Object.keys(SMELTS) as ItemId[]).map(nm).join(', ')}.`, 'No fuel or power needed.');
      now.push(`In: ${e.inCount}&times; ${e.inType ? nm(e.inType) : 'nothing'}. Out: ${e.outCount}&times; ${e.outType ? nm(e.outType) : 'nothing'}.`);
      break;
    case 'assembler': {
      const r = RECIPES[e.recipe];
      if (!r) break;
      needs.push(`Recipe <b>${r.name}</b>: ${list(r.inputs)} &rarr; ${r.count}&times; ${nm(r.output)} every ${r.time}s.`,
        'Each input arrives by an inserter (or a belt or drill end touching it). Take the result out with another inserter.',
        'Double-click it with no building selected to change recipe.');
      for (const k of Object.keys(r.inputs) as ItemId[]) now.push(`${nm(k)}: has ${e.stock[k] ?? 0}, needs ${r.inputs[k]} per batch.`);
      now.push(`Finished items waiting: ${e.out}.`);
      break;
    }
    case 'turret': {
      needs.push(`Ammo from a belt touching it, or an inserter: ${(Object.keys(AMMO) as ItemId[]).map((k) => `${nm(k)} (${AMMO[k]!.shots} shots of ${AMMO[k]!.damage} damage)`).join(' or ')}.`,
        `Enemies within ${(TURRET_RANGE * w.rfx.turretRange).toFixed(1)} tiles (the circle on the map).`);
      now.push(`${e.ammo} of ${e.maxAmmo ?? TURRET_MAX_AMMO} shots loaded.`, `Fires every ${(TURRET_COOLDOWN * w.rfx.turretCooldown).toFixed(2)}s for ${Math.round(e.dmg * w.mods.turretDmg * w.rfx.turretDmg)} damage (research and your commander included).`);
      break;
    }
    case 'robotfab': {
      const d = ROBOTS[e.type];
      needs.push(`Iron plates from a belt touching it or an inserter: ${d.cost} per robot.`, 'A fight in progress (it builds only during fights).', 'Double-click it with no building selected to change what it builds.');
      const used = fabRoomUsed(w, e.id);
      needs.push(`Room: it can field ${FAB_CAPACITY} space of robots at once. A scout takes 1, a Titan takes ${ROBOT_SPACE.titan}. When its robots die, room frees up.`);
      now.push(`Army room: <b>${used} of ${FAB_CAPACITY}</b> used. This robot takes ${ROBOT_SPACE[e.type]}${used + ROBOT_SPACE[e.type] > FAB_CAPACITY ? ' (too big to fit right now)' : ''}.`, `Building a <b>${d.name}</b> (${d.buildTime}s, ${d.hp} health, ${d.dps} damage/s).`, `${e.stock} plates loaded.`);
      break;
    }
    case 'scrapbin': {
      needs.push('An inserter (or the end of a belt) pointing into it. Give the inserter a filter to remove just one kind of item.');
      now.push(`Destroyed so far: <b>${e.burned}</b> items.`);
      break;
    }
    case 'generator': {
      needs.push(`Fuel from a belt or inserter: ${(Object.keys(FUEL) as ItemId[]).map((k) => `${nm(k)} (${FUEL[k]}s)`).join(', ')}.`, 'Power poles to carry the power to your coils.');
      now.push(e.fuelSecs > 0 ? `Burning: ${Math.round(e.fuelSecs)}s of fuel left, giving ${GEN_OUTPUT} power.` : 'Out of fuel.', 'It only burns while a fight is on.');
      break;
    }
    case 'coil': {
      const sat = satisfaction(w, e);
      needs.push(`Power: it charges up to ${COIL_CHARGE_MAX} (gaining ${COIL_CHARGE_RATE} a second, for ${COIL_USE_CHARGING} power), each bolt spends ${COIL_SHOT_COST}, and a full coil draws only ${COIL_USE_FULL}.`, `A power pole within ${POLE_SUPPLY} tiles, on a network with a generator.`, `Enemies within ${(COIL_RANGE * w.rfx.coilRange).toFixed(1)} tiles (the circle on the map).`);
      now.push(`Charge: <b>${Math.round(e.charge ?? 0)} of ${COIL_CHARGE_MAX}</b> (${Math.floor((e.charge ?? 0) / COIL_SHOT_COST)} bolts ready). Power supply ${Math.round(sat * 100)}% of what it wants.`, `Hits ${Math.round(COIL_DAMAGE * w.mods.coilDmg * w.rfx.coilDmg)} damage and jumps to ${COIL_JUMPS + w.mods.coilJumps + w.rfx.coilJumps} more enemies, every ${COIL_COOLDOWN}s.`);
      break;
    }
    case 'pole': {
      needs.push(`Other poles within ${POLE_REACH} tiles to link into one network.`);
      now.push(`Powers coils and generators within ${POLE_SUPPLY} tiles of it.`);
      break;
    }
    case 'wall': needs.push('Nothing.'); now.push(`Health ${Math.round(e.hp)} of ${e.maxHp}.`); break;
    case 'core': {
      needs.push('Belts or inserters delivering iron plates, copper plates or science packs. It refuses everything else (ore, ammunition...): that could never be spent.');
      now.push(`Health ${Math.round(e.hp)} of ${e.maxHp}. If it falls, the run is over.`, `Build stock: ${list(e.stock) || 'empty'}.`);
      break;
    }
  }
  return { needs, now };
}

const card = (title: string, tag: string, body: string): string => `<h4>${title}${tag ? ` <em>${tag}</em>` : ''}</h4>${body}`;

/** The HTML for the inspect card. */
export function inspectHtml(target: Target, w: World): string {
  if (target.t === 'ore') {
    const item = ORE_NAMES[target.ore];
    return card(item, 'resource', `<p>${target.left} left in this tile.</p>` + sec('How to use it', li([
      'Place a <b>mining drill</b> (2x2) on top of it.',
      'Put a belt against the drill and carry the ore to a smelter, or straight to a generator (coal, charcoal or wood are fuel). The core refuses raw ore.',
    ])));
  }
  if (target.t === 'enemy') {
    const d = target.en.kind ? ENEMIES[target.en.kind] : null;
    const pct = Math.round((target.en.hp / target.en.maxHp) * 100);
    return card(d?.name ?? 'Enemy', d?.boss ? 'BOSS' : d?.flying ? 'flying' : 'enemy', `<p>A rogue machine marching on your core. Health ${pct}%.</p>` + sec('What it does', li([
      'Attacks turrets, walls and Storm coils first, then the core.',
      d?.boss ? 'It must be destroyed before the level can end, and pays a bonus.' : 'Killing it gives a few iron plates.',
      d?.flying ? 'Flies over walls. Robots on the ground can shoot it, but crawlers cannot hit your robots that fly.' : 'Walks; walls slow it down while turrets shoot.',
    ])));
  }
  if (target.t === 'soldier') {
    const d = ROBOTS[target.s.type];
    return card(d.name, 'your robot', `<p>Health ${Math.round(target.s.hp)} of ${Math.round(target.s.maxHp)}.</p>` + sec('What it does', li([
      `Shoots enemies within ${(d.range * w.rfx.robotRange).toFixed(1)} tiles for ${d.dps} damage a second, and goes after enemies that come near.`,
      'Stands guard outside the base between fights. Robots do not heal, so a wounded one stays wounded.',
      'Built in a Robot fabricator from iron plates.',
    ])));
  }
  const e = target.e;
  const help = TOOL_HELP[e.kind];
  const { needs, now } = neededAndNow(e, w);
  const p = problemOf(w, e);
  const tag = `${KINDS[e.kind].w}x${KINDS[e.kind].h} - ${e.kind === 'core' ? 'cannot be removed' : `costs ${cost(e.kind)}`} - health ${STRUCTURE_HP[e.kind]}`;
  return card(KINDS[e.kind].name, '', `<small>${tag}</small>`
    + (help ? `<p>${help.what}</p>` : e.kind === 'core' ? '<p>Your base: the <b>Cinder Core</b>. Everything you build is paid for from its stock.</p>' : '')
    + (e.fresh ? '<p class="attn">Planned: it locks in when the fight starts. Until then you can remove or move it for a full refund.</p>' : '')
    + (p ? `<p class="${p.level === 'error' ? 'warn' : 'attn'}">${p.text}</p>` : '')
    + sec('Needs', li(needs))
    + (help ? sec('How to connect', `<p>${help.connect}</p>`) : '')
    + sec('Right now', li(now)));
}
