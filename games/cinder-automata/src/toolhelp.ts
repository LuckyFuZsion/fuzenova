// Plain-English help for each building. Shown the first time a building is picked, and again on H.
import type { Kind } from './sim/world';

export interface ToolHelp { what: string; connect: string; does: string }

export const TOOL_HELP: Partial<Record<Kind, ToolHelp>> = {
  belt: {
    what: 'A <b>conveyor belt</b> carries items along, one tile at a time, in the direction of its arrows.',
    connect: 'Click and <b>drag</b> to lay a line; corners form by themselves. Start it right where a drill\'s yellow arrow points, and end it beside a smelter (with an inserter between), a turret or a robot fabricator.',
    does: 'Moves ore and plates around your base. Turrets and fabricators grab items off any belt that touches them.',
  },
  junction: {
    what: 'A <b>crossover</b> lets one belt cross another on the same tile without the two mixing.',
    connect: 'Put it where two lines meet at right angles and <b>replace the belt tile</b> where they cross. Belts running into it carry straight on out of the opposite side, each line keeping to its own direction.',
    does: 'Solves the classic problem of a belt needing to get past another belt. It is flat, so your robots can walk over it.',
  },
  splitter: {
    what: 'A <b>splitter</b> divides one belt into two, and a <b>merger</b> joins two belts into one. It is the same piece. It is 1 tile wide and 2 long.',
    connect: 'Turn it with <b>R</b> to face the way the items flow. Belts run into its back (one or both of the two tiles behind it) and up to two belts leave from the front. With <b>two belts in and one out</b> it merges; with <b>one in and two out</b> it splits, sending items to each side in turn.',
    does: 'Shares a supply between two turrets lines or two smelters, or joins two drill lines onto one belt. Where one exit is blocked, everything goes out of the other.',
  },
  inserter: {
    what: 'An <b>inserter</b> is a robotic arm that moves one item at a time from one thing to another.',
    connect: 'Put it in the gap <b>between</b> two things (a belt and a machine, say). The first time it has something to move, it <b>turns itself</b> to face the right way, so you don\'t need to rotate it. After its first delivery it keeps that direction.',
    does: 'Loads a smelter from a belt, and unloads the finished plates from the smelter onto another belt. <b>Double-click an inserter</b> (with no building selected) to make it move only one kind of item, for example copper ore off a mixed belt; leave it on "Any item" to move everything.',
  },
  miner: {
    what: 'A <b>mining drill</b> digs ore out of the ground. It is 3 tiles long and 2 wide, and only works on top of ore (the more ore under it, the better the spot).',
    connect: 'Place it on the ore patch with <b>R</b> to turn it, then put a belt (or a smelter) at the <b>glowing port in the middle of a long side</b>. Ore only leaves from those two middle tiles, so the belt always starts in the middle. It picks whichever port has something attached. Green squares in the preview show what it will feed.',
    does: 'Produces ore non-stop while a fight is on. Each ore tile runs out eventually, so ore patches thin out.',
  },
  furnace: {
    what: 'A <b>smelter</b> melts raw ore into metal plates (iron ore into iron plates, copper ore into copper plates). It is 2x2 tiles.',
    connect: 'Feed it ore with an inserter from a belt. Take the plates out with a second inserter onto another belt. It glows while it works.',
    does: 'Turns ore into plates, one every few seconds. Plates are what turrets and robots use as ammo and parts.',
  },
  turret: {
    what: 'A <b>gun turret</b> shoots enemies that come within about 7 tiles. It is 2x2 tiles.',
    connect: 'Lay a belt of <b>iron plates</b> so the belt touches any side of the turret. It pulls plates off the belt by itself. The dots round its rim show how much ammo it has.',
    does: 'Your main defence. Without plates it stays silent, so keep the supply belt running. More turrets near the core mean a safer base. Double-click a turret (with no building selected) to upgrade it into a Scatter gun or a Sniper once you have researched Turret designs.',
  },
  pole: {
    what: 'A <b>power pole</b> carries electricity. Poles link to each other and power any generator or coil close to them.',
    connect: 'Place a chain of poles from your generator to your Storm coils, no more than about 7 tiles apart. A dotted circle shows how far each pole reaches. A red bolt over a building means it isn\'t connected to any pole.',
    does: 'Nothing on its own; it joins generators and coils into one network so they share power.',
  },
  scrapbin: {
    what: 'A <b>scrap bin</b> destroys whatever it is given. It is 2x2 tiles.',
    connect: 'Put an <b>inserter</b> next to it, facing in, taking from a belt or machine. Double-click the inserter to give it a <b>filter</b> so it removes only one kind of item, for example gunpowder you have no use for. A belt that ends against the bin also empties into it.',
    does: 'Clears items that nothing else takes, so a belt never jams on leftovers. It cannot be undone: anything it takes is gone for good.',
  },
  generator: {
    what: 'An <b>Ember generator</b> burns fuel to make power. It is 2x2 tiles.',
    connect: 'Feed it <b>coal, charcoal or wood</b> from a belt using an inserter, and put a power pole within a few tiles of it. Its gauge shows the fuel left.',
    does: 'Makes 100 power while it has fuel and a fight is on. Each Storm coil in action uses about 70, so one generator runs about one coil at full strength. Too little power and the coils hit weaker.',
  },
  coil: {
    what: 'A <b>Storm coil</b> shoots chain lightning that jumps from one enemy to the next, up to four in a row. It needs no ammo. It is 2x2 tiles.',
    connect: 'Put a power pole within a few tiles of it, and connect that pole (through more poles) to a fuelled Ember generator. If it isn\'t connected, a red bolt shows over it.',
    does: 'Great against crowds of weak enemies: each jump hits a little softer than the last. Range is about 6 tiles. Enemies attack coils before other machines, so protect them with walls.',
  },
  assembler: {
    what: 'An <b>assembler</b> combines several materials into something new: gunpowder, bullets, bronze, steel and artillery shells. It is 3x3 tiles.',
    connect: 'With no building selected, <b>click</b> it to pick a recipe (hover to see what it needs). Feed each ingredient with an <b>inserter</b> from a belt, and take the product out with another inserter onto a belt. Bullets on a belt touching a turret make it hit harder.',
    does: 'Recipes: coal + sulfur = gunpowder; lead + copper = bullet casing; casing + gunpowder = bullets; copper + tin = bronze; iron + charcoal = steel; steel + bronze = shell casing; casing + 2 gunpowder = artillery shell. (Make charcoal by smelting wood.)',
  },
  wall: {
    what: 'A <b>wall</b> is a tough one-tile block that does nothing except take hits.',
    connect: 'No connection needed. Drag to build a line of them in front of your turrets, on the side the enemies come from.',
    does: 'Enemies attack turrets and walls before other buildings, so walls soak up damage while turrets shoot. Damaged buildings are repaired for free between levels; destroyed ones have to be placed again.',
  },
  robotfab: {
    what: 'A <b>robot fabricator</b> builds robot soldiers out of iron plates. It is 3x3 tiles.',
    connect: 'Run a belt of <b>iron plates</b> along any side. With no building selected, <b>click</b> it to change which robot it builds (bigger robots cost more plates and time).',
    does: 'While a fight is on it builds robots that walk out on their own, shoot enemies, and do not heal once hurt. Bars under it show build progress (blue) and plates loaded (gold).',
  },
};

const KEY = 'cinder-automata.seen-tools';

export function loadSeen(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(KEY) ?? '[]') as string[]); } catch { return new Set(); }
}
export function saveSeen(seen: Set<string>): void {
  try { localStorage.setItem(KEY, JSON.stringify([...seen])); } catch { /* private window: fine, it just shows again next visit */ }
}
