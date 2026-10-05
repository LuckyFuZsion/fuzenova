// The run: a timed build phase, then a fight where the factory runs, level after level.
import { repairAll, repairPaid, stepAmbient, stepCombat } from './combat';
import { difficultyById, type Difficulty, type DifficultyId } from './difficulty';
import { omenFor, type Omen } from './roguelite';
import { exposedEdges } from './plots';
import { freeSpot, solidAt } from './pathfind';
import { reachable, reachableSpot, resetFields, routeAhead, variantFor } from './flowfield';
import { advanceResearch } from './research';
import { ENEMIES, bossForLevel, pickEnemy, type EnemyKind } from './enemies';
import { LEVEL_REWARD, addStock, type Cost } from './costs';
import { World, type Enemy } from './world';

export type Phase = 'build' | 'fight' | 'won' | 'lost';

/** A bonus on top of the level reward for beating a boss. */
export const BOSS_REWARD: Cost = { 'iron-plate': 150, 'copper-plate': 50 };
const BOSS_ARRIVES = 0.3; // fraction of the fight that has passed when the boss walks in
const QUEEN_BROOD_EVERY = 6; // seconds between the Hive Queen's spawns
const QUEEN_BROOD_MAX = 16;

export const BUILD_SECONDS = 90;
/** Between fights the cosmetic animation clock runs at this fraction of normal speed ("standby"). */
export const IDLE_ANIM_SPEED = 0.35;
/** Fights last 3 minutes at level 1 and grow to 10 minutes by level 30. */
export const fightSeconds = (level: number): number => Math.min(600, 180 + (level - 1) * (420 / 29));
// Level 1 is gentle enough to learn on: about 8 slow enemies hitting for ~3 damage/s each.
// 60 percent more enemies than the first design, each a bit weaker, arriving in waves (see spawnEnemies): a busy field and a
// long fight, but the total strength is only modestly higher. Measured against the headless test: 2, 4 and 6 turrets at levels 1, 3, 5.
export const enemyCount = (level: number): number => Math.round(1.3 * (10 + 5 * Math.min(level, 10) + 3 * Math.max(0, level - 10)));
export const enemyHp = (level: number): number => 36 * (1 + 0.14 * Math.min(level - 1, 9) + 0.012 * Math.max(0, level - 10));
export const enemySpeed = (level: number): number => Math.min(2.2, 0.9 + 0.03 * level);
/** Enemies arrive in packs from one direction: bigger packs later, so the defence has to handle bursts, not a trickle. */
/** How many waves a level is split into, and the time between one wave starting and the next (seconds). */
export const waveCount = (level: number): number => Math.min(9, 4 + Math.floor(level / 4));
export const waveGap = (level: number): number => Math.round(Math.max(14, 26 - level * 0.4)); // seconds of calm after a wave is destroyed: about 25 at first, 14 by level 30
const FIRST_WAVE_AT = 1; // the build phase already gave the player time; the fight starts at once
const PACK_GAP = 0.9; // seconds between the packs of one wave
export const packSize = (level: number): number => Math.min(14, 2 * (1 + Math.floor(level / 3)));
/** Half-width of the playable square round the core: small at first, growing with each level. */
export const arenaHalf = (level: number): number => Math.min(80, 22 + level * 4);
export const enemyDamage = (level: number): number => 0.6 * (2.5 + level * 0.75);

/** Small deterministic random generator so a level always spawns the same way. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface RunOptions {
  /** Override round lengths (seconds); used by tests and for quick play-testing. */
  buildSeconds?: number;
  fightSeconds?: number;
  /** difficulty level (see difficulty.ts); defaults to normal */
  difficulty?: DifficultyId;
  /** fixed playable half-size in tiles (the tutorial uses a small one); otherwise the arena grows with the level */
  arenaHalf?: number;
  /** roll a random omen for each level (off in the tutorial and in most tests) */
  omens?: boolean;
  /** false = no enemies at all (tests of the factory and robots, which must not be interrupted by a won level) */
  enemies?: boolean;
}

export class Run {
  level = 1;
  phase: Phase = 'build';
  timer: number;
  spawned = 0;
  /** the tech whose research has just finished (the game shows a message, then clears this) */
  finishedResearch: string | null = null;
  /** seconds of the build phase still left in which the factory runs (see cooldownLength) */
  cooldownLeft = 0;
  /** id of this level's boss once it has walked in; 0 before that */
  bossId = 0;
  private queenTimer = QUEEN_BROOD_EVERY;
  private extraId = 100000;
  private spawnAcc = 0;
  private straggle = 0;
  private waveIdx = 0;
  private waveLeft = 0;
  private lastWaveSize = 0;
  private waveBearing = 0;
  private packTimer = 0;
  private sinceWave = 0;
  private nextWaveIn = 0;
  private breathing = false;
  private frontAngle = 0;
  private packs = 0;
  private random: () => number;

  readonly difficulty: Difficulty;
  /** iron plates spent on the repairs done at the start of this build phase (Hard and Extreme) */
  repairBill = 0;

  constructor(readonly world: World, private opts: RunOptions = {}) {
    this.difficulty = difficultyById(opts.difficulty);
    this.world.runLevel = this.level;
    this.timer = this.buildLength();
    this.random = rng(1);
    this.applyArena();
  }

  /** Sets how much of the map is in play for the current level. */
  applyArena(): void { if (this.world.plots) return; this.world.setArenaHalf(this.opts.arenaHalf ?? arenaHalf(this.level)); }

  buildLength(): number { return this.opts.buildSeconds ?? this.difficulty.buildSeconds ?? 1e9; }
  fightLength(): number { return this.opts.fightSeconds ?? fightSeconds(this.level); }
  /** this level's omen (a twist on the fight), if any */
  omen(): Omen | null { return this.opts.omens ? omenFor(this.world.seed, this.level) : null; }
  toSpawn(): number { return Math.max(1, Math.round(enemyCount(this.level) * (this.omen()?.count ?? 1))); }
  /** Where the fight is up to, for the top bar: the wave number, how many there will be, and (in a breather) seconds until the next. */
  waveInfo(): { wave: number; of: number; breather: number | null } {
    return { wave: Math.min(this.waveIdx + (this.breathing || this.waveIdx === 0 ? 1 : 0), waveCount(this.level)), of: waveCount(this.level), breather: this.breathing || (this.waveIdx === 0 && this.phase === 'fight') ? Math.max(0, this.nextWaveIn) : null };
  }
  /** Plates paid for calling the next wave early: the seconds of calm skipped, worth a little more on later levels. 0 if it cannot be called now. */
  earlyCallBonus(): number {
    const wi = this.waveInfo();
    if (this.phase !== 'fight' || !this.breathing || this.world.enemies.length > 0 || wi.breather === null || wi.breather <= 3 || this.spawned >= this.toSpawn()) return 0;
    return this.world.freeBuild ? 0 : Math.round(wi.breather * (1 + this.level * 0.1));
  }
  /** Skips the rest of the breather and sends the next wave now. Returns the plates earned (0 in the tutorial), or -1 if it cannot be called. */
  callNextWave(): number {
    const wi = this.waveInfo();
    if (this.phase !== 'fight' || !this.breathing || this.world.enemies.length > 0 || wi.breather === null || wi.breather <= 3 || this.spawned >= this.toSpawn()) return -1;
    const bonus = this.earlyCallBonus();
    if (bonus > 0) addStock(this.world, { 'iron-plate': bonus }, 1);
    this.nextWaveIn = 0;
    return bonus;
  }
  /** True in the quiet between two waves of a fight: the field is clear, more waves are coming, and the next is a few seconds off. */
  inLull(): boolean {
    return this.phase === 'fight' && this.world.enemies.length === 0 && this.waveLeft === 0 && this.spawned < this.toSpawn() && this.breathing && this.nextWaveIn > 4;
  }
  /** which boss this level has, if any */
  boss(): EnemyKind | undefined { return bossForLevel(this.level); }
  /** true while this level's boss is still to arrive or alive */
  bossPending(): boolean { return !!this.boss() && (this.bossId === 0 || this.world.enemies.some((e) => e.id === this.bossId)); }

  /** Ends the build phase early (or on the timer) and starts the fight. */
  startFight(): void {
    if (this.phase !== 'build') return;
    this.phase = 'fight';
    this.cooldownLeft = 0;
    this.world.alerts = [];
    this.applyArena();
    for (const e of this.world.entities.values()) delete e.fresh; // the design is locked in
    this.timer = this.fightLength();
    this.spawned = 0;
    this.bossId = 0;
    this.queenTimer = QUEEN_BROOD_EVERY;
    this.spawnAcc = 0;
    this.straggle = 0;
    this.waveIdx = 0; this.waveLeft = 0; this.lastWaveSize = 0; this.packTimer = 0; this.sinceWave = 0; this.breathing = false;
    this.nextWaveIn = FIRST_WAVE_AT;
    this.random = rng(this.level * 7919 + this.world.seed);
    const om = this.omen();
    this.world.bounty = om?.bounty ?? 0;
    this.world.fog = om?.fog ?? 1;
    this.frontAngle = this.random() * Math.PI * 2;
    this.packs = 0;
  }

  /** Seconds the factory keeps running at the start of this level's build phase: longer on easy, and shorter as the levels climb. */
  cooldownLength(): number { return Math.round(this.difficulty.cooldown * Math.max(0.4, 1 - 0.02 * (this.level - 1))); }

  /** Called after a won level: move to the next build phase. */
  nextLevel(): void {
    if (this.phase !== 'won') return;
    this.level++;
    this.applyArena();
    this.phase = 'build';
    this.timer = this.buildLength();
    this.world.runLevel = this.level;
    this.cooldownLeft = this.world.freeBuild ? 0 : this.cooldownLength();
    this.world.enemies = [];
    this.world.shots = [];
    // robots are NOT repaired between rounds: a wounded army stays wounded, and dead robots have to be built again
    this.repairBill = 0;
    if (this.difficulty.repairCost > 0 && !this.world.freeBuild) this.repairBill = repairPaid(this.world, this.difficulty.repairCost); // harder levels charge for repairs
    else repairAll(this.world); // and so are the buildings that survived
    const core = this.world.core;
    if (core) core.hp = Math.min(core.maxHp, core.hp + core.maxHp * 0.25); // the core patches itself up a little between rounds
  }

  update(dt: number): void {
    // spawn pings fade out in every phase; they used to freeze on screen as a still ring once a fight ended
    if (this.world.alerts.length) {
      for (const a of this.world.alerts) a.age += dt;
      this.world.alerts = this.world.alerts.filter((a) => a.age < a.life);
    }
    if (this.world.hurt.length) {
      for (const h of this.world.hurt) h.age += dt;
      this.world.hurt = this.world.hurt.filter((h) => h.age < 1.5);
    }
    if (this.phase !== 'lost') this.world.anim += dt * (this.phase === 'fight' ? 1 : IDLE_ANIM_SPEED);
    if (this.phase === 'build') {
      if (this.cooldownLeft > 0) { // the breather after a won level: the factory (and robot fabricators) keep running while you build
        this.cooldownLeft = Math.max(0, this.cooldownLeft - dt);
        this.world.step(dt);
        stepCombat(this.world, dt);
        this.finishedResearch = advanceResearch(this.world, dt) ?? this.finishedResearch;
      } else stepAmbient(this.world, dt);
      this.timer -= dt;
      if (this.timer <= 0) this.startFight();
      return;
    }
    if (this.phase === 'won') { stepAmbient(this.world, dt); return; } // let the last shots and explosions play out
    if (this.phase !== 'fight') return; // on a loss the picture stays as it fell

    this.world.step(dt); // the factory only runs while a fight is on
    this.finishedResearch = advanceResearch(this.world, dt) ?? this.finishedResearch;
    this.spawnEnemies(dt);
    this.stepBoss(dt);
    stepCombat(this.world, dt);
    this.hurryStragglers(dt);
    this.unstickEnemies(dt);
    this.timer = Math.max(0, this.timer - dt);

    if (this.world.core && this.world.core.hp <= 0) this.phase = 'lost';
    else if (this.spawned >= this.toSpawn() && this.world.enemies.length === 0 && !this.bossPending()) { // the swarm is over: the level ends at once, whatever the clock says
      this.phase = 'won';
      this.world.alerts = []; // no stray rings once the swarm is dead
      this.world.hurt = [];
      if (!this.world.freeBuild) {
        addStock(this.world, LEVEL_REWARD, 1 + this.level * 0.05); // a bounty for holding the line
        if (this.boss()) addStock(this.world, BOSS_REWARD, 1 + this.level * 0.05);
      }
    }
  }

  /**
   * An enemy that is not fighting anything and has moved less than half a tile in 3 seconds is caught on the scenery.
   * It is pushed along the flow field (the route to the core); if it is caught again it is set down on free ground nearer the
   * core; a third time it gives up and falls. Enemies busy attacking (a building or robot within 9 tiles) are never touched,
   * and neither are flyers and bosses.
   */
  private unstickEnemies(dt: number): void {
    const w = this.world, core = w.core;
    if (!core) return;
    const cx = core.x + core.w / 2, cy = core.y + core.h / 2;
    for (const en of w.enemies) {
      const def = en.kind ? ENEMIES[en.kind] : undefined;
      if (def?.boss) { this.unstickBoss(en, cx, cy, dt); continue; }
      if (def?.flying) continue;
      if (solidAt(w, Math.floor(en.x), Math.floor(en.y), true)) { // somehow inside rock: lift it out at once
        const out = freeSpot(w, en.x, en.y, 8, 0);
        if (out) { en.x = out.x; en.y = out.y; en.path = undefined; en.pathT = undefined; }
      }
      if (en.sx === undefined) { en.sx = en.x; en.sy = en.y; en.st = 0; continue; } // the first sample is where it was born
      en.st = (en.st ?? 0) + dt;
      if (en.st < 3) continue;
      const moved = Math.hypot(en.x - (en.sx ?? en.x), en.y - (en.sy ?? en.y));
      en.sx = en.x; en.sy = en.y; en.st = 0;
      if (moved > 0.5) continue;
      const engageR = Math.max(9, (def?.range ?? 0) + 3); // a ranged enemy standing back and shooting is not stuck
      let busy = Math.hypot(cx - en.x, cy - en.y) < engageR;
      for (const e of w.entities.values()) {
        if (busy) break;
        if (e.kind === 'belt' || e.kind === 'inserter') continue;
        if (Math.hypot(e.x + e.w / 2 - en.x, e.y + e.h / 2 - en.y) < engageR) busy = true;
      }
      for (const s of w.soldiers) { if (busy) break; if (Math.hypot(s.x - en.x, s.y - en.y) < engageR) busy = true; }
      if (busy) continue;
      const tries = (en.nudged = (en.nudged ?? 0) + 1);
      if (tries >= 3) { en.hp = 0; continue; } // caught again and again: it gives up
      let spot: { x: number; y: number } | null = null;
      if (tries === 1) { // push it along the route to the core
        const route = routeAhead(w, variantFor(en.kind, def?.scale ?? 1), en.x, en.y, 4);
        const p = route?.[route.length - 1];
        if (p && !solidAt(w, Math.floor(p.x), Math.floor(p.y), true)) spot = p;
      }
      if (!spot) {
        const d = Math.hypot(cx - en.x, cy - en.y) || 1, step = Math.min(6, d);
        spot = freeSpot(w, en.x + ((cx - en.x) / d) * step, en.y + ((cy - en.y) / d) * step, 6, 0);
      }
      if (spot) { en.x = spot.x; en.y = spot.y; en.path = undefined; en.pathT = undefined; } else en.hp = 0;
      w.alerts.push({ x: en.x, y: en.y, age: 0, life: 2, big: false });
    }
  }

  /**
   * A boss is too big to be fooled by the scenery: if it has not moved half a tile in 3 seconds and is not busy smashing a building,
   * it crushes the rocks and trees in its way towards the core (a band 5 tiles wide, 8 long). If that does not free it, it is set
   * down on the nearest ground from which the core can be reached (tar and pools are never crushed, so they still look right).
   */
  private unstickBoss(en: Enemy, cx: number, cy: number, dt: number): void {
    const w = this.world;
    if (en.sx === undefined) { en.sx = en.x; en.sy = en.y; en.st = 0; return; }
    en.st = (en.st ?? 0) + dt;
    if (en.st < 3) return;
    const moved = Math.hypot(en.x - (en.sx ?? en.x), en.y - (en.sy ?? en.y));
    en.sx = en.x; en.sy = en.y; en.st = 0;
    if (moved > 0.5) { en.nudged = 0; return; }
    if (Math.hypot(cx - en.x, cy - en.y) < 6) return; // at the core: it is fighting
    for (const e of w.entities.values()) {
      if (e.kind === 'belt' || e.kind === 'inserter' || e.kind === 'junction' || e.kind === 'splitter') continue;
      if (Math.hypot(e.x + e.w / 2 - en.x, e.y + e.h / 2 - en.y) < 3.5) return; // chewing on a building
    }
    const tries = (en.nudged = (en.nudged ?? 0) + 1);
    const d = Math.hypot(cx - en.x, cy - en.y) || 1, ux = (cx - en.x) / d, uy = (cy - en.y) / d;
    if (tries <= 2) {
      for (let t = -1; t <= 8; t += 0.5) for (let o = -2; o <= 2; o++) {
        const x = Math.floor(en.x + ux * t - uy * o), y = Math.floor(en.y + uy * t + ux * o);
        if (!w.inBounds(x, y)) continue;
        const i = y * w.w + x;
        if (w.terrain[i] === 1 || w.terrain[i] === 2) w.terrain[i] = 0;
      }
      resetFields(w);
    } else {
      const spot = reachableSpot(w, 'big', en.x + ux * 6, en.y + uy * 6, 14) ?? reachableSpot(w, 'small', en.x + ux * 6, en.y + uy * 6, 14);
      if (spot) { en.x = spot.x; en.y = spot.y; }
      en.nudged = 0;
    }
    en.path = undefined; en.pathT = undefined;
    w.alerts.push({ x: en.x, y: en.y, age: 0, life: 3, big: true });
  }

  /**
   * A fight must never hang on one lost enemy. Once everything has spawned and only a few (non-boss) enemies are left: after
   * 10 seconds they are pinged on the map, after 18 they run twice as fast, and after 35 they give up and fall back.
   */
  private hurryStragglers(dt: number): void {
    const left = this.world.enemies;
    const stragglers = this.spawned >= this.toSpawn() && left.length > 0 && left.length <= 6 && left.every((e) => !(e.kind && ENEMIES[e.kind].boss));
    if (!stragglers) { this.straggle = 0; return; }
    const before = this.straggle;
    this.straggle += dt;
    if (before < 10 && this.straggle >= 10) for (const e of left) this.world.alerts.push({ x: e.x, y: e.y, age: 0, life: 6, big: true });
    if (before < 18 && this.straggle >= 18) for (const e of left) if (!e.rushed) { e.rushed = true; e.speed *= 2; }
    if (this.straggle >= 35) for (const e of left) e.hp = 0; // they give up: counted as kills, and the level ends
  }

  /** Marks where a pack (or the boss) has just appeared, so the player can always see where it came from. */
  private ping(id: number, big: boolean): void {
    const en = this.world.enemies.find((e) => e.id === id);
    if (en) this.world.alerts.push({ x: en.x, y: en.y, age: 0, life: big ? 6 : 4, big });
    if (big) this.world.cue('boss-arrive');
  }

  /**
   * Enemies come in WAVES: each wave is a quick surge (its packs arrive a second or so apart, mostly from one side). The next
   * wave does not start until the last one has been killed AND a breather has passed (waveGap), so there is always a real gap
   * to mine and repair in; a wave that drags on (a straggler) is not waited for longer than a minute.
   */
  private spawnEnemies(dt: number): void {
    if (this.opts.enemies === false) return;
    const total = this.toSpawn();
    if (this.spawned + this.waveLeft >= total && this.waveLeft === 0) return;
    const nWaves = waveCount(this.level);
    this.sinceWave += dt;
    if (this.waveLeft === 0 && this.spawned < total) {
      if (this.waveIdx > 0 && !this.breathing) {
        if (this.world.enemies.length === 0) { this.breathing = true; this.nextWaveIn = waveGap(this.level); if (this.spawned < this.toSpawn()) this.world.cue('wave-clear'); } // a small ding; the last wave has the level-complete fanfare instead
        else if (this.sinceWave > 90) { this.breathing = true; this.nextWaveIn = 3; } // only a wave that has dragged on for a minute and a half (a lost straggler) is not waited for
      }
      if (this.waveIdx === 0 || this.breathing) {
        this.nextWaveIn -= dt;
        if (this.nextWaveIn <= 0) this.startWave(total, nWaves);
      }
    }
    if (this.waveLeft > 0) {
      this.packTimer -= dt;
      while (this.packTimer <= 0 && this.waveLeft > 0) {
        this.packTimer += PACK_GAP;
        const om = this.omen();
        const spread = (this.random() - 0.5) * 0.9; // a wave hits one side, spread a little
        const angle = om?.twoFronts ? this.frontAngle + (this.packs++ % 2) * Math.PI + spread * 0.4 : this.waveBearing + spread;
        let last = 0;
        const n = Math.min(packSize(this.level), this.waveLeft);
        for (let i = 0; i < n; i++) last = this.spawnOne(angle);
        this.waveLeft -= n;
        this.ping(last, false);
      }
    }
  }

  /**
   * Which way the next wave comes from. The first wave of a level is a free pick of any open edge of the explored land; later
   * waves lean towards the edges you have defended least (few turrets, coils, walls and robots nearby), so a defence that only
   * covers one side gets tested on the others. Without opened squares (the tutorial) it is a random bearing.
   */
  chooseBearing(): number {
    const w = this.world, core = w.core;
    if (!w.plots || !core) return this.random() * Math.PI * 2;
    const edges = exposedEdges(w.plots);
    if (!edges.length) return this.random() * Math.PI * 2;
    const cx = core.x + core.w / 2, cy = core.y + core.h / 2;
    const weights = edges.map((e) => {
      if (this.waveIdx === 0) return 1; // the opening wave could come from anywhere
      const mx = (e.x0 + e.x1) / 2, my = (e.y0 + e.y1) / 2;
      let guard = 0;
      for (const b of w.entities.values()) {
        const k = b.kind === 'turret' || b.kind === 'coil' ? 3 : b.kind === 'wall' ? 0.5 : 0;
        if (k && Math.hypot(b.x + b.w / 2 - mx, b.y + b.h / 2 - my) < 20) guard += k;
      }
      for (const s of w.soldiers) if (Math.hypot(s.x - mx, s.y - my) < 20) guard += 1;
      return 0.4 + 3.6 / (1 + guard / 4); // 4.0 for an undefended edge, falling towards 0.4 for a heavily defended one
    });
    let t = this.random() * weights.reduce((a, b) => a + b, 0), i = 0;
    for (; i < weights.length - 1; i++) { t -= weights[i]; if (t < 0) break; }
    const e = edges[i];
    return Math.atan2((e.y0 + e.y1) / 2 - cy, (e.x0 + e.x1) / 2 - cx);
  }

  private startWave(total: number, nWaves: number): void {
    // waves build through the level: the first is about 60% of an even share, the last about 140%, so the pressure climbs to a finale
    const weight = (i: number) => 0.6 + (nWaves > 1 ? (0.8 * i) / (nWaves - 1) : 0.4);
    let sum = 0; for (let i = 0; i < nWaves; i++) sum += weight(i);
    const size = this.waveIdx >= nWaves - 1 ? total - this.spawned : Math.min(Math.round((total * weight(this.waveIdx)) / sum), total - this.spawned);
    this.waveIdx++;
    this.waveLeft = Math.max(1, size);
    this.lastWaveSize = this.waveLeft;
    this.waveBearing = this.chooseBearing();
    this.packTimer = 0;
    this.sinceWave = 0;
    this.breathing = false;
  }

  /** Brings the level's boss in part-way through the fight, and lets the Hive Queen add to her brood. */
  private stepBoss(dt: number): void {
    const kind = this.boss();
    if (!kind) return;
    if (this.bossId === 0) {
      if (this.fightLength() - this.timer < this.fightLength() * BOSS_ARRIVES) return;
      this.bossId = this.spawnOne(this.random() * Math.PI * 2, kind);
      this.ping(this.bossId, true);
      return;
    }
    if (kind !== 'boss-queen') return;
    const queen = this.world.enemies.find((e) => e.id === this.bossId);
    if (!queen) return;
    this.queenTimer -= dt;
    if (this.queenTimer > 0) return;
    this.queenTimer = QUEEN_BROOD_EVERY;
    const brood = this.world.enemies.filter((e) => e.id !== this.bossId).length;
    if (brood >= QUEEN_BROOD_MAX) return;
    for (let i = 0; i < 3; i++) this.spawnOne(0, i === 2 ? 'drone-1' : 'swarmling', queen.x + (i - 1) * 1.2, queen.y + 1.5);
  }

  /** Adds one enemy. Ordinary wave enemies count towards the level's quota; bosses and escorts (a forced kind) do not. */
  private spawnOne(packAngle: number, forced?: EnemyKind, atX?: number, atY?: number): number {
    const core = this.world.core;
    const cx = core ? core.x + core.w / 2 : this.world.w / 2;
    const cy = core ? core.y + core.h / 2 : this.world.h / 2;
    const angle = packAngle + (this.random() - 0.5) * 0.35;
    // enemies arrive at the edge of the playable square, wherever that currently is
    const a = this.world.arena;
    let x: number, y: number;
    if (this.world.plots) { // plot mode: they come in over an edge of the explored land, the one nearest the pack's bearing
      let best = exposedEdges(this.world.plots)[0], bd = 9;
      for (const e of exposedEdges(this.world.plots)) {
        const d = Math.abs(Math.atan2(Math.sin(Math.atan2((e.y0 + e.y1) / 2 - cy, (e.x0 + e.x1) / 2 - cx) - angle), Math.cos(Math.atan2((e.y0 + e.y1) / 2 - cy, (e.x0 + e.x1) / 2 - cx) - angle)));
        if (d < bd) { bd = d; best = e; }
      }
      const t = 0.1 + this.random() * 0.8, inset = 1.5 + this.random() * 1.5;
      const ex = best.x0 + (best.x1 - best.x0) * t, ey = best.y0 + (best.y1 - best.y0) * t;
      x = atX ?? ex + (best.side === 1 ? -inset : best.side === 3 ? inset : 0);
      y = atY ?? ey + (best.side === 2 ? -inset : best.side === 0 ? inset : 0);
    } else {
      const half = Math.min(a.x1 - a.x0, a.y1 - a.y0) / 2 - 1.5 - this.random() * 1.5;
      const reach = half / Math.max(Math.abs(Math.cos(angle)), Math.abs(Math.sin(angle)));
      x = atX ?? Math.max(a.x0 + 1, Math.min(a.x1 - 1, cx + Math.cos(angle) * reach));
      y = atY ?? Math.max(a.y0 + 1, Math.min(a.y1 - 1, cy + Math.sin(angle) * reach));
    }
    const kind = forced ?? pickEnemy(this.level, this.random(), this.omen()?.ranged ?? 1);
    const def = ENEMIES[kind];
    const om = def.boss ? null : this.omen(); // omens change the rank and file, not the bosses
    const hp = enemyHp(this.level) * def.hp * this.difficulty.enemyHp * (om?.hp ?? 1);
    // a ground enemy must start somewhere the core can be reached from: snap it out of rock, or out of a sealed-off pocket
    if (!def.flying && atX === undefined) {
      const v = variantFor(kind, def.scale);
      if (!reachable(this.world, v, x, y)) { const s = reachableSpot(this.world, v, x, y, 12); if (s) { x = s.x; y = s.y; } }
    }
    const id = forced ? ++this.extraId : ++this.spawned;
    this.world.enemies.push({
      id, x, y, hp, maxHp: hp, speed: enemySpeed(this.level) * def.speed * (om?.speed ?? 1), dmg: enemyDamage(this.level) * def.dmg * this.difficulty.enemyDmg * (om?.dmg ?? 1),
      born: this.world.time, kind,
    });
    return id;
  }
}
