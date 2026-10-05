// Builds the design document: node --import tsx tools/build-gdd.ts   (or: npm run gdd)
//   docs/gdd/content.ts  (the hand-written parts)  +  the game's own code (every number)  ->  docs/gdd/gdd.html  ->  PDF
// The PDF is printed by Edge (or Chrome) in headless mode, so the layout is real CSS.
import sharp from 'sharp';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join } from 'node:path';

import { COMMANDERS } from '../src/sim/commanders';
import { BRANCH_NAMES, TECHS, techById } from '../src/sim/research';
import { ENEMIES, ENEMY_ORDER } from '../src/sim/enemies';
import { ROBOTS, ROBOT_ORDER } from '../src/sim/robots';
import { COSTS, KILL_REWARD, LEVEL_REWARD, REFUND, START_STOCK } from '../src/sim/costs';
import { KINDS, STRUCTURE_HP, GENERATOR_MAX_FUEL, DEFAULT_TURRET_DAMAGE, TURRET_MAX_AMMO, type Kind } from '../src/sim/world';
import { AMMO, FUEL, ITEMS, ORE_NAMES, RECIPE_LIST, SMELTS, type ItemId } from '../src/sim/items';
import { BUILD_SECONDS, IDLE_ANIM_SPEED, enemyCount, enemyDamage, enemyHp, enemySpeed, fightSeconds } from '../src/sim/round';
import { COIL_COOLDOWN, COIL_DAMAGE, COIL_FALLOFF, COIL_JUMPS, COIL_JUMP_RANGE, COIL_RANGE, TURRET_COOLDOWN, TURRET_RANGE } from '../src/sim/combat';
import { FAB_CAPACITY } from '../src/sim/robots';
import { COIL_CHARGE_MAX, COIL_SHOT_COST, COIL_USE_CHARGING, COIL_USE_FULL, GEN_OUTPUT, POLE_REACH, POLE_SUPPLY } from '../src/sim/power';
import { TOOL_HELP } from '../src/toolhelp';
import * as C from '../docs/gdd/content';

const root = fileURLToPath(new URL('..', import.meta.url));
const sprites = join(root, 'public', 'sprites');
const outHtml = join(root, 'docs', 'gdd', 'gdd.html');
const outPdf = join(root, 'docs', 'Cinder-Automata-Design-Document.pdf');
const MODULE_RADIUS = 4.2; // matches game.ts

// ---------- helpers ----------
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const strip = (s: string) => s.replace(/<[^>]+>/g, '');
const cache = new Map<string, string>();

async function png(name: string, max = 220): Promise<string> {
  const key = `${name}:${max}`;
  if (cache.has(key)) return cache.get(key)!;
  const f = ['png', 'jpg'].map((e) => join(sprites, `${name}.${e}`)).find(existsSync);
  if (!f) { console.warn(`no sprite ${name}`); return ''; }
  const buf = await sharp(f).resize({ width: max, height: max, fit: 'inside', withoutEnlargement: true }).png({ compressionLevel: 9 }).toBuffer();
  const uri = `data:image/png;base64,${buf.toString('base64')}`;
  cache.set(key, uri);
  return uri;
}
async function shot(file: string, width = 1000): Promise<string> {
  const f = join(root, 'docs', 'gdd', 'screens', file);
  if (!existsSync(f)) return '';
  const buf = await sharp(f).resize({ width, withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();
  return `data:image/jpeg;base64,${buf.toString('base64')}`;
}
const tile = async (name: string, h = 64, cls = '') => `<span class="tile ${cls}"><img src="${await png(name, 300)}" style="max-height:${h}px" alt=""></span>`;

/** The turret drawn as the game draws it: pedestal with the barrel on top. */
async function turretImage(): Promise<string> {
  const base = await sharp(join(sprites, 'turret-gun-base.png')).resize(200, 200, { fit: 'contain' }).toBuffer();
  const barrel = await sharp(join(sprites, 'turret-gun-barrel.png')).resize({ width: 366 }).toBuffer();
  const bm = await sharp(barrel).metadata();
  const buf = await sharp({ create: { width: 400, height: 200, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: base, left: 0, top: 0 }, { input: barrel, left: 34, top: Math.round(100 - 0.51 * (bm.height ?? 100)) }]).png().toBuffer();
  return `data:image/png;base64,${buf.toString('base64')}`;
}

const ITEM_FILE: Partial<Record<ItemId, string>> = {
  'iron-ore': 'ore-iron', 'copper-ore': 'ore-copper', 'iron-plate': 'plate-iron', 'copper-plate': 'plate-copper', coal: 'coal', 'tin-ore': 'ore-tin',
  'lead-ore': 'ore-lead', sulfur: 'sulfur', wood: 'wood', 'tin-plate': 'plate-tin', 'lead-plate': 'plate-lead', charcoal: 'charcoal', gunpowder: 'gunpowder',
  'bullet-casing': 'casing-bullet', bullet: 'ammo-basic', 'bronze-plate': 'plate-bronze', 'steel-plate': 'plate-steel', 'shell-casing': 'casing-shell', 'artillery-shell': 'ammo-shell',
};
const item = async (id: ItemId, h = 26) => `<img class="ico" src="${await png(ITEM_FILE[id] ?? 'plate-iron', 90)}" style="height:${h}px" title="${ITEMS[id].name}" alt="${ITEMS[id].name}">`;
const costLine = (k: Kind) => Object.entries(COSTS[k]).map(([id, n]) => `${n} ${ITEMS[id as ItemId].name.replace(' plate', '').toLowerCase()}`).join(' + ') || 'free';
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
const r1 = (n: number) => (Math.round(n * 10) / 10).toString();

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { version: string };
const today = new Date().toISOString().slice(0, 10);

// ---------- sections ----------
const sections: { id: string; title: string; html: string }[] = [];
const add = (id: string, title: string, html: string) => sections.push({ id, title, html });

const costText2 = (c: Record<string, number | undefined>): string => Object.entries(c).map(([k, n]) => `${n} ${k.replace('science-', '')} packs`).join(' + ');

// 1 Vision
add('vision', 'Vision', `
<p class="lead">${esc(C.elevatorPitch)}</p>
<h3>Design pillars</h3>
<div class="grid2">${C.pillars.map((p) => `<div class="box"><b>${esc(p.name)}</b><p>${esc(p.text)}</p></div>`).join('')}</div>
<h3>At a glance</h3>
<table class="kv">
<tr><td>Genre</td><td>Factory-building tower defence / roguelite</td></tr>
<tr><td>Platform</td><td>Web browser (installable as an app, works offline). Windows launcher planned.</td></tr>
<tr><td>Inspired by</td><td>Factorio, Mindustry, Satisfactory; the round structure of wave defence games</td></tr>
<tr><td>Session length</td><td>3 to 10 minutes per level, autosaved. A full 30-level clear is roughly 2 to 3 hours.</td></tr>
<tr><td>Camera / art</td><td>Top-down 2D, painted sprites, dusk lighting with glow effects</td></tr>
<tr><td>Team so far</td><td>One designer/producer plus AI-assisted code and art</td></tr>
</table>`);

// 2 Core loop
add('loop', 'The core loop', `
<div class="flow">${C.loop.map((l, i) => `<div class="flowstep"><span class="n">${i + 1}</span><b>${esc(l.step)}</b><p>${esc(l.text)}</p></div>`).join('')}</div>
<div class="figs"><figure><img src="${await shot('ammo-chain.jpg')}" alt=""><figcaption>An ammo press turning casings and gunpowder into bullets for a turret, with a gunpowder mill and alloy furnace beside it.</figcaption></figure></div>
<h3>The factory is paused between fights</h3>
<p>Machines, belts and inserters only run while a fight is on. Between fights the base idles (belt arrows creep along at ${Math.round(IDLE_ANIM_SPEED * 100)}% speed, smelters puff smoke, robots patrol, turrets scan), but nothing is produced. That makes the build phase a planning phase, and makes the fight the test of the design.</p>`);

// 3 Levels
{
  const levels = [1, 2, 3, 5, 8, 10, 15, 20, 25, 30];
  const rows = levels.map((L) => {
    const fresh = ENEMY_ORDER.filter((k) => ENEMIES[k].from === L).map((k) => ENEMIES[k].name);
    return `<tr><td><b>${L}</b></td><td>${mmss(fightSeconds(L))}</td><td>${enemyCount(L)}</td><td>${Math.round(enemyHp(L))}</td><td>${r1(enemySpeed(L))}</td><td>${r1(enemyDamage(L))}</td><td>${fresh.length ? esc(fresh.join(', ')) : '&nbsp;'}</td></tr>`;
  }).join('');
  const arrivals = ENEMY_ORDER.slice().sort((a, b) => ENEMIES[a].from - ENEMIES[b].from).map((k) => `<span class="pill">L${ENEMIES[k].from} ${esc(ENEMIES[k].name)}</span>`).join(' ');
  add('levels', 'Levels and pacing', `
<p>One <b>level</b> is one build phase followed by one fight. The build phase is ${BUILD_SECONDS} seconds by default (the player may press <i>Start fight now</i> early). Fights get longer as you go: <b>${mmss(fightSeconds(1))} at level 1, growing to ${mmss(fightSeconds(30))} by level 30</b>, and staying at ${mmss(fightSeconds(99))} beyond that.</p>
<p>Each fight spawns a fixed number of enemies across the first 85% of the timer, arriving in packs from one direction (pack size 1 + level/2, up to 8), about 38 to 46 tiles from the core, and they march straight at it. The fight ends when the timer is out and every enemy is dead. Enemy strength scales per level; a basic crawler's stats look like this:</p>
<table class="data"><thead><tr><th>Level</th><th>Fight length</th><th>Enemies</th><th>Crawler health</th><th>Speed (tiles/s)</th><th>Damage /s</th><th>New enemies</th></tr></thead><tbody>${rows}</tbody></table>
<p class="note">Formulas: enemies = round(5 + 2.5 &times; level); health = 24 &times; (1 + 0.2 &times; min(level &minus; 1, 9) + 0.03 &times; max(0, level &minus; 10)); speed = min(2.2, 0.9 + 0.03 &times; level); damage per second = 2.5 + 0.75 &times; level. Each enemy type multiplies these (see Enemies). <b>These numbers are a first guess and untested past the early levels.</b></p>
<h3>When enemy types arrive</h3><p>${arrivals}</p>
<h3>Stars and Endless (planned)</h3>
<p>Each commander earns <b>one star at level 10, two at level 20, three at level 30</b>. After that, <b>Endless</b> keeps the levels coming at ever-increasing difficulty until you fall. The three star levels are natural places for boss fights (see Bosses).</p>`);
}

// 4 Economy
{
  const own = Object.entries(START_STOCK).map(([id, n]) => `${n} ${ITEMS[id as ItemId].name.toLowerCase()}s`).join(' and ');
  const rows = (Object.keys(COSTS) as Kind[]).filter((k) => k !== 'core').map((k) => `<tr><td>${esc(KINDS[k].name)}</td><td>${KINDS[k].w}&times;${KINDS[k].h}</td><td>${STRUCTURE_HP[k]}</td><td>${esc(costLine(k))}</td></tr>`).join('');
  add('economy', 'Economy and allowances', `
<p>Everything you build is paid for from the <b>Core stock</b>, a stockpile held by the Cinder Core. You begin with <b>${own}</b>. There are four ways to top it up:</p>
<ul>
<li><b>Deliver plates to the core.</b> A belt running into the core, or an inserter dropping into it, adds its items to the stock. This is the main income and needs a real supply line.</li>
<li><b>Kills.</b> Each enemy destroyed pays ${Object.entries(KILL_REWARD).map(([id, n]) => `${n} ${ITEMS[id as ItemId].name.toLowerCase()}`).join(' and ')}.</li>
<li><b>Level bounty.</b> Winning a level pays ${Object.entries(LEVEL_REWARD).map(([id, n]) => `${n} ${ITEMS[id as ItemId].name.toLowerCase()}`).join(' and ')}, growing 5% per level.</li>
<li><b>Removing buildings</b> refunds ${Math.round(REFUND * 100)}% of the cost. Anything placed during the current build phase refunds in full, because nothing is locked in until the fight starts. After that, belts and inserters still refund in full and other buildings refund 75%. Placing still checks that you can afford it, so the budget is reserved as you plan.</li>
</ul>
<p>Turning an existing belt round is free. If the core cannot pay, the build bar dims the button and shows what is missing. The tutorial level is free to build in.</p>
<h3>What things cost</h3>
<table class="data"><thead><tr><th>Building</th><th>Size (tiles)</th><th>Health</th><th>Cost</th></tr></thead><tbody>${rows}</tbody></table>
<div class="figs pair"><figure><img src="${await shot('costs-and-stock.jpg')}" alt=""><figcaption>The core stock panel (top right) and prices on the build bar. Unaffordable buildings dim.</figcaption></figure><figure><img src="${await shot('menu-recipes.jpg')}" alt=""><figcaption>The in-game Items &amp; recipes page.</figcaption></figure></div>
<h3>Other limits</h3>
<ul>
<li>Turrets keep an ammo stock of up to ${TURRET_MAX_AMMO} shots. Generators hold up to ${GENERATOR_MAX_FUEL} seconds of fuel.</li>
<li>Each fabricator has room for <b>${FAB_CAPACITY} space</b> of robots. A small scout or drone takes 1, a Trooper or Gunship 2, a Heavy walker 4, a Turret walker 5, Mobile artillery 6, and a Titan takes all ${FAB_CAPACITY}. When its robots die, room frees up and it builds more. A gauge above each fabricator shows it.</li>
<li><b>Ore is finite.</b> Each tile holds about 300 to 1500 units and depletes as drills mine it. New ore comes from the resource modules you place after each win.</li>
<li>Resource modules: choose 1 of 3 (a different mix each level), then click the map to stamp a rich patch (radius ${MODULE_RADIUS} tiles, 1.5&times; richness). It never lands on top of buildings.</li>
</ul>`);
}

// 5 Buildings
{
  const cards: string[] = [];
  const gallery: [Kind, string[]][] = [
    ['belt', ['belt-straight']], ['inserter', ['inserter-base']], ['miner', ['drill-2x2']], ['furnace', ['furnace-stone']],
    ['assembler', ['gunpowder-mill', 'ammo-press', 'alloy-furnace', 'shell-forge']], ['robotfab', ['robot-fab-1']],
    ['wall', ['wall-straight', 'wall-corner', 'wall-t', 'wall-cross']], ['pole', ['pole-steel']], ['generator', ['generator-lit']],
  ];
  for (const [k, imgs] of gallery) {
    const h = TOOL_HELP[k];
    cards.push(`<div class="card"><div class="pics">${(await Promise.all(imgs.map((n) => tile(n, imgs.length > 2 ? 44 : 70)))).join('')}</div><div class="txt"><h4>${esc(KINDS[k].name)}</h4><div class="chips"><span>${KINDS[k].w}&times;${KINDS[k].h}</span><span>${STRUCTURE_HP[k]} health</span><span>${esc(costLine(k))}</span></div>${h ? `<p>${h.what}</p><p class="dim">${h.does}</p>` : ''}</div></div>`);
  }
  add('buildings', 'Buildings', `
<p>Twelve buildings plus the core. All are placed on a tile grid; most can be dragged out in lines. The first time a building is picked up, the game explains what it is, how to connect it and what it does (also in the in-game menu).</p>
<div class="cards">${cards.join('')}</div>
<p class="note">Self-orienting parts: <b>drills</b> hand ore to any belt or machine touching them on any side and turn to face it; <b>inserters</b> turn themselves to face the direction items can flow, then lock after their first delivery so they can never pull finished goods back the wrong way.</p>`);
}

// 6 Weapons
{
  const tdps = (dmg: number) => r1(dmg / TURRET_COOLDOWN);
  const volley = Array.from({ length: COIL_JUMPS + 1 }, (_, i) => COIL_DAMAGE * COIL_FALLOFF ** i).reduce((a, b) => a + b, 0);
  const ammoRows = await Promise.all(Object.entries(AMMO).map(async ([id, a]) => `<tr><td>${await item(id as ItemId, 22)} ${esc(ITEMS[id as ItemId].name)}</td><td>${a!.shots}</td><td>${a!.damage}</td><td>${tdps(a!.damage)}</td></tr>`));
  add('weapons', 'Weapons and defences', `
<div class="figs two"><figure><img src="${await turretImage()}" class="plain" alt=""><figcaption>Gun turret</figcaption></figure><figure>${await tile('coil-charged', 140)}<figcaption>Storm coil</figcaption></figure><figure>${await tile('wall-cross', 140)}<figcaption>Walls</figcaption></figure></div>
<h3>Gun turret</h3>
<p>Range ${TURRET_RANGE} tiles, one shot every ${TURRET_COOLDOWN} seconds. Fed by any belt that touches it (no inserter needed), it keeps a stockpile of ${TURRET_MAX_AMMO} shots; ring of dots around its rim shows how full it is. Damage depends on the ammunition last loaded:</p>
<table class="data"><thead><tr><th>Ammo</th><th>Shots per item</th><th>Damage per shot</th><th>Damage per second</th></tr></thead><tbody>${ammoRows.join('')}</tbody></table>
<p class="dim">A turret loaded by hand-placed test ammo does ${DEFAULT_TURRET_DAMAGE} damage per shot. Planned turret types (art ready): flame, laser, rocket and artillery.</p>
<h3>Storm coil</h3>
<p>Needs <b>no ammunition</b> but does need power. Every ${COIL_COOLDOWN} seconds it fires a bolt of chain lightning at the nearest enemy within ${COIL_RANGE} tiles for ${COIL_DAMAGE} damage, then jumps to the nearest un-hit enemy within ${COIL_JUMP_RANGE} tiles, up to ${COIL_JUMPS} more times, each hop hitting ${Math.round(COIL_FALLOFF * 100)}% as hard as the last. A full four-target volley deals about <b>${Math.round(volley)} damage</b> in total. It stores energy: it charges up to ${COIL_CHARGE_MAX} at ${COIL_USE_CHARGING} power, each bolt spends ${COIL_SHOT_COST}, and a full coil draws only ${COIL_USE_FULL}. So a charged coil fires a burst of ${COIL_CHARGE_MAX / COIL_SHOT_COST} bolts and then only as fast as the network can recharge it. A network short of power recharges slowly; with no power, it never charges. It is the best answer to crowds of weak enemies.</p>
<div class="figs pair"><figure><img src="${await shot('storm-coil.jpg')}" alt=""><figcaption>A Storm coil chaining lightning through four enemies.</figcaption></figure><figure><img src="${await shot('walls.jpg')}" alt=""><figcaption>Self-connecting walls (corners, a T and a cross) and a powered generator and pole.</figcaption></figure></div>
<h3>Walls</h3>
<p>${STRUCTURE_HP.wall} health, dragged out in lines. They join up automatically into straights, corners, T-junctions and crosses. Enemies attack turrets, walls and coils first, so walls buy time.</p>
<h3>Power</h3>
<ul>
<li><b>Ember generator</b>: burns fuel (${Object.entries(FUEL).map(([k, s]) => `${ITEMS[k as ItemId].name.toLowerCase()} ${s}s`).join(', ')}) and gives ${GEN_OUTPUT} power while a fight is on.</li>
<li><b>Power pole</b>: links to other poles within ${POLE_REACH} tiles, powers anything within ${POLE_SUPPLY} tiles. Each connected group of poles is one network; machines share its power, and a network short on supply scales everything down together.</li>
</ul>`);
}

// 6b Research
add('research', 'Research', `
<p class="lead">Everything you build starts deliberately modest. <b>Research</b> (press T) is how it grows, and it is paid for in <b>science packs</b> that you have to craft: set an Assembler to a science pack recipe, feed it plates and belt the packs into the core. There are three kinds (projectile: iron + copper; electromagnetic: copper + tin; robotics: iron + lead), so each branch needs its own production line and its own ore. Some research makes things better; some <b>unlocks</b> things: robot designs (Trooper and Gunship drone, Heavy walker, Turret walker, Mobile artillery, Titan) and ammunition (bullets, then steel and artillery shells). A new game starts with only the smallest robots and no bullets.</p>
<table class="data"><thead><tr><th>Branch</th><th>Research</th><th>Effect per level</th><th>Levels</th><th>Cost of the first / last level</th></tr></thead><tbody>${TECHS.map((t) => `<tr><td>${esc(BRANCH_NAMES[t.branch])}</td><td><b>${esc(t.name)}</b>${t.requires ? `<br><span class="dim">needs ${esc(techById(t.requires.id)!.name)} ${t.requires.level}</span>` : ''}</td><td>${esc(t.effect)}</td><td>${t.costs.length}</td><td>${costText2(t.costs[0])} / ${costText2(t.costs[t.costs.length - 1])}</td></tr>`).join('')}</tbody></table>
<p>Research applies at once, including to buildings already standing. The design rule: base weapons stay modest so research and commanders have room to matter; a fully researched turret fires roughly 2.3 times as much damage as a fresh one. Since robots do not heal, the robotics line also decides how well your army lasts. In the headless test a typical player with the projectile techs at level 2 to 5 needs about half as many turrets as one with none.</p>
<p class="note">More branches are planned: logistics (faster belts and drills), artillery and flame weapons, and robot tiers. The Forewoman commander is meant to research faster, which is not built yet.</p>`);

// 7 Allies
{
  const rows = await Promise.all(ROBOT_ORDER.map(async (t) => {
    const r = ROBOTS[t];
    return `<tr><td class="pic">${await tile(`robot-top-${t}`, 58, 'sm')}</td><td><b>${esc(r.name)}</b>${r.flying ? '<br><span class="pill air">flying</span>' : ''}</td><td>${r.cost} iron</td><td>${r.buildTime}s</td><td>${r.hp}</td><td>${r.range}</td><td>${Math.round(r.dps)}</td><td>${r.speed}</td></tr>`;
  }));
  add('allies', 'Allies: robot soldiers', `
<p>Your soldiers are robots built in a <b>Robot fabricator</b> from iron plates. Click a fabricator to choose which robot it builds. While a fight is on, each fabricator pulls plates from an adjacent belt and rolls out a robot when it has enough. Robots then act on their own:</p>
<ul>
<li>They walk toward enemies within about 16 tiles, stop at their weapon range and shoot, turning to face their target.</li>
<li>With no enemies around, each stands at its own guard post just outside the base, facing outward, and they keep out of each other's way.</li>
<li>Ground crawlers stop to bite ground robots in their way, but <b>cannot reach flying ones</b>.</li>
<li>They keep going from level to level, but <b>do not heal</b>: a wounded robot stays wounded, and dead ones are replaced by building new ones. The size of the army is limited by the room in your fabricators.</li>
</ul>
<table class="data robots"><thead><tr><th></th><th>Robot</th><th>Cost</th><th>Build time</th><th>Health</th><th>Range</th><th>Damage /s</th><th>Speed</th></tr></thead><tbody>${rows.join('')}</tbody></table>
<div class="figs"><figure><img src="${await shot('robots-roster.jpg')}" alt=""><figcaption>The full roster in front of two robot fabricators: scout drone to Titan. (Since this screenshot the robots were redrawn top-down so they turn to face targets.)</figcaption></figure></div>
<p class="note">Friendly robots are drawn clean, dark steel with <b>blue and orange trim</b> and a glowing blue core, so they are instantly readable against rusted, red-glow enemies.</p>`);
}

// 8 Enemies
{
  const rows = await Promise.all(ENEMY_ORDER.slice().sort((a, b) => ENEMIES[a].from - ENEMIES[b].from).map(async (k) => {
    const e = ENEMIES[k];
    return `<tr><td class="pic">${await tile(`enemy-${k}`, 58, 'sm')}</td><td><b>${esc(e.name)}</b>${e.flying ? '<br><span class="pill air">flying</span>' : ''}</td><td>${e.from}</td><td>${e.weight}</td><td>&times;${e.hp}</td><td>&times;${e.speed}</td><td>&times;${e.dmg}</td><td>${Math.round(enemyHp(10) * e.hp)}</td><td>${Math.round(enemyHp(30) * e.hp)}</td></tr>`;
  }));
  const elites = await Promise.all(C.eliteEnemies.map(async (e) => `<div class="card slim"><div class="pics">${await tile(e.sprite, 66)}</div><div class="txt"><h4>${esc(e.name)} <span class="pill planned">art ready, not built</span></h4><p>${esc(e.role)}</p></div></div>`));
  add('enemies', 'Enemies', `
<p>The enemy is a swarm of <b>rogue, corroded automata</b>: rusted, sooty and glowing red. They spawn at the map edge and march straight at the core. On the way they attack, in order of priority: any ground robot they are touching; then the nearest <b>turret, wall or Storm coil</b> within ${7} tiles; then other machines they are practically touching; otherwise the core. They ignore belts and inserters, so a stray belt can never ruin a run.</p>
<table class="data enemies"><thead><tr><th></th><th>Enemy</th><th>First seen</th><th>Spawn weight</th><th>Health</th><th>Speed</th><th>Damage</th><th>Health at L10</th><th>at L30</th></tr></thead><tbody>${rows.join('')}</tbody></table>
<p class="note">Multipliers apply to the level's base stats (see Levels and pacing). Spawn weight is how common the type is once unlocked.</p>
<div class="figs"><figure><img src="${await shot('enemies-attack.jpg')}" alt=""><figcaption>Every enemy type at once, attacking the base: rusted machines against the friendly blue-trimmed robots and turrets.</figcaption></figure></div>
<h3>More enemy types (art generated, not yet in the game)</h3>
<div class="cards">${elites.join('')}</div>`);
}

// 9 Bosses
add('bosses', 'Bosses', `
<p class="lead">Every tenth level has a boss. It walks in 30% of the way through the fight, the level cannot end until it is dead, and it pays out an extra 150 iron and 50 copper (a bit more on higher levels). The order repeats: Brute, Colossus, Queen, Brute again at level 40, and so on into Endless.</p>
<div class="cards">${(await Promise.all(C.bossPlan.map(async (b) => `<div class="card boss"><div class="pics">${await tile(b.sprite, 110)}</div><div class="txt"><h4>${esc(b.name)}</h4><div class="chips"><span>${esc(b.level)}</span></div><p>${esc(b.idea)}</p></div></div>`))).join('')}</div>
<p>Design intent: each boss tests a different weakness (no real firepower, no answer to range, no answer to a stream of small enemies) and arrives on top of the normal wave. In our headless test a boss level asks for roughly twice the defence of the level before it. The star for the commander comes with commanders, which are not built yet. <b>Boss health and damage are first numbers, not tested by real play.</b></p>`);

// 10 Production
{
  const rec = await Promise.all(RECIPE_LIST.map(async (r) => {
    const ins = (await Promise.all(Object.entries(r.inputs).map(async ([k, n]) => `${(n ?? 0) > 1 ? `<b>${n}&times;</b>` : ''}${await item(k as ItemId, 30)}`))).join('<span class="plus">+</span>');
    return `<div class="recipe"><div class="eq">${ins}<span class="arrow">&rarr;</span>${r.count > 1 ? `<b>${r.count}&times;</b>` : ''}${await item(r.output, 32)}</div><div class="rn"><b>${esc(r.name)}</b> <span class="dim">${r.time}s</span></div></div>`;
  }));
  const smelt = await Promise.all(Object.entries(SMELTS).map(async ([a, b]) => `<div class="recipe"><div class="eq">${await item(a as ItemId, 30)}<span class="arrow">&rarr;</span>${await item(b as ItemId, 30)}</div><div class="rn"><b>${esc(ITEMS[b as ItemId].name)}</b> <span class="dim">smelter</span></div></div>`));
  const ores = await Promise.all([1, 2, 3, 4, 5, 6, 7].map(async (n) => {
    const it = ['iron-ore', 'copper-ore', 'coal', 'tin-ore', 'lead-ore', 'sulfur', 'wood'][n - 1] as ItemId;
    return `<div class="ore">${await item(it, 34)}<span>${esc(ORE_NAMES[n])}</span></div>`;
  }));
  add('production', 'Resources and the production chain', `
<p>Seven raw resources sit in patches across the 160 &times; 160 map at a fair distance from the core, so getting them means planning a supply line. Smelters turn ore into plates, and assemblers combine several inputs into the ammunition and alloys the defence needs.</p>
<div class="ores">${ores.join('')}</div>
<h3>Smelter (one input)</h3><div class="recipes">${smelt.join('')}</div>
<h3>Assembler (several inputs)</h3><div class="recipes">${rec.join('')}</div>
<p class="note">Bullets need lead, copper, coal and sulfur, so the first ammo chain pulls from four different patches. Artillery shells additionally need tin, iron and wood (for charcoal). Shells and artillery turrets are part of the planned content.</p>`);
}

// 11 Commanders & meta
add('meta', 'Commanders and meta-progression', `
<p class="planned-banner">Built: choosing a commander, their bonuses and drawbacks, stars, and going on past level 30 (Endless). Planned: Salvage, the Workshop, the codex and captured tiles.</p>
<ul>${C.metaProgression.map((m) => `<li>${m}</li>`).join('')}</ul>
<h3>Commanders</h3>
<p>The player picks a commander at the start of every new game. Each has a theme, a bonus and a drawback, so the choice changes how you build. Everyone starts with Captain Wren Halloway (standard issue: no bonus and no drawback, so there is no choice at first); the six others unlock through achievements, each tied to the way that commander plays; the last two wait for weapons that do not exist yet (artillery and flame turrets). Stars are kept per commander in the browser: one for completing level 10, two for level 20, three for level 30. The game does not stop at 30; from there it is Endless, and the best level reached is shown on the commander card. Names are original placeholders that avoid film and comic characters; they need a trademark check before release.</p>
<table class="data"><thead><tr><th>Commander</th><th>Theme</th><th>Bonus</th><th>Drawback</th></tr></thead><tbody>${COMMANDERS.map((c) => `<tr><td><b>${esc(c.name)}</b>${c.locked ? ' <span class="pill planned">coming soon</span>' : ''}</td><td>${esc(c.theme)}</td><td>${esc(c.bonus)}</td><td>${esc(c.drawback)}</td></tr>`).join('')}</tbody></table>`);

// 12 Strategy
add('strategy', 'Strategy and player experience', `
<p>What a good run looks like, and what the game is trying to teach:</p>
<ol class="tips">${C.tips.map((t) => `<li>${esc(t)}</li>`).join('')}</ol>
<h3>A typical early run</h3>
<ol class="tips">
<li><b>Levels 1 to 3.</b> Drill iron, smelt to plates, feed two or three turrets with a belt. Add a wall line. Enemies are basic crawlers.</li>
<li><b>Levels 4 to 7.</b> Spiders and scout drones arrive. Add copper, a Robot fabricator and a few cheap robots. Start the ammo chain (coal, sulfur, lead) and switch turrets to bullets.</li>
<li><b>Levels 8 to 12.</b> Armoured and siege crawlers, combat drones. Stand up power: a generator, poles and one or two Storm coils behind walls. Take resource modules that add what you are missing.</li>
<li><b>Level 10 and beyond.</b> Waves of dozens of tough enemies, the first boss. A balanced defence with walls, turrets on bullets, coils and a steady stream of robots.</li>
</ol>`);

// 13 Interface
add('interface', 'Interface and controls', `
<div class="figs pair"><figure><img src="${await shot('title.jpg')}" alt=""><figcaption>Title screen with the game logo.</figcaption></figure><figure><img src="${await shot('menu-buildings.jpg')}" alt=""><figcaption>The in-game menu: every building with a picture, its size, health, cost and how to connect it.</figcaption></figure></div>
<ul>
<li><b>Build bar</b> along the bottom, in groups (Logistics, Production, Defence, Power). Hover for a tooltip with the price; click for an explanation of how to connect it.</li>
<li><b>Round panel</b> top centre: level, phase timer, core health, kills, robots, power.</li>
<li><b>Core stock</b> top right. <b>Menu</b> top left: guide, and a picture book of every building, robot, enemy, item and recipe.</li>
<li>A <b>guided tutorial</b> level walks a new player through mining, belts, smelting, feeding a turret and surviving a first fight.</li>
<li>The interface scales smoothly with the window size.</li>
</ul>
<table class="kv">
<tr><td>Click / drag</td><td>Place the selected building; drag to lay belts and walls</td></tr>
<tr><td>Right-click or X</td><td>Remove (free until the fight starts, then 75%)</td></tr>
<tr><td>1 to 9, 0, -, =</td><td>Choose a building</td></tr>
<tr><td>R / Shift+R</td><td>Rotate</td></tr>
<tr><td>W A S D, wheel</td><td>Move and zoom the camera</td></tr>
<tr><td>H, P, Esc / M</td><td>Explain building, pause, menu</td></tr>
</table>`);

// 14 Art
add('art', 'Art and audio direction', `
<p><b>Look.</b> A burnt, ash-covered alien world rebuilt with rugged industrial machines. Hand-painted top-down sprites with thick dark outlines, a muted charcoal, rust and soot palette, and warm ember-orange and amber glow as the accent. A cool dusk grade darkens the scene, and machines, the core, smelters and explosions cast real light onto the ground.</p>
<p><b>Colour language.</b> Friendly: clean dark steel with blue and orange trim. Enemy: rusted, sooty, red glows. Power: cold blue-white. Fire and forges: orange.</p>
<p><b>How the art is made.</b> Sprite sheets are generated in Google Gemini using a shared style block and reference images, then cut out of a flat magenta background, named and compressed by a script in the project. There are about ${existsSync(join(sprites, 'manifest.json')) ? Object.keys(JSON.parse(readFileSync(join(sprites, 'manifest.json'), 'utf8'))).length : 300} sprites so far. A prompt pack with copy buttons tracks what has been generated and what is still needed. Effects (explosions, smoke, lightning) are painted sprites blended with light; lightning bolts themselves are generated in code so they crackle differently every time.</p>
<p><b>Audio.</b> None yet. The FuzeNova Games studio intro (an animated logo with a sound sting) plays before the game starts.</p>`);

// 15 Tech
add('tech', 'Technology and how it is built', `
<table class="kv">
<tr><td>Language / build</td><td>TypeScript, built with Vite. The simulation has no dependence on the screen, so it runs headless.</td></tr>
<tr><td>Rendering</td><td>HTML canvas, 2D, with a per-frame lighting pass. Holds 60 frames per second with 40 enemies, 25 robots and 40 explosions on screen.</td></tr>
<tr><td>Testing</td><td>Automated tests cover the factory, ammo chain, power, combat, damage, saving and offline behaviour.</td></tr>
<tr><td>Saving</td><td>Stored in the player's browser at the start of each build phase; restored exactly.</td></tr>
<tr><td>Distribution</td><td>Static files hosted on the site at /play/cinder-automata/, installable as an app (PWA) with offline play. A Windows launcher is planned.</td></tr>
<tr><td>Tools in the repo</td><td>Sprite slicer, prompt-pack builder, icon and logo tools, and this document's generator.</td></tr>
</table>
<p class="note">Status of the code: nothing has been committed to source control or deployed yet at the time of writing. The project lives in the <b>games/cinder-automata</b> folder of the luckyfuzsion site repository, and builds into <b>public/play/cinder-automata</b>.</p>`);

// 16 Status
{
  const badge = (s: C.Status) => (s === 'built' ? '<span class="st built">BUILT</span>' : s === 'art' ? '<span class="st art">ART READY</span>' : '<span class="st planned">PLANNED</span>');
  add('status', 'Where the project stands', `
<div class="status">${C.featureStatus.map((g) => `<div class="sgroup"><h4>${esc(g.area)}</h4>${g.items.map((i) => `<div class="srow">${badge(i.status)}<span>${esc(i.name)}${i.note ? ` <i class="dim">(${esc(i.note)})</i>` : ''}</span></div>`).join('')}</div>`).join('')}</div>
<h3>Roadmap</h3>
<table class="data"><tbody>${C.roadmap.map((r) => `<tr><td style="width:90px"><b>${esc(r.phase)}</b></td><td>${esc(r.goal)}</td></tr>`).join('')}</tbody></table>`);
}

// 17 Open questions & help wanted
add('open', 'Open questions and help wanted', `
<h3>Open design questions</h3>
<h3>Decisions so far</h3>
<table class="data"><thead><tr><th>Topic</th><th>Decision</th><th>Status</th></tr></thead><tbody>${C.decisions.map((d) => `<tr><td><b>${esc(d.topic)}</b></td><td>${esc(d.decision)}</td><td><span class="st ${d.status === 'built' ? 'built' : 'planned'}">${d.status === 'built' ? 'BUILT' : 'PROPOSED'}</span></td></tr>`).join('')}</tbody></table>
<h3>Still open</h3>
<ul>${C.openQuestions.map((q) => `<li>${esc(q)}</li>`).join('')}</ul>
<h3>Who would help most</h3>
<div class="grid2">${C.wanted.map((w) => `<div class="box"><b>${esc(w.role)}</b><p>${esc(w.text)}</p></div>`).join('')}</div>
<h3>Legal notes</h3>
<ul>
<li>The title, commander names and enemy names are original but unchecked. A trademark search (UK IPO, USPTO, Steam, itch.io) is needed before release. An earlier working title was dropped because it already exists on Steam.</li>
<li>Mechanics inspired by Factorio and similar games are not protected, but their art, names, sounds and specific designs are. Everything here is original art. "Tesla coil" is a generic term, and this game calls its version the <b>Storm coil</b>.</li>
<li>Art is AI-assisted (Gemini). Check the current terms on commercial use and disclosure for any store you publish to.</li>
</ul>`);

// 18 Change log
add('changelog', 'Change log', `${C.changelog.map((c) => `<h3>${esc(c.date)}</h3><ul>${c.changes.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`).join('')}
<p class="dim">This document is generated from the game's own code and a text file of notes (docs/gdd/content.ts). Run <code>npm run gdd</code> to rebuild it after any change.</p>`);

// ---------- assemble ----------
const css = readFileSync(join(root, 'docs', 'gdd', 'gdd.css'), 'utf8');
const logo = ['logo-shield.png', 'logo-text.png'].map((n) => join(root, 'public', 'logo', n));
const logoUri = async (i: number, w: number) => (existsSync(logo[i]) ? `data:image/png;base64,${(await sharp(logo[i]).resize({ width: w, withoutEnlargement: true }).png().toBuffer()).toString('base64')}` : '');

const toc = sections.map((s, i) => `<li><span class="num">${String(i + 1).padStart(2, '0')}</span><a href="#${s.id}">${esc(s.title)}</a></li>`).join('');
const body = sections.map((s, i) => `<section id="${s.id}"><h2><span class="num">${String(i + 1).padStart(2, '0')}</span>${esc(s.title)}</h2>${s.html}</section>`).join('\n');

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(C.meta.title)} - ${esc(C.meta.subtitle)}</title><style>${css}</style></head><body>
<div class="cover">
  <div class="cover-in">
    <img class="cover-logo" src="${await logoUri(0, 900)}" alt="${esc(C.meta.title)}">
    <div class="cover-sub">${esc(C.meta.subtitle)}</div>
    <div class="cover-tag">${esc(C.meta.tagline)}</div>
    <div class="cover-meta"><span>${esc(C.meta.studio)}</span><span>${esc(C.meta.status)}</span><span>Version ${esc(pkg.version)}</span><span>${today}</span></div>
  </div>
</div>
<div class="toc"><h1>Contents</h1><ol>${toc}</ol>
  <p class="dim small">Everything numeric in this document (prices, stats, recipes, level scaling) is read directly from the game's code when the document is built, so it matches the game as it is today. Items marked <span class="st planned">PLANNED</span> or <span class="st art">ART READY</span> are designed but not yet in the game.</p>
</div>
${body}
</body></html>`;

mkdirSync(join(root, 'docs', 'gdd'), { recursive: true });
writeFileSync(outHtml, html);
console.log(`html written (${Math.round(html.length / 1024)} KB)`);

// ---------- print to PDF ----------
const browsers = ['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe', 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'];
const browser = browsers.find(existsSync);
if (!browser) { console.error('No Edge or Chrome found to print the PDF. Open docs/gdd/gdd.html and print it to PDF instead.'); process.exit(1); }
const profile = join(tmpdir(), `gdd-print-${Date.now()}`);
const res = spawnSync(browser, [
  '--headless=new', '--disable-gpu', '--no-sandbox', `--user-data-dir=${profile}`, '--no-pdf-header-footer', '--print-to-pdf-no-header',
  `--print-to-pdf=${outPdf}`, '--virtual-time-budget=20000', pathToFileURL(outHtml).href,
], { encoding: 'utf8', timeout: 120000 });
if (!existsSync(outPdf) || res.status !== 0 && !existsSync(outPdf)) { console.error('PDF was not created', res.stderr); process.exit(1); }
console.log(`PDF written: ${outPdf} (${Math.round(statSync(outPdf).size / 1024)} KB)`);
