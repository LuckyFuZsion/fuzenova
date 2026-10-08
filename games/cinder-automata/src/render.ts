import {
  ASSEMBLER_OUT_MAX, isFab, BELT_SPEED, DX, DY, ITEMS, KINDS, SMELT_TIME, SWING_TIME, createEntity, footprint, minerContacts, opposite,
  type Belt, type Dir, type Entity, type Kind, type World,
} from './sim/world';
import { VARIANTS } from './sim/turrets';
import { exposedEdges, plotLabel, plotRect } from './sim/plots';
import { hash } from './sim/mapgen';
import { ORE_COLORS, RECIPES, type ItemId } from './sim/items';
import { POLE_REACH, POLE_SUPPLY } from './sim/power';
import { drawItem, drawSprite, getGround, getOreTile, getSprite, terrainImage } from './sprites';
import { SHOT_LIFE, TURRET_COOLDOWN, fabRoomUsed } from './sim/combat';
import { FAB_CAPACITY, ROBOT_SPACE } from './sim/robots';
import { COIL_CHARGE_MAX } from './sim/power';
import { ROBOTS } from './sim/robots';
import { ENEMIES } from './sim/enemies';
import { BASE_VARIANT, COIL_VARIANTS } from './sim/turretdata';
import { problemOf } from './sim/status';
import { drawGroundMood, drawLighting, drawShadows } from './atmosphere';

export interface Camera { x: number; y: number; zoom: number }
/** A circle drawn on the map to show how far something reaches (a turret's range, a pole's power area...). */
export interface RangeRing { x: number; y: number; r: number; color: 'amber' | 'blue' | 'teal' | 'green'; faint?: boolean }
export interface Ghost { kind: Kind; x: number; y: number; dir: Dir; valid: boolean }
export interface View { w: number; h: number; dpr: number }

const ORE_COLOR = ORE_COLORS;
/** Which machine picture an assembler shows for each recipe. */
const ASSEMBLER_LOOK: Record<string, string> = {
  gunpowder: 'asm-gunpowder', 'bullet-casing': 'asm-press', bullet: 'asm-press',
  bronze: 'asm-alloy', steel: 'asm-alloy', 'shell-casing': 'asm-forge', 'artillery-shell': 'asm-forge',
};

export function render(
  ctx: CanvasRenderingContext2D, world: World, cam: Camera, view: View,
  ghost: Ghost | null, hovered: Entity | undefined, marker: { x: number; y: number; r: number } | null = null,
  rings: RangeRing[] = [],
): void {
  const { w: vw, h: vh, dpr } = view;
  const z = cam.zoom;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#0b0908';
  ctx.fillRect(0, 0, vw, vh);
  ctx.setTransform(dpr * z, 0, 0, dpr * z, dpr * (vw / 2 - cam.x * z), dpr * (vh / 2 - cam.y * z));

  const x0 = Math.max(0, Math.floor(cam.x - vw / 2 / z) - 1);
  const x1 = Math.min(world.w - 1, Math.ceil(cam.x + vw / 2 / z) + 1);
  const y0 = Math.max(0, Math.floor(cam.y - vh / 2 / z) - 1);
  const y1 = Math.min(world.h - 1, Math.ceil(cam.y + vh / 2 / z) + 1);

  ctx.fillStyle = '#2a2521';
  ctx.fillRect(0, 0, world.w, world.h);
  const ground = getGround();
  if (ground) {
    // one seamless texture stretched over 4x4 tiles, so pebbles and grain stay readable at play zoom
    const S = 4;
    for (let sy = Math.floor(y0 / S); sy <= Math.floor(y1 / S); sy++) {
      for (let sx = Math.floor(x0 / S); sx <= Math.floor(x1 / S); sx++) ctx.drawImage(ground, sx * S, sy * S, S, S);
    }
  } else {
    // faint ash speckle so the ground isn't flat while the texture loads
    ctx.fillStyle = 'rgba(255,255,255,0.025)';
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) if (hash(x, y, 7) < 0.18) ctx.fillRect(x, y, 1, 1);
    }
  }
  drawGroundMood(ctx, world, x0, x1, y0, y1);
  if (z >= 20) {
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1 / z;
    ctx.beginPath();
    for (let x = x0; x <= x1 + 1; x++) { ctx.moveTo(x, y0); ctx.lineTo(x, y1 + 1); }
    for (let y = y0; y <= y1 + 1; y++) { ctx.moveTo(x0, y); ctx.lineTo(x1 + 1, y); }
    ctx.stroke();
  }

  // ore
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const i = y * world.w + x;
      const o = world.ore[i];
      if (!o) continue;
      const amt = Math.min(1, world.oreLeft[i] / 900);
      const tile = getOreTile(o, x, y);
      if (tile) { // free-standing clusters on the real ground; richer ore = more opaque, mined-out ore fades away
        // Every tile keeps nearly full colour so a patch reads as one colour; running low shows as smaller clusters instead.
        ctx.globalAlpha = 0.82 + 0.18 * amt;
        const size = 0.98 + 0.22 * amt; // 1.2 when rich, shrinking to a sparse 0.98 when nearly mined out
        ctx.save();
        ctx.translate(x + 0.5, y + 0.5);
        ctx.rotate((tile.turns * Math.PI) / 2);
        if (tile.flip) ctx.scale(-1, 1);
        ctx.drawImage(tile.img, -size / 2, -size / 2, size, size); // a little bigger than the tile so neighbouring clusters overlap
        ctx.restore();
        ctx.globalAlpha = 1;
        continue;
      }
      ctx.globalAlpha = 0.4 + 0.6 * amt;
      ctx.fillStyle = ORE_COLOR[o];
      ctx.fillRect(x + 0.04, y + 0.04, 0.92, 0.92);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      for (let k = 0; k < 3; k++) {
        ctx.fillRect(x + 0.12 + hash(x, y, k + 11) * 0.7, y + 0.12 + hash(x, y, k + 21) * 0.7, 0.09, 0.09);
      }
      ctx.globalAlpha = 1;
    }
  }

  drawTerrain(ctx, world, x0, x1, y0, y1);
  drawDecor(ctx, world, x0, x1, y0, y1);

  const list: Entity[] = [];
  for (const e of world.entities.values()) {
    if (e.x + e.w < x0 || e.x > x1 || e.y + e.h < y0 || e.y > y1) continue;
    list.push(e);
  }
  const t = world.anim;
  drawShadows(ctx, list);
  for (const e of list) if (e.kind === 'belt') drawEntity(ctx, e, t, world);
  for (const e of list) if (e.kind === 'belt') drawBeltItems(ctx, e, world);
  for (const e of list) if (e.kind !== 'belt' && e.kind !== 'inserter') drawEntity(ctx, e, t, world);
  for (const e of list) if (e.kind === 'inserter') drawEntity(ctx, e, t, world);
  drawBlueprints(ctx, world, list);
  drawWires(ctx, world, list);
  drawProblems(ctx, world, list);
  drawCombat(ctx, world, x0, x1, y0, y1);
  drawArcs(ctx, world);
  for (const e of list) { // damaged buildings show a health bar, and smoke a little when badly hurt
    if (e.kind === 'core' || e.hp >= e.maxHp) continue;
    healthBar(ctx, e.x + e.w / 2, e.y - 0.18, Math.max(0.7, e.w * 0.7), e.hp / e.maxHp);
  }
  drawFx(ctx, world);
  drawLighting(ctx, world, list, cam, view); // screen-space; resets the transform, so restore it for the overlays below
  ctx.setTransform(dpr * z, 0, 0, dpr * z, dpr * (vw / 2 - cam.x * z), dpr * (vh / 2 - cam.y * z));

  if (marker) { // tutorial "look here" ring: two pulsing rings
    for (let k = 0; k < 2; k++) {
      const ph = (t * 0.9 + k * 0.5) % 1;
      ctx.strokeStyle = `rgba(255,190,80,${0.85 * (1 - ph)})`;
      ctx.lineWidth = 0.09;
      ctx.beginPath(); ctx.arc(marker.x, marker.y, marker.r * (0.55 + 0.6 * ph), 0, Math.PI * 2); ctx.stroke();
    }
  }

  if (hovered) {
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 2 / z;
    ctx.strokeRect(hovered.x, hovered.y, hovered.w, hovered.h);
  }

  drawFog(ctx, world, x0, x1, y0, y1);
  drawRings(ctx, rings, world.anim);
  drawAlerts(ctx, world, cam, view);

  if (ghost) {
    const { w, h } = footprint(ghost.kind, ghost.dir);
    ctx.globalAlpha = 0.6;
    drawEntity(ctx, createEntity(ghost.kind, 0, ghost.x, ghost.y, ghost.dir), t);
    ctx.globalAlpha = 1;
    ctx.fillStyle = ghost.valid ? 'rgba(90,210,130,0.2)' : 'rgba(230,60,50,0.4)';
    ctx.fillRect(ghost.x, ghost.y, w, h);
    if (ghost.kind === 'pole' || ghost.kind === 'generator' || ghost.kind === 'coil') {
      // show how far power reaches from here: the supply area, and the wire reach to neighbouring poles
      const gx = ghost.x + w / 2, gy = ghost.y + h / 2;
      ctx.setLineDash([0.18, 0.14]); ctx.lineWidth = 0.05;
      if (ghost.kind === 'pole') {
        ctx.strokeStyle = 'rgba(140,200,255,0.55)'; ctx.beginPath(); ctx.arc(gx, gy, POLE_SUPPLY, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = 'rgba(140,200,255,0.2)'; ctx.beginPath(); ctx.arc(gx, gy, POLE_REACH, 0, Math.PI * 2); ctx.stroke();
      }
      for (const e of world.entities.values()) { // outline every pole's supply area so gaps are easy to see
        if (e.kind !== 'pole') continue;
        ctx.strokeStyle = 'rgba(140,200,255,0.3)'; ctx.beginPath(); ctx.arc(e.x + 0.5, e.y + 0.5, POLE_SUPPLY, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.setLineDash([]);
    }
    if (ghost.kind === 'miner') {
      ctx.fillStyle = 'rgba(255,200,60,0.25)';
      // highlight every neighbour that would receive ore (any attached belt or machine works), the facing side brightest
      for (const o of minerContacts({ x: ghost.x, y: ghost.y, w, h, dir: ghost.dir })) {
        const n = world.entityAt(o.x, o.y);
        const hit = !!n && (n.kind === 'belt' || n.kind === 'furnace');
        ctx.fillStyle = hit ? 'rgba(120,230,150,0.55)' : o.side === ghost.dir ? 'rgba(255,200,60,0.28)' : 'rgba(255,200,60,0.08)';
        ctx.fillRect(o.x, o.y, 1, 1);
      }
    }
  }
}

/**
 * Which wall picture (and how far to turn it) suits a wall, from the walls beside it. The pictures are drawn as:
 * straight = left-right, corner = joins left and down, T = joins left, right and down, cross = all four.
 * A lone wall or a wall end is drawn as a straight piece pointing along its one neighbour.
 */
function wallPiece(world: World | undefined, e: Entity): { sprite: string; turns: number } {
  if (!world) return { sprite: 'wall-straight', turns: 0 };
  const has = (dx: number, dy: number) => world.entityAt(e.x + dx, e.y + dy)?.kind === 'wall';
  const n = has(0, -1), east = has(1, 0), s = has(0, 1), west = has(-1, 0);
  const count = +n + +east + +s + +west;
  if (count === 0 && getSprite('wall-end')) return { sprite: 'wall-end', turns: 0 }; // a lone block
  if (count === 4) return { sprite: 'wall-cross', turns: 0 };
  if (count === 3) { // T: turn so the missing side is where the base picture has none (up)
    const turns = !n ? 0 : !east ? 1 : !s ? 2 : 3;
    return { sprite: 'wall-t', turns };
  }
  if (count === 2 && !((n && s) || (east && west))) { // a corner: base joins left (west) and down (south)
    const turns = west && s ? 0 : west && n ? 1 : n && east ? 2 : 3;
    return { sprite: 'wall-corner', turns };
  }
  const vertical = (n || s) && !(east || west);
  return { sprite: 'wall-straight', turns: vertical ? 1 : 0 };
}

/** Cables between linked poles (bright when their network has power), and a warning bolt over anything that is not wired up. */
function drawTunnels(ctx: CanvasRenderingContext2D, world: World, list: Entity[]): void {
  for (const t of list) { // the way under the ground between a pair: a faint dashed line, with the items on their way drawn dim along it
    if (t.kind !== 'tunnel' || t.role !== 'in') continue;
    const link = world.tunnelLink(t);
    if (!link) continue;
    const ax = t.x + 0.5, ay = t.y + 0.5, bx = link.exit.x + 0.5, by = link.exit.y + 0.5;
    ctx.save();
    ctx.strokeStyle = 'rgba(217,164,65,0.35)'; ctx.lineWidth = 0.06; ctx.lineCap = 'round'; ctx.setLineDash([0.16, 0.14]);
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke(); ctx.setLineDash([]);
    ctx.globalAlpha = 0.5;
    for (const it of link.exit.items) {
      if (it.pos >= 0) continue;
      const back = Math.min(link.k, -it.pos / 0.9); // tiles back from the exit
      drawItem(ctx, it.type, bx - (bx - ax) * (back / link.k), by - (by - ay) * (back / link.k), 0.32);
    }
    ctx.restore();
  }
}

function drawWires(ctx: CanvasRenderingContext2D, world: World, list: Entity[]): void {
  drawTunnels(ctx, world, list);
  const p = world.power;
  if (!p) return;
  // three looks: no power (dull, dashed), short of power (amber, slow pulses), full power (glowing blue, quick pulses running along the wire)
  const lamps = new Map<number, { x: number; y: number; s: number }>();
  for (const [a, b] of p.links) {
    const sat = p.sat.get(p.netOf.get(a.id) ?? -1) ?? 0;
    const state = sat <= 0 ? 0 : sat < 0.999 ? 1 : 2;
    const ax = a.x + 0.5, ay = a.y + 0.3, bx = b.x + 0.5, by = b.y + 0.3;
    const len = Math.hypot(bx - ax, by - ay), sag = len * 0.06, mx = (ax + bx) / 2, my = (ay + by) / 2 + sag;
    lamps.set(a.id, { x: ax, y: ay, s: state }); lamps.set(b.id, { x: bx, y: by, s: state });
    ctx.lineCap = 'round';
    if (state === 0) {
      ctx.strokeStyle = 'rgba(120,112,104,0.55)'; ctx.lineWidth = 0.05; ctx.setLineDash([0.18, 0.14]);
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo(mx, my, bx, by); ctx.stroke(); ctx.setLineDash([]);
      continue;
    }
    const col = state === 2 ? '110,190,255' : '255,176,70';
    ctx.globalCompositeOperation = 'lighter'; // a soft glow under the wire
    ctx.strokeStyle = `rgba(${col},0.22)`; ctx.lineWidth = 0.2;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo(mx, my, bx, by); ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = `rgba(${col},0.9)`; ctx.lineWidth = 0.06;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo(mx, my, bx, by); ctx.stroke();
    const n = Math.max(1, Math.round(len / 2.2)), speed = state === 2 ? 0.9 : 0.4; // charges running along the wire
    ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < n; k++) {
      const t = (world.anim * speed / Math.max(1, len * 0.35) + k / n) % 1, u = 1 - t;
      const x = u * u * ax + 2 * u * t * mx + t * t * bx, y = u * u * ay + 2 * u * t * my + t * t * by;
      ctx.fillStyle = state === 2 ? 'rgba(220,240,255,0.95)' : 'rgba(255,225,170,0.9)';
      ctx.beginPath(); ctx.arc(x, y, 0.07, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  for (const l of lamps.values()) { // a lamp on every pole shows its network's state
    ctx.fillStyle = l.s === 2 ? 'rgba(150,215,255,0.95)' : l.s === 1 ? 'rgba(255,190,90,0.95)' : 'rgba(95,88,82,0.9)';
    ctx.beginPath(); ctx.arc(l.x, l.y - 0.05, 0.09, 0, Math.PI * 2); ctx.fill();
    if (l.s > 0) {
      const g = ctx.createRadialGradient(l.x, l.y - 0.05, 0.02, l.x, l.y - 0.05, 0.4);
      g.addColorStop(0, l.s === 2 ? 'rgba(120,200,255,0.55)' : 'rgba(255,170,60,0.5)'); g.addColorStop(1, 'rgba(120,200,255,0)');
      ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(l.x - 0.4, l.y - 0.45, 0.8, 0.8); ctx.globalCompositeOperation = 'source-over';
    }
  }
  for (const e of list) {
    if ((e.kind !== 'coil' && e.kind !== 'generator') || p.netOf.has(e.id)) continue;
    const pulse = 0.65 + Math.sin(world.anim * 5) * 0.3; // "not connected to a pole"
    const x = e.x + e.w / 2, y = e.y - 0.1;
    const icon = getSprite('icon-no-power');
    ctx.globalAlpha = pulse;
    if (icon) ctx.drawImage(icon.canvas, x - 0.32, y - 0.64, 0.64, 0.64);
    else { ctx.fillStyle = 'rgb(255,90,60)'; ctx.beginPath(); ctx.arc(x, y - 0.3, 0.26, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
}

/** Rocks, burnt trees and tar pits. Painted in code until the decoration art arrives. */
/** when each scrap bin last swallowed something, so it can flare briefly */
const binSeen = new Map<number, { n: number; t: number }>();

/** Scenery: small non-blocking props scattered over the open ground (the same ones every time for a seed), and rubble where buildings have been destroyed. */
const DECOR: [string, number][] = [
  ['decor-pebbles', 0.7], ['decor-shrub', 1.1], ['decor-bones', 0.95], ['decor-scrap-metal', 1.1], ['decor-scrap-pile', 1.15], ['decor-wreck', 1.5],
  ['decor-fungus', 0.85], ['decor-crater', 1.7], ['decor-arm', 1.1], ['decor-ash', 1.3], ['decor-pipe', 1.1],
];
const GROUND: [string, number][] = [
  ['ground-lava-1', 3], ['ground-lava-2', 3], ['ground-lava-3', 3], ['ground-crater', 3.2], ['ground-dune-1', 3.4], ['ground-dune-2', 3.4], ['ground-salt-1', 3], ['ground-salt-2', 3],
];
function drawDecor(ctx: CanvasRenderingContext2D, world: World, x0: number, x1: number, y0: number, y1: number): void {
  const core = world.core;
  const cx = core ? core.x + core.w / 2 : -999, cy = core ? core.y + core.h / 2 : -999;
  for (let y = y0 - 2; y <= y1 + 2; y++) { // flat patches of ground, under everything else; mud gets its own churned-up decals
    for (let x = x0 - 2; x <= x1 + 2; x++) {
      if (!world.inBounds(x, y)) continue;
      const i = y * world.w + x;
      const onMud = world.mud[i] === 1 && world.terrain[i] === 0;
      if (hash(x, y, 71) > (onMud ? 0.12 : 0.006)) continue;
      if (world.ore[i] || world.terrain[i] || world.entityAt(x, y) || Math.hypot(x - cx, y - cy) < 8) continue;
      const [name, wt] = onMud ? [`ground-mud-${1 + Math.floor(hash(x, y, 72) * 4)}`, 2.6] as [string, number] : GROUND[Math.floor(hash(x, y, 72) * GROUND.length)];
      const img = terrainImage(name);
      if (!img) continue;
      const w = wt * (0.85 + hash(x, y, 73) * 0.3), h = w * img.height / img.width;
      ctx.globalAlpha = onMud ? 0.8 : 0.75;
      ctx.drawImage(img, x + 0.5 - w / 2, y + 0.5 - h / 2, w, h);
      ctx.globalAlpha = 1;
    }
  }
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (!world.inBounds(x, y) || hash(x, y, 61) > 0.022) continue;
      const i = y * world.w + x;
      if (world.ore[i] || world.terrain[i] || world.entityAt(x, y) || Math.hypot(x - cx, y - cy) < 7) continue;
      let clear = true; // keep clear of rocks, trees and tar so a prop never looks like part of an obstacle
      for (let dy = -1; dy <= 1 && clear; dy++) for (let dx = -1; dx <= 1; dx++) if (world.hasTerrain(x + dx, y + dy)) { clear = false; break; }
      if (!clear) continue;
      const [name, wt] = DECOR[Math.floor(hash(x, y, 62) * DECOR.length)];
      const img = terrainImage(name);
      if (!img) continue;
      const w = wt * (0.85 + hash(x, y, 63) * 0.3), h = w * img.height / img.width;
      const px = x + 0.5 + (hash(x, y, 64) - 0.5) * 0.5, py = y + 0.5 + (hash(x, y, 65) - 0.5) * 0.5;
      ctx.globalAlpha = 0.92;
      ctx.drawImage(img, px - w / 2, py - h / 2, w, h);
      ctx.globalAlpha = 1;
    }
  }
  for (const p of world.rubble) { // what is left of a destroyed building, fading in its last ten seconds
    const age = world.time - p.t0;
    if (age > 45 || p.x < x0 - 3 || p.x > x1 + 3 || p.y < y0 - 3 || p.y > y1 + 3) continue;
    const img = terrainImage(`rubble-${1 + p.pick}`);
    if (!img) continue;
    const w = Math.max(1.2, p.size * 1.05), h = w * img.height / img.width;
    ctx.globalAlpha = age > 35 ? Math.max(0, 1 - (age - 35) / 10) : 1;
    ctx.drawImage(img, p.x - w / 2, p.y - h / 2, w, h);
    ctx.globalAlpha = 1;
  }
}

function drawTerrain(ctx: CanvasRenderingContext2D, world: World, x0: number, x1: number, y0: number, y1: number): void {
  const T = world.terrain, W = world.w;
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= W || y >= world.h ? 0 : T[y * W + x]);
  const rockArt = !!terrainImage('rock-1'), treeArt = !!terrainImage('tree-1'), tarArt = !!terrainImage('tar-fill-a') && !!terrainImage('tar-edge-straight');
  const covered = new Set<number>(); // tiles already drawn as part of a bigger rock cluster
  drawTarLayer(ctx, world);
  // pass 1: the bodies (rock masses), so neighbouring tiles join into one shape
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const t = T[y * W + x];
      if (t !== 1) continue; // tar and toxic pools are drawn as smooth blobs (drawTarLayer)
      if (t === 1 && rockArt) continue; // the boulder pictures stand on the bare ground: no dark plate underneath
      const j = (k: number) => (hash(x, y, k) - 0.5) * 0.16;
      ctx.fillStyle = t === 1 ? (rockArt ? '#2b2724' : '#34302c') : '#0c0b10';
      const r = 0.34;
      // corners round off only where there is no neighbour of the same kind
      const L = at(x - 1, y) === t, R = at(x + 1, y) === t, U = at(x, y - 1) === t, D = at(x, y + 1) === t;
      ctx.beginPath();
      ctx.roundRect(x - (L ? 0.02 : 0) + j(1) * 0.3, y - (U ? 0.02 : 0) + j(2) * 0.3, 1 + (L ? 0.02 : 0) + (R ? 0.02 : 0), 1 + (U ? 0.02 : 0) + (D ? 0.02 : 0), [U || L ? 0.02 : r, U || R ? 0.02 : r, D || R ? 0.02 : r, D || L ? 0.02 : r]);
      ctx.fill();
    }
  }
  // pass 2: boulders, trees and sheen on top
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const t = T[y * W + x];
      if (!t) continue;
      const h1 = hash(x, y, 3), h2 = hash(x, y, 4), h3 = hash(x, y, 5);
      if (t === 1 && rockArt) {
        if (covered.has(y * W + x)) continue;
        const pic = (name: string, cx: number, cy: number, wTiles: number) => {
          const img = terrainImage(name);
          if (!img) return;
          const hTiles = wTiles * img.height / img.width;
          ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(cx + 0.05, cy + hTiles * 0.3, wTiles * 0.4, hTiles * 0.22, 0, 0, Math.PI * 2); ctx.fill();
          ctx.drawImage(img, cx - wTiles / 2, cy - hTiles / 2, wTiles, hTiles);
        };
        if (at(x + 1, y) === 1 && at(x, y + 1) === 1 && at(x + 1, y + 1) === 1 && !covered.has(y * W + x + 1) && !covered.has((y + 1) * W + x) && !covered.has((y + 1) * W + x + 1) && hash(x, y, 9) < 0.55) {
          covered.add(y * W + x); covered.add(y * W + x + 1); covered.add((y + 1) * W + x); covered.add((y + 1) * W + x + 1);
          pic(`rock-cluster-${1 + Math.floor(h1 * 4)}`, x + 1, y + 1, 2.3);
        } else {
          pic(`rock-${1 + Math.floor(h1 * 8)}`, x + 0.5 + (h2 - 0.5) * 0.25, y + 0.52 + (h3 - 0.5) * 0.25, 1.15 + h2 * 0.3);
        }
        continue;
      }
      if (t === 2 && treeArt) { // burnt trees stand taller than a tile; stumps and logs are lower
        const stump = h3 > 0.8;
        const name = stump ? ['stump-2', 'tree-7', 'stump-1'][Math.floor(h1 * 3)] : ['tree-1', 'tree-2', 'tree-3', 'tree-4', 'tree-8', 'obstacle-trees-extra-11'][Math.floor(h1 * 6)] // the two tall thin bare poles (tree-5, tree-6) looked like sticks, so they are no longer used;
        const img = terrainImage(name);
        if (img) {
          // size by the LONGER side, so a tall thin trunk is not stretched up to five tiles high: no tree is more than about two tiles tall
          const longest = stump ? 1.1 + h2 * 0.3 : (img.height / img.width > 1.6 ? 1.5 : 1.8) + h2 * 0.45;
          const k = longest / Math.max(img.width, img.height) * (stump ? 1 : 1);
          const wTiles = img.width * k, hTiles = img.height * k;
          const cx = x + 0.5 + (h2 - 0.5) * 0.25, bottom = y + 0.92;
          ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.beginPath(); ctx.ellipse(cx + 0.05, bottom - 0.05, wTiles * 0.3, 0.14, 0, 0, Math.PI * 2); ctx.fill();
          ctx.drawImage(img, cx - wTiles / 2, bottom - hTiles, wTiles, hTiles);
        }
        continue;
      }
      if (t === 1) { // boulders: a shadow, a lit body, a dark rim and a crack
        const bx = x + 0.5 + (h1 - 0.5) * 0.22, by = y + 0.52 + (h2 - 0.5) * 0.22, rx = 0.42 + h3 * 0.12, ry = rx * (0.82 + h1 * 0.15);
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath(); ctx.ellipse(bx + 0.06, by + 0.09, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
        const g = ctx.createRadialGradient(bx - rx * 0.35, by - ry * 0.4, 0.04, bx, by, rx * 1.1);
        g.addColorStop(0, '#9b948b'); g.addColorStop(0.55, '#67615a'); g.addColorStop(1, '#2d2926');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.ellipse(bx, by, rx, ry, h2 * 3, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(14,11,9,0.85)'; ctx.lineWidth = 0.045; ctx.stroke();
        ctx.strokeStyle = 'rgba(14,11,9,0.5)'; ctx.lineWidth = 0.03;
        ctx.beginPath(); ctx.moveTo(bx - rx * 0.3, by - ry * 0.1); ctx.lineTo(bx + rx * 0.05 * (h3 * 4 - 2), by + ry * 0.35); ctx.stroke();
      } else if (t === 2) { // a burnt tree: dark limbs fanning out from a charred trunk, with the odd ember
        const cx = x + 0.5 + (h1 - 0.5) * 0.3, cy = y + 0.5 + (h2 - 0.5) * 0.3;
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(cx + 0.05, cy + 0.08, 0.3, 0.2, 0, 0, Math.PI * 2); ctx.fill();
        ctx.lineCap = 'round';
        const limbs = 5 + Math.floor(h3 * 3);
        for (let k = 0; k < limbs; k++) {
          const a = (k / limbs) * Math.PI * 2 + h1 * 2, len = 0.3 + hash(x, y, 30 + k) * 0.32;
          const ex = cx + Math.cos(a) * len, ey = cy + Math.sin(a) * len;
          ctx.strokeStyle = '#1a1210'; ctx.lineWidth = 0.1; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ex, ey); ctx.stroke();
          ctx.strokeStyle = '#3d2c22'; ctx.lineWidth = 0.04; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ex, ey); ctx.stroke();
        }
        ctx.fillStyle = '#231915'; ctx.beginPath(); ctx.arc(cx, cy, 0.13, 0, Math.PI * 2); ctx.fill();
        if (h3 > 0.6) { ctx.fillStyle = `rgba(255,120,40,${0.5 + 0.3 * Math.sin(world.anim * 3 + x * 7)})`; ctx.fillRect(cx + (h1 - 0.5) * 0.3, cy + (h2 - 0.5) * 0.3, 0.05, 0.05); }
      } else if (t === 3) { // tar: a slow moving sheen and the odd bubble
        if (tarArt) continue;
        const edge = !(at(x - 1, y) === 3 && at(x + 1, y) === 3 && at(x, y - 1) === 3 && at(x, y + 1) === 3);
        if (edge) { ctx.strokeStyle = 'rgba(70,60,80,0.5)'; ctx.lineWidth = 0.05; ctx.strokeRect(x + 0.06, y + 0.06, 0.88, 0.88); }
        const s = 0.5 + 0.5 * Math.sin(world.anim * 0.9 + h1 * 6);
        ctx.fillStyle = `rgba(95,100,140,${0.10 + 0.16 * s})`;
        ctx.beginPath(); ctx.ellipse(x + 0.35 + 0.3 * s, y + 0.4 + 0.15 * h2, 0.2, 0.09, h3, 0, Math.PI * 2); ctx.fill();
        if (Math.sin(world.anim * 1.7 + h3 * 40) > 0.96) { ctx.strokeStyle = 'rgba(150,160,200,0.6)'; ctx.lineWidth = 0.02; ctx.beginPath(); ctx.arc(x + 0.25 + h1 * 0.5, y + 0.25 + h2 * 0.5, 0.07, 0, Math.PI * 2); ctx.stroke(); }
      }
    }
  }
}

/** \"Something spawned here\": an expanding ring where it appeared, and, if that is off screen, an arrow on the edge of the screen pointing to it. */
function drawAlerts(ctx: CanvasRenderingContext2D, world: World, cam: Camera, view: View): void {
  if (!world.alerts.length) return;
  const z = cam.zoom;
  ctx.save();
  for (const a of world.alerts) {
    const k = a.age / a.life, fade = Math.min(1, (1 - k) * 2.5);
    const sx = view.w / 2 + (a.x - cam.x) * z, sy = view.h / 2 + (a.y - cam.y) * z;
    const on = sx > 0 && sx < view.w && sy > 0 && sy < view.h;
    const col = a.big ? '255,150,40' : '255,70,50';
    if (on) { // world space: pulsing rings on the spot
      for (let i = 0; i < 2; i++) {
        const p = ((a.age * 0.9 + i * 0.5) % 1);
        ctx.strokeStyle = `rgba(${col},${(1 - p) * fade})`; ctx.lineWidth = 0.09;
        ctx.beginPath(); ctx.arc(a.x, a.y, (a.big ? 1.5 : 0.8) + p * (a.big ? 4 : 2.6), 0, Math.PI * 2); ctx.stroke();
      }
    } else { // screen space: an arrow on the edge of the view
      ctx.save();
      ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
      const cx = view.w / 2, cy = view.h / 2, dx = sx - cx, dy = sy - cy;
      const m = 44, t = Math.min((cx - m) / Math.max(Math.abs(dx), 1e-6), (cy - m) / Math.max(Math.abs(dy), 1e-6));
      const px = cx + dx * t, py = cy + dy * t, ang = Math.atan2(dy, dx);
      ctx.translate(px, py); ctx.rotate(ang);
      const s = (a.big ? 1.5 : 1) * (1 + 0.15 * Math.sin(a.age * 9));
      ctx.globalAlpha = fade;
      ctx.fillStyle = `rgb(${col})`; ctx.strokeStyle = 'rgba(20,8,5,0.9)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(20 * s, 0); ctx.lineTo(-12 * s, -15 * s); ctx.lineTo(-5 * s, 0); ctx.lineTo(-12 * s, 15 * s); ctx.closePath(); ctx.stroke(); ctx.fill();
      ctx.restore();
    }
  }
  ctx.restore();
}

const RING_RGB = { amber: '255,170,60', blue: '110,190,255', teal: '90,220,200', green: '120,220,140' };
function drawRings(ctx: CanvasRenderingContext2D, rings: RangeRing[], anim: number): void {
  if (!rings.length) return;
  ctx.save();
  for (const g of rings) {
    const c = RING_RGB[g.color];
    ctx.fillStyle = `rgba(${c},${g.faint ? 0.03 : 0.07})`;
    ctx.strokeStyle = `rgba(${c},${g.faint ? 0.35 : 0.75})`;
    ctx.lineWidth = g.faint ? 0.04 : 0.06;
    ctx.setLineDash([0.35, 0.25]); ctx.lineDashOffset = -anim * 0.5;
    ctx.beginPath(); ctx.arc(g.x, g.y, g.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}

// ---- tar pits, toxic pools and mud: each drawn as one smooth, organic blob field (not tile by tile) so there are no seams or blocky edges ----
const TAR_PX = 10; // pixels per tile in the cached pictures
type PoolKind = 'tar' | 'toxic' | 'mud';
interface PoolStyle {
  mask: (w: World, i: number) => boolean;
  base: [number, number, number]; sheen: [number, number, number]; rim: [number, number, number]; fleck: [number, number, number]; halo: [number, number, number];
  haloAlpha: number; rimWidth: number; gloss: number;
}
const POOLS: Record<PoolKind, PoolStyle> = {
  tar: { mask: (w, i) => w.terrain[i] === 3, base: [11, 10, 15], sheen: [24, 22, 40], rim: [66, 46, 34], fleck: [150, 60, 0], halo: [4, 3, 6], haloAlpha: 0.55, rimWidth: 1, gloss: 1 },
  toxic: { mask: (w, i) => w.terrain[i] === 4, base: [12, 30, 14], sheen: [40, 110, 30], rim: [70, 96, 38], fleck: [60, 200, 50], halo: [6, 22, 8], haloAlpha: 0.5, rimWidth: 1, gloss: 1.2 },
  mud: { mask: (w, i) => w.mud[i] === 1 && w.terrain[i] === 0, base: [52, 38, 26], sheen: [30, 20, 12], rim: [78, 58, 40], fleck: [0, 0, 0], halo: [30, 22, 14], haloAlpha: 0.22, rimWidth: 0.6, gloss: 0.5 },
};
const poolLayers = new WeakMap<World, Partial<Record<PoolKind, HTMLCanvasElement | null>>>();

const vnoise = (x: number, y: number, seed: number): number => { // smooth value noise, 0..1
  const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = hash(x0, y0, seed), b = hash(x0 + 1, y0, seed), c = hash(x0, y0 + 1, seed), d = hash(x0 + 1, y0 + 1, seed);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
};

/** Builds (once per map) a picture of every pool of one kind: a soft-edged blob field, thresholded into a pool with a crusted rim and a stain round it. */
function poolLayerFor(world: World, kind: PoolKind): HTMLCanvasElement | null {
  let set = poolLayers.get(world);
  if (!set) { set = {}; poolLayers.set(world, set); }
  if (kind in set) return set[kind]!;
  const st = POOLS[kind];
  const W = world.w, H = world.h;
  let any = false, minX = W, minY = H, maxX = 0, maxY = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (st.mask(world, y * W + x)) { any = true; minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  if (!any) { set[kind] = null; return null; }
  const pad = 3; minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad); maxX = Math.min(W - 1, maxX + pad); maxY = Math.min(H - 1, maxY + pad);
  const tw = maxX - minX + 1, th = maxY - minY + 1, cw = tw * TAR_PX, ch = th * TAR_PX;
  const mask = document.createElement('canvas'); mask.width = cw; mask.height = ch;
  const mg = mask.getContext('2d')!;
  mg.fillStyle = '#fff';
  for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
    if (!st.mask(world, y * W + x)) continue;
    const jx = (hash(x, y, 31) - 0.5) * 0.3, jy = (hash(x, y, 32) - 0.5) * 0.3;
    const rr = 0.62 + hash(x, y, 33) * 0.14;
    mg.beginPath(); mg.arc((x - minX + 0.5 + jx) * TAR_PX, (y - minY + 0.5 + jy) * TAR_PX, rr * TAR_PX, 0, Math.PI * 2); mg.fill();
  }
  const soft = document.createElement('canvas'); soft.width = cw; soft.height = ch;
  const sg = soft.getContext('2d')!;
  sg.filter = `blur(${TAR_PX * 0.42}px)`;
  sg.drawImage(mask, 0, 0);
  const src = sg.getImageData(0, 0, cw, ch).data;
  const out = document.createElement('canvas'); out.width = cw; out.height = ch;
  const og = out.getContext('2d')!;
  const img = og.createImageData(cw, ch), d = img.data;
  const sm = (a: number, b: number, v: number) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
  const seedK = kind === 'tar' ? 41 : kind === 'toxic' ? 51 : 61;
  for (let py = 0; py < ch; py++) {
    for (let px = 0; px < cw; px++) {
      const f = src[(py * cw + px) * 4 + 3] / 255;
      if (f < 0.12) continue;
      const wx = (px / TAR_PX) + minX, wy = (py / TAR_PX) + minY;
      const i = (py * cw + px) * 4;
      const body = sm(0.46, 0.5, f);
      const halo = sm(0.12, 0.46, f) * st.haloAlpha;
      const rim = sm(0.46, 0.5, f) * (1 - sm(0.5 + 0.06 * st.rimWidth, 0.5 + 0.24 * st.rimWidth, f));
      const n1 = vnoise(wx * 1.3, wy * 1.3, seedK), n2 = vnoise(wx * 4.2, wy * 4.2, seedK + 1);
      const sheen = Math.max(0, n1 - 0.55) * 2.2 * (0.6 + 0.4 * n2);
      let r = st.base[0] + sheen * st.sheen[0], g = st.base[1] + sheen * st.sheen[1], b = st.base[2] + sheen * st.sheen[2];
      const fleck = n2 > 0.82 ? (n2 - 0.82) * 6 : 0;
      r = r * (1 - rim) + (st.rim[0] + n2 * 40 + fleck * st.fleck[0]) * rim;
      g = g * (1 - rim) + (st.rim[1] + n2 * 22 + fleck * st.fleck[1]) * rim;
      b = b * (1 - rim) + (st.rim[2] + n2 * 14 + fleck * st.fleck[2]) * rim;
      const up = src[((py + 3 < ch ? py + 3 : py) * cw + (px + 3 < cw ? px + 3 : px)) * 4 + 3] / 255;
      const gloss = body * Math.max(0, f - up) * 5 * (1 - rim) * st.gloss;
      r += gloss * 70; g += gloss * 66; b += gloss * 90;
      const a = Math.max(halo * (1 - body), body);
      d[i] = body > 0 ? r : st.halo[0]; d[i + 1] = body > 0 ? g : st.halo[1]; d[i + 2] = body > 0 ? b : st.halo[2]; d[i + 3] = Math.round(a * 255);
    }
  }
  og.putImageData(img, 0, 0);
  (out as unknown as { ox: number; oy: number }).ox = minX; (out as unknown as { ox: number; oy: number }).oy = minY;
  set[kind] = out;
  return out;
}

function drawTarLayer(ctx: CanvasRenderingContext2D, world: World): void {
  for (const kind of ['mud', 'tar', 'toxic'] as PoolKind[]) { // mud lies on the ground, the pools sit in it
    const layer = poolLayerFor(world, kind);
    if (!layer) continue;
    const o = layer as unknown as { ox: number; oy: number };
    ctx.drawImage(layer, o.ox, o.oy, layer.width / TAR_PX, layer.height / TAR_PX);
  }
}

/** Ground outside the playable square is unexplored: dark, with a glowing edge where the map ends for now. */
function drawPlotFog(ctx: CanvasRenderingContext2D, world: World, x0: number, x1: number, y0: number, y1: number): void {
  const open = world.plots!;
  const L = x0 - 1, R = x1 + 2, T = y0 - 1, B = y1 + 2;
  ctx.save();
  ctx.beginPath();
  ctx.rect(L, T, R - L, B - T);
  for (const id of open) { const r = plotRect(id); ctx.rect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0); }
  for (const id of world.plotOffer) if (!open.has(id)) { const r = plotRect(id); ctx.rect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0); }
  ctx.fillStyle = 'rgba(7,6,7,0.93)';
  ctx.fill('evenodd'); // everything unexplored goes dark
  ctx.restore();
  const pulse = 0.5 + 0.5 * Math.sin(world.anim * 4);
  for (const id of world.plotOffer) { // plots on offer are dimmed, not hidden, so their ore shows; the one pointed at glows
    const r = plotRect(id), hot = id === world.plotHover;
    ctx.fillStyle = hot ? `rgba(255,170,70,${0.12 + 0.12 * pulse})` : 'rgba(7,6,7,0.45)';
    ctx.fillRect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0);
    ctx.strokeStyle = hot ? 'rgba(255,200,110,0.95)' : 'rgba(255,170,70,0.6)'; ctx.lineWidth = hot ? 0.16 : 0.08; ctx.setLineDash([0.5, 0.3]);
    ctx.strokeRect(r.x0 + 0.1, r.y0 + 0.1, r.x1 - r.x0 - 0.2, r.y1 - r.y0 - 0.2); ctx.setLineDash([]);
    ctx.fillStyle = hot ? '#ffe2b0' : '#ffd9a0'; ctx.font = '1.6px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(plotLabel(id), (r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2 + 0.6);
  }
  ctx.save();
  ctx.strokeStyle = 'rgba(255,170,70,0.55)'; ctx.lineWidth = 0.06; ctx.setLineDash([0.3, 0.2]); ctx.lineDashOffset = -world.anim * 0.4;
  for (const e of exposedEdges(open)) { ctx.beginPath(); ctx.moveTo(e.x0, e.y0); ctx.lineTo(e.x1, e.y1); ctx.stroke(); }
  ctx.restore();
}

function drawFog(ctx: CanvasRenderingContext2D, world: World, x0: number, x1: number, y0: number, y1: number): void {
  if (world.plots) { drawPlotFog(ctx, world, x0, x1, y0, y1); return; }
  const a = world.arena;
  if (a.x0 <= 0 && a.y0 <= 0 && a.x1 >= world.w && a.y1 >= world.h) return;
  ctx.fillStyle = 'rgba(7,6,7,0.9)';
  const L = x0 - 1, R = x1 + 2, T = y0 - 1, B = y1 + 2;
  if (a.y0 > T) ctx.fillRect(L, T, R - L, a.y0 - T);
  if (a.y1 < B) ctx.fillRect(L, a.y1, R - L, B - a.y1);
  if (a.x0 > L) ctx.fillRect(L, a.y0, a.x0 - L, a.y1 - a.y0);
  if (a.x1 < R) ctx.fillRect(a.x1, a.y0, R - a.x1, a.y1 - a.y0);
  // a soft glow just inside each edge, and a dashed line on it
  const g = 1.6;
  const edges: [number, number, number, number, number, number, number, number][] = [
    [a.x0, a.y0, a.x1 - a.x0, g, a.x0, a.y0, a.x0, a.y0 + g],
    [a.x0, a.y1 - g, a.x1 - a.x0, g, a.x0, a.y1, a.x0, a.y1 - g],
    [a.x0, a.y0, g, a.y1 - a.y0, a.x0, a.y0, a.x0 + g, a.y0],
    [a.x1 - g, a.y0, g, a.y1 - a.y0, a.x1, a.y0, a.x1 - g, a.y0],
  ];
  for (const [ex, ey, w, h, gx0, gy0, gx1, gy1] of edges) {
    const grad = ctx.createLinearGradient(gx0, gy0, gx1, gy1);
    grad.addColorStop(0, 'rgba(255,138,31,0.22)'); grad.addColorStop(1, 'rgba(255,138,31,0)');
    ctx.fillStyle = grad; ctx.fillRect(ex, ey, w, h);
  }
  ctx.save();
  ctx.strokeStyle = 'rgba(255,170,70,0.55)'; ctx.lineWidth = 0.06; ctx.setLineDash([0.3, 0.2]); ctx.lineDashOffset = -world.anim * 0.4;
  ctx.strokeRect(a.x0, a.y0, a.x1 - a.x0, a.y1 - a.y0);
  ctx.restore();
}

/** Buildings placed this build phase are still "blueprints": tinted blue with a marching dashed outline until a fight locks them in. */
function drawBlueprints(ctx: CanvasRenderingContext2D, world: World, list: Entity[]): void {
  ctx.save();
  ctx.lineWidth = 0.05;
  ctx.setLineDash([0.16, 0.12]);
  ctx.lineDashOffset = -world.anim * 0.35;
  for (const e of list) {
    if (!e.fresh) continue;
    ctx.fillStyle = 'rgba(70,150,255,0.2)';
    ctx.fillRect(e.x, e.y, e.w, e.h);
    ctx.strokeStyle = 'rgba(140,200,255,0.85)';
    ctx.strokeRect(e.x + 0.04, e.y + 0.04, e.w - 0.08, e.h - 0.08);
  }
  ctx.restore();
}

/** A pulsing red or amber "!" over anything that is placed wrong or cannot work yet (see sim/status.ts). */
function drawProblems(ctx: CanvasRenderingContext2D, world: World, list: Entity[]): void {
  for (const e of list) {
    const p = problemOf(world, e);
    if (!p) continue;
    const x = e.x + e.w / 2, y = e.y - 0.05 + (e.kind === 'belt' || e.kind === 'inserter' ? 0.25 : 0);
    const pulse = 0.75 + Math.sin(world.anim * 6 + e.id) * 0.25;
    const r = e.kind === 'belt' || e.kind === 'inserter' ? 0.2 : 0.27;
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.fillStyle = p.level === 'error' ? 'rgb(235,60,45)' : 'rgb(255,168,40)';
    ctx.strokeStyle = 'rgba(20,10,5,0.9)'; ctx.lineWidth = 0.05;
    ctx.beginPath(); ctx.arc(x, y - r - 0.02, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#1a0d08';
    ctx.font = `bold ${r * 1.5}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('!', x, y - r - 0.01);
    ctx.restore();
  }
}

/** Lightning: a soft blue glow under a bright white-blue core, re-jittered a little each frame so it crackles. */
function drawArcs(ctx: CanvasRenderingContext2D, world: World): void {
  if (!world.arcs.length) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const a of world.arcs) {
    const k = Math.max(0, a.ttl / a.life);
    const shake = 0.05 + (1 - k) * 0.03;
    const path = () => {
      ctx.beginPath();
      a.pts.forEach((pt, i) => {
        const j = i === 0 || i === a.pts.length - 1 ? 0 : 1; // the ends stay on the coil and the target
        const x = pt.x + (Math.random() - 0.5) * shake * 2 * j, y = pt.y + (Math.random() - 0.5) * shake * 2 * j;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
    };
    ctx.strokeStyle = `rgba(70,130,255,${0.35 * k})`; ctx.lineWidth = 0.42; path(); ctx.stroke();
    ctx.strokeStyle = `rgba(150,210,255,${0.8 * k})`; ctx.lineWidth = 0.16; path(); ctx.stroke();
    ctx.strokeStyle = `rgba(255,255,255,${k})`; ctx.lineWidth = 0.06; path(); ctx.stroke();
  }
  ctx.restore();
}

/** Explosions, muzzle flashes, sparks and smoke. Fire-like effects use additive light so they glow against the dark ground. */
function drawFx(ctx: CanvasRenderingContext2D, world: World): void {
  for (const f of world.fx) {
    const spr = getSprite(f.name);
    if (!spr) continue;
    const t = f.age / f.dur;
    const size = f.grow ? f.size * (0.45 + 0.65 * Math.sqrt(t)) : f.size * (1 - 0.25 * t);
    const alpha = f.grow ? Math.min(1, (1 - t) * 1.6) : 1 - t * t;
    ctx.save();
    ctx.globalAlpha = Math.max(0, alpha) * (f.opacity ?? 1);
    if (f.add) ctx.globalCompositeOperation = 'lighter';
    ctx.translate(f.x, f.y);
    ctx.rotate(f.rot);
    ctx.scale(size, size);
    const muzzle = f.name === 'fx-muzzle-flash'; // the flash grows out of the barrel tip, not from its centre
    drawSprite(ctx, spr, muzzle ? 0 : -0.5, -0.5);
    ctx.restore();
  }
}

/** Enemies, tracer lines and health bars. Procedural for now, until the enemy sprite sheets are generated. */
function drawCombat(ctx: CanvasRenderingContext2D, world: World, x0: number, x1: number, y0: number, y1: number): void {
  const core = world.core;
  const cx = core ? core.x + core.w / 2 : world.w / 2, cy = core ? core.y + core.h / 2 : world.h / 2;

  for (const s of world.shots) {
    const bullet = getSprite('proj-bullet');
    if (bullet) { // a real bullet flying from the muzzle to the target
      const p = Math.min(1, Math.max(0, 1 - s.ttl / (s.life ?? SHOT_LIFE)));
      if (s.kind === 'acid') { // a glob of acid, arcing a little on its way
        const gx = s.x1 + (s.x2 - s.x1) * p, gy = s.y1 + (s.y2 - s.y1) * p - Math.sin(p * Math.PI) * 0.7;
        const acid = getSprite('proj-acid');
        ctx.save(); ctx.translate(gx, gy); ctx.rotate(Math.atan2(s.y2 - s.y1, s.x2 - s.x1));
        if (acid) drawSprite(ctx, acid, -0.5, -0.5);
        else { ctx.fillStyle = 'rgba(120,255,90,0.9)'; ctx.beginPath(); ctx.arc(0, 0, 0.16, 0, Math.PI * 2); ctx.fill(); }
        ctx.restore();
        continue;
      }
      const bx = s.x1 + (s.x2 - s.x1) * p, by = s.y1 + (s.y2 - s.y1) * p;
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(Math.atan2(s.y2 - s.y1, s.x2 - s.x1));
      ctx.globalCompositeOperation = 'lighter';
      drawSprite(ctx, bullet, -0.35, -0.5); // trail sits behind, brass tip leads
      ctx.restore();
      continue;
    }
    ctx.strokeStyle = `rgba(255,214,130,${Math.min(1, s.ttl * 14)})`;
    ctx.lineWidth = 0.07;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); ctx.stroke();
  }

  for (const en of world.enemies) {
    if (en.x < x0 - 1 || en.x > x1 + 1 || en.y < y0 - 1 || en.y > y1 + 1) continue;
    const face = Math.atan2(cy - en.y, cx - en.x);
    const bob = Math.sin(world.anim * 9 + en.id) * 0.03;
    const espr = en.kind ? getSprite(`enemy-${en.kind}`) : undefined;
    if (espr && en.kind) {
      const def = ENEMIES[en.kind];
      const lift = def.flying ? 0.5 + Math.sin(world.anim * 5 + en.id) * 0.08 : 0;
      if (def.flying) { // shadow stays on the ground while the drone hovers above it
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath(); ctx.ellipse(en.x, en.y + 0.05, def.scale * 0.36, def.scale * 0.2, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.save();
      ctx.translate(en.x, en.y - lift + bob);
      ctx.rotate(face);
      if (!def.flying) ctx.rotate(Math.sin(world.anim * 10 + en.id) * 0.05); // scuttling wobble
      drawSprite(ctx, espr, -def.scale / 2, -def.scale / 2);
      ctx.restore();
      if (en.burn) { // on fire: a flickering orange glow over it
        const g = ctx.createRadialGradient(en.x, en.y - lift, 0.02, en.x, en.y - lift, def.scale * 0.6);
        g.addColorStop(0, `rgba(255,170,50,${0.55 + Math.sin(world.anim * 18 + en.id) * 0.15})`); g.addColorStop(1, 'rgba(255,90,20,0)');
        ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(en.x, en.y - lift, def.scale * 0.6, 0, Math.PI * 2); ctx.fill(); ctx.globalCompositeOperation = 'source-over';
      }
      if (en.stun && en.stun > 0) { // frozen by a Stun coil: a pale ring
        ctx.strokeStyle = 'rgba(255,230,120,0.8)'; ctx.lineWidth = 0.06; ctx.setLineDash([0.12, 0.1]);
        ctx.beginPath(); ctx.arc(en.x, en.y - lift, def.scale * 0.55, world.anim * 3, world.anim * 3 + Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      }
      if (en.hp < en.maxHp || def.boss) healthBar(ctx, en.x, en.y - lift - def.scale * 0.55, Math.max(0.6, def.scale * 0.55), en.hp / en.maxHp);
      continue;
    }
    ctx.save();
    ctx.translate(en.x, en.y + bob);
    ctx.rotate(face);
    ctx.scale(1.7, 1.7); // placeholder crawlers were far too small to read; proper sprites come with the enemy sheets
    ctx.strokeStyle = '#1a0f0c';
    ctx.lineWidth = 0.06;
    ctx.lineCap = 'round';
    for (let k = -1; k <= 1; k += 2) { // scuttling legs
      for (let j = 0; j < 3; j++) {
        const sway = Math.sin(world.anim * 14 + en.id + j * 2) * 0.09;
        ctx.beginPath(); ctx.moveTo(0.05 - j * 0.14, 0); ctx.lineTo(0.05 - j * 0.14 + sway, k * 0.36); ctx.stroke();
      }
    }
    ctx.fillStyle = '#5a2a1c';
    ctx.beginPath(); ctx.ellipse(0, 0, 0.34, 0.24, 0, 0, Math.PI * 2); ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#7a3a24';
    ctx.beginPath(); ctx.ellipse(-0.06, 0, 0.2, 0.14, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff4a2a';
    ctx.beginPath(); ctx.arc(0.22, -0.08, 0.05, 0, Math.PI * 2); ctx.arc(0.22, 0.08, 0.05, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    if (en.hp < en.maxHp) healthBar(ctx, en.x, en.y - 0.45, 0.6, en.hp / en.maxHp);
  }

  if (core && core.hp < core.maxHp) healthBar(ctx, cx, core.y - 0.35, 2.4, core.hp / core.maxHp);

  // the player's robots, back to front so the ones lower on screen overlap the ones behind
  const army = world.soldiers.filter((s) => s.x > x0 - 3 && s.x < x1 + 3 && s.y > y0 - 3 && s.y < y1 + 3).sort((a, b) => a.y - b.y);
  for (const s of army) {
    const def = ROBOTS[s.type];
    const spr = getSprite(`robot-${s.type}`);
    const moving = !!s.moving;
    const hover = def.flying ? 0.45 + Math.sin(world.anim * (moving ? 9 : 5) + s.id) * (moving ? 0.045 : 0.06) : 0;
    // a stride: each footfall is a small hop, faster for quick little robots and slower for heavy ones
    const cadence = 5 + 4 / (0.6 + def.scale * 0.5);
    const stride = Math.sin(world.anim * cadence + s.id * 1.7);
    const walk = !def.flying && moving ? Math.abs(stride) * (0.035 + def.scale * 0.012) : 0;
    // sway side to side with each step, and lean into the direction of travel (drones tip forward instead)
    const sway = !def.flying && moving ? stride * 0.05 : 0;
    const tilt = sway + (s.lean ?? 0) * (def.flying ? 0.18 : 0.07);
    const top = getSprite(`robot-top-${s.type}`);
    if (top) { // drawn from above, so it simply rotates to its heading like the enemies do
      const lift = def.flying ? 0.3 + Math.sin(world.anim * (moving ? 9 : 5) + s.id) * 0.04 : 0;
      ctx.fillStyle = `rgba(0,0,0,${def.flying ? 0.24 : 0.3})`;
      ctx.beginPath(); ctx.ellipse(s.x + 0.06 + lift * 0.3, s.y + 0.1 + lift * 0.5, def.scale * 0.4, def.scale * 0.3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.save();
      ctx.translate(s.x, s.y - lift);
      ctx.rotate((s.angle ?? 0) + (!def.flying && moving ? stride * 0.035 : 0)); // a little body sway with each step
      const pulse = !def.flying && moving ? 1 + Math.abs(stride) * 0.025 : 1;
      ctx.scale(pulse, pulse);
      drawSprite(ctx, top, -def.scale / 2, -def.scale / 2);
      ctx.restore();
      if (s.hp < s.maxHp) healthBar(ctx, s.x, s.y - def.scale * 0.62 - lift, Math.max(0.5, def.scale * 0.6), s.hp / s.maxHp);
      continue;
    }
    ctx.fillStyle = `rgba(0,0,0,${def.flying ? 0.28 : 0.35})`;
    ctx.beginPath(); ctx.ellipse(s.x, s.y + 0.02, def.scale * 0.32, def.scale * 0.11, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.translate(s.x, s.y - hover - walk);
    ctx.rotate(tilt); // pivot at the feet (drones: at the body) so the whole robot leans rather than slides
    ctx.scale(s.face, 1);
    if (spr) drawSprite(ctx, spr, -def.scale / 2, -def.scale * (def.flying ? 0.5 : 0.92));
    else { ctx.fillStyle = '#3a6ea5'; ctx.beginPath(); ctx.arc(0, -def.scale * 0.4, def.scale * 0.3, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
    if (s.hp < s.maxHp) healthBar(ctx, s.x, s.y - def.scale - hover - 0.05, Math.max(0.5, def.scale * 0.6), s.hp / s.maxHp);
  }
}

function healthBar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, frac: number): void {
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(x - w / 2 - 0.03, y - 0.06, w + 0.06, 0.16);
  ctx.fillStyle = frac > 0.5 ? '#6fd08a' : frac > 0.25 ? '#ffb347' : '#ff5a3a';
  ctx.fillRect(x - w / 2, y - 0.03, w * Math.max(0, frac), 0.1);
}

interface BeltShape { curve: boolean; from: Dir; cw: boolean }
const STRAIGHT: BeltShape = { curve: false, from: 0, cw: true };

/** A belt with a feeder only on one side (and none behind) is drawn as a corner piece. */
function beltShape(world: World | undefined, e: Belt): BeltShape {
  if (!world) return STRAIGHT;
  const feeds = (x: number, y: number, need: Dir) => {
    const n = world.entityAt(x, y);
    return n?.kind === 'belt' && n.dir === need;
  };
  if (feeds(e.x - DX[e.dir], e.y - DY[e.dir], e.dir)) return STRAIGHT;
  // an inserter dropping onto the side of the first tile of a line feeds it like a belt would: the tile bends away from it
  const frontIsBelt = world.entityAt(e.x + DX[e.dir], e.y + DY[e.dir])?.kind === 'belt';
  const inserterFeeds = (x: number, y: number, s: Dir): boolean => {
    const n = world.entityAt(x, y);
    if (n?.kind !== 'inserter') return false;
    if (n.dir === opposite(s)) return true; // it drops onto this belt
    if (n.locked || !frontIsBelt) return false;
    const across = world.entityAt(x + DX[s], y + DY[s]); // not yet settled: it will face the machine behind it
    return !!across && across.kind !== 'belt';
  };
  let from: Dir | null = null;
  let count = 0;
  for (const s of [(e.dir + 1) % 4, (e.dir + 3) % 4] as Dir[]) {
    if (feeds(e.x + DX[s], e.y + DY[s], opposite(s)) || inserterFeeds(e.x + DX[s], e.y + DY[s], s)) { from = opposite(s); count++; }
  }
  if (count !== 1 || from === null) return STRAIGHT;
  return { curve: true, from, cw: e.dir === (from + 1) % 4 };
}

/** Moves the context into a belt tile's local space (centre origin), oriented for its shape. */
function beltTransform(ctx: CanvasRenderingContext2D, e: Belt, shape: BeltShape): void {
  ctx.translate(e.x + 0.5, e.y + 0.5);
  if (shape.curve) {
    ctx.rotate((shape.from * Math.PI) / 2);
    if (!shape.cw) ctx.scale(1, -1);
  } else {
    ctx.rotate((e.dir * Math.PI) / 2);
  }
}

function drawBeltItems(ctx: CanvasRenderingContext2D, e: Entity, world: World): void {
  if (e.kind !== 'belt' || !e.items.length) return;
  const shape = beltShape(world, e);
  ctx.save();
  beltTransform(ctx, e, shape);
  for (const it of e.items) {
    let px: number, py: number;
    if (shape.curve) {
      // quarter-circle centred on the tile corner the belt bends around
      const phi = -Math.PI / 2 + it.pos * (Math.PI / 2);
      const rad = 0.5 + (it.j ?? 0) * 0.12;
      px = -0.5 + rad * Math.cos(phi);
      py = 0.5 + rad * Math.sin(phi);
    } else {
      px = it.pos - 0.5;
      py = (it.j ?? 0) * 0.12;
    }
    drawItem(ctx, it.type, px, py, 0.4);
  }
  ctx.restore();
}

export function drawEntity(ctx: CanvasRenderingContext2D, e: Entity, time: number, world?: World): void {
  ctx.save();
  switch (e.kind) {
    case 'junction': { // two belts crossing over a raised plate; each direction keeps to its own lane
      const belt = getSprite('belt'), art = getSprite('crossover');
      ctx.translate(e.x + 0.5, e.y + 0.5);
      if (art) drawSprite(ctx, art, -0.5, -0.5);
      else {
        if (belt) { drawSprite(ctx, belt, -0.5, -0.5); ctx.save(); ctx.rotate(Math.PI / 2); drawSprite(ctx, belt, -0.5, -0.5); ctx.restore(); }
        else { ctx.fillStyle = '#3b4148'; ctx.fillRect(-0.5, -0.5, 1, 1); }
        ctx.fillStyle = '#2b2622'; ctx.beginPath(); ctx.roundRect(-0.3, -0.3, 0.6, 0.6, 0.08); ctx.fill();
        ctx.strokeStyle = '#8a8176'; ctx.lineWidth = 0.05; ctx.stroke();
        ctx.fillStyle = '#4d463f'; ctx.beginPath(); ctx.roundRect(-0.22, -0.22, 0.44, 0.44, 0.06); ctx.fill();
        ctx.fillStyle = '#d9a441';
        for (const [dx, dy] of [[0.36, 0], [-0.36, 0], [0, 0.36], [0, -0.36]]) { ctx.beginPath(); ctx.arc(dx, dy, 0.05, 0, Math.PI * 2); ctx.fill(); }
      }
      for (let d = 0; d < 4; d++) {
        for (const it of e.lanes[d]) {
          const wob = (it.j ?? 0) * 0.1;
          const px = d === 0 ? it.pos - 0.5 : d === 2 ? 0.5 - it.pos : wob, py = d === 1 ? it.pos - 0.5 : d === 3 ? 0.5 - it.pos : wob;
          drawItem(ctx, it.type, px, py, 0.36);
        }
      }
      break;
    }
    case 'tunnel': { // an entrance (a dark mouth the belt runs into) or an exit (the belt comes up out of a ramp); the picture points the way it flows
      const spr = getSprite(e.role === 'in' ? 'tunnel-in' : 'tunnel-out');
      ctx.translate(e.x + 0.5, e.y + 0.5);
      ctx.rotate((e.dir * Math.PI) / 2);
      if (spr) drawSprite(ctx, spr, -0.5, -0.5);
      else {
        ctx.fillStyle = '#3b4148'; ctx.fillRect(-0.5, -0.5, 1, 1);
        ctx.fillStyle = '#2b2622'; ctx.beginPath(); ctx.roundRect(-0.46, -0.46, 0.92, 0.92, 0.1); ctx.fill();
        ctx.strokeStyle = '#6b5f55'; ctx.lineWidth = 0.05; ctx.stroke();
        ctx.fillStyle = '#0d0a09'; // the mouth: at the front of an entrance, at the back of an exit
        ctx.beginPath(); ctx.roundRect(e.role === 'in' ? 0.0 : -0.46, -0.3, 0.46, 0.6, 0.1); ctx.fill();
        ctx.fillStyle = '#d9a441';
        ctx.beginPath(); ctx.moveTo(-0.18, -0.16); ctx.lineTo(0.02, 0); ctx.lineTo(-0.18, 0.16); ctx.closePath(); ctx.fill();
      }
      for (const it of e.items) { // items on the piece itself (not those still underground)
        if (it.pos < 0) continue;
        drawItem(ctx, it.type, it.pos - 0.5, (it.j ?? 0) * 0.12, 0.36);
      }
      break;
    }
    case 'splitter': { // a gate across two belts: items come in behind, and go out of either tile in front
      const belt = getSprite('belt'), art = getSprite('splitter-gate');
      ctx.translate(e.x + e.w / 2, e.y + e.h / 2);
      ctx.rotate((e.dir * Math.PI) / 2);
      if (art) drawSprite(ctx, art, -0.5, -1); // the painted gate, flowing to the right
      else {
        for (const ly of [-1, 0]) {
          if (belt) drawSprite(ctx, belt, -0.5, ly);
          else { ctx.fillStyle = '#3b4148'; ctx.fillRect(-0.5, ly, 1, 1); }
        }
        ctx.fillStyle = '#2b2622'; ctx.beginPath(); ctx.roundRect(-0.22, -1.02, 0.44, 2.04, 0.08); ctx.fill();
        ctx.fillStyle = '#5a534b'; ctx.beginPath(); ctx.roundRect(-0.17, -0.96, 0.34, 1.92, 0.06); ctx.fill();
        ctx.strokeStyle = '#8a8176'; ctx.lineWidth = 0.035; ctx.stroke();
        ctx.fillStyle = '#d9a441'; // an arrow on each half says which way it flows, and a lamp in the middle says it is working
        for (const ay of [-0.5, 0.5]) { ctx.beginPath(); ctx.moveTo(-0.08, ay - 0.12); ctx.lineTo(0.1, ay); ctx.lineTo(-0.08, ay + 0.12); ctx.closePath(); ctx.fill(); }
      }
      ctx.fillStyle = e.items.length ? '#7dff9a' : '#3a5a44'; ctx.beginPath(); ctx.arc(0, 0, 0.06, 0, Math.PI * 2); ctx.fill();
      for (const it of e.items) drawItem(ctx, it.type, it.pos - 0.5, (it.j ?? -1) * 0.5, 0.36);
      break;
    }
    case 'belt': {
      const shape = beltShape(world, e);
      const spr = getSprite(shape.curve ? 'belt-curve' : 'belt');
      beltTransform(ctx, e, shape);
      if (spr) { drawSprite(ctx, spr, -0.5, -0.5); break; }
      ctx.fillStyle = '#3b4148';
      ctx.fillRect(-0.5, -0.5, 1, 1);
      ctx.fillStyle = '#2b3036';
      ctx.fillRect(-0.5, -0.5, 1, 0.09);
      ctx.fillRect(-0.5, 0.41, 1, 0.09);
      ctx.strokeStyle = '#d9a441';
      ctx.lineWidth = 0.06;
      ctx.lineCap = 'round';
      for (let k = 0; k < 2; k++) {
        const x = -0.5 + ((time * BELT_SPEED + k * 0.5) % 1);
        ctx.beginPath();
        ctx.moveTo(x - 0.1, -0.2);
        ctx.lineTo(x, 0);
        ctx.lineTo(x - 0.1, 0.2);
        ctx.stroke();
      }
      break;
    }
    case 'miner': {
      const spr = getSprite('miner');
      const legacy = e.w === e.h; // a 2x2 drill from an older save
      const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
      if (!legacy) { // the 3x2 drill: a plate the size of its footprint, hoppers at the ends, a glowing port in the middle of each long side, and the drill itself on top
        ctx.save();
        ctx.translate(cx, cy);
        const tall = e.h > e.w;
        ctx.fillStyle = '#2f2722';
        ctx.beginPath(); ctx.roundRect(-e.w / 2 + 0.05, -e.h / 2 + 0.05, e.w - 0.1, e.h - 0.1, 0.14); ctx.fill();
        ctx.strokeStyle = '#6b5a48'; ctx.lineWidth = 0.05; ctx.stroke();
        ctx.fillStyle = '#4a3f36';
        for (const s of [-1, 1]) { // a hopper at each end of the long axis
          const hx = tall ? 0 : s * 1, hy = tall ? s * 1 : 0;
          ctx.beginPath(); ctx.roundRect(hx - 0.36, hy - 0.36, 0.72, 0.72, 0.1); ctx.fill();
          ctx.strokeStyle = '#7d6a55'; ctx.lineWidth = 0.035; ctx.stroke();
        }
        ctx.fillStyle = e.pending ? 'rgba(255,90,60,0.9)' : 'rgba(255,190,70,0.95)';
        for (const s of [-1, 1]) { // output ports, middle of each long side; the one it is feeding is brighter
          const px = tall ? s * (e.w / 2 - 0.02) : 0, py = tall ? 0 : s * (e.h / 2 - 0.02);
          ctx.globalAlpha = 0.55 + 0.35 * Number(((tall ? (s > 0 ? 0 : 2) : (s > 0 ? 1 : 3)) === e.dir));
          ctx.beginPath(); ctx.roundRect(px - (tall ? 0.06 : 0.22), py - (tall ? 0.22 : 0.06), tall ? 0.12 : 0.44, tall ? 0.44 : 0.12, 0.05); ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.restore();
      }
      if (spr) {
        ctx.translate(cx, cy);
        ctx.rotate((e.dir * Math.PI) / 2);
        if (!e.pending && e.progress > 0) ctx.translate(Math.sin(time * 60) * 0.008, 0); // working shudder
        drawSprite(ctx, spr, -1, -1);
        break;
      }
      if (legacy) {
        ctx.fillStyle = '#7a5230';
        ctx.beginPath(); ctx.roundRect(e.x + 0.06, e.y + 0.06, 1.88, 1.88, 0.14); ctx.fill();
      }
      ctx.fillStyle = '#2b2018';
      ctx.beginPath(); ctx.arc(cx, cy, 0.66, 0, Math.PI * 2); ctx.fill();
      ctx.translate(cx, cy);
      ctx.rotate(e.pending ? 0 : time * 6);
      ctx.strokeStyle = '#c8c0b4';
      ctx.lineWidth = 0.09;
      ctx.lineCap = 'round';
      for (let k = 0; k < 3; k++) {
        ctx.rotate((Math.PI * 2) / 3);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0.5, 0); ctx.stroke();
      }
      break;
    }
    case 'furnace': {
      const spr = getSprite('furnace');
      const lit = e.progress > 0;
      if (spr) {
        drawSprite(ctx, spr, e.x, e.y);
        if (lit) {
          // pulse a warm glow over the fire mouth at the bottom of the sprite
          const g = ctx.createRadialGradient(e.x + 1, e.y + 1.72, 0.05, e.x + 1, e.y + 1.72, 0.85);
          const a = 0.35 + Math.sin(time * 9) * 0.1;
          g.addColorStop(0, `rgba(255,150,50,${a})`);
          g.addColorStop(1, 'rgba(255,150,50,0)');
          ctx.globalCompositeOperation = 'lighter';
          ctx.fillStyle = g;
          ctx.fillRect(e.x, e.y + 0.8, 2, 1.4);
          ctx.globalCompositeOperation = 'source-over';
          ctx.fillStyle = 'rgba(255,210,122,0.9)';
          ctx.fillRect(e.x + 0.25, e.y + 1.9, 1.5 * (e.progress / SMELT_TIME), 0.07);
        }
        break;
      }
      ctx.fillStyle = '#5a4038';
      ctx.beginPath(); ctx.roundRect(e.x + 0.06, e.y + 0.06, 1.88, 1.88, 0.14); ctx.fill();
      ctx.fillStyle = '#3d2b25';
      ctx.fillRect(e.x + 0.25, e.y + 0.25, 1.5, 0.75);
      ctx.fillStyle = lit ? `rgba(255,${120 + Math.sin(time * 9) * 30},40,0.9)` : '#1a1210';
      ctx.fillRect(e.x + 0.5, e.y + 1.15, 1, 0.55);
      if (lit) {
        ctx.fillStyle = '#ffd27a';
        ctx.fillRect(e.x + 0.25, e.y + 1.82, 1.5 * (e.progress / SMELT_TIME), 0.08);
      }
      break;
    }
    case 'turret': case 'flamer': {
      const cx = e.x + 1, cy = e.y + 1;
      const vname = e.variant ?? BASE_VARIANT[e.kind];
      const vk = vname === 'gun' ? '' : vname;
      const base = (vk && getSprite(`turret-${vk}-base`)) || getSprite('turret-base'), barrel = (vk && getSprite(`turret-${vk}-barrel`)) || getSprite('turret-barrel');
      const ownArt = !!vk && !!getSprite(`turret-${vk}-base`);
      if (base && barrel) {
        drawSprite(ctx, base, e.x, e.y);
        // ammo pips round the rim show how full the stockpile is
        const pips = 12, lit = Math.round((e.ammo / 24) * pips);
        for (let k = 0; k < pips; k++) {
          const a = (k / pips) * Math.PI * 2 - Math.PI / 2;
          ctx.fillStyle = k < lit ? '#ffa03a' : 'rgba(20,16,14,0.75)';
          ctx.beginPath(); ctx.arc(cx + Math.cos(a) * 0.9, cy + Math.sin(a) * 0.9, 0.045, 0, Math.PI * 2); ctx.fill();
        }
        const tv = VARIANTS[vname];
        if (vk && !ownArt) { // without its own art an upgraded turret wears a coloured ring round its hub, and its barrel changes shape
          ctx.strokeStyle = tv.colour; ctx.lineWidth = 0.09; ctx.globalAlpha = 0.9;
          ctx.beginPath(); ctx.arc(cx, cy, 0.62, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
        }
        ctx.translate(cx, cy);
        ctx.rotate(e.aim);
        const kick = Math.max(0, e.cooldown / tv.cooldown); // 1 just after firing, easing to 0
        ctx.translate(-0.1 * kick * (e.variant === 'scatter' ? 2 : 1), 0);
        if (!ownArt) { if (e.variant === 'sniper') ctx.scale(1.4, 0.8); else if (e.variant === 'scatter') ctx.scale(0.8, 1.55); }
        drawSprite(ctx, barrel, 0, 0);
        break;
      }
      ctx.fillStyle = '#26221f';
      ctx.beginPath(); ctx.arc(cx, cy, 0.92, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#0d0a09'; ctx.lineWidth = 0.05; ctx.stroke();
      ctx.fillStyle = '#4a443d';
      ctx.beginPath(); ctx.arc(cx, cy, 0.74, 0, Math.PI * 2); ctx.fill();
      // ammo pips around the rim: how full the stockpile is
      const pips = 12, lit = Math.round((e.ammo / 24) * pips);
      for (let k = 0; k < pips; k++) {
        const a = (k / pips) * Math.PI * 2 - Math.PI / 2;
        ctx.fillStyle = k < lit ? '#ffa03a' : '#2b2622';
        ctx.beginPath(); ctx.arc(cx + Math.cos(a) * 0.84, cy + Math.sin(a) * 0.84, 0.05, 0, Math.PI * 2); ctx.fill();
      }
      ctx.translate(cx, cy);
      ctx.rotate(e.aim);
      ctx.fillStyle = '#7d7368';
      ctx.fillRect(0, -0.15, 1.25, 0.3);
      ctx.fillStyle = '#3a342e';
      ctx.fillRect(1.05, -0.19, 0.22, 0.38);
      ctx.fillStyle = '#9a8f82';
      ctx.beginPath(); ctx.arc(0, 0, 0.32, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#0d0a09'; ctx.lineWidth = 0.04; ctx.stroke();
      break;
    }
    case 'pole': {
      const spr = getSprite('pole');
      if (spr) { drawSprite(ctx, spr, e.x, e.y); break; }
      ctx.fillStyle = '#5b4a36'; ctx.beginPath(); ctx.arc(e.x + 0.5, e.y + 0.5, 0.2, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'scrapbin': {
      let seen = binSeen.get(e.id);
      if (!seen || seen.n !== e.burned) { seen = { n: e.burned, t: time }; binSeen.set(e.id, seen); }
      const hot = e.burned > 0 && time - seen.t < 0.5;
      const spr = (hot ? getSprite('scrapbin-active') : null) ?? getSprite('scrapbin-idle');
      if (spr) drawSprite(ctx, spr, e.x, e.y);
      else { // until the picture exists: a dark drum with an ember mouth
        ctx.fillStyle = '#2d2926'; ctx.beginPath(); ctx.roundRect(e.x + 0.08, e.y + 0.08, 1.84, 1.84, 0.2); ctx.fill();
        ctx.strokeStyle = '#6b5f55'; ctx.lineWidth = 0.08; ctx.beginPath(); ctx.arc(e.x + 1, e.y + 1, 0.7, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = hot ? '#ff8a2a' : '#4a2a14'; ctx.beginPath(); ctx.arc(e.x + 1, e.y + 1, 0.55, 0, Math.PI * 2); ctx.fill();
      }
      if (hot) {
        const g = ctx.createRadialGradient(e.x + 1, e.y + 1, 0.05, e.x + 1, e.y + 1, 0.8);
        g.addColorStop(0, 'rgba(255,170,60,0.5)'); g.addColorStop(1, 'rgba(255,120,30,0)');
        ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(e.x, e.y, 2, 2); ctx.globalCompositeOperation = 'source-over';
      }
      break;
    }
    case 'generator': {
      const on = e.fuelSecs > 0;
      const spr = getSprite(on ? 'gen-lit' : 'gen-cold');
      if (spr) drawSprite(ctx, spr, e.x, e.y);
      else { ctx.fillStyle = '#4a3f36'; ctx.beginPath(); ctx.roundRect(e.x + 0.06, e.y + 0.06, 1.88, 1.88, 0.14); ctx.fill(); }
      if (on) { // the picture already shows the fire; a flicker over the firebox makes it breathe
        const g = ctx.createRadialGradient(e.x + 1, e.y + 1, 0.05, e.x + 1, e.y + 1, 0.75);
        g.addColorStop(0, `rgba(255,170,60,${0.3 + Math.sin(time * 11 + e.id) * 0.12})`); g.addColorStop(1, 'rgba(255,120,30,0)');
        ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(e.x, e.y, 2, 2); ctx.globalCompositeOperation = 'source-over';
      }
      // fuel gauge along the bottom
      ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(e.x + 0.2, e.y + 1.83, 1.6, 0.14);
      ctx.fillStyle = on ? '#ffb347' : '#5a5048'; ctx.fillRect(e.x + 0.23, e.y + 1.86, 1.54 * Math.min(1, e.fuelSecs / 120), 0.08);
      break;
    }
    case 'coil': {
      const cx = e.x + 1, cy = e.y + 1;
      const vn = e.variant && e.variant !== 'coil' ? e.variant : '';
      const idle = (vn && getSprite(`coil-${vn}-idle`)) || getSprite('coil-idle'), lit = (vn && getSprite(`coil-${vn}-charged`)) || getSprite('coil-charged');
      if (idle && lit) { // the charged picture fades in with a gentle pulse, and flares when the coil fires
        drawSprite(ctx, idle, e.x, e.y);
        const glow = Math.min(1, 0.08 + 0.5 * ((e.charge ?? 0) / COIL_CHARGE_MAX) + Math.sin(time * 3 + e.id) * 0.06 + Math.min(1, e.flash * 3) * 0.85); // brighter as it charges
        ctx.globalAlpha *= Math.max(0, glow);
        drawSprite(ctx, lit, e.x, e.y);
        if (e.variant === 'shield' && e.charge > 1) { // the field itself: a faint dome the size of its reach
          ctx.globalAlpha = 0.1 + Math.sin(time * 2 + e.id) * 0.03; ctx.fillStyle = '#7dffb0';
          ctx.beginPath(); ctx.arc(cx, cy, COIL_VARIANTS.shield.range, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = 0.28; ctx.strokeStyle = '#7dffb0'; ctx.lineWidth = 0.05; ctx.stroke();
        }
        break;
      }
      const charge = 0.45 + Math.sin(time * 3 + e.id) * 0.12 + Math.min(1, e.flash * 3) * 0.6;
      ctx.fillStyle = '#1f1c1a';
      ctx.beginPath(); ctx.roundRect(e.x + 0.05, e.y + 0.05, 1.9, 1.9, 0.2); ctx.fill();
      ctx.strokeStyle = '#0b0908'; ctx.lineWidth = 0.05; ctx.stroke();
      ctx.fillStyle = '#3a342f';
      ctx.beginPath(); ctx.roundRect(e.x + 0.18, e.y + 0.18, 1.64, 1.64, 0.14); ctx.fill();
      ctx.fillStyle = '#7d7368';
      for (const [dx, dy] of [[0.3, 0.3], [1.7, 0.3], [0.3, 1.7], [1.7, 1.7]]) { ctx.beginPath(); ctx.arc(e.x + dx, e.y + dy, 0.06, 0, Math.PI * 2); ctx.fill(); }
      // stacked copper windings, seen from above as rings closing in on the electrode
      for (let k = 0; k < 4; k++) {
        ctx.strokeStyle = k % 2 ? '#a86232' : '#d18a4a'; ctx.lineWidth = 0.11;
        ctx.beginPath(); ctx.arc(cx, cy, 0.78 - k * 0.14, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(12,8,6,0.6)'; ctx.lineWidth = 0.03;
      ctx.beginPath(); ctx.arc(cx, cy, 0.85, 0, Math.PI * 2); ctx.stroke();
      // the electrode: a blue-white sphere that swells and flares when it fires
      const g = ctx.createRadialGradient(cx, cy, 0.02, cx, cy, 0.34 + charge * 0.22);
      g.addColorStop(0, `rgba(255,255,255,${Math.min(1, 0.7 + charge * 0.3)})`);
      g.addColorStop(0.35, `rgba(140,205,255,${Math.min(1, 0.55 + charge * 0.4)})`);
      g.addColorStop(1, 'rgba(60,120,255,0)');
      ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx, cy, 0.34 + charge * 0.22, 0, Math.PI * 2); ctx.fill(); ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#cfe8ff'; ctx.beginPath(); ctx.arc(cx, cy, 0.13, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'assembler': {
      const spr = getSprite(ASSEMBLER_LOOK[e.recipe] ?? 'assembler') ?? getSprite('assembler');
      if (spr) drawSprite(ctx, spr, e.x, e.y);
      else { ctx.fillStyle = '#3a3f46'; ctx.beginPath(); ctx.roundRect(e.x + 0.06, e.y + 0.06, 2.88, 2.88, 0.2); ctx.fill(); }
      const r = RECIPES[e.recipe];
      const barW = 2.3, bx = e.x + 0.35, by = e.y + 2.66;
      ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(bx - 0.03, by - 0.03, barW + 0.06, 0.2);
      ctx.fillStyle = '#ffb347'; ctx.fillRect(bx, by, barW * Math.min(1, e.progress / (r?.time ?? 1)), 0.06);
      if (r) { // recipe output icon top-left, and a dot per finished item waiting for an inserter
        drawItem(ctx, r.output, e.x + 0.42, e.y + 0.42, 0.55);
        ctx.fillStyle = '#7CFC9a';
        for (let i = 0; i < e.out; i++) { ctx.beginPath(); ctx.arc(bx + 0.06 + i * 0.16, by + 0.11, 0.05, 0, Math.PI * 2); ctx.fill(); }
        // what it is holding of each input (have / needed), red when short, and a plain badge for what it is waiting on
        const ins = Object.entries(r.inputs) as [ItemId, number][];
        const first: { k: ItemId | null } = { k: null };
        ins.forEach(([k, need], i) => {
          const have = e.stock[k] ?? 0, low = have < need;
          if (low && !first.k) first.k = k;
          const gap = ins.length > 2 ? 0.98 : 1.35, ix = e.x + 0.5 + i * gap, iy = e.y + 2.2;
          ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.beginPath(); ctx.roundRect(ix - 0.3, iy - 0.28, 0.9, 0.5, 0.12); ctx.fill();
          if (low) { ctx.strokeStyle = '#ff6b5a'; ctx.lineWidth = 0.05; ctx.stroke(); }
          drawItem(ctx, k, ix, iy - 0.02, 0.36);
          ctx.fillStyle = low ? '#ff9a8a' : '#d8f5d0'; ctx.font = '600 0.26px system-ui'; ctx.textAlign = 'left'; (ctx as unknown as { letterSpacing: string }).letterSpacing = '0px';
          ctx.fillText(`${have}/${need}`, ix + 0.2, iy + 0.09);
        });
        const full = e.out + r.count > ASSEMBLER_OUT_MAX;
        const badge = full ? { t: `${e.out} ready - take out`, c: '#ffcf5a' }
                  : first.k && e.progress === 0 ? { t: `needs ${ITEMS[first.k].name.toLowerCase()}`, c: '#ff9a8a' } : null;
        if (badge) {
          ctx.font = '700 0.25px system-ui'; ctx.textAlign = 'center'; (ctx as unknown as { letterSpacing: string }).letterSpacing = '0px';
          const tw = Math.min(2.9, ctx.measureText(badge.t).width + 0.3);
          ctx.fillStyle = 'rgba(0,0,0,0.78)'; ctx.beginPath(); ctx.roundRect(e.x + 1.5 - tw / 2, e.y - 0.5, tw, 0.42, 0.2); ctx.fill();
          ctx.fillStyle = badge.c; ctx.fillText(badge.t, e.x + 1.5, e.y - 0.2);
        }
      }
      break;
    }
    case 'wall': {
      const piece = wallPiece(world, e);
      const hurt = e.hp / e.maxHp <= 0.33 ? '-d2' : e.hp / e.maxHp <= 0.66 ? '-d1' : ''; // cracked, then broken
      const spr = getSprite(piece.sprite + hurt) ?? getSprite(piece.sprite);
      if (spr) { // a straight bar, corner, T or cross, turned to fit whatever it touches
        ctx.translate(e.x + 0.5, e.y + 0.5);
        ctx.rotate((piece.turns * Math.PI) / 2);
        drawSprite(ctx, spr, -0.5, -0.5);
        break;
      }
      ctx.fillStyle = '#2b2724';
      ctx.beginPath(); ctx.roundRect(e.x + 0.04, e.y + 0.04, 0.92, 0.92, 0.12); ctx.fill();
      ctx.fillStyle = '#5b544c';
      ctx.beginPath(); ctx.roundRect(e.x + 0.12, e.y + 0.12, 0.76, 0.76, 0.08); ctx.fill();
      ctx.fillStyle = '#7b7368';
      ctx.fillRect(e.x + 0.16, e.y + 0.16, 0.68, 0.16);
      ctx.strokeStyle = '#1a1614'; ctx.lineWidth = 0.05;
      ctx.beginPath(); ctx.roundRect(e.x + 0.04, e.y + 0.04, 0.92, 0.92, 0.12); ctx.stroke();
      ctx.fillStyle = '#3a3530';
      for (const [dx, dy] of [[0.24, 0.5], [0.76, 0.5], [0.5, 0.7]]) { ctx.beginPath(); ctx.arc(e.x + dx, e.y + dy, 0.045, 0, Math.PI * 2); ctx.fill(); }
      break;
    }
    case 'robotfab': case 'hangar': case 'foundry': case 'heavyworks': {
      const spr = getSprite(e.kind === 'robotfab' ? 'robot-fab' : e.kind) ?? getSprite('robot-fab') ?? getSprite('assembler');
      if (spr) drawSprite(ctx, spr, e.x, e.y);
      else { ctx.fillStyle = '#2f3b4a'; ctx.beginPath(); ctx.roundRect(e.x + 0.06, e.y + 0.06, 2.88, 2.88, 0.2); ctx.fill(); }
      const def = ROBOTS[e.type];
      // a small hologram of what it is building, plus a build bar and a plate-stock bar along the bottom
      const icon = getSprite(`robot-${e.type}`);
      if (icon) {
        const sc = Math.min(1, 0.55 + def.scale * 0.15) / def.scale;
        ctx.save();
        ctx.globalAlpha = 0.82;
        ctx.translate(e.x + 1.5, e.y + 1.7);
        ctx.scale(sc, sc);
        drawSprite(ctx, icon, -def.scale / 2, -def.scale * 0.92);
        ctx.restore();
      }
      const barW = 2.3, bx = e.x + 0.35, by = e.y + 2.62;
      ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(bx - 0.03, by - 0.03, barW + 0.06, 0.2);
      ctx.fillStyle = '#4aa8ff'; ctx.fillRect(bx, by, barW * Math.min(1, e.progress / def.buildTime), 0.06);
      let loaded = 1; // how complete the set of plates for the next robot is: the scarcest kind decides
      for (const k in def.cost) loaded = Math.min(loaded, (e.inv[k as ItemId] ?? 0) / (def.cost[k as ItemId] ?? 1));
      ctx.fillStyle = '#e9c46a'; ctx.fillRect(bx, by + 0.08, barW * Math.min(1, loaded), 0.06);
      break;
    }
    case 'core': {
      const hurt = e.hp < e.maxHp * 0.45 ? getSprite('core-damaged') : undefined; // cracked and smoking when badly hurt
      const spr = hurt ?? getSprite('core');
      if (spr) { drawSprite(ctx, spr, e.x + (hurt ? -0.15 : 0), e.y + (hurt ? -0.2 : 0)); break; }
      const cx = e.x + 1.5, cy = e.y + 1.5;
      ctx.fillStyle = '#1f1b18';
      ctx.beginPath(); ctx.roundRect(e.x + 0.04, e.y + 0.04, 2.92, 2.92, 0.2); ctx.fill();
      ctx.strokeStyle = '#0d0a09'; ctx.lineWidth = 0.06; ctx.stroke();
      ctx.fillStyle = '#39332d';
      ctx.beginPath(); ctx.roundRect(e.x + 0.22, e.y + 0.22, 2.56, 2.56, 0.16); ctx.fill();
      ctx.fillStyle = '#7d7368';
      for (const [dx, dy] of [[0.4, 0.4], [2.6, 0.4], [0.4, 2.6], [2.6, 2.6]]) {
        ctx.beginPath(); ctx.arc(e.x + dx, e.y + dy, 0.09, 0, Math.PI * 2); ctx.fill();
      }
      const pulse = 0.5 + Math.sin(time * 2.2) * 0.5;
      const g = ctx.createRadialGradient(cx, cy, 0.05, cx, cy, 1.15);
      g.addColorStop(0, `rgba(255,236,170,${0.95})`);
      g.addColorStop(0.45, `rgba(255,140,40,${0.75 + pulse * 0.2})`);
      g.addColorStop(1, 'rgba(255,90,20,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx, cy, 1.15, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#0d0a09'; ctx.lineWidth = 0.05;
      ctx.beginPath(); ctx.arc(cx, cy, 0.62, 0, Math.PI * 2); ctx.stroke();
      break;
    }
    case 'inserter': {
      let a = Math.PI; // arm angle in the inserter's frame: front = 0, back (the pickup side) = PI
      if (e.state === 'toDrop') a = Math.PI * (1 - e.t / SWING_TIME);
      else if (e.state === 'back') a = Math.PI * (e.t / SWING_TIME);
      const base = getSprite('inserter-base');
      const arm = getSprite(e.held ? 'inserter-arm' : 'inserter-arm-open');
      if (base && arm) {
        drawSprite(ctx, base, e.x, e.y);
        ctx.translate(e.x + 0.5, e.y + 0.5);
        ctx.rotate((e.dir * Math.PI) / 2 + a);
        drawSprite(ctx, arm, 0, 0);
        if (e.held) drawItem(ctx, e.held, 0.88, 0, 0.3); // the carried item sits in the claw
        break;
      }
      // procedural fallback until the sprites load
      ctx.translate(e.x + 0.5, e.y + 0.5);
      ctx.rotate((e.dir * Math.PI) / 2);
      ctx.fillStyle = '#4a4f55';
      ctx.beginPath(); ctx.roundRect(-0.3, -0.3, 0.6, 0.6, 0.08); ctx.fill();
      ctx.strokeStyle = '#1b1613';
      ctx.lineWidth = 0.03;
      ctx.stroke();
      const tx = Math.cos(a) * 0.42, ty = Math.sin(a) * 0.42;
      ctx.strokeStyle = '#b8742e';
      ctx.lineWidth = 0.1;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(tx, ty); ctx.stroke();
      ctx.fillStyle = e.held ? ITEMS[e.held].color : '#e6b422';
      ctx.beginPath(); ctx.arc(tx, ty, e.held ? 0.11 : 0.07, 0, Math.PI * 2); ctx.fill();
      break;
    }
  }
  ctx.restore();

  if (e.kind === 'inserter' && e.filter) { // a filtered inserter shows what it moves
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.beginPath(); ctx.arc(e.x + 0.78, e.y + 0.22, 0.22, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ffb347'; ctx.lineWidth = 0.04; ctx.stroke();
    drawItem(ctx, e.filter, e.x + 0.78, e.y + 0.22, 0.34);
  }
  if (e.kind === 'coil') { // charge gauge along the bottom: full and blue when ready
    const f = Math.max(0, Math.min(1, (e.charge ?? 0) / COIL_CHARGE_MAX));
    ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(e.x + 0.2, e.y + e.h - 0.17, e.w - 0.4, 0.14);
    ctx.fillStyle = f >= 0.999 ? '#7fd0ff' : '#3f8fd0'; ctx.fillRect(e.x + 0.23, e.y + e.h - 0.14, (e.w - 0.46) * f, 0.08);
  }
  if (isFab(e) && world) { // room gauge: one pip for each of its spaces; filled pips are robots it has fielded
    const used = fabRoomUsed(world, e.id);
    const pw = (e.w - 0.4) / FAB_CAPACITY;
    ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(e.x + 0.18, e.y - 0.26, e.w - 0.36, 0.24);
    for (let k = 0; k < FAB_CAPACITY; k++) {
      ctx.fillStyle = k < used ? (used >= FAB_CAPACITY ? '#ff8a3a' : '#6cc8ff') : '#3a3632';
      ctx.fillRect(e.x + 0.2 + k * pw + 0.012, e.y - 0.22, pw - 0.03, 0.16);
    }
  }
  if (e.kind === 'miner' && !getSprite('miner')) {
    // output marker on the edge the drill feeds (the sprite has its own chute)
    const o = minerContacts(e)[0];
    ctx.save();
    ctx.translate(o.x + 0.5 - DX[e.dir] * 0.5, o.y + 0.5 - DY[e.dir] * 0.5);
    ctx.rotate((e.dir * Math.PI) / 2);
    ctx.fillStyle = '#ffc93c';
    ctx.beginPath(); ctx.moveTo(0.14, 0); ctx.lineTo(-0.1, -0.16); ctx.lineTo(-0.1, 0.16); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
}

