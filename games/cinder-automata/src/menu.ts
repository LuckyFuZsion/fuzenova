// The in-game menu: a guide, and a picture book of every building, robot, enemy and item.
import { kindIcon } from './icons';
import { COSTS, costText } from './sim/costs';
import { BOSS_ORDER, ENEMIES, ENEMY_ORDER } from './sim/enemies';
import { AMMO, FUEL, ITEMS, ORE_ITEM, ORE_NAMES, RECIPE_LIST, SMELTS, type ItemId } from './sim/items';
import { FAB_CAPACITY, ROBOTS, ROBOT_ORDER, ROBOT_SPACE } from './sim/robots';
import { KINDS, STRUCTURE_HP, type Kind } from './sim/world';
import { audio } from './audio';
import { itemIconUrl } from './sprites';
import { TOOL_HELP } from './toolhelp';
import { COIL_RANGE } from './sim/combat';
import { TURRET_BASE_RANGE, VARIANTS } from './sim/turrets';

type TabId = 'guide' | 'buildings' | 'robots' | 'enemies' | 'items' | 'controls' | 'sound';
const TABS: { id: TabId; label: string }[] = [
  { id: 'guide', label: 'How to play' }, { id: 'buildings', label: 'Buildings' }, { id: 'robots', label: 'Robots' },
  { id: 'enemies', label: 'Enemies' }, { id: 'items', label: 'Items & recipes' }, { id: 'controls', label: 'Controls' }, { id: 'sound', label: 'Sound' },
];

export interface MenuHooks {
  tools: { kind: Kind; key: string }[];
  onOpen(): void;
  onClose(): void;
  onTutorial(): void;
  onExit(): void;
}

const base = () => import.meta.env.BASE_URL;
const itemImg = (id: ItemId) => { const u = itemIconUrl(id); return u ? `<img src="${u}" alt="" title="${ITEMS[id].name}">` : `<i class="swatch" style="background:${ITEMS[id].color}"></i>`; };
const stat = (label: string, value: string) => `<span class="stat"><small>${label}</small>${value}</span>`;

export class Menu {
  private root: HTMLElement;
  private body: HTMLElement;
  private tabs: HTMLElement;
  private tab: TabId = 'guide';
  isOpen = false;

  constructor(private hooks: MenuHooks) {
    this.root = document.getElementById('menu')!;
    this.root.innerHTML = `<div class="win" role="dialog" aria-label="Menu">
      <header><h2><img class="wordmark" src="${base()}logo/logo-text.png" alt="Cinder Automata" onerror="this.replaceWith(document.createTextNode('Cinder Automata'))"></h2><button class="x" data-act="close" aria-label="Close menu">&times;</button></header>
      <nav id="menuTabs"></nav><section id="menuBody"></section>
      <footer><button data-act="close" class="primary">Back to the game</button><button data-act="tutorial">Play the tutorial</button><button data-act="exit">Save &amp; exit to title</button></footer>
    </div>`;
    this.tabs = this.root.querySelector('#menuTabs')!;
    this.body = this.root.querySelector('#menuBody')!;
    this.root.addEventListener('input', (e) => {
      const el = e.target as HTMLInputElement;
      if (el.dataset.vol) {
        const v = Number(el.value) / 100;
        if (el.dataset.vol === 'master') audio.setVolume(v); else if (el.dataset.vol === 'music') audio.setMusicVolume(v); else audio.setSfxVolume(v);
        const out = el.parentElement?.querySelector('output'); if (out) out.textContent = `${el.value}%`;
      }
    });
    this.root.addEventListener('change', (e) => {
      const el = e.target as HTMLInputElement;
      if (el.dataset.vol === 'sfx' || el.dataset.vol === 'master') { audio.unlock(); audio.play('place-building', { volume: 0.6, pitchVar: 0 }); } // a sample, so you can judge the level
      if (el.dataset.mute !== undefined) { audio.unlock(); audio.setMuted(el.checked); const b = document.getElementById('muteIcon'); if (b) b.textContent = audio.muted ? 'Sound off' : 'Sound on'; document.getElementById('muteBtn')?.classList.toggle('on', !audio.muted); }
    });
    this.root.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      const act = t.closest<HTMLElement>('[data-act]')?.dataset.act;
      if (act === 'close') this.close();
      else if (act === 'tutorial') this.hooks.onTutorial();
      else if (act === 'exit') this.hooks.onExit();
      else if (t === this.root) this.close(); // click outside the window
      const tab = t.closest<HTMLElement>('[data-tab]')?.dataset.tab as TabId | undefined;
      if (tab) this.show(tab);
    });
  }

  open(tab?: TabId): void {
    this.isOpen = true;
    this.root.hidden = false;
    this.hooks.onOpen();
    this.show(tab ?? this.tab);
  }

  close(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.root.hidden = true;
    this.hooks.onClose();
  }

  toggle(): void { if (this.isOpen) this.close(); else this.open(); }

  private show(tab: TabId): void {
    this.tab = tab;
    this.tabs.innerHTML = TABS.map((t) => `<button data-tab="${t.id}" class="${t.id === tab ? 'on' : ''}">${t.label}</button>`).join('');
    this.body.scrollTop = 0;
    this.body.innerHTML = { guide: this.guide, buildings: this.buildings, robots: this.robots, enemies: this.enemies, items: this.items, controls: this.controls, sound: this.sound }[tab].call(this);
    this.body.className = tab;
  }

  // ---------- pages ----------
  private sound(): string {
    const row = (id: string, label: string, note: string, v: number) => `<label class="vol"><span class="vol-t"><b>${label}</b><small>${note}</small></span>
      <input type="range" min="0" max="100" step="1" value="${Math.round(v * 100)}" data-vol="${id}" aria-label="${label}"><output>${Math.round(v * 100)}%</output></label>`;
    return `<div class="prose"><h3>Volume</h3>
      ${row('master', 'Master', 'Everything at once', audio.volume)}
      ${row('music', 'Music', 'The menu, build, battle and boss tracks', audio.musicVolume)}
      ${row('sfx', 'Sound effects', 'Clicks, building, combat and the machine hum', audio.sfxVolume)}
      <label class="vol mutebox"><input type="checkbox" data-mute ${audio.muted ? 'checked' : ''}> <span class="vol-t"><b>Mute everything</b><small>The same as pressing N</small></span></label>
      <p class="tip">Your choices are remembered on this device.</p></div>`;
  }

  private guide(): string {
    return `<div class="prose">
      <h3>The idea</h3>
      <p>Enemy machines march on your <b>Cinder Core</b>. Build a factory that makes what you need to stop them, then hold the line, level after level.</p>
      <div class="steps">
        <div><b>1. Build</b><span>Between fights you get a build phase. Place drills on ore, lay belts, smelt plates, and set up your defence. Building is paid for from the <b>Core stock</b>.</span></div>
        <div><b>2. Fight</b><span>Press <i>Start fight now</i> (or wait for the timer). The factory <b>runs during fights</b> and for a breather after each win (longer on easy, shorter as levels climb); the rest of the build phase it is paused. You can keep building while it runs.</span></div>
        <div><b>3. Survive</b><span>Turrets, Storm coils and your robots defend the base. Enemies attack turrets and walls first. Lose the core and the run is over.</span></div>
        <div><b>4. Grow</b><span>Win a level and choose a new <b>square of the map</b> to open (the game opens a second one for you). New squares bring new ores. Your buildings are patched up, but your robots stay as hurt as they are, and the next fight is bigger.</span></div>
      </div>
      <h3>What each resource is for</h3>
      <ul>
        <li><b>Iron plates</b> are the everyday resource. They pay for most buildings, feed turrets as basic ammo (weak), and are what Robot fabricators turn into robots.</li>
        <li><b>Copper plates</b> are for <b>building</b> the better machines: turret (5), assembler (10), Robot fabricator (20), Ember generator (10), Storm coil (30) and power poles (1). Copper is <i>not</i> ammo or fuel. It is also an ingredient of bullet casings.</li>
        <li><b>Ore to plates:</b> a drill on ore &rarr; belt &rarr; smelter &rarr; belt. Do that for both iron and copper.</li>
        <li><b>Paying for things:</b> buildings are paid for from the <b>Core stock</b> (top right). Send finished plates into the <b>Core</b> on a belt to raise it. Kills and finishing levels add some too.</li>
        <li><b>Better ammo:</b> a <b>bullet</b> is made in an Assembler from a bullet casing (lead plate + copper plate) and gunpowder (coal + sulfur). Each bullet does 2.5&times; the damage of an iron-plate shot and gives 10 shots instead of 4.</li>
        <li><b>Research (T):</b> paid for in <b>science packs</b>. Set an Assembler to a science pack recipe, feed it plates, and belt the packs into the Core. Projectile packs (iron + copper) buy gun turret upgrades, ammunition and stronger walls; electromagnetic packs (copper + tin) buy Storm coil upgrades; robotics packs (iron + lead) buy new robot designs, better robot ammunition and armour. Everything you build starts modest, so research is how it grows.</li>
        <li><b>Turret upgrades:</b> research <b>Turret designs</b> (T): level 1 unlocks the <b>Scatter gun</b> (short range, sprays a cone, great against swarms) and level 2 the <b>Sniper</b> (long range, slow, hits very hard). To get one, <b>double-click a gun turret</b> (with no building selected) and pick it from the panel. The upgrade costs plates, the turret keeps its ammunition, and going back to the plain gun turret is free.</li>
        <li><b>Clearing leftovers:</b> a belt that carries something nothing will use (say gunpowder with no bullet assembler) will jam. Build a <b>Scrap bin</b> (B) at the end, or put a filtered <b>inserter</b> in front of it to destroy just that one item.</li>
        <li><b>Reading an assembler:</b> the boxes under it show how much of each ingredient it holds (red when short), and a badge says what it needs. "N ready - take out" means finished items are waiting: put an <b>inserter</b> against it that carries them onto a belt to the Core. Changing its recipe throws away anything half-made.</li>
        <li><b>Power:</b> an Ember generator burns coal, charcoal or wood and, through power poles, runs <b>Storm coils</b>: chain lightning that needs no ammo.</li>
        <li><b>Robots:</b> a Robot fabricator turns iron plates into robots while a fight is on. They defend on their own. They do not heal, so keep building more.</li>
      </ul>
      <p class="tip">Stuck? Hover any building to see what it holds, pick one from the bar to see how to connect it, or open the <b>Buildings</b> tab above.</p>
    </div>`;
  }

  private buildings(): string {
    const cards = this.hooks.tools.map(({ kind, key }) => {
      const h = TOOL_HELP[kind];
      const cost = Object.entries(COSTS[kind]).map(([k, n]) => `${itemImg(k as ItemId)}<b>${n}</b>`).join('');
      return `<article class="card"><div class="pic" data-canvas="${kind}"></div>
        <div class="txt"><h4>${KINDS[kind].name} <kbd>${key}</kbd></h4>
          <div class="chips">${stat('Size', `${KINDS[kind].w}&times;${KINDS[kind].h}`)}${stat('Health', String(STRUCTURE_HP[kind]))}${kind === 'turret' ? stat('Range', `${TURRET_BASE_RANGE} tiles`) : kind === 'coil' ? stat('Range', `${COIL_RANGE} tiles`) : ''}<span class="stat cost"><small>Cost</small>${cost || 'free'}</span></div>
          ${h ? `<p><b>What it is.</b> ${h.what}</p><p><b>How to connect it.</b> ${h.connect}</p><p><b>What it does.</b> ${h.does}</p>` : ''}
        </div></article>`;
    }).join('');
    const core = `<article class="card"><div class="pic" data-canvas="core"></div><div class="txt"><h4>Cinder Core</h4>
      <div class="chips">${stat('Size', '3&times;3')}${stat('Health', String(STRUCTURE_HP.core))}</div>
      <p><b>What it is.</b> Your base. If enemies destroy it the run ends. It heals a little between levels.</p>
      <p><b>How to use it.</b> It holds your build budget. Belts that run into it, and inserters that drop into it, add their items to the Core stock. Kills and finished levels add plates too.</p></div></article>`;
    // canvases can't live inside an HTML string, so they are swapped in after it is placed
    queueMicrotask(() => {
      this.body.querySelectorAll<HTMLElement>('[data-canvas]').forEach((el) => {
        const kind = el.dataset.canvas as Kind;
        el.replaceChildren(kindIcon(kind, 120));
      });
    });
    // the two turret branches: a gun turret is upgraded in place (double-click it) once the Turret designs research allows
    const designs = (['scatter', 'sniper'] as const).map((v) => {
      const d = VARIANTS[v];
      const cost = Object.entries(d.cost).map(([k, n]) => `${itemImg(k as ItemId)}<b>${n}</b>`).join('');
      return `<article class="card"><div class="pic"><img src="${base()}sprites/turret-${v}-base.png" alt="${d.name}" style="max-height:112px;width:auto;object-fit:contain"></div><div class="txt">
        <h4>${d.name} <em>turret upgrade</em></h4>
        <div class="chips">${stat('Range', `${d.range} tiles`)}${stat('Shot every', `${d.cooldown}s`)}${stat('Damage', `x${d.dmgMul}`)}${d.cone ? stat('Hits', 'a whole cone') : ''}<span class="stat cost"><small>Upgrade cost</small>${cost}</span></div>
        <p>${d.blurb}</p><p><b>How to get it.</b> Research <b>Turret designs</b> level ${d.unlock} (T), then double-click a gun turret and pick it. Ammunition stays in the turret.</p></div></article>`;
    }).join('');
    return `<div class="cards">${core}${cards}${designs}</div>`;
  }

  private robots(): string {
    return `<div class="cards">${ROBOT_ORDER.map((t) => {
      const r = ROBOTS[t];
      return `<article class="card"><div class="pic"><img src="${base()}sprites/robot-top-${t}.png" alt="${r.name}"></div><div class="txt">
        <h4>${r.name} ${r.flying ? '<em>flying</em>' : ''}</h4>
        <div class="chips">${stat('Cost', `${itemImg('iron-plate')}<b>${r.cost}</b>`)}${stat('Room', `${ROBOT_SPACE[t]} of ${FAB_CAPACITY}`)}${stat('Build time', `${r.buildTime}s`)}${stat('Health', String(r.hp))}${stat('Range', `${r.range} tiles`)}${stat('Damage', `${Math.round(r.dps)}/s`)}${stat('Speed', String(r.speed))}</div>
        <p>${r.flying ? 'Flies over everything, so crawlers cannot bite it.' : 'Walks out on its own and fights. Crawlers stop to chew on it.'}</p></div></article>`;
    }).join('')}<p class="note">Build robots in a <b>Robot fabricator</b> (double-click it to choose which). They defend on their own and do not heal. Each fabricator has room for ${FAB_CAPACITY} space of robots at once (a scout takes ${ROBOT_SPACE.scout}, a Titan takes ${ROBOT_SPACE.titan}), so build more fabricators for a bigger army.</p></div>`;
  }

  private enemies(): string {
    return `<div class="cards">${[...ENEMY_ORDER, ...BOSS_ORDER].map((k) => {
      const e = ENEMIES[k];
      return `<article class="card${e.boss ? ' boss' : ''}"><div class="pic"><img src="${base()}sprites/enemy-${k}.png" alt="${e.name}"></div><div class="txt">
        <h4>${e.name} ${e.flying ? '<em>flying</em>' : ''}${e.boss ? '<em>boss</em>' : ''}</h4>
        <div class="chips">${stat(e.boss ? 'Boss at' : 'First seen', `level ${e.from}`)}${stat('Health', `&times;${e.hp}`)}${stat('Speed', `&times;${e.speed}`)}${stat('Damage', `&times;${e.dmg}`)}${e.armor ? stat(`<img class="hi" src="${base()}sprites/hud-armour.png" alt="">Armour`, `${e.armor} per hit`) : ''}${e.insulated ? stat(`<img class="hi" src="${base()}sprites/hud-insulated.png" alt="">Lightning`, 'resists (40% damage)') : ''}${e.range ? stat(`<img class="hi" src="${base()}sprites/hud-ranged.png" alt="">Ranged`, `${e.range} tiles`) : ''}</div>
        </div></article>`;
    }).join('')}<p class="note">These rogue automata march on your core. Numbers are multiples of the basic crawler for that level, and every level makes them tougher.</p></div>`;
  }

  private items(): string {
    const raw = ORE_ITEM.map((it, i) => (it ? `<div class="item">${itemImg(it)}<span>${ITEMS[it].name}</span><small>${i === 7 ? 'from forests' : 'mined from ' + ORE_NAMES[i].toLowerCase()}</small></div>` : '')).join('');
    const smelt = Object.entries(SMELTS).map(([a, b]) => `<div class="recipe">${itemImg(a as ItemId)}<span>&rarr;</span>${itemImg(b as ItemId)}<small>${ITEMS[a as ItemId].name} &rarr; ${ITEMS[b as ItemId].name}</small></div>`).join('');
    const recipes = RECIPE_LIST.map((r) => {
      const ins = Object.entries(r.inputs).map(([k, n]) => `${n > 1 ? `<b>${n}&times;</b>` : ''}${itemImg(k as ItemId)}`).join('<span>+</span>');
      return `<div class="recipe">${ins}<span>&rarr;</span>${r.count > 1 ? `<b>${r.count}&times;</b>` : ''}${itemImg(r.output)}<small>${r.name} &middot; ${r.time}s</small></div>`;
    }).join('');
    const fuel = Object.entries(FUEL).map(([k, s]) => `<div class="recipe">${itemImg(k as ItemId)}<small>${ITEMS[k as ItemId].name}: ${s}s of power</small></div>`).join('');
    const ammo = Object.entries(AMMO).map(([k, a]) => `<div class="recipe">${itemImg(k as ItemId)}<small>${ITEMS[k as ItemId].name}: ${a!.shots} shots, ${a!.damage} damage each</small></div>`).join('');
    return `<div class="prose"><h3>Raw resources</h3><div class="grid items">${raw}</div>
      <h3>Smelter (one input)</h3><div class="grid">${smelt}</div>
      <h3>Assembler recipes</h3><div class="grid">${recipes}</div>
      <h3>Generator fuel</h3><div class="grid">${fuel}</div>
      <h3>Turret ammo</h3><div class="grid">${ammo}</div></div>`;
  }

  private controls(): string {
    const row = (k: string, d: string) => `<tr><td>${k}</td><td>${d}</td></tr>`;
    const keys = this.hooks.tools.map((t) => row(`<kbd>${t.key}</kbd>`, KINDS[t.kind].name)).join('');
    return `<div class="prose"><table class="keys">
      ${row('<kbd>Click</kbd>', 'Place the selected building. Drag to lay belts and walls.')}
      ${row('<kbd>Right-click</kbd> / <kbd>X</kbd>', 'Remove a building. Anything you placed this build phase is refunded in full; after a fight has started, belts and inserters still refund fully and other buildings give back 75%')}
      ${row('<kbd>V</kbd>', 'Pick up the building under the cursor and put it down elsewhere: free, and it keeps its ammo and contents')}
      ${row('<kbd>W A S D</kbd> / arrows', 'Move the camera')}
      ${row('<kbd>Wheel</kbd> / middle-drag', 'Zoom / pan')}
      ${row('<kbd>R</kbd> / <kbd>Shift+R</kbd>', 'Rotate the selected building (inserters and drills turn themselves)')}
      ${row('<kbd>H</kbd>', 'Explain the selected building')}
      ${row('<kbd>Q</kbd>', 'Put the building away')}
      ${row('<kbd>F2</kbd>', 'Show or hide the controls reminder on screen')}
      ${row('<kbd>T</kbd>', 'Research: spend plates on permanent upgrades')}
      ${row('<kbd>F3</kbd>', 'Inspect mode: hover anything to see how it works')}
      ${row('<kbd>P</kbd>', 'Pause')}
      ${row('<kbd>Esc</kbd> / <kbd>M</kbd>', 'This menu')}
      ${keys}
    </table><p class="tip"><a href="sound-test.html" target="_blank" rel="noopener">Sound test page</a>: play every sound and music track in the game, rate them and leave notes.</p><p class="tip">With no building selected, <b>double-click</b> an Assembler to change its recipe, a Robot fabricator to change which robot it builds, or a gun turret to upgrade it to a Scatter gun or Sniper (once researched).</p></div>`;
  }
}
