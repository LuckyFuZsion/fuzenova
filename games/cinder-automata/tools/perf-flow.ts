import { stepCombat } from '../src/sim/combat';
import { World } from '../src/sim/world';
const w = new World(200, 200);
w.place('core', 99, 99, 0);
for (let i = 0; i < 40; i++) w.place('wall', 80 + i, 80, 0);
for (let i = 0; i < 200; i++) w.enemies.push({ id: i + 1, x: 20 + (i % 20) * 3, y: 20 + Math.floor(i / 20) * 2, hp: 1e6, maxHp: 1e6, speed: 2, dmg: 0, born: 0, kind: 'crawler-1' });
const t0 = performance.now();
const N = 600;
for (let i = 0; i < N; i++) { w.time += 1 / 60; stepCombat(w, 1 / 60); if (i % 30 === 0) w.layoutVersion++; }
const ms = (performance.now() - t0) / N;
console.log(`200 enemies: ${ms.toFixed(2)} ms per step (budget at 60 Hz: 16.7 ms)`);
