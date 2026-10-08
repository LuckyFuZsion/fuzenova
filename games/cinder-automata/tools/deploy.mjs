// One command to build the game once and publish it to BOTH sites:
//   luckyfuzsion  (repo: ../..                              -> public/play/cinder-automata)
//   fuzenova      (repo: ../../../fuze-nova-games-website-build -> public/play/cinder-automata)
//
//   node tools/deploy.mjs            checks, builds, copies to both sites and shows what would be committed (nothing is committed or pushed)
//   node tools/deploy.mjs --push     the same, then commits ONLY the game folder in each repo and pushes both
//
// Only public/play/cinder-automata is ever added in either repo, so other uncommitted work in them is left alone.
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const game = resolve(here, '..');
const REL = 'public/play/cinder-automata';
const SITES = [
  { name: 'luckyfuzsion', repo: resolve(game, '..', '..'), url: 'https://www.luckyfuzsion.com', build: true },
  { name: 'fuzenova', repo: resolve(game, '..', '..', '..', 'fuze-nova-games-website-build'), url: 'https://fuzenova.dev', build: false },
];
const push = process.argv.includes('--push');

const run = (cmd, args, cwd = game, quiet = false) => {
  const r = spawnSync(cmd, args, { cwd, encoding: 'utf8', shell: process.platform === 'win32' && (cmd === 'npx' || cmd === 'npm'), stdio: quiet ? 'pipe' : 'inherit' });
  if (r.status !== 0) { console.error(`\nFAILED: ${cmd} ${args.join(' ')}`); if (quiet) console.error(r.stderr || r.stdout); process.exit(1); }
  return (r.stdout || '').trim();
};

for (const s of SITES) if (!existsSync(s.repo)) { console.error(`Cannot find the ${s.name} site at ${s.repo}`); process.exit(1); }

console.log('1/4 checks and build');
run('npx', ['tsc', '--noEmit']);
run('npx', ['vitest', 'run']);
run('node', ['tools/build-sound-manifest.mjs']);
run('npx', ['vite', 'build']);
run('node', ['tools/build-pwa.mjs']);
const built = join(SITES[0].repo, REL);
for (const dev of ['audio/original', 'audio/alt', 'sound-test.html']) rmSync(join(built, dev), { recursive: true, force: true }); // dev-only files never ship
const script = readFileSync(join(built, 'index.html'), 'utf8').match(/assets\/index-[A-Za-z0-9_-]+\.js/)?.[0];
console.log(`   built ${script}`);

console.log('2/4 copying to the other site(s)');
for (const s of SITES.slice(1)) {
  const dest = join(s.repo, REL);
  rmSync(dest, { recursive: true, force: true });
  cpSync(built, dest, { recursive: true });
  // the page addresses (share card, canonical link) should name the site the copy lives on
  const idx = join(dest, 'index.html');
  writeFileSync(idx, readFileSync(idx, 'utf8').split(SITES[0].url).join(s.url));
  console.log(`   ${s.name}: copied (addresses point at ${s.url})`);
}

console.log('3/4 what changed');
for (const s of SITES) {
  const changed = run('git', ['status', '--short', '--', REL], s.repo, true).split('\n').filter(Boolean).length;
  console.log(`   ${s.name}: ${changed} file(s) changed in ${REL}`);
}

if (!push) { console.log('\nDry run: nothing committed or pushed. Run again with --push to publish to both sites.'); process.exit(0); }

console.log('4/4 commit and push');
const msg = process.argv.find((a) => a.startsWith('--message='))?.slice(10) || `Cinder Automata: new build (${script})`;
for (const s of SITES) {
  run('git', ['add', '--', REL], s.repo, true);
  const staged = run('git', ['diff', '--cached', '--name-only', '--', REL], s.repo, true);
  if (!staged) { console.log(`   ${s.name}: already up to date`); continue; }
  run('git', ['commit', '-m', msg, '-m', 'Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>', '--', REL], s.repo, true); // pathspec: only the game folder is committed
  run('git', ['push', 'origin', 'HEAD:main'], s.repo, true);
  console.log(`   ${s.name}: pushed`);
}
console.log('\nBoth sites are deployed (Vercel takes about a minute).');
