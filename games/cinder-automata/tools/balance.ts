// Balance harness: a ring of N turrets with unlimited ammo defends the core at a given level. Prints how it goes.
// Run: npx tsx tools/balance.ts
import { Run } from '../src/sim/round';
import { World } from '../src/sim/world';
import { researchFx } from '../src/sim/research';

// pass "r" as the second argument to give the defence the research a typical player would have by then
const WITH_RESEARCH = process.argv[3] === 'r';

function trial(level: number, n: number) {
  const w = new World(100, 100);
  if (WITH_RESEARCH) { const rl = Math.min(5, Math.floor(level / 3.5)); w.research = { 'proj-damage': rl, 'proj-rate': rl }; w.rfx = researchFx(w); }
  w.place('core', 48, 48, 0);
  const cx = 50, cy = 50;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, r = n > 8 ? 4 + (i % 2) * 3.5 : 5.5;
    w.place('turret', Math.round(cx + Math.cos(a) * r) - 1, Math.round(cy + Math.sin(a) * r) - 1, 0);
  }
  const start = [...w.entities.values()].filter((e) => e.kind === 'turret').length;
  const run = new Run(w, { buildSeconds: 0 });
  run.level = level;
  run.startFight();
  for (let i = 0; i < 700 * 30 && run.phase === 'fight'; i++) {
    for (const e of w.entities.values()) if (e.kind === 'turret') e.ammo = 40;
    run.update(1 / 30);
  }
  const lost = start - [...w.entities.values()].filter((e) => e.kind === 'turret').length;
  return { win: run.phase === 'won', core: Math.round((w.core!.hp / w.core!.maxHp) * 100), lost, placed: start };
}

const levels = process.argv[2] ? process.argv[2].split(',').map(Number) : [1, 2, 3, 5, 8, 10, 12, 15, 18, 20, 25, 30];
console.log('level | fewest ring turrets (unlimited ammo) that win with the core above half health and at most a third of turrets lost');
for (const L of levels) {
  let n = 1, r = trial(L, n);
  const ok = (x: ReturnType<typeof trial>) => x.win && x.core >= 50 && x.lost <= Math.max(1, x.placed / 3);
  while (!ok(r) && n < 60) { n++; r = trial(L, n); }
  console.log(String(L).padStart(5) + ` | ${n}${n >= 60 ? '+' : ''} turrets (core ${r.core}%, lost ${r.lost})   target ~${Math.round(1 + 0.75 * L)}`);
}
