// Builds docs/Cinder-Automata-Stat-Sheets.pdf: every number in the game that matters for balance, read straight from the game's own tables, grouped by category.
// Usage: npx tsx tools/build-statsheets.ts   (it needs Edge or Chrome to print the PDF, like the design document)
import { spawnSync } from 'node:child_process';
import { existsSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { COSTS, FREE_TO_REMOVE, KILL_REWARD, LEVEL_REWARD, REFUND, START_STOCK } from '../src/sim/costs';
import { COMMANDERS } from '../src/sim/commanders';
import { COIL_CHARGE_MAX, COIL_CHARGE_RATE, COIL_SHOT_COST, COIL_USE_CHARGING, GEN_OUTPUT, POLE_REACH, POLE_SUPPLY } from '../src/sim/power';
import { COIL_DAMAGE, COIL_JUMPS, COIL_RANGE, RAILGUN_DAMAGE } from '../src/sim/combat';
import { DIFFICULTIES } from '../src/sim/difficulty';
import { DAMAGE_NAMES, DAMAGE_TYPES, ENEMIES, ENEMY_ORDER, BOSS_ORDER, damageMul } from '../src/sim/enemies';
import { AMMO, FUEL, ITEMS, RECIPE_LIST, SMELTS, type ItemId } from '../src/sim/items';
import { PERKS } from '../src/sim/prestige';
import { TECHS, LEVEL_GATES } from '../src/sim/research';
import { FAB_CAPACITY, FAB_KINDS, FAB_ROBOTS, ROBOTS, ROBOT_SPACE, plateText } from '../src/sim/robots';
import { BOONS, OMENS } from '../src/sim/roguelite';
import { BOSS_REWARD, enemyCount, enemyDamage, enemyHp, enemySpeed, fightSeconds, packSize, waveCount, waveGap } from '../src/sim/round';
import { COIL_ORDER, COIL_VARIANTS, VARIANTS, VARIANT_ORDER } from '../src/sim/turretdata';
import { BELT_SPEED, ITEM_SPACING, KINDS, MINE_TIME, SMELT_TIME, STRUCTURE_HP, TURRET_MAX_AMMO, TUNNEL_MAX_GAP, type Kind } from '../src/sim/world';
import { ROBOT_UNLOCK } from '../src/sim/research';

const esc = (s: string | number): string => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const cost = (c: Partial<Record<string, number>>): string => (Object.keys(c).length ? Object.entries(c).map(([k, n]) => `${n} ${k.replace('-plate', '')}`).join(' + ') : 'free');
const f = (n: number, d = 1): string => (Math.round(n * 10 ** d) / 10 ** d).toString();
const table = (head: string[], rows: (string | number)[][], note = ''): string =>
  `<table><thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c, i) => `<td class="${i === 0 ? 'n' : ''}">${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>${note ? `<p class="note">${note}</p>` : ''}`;
const section = (n: number, title: string, body: string): string => `<section><h2>${n}. ${esc(title)}</h2>${body}</section>`;
const tn = (id: string): string => (id in ITEMS ? ITEMS[id as ItemId].name : id);

const out: string[] = [];

// ---- 1. level scaling ----
const LV = [1, 2, 3, 5, 8, 10, 15, 20, 30];
out.push(section(1, 'Level scaling (what each level throws at you)', table(
  ['Level', 'Enemies', 'Base HP', 'Base damage', 'Base speed', 'Waves', 'Pack size', 'Wave gap s', 'Fight s', 'Arena half'],
  LV.map((l) => [l, enemyCount(l), f(enemyHp(l)), f(enemyDamage(l), 2), f(enemySpeed(l), 2), waveCount(l), packSize(l), waveGap(l), Math.round(fightSeconds(l)), Math.min(80, 22 + l * 4)]),
  'An enemy\'s real stats are the base value for the level times its own multiplier (section 2), times the difficulty (section 12) and any omen (section 3). Bosses arrive at levels 10, 20 and 30.')));

// ---- 2. enemies ----
const enemyRow = (k: (typeof ENEMY_ORDER)[number]): (string | number)[] => {
  const e = ENEMIES[k];
  const tag = (t: 'weak' | 'res') => DAMAGE_TYPES.filter((d) => (t === 'weak' ? damageMul(k, d) >= 1.15 : damageMul(k, d) <= 0.9)).map((d) => `${DAMAGE_NAMES[d].toLowerCase()} ${f(damageMul(k, d), 2)}`).join(', ') || '-';
  return [e.name + (e.flying ? ' (flies)' : ''), e.from, e.weight, `x${e.hp}`, `x${e.speed}`, `x${e.dmg}`, e.armor ?? '-', e.insulated ? 'yes' : '-', e.range ?? 'melee', e.scale, f(enemyHp(10) * e.hp, 0), tag('weak'), tag('res')];
};
out.push(section(2, 'Enemies', table(
  ['Enemy', 'From lvl', 'Weight', 'HP', 'Speed', 'Damage', 'Armour', 'Insulated', 'Range', 'Size', 'HP at lvl 10', 'Weak to', 'Resists'],
  ENEMY_ORDER.map(enemyRow),
  'Armour is flat damage taken off every kinetic hit (never less than a quarter of the hit); flame and energy ignore it. Insulated enemies take 40% from lightning. Weak and resists show the damage multiplier for that type (1.0 = normal).')
  + '<h3>Bosses</h3>' + table(
    ['Boss', 'At level', 'HP', 'Speed', 'Damage', 'Armour', 'Size', 'HP at its level', 'Weak to', 'Resists'],
    BOSS_ORDER.map((k) => { const e = ENEMIES[k]; const lv = k === 'brute-3' ? 10 : k === 'boss-colossus' ? 20 : 30; const r = enemyRow(k as never); return [e.name, lv, `x${e.hp}`, `x${e.speed}`, `x${e.dmg}`, e.armor ?? '-', e.scale, f(enemyHp(lv) * e.hp, 0), r[11], r[12]]; }),
    `Defeating a boss pays an extra ${cost(BOSS_REWARD)} (scaled with the level). The Colossus shells from 9 tiles; the Hive Queen parks 9 tiles out and sends brood.`)));

// ---- 3. omens ----
out.push(section(3, 'Omens (a twist on some levels)', table(
  ['Omen', 'Effect', 'Count', 'HP', 'Speed', 'Damage', 'Other'],
  OMENS.map((o) => [o.name, o.blurb, `x${o.count}`, `x${o.hp}`, `x${o.speed}`, `x${o.dmg}`, [o.twoFronts ? 'two fronts' : '', o.bounty ? 'kills pay double' : '', o.ranged ? `ranged x${o.ranged}` : '', o.fog ? `turret range x${o.fog}` : ''].filter(Boolean).join(', ') || '-']),
  'About three levels in four have an omen; level 1 never does.')));

// ---- 4. robots ----
out.push(section(4, 'Robots, by the building that makes them', FAB_KINDS.map((k) => `<h3>${esc(KINDS[k].name)} <small>(${esc(cost(COSTS[k]))}; room ${FAB_CAPACITY})</small></h3>` + table(
  ['Robot', 'Unlocks', 'Space', 'Max', 'Build s', 'HP', 'DPS', 'Range', 'Speed', 'Full-building HP', 'Full DPS', 'Plates each'],
  FAB_ROBOTS[k].map((t) => { const r = ROBOTS[t], max = Math.floor(FAB_CAPACITY / ROBOT_SPACE[t]); return [r.name + (r.flying ? ' (flies)' : ''), `Robot designs ${ROBOT_UNLOCK[t]}`, ROBOT_SPACE[t], max, r.buildTime, r.hp, r.alt ? `${r.dps} + ${r.alt.dps} cannon` : r.dps, r.range, r.speed, max * r.hp, Math.round(max * (r.dps + (r.alt?.dps ?? 0))), plateText(r.cost)]; })
)).join('') + '<p class="note">Robots stay within 30 tiles of the building that made them and always fight anything within 9 tiles. The Sapper drone\'s bomb hits ground enemies within 2.1 tiles; the Carrier has no weapon of its own: it stays by its building and launches up to 5 Scout drones, one every 7 seconds, which hunt up to 45 tiles away. The Heavy walker draws ground enemies within 7 tiles and mends 2% of its health a second; Mobile artillery bursts over 2.2 tiles; the Interceptor does 2.5x damage to flyers; the Titan fast guns and slow cannon are listed together (the drones of a Carrier are not counted in its Full DPS). Workshop upgrades, commanders and boons scale HP and damage.</p>'));

// ---- 5. turrets ----
out.push(section(5, 'Turrets', table(
  ['Turret', 'Family', 'Tier', 'Range', 'Min', 'Fires every', 'Damage x', 'Type', 'Hits', 'Burn', 'Ammo', 'Upgrade cost', 'Unlocked by'],
  VARIANT_ORDER.map((v) => { const d = VARIANTS[v]; return [d.name, d.family, d.tier === 0 ? 'base' : `level ${d.tier}`, d.range, d.minRange ?? '-', `${d.cooldown}s`, `x${d.dmgMul}`, DAMAGE_NAMES[d.type], d.cone ? `cone ${f(d.cone, 2)} rad` : d.blast ? `area ${d.blast}` : 'one', d.burn ? `${d.burn.dps}/s for ${d.burn.secs}s` : '-', d.ammo.map((i) => ITEMS[i].name.toLowerCase()).join(' / '), d.tier ? cost(d.cost) : (d.family === 'fire' ? cost(COSTS.flamer) + ' (building)' : cost(COSTS.turret) + ' (building)'), `${d.tech} ${d.unlock}`]; }),
  `Damage per shot is the ammunition's damage times "damage x", times commander, research and Workshop bonuses. A turret holds ${TURRET_MAX_AMMO} shots (the Flamer family 3x that). Level-2 weapons need a level-1 type first; going back down is free.`)));

// ---- 6. coils ----
out.push(section(6, 'Storm coils and power', table(
  ['Coil', 'Tier', 'Range', 'Charge per use', 'Cooldown', 'Upgrade cost', 'Unlocked by', 'Effect'],
  COIL_ORDER.map((v) => { const d = COIL_VARIANTS[v]; return [d.name, d.tier === 0 ? 'base' : `level ${d.tier}`, d.range, d.charge || 'as it absorbs', d.cooldown ? `${d.cooldown}s` : '-', d.tier ? cost(d.cost) : cost(COSTS.coil) + ' (building)', `${d.tech} ${d.unlock}`, d.blurb]; }))
  + table(['Number', 'Value'], [
    ['Storm coil bolt damage', COIL_DAMAGE], ['Extra jumps', COIL_JUMPS], ['Each jump hits for', '75% of the last'], ['Charge capacity', COIL_CHARGE_MAX], ['Charge gained per second at full power', COIL_CHARGE_RATE],
    ['Charge per bolt', COIL_SHOT_COST], ['Power a charging coil asks for', COIL_USE_CHARGING], ['Railgun damage (each enemy on the line)', RAILGUN_DAMAGE], ['Generator output', GEN_OUTPUT],
    ['Pole wire reach / supply radius (tiles)', `${POLE_REACH} / ${POLE_SUPPLY}`], ['Base coil range (tiles)', COIL_RANGE],
  ])));

// ---- 7. ammo and fuel ----
out.push(section(7, 'Ammunition and fuel', table(
  ['Item', 'Shots per item', 'Damage per shot', 'Used by'],
  (Object.keys(AMMO) as ItemId[]).map((k) => [ITEMS[k].name, AMMO[k]!.shots, AMMO[k]!.damage, VARIANT_ORDER.filter((v) => VARIANTS[v].ammo.includes(k)).map((v) => VARIANTS[v].name).join(', ')]))
  + table(['Fuel', 'Generator seconds per item'], (Object.keys(FUEL) as ItemId[]).map((k) => [ITEMS[k].name, FUEL[k]!]))));

// ---- 8. structures ----
const kinds = Object.keys(KINDS) as Kind[];
out.push(section(8, 'Buildings', table(
  ['Building', 'Size', 'Health', 'Cost', 'Removing it'],
  kinds.map((k) => [KINDS[k].name, `${KINDS[k].w} x ${KINDS[k].h}`, STRUCTURE_HP[k], cost(COSTS[k]), FREE_TO_REMOVE.includes(k) ? 'free, full refund' : `refund ${Math.round(REFUND * 100)}%`]),
  `Turrets and walls get their health boosted by research, commanders and the Workshop; the Core by the Workshop. Underground belts span up to ${TUNNEL_MAX_GAP} tiles of anything. Belts move ${BELT_SPEED} tiles a second with ${ITEM_SPACING} tiles between items; a drill mines an ore every ${MINE_TIME}s and a smelter takes ${SMELT_TIME}s per plate.`)));

// ---- 9. recipes ----
out.push(section(9, 'Items and recipes', table(
  ['Made in', 'Recipe', 'Inputs', 'Output', 'Time'],
  [...Object.entries(SMELTS).map(([a, b]) => ['Smelter', `${tn(a)} to ${tn(b as string)}`, `1 ${tn(a)}`, `1 ${tn(b as string)}`, `${SMELT_TIME}s`]),
    ...RECIPE_LIST.map((r) => ['Assembler', r.name, Object.entries(r.inputs).map(([k, n]) => `${n} ${tn(k)}`).join(' + '), `${r.count} ${tn(r.output)}`, `${r.time}s`])])));

// ---- 10. research ----
out.push(section(10, 'Research', table(
  ['Tech', 'Branch', 'Pack', 'Levels', 'Cost per level (science packs)', 'What it does'],
  TECHS.map((t) => [t.name, t.branch, tn(t.pack).replace(' science pack', ''), t.costs.length, t.costs.map((c, i) => `L${i + 1}: ${Object.entries(c).map(([k, n]) => `${n} ${tn(k).replace(' science pack', '').toLowerCase()}`).join(' + ')}`).join('; '), t.effect]),
  `Each level also needs the run to have reached a certain level: ${LEVEL_GATES.map((g, i) => `level ${i + 1} needs run level ${g}`).join(', ')}. Research takes factory time (15 + 10 x level index seconds).`)));

// ---- 11. commanders, boons, workshop ----
out.push(section(11, 'Commanders, boons and Workshop upgrades', '<h3>Commanders</h3>' + table(
  ['Commander', 'Theme', 'Bonus', 'Drawback', 'Unlocked by'],
  COMMANDERS.map((c) => [c.name, c.theme, c.bonus, c.drawback, c.starter ? 'starter' : 'achievement'])) + '<h3>Boons (offered every second level)</h3>' + table(
  ['Boon', 'Effect', 'Weight'], BOONS.map((b) => [b.name, b.desc, b.weight])) + '<h3>Workshop upgrades (bought with Embers)</h3>' + table(
  ['Upgrade', 'Per level', 'Max level', 'Price of level 1', 'Total to max'],
  PERKS.map((p) => [p.name, p.blurb, p.max, p.base, (p.base * p.max * (p.max + 1)) / 2]),
  'Embers: 1 per level for levels 1 to 3, 2 for 4 to 6 and so on, times 0.75 (Easy), 1 (Normal), 1.25 (Hard) or 1.5 (Extreme); paid when a run ends, win or lose.')));

// ---- 12. difficulty and economy ----
out.push(section(12, 'Difficulty and economy', table(
  ['Difficulty', 'Build time', 'Enemy HP', 'Enemy damage', 'Repairs cost', 'Cooldown after a win (lvl 1)'],
  DIFFICULTIES.map((d) => [d.name, d.buildSeconds === null ? 'no timer' : `${d.buildSeconds}s`, `x${d.enemyHp}`, `x${d.enemyDmg}`, d.repairCost ? `${Math.round(d.repairCost * 100)}%` : 'free', `${d.cooldown}s`]))
  + table(['Money', 'Amount'], [['Starting stock', cost(START_STOCK)], ['Level-complete reward', `${cost(LEVEL_REWARD)} (x 1 + 5% per level)`], ['Per kill', cost(KILL_REWARD)], ['Boss bonus', cost(BOSS_REWARD)], ['Removing a building', `${Math.round(REFUND * 100)}% back`]])));

const css = `
@page { size: A4 landscape; margin: 12mm 12mm; }
body { font: 9pt/1.4 'Segoe UI', Arial, sans-serif; color: #1d1a18; }
h1 { font-size: 24pt; margin: 0; color: #b3470a; } .sub { margin: 2px 0 10px; color: #6b5f55; }
h2 { font-size: 14pt; margin: 18px 0 6px; padding-bottom: 3px; border-bottom: 2px solid #e8730c; color: #2a1d14; page-break-after: avoid; }
h3 { font-size: 11pt; margin: 12px 0 4px; page-break-after: avoid; } h3 small { font-weight: 400; color: #6b5f55; }
section { page-break-before: auto; }
table { border-collapse: collapse; width: 100%; margin: 4px 0 8px; font-size: 8pt; page-break-inside: auto; }
tr { page-break-inside: avoid; }
th { background: #2a1d14; color: #ffe2b0; text-align: left; padding: 3px 5px; white-space: nowrap; }
td { border: 1px solid #d8cfc6; padding: 3px 5px; vertical-align: top; } td.n { font-weight: 700; }
tr:nth-child(even) td { background: #faf5ef; }
.note { color: #6b5f55; font-size: 8pt; margin: 2px 0 8px; }
`;
const html = `<!doctype html><html><head><meta charset="utf-8"><title>Cinder Automata: stat sheets</title><style>${css}</style></head><body>
<h1>Cinder Automata: stat sheets</h1><p class="sub">Every balance number in the game, read from its own tables. Generated ${new Date().toISOString().slice(0, 10)}. All values are first guesses and not yet tuned by play.</p>
<p class="note">Contents: ${out.map((_, i) => '').join('')}1 Level scaling &middot; 2 Enemies and bosses &middot; 3 Omens &middot; 4 Robots &middot; 5 Turrets &middot; 6 Coils and power &middot; 7 Ammunition and fuel &middot; 8 Buildings &middot; 9 Items and recipes &middot; 10 Research &middot; 11 Commanders, boons and Workshop &middot; 12 Difficulty and economy</p>
${out.join('\n')}</body></html>`;

const docs = resolve('docs');
const htmlPath = join(docs, 'stat-sheets.html'), pdfPath = join(docs, 'Cinder-Automata-Stat-Sheets.pdf');
writeFileSync(htmlPath, html);
const r = spawnSync('node', ['tools/print-html.mjs', htmlPath, pdfPath], { encoding: 'utf8' });
if (existsSync(pdfPath)) rmSync(htmlPath, { force: true });
if (!existsSync(pdfPath)) { console.error('PDF was not created', r.stdout, r.stderr); process.exit(1); }
console.log(`written ${pdfPath} (${Math.round(statSync(pdfPath).size / 1024)} KB)`);
