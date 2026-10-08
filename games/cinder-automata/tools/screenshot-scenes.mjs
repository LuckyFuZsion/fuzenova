// Each scene is the body of an async function run inside the game page (dev server). It builds a situation for the picture.
// Seed 4242: the Core is at (99,99); iron lies at x 89-96 / y 96-105 in the first plot, a big copper field about 17 tiles east.
const START = `
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const g = window.__game; g.discoveries.check = () => {}; g.newGame('wren', 'normal'); // no pop-ups in the pictures
  document.getElementById('title').hidden = true; document.getElementById('hud').hidden = false; g.start();
  await sleep(1200);
  const keys = document.getElementById('keys'); if (keys) { keys.hidden = true; keys.style.display = 'none'; } // the controls panel stays out of the pictures
  const hint = document.getElementById('tip'); if (hint) hint.style.display = 'none';
  setInterval(() => { g.flash = null; }, 40); // no hint or unlock messages along the bottom
  const w = g.run.world, c = w.core;
  for (const id of [17, 23, 25, 31, 16, 18, 30, 32]) w.openPlot(id); // a wider explored map, so the picture is not hemmed in by darkness
  const put = (k, x, y, d = 0) => { const e = w.place(k, x, y, d); if (!e) console.log('could not place', k, x, y); return e; };
  const loadTurret = (t, n = 40) => { if (t) t.ammo = n; return t; };
  const runUntil = (cond, maxSec, tick) => { for (let i = 0; i < maxSec * 30; i++) { if (tick) tick(); g.run.update(1 / 30); if (cond()) return i / 30; } return -1; };
  const near = (r) => w.enemies.filter((e) => Math.hypot(e.x - c.x, e.y - c.y) < r).length;
  let eid = 90000;
  const spawn = (kind, x, y, hp = 400) => w.enemies.push({ id: ++eid, x, y, hp, maxHp: hp, speed: 0.9, dmg: 2, born: w.time, kind });
  const freeze = () => { const st = document.createElement('style'); st.textContent = '.paused, #pauseOverlay { display: none !important }'; document.head.append(st); try { g.updateHud(null, undefined); } catch (e) { /* the readout stays as it was */ } g.paused = true; };
  setInterval(() => { document.querySelectorAll('body *').forEach((el) => { if (el.children.length === 0 && /^(Only the ground round|Commander unlocked|Pick a building)/.test(el.textContent.trim())) { el.style.display = 'none'; if (el.parentElement && el.parentElement.id !== 'hud') el.parentElement.style.display = 'none'; } }); }, 80);
  const look = (x, y, zoom) => { g.cam.x = x; g.cam.y = y; g.cam.zoom = zoom; };
`;

// the iron line: drills -> smelters -> inserters -> a belt into the Core
const FACTORY = `
  for (const y of [97, 100, 103]) put('miner', 90, y, 0);
  for (const y of [98, 101, 104]) put('furnace', 92, y, 0);
  for (const y of [99, 102, 105]) put('inserter', 94, y, 0);
  for (let y = 105; y >= 101; y--) put('belt', 95, y, 3);
  put('belt', 95, 99, 1);
  for (let x = 95; x <= 98; x++) put('belt', x, 100, 0);
`;

export const SCENES = {
  '1-title': `
    for (const id of ['acct', 'install', 'iosHint']) { const el = document.getElementById(id); if (el) el.hidden = true; }
    document.querySelectorAll('#title *').forEach((el) => { if (el.children.length === 0 && /Signed in|prototype/i.test(el.textContent)) el.style.display = 'none'; });
    await new Promise((r) => setTimeout(r, 600));`,

  '2-factory': START + FACTORY + `
    loadTurret(put('turret', 104, 96, 0)); put('wall', 104, 98, 0); put('wall', 104, 99, 0); put('wall', 104, 100, 0);
    for (let i = 0; i < 40 * 30; i++) w.step(1 / 30); // let ore flow so the belt is busy
    look(96, 101.2, 52); await sleep(300);`,

  '3-defence': START + FACTORY + `
    g.run.level = 5;
    for (const [x, y] of [[105, 95], [105, 99], [105, 103], [101, 106]]) loadTurret(put('turret', x, y, 0));
    for (let y = 93; y <= 107; y++) put('wall', 109, y, 0);
    for (let i = 0; i < 40 * 30; i++) w.step(1 / 30);
    g.run.startFight();
    for (let i = 0; i < 2 * 30; i++) g.run.update(1 / 30);
    w.enemies.length = 0;
    const mix = ['crawler-1', 'crawler-2', 'spider-1', 'crawler-1', 'brute-2', 'spider-2', 'crawler-1', 'acid-1', 'crawler-2', 'crawler-1', 'spider-1', 'crawler-1'];
    mix.forEach((k, i) => spawn(k, 112.5 + (i % 4) * 1.6 + Math.random(), 94 + i * 1.1, 600));
    for (let i = 0; i < 3.2 * 30; i++) { for (const e of w.entities.values()) if (e.kind === 'turret') e.ammo = 40; g.run.update(1 / 30); }
    look(106, 100, 50); freeze(); await sleep(300);`,

  '4-power': START + `
    g.run.level = 5;
    put('generator', 93, 94, 0).fuelSecs = 300; put('generator', 93, 104, 0).fuelSecs = 300;
    for (const [x, y] of [[97, 96], [97, 106], [103, 96], [103, 106], [106, 101]]) put('pole', x, y, 0);
    for (const [x, y] of [[100, 93], [106, 98], [106, 104], [100, 109]]) put('coil', x, y, 0);
    for (let y = 91; y <= 111; y++) put('wall', 113, y, 0);
    g.run.startFight();
    for (let i = 0; i < 3 * 30; i++) g.run.update(1 / 30);
    w.enemies.length = 0;
    ['crawler-1', 'crawler-2', 'crawler-1', 'spider-1', 'crawler-1', 'crawler-1', 'spider-2', 'crawler-2'].forEach((k, i) => spawn(k, 111.5 + (i % 3) * 1.4, 95 + i * 1.8, 1500));
    const hit = runUntil(() => w.arcs.length >= 2, 12);
    look(105, 101, 50); freeze(); await sleep(300); return 'arcs at ' + hit;`,

  '5-robots': START + `
    g.run.level = 6;
    const f1 = put('robotfab', 92, 93, 0), f2 = put('robotfab', 92, 106, 0);
    const mk = (type, x, y, f) => w.soldiers.push({ id: w.nextSoldierId++, type, x, y, hp: 900, maxHp: 900, cool: 0, face: 1, fab: f.id });
    mk('titan', 106, 100, f1); mk('heavy', 104, 96, f1); mk('heavy', 104, 104, f2); mk('quad', 107.5, 95, f1); mk('quad', 107.5, 105, f2);
    mk('trooper', 103, 99, f1); mk('trooper', 103, 101.5, f2); mk('trooper', 105, 92, f1); mk('artillery', 101, 94, f1); mk('scout', 105, 107, f2);
    g.run.startFight();
    for (let i = 0; i < 3 * 30; i++) g.run.update(1 / 30);
    w.enemies.length = 0;
    ['crawler-1', 'crawler-2', 'spider-1', 'crawler-1', 'brute-2', 'crawler-1', 'spider-2', 'crawler-2', 'crawler-1'].forEach((k, i) => spawn(k, 114 + (i % 3) * 1.5, 94 + i * 1.5, 2500));
    const hit = runUntil(() => w.shots.length >= 4, 12, () => { for (const s of w.soldiers) s.hp = s.maxHp; });
    look(107, 100, 50); freeze(); await sleep(300); return 'shots ' + w.shots.length + ' at ' + hit;`,

  '6-expand': START.replace("for (const id of [17, 23, 25, 31, 16, 18, 30, 32]) w.openPlot(id);", "w.openPlot(23);") + FACTORY + `
    g.run.level = 3; w.kills = 87;
    for (const [x, y] of [[105, 96], [105, 103]]) loadTurret(put('turret', x, y, 0));
    for (let i = 0; i < 40 * 30; i++) w.step(1 / 30);
    g.run.startFight();
    w.enemies.length = 0; g.run.spawned = g.run.toSpawn();
    for (let i = 0; i < 10; i++) g.run.update(1 / 30);
    await sleep(2500);`,

  'tunnel-check': START + `
    // a belt line under a wall: belts - entrance - walls - exit - belts - Core
    for (let x = 88; x <= 94; x++) put('belt', x, 100, 0);
    put('tunnel', 95, 100, 0);
    for (const x of [96, 97]) for (let y = 97; y <= 103; y++) put('wall', x, y, 0);
    put('tunnel', 98, 100, 0);
    for (let x = 88; x <= 94; x++) w.entityAt(x, 100).items.push({ type: 'iron-plate', pos: (x % 3) * 0.3, j: 0 });
    for (let i = 0; i < 6 * 30; i++) { if (i % 14 === 0) { const b = w.entityAt(88, 100); if (b.items.every((it) => it.pos > 0.4)) b.items.push({ type: 'iron-plate', pos: 0, j: 0 }); } w.step(1 / 30); }
    look(94, 100.5, 90); await sleep(300);`,

  'chain-check': START + `
    g.run.level = 6; w.research['robot-designs'] = 5;
    const bs = [put('robotfab', 92, 93, 0), put('hangar', 96, 93, 0), put('foundry', 92, 106, 0), put('heavyworks', 96, 106, 0)];
    bs[0].type = 'scout'; bs[1].type = 'bomber'; bs[2].type = 'quad'; bs[3].type = 'carrier';
    for (const b of bs) b.inv = { 'iron-plate': 30, 'copper-plate': 12, 'tin-plate': 6, 'lead-plate': 4 };
    const mk = (type, x, y, f) => w.soldiers.push({ id: w.nextSoldierId++, type, x, y, hp: 900, maxHp: 900, cool: 0, face: 1, fab: f ? f.id : undefined });
    mk('carrier', 104, 99.5, bs[3]); mk('bomber', 108, 96, bs[1]); mk('bomber', 108, 103, bs[1]); mk('titan', 106, 101, bs[3]);
    g.run.startFight();
    for (let i = 0; i < 4 * 30; i++) g.run.update(1 / 30);
    look(98, 99.5, 52); freeze(); await sleep(200);
    await sleep(300);`,

  'bomber-check': START + `
    g.run.level = 6; w.research['robot-designs'] = 5;
    const mk = (type, x, y) => w.soldiers.push({ id: w.nextSoldierId++, type, x, y, hp: 900, maxHp: 900, cool: 0, face: 1, angle: 0 });
    mk('bomber', 99, 95); mk('bomber', 103, 97); mk('drone-2', 101, 93); mk('carrier', 100, 103); mk('titan', 106, 100);
    for (const s of w.soldiers) s.moving = false;
    look(102, 99, 70); freeze(); await sleep(300);`,

  'workshop-check': `
    localStorage.setItem('cinder-automata.prestige.v1', JSON.stringify({ earned: 140, levels: { dmg: 3, core: 2, plating: 1, survey: 0 } }));
    document.getElementById('workshop-btn').click(); await new Promise((r) => setTimeout(r, 400));`,

  'weapons-check': START + `
    g.run.level = 6; for (const k of ['turret-designs', 'flame-designs']) w.research[k] = 3; w.research['coil-designs'] = 2;
    const mk = (kind, x, y, variant, ammo) => { const t = put(kind, x, y, 0); if (variant) t.variant = variant; if (ammo) { t.ammo = 80; t.dmg = ammo; } return t; };
    mk('turret', 104, 94, 'artillery', 70); mk('flamer', 104, 99, 'flamer', 6); mk('flamer', 104, 103, 'torch', 8); mk('flamer', 100, 107, 'plasma', 8); mk('turret', 100, 92, 'scatter', 8);
    const c1 = put('coil', 96, 92, 0); c1.variant = 'shield'; c1.charge = 200; const c2 = put('coil', 96, 96, 0); c2.variant = 'stun'; c2.charge = 200; const c3 = put('coil', 96, 104, 0); c3.variant = 'railgun'; c3.charge = 200;
    put('generator', 91, 99, 0).fuelSecs = 300; for (const [x, y] of [[94, 95], [94, 101], [98, 99]]) put('pole', x, y, 0);
    for (let y = 91; y <= 109; y++) put('wall', 110, y, 0);
    g.run.startFight(); for (let i = 0; i < 2 * 30; i++) g.run.update(1 / 30); w.enemies.length = 0;
    ['crawler-1', 'crawler-2', 'spider-1', 'brute-2', 'crawler-1', 'acid-1', 'crawler-1', 'crawler-2', 'spider-2', 'crawler-1', 'drone-1', 'crawler-1'].forEach((k, i) => spawn(k, 108.5 + (i % 4) * 1.3, 95 + i * 1.1, 4000));
    for (let i = 0; i < 2.5 * 30; i++) { g.run.update(1 / 30); for (const e of w.entities.values()) if (e.kind === 'turret' || e.kind === 'flamer') e.ammo = 80; }
    look(103, 100, 52); freeze(); await sleep(250);
    await sleep(300);`,

  '7-research-extra': START + FACTORY + `
    for (const k of ['science-projectile', 'science-em', 'science-robotics']) w.stock[k] = 24;
    w.research['proj-damage'] = 2; w.research['turret-designs'] = 1;
    for (let i = 0; i < 40 * 30; i++) w.step(1 / 30);
    look(99, 101, 46);
    g.research.toggle(); await sleep(500);`,
};
