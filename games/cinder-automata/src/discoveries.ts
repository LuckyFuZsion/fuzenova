// "New discovery" pop-ups: the first time an item turns up in the player's factory the game pauses and explains what it is for.
// What has been seen is remembered per player (and goes to the cloud with the rest of their profile).
import { markDirty } from './cloud';
import { itemIconUrl } from './sprites';
import { ITEMS, type ItemId } from './sim/items';
import type { World } from './sim/world';

const KEY = 'cinder-automata.seen.v1';

const INFO: Record<ItemId, string> = {
  'iron-ore': 'Raw iron from the ground. Put a Smelter beside the drill (or belt it to one) to turn it into iron plates.',
  'copper-ore': 'Raw copper. Smelt it into copper plates, which pay for most buildings along with iron.',
  coal: 'Burns as fuel in an Ember generator (power for Storm coils). Also the main ingredient of gunpowder, with sulfur.',
  'tin-ore': 'Raw tin. Smelt it into tin plates, used for bronze and the Electromagnetic science pack.',
  'lead-ore': 'Raw lead. Smelt it into lead plates, used for bullet casings and the Robotics science pack.',
  sulfur: 'A yellow mineral. With coal it makes gunpowder in an Assembler.',
  wood: 'Burnt trees. Burns as fuel in a generator, or smelt it in a Smelter to make charcoal.',
  'iron-plate': 'The basic building material. Spend it on buildings and repairs by belting it into the Core. Turrets can also fire it as weak ammunition.',
  'copper-plate': 'The second building material, spent from the Core. Also needed for science packs and bullet casings.',
  'tin-plate': 'Made by smelting tin ore. Combine with copper for bronze or for Electromagnetic science packs.',
  'lead-plate': 'Made by smelting lead ore. Used for bullet casings and Robotics science packs.',
  charcoal: 'Made by smelting wood. Burns as generator fuel and is the extra ingredient for steel.',
  gunpowder: 'Not used on its own. An Assembler turns a bullet casing and a gunpowder into 2 bullets, and Advanced science packs need those bullets.',
  'bullet-casing': 'Made from lead and copper plates. Combine with gunpowder in an Assembler to make bullets.',
  bullet: 'Strong turret ammunition (10 shots of 20 damage each). Belt it into your turrets. Advanced science packs also need one.',
  'bronze-plate': 'Made from copper and tin plates. Needed for Advanced science packs and shell casings.',
  'steel-plate': 'Made from iron plates and charcoal. Needed for Advanced science packs and shell casings.',
  'shell-casing': 'Made from steel and bronze. Part of an artillery shell (artillery turrets are not built yet).',
  'artillery-shell': 'Made from a shell casing and 2 gunpowder. For artillery turrets, which are not built yet.',
  'science-projectile': 'Pays for research in the Core. Belt it into the Core, then open Research (T). Needed for weapon upgrades.',
  'science-em': 'Pays for research in the Core. The second kind of pack that level 2 of a research asks for.',
  'science-robotics': 'Pays for research in the Core, mostly for robot upgrades. Belt it into the Core.',
  'science-advanced': 'The top-tier pack. Level 3 and above of every research needs it, so it is worth building the whole ammunition chain.',
};

function load(): Set<string> | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return null;
    const a = JSON.parse(raw) as unknown;
    return new Set(Array.isArray(a) ? a.filter((x): x is string => typeof x === 'string') : []);
  } catch { return new Set(); }
}
function save(s: Set<string>): void {
  try { localStorage.setItem(KEY, JSON.stringify([...s])); } catch { /* cannot store: it will be shown again next time */ }
  markDirty();
}

/** Every kind of item that exists in the world right now: on belts, in machines, in a drill's hands or in the Core. */
export function itemsPresent(w: World): Set<ItemId> {
  const out = new Set<ItemId>();
  for (const e of w.entities.values()) {
    switch (e.kind) {
      case 'belt': for (const it of e.items) out.add(it.type); break;
      case 'furnace': if (e.inType) out.add(e.inType); if (e.outType && e.outCount > 0) out.add(e.outType); break;
      case 'assembler': for (const k of Object.keys(e.stock) as ItemId[]) if ((e.stock[k] ?? 0) > 0) out.add(k); break;
      case 'miner': if (e.pending) out.add(e.pending); break;
      case 'inserter': if (e.held) out.add(e.held); break;
      case 'core': for (const k of Object.keys(e.stock) as ItemId[]) if ((e.stock[k] ?? 0) > 0) out.add(k); break;
    }
  }
  return out;
}

export class Discoveries {
  private seen = load();
  private queue: ItemId[] = [];
  private el: HTMLElement | null = null;
  /** called when the player dismisses a pop-up */
  onClose: () => void = () => {};
  /** true while a pop-up is on screen (the game holds still) */
  get open(): boolean { return !!this.el; }

  /** Looks for items the player has not met. The first time ever, whatever is already there counts as known (an existing player is not buried in pop-ups). */
  check(w: World, enabled: boolean): void {
    if (!enabled || this.el) return;
    const now = itemsPresent(w);
    if (this.seen === null) { this.seen = new Set(now); save(this.seen); return; }
    for (const k of now) if (!this.seen.has(k) && !this.queue.includes(k)) this.queue.push(k);
    if (this.queue.length) this.show(this.queue.shift()!);
  }

  private show(id: ItemId): void {
    this.seen!.add(id); save(this.seen!);
    const url = itemIconUrl(id);
    const el = document.createElement('div');
    el.id = 'discovery';
    el.innerHTML = `<div class="card"><small>New discovery</small>${url ? `<img src="${url}" alt="">` : `<i class="dot" style="background:${ITEMS[id].color}"></i>`}<h2>${ITEMS[id].name}</h2><p>${INFO[id]}</p><button>Got it</button></div>`;
    el.querySelector('button')!.addEventListener('click', () => this.close());
    document.body.append(el);
    el.querySelector('button')!.focus();
    this.el = el;
  }

  close(): void {
    this.el?.remove(); this.el = null;
    this.onClose();
  }
}
