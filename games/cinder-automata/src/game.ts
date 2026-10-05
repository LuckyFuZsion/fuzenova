import { ENEMIES } from './sim/enemies';
import { problemOf } from './sim/status';
import { inspectHtml, pickTarget, type Target } from './inspect';
import type { RangeRing } from './render';
import { COIL_RANGE, TURRET_RANGE } from './sim/combat';
import { ResearchPanel } from './researchui';
import { FilterPicker } from './filterui';
import { EntityPicker } from './pickerui';
import { VARIANTS } from './sim/turrets';
import { recipeUnlocked, robotUnlocked } from './sim/research';
import { fabRoomUsed } from './sim/combat';
import { FAB_CAPACITY, ROBOT_SPACE } from './sim/robots';
import { Minimap } from './minimap';
import { audio, type SfxName } from './audio';
import { DEFAULT_COMMANDER, commanderById, modsFor, starsForLevel } from './sim/commanders';
import { recordWin, unlockCommander } from './progress';
import { DEFAULT_DIFFICULTY, type DifficultyId } from './sim/difficulty';
import { ACHIEVEMENTS } from './sim/achievements';
import { CORE_TILE, LEGACY_CORE, LEGACY_SEED, generateWorld } from './sim/mapgen';
import { evictUnits } from './sim/pathfind';
import { nearestFirst, plotCandidates, plotLabel, plotsBounds } from './sim/plots';
import { ORE_INTRO, knownOres, plotSummary } from './plotui';
import { BOONS, boonById, boonLevel, rollBoons } from './sim/roguelite';
import { bumpLevel, levelOf, techById } from './sim/research';
import { Run } from './sim/round';
import { ROBOTS, ROBOT_ORDER } from './sim/robots';
import { ORE_ITEM, ORE_KINDS, ORE_NAMES, RECIPE_LIST, RECIPES } from './sim/items';
import { START_STOCK, addStock, canAfford, costShort, costText, missing, refund, spend } from './sim/costs';
import { clearSave, loadSave, restoreRun, saveRun } from './save';
import { addOrePatch, hash } from './sim/mapgen';

const MODULE_RADIUS = 4.2;
import {
  ASSEMBLER_OUT_MAX, DX, DY, ITEMS, faceBeltEnds, footprint, opposite, KINDS, createEntity, type Belt, type Dir, type Entity, type Inserter, type ItemId, type Kind, type World,
} from './sim/world';
import { POLE_REACH, POLE_SUPPLY } from './sim/power';
import { render, type Camera } from './render';
import { kindIcon } from './icons';
import { Menu } from './menu';
import { TUTORIAL_PATCH, TUTORIAL_STEPS } from './tutorial';
import { TOOL_HELP, loadSeen, saveSeen } from './toolhelp';
import { itemIconUrl, loadSprites } from './sprites';
import { Discoveries } from './discoveries';

const STEP = 1 / 60;
/** The build bar, in groups. Keys stay fixed per building whatever order they are shown in. */
const TOOL_GROUPS: { name: string; tools: { kind: Kind; key: string }[] }[] = [
  { name: 'Logistics', tools: [{ kind: 'belt', key: '1' }, { kind: 'inserter', key: '2' }, { kind: 'junction', key: 'j' }, { kind: 'splitter', key: 'k' }] },
  { name: 'Production', tools: [{ kind: 'miner', key: '3' }, { kind: 'furnace', key: '4' }, { kind: 'assembler', key: '9' }, { kind: 'robotfab', key: '7' }, { kind: 'scrapbin', key: 'b' }] },
  { name: 'Defence', tools: [{ kind: 'turret', key: '6' }, { kind: 'wall', key: '8' }, { kind: 'coil', key: '=' }] },
  { name: 'Power', tools: [{ kind: 'pole', key: '0' }, { kind: 'generator', key: '-' }] },
];
export const TOOLS = TOOL_GROUPS.flatMap((g) => g.tools);
const DIR_NAMES = ['east', 'south', 'west', 'north'];

interface Tile { x: number; y: number }

const clock = (s: number): string => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.floor(Math.max(0, s) % 60)).padStart(2, '0')}`;

/** A fresh run. For quick play-testing add ?build=20&fight=60 (seconds) to the page address. */
function newRun(tutorial = false, commander = DEFAULT_COMMANDER, difficulty: string = DEFAULT_DIFFICULTY): Run {
  const world = generateWorld(tutorial ? undefined : randomSeed());
  if (!tutorial) world.mods = modsFor(commanderById(commander));
  world.place('core', tutorial ? LEGACY_CORE.x : CORE_TILE.x, tutorial ? LEGACY_CORE.y : CORE_TILE.y, 0);
  if (tutorial) {
    // a small, generous iron patch close to the core, an untimed build phase and a short, gentle fight
    const { x: px, y: py, r } = TUTORIAL_PATCH;
    for (let y = Math.floor(py - r); y <= Math.ceil(py + r); y++) {
      for (let x = Math.floor(px - r); x <= Math.ceil(px + r); x++) {
        if (!world.inBounds(x, y) || Math.hypot(x + 0.5 - px, y + 0.5 - py) > r) continue;
        world.ore[y * world.w + x] = 1;
        world.oreLeft[y * world.w + x] = 900;
      }
    }
    world.terrain.fill(0); // the tutorial ground is clear
    world.mud.fill(0);
    return new Run(world, { buildSeconds: 1e9, fightSeconds: 70, arenaHalf: 17 }); // tutorial: freeBuild stays on, nothing costs anything; a small map
  }
  world.freeBuild = false;
  addStock(world, START_STOCK, world.mods.startStock);
  return new Run(world, { difficulty: difficulty as DifficultyId, omens: true, ...runOptions() });
}

/** A new seed for every run (?seed=123 in the page address replays a particular map and set of omens). */
function randomSeed(): number {
  const q = Number(new URLSearchParams(location.search).get('seed'));
  if (q > 0 && q !== LEGACY_SEED) return Math.floor(q);
  let s = LEGACY_SEED;
  while (s === LEGACY_SEED) s = 1 + Math.floor(Math.random() * 999999);
  return s;
}

function runOptions() {
  const q = new URLSearchParams(location.search);
  const num = (k: string) => (q.has(k) && Number(q.get(k)) > 0 ? Number(q.get(k)) : undefined);
  return { buildSeconds: num('build'), fightSeconds: num('fight') };
}

export class Game {
  run = newRun();
  get world() { return this.run.world; }
  cam: Camera = { x: 80, y: 86.5, zoom: 42 };
  tool: Kind | null = null;
  dir: Dir = 0;
  paused = false;
  /** The run only ticks once the player has pressed Start, so the title screen and intro don't eat build time. */
  started = false;

  start(): void {
    this.started = true;
    const core = this.world.core;
    if (core) { this.cam.x = core.x + core.w / 2; this.cam.y = core.y + core.h / 2 - 2; }
    this.updateMusic();
    if (this.world.plots && this.tutorialStep === null && this.run.level === 1 && this.world.plots.size === 1) {
      this.flash = { text: 'Only the ground round your core is explored, and it holds iron ore. Win fights to open more land.', until: performance.now() + 9000 };
    }
  }

  private bossMusic = false;

  /** Fast-forward: 1, 2 or 4 simulation steps per frame. F cycles it; the speed buttons set it; it drops back to 1 when a level ends. */
  speed = 1;

  setSpeed(s: number): void {
    this.speed = s;
    document.querySelectorAll('#speed button').forEach((b) => b.classList.toggle('on', Number((b as HTMLElement).dataset.speed) === s));
  }

  /** The reach of one building, as a circle: gun turrets, Storm coils and the area a power pole supplies. */
  private ringFor(e: Entity, faint = false): RangeRing | null {
    const x = e.x + e.w / 2, y = e.y + e.h / 2, fx = this.world.rfx;
    if (e.kind === 'turret') return { x, y, r: VARIANTS[e.variant ?? 'gun'].range * fx.turretRange, color: 'amber', faint };
    if (e.kind === 'coil') return { x, y, r: COIL_RANGE * fx.coilRange, color: 'blue', faint };
    if (e.kind === 'pole') return { x, y, r: POLE_SUPPLY, color: 'teal', faint };
    return null;
  }

  /** Range circles to draw this frame: the building under the cursor, a robot under the cursor, and while placing a turret or coil, every one already standing. */
  private rangeRings(hovered: Entity | undefined, ghost: { kind: Kind; x: number; y: number } | null): RangeRing[] {
    const out: RangeRing[] = [];
    if (this.moving) return out;
    const tool = this.tool;
    if (tool === 'turret' || tool === 'coil' || tool === 'pole') {
      for (const e of this.world.entities.values()) if (e.kind === tool) { const r = this.ringFor(e, true); if (r) out.push(r); }
      if (ghost) { const s = KINDS[tool]; const r = this.ringFor({ ...createEntity(tool, 0, ghost.x, ghost.y, 0), w: s.w, h: s.h } as Entity); if (r) out.push(r); }
    } else if (hovered) {
      const r = this.ringFor(hovered);
      if (r) out.push(r);
    } else if (this.mouse.inside) {
      const p = this.screenToWorld(this.mouse.sx, this.mouse.sy);
      const s = this.world.soldiers.find((q) => Math.hypot(q.x - p.x, q.y - p.y) < ROBOTS[q.type].scale / 2 + 0.25);
      if (s) out.push({ x: s.x, y: s.y, r: ROBOTS[s.type].range * this.world.rfx.robotRange, color: 'green' });
    }
    return out;
  }
  private facedVersion = -1;

  /** Machine hum and weather, set from what is on screen: busy factories are louder, nearer machines count more. Only while the factory runs. */
  private updateAmbience(): void {
    if (!this.started) { audio.stopBeds(); return; }
    const r = this.run, w = this.world, fight = r.phase === 'fight', running = fight || r.cooldownLeft > 0;
    const tl = this.screenToWorld(0, 0), br = this.screenToWorld(this.view.w, this.view.h);
    const cx = (tl.x + br.x) / 2, cy = (tl.y + br.y) / 2, reach = Math.hypot(br.x - tl.x, br.y - tl.y) / 2 + 2;
    const n: Record<string, number> = {};
    if (running) {
      for (const e of w.entities.values()) {
        const x = e.x + e.w / 2, y = e.y + e.h / 2;
        const d = Math.hypot(x - cx, y - cy);
        if (d > reach) continue;
        const near = 1 - 0.7 * (d / reach); // machines in the middle of the screen count more than ones at the edge
        let key: string | null = null;
        if (e.kind === 'miner') key = 'loop-drill';
        else if (e.kind === 'furnace' && (e.inCount > 0 || e.outCount > 0)) key = 'loop-smelter';
        else if (e.kind === 'assembler' && (e.progress > 0 || e.out > 0)) key = 'loop-assembler';
        else if (e.kind === 'generator' && e.fuelSecs > 0) key = 'loop-generator';
        else if (e.kind === 'coil' && (w.power?.netOf.has(e.id))) key = 'loop-coil-idle';
        else if (e.kind === 'belt' && e.items.length > 0) key = 'loop-belt';
        if (key) n[key] = (n[key] ?? 0) + near;
      }
    }
    const BASE: Record<string, number> = { 'loop-drill': 0.8, 'loop-smelter': 0.9, 'loop-assembler': 0.7, 'loop-belt': 0.5, 'loop-generator': 0.8, 'loop-coil-idle': 0.5 };
    for (const k of Object.keys(BASE)) audio.setBed(k as SfxName, BASE[k] * (1 - Math.exp(-0.9 * (n[k] ?? 0))));
    audio.setBed('loop-ambience-ash', fight ? 0 : 0.6);
    audio.setBed('loop-ambience-fight', fight ? 0.5 : 0);
  }

  /** Battle tracks for this level range, best first (missing ones fall back to the next). */
  private fightTracks(): string[] {
    const l = this.run.level;
    return l < 10 ? ['fight-1'] : l < 20 ? ['fight-2', 'fight-1'] : ['fight-3', 'fight-2', 'fight-1'];
  }

  /** Is this level's boss on screen, or close to the base? Then it is time for the boss music. */
  private bossInSight(): boolean {
    const r = this.run, b = this.world.enemies.find((e) => e.id === r.bossId);
    if (!b) return false;
    const tl = this.screenToWorld(0, 0), br = this.screenToWorld(this.view.w, this.view.h);
    if (b.x > tl.x - 1 && b.x < br.x + 1 && b.y > tl.y - 1 && b.y < br.y + 1) return true;
    const c = this.world.core;
    return !!c && Math.hypot(b.x - (c.x + c.w / 2), b.y - (c.y + c.h / 2)) < 26;
  }

  /** In the quiet between waves the calm build track fades in; when the next wave starts the battle track comes back. */
  private lullMusic = false;
  private lullSince = 0;
  private checkLullMusic(): void {
    const lull = this.run.inLull() && !(this.run.bossId !== 0);
    this.lullSince = lull ? this.lullSince + 0.25 : 0;
    if (!this.lullMusic && lull && this.lullSince >= 2) { // two clear seconds, so a brief gap between packs does not flap the music
      this.lullMusic = true;
      void audio.playMusic('build', 3);
    } else if (this.lullMusic && !lull) {
      this.lullMusic = false;
      void audio.playFirstMusic(this.fightTracks(), 1.5);
    }
  }
  private checkBossMusic(): void {
    if (this.bossMusic || this.run.phase !== 'fight' || !this.run.boss() || !this.bossInSight()) return;
    this.bossMusic = true;
    void audio.playMusic('boss', 3);
  }

  /** Music follows the phase: calm while building, a fight track (by level) during fights. Missing tracks are just silence. */
  private updateMusic(): void {
    const r = this.run;
    if (r.phase === 'build') {
      void audio.playMusic('build', 2.5);
      // get the coming fight's tracks ready during the build phase, and free the rest
      const fight = this.fightTracks();
      const want = [...fight, ...(r.boss() ? ['boss'] : []), 'victory', 'defeat'];
      audio.keepMusic(['build', ...want]);
      void audio.preloadMusic(want);
    }
    else if (r.phase === 'fight') {
      // every fight opens with the battle track for its level range; on boss levels it switches to the boss track once the boss is in sight
      this.bossMusic = false;
      this.lullMusic = false;
      void audio.playFirstMusic(this.fightTracks(), 1.5);
    }
    else if (r.phase === 'won') void audio.playMusic('victory', 0.3, false).then((ok) => { if (!ok && this.tutorialStep === null) audio.play('ui-level-complete', { volume: 0.9, pitchVar: 0 }); });
    else void audio.playMusic('defeat', 0.3, false).then((ok) => { if (!ok) audio.play('ui-defeat', { volume: 0.9, pitchVar: 0 }); });
  }

  /** Which commander this run is played with (see sim/commanders.ts). */
  commander = DEFAULT_COMMANDER;

  /** Replaces the current run with the last saved one (called from the title screen's Continue button). */
  loadSaved(): boolean {
    const s = loadSave();
    if (!s) return false;
    try { this.run = restoreRun(s, runOptions()); } catch { return false; }
    this.commander = commanderById(s.commander).id;
    this.lastPhase = 'build';
    this.setTool(null);
    this.buildBar();
    return true;
  }

  /** Throws the save away and starts fresh (New game). */
  newGame(commander = DEFAULT_COMMANDER, difficulty: string = DEFAULT_DIFFICULTY): void {
    clearSave();
    this.commander = commanderById(commander).id;
    this.run = newRun(false, this.commander, difficulty);
    this.lastPhase = 'build';
    this.setTool(null);
    this.buildBar();
  }

  private lastPhase = 'build';
  private saveTimer = 0;
  private flash = { text: '', until: 0 };

  /** Saves if this is the calm part of a normal run. Quietly does nothing in the tutorial, mid-fight or after a loss. */
  private autosave(): void {
    if (this.moving) return; // a building is in the player's hand: saving now would lose it
    if (this.tutorialStep === null && this.started && this.run.phase === 'build') saveRun(this.run, this.commander);
  }

  /** null = normal game; otherwise the index of the tutorial step the player is on. */
  tutorialStep: number | null = null;

  /** Swaps in the tutorial map and turns on the guided checklist. */
  beginTutorial(): void {
    this.tutorialStep = 0;
    this.run = newRun(true);
    this.frameTutorial();
    this.seenTools = new Set(); // the tutorial always explains each building fresh
    this.setTool(null);
    this.buildBar();
    document.getElementById('hud')!.classList.add('tut');
    this.tutEl.hidden = false;
    this.tutRendered = -1;
  }

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private view = { w: 0, h: 0, dpr: 1 };
  private keys = new Set<string>();
  private mouse = { sx: 0, sy: 0, inside: false };
  private hoverTile: Tile | null = null;
  /** A building picked up with V, waiting to be put down somewhere else (free, and it keeps its contents). */
  private moving: { e: Entity; ox: number; oy: number; odir: Dir } | null = null;
  minimap = new Minimap(() => this.world, () => this.cam, () => this.view, (x, y) => { this.cam.x = x; this.cam.y = y; });
  private miniT = 0;
  filterPicker = new FilterPicker();
  entityPicker = new EntityPicker(() => this.world, (t, bad) => this.say(t, bad));
  research = new ResearchPanel(() => this.world, (t) => this.say(t));

  /** F3: hover anything to see how it works. */
  private inspectOn = false;
  private inspectEl = document.getElementById('inspect')!;
  private inspectKey = '';

  private toggleInspect(): void {
    this.inspectOn = !this.inspectOn;
    document.getElementById('inspectBtn')!.classList.toggle('on', this.inspectOn);
    this.inspectEl.hidden = true;
    this.inspectKey = '';
    if (this.inspectOn) this.say('Inspect mode: hover over anything to see how it works. F3 turns it off.');
  }

  /** Shows the inspect card for whatever is under the cursor. Called every frame while inspect mode is on. */
  private updateInspect(): void {
    const el = this.inspectEl;
    if (!this.inspectOn || !this.mouse.inside || this.moving || this.menu.isOpen) { el.hidden = true; return; }
    const w = this.screenToWorld(this.mouse.sx, this.mouse.sy);
    const target = pickTarget(this.world, w.x, w.y);
    if (!target) { el.hidden = true; return; }
    const stamp = `${targetId(target)}:${Math.floor(performance.now() / 300)}`;
    if (stamp !== this.inspectKey) { this.inspectKey = stamp; el.innerHTML = inspectHtml(target, this.world); }
    el.hidden = false;
    const r = el.getBoundingClientRect();
    const x = Math.min(this.mouse.sx + 20, innerWidth - r.width - 8);
    const y = Math.min(Math.max(8, this.mouse.sy + 16), innerHeight - r.height - 8);
    el.style.left = `${Math.max(8, x < this.mouse.sx - r.width - 4 && this.mouse.sx + 20 + r.width > innerWidth ? this.mouse.sx - r.width - 20 : x)}px`;
    el.style.top = `${y}px`;
  }

  private painting = false;
  private erasing = false;
  private panning = false;
  private lastTile: Tile | null = null;
  private last = performance.now();
  private acc = 0;
  private hudTimer = 0;
  /** the "new discovery" pop-ups; while one is open the game is held (paused) until the player says they have read it */
  private discoveries = new Discoveries();
  private heldForDiscovery = false;
  private statsEl = document.getElementById('stats')!;
  private infoEl = document.getElementById('info')!;
  private barEl = document.getElementById('bar')!;
  private roundEl = document.getElementById('round')!;
  private resultEl = document.getElementById('result')!;
  private shownPhase = 'build';
  private tutEl = document.getElementById('tutorial')!;
  private tutRendered = -1;
  private helpEl = document.getElementById('toolhelp')!;
  private modulesEl = document.getElementById('modules')!;
  private pauseEl = document.getElementById('pauseOverlay')!;
  private tipEl = document.getElementById('tip')!;
  menu = new Menu({
    tools: TOOLS,
    onOpen: () => { audio.play('ui-open', { volume: 0.6 }); this.hideTip(); this.painting = this.erasing = this.panning = false; },
    onClose: () => { /* the game resumes by itself: it only pauses while the menu is open */ },
    onTutorial: () => { this.autosave(); location.href = `${location.pathname}?tutorial=1`; },
    onExit: () => { this.autosave(); location.href = location.pathname; },
  });
  /** ore kind of the resource module the player has chosen and still has to place, or null */
  private placingModule: number | null = null;
  /** buildings the player has already had explained (remembered between visits, except in the tutorial) */
  private seenTools = loadSeen();

  constructor() {
    this.canvas = document.getElementById('game') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.bindRoundUi();
    if (new URLSearchParams(location.search).has('tutorial')) this.beginTutorial();
    this.buildBar();
    loadSprites().then(() => this.buildBar()); // redraw the bar icons once the sprites are in
    this.bindInput();
    window.addEventListener('resize', () => this.resize());
    this.resize();
    requestAnimationFrame(this.frame);
  }

  private bindRoundUi(): void {
    this.roundEl.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).id === 'startFight' && !this.paused) this.run.startFight();
      const sp = (e.target as HTMLElement).closest('#speed button') as HTMLElement | null;
      if (sp) this.setSpeed(Number(sp.dataset.speed));
      if ((e.target as HTMLElement).id === 'callWave') this.callWave();
    });
    this.modulesEl.addEventListener('click', (e) => {
      const bn = (e.target as HTMLElement).closest('button[data-boon]') as HTMLElement | null;
      if (bn) { this.takeBoon(bn.dataset.boon!); return; }
      const bp = (e.target as HTMLElement).closest('button[data-plot]') as HTMLElement | null;
      if (bp) { this.resultEl.hidden = true; this.takePlot(Number(bp.dataset.plot)); return; }
      const b = (e.target as HTMLElement).closest('button[data-ore]') as HTMLElement | null;
      if (!b) return;
      this.placingModule = Number(b.dataset.ore); // now the player picks where on the map it goes
      this.resultEl.hidden = true;
    });
    this.resultEl.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).id !== 'resultBtn') return;
      if (this.run.phase === 'won') this.advance();
      else if (this.run.phase === 'lost') {
        this.run = newRun(this.tutorialStep !== null, this.commander, this.run.difficulty.id);
        this.setTool(null);
        if (this.tutorialStep !== null) { this.tutorialStep = 0; this.tutRendered = -1; }
      }
      this.resultEl.hidden = true;
    });
    this.helpEl.addEventListener('click', (e) => { if ((e.target as HTMLElement).id === 'helpOk') this.helpEl.hidden = true; });
    document.getElementById('menuBtn')!.addEventListener('click', () => this.menu.open());
    this.tutEl.addEventListener('click', (e) => {
      const id = (e.target as HTMLElement).id;
      if (id === 'tutFinish' || id === 'tutSkip') location.href = location.pathname; // the real game
    });
  }

  /** Zooms and centres on the ore patch and the core, to the right of the tutorial card, whatever the window size. */
  private frameTutorial(): void {
    const panel = 340; // px reserved on the left for the tutorial card
    const zoom = Math.max(20, Math.min(44, (window.innerWidth - panel - 30) / 17, window.innerHeight / 17));
    this.cam = { x: 74.5 - panel / 2 / zoom, y: 88.2, zoom };
  }

  /** Advances the checklist when the current step is done, and (re)draws the panel only when the step changes. */
  private updateTutorial(): void {
    if (this.tutorialStep === null) return;
    const ctx = { world: this.world, run: this.run };
    while (this.tutorialStep < TUTORIAL_STEPS.length - 1 && TUTORIAL_STEPS[this.tutorialStep].done(ctx)) this.tutorialStep++;
    if (this.tutRendered === this.tutorialStep) return;
    this.tutRendered = this.tutorialStep;
    const s = TUTORIAL_STEPS[this.tutorialStep];
    const last = this.tutorialStep === TUTORIAL_STEPS.length - 1;
    const dots = TUTORIAL_STEPS.map((_, i) => `<i class="${i < this.tutorialStep! ? 'on' : i === this.tutorialStep ? 'now' : ''}"></i>`).join('');
    this.tutEl.innerHTML = `<div class="step">Tutorial - step ${this.tutorialStep + 1} of ${TUTORIAL_STEPS.length}</div>
      <h4>${s.title}</h4><p>${s.html}</p><div class="dots">${dots}</div>
      ${last ? '<button id="tutFinish">Play the real game</button>' : '<a id="tutSkip">Skip tutorial</a>'}`;
  }

  /** Where the pulsing "look here" ring goes for the current tutorial step, if anywhere. */
  private tutorialMarker() {
    if (this.placingModule !== null && this.hoverTile) return { x: this.hoverTile.x + 0.5, y: this.hoverTile.y + 0.5, r: MODULE_RADIUS * 0.9 };
    if (this.tutorialStep === null) return null;
    return TUTORIAL_STEPS[this.tutorialStep].marker?.({ world: this.world, run: this.run }) ?? null;
  }

  private resize(): void {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.view = { w: window.innerWidth, h: window.innerHeight, dpr };
    this.canvas.width = Math.floor(this.view.w * dpr);
    this.canvas.height = Math.floor(this.view.h * dpr);
    // one scale for the whole interface: comfortable on a laptop, and grows a little on a big monitor
    const u = Math.max(0.72, Math.min(1.3, Math.min(window.innerWidth / 1280, window.innerHeight / 760)));
    document.documentElement.style.setProperty('--u', u.toFixed(3));
  }

  private buildBar(): void {
    this.barEl.replaceChildren();
    for (const g of TOOL_GROUPS) {
      const group = document.createElement('div');
      group.className = 'group';
      const row = document.createElement('div');
      row.className = 'row';
      for (const t of g.tools) {
        const b = document.createElement('button');
        b.dataset.kind = t.kind;
        b.setAttribute('aria-label', KINDS[t.kind].name);
        b.append(kindIcon(t.kind, 96));
        const label = document.createElement('span');
        const short = KINDS[t.kind].name.replace('Ember ', '').replace('Conveyor ', '').replace('Gun ', '').replace('Storage ', '').replace('Robot fabricator', 'Robots').replace('Mining drill', 'Drill');
        label.textContent = short.charAt(0).toUpperCase() + short.slice(1);
        const cost = document.createElement('small');
        cost.className = 'cost';
        cost.textContent = this.world.freeBuild ? '' : costShort(t.kind);
        const key = document.createElement('kbd');
        key.textContent = t.key;
        b.append(label, cost, key);
        b.addEventListener('click', () => { this.hideTip(); this.setTool(this.tool === t.kind ? null : t.kind); });
        b.addEventListener('mouseenter', () => this.showTip(b, t.kind, t.key));
        b.addEventListener('mouseleave', () => this.hideTip());
        b.addEventListener('focus', () => this.showTip(b, t.kind, t.key));
        b.addEventListener('blur', () => this.hideTip());
        b.classList.toggle('on', this.tool === t.kind);
        row.append(b);
      }
      const title = document.createElement('small');
      title.textContent = g.name;
      group.append(row, title);
      this.barEl.append(group);
    }
  }

  private showTip(anchor: HTMLElement, kind: Kind, key: string): void {
    const h = TOOL_HELP[kind];
    const short = h ? h.what.replace(/<[^>]+>/g, '').split(/(?<=\.)\s/)[0] : '';
    const short2 = short.length > 150 ? short.slice(0, 147) + '...' : short;
    const need = missing(this.world, kind);
    const cost = this.world.freeBuild ? 'Free in the tutorial' : `Costs ${costText(kind)}`;
    this.tipEl.innerHTML = `<b>${KINDS[kind].name}</b> <kbd>${key}</kbd><div>${short2}</div>` +
      `<div class="c ${need ? 'no' : ''}">${cost}${need ? ` - not enough ${ITEMS[need].name.toLowerCase()}` : ''}</div><div class="c">Click for how to connect it</div>`;
    this.tipEl.hidden = false;
    const r = anchor.getBoundingClientRect();
    const tw = this.tipEl.offsetWidth, th = this.tipEl.offsetHeight;
    this.tipEl.style.left = `${Math.max(8, Math.min(window.innerWidth - tw - 8, r.left + r.width / 2 - tw / 2))}px`;
    this.tipEl.style.top = `${Math.max(8, r.top - th - 10)}px`;
  }

  private hideTip(): void { this.tipEl.hidden = true; }

  private setTool(k: Kind | null): void {
    this.tool = k;
    this.barEl.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.kind === k));
    // the first time a building is picked, explain it; H shows it again whenever it is needed
    if (k && !this.seenTools.has(k)) { this.seenTools.add(k); if (this.tutorialStep === null) saveSeen(this.seenTools); this.showHelp(k); }
    else if (!k) this.helpEl.hidden = true;
    else if (!this.helpEl.hidden) this.showHelp(k); // card is open and the player switched buildings: follow along
  }

  private showHelp(k: Kind): void {
    const h = TOOL_HELP[k];
    if (!h) { this.helpEl.hidden = true; return; }
    this.helpEl.innerHTML = `<h4>${KINDS[k].name}</h4>
      <div class="row"><b>What it is</b><span>${h.what}</span></div>
      <div class="row"><b>Connect it</b><span>${h.connect}</span></div>
      <div class="row"><b>What it does</b><span>${h.does}</span></div>
      <div class="foot"><span>Press <kbd>H</kbd> to see this again</span><button id="helpOk">Got it</button></div>`;
    this.helpEl.hidden = false;
  }

  private bindInput(): void {
    const cv = this.canvas;
    cv.addEventListener('contextmenu', (e) => e.preventDefault());
    // double-click an inserter (with no building selected) to choose the one kind of item it moves
    cv.addEventListener('dblclick', (e) => {
      if (e.button !== 0 || this.paused || this.tool || this.moving || this.placingModule !== null) return;
      this.updateMouse(e);
      const t = this.hoverTile;
      const ins = t ? this.world.entityAt(t.x, t.y) : undefined;
      if (ins?.kind === 'assembler' || ins?.kind === 'robotfab' || ins?.kind === 'turret') { this.painting = false; this.entityPicker.open(ins, this.mouse.sx, this.mouse.sy); return; }
      if (ins?.kind !== 'inserter') return;
      const passing = new Set<ItemId>(); // what is on the belts beside it right now, offered first
      for (const d of [0, 1, 2, 3] as Dir[]) {
        const n = this.world.entityAt(ins.x + DX[d], ins.y + DY[d]);
        if (n?.kind === 'belt') for (const it of n.items) passing.add(it.type);
        else if (n?.kind === 'furnace' && n.outType && n.outCount > 0) passing.add(n.outType);
      }
      this.painting = false;
      this.filterPicker.open(ins, this.mouse.sx, this.mouse.sy, [...passing]);
    });
    cv.addEventListener('mousedown', (e) => {
      this.updateMouse(e);
      if (this.paused && e.button !== 1) return; // paused: look around only (middle-drag pans), no building, moving or erasing
      if (this.moving) { if (e.button === 0) this.dropMoving(); else if (e.button === 2) this.cancelMoving(); }
      else if (e.button === 0 && this.placingModule !== null) this.dropModule();
      else if (e.button === 0) { this.painting = true; this.lastTile = null; this.paint(); }
      else if (e.button === 2) { this.erasing = true; this.erase(); }
      else if (e.button === 1) { this.panning = true; e.preventDefault(); }
    });
    window.addEventListener('mouseup', () => { this.painting = this.erasing = this.panning = false; this.lastTile = null; });
    cv.addEventListener('mousemove', (e) => {
      const px = this.mouse.sx, py = this.mouse.sy;
      this.updateMouse(e);
      if (this.panning) {
        this.cam.x -= (this.mouse.sx - px) / this.cam.zoom;
        this.cam.y -= (this.mouse.sy - py) / this.cam.zoom;
      }
      if (this.paused) { this.painting = this.erasing = false; return; }
      if (this.painting) this.paint();
      if (this.erasing) this.erase();
    });
    cv.addEventListener('mouseleave', () => { this.mouse.inside = false; this.hoverTile = null; });
    cv.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.updateMouse(e);
      const before = this.screenToWorld(this.mouse.sx, this.mouse.sy);
      this.cam.zoom = Math.max(10, Math.min(96, this.cam.zoom * Math.exp(-e.deltaY * 0.0015)));
      const after = this.screenToWorld(this.mouse.sx, this.mouse.sy);
      this.cam.x += before.x - after.x;
      this.cam.y += before.y - after.y;
    }, { passive: false });
    document.getElementById('inspectBtn')!.addEventListener('click', () => this.toggleInspect());
    const muteBtn = document.getElementById('muteBtn')!;
    const showMute = () => { document.getElementById('muteIcon')!.textContent = audio.muted ? 'Sound off' : 'Sound on'; muteBtn.classList.toggle('on', !audio.muted); };
    showMute();
    muteBtn.addEventListener('click', () => { audio.unlock(); audio.toggleMute(); showMute(); });
    window.addEventListener('keydown', (e) => { if (e.key.toLowerCase() === 'n' && !e.repeat && !this.menu.isOpen) { audio.unlock(); audio.toggleMute(); showMute(); } });
    // any button press clicks, and the first press anywhere unlocks browser audio
    document.addEventListener('click', (e) => {
      audio.unlock();
      const b = (e.target as HTMLElement).closest('button');
      if (b && b.id !== 'muteBtn') audio.play('ui-click', { volume: 0.7 });
    }, true);
    window.addEventListener('keydown', (e) => {
      if ((e.target as HTMLElement)?.tagName === 'BUTTON' && e.key === ' ') e.preventDefault();
      const k = e.key.toLowerCase();
      if (k === 'f3') { e.preventDefault(); if (!e.repeat) this.toggleInspect(); return; } // F3 would open the browser's find bar
      if (this.discoveries.open) { if (k === 'enter' || k === ' ' || k === 'escape') this.discoveries.close(); return; } // a discovery pop-up owns the keyboard
      if (this.menu.isOpen) { if (k === 'escape' || k === 'm') this.menu.close(); return; } // the menu owns the keyboard while open
      this.keys.add(k);
      if (e.repeat && 'vphqmtnfc'.includes(k) && k.length === 1) return; // holding a key must not toggle it on and off again
      if (this.paused && !['p', 'escape', 'm'].includes(k)) return; // paused: the camera keys still work (they were recorded above), nothing else does
      const tool = TOOLS.find((t) => t.key === k);
      if (tool) this.setTool(this.tool === tool.kind ? null : tool.kind);
      else if (k === 't') this.research.toggle();
      else if (k === 'f') this.setSpeed(this.speed === 1 ? 2 : this.speed === 2 ? 4 : 1);
      else if (k === 'c') this.callWave();
      else if (k === 'v') { if (this.moving) this.cancelMoving(); else this.pickUp(); }
      else if (k === 'h') { if (this.tool && this.helpEl.hidden) this.showHelp(this.tool); else this.helpEl.hidden = true; }
      else if (k === 'r') {
        audio.play('rotate', { volume: 0.6, minGap: 70 }); if (this.moving) { const m = this.moving.e; m.dir = ((m.dir + (e.shiftKey ? 3 : 1)) % 4) as Dir; const f = footprint(m.kind, m.dir); m.w = f.w; m.h = f.h; } else this.dir = ((this.dir + (e.shiftKey ? 3 : 1)) % 4) as Dir; }
      else if (k === 'm') this.menu.open();
      else if (k === 'escape') { if (this.research.isOpen) this.research.close(); else if (this.moving) this.cancelMoving(); else if (this.tool || !this.helpEl.hidden || this.placingModule !== null) { this.setTool(null); this.helpEl.hidden = true; } else this.menu.open(); }
      else if (k === 'q') this.setTool(null);
      else if (k === 'p') { this.paused = !this.paused; this.painting = this.erasing = false; if (this.paused && this.moving) this.cancelMoving(); }
      else if (k === 'x') this.erase();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => this.keys.clear());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.autosave(); });
    window.addEventListener('pagehide', () => this.autosave());
  }

  private updateMouse(e: MouseEvent): void {
    const r = this.canvas.getBoundingClientRect();
    this.mouse.sx = e.clientX - r.left;
    this.mouse.sy = e.clientY - r.top;
    this.mouse.inside = true;
    const w = this.screenToWorld(this.mouse.sx, this.mouse.sy);
    this.hoverTile = { x: Math.floor(w.x), y: Math.floor(w.y) };
  }

  private screenToWorld(sx: number, sy: number): Tile {
    return {
      x: this.cam.x + (sx - this.view.w / 2) / this.cam.zoom,
      y: this.cam.y + (sy - this.view.h / 2) / this.cam.zoom,
    };
  }

  private paint(): void {
    if (this.paused) return;
    const t = this.hoverTile;
    if (!t || !this.tool) return;
    const from = this.lastTile;
    if ((this.tool === 'belt' || this.tool === 'wall') && from && (from.x !== t.x || from.y !== t.y)) {
      // walk tile by tile so fast drags leave no gaps, pointing each belt along the drag
      let cx = from.x, cy = from.y;
      while (cx !== t.x || cy !== t.y) {
        const stepX = cx !== t.x;
        const sx = stepX ? Math.sign(t.x - cx) : 0;
        const sy = stepX ? 0 : Math.sign(t.y - cy);
        const d = (sx === 1 ? 0 : sx === -1 ? 2 : sy === 1 ? 1 : 3) as Dir;
        if (this.tool === 'belt') { // belts point along the drag; walls just fill the tiles
          const prev = this.world.entityAt(cx, cy);
          if (prev?.kind === 'belt') prev.dir = d;
          this.dir = d;
        }
        cx += sx;
        cy += sy;
        this.tryPlace(this.tool, cx, cy, d);
      }
    } else {
      this.tryPlace(this.tool, t.x, t.y, this.dir);
    }
    this.lastTile = { ...t };
  }

  /** Three different resource modules on offer after each level (a fresh mix each time, the same every replay of that level). */
  private moduleChoices(): number[] {
    const kinds = ORE_KINDS.map((k) => ({ k, r: hash(this.run.level, k, 91) })).sort((a, b) => a.r - b.r);
    return kinds.slice(0, this.world.mods.moduleChoices).map((o) => o.k);
  }

  /** After a win: three random boons to pick one from (same three for the same seed and level), then the resource module. */
  private showBoonChoice(): void {
    this.modulesEl.replaceChildren();
    for (const b of rollBoons(this.world.seed, this.run.level)) {
      const n = boonLevel(this.world, b.id);
      const el = document.createElement('button');
      el.dataset.boon = b.id;
      el.innerHTML = `<img class="bi" src="${import.meta.env.BASE_URL}sprites/boon-${b.id}.png" alt="" onerror="this.remove()"><span>${b.name}${n > 0 ? ` (have ${n})` : ''}</span><small>${b.desc}</small>`;
      this.modulesEl.append(el);
    }
    this.modulesEl.hidden = false;
  }

  private takeBoon(id: string): void {
    const b = boonById(id);
    if (!b) return;
    if (b.kind === 'stack') bumpLevel(this.world, `boon-${b.id}`); else b.apply?.(this.world);
    this.flash = { text: `Boon: ${b.name}`, until: performance.now() + 4000 };
    audio.play('ui-star', { volume: 0.6, pitchVar: 0 });
    document.getElementById('resultText')!.textContent = this.world.plots ? 'Now choose a square of the map to open. Point at one to see it on the map.' : 'Now choose a resource module, then click the map to place it.';
    this.showModuleChoice();
  }

  /** Plot mode: three neighbouring squares to choose one from. The game then opens a second, random one. */
  private showPlotChoice(): void {
    const open = this.world.plots!;
    const all = plotCandidates(open);
    // always the squares closest to the core first (random only among squares equally near), so the land grows outward without gaps
    const offer = nearestFirst(all, (id) => hash(this.run.level, id, this.world.seed + 77)).slice(0, this.world.mods.moduleChoices).sort((a, b) => a - b);
    this.world.plotOffer = offer;
    const b = plotsBounds(new Set([...open, ...offer])); // frame the explored land and every square on offer, above the card at the bottom
    this.cam.x = (b.x0 + b.x1) / 2;
    this.cam.y = (b.y0 + b.y1) / 2 + (b.y1 - b.y0) * 0.3;
    this.cam.zoom = Math.max(10, Math.min(42, Math.min(this.view.w / (b.x1 - b.x0 + 3), (this.view.h * 0.5) / (b.y1 - b.y0 + 3))));
    this.modulesEl.replaceChildren();
    for (const id of offer) {
      const b = document.createElement('button');
      b.dataset.plot = String(id);
      const sum = plotSummary(this.world, id);
      const ores = sum.ores.length ? sum.ores.map((o) => {
        const url = itemIconUrl(ORE_ITEM[o.kind]!);
        return `<span class="pt-ore">${url ? `<img src="${url}" alt="">` : ''}<span><b>${o.name}</b><small>${o.size}</small></span></span>`;
      }).join('') : '<span class="pt-ore none"><span><b>No ore</b><small>Open ground</small></span></span>';
      b.innerHTML = `<span class="pt-badge">${plotLabel(id)}</span><span class="pt-ores">${ores}</span><span class="pt-note">${sum.note}</span><span class="pt-cta">Open this square</span>`;
      b.addEventListener('mouseenter', () => { this.world.plotHover = id; });
      b.addEventListener('mouseleave', () => { this.world.plotHover = -1; });
      this.modulesEl.append(b);
    }
    this.modulesEl.hidden = false;
    this.resultEl.classList.add('plots');
  }

  private takePlot(id: number): void {
    const w = this.world;
    const before = knownOres(w);
    this.resultEl.classList.remove('plots');
    w.openPlot(id);
    const rest = plotCandidates(w.plots!);
    const extra = rest.length ? nearestFirst(rest, () => Math.random())[0] : -1; // the bonus square is also the nearest available
    if (extra >= 0) w.openPlot(extra);
    w.plotOffer = []; w.plotHover = -1;
    const fresh = [...knownOres(w)].filter((k) => !before.has(k));
    const opened = extra >= 0 ? `You opened ${plotLabel(id)}, and the map opened ${plotLabel(extra)} too.` : `You opened ${plotLabel(id)}.`;
    const lesson = fresh.length ? ' New: ' + fresh.map((k) => ORE_INTRO[k]).join(' ') : '';
    this.advance();
    this.flash = { text: opened + lesson, until: performance.now() + (fresh.length ? 14000 : 6000) };
    audio.play('ui-star', { volume: 0.5, pitchVar: 0 });
  }

  private showModuleChoice(): void {
    if (this.world.plots) { this.showPlotChoice(); return; }
    this.modulesEl.replaceChildren();
    for (const kind of this.moduleChoices()) {
      const item = ORE_ITEM[kind]!;
      const url = itemIconUrl(item);
      const b = document.createElement('button');
      b.dataset.ore = String(kind);
      b.innerHTML = `${url ? `<img src="${url}" alt="">` : ''}<span>${ORE_NAMES[kind]}</span><small>A rich new patch you can place anywhere</small>`;
      this.modulesEl.append(b);
    }
    this.modulesEl.hidden = false;
  }

  /** Moves on to the next build phase and mentions what the repairs cost, on the harder difficulties. */
  private advance(): void {
    this.run.nextLevel();
    if (this.run.cooldownLeft > 0) this.flash = { text: `COOLDOWN ${this.run.cooldownLength()}s: the factory is running. Mine, smelt and build!`, until: performance.now() + 5000 };
    if (this.run.repairBill > 0) this.flash = { text: `Repairs cost ${this.run.repairBill} iron plates`, until: performance.now() + 4500 };
    else if (this.run.difficulty.repairCost > 0) this.flash = { text: 'Not enough plates to repair everything: damaged buildings stay damaged', until: performance.now() + 4500 };
  }

  /** Commanders are unlocked by achievements; checked a few times a second. */
  private checkDiscoveries(): void {
    this.discoveries.onClose = () => { if (this.heldForDiscovery) { this.paused = false; this.heldForDiscovery = false; } };
    this.discoveries.check(this.world, this.tutorialStep === null && !this.world.freeBuild && this.started);
    if (this.discoveries.open && !this.heldForDiscovery) { this.heldForDiscovery = !this.paused; this.paused = true; this.painting = this.erasing = false; if (this.moving) this.cancelMoving(); }
  }

  private checkAchievements(): void {
    if (this.tutorialStep !== null || this.world.freeBuild) return;
    for (const a of ACHIEVEMENTS) {
      if (!a.check(this.world) || !unlockCommander(a.commander)) continue;
      this.flash = { text: `Commander unlocked: ${commanderById(a.commander).name}`, until: performance.now() + 7000 };
      audio.play('ui-star', { volume: 0.9, pitchVar: 0 });
    }
  }

  /** Stamps the chosen module where the player clicked, then starts the next build phase. */
  private dropModule(): void {
    const t = this.hoverTile;
    if (this.placingModule === null || !t) return;
    if (!this.world.inArena(t.x, t.y)) { this.say('Place it inside the explored area', true); return; }
    const filled = addOrePatch(this.world, this.placingModule, t.x + 0.5, t.y + 0.5, MODULE_RADIUS, 1000 + this.run.level, 1.5);
    if (filled < 10) return; // mostly blocked by buildings or the map edge: let them pick a better spot
    this.placingModule = null;
    this.advance();
  }

  /** Places a building if the tile is free and the core can pay. Turning an existing belt round is free. */
  private tryPlace(kind: Kind, x: number, y: number, dir: Dir): void {
    const w = this.world;
    const reorient = kind === 'belt' && w.entityAt(x, y)?.kind === 'belt';
    if (!reorient) {
      if (!w.canPlace(kind, x, y, dir)) return;
      const short = missing(w, kind);
      if (short) { this.say(`Not enough ${ITEMS[short].name.toLowerCase()} for a ${KINDS[kind].name.toLowerCase()} (needs ${costText(kind)})`, true); return; }
    }
    const placed = w.place(kind, x, y, dir);
    if (placed && !reorient) {
      spend(w, kind);
      const flat = kind === 'belt' || kind === 'inserter' || kind === 'junction' || kind === 'splitter';
      audio.play(flat ? 'place-belt' : 'place-building', { volume: flat ? 0.6 : 0.9, minGap: flat ? 45 : 0 });
      if (this.run.phase === 'build') placed.fresh = true;
      evictUnits(w, placed); // anything standing where it went is moved out, never trapped inside
    }
  }

  /** A short message in the info line, for things like "not enough plates". */
  private say(text: string, denied = false): void {
    this.flash = { text, until: performance.now() + 2200 };
    if (denied) audio.play('ui-denied', { volume: 0.6 });
  }

  /** V: lift the building under the cursor so it can be put down somewhere else. Free; nothing is lost. */
  private pickUp(): void {
    if (this.placingModule !== null) return;
    const t = this.hoverTile;
    const e = t ? this.world.entityAt(t.x, t.y) : undefined;
    if (!e || e.kind === 'core') { this.say('Hover over a building and press V to pick it up and move it'); return; }
    const lifted = this.world.remove(e.x, e.y);
    if (!lifted) return;
    audio.play('pickup', { volume: 0.8 });
    this.moving = { e: lifted, ox: lifted.x, oy: lifted.y, odir: lifted.dir };
    this.painting = false;
    this.setTool(null);
  }

  private dropMoving(): void {
    const m = this.moving, t = this.hoverTile;
    if (!m || !t) return;
    const moved = t.x !== m.ox || t.y !== m.oy || m.e.dir !== m.odir;
    if (!this.world.putBack(m.e, t.x, t.y)) { this.say('It will not fit there', true); return; }
    if (moved) this.world.emptyContents(m.e); // it arrives empty: a moved turret has no ammo until it is fed again
    evictUnits(this.world, m.e);
    audio.play('drop-building', { volume: 0.9 });
    this.moving = null;
  }

  private cancelMoving(): void {
    const m = this.moving;
    if (!m) return;
    m.e.dir = m.odir;
    { const f = footprint(m.e.kind, m.e.dir); m.e.w = f.w; m.e.h = f.h; }
    this.world.putBack(m.e, m.ox, m.oy);
    this.moving = null;
  }

  private erase(): void {
    if (this.paused) return;
    if (this.moving) return;
    const t = this.hoverTile;
    if (!t) return;
    const gone = this.world.remove(t.x, t.y);
    if (gone) {
      refund(this.world, gone.kind, !!gone.fresh && this.run.phase === 'build');
      if (!['belt', 'inserter', 'junction', 'splitter'].includes(gone.kind)) audio.play('remove-building', { volume: 0.8 });
    }
  }

  private frame = (now: number): void => {
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;

    const pan = (this.keys.has('shift') ? 26 : 13) * (40 / this.cam.zoom) * dt;
    if (this.keys.has('w') || this.keys.has('arrowup')) this.cam.y -= pan;
    if (this.keys.has('s') || this.keys.has('arrowdown')) this.cam.y += pan;
    if (this.keys.has('a') || this.keys.has('arrowleft')) this.cam.x -= pan;
    if (this.keys.has('d') || this.keys.has('arrowright')) this.cam.x += pan;
    const ar = this.world.arena; // the camera may roam a little beyond the playable square, no further
    this.cam.x = Math.max(ar.x0 - 6, Math.min(ar.x1 + 6, this.cam.x));
    this.cam.y = Math.max(ar.y0 - 6, Math.min(ar.y1 + 6, this.cam.y));

    this.pauseEl.hidden = !(this.paused && this.started && !this.menu.isOpen && !this.discoveries.open);
    if (!this.paused && !this.menu.isOpen && this.started) {
      this.acc += dt * this.speed;
      let n = 0;
      const cap = 5 * this.speed;
      while (this.acc >= STEP && n < cap) { this.run.update(STEP); this.acc -= STEP; n++; }
      if (n === cap) this.acc = 0;
    }
    this.playCues();
    if (this.run.finishedResearch) { // a research has just finished
      const t = techById(this.run.finishedResearch);
      this.run.finishedResearch = null;
      if (t) { this.flash = { text: `Research complete: ${t.name} level ${levelOf(this.world, t.id)}${t.id === 'turret-designs' ? ' - double-click a gun turret to upgrade it' : ''}`, until: performance.now() + (t.id === 'turret-designs' ? 9000 : 5000) }; audio.play('ui-star', { volume: 0.7, pitchVar: 0 }); }
    }

    const t = this.hoverTile && this.mouse.inside ? this.hoverTile : null;
    const hovered = t ? this.world.entityAt(t.x, t.y) : undefined;
    const mv = this.moving;
    const ghost = mv && t ? { kind: mv.e.kind, x: t.x, y: t.y, dir: mv.e.dir, valid: this.world.fits(mv.e, t.x, t.y) } : this.tool && t
      ? { kind: this.tool, x: t.x, y: t.y, dir: this.dir, valid: this.world.canPlace(this.tool, t.x, t.y, this.dir) && (canAfford(this.world, this.tool) || (this.tool === 'belt' && this.world.entityAt(t.x, t.y)?.kind === 'belt')) }
      : null;
    if (this.world.layoutVersion !== this.facedVersion) { this.facedVersion = this.world.layoutVersion; faceBeltEnds(this.world); }
    this.miniT -= dt;
    if (this.miniT <= 0 && this.started) { this.miniT = 0.12; this.minimap.draw(); }
    this.updateInspect();
    render(this.ctx, this.world, this.cam, this.view, ghost, this.tool ? undefined : hovered, this.tutorialMarker(), this.rangeRings(this.tool ? undefined : hovered, ghost));

    this.hudTimer -= dt;
    if (this.hudTimer <= 0) { this.hudTimer = 0.25; this.updateHud(t, hovered); this.research.refresh(); this.checkAchievements(); this.checkDiscoveries(); this.checkBossMusic(); this.checkLullMusic(); this.updateAmbience(); }
    requestAnimationFrame(this.frame);
  };

  /** Plays the sounds the simulation asked for this frame, each kind at most once, with a minimum gap so a busy fight is not a wall of noise. */
  private playCues(): void {
    const w = this.world;
    if (!w.sfx.length) return;
    const seen = new Set(w.sfx);
    w.sfx.length = 0;
    if (this.paused) return;
    const v = this.speed > 1 ? 0.6 : 1; // fast-forward: quieter, the sounds come thick and fast
    if (seen.has('wave-clear')) audio.play('ui-star', { volume: 0.4, pitchVar: 0, minGap: 1500 });
    if (seen.has('boss-arrive')) audio.play('boss-arrive', { volume: 1, pitchVar: 0 });
    if (seen.has('structure-destroyed')) audio.play('structure-destroyed', { volume: 0.75 * v, minGap: 300 });
    if (seen.has('structure-hit')) audio.play('structure-hit', { volume: 0.6 * v, minGap: 600 });
    if (seen.has('enemy-death')) audio.play('enemy-death', { volume: 0.55 * v, minGap: 110 });
    if (seen.has('coil-zap')) audio.play('coil-zap', { volume: 0.6 * v, minGap: 280 });
    if (seen.has('bullet-hit')) audio.play('bullet-hit', { volume: 0.45 * v, minGap: 130 });
    if (seen.has('robot-shot')) audio.play('robot-shot', { volume: 0.45 * v, minGap: 170 });
    const core = w.core;
    if (seen.has('core-hit') && core && core.hp < core.maxHp * 0.35) audio.play('core-alarm', { volume: 0.7, pitchVar: 0, minGap: 4500 });
  }

  private updateHud(t: Tile | null, hovered: Entity | undefined): void {
    const free = this.world.freeBuild;
    const stock = this.world.stock;
    const stockRows = (Object.keys(ITEMS) as ItemId[]).filter((k) => k === 'iron-plate' || k === 'copper-plate' || (stock[k] ?? 0) > 0)
      .map((k) => {
        const url = itemIconUrl(k);
        const swatch = url ? `<img src="${url}" alt="">` : `<i style="background:${ITEMS[k].color}"></i>`;
        return `<div>${swatch}${ITEMS[k].name}<b>${stock[k] ?? 0}</b></div>`;
      }).join('');
    this.statsEl.innerHTML = `<h3>Core stock <span class="hint" title="Buildings and research are paid for from here. Send plates and science packs into the core on a belt, or with an inserter, to top it up. Kills and finished levels pay too.">?</span></h3>${stockRows}` +
      `${free ? '<div class="note">Building is free in the tutorial</div>' : ''}${this.paused && !this.discoveries.open ? '<div class="paused">PAUSED (P)</div>' : ''}`;
    // dim the build-bar buttons for things the core can't afford right now
    this.barEl.querySelectorAll<HTMLElement>('button[data-kind]').forEach((b) => b.classList.toggle('poor', !canAfford(this.world, b.dataset.kind as Kind)));

    this.updateRoundUi();
    this.updateTutorial();

    // autosave at the start of every build phase, every so often while building, and never after a loss
    if (this.run.phase !== this.lastPhase) {
      if (this.run.phase === 'build') this.autosave();
      if (this.run.phase === 'lost' && this.tutorialStep === null) clearSave();
      this.lastPhase = this.run.phase;
    }
    this.saveTimer += 0.25;
    if (this.saveTimer >= 15) { this.saveTimer = 0; this.autosave(); }

    let text = this.moving ? `<b>Moving ${KINDS[this.moving.e.kind].name}</b> - click to put it down, R to rotate, right-click or Esc to put it back. Moving is free, but it arrives empty (no ammo, no items).` : this.placingModule !== null ? `<b>Place the ${ORE_NAMES[this.placingModule]} module</b> - click anywhere on the map (avoid buildings)`
      : this.tool
      ? `<b>${KINDS[this.tool].name}</b> facing ${DIR_NAMES[this.dir]} - costs ${free ? 'nothing here' : costText(this.tool)} - click to place, right-click removes (free until the fight starts, then 75%), V moves an existing building for free (it arrives empty and must be supplied again)`
      : `Pick a building (1-${TOOLS.length}), or hover something to inspect it`;
    if (performance.now() < this.flash.until) text = `<span class="warn">${this.flash.text}</span>`;
    if (!this.tool && hovered) text = describe(hovered, this.world);
    else if (!this.tool && t && this.world.inBounds(t.x, t.y)) {
      const i = t.y * this.world.w + t.x;
      if (this.world.ore[i]) text = `<b>${ORE_NAMES[this.world.ore[i]]}</b> - ${this.world.oreLeft[i]} left. Put a mining drill on it.`;
    }
    this.infoEl.innerHTML = text;
  }

  /** Updates the round panel in place (its button must not be re-created, or clicks would be lost) and shows the result screen. */
  /** " - BOSS: Siege Brute 64%" while a boss is on the field, or a warning before it arrives. */
  private bossNote(): string {
    const r = this.run, kind = r.boss();
    if (!kind) return '';
    const boss = this.world.enemies.find((e) => e.id === r.bossId);
    if (boss) return ` - BOSS: ${ENEMIES[kind].name} ${Math.max(1, Math.round((boss.hp / boss.maxHp) * 100))}%`;
    return r.bossId === 0 ? ` - BOSS INCOMING: ${ENEMIES[kind].name}` : '';
  }

  /** Skips the rest of the breather: the next wave starts now, for a bonus of plates, and a horn sounds. */
  private callWave(): void {
    if (this.paused) return;
    const bonus = this.run.callNextWave();
    if (bonus < 0) return;
    audio.play('ui-fight-start', { volume: 0.7, pitchVar: 0 });
    this.flash = { text: bonus > 0 ? `Next wave called early: +${bonus} iron plates` : 'Next wave called', until: performance.now() + 2500 };
  }

  /** The top-bar line during a fight: which wave, how many enemies are left, or the breather countdown between waves. */
  private fightText(left: number): string {
    const r = this.run, wi = r.waveInfo(), fast = this.speed > 1 ? ` (x${this.speed})` : '';
    if (wi.breather !== null && this.world.enemies.length === 0 && r.spawned < r.toSpawn()) return `BREATHER${fast} - wave ${wi.wave} of ${wi.of} in ${Math.ceil(wi.breather)}s`;
    return `FIGHT${fast} - wave ${wi.wave} of ${wi.of} - ${left} enemies to go${this.bossNote()}`;
  }

  private updateRoundUi(): void {
    const r = this.run;
    const core = this.world.core;
    const hp = core ? Math.round((core.hp / core.maxHp) * 100) : 0;
    const set = (id: string, text: string) => { document.getElementById(id)!.textContent = text; };
    set('lvl', String(r.level));
    const left = r.toSpawn() - r.spawned + this.world.enemies.length;
    const om = this.tutorialStep === null ? r.omen() : null;
    const omenNote = '';
    const chip = document.getElementById('omenChip')!;
    if (om && r.phase !== 'won' && r.phase !== 'lost') {
      chip.hidden = false;
      const img = chip.querySelector('img')!; const src = `${import.meta.env.BASE_URL}sprites/omen-${om.id}.png`;
      if (img.getAttribute('src') !== src) img.setAttribute('src', src);
      chip.querySelector('span')!.innerHTML = `<b>${om.name}</b> ${om.blurb}`;
    } else chip.hidden = true;
    set('phase', r.phase === 'build' ? (r.timer > 1e6 ? 'Build - start the fight when you are ready' : `Build - fight starts in ${clock(r.timer)}`)
      : r.phase === 'fight' ? this.fightText(left)
        : r.phase === 'won' ? 'Level complete' : 'Core destroyed');
    if (omenNote) set('phase', document.getElementById('phase')!.textContent + omenNote);
    document.getElementById('phase')!.title = om && omenNote ? `${om.name}: ${om.blurb}` : '';
    document.getElementById('phase')!.className = r.phase;
    (document.getElementById('hp') as HTMLElement).style.width = `${hp}%`;
    const pw = this.world.power;
    const hasPower = [...this.world.entities.values()].some((e) => e.kind === 'coil' || e.kind === 'generator');
    const cmd = this.tutorialStep === null ? `${commanderById(this.commander).name.split(' ').slice(-1)[0]} (${this.run.difficulty.name}) - ` : '';
const hi = (n: string, t: string) => `<img class="hi" src="${import.meta.env.BASE_URL}sprites/hud-${n}.png" alt="" title="${t}" onerror="this.remove()">`;
    document.getElementById('sub')!.innerHTML = `${cmd}${this.tutorialStep === null ? `map ${this.world.seed} ` : ''}${hi('core', 'Core health')}${hp}% ${hi('kills', 'Kills')}${this.world.kills} ${hi('robots', 'Robots')}${this.world.soldiers.length}` +
      (hasPower && pw ? ` ${hi('power', 'Power supply / demand')}${Math.round(pw.supply)} / ${Math.round(pw.demand)}` : '');
    document.getElementById('startFight')!.hidden = r.phase !== 'build';
    const early = r.phase === 'fight' ? r.earlyCallBonus() : 0;
    const callBtn = document.getElementById('callWave')!;
    callBtn.hidden = !(r.phase === 'fight' && r.waveInfo().breather !== null && this.world.enemies.length === 0 && r.spawned < r.toSpawn() && r.waveInfo().breather! > 3);
    if (!callBtn.hidden) callBtn.innerHTML = `<img class="hi" src="${import.meta.env.BASE_URL}sprites/hud-callwave.png" alt="">${early > 0 ? `Call next wave now (+${early} plates)` : 'Call next wave now'}`;
    const cd = document.getElementById('cooldown')!;
    const cooling = r.phase === 'build' && r.cooldownLeft > 0;
    cd.hidden = !cooling;
    if (cooling) {
      document.getElementById('cdTime')!.textContent = clock(r.cooldownLeft);
      (document.getElementById('cdBar') as HTMLElement).style.width = `${(r.cooldownLeft / Math.max(1, r.cooldownLength())) * 100}%`;
    }

    if (r.phase !== this.shownPhase) {
      this.shownPhase = r.phase;
      if (r.phase === 'won' || r.phase === 'lost') this.setSpeed(1); // never fast-forward through a result
      if (this.moving) this.cancelMoving(); // the phase just changed under the player's hand: put the building back where it was
      this.updateMusic();
      if (this.tutorialStep === null) {
        if (r.phase === 'fight') audio.play('ui-fight-start', { volume: 0.8, pitchVar: 0 });
        else if (r.phase === 'build') audio.play('ui-build-start', { volume: 0.7, pitchVar: 0 });
      }
      if (r.phase === 'won' || r.phase === 'lost') {
        set('resultTitle', r.phase === 'won' ? `Level ${r.level} complete` : 'Core destroyed');
        const earned = r.phase === 'won' && this.tutorialStep === null && recordWin(this.commander, r.level);
        const stars = starsForLevel(r.level);
        if (r.phase === 'won' && this.tutorialStep === null) {
          if (earned) audio.play('ui-star', { volume: 0.7, pitchVar: 0, delay: 4 }); // after the victory music has had its moment
        }
        const starNote = earned ? ` You earned a star: ${commanderById(this.commander).name} now has ${stars} of 3.` : '';
        const endless = r.phase === 'won' && r.level === 30 && this.tutorialStep === null ? ' All three stars won. The levels keep coming from here: this is Endless.' : '';
        if (r.phase === 'won' && r.level >= 30 && this.tutorialStep === null) set('resultTitle', r.level === 30 ? 'Level 30 complete - Victory!' : `Endless: level ${r.level} complete`);
        set('resultText', r.phase === 'won'
          ? `${this.world.kills} enemies destroyed. The core patches itself up a little before the next build phase.${starNote}${endless}`
          : `You held out to level ${r.level}.${r.level > 30 ? ' A fine Endless run.' : ''}`);
        set('resultBtn', r.phase === 'won' ? `Start level ${r.level + 1}` : 'Try again');
        const pickModule = r.phase === 'won' && this.tutorialStep === null;
        if (pickModule) {
          set('resultText', `${this.world.kills} enemies destroyed.${starNote}${endless} ${r.level % 2 === 0 || r.boss() ? 'Choose a boon for the rest of this run.' : this.world.plots ? 'Choose a square of the map to open. Point at one to see it on the map.' : 'Choose a resource module, then click the map to place it.'}`);
          if (r.level % 2 === 0 || r.boss()) this.showBoonChoice(); else this.showModuleChoice();
        } else this.modulesEl.hidden = true;
        if (!pickModule || !this.world.plots) this.resultEl.classList.remove('plots');
        document.getElementById('resultBtn')!.hidden = pickModule; // the choice replaces the button
        this.resultEl.hidden = false;
      }
    }
  }
}

function targetId(t: Target): string {
  return t.t === 'entity' ? `e${t.e.id}` : t.t === 'enemy' ? `n${t.en.id}` : t.t === 'soldier' ? `s${t.s.id}` : `o${t.x},${t.y}`;
}

function describe(e: Entity, w: World): string {
  const p = problemOf(w, e);
  return describeBase(e, w) + (e.fresh ? ' <span class="attn">- Planned: locks in when the fight starts. Removing it now is free.</span>' : '') + (p ? ` <span class="${p.level === 'error' ? 'warn' : 'attn'}">- ${p.text}</span>` : '');
}

function describeBase(e: Entity, w: World): string {
  switch (e.kind) {
    case 'belt': return `<b>Conveyor belt</b> - ${e.items.length} item(s)`;
    case 'junction': return `<b>Crossover</b> - lets one belt cross another. ${e.lanes.reduce((n, l) => n + l.length, 0)} item(s) passing through`;
    case 'splitter': return `<b>Splitter / merger</b> facing ${DIR_NAMES[e.dir]} - ${e.items.length} item(s). Belts feed it from behind; it hands items to the two tiles in front, taking turns`;
    case 'miner': {
      return `<b>Mining drill</b> - facing ${DIR_NAMES[e.dir]}${e.pending ? ' - output blocked' : ''}`;
    }
    case 'inserter': return `<b>Inserter</b> - ${e.held ? `carrying ${ITEMS[e.held].name}` : 'idle'}. ${e.filter ? `Moves only <b>${ITEMS[e.filter].name}</b>` : 'Moves any item'} (double-click it to choose)`;
    case 'furnace':
      return `<b>Smelter</b> - in: ${e.inCount}x ${e.inType ? ITEMS[e.inType].name : 'nothing'}, out: ${e.outCount}x ${e.outType ? ITEMS[e.outType].name : 'nothing'}`;
    case 'turret':
      return `<b>Gun turret</b> - ${e.ammo} shots loaded. Feed it iron plates (weak) or bullets (strong) on a belt touching it.`;
    case 'assembler': {
      const r = RECIPES[e.recipe];
      const need = Object.entries(r.inputs).map(([k, n]) => `${n}x ${ITEMS[k as ItemId].name}`).join(' + ');
      const have = Object.entries(r.inputs).map(([k, n]) => { const h = e.stock[k as ItemId] ?? 0; return `${ITEMS[k as ItemId].name} ${h}/${n}${h < n ? ' <span class="warn">(short)</span>' : ''}`; }).join(', ');
      const full = e.out + r.count > ASSEMBLER_OUT_MAX;
      return `<b>Assembler</b> - making <b>${r.name}</b> (${need} → ${r.count}x ${ITEMS[r.output].name}, ${r.time}s). Holding: ${have}. ${e.out} finished${full ? ' - <span class="warn">FULL, it stops until an inserter takes them out onto a belt to the Core</span>' : e.out ? ' - waiting for an inserter to take them' : ''}. Double-click it to change recipe (this drops anything half-made).`;
    }
    case 'scrapbin': return `<b>Scrap bin</b> - destroys anything an inserter or belt gives it (${e.burned} so far). Use an inserter with a filter in front of it to clear only one kind of item.`;
    case 'pole': return `<b>Power pole</b> - links to poles within ${POLE_REACH} tiles and powers machines within ${POLE_SUPPLY} tiles of it.`;
    case 'generator': {
      const net = w.power?.netOf.get(e.id);
      return `<b>Ember generator</b> - ${e.fuelSecs > 0 ? `burning, ${Math.round(e.fuelSecs)}s of fuel left` : 'out of fuel'}. Feed it coal, charcoal or wood.${net === undefined ? ' <span class="warn">Not connected to a power pole.</span>' : ''}`;
    }
    case 'coil': {
      const net = w.power?.netOf.get(e.id);
      const sat = net === undefined ? 0 : w.power!.sat.get(net) ?? 0;
      return `<b>Storm coil</b> - ${net === undefined ? '<span class="warn">not connected to a power pole</span>' : `power ${Math.round(sat * 100)}%${sat < 0.15 ? ' <span class="warn">(no fuel burning?)</span>' : ''}`}. Chain lightning, no ammo needed.`;
    }
    case 'wall': return `<b>Wall</b> - ${Math.round(e.hp)} / ${e.maxHp}. Enemies attack walls before other buildings, which buys your turrets time.`;
    case 'core':
      return `<b>Cinder Core</b> - ${Math.round(e.hp)} / ${e.maxHp}. Keep it alive. It only takes iron and copper plates and science packs.`;
    case 'robotfab': {
      const d = ROBOTS[e.type];
      const used = fabRoomUsed(w, e.id);
      return `<b>Robot fabricator</b> - builds <b>${d.name}</b> (${d.cost} iron plates, ${d.buildTime}s, takes ${ROBOT_SPACE[e.type]} space). Army room ${used} of ${FAB_CAPACITY}${used + ROBOT_SPACE[e.type] > FAB_CAPACITY ? ' - FULL for this robot' : ''}. ${e.stock}/${d.cost} plates loaded. Click it to change robot.`;
    }
  }
}
