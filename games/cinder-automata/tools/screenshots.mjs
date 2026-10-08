// Takes marketing screenshots of the game in headless Edge/Chrome (full resolution), by driving the dev server over the DevTools protocol.
// Usage: start the dev server (npx vite --port 5177), then `node tools/screenshots.mjs [scene names]`. Scenes live in tools/screenshot-scenes.mjs.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { SCENES } from './screenshot-scenes.mjs';

const W = 1600, H = 900, PORT = 9333, URL = process.env.GAME_URL || 'http://localhost:5177/?nologin=1&seed=4242';
const OUT = path.resolve('art/screenshots');
mkdirSync(OUT, { recursive: true });
const browsers = ['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe', 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'];
const exe = browsers.find(existsSync);
if (!exe) throw new Error('No Edge or Chrome found');
const profile = path.join(tmpdir(), 'cinder-shots-' + Date.now());
const proc = spawn(exe, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, `--window-size=${W},${H}`, '--hide-scrollbars', '--mute-audio', '--no-first-run', '--autoplay-policy=no-user-gesture-required', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function target() {
  for (let i = 0; i < 60; i++) {
    try { const l = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); const t = l.find((x) => x.type === 'page'); if (t) return t.webSocketDebuggerUrl; } catch { /* not up yet */ }
    await sleep(250);
  }
  throw new Error('browser did not start');
}
try {
  const ws = new WebSocket(await target());
  await new Promise((r) => ws.addEventListener('open', r));
  let id = 0; const pending = new Map();
  ws.addEventListener('message', (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } });
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, (d) => (d.error ? rej(new Error(JSON.stringify(d.error))) : res(d.result))); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  const evalIn = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };
  const wanted = process.argv.slice(2);
  for (const [name, setup] of Object.entries(SCENES)) {
    if (wanted.length && !wanted.includes(name)) continue;
    await send('Page.navigate', { url: URL });
    await sleep(2500);
    try { const v = await evalIn(`(async () => { ${setup}
})()`); if (v !== undefined && v !== null) console.log(name, '->', v); } catch (e) { console.log(name, 'setup problem:', e.message); }
    await sleep(900);
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    const file = path.join(OUT, `cinder-automata-${name}.png`);
    writeFileSync(file, Buffer.from(shot.data, 'base64'));
    console.log('saved', file);
  }
  ws.close();
} finally {
  proc.kill();
  await sleep(500);
  try { rmSync(profile, { recursive: true, force: true }); } catch { /* temp folder: fine */ }
}
