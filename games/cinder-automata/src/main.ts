import './style.css';
import { Game } from './game';
import { loadSave } from './save';
import { flush, initCloud, lastKnownUser, onSyncState, pullCloud, signOut, type CloudUser } from './cloud';
import { showAuth, showVerify } from './authui';
import { pickCommander } from './commanderui';
import { initControlsPanel } from './controlspanel';
import { audio } from './audio';
import { embers } from './prestige';
import { openWorkshop } from './workshopui';
import { TOOLS } from './game';

interface FuzeNovaIntroApi {
  preload(): void;
  play(opts?: { onDone?: () => void; onFadeStart?: () => void; muted?: boolean }): { done: Promise<void>; skip(): void };
}
declare global { interface Window { FuzeNovaIntro?: FuzeNovaIntroApi } }

const title = document.getElementById('title')!;
const hud = document.getElementById('hud')!;

const game = new Game();
if (import.meta.env.DEV) (window as unknown as { __game: Game }).__game = game; // dev-only handle for testing
if (import.meta.env.DEV) (window as unknown as { __audio: typeof audio }).__audio = audio;
window.FuzeNovaIntro?.preload();

// a saved run shows a Continue button, and "Start building" then means a fresh game
const continueBtn = document.getElementById('continue')!;
function refreshContinue(): void {
  const save = loadSave();
  continueBtn.hidden = !save;
  if (save) continueBtn.textContent = `Continue - level ${save.level}`;
  document.getElementById('start')!.textContent = save ? 'New game' : 'Start building';
}

// ---- sign-in: nobody sees the title screen until they are signed in; their saved game comes from their account ----
title.hidden = true;
const SYNC_TEXT = { idle: 'saved to your account', syncing: 'saving...', saved: 'saved to your account', error: 'could not save to your account (will retry)' } as const;
onSyncState((s) => { document.getElementById('acctSync')!.textContent = SYNC_TEXT[s]; });

function showTitle(user: CloudUser): void {
  document.getElementById('acctName')!.textContent = user.name;
  document.getElementById('acct')!.hidden = false;
  refreshContinue();
  title.hidden = false;
}

async function boot(): Promise<void> {
  if (import.meta.env.DEV && new URLSearchParams(location.search).has('nologin')) { // dev only: skip sign-in when testing the game itself
    showTitle({ uid: 'dev', email: '', name: 'Developer', verified: true });
    return;
  }
  let user: CloudUser | null = null;
  try {
    user = await initCloud();
  } catch {
    const known = lastKnownUser();
    if (known?.verified) { showTitle(known); return; } // no connection but this device has a confirmed account: straight in, the save in this browser is theirs
    const u = await showAuth({
      notice: 'Could not reach the account service. Check your connection and sign in again.',
      offlineUser: known, onOffline: () => { /* the save in this browser is already this account's */ },
    });
    if (u !== known) { try { await pullCloud(); } catch { /* shown by the sync state */ } }
    showTitle(u);
    return;
  }
  if (!user) user = await showAuth();
  if (!user.verified) user = await showVerify(user); // nobody plays until their email address is confirmed
  try { await pullCloud(); } catch { /* offline right now: the copy in this browser is used and uploaded later */ }
  showTitle(user);
}
void boot();

document.getElementById('signout')!.addEventListener('click', async () => {
  (document.getElementById('signout') as HTMLButtonElement).disabled = true;
  try { await flush(); } catch { /* the sign-out still goes ahead */ }
  await signOut();
  location.reload(); // a clean start for whoever signs in next
});

// The studio intro plays on the click, because browsers only allow its sound after a user gesture.
function enter(mode: 'new' | 'continue' | 'tutorial', commander?: string, difficulty?: string): void {
  if (game.tutorialStep !== null) mode = 'tutorial'; // opened with ?tutorial=1: every button here means the tutorial
  audio.stopMusic(1.2); // the menu theme ends when a game is chosen (the studio intro plays next)
  const begin = () => {
    if (mode === 'tutorial' && game.tutorialStep === null) game.beginTutorial();
    else if (mode === 'continue') game.loadSaved();
    else if (mode === 'new') game.newGame(commander, difficulty);
    title.hidden = true;
    hud.hidden = false;
    game.start();
  };
  const intro = window.FuzeNovaIntro;
  if (!intro) { begin(); return; }
  title.hidden = true;
  intro.play({ onDone: begin });
}

// ---- installable app (PWA) ----
interface InstallPromptEvent extends Event { prompt(): Promise<void>; userChoice: Promise<{ outcome: string }> }
let installPrompt: InstallPromptEvent | null = null;
const installBtn = document.getElementById('install')!;
const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
window.addEventListener('beforeinstallprompt', (e) => { // Chrome, Edge and Android offer this when the app is installable
  e.preventDefault();
  installPrompt = e as InstallPromptEvent;
  if (!standalone) installBtn.hidden = false;
});
window.addEventListener('appinstalled', () => { installBtn.hidden = true; installPrompt = null; });
installBtn.addEventListener('click', async () => {
  if (!installPrompt) return;
  await installPrompt.prompt();
  installPrompt = null;
  installBtn.hidden = true;
});
// iPhone and iPad have no install button to offer, so show how to do it by hand
if (!standalone && /iphone|ipad|ipod/i.test(navigator.userAgent)) document.getElementById('iosHint')!.hidden = false;

// offline play: only in the built game, so the dev server never serves stale files
if ('serviceWorker' in navigator && import.meta.env.PROD && import.meta.env.MODE !== 'tester') { // the tester pack has no service worker, so a new build is never hidden by an old cache
  // The browser itself only looks for a new version when the page is opened (and at most daily after that), so a game left open or an installed app
  // that stays running would never notice. Ask again every 10 minutes and whenever the player comes back to the window: one tiny request for sw.js.
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then((reg) => {
      const check = () => { if (!document.hidden && navigator.onLine) reg.update().catch(() => { /* offline or server busy: try again later */ }); };
      setInterval(check, 10 * 60 * 1000);
      document.addEventListener('visibilitychange', check);
    }).catch(() => { /* fine: the game still runs online */ });
  });
  // A new version is downloaded in the background; when it is ready, ask the player to reload (never mid-fight on their behalf).
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || document.getElementById('updateBar')) return; // the very first install is not an update
    const bar = document.createElement('button');
    bar.id = 'updateBar'; bar.textContent = 'A new version is ready - click to reload';
    bar.addEventListener('click', () => location.reload());
    document.body.append(bar);
  });
}

document.getElementById('start')!.addEventListener('click', async () => {
  if (game.tutorialStep !== null) { enter('new'); return; } // ?tutorial=1: every button is the tutorial
  const choice = await pickCommander();
  if (choice) enter('new', choice.commander, choice.difficulty);
});
continueBtn.addEventListener('click', () => enter('continue'));
document.getElementById('tut')!.addEventListener('click', () => enter('tutorial'));
const workshopBtn = document.getElementById('workshop-btn')!;
const refreshWorkshop = (): void => { const n = embers(); workshopBtn.textContent = n > 0 ? `Workshop (${n} Embers)` : 'Workshop'; };
workshopBtn.addEventListener('click', () => openWorkshop(refreshWorkshop));
refreshWorkshop();
initControlsPanel(TOOLS);

// Menu music: browsers only allow sound after the first click or key press, so it starts then and carries on through
// the commander select. It fades out when the game begins.
audio.playMusic('menu', 3);
const startMenuAudio = () => audio.unlock();
window.addEventListener('pointerdown', startMenuAudio, { once: true });
window.addEventListener('keydown', startMenuAudio, { once: true });
