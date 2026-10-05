// Headless smoke test: runs the game's <script> in Node with minimal DOM stubs and lets a
// simple bot play a few levels. It checks for crashes and board integrity, not balance.
// Usage (from this folder or the site root):  node public/play/crystalbound/tests/smoke.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(here, '..', 'index.html'), 'utf8');
let js = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const hook = "Music.want = 'title';";
if (!js.includes(hook)) throw new Error('Boot hook not found; update tests/smoke.mjs');
js = js.replace(hook, "globalThis.__t={skipLoad:()=>{ldSkip&&ldSkip();discNav&&discNav();storyNav&&storyNav.skip();},startLevel:i=>startLevel(i),trySwap:(...a)=>trySwap(...a),st:()=>({busy,ended,movesLeft,foe,board}),findHint:()=>findHint(),S:()=>S,count:()=>LEVELS.length,best:()=>S.best,openRaid:()=>openRaid(),startVisit:()=>startRaidVisit(),raidAct:k=>raidAction(k),raidState:()=>({run:raidRun,raid:S.raid,titan:titanNow(),card:!!(document.getElementById('overlay').classList.contains&&0)}),closeCard:()=>closeCard()};" + hook);

const noop = () => {};
const ctx = new Proxy({}, { get: (t, k) => (k === 'createRadialGradient' || k === 'createLinearGradient') ? () => ({ addColorStop: noop }) : (t[k] ?? noop), set: (t, k, v) => { t[k] = v; return true; } });
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
    addEventListener: noop, body: { appendChild: noop, classList: { toggle: noop } }, activeElement: null },
});
Object.defineProperty(globalThis, 'navigator', { value: { getGamepads: () => [] }, configurable: true, writable: true });
// The offline manifest must match the files on disk (run: node tools/offline-manifest.mjs).
{ const { buildManifest } = await import('../tools/offline-manifest.mjs'), have = JSON.parse(readFileSync(join(here, '..', 'offline-manifest.json'), 'utf8'));
  const want = buildManifest(); if (want.version !== have.version) throw new Error('offline-manifest.json is out of date: run `node tools/offline-manifest.mjs`'); }
(0, eval)(js);
const T = globalThis.__t;
// Loading screens and Log Book cards wait for a tap; the bot taps them on a timer, including cards that open
// mid-turn while it is still awaiting its move.
setInterval(() => T.skipLoad(), 150);
console.log('levels:', T.count());
const sleep = ms => new Promise(r => setTimeout(r, ms));
const levels = process.argv.slice(2).map(Number).filter(n => !isNaN(n));
for (const lv of (levels.length ? levels : [0, 4, 30, 150, 299])) {
  T.S().starlight = 9;
  T.S().artSpot = 99; // the Art spotlight waits for a human tap, so the bot skips it
  T.startLevel(lv);
  await sleep(300);
  let steps = 0;
  const t0 = Date.now();
  while (steps < 60 && Date.now() - t0 < 90000) {
    const s = T.st(); if (s.ended) break;
    if (s.busy) { T.skipLoad(); await sleep(20); continue; } // the loading screen waits for a tap
    const h = T.findHint(); if (!h) break;
    await T.trySwap(h[0][0], h[0][1], h[1][0], h[1][1]); steps++;
  }
  const s = T.st();
  let nulls = 0; s.board.forEach(r => r.forEach(t => { if (!t) nulls++; }));
  console.log(`level ${lv + 1}: ${steps} moves played, ended=${s.ended}, foe HP ${Math.round(s.foe.hp)}/${s.foe.max}${nulls ? `, EMPTY CELLS ${nulls}` : ''}`);
}
console.log('best scores:', JSON.stringify(T.best()));
// Rift Raid: unlock it, play several visits with random actions and check the Titan's HP only goes down.
T.S().unlocked = 120; T.S().starlight = 9;
T.openRaid();
for (let v = 0; v < 4; v++) {
  T.S().raid.keys = 5; T.startVisit();
  let guard = 0;
  while (T.raidState().run && guard++ < 20) { const hp0 = T.raidState().raid.hp; await T.raidAct(['attack', 'heal', 'block', 'art'][Math.floor(Math.random() * 4)]); const st = T.raidState(); if (st.raid.hp != null && st.raid.hp > hp0) throw new Error('Titan HP went up'); }
  T.closeCard();
  const st = T.raidState();
  console.log(`raid visit ${v + 1}: titan=${st.titan.name} hp=${st.raid.hp}/${st.titan.max} dealt total=${st.raid.dealt} shards=${st.raid.shards}`);
}

console.log('smoke test finished');
process.exit(0);
