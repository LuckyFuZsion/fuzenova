// The inserter filter picker: double-click an inserter (with no building selected) and choose the one kind of item it will move,
// or leave it on "Any item". Useful where several inserters share a belt, for example round the core.
import { ITEMS, type Inserter, type ItemId } from './sim/world';
import { itemIconUrl } from './sprites';

const GROUPS: { name: string; items: ItemId[] }[] = [
  { name: 'Raw', items: ['iron-ore', 'copper-ore', 'tin-ore', 'lead-ore', 'coal', 'sulfur', 'wood'] },
  { name: 'Plates and materials', items: ['iron-plate', 'copper-plate', 'tin-plate', 'lead-plate', 'steel-plate', 'bronze-plate', 'charcoal'] },
  { name: 'Ammunition and parts', items: ['gunpowder', 'bullet', 'shell-casing', 'artillery-shell'] },
  { name: 'Science', items: ['science-projectile', 'science-em', 'science-robotics'] },
];

export class FilterPicker {
  private el = document.getElementById('filter')!;
  private target: Inserter | null = null;

  constructor() {
    this.el.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest('button[data-item]') as HTMLButtonElement | null;
      if (!b || !this.target) return;
      this.target.filter = b.dataset.item === '' ? null : (b.dataset.item as ItemId);
      this.close();
    });
    this.el.addEventListener('mousedown', (e) => e.stopPropagation());
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && this.isOpen) { this.close(); e.stopPropagation(); } }, true);
    window.addEventListener('mousedown', (e) => { if (this.isOpen && !this.el.contains(e.target as Node)) this.close(); }, true);
  }

  get isOpen(): boolean { return !this.el.hidden; }
  close(): void { this.el.hidden = true; this.target = null; }

  /** Opens the picker beside the cursor for this inserter. */
  open(ins: Inserter, sx: number, sy: number, passing: ItemId[] = []): void {
    this.target = ins;
    const cell = (id: ItemId | '') => {
      const on = (ins.filter ?? '') === id;
      const url = id ? itemIconUrl(id) : undefined;
      const swatch = id ? (url ? `<img src="${url}" alt="">` : `<i style="background:${ITEMS[id].color}"></i>`) : '<i class="any">*</i>';
      return `<button data-item="${id}" class="${on ? 'on' : ''}" title="${id ? ITEMS[id].name : 'Any item'}">${swatch}<span>${id ? ITEMS[id].name : 'Any item'}</span></button>`;
    };
    this.el.innerHTML = `<h4>Inserter filter</h4><p>Move only:</p>${cell('')}${passing.length ? `<h5>On the belts beside it now</h5><div class="fgrid">${passing.map(cell).join('')}</div>` : ''}${GROUPS.map((g) => `<h5>${g.name}</h5><div class="fgrid">${g.items.map(cell).join('')}</div>`).join('')}`;
    this.el.hidden = false;
    const r = this.el.getBoundingClientRect();
    this.el.style.left = `${Math.max(8, Math.min(innerWidth - r.width - 8, sx + 14))}px`;
    this.el.style.top = `${Math.max(8, Math.min(innerHeight - r.height - 8, sy - 10))}px`;
  }
}
