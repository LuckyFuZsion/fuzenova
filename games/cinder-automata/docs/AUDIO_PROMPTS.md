# Cinder Automata - audio prompt pack

Sound effects: ElevenLabs "Sound Effects" (text to sound). Music: Suno (instrumental). Save files exactly as named so the game can load them.

Setting: `public/audio/sfx/<name>.mp3` and `public/audio/music/<name>.mp3`. Keep each SFX under 1 MB and each music track under 6 MB.

**Important: switch "Loop" OFF for everything except the sounds marked LOOP.** With it on, ElevenLabs returns a circular clip (the sound starts part-way in and its tail wraps round to the start, with a swell at the end). `tools/fix-sfx.py` repairs those, but clips made with Loop off need no repair.

Tip for ElevenLabs: set the duration shown in brackets, leave "prompt influence" high, tick "loop" where marked LOOP. Generate 2 to 3 takes of the important ones (shots, explosions) and I can rotate them so it never sounds repetitive.

## SFX - interface

| file | duration | prompt |
|---|---|---|
| ui-click | 0.3 s | Short crisp mechanical button click, heavy industrial switch, single clean tap, no reverb |
| ui-open | 0.6 s | Metal panel sliding open with a soft servo whirr and a light latch click |
| ui-close | 0.5 s | Metal panel sliding shut with a soft servo whirr and a solid latch click |
| ui-denied | 0.5 s | Dull low electronic buzz and a short metallic clunk, error or refusal, not harsh |
| ui-star | 2 s | (first attempt was too cheesy, see the replacement prompts below) |
| ui-level-complete | 3.5 s | Short victorious brass and metal-anvil sting with a rising synth swell, industrial sci-fi, resolves on a strong final hit |
| ui-defeat | 4 s | Heavy descending industrial groan with a deep power-down whine and a final low thud, base destroyed, ominous |
| ui-fight-start | 3 s | Deep warning horn blast followed by a rising siren sweep, base alert, war is beginning, industrial sci-fi |
| ui-build-start | 2 s | Calm mechanical chime and a soft hydraulic release, a moment of relief, industrial sci-fi |

## SFX - building

| file | duration | prompt |
|---|---|---|
| place-building | 0.7 s | Heavy metal machine bolted down onto the ground, deep thud with a metallic clank and a short hydraulic hiss |
| place-belt | 0.25 s | Very short light metallic tick, a small conveyor piece clipped in, dry |
| remove-building | 0.9 s | Wrench ratcheting then a metal structure being dismantled and dropped, clanks, quick |
| pickup | 0.4 s | Small mechanical grab and lift, servo whirr with a soft clamp, dry |
| drop-building | 0.6 s | Machine set down gently onto a metal floor, soft thud with a small clamp lock |
| rotate | 0.25 s | Tiny ratchet click, one quarter turn of a metal dial |

## SFX - factory loops (all LOOP, seamless, quiet, not tiring to listen to)

| file | duration | prompt |
|---|---|---|
| loop-drill | 4 s | Steady industrial mining drill grinding into rock, rhythmic and mid-low, loopable, no sudden changes |
| loop-smelter | 5 s | Low furnace roar with soft crackling fire and a gentle metallic tick, warm and steady, loopable |
| loop-belt | 4 s | Soft steady conveyor belt rolling, quiet rhythmic rubber and metal hum, loopable |
| loop-assembler | 4 s | Small robotic assembly arm working, light servo chirps and soft clanks in a regular pattern, loopable |
| loop-generator | 5 s | Steady low engine rumble of a coal-burning generator with a faint electrical hum, loopable |
| loop-coil-idle | 4 s | Quiet electrical hum with faint crackling static, a charged Tesla coil idling, loopable |
| loop-ambience-ash | 12 s | Desolate windswept wasteland ambience, low wind over ash, distant metallic creaks, very sparse, no music, loopable |
| loop-ambience-fight | 12 s | Tense low battlefield ambience, distant rumble, wind, faint metallic scraping, uneasy, no music, loopable |

## SFX - combat

| file | duration | prompt |
|---|---|---|
| shot-plate | 0.35 s | Small automated turret firing a chunk of metal, dry punchy mechanical clack with a short metallic ping |
| shot-bullet | 0.4 s | Automated turret firing a bullet, sharp dry crack with a small mechanical bolt clack, tight, no long echo |
| coil-zap | 1 s | Sharp crackling blue lightning bolt jumping between targets, electric snap with a fizzing tail |
| robot-shoot | 0.35 s | Small robot soldier firing a compact energy rifle, short high pew with a mechanical kick |
| robot-built | 1.5 s | Robot factory finishing a robot, servo whirr, hydraulic hiss and a bright ready-chime, a small machine coming to life |
| robot-death | 0.8 s | Small robot breaking apart, metal clatter and a short electric fizz |
| enemy-hit | 0.25 s | Bullet ricochet spark off armoured metal, very short ping |
| enemy-death-small | 0.7 s | Small corroded machine bursting apart, crunchy metallic pop, a few clattering fragments |
| enemy-death-large | 1.4 s | Large armoured walker exploding, deep boom with grinding metal collapse and falling debris |
| structure-destroyed | 1.6 s | Turret or wall collapsing under attack, loud crunching metal, a burst of sparks, falling rubble |
| core-hit | 0.9 s | Deep resonant clang on a huge metal core with a short alarm blip, alarming but brief |
| core-alarm | 3 s LOOP | Urgent repeating low alarm klaxon, industrial base in danger, loopable |

## SFX - bosses

| file | duration | prompt |
|---|---|---|
| boss-arrive | 4 s | Monstrous mechanical roar, metal screeching and a deep bass horn, giant machine approaching, ominous and huge |
| brute-smash | 1.2 s | Enormous siege ram slamming into a wall, deafening impact, crumbling stone and bending steel |
| colossus-shell | 1.8 s | Huge cannon firing with a rising whistle then a heavy explosion on impact, artillery shell |
| queen-spawn | 1.2 s | Wet organic-mechanical pop with a metal squeal, small creatures released from a machine hive |
| boss-death | 5 s | Gigantic machine dying, slow cascading explosions, groaning metal, long deep boom and a settling silence |

---

# Music - Suno

Assumed "Uno AI" means Suno. Use custom mode, leave lyrics as `[Instrumental]`, paste the style line into "Style of Music". Aim for around 2 to 3 minutes each; I will loop them in the game (tracks that loop well should start and end quiet and steady).

## menu (title screen and commander select) - `music/menu`
Style: `dark cinematic industrial orchestral, slow ominous build, deep brass and low strings, distant anvil hits, ember-glow atmosphere, epic but restrained, no vocals, video game title theme, 70 bpm, seamless loop`

## build phase (calm, planning) - `music/build`
Style: `calm ambient industrial electronic, warm analogue synth pads, soft rhythmic machinery percussion, gentle arpeggio, thoughtful and hopeful, factory-building game, no vocals, 85 bpm, seamless loop`

## fight, early levels (1 to 9) - `music/fight-1`
Style: `tense driving industrial rock electronic, palm-muted electric guitar, pounding tom drums, metallic percussion, urgent but steady, tower defence battle music, no vocals, 120 bpm, seamless loop`

## fight, mid levels (10 to 19) - `music/fight-2`
Style: `intense dark industrial metal electronic, heavy distorted guitar riffs, fast double kick, aggressive synth bass, siren-like leads, escalating battle, no vocals, 140 bpm, seamless loop`

## fight, late levels (20 and up, Endless) - `music/fight-3`
Style: `epic apocalyptic orchestral metal, choir-like synth pads, thundering war drums, relentless ostinato strings, heavy riffs, last stand desperation, no vocals, 150 bpm, seamless loop`

## boss - `music/boss`
Style: `massive boss battle, huge pounding war drums, screeching industrial metal, low brass stabs, rising danger, mechanical monster theme, orchestral and heavy guitars, no vocals, 130 bpm, seamless loop`

## victory (level complete, short) - `music/victory`
Style: `short triumphant industrial fanfare, brass and metallic percussion, hopeful resolve, 20 seconds, ends cleanly on a strong final chord, no vocals`

## defeat (short) - `music/defeat`
Style: `short mournful ambient outro, slow low strings and a fading electric hum, base lost, 20 seconds, ends in silence, no vocals`

## Adding a Suno track to the game
Suno tracks fade in and out, which makes a dip when looped. Run `python tools/make-music-loop.py "<downloaded.mp3>" <name> 8` (for example `menu`, `build`, `fight-1`, `boss`). It crossfades the end into the start and writes `public/audio/music/<name>.mp3`. Tracks are named as in the sections above. Done so far: `menu`, `build` (calm, now used for all building and general play), `fight-1`, `boss`, `victory`, `defeat` (stingers use `--once`). Still wanted: `fight-2`, `fight-3`.


## Replacement prompts for ui-star (the first set sounded cheesy)
The star sound plays when a commander earns a star or unlocks. It should feel earned and a bit solemn, not a game-show chime. Try these, Loop OFF, 1.5 to 2.5 seconds:
1. `A single deep metal anvil strike with a short warm resonant ring fading out, like a medal being struck, dark and understated, no chime, no sparkle`
2. `Low solemn brass note swelling briefly then a soft metallic clang, military honour, restrained, no bells, no fanfare`
3. `A heavy iron latch clunking open followed by a quiet low humming tone that fades, like a vault unlocking, industrial, subtle`
4. `Two slow deep bell-less metal hits, hammer on steel, with a faint ember crackle tail, weighty and brief`
