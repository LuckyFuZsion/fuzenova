// Prints the map round the core as text, to judge the terrain at a glance. Usage: npx tsx tools/ascii-map.ts [halfSize]
import { generateWorld } from '../src/sim/mapgen';
const w = generateWorld();
const half = Number(process.argv[2] ?? 26);
const cx = 80, cy = 92;
const ORE = ' IcCtlsf'; // 1 iron, 2 copper, 3 coal, 4 tin, 5 lead, 6 sulfur, 7 forest (forest shows f)
const lines: string[] = [];
for (let y = cy - half; y < cy + half; y++) {
  let s = '';
  for (let x = cx - half; x < cx + half; x++) {
    const t = w.terrain[y * w.w + x], o = w.ore[y * w.w + x];
    if (Math.abs(x - cx) <= 1 && Math.abs(y - cy) <= 1) s += '@';
    else if (t === 1) s += '#'; else if (t === 2) s += 'T'; else if (t === 3) s += '~';
    else s += o ? 'iCclsf'[o - 1] ?? '.' : '.';
  }
  lines.push(s);
}
console.log(lines.join('\n'));
let n = 0; for (let y = cy - half; y < cy + half; y++) for (let x = cx - half; x < cx + half; x++) if (w.terrain[y * w.w + x]) n++;
console.log(`\n${n} obstacle tiles in the ${half * 2}x${half * 2} start area (${Math.round(n / (half * half * 4) * 100)}%)`);
