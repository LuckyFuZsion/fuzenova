/* Cinder Automata service worker. Generated into the build by tools/build-pwa.mjs: edit the template, not the copy. */
const VERSION = '33bb3d03a8';
const CACHE = `cinder-automata-${VERSION}`;
const SHELL = ["./","assets/index-C14ulU3u.js","assets/index-DRo0qM8p.css","fuzenova-intro/assets/core-glow.webp","fuzenova-intro/assets/emblem.webp","fuzenova-intro/assets/petal-ember.webp","fuzenova-intro/assets/petal-loam.webp","fuzenova-intro/assets/petal-storm.webp","fuzenova-intro/assets/petal-tide.webp","fuzenova-intro/assets/sting.mp3","fuzenova-intro/assets/word-fuzenova.webp","fuzenova-intro/assets/word-games.webp","fuzenova-intro/fuzenova-intro.js","icons/apple-touch-icon.png","icons/favicon.png","icons/icon-192.png","icons/icon-512.png","icons/icon-maskable-512.png","index.html","manifest.webmanifest","sprites/manifest.json"];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('cinder-automata-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // never touch other sites
  if (url.pathname.endsWith('/sw.js')) return; // the worker itself always comes from the network so updates are noticed

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req, { ignoreSearch: true }); // ?build=..&fight=.. test links still find the page
    if (hit) return hit;
    try {
      const res = await fetch(req);
      if (res.ok) cache.put(req, res.clone()); // cache sprites and anything else as it is first used
      return res;
    } catch {
      if (req.mode === 'navigate') return (await cache.match('./')) ?? Response.error(); // offline: open the game page
      return Response.error();
    }
  })());
});
