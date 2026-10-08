import { describe, expect, it } from 'vitest';
import { TUNNEL_MAX_GAP, World, accepts, insert, type Belt, type Tunnel } from './world';

/** a belt line along y=10 from x=2, an entrance at `a`, an exit at `b`, then belts to a core */
function line(a: number, b: number, walls: number[] = []) {
  const w = new World(60, 30);
  w.place('core', 40, 9, 0);
  for (let x = 2; x < a; x++) w.place('belt', x, 10, 0);
  const ent = w.place('tunnel', a, 10, 0) as Tunnel;
  for (const x of walls) w.place('wall', x, 10, 0);
  const ext = w.place('tunnel', b, 10, 0) as Tunnel;
  for (let x = b + 1; x < 40; x++) w.place('belt', x, 10, 0);
  return { w, ent, ext };
}
const feed = (w: World, n: number, seconds: number) => {
  const first = w.entityAt(2, 10) as Belt;
  let fed = 0;
  for (let i = 0; i < seconds * 30; i++) {
    if (fed < n && i % 12 === 0 && accepts(first, 'iron-plate', 0)) { insert(first, 'iron-plate', 0); fed++; }
    w.step(1 / 30);
  }
  return fed;
};

describe('underground belts', () => {
  it('the second piece in line behind a free entrance becomes its exit', () => {
    const { ent, ext, w } = line(10, 13, [11, 12]);
    expect(ent.role).toBe('in');
    expect(ext.role).toBe('out');
    expect(w.tunnelLink(ent)?.exit).toBe(ext);
    expect(w.tunnelLink(ent)?.k).toBe(3);
  });

  it('carries items under a wall to the other side', () => {
    const { w } = line(10, 13, [11, 12]);
    const fed = feed(w, 8, 40);
    expect(fed).toBe(8);
    expect(w.core!.stock['iron-plate'] ?? 0).toBeGreaterThanOrEqual(8);
    expect(w.entityAt(11, 10)?.kind).toBe('wall'); // the wall is still there
  });

  it('reaches as far as four tiles of obstacles, and no further', () => {
    const ok = line(10, 10 + TUNNEL_MAX_GAP + 1, [11, 12, 13, 14]);
    expect(ok.w.tunnelLink(ok.ent)).toBeDefined();
    const far = line(10, 10 + TUNNEL_MAX_GAP + 2, [11, 12, 13, 14, 15]);
    expect(far.ext.role).toBe('in'); // too far to be an exit: it is just another entrance
    expect(far.w.tunnelLink(far.ent)).toBeUndefined();
    feed(far.w, 3, 20);
    expect(far.w.core!.stock['iron-plate'] ?? 0).toBe(0);
  });

  it('only joins pieces that face the same way', () => {
    const w = new World(40, 20);
    const a = w.place('tunnel', 5, 5, 0) as Tunnel;
    const b = w.place('tunnel', 8, 5, 1) as Tunnel;
    expect(b.role).toBe('in');
    expect(w.tunnelLink(a)).toBeUndefined();
  });

  it('does not take items into an exit from behind', () => {
    const { w, ext } = line(10, 13, [11, 12]);
    expect(accepts(ext, 'iron-plate', 0.5)).toBe(false);
    expect(accepts(w.entityAt(10, 10) as Tunnel, 'iron-plate', 0.5)).toBe(true);
  });

  it('is free to take away, and a re-placed piece can pair up again', () => {
    const { w, ent, ext } = line(10, 13, [11, 12]);
    w.remove(ext.x, ext.y);
    expect(w.tunnelLink(ent)).toBeUndefined();
    const again = w.place('tunnel', 13, 10, 0) as Tunnel;
    expect(again.role).toBe('out');
    expect(w.tunnelLink(ent)?.exit).toBe(again);
  });
});
