// Picker panels, opened by double-clicking a machine (like the inserter's filter): an Assembler gets a grid of the recipes
// it can make, a robot building gets a menu of robots with their stats. Locked choices show what unlocks them.
import { RECIPE_LIST, ITEMS, type ItemId } from './sim/items';
import { recipeUnlocked, robotUnlocked, ROBOT_UNLOCK, RECIPE_UNLOCK, techById } from './sim/research';
import { FAB_CAPACITY, FAB_ROBOTS, ROBOTS, ROBOT_SPACE, plateText, type RobotType } from './sim/robots';
import { KINDS } from './sim/world';
import { COIL_VARIANTS, VARIANTS, coilVariantOf, coilVariantUnlocked, familyVariants, setCoilVariant, setVariant, variantOf, variantUnlocked, type CoilVariant, type TurretVariant } from './sim/turrets';
import { COIL_ORDER } from './sim/turretdata';
import { DAMAGE_NAMES } from './sim/enemies';
import type { Assembler, Coil, RobotFab, Turret, World } from './sim/world';
import { itemIconUrl } from './sprites';

const isTurretLike = (e: { kind: string }): e is Turret => e.kind === 'turret' || e.kind === 'flamer';
const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const icon = (id: ItemId): string => { const u = itemIconUrl(id); return u ? `<img src="${u}" alt="" title="${ITEMS[id].name}">` : `<i style="background:${ITEMS[id].color}" title="${ITEMS[id].name}"></i>`; };

export class EntityPicker {
  private el = document.getElementById('picker')!;
  private target: Assembler | RobotFab | Turret | Coil | null = null;

  constructor(private getWorld: () => World, private say: (t: string, bad?: boolean) => void = () => {}) {
    this.el.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest('button[data-pick]') as HTMLButtonElement | null;
      if (!b || b.disabled || !this.target) return;
      const t = this.target;
      if (isTurretLike(t)) {
        const v = b.dataset.pick as TurretVariant, r = setVariant(this.getWorld(), t, v);
        if (r === 'short') this.say(`Not enough plates for a ${VARIANTS[v].name} (needs ${costOf(VARIANTS[v].cost)})`, true);
        else if (r === 'wrong') this.say(`The ${VARIANTS[v].name} needs a level-1 upgrade first`, true);
        else if (r === 'ok') this.say(`Upgraded to a ${VARIANTS[v].name}`);
        this.close();
        return;
      }
      if (t.kind === 'coil') {
        const v = b.dataset.pick as CoilVariant, r = setCoilVariant(this.getWorld(), t, v);
        if (r === 'short') this.say(`Not enough plates for a ${COIL_VARIANTS[v].name} (needs ${costOf(COIL_VARIANTS[v].cost)})`, true);
        else if (r === 'wrong') this.say(`The ${COIL_VARIANTS[v].name} needs a level-1 upgrade first`, true);
        else if (r === 'ok') this.say(`Changed to a ${COIL_VARIANTS[v].name}`);
        this.close();
        return;
      }
      if (t.kind === 'assembler') { t.recipe = b.dataset.pick!; t.stock = {}; t.progress = 0; t.out = 0; } // half-loaded for the old recipe: dropped
      else { const f = t as RobotFab; f.type = b.dataset.pick as RobotType; f.progress = 0; }
      this.close();
    });
    this.el.addEventListener('mousedown', (e) => e.stopPropagation());
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && this.isOpen) { this.close(); e.stopPropagation(); } }, true);
    window.addEventListener('mousedown', (e) => { if (this.isOpen && !this.el.contains(e.target as Node)) this.close(); }, true);
  }

  get isOpen(): boolean { return !this.el.hidden; }
  close(): void { this.el.hidden = true; this.target = null; }

  /** Opens the recipe grid or the robot menu for this machine, beside the cursor. */
  open(e: Assembler | RobotFab | Turret | Coil, sx: number, sy: number): void {
    const w = this.getWorld();
    this.target = e;
    this.el.innerHTML = e.kind === 'assembler' ? this.recipes(w, e) : isTurretLike(e) ? this.turret(w, e) : e.kind === 'coil' ? this.coil(w, e) : this.robots(w, e as RobotFab);
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
    const cur = variantOf(t), curTier = VARIANTS[cur].tier, fam = VARIANTS[cur].family;
    const cell = (k: TurretVariant) => {
      const d = VARIANTS[k], open = variantUnlocked(w, k);
      const tierLock = d.tier === 2 && curTier < 1 ? '<small class="lock">Upgrade to a level-1 type first</small>' : '';
      const why = open ? tierLock : `<small class="lock">Research ${esc(techById(d.tech)?.name ?? d.tech)} ${d.unlock}</small>`;
      const cost = Object.keys(d.cost).length ? (cur === k ? '' : d.tier <= curTier ? '<span>Free to go back</span>' : `<span>Upgrade <b>${costOf(d.cost)}</b></span>`) : `<span>Free</span>`;
      const ammo = d.ammo.map((i) => ITEMS[i].name.toLowerCase()).join(' / ');
      return `<button data-pick="${k}" class="bcell${k === cur ? ' on' : ''}" ${open && !tierLock ? '' : 'disabled'} style="--c:${d.colour}">
        <span class="bc-top"><b style="color:${d.colour}">${esc(d.name)}</b><em>${d.tier === 0 ? 'base' : `level ${d.tier}`}</em>${k === cur ? '<em>this one</em>' : ''}</span>
        <small>${esc(d.blurb)}</small>
        <span class="bc-stats"><span>Range <b>${d.minRange ? `${d.minRange}-` : ''}${d.range}</b></span><span>Fires every <b>${d.cooldown}s</b></span><span>Damage <b>${DAMAGE_NAMES[d.type]}</b></span>${d.cone ? '<span>Hits <b>a whole cone</b></span>' : d.blast ? '<span>Hits <b>an area</b></span>' : '<span>Hits <b>one enemy</b></span>'}${d.burn ? '<span>Sets <b>alight</b></span>' : ''}<span>Ammo <b>${esc(ammo)}</b></span>${cost}</span>${why}</button>`;
    };
    const intro = fam === 'fire' ? 'Base, then one of two level-1 types, then the level-2 weapon.' : 'Base, then one of two level-1 types, then the level-2 weapon (Artillery).';
    return `<h4>${fam === 'fire' ? 'Fire turret' : 'Turret type'}</h4><p>Upgrade this turret in place. ${intro} Going back down is free. Ammunition stays (artillery uses shells, so it starts empty); the upgrade is paid for from the core's stock.</p><div class="bgrid single">${familyVariants(fam).map(cell).join('')}</div>`;
  }

  private coil(w: World, c: Coil): string {
    const cur = coilVariantOf(c), curTier = COIL_VARIANTS[cur].tier;
    const cell = (k: CoilVariant) => {
      const d = COIL_VARIANTS[k], open = coilVariantUnlocked(w, k);
      const tierLock = d.tier === 2 && curTier < 1 ? '<small class="lock">Upgrade to a level-1 type first</small>' : '';
      const why = open ? tierLock : `<small class="lock">Research ${esc(techById(d.tech)?.name ?? d.tech)} ${d.unlock}</small>`;
      const cost = Object.keys(d.cost).length ? (cur === k ? '' : d.tier <= curTier ? '<span>Free to go back</span>' : `<span>Upgrade <b>${costOf(d.cost)}</b></span>`) : `<span>Free</span>`;
      return `<button data-pick="${k}" class="bcell${k === cur ? ' on' : ''}" ${open && !tierLock ? '' : 'disabled'} style="--c:${d.colour}">
        <span class="bc-top"><b style="color:${d.colour}">${esc(d.name)}</b><em>${d.tier === 0 ? 'base' : `level ${d.tier}`}</em>${k === cur ? '<em>this one</em>' : ''}</span>
        <small>${esc(d.blurb)}</small>
        <span class="bc-stats"><span>Range <b>${d.range}</b></span>${d.charge ? `<span>Uses <b>${d.charge} charge</b></span>` : '<span>Uses <b>charge as it absorbs</b></span>'}${cost}</span>${why}</button>`;
    };
    return `<h4>Coil type</h4><p>Upgrade this coil in place. Base, then Shield or Stun, then the Railgun. Its stored charge stays; the upgrade is paid for from the core's stock.</p><div class="bgrid single">${COIL_ORDER.map(cell).join('')}</div>`;
  }

  private robots(w: World, f: RobotFab): string {
    const cell = (t: RobotType) => {
      const d = ROBOTS[t], open = robotUnlocked(w, t) || t === f.type;
      const why = open ? '' : `<small class="lock">Research Robot designs ${ROBOT_UNLOCK[t]}</small>`;
      const stats = `<span>Health <b>${d.hp}</b></span><span>Damage <b>${d.dps}/s</b></span><span>Range <b>${d.range}</b></span><span>Speed <b>${d.speed}</b></span><span>Room <b>${ROBOT_SPACE[t]} of ${FAB_CAPACITY}</b></span><span>Cost <b>${plateText(d.cost)}</b></span><span>Build <b>${d.buildTime}s</b></span>`;
      return `<button data-pick="${t}" class="bcell${t === f.type ? ' on' : ''}" ${open ? '' : 'disabled'}>
        <span class="bc-top"><img src="${import.meta.env.BASE_URL}sprites/robot-${t}.png" alt=""><b>${esc(d.name)}</b>${d.flying ? '<em>flying</em>' : ''}</span>
        <span class="bc-stats">${stats}</span>${why}</button>`;
    };
    return `<h4>${KINDS[f.kind].name}</h4><p>Choose which robot this builds. It has room for ${FAB_CAPACITY}: a small robot takes 1, a Titan takes ${ROBOT_SPACE.titan}.</p><div class="bgrid">${FAB_ROBOTS[f.kind].map(cell).join('')}</div>`;
  }
}

function costOf(c: Partial<Record<string, number>>): string { return Object.entries(c).map(([k, n]) => `${n} ${k.replace('-plate', '')}`).join(' + '); }
