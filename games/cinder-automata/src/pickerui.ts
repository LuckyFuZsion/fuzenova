// Picker panels, opened by double-clicking a machine (like the inserter's filter): an Assembler gets a grid of the recipes
// it can make, a Robot fabricator gets a menu of robots with their stats. Locked choices show what unlocks them.
import { RECIPE_LIST, ITEMS, type ItemId } from './sim/items';
import { recipeUnlocked, robotUnlocked, ROBOT_UNLOCK, RECIPE_UNLOCK, techById } from './sim/research';
import { FAB_CAPACITY, ROBOTS, ROBOT_ORDER, ROBOT_SPACE, type RobotType } from './sim/robots';
import { VARIANTS, setVariant, variantOf, variantUnlocked, type TurretVariant } from './sim/turrets';
import type { Assembler, RobotFab, Turret, World } from './sim/world';
import { itemIconUrl } from './sprites';

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const icon = (id: ItemId): string => { const u = itemIconUrl(id); return u ? `<img src="${u}" alt="" title="${ITEMS[id].name}">` : `<i style="background:${ITEMS[id].color}" title="${ITEMS[id].name}"></i>`; };

export class EntityPicker {
  private el = document.getElementById('picker')!;
  private target: Assembler | RobotFab | Turret | null = null;

  constructor(private getWorld: () => World, private say: (t: string, bad?: boolean) => void = () => {}) {
    this.el.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest('button[data-pick]') as HTMLButtonElement | null;
      if (!b || b.disabled || !this.target) return;
      const t = this.target;
      if (t.kind === 'turret') {
        const r = setVariant(this.getWorld(), t, b.dataset.pick as TurretVariant);
        if (r === 'short') this.say(`Not enough plates for a ${VARIANTS[b.dataset.pick as TurretVariant].name} (needs ${costText2(b.dataset.pick as TurretVariant)})`, true);
        else if (r === 'ok') this.say(`Upgraded to a ${VARIANTS[b.dataset.pick as TurretVariant].name}`);
        this.close();
        return;
      }
      if (t.kind === 'assembler') { t.recipe = b.dataset.pick!; t.stock = {}; t.progress = 0; t.out = 0; } // half-loaded for the old recipe: dropped
      else { t.type = b.dataset.pick as RobotType; t.progress = 0; }
      this.close();
    });
    this.el.addEventListener('mousedown', (e) => e.stopPropagation());
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && this.isOpen) { this.close(); e.stopPropagation(); } }, true);
    window.addEventListener('mousedown', (e) => { if (this.isOpen && !this.el.contains(e.target as Node)) this.close(); }, true);
  }

  get isOpen(): boolean { return !this.el.hidden; }
  close(): void { this.el.hidden = true; this.target = null; }

  /** Opens the recipe grid or the robot menu for this machine, beside the cursor. */
  open(e: Assembler | RobotFab | Turret, sx: number, sy: number): void {
    const w = this.getWorld();
    this.target = e;
    this.el.innerHTML = e.kind === 'assembler' ? this.recipes(w, e) : e.kind === 'turret' ? this.turret(w, e) : this.robots(w, e);
    this.el.hidden = false;
    const r = this.el.getBoundingClientRect();
    this.el.style.left = `${Math.max(8, Math.min(innerWidth - r.width - 8, sx + 16))}px`;
    this.el.style.top = `${Math.max(8, Math.min(innerHeight - r.height - 8, sy - 20))}px`;
  }

  private recipes(w: World, a: Assembler): string {
    const cell = (r: (typeof RECIPE_LIST)[number]) => {
      const open = recipeUnlocked(w, r.id) || r.id === a.recipe;
      const ins = (Object.entries(r.inputs) as [ItemId, number][]).map(([k, n]) => `${n > 1 ? `<b>${n}&times;</b>` : ''}${icon(k)}`).join('<span>+</span>');
      const need = RECIPE_UNLOCK[r.id];
      const why = open ? '' : `<small class="lock">Research ${esc(techById(need.tech)?.name ?? need.tech)} ${need.level}</small>`;
      return `<button data-pick="${r.id}" class="rcell${r.id === a.recipe ? ' on' : ''}" ${open ? '' : 'disabled'} title="${esc(r.name)}">
        <span class="rc-out">${icon(r.output)}<span><b>${esc(r.name)}</b><small>${r.count > 1 ? `${r.count} made, ` : ''}${r.time}s</small></span></span>
        <span class="rc-in">${ins}</span>${why}</button>`;
    };
    return `<h4>Assembler recipe</h4><p>Choose what this Assembler makes. Anything it was half-way through is dropped.</p><div class="rgrid">${RECIPE_LIST.map(cell).join('')}</div>`;
  }

  private turret(w: World, t: Turret): string {
    const cur = variantOf(t);
    const cell = (k: TurretVariant) => {
      const d = VARIANTS[k], open = variantUnlocked(w, k);
      const why = open ? '' : `<small class="lock">Research Turret designs ${d.unlock}</small>`;
      const cost = Object.keys(d.cost).length ? (cur === k ? '' : `<span>Upgrade <b>${costText2(k)}</b></span>`) : `<span>Free</span>`;
      return `<button data-pick="${k}" class="bcell${k === cur ? ' on' : ''}" ${open ? '' : 'disabled'} style="--c:${d.colour}">
        <span class="bc-top"><b style="color:${d.colour}">${esc(d.name)}</b>${k === cur ? '<em>this one</em>' : ''}</span>
        <small>${esc(d.blurb)}</small>
        <span class="bc-stats"><span>Range <b>${d.range}</b></span><span>Fire every <b>${d.cooldown}s</b></span><span>Damage <b>x${d.dmgMul}</b></span>${d.cone ? '<span>Hits <b>a whole cone</b></span>' : '<span>Hits <b>one enemy</b></span>'}${cost}</span>${why}</button>`;
    };
    return `<h4>Turret type</h4><p>Upgrade this turret in place. Its ammunition stays; the upgrade is paid for from the core's stock.</p><div class="bgrid single">${(['gun', 'scatter', 'sniper'] as TurretVariant[]).map(cell).join('')}</div>`;
  }

  private robots(w: World, f: RobotFab): string {
    const cell = (t: RobotType) => {
      const d = ROBOTS[t], open = robotUnlocked(w, t) || t === f.type;
      const why = open ? '' : `<small class="lock">Research Robot designs ${ROBOT_UNLOCK[t]}</small>`;
      const stats = `<span>Health <b>${d.hp}</b></span><span>Damage <b>${d.dps}/s</b></span><span>Range <b>${d.range}</b></span><span>Speed <b>${d.speed}</b></span><span>Room <b>${ROBOT_SPACE[t]} of ${FAB_CAPACITY}</b></span><span>Cost <b>${d.cost} iron</b></span><span>Build <b>${d.buildTime}s</b></span>`;
      return `<button data-pick="${t}" class="bcell${t === f.type ? ' on' : ''}" ${open ? '' : 'disabled'}>
        <span class="bc-top"><img src="${import.meta.env.BASE_URL}sprites/robot-${t}.png" alt=""><b>${esc(d.name)}</b>${d.flying ? '<em>flying</em>' : ''}</span>
        <span class="bc-stats">${stats}</span>${why}</button>`;
    };
    return `<h4>Robot fabricator</h4><p>Choose which robot this builds. It has room for ${FAB_CAPACITY}: a small robot takes 1, a Titan takes ${ROBOT_SPACE.titan}.</p><div class="bgrid">${ROBOT_ORDER.map(cell).join('')}</div>`;
  }
}

function costText2(v: TurretVariant): string { return Object.entries(VARIANTS[v].cost).map(([k, n]) => `${n} ${k.replace('-plate', '')}`).join(' + '); }
