// Mood for the battlefield: ground variation, soft shadows, dusk lighting with glows, vignette.
// Everything here is drawing only and cheap enough to run every frame.
import { hash } from './sim/mapgen';
import type { Entity, World } from './sim/world';
import type { Camera, View } from './render';
import { ROBOTS } from './sim/robots';

// ---------- ground variation ----------
const NOISE_PX = 192;
let noiseTex: HTMLCanvasElement | undefined;

/** A soft low-frequency dark/light blotch texture, made once; tiled over the ground so the repeat isn't obvious. */
function buildNoise(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = NOISE_PX;
  const cx = c.getContext('2d')!;
  const img = cx.createImageData(NOISE_PX, NOISE_PX);
  const lattice = (x: number, y: number, freq: number, seed: number) => hash(((x % freq) + freq) % freq, ((y % freq) + freq) % freq, seed);
  const smooth = (u: number, v: number, freq: number, seed: number) => {
    const x0 = Math.floor(u * freq), y0 = Math.floor(v * freq);
    const fx = u * freq - x0, fy = v * freq - y0;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const a = lattice(x0, y0, freq, seed), b = lattice(x0 + 1, y0, freq, seed), c2 = lattice(x0, y0 + 1, freq, seed), d = lattice(x0 + 1, y0 + 1, freq, seed);
    return a + (b - a) * sx + (c2 - a) * sy + (a - b - c2 + d) * sx * sy;
  };
  for (let y = 0; y < NOISE_PX; y++) {
    for (let x = 0; x < NOISE_PX; x++) {
      const u = x / NOISE_PX, v = y / NOISE_PX; // tileable: lattice wraps at each frequency
      const n = smooth(u, v, 3, 101) * 0.55 + smooth(u, v, 6, 202) * 0.3 + smooth(u, v, 12, 303) * 0.15;
      const i = (y * NOISE_PX + x) * 4;
      // above 0.5 lightens the ground a touch (warm ash), below darkens it (soot)
      const d = n - 0.5;
      img.data[i] = d > 0 ? 200 : 0; img.data[i + 1] = d > 0 ? 180 : 0; img.data[i + 2] = d > 0 ? 150 : 0;
      img.data[i + 3] = Math.min(255, Math.abs(d) * 2 * 150);
    }
  }
  cx.putImageData(img, 0, 0);
  return c;
}

/** Blotchy tint over the base ground plus darkened map edges. Call after the ground texture, in tile space. */
export function drawGroundMood(ctx: CanvasRenderingContext2D, world: World, x0: number, x1: number, y0: number, y1: number): void {
  noiseTex ??= buildNoise();
  const S = 18; // tiles per noise tile
  ctx.globalAlpha = 0.85;
  for (let sy = Math.floor(y0 / S); sy <= Math.floor(y1 / S); sy++) {
    for (let sx = Math.floor(x0 / S); sx <= Math.floor(x1 / S); sx++) ctx.drawImage(noiseTex, sx * S, sy * S, S, S);
  }
  ctx.globalAlpha = 1;
  // the world simply ends: fade the last few tiles into the dark surround
  const E = 7;
  const edge = (gx0: number, gy0: number, gx1: number, gy1: number, rx: number, ry: number, rw: number, rh: number) => {
    const g = ctx.createLinearGradient(gx0, gy0, gx1, gy1);
    g.addColorStop(0, 'rgba(6,5,5,0.85)'); g.addColorStop(1, 'rgba(6,5,5,0)');
    ctx.fillStyle = g; ctx.fillRect(rx, ry, rw, rh);
  };
  if (x0 < E) edge(0, 0, E, 0, 0, 0, E, world.h);
  if (x1 > world.w - E) edge(world.w, 0, world.w - E, 0, world.w - E, 0, E, world.h);
  if (y0 < E) edge(0, 0, 0, E, 0, 0, world.w, E);
  if (y1 > world.h - E) edge(0, world.h, 0, world.h - E, 0, world.h - E, world.w, E);
}

// ---------- shadows ----------
/** Soft shadows under buildings, built from a few stacked translucent shapes. Draw before the buildings. */
export function drawShadows(ctx: CanvasRenderingContext2D, list: Entity[]): void {
  ctx.fillStyle = '#000';
  for (const e of list) {
    if (e.kind === 'belt' || e.kind === 'inserter' || e.kind === 'pole') continue;
    const round = e.kind === 'turret' || e.kind === 'generator';
    for (let k = 0; k < 4; k++) {
      const grow = 0.02 + k * 0.05;
      ctx.globalAlpha = 0.085;
      if (round) {
        ctx.beginPath(); ctx.ellipse(e.x + e.w / 2 + 0.16, e.y + e.h / 2 + 0.2, e.w / 2 + grow, e.h / 2 + grow, 0, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.beginPath(); ctx.roundRect(e.x + 0.12 - grow, e.y + 0.18 - grow, e.w + grow * 2, e.h + grow * 2, 0.25); ctx.fill();
      }
    }
  }
  ctx.globalAlpha = 1;
}

// ---------- dusk lighting ----------
let lightCv: HTMLCanvasElement | undefined;

interface Light { x: number; y: number; r: number; a: number; color: string }

function collectLights(world: World, list: Entity[]): Light[] {
  const lights: Light[] = [];
  const t = world.anim;
  for (const e of list) {
    const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
    if (e.kind === 'core') lights.push({ x: cx, y: cy, r: 7.5 + Math.sin(t * 2.2) * 0.3, a: 1, color: '255,150,60' });
    else if (e.kind === 'coil') {
      lights.push({ x: cx, y: cy, r: 2.6 + (e.flash > 0 ? 3.6 * Math.min(1, e.flash * 4) : 0), a: e.flash > 0 ? 0.95 : 0.35, color: '120,180,255' });
    } else if (e.kind === 'generator' && e.fuelSecs > 0) {
      lights.push({ x: cx, y: cy + 0.4, r: 3.4 + Math.sin(t * 9 + e.id) * 0.2, a: 0.7, color: '255,150,50' });
    } else if (e.kind === 'furnace' && e.progress > 0) lights.push({ x: cx, y: cy + 0.5, r: 3.6, a: 0.85, color: '255,130,40' });
    else if (e.kind === 'turret') {
      lights.push({ x: cx, y: cy, r: 2.2, a: 0.28, color: '255,170,80' });
      if (e.cooldown > 0.2) lights.push({ x: cx + Math.cos(e.aim) * 1.5, y: cy + Math.sin(e.aim) * 1.5, r: 4.2, a: 0.7, color: '255,200,110' });
    } else if (e.kind === 'robotfab') lights.push({ x: cx, y: cy, r: 3.4, a: 0.65, color: '90,170,255' });
    else if (e.kind === 'miner' && !e.pending && e.progress > 0) lights.push({ x: cx, y: cy, r: 1.8, a: 0.25, color: '255,190,90' });
  }
  for (const f of world.fx) {
    if (f.name === 'fx-smoke-2') continue;
    const life = 1 - f.age / f.dur;
    lights.push({ x: f.x, y: f.y, r: f.size * (f.grow ? 2.4 : 1.6), a: Math.max(0, life) * (f.grow ? 0.95 : 0.7), color: '255,170,80' });
  }
  for (const s of world.soldiers) {
    const def = ROBOTS[s.type];
    lights.push({ x: s.x, y: s.y - def.scale * 0.45, r: 0.7 + def.scale * 0.5, a: 0.55, color: '90,170,255' });
  }
  return lights;
}

/**
 * Dims the whole scene to dusk, then cuts soft holes at every light and adds a warm or cool glow there.
 * Runs in screen space after the world is drawn (before selection outlines and the build ghost).
 */
export function drawLighting(ctx: CanvasRenderingContext2D, world: World, list: Entity[], cam: Camera, view: View): void {
  const { w: vw, h: vh, dpr } = view;
  const W = Math.floor(vw * dpr), H = Math.floor(vh * dpr);
  if (W < 1 || H < 1) return; // the window has no size yet (a hidden or just-opened tab): nothing to light
  lightCv ??= document.createElement('canvas');
  if (lightCv.width !== W || lightCv.height !== H) { lightCv.width = W; lightCv.height = H; }
  const lc = lightCv.getContext('2d')!;
  lc.setTransform(1, 0, 0, 1, 0, 0);
  lc.globalCompositeOperation = 'source-over';
  lc.clearRect(0, 0, W, H);
  lc.fillStyle = 'rgba(9,11,28,0.34)'; // cool dusk over everything
  lc.fillRect(0, 0, W, H);
  const vig = lc.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.hypot(W, H) * 0.55);
  vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, 'rgba(0,0,0,0.38)');
  lc.fillStyle = vig; lc.fillRect(0, 0, W, H);

  const px = cam.zoom * dpr;
  const sx = (x: number) => ((x - cam.x) * cam.zoom + vw / 2) * dpr;
  const sy = (y: number) => ((y - cam.y) * cam.zoom + vh / 2) * dpr;
  const lights = collectLights(world, list).filter((l) => {
    const rad = l.r * px;
    return sx(l.x) > -rad && sx(l.x) < W + rad && sy(l.y) > -rad && sy(l.y) < H + rad;
  });

  lc.globalCompositeOperation = 'destination-out'; // light punches holes in the darkness
  for (const l of lights) {
    const rad = l.r * px, x = sx(l.x), y = sy(l.y);
    const g = lc.createRadialGradient(x, y, rad * 0.08, x, y, rad);
    g.addColorStop(0, `rgba(0,0,0,${Math.min(1, l.a)})`);
    g.addColorStop(0.55, `rgba(0,0,0,${Math.min(1, l.a) * 0.45})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    lc.fillStyle = g;
    lc.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(lightCv, 0, 0);
  ctx.globalCompositeOperation = 'lighter'; // and a tinted glow on top
  for (const l of lights) {
    const rad = l.r * px * 0.9, x = sx(l.x), y = sy(l.y);
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, `rgba(${l.color},${0.2 * Math.min(1, l.a)})`);
    g.addColorStop(1, `rgba(${l.color},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  ctx.restore();
}

