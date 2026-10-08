// The new-game screen: a carousel of commanders (arrows, dots, keyboard, swipe) and a row of difficulty tiles.
import { COMMANDERS, DEFAULT_COMMANDER, type Commander } from './sim/commanders';
import { achievementFor } from './sim/achievements';
import { DIFFICULTIES, type Difficulty } from './sim/difficulty';
import { TALENTS, TALENT_SLOTS, talentById, owns } from './sim/talents';
import { loadPrestige, setTalentSlot, talentsOf } from './prestige';
import { bestLevel, isUnlocked, lastCommander, lastDifficulty, rememberCommander, rememberDifficulty, starsFor } from './progress';

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

export interface NewGameChoice { commander: string; difficulty: string }

const FLAME = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-4 3-7 1 1 1.500 2 2 3 1-2 1-5 1-8z"/></svg>';
const LOCK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10V8a5 5 0 0 1 10 0v2h1.500A1.500 1.500 0 0 1 20 11.500v8a1.500 1.500 0 0 1-1.500 1.500h-13A1.500 1.500 0 0 1 4 19.500v-8A1.500 1.500 0 0 1 5.500 10H7zm2 0h6V8a3 3 0 0 0-6 0v2z"/></svg>';

const initialsOf = (c: Commander): string => c.name.split(' ').filter((w) => /^[A-Z]/.test(w)).slice(-2).map((w) => w[0]).join('');

function emblem(c: Commander, isOpen: boolean): string {
  const portrait = `${import.meta.env.BASE_URL}sprites/portrait-${c.id}.png`;
  return `<div class="cs-emblem" style="--c:${c.colour}">
    <svg viewBox="0 0 120 130" aria-hidden="true">
      <defs><linearGradient id="g-${c.id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.colour}" stop-opacity="0.95"/><stop offset="1" stop-color="${c.colour}" stop-opacity="0.45"/></linearGradient></defs>
      <path d="M60 4 112 26v44c0 28-22 46-52 56C30 116 8 98 8 70V26z" fill="url(#g-${c.id})" stroke="rgba(255,255,255,0.35)" stroke-width="2"/>
      <path d="M60 14 102 32v38c0 22-17 37-42 46-25-9-42-24-42-46V32z" fill="rgba(10,7,5,0.55)" stroke="rgba(255,255,255,0.12)"/>
      ${isOpen ? `<text x="60" y="76" text-anchor="middle" font-size="40" font-weight="800" fill="${c.colour}" font-family="system-ui,sans-serif">${initialsOf(c)}</text>` : ''}
    </svg>
    <img class="cs-portrait${isOpen ? '' : ' dark'}" src="${portrait}" alt="" onload="this.parentElement.classList.add('has-portrait')" onerror="this.remove()">
    ${isOpen ? '' : `<span class="cs-lock">${LOCK}</span>`}
  </div>`;
}

/** The commander's three talent slots: each is a drop-down of the talents the player owns. */
function talentHtml(id: string): string {
  const s = loadPrestige(), state = { unlocked: s.unlocked ?? [], loadout: s.loadout ?? {} };
  const worn = talentsOf(id), owned = TALENTS.filter((t) => owns(t, state));
  const slots = Array.from({ length: TALENT_SLOTS }, (_, i) => {
    const cur = worn[i] ?? '';
    return `<label class="cs-tal" title="${esc(talentById(cur)?.blurb ?? 'Empty slot')}">      <select data-slot="${i}" data-cmd="${id}"><option value="">(empty)</option>${owned.map((t) => `<option value="${t.id}"${t.id === cur ? ' selected' : ''}>${esc(t.name)}</option>`).join('')}</select>
      <em>${esc(talentById(cur)?.blurb ?? '')}</em></label>`;
  }).join('');
  return `<div class="cs-tals"><h5>Talents</h5>${slots}</div>`;
}

function difficultyTile(d: Difficulty, index: number, on: boolean): string {
  const flames = Array.from({ length: 4 }, (_, i) => `<i class="${i <= index ? 'lit' : ''}">${FLAME}</i>`).join('');
  const chips = [
    d.buildSeconds === null ? 'No build timer' : `${d.buildSeconds}s to build`,
    d.enemyHp === 1 ? 'Normal enemies' : d.enemyHp < 1 ? 'Softer enemies' : `Enemies +${Math.round((d.enemyHp - 1) * 100)}% health`,
    d.repairCost === 0 ? 'Free repairs' : d.repairCost <= 0.25 ? 'Repairs cost plates' : 'Costly repairs',
  ];
  return `<button class="cs-diff${on ? ' on' : ''}" data-diff="${d.id}" role="radio" aria-checked="${on}">
    <span class="cs-flames">${flames}</span><b>${d.name}</b>
    <span class="cs-chips">${chips.map((c) => `<em>${c}</em>`).join('')}</span></button>`;
}

/** Shows the choices and resolves with them, or null if the player goes back. */
export function pickCommander(): Promise<NewGameChoice | null> {
  const el = document.getElementById('commanders')!;
  return new Promise((resolve) => {
    let difficulty = lastDifficulty();
    const open = (id: string) => { const c = COMMANDERS.find((x) => x.id === id); return !!c && isUnlocked(id) && !c.locked; };
    const list = [...COMMANDERS].sort((a, b) => Number(open(b.id)) - Number(open(a.id)));
    let focus = Math.max(0, list.findIndex((c) => c.id === (open(lastCommander()) ? lastCommander() : DEFAULT_COMMANDER)));
    const openCount = list.filter((c) => open(c.id)).length;

    const cardHtml = (c: Commander, i: number): string => {
      const isOpen = open(c.id), stars = starsFor(c.id), best = bestLevel(c.id);
      const lock = c.locked ? `Coming soon: ${esc(c.locked)}` : `To unlock: ${esc(achievementFor(c.id)?.hint ?? 'complete an achievement')}`;
      return `<article class="cs-card${isOpen ? '' : ' locked'}" data-i="${i}" style="--c:${c.colour}">
        ${emblem(c, isOpen)}
        <h3>${esc(c.name)}</h3>
        <div class="cs-theme">${esc(c.theme)}</div>
        <div class="cs-stars" title="Stars for completing level 10, 20 and 30"><b>${'&#9733;'.repeat(stars)}</b>${'&#9733;'.repeat(3 - stars)}</div>
        <ul class="cs-perks">
          <li class="up"><span>+</span>${esc(c.bonus)}</li>
          <li class="down"><span>&minus;</span>${esc(c.drawback)}</li>
        </ul>
        ${isOpen ? talentHtml(c.id) : ''}
        <div class="cs-foot">${isOpen ? (best ? `Best: level ${best}${best >= 30 ? ' (endless)' : ''}` : 'Not played yet') : `<span class="cs-hint">${lock}</span>`}</div>
      </article>`;
    };

    el.innerHTML = `<div class="cs">
      <header><h2>Choose your commander</h2>
        <p>${openCount > 1 ? 'Each commander has a strength and a weakness. Earn more by playing in their style.' : 'You begin with standard-issue Captain Halloway: no bonuses, no drawbacks. Earn the others by playing in their style.'}</p></header>
      <div class="cs-stage" tabindex="0" aria-label="Commanders">
        <button class="cs-arrow left" id="cs-prev" aria-label="Previous commander">&#8249;</button>
        <div class="cs-track">${list.map(cardHtml).join('')}</div>
        <button class="cs-arrow right" id="cs-next" aria-label="Next commander">&#8250;</button>
      </div>
      <div class="cs-dots">${list.map((c, i) => `<button data-dot="${i}" aria-label="${esc(c.name)}" style="--c:${c.colour}"></button>`).join('')}</div>
      <section class="cs-diffs"><h4>Difficulty</h4><div class="cs-diffrow" role="radiogroup">${DIFFICULTIES.map((d, i) => difficultyTile(d, i, d.id === difficulty)).join('')}</div></section>
      <footer><button class="cs-back" id="cback">Back</button><button class="cs-go" id="cgo">Start game</button></footer>
    </div>`;
    el.hidden = false;

    const cards = [...el.querySelectorAll<HTMLElement>('.cs-card')];
    const dots = [...el.querySelectorAll<HTMLElement>('.cs-dots button')];
    const go = el.querySelector<HTMLButtonElement>('#cgo')!;
    const layout = () => {
      cards.forEach((card, i) => {
        const o = i - focus;
        card.style.setProperty('--o', String(o));
        card.classList.toggle('active', o === 0);
        card.classList.toggle('far', Math.abs(o) > 2);
        card.setAttribute('aria-hidden', String(o !== 0));
      });
      dots.forEach((d, i) => d.classList.toggle('on', i === focus));
      const c = list[focus], isOpen = open(c.id);
      go.disabled = !isOpen;
      go.textContent = isOpen ? 'Start game' : c.locked ? 'Coming soon' : 'Locked';
      (el.querySelector('#cs-prev') as HTMLButtonElement).disabled = focus === 0;
      (el.querySelector('#cs-next') as HTMLButtonElement).disabled = focus === list.length - 1;
    };
    const move = (to: number) => { focus = Math.max(0, Math.min(list.length - 1, to)); layout(); };
    layout();

    const done = (r: NewGameChoice | null) => {
      el.hidden = true; el.onclick = null; el.onchange = null; window.removeEventListener('keydown', onKey, true); resolve(r);
    };
    const start = () => { const c = list[focus]; if (!open(c.id)) return; rememberCommander(c.id); done({ commander: c.id, difficulty }); };
    const onKey = (e: KeyboardEvent) => {
      if (el.hidden) return;
      if (e.key === 'ArrowLeft') { move(focus - 1); e.preventDefault(); }
      else if (e.key === 'ArrowRight') { move(focus + 1); e.preventDefault(); }
      else if (e.key === 'Enter') { start(); e.preventDefault(); }
      else if (e.key === 'Escape') { done(null); e.preventDefault(); }
      e.stopPropagation();
    };
    window.addEventListener('keydown', onKey, true);

    el.onchange = (e) => {
      const sel = e.target as HTMLSelectElement;
      if (!sel.dataset.slot) return;
      setTalentSlot(sel.dataset.cmd!, Number(sel.dataset.slot), sel.value || null);
      const card = sel.closest('.cs-card')!, holder = card.querySelector('.cs-tals');
      if (holder) holder.outerHTML = talentHtml(sel.dataset.cmd!); // other slots may have changed places
    };
    el.onclick = (e) => {
      const t = e.target as HTMLElement;
      if (t.closest('#cback')) return done(null);
      if (t.closest('#cgo')) return start();
      if (t.closest('#cs-prev')) return move(focus - 1);
      if (t.closest('#cs-next')) return move(focus + 1);
      const dot = t.closest<HTMLElement>('[data-dot]');
      if (dot) return move(Number(dot.dataset.dot));
      const card = t.closest<HTMLElement>('.cs-card');
      if (card) return move(Number(card.dataset.i));
      const d = t.closest<HTMLElement>('.cs-diff');
      if (d) {
        difficulty = d.dataset.diff!; rememberDifficulty(difficulty);
        el.querySelectorAll<HTMLElement>('.cs-diff').forEach((b) => { const on = b.dataset.diff === difficulty; b.classList.toggle('on', on); b.setAttribute('aria-checked', String(on)); });
      }
    };

    // swipe / drag across the stage
    const stage = el.querySelector<HTMLElement>('.cs-stage')!;
    let x0: number | null = null;
    stage.addEventListener('pointerdown', (e) => { x0 = e.clientX; });
    stage.addEventListener('pointerup', (e) => {
      if (x0 === null) return;
      const dx = e.clientX - x0; x0 = null;
      if (Math.abs(dx) > 50) move(focus + (dx < 0 ? 1 : -1));
    });
    stage.addEventListener('wheel', (e) => { if (Math.abs(e.deltaX) > 20) { move(focus + (e.deltaX > 0 ? 1 : -1)); e.preventDefault(); } }, { passive: false });
    stage.focus({ preventScroll: true });
  });
}
