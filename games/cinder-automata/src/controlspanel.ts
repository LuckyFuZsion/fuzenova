// The on-screen controls reminder. F2 (or its button) shows and hides it; the choice is remembered.
// F2 rather than F1 because browsers use F1 for their own help.
import type { Kind } from './sim/world';
import { KINDS } from './sim/world';

const KEY = 'cinder-automata.controls-hint.v1';

export function initControlsPanel(tools: { key: string; kind: Kind }[]): void {
  const panel = document.getElementById('keys')!;
  const btn = document.getElementById('keysBtn')!;
  let on = true; // shown the first time, so new players see it
  try { const s = localStorage.getItem(KEY); if (s !== null) on = s === '1'; } catch { /* storage blocked: default applies */ }

  const row = (k: string, d: string) => `<div><kbd>${k}</kbd><span>${d}</span></div>`;
  panel.innerHTML = `<h4>Controls <small>F2 hides</small></h4>
    ${row('Click', 'Place the selected building (drag for belts and walls)')}
    ${row('Right-click / X', 'Remove (free until the fight starts)')}
    ${row('V', 'Pick up and move a building (free)')}
    ${row('R', 'Rotate (Shift+R other way)')}
    ${row('W A S D', 'Move the camera')}
    ${row('Wheel', 'Zoom')}
    ${row('Double-click inserter', 'Choose the one item it moves')}
    ${row('Double-click machine', 'Assembler: recipe. Robot building: robot. Gun turret: upgrade to Scatter or Sniper')}
    ${row('H', 'Explain the selected building')}
    ${row('Q', 'Put the building away')}
    ${row('T', 'Research')}
    ${row('N', 'Sound on / off')}
    ${row('F', 'Fast-forward (1x, 2x, 4x)')}
    ${row('C', 'Call the next wave early (in the breather)')}
    ${row('F3', 'Inspect: hover to learn')}
    ${row('P', 'Pause')}
    ${row('Esc / M', 'Menu')}
    <div class="tools">${tools.map((t) => `<span><kbd>${t.key}</kbd>${KINDS[t.kind].name}</span>`).join('')}</div>`;

  const apply = () => {
    panel.hidden = !on;
    btn.classList.toggle('on', on);
    try { localStorage.setItem(KEY, on ? '1' : '0'); } catch { /* fine */ }
  };
  apply();
  const toggle = () => { on = !on; apply(); };
  btn.addEventListener('click', toggle);
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'F2' || e.repeat) return;
    e.preventDefault();
    toggle();
  });
}
