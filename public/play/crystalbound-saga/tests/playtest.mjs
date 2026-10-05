// Playtest: a greedy "decent player" bot that checks whether levels are winnable.
// For each level it sets the Forge to the chapter's cap (where a progressing player would be), then every move:
// casts a ready Guardian Art, otherwise tries every legal swap and plays the one with the best value
// (weakness damage, bigger matches, special tiles, clearing Miasma on shield levels, digging under relics).
// No items are used, so it's slightly harder than real play.
// Usage: node tests/playtest.mjs [difficulty] [level numbers...]   e.g. node tests/playtest.mjs hero 1 5 30
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
let js = readFileSync(join(here, '..', 'index.html'), 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
const hook = "Music.want = 'title';";
js = js.replace(hook, "globalThis.__p={skip:()=>{ldSkip&&ldSkip();discNav&&discNav();storyNav&&storyNav.skip();},start:i=>startLevel(i),swap:(...a)=>trySwap(...a),art:k=>castArt(k)," +
  "st:()=>({busy,ended,movesLeft,foe,foes,board,heroHp,gauges,fighters,level,miasma}),groups:()=>findGroups(),sw:(...a)=>swapTiles(...a),ok:t=>swappable(t),wm:(a,b)=>weakMult(a,b)," +
  "S:()=>S,L:()=>LEVELS,cap:c=>({t:FORGE_CAP.temper(c),r:FORGE_CAP.resolve(c),a:FORGE_CAP.affinity(c)}),GMAX:GAUGE_MAX,quest:()=>quest,spf:g=>specialFor(g)};" + hook);

// FAST=n runs the game's clock n times faster (timers, Date.now, performance.now), so animations don't cost real time.
const FAST = +process.env.FAST || 1, realNow = Date.now;
if (FAST > 1) {
  const rs = setTimeout, rn = Date.now, t0 = rn();
  globalThis.setTimeout = (f, ms, ...a) => rs(f, (ms || 0) / FAST, ...a);
  Date.now = () => t0 + (rn() - t0) * FAST;
  Object.defineProperty(globalThis, 'performance', { value: { now: () => (rn() - t0) * FAST }, configurable: true, writable: true });
}
const noop = () => {};
const ctx = new Proxy({}, { get: (t, k) => (k === 'createRadialGradient' || k === 'createLinearGradient') ? () => ({ addColorStop: noop }) : k === 'measureText' ? () => ({ width: 10 }) : (t[k] ?? noop), set: (t, k, v) => { t[k] = v; return true; } });
const el = () => ({ style: { setProperty: noop }, classList: { add: noop, remove: noop, toggle: noop, contains: () => false }, innerHTML: '', textContent: '', dataset: {},
  appendChild: noop, remove: noop, setAttribute: noop, querySelector: () => el(), querySelectorAll: () => [], addEventListener: noop, setPointerCapture: noop,
  getContext: () => ctx, getBoundingClientRect: () => ({ left: 0, top: 0, width: 400, height: 400 }), clientWidth: 400, clientHeight: 400, focus: noop, scrollIntoView: noop, offsetWidth: 1 });
const els = {};
Object.assign(globalThis, {
  window: globalThis, innerWidth: 400, innerHeight: 800, devicePixelRatio: 1, addEventListener: noop, matchMedia: () => ({ matches: false }),
  localStorage: { getItem: () => null, setItem: noop },
  requestAnimationFrame: f => setTimeout(() => f(Date.now()), 4),
  btoa: s => Buffer.from(s, 'binary').toString('base64'), atob: s => Buffer.from(s, 'base64').toString('binary'),
  document: { getElementById: id => els[id] || (els[id] = el()), querySelectorAll: () => [], querySelector: () => el(), createElement: () => el(),
    addEventListener: noop, body: { appendChild: noop, classList: { toggle: noop, add: noop, remove: noop, contains: () => false } }, activeElement: null, head: { appendChild: noop } },
});
Object.defineProperty(globalThis, 'navigator', { value: { getGamepads: () => [] }, configurable: true, writable: true });
(0, eval)(js);
const T = globalThis.__p, L = T.L();
setInterval(() => T.skip(), 120);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const args = process.argv.slice(2), diff = ['story', 'hero', 'legend'].includes(args[0]) ? args.shift() : 'hero';
const list = args.map(Number).filter(n => n > 0);
const ROWS = 8, COLS = 8;

function bestMove() {
  const s = T.st(), b = s.board, foe = s.foe, lv = s.level, relicCols = new Set();
  if (lv.relics) b.forEach(row => row.forEach((t, c) => { if (t && t.relic) relicCols.add(c); }));
  let best = null, bestV = -1;
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) for (const [dr, dc] of [[0, 1], [1, 0]]) {
    const r2 = r + dr, c2 = c + dc; if (r2 >= ROWS || c2 >= COLS) continue;
    const a = b[r][c], d = b[r2][c2]; if (!T.ok(a) || !T.ok(d)) continue;
    let v = 0;
    if ((a.sp && d.sp) || a.sp === 'orb' || d.sp === 'orb') v = 60 + (T.quest() && !T.quest().done && T.quest().type === 'combo' && a.sp && d.sp ? 100 : 0);
    else {
      T.sw(r, c, r2, c2); const gs = T.groups(); T.sw(r, c, r2, c2);
      if (!gs.length) continue;
      const q = T.quest();
      for (const g of gs) {
        const n = g.cells.length, m = foe ? T.wm(g.el, foe.el) : 1;
        // chase the side quest like a real player would
        if (q && !q.done) { if (T.spf(g) === q.type) v += 80; if (q.type === 'clear' && g.el === q.el) v += n * 6; if (q.type === 'cascade') v += g.cells[0][0] * 1.5; }
        v += n * 3 * m + (n >= 5 ? 30 : n === 4 ? 12 : 0) + (g.hasH && g.hasV ? 14 : 0);
        for (const [gr, gc] of g.cells) {
          const t = b[gr][gc]; if (t && t.sp) v += 18;
          if (s.miasma && s.miasma[gr] && s.miasma[gr][gc]) v += foe && foe.mech === 'shield' ? 10 : 4;
          if (relicCols.has(gc)) v += 3 + gr;       // dig under relics
          v += gr * 0.4;                            // lower matches cause more cascades
        }
      }
    }
    if (v > bestV) { bestV = v; best = [r, c, r2, c2]; }
  }
  return best;
}

if (process.env.ADDS) { console.log(L.map((l, i) => l.adds && l.adds.length ? (i + 1) + (l.quest ? "q" : "") + (l.adds.length > 1 ? "x3" : "") : null).filter(Boolean).join(" ")); process.exit(0); }
if (process.env.DUMP) { for (const n of list) { const lv = L[n - 1]; console.log(n, JSON.stringify({ moves: lv.moves, mech: lv.mech, foe: lv.foe, foes: lv.foes, chains: (lv.chains || []).length, miasma: (lv.miasma || []).length, wards: (lv.wards || []).length, relics: (lv.relics || []).length, quest: lv.quest, b: lv.b })); } process.exit(0); }
const results = [];
for (const n of list) {
  const i = n - 1, lv = L[i], c = lv.b, cap = T.cap(c), S = T.S();
  Object.assign(S, { unlocked: i, starlight: 9, artSpot: 99, difficulty: diff, fails: {} }); // fails reset: test the raw level, no Helping Hand
  S.forge.temper = cap.t; S.forge.resolve = cap.r; S.forge.affinity = [0, 1, 2, 3, 4].map(() => cap.a);
  if (process.env.NOQUEST) lv.quest = null; // compare a level with and without its side quest
  T.start(i); await sleep(300);
  let moves = 0; const t0 = realNow();
  while (realNow() - t0 < 240000) {   // real-time safety limit per level
    const s = T.st(); if (s.ended) break;
    if (s.busy) { await sleep(25); continue; }
    const k = s.gauges.findIndex((g, j) => j < s.fighters.length && g >= T.GMAX);
    if (k >= 0) { await T.art(k); continue; }
    const m = bestMove(); if (!m) { await sleep(50); continue; }
    await T.swap(...m); moves++;
  }
  const s = T.st(), won = s.foes.every(f => f.hp <= 0), hp = s.foes.reduce((a, f) => a + Math.max(0, f.hp), 0), max = s.foes.reduce((a, f) => a + f.max, 0);
  const kind = lv.chapterBoss ? 'BOSS' : lv.mini ? 'mini' : '', q = T.quest();
  let spLeft = 0; s.board.forEach(row => row.forEach(t => { if (t && t.sp) spLeft++; })); // the Heartstone Finale should leave none after a win
  const line = `L${String(n).padStart(3)} ${kind.padEnd(4)} ${won ? 'WIN ' : 'LOSS'} moves ${moves}/${lv.moves + S.forge.resolve} hearts ${s.heroHp} foeHP ${Math.round(hp / max * 100)}% left${!won && s.heroHp <= 0 ? ' (Ward broke)' : ''}${won ? ` specials left ${spLeft}` : ''}${q ? ` | QUEST ${q.type} ${Math.min(q.have, q.need)}/${q.need} ${q.done ? 'DONE' : 'NOT DONE'}` : ''}`;
  console.log(line); results.push({ n, won, kind, q: q ? q.done : null });
}
const w = results.filter(r => r.won).length;
const qs = results.filter(r => r.q !== null);
console.log(`SUMMARY ${diff}: ${w}/${results.length} won; quests completed ${qs.filter(r => r.q).length}/${qs.length}`);
process.exit(0);
