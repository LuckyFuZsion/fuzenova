// Item, resource, recipe and ammo data. Pure data, no behaviour.

export type ItemId =
  | 'iron-ore' | 'copper-ore' | 'coal' | 'tin-ore' | 'lead-ore' | 'sulfur' | 'wood'
  | 'iron-plate' | 'copper-plate' | 'tin-plate' | 'lead-plate' | 'charcoal'
  | 'gunpowder' | 'bullet-casing' | 'bullet' | 'bronze-plate' | 'steel-plate' | 'shell-casing' | 'artillery-shell'
  | 'science-projectile' | 'science-em' | 'science-robotics' | 'science-advanced';

export const ITEMS: Record<ItemId, { name: string; color: string }> = {
  'iron-ore': { name: 'Iron ore', color: '#7f95a8' },
  'copper-ore': { name: 'Copper ore', color: '#c9773f' },
  coal: { name: 'Coal', color: '#2b2b30' },
  'tin-ore': { name: 'Tin ore', color: '#aab4bc' },
  'lead-ore': { name: 'Lead ore', color: '#5d6c86' },
  sulfur: { name: 'Sulfur', color: '#e0c84a' },
  wood: { name: 'Wood', color: '#7a5a36' },
  'iron-plate': { name: 'Iron plate', color: '#c9d3dc' },
  'copper-plate': { name: 'Copper plate', color: '#f0a06a' },
  'tin-plate': { name: 'Tin plate', color: '#d5dde3' },
  'lead-plate': { name: 'Lead plate', color: '#7f8db0' },
  charcoal: { name: 'Charcoal', color: '#1b1b1f' },
  gunpowder: { name: 'Gunpowder', color: '#4a4a52' },
  'bullet-casing': { name: 'Bullet casing', color: '#d8b04a' },
  bullet: { name: 'Bullet', color: '#f0c860' },
  'bronze-plate': { name: 'Bronze plate', color: '#b9853a' },
  'steel-plate': { name: 'Steel plate', color: '#8fa4bd' },
  'shell-casing': { name: 'Shell casing', color: '#a89060' },
  'artillery-shell': { name: 'Artillery shell', color: '#d86a2a' },
  'science-projectile': { name: 'Projectile science pack', color: '#e0583a' },
  'science-em': { name: 'Electromagnetic science pack', color: '#4aa8ff' },
  'science-robotics': { name: 'Robotics science pack', color: '#62d08a' },
  'science-advanced': { name: 'Advanced science pack', color: '#d36bff' },
};

/**
 * The only things the core takes in: what can actually be spent. Iron and copper plates pay for buildings and repairs;
 * science packs pay for research. Raw ore, ammunition and the rest would just sit there doing nothing, so the core refuses them
 * (a belt or inserter holding one waits at the end, and the game warns about it).
 */
export const CORE_ITEMS: ItemId[] = ['iron-plate', 'copper-plate', 'science-projectile', 'science-em', 'science-robotics', 'science-advanced'];

/** What a smelter turns each raw item into (one input, one output). */
export const SMELTS: Partial<Record<ItemId, ItemId>> = {
  'iron-ore': 'iron-plate',
  'copper-ore': 'copper-plate',
  'tin-ore': 'tin-plate',
  'lead-ore': 'lead-plate',
  wood: 'charcoal',
};

/** Ore kinds stored in World.ore: index -> the item a drill on that tile produces. */
export const ORE_ITEM: (ItemId | null)[] = [null, 'iron-ore', 'copper-ore', 'coal', 'tin-ore', 'lead-ore', 'sulfur', 'wood'];
export const ORE_NAMES = ['', 'Iron ore', 'Copper ore', 'Coal', 'Tin ore', 'Lead ore', 'Sulfur', 'Forest'];
export const ORE_COLORS = ['', '#6f8aa3', '#c9773f', '#26262b', '#aab4bc', '#5d6c86', '#e0c84a', '#3f6a3c'];
export const ORE_KINDS = [1, 2, 3, 4, 5, 6, 7];

/** Multi-input recipes made in an assembler. */
export interface Recipe {
  id: string; name: string; inputs: Partial<Record<ItemId, number>>; output: ItemId; count: number; time: number;
}
const R = (id: string, name: string, inputs: Recipe['inputs'], output: ItemId, count: number, time: number): Recipe =>
  ({ id, name, inputs, output, count, time });
export const RECIPE_LIST: Recipe[] = [
  // science packs: research is paid for with these, so each branch needs its own little production line
  R('science-projectile', 'Projectile science pack', { 'iron-plate': 1, 'copper-plate': 1 }, 'science-projectile', 1, 4),
  R('science-em', 'Electromagnetic science pack', { 'copper-plate': 1, 'tin-plate': 1 }, 'science-em', 1, 5),
  R('science-robotics', 'Robotics science pack', { 'iron-plate': 2, 'lead-plate': 1 }, 'science-robotics', 1, 6),
  R('science-advanced', 'Advanced science pack', { 'steel-plate': 1, bullet: 1 }, 'science-advanced', 1, 9), // level 2: two intermediaries (basic items take 1 ingredient, level 1 takes 2 raw ones, level 2 takes 2 made ones)
  R('gunpowder', 'Gunpowder', { coal: 1, sulfur: 1 }, 'gunpowder', 2, 3),
  R('bullet', 'Bullet', { 'copper-plate': 1, coal: 1 }, 'bullet', 2, 2), // one assembler, two ingredients (the old casing and gunpowder steps are gone)
  R('bronze', 'Bronze', { 'copper-plate': 1, 'tin-plate': 1 }, 'bronze-plate', 2, 3),
  R('steel', 'Steel', { 'iron-plate': 1, charcoal: 1 }, 'steel-plate', 1, 4),
  R('shell-casing', 'Shell casing', { 'steel-plate': 1, 'bronze-plate': 1 }, 'shell-casing', 1, 4),
  R('artillery-shell', 'Artillery shell', { 'shell-casing': 1, gunpowder: 2 }, 'artillery-shell', 1, 5),
];
export const RECIPES: Record<string, Recipe> = Object.fromEntries(RECIPE_LIST.map((r) => [r.id, r]));

/** Seconds of generator running time each fuel item gives. */
export const FUEL: Partial<Record<ItemId, number>> = { coal: 25, charcoal: 30, wood: 12 };

/** Things a turret can shoot. `shots` per item, and damage per shot. Iron plates are weak "scrap" ammo that the Gun turret and the Scatter gun (a scrap cannon) can use; bullets do real damage. */
export const AMMO: Partial<Record<ItemId, { shots: number; damage: number }>> = {
  'iron-plate': { shots: 4, damage: 8 },
  bullet: { shots: 10, damage: 20 },
  // artillery and the fire family: shells, and fuel (a flamer burns through a lot, so each item gives many shots)
  'artillery-shell': { shots: 3, damage: 70 },
  coal: { shots: 20, damage: 6 },
  charcoal: { shots: 26, damage: 8 },
  wood: { shots: 10, damage: 4 },
};
