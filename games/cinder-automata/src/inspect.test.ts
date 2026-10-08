import { describe, expect, it } from 'vitest';
import { inspectHtml, pickTarget } from './inspect';
import { World } from './sim/world';

describe('inspect mode', () => {
  it('describes every kind of building with what it needs and how to connect it', () => {
    const w = new World(60, 60);
    w.place('core', 30, 30, 0);
    for (const kind of ['belt', 'inserter', 'furnace', 'turret', 'assembler', 'robotfab', 'generator', 'coil', 'pole', 'wall'] as const) {
      const e = w.place(kind, kind.length * 2, 5, 0);
      if (!e) continue;
      const t = pickTarget(w, e.x + 0.5, e.y + 0.5);
      expect(t?.t).toBe('entity');
      const html = inspectHtml(t!, w);
      expect(html).toContain('Needs');
      expect(html.length).toBeGreaterThan(120);
    }
  });

  it('shows the assembler recipe with what it has of each input', () => {
    const w = new World(40, 40);
    const a = w.place('assembler', 5, 5, 0)!;
    if (a.kind !== 'assembler') throw new Error('setup');
    a.recipe = 'bullet';
    a.stock = { coal: 1 };
    const html = inspectHtml({ t: 'entity', e: a }, w);
    expect(html).toContain('Bullet');
    expect(html).toContain('coal: has 1');
    expect(html).toContain('copper plate: has 0');
  });

  it('picks enemies and robots ahead of buildings, and ore last', () => {
    const w = new World(40, 40);
    w.ore[10 * 40 + 10] = 1; w.oreLeft[10 * 40 + 10] = 20;
    expect(pickTarget(w, 10.5, 10.5)?.t).toBe('ore');
    w.enemies.push({ id: 1, x: 10.5, y: 10.5, hp: 5, maxHp: 10, speed: 1, dmg: 1, born: 0, kind: 'crawler-1' });
    expect(pickTarget(w, 10.5, 10.5)?.t).toBe('enemy');
  });
});
