import { describe, expect, it } from 'vitest';
import { stepCombat } from './combat';
import { World } from './world';

function scene(kind: 'corridor' | 'pocket' | 'gap2') {
  const w = new World(100, 100);
  w.place('core', 48, 48, 0);
  const fab = w.place('robotfab', 38, 28, 0)!;
  // two rows of walls with a corridor between them, leading out to the north
  const gapW = kind === 'gap2' ? 2 : 1;
  for (let y = 36; y <= 46; y++) { w.place('wall', 30, y, 0); w.place('wall', 30 + 1 + gapW, y, 0); }
  if (kind === 'pocket') for (let x = 30; x <= 32; x++) { w.place('wall', x, 47, 0); w.place('wall', x, 35, 0); }
  w.soldiers.push({ id: 1, type: 'titan', x: 31.5, y: 41.5, hp: 720, maxHp: 720, cool: 0, face: 1, fab: fab.id } as never);
  w.enemies.push({ id: 1, x: 31.5, y: 20, hp: 1e9, maxHp: 1e9, speed: 0, dmg: 0, born: 0, kind: 'crawler-1' } as never);
  for (let i = 0; i < 40 * 30; i++) stepCombat(w, 1 / 30);
  const s = w.soldiers[0];
  return { x: s.x, y: s.y };
}
describe('titan between walls', () => {
  it('walks out of a one-tile corridor', () => { const r = scene('corridor'); expect(r.y).toBeLessThan(30); });
  it('walks out of a two-tile corridor', () => { const r = scene('gap2'); expect(r.y).toBeLessThan(30); });
  it('is not left sealed in a pocket forever', () => { const r = scene('pocket'); expect(r.y).toBeLessThan(34); });
});
