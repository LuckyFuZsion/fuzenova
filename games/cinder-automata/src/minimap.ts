// The minimap: the explored area at a glance (ore, rocks, buildings, enemies, your robots and where the camera is).
// Click or drag on it to move the camera.
import { ORE_COLORS } from './sim/items';
import type { Camera } from './render';
import type { World } from './sim/world';

const SIZE = 190; // CSS pixels
const KIND_COLOR: Record<string, string> = {
  core: '#ffb040', turret: '#ffd27a', wall: '#8d867c', coil: '#7fc8ff', generator: '#ff8a3a', pole: '#62d6c4', robotfab: '#9ec1ff',
  miner: '#c7bcae', furnace: '#d9845a', assembler: '#b9a6e8', belt: '#6d665d', inserter: '#8c857a',
};

export class Minimap {
  private canvas = document.getElementById('minimap') as HTMLCanvasElement;
  private ctx = this.canvas.getContext('2d')!;
  private layer = document.createElement('canvas');
  private layerKey = '';
  private layerAt = 0;
  private dragging = false;
  private dpr = 1;
  // where the drawn square sits: world tile (ox, oy) at the top-left, `scale` pixels per tile
  private ox = 0; private oy = 0; private scale = 1;

  constructor(private getWorld: () => World, private getCam: () => Camera, private getView: () => { w: number; h: number }, private setCenter: (x: number, y: number) => void) {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = this.layer.width = Math.floor(SIZE * this.dpr);
    this.canvas.height = this.layer.height = Math.floor(SIZE * this.dpr);
    const move = (e: PointerEvent) => {
      const r = this.canvas.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width * SIZE, py = (e.clientY - r.top) / r.height * SIZE;
      this.setCenter(this.ox + px / this.scale, this.oy + py / this.scale);
    };
    this.canvas.addEventListener('pointerdown', (e) => { this.dragging = true; this.canvas.setPointerCapture(e.pointerId); move(e); e.stopPropagation(); });
    this.canvas.addEventListener('pointermove', (e) => { if (this.dragging) move(e); });
    this.canvas.addEventListener('pointerup', () => { this.dragging = false; });
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  /** Works out the drawn square: the explored area plus a little margin, fitted into the canvas. */
  private frame(world: World): void {
    const a = world.arena, m = 2;
    const w = a.x1 - a.x0 + 2 * m, h = a.y1 - a.y0 + 2 * m;
    this.scale = SIZE / Math.max(w, h);
    this.ox = a.x0 - m - (SIZE / this.scale - w) / 2;
    this.oy = a.y0 - m - (SIZE / this.scale - h) / 2;
  }

  /** The parts that change slowly (ground, ore, rocks): drawn to an offscreen canvas now and then. */
  private buildLayer(world: World): void {
    const g = this.layer.getContext('2d')!;
    const s = this.scale * this.dpr;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = '#0c0a09'; g.fillRect(0, 0, this.layer.width, this.layer.height);
    const a = world.arena;
    const x0 = Math.max(0, Math.floor(this.ox)), y0 = Math.max(0, Math.floor(this.oy));
    const x1 = Math.min(world.w, Math.ceil(this.ox + SIZE / this.scale)), y1 = Math.min(world.h, Math.ceil(this.oy + SIZE / this.scale));
    const cell = Math.ceil(s) + 0.5;
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const inside = world.plots ? world.inArena(x, y) : x >= a.x0 && x < a.x1 && y >= a.y0 && y < a.y1;
        const i = y * world.w + x;
        const t = world.terrain[i], o = world.ore[i];
        let col: string | null = null;
        if (t) col = t === 1 ? '#6e675f' : t === 2 ? '#3a2a20' : t === 4 ? '#16301a' : '#191620';
        else if (o && world.oreLeft[i] > 0) col = ORE_COLORS[o];
        else if (world.mud[i]) col = '#4a3826';
        else if (inside) col = '#2a2521';
        if (!col) continue;
        if (!inside && world.plots) continue; // locked land stays blank until it is opened
        g.globalAlpha = inside ? 1 : 0.35;
        g.fillStyle = col;
        g.fillRect((x - this.ox) * s, (y - this.oy) * s, cell, cell);
      }
    }
    g.globalAlpha = 1;
    g.strokeStyle = 'rgba(255,170,70,0.7)'; g.lineWidth = this.dpr;
    g.strokeRect((a.x0 - this.ox) * s, (a.y0 - this.oy) * s, (a.x1 - a.x0) * s, (a.y1 - a.y0) * s);
  }

  draw(): void {
    const world = this.getWorld();
    this.frame(world);
    const a = world.arena;
    const key = `${a.x0},${a.y0},${a.x1},${a.y1}`;
    const now = performance.now();
    if (key !== this.layerKey || now - this.layerAt > 3000) { this.layerKey = key; this.layerAt = now; this.buildLayer(world); }
    const g = this.ctx, d = this.dpr, s = this.scale * d;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(this.layer, 0, 0);
    const px = (x: number) => (x - this.ox) * s, py = (y: number) => (y - this.oy) * s;
    for (const e of world.entities.values()) {
      g.fillStyle = KIND_COLOR[e.kind] ?? '#c7bcae';
      const belt = e.kind === 'belt' || e.kind === 'inserter';
      g.globalAlpha = belt ? 0.7 : 1;
      const size = Math.max(belt ? 1 : 2 * d, 0);
      g.fillRect(px(e.x), py(e.y), Math.max(e.w * s, size), Math.max(e.h * s, size));
    }
    g.globalAlpha = 1;
    g.fillStyle = '#5fd0ff';
    for (const r of world.soldiers) g.fillRect(px(r.x) - d, py(r.y) - d, 2 * d, 2 * d);
    const pulse = 0.6 + 0.4 * Math.sin(now / 160);
    for (const en of world.enemies) {
      const boss = en.kind === 'brute-3' || en.kind === 'boss-colossus' || en.kind === 'boss-queen';
      g.fillStyle = boss ? `rgba(255,60,50,${pulse})` : '#ff5a3a';
      const r = (boss ? 3.5 : 1.3) * d;
      g.beginPath(); g.arc(px(en.x), py(en.y), r, 0, Math.PI * 2); g.fill();
    }
    for (const h of world.hurt) { // live attack glow: a hot red-orange bloom where something is being hit right now
      const k = 1 - h.age / 1.5, r = (5 + 3 * Math.sin(now / 90)) * d;
      const grad = g.createRadialGradient(px(h.x), py(h.y), 0, px(h.x), py(h.y), r * 1.6);
      grad.addColorStop(0, `rgba(255,235,160,${0.95 * k})`); grad.addColorStop(0.35, `rgba(255,110,40,${0.75 * k})`); grad.addColorStop(1, 'rgba(255,40,20,0)');
      g.fillStyle = grad; g.beginPath(); g.arc(px(h.x), py(h.y), r * 1.6, 0, Math.PI * 2); g.fill();
    }
    for (const a of world.alerts) { // a ring spreading out from where something spawned
      const p = (a.age * 0.9) % 1;
      g.strokeStyle = `rgba(${a.big ? '255,150,40' : '255,70,50'},${(1 - p) * Math.min(1, (1 - a.age / a.life) * 2.5)})`; g.lineWidth = 1.5 * d;
      g.beginPath(); g.arc(px(a.x), py(a.y), (3 + p * (a.big ? 16 : 10)) * d, 0, Math.PI * 2); g.stroke();
    }
    // the part of the map on screen
    const cam = this.getCam(), v = this.getView();
    const hw = v.w / 2 / cam.zoom, hh = v.h / 2 / cam.zoom;
    g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = Math.max(1, d);
    g.strokeRect(px(cam.x - hw), py(cam.y - hh), hw * 2 * s, hh * 2 * s);
  }
}
