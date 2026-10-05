import { generateWorld } from '../src/sim/mapgen';
import { CORE_PLOT_ID, plotRect } from '../src/sim/plots';
for (const seed of [5, 77, 4242, 31337, 999, 2024]) {
  const w = generateWorld(seed), r = plotRect(CORE_PLOT_ID);
  let tiles = 0, total = 0;
  for (let y = r.y0; y < r.y1; y++) for (let x = r.x0; x < r.x1; x++) { const i = y * w.w + x; if (w.ore[i] === 1) { tiles++; total += w.oreLeft[i]; } }
  console.log(seed, 'start iron tiles', tiles, 'ore units', total);
}
