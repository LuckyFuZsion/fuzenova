// Prints an HTML file to PDF with Edge (or Chrome) in headless mode: node tools/print-html.mjs in.html out.pdf
import { spawnSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [input, output] = process.argv.slice(2);
if (!input || !output) { console.error('usage: node tools/print-html.mjs in.html out.pdf'); process.exit(1); }
const browsers = ['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe', 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'];
const browser = browsers.find(existsSync);
if (!browser) { console.error('No Edge or Chrome found'); process.exit(1); }
const pdf = resolve(output);
const res = spawnSync(browser, [
  '--headless=new', '--disable-gpu', '--no-sandbox', `--user-data-dir=${join(tmpdir(), `print-${Date.now()}`)}`, '--no-pdf-header-footer', '--print-to-pdf-no-header',
  `--print-to-pdf=${pdf}`, '--virtual-time-budget=20000', pathToFileURL(resolve(input)).href,
], { encoding: 'utf8', timeout: 120000 });
// the browser can hand the job to a process that is already running and return at once, so wait for the file to appear and stop growing
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let last = -1;
for (let i = 0; i < 80; i++) {
  if (existsSync(pdf)) { const size = statSync(pdf).size; if (size > 0 && size === last) break; last = size; }
  await sleep(500);
}
if (!existsSync(pdf)) { console.error('PDF was not created', res.status, res.stderr); process.exit(1); }
console.log(`PDF written: ${pdf} (${Math.round(statSync(pdf).size / 1024)} KB)`);
