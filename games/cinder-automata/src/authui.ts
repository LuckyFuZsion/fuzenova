// The sign-in screen: shown before the title screen until the player is signed in with email and password.
import { checkEmail, checkUsername, createAccount, friendlyError, refreshVerified, resetPassword, sendVerification, signIn, signOut, type CloudUser } from './cloud';

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

/** Shows the screen and resolves with the account once the player has signed in or created one. */
export function showAuth(opts: { notice?: string; offlineUser?: CloudUser | null; onOffline?: () => void } = {}): Promise<CloudUser> {
  const el = document.getElementById('auth')!;
  return new Promise((resolve) => {
    let mode: 'in' | 'up' = 'in';
    let busy = false;

    const render = (message = '', good = false) => {
      const up = mode === 'up';
      el.innerHTML = `<div class="au">
        <img class="au-logo" src="./logo/logo-shield.png" alt="Cinder Automata" onerror="this.remove()">
        <h2>${up ? 'Create your account' : 'Sign in to play'}</h2>
        <p class="au-sub">${up ? 'Your account keeps your saved game and your commanders on every device.' : 'Sign in with your email and password. Your saved game follows you.'}</p>
        <div class="au-tabs" role="tablist"><button data-mode="in" class="${up ? '' : 'on'}" role="tab">Sign in</button><button data-mode="up" class="${up ? 'on' : ''}" role="tab">Create account</button></div>
        <form id="auForm" novalidate>
          ${up ? '<label>Username<input id="auName" autocomplete="nickname" maxlength="20" placeholder="3 to 20 characters" required></label>' : ''}
          <label>Email<input id="auEmail" type="email" autocomplete="email" placeholder="you@example.com" required></label>
          <label>Password<input id="auPass" type="password" autocomplete="${up ? 'new-password' : 'current-password'}" placeholder="${up ? 'At least 6 characters' : 'Your password'}" required></label>
          <div class="au-msg${good ? ' good' : ''}" role="alert">${esc(message || opts.notice || '')}</div>
          <button class="au-go" type="submit">${up ? 'Create account' : 'Sign in'}</button>
          ${up ? '' : '<button class="au-link" type="button" id="auForgot">Forgot your password?</button>'}
        </form>
        ${opts.offlineUser && opts.onOffline ? `<button class="au-link" id="auOffline">No connection? Carry on offline as ${esc(opts.offlineUser.name)}</button>` : ''}
        <small>FuzeNova Games &middot; one account works across our browser games</small>
      </div>`;
      el.hidden = false;
    };
    render();

    const setBusy = (b: boolean) => {
      busy = b;
      el.querySelectorAll<HTMLButtonElement | HTMLInputElement>('button, input').forEach((x) => { x.disabled = b; });
      const go = el.querySelector<HTMLButtonElement>('.au-go');
      if (go) go.textContent = b ? 'Please wait...' : mode === 'up' ? 'Create account' : 'Sign in';
    };
    const val = (id: string): string => (el.querySelector<HTMLInputElement>(`#${id}`)?.value ?? '');

    el.onclick = (e) => {
      const t = e.target as HTMLElement;
      const tab = t.closest<HTMLElement>('[data-mode]');
      if (tab && !busy) { mode = tab.dataset.mode as 'in' | 'up'; render(); return; }
      if (t.closest('#auOffline')) { opts.onOffline?.(); el.hidden = true; if (opts.offlineUser) resolve(opts.offlineUser); return; }
      if (t.closest('#auForgot') && !busy) {
        const email = val('auEmail').trim();
        if (!email) { render('Type your email above first, then press this again.'); return; }
        setBusy(true);
        resetPassword(email).then(() => { render('If that email has an account, a reset link is on its way.', true); }, (err) => { render(friendlyError(err)); });
      }
    };
    el.onsubmit = async (e) => {
      e.preventDefault();
      if (busy) return;
      const email = val('auEmail').trim(), pass = val('auPass'), name = val('auName');
      if (!email || !pass) { render('Enter your email and password.'); return; }
      if (mode === 'up') {
        const chk = checkUsername(name);
        if ('error' in chk) { render(chk.error); return; }
        const em = checkEmail(email);
        if ('error' in em) { render(em.error); return; }
      }
      setBusy(true);
      try {
        const u = mode === 'up' ? await createAccount(email, pass, name) : await signIn(email, pass);
        el.hidden = true; el.innerHTML = '';
        resolve(u);
      } catch (err) {
        render(friendlyError(err));
        const em = el.querySelector<HTMLInputElement>('#auEmail'); if (em) em.value = email;
      }
    };
  });
}

/** Shown to anyone whose email address has not been confirmed yet: they stay here until they click the link we emailed them. */
export function showVerify(start: CloudUser): Promise<CloudUser> {
  const el = document.getElementById('auth')!;
  return new Promise((resolve) => {
    let busy = false, sentAt = 0;
    const render = (message = '', good = false) => {
      el.innerHTML = `<div class="au">
        <img class="au-logo" src="./logo/logo-shield.png" alt="Cinder Automata" onerror="this.remove()">
        <h2>Check your email</h2>
        <p class="au-sub">We sent a confirmation link to <b>${esc(start.email)}</b>. Click it, then come back here and press the button below. Check your spam folder if it does not arrive.</p>
        <div class="au-msg${good ? ' good' : ''}" role="alert">${esc(message)}</div>
        <button class="au-go" id="vDone">I have confirmed my email</button>
        <button class="au-link" id="vResend">Send the email again</button>
        <button class="au-link" id="vOut">Wrong address? Sign out</button>
        <small>FuzeNova Games &middot; confirming your email protects your saved games</small>
      </div>`;
      el.hidden = false;
    };
    const setBusy = (b: boolean) => { busy = b; el.querySelectorAll<HTMLButtonElement>('button').forEach((x) => { x.disabled = b; }); };
    const send = async (first: boolean) => {
      if (Date.now() - sentAt < 30000) { render('Please wait a moment before sending it again.'); return; }
      sentAt = Date.now();
      try { await sendVerification(); render(first ? 'We have just sent the email.' : 'Sent again. It can take a minute to arrive.', true); } catch (e) { render(friendlyError(e)); }
    };
    render();
    void send(true);
    el.onclick = async (e) => {
      const t = e.target as HTMLElement;
      if (busy) return;
      if (t.closest('#vResend')) { setBusy(true); await send(false); return; }
      if (t.closest('#vOut')) { setBusy(true); await signOut(); location.reload(); return; }
      if (t.closest('#vDone')) {
        setBusy(true);
        try {
          const u = await refreshVerified();
          if (u?.verified) { el.hidden = true; el.innerHTML = ''; resolve(u); return; }
          render('Not confirmed yet. Click the link in the email first, then try again.');
        } catch (err) { render(friendlyError(err)); }
      }
    };
    el.onsubmit = null;
  });
}
