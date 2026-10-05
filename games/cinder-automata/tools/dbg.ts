import { Run } from '../src/sim/round';
import { World } from '../src/sim/world';
const w = new World(100, 100);
w.place('core', 48, 48, 0);
const n = 24;
for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, r = 4 + (i % 2) * 3.5; w.place('turret', Math.round(50 + Math.cos(a) * r) - 1, Math.round(50 + Math.sin(a) * r) - 1, 0); }
const run = new Run(w, { buildSeconds: 0 }); run.level = 20; run.startFight();
for (let i = 0; i < 700 * 30 && run.phase === 'fight'; i++) {
  for (const e of w.entities.values()) if (e.kind === 'turret') e.ammo = 40;
  run.update(1 / 30);
  if (i % 300 === 0) { const b = w.enemies.find((e) => e.id === run.bossId); console.log((i / 30).toFixed(0), 'enemies', w.enemies.length, 'turrets', [...w.entities.values()].filter((e) => e.kind === 'turret').length, 'core', Math.round(w.core!.hp), b ? `boss hp ${Math.round(b.hp)}/${Math.round(b.maxHp)} at ${b.x.toFixed(0)},${b.y.toFixed(0)}` : 'no boss'); }
}
console.log(run.phase, 'timer', run.timer.toFixed(0));
