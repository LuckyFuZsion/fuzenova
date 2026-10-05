# Cinder Automata - game design (agreed direction)

Round-based factory defence: build a factory, then it runs while a fight happens. Inspired by the "factory + waves" idea; not an open-ended Factorio sandbox.

## Core loop
1. **Build phase** (timed, roughly minutes; the player may start the fight early - reward for doing so, e.g. an extra module choice or score bonus).
2. **Fight round**: the factory runs ONLY during fights. Rounds last about 3-10 minutes and get longer later. **Building is always allowed**, including mid-fight, so a jam is never fatal.
3. **End of round**: the player places a **resource module** (choice of a few) on the map. Captured tiles (see below) become buildable land.
4. Repeat with stronger waves. Score = waves survived.

## What the factory makes (three sinks; the player splits throughput between them)
- **Ammo** for weapons. Turrets pull ammo from an **adjacent belt** and keep a small stockpile (no inserters for turrets).
- **Soldiers**: robots built in the factory, from small flying drones up to huge automatons. They automatically defend the base and **attack enemy spawners**. Destroying a spawner **captures its tiles**, which can then be used to expand and improve the base.
- **Research**: lasts for the current run only.

## Recipes agreed so far
- coal + sulfur -> gunpowder
- lead + copper -> bullet casing; bullet casing + gunpowder -> bullet
- copper + tin -> bronze
- wood in a furnace -> charcoal (called "coke" in the original notes); iron + charcoal -> steel
- steel + bronze -> shell casing; shell casing + gunpowder -> artillery shell
New raw resources needed: tin, lead, sulfur, wood. Smelting needs a two-input (alloy) recipe type.

## Commanders (chosen at the start of a run; each has a bonus and a drawback) - placeholder names
| Commander | Theme | Bonus | Drawback |
|---|---|---|---|
| Gunnery Chief Brakka Vesh | Arsenal | Machine-gun turret damage, bigger ammo stockpiles | Weaker robots |
| The Foundry Regent | Robot army | Robots build faster / cost less, tougher automatons | Weaker turret damage |
| Stormwarden Ilka Thorne | Lightning | Tesla coils and rail guns chain further | Power-hungry, weak ammo turrets |
| Marshal Ozric Bellwether | Artillery | Bigger splash and range on shells | Slow to react |
| Cinder Queen Ysolde Ash | Fire | Flame turrets, burning damage | Short range |
| Forewoman Tamsin Brassgate | Pure factory | Faster belts and research, extra module choice | Few combat bonuses |
| Doctor Pim Quillfeather | Drone swarm | Cheap, numerous small flying robots | Big units cost more |
| Bastion Grimwald Oaksworn | Fortress | Tougher walls and turrets | Slow robots |
All names are original placeholders (avoid film/comic characters); check trademarks before release.

## Progression and modes
- One **level = one round** (build phase + fight). Each commander earns stars: 1 star for completing level 10, 2 stars for level 20, 3 stars (max) for level 30.
- **Endless mode**: keep playing at ever-increasing difficulty until you die. Proposed: it unlocks for a commander at 3 stars, and records the best level reached per commander.
- Time cost: rounds grow from about 3 minutes (level 1) to 10 minutes (level 30). Reaching level 10 is roughly 35 minutes and a full 30-level clear is 2-3 hours, so **autosave at the end of every round and resume later is a core feature**, not polish.
- Stars, best endless level and unlocked commanders are stored per browser (localStorage); the run in progress is saved separately so it can be resumed.

## Game-to-game progression (proposal, awaiting decision)
Goal: a reason to start another run, without making early levels trivial.
1. **Commander stars** (above) unlock the commanders themselves and Endless mode.
2. **Salvage** (permanent currency): every run pays out based on the level reached, enemy spawners captured and bosses beaten, win or lose. Spent in a **Workshop** on *sideways* unlocks rather than raw power:
   - new buildings / turret and robot types added to the in-run research pool (so a fresh run can research more options, not start stronger);
   - extra starting kits (a choice of opening layouts / resource modules);
   - commander perks: 2-3 optional perks per commander, gated by that commander's stars;
   - a wider pool of resource modules and enemy types (variety).
   Small pure-power upgrades are allowed but capped (for example +5% max), so level 30 stays a real test.
3. **Codex and badges**: enemies, recipes and items you have met are logged; badge icons (sheet 42) for milestones.
4. Storage: everything above lives in the browser (localStorage) first. A global leaderboard or cross-device account needs a backend; if that is wanted later it should be its own project or strictly separated tables, not the shared site database (see the site's Supabase security notes).

## Visual rule
Player robots look clean and freshly built (blue and orange trim). Enemies stay rusted and feral with red glows, so fights are readable.

## Cut from the old roadmap
Fluids/oil, trains, vehicles, construction robots, and most late-game power. Combat art (turrets, enemies, projectiles, effects) is now first priority.

## Open questions
- Exact build-phase length and the early-start reward.
- Enemy spawner behaviour and how many tiles a capture gives.
- How commanders unlock (all available, or earned).
- Does Endless unlock at 3 stars (proposed) or is it open from the start?
