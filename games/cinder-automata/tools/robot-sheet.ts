// Prints the robot stat sheet: what each building makes, and what a full building fields. Usage: npx tsx tools/robot-sheet.ts
import { FAB_CAPACITY, FAB_KINDS, FAB_ROBOTS, ROBOTS, ROBOT_SPACE, plateText } from '../src/sim/robots';
import { KINDS } from '../src/sim/world';
import { COSTS } from '../src/sim/costs';
import { ROBOT_UNLOCK } from '../src/sim/research';

const pad = (s: string | number, n: number) => String(s).padEnd(n);
const num = (s: string | number, n: number) => String(s).padStart(n);
for (const k of FAB_KINDS) {
  console.log(`\n## ${KINDS[k].name}  (building cost: ${Object.entries(COSTS[k]).map(([i, n]) => `${n} ${i.replace('-plate', '')}`).join(' + ')}; room ${FAB_CAPACITY})`);
  console.log(`${pad('Robot', 18)}${pad('Unlock', 8)}${num('Space', 6)}${num('Max', 5)}${num('Build s', 9)}${num('HP', 6)}${num('DPS', 6)}${num('Range', 7)}${num('Speed', 7)}${num('Full HP', 9)}${num('Full DPS', 10)}  Plates each`);
  for (const t of FAB_ROBOTS[k]) {
    const r = ROBOTS[t], max = Math.floor(FAB_CAPACITY / ROBOT_SPACE[t]);
    console.log(`${pad(r.name + (r.flying ? ' (fly)' : ''), 18)}${pad('RD ' + ROBOT_UNLOCK[t], 8)}${num(ROBOT_SPACE[t], 6)}${num(max, 5)}${num(r.buildTime, 9)}${num(r.hp, 6)}${num(r.dps + (r.alt?.dps ?? 0), 6)}${num(r.range, 7)}${num(r.speed, 7)}${num(max * r.hp, 9)}${num(Math.round(max * (r.dps + (r.alt?.dps ?? 0))), 10)}  ${plateText(r.cost)}`);
  }
}
