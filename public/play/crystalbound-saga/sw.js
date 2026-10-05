// Crystalbound Saga offline cache (registered from index.html).
// - One persistent cache (ASSETS) holds everything: the page, scripts, art, music and sounds. It survives
//   updates; stale files are removed by the page, which compares offline-manifest.json between versions.
// - On install the "core" files (~5 MB: everything needed to play any level, minus big art and music) are
//   cached, so the game always works offline. The rest arrives as it's used, or all at once through
//   "Download for offline play" in More.
// - The page, scripts and manifests are fetched fresh when online (the cached copy is used offline).
// - Images, music and sounds are served from the cache; if missing they're fetched and cached.
// - Browsers (iPhones especially) ask for audio in byte ranges, which a cache can't store, so the whole file
//   is cached and ranges are sliced from it here.
const ASSETS = 'crystalbound-assets';

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil((async () => {
    const cache = await caches.open(ASSETS);
    try {
      const m = await (await fetch('offline-manifest.json', { cache: 'no-store' })).json();
      const base = new URL('./', self.registration.scope).href;
      await Promise.all(m.files.filter(f => f.core).map(f => cache.match(base + f.p).then(hit => hit || cache.add(base + f.p)).catch(() => {})));
    } catch (err) { await cache.add('index.html').catch(() => {}); }
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('crystalbound-') && k !== ASSETS).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (/offline-manifest\.json$/.test(url.pathname)) return; // always straight from the network
  if (req.mode === 'navigate' || /\.(html|js|json|webmanifest)$|\/$/.test(url.pathname)) { e.respondWith(networkFirst(req, url)); return; }
  if (/\.mp3$/i.test(url.pathname)) { e.respondWith(music(req, url)); return; }
  if (/\.(webp|jpe?g|png|ico)$/i.test(url.pathname)) { e.respondWith(cacheFirst(url)); return; }
});

async function networkFirst(req, url) {
  const cache = await caches.open(ASSETS), key = url.origin + url.pathname;
  try {
    const r = await fetch(req);
    if (r.ok && r.status === 200) cache.put(key, r.clone());
    return r;
  } catch (err) {
    return (await cache.match(key)) || (req.mode === 'navigate' ? await cache.match(new URL('index.html', self.registration.scope).href) : null) || Response.error();
  }
}

async function cacheFirst(url) {
  const cache = await caches.open(ASSETS), key = url.origin + url.pathname;
  const hit = await cache.match(key);
  if (hit) return hit;
  try { const r = await fetch(key); if (r.ok && r.status === 200) cache.put(key, r.clone()); return r; }
  catch (err) { return Response.error(); }
}

async function music(req, url) {
  const cache = await caches.open(ASSETS), key = url.origin + url.pathname;
  const range = req.headers.get('range');
  const hit = await cache.match(key);
  if (hit) return range ? sliceRange(hit, range) : hit;
  // Not cached yet: answer from the network now, and fetch the whole file into the cache in the background.
  fetch(key).then(r => { if (r.ok && r.status === 200) cache.put(key, r); }).catch(() => {});
  return fetch(req);
}

async function sliceRange(res, range) {
  const buf = await res.clone().arrayBuffer(), size = buf.byteLength;
  const m = /bytes=(\d*)-(\d*)/.exec(range) || [];
  let start = m[1] ? +m[1] : 0, end = m[2] ? +m[2] : size - 1;
  if (!m[1] && m[2]) { start = Math.max(0, size - +m[2]); end = size - 1; } // "bytes=-N": the last N bytes
  end = Math.min(end, size - 1);
  if (start > end) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
  return new Response(buf.slice(start, end + 1), {
    status: 206,
    headers: { 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': String(end - start + 1),
      'Content-Type': res.headers.get('Content-Type') || 'audio/mpeg', 'Accept-Ranges': 'bytes' },
  });
}
