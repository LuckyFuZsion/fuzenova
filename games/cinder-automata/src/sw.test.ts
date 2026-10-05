// The service worker can't be exercised in every browser, so this runs its code against a small fake of the browser's
// cache and network, to check the offline behaviour it promises.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

type Handler = (e: unknown) => void;

function boot(shell: string[], network: Map<string, string>, online = true) {
  const store = new Map<string, Map<string, string>>();
  const handlers: Record<string, Handler> = {};
  const norm = (r: string | { url: string }) => new URL(typeof r === 'string' ? r : r.url, 'https://game.test/play/cinder-automata/').pathname;
  const cacheApi = {
    open: async (name: string) => {
      if (!store.has(name)) store.set(name, new Map());
      const m = store.get(name)!;
      return {
        addAll: async (paths: string[]) => { for (const p of paths) { const t = network.get(norm(p)); if (t === undefined) throw new Error('404 ' + p); m.set(norm(p), t); } },
        match: async (req: string | { url: string }) => { const t = m.get(norm(req)); return t === undefined ? undefined : { ok: true, text: t }; },
        put: async (req: { url: string }, res: { text: string }) => { m.set(norm(req), res.text); },
      };
    },
    keys: async () => [...store.keys()],
    delete: async (k: string) => store.delete(k),
  };
  const src = readFileSync('tools/sw-template.js', 'utf8').replace('__VERSION__', 'v1').replace('__SHELL__', JSON.stringify(shell));
  const self = {
    location: { origin: 'https://game.test' }, skipWaiting: async () => {}, clients: { claim: async () => {} },
    addEventListener: (t: string, h: Handler) => { handlers[t] = h; },
  };
  const fetchFn = async (req: { url: string }) => {
    if (!online) throw new Error('offline');
    const t = network.get(norm(req));
    return t === undefined ? { ok: false, text: '' } : { ok: true, text: t, clone() { return this; } };
  };
  new Function('self', 'caches', 'fetch', 'URL', 'Response', src)(self, cacheApi, fetchFn, URL, { error: () => 'NETWORK-ERROR' });
  const install = () => { let p: Promise<unknown> = Promise.resolve(); handlers.install({ waitUntil: (x: Promise<unknown>) => { p = x; } }); return p; };
  const activate = () => { let p: Promise<unknown> = Promise.resolve(); handlers.activate({ waitUntil: (x: Promise<unknown>) => { p = x; } }); return p; };
  /** Sends a request through the worker. Resolves to 'UNHANDLED' when the worker chooses not to answer (so the browser handles it). */
  const get = (url: string, mode = 'cors', method = 'GET', origin = 'https://game.test') => new Promise<unknown>((resolve) => {
    let answered = false;
    handlers.fetch({ request: { method, url: origin + url, mode }, respondWith: (p: Promise<unknown>) => { answered = true; resolve(p); } });
    if (!answered) resolve('UNHANDLED');
  });
  return { store, install, activate, get, setOnline: (v: boolean) => { online = v; } };
}

const NET = new Map([
  ['/play/cinder-automata/', '<html>game</html>'],
  ['/play/cinder-automata/assets/app.js', 'code'],
  ['/play/cinder-automata/sprites/belt-straight.png', 'png'],
]);

describe('service worker', () => {
  it('precaches the shell on install', async () => {
    const sw = boot(['./', 'assets/app.js'], NET);
    await sw.install();
    const files = [...sw.store.get('cinder-automata-v1')!.keys()];
    expect(files).toContain('/play/cinder-automata/assets/app.js');
    expect(files).toContain('/play/cinder-automata/');
  });

  it('serves the game with no network once it has been visited', async () => {
    const sw = boot(['./', 'assets/app.js'], NET);
    await sw.install();
    sw.setOnline(false);
    expect(await sw.get('/play/cinder-automata/assets/app.js')).toMatchObject({ text: 'code' });
    expect(await sw.get('/play/cinder-automata/?build=20&fight=40', 'navigate')).toMatchObject({ text: '<html>game</html>' });
  });

  it('caches sprites as they are first used, then serves them offline', async () => {
    const sw = boot(['./'], NET);
    await sw.install();
    await sw.get('/play/cinder-automata/sprites/belt-straight.png'); // first use, online
    sw.setOnline(false);
    expect(await sw.get('/play/cinder-automata/sprites/belt-straight.png')).toMatchObject({ text: 'png' });
  });

  it('opens the game page for any navigation while offline', async () => {
    const sw = boot(['./'], NET);
    await sw.install();
    sw.setOnline(false);
    expect(await sw.get('/play/cinder-automata/anything', 'navigate')).toMatchObject({ text: '<html>game</html>' });
  });

  it('deletes older versions when a new one activates', async () => {
    const sw = boot(['./'], NET);
    sw.store.set('cinder-automata-old', new Map());
    sw.store.set('someone-elses-cache', new Map());
    await sw.install();
    await sw.activate();
    expect([...sw.store.keys()]).toEqual(['someone-elses-cache', 'cinder-automata-v1']);
  });

  it('leaves other sites and non-GET requests alone', async () => {
    const sw = boot(['./'], NET);
    await sw.install();
    expect(await sw.get('/lib.js', 'cors', 'GET', 'https://cdn.example.com')).toBe('UNHANDLED'); // another site
    expect(await sw.get('/play/cinder-automata/api', 'cors', 'POST')).toBe('UNHANDLED'); // not a GET
    expect(await sw.get('/play/cinder-automata/sw.js')).toBe('UNHANDLED'); // the worker file itself, so updates are noticed
  });
});
