# Crystalbound Saga — handoff notes for Claude Code

This folder is a complete, working browser game built in a claude.ai chat, then moved here so it can be
maintained inside Steve's Next.js site (`public/play/crystalbound/`). Read this whole file before editing.

## What the game is
A mobile-first fantasy **match-3 RPG** (Candy Crush loop + Final-Fantasy-style RPG shell). Every level is a
fight: matching element tiles damages a foe, foes attack back on a timer, bosses change phase. 300 levels.

- 5 tile elements: Ember(0), Tide(1), Storm(2), Loam(3), Dawn(4). `HOLLOW = 5` is a foe-only element (weak to Dawn only).
- Weakness cycle (`BEATS`): Ember>Loam, Tide>Ember, Storm>Tide, Loam>Storm. 2x damage on weakness, 0.5x on resist.
- Specials: 4-in-line = Elemental Burst (row/col), T/L = Crest Surge (3x3 twice), 5-in-line = Summon Orb. All
  special+special swap combos are implemented (`comboActivate`).
- Blockers: Petrified Chains (layers), Elemental Wards (only own element breaks them), Hollow Miasma (floor layer).
- Level mechanics: `mech:'shield'` (foe takes 65% less damage while any Miasma exists, Miasma spreads) and
  `mech:'relic'` (relics dropped to the bottom row hit the foe for 25% max HP).
- Bosses: phase 2 at 50% HP (turn Hollow + Miasma shield), enrage at 25% (attack every 2). Bosses **heal**
  when they hit the player (Strike 4%/6%, Drain 9%/12%). Rosalind's Radiant Veil blocks the next attack.
- 3 Guardians (player companions, one equipped): Mirelle (Tide, Riptide), Rosalind (Dawn, Radiant Veil),
  Verdanne (Storm, Skyfall). Gauge fills from their element; tap portrait to cast.
- Forge: Tempering (dmg), Resolve (moves), 5 Affinities. Wardblade evolves at 6/14/24/36 upgrades
  (`TIERS`), each form adds a real battle bonus. Costs in `COST`.
- Meta: Starlight energy (5, refunded on win), stars per level, items (Elixir, Whetstone, Hammer, Warp Scroll,
  Ember Plume revive). **No real-money store yet** — "Refill (prototype)" button is a placeholder.

## Files
```
index.html          the entire game: HTML + CSS + one <script> (vanilla JS, no framework, no build step)
assets/guardians/   {tide,dawn,storm}-{face,full}.jpg   (face = cropped round portrait); wardbearer-* = the player (`WARDBEARER`)
assets/bosses/      {poseidon,zeus,hades,wyvern,leviathan,devourer}-{face,full}.jpg
assets/enemies/     {ashwalker,construct,cavern,weaver,sentinel}-{face,full}.jpg
music/boss1-3.mp3   recorded boss themes (Combo Breaker, Arcane Annihilation, Boss Battle Drop)
music/title.mp3     Enchanted Loop: title + map/Forge/Guardians screens (FILE_TRACKS; one loop shared, never restarts between them)
music/defeat.mp3    The Magic Fades: plays once on the defeat screen
music/miniboss.mp3  Nimble Hero's Charge: every mini-boss fight
music/story.mp3     Enchanted Loop (story version): all story scenes (`playScenes`)
assets/story/       story stills (defeat.webp = defeat screen, held DEFEAT_HOLD_MS = 10s before Retry/Map/Plume appear)
tests/smoke.mjs     headless Node bot that plays levels to catch runtime errors
```
Everything else (sfx, regular battle music, gems, UI art) is generated in code (Web Audio + canvas + inline SVG).
Only external dependency: Google Fonts (Cinzel, Nunito) with system-font fallbacks.

Served at `/play/crystalbound/index.html` by Next.js as a static file. **Keep all asset paths relative**
(`assets/...`, `music/...`) so the folder works anywhere. Don't convert this to React/Next components unless
Steve asks — it's deliberately a single self-contained page.

## Code map (sections of the <script> in index.html, in order)
DATA (elements, GUARDIANS, BIOMES = chapters, BOSS_ART, TUTORIAL, CHAPTER_FOES, chapter generator for all
300 LEVELS) → SAVE → AUDIO (SFX + generative `Music` + `BOSS_MUSIC` file tracks) → DOM HELPERS/SCREENS →
MAP/FORGE/GUARDIAN screens → BOARD STATE (matching, clearing, gravity, combos, foe events) → LEVEL FLOW
(start/intro/victory/fail/pause, Arts, items) → HUD/FOE ART → RENDERING (canvas) → INPUT (touch, mouse,
keyboard, gamepad) → INFO TOOLTIPS (hover 1s / hold 1s / glowing ? help-mode button) → BOOT.

Key functions: `findGroups`, `specialFor`, `clearCells`, `resolveBoard`, `trySwap`, `comboActivate`,
`endTurn`, `foeAttack`, `hitFoe`, `foeEvents`, `introSequence`, `victorySequence`, `winLevel`, `failLevel`,
`renderMap`, `renderForge`, `renderGuardians`, `weaponTier`, `migrate`, `save`.

## Story scenes
`STORY` holds every scene as beats `[image, speaker|null, text, fx]` (`speakerInfo` gives name/face/colour;
null = narrator; fx 'quake' shakes the still). `runStory` shows a full-height still with a typed dialogue box
(tap/A/Enter = next). Scenes can't be skipped; every line must be tapped through. Scenes play once: `beginJourney()` plays the prologue + chapter 1 intro before the map on a new game (Begin, or New Game > Yes);
`storyBefore(i)` runs the prologue + chapter intro
before any level of a chapter whose intro is unwatched; `winLevel` plays `outroN` after a chapter boss. `S.seen`
records watched scenes; the map's "📖 Story so far" plays every reached scene (intro once in the chapter,
ending once its boss is beaten). Stills live in assets/story/ (portrait,
~457x1024). Chapter 1 has Steve's own stills; chapters 2-10 reuse character art until he supplies more (he makes them in
Gemini one at a time, coded S2a..S10c; S2a = assets/story/ch2-intro.webp is in). Add each to the SI map and swap it into
the matching beats.
Never use gendered pronouns for the Wardbearer (the player); write "you" or "the Wardbearer".

## Log Book, Forge balance, Brann
- **Log Book** (`LOG`, `discover(key, silent)`): the first time a mechanic appears, a "New Log Book entry" card
  explains it at a safe moment (start of a fight / end of a turn, max 2 at a time via `battleDiscoveries`).
  Entries are saved in `S.log`; the title screen and pause menu open `openLogBook()`. Keep texts true to the code.
- **Several foes** (chapter 4+): `addExtraFoes` gives some regular fights a 2nd foe (3rd from chapter 7) sharing the
  HP (60%/45% each) and chapter bosses minions. In battle `foes` holds every foe and `foe` is the TARGET, so almost
  all code still reads `foe`. Tap a card in `#foeRow` (T / LB) to retarget; specials splash `SPLASH` (40%) onto
  other foes; each foe has its own staggered timer, and a non-target attacker briefly takes the panel. Only the
  primary (non-`add`) foe heals, phases or enrages. Only ONE foe may strike per move (others due wait a move), and
  boss/mini-boss minions never strike the Ward (attacks: chain, ward; slower timer).
- **Two Guardians**: `fightersFor(L)` returns 1 or 2 Guardian indexes (chapter `party` of 2 = both fight; party of
  3 = the pair in `S.duo`). `gauges[k]` charges `fighters[k]`; `castArt(slot)`; buttons `#guardianBtn`/
  `#guardianBtn2` (G/H, Y/RB). `BG(k)` = the k-th fighter.
- **iOS audio**: iPhones ignore `<audio>.volume`, so recorded tracks go through a Web Audio gain (`fileGain`/
  `setFileVol`) and `muted` is set too. Never set `.volume` directly.
- **Signature attacks**: Poseidon has 'surge' (Tidal Surge: chains the row with the most free tiles). Add more by
  giving a chapter boss a new attack kind in `CHAPTER_FOES` + `ATTACK_INFO`/`ATTACK_DESC` + a branch in `foeAttack`.
- **Lieutenant lines** (`miniLine`, `MINI_LINES`, `MINI_TEMPLATES`): one line before the first fight with each
  mini-boss (`S.seen['mini' + levelIndex]`). Chapter 1 has written lines; others use templates naming the boss.
- **Characters & Foes** (`galleryEntries`, `openGallery`): portraits + profile + stats for allies, chapter bosses,
  lieutenants (only chapters reached are listed) and foe families. `S.met` records fights (`meetFoe`/`beatFoe`).
  Title screen and pause menu buttons.
- **Forge caps** (`FORGE_CAP`, `chapterReached`): each upgrade line is capped by the chapter reached, so the
  Wardblade's forms land around chapters 1/3/6/9. Capped rows show "🔒 Ch. N".
- **Enemy HP after level 30** (`regHP`) grows linearly with the power the caps allow (~2.8x per move by 300).
- **Brann** (`BRANN`, `BRANN_LINES`, `brannSays`): the smith greets the player with a line fitting their state
  (can afford / broke / capped / close to a new form / just bought / maxed). New games meet him by **rescuing him
  from the first mini-boss** (level 5 / index `FIRST_MINI` = 4, Abyssal Weaver Matriarch): `MINI_LINES[4]` teases
  the captivity, `brannRescue` plays on the first win, the Forge unlocks (`forgeUnlocked` / map `#toForge` hidden
  until then), and the victory card sends the player into the Forge lesson. `playScene('brannRescue')` also sets
  `S.seen.forgeIntro` so the gallery stays consistent. Older saves may still have the short `forgeIntro` only.
  His art lives in assets/characters/brann-{face,full}.jpg; the rescue still is assets/story/brann-webbed.webp
  (beats 1–3 of `brannRescue`; his forge portrait returns for the later beats).
- Toasts (objective, "Fight!", attack callouts) sit on a dark plate at 38% height so they stay readable.
- Audio pauses while the page is hidden (`visibilitychange`/`pagehide`) and fades back in; on iOS,
  `navigator.audioSession.type = 'playback'` stops the silent switch muting battle music and SFX.

## Loading, caching, saves
- **Launch** (`prepareLaunch`): the title music starts downloading as the page opens; the Begin button reads
  "Loading…" until it can play (max 4s) but stays tappable.
- **Fetch ahead** (`prefetchAhead`, from `goMap`): downloads the next level's portraits and boss/mini-boss music plus
  the chapter's story stills (and the next chapter's near its end), once each.
- **Offline cache** (`sw.js`, registered on https/localhost): index.html network-first; images cache-first with a
  background refresh; music cache-first with byte-range slicing (iOS requests audio in ranges). **Bump `VERSION` in
  sw.js whenever an .mp3 is replaced under the same file name**, or players keep the old track.
- **Backup codes** (`saveCode`) are the whole save as base64 JSON; importing runs `migrate()`. The title screen has
  💾 Save / load code and **New game** (copies the current code to the clipboard, asks "are you sure", then resets
  everything except sound/shake). A test code with everything unlocked is generated by building a save from
  `defaultSave()` (see assets/New/test-everything-unlocked.txt, kept out of git).

## Cloud save (Firebase)
Local-first: every `save()` still writes `localStorage` (`crystalbound-save-v1`). When the player is signed in,
`pushCloud()` (debounced 1.2s) also writes Firestore `saves/{uid}` with `{ json, savedAt, summary }`.
`initCloudSave()` prefers Claude.ai cloud if `window.claude.use` exists; otherwise Firebase Auth + Firestore
when [`firebase-config.js`](firebase-config.js) has real keys (`firebaseReady()`).

**Console setup (Steve):**
1. Firebase project → Authentication → Email/Password → Enable.
2. Firestore → create database (production) → paste [`firestore.rules`](firestore.rules).
3. Project settings → Web app → paste config into `FIREBASE_CONFIG` in `firebase-config.js`.
4. Auth → Authorized domains → `localhost` + Vercel host(s).
5. Keep `FIREBASE_ENABLED = true` once keys are filled; leave `apiKey` empty for local-only.

**UI:** Save & Load menu — create account / sign in / sign out. On sign-in, remote vs local is compared with
`progressScore()` (then `savedAt` as a tie-break); the better save wins. Backup codes still work either way.

## Onboarding and flow (added after the handoff)
- **Loading screen** before every level (`showLoading`): level + foe, a rotating character profile from `CODEX`
  (only characters already met; no story spoilers), and a tip. It waits for the player to tap "Tap to begin".
  `REPLAY_TIP` shows every 4th load; `contextTip()` explains a level's mechanic on the first try.
  **Every tip must match the code**: e.g. replays pay half ore + full remnants/essence, but boss item bundles
  are one-time and Whetstones only come from a first 3-star clear.
- **Guardian Art spotlight** (`artSpotlightCheck`): the first `ART_SPOT_TIMES` (3) times a gauge fills, the
  screen dims except the portrait. The first time is forced (board locked until cast). Save field `artSpot`.
- **First Forge lesson**: after Brann is free, the first win where a never-forged player can afford an upgrade
  (usually the rescue win) sends them to the Forge, and `goMap()` is blocked until they buy one. Save field
  `forgeTaught`. The rescue win tops up ore to at least the first Temper cost if needed so the lesson can't soft-lock.
- **Help**: the glowing ? button on every screen toggles tap-for-info mode (same tooltips as hover/hold).
- **Boss hit alert** (`hurtScene`): when a boss/mini-boss knocks off a Ward heart, the player's portrait and
  hearts flash centre-screen with one heart breaking (portrait = the Wardbearer), plus a big shake.
- **Defeat**: `failLevel` shows `assets/story/defeat.webp` + `music/defeat.mp3` for `DEFEAT_HOLD_MS` (10s)
  before Retry/Map/Plume appear.
- **Music**: `FILE_TRACKS` routes title/map screens to the Enchanted Loop; `keptAudio` pauses rather than
  destroys it, so it resumes mid-song after a battle. Every recorded track plays at `FILE_VOL` (0.3) and fades in
  over `FADE_MS` (2s).
- Boss healing has a cooldown: at most once every `foe.healEvery` attacks (default 2; `foe.healIn` counts down,
  and the intent line only says "heals" when one is ready). The first three bosses (levels 5/10/15) skip the x1.2
  HP pass, get +4 moves, heal half as much (`healMul`), heal only every 3rd attack and summon 3 Miasma in phase 2
  instead of 6 (`phaseMiasma`).

## Level structure: Book I = 10 chapters x 30 levels (restructured Sept 2026)
`BIOMES` holds the 10 chapters (name, short, sub, colours, `party` = Guardians the story allows, `partyNote`).
`CHAPTER_FOES` gives each chapter its regular foe family, its boss, and 5 mini-boss names. One generator builds
all 300 levels (`LEVELS`), seeded per level with `mulberry32(5000 + n)`:
- k = 29 (levels 30, 60 ... 300): **chapter boss** (`boss` + `chapterBoss`), unique art + recorded music.
- k % 5 === 4: **mini-boss** (`boss` + `mini`): named lieutenant, 1.3x HP, +6 moves, gentle heals, no enrage,
  one-time item (`MINI_ITEMS`). Map shows ✦; chapter bosses ♛.
- Other levels: one of 7 regular templates (chains / Miasma shield / wards / relics / chain gauntlet / warded vault
  with mixed-element wards / rising Miasma). Levels 1-4 are the
  hand-built `TUTORIAL`.
- Difficulty: `regHP(n)` (600 + 150/level to L30, then +0.75%/level), `regMoves`, `attackEvery`, `blockCount`.
  Early chapter bosses have `healMul`/`healEvery`/`phaseMiasma` set to be gentler.
- Guardians unlock by story (Rosalind at level 31, Verdanne at 61). `guardianFor(L)` picks who fights from the
  chapter's `party`; the pre-level card lets the player choose when more than one is allowed. Battle code uses
  `BG()`, never `GUARDIANS[S.guardian]` directly.
- Chapter names show as "???" on the map until reached. Reached chapters use their intro still (`CHAPTER_ART`) as the
  map background under a light tint; there is no greyscale-by-progress any more. Locked nodes are dimmed, not grey.
- Stars/unlock are saved per level index: once players have progress, never insert or remove levels, and
  never change the seed formula or the order of `rng()` calls. Add Book II by appending chapters.
- Chapter-boss art for chapters 7-10 (Sept 2026): hollowknight (Ember), hollowrosalind (Hollow), crownbreaker
  (Tide), paleregent (Hollow). All six boss files live in assets/bosses/.

## Board art, win juice and difficulty (Sept 2026)
- Painted tiles live in `assets/tiles/` (ember/tide/storm/loam/dawn/orb/relic/socket, and fx-burst/crest/chains/ward/miasma/select overlays). `TILE_IMG`/`ART` preload them; `artReady()` gates every draw, so the vector gems remain the fallback (and the node smoke test never needs images).
- Tiles are opaque, so Miasma is drawn twice: in the socket and again as a light haze (alpha ~0.24) + glowing purple border over the tile. Elemental Wards get light ice + a thick frame in the element colour + a lock badge. Steve found both hard to read when they were darker, so keep them light. Power-up overlays (Crest sun, Burst arrow) are drawn with 'screen' blend at ~45–60% alpha over the full tile: Steve couldn't tell a Crest's element when the star was opaque. Any new overlay art must leave the tile's symbol readable. Bursts and Crests also carry a corner badge (arrow / gold star, bottom-left), like the Ward's lock (top-right), so a special is recognisable even on a Dawn tile.
- `assets/tiles/icons/` holds 128px icons composited from the tile art with the same settings (script-built; rebuild them if the tile art or badge style changes). They're used for Log Book entries with an `img` field, the discovery pop-up, the Log Book's Board guide (`BOARD_GUIDE`) and tap-and-hold tooltips (`tipIco`).
- `keepInside()` clamps every floating number to the board so hits near an edge are never cut off.
- Wins are staged in `resolveBoard`: `matchFx` dims non-matched cells and outlines each group's outer edge in its colour for ~230 ms (150 ms on cascades, skipped with reduced motion) before `clearCells`. `fxAnchor` makes the next `floatText` a big gold bevelled number at the biggest group's centre. Half the `spark` particles are spinning shards. `setCombo(n)` shows the #combo plaque from cascade 2.
- The battle background is the chapter's `CHAPTER_ART`, darkened (set in `startLevel`). The board has a gold frame (CSS box-shadow).
- `DIFFICULTY` (story/hero/legend, `S.difficulty`, default hero) is chosen on the level card. It sets foe HP (bosses and minis use `bossHp`), whether an enraged boss Strike takes 2 hearts (`rage2`, Legend only), whether Dawn tiles heal (`dawnHeal`, off on Legend), and (Legend) attacks one move sooner. Minions (`foe.add`) never take hearts.
- Boss and mini-boss pressure uses a heart budget (`HEART_BUDGET`, `heartChance`), not a fixed weighting. `startLevel` estimates how many attacks the foe makes over a full-length fight (80% of moves; the last 30% enraged at every 2 moves; Legend's 2-heart rage counts double) and sets `foe.heartP` so the expected Ward loss before healing is Story 3→3.9, Hero 4.5→6, Legend 6→8 from chapter 1→10 (mini-bosses ×0.8). `pickAttack` then picks a Strike/Drain with probability `heartP`. Why: Steve found the chapter 4 boss (level 120, Mirelle + Verdanne) took ~10 hearts on Hero with no way to heal. Measured targets: level 30 Hero 4.5, level 120 Hero 5.0, level 300 Hero 6.0.
- Healing: Dawn tiles fill a heal meter (`DAWN_HEAL` = 12 tiles per heart, over any number of matches; shown as a gold bar under the hearts). Mirelle's Riptide also restores 1 heart, and Rosalind's Radiant Veil restores 2 and blocks. So every party can heal. Log Book entry `dawnheal`.

- Chapter endings (`outroN`) play the first time each chapter boss falls. The final boss's ending (outro10, the end of Book I) plays on every win, by Steve's request, and its victory card reads "Book I complete!". The ending is 21 beats: the Regent is cleansed, not killed; the Crown Stone is made whole with the Wardblade; the sisters; Brann proud of his steel; a Book II hook. The card then shows `bookEndNote()` (stars out of 900 and the levels still short of 3 stars), and its button calls `goToPerfect()`, which opens the map on the first such level, pulses it and opens its level card.

## Rift Raid (Sept 2026)
- A dice mini-game, unlocked at `S.unlocked >= RAID_UNLOCK` (90, after chapter 3). It's on the title screen (`#raidBtn`, the top menu tile) and the map (`#toRaid`). Screen `#raid`; logic lives in the `// ---------- Rift Raid ----------` block.
- `S.raid` = { titan, hp, dealt, best, shards, visits, felled, pommel, outfits[3], wear[3] }. `TITANS` is three Titans (30k/80k/180k HP, armour 11/13/15); after the third, they cycle as "Ascended" with HP ×2^cycle and armour +2 (`titanNow`).
- A visit costs 1 Starlight and gives `raidTurns()` turns (3 + resolve/2). Actions: Attack (d20 + `rollBonus()` vs armour; 20 = ×2, 1 = fumble, below armour = 35% graze), Heal (10+: +1, 18+/20: +2), Block (10+ stops the next blow, 20 also counters), and the Guardian's Art once per visit. The Titan strikes back after each action vs `raidDefence()`.
- Damage persists on the Titan. Each visit pays ore, remnants, essence of the Titan's weakness and Rift Shards (`raidRewards`); felling a Titan pays a big haul and the Titanbreaker title. Raid damage counts ¼ towards `totalScore`.
- Rift Exchange (`SHOP`): Titan's Tear (6 shards; `S.items.tear`, which auto-restores the full Ward when it breaks in a boss/mini fight, in `endTurn`), Riftsteel Pommel (12, +2 raid rolls), and Riftborn outfits (15 each). `applyOutfits()` swaps `GUARDIANS[i].face/img` to `assets/guardians/*-rift-*.jpg` while worn.
- Art: `assets/raid/` (titan1-3, arena, shard, pommel, tear, d20, heal, key, crest, attack, block). tests/smoke.mjs plays 4 raid visits.

## Raid keys, Seren, Forge drops, app install (Sept 2026)
- Raid visits cost a Raid Key (`S.raid.keys`, max `KEY_MAX` 5), not Starlight, because Starlight is refunded on every win and has a free refill button. Keys come from `dailyKey()` (one per calendar day, given on opening the raid), `grantKey()` on the first win over each mini-boss or chapter boss, and a 20% chance on other wins. New unlocks start with 3.
- Seren, the Shard-Keeper (`SEREN`, `assets/characters/seren-*`), runs the Rift Exchange. The `serenIntro` story plays on the first visit to the Exchange, there's a random `SEREN_LINES` greeting, and she has a Characters entry. The raid music is `music/raid.mp3` ("Beyond the Rift", Suno).
- Forge drops (in `winLevel`): ore ×0.75–1.25, every foe drops 1–3 essence of its own element (the main boss or mini-boss drops more; Hollow foes give remnants instead), and a 10% Starsteel Ingot gives +5 ore. The chapter caps are unchanged.
- Installable app: `manifest.webmanifest` plus icons in `assets/app/` (Steve's favicon_io set). `#installBtn` on the title uses `beforeinstallprompt` on Android and desktop Chrome/Edge, shows Share → Add to Home Screen steps on iOS, and is hidden when running installed.
- Wide title screen: the sisters are on the left, the title and menu on the right (`#title.on` grid), so it fits without scrolling down to 1024×768. Scrollbars everywhere are thin and gold.

## Phone audio rules (Sept 2026)
- Phones only start an <audio> during a tap. `unlockAudioEl()` (on the first pointerdown/keydown) makes one muted play of `freeAudio`, and `playFileTrack` reuses that element for every non-kept track, so music that starts by itself (the defeat theme, music after stories) isn't blocked. Each call bumps `a._tok` so a stale error/abort from the previous src can't stop the new track. `stopFileAudio` never blanks `freeAudio`'s src (that fires a spurious error).
- `#splash` ("Tap to begin") covers the title at launch; that tap calls `audioOn()` and starts the title music. `prepareLaunch` switches it from Loading… to Tap to begin.
- Don't write the exact text `Music.want = 'title';` anywhere else: tests/smoke.mjs injects its hook at the first occurrence.

## Accounts, cloud saves and the home screen (Sept 2026)
- Firebase (email/password auth + one Firestore doc `saves/{uid}`; rules in firestore.rules) is loaded lazily: `ensureFirebaseAuth()` after start-up, `ensureFirestore()` only once signed in. Only firebase-config.js loads with the page. The username is the Auth `displayName`, so showing it costs no reads.
- Cloud writes happen at checkpoints only: `save()` marks `cloudDirty` and arms a 60 s fallback; `cloudCheckpoint()` writes now. It's called after a win (in winLevel), a defeat, a Forge upgrade, a raid visit/Titan felled, an Exchange purchase, and on visibilitychange-hidden/pagehide. One read per session (`pullAndMergeCloud`, keeping whichever copy has more progress).
- Usernames (`checkUsername`): 3–20 characters of letters/numbers/space/_ . -, at least one letter, `RESERVED_NAMES` blocked, and profanity/slurs blocked via the `obscenity` library (jsdelivr ESM, imported only when creating an account; it checks the name as typed and with symbols stripped). Client-side only, because Firebase Auth can't enforce it.
- `capForge()` runs on every save load (start-up, `applyRemoteSave`, code import). It lowers each Forge line to `FORGE_CAP` for `chapterReached()` and refunds the `COST` of the removed levels, stored in `S.forgeRefund` until `showForgeRefund()` (Brann's one-time card, after the splash tap or on entering the map/Forge) is acknowledged. Why: saves from 26 Sept 01:39–13:20, before caps existed, could max the Forge early (found in a player's chapter 5 save: Tempering 10, all Affinities 5).
- Which save wins on sign-in (`pullAndMergeCloud`): `S.owner` records the account a save belongs to. Silent cases: the device has no progress (take the cloud copy), the cloud has none (upload), the same owner (keep the better copy), or equal progress. Otherwise `askWhichSave()` lets the player choose. A new account silently takes over guest progress, but asks if that progress belongs to another account. Sign-out asks whether to keep a copy on the device or clear it (for shared devices). Saves from before owners existed merge silently if saved within an hour of each other.
- Change username (account screen): `updateProfile` only, with the same `checkUsername` rules and no Firestore cost.
- Home screen: `#profileCard` (username or Guest, rank emblem, score, save status dot) opens the account screen (`openCloudMenu`). The menu is Continue, Rift Raid, then Log Book · Characters · More. `openMoreMenu()` holds Save & Load codes, Add to home screen, Sound and New game. The map chip `#mapPlayerChip` shows the username (or "Sign in") with a status dot and opens the account screen. `renderRank()` renders both.

## Widescreen / streaming layout (Sept 2026)
- `@media (min-width:980px) and (min-aspect-ratio:5/4)`: `#app` loses its 560px cap. The battle becomes a grid, with the board filling the height on the left and the side panel holding foe row, foe, hint, bottom bar and `#statPanel`. The board and panel are centred together via padding-inline. Other screens become a centred 860px column. Phones never match this query, so their layout is unchanged. The side column is `.side` (foe) + `.side2` (bottom bar + stats; this one scrolls if short), which are `display:contents` on phones. Checked at 1024×768, 1280×720, 1366×768 and 1920×1080.
- `#statPanel` (`renderStats`, called from `updateHud`) is desktop-only: projected score, damage, moves used, tiles cleared, best combo, flawless, difficulty, best on this level and rank.
- Painted art replaced the emoji/SVG: `ico(key)` renders `assets/items/*.webp` (elixir, whetstone, hammer, scroll, plume, ore, remnants, essence, starlight, temper, resolve, affinity). `weaponSVG(tier)` now returns the painted `assets/wardblade/{1-5}.webp`, with a drop-shadow in the strongest Affinity's colour.
- Backdrops: `assets/backdrops/aurelith.webp` sits behind the title/map/menus on wide screens. `assets/backdrops/ch1-10.webp` are the wide battle backdrops per chapter: `startLevel` sets `--bgWide` (used in the widescreen query) and `--bgArt` (the tall story still, used on phones). Chapters 5 and 9 had painted borders trimmed. The source files are in `assets/New/` (battle-ch*.jpg, desktop-backdrop-big.jpg).
- Headless Edge (`--window-size=1920,1080 --screenshot`) is the reliable way to check the wide layout. The app's preview pane can't display sizes that big, and headless can't go narrower than ~500px, so use the pane's mobile preset for phones.

## Overkill and Heartstone Convergence (Sept 2026)
- `resolveBoard` no longer stops when the last foe falls: the cascade plays out in full, and `hitFoe` adds any damage past the kill to `runOverkill`, which scores 1:1 (the "Overkill (cascade after the win)" row) and shows on the stats panel. The win still happens in `endTurn` afterwards.
- Two Summon Orbs call `convergence(r,c)`: time slows (`timeScale` 0.35); five element rings pulse out with rising notes; ten beams in all five colours spin out of the swap point across the full-screen `#crackFx` canvas over darkness, swelling to a white-out (`SFX.avatar`, the halo sound, the rankup sting); `convDim` darkens the board canvas under the beams, and the element rings are cleared (`beams.length = 0`) when the beams start, because their screen blend otherwise washed the board out; then a big shake/hit-stop, halo and shockwave, the board shattering outward from the centre, and the cinematic. Log Book entry `convergence`.

## Offline play (Sept 2026)
- `offline-manifest.json` (built by `node tools/offline-manifest.mjs`; **rerun after adding or replacing any asset**; tests/smoke.mjs fails if it's stale) lists every game file with size, a content hash (`auto` for index.html/manifest/firebase-config.js, which refresh network-first) and a `core` flag.
- sw.js uses one persistent cache `crystalbound-assets`. On install it precaches the core (~4.7 MB: tiles, fx, sfx, items, ranks, wardblade, guardians, characters, raid, app icons, page). Page, scripts and json are network-first; images and mp3 are cache-first, and mp3 Range requests are sliced from the cached file. Other `crystalbound-*` caches (the old cb-v1) are deleted on activate.
- In-game (`// ---------- Offline play ----------`): More → Offline play downloads all files (~40 MB, 4 parallel fetches, progress bar, `navigator.storage.persist()`), and sets localStorage `cb-offline=full` and `cb-manifest` (the manifest last seen). `offlineCheck()` runs 2.5 s after the splash when online: it deletes cached files whose hash changed or that were removed. For `full` players it lists missing/changed files and shows "Update for offline play: N files (X MB)" with Update now / Later; More also shows "Update available". A download can be removed (keeps the core).
- Tested with the server stopped: the title, a chapter 9 backdrop, boss portraits, music, voices and story art all loaded from cache. Offline, Google Fonts fall back to Georgia and sign-in isn't available; cloud writes retry at the next checkpoint when back online.
- Sound clips were trimmed of ElevenLabs loop tails by a script (a quiet valley in the last 35% followed by a re-attack in the final 0.45 s is cut, with a 60 ms fade; clips ending loud get a 120 ms fade). The source files are in assets/New.

## Pacing and controller (Sept 2026)
- Chapter 1 levels come from `chapter1Level(k)`, a teaching schedule with one idea at a time: 1-5 basics and special tiles; 5 the Matriarch (plain mini-boss, frees Brann); 6-7 Chains; 8 Miasma; 9 Hollow + Miasma shield; 10 mini (shield); 11-14 Relics; 16-19 Elemental Wards; 20 mini (Wards); 21-24 generator; 25 first phase change + Drain; 30 Poseidon. Minis keep every-5th slots. Why: the first 5 levels used to introduce ~15 ideas (Candy Crush teaches one per ~10 levels).
- Multi-foe fights start in chapter 2 (from level 36, 20% of regular fights, 25% in chapter 3; bosses and minis fight alone until chapter 4). `battleDiscoveries` shows one Log Book card at a time. The difficulty choice (and its Log Book card) is hidden until chapter 2 unless the player already changed it.
- Controller/keyboard in menus: `navRoot/navEls/navFocus/moveFocus/navBack/navScroll`. A selects, B/Esc goes back (the card's Back/Close/Cancel-style button; choice cards have none on purpose), D-pad/arrows move a gold ring (`.navOn` class plus :focus, because :focus doesn't match in an unfocused window), LB/RB and PageUp/PageDown scroll, and A/Start/Enter passes the splash. `#padHints` shows the buttons for the current context. A mouse or touch hides the ring.

## Painted hit effects (Sept 2026)
- `assets/fx/` holds Steve's Gemini effects on pure black: slash, torrent, lightning, impact, halo, shockwave. Near-black is crushed to true black, and they're drawn with `globalCompositeOperation = 'screen'`, so the black vanishes. Don't give them alpha backgrounds.
- `drawFxBeam(b)` animates a still image per beam kind, falling back to the old drawn beams if the image isn't loaded. Burst H/V = the slash sweeping along the line, tinted per element (`tintedSlash`, cached); Crest `ring` = expanding shockwave plus an impact flash; Skyfall `bolt` = lightning onto each cell with an impact flare (staggered via `delay`); Riptide `torrentFx(c)` = water pouring down each column; Radiant Veil `haloFx()` = dawn halo over the board (kept at 0.55 alpha so tiles stay readable). Lengths come from `fxLife` and are shortened with reduced motion.
- Relic smash (`collectRelics`): `crackScreen(r,c)` draws a random jagged crack web across a full-screen `#crackFx` canvas from the impact cell (grows in 140 ms, holds ~750 ms, then fades), plus `SFX.smash` (boom, crack noise, glass tinkles), `shake(34)`, `hitStop(260)`, a cream flash and an impact ring. `FXI.crack` is Steve's painted crack (`assets/fx/crack.webp`), drawn at a random angle instead of the drawn web (the web is the fallback). Unlike the board effects it sits on its own full-screen layer above the page, where a screen blend can't hide black, so it's stored with real transparency (alpha taken from brightness). When replacing an image under the same name, bump its `?v=` because the offline cache serves images cache-first.
- Recorded SFX: `SFX_FILES` (assets/sfx) are decoded by `loadSfx` into Web Audio buffers and played with `playSfx(key, vol, fallback)` through `sfxBus`, falling back to the generated SFX. relic.mp3 (ElevenLabs) is preloaded when a level has relics.
- Villain voices: `assets/sfx/voice/{laugh-god,laugh-dark-male,laugh-dark-female,roar-beast,laugh-hollow,laugh-titan}-{1-4}.mp3`. `VOICE_BY_ART` maps boss/mini art to a voice (Hollow foes fall back to laugh-hollow). `playVoice` picks a take that isn't the last one and waits 15 s between laughs unless forced. Triggers: a boss/mini Drain, its first strike on the Ward (forced), turning Hollow and enrage (forced), your defeat (forced), and a Titan blow in the raid (forced on a natural 20). Only the current boss's takes are preloaded.
- Sound bank: `SND` = name → [takes, volume] for assets/sfx/<name>-<n>.mp3 (all ElevenLabs, trimmed and loudness-normalised to -16 LUFS mono with ffmpeg). `snd(name, fallback, {gap, rate, vol})` avoids repeating the last take; `gap` throttles (several Bursts at once play one slash). Wiring: slash on Burst beams, impact on Crest rings, the sister's `voice-*` cry with her Art cinematic followed by torrent/halo/lightning, hurt-hero in `hurtScene`, victory before the win cinematic, stars (pitch rising per star), rankup or levelup (new Guardian, first chapter clear, Titan felled), forge-hammer on upgrade, forge-evolve on a new Wardblade form, voice-brann on entering the Forge, voice-seren on the Exchange, item-hammer/item-scroll on items. Battle sounds preload in `startLevel` for the current party.
- Two switches: `S.muted` = music (`setMuted`: musBus and file tracks; the title and map speaker buttons), `S.sfxMuted` = sound effects and voices (`setSfxMuted`: sfxBus gain, which every generated and recorded SFX goes through). Both are in More (home screen) and the pause menu.

## Scores and ranks (Sept 2026)
- Every win scores (`levelScore`): damage dealt (sum of foe max HP plus anything they healed back, `runHealed`), 250 per spare move, 500 per step of the longest chain reaction (`runBestCombo`), 2,500 if no heart was lost (`runHurt`), times the difficulty's `score` (Story 0.8, Hero 1.2, Legend 1.5).
- `S.best[levelIdx]` keeps each level's best score (save codes carry it, since they encode all of S). The victory card shows the breakdown (`scoreBlock`); the level card and map-node tooltip show the best.
- `RANKS` (Bronze 0, Silver 250k, Gold 1M, Platinum 2.5M, Diamond 5M, Crown 8M) is based on the total of best scores. A full Hero clear of Book I is ~7M, so Crown needs replays at higher scores or on Legend. Emblems live in `assets/ranks/`; the title screen's `#rankBadge` (`renderRank`) shows the rank, the total and the distance to the next rank, and the victory card announces rank-ups.
- `S.cleared[levelIdx]` records the hardest difficulty each level was won on (`DIFF_ORDER`). Map nodes show it as an S/H/L badge (`diffPip`), and the level card and tooltip say "Cleared on …". Wins from before this existed have no record, so they show no badge until replayed.
- Next planned: the Rift Raid mini-game (d20 turns, gear bonuses, Titans, raid-only rare items via Rift Shards). The art is in `assets/New/`: titan1–3, raid-arena, raid-items-sheet (8 icons, no Block), raid-block-icon, and the outfit-*-riftborn portraits.

## Side quests (Sept 2026)
- `QUEST_TYPES` (crest, burst, orb, combo, art, clear, cascade, chains): each has an icon, a label, `amt:[base, perChapter, max]` and a `from` level. `assignQuests()` runs once after LEVELS is built, seeded by `mulberry32(9000+n)`. It gives 25% of regular levels from 12 on a quest, and 30% of mini-bosses from chapter 4 on. Chapter bosses never get one. That makes 80 quest levels. Quest levels get `QUEST_BONUS_MOVES` (3) extra moves.
- The quest is required. `applySeal()` holds the last foe at 1 HP (`sealed`) until `completeQuest()`, and running out of moves with the quest unfinished loses the level.
- Progress comes from `questTick(type, n, el)`, which is called from special creation, `comboActivate`, `castArt`, chain breaks, `setCombo` and clearCells.
- Forcing the opportunity: for shape quests, `seedQuest()` places the pattern one swap away at level start. `endTurn` calls it again if `questMoveExists()` has been false for 3 turns.
- The UI:
  - `.questCard` on the level card
  - `#questPill` under the foe intent
  - a 🔒 on sealed foes
  - the Log Book 'quest' entry
  - the "Quest complete" score row (+1500), with a 30% Raid Key chance on a first win
- Playtest: `tests/playtest.mjs` chases quests (set `NOQUEST=1` to compare without them). With the +3 moves, all 80 quests complete. Level 52 (crest) loses even without its quest, so that is a balance issue, not a quest issue.

## Game Menu, Helping Hand and UI icons (Sept 2026)
- **Game Menu** (`#gmenu`, `openGameMenu(tab, onClose)` / `closeGameMenu`): a full-screen hub under the card overlay (z 45), so cards still open on top of it. It replaced the old More card, Log Book card and gallery card.
  - Entry points: title ☰ Menu (plus the Log Book and Characters tiles), the map ☰, and the pause card (onClose = pauseGame).
  - Tabs (`GM_TABS`, `GM_PAGES`, `GM_WIRE`): How to Play, Log Book, Characters, Story, Records, Settings, Account & Saves, Credits.
  - How to Play (`HOWTO`) is built from the LOG texts plus the live tables (GUARDIANS, ATTACK_DESC, DIFFICULTY, RANKS), so change the rule text in those places, not in the menu.
  - Controller and keyboard: `navRoot`, `navBack`, `navScroll`, the keydown battle guard and the gamepad `inMenu` all check `gmOpen()`.
  - Phones (< 760 px): the menu opens on a list with the logo (`gmHome`). A section fills the screen with a ‹ Menu back button, and How to Play opens on a topic list (`gmTopicOpen`). B/Esc (`gmBackOrClose`) steps back one level before closing. Desktop keeps the sidebar and topic chips.
  - Mid-fight, the Story tab and New game are hidden. The layout was checked at 320 and 375 px for overflow.
- **Helping Hand**: `S.fails[i]` counts losses in a row per level (failLevel adds one; winLevel clears it). After `MERCY_AFTER` (3), each attempt gets `MERCY_MOVES` (+3) until the level is won. Those moves are excluded from stars. The level card shows it, and the Log Book entry is 'mercy'.
- **UI icons**: `ui(key)` loads `assets/ui/<key>.webp`, 48 painted icons cut from `assets/New/ui-sheet-{menu,rules,guide}.jpg` (Gemini 4×4 sheets on black) by the scratchpad `cut_ui.py`. Transparency comes from brightness, and enclosed black is kept only for hollow, profile, undiscovered and phase2. Log entries use them through `img:`.
- **Playtest speed**: `FAST=40 node tests/playtest.mjs ...` runs the game clock 40× faster (about 15 s per level instead of 2 min). Its safety timeout uses the real clock, and the bot resets `S.fails`, so no Helping Hand is applied in testing.

## Win-rate tuning, easier retry, Heartstone Finale, HUD tags (Sept 2026)
- Win-rate run (FAST bot, Forge at the chapter cap): 10 Hero, 3 Story and 3 Legend runs per level for all 300 levels. Hero 96.1%, Story 97.6%, Legend 81.9%, and every level was won at least once on Hero and Story. Levels under 70% on Hero get `LEVEL_TUNE` (after `assignQuests()`): +moves for regular levels, ×hp for bosses. After tuning every level wins ≥ 7/10. The hardest are the Miasma-shield levels, where the bot is weak at clearing Miasma.
- **Struggling help**: `easierDiff()` returns the next easier setting once `S.fails[i] >= 2` (not on Story). It drives:
  - the defeat card's "Retry on <easier>" button
  - the 'easier' Log Book popup
  - `STRUGGLE_TIP` on the loading splash (every retry of that level)
  
  The Settings difficulty picker is locked during a fight, because `diff()` is read live.
- **Heartstone Finale** (`specialFinale`, first thing in `winLevel`): after a win, every special left on the board goes off one at a time, followed by `resolveBoard` cascades. Damage counts as Overkill. The playtest prints "specials left" after a win (should be 0).
- **Shield break**: `checkShieldBreak()` runs at the start of `foeEvents` and `endTurn`. When a shielded foe's Miasma reaches 0:
  - `miasmaBanished` is set for the rest of the fight: no spreading and no 65% reduction;
  - shield foes become `mech: 'broken'`;
  - Miasma attacks fizzle (intent shows 💨 Fizzles) rather than being swapped for Strikes;
  - phase 2 can't re-raise the shield.
  
  It plays a cinematic ("MIASMA BANISHED") with impact/halo/ward sounds, and there's a Log Book entry 'shieldbreak'. With the break in, the extra moves for the shield levels were removed (21 and 38 need none; 29 keeps +2). On Hero: 21 is 9/10, 29 is 14/20 and 38 is 10/10.
- **HUD**: `hudSub()` puts a coloured difficulty tag (`.diffTag.diff-<key>`) and the signed-in name under the level title. `renderDiffTags()` adds the tag to the map player chip (called from renderRank, goMap and difficulty changes).

## Phone fight layout: the board keeps its width (Oct 2026)
- On phones (< 760 px), `resizeBoard()` checks whether the board would come out narrower than the screen (`wrap.clientHeight < wrap.clientWidth`). If so it adds `#battle.tight`, then `.tighter`. Several foes (`#battle.multi`, set in renderFoeRow) and side-quest pills are the usual cause.
  - `.tight`: a compact foe panel (52 px portrait, intent and quest pill on one row, smaller target tabs). With several foes the big portrait is hidden, because the tabs show them.
  - `.tighter`: no big portrait, a one-line title ("Level N" plus the difficulty tag; `.lvBiome` hidden), and with several foes no duplicate HP bar.
  - Measured with 3 foes plus a quest: 390×664 went from 288 px to 365 px; 375×740 is full width. A single foe with a quest at 390×664 went from 322 px to full width.
- `resizeBoard` only runs at level start, on window resize, and when the multi state changes (never on every HUD update).

## Adding new art (Steve will supply lots)
1. Crop a square face (~220px) from the portrait for the round battle icon; keep the full image for cinematics.
2. Save as `assets/<group>/<key>-face.jpg` and `<key>-full.jpg`.
3. Add `<key>: { face:'assets/...', full:'assets/...' }` to `BOSS_ART` (used for bosses AND regular foes).
4. Point chapter bosses/families at it in `CHAPTER_FOES` (`art:'<key>'`). Recorded boss music is keyed by art in `BOSS_MUSIC`.

## Saves — do not break these
- `SAVE_VERSION` (3) reset every older save once when the Book I rebuild shipped (keeping sound/shake settings).
  Don't bump it unless Steve wants another full reset.
- `localStorage` key `crystalbound-save-v1` — **never rename**. `migrate()` fills new fields with defaults and
  clamps old ones, so every update keeps player progress. When adding save fields: add to `defaultSave()`
  and, if nested, make sure `migrate()` merges them.
- Saves are per-origin: progress on Steve's site is separate from the claude.ai-hosted copy. The 💾 menu on
  the map exports/imports a backup code to move progress between them.
- `initCloudSave()` only works on claude.ai (uses `window.claude.use('db')`); on this site it silently does nothing.

## Conventions that matter
- Mobile-first, portrait, must fit 360px wide with nothing off-screen (see "Mobile fit" CSS block at end of <style>).
- Everything must be playable by **touch, mouse, keyboard and gamepad** (Xbox/PlayStation standard mapping:
  A/✕ jump-confirm, X/□ hammer, Y/△ Guardian Art, B/○ back/cancel, Start pause, D-pad/stick navigate menus).
- Every interactive element that needs explaining gets `data-tipfn="<key>"` (dynamic, add to `TIPS`) or
  `data-tip="<html>"` (static) so desktop hover, mobile hold, and the glowing ? help mode all work automatically.
- Juice matters to Steve: screen shake (`shake(n)`, whole battle screen), `hitStop(ms)`, `flash(op,color)`,
  `cinematic(text, sub, color, img)`, `toast(msg)`. Pacing was deliberately slowed; don't speed it back up.
- Reduced-motion is respected for cinematics; shake has its own toggle in the pause menu.

## Testing
`node tests/smoke.mjs` — loads the game script in Node with DOM stubs and lets a bot play several levels.
It should finish with no errors (bot losing is expected and fine; it's a crash/integrity check).
For layout, open `index.html` in a browser at 360x740 (Chrome devtools device mode) and check every screen.

## History / decisions already made (so you don't undo them)
- Started as a separate 3D platformer (Sprout's Sky Hop), then this match-3 game from a design doc.
- Original Guardian art resembled Sailor Moon; replaced with Steve's own designs. Keep designs legally distinct
  from existing franchises (item/term names were chosen for this: Crest Surge, Ember Plume, Heartstone Avatars).
- Forge was too easy → steep cost curve + form thresholds 6/14/24/36. Levels were too easy → HP x1.2 on
  campaign, 70-100% regulars in generated regions, faster attacks later, elite spikes.
- Design doc (partly aspirational, the code is the source of truth) lives in Claude Docs:
  https://claude.ai/code/artifact/58bf89cb-b4c9-4c48-8a74-530e88862cb4 — export it as Markdown into this
  folder if you want it available here.

## Open next steps Steve has discussed
- More level variety via new templates (objectives/blocker combos), not just number tuning.
- A real store/economy (gems, Forge chests with published odds + pity timer, battle pass) — not built yet.
- Replace reused portraits with new art as Steve supplies it.
- Cloud save for his own site (he uses Supabase on other projects) instead of backup codes.
