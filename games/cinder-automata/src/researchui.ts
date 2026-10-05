// The research panel (T): buy upgrades for weapons, robots and defences from the core stock.
import { ITEMS, RECIPES, type ItemId } from './sim/items';
import { BRANCH_NAMES, TECHS, buyResearch, gateFor, isLocked, levelOf, maxLevel, nextCost, researchSeconds, techById, type Branch } from './sim/research';
import { canPay } from './sim/costs';
import type { World } from './sim/world';

const BRANCHES: Branch[] = ['projectile', 'electromagnetic', 'robotics', 'fortification'];

export class ResearchPanel {
  private el = document.getElementById('research')!;
  private msg = '';
  private last = '';

  constructor(private getWorld: () => World, private say: (t: string) => void) {
    this.el.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      if (t.closest('#researchClose')) { this.close(); return; }
      const btn = t.closest('button[data-tech]') as HTMLButtonElement | null;
      if (!btn || btn.disabled) return;
      const id = btn.dataset.tech!;
      const r = buyResearch(this.getWorld(), id);
      if (r === 'ok') this.say(`Researched: ${techById(id)!.name} level ${levelOf(this.getWorld(), id)}`);
      else if (r === 'started') this.say(`Researching ${techById(id)!.name}: it finishes after ${researchSeconds(levelOf(this.getWorld(), id))} seconds of the factory running`);
      else if (r === 'gated') this.say(`Needs run level ${gateFor(this.getWorld(), techById(id)!)} for the next level of this research`);
      else if (r === 'busy') this.say('One research at a time: wait for the current one to finish');
      this.refresh();
    });
    document.getElementById('researchBtn')!.addEventListener('click', () => this.toggle());
  }

  get isOpen(): boolean { return !this.el.hidden; }
  toggle(): void { if (this.isOpen) this.close(); else this.open(); }
  open(): void { this.el.hidden = false; document.getElementById('researchBtn')!.classList.add('on'); this.refresh(); }
  close(): void { this.el.hidden = true; document.getElementById('researchBtn')!.classList.remove('on'); }

  /** Redraws the cards from the current stock. Cheap; called when something changes and a few times a second while open. */
  refresh(): void {
    if (!this.isOpen) return;
    const w = this.getWorld();
    const short = (k: ItemId) => ITEMS[k].name.replace(' science pack', '').toLowerCase();
    const cost = (c: Partial<Record<ItemId, number>>) => (Object.entries(c) as [ItemId, number][])
      .map(([k, n]) => `<span class="${(w.stock[k] ?? 0) >= n || w.freeBuild ? '' : 'short'}"><i class="dot" style="background:${ITEMS[k].color}"></i>${w.freeBuild ? n : `${Math.min(n, w.stock[k] ?? 0)}/${n}`} ${short(k)} packs${(w.stock[k] ?? 0) < n && !w.freeBuild ? ` (need ${n - (w.stock[k] ?? 0)} more)` : ''}</span>`).join(' ');
    const PACKS: ItemId[] = ['science-projectile', 'science-em', 'science-robotics', 'science-advanced'];
    const stock = PACKS.map((k) => `<span class="pk"><i class="dot" style="background:${ITEMS[k].color}"></i>${short(k)} ${w.stock[k] ?? 0}</span>`).join(' ');
    const making = new Map<ItemId, { n: number; ready: number }>(); // assemblers set to a science pack, and packs waiting in them (not in the Core yet)
    for (const e of w.entities.values()) {
      if (e.kind !== 'assembler') continue;
      const out = RECIPES[e.recipe]?.output;
      if (out && PACKS.includes(out)) { const m = making.get(out) ?? { n: 0, ready: 0 }; m.n++; m.ready += e.out; making.set(out, m); }
    }
    const maker = PACKS.map((k) => { const m = making.get(k); return `<span class="pk"><i class="dot" style="background:${ITEMS[k].color}"></i>${short(k)}: ${m ? `${m.n} assembler${m.n > 1 ? 's' : ''}${m.ready ? `, ${m.ready} waiting to be belted to the Core` : ''}` : 'no assembler making it'}</span>`; }).join(' ');
    const active = w.researching;
    const activeBar = active
      ? `<div class="rnow"><b>Researching: ${techById(active.id)!.name}</b><span>${Math.max(0, Math.ceil(active.left))}s of factory time left</span><i class="rbar"><u style="width:${Math.round((1 - active.left / active.total) * 100)}%"></u></i></div>`
      : '';
    const html = `<div class="rbox"><header><h3>Research</h3><button id="researchClose" title="Close (T)">&times;</button></header>
      ${activeBar}
      <p class="rsub">Research is paid for in <b>science packs</b>. Set an Assembler's recipe to a science pack (double-click it with no building selected), feed it plates, and belt the packs into the Core. In the Core now: ${stock}. Being made: ${maker}. Level 1 of a research needs one kind of pack, level 2 a second kind, and level 3 onwards the Advanced pack (steel, bullets and bronze). Each level also needs the run to have reached a certain level, and takes factory time to finish (the factory runs during fights and the cooldown after them), one research at a time.</p>
      ${BRANCHES.map((b) => `<h4>${BRANCH_NAMES[b]}</h4>${TECHS.filter((t) => t.branch === b).map((t) => {
        const lvl = levelOf(w, t.id), max = maxLevel(t), next = nextCost(w, t), locked = isLocked(w, t);
        const pips = Array.from({ length: max }, (_, i) => `<i class="${i < lvl ? 'on' : ''}"></i>`).join('');
        const gate = next ? gateFor(w, t) : 0, gated = !!next && !w.freeBuild && w.runLevel < gate;
        const busy = !!w.researching && !w.freeBuild;
        const can = !!next && !locked && !gated && !busy && (w.freeBuild || canPay(w, next));
        const secs = researchSeconds(lvl);
        const label = !next ? 'Maxed' : locked ? `Needs ${techById(t.requires!.id)!.name} ${t.requires!.level}` : gated ? `Run level ${gate}` : busy ? 'Busy' : can ? `Research (${secs}s)` : 'Not enough';
        return `<div class="tech${lvl >= max ? ' maxed' : ''}"><div class="tt"><b>${t.name}</b><span class="pips">${pips}</span></div>
          <p>${t.effect}</p><div class="tc">${next ? cost(next) : ''}<button data-tech="${t.id}" ${can ? '' : 'disabled'}>${label}</button></div></div>`;
      }).join('')}`).join('')}
      <p class="rsub">${this.msg}Research applies straight away, also to what is already built.</p></div>`;
    if (html === this.last) return; // unchanged: leave the buttons alone so a click is not lost
    this.last = html;
    this.el.innerHTML = html;
  }
}
