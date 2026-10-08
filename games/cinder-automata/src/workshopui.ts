// The Workshop: spend Embers (earned by every run, win or lose) on small permanent buffs. Opened from the title screen.
import { buyPerk, buyTalent, embers, loadPrestige } from './prestige';
import { TALENTS } from './sim/talents';
import { PERKS, ledgerView, nextCost } from './sim/prestige';

const esc = (s: string): string => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

const when = (t: number): string => { try { return new Date(t).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }); } catch { return ''; } };

/** The Embers history: totals, what has been bought, and every earning and spending since the ledger began. */
function ledgerHtml(s: ReturnType<typeof loadPrestige>, open: boolean): string {
  const v = ledgerView(s);
  const spentOn = v.spentOn.length ? v.spentOn.map((l) => `<li><span>${esc(l.label)}</span><b>${l.embers}</b></li>`).join('') : '<li><span>Nothing yet</span><b>0</b></li>';
  const rows = v.rows.map((e) => `<li><span class="lw">${esc(when(e.t))}</span><span class="lt">${esc(e.why)}</span><b class="${e.n > 0 ? 'gain' : 'cost'}">${e.n > 0 ? '+' : '−'}${Math.abs(e.n)}</b></li>`).join('');
  const before = v.before > 0 ? `<li><span class="lw">Earlier</span><span class="lt">Runs played before this history was kept (no detail was recorded)</span><b class="gain">+${v.before}</b></li>` : '';
  return `<details class="ledger"${open ? ' open' : ''}><summary>Embers history</summary>
    <div class="ltotals"><div><b>${v.earned}</b><span>earned in all</span></div><div><b>${v.spent}</b><span>spent</span></div><div><b>${v.balance}</b><span>left</span></div></div>
    <h4>Spent on</h4><ul class="lsum">${spentOn}</ul>
    <h4>Earned and spent, newest first</h4><ul class="lrows">${rows}${before || (rows ? '' : '<li><span class="lt">Nothing recorded yet. Finish a run or buy an upgrade and it will appear here.</span></li>')}</ul></details>`;
}

export function openWorkshop(onClose: () => void = () => {}): void {
  document.getElementById('workshop')?.remove();
  const el = document.createElement('div');
  el.id = 'workshop';
  const render = (): void => {
    const wasOpen = !!el.querySelector<HTMLDetailsElement>('details.ledger')?.open; // keep it open when a purchase redraws the screen
    const s = loadPrestige(), bal = embers();
    el.innerHTML = `<div class="card"><header><div><small>Workshop</small><h2>Permanent upgrades</h2></div><div class="wb"><b>${bal}</b><span>Embers</span></div></header>
      <p>Every run earns Embers for the levels it got through, whether it ends in a lost Core or not. Spend them here on small upgrades that help every run from now on.</p>
      ${ledgerHtml(s, wasOpen)}
      <div class="perks">${PERKS.map((p) => {
        const lvl = Math.min(p.max, s.levels[p.id] ?? 0), cost = nextCost(p, lvl), maxed = lvl >= p.max, can = !maxed && bal >= cost;
        const pips = Array.from({ length: p.max }, (_, i) => `<i class="${i < lvl ? 'on' : ''}"></i>`).join('');
        return `<div class="perk${maxed ? ' maxed' : ''}"><div class="pt"><b>${esc(p.name)}</b><small>${esc(p.blurb)}</small><span class="pips">${pips}</span></div>
          <button data-perk="${p.id}" ${can ? '' : 'disabled'}>${maxed ? 'Maxed' : `${cost} Embers`}</button></div>`;
      }).join('')}</div>
      <h3>Talents</h3>
      <p>Each commander carries three talents and begins with three of their own. Unlock more here, then set them on any commander from the commander screen.</p>
      <div class="perks">${TALENTS.filter((t) => t.cost > 0).map((t) => {
        const has = (s.unlocked ?? []).includes(t.id), can = !has && bal >= t.cost;
        return `<div class="perk${has ? ' owned' : ''}"><div class="pt"><b>${esc(t.name)}</b><small>${esc(t.blurb)}</small></div>
          <button data-talent="${t.id}" ${can ? '' : 'disabled'}>${has ? 'Unlocked' : `${t.cost} Embers`}</button></div>`;
      }).join('')}</div>
      <footer><button id="wsClose">Back</button></footer></div>`;
  };
  el.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const b = t.closest<HTMLButtonElement>('button[data-perk]');
    if (b && !b.disabled) { buyPerk(b.dataset.perk!); render(); return; }
    const tb = t.closest<HTMLButtonElement>('button[data-talent]');
    if (tb && !tb.disabled) { buyTalent(tb.dataset.talent!); render(); return; }
    if (t.closest('#wsClose') || t === el) { el.remove(); onClose(); }
  });
  window.addEventListener('keydown', function onKey(e) { if (e.key === 'Escape' && document.getElementById('workshop')) { el.remove(); onClose(); window.removeEventListener('keydown', onKey); } });
  render();
  document.body.append(el);
}
