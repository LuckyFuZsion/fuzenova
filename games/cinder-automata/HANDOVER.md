# Cinder Automata: hand-over notes

For any developer or AI assistant picking this project up. Read this first, then `docs/DESIGN.md`.

**What it is.** A browser top-down 2D factory + defence roguelite by FuzeNova Games. You mine ore, smelt it, craft ammunition,
science packs and robots, wire up power, and hold the line against waves. Written in TypeScript with Vite and Canvas 2D; no game
engine. It is published at `https://luckyfuzsion.com/play/cinder-automata/index.html`.

The owner (Steve) makes the art with Gemini and the audio with ElevenLabs and Suno, and sends files. The code is all in this folder.

---------------------------------------------------------------------------------------------------------------------

## 1. Run, test, build

Work from `games/cinder-automata` inside the `luckyfuzsion` folder (open **this** folder in your editor, not the old `slot-streamers` project). Node 22 on Windows (the folder is inside OneDrive).

| Task | Command |
|---|---|
| Dev server | `npx vite --port 5177 --strictPort --host localhost` then open `http://localhost:5177/` |
| Skip the sign-in screen (dev only) | add `?nologin=1` to the address |
| Replay a map | add `?seed=4242` |
| Quick fights | add `?build=20&fight=60` (seconds) |
| Tests | `npx vitest run` (about 200 tests, 30 files, well under a minute) |
| Type check | `npx tsc --noEmit` |
| Balance harness | `npx tsx tools/balance.ts 1,3,5,8` (slow above level 8; second argument `r` adds typical research) |
| Rebuild the design document | `npm run gdd` (writes `docs/Cinder-Automata-Design-Document.pdf` with Edge headless) |
| Tester zip for people without a server | `npm run tester` (Windows double-click launcher in `release/`) |

`window.__game` and `window.__audio` exist in the dev server only, for poking at state from the browser console.

**Always run `npx tsc --noEmit` and `npx vitest run` before finishing a change.**

### Dev server gotchas (Windows + OneDrive)
- The Vite server sometimes stops between sessions, or serves stale files. Kill whatever listens on 5177 and start it again. If a tool-started server keeps dying, start it detached (`Invoke-CimMethod Win32_Process Create` in PowerShell).
- `vite.config.ts` ignores `docs/`, `art/`, `release/` and `tools/` for file watching, so rebuilding the design document does not reload the page.
- In a hidden or background browser tab the game loop is paused (`requestAnimationFrame`), so automated screenshots can show a frozen game. Bring the tab to the front.
- Shell tools on Windows: bash heredocs break on some quote patterns. Write scripts to a file and run them.

---------------------------------------------------------------------------------------------------------------------

## 2. Deploy (this is a static site inside a Next.js repo)

The game builds into `../../public/play/cinder-automata` of the **luckyfuzsion** repo (`https://github.com/LuckyFuZsion/luckyfuzsion`,
branch `main`; Vercel deploys on push). The game's **source is not in that repo**, only the build. Back the source up separately.

1. `node tools/build-sound-manifest.mjs && npx tsc --noEmit && npx vitest run && npx vite build && node tools/build-pwa.mjs`
2. Delete dev-only files from the build: `public/play/cinder-automata/audio/original`, `.../audio/alt`, `.../sound-test.html`.
3. Smoke-test the built copy: serve `public/play` with any static server and check the sign-in screen appears and assets load.
4. From the `luckyfuzsion` repo root, commit **only** `public/play/cinder-automata` (and `lib/streamer-config.ts` if the games list changes). The repo has
   many unrelated uncommitted files (Crystalbound assets, `tsconfig.json`): never `git add -A` at the root.
5. `git push origin main`. Check the live page's script name (`assets/index-XXXX.js`) changes to confirm the deploy (about a minute).

The game is a PWA with a cache-first service worker (`tools/sw-template.js`). A visitor's first load after a deploy shows the old version;
the new service worker then takes over and the game reloads itself on the title screen (or shows a "new version ready" button in play).

### Accounts and cloud saves (Firebase)
- Same Firebase project as Crystalbound Saga (`crystalboundsaga`): one login works in both. Web config is in `src/firebase-config.ts` (public client settings).
- Players must sign in with email + password and **confirm their email** before the title screen (`src/authui.ts`, `src/cloud.ts`).
- Saves live in Firestore collection `cinderSaves`, one document per player (`{ run, profile, ... }`), uploaded at most once every 30 s and only if changed.
- Rules are in `firestore.rules` and must be published by hand in the Firebase console. **Order matters:** publish the game build first, then the rules
  (the rules require a verified email; the old game build does not ask for one).
- Local-only data: `localStorage` keys `cinder-automata.*` (save, unlocks, progress, commander, difficulty, audio volumes, controls hint).
  Signing out clears the game data.

---------------------------------------------------------------------------------------------------------------------

## 3. Code map

`src/sim/` is the headless simulation (no DOM, fully unit tested). Everything else draws it or handles input.

| File | What it does |
|---|---|
| `sim/world.ts` | The map and every entity (belts, drills, smelters, turrets...), `place/remove/putBack`, belt/inserter/miner stepping, save state (`exportState/importState`), `cue()` for sounds, `markHurt()` for the minimap glow |
| `sim/combat.ts` | Turrets (incl. variants and belt sharing), coils, robots (leash, rally, stuck handling), enemy targeting/attacks, ranged enemies, separation, repairs |
| `sim/round.ts` | `Run`: phases (build, fight, won, lost), wave spawning with breathers, cooldown after a win, stragglers, stuck enemies, early call |
| `sim/flowfield.ts` | Flow-field pathfinding for ground enemies (one Dijkstra from the core; 3 variants: small, big, brute) |
| `sim/pathfind.ts` | A* for robots (big robots keep a tile clear of obstacles), `solidAt`, `clearLine`, `freeSpot`, `escapeSpot` (lift a walled-in unit out), `evictUnits` |
| `sim/enemies.ts` | Enemy table (hp, speed, range, armour, insulated), spawn weights by level, `armouredDamage` |
| `sim/mapgen.ts`, `sim/plots.ts` | Random map per seed on a 7x7 grid of 24x24 plots; resources by distance ring; the player opens plots after each win |
| `sim/research.ts` | Techs, costs in science packs, level gates, research time, `researchFx` multipliers |
| `sim/roguelite.ts` | Omens (per-fight twists) and boons (pick 1 of 3 every second level) |
| `sim/turrets.ts` | Scatter gun and Sniper branches |
| `sim/costs.ts`, `sim/items.ts` | Prices, refunds, items, recipes, `CORE_ITEMS` (what the core accepts) |
| `sim/power.ts` | Power networks and Storm coil charge |
| `sim/robots.ts`, `commanders.ts`, `achievements.ts`, `difficulty.ts` | Robots, commanders and their unlocks, difficulty levels |
| `game.ts` | The big one: input, toolbar, HUD, flow of a run, menus wiring |
| `render.ts`, `sprites.ts`, `atmosphere.ts`, `minimap.ts` | Drawing |
| `discoveries.ts` | "New discovery" pop-ups: the first time an item appears the game pauses with a card until the player clicks Got it (seen list saved to the account) |
| `menu.ts`, `commanderui.ts`, `researchui.ts`, `pickerui.ts`, `filterui.ts`, `plotui.ts`, `authui.ts` | UI panels |
| `audio.ts` | Web Audio: music (one track at a time), sound effects, looping beds, separate music/effects volumes |
| `cloud.ts`, `save.ts`, `progress.ts` | Cloud and local saving |
| `style.css` | All styling (a modern glass theme block is near the end; later rules win) |

Docs: `docs/DESIGN.md`, `docs/PLAN.md`, `docs/gdd/content.ts` (the hand-written parts of the PDF; **update its changelog with every change**, then run `npm run gdd`),
`docs/ART_PROMPTS.md`, `docs/AUDIO_PROMPTS.md`.

### Art and audio pipeline
- Art arrives as Gemini sheets (JPG on a flat dark background). Cut them with a small Pillow script: flood-fill the background from the cell corners, trim to
  the alpha box, save PNGs into `public/sprites/`. Sprite roles and sizes are declared in `src/sprites.ts` (`SPECS`, `ITEM_FILE`). Raw sheets go in `art/raw/`.
- Sound effects: ElevenLabs downloads are processed by `tools/fix-sfx.py` (rotates looped files, trims, normalises), then `node tools/build-sound-manifest.mjs`.
  Sound cues are raised by the simulation with `world.cue('name')` and played in `Game.playCues`.
- Missing art falls back to drawn shapes, so the game runs before the art exists.

---------------------------------------------------------------------------------------------------------------------

## 4. Rules we settled on (do not undo these without asking the owner)

- The factory runs only during fights **and the cooldown after a win** (50 s Easy, 30 Normal, 20 Hard, 12 Extreme at level 1, shrinking with level). The rest of the build phase is frozen.
- Belts, inserters, crossovers and splitters are always free. Removing other buildings refunds 75%. Buildings placed in a build phase are free-to-change blueprints.
- **The core is a one-way store** and accepts only iron/copper plates and science packs (`CORE_ITEMS`). Nothing can be taken back out. Turret ammo must come by belt from a smelter. No chests exist.
- Terrain: rock, trees, tar pits and toxic pools block walking and building; mud slows ground units (x0.55) and can be built on. All generated from the seed in `sim/mapgen.ts`, not saved.
- The **scrap bin** (key B) accepts any item and destroys it; the Core still takes only plates and science packs. Pair it with a filtered inserter to clear one kind of leftover.
- Gun turrets are upgraded in place (double-click) to a Scatter gun or Sniper, unlocked by the Turret designs research. The in-game guide (Menu > How to play), the Buildings tab and the research-complete message all say so.
- **Robots:** each fabricator holds 12 space (scouts/drones 1-2, Heavy 4, Turret walker and Artillery 6, Titan 12). Robots only go after enemies within 30 tiles of the fabricator that built them (or the Core), always fight anything within 9 tiles, and march to help anywhere inside that leash; idle ones stand at guard posts just outside the base. The Titan plans routes keeping a tile clear of obstacles; a robot walled into a pocket is lifted out after ~3 s.
- **Enemies target** the nearest of walls, turrets and Storm coils within 7 tiles; power poles and generators only within 4.5 tiles and count 4 tiles farther (so a wall nearly as close is hit first). Everything else is hit only when touched. Bosses crush rocks and trees if stuck. Solid buildings cannot be placed on top of a walking enemy.
- Turrets on one belt share it: a turret does not pull if a turret further down that belt is emptier (in-flight ammunition counts).
- After a win the map offers/open squares **nearest the core first** (random only within the same ring).
- The game checks for a new version every 10 minutes and on returning to the window, and shows a reload button; sign-in is kept on the device until sign-out.
- Moving a building (V) empties it (no ammo, items, fuel or charge).
- Waves: 4 to 9 per fight, each a quick surge from one side; the next wave starts only after the last is dead plus a breather (about 25 s down to 14 s); first wave small, last biggest; later waves lean towards the least-defended edge. "Call next wave" (C) pays plates.
- The map starts as one 24x24 plot with iron only; after each win the player picks one of three neighbouring plots and the game opens a second. Copper is always next door; forests start two plots out.
- Research costs science packs, takes factory time, needs the run to reach set levels, and from level 2 of a tech needs a second pack kind and from level 3 the Advanced pack (steel, bullets, bronze).
- Heavy enemies have flat armour; some are insulated against Storm coils. Storm coils charge slowly (20/s, a bolt costs 50).
- Sign-in with a confirmed email is required to play.
- Nothing is committed or deployed unless the owner asks.

---------------------------------------------------------------------------------------------------------------------

## 5. Known issues and to-do

- **Balance is a first guess**, especially above level 8. The headless test (`tools/balance.ts`) only measures turrets. Needs real play-testing of waves, research costs and boons.
  Current targets: roughly 2, 3, 5, 7 turrets at levels 1, 3, 5, 8.
- Level 9 has about 72 enemies; the owner may want about 50 with sturdier enemies (suggested, not applied).
- **Art:** all the art the game uses now exists. Wall damage states and the four armoured/insulated enemies are done; originals of replaced sprites are in `art/raw/`. Optional extras only (terrain features, fx, UI frames).
- **Audio to come:** fight-2 and fight-3 music, acid spit, a dedicated turret shot, robot destroyed, pause and menu sounds.
- Not built yet: capturable enemy nests, more research branches, flame/laser/rocket/artillery turrets (art exists; the Artillery and Fire commanders wait for them),
  Workshop and Salvage, Codex.
- Not decided yet: a rally flag / stances for robots; a game launcher or hub page (a web hub on luckyfuzsion.com was recommended over a downloadable launcher); a leaderboard (public score cards, never the private saves).
- Idea list: reduce the first-load size (about 38 MB; convert sprites to WebP and drop unused sprite files).
- The tester pack (`npm run tester`) is out of date until rebuilt.
