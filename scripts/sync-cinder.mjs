// Keeps this repo's copy of Cinder Automata identical to the real project.
//
// The game is made in  ../luckyfuzsion/games/cinder-automata  (source) and built to
// ../luckyfuzsion/public/play/cinder-automata  (build). This repo keeps a copy of both:
//   games/cinder-automata          <- the source, mirrored exactly
//   public/play/cinder-automata    <- the build, mirrored exactly, with the page addresses switched to fuzenova.dev
//
// Run it after building the game:   npm run sync:cinder
// It only ever copies FROM the luckyfuzsion project INTO this repo. Windows only (uses robocopy).
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const repo = path.resolve(here, '..')
const origin = path.resolve(repo, process.env.CINDER_ORIGIN ?? '../luckyfuzsion')

const srcFrom = path.join(origin, 'games/cinder-automata')
const srcTo = path.join(repo, 'games/cinder-automata')
const buildFrom = path.join(origin, 'public/play/cinder-automata')
const buildTo = path.join(repo, 'public/play/cinder-automata')

for (const p of [srcFrom, buildFrom]) {
  if (!existsSync(p)) {
    console.error(`Cannot find ${p}. Set CINDER_ORIGIN to the folder that holds games/ and public/play/.`)
    process.exit(2)
  }
}

// robocopy exit codes 0-7 mean success (1 = files were copied); 8 or more means something failed.
function mirror(from, to, excludeFiles = []) {
  const args = [from, to, '/MIR', '/NJH', '/NJS', '/NP', '/NDL', '/NC', '/XD', 'node_modules', 'release', 'dist', '.claude', '.cursor', '.git']
  if (excludeFiles.length) args.push('/XF', ...excludeFiles)
  const r = spawnSync('robocopy', args, { encoding: 'utf8' })
  if ((r.status ?? 16) >= 8) throw new Error(`Copy failed (${from}):\n${r.stdout}`)
}

mirror(srcFrom, srcTo)
console.log('source mirrored:', srcTo)

// The built page's own web addresses must stay on fuzenova.dev, so index.html is written separately.
// Line endings are normalised to LF, which is how this repo stores it, so syncing does not create noisy changes.
mirror(buildFrom, buildTo, ['index.html'])
const page = readFileSync(path.join(buildFrom, 'index.html'), 'utf8').replaceAll('https://www.luckyfuzsion.com', 'https://fuzenova.dev').replaceAll('\r\n', '\n')
writeFileSync(path.join(buildTo, 'index.html'), page)
console.log('build mirrored:', buildTo)
