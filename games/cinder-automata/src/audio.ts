// Sound effects (Web Audio). Files live in public/audio/sfx/<name>.mp3; any that are missing are simply skipped, so the
// game runs the same before the sounds have been made. Mute and volume are remembered in this browser.

/** Every sound effect. Files named <name>.mp3, <name>-2.mp3, <name>-3.mp3 ... are takes of the same sound; one is picked at random. */
export type SfxName = 'ui-click' | 'ui-open' | 'ui-close' | 'ui-denied' | 'ui-star' | 'ui-level-complete' | 'ui-defeat' | 'ui-fight-start' | 'ui-build-start'
  | 'loop-drill' | 'loop-smelter' | 'loop-belt' | 'loop-assembler' | 'loop-generator' | 'loop-coil-idle' | 'loop-ambience-ash' | 'loop-ambience-fight'
  | 'place-building' | 'place-belt' | 'remove-building' | 'rotate' | 'pickup' | 'drop-building'
  | 'coil-zap' | 'robot-shot' | 'bullet-hit' | 'enemy-death' | 'boss-arrive' | 'structure-destroyed' | 'structure-hit' | 'core-alarm';

const KEY = 'cinder-automata.audio.v1';

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private buffers = new Map<string, AudioBuffer[]>();
  private lastPlayed = new Map<string, number>();
  private loading = false;
  muted = false;
  /** the overall level, and the separate levels of the music and of every sound effect (including the machine hum), each 0 to 1 */
  volume = 0.7;
  musicVolume = 1;
  sfxVolume = 1;

  constructor() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY) ?? '{}') as { muted?: boolean; volume?: number; music?: number; sfx?: number };
      if (typeof s.music === 'number') this.musicVolume = Math.min(1, Math.max(0, s.music));
      if (typeof s.sfx === 'number') this.sfxVolume = Math.min(1, Math.max(0, s.sfx));
      if (typeof s.muted === 'boolean') this.muted = s.muted;
      if (typeof s.volume === 'number') this.volume = Math.min(1, Math.max(0, s.volume));
    } catch { /* storage blocked: defaults */ }
  }

  private save(): void {
    try { localStorage.setItem(KEY, JSON.stringify({ muted: this.muted, volume: this.volume, music: this.musicVolume, sfx: this.sfxVolume })); } catch { /* fine */ }
  }

  /** Call from a user gesture (browsers keep audio locked until one happens). */
  unlock(): void {
    const first = !this.ctx;
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : this.volume;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    if (!this.loading) { this.loading = true; void this.loadAll(); }
    if (first && this.musicWanted) void this.playMusic(this.musicWanted); // only the very first click starts the waiting track; later clicks never restart music
  }

  private async loadAll(): Promise<void> {
    const base = import.meta.env.BASE_URL;
    let files: { name: string; file: string }[] = [];
    try { files = ((await (await fetch(`${base}audio/manifest.json`)).json()) as { sfx: { name: string; file: string }[] }).sfx; } catch { return; }
    await Promise.all(files.map(async (f) => {
      try {
        const r = await fetch(`${base}${f.file}`);
        if (!r.ok) return;
        const buf = await this.ctx!.decodeAudioData(await r.arrayBuffer());
        const group = f.name.replace(/-\d+$/, ''); // place-building-2 is another take of place-building
        this.buffers.set(group, [...(this.buffers.get(group) ?? []), buf]);
      } catch { /* missing or undecodable: skip it */ }
    }));
  }

  // ---- music: one looping track at a time, faded in and out. Files: public/audio/music/<name>.mp3 (see tools/make-music-loop.py) ----
  private musicBufs = new Map<string, AudioBuffer>();
  private music: { name: string; src: AudioBufferSourceNode; gain: GainNode } | null = null;
  private musicWanted: string | null = null;
  private static SFX_BOOST = 1.35; // effects were sitting too far under the music
  private static MUSIC_LEVEL = 0.3; // music sits under the effects

  /** Plays a track, fading out whatever was playing. `loop` false is for stingers. Resolves true if the track started (or was already playing). */
  async playMusic(name: string, fade = 2, loop = true): Promise<boolean> {
    this.musicWanted = name;
    if (!this.ctx || !this.master) return false; // still locked: it starts on the first click (see unlock)
    if (this.music?.name === name) return true;
    const buf = await this.loadMusic(name);
    if (!buf) return false;
    if (this.musicWanted !== name || !this.ctx || !this.master) return false; // asked for something else while it loaded
    this.fadeOutMusic(fade); // only now, so a track that is missing leaves the current music alone
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = loop;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(AudioEngine.MUSIC_LEVEL * this.musicVolume, this.ctx.currentTime + fade);
    src.connect(gain).connect(this.master);
    src.start();
    this.music = { name, src, gain };
    if (!loop) src.onended = () => { if (this.music?.src === src) this.music = null; };
    return true;
  }

  /** Fetches and decodes a track (once). Decoded at 24 kHz to halve the memory a three-minute track takes; it plays back fine at this rate. */
  private async loadMusic(name: string): Promise<AudioBuffer | null> {
    const have = this.musicBufs.get(name);
    if (have) return have;
    try {
      const r = await fetch(`${import.meta.env.BASE_URL}audio/music/${name}.mp3`);
      if (!r.ok) return null;
      const data = await r.arrayBuffer();
      const buf = await new OfflineAudioContext(2, 1, 24000).decodeAudioData(data);
      this.musicBufs.set(name, buf);
      return buf;
    } catch { return null; }
  }

  /** Decodes tracks ahead of time, one after another, so switching to them later is instant. */
  async preloadMusic(names: string[]): Promise<void> {
    if (!this.ctx) return;
    for (const n of names) await this.loadMusic(n);
  }

  /** Frees decoded tracks that are not in this list (and not playing). */
  keepMusic(names: string[]): void {
    for (const k of [...this.musicBufs.keys()]) if (!names.includes(k) && this.music?.name !== k) this.musicBufs.delete(k);
  }

  /** Plays the first of these tracks that exists (for example fight-3, falling back to fight-1). */
  async playFirstMusic(names: string[], fade = 2, loop = true): Promise<boolean> {
    for (const n of names) if (await this.playMusic(n, fade, loop)) return true;
    return false;
  }

  // ---- beds: quiet looping sounds (machines working, wind) whose loudness the game sets from what is on screen ----
  private beds = new Map<string, { src: AudioBufferSourceNode; gain: GainNode; level: number }>();

  /** Sets how loud a looping bed plays (0 = silent and stopped). Changes glide rather than jump. */
  setBed(name: SfxName, level: number): void {
    if (!this.ctx || !this.master) return;
    let bed = this.beds.get(name);
    const t = this.ctx.currentTime;
    if (level < 0.01) {
      if (!bed || bed.level === 0) return;
      bed.level = 0;
      bed.gain.gain.setTargetAtTime(0, t, 0.25);
      const b = bed;
      setTimeout(() => { if (b.level === 0) { try { b.src.stop(); } catch { /* already stopped */ } if (this.beds.get(name) === b) this.beds.delete(name); } }, 1800);
      return;
    }
    if (!bed) {
      const buf = this.buffers.get(name)?.[0];
      if (!buf) return;
      const src = this.ctx.createBufferSource();
      src.buffer = buf; src.loop = true;
      const gain = this.ctx.createGain();
      gain.gain.value = 0;
      src.connect(gain).connect(this.master);
      src.start(0, Math.random() * buf.duration); // start part-way in, so several machines do not hum in phase
      bed = { src, gain, level: 0 };
      this.beds.set(name, bed);
    }
    bed.level = level;
    bed.gain.gain.setTargetAtTime(level * this.sfxVolume, t, 0.35);
  }

  stopBeds(): void { for (const n of [...this.beds.keys()]) this.setBed(n as SfxName, 0); }

  stopMusic(fade = 2): void {
    this.musicWanted = null;
    this.fadeOutMusic(fade);
  }

  private fadeOutMusic(fade: number): void {
    const m = this.music;
    if (!m || !this.ctx) return;
    this.music = null;
    const t = this.ctx.currentTime;
    m.gain.gain.cancelScheduledValues(t);
    m.gain.gain.setValueAtTime(m.gain.gain.value, t);
    m.gain.gain.linearRampToValueAtTime(0, t + fade);
    m.src.stop(t + fade + 0.05);
  }

  /** Plays a sound, a touch different each time (pitch) so repeats do not sound mechanical. */
  play(name: SfxName, opts: { volume?: number; pitchVar?: number; delay?: number; minGap?: number } = {}): void {
    if (this.muted || !this.ctx || !this.master) return;
    const takes = this.buffers.get(name);
    if (!takes?.length) return;
    const now = performance.now();
    if (opts.minGap && now - (this.lastPlayed.get(name) ?? -1e9) < opts.minGap) return; // e.g. dragging a line of belts must not machine-gun the sound
    this.lastPlayed.set(name, now);
    const buf = takes[Math.floor(Math.random() * takes.length)];
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const v = opts.pitchVar ?? 0.04;
    src.playbackRate.value = 1 + (Math.random() * 2 - 1) * v;
    const g = this.ctx.createGain();
    g.gain.value = Math.min(1.4, (opts.volume ?? 1) * AudioEngine.SFX_BOOST * this.sfxVolume);
    src.connect(g).connect(this.master);
    src.start(this.ctx.currentTime + (opts.delay ?? 0));
  }

  setMuted(m: boolean): void {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : this.volume;
    this.save();
  }

  /** Music level, 0 to 1. Takes effect at once on the track that is playing. */
  setMusicVolume(v: number): void {
    this.musicVolume = Math.min(1, Math.max(0, v));
    if (this.music && this.ctx) { const g = this.music.gain.gain; g.cancelScheduledValues(this.ctx.currentTime); g.setValueAtTime(AudioEngine.MUSIC_LEVEL * this.musicVolume, this.ctx.currentTime); }
    this.save();
  }

  /** Level of all sound effects and machine loops, 0 to 1. */
  setSfxVolume(v: number): void {
    this.sfxVolume = Math.min(1, Math.max(0, v));
    if (this.ctx) for (const b of this.beds.values()) b.gain.gain.setTargetAtTime(b.level * this.sfxVolume, this.ctx.currentTime, 0.05);
    this.save();
  }

  toggleMute(): boolean { this.setMuted(!this.muted); return this.muted; }

  setVolume(v: number): void {
    this.volume = Math.min(1, Math.max(0, v));
    if (this.master && !this.muted) this.master.gain.value = this.volume;
    this.save();
  }
}

export const audio = new AudioEngine();
