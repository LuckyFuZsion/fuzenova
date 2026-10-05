// Lists every planned object that has no sliced sprite yet: node tools/missing-sprites.mjs [tier]
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { SHEETS } from './sheet-plan.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const manifest = JSON.parse(readFileSync(join(root, 'public', 'sprites', 'manifest.json'), 'utf8'));
const tier = process.argv[2] ? Number(process.argv[2]) : null;

let missing = 0;
for (const s of SHEETS) {
  if (s.tier === 0 || (tier !== null && s.tier !== tier)) continue;
  const gone = s.items.map((i) => i[0]).filter((n) => !manifest[n]);
  const generated = existsSync(join(root, 'art', 'raw')) && s.done;
  if (gone.length) {
    missing += gone.length;
    console.log(`Sheet ${s.id} (${s.title}, tier ${s.tier})${generated ? ' - generated but incomplete' : ' - not generated yet'}: ${gone.join(', ')}`);
  }
}
console.log(missing ? `\n${missing} object(s) missing` : 'nothing missing');
