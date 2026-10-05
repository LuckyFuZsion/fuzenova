// Builds offline-manifest.json: every file the game needs, with its size and a short content hash.
// The game uses it to (1) download everything for offline play, (2) spot exactly which files changed after an
// update, so players who downloaded the game are asked to fetch just the new/changed files, and (3) drop stale
// copies from the cache for everyone else.
// Run after adding or replacing any asset:   node tools/offline-manifest.mjs
// (tests/smoke.mjs fails if the manifest is out of date.)
import { readdirSync, statSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
// Kept automatically on first visit (small: everything needed to play any level, minus big art and music).
export const CORE = ['index.html', 'manifest.webmanifest', 'firebase-config.js', 'assets/app/', 'assets/tiles/', 'assets/items/', 'assets/fx/',
  'assets/sfx/', 'assets/ranks/', 'assets/ui/', 'assets/wardblade/', 'assets/guardians/', 'assets/characters/', 'assets/raid/'];
// Everything else in the full offline download.
const FOLDERS = ['assets/app', 'assets/ui', 'assets/tiles', 'assets/items', 'assets/fx', 'assets/sfx', 'assets/ranks', 'assets/wardblade', 'assets/guardians',
  'assets/characters', 'assets/raid', 'assets/story', 'assets/bosses', 'assets/enemies', 'assets/backdrops', 'music'];
const FILES = ['index.html', 'manifest.webmanifest', 'firebase-config.js'];

const walk = d => readdirSync(join(ROOT, d), { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]);
export function buildManifest() {
  const paths = [...FILES, ...FOLDERS.flatMap(walk)].map(p => p.replace(/\\/g, '/')).sort();
  const files = paths.map(p => {
    const buf = readFileSync(join(ROOT, p));
    // The page and small scripts refresh themselves whenever the player is online (network-first), so they're
    // marked 'auto' instead of hashed: code changes never trigger an offline-update prompt or a stale manifest.
    return { p, s: buf.length, h: FILES.includes(p) ? 'auto' : createHash('md5').update(buf).digest('hex').slice(0, 10), core: CORE.some(c => c.endsWith('/') ? p.startsWith(c) : p === c) };
  });
  const version = createHash('md5').update(files.map(f => f.p + f.h).join('|')).digest('hex').slice(0, 12);
  return { version, files };
}
if (process.argv[1] && relative(process.argv[1], fileURLToPath(import.meta.url)) === '') {
  const m = buildManifest();
  writeFileSync(join(ROOT, 'offline-manifest.json'), JSON.stringify(m));
  const mb = n => (n / 1048576).toFixed(1);
  console.log(`offline-manifest.json: ${m.files.length} files, full ${mb(m.files.reduce((a, f) => a + f.s, 0))} MB, core ${mb(m.files.filter(f => f.core).reduce((a, f) => a + f.s, 0))} MB, version ${m.version}`);
}
