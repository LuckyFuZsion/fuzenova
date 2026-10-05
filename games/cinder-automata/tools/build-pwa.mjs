// Runs after `vite build`: writes the service worker into the built game with a version number that changes whenever the
// game's files change, so installed copies update themselves. Usage: node tools/build-pwa.mjs
import { readdirSync, statSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { join, relative, sep } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = join(root, '..', '..', 'public', 'play', 'cinder-automata');

const walk = (d) => readdirSync(d).flatMap((n) => {
  const p = join(d, n);
  return statSync(p).isDirectory() ? walk(p) : [p];
});
const files = walk(dist).map((p) => relative(dist, p).split(sep).join('/')).filter((f) => f !== 'sw.js');

// the "shell": everything needed to open the game. Sprites are cached as they are first used (the game loads the
// ones it needs at startup), so one visit is enough to play offline afterwards.
const isShell = (f) => f === 'index.html' || f === 'manifest.webmanifest' || f.startsWith('assets/') || f.startsWith('icons/')
  || f.startsWith('fuzenova-intro/') || f === 'sprites/manifest.json';
const shell = ['./', ...files.filter(isShell)];

const hash = createHash('sha1');
for (const f of files.sort()) hash.update(f + statSync(join(dist, f)).size);
const version = hash.digest('hex').slice(0, 10);

const sw = readFileSync(join(root, 'tools', 'sw-template.js'), 'utf8')
  .replace('__VERSION__', version)
  .replace('__SHELL__', JSON.stringify(shell));
writeFileSync(join(dist, 'sw.js'), sw);
console.log(`service worker written: version ${version}, ${shell.length} files precached, ${files.length} in the build`);
