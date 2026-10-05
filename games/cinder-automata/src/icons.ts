// Small pictures of buildings for the build bar and the menu, drawn with the game's own renderer.
import { drawEntity } from './render';
import { KINDS, createEntity, type Kind } from './sim/world';

/** A square canvas with the building drawn on the game's ground colour, scaled to fit. Call after sprites have loaded. */
export function kindIcon(kind: Kind, px = 96): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = px;
  const cx = c.getContext('2d')!;
  const { w, h } = KINDS[kind];
  const s = (px * 0.84) / Math.max(w, h);
  cx.setTransform(s, 0, 0, s, (px - w * s) / 2, (px - h * s) / 2);
  cx.fillStyle = '#2a2521';
  cx.fillRect(0, 0, w, h);
  drawEntity(cx, createEntity(kind, 0, 0, 0, 0), 0);
  return c;
}
