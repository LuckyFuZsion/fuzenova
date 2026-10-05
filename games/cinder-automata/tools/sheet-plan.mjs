// Single source of truth for every art sheet: drives the prompt pack AND the slicer's file/object names.
// tier 1 = needed for the next gameplay phases, 2 = combat / fluids / depth, 3 = late-game and polish.
// kind: object | icon | tile | creature | fx | ui   (controls the extra art direction in the prompt)
// done: true = already generated and sliced. file = base name of the image in art/raw (any of png/jpg/jpeg/webp).

const S = (id, slug, title, tier, kind, items, extra = {}) => ({
  id, slug, title, tier, kind, file: `sheet-${id}-${slug}`, items, ...extra,
});

export const SHEETS = [
  // ---------------- DONE ----------------
  S('01', 'logistics', 'Logistics', 0, 'object', [
    ['belt-straight', ''], ['belt-curve', ''], ['splitter', ''], ['underground', ''],
    ['inserter', ''], ['chest-wood', ''], ['chest-steel', ''], ['pole', ''],
  ], { done: true }),
  S('02', 'extraction', 'Extraction and smelting', 0, 'object', [
    ['drill-2x2', ''], ['drill-3x3', ''], ['furnace-stone', ''], ['furnace-steel', ''],
    ['furnace-steel-b', ''], ['boiler', ''], ['steam-engine', ''],
  ], { done: true }),
  S('03', 'inserter', 'Inserter parts', 0, 'object', [
    ['inserter-base', ''], ['inserter-arm', ''], ['inserter-arm-b', ''], ['inserter-arm-open', ''],
  ], { done: true }),

  // ---------------- ITEM ICONS ----------------
  S('04', 'raw-and-plates', 'Raw resources and plates', 1, 'icon', [
    ['ore-iron', 'chunk of blue-grey iron ore'], ['ore-copper', 'chunk of orange copper ore'],
    ['coal', 'glossy black coal lump'], ['stone', 'pale rough stone rock'],
    ['plate-iron', 'stacked iron ingot plate'], ['plate-copper', 'copper plate'],
    ['plate-steel', 'heavier steel plate, bluish'], ['brick', 'red-brown stone brick'],
    ['sand', 'small heap of pale sand'], ['glass', 'clear glass pane, slightly green'],
    ['sulfur', 'yellow crystalline sulfur lump'], ['scrap', 'crumpled scrap metal'],
  ]),
  S('05', 'intermediates-1', 'Intermediate products (basic)', 1, 'icon', [
    ['gear', 'iron cog gear'], ['cable-copper', 'coil of copper cable'], ['rod-iron', 'short iron rod'],
    ['pipe-item', 'short steel pipe section'], ['circuit', 'green circuit board with chips'],
    ['circuit-advanced', 'red circuit board, denser chips'], ['plastic', 'white plastic bar'],
    ['battery', 'cylindrical battery with orange cap'], ['motor', 'small electric motor'],
    ['engine', 'piston engine block'], ['frame-basic', 'plain metal structural frame'], ['spring-coil', 'steel spring coil'],
  ]),
  S('06', 'intermediates-2', 'Intermediate products (advanced)', 3, 'icon', [
    ['processor', 'blue processor chip board'], ['frame-advanced', 'advanced titanium-look frame'],
    ['structure-light', 'lightweight lattice structure'], ['fuel-solid', 'block of solid fuel'],
    ['fuel-rocket', 'glowing rocket fuel canister'], ['control-unit', 'rocket control unit, chip in a case'],
    ['explosives', 'block of explosives with a fuse'], ['engine-electric', 'electric engine unit'],
    ['robot-frame', 'flying robot frame'], ['barrel-lubricant', 'green barrel'],
    ['barrel-acid', 'yellow hazard barrel'], ['barrel-empty', 'empty steel barrel'],
  ]),
  S('07', 'science', 'Science packs', 1, 'icon', [
    ['sci-red', 'glass flask with glowing red liquid'], ['sci-green', 'glass flask with glowing green liquid'],
    ['sci-blue', 'glass flask with glowing blue liquid'], ['sci-purple', 'glass flask with glowing purple liquid'],
    ['sci-yellow', 'glass flask with glowing yellow liquid'], ['sci-white', 'glass flask with glowing white liquid'],
    ['sci-military', 'black flask with a red target mark'], ['sci-space', 'flask with swirling starry contents'],
    ['sci-data', 'small data-disc in a case'],
  ]),
  S('08', 'ammo-weapons', 'Ammo and consumables', 2, 'icon', [
    ['ammo-basic', 'bullet magazine, brass'], ['ammo-piercing', 'magazine with dark steel tips'],
    ['ammo-shell', 'cannon shell'], ['ammo-explosive-shell', 'shell with orange band'],
    ['grenade', 'hand grenade'], ['mine-item', 'landmine disc'], ['ammo-flame', 'flame fuel tank'],
    ['ammo-rocket', 'small rocket'], ['ammo-laser-battery', 'glowing laser battery cell'],
    ['capsule-repair', 'repair pack, wrench cross'], ['capsule-heal', 'medical injector, green cross'],
    ['capsule-shield', 'blue shield capsule'],
  ]),
  S('09', 'equipment', 'Tools and equipment', 3, 'icon', [
    ['pickaxe', 'iron pickaxe'], ['hammer-repair', 'repair hammer'], ['armor-light', 'light armour vest'],
    ['armor-heavy', 'heavy armour chestplate'], ['exoskeleton', 'exoskeleton leg module'],
    ['shield-module', 'energy shield emitter'], ['nightvision', 'night vision goggles'],
    ['battery-personal', 'personal battery pack'], ['solar-personal', 'wearable solar panel'],
    ['blueprint', 'rolled blueprint sheet'], ['blueprint-book', 'closed blueprint book'],
    ['deconstruction-planner', 'planner tablet with red cross'],
  ]),
  S('10', 'fluids', 'Fluid icons', 2, 'icon', [
    ['water', 'droplet of water'], ['crude-oil', 'black oil droplet'], ['petroleum-gas', 'purple gas wisp'],
    ['light-oil', 'amber oil droplet'], ['heavy-oil', 'dark red oil droplet'], ['lubricant', 'green oil droplet'],
    ['sulfuric-acid', 'yellow acid droplet'], ['steam', 'white steam cloud'], ['coolant', 'cyan liquid droplet'],
    ['plastic-melt', 'grey molten blob'], ['fuel-liquid', 'orange fuel droplet'], ['poison-gas', 'sickly green gas cloud'],
  ]),
  S('11', 'modules', 'Upgrade modules', 3, 'icon', [
    ['mod-speed-1', 'small square module chip, blue accent, one pip'], ['mod-speed-2', 'blue accent, two pips'],
    ['mod-speed-3', 'blue accent, three pips'], ['mod-efficiency-1', 'green accent, one pip'],
    ['mod-efficiency-2', 'green accent, two pips'], ['mod-efficiency-3', 'green accent, three pips'],
    ['mod-productivity-1', 'purple accent, one pip'], ['mod-productivity-2', 'purple accent, two pips'],
    ['mod-productivity-3', 'purple accent, three pips'], ['module-blank', 'blank grey module chip'],
    ['module-socket', 'empty module socket slot'], ['module-beacon', 'antenna module with pulse rings'],
  ]),

  // ---------------- BUILDINGS ----------------
  S('12', 'belts-tier2', 'Faster belts', 1, 'object', [
    ['belt-fast-straight', 'straight belt tile, RED accent arrows, 1x1 tile'], ['belt-fast-curve', 'curved belt tile, red accents (turns right to down), 1x1'],
    ['splitter-fast', 'splitter with red accents, points right, 1x2'], ['underground-fast', 'underground belt entrance, red accents, points right, 1x1'],
    ['belt-express-straight', 'straight belt tile, BLUE glowing accent arrows, 1x1'], ['belt-express-curve', 'curved belt tile, blue accents (right to down), 1x1'],
    ['splitter-express', 'splitter with blue accents, points right, 1x2'], ['underground-express', 'underground belt entrance, blue accents, points right, 1x1'],
  ], { note: 'Match the exact shape and proportions of the attached sheet-01 belts; only the accent colour and slightly heavier armour change.' }),
  S('13', 'inserter-tiers', 'Inserter upgrades', 1, 'object', [
    ['inserter-long-base', 'mounting plate + hub for a LONG inserter, 1x1'], ['inserter-long-arm', 'long two-segment arm with claw, pointing right, pivot circle at left end'],
    ['inserter-fast-base', 'mounting plate with blue trim, 1x1'], ['inserter-fast-arm', 'sleek arm with blue trim, pointing right, pivot circle at left end'],
    ['inserter-filter-arm', 'arm with a small scanner eye and pink trim, pointing right'], ['inserter-stack-base', 'heavy mounting plate with yellow trim, 1x1'],
    ['inserter-stack-arm', 'heavy arm with a wide multi-finger claw, closed, pointing right'], ['inserter-stack-arm-open', 'same heavy arm with the wide claw open'],
  ], { note: 'Match sheet-03 (the inserter parts) exactly in scale and construction.' }),
  S('14', 'power-distribution', 'Power distribution', 1, 'object', [
    ['pole-medium', 'medium power pole with cross-arm, 1x1'], ['pole-big', 'tall lattice pylon seen from above, 2x2'],
    ['substation', 'boxy substation with coils, 2x2'], ['lamp-off', 'floor lamp, unlit, 1x1'],
    ['lamp-on', 'same floor lamp glowing warm yellow-white, 1x1'], ['switch-power', 'heavy power switch box with a lever, 1x1'],
    ['accumulator', 'battery bank with terminals, 2x2'], ['transformer', 'transformer with coils and insulators, 2x2'],
  ]),
  S('15', 'power-generation', 'Power generation', 1, 'object', [
    ['offshore-pump', 'pump on a small platform with an intake pipe, 1x2'], ['solar-panel', 'dark blue photovoltaic grid in a metal frame, 3x3'],
    ['steam-turbine', 'long turbine housing with fan blades and a generator end, 3x5, lying horizontally'], ['nuclear-reactor', 'fortified reactor with glowing green core hatches, 5x5'],
    ['heat-exchanger', 'boxy exchanger with pipes, 3x2, lying horizontally'], ['heat-pipe', 'straight glowing heat pipe, 1x1 tile'],
    ['generator-diesel', 'diesel generator with exhaust stack, 2x3'], ['wind-turbine', 'top-down wind turbine with three blades, 3x3'],
  ]),
  S('16', 'pipes-pumps', 'Pipes and pumps', 2, 'object', [
    ['pipe-straight', 'straight steel pipe tile, horizontal, 1x1'], ['pipe-corner', 'pipe elbow tile connecting right to down, 1x1'],
    ['pipe-t', 'T-junction pipe tile, 1x1'], ['pipe-cross', 'four-way pipe cross tile, 1x1'],
    ['pipe-end', 'pipe cap end tile, opening on the right, 1x1'], ['pipe-underground', 'underground pipe entrance, opening right, 1x1'],
    ['pump', 'inline fluid pump with motor housing, 1x2'], ['tank-storage', 'round steel storage tank seen from above, 3x3'],
  ]),
  S('17', 'crafters', 'Crafting and research machines', 1, 'object', [
    ['assembler-1', 'assembling machine, central platform, two robotic arms, small screen, 3x3'], ['assembler-2', 'advanced assembler, more pipes, blue status light, 3x3'],
    ['assembler-3', 'top-tier assembler, sleek, glowing cyan core, 3x3'], ['lab', 'research lab, glass dome over a glowing core, sample trays, 3x3'],
    ['lab-2', 'upgraded lab with two domes and a dish, 3x3'], ['chem-plant', 'chemical plant with tanks and pipes, 3x3'],
    ['refinery', 'oil refinery with distillation columns and flare, 5x5'], ['centrifuge', 'ring-shaped centrifuge machine, 3x3'],
  ]),
  S('18', 'furnaces-drills', 'Upgraded smelters and drills', 1, 'object', [
    ['furnace-electric', 'sleek electric furnace with glowing coil vents, 3x3'], ['drill-burner', 'crude burner drill with a chimney, 2x2, output chute right'],
    ['drill-electric', 'electric mining drill with three drill bits, 3x3, output chute right'], ['drill-big', 'huge industrial drill, five bits, 5x5, output chute right'],
    ['pumpjack', 'oil pumpjack with a nodding beam, seen from above, 3x3'], ['furnace-foundry', 'large casting foundry with molten channel, 4x4'],
  ], { note: 'Same dark riveted look as attached sheet-02 machines.' }),
  S('19', 'chests-logistics', 'Storage and logistic chests', 2, 'object', [
    ['chest-buffer', 'green-trimmed chest, 1x1'], ['chest-requester', 'blue-trimmed chest with an inbound arrow, 1x1'],
    ['chest-provider-passive', 'red-trimmed chest, 1x1'], ['chest-provider-active', 'purple-trimmed chest, 1x1'],
    ['chest-storage-robot', 'yellow-trimmed chest, 1x1'], ['warehouse', 'large warehouse roof with hatches, 3x3'],
    ['silo-storage', 'round grain-style silo seen from above, 3x3'], ['crate-small', 'small wooden crate, 1x1'],
  ], { note: 'Match the chest style of sheet-01 (iron bands, pedestal base).' }),
  S('20', 'robots', 'Robots and roboports', 3, 'object', [
    ['robot-construction', 'small flying builder robot with rotors, top-down, facing right'], ['robot-logistic', 'small flying courier robot with a cargo clamp, top-down, facing right'],
    ['roboport', 'square robot station with a central pad and antennae, 4x4'], ['charging-pad', 'small charging pad with contacts, 1x1'],
    ['robot-repair', 'flying repair robot with a wrench arm, top-down, facing right'], ['robot-cargo', 'larger cargo drone with a hold, top-down, facing right'],
  ]),
  S('21', 'trains', 'Trains and rails', 3, 'object', [
    ['rail-straight', 'straight rail tile, horizontal, sleepers and two rails, 1x1'], ['rail-curve', 'curved rail tile connecting right to down, 1x1'],
    ['rail-junction', 'rail switch junction tile, 1x1'], ['train-stop', 'train stop station platform with a signal box, 2x2'],
    ['signal-rail', 'rail signal post with a red/green lamp, 1x1'], ['signal-chain', 'chain signal post with a blue lamp, 1x1'],
    ['locomotive', 'diesel locomotive seen from above, pointing right, 2x6'], ['wagon-cargo', 'open cargo wagon, pointing right, 2x6'],
    ['wagon-fluid', 'tank wagon with a round tank, pointing right, 2x6'],
  ]),
  S('22', 'vehicles', 'Vehicles', 3, 'creature', [
    ['car', 'rugged armoured buggy with a roof gun, top-down, facing right'], ['tank', 'heavy tank with a big turret, top-down, facing right'],
    ['mech-walker', 'four-legged walker mech, top-down, facing right'], ['hover-truck', 'flat hover cargo truck, top-down, facing right'],
    ['mining-rover', 'six-wheeled mining rover with a scoop, top-down, facing right'], ['scout-bike', 'light hover bike, top-down, facing right'],
  ]),

  // ---------------- DEFENCE + ENEMIES ----------------
  S('23', 'turrets', 'Turrets', 2, 'object', [
    ['turret-gun-base', 'round armoured pedestal, no barrel, 2x2'], ['turret-gun-barrel', 'twin gun barrels pointing right, pivot at the left end'],
    ['turret-flame-base', 'squat pedestal with fuel tank, 2x2'], ['turret-flame-nozzle', 'flame nozzle pointing right, pivot at the left end'],
    ['turret-laser-base', 'sleek pedestal with capacitor coils, 2x2'], ['turret-laser-lens', 'laser emitter with a glowing lens pointing right, pivot at left end'],
    ['turret-rocket-base', 'heavy pedestal with ammo drums, 3x3'], ['turret-rocket-launcher', 'rocket launcher tubes pointing right, pivot at left end'],
    ['turret-artillery-base', 'huge armoured artillery platform, 3x3'], ['turret-artillery-barrel', 'long artillery cannon pointing right, pivot at left end'],
  ], { note: 'Every barrel/nozzle/lens is drawn as its own separate object pointing right so it can rotate in the engine.' }),
  S('24', 'walls-defence', 'Walls and defences', 2, 'object', [
    ['wall-straight', 'concrete wall segment, horizontal, 1x1'], ['wall-corner', 'wall corner piece connecting right to down, 1x1'],
    ['wall-t', 'wall T-junction, 1x1'], ['wall-cross', 'wall four-way cross, 1x1'], ['wall-end', 'wall end cap, 1x1'],
    ['gate-closed', 'closed steel gate, horizontal, 1x1'], ['gate-open', 'the same gate opened, 1x1'],
    ['landmine', 'round landmine with a blinking light, 1x1'], ['radar', 'radar dish, 3x3'],
    ['shield-projector', 'dome-shaped energy shield projector, 3x3'],
  ]),
  S('25', 'enemies-small', 'Enemies: small (rogue automata)', 2, 'creature', [
    ['enemy-crawler-1', 'small scuttling crawler drone, four legs, rusty'], ['enemy-crawler-2', 'bigger crawler, armour plates'],
    ['enemy-crawler-3', 'large crawler, glowing red seams'], ['enemy-spider-1', 'six-legged spider-walker, red eye'],
    ['enemy-spider-2', 'spider-walker with blade legs'], ['enemy-spider-3', 'heavy spider-walker with twin lasers'],
    ['enemy-drone-1', 'flying scout drone, rotors, top-down'], ['enemy-drone-2', 'armed flying drone with gun pods'],
    ['enemy-drone-3', 'heavy bomber drone with bomb bay'], ['enemy-swarmling', 'tiny swarm bot, very small'],
  ], { note: 'All corroded, sooty, ember-glow accents. Clearly distinct silhouettes per tier.' }),
  S('26', 'enemies-large', 'Enemies: large and bosses', 2, 'creature', [
    ['enemy-brute-1', 'heavy armoured walker'], ['enemy-brute-2', 'bigger brute with shoulder cannons'],
    ['enemy-brute-3', 'huge brute with a siege ram'], ['enemy-spitter-1', 'acid spitter automaton with a bulging tank'],
    ['enemy-spitter-2', 'larger spitter with two tanks'], ['enemy-spitter-3', 'huge spitter with a rotating acid cannon'],
    ['enemy-bomber', 'winged bomber machine'], ['enemy-boss-colossus', 'gigantic colossus walker with multiple weapons'],
    ['enemy-boss-queen', 'hive queen, huge mechanical-organic nest mother'],
  ]),
  S('27', 'nests', 'Enemy nests and worms', 2, 'object', [
    ['nest-small', 'small scrap-and-cable nest mound, 3x3'], ['nest-medium', 'larger nest with antennae, 4x4'],
    ['nest-large', 'huge nest fortress, 6x6'], ['spawner-pod', 'pod that spawns enemies, 2x2'],
    ['nest-egg-cluster', 'cluster of glowing egg pods, 2x2'], ['worm-small', 'small burrowing worm turret, mouth open, 2x2'],
    ['worm-medium', 'medium worm turret, 3x3'], ['worm-big', 'giant worm turret, 4x4'],
    ['nest-scrap-pile', 'pile of scrap used as nest decoration, 2x2'], ['nest-antenna', 'tall signal antenna seen from above, 1x1'],
  ]),
  S('28', 'player-8dir', 'Player engineer, 8 directions', 1, 'creature', [
    ['player-e', 'engineer facing right (east)'], ['player-se', 'facing down-right'], ['player-s', 'facing down (south, toward viewer)'],
    ['player-sw', 'facing down-left'], ['player-w', 'facing left'], ['player-nw', 'facing up-left'],
    ['player-n', 'facing up (away)'], ['player-ne', 'facing up-right'],
  ], { note: 'The SAME character in all eight directions: hard hat, backpack, tool belt, gloves. Identical scale and proportions.' }),
  S('29', 'player-actions', 'Player engineer, actions', 2, 'creature', [
    ['player-mining', 'engineer swinging a pickaxe, facing right'], ['player-shooting', 'engineer aiming a rifle, facing right'],
    ['player-building', 'engineer holding a wrench over a machine, facing right'], ['player-carrying', 'engineer carrying a crate, facing right'],
    ['player-dead', 'engineer collapsed on the ground'], ['player-swimming', 'engineer wading, upper body only, facing right'],
    ['player-driving', 'engineer seated (helmet and shoulders only), facing right'], ['player-celebrate', 'engineer with arms raised'],
  ], { note: 'Same character, scale and proportions as the 8-direction sheet.' }),

  // ---------------- EFFECTS ----------------
  S('30', 'fx-combat', 'Combat effects', 2, 'fx', [
    ['fx-muzzle-flash', 'yellow-white muzzle flash pointing right'], ['fx-explosion-small', 'small orange explosion burst'],
    ['fx-explosion-medium', 'medium explosion with smoke ring'], ['fx-explosion-large', 'large fiery explosion'],
    ['fx-smoke-1', 'grey smoke puff'], ['fx-smoke-2', 'darker smoke puff, different shape'], ['fx-spark', 'yellow-white spark burst'],
    ['fx-fire', 'small flame cluster'], ['fx-acid-splash', 'green acid splash'], ['fx-oil-splat', 'black oily splat'],
  ]),
  S('31', 'fx-world', 'World effects', 2, 'fx', [
    ['fx-electric-arc', 'blue-white lightning arc'], ['fx-laser-hit', 'red laser impact flare'], ['fx-heal-glow', 'soft green healing glow with plus sparkles'],
    ['fx-build-sparkle', 'orange welding sparkle burst'], ['fx-dust', 'brown dust cloud'], ['fx-radiation', 'sickly green radiation glow ring'],
    ['fx-steam-puff', 'white steam puff'], ['fx-ember', 'cluster of floating embers'], ['fx-fog-wisp', 'thin grey fog wisp'],
    ['fx-target-marker', 'glowing ring placement marker'],
  ]),
  S('32', 'projectiles', 'Projectiles', 2, 'fx', [
    ['proj-bullet', 'small brass bullet with a short tracer, pointing right'], ['proj-piercing', 'dark steel bullet, orange tracer, pointing right'],
    ['proj-rocket', 'small rocket with exhaust flame, pointing right'], ['proj-shell', 'cannon shell, pointing right'],
    ['proj-flame', 'jet of flame puff, pointing right'], ['proj-acid', 'glob of green acid, pointing right'],
    ['proj-laser', 'red laser bolt, pointing right'], ['proj-plasma', 'blue plasma bolt, pointing right'],
    ['proj-grenade', 'thrown grenade, top-down'], ['proj-artillery', 'large artillery shell, pointing right'],
  ]),

  // ---------------- TILES AND WORLD ----------------
  S('33', 'ground-ash', 'Ground tiles: ash and scorch', 1, 'tile', [
    ['ground-1', 'dark ash-covered ground'], ['ground-2', 'ash ground, subtle variation'], ['ground-3', 'ash ground with faint cracks'],
    ['ground-4', 'ash ground with scattered pebbles'], ['scorched-1', 'cracked scorched earth'], ['scorched-2', 'scorched earth with glowing cracks'],
    ['ash-drift-1', 'wind-blown pale ash drift'], ['ash-drift-2', 'ash drift, different pattern'], ['gravel-1', 'grey gravel'],
    ['gravel-2', 'gravel with rust stains'], ['rubble-1', 'small broken rubble'], ['rubble-2', 'rubble with rusted metal bits'],
  ], { note: 'These must repeat without visible seams. Keep edges calm, put the detail in the middle.' }),
  S('34', 'ore-fields', 'Ore field tiles', 1, 'tile', [
    ['ore-tile-iron-1', 'blue-grey iron ore clusters on ash'], ['ore-tile-iron-2', 'iron ore, different cluster layout'],
    ['ore-tile-copper-1', 'orange-brown copper ore clusters on ash'], ['ore-tile-copper-2', 'copper ore, different layout'],
    ['ore-tile-coal-1', 'glossy black coal clusters on ash'], ['ore-tile-coal-2', 'coal, different layout'],
    ['ore-tile-stone-1', 'pale rock clusters on ash'], ['ore-tile-stone-2', 'pale rock, different layout'],
    ['ore-tile-uranium-1', 'faintly glowing green ore clusters'], ['ore-tile-uranium-2', 'green ore, different layout'],
    ['ore-tile-scrap-1', 'rusty scrap metal debris field'], ['ore-tile-scrap-2', 'scrap debris, different layout'],
  ], { note: 'Ore clusters should stop short of the tile edge so tiles can sit side by side.' }),
  S('51', 'walls-extra', 'Wall pieces: single block and damage states', 1, 'object', [
    ['wall-single', 'a single free-standing wall block, riveted dark steel and concrete, 1x1, no connections on any side'],
    ['wall-damaged-1', 'the same wall block lightly damaged: scorch marks and a small crack, 1x1'],
    ['wall-damaged-2', 'the same wall block heavily damaged: big cracks, missing chunk, glowing embers in the gaps, 1x1'],
    ['wall-rubble', 'a small pile of broken wall rubble left after a wall is destroyed, 1x1'],
    ['turret-damaged-smoke', 'a smoking scorch mark and sparks decal to lay on top of a damaged gun turret, 2x2'],
  ], { note: 'These are 1x1 tile pieces for walls, all in exactly the same style, size and viewing angle so the damage states can replace each other on the map.' }),
  S('52', 'obstacle-rocks', 'Obstacles: boulders', 1, 'object', [
    ['rock-1', 'a single dark weathered boulder, rounded, about 1x1 tile, lit from the top-left, soft contact shadow underneath'],
    ['rock-2', 'a single jagged angular boulder with a flat top, about 1x1 tile'],
    ['rock-3', 'a single boulder with a long crack and a few small stones beside it, about 1x1 tile'],
    ['rock-4', 'a single tall pointed rock spire seen from above with long shadow, about 1x1 tile'],
    ['rock-5', 'two small boulders touching each other, about 1x1 tile'],
    ['rock-6', 'a flat slab of rock with a chipped edge, about 1x1 tile'],
    ['rock-7', 'a single rust-stained boulder with ember-orange mineral veins, about 1x1 tile'],
    ['rock-8', 'a single ash-covered boulder, half buried in grey ash, about 1x1 tile'],
    ['rock-cluster-1', 'a tight heap of four boulders of different sizes, about 2x2 tiles'],
    ['rock-cluster-2', 'a low rocky outcrop with a ridge running across it, about 2x2 tiles'],
    ['rock-cluster-3', 'a pile of scattered rubble and three boulders, about 2x2 tiles'],
    ['rock-cluster-4', 'a large rock formation with a cleft down the middle, about 2x2 tiles'],
  ], { note: 'These are obstacles the player cannot build on or walk through. They must read instantly as solid, heavy and natural, and be clearly different from the player\'s metal machines. Keep the palette cool grey-brown with only a little ember-orange. All objects lit from the top-left.' }),
  S('53', 'obstacle-trees', 'Obstacles: burnt trees and stumps', 1, 'object', [
    ['tree-1', 'a burnt dead tree seen from above: a charred black trunk with bare twisting branches spreading out, a few glowing embers, about 1x1 tile'],
    ['tree-2', 'a different burnt tree with thin crooked branches and a split trunk, about 1x1 tile'],
    ['tree-3', 'a burnt tree leaning, branches mostly snapped off, about 1x1 tile'],
    ['tree-4', 'a large charred tree with many spreading branches and a smouldering crown, about 1x1 tile'],
    ['tree-5', 'a cluster of three thin blackened dead saplings, about 1x1 tile'],
    ['tree-6', 'a fallen charred log with snapped branches, about 1x1 tile'],
    ['stump-1', 'a burnt tree stump with split wood and a few embers, about 1x1 tile'],
    ['stump-2', 'a large hollow charred stump, about 1x1 tile'],
    ['tree-7', 'a burnt tree with a few remaining sickly pale-green leaves, about 1x1 tile'],
    ['tree-8', 'a tangled thorny dead bush of black twigs, about 1x1 tile'],
  ], { note: 'Burnt, dead trees for an ash-covered wasteland. Seen directly from above, so you look down on the branches. Mostly black and dark brown, with tiny ember glows. No leaves except where stated. Thick dark outline like the reference.' }),
  S('54', 'obstacle-tar-fill', 'Obstacles: tar pit surface', 1, 'tile', [
    ['tar-fill-1', 'a seamless square tile of thick black tar with a dull oily rainbow sheen and a few slow ripples'],
    ['tar-fill-2', 'a seamless square tile of black tar with two small bubbles and a soft blue-violet sheen'],
    ['tar-fill-3', 'a seamless square tile of black tar with a faint swirl pattern'],
    ['tar-fill-4', 'a seamless square tile of black tar with a few tiny ember-orange reflections'],
  ]),
  S('55', 'obstacle-tar-rim', 'Obstacles: tar pit edges and bubbles', 1, 'object', [
    ['tar-rim-straight', 'a straight 1x1 piece of the edge of a tar pit: black tar on one side, a crusty lip of dried tar and pebbles on the other, tar on the bottom half of the tile'],
    ['tar-rim-corner-out', 'a 1x1 outside corner of a tar pit edge: the tar curves away, with a crusty lip of dried tar and pebbles'],
    ['tar-rim-corner-in', 'a 1x1 inside corner of a tar pit edge: tar fills most of the tile with a crusty lip in one corner'],
    ['tar-rim-end', 'a 1x1 rounded end of a narrow tar channel with a crusty lip of dried tar'],
    ['fx-tar-bubble', 'a single glossy tar bubble about to pop, seen from above, with a ring ripple'],
    ['fx-tar-burst', 'a small burst of tar droplets from a popped bubble, seen from above'],
  ], { note: 'Edge pieces for tar pits, drawn so they tile together with a flat black tar fill. The tar colour must match: near-black with a faint blue-violet sheen.' }),
  S('56', 'drill-wide', 'Mining drill, 3x2', 1, 'object', [
    ['miner-wide', 'a heavy industrial mining drill seen from above, 3 tiles wide and 2 tiles tall: a big rotating drill head with teeth in the centre, a hopper box at each end, riveted metal plating, and a glowing amber output port in the middle of the top edge and in the middle of the bottom edge'],
    ['miner-wide-active', 'the same 3x2 mining drill with the drill head blurred as if spinning, sparks and ore dust around it, the output ports glowing brighter'],
  ], { note: 'One 3x2 drill, drawn horizontally (3 wide, 2 tall). The two glowing output ports must be exactly in the middle of the two long edges. Rusted dark metal with ember-orange glow accents like the reference.' }),
  S('35', 'terrain', 'Terrain features', 2, 'tile', [
    ['water-deep', 'dark deep water'], ['water-shallow', 'lighter shallow murky water'], ['water-toxic', 'toxic green pool'],
    ['lava-crack', 'black rock with glowing lava cracks'], ['cliff-straight', 'straight cliff edge, dark rock face at the bottom'],
    ['cliff-corner-out', 'outer cliff corner'], ['cliff-corner-in', 'inner cliff corner'], ['cliff-cap', 'cliff end cap'],
    ['dune', 'rippled ash dune'], ['crater', 'impact crater'], ['salt-flat', 'pale cracked salt flat'], ['mud', 'wet dark mud'],
  ]),
  S('36', 'decor', 'World decoration', 2, 'object', [
    ['rock-small', 'small dark boulder, 1x1'], ['rock-medium', 'medium boulder, 2x2'], ['rock-large', 'large rock formation, 3x3'],
    ['dead-tree-1', 'charred dead tree seen from above, 2x2'], ['dead-tree-2', 'different charred tree, 2x2'], ['dead-tree-3', 'burnt stump, 1x1'],
    ['ash-bush', 'grey dry bush, 1x1'], ['bones', 'scattered bones, 1x1'], ['wreck-machine', 'rusted wrecked machine, 2x2'],
    ['fungus', 'pale glowing fungus cluster, 1x1'], ['scrap-pile', 'pile of scrap metal, 2x2'], ['crater-rim', 'small crater with a raised rim, 2x2'],
  ]),
  S('37', 'landmarks', 'Landmarks and endgame', 2, 'object', [
    ['crashed-ship', 'wrecked crashed spaceship hull, half burnt, 8x6'], ['launch-pad', 'hexagonal steel launch pad with hazard-stripe edges, 5x5'],
    ['rocket-silo', 'huge rocket silo with opening doors, 9x9'], ['rocket', 'tall rocket seen from above, pointing up, 2x6'],
    ['satellite', 'solar-winged satellite, 3x3'], ['beacon-tower', 'signal beacon tower seen from above, 2x2'],
  ]),

  // ---------------- UI ----------------
  S('38', 'ui-icons-a', 'UI icons: main menu', 1, 'ui', [
    ['ui-settings', 'gear'], ['ui-build', 'wrench'], ['ui-research', 'flask'], ['ui-combat', 'crossed swords'],
    ['ui-inventory', 'backpack'], ['ui-pause', 'pause bars'], ['ui-play', 'play triangle'], ['ui-speed', 'double chevrons'],
    ['ui-save', 'floppy disk'], ['ui-warning', 'warning triangle with exclamation mark shape (no letters)'], ['ui-power', 'lightning bolt'], ['ui-map', 'folded map'],
  ]),
  S('39', 'ui-icons-b', 'UI icons: utility', 2, 'ui', [
    ['ui-close', 'X mark'], ['ui-check', 'tick mark'], ['ui-arrow', 'right arrow'], ['ui-plus', 'plus sign'],
    ['ui-minus', 'minus sign'], ['ui-trash', 'bin'], ['ui-rotate', 'circular arrow'], ['ui-lock', 'padlock'],
    ['ui-eye', 'eye'], ['ui-search', 'magnifying glass'], ['ui-star-full', 'filled gold star (commander star rating)'],
    ['ui-star-empty', 'empty outlined grey star (an unearned star)'], ['ui-clock', 'clock face without numbers'],
  ]),
  S('40', 'ui-frames', 'UI frames (flat elements)', 2, 'ui', [
    ['ui-panel', 'large rectangular panel frame with corner rivets, empty inside'], ['ui-button', 'wide rectangular button, normal state, empty'],
    ['ui-button-hover', 'same button, lit orange edge'], ['ui-button-pressed', 'same button, pressed in'],
    ['ui-slot', 'square inventory slot, empty'], ['ui-slot-selected', 'same slot with an orange selection outline'],
    ['ui-bar-frame', 'long thin progress bar frame, empty'], ['ui-bar-fill', 'long thin ember-orange bar fill'],
    ['ui-tooltip', 'small rectangular tooltip frame with a pointer notch'], ['ui-banner', 'wide title banner plate, empty'],
  ], { note: 'Flat front-on UI art, NOT top-down machines. No text anywhere.' }),
  S('41', 'tech-icons', 'Research tree icons', 2, 'ui', [
    ['tech-automation', 'assembler arm'], ['tech-logistics', 'conveyor belt'], ['tech-electricity', 'lightning pole'],
    ['tech-steel', 'steel ingot with flame'], ['tech-oil', 'oil drop and derrick'], ['tech-fluids', 'pipe and valve'],
    ['tech-military', 'bullet'], ['tech-armor', 'shield'], ['tech-rail', 'rail track'], ['tech-robots', 'flying robot'],
    ['tech-lasers', 'laser beam'], ['tech-nuclear', 'atom symbol'], ['tech-productivity', 'gear with up arrow'],
    ['tech-speed', 'gear with a lightning streak'], ['tech-rocketry', 'rocket'], ['tech-toolbelt', 'belt with pouches'],
  ]),
  S('42', 'badges', 'Achievement badges', 3, 'ui', [
    ['badge-first-plate', 'badge with an iron plate'], ['badge-first-belt', 'badge with a belt'], ['badge-power-on', 'badge with a bolt'],
    ['badge-first-science', 'badge with a flask'], ['badge-100-machines', 'badge with a stack of machines'], ['badge-survivor', 'badge with a shield'],
    ['badge-nest-cleared', 'badge with a broken nest'], ['badge-oil', 'badge with an oil drop'], ['badge-trains', 'badge with a train'],
    ['badge-robots', 'badge with a robot'], ['badge-rocket', 'badge with a rocket'], ['badge-perfect', 'gold star badge'],
  ]),
];

// Gemini doesn't always return exactly the requested objects. Where a generated sheet differs from the plan,
// `actual` lists what is really on it in reading order; null = discard (junk or a corrupted object).
const ACTUAL = {
  '07': ['sci-red', 'sci-green', 'sci-blue', 'sci-pink', 'sci-purple', 'sci-yellow', 'sci-white', 'sci-white-b', 'sci-military', 'sci-space', 'sci-disc', 'sci-data'],
  // v2 of sheet 12: 7 good belts; the 8th (express underground) had a power pole drawn over it, so it is discarded
  '12': ['belt-fast-straight', 'belt-fast-curve', 'splitter-fast', 'underground-fast', 'belt-express-straight', 'belt-express-curve', 'splitter-express', null],
  '13': ['inserter-long-base', 'inserter-long-arm', 'inserter-fast-base', 'inserter-fast-arm', 'inserter-filter-arm', 'inserter-stack-base', 'inserter-stack-arm', null, 'inserter-stack-base-b', 'inserter-stack-arm-open'],
  '15': ['offshore-pump', 'solar-panel', 'steam-turbine', 'nuclear-reactor', 'heat-exchanger', 'heat-exchanger-b', 'heat-pipe', 'generator-diesel', 'wind-turbine'],
  // 23: eleven objects, the extra (index 8) is a cannon head on an octagonal mount that wasn't asked for
  '23': ['turret-gun-base', 'turret-gun-barrel', 'turret-flame-base', 'turret-flame-nozzle', 'turret-laser-base', 'turret-laser-lens',
    'turret-rocket-base', 'turret-rocket-launcher', 'turret-cannon-mount', 'turret-artillery-base', 'turret-artillery-barrel'],
  // 30: nine effects (no light grey smoke); the medium explosion's smoke ring floats apart from its core
  '30': ['fx-muzzle-flash', 'fx-explosion-small', 'fx-explosion-medium', 'fx-explosion-large', 'fx-smoke-2', 'fx-spark', 'fx-fire', 'fx-acid-splash', 'fx-oil-splat'],
  // 18 came back with a caption under every machine (dropped by the min-size filter) and detached drill chutes
  '18': ['furnace-electric', 'drill-burner', 'drill-electric', 'drill-big', 'pumpjack', 'furnace-foundry'],
  // 28: Gemini drew south twice and no west. West is made by mirroring east (see MIRROR below).
  '28': ['player-s', 'player-se', 'player-s-b', 'player-sw', 'player-e', 'player-ne', 'player-n', 'player-nw'],
  // 33 and 34: five columns of three, so 15 tiles instead of 12
  '33': ['ground-1', 'ground-2', 'ground-3', 'ground-4', 'ground-5', 'scorched-1', 'scorched-2', 'ash-drift-1', 'ash-drift-2',
    'gravel-1', 'gravel-2', 'gravel-3', 'rubble-1', 'rubble-2', 'rubble-3'],
  '34': ['ore-tile-iron-1', 'ore-tile-iron-2', 'ore-tile-copper-1', 'ore-tile-copper-2', 'ore-tile-copper-3',
    'ore-tile-coal-1', 'ore-tile-coal-2', 'ore-tile-stone-1', 'ore-tile-stone-2', 'ore-tile-stone-3',
    'ore-tile-uranium-1', 'ore-tile-uranium-2', 'ore-tile-scrap-1', 'ore-tile-scrap-2', 'ore-tile-scrap-3'],
  // 38: doubled swords and chevrons, and a blank grey square at the end
  '38': ['ui-settings', 'ui-build', 'ui-research', 'ui-combat', 'ui-combat-b', 'ui-inventory', 'ui-pause', 'ui-play', 'ui-speed', 'ui-speed-b',
    'ui-save', 'ui-warning', 'ui-power', 'ui-map', null],
};

// Per-sheet slicer settings: dilate = how far apart (px) pieces of one object may be; mirror = new sprite made by flipping another.
const OPTS = {
  '18': { dilate: 14 },
  '28': { mirror: { 'player-w': 'player-e' } },
  // 25 has a two-line caption under every creature; captions are thinner than 100px
  '25': { minSide: 100 },
  '43': { minSide: 20 }, // the bullet casing is a thin object
  '32': { minSide: 14, dilate: 4 }, // small bullets with soft trails; keep the two bullets from merging
  // 30: soft glows overlap, so cut by hand (sheet is 1024 px wide): muzzle flash starts right of the barrel stub on the edge
  '30': { boxes: [[45, 55, 250, 195], [280, 65, 410, 195], [480, 10, 730, 260], [740, 5, 1010, 262], [10, 340, 200, 540],
    [205, 335, 415, 535], [425, 380, 600, 510], [615, 345, 815, 540], [820, 345, 1020, 545]] },
};
for (const s of SHEETS) if (OPTS[s.id]) Object.assign(s, OPTS[s.id]);
for (const s of SHEETS) if (ACTUAL[s.id]) s.actual = ACTUAL[s.id];

// Generated and sliced so far (04-05, 07, 12-15). Sheet 12 came back with two corrupted objects, redone as 12b.
for (const id of ['04', '05', '07', '12', '13', '14', '15', '17', '18', '23', '28', '33', '34', '38']) SHEETS.find((s) => s.id === id).done = true;
SHEETS.push(S('12b', 'belts-express-fix', 'Express underground belt: redo of one object', 1, 'object', [
  ['underground-express', 'underground belt entrance with BLUE glowing accent arrows, points right, 1x1 tile: a belt disappearing into a hooded steel tunnel mouth, exactly like the red one in the attached image but with blue glowing arrows'],
], { note: 'Draw ONLY this single object, centred. Do not draw poles, cables, flasks, gears or any other object. Attach ONLY the belts sheet (the red/blue belts image) as the reference, and no other sheet.', done: true, derived: true }));
// 12b is no longer needed: underground-express is derived from underground-fast (recoloured) by tools/slice-sheets.mjs.

// ---------------- NEW SHEETS for the round-based fight design (see docs/DESIGN.md) ----------------
SHEETS.push(
  S('43', 'ammo-chain-icons', 'Ammo chain: resources and parts', 1, 'icon', [
    ['ore-tin', 'chunk of silvery-grey tin ore with pale blue flecks'], ['ore-lead', 'heavy dull blue-grey lead ore lump'],
    ['plate-tin', 'bright silvery tin plate'], ['plate-lead', 'dull dark blue-grey lead plate, looks heavy'],
    ['plate-bronze', 'warm golden-brown bronze plate'], ['charcoal', 'small pile of black charcoal sticks with a faint ember glow'],
    ['wood', 'short stack of rough grey wood logs'], ['gunpowder', 'small heap of black gunpowder in a burlap sack'],
    ['casing-bullet', 'brass bullet casing (empty cartridge)'], ['casing-shell', 'large steel-and-bronze artillery shell casing'],
  ]),
  S('44', 'robots-player', 'Player robot soldiers', 1, 'creature', [
    ['robot-drone-1', 'tiny flying scout drone with two small rotors'], ['robot-drone-2', 'armed flying drone with two gun pods'],
    ['robot-scout', 'light four-legged scout walker'], ['robot-trooper', 'humanoid trooper robot with a rifle arm'],
    ['robot-heavy', 'heavy armoured walker with shoulder cannons'], ['robot-quad', 'big quadruped walker with a top turret'],
    ['robot-artillery', 'mobile artillery robot with a long gun'], ['robot-titan', 'huge titan automaton with multiple weapons'],
  ], { note: 'These are the PLAYER\'s soldiers, built in a factory: clean, freshly made, polished dark steel with BLUE and ORANGE trim and a glowing blue core light. They must look obviously cleaner and newer than rusted, red-glowing enemies. Facing right, top-down. Show a clear size progression from the tiny drone to the huge titan.' }),
  S('45', 'production-machines', 'Ammo and robot production machines', 1, 'object', [
    ['alloy-furnace', 'alloy furnace with two intake hoppers and one output chute, 3x3'], ['charcoal-kiln', 'stone-and-iron kiln with a smoking chimney, 2x2'],
    ['gunpowder-mill', 'grinding mill with millstones and a hopper, 3x3'], ['ammo-press', 'press machine stamping bullets, with a conveyor slot, 3x3'],
    ['shell-forge', 'heavy forge with an anvil for artillery shells, 3x3'], ['lumber-camp', 'sawmill / lumber harvester with a saw blade, 3x3'],
    ['robot-fab-1', 'small robot fabricator with an arm assembling a drone, blue-orange trim, 3x3'], ['robot-fab-2', 'medium robot foundry, blue-orange trim, 4x4'],
    ['robot-fab-3', 'giant titan forge with a gantry crane, blue-orange trim, 5x5'], ['robot-depot', 'robot barracks / launch bay with a large door, 3x3'],
  ]),
  S('46', 'resource-modules', 'Resource module tiles', 1, 'tile', [
    ['ore-tile-tin-1', 'silvery-grey tin ore clusters on ash'], ['ore-tile-tin-2', 'tin ore, different cluster layout'],
    ['ore-tile-lead-1', 'dull blue-grey lead ore clusters on ash'], ['ore-tile-lead-2', 'lead ore, different layout'],
    ['ore-tile-sulfur-1', 'yellow crystalline sulfur clusters on ash'], ['ore-tile-sulfur-2', 'sulfur, different layout'],
    ['forest-1', 'grove of grey-leaved ash trees seen from above'], ['forest-2', 'denser grove, different layout'], ['forest-3', 'sparse grove with dead trees'],
  ], { note: 'Ore/tree clusters should stop short of the tile edge so tiles can sit side by side, like the existing ore field tiles.' }),
  S('47', 'base-and-capture', 'Base core and capture markers', 1, 'object', [
    ['base-core', 'the Cinder Core: a glowing, fortified reactor-style command core with an orange heart, 5x5'],
    ['base-core-damaged', 'the same core, cracked and smoking, 5x5'], ['base-core-destroyed', 'the same core as a burning wreck, 5x5'],
    ['captured-marker', 'a glowing blue-and-orange capture ring marker seen from above, 1x1 tile'],
    ['spawner-wreck', 'a destroyed enemy nest pod as a smoking wreck, 3x3'],
  ]),
  S('48', 'commanders', 'Commander portraits', 2, 'ui', [
    ['commander-brakka', 'Gunnery Chief Brakka Vesh: scarred veteran with a bandolier and a heavy jaw'],
    ['commander-regent', 'The Foundry Regent: a sleek robot head with a single glowing orange eye and a crown-like crest'],
    ['commander-ilka', 'Stormwarden Ilka Thorne: hair lifted by static, crackling blue lightning around the shoulders'],
    ['commander-ozric', 'Marshal Ozric Bellwether: grey-bearded officer in a peaked cap with medals'],
    ['commander-ysolde', 'Cinder Queen Ysolde Ash: soot-streaked, ember-lit face, hair like flickering flame'],
    ['commander-tamsin', 'Forewoman Tamsin Brassgate: hard hat, goggles pushed up, spanner over the shoulder'],
    ['commander-pim', 'Doctor Pim Quillfeather: round glasses, wild hair, a tiny drone perched on the shoulder'],
    ['commander-grimwald', 'Bastion Grimwald Oaksworn: huge broad figure in heavy plate armour'],
  ], { note: 'Character portraits, NOT icons: head-and-shoulders busts, front-facing, in the same painted style with thick dark outlines and ember-orange accent light. No text. Keep the framing and scale identical for all eight so they form a matching set.' }),
);

// ---------------- Re-prioritised for the fight-loop design ----------------
// Combat, ammo and robots are now the core loop. Fluids, trains, vehicles, construction robots and the rocket goal are cut.
for (const id of ['44', '25', '30', '32', '43', '45', '46', '47', '26', '08', '27']) SHEETS.find((s) => s.id === id).done = true; // generated after the sheets above were added to the plan

// What actually came back for the newest sheets (reading order; null = a copy of the style reference or other junk to discard).
const ACTUAL2 = {
  // 46: five columns of three, so 15 tiles: tin x2, lead x5, sulfur x3, leafy groves x3, dead-tree groves x2
  '46': ['ore-tile-tin-1', 'ore-tile-tin-2', 'ore-tile-lead-1', 'ore-tile-lead-2', 'ore-tile-lead-3',
    'ore-tile-lead-4', 'ore-tile-lead-5', 'ore-tile-sulfur-1', 'ore-tile-sulfur-2', 'ore-tile-sulfur-3',
    'forest-1', 'forest-2', 'forest-3', 'forest-dead-1', 'forest-dead-2'],
  // 45: nine machines; the small robot fabricator (fab-1) is missing and the lumber camp has robot arms fused into it
  '45': ['alloy-furnace', 'charcoal-kiln', 'gunpowder-mill', 'ammo-press', 'shell-forge', 'lumber-camp', 'robot-fab-2', 'robot-fab-3', 'robot-depot'],
  // 32: eleven projectiles (two blue energy bolts)
  '32': ['proj-bullet', 'proj-piercing', 'proj-rocket', 'proj-shell', 'proj-flame', 'proj-acid', 'proj-laser', 'proj-plasma', 'proj-plasma-b', 'proj-grenade', 'proj-artillery'],
  // 26: eight large enemies, each with a caption underneath (discarded by the size filter)
  '26': ['enemy-brute-1', 'enemy-brute-2', 'enemy-spitter-2', 'enemy-brute-3', 'enemy-spitter-1', 'enemy-bomber', 'enemy-boss-colossus', 'enemy-boss-queen'],
  // 47: core, two copies of the style reference (assembler, lab), damaged core, capture ring, two more copies, nest wreck
  '47': ['base-core', null, 'base-core-damaged', null, 'captured-marker', null, null, 'spawner-wreck'],
};
for (const s of SHEETS) if (ACTUAL2[s.id]) s.actual = ACTUAL2[s.id];
// Gap-filler sheets, regenerated to plug what the main sheets missed. Their object names reuse the missing ones.
SHEETS.push(
  // four acid spitters (a tiny four-legged one, a six-legged one, a medium walker and a large boss), each with a caption
  S('26b', 'acid-spitters', 'Acid spitters', 1, 'creature', [['enemy-acid-1', ''], ['enemy-acid-2', ''], ['enemy-acid-3', ''], ['enemy-spitter-3', '']],
    { done: true, boxes: [[35, 30, 322, 305], [30, 380, 325, 692], [390, 118, 782, 692], [830, 28, 1348, 702]] }),
  S('30b', 'smoke', 'Smoke puffs', 1, 'fx', [['fx-smoke-1', ''], ['fx-smoke-dust', ''], ['fx-smoke-wisp', '']], { done: true, softKey: true, minSide: 60 }),
  S('47b', 'structures', 'Core wreck and small fabricator', 1, 'object', [['base-core-destroyed', ''], ['robot-fab-1', '']], { done: true }),
);

// Top-down player robots. 44b: five drawn correctly from above (the heavy walker, turret walker and titan on it are still
// front-on and are discarded); 44c redoes those three from above.
SHEETS.push(
  S('44b', 'robots-topdown', 'Player robots, top-down (first try)', 1, 'creature', [
    ['robot-top-drone-1', ''], ['robot-top-drone-2', ''], ['robot-top-scout', ''], ['robot-top-trooper', ''],
    ['robot-top-artillery', ''],
  ], {
    done: true,
    // the tank and the front-on titan beside it fuse into one blob, so clip the blob to just the tank (sheet is 1024 px wide)
    actual: ['robot-top-drone-1', 'robot-top-drone-2', 'robot-top-scout', 'robot-top-trooper', null, null, 'robot-top-artillery'],
    clip: { 'robot-top-artillery': [505, 325, 752, 550] },
  }),
  S('44c', 'robots-topdown-big', 'Player robots, top-down (big three)', 1, 'creature', [
    ['robot-top-heavy', ''], ['robot-top-quad', ''], ['robot-top-titan', ''],
  ], { done: true, minSide: 200 }),
);

// Power and the Storm coil (see docs/DESIGN.md): currently drawn in code, so these replace the stand-ins.
SHEETS.push(
  S('49', 'power-storm', 'Power and the Storm coil', 1, 'object', [
    ['coil-idle', 'Storm coil, idle: a square base with concentric copper windings seen from above and a dark, unlit electrode sphere in the centre, 2x2'],
    ['coil-charged', 'the same Storm coil charged: the electrode glowing blue-white with a soft glow on the windings, 2x2'],
    ['generator-lit', 'Ember generator: a squat furnace-boiler with a glowing orange firebox and a short chimney, seen from above, 2x2'],
    ['generator-cold', 'the same Ember generator cold and unlit, firebox dark, 2x2'],
    ['pole-steel', 'power pole: a steel post seen from above with a cross-arm and two ceramic insulators, 1x1'],
    ['pole-wood', 'power pole: a weathered wooden post seen from above with a cross-arm and two insulators, 1x1'],
    ['icon-no-power', 'a small red warning icon: a lightning bolt with a diagonal slash through it, flat, thick outline'],
    ['icon-power-ok', 'a small blue-white icon: a lightning bolt, flat, thick outline'],
  ], { note: 'All top-down like the attached machines (dark riveted steel, worn, ember-orange accents). The two icons are flat UI icons, not top-down machines.' }),
  S('50', 'lightning-fx', 'Lightning effects', 1, 'fx', [
    ['fx-bolt-long', 'a long horizontal forked lightning bolt, blue-white core with a blue glow'],
    ['fx-bolt-short', 'a shorter, sharply jagged horizontal lightning bolt'],
    ['fx-bolt-fork', 'a lightning bolt splitting into three branches'],
    ['fx-impact-flash', 'an electric impact flash: a bright white-blue burst with radiating sparks'],
    ['fx-ball-lightning', 'a crackling ball of blue-white lightning with tendrils'],
    ['fx-arc-ring', 'a ring of electricity seen from above, like a shockwave'],
    ['fx-sparks-blue', 'a cluster of small blue-white sparks'],
    ['fx-coil-aura', 'crackling blue electricity arcing around a central point, seen from above'],
  ], { note: 'Painted and gritty like the attached effects sheet, NOT clean vector clip-art. Solid bright cores with soft glowing edges, no magenta inside.' }),
);
// The walls sheet was already planned (24) but is now needed for the Wall building, which is drawn in code for now.
SHEETS.find((s) => s.id === '24').tier = 1;
for (const id of ['24', '49', '50']) SHEETS.find((s) => s.id === id).done = true; // generated
// What Gemini actually drew, in reading order. 24: it added a radar dish and a glowing ring machine, and the narrow
// piece after the open gate is a second gate part. 50: an extra thick bolt (3rd) pushed the rest along by one, plus a swirl.
SHEETS.find((s) => s.id === '24').actual = ['wall-straight', 'wall-corner', 'wall-t', 'wall-cross', 'wall-end', 'gate-closed', 'gate-open', 'gate-open-b',
  'radar', 'shield-projector', 'radar-dish', 'defence-ring'];
SHEETS.find((s) => s.id === '50').actual = ['fx-bolt-zig', 'fx-bolt-thin', 'fx-bolt-zig-b', 'fx-bolt-fork', 'fx-burst', 'fx-orb', 'fx-ring', 'fx-sparks-blue', 'fx-swirl'];

// Sheet 27: two captions sit right under their objects (sheet is 1376 x 768)
SHEETS.find((s) => s.id === '27').clip = { 'nest-large': [555, 15, 885, 338], 'nest-egg-cluster': [1150, 20, 1360, 300] };

// Options for sheets added after the OPTS block above (which only sees sheets that already existed then).
Object.assign(SHEETS.find((s) => s.id === '26'), {
  minSide: 100, dilate: 6, // keep the captions from fusing to the creatures
  // captions sit a few pixels under three of the creatures (sheet is 1376 x 768)
  clip: { 'enemy-spitter-1': [20, 375, 335, 692], 'enemy-boss-colossus': [590, 385, 925, 702], 'enemy-boss-queen': [930, 368, 1365, 702] },
});
SHEETS.find((s) => s.id === '43').minSide = 20; // the bullet casing is a thin object
// The core's glow is a solid pink-orange disc against the backdrop; keep only the metal body (source px, sheet is 1376 wide).
SHEETS.find((s) => s.id === '47').clip = { 'base-core': [50, 66, 300, 340] };
const TIER = { '08': 1, '23': 1, '25': 1, '26': 1, '27': 1, '30': 1, '32': 1, '29': 3, '06': 3 };
for (const [id, t] of Object.entries(TIER)) SHEETS.find((s) => s.id === id).tier = t;
const CUT = ['06', '10', '16', '19', '20', '21', '22', '37']; // cut sheets stay in the plan but are left out of the prompt pack
for (const id of CUT) SHEETS.find((s) => s.id === id).cut = true;

// Objects whose glow touches a neighbour: keep only pixels inside [x0, y0, x1, y1] (sheet pixel coordinates).
const CLIP = {
  // the foundry's caption text sits a few pixels under it and fuses to it
  '18': { 'furnace-foundry': [1300, 480, 2000, 1026] },
  // captions fused to these two creatures
  '25': { 'enemy-spider-2': [1580, 0, 2000, 446], 'enemy-drone-3': [1270, 540, 1720, 1015] },
};
for (const s of SHEETS) if (CLIP[s.id]) s.clip = CLIP[s.id];

/** Branding art: NOT sliced, generated one prompt at a time. The studio splash reuses Crystalbound's FuzeNova intro, so no studio logo is needed. */
export const BRANDING = [
  {
    id: 'B1', title: 'Game logo',
    prompt: 'Logo for the video game "CINDER AUTOMATA": bold, chunky industrial lettering forged from dark riveted metal with glowing ember-orange cracks, a small cog with a flame above the text, on a flat magenta (#FF00FF) background. Exactly the words "CINDER AUTOMATA", no other text.',
  },
  {
    id: 'B2', title: 'Title screen background',
    prompt: 'Wide 16:9 painted game title-screen background for "Cinder Automata": a burnt ash-covered alien world at dusk, a sprawling industrial factory of belts, smelters and chimneys glowing ember-orange in the middle distance, dark smoke, a crashed spaceship in the foreground, lonely engineer silhouette. Dramatic, cinematic, no text, no UI.',
  },
  {
    id: 'B3', title: 'Loading screen art',
    prompt: 'Wide 16:9 painted illustration: a close view of a factory belt line at night with glowing ore and molten smelters, sparks in the air, painterly game-art style, warm orange light against cold grey-blue shadows, space near the bottom kept fairly dark for a loading bar. No text.',
  },
  {
    id: 'B4', title: 'Key art / thumbnail',
    prompt: 'Square 1:1 key art for the game "Cinder Automata": a determined engineer in a hard hat standing in front of a huge glowing automated factory on a burnt alien world, rogue rusted robot creatures approaching from the smoke, dramatic rim lighting, painterly. Leave the upper third calm for a title. No text.',
  },
];


