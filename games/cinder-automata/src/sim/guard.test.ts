import { describe, expect, it } from 'vitest';
import { solidAt } from './pathfind';
import { Run } from './round';
import { World } from './world';

function denseBase(): World {
  const w = new World(100, 100);
  w.place('core', 48, 48, 0);
  // a cramped base: rings of walls and machines round the core, with a few gaps
  for (let i = -8; i <= 8; i++) {
    if (Math.abs(i) > 1) { w.place('wall', 50 + i, 41, 0); w.place('wall', 50 + i, 59, 0); w.place('wall', 41, 50 + i, 0); w.place('wall', 59, 50 + i, 0); }
  }
  for (const [x, y] of [[44, 44], [53, 44], [44, 53], [53, 53], [44, 48], [54, 48]]) w.place('turret', x, y, 0);
  return w;
}

describe('idle robots', () => {
  it('spread out to their own guard posts instead of piling up, and never stand inside a building', () => {
    const w = denseBase();
    for (let i = 0; i < 30; i++) w.soldiers.push({ id: i + 1, type: i % 3 ? 'trooper' : 'heavy', x: 51.2 + (i % 5) * 0.05, y: 51.2 + Math.floor(i / 5) * 0.05, hp: 75, maxHp: 75, cool: 0, face: 1 });
    const run = new Run(w, { buildSeconds: 1e9, arenaHalf: 500 });
    let inside = 0;
    for (let i = 0; i < 60 * 30; i++) {
      run.update(1 / 30);
      if (i > 60) for (const s of w.soldiers) if (solidAt(w, Math.floor(s.x), Math.floor(s.y))) inside++;
    }
    expect(inside).toBe(0);
    // nearest-neighbour distance: nobody is on top of anybody
    let worst = Infinity, total = 0;
    for (const a of w.soldiers) {
      let nn = Infinity;
      for (const b of w.soldiers) if (a !== b) nn = Math.min(nn, Math.hypot(a.x - b.x, a.y - b.y));
      worst = Math.min(worst, nn); total += nn;
    }
    expect(worst).toBeGreaterThan(0.3);
    expect(total / w.soldiers.length).toBeGreaterThan(1.2);
    // and they are standing round the outside of the base, not crammed in the middle
    const far = w.soldiers.filter((s) => Math.hypot(s.x - 49.5, s.y - 49.5) > 9).length;
    expect(far).toBeGreaterThan(w.soldiers.length * 0.7);
  });

  it('lifts a robot that is boxed in onto free ground', () => {
    const w = new World(60, 60);
    w.place('core', 10, 10, 0);
    for (const [x, y] of [[30, 29], [30, 31], [29, 30], [31, 30], [29, 29], [31, 29], [29, 31], [31, 31]]) w.place('wall', x, y, 0); // a cell round (30,30)
    w.soldiers.push({ id: 1, type: 'trooper', x: 30.5, y: 30.5, hp: 75, maxHp: 75, cool: 0, face: 1 });
    const run = new Run(w, { buildSeconds: 1e9, arenaHalf: 500 });
    for (let i = 0; i < 60 * 30; i++) run.update(1 / 30);
    const s = w.soldiers[0];
    expect(solidAt(w, Math.floor(s.x), Math.floor(s.y))).toBe(false);
    expect(Math.hypot(s.x - 30.5, s.y - 30.5)).toBeGreaterThan(2); // it left its cell
  });
});
