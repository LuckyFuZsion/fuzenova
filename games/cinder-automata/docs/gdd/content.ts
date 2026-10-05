// The hand-written parts of the design document. Edit this file, then run `npm run gdd` to rebuild the PDF.
// Everything numeric (prices, stats, level scaling, recipes) is pulled live from the game's code, so it never goes stale.
// Keep "status" honest: BUILT means playable in the game today, PLANNED means designed but not built.

export const meta = {
  title: 'Cinder Automata',
  subtitle: 'Game Design Document',
  studio: 'FuzeNova Games',
  status: 'Playable prototype',
  tagline: 'Build a factory. Arm it. Hold the line.',
};

export const elevatorPitch =
  'Rogue machines march on your base. You survive by running a factory: mine ore, smelt it, craft ammunition and robots, wire up power, and hold the line through level after level of tougher waves. It is Factorio and Mindustry distilled into a short, replayable, browser-based run, with a burnt, ember-lit sci-fi look.';

export const pillars: { name: string; text: string }[] = [
  { name: 'A factory that fights', text: 'The satisfaction of an automated production line, but every belt, machine and stockpile exists to keep you alive. No sandbox sprawl: everything you build is judged by the next fight.' },
  { name: 'Short, complete runs', text: 'A level is a few minutes. A star is earned at level 10, 20 and 30. It is designed for a browser tab, not a 40-hour save file, with autosave so a run can be paused and resumed.' },
  { name: 'Readable at a glance', text: 'Clear silhouettes, blue-and-orange friendly machines against rusted red-glow enemies, and a UI that explains every building the first time you pick it up.' },
  { name: 'Forgiving, not shallow', text: 'Building is always allowed, a broken belt is cheap to fix, repairs between rounds are free. Depth comes from supply chains and choices, not punishment.' },
];

export const loop: { step: string; text: string }[] = [
  { step: 'Build', text: 'Between fights there is a build phase (90 seconds by default, or start the fight early). The factory is paused. Place drills, belts, smelters, assemblers, turrets, walls, power and robot fabricators. Buildings are paid for from the core stockpile.' },
  { step: 'Fight', text: 'The factory runs while a fight is on, and for a breather after each win (50 seconds on Easy, 30 on Normal, 20 on Hard, 12 on Extreme at level 1, shrinking by 2 percent a level to 40 percent), so you can mine and smelt while you build. You can keep building during a fight too, so a jam is never fatal. Enemy waves spawn at the edge of the map and march on the core, attacking turrets and walls first.' },
  { step: 'Win or lose', text: 'Clear the wave before the core falls; the level ends the moment the last enemy dies. Lose the core and the run is over. Win and every surviving building is repaired (on Hard and Extreme it costs plates); robots stay wounded, and dead ones must be built again.' },
  { step: 'Pick a boon', text: 'After every second win (2, 4, 6...) and after each boss, choose one of three random boons: a permanent upgrade such as turret damage, coil damage or sturdier walls, or an instant reward such as plates, science packs, free scouts or a full repair. They are deliberately modest, so a run is shaped by the luck of the draw without being broken by it.' },
  { step: 'Open a square', text: 'The map is a grid of 24x24 squares and you start with only the one round your core, which holds iron and nothing else. After each win you choose one of three neighbouring squares to open, and the game opens a second, random one. Copper comes next door, then coal and tin, then lead and sulfur, then the far forests, and a message explains each new resource the first time it appears. The map, and the danger, grow with every level.' },
  { step: 'Read the omen', text: 'From level 2, a fight may carry an omen shown in the top bar before it starts: Swarm, Ironhide, Swift, Acid rain, Two fronts, Bounty, Brutal, Ash fog or A lull. Each run also has its own random map, so no two runs are alike.' },
  { step: 'Repeat, harder', text: 'The next level has more enemies, tougher enemies, more ranged attackers and new enemy types. Fights grow from 3 minutes toward 10.' },
];

export const tips: string[] = [
  'Early on, iron plates in a turret are enough. Build a second supply line before you need it.',
  'Bullets (casing plus gunpowder) hit 2.5 times as hard as plates, so the ammo chain is worth building by level 5 or 6.',
  'Enemies attack turrets, walls and Storm coils before anything else. Put a wall line in front of your turrets and they will spend their time chewing it.',
  'Storm coils shine against crowds of weak enemies, and cost no ammo, but a coil with no fuel behind it does nothing. Keep the generator fed.',
  'Robots fight between rounds too and are repaired for free. A steady trickle of cheap drones and troopers beats saving up for a Titan.',
  'Run a belt of plates into the core to top up your build budget. Kills and finished levels also pay out.',
  'Ore runs out. When you choose which square to open, pick the one holding the resource you are short of, not the prettiest one. Point at a square to see it on the map.',
  'Ranged enemies (acid spitters, sprayers, cannons) stop short and shoot. Put walls in front, keep robots near to draw fire, and do not let a cannon sit out of reach of your turrets.',
  'Read the omen before you press start: Two fronts means you need turrets on opposite sides; Ash fog shortens your turrets, so pull them in.',
  'Fly a few drones: flying robots cannot be bitten by ground crawlers.',
];

/** The three bosses, all in the game. */
export const bossPlan: { level: string; name: string; sprite: string; idea: string }[] = [
  { level: 'Level 10', name: 'Siege Brute', sprite: 'enemy-brute-3', idea: 'A wall-breaker with a huge ram plate. Walks straight at the core, ignoring turrets that are not in its way, and smashes buildings in its path for 2.5 times the usual damage. The first-star test: it forces real firepower rather than a trickle of fire.' },
  { level: 'Level 20', name: 'Colossus Walker', sprite: 'enemy-boss-colossus', idea: 'A gigantic multi-turret walker. It opens fire on turrets, coils and walls from 9 tiles, beyond the gun turret range of 7, and keeps closing to about 6 tiles while it shells. Its shells hit hard, so it punishes a defence that is only a few turrets and rewards robots and heavy firepower. It does not attack robots.' },
  { level: 'Level 30', name: 'Hive Queen', sprite: 'enemy-boss-queen', idea: 'The nest mother. She walks in, parks about 9 tiles from the core and does not attack directly. Every 6 seconds she spawns two swarmlings and a scout drone (up to 16 alive), so the fight is about killing her fast while holding off the brood. The final exam for a balanced defence, and the gate to Endless mode.' },
];

export const eliteEnemies: { name: string; sprite: string; role: string }[] = [
  { name: 'Brute (3 tiers)', sprite: 'enemy-brute-1', role: 'Heavy armoured ground unit. Slow, very tough, hits hard against structures.' },
  { name: 'Acid spitter (4 sizes)', sprite: 'enemy-acid-2', role: 'Ranged. Lobs acid at buildings from a distance, so it forces you to kill it before it is in range.' },
  { name: 'Heavy bomber drone', sprite: 'enemy-bomber', role: 'Flying. Drops bombs on buildings and cannot be blocked by walls. Only turrets, coils and drones can reach it.' },
];

export const commanders: { name: string; theme: string; bonus: string; drawback: string }[] = [
  { name: 'Gunnery Chief Brakka Vesh', theme: 'Arsenal', bonus: 'Turret damage and bigger ammo stockpiles', drawback: 'Weaker robots' },
  { name: 'The Foundry Regent', theme: 'Robot army', bonus: 'Robots build faster, cost less, and automatons are tougher', drawback: 'Weaker turrets' },
  { name: 'Stormwarden Ilka Thorne', theme: 'Lightning', bonus: 'Storm coils chain further and hit harder', drawback: 'Power-hungry, weaker ammo turrets' },
  { name: 'Marshal Ozric Bellwether', theme: 'Artillery', bonus: 'Bigger splash and range on shells', drawback: 'Slow to react to fast enemies' },
  { name: 'Cinder Queen Ysolde Ash', theme: 'Fire', bonus: 'Flame turrets and burning damage', drawback: 'Short range' },
  { name: 'Forewoman Tamsin Brassgate', theme: 'Pure factory', bonus: 'More starting plates and a fourth map square to choose from after each win', drawback: 'Few combat bonuses' },
  { name: 'Doctor Pim Quillfeather', theme: 'Drone swarm', bonus: 'Cheap, numerous small flying robots', drawback: 'Big units cost more' },
  { name: 'Bastion Grimwald Oaksworn', theme: 'Fortress', bonus: 'Tougher walls and turrets', drawback: 'Slow robots' },
];

export const metaProgression: string[] = [
  '<b>Stars per commander.</b> One star for completing level 10, two for level 20, three (the maximum) for level 30.',
  '<b>Endless mode.</b> Keep playing at ever-increasing difficulty until you die. Proposed: unlocks at three stars, and records your best level per commander.',
  '<b>Salvage and the Workshop.</b> A permanent currency earned every run (win or lose) from levels reached, spawners captured and bosses beaten. It is spent on <i>sideways</i> unlocks: new buildings and robots added to the research pool, opening kits, 2 or 3 optional perks per commander. Small capped power upgrades only, so level 30 stays a real test.',
  '<b>Codex and badges.</b> Enemies, recipes and items you have met are logged, with badge icons for milestones.',
  '<b>Captured tiles.</b> Robots attack enemy spawner nests. Destroying one captures its tiles, which become buildable land.',
];

export type Status = 'built' | 'planned' | 'art';
export const featureStatus: { area: string; items: { name: string; status: Status; note?: string }[] }[] = [
  { area: 'Core loop', items: [
    { name: 'Build phase, fight phase, win and lose, next level', status: 'built' },
    { name: 'Factory runs only during fights; building always allowed', status: 'built' },
    { name: 'Map expansion: choose one of three squares after each win, the game opens a second', status: 'built', note: 'replaces the resource-module pick; 7x7 grid of 24x24 squares' },
    { name: 'Resources introduced by distance (iron, then copper, coal and tin, then lead and sulfur, forests)', status: 'built', note: 'with a message the first time each appears' },
    { name: 'Random map seed per run; ?seed=N to replay', status: 'built' },
    { name: 'Omens: a random twist on each fight (9 kinds)', status: 'built' },
    { name: 'Boons: pick 1 of 3 random upgrades every second level', status: 'built', note: 'modest by design; needs play-testing' },
    { name: 'Pause overlay; nothing can be built or changed while paused', status: 'built' },
    { name: 'Autosave and Continue', status: 'built', note: 'saved at the start of each build phase' },
    { name: 'Email and password accounts with cloud saves (Firebase)', status: 'built', note: 'needs the Firestore rules published before going live' },
    { name: 'Guided tutorial level', status: 'built' },
  ] },
  { area: 'Factory', items: [
    { name: 'Drills, belts (with corners), inserters with filters, smelters', status: 'built' },
    { name: 'Assemblers with 7 recipes (ammo, alloys, shells)', status: 'built' },
    { name: 'Self-orienting drills and inserters', status: 'built' },
    { name: 'Building costs, core stockpile, refunds', status: 'built' },
    { name: 'Crossovers (belts crossing) and splitter / merger pieces', status: 'built', note: 'drawn in code for now; art prompt to do' },
    { name: 'Two-lane belts, underground belts', status: 'art', note: 'art generated, not built' },
    { name: 'Minimap, range circles, inspect mode', status: 'built' },
    { name: 'Small starting map that grows per level; rocks, burnt trees, tar pits, ridges', status: 'built', note: 'obstacles drawn in code for now; decoration art to come' },
    { name: 'Research (T): paid in science packs you craft; projectile, electromagnetic, robotics, fortification, range', status: 'built', note: 'unlocks robot designs and ammunition; more branches planned' },
    { name: 'Move buildings (V), controls panel (F2), inspect mode (F3), warning marks, fast-forward (F)', status: 'built' },
    { name: 'Blueprint planning: free to change until the fight starts', status: 'built' },
    { name: 'Storage chests', status: 'built', note: 'removed on purpose; old saves move their contents to the core' },
  ] },
  { area: 'Defence', items: [
    { name: 'Gun turret (plates or bullets)', status: 'built' },
    { name: 'Walls that connect themselves', status: 'built' },
    { name: 'Storm coil with power (generators, poles)', status: 'built' },
    { name: 'Storm coils charge up (200) and spend energy per bolt', status: 'built' },
    { name: 'Flame, laser, rocket and artillery turrets', status: 'art', note: 'art generated, not built' },
    { name: 'Gates, radar, shield projector', status: 'art' },
  ] },
  { area: 'Allies', items: [
    { name: '8 robot types built in a fabricator (12 space per fabricator), auto-defending', status: 'built' },
    { name: 'Smart robots: guard posts, spacing, path-finding round buildings, unstick', status: 'built' },
    { name: 'Robots rotate to face targets, patrol between fights', status: 'built' },
  ] },
  { area: 'Enemies', items: [
    { name: 'About 16 enemy types unlocking through the levels, with enemies that path round obstacles', status: 'built' },
    { name: 'Natural obstacles: rocks, burnt trees, tar pits, ridges', status: 'built' },
    { name: 'Enemies attack turrets and walls first', status: 'built' },
    { name: 'Boss enemies at levels 10, 20, 30 (Brute, Colossus, Hive Queen)', status: 'built', note: 'repeat every 10 levels' },
    { name: 'Ranged enemies: acid spitters, sprayers, cannons, siege spitters, gatling brutes, combat drones, laser spiders', status: 'built', note: 'some out-range a gun turret; needs balance testing' },
    { name: 'Bomber drones as a dedicated building-killer', status: 'art' },
    { name: 'Enemy nests to capture (spawners)', status: 'art' },
  ] },
  { area: 'Meta', items: [
    { name: 'Commander select as a carousel with portraits; stars at levels 10 / 20 / 30; Endless past level 30', status: 'built', note: 'Artillery and Fire commanders are locked until their weapons exist' },
    { name: 'Starter commander plus achievement unlocks; four difficulty levels', status: 'built' },
    { name: 'Salvage, Workshop, Codex, badges', status: 'planned' },
  ] },
  { area: 'Presentation', items: [
    { name: 'Painted art, dusk lighting, effects, in-game menu with codex', status: 'built' },
    { name: 'Installable web app with offline play', status: 'built' },
    { name: 'Sound effects, machine loops and music (menu, build, fight 1, boss, victory, defeat)', status: 'built', note: 'fight 2 and 3 music and the combat / boss effects still to come' },
    { name: 'New-game screen, title screen and pause overlay restyled', status: 'built', note: 'the in-game panels and result screens are next' },
    { name: 'Balance tuning past level 7', status: 'planned', note: 'the headless test cannot win from level 8 with turrets alone since ranged enemies and tougher health were added' },
    { name: 'Tester launcher (Windows zip)', status: 'built', note: 'must be rebuilt (npm run tester) before sending' },
  ] },
];

export const roadmap: { phase: string; goal: string }[] = [
  { phase: 'Right now', goal: 'Balance pass for levels 8 to 30. Ranged enemies, tougher health, omens and boons all landed together, and the headless turret-only test can no longer win from level 8. Re-measure with robots and coils, tune ranged counts, acid cannon and siege spitter range, and boon strength. Then play-test the first 10 levels on the small 24x24 start square to see whether it needs a bigger first square.' },
  { phase: 'Next', goal: 'Finish the graphics pass: science pack icons, crossover and splitter art, wall damage states, decoration. Restyle the in-game panels (top bar, toolbar, research, result and menu screens) to match the new title and new-game screens.' },
  { phase: 'Then', goal: 'Audio to finish: fight 2 and fight 3 music, combat and boss sound effects (shots, deaths, coil zaps), close sounds. Capturable enemy nests, more research branches (logistics, artillery, flame), more turret types (flame, laser, rocket, artillery) that unlock the Artillery and Fire commanders.' },
  { phase: 'Then', goal: 'Workshop and Salvage (permanent sideways unlocks), Codex and badges, wider commander bonuses now that modules are gone, more omens and boons, the alien-invasion story direction if the producer confirms it.' },
  { phase: 'Release prep', goal: 'Rebuild and test the tester pack, Windows launcher, itch.io page, trademark checks on the title and names, analytics, and an optional global leaderboard.' },
];

/** Design decisions made with collaborators. Proposed = agreed in discussion but not built yet. */
export const decisions: { topic: string; decision: string; status: 'built' | 'proposed' }[] = [
  { topic: 'Cost of building', status: 'built', decision: 'Everything placed during a build phase is a free-to-change blueprint. It is paid for as you plan (the budget is reserved and you cannot overspend) and refunded in full if you remove or move it. It locks in when the fight starts; after that, belts and inserters are always free, and other buildings refund 75% when removed.' },
  { topic: 'Structure damage', status: 'built', decision: 'Repairs between levels are free on Easy and Normal. On Hard they cost a quarter of the damaged building price (in proportion to the damage), on Extreme half, paid from the core stock; anything you cannot afford stays damaged.' },
  { topic: 'Difficulty levels', status: 'built', decision: 'Four levels chosen on the new-game screen. Easy: no build timer, the player starts each fight, enemies 15% softer. Normal: 90 s. Hard: 70 s, enemies 15% health and 10% damage up, paid repairs. Extreme: 45 s, enemies 30% health and 25% damage up, costly repairs.' },
  { topic: 'Commander unlocks', status: 'built', decision: 'Everyone starts with Captain Wren Halloway: standard issue, no bonus and no drawback, and no choice to make at first. The other commanders are earned by playing in their style: Brakka (8 gun turrets standing at once), the Foundry Regent (3 Robot fabricators), Tamsin (6 drills and 4 smelters), Ilka (5 Storm coils), Pim (10 robots alive) and Grimwald (20 walls). Once a second commander is unlocked, the new-game screen lets you choose. The Artillery and Fire commanders wait for their weapons. Unlocks are kept in the browser.' },
  { topic: 'Roguelite layer', status: 'built', decision: 'Every run has a random seed (its own map), each fight from level 2 may carry an omen, and every second win offers a pick of one of three random boons. Boons are small on purpose (5 to 7 percent steps, small windfalls) so they add variety without letting the player outscale the waves. Starting stock (170 iron, 45 copper) and level rewards (30 iron, 8 copper) were cut to slow the economy.' },
  { topic: 'Map expansion', status: 'built', decision: 'The map is a 7x7 grid of 24x24 squares. A run starts on the core square with iron only. After each win the player picks one of three neighbouring squares (shown dimmed on the map with their ore visible) and the game opens a second, random one. Contents are set by distance from the core so new resources arrive slowly. Enemies enter over any edge of the opened land. This replaced the resource-module pick.' },
  { topic: 'Ranged enemies and tougher health', status: 'built', decision: 'Enemy health is about 35 percent higher and a growing share of each wave shoots from range, so a defence of only turrets is no longer enough: walls, robots and coils matter. Numbers are a first pass and need play-testing.' },
  { topic: 'No storage chests', status: 'built', decision: 'Chests were removed. The core stockpile is the only store; belts carry everything else.' },
  { topic: 'Pausing', status: 'built', decision: 'While paused the screen is dimmed with a PAUSED overlay, and only camera movement and zoom work. Nothing can be built, erased, moved or started.' },
  { topic: 'Endless mode', status: 'built', decision: 'Currently open to everyone: the levels simply continue past level 30. Whether it should wait for three stars is still to decide.' },
];

export const openQuestions: string[] = [
  'NEW DIRECTION (proposed by the producer, not built): the player is an invading force that has landed on an alien planet, and the enemy is organic (creatures, swarms, hives) instead of rogue machines. Later, each run could land on a random planet type with its own enemy set. This changes the story, the enemy art and names, the tagline and the ground look.',
  'Is a 24x24 starting square (the map is now 200x200) big enough for level 1? Needs play-testing.',
  'Are the boons and omens exciting without being too generous? How often should a boon be offered (currently every second level)?',
  'Should enemies be able to spawn from every open edge, or only from the far side of the explored land?',
  'How should commander bonuses change now that the module choice has gone (Tamsin had an extra module pick)?',
  'How long should a build phase be, and what should starting a fight early reward?',
  'How big a role should research play, when the run is only a few hours at most?',
  'Multiplayer or shared leaderboards? Worth a server, or keep the game fully offline and free to host?',
  'Monetisation, if any: free on the web, paid on Steam, cosmetic extras?',
];

export const wanted: { role: string; text: string }[] = [
  { role: 'Balance designer', text: 'Someone who enjoys spreadsheets and playtesting to tune enemy waves, prices and progression so levels 10, 20 and 30 feel earned.' },
  { role: 'Sound designer / composer', text: 'The game is silent today. It needs a dark industrial soundtrack, machine loops, weapon and lightning effects, and an audio identity for the FuzeNova intro.' },
  { role: 'Artist / animator', text: 'The core art is AI-assisted and consistent, but boss animations, walk cycles, tile transitions and UI polish would lift it a lot.' },
  { role: 'Web developer', text: 'For a global leaderboard, cloud saves and account features, kept separate from the site\'s existing database.' },
  { role: 'Playtesters', text: 'People who play Factorio, Mindustry or Satisfactory and will say honestly where it is confusing or dull.' },
  { role: 'Producer / marketer', text: 'Trailers, an itch.io and Steam presence, community, and the legal checks around names.' },
];

export const changelog: { date: string; changes: string[] }[] = [
  { date: '2026-09-30', changes: [
    'Share card: a 1200x630 preview image (og-image.png) and the Open Graph / Twitter tags, so links to the game show the logo and a battle scene on social media and chat apps.',
    'Turrets fed from the same belt now share it out: a turret does not take an item if a turret further down the same belt (counting what is already on its way) is emptier, so the first turret no longer fills up before the others get any. Power poles are tougher (140 health, was 40; generators 220) and enemies only notice poles and generators within 4.5 tiles, after walls, turrets and coils.',
    'Robots can no longer be left stuck between walls and buildings: one that is chasing an enemy but not moving is now noticed (before, only idle ones were), and if it is walled into a small pocket with no way out it is lifted to the nearest free ground outside after about 3 seconds. One-tile and two-tile corridors between walls are walked straight through.',
    'The Titan no longer scrapes along scenery: big robots plan their routes keeping a tile clear of rocks, trees, pools, walls and machines, so they take a wide gap in preference to a one-tile squeeze (and still squeeze through if that is the only way).',
    'Instructions: the How-to-play guide, the Controls list and the Research-complete message now explain turret upgrades (double-click a gun turret), the scrap bin, and how to read the status of an assembler.',
    'Enemies now go for power poles and Ember generators as well: they count as targets within 7 tiles like walls, turrets and Storm coils, but 2.5 tiles farther away, so a wall, turret or coil that is nearly as close is still hit first. Ranged enemies shoot them too.',
    'Solid buildings (walls, turrets, machines, poles) can no longer be placed on top of a walking enemy; the ghost turns red until it has moved. Belts, inserters and crossovers still can, and flyers never block building.',
    'The Buildings tab of the menu now shows the range of the gun turret and Storm coil, and has cards for the Scatter gun and Sniper upgrades (range, fire rate, damage, cost and how to unlock them). The Robots and Enemies tabs already list the range of each unit.',
    'Power lines show their state: a network with full power has glowing blue wires with charges running along them and a blue lamp on each pole; one that is short of power turns amber with slower pulses; one with no power (no burning generator) is dull grey and dashed.',
    'Robot fabricators now have room for 12 space of robots (was 10), so mixes of 2-, 4- and 6-space robots fill exactly. The Turret walker now takes 6 space (was 5) and the Titan takes the whole fabricator, 12 (was 10). A small ding plays when a wave is cleared (not after the last one, which has the level-complete fanfare).',
    'Staying signed in: the sign-in is kept on the device until the player signs out (set explicitly, and the browser is asked not to clear it). With no connection, a device that already has a confirmed account goes straight to the title screen instead of the sign-in form.',
    'Scrap bin (new building, 2x2, 20 iron plates, key B): destroys any item an inserter or belt gives it, so leftovers no longer jam a belt. Put a filtered inserter in front of it to remove only one kind of item. It has idle and burning pictures.',
    'Discovery pop-ups: the first time a kind of item turns up in the factory (gunpowder, bullets, steel and so on) the game pauses with a card explaining what it is for, until the player clicks Got it (or presses Enter). What has been seen is remembered per player and saved to their account; an existing player is not shown pop-ups for items they already have. Not shown in the tutorial.',
    'Robots answer an attack anywhere in the base: with no enemy within 16 tiles they march to the nearest enemy, but only one within 30 tiles of the fabricator that built them (or the Core if it is gone), so they never wander off across the map.',
    'Assembler status: each assembler on the map now shows what it holds of every input (have / needed, red when short), a badge saying what it needs, and a "N ready - take out" badge when its output is full (6) and it has stopped until an inserter takes the packs out. The inspect text is labelled, and the research panel shows how much of each pack is in the Core against the cost ("need N more") and which pack kinds have an assembler making them.',
    'Map squares after a battle: the squares offered, and the bonus square the map opens, are now always the ones closest to the core (random only between squares equally near), so the explored land grows outward without big gaps.',
    'Bosses can no longer be trapped by scenery: a boss that has not moved half a tile in 3 seconds (and is not chewing a building) crushes the rocks and trees in its way towards the core; if that is not enough it is set down on the nearest ground from which the core can be reached.',
    'Update prompt: a running game (browser tab or installed app) now checks for a new version every 10 minutes and whenever the player returns to the window (one tiny request), and shows a "new version is ready - click to reload" button when one is live.',
    'Ground patches: churned-mud decals lie over mud flats, and scorched cracked ground (some with glowing lava cracks, one crater), ash dunes and salt flats are scattered thinly over open ground as flat, non-blocking decoration, kept clear of ore, rocks, buildings and the core.',
    'Terrain features: mud flats (soft brown ground that slows anything on foot to about half speed, enemies and robots alike, but you can build on it; enemies prefer to go round it if the detour is short) and toxic pools (green pools that block walking and building, like tar). Both are drawn as smooth organic blobs. Mud never covers ore or rock and stays well away from the core. Flyers are not slowed.',
    'Walls now show their health: every wall piece (straight, corner, T, cross and the lone block) has a cracked version below 66 percent health and a broken, smoking one below 33 percent. The Gatling brute and the Laser spider show their insulation (white ceramic discs, earthing straps), and the Siege crawler and the Acid cannon show their armour plating.',
    'Art pass: the twelve boons and nine omens have painted icons (boon cards; an omen chip with the icon and a one-line description in the top bar); twelve HUD icons (core health, kills, robots, power, cooldown, call-wave horn, research, armour, insulated, ranged...) replace words in the top bar, the cooldown banner, the buttons and the enemy cards; eleven pieces of scenery (bones, a wreck, scrap, fungus, a crater, a buried arm, ash, a pipe, pebbles, a shrub) are scattered over open ground, the same for every seed, clear of ore, rocks and the core; and destroyed buildings leave a heap of rubble that fades after about 45 seconds.',
    'Crossover and splitter now have painted art: a arrow-free crossover tile (the belts can cross either way) with a riveted plate and corner lamps, and a splitter gate with a gear and divider between its two lanes. A HANDOVER.md file in the game folder explains how to run, test, build and deploy the game, the code map, the rules we settled on, and what is left to do.',
    'New art in the game: the Scatter gun (orange hazard-striped pedestal, flared double barrel) and the Sniper (cyan-lit pedestal, long scoped barrel) have their own sprites, and the four science packs (projectile orange, electromagnetic blue, robotics green, advanced purple) have proper glass-flask icons shown in the stock and research panels. ',
    'Trees redrawn at a sensible size: they are scaled by their longest side so none is more than about two tiles tall (the thin ones used to be stretched to five), and the two bare-pole trees that looked like sticks are no longer used.',
    'Research is harder to rush: packs are spent at once but a research then takes factory time to finish (15 seconds for the first level, 10 more for each level after, counted only while the factory runs: fights and the cooldown), one at a time. Level 1 of a tech needs only its own pack; level 2 also needs a second kind of pack (a second supply chain); level 3 onwards also needs the new Advanced science pack (steel, bullets and bronze: the whole ammunition chain). The later levels also need the run itself to have reached level 3, 6, 10 and 15. The research panel shows the countdown, the gate and the cost.',
    'Armour: heavier enemies (armoured and siege crawlers, gatling brutes, laser spiders, cannons, siege spitters, bombers and the bosses) take a flat amount off every hit (never more than three quarters of it), so iron-plate shots and the later hops of lightning barely hurt them and bullets matter. Gatling brutes and laser spiders are also insulated: Storm coils do only 40 percent to them. The menu shows each enemy armour.',
    'Double-click pickers: an Assembler opens a grid of the recipes it can make (locked ones say what unlocks them), and a Robot fabricator opens a menu of robots with health, damage, range, speed, room, cost and build time. Single clicks no longer cycle through them.',
    'Turret branches: researching Turret designs lets you upgrade a gun turret in place (double-click it) into a Scatter gun (short range, a wide cone that hits every enemy in it) or a Sniper (range 12.5, slow, five times the damage, shrugs off most armour). Upgrades cost plates, keep the turret ammunition, and are free to switch back. Upgraded turrets wear a coloured ring (orange or blue) and a different barrel; proper art for them is still to come.',
    'Waves lean towards your weak side: the first wave of a level can come from any open edge, but later waves are weighted towards the edges with the least defence nearby (turrets and coils count most, then robots, then walls), so a defence that only covers one side is tested on the others.',
    'Enemy pathfinding rebuilt as a flow field: one search from the core outward gives every tile its cost to the core, and ground enemies simply step to the cheapest neighbouring tile, instead of one route search per enemy. Rock and unexplored ground are impassable; belts and inserters cost nothing; every other building is passable at a high cost, so enemies go round a wall when there is a gap but chew through the cheapest wall if the core is sealed in. Big enemies (siege crawlers, brutes, bosses) use a second field that keeps a tile clear of rock, so they do not squeeze through one-tile gaps; the Siege Brute smashes through buildings and is stopped only by terrain. The field is rebuilt when buildings change, at most four times a second. Enemies now steer apart so a wave spreads out instead of stacking on one tile, spawn points are moved out of rock or sealed pockets, and an enemy that has moved under half a tile in 3 seconds is pushed along the route, then set down nearer the core, then given up on. 200 enemies cost about 3 ms per step.',
    'The core now only accepts what can be spent: iron plates, copper plates and science packs. Raw ore, ammunition, tin and lead plates and the rest are refused, so a belt or inserter holding them waits at the end and a warning mark says the core refuses it. This stops ore (500 of it, for example) piling up in the core doing nothing.',
    'Cloud saves are lighter on the account service: a save is uploaded at most once every 30 seconds, never when nothing has changed since the last upload, and always when the tab closes or the player signs out. A new version of the game now reloads itself on the title screen, or offers a reload button during play.',
    'Call the next wave early: during a breather a green button (or the C key) skips the rest of the calm and sends the next wave at once, paying iron plates for the seconds skipped (a little more on later levels). It plays the warning horn. Not available while enemies are alive, before the first wave or after the last.',
    'Waves with a guaranteed breather: the next wave never starts until the last has been destroyed and a calm of about 25 seconds at level 1 (down to 14 by level 30) has passed; only a wave that drags on for 90 seconds is not waited for. Waves also build through a level: the first is about 60 percent of an even share and the last about 140 percent, so the pressure climbs to a finale. The top bar shows the wave number and, during the calm, a countdown to the next wave.',
    'Placing or moving a building onto a ground enemy or robot now pushes it out to the nearest free ground instead of trapping it inside (flyers and flat belts and inserters are unaffected). Any enemy found inside rock is also lifted out.',
    'Storm coils recharge much more slowly: a coil gained 60 charge a second but a bolt costs 50 every 1.3 seconds, so it never ran down and fired non-stop. It now gains 20 a second while still drawing the same power, so a full coil fires a burst of four bolts and then about one every 2.5 seconds. More coils, more generators or a long gap between fights are how you get more lightning.',
    'Live attack glow on the minimap: wherever a building, a robot or the core is being hit, a hot orange bloom pulses on the minimap and fades about a second and a half after the hits stop (nearby hits merge into one glow). Enemies are red dots and new spawns still ring.',
    'Fixed a stuck ring: the spawn and straggler pings only faded during a fight, so one left over when the level ended stayed on screen as a motionless circle until the next fight. They now fade in every phase and are cleared when a level is won.',
    'Sound tab in the game menu with separate Master, Music and Sound effects volume sliders (effects include the machine hum) and a mute box. They change what is playing at once, play a sample when you let go of the effects slider, and are remembered on the device.',
    'Email verification: a new account is sent a confirmation link and cannot play until it has been clicked (existing accounts are asked the first time). Throwaway-mail domains are refused at sign-up, and the cloud-save rules only accept verified accounts.',
    'Fights rebalanced: waves now wait until the last wave is dead plus a breather (24 seconds at level 1, down to 12) before the next starts, so there is always a real gap; counts and strength were dialled back (about 30 percent more enemies than the original, packs of 2 to 14) and the tougher types (siege crawlers, blade spiders, sprayers, gatling brutes, cannons) arrive later, so difficulty climbs steadily. Headless test: 2, 2, 5, 5, 7 turrets at levels 1, 3, 5, 6, 8.',
    'Enemies caught on rocks: an enemy that is not fighting anything and makes no headway for 10 seconds is set down on free ground nearer the core; if it gets caught again it gives up and falls. Together with the straggler rule this means a fight can never hang on scenery.',
    'Tar pits redrawn as smooth, glossy black pools with a crusted, ember-flecked lip and a dark stain on the ground round them, instead of square tiles with visible seams.',
    'Moving a building (V) now empties it: a moved turret arrives with no ammo, a smelter or assembler with no items, a generator with no fuel, a coil with no charge. Settings (recipe, filter) and health are kept. This closes the loophole where a turret could be carried across the base mid-fight and keep firing without being supplied.',
    'Accounts and cloud saves: players must sign in with email and password (or create an account with a username) before the title screen. The game uses the same Firebase project as Crystalbound Saga, so one login works in both. The saved run and the progress (unlocked commanders, stars, last choices) are stored in the player cloud document (collection cinderSaves, one document per player, readable and writable only by that player) and follow them to any device; signing out clears the browser copy. Needs the new rules in firestore.rules published in the Firebase console.',
    'The cooldown is now impossible to miss: a green COOLDOWN banner with a countdown and a draining bar appears in the round panel, and a message flashes at the start. The victory music plays while you choose your boon and square, then the build track and the running factory take over for the cooldown.',
    'Stragglers: once everything has spawned and only 1 to 3 ordinary enemies are left, they are pinged on the map after 10 seconds, run twice as fast after 18, and give up after 35, so a fight can never hang on one lost enemy.',
    'Music follows the quiet: in the breather after a win the calm build track plays (it already did) and the machines are heard again; in the lull between waves of a fight the calm track fades in after two clear seconds and the battle track returns when the next wave starts. Boss fights keep the boss track.',
    'Breather after each win: the first part of the build phase is a cooldown in which the factory and robot fabricators keep running (50 seconds on Easy, 30 on Normal, 20 on Hard, 12 on Extreme at level 1, shrinking as levels pass), shown in the top bar. After it the factory pauses for the rest of the build time. This balances the faster wave fights with time to mine and build.',
    'Waves: a fight is now split into 4 to 9 waves (more on higher levels). Each wave is a quick surge: its packs arrive about a second apart, mostly from one side, then a short breather of roughly 15 to 28 seconds to mine and repair before the next wave. The next wave comes early if the last one is nearly cleared. There are 60 percent more enemies than before in packs twice as big, each a bit weaker, so the field is busy and the fight is long but the total strength is only modestly higher. Measured with the headless test: 2, 4 and 6 turrets needed at levels 1, 3 and 5.',
    'Belts, inserters, crossovers and splitters are now always free to build as well as to remove, so laying out a factory never costs plates. Everything else still costs plates.',
    'Forests no longer appear next door: wood is only a weak generator fuel, so offering it on the first choice wasted a pick. Next-door squares now hold only iron and copper; forests start two squares out.',
       'Combat sounds added and wired: coil zap, robot shot, bullet hit, enemy death, boss arrival, structure hit, structure destroyed and a core-damage alarm (only when the core is below 35 percent). Sound effects are louder against the music. Every menu, panel, button, tab and card restyled in one modern glass-and-ember look. The first iron patch is bigger and deeper (about 45 to 75 tiles).',    'Pause: pressing P dims the whole screen with a PAUSED overlay. While paused nothing can be built, erased, moved, researched or started; only the camera works. The title screen no longer shows the map behind the logo.',
    'Commander portraits added (all nine) and the new-game screen rebuilt as a carousel: arrows, dots, keyboard, swipe, portraits in arched frames, locked commanders as silhouettes, difficulty as four tiles with flames and stat chips, and a big Start button.',
    'Enemies: base health up about 35 percent; ranged enemies appear earlier and more often, and the laser spider now shoots from range. Boons are weaker (about half) and offered every second level; the instant rewards are smaller.',
    'Map expansion: the map is a grid of 24x24 squares (A-G, 1-7). A run starts with only the square round the core, which holds a small iron patch and nothing else. After each win you choose one of three neighbouring squares to open and the game opens a second, random one; enemies come in over the edge of the opened land. What is in a square depends on its distance from the core: copper next door, then coal and tin, then lead and sulfur, then the far forests. The first time a new ore appears, a message explains what it is for. This replaces the resource-module choice. The music no longer restarts when a button is clicked.',
    'Roguelite layer: every run has a random map seed (ore patches, ammo-chain resources, rocks, trees and tar all move; the map number is shown in the HUD and ?seed=N replays one). From level 2 each fight may carry an OMEN shown before it starts (Swarm, Ironhide, Swift, Acid rain, Two fronts, Bounty, Brutal, Ash fog, A lull). Every win offers a choice of three random BOONS (turret damage/rate/range, coil damage, extra lightning hop, robot health/damage, sturdier defences, or instant windfalls: plates, science packs, free scouts, a full repair), then the resource module. Starting stock and level rewards were trimmed so the economy snowballs less.',
    'Storage chests removed (old saves put their contents in the core). Ranged enemies added: acid spitters, acid sprayers, gatling brutes, acid cannons, siege spitters and combat drones stop short and shoot, and some out-range a gun turret. The 3x2 drill keeps the plate-and-hopper look.',
    'Inserter filters: click an inserter to choose the one kind of item it moves (default: any). A filtered inserter shows the item on its corner.',
    'Storm coils now store energy: they charge up to 200, each bolt spends 50, and a full coil draws almost no power. Robot fabricators have room for 10 space of robots each (scout 1 ... Titan 10), shown as a gauge. New art in the game: rocks, burnt trees, tar pits, and the 3x2 drill.',
    'Research is now paid in science packs you craft (projectile, electromagnetic, robotics) and it unlocks robot designs and ammunition. Levels end as soon as the last enemy dies, no waiting for the clock. Waves are bigger and tougher. Robots no longer heal between levels. Spawn pings on the map, edge arrows and the minimap. Fast-forward (F, 1x/2x/4x).',
    'Smarter robots: idle robots go to their own guard post just outside the base (spread evenly round it) and face outward instead of circling through the buildings; they push gently apart so they never pile up; they no longer clip building corners; and a robot that stops making headway re-plans, then is lifted onto free ground.',
    'Mining drills are now 3 long and 2 across (turn with R). Ore leaves only from the middle tile of each long side, so the belt always starts in the middle of the drill. Drills from older saves keep their old 2x2 shape. Cost 16 iron.',
    'Smaller first map: the playable square starts at about 52 tiles across and grows with each level; outside it is unexplored and unbuildable. Natural obstacles added (boulder fields, burnt trees, tar pits and rock ridges with gaps) that block building and block ground units. Enemy ground units now path round rocks and buildings, and chew through whatever blocks them.',
    'Starter commander added (no bonus, no drawback); the six others are unlocked by achievements. Belt crossovers and splitter/mergers added. Minimap added. Range circles show on hover and while placing turrets, coils and poles. Range research added (turrets, coils, robots).',
    'Tester pack: npm run tester builds release/CinderAutomata-Tester.zip, a Windows double-click launcher (Play Cinder Automata.bat) with a small built-in local server, plus a Mac/Linux script and a read-me for testers.',
    'Belts now always connect visually: the first tile of a line bends away from an inserter that feeds it, and dead-end tiles turn to face what they feed, whether built before or after it, and in existing games.',
    'Ground robots now path round buildings instead of walking over them (belts and inserters are walkable); flying robots are unaffected. Belt ends turn to face whatever they feed (inserter, core, turret, fabricator, smelter...). Ore on belts is larger and scattered across the belt width so a full belt looks like a heap.',
    'Machine and ambience loops added (drill, smelter, belt, assembler, generator, coil hum, wasteland wind, battlefield bed). All set to the same loudness; the game plays them by what is on screen while a fight runs.',
    'Building sounds added (place, belt, remove, rotate, pick up, put down; several takes each, picked at random). Music: a calmer track now plays while building; every fight opens with the battle track and, on boss levels, crossfades to the boss track once the boss is in sight. Star sound replaced.',
    'Boss music (Relentless March), victory music (Triumph in Steel) and defeat music (Silent Descent) added and wired: the boss track plays on boss levels; the victory and defeat pieces play once when a level is won or the core falls.',
    'Difficulty levels (Easy, Normal, Hard, Extreme) and achievement-based commander unlocks added, as agreed with collaborators. Fight music for levels 1 to 9 (Front Line Defense) added.',
    'Build-phase music (Factory Dawn) added. Music now follows the phase: build track while building, fight tracks by level range (fight-1, fight-2, fight-3, boss) once they exist.',
    'Menu music (Ember Glow) added: plays on the title screen and commander select as a seamless loop and fades out when a game starts.',
    'Colossus Walker art replaced with a new version. Decisions recorded: difficulty levels, commander unlocks through achievements, structure-repair cost by difficulty.',
    'Sound effects started: interface sounds are in and played (click, menu open, refusal, fight start, level complete, star, defeat, build phase). Sound on/off button (N).',
    'Research added (press T): projectile damage and rate of fire, electromagnetic damage and extra lightning hops, robot plating and weapons, reinforced structures. Base turrets fire a little slower (0.42s) and Storm coils start weaker (30 damage, 2 hops) so research has room to matter.',
    'Inspect mode (F3): hover anything to see what it needs and how to connect it. Buildings placed in a build phase are blueprints (blue, dashed) that lock in when the fight starts; removing a blueprint is free. Belt ends beside the Core now turn to face it.',
    'Removing belts and inserters now refunds them in full; other buildings still refund 75%. New: move a building for free with V; F2 controls panel; warning marks over mis-wired machines.',
    'Commanders added: a select screen with six playable commanders (bonus and drawback each), stars for completing level 10, 20 and 30, and Endless play past level 30 with best level recorded. Artillery and Fire commanders are shown as coming soon.',
    'Bosses added: Siege Brute (level 10), Colossus Walker (level 20), Hive Queen (level 30), repeating every ten levels. Each walks in 30% of the way through the fight, the level cannot end until it is dead, and it pays a bonus. Health bar on the map and boss name in the top bar.',
    'Balance pass 1: enemies now arrive in packs and health scales faster early, slower late. Measured with a headless test (tools/balance.ts): about 9 turrets with endless ammo hold level 10, about 16 hold level 18.',
    'First version of this document.',
    'Storm coil, generators and power poles added, with painted art and lightning effects.',
    'Menu with a picture guide of every building, robot, enemy and recipe. Interface rebuilt to scale with the window.',
    'Self-connecting walls. Logo added to the title screen. Installable web app (offline play) added.',
    'Building costs, core stockpile, refunds. Save and Continue.',
    'Assemblers, ammo chain (bullets, shells), resource modules after each level.',
    'Robots redone as top-down sprites that turn to face targets; enemy waves with 10 enemy types.',
  ] },
];
