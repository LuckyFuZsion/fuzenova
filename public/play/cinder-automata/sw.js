/* Cinder Automata service worker. Generated into the build by tools/build-pwa.mjs: edit the template, not the copy. */
const VERSION = '6f4ac98bd0';
const CACHE = `cinder-automata-${VERSION}`;
const SHELL = ["./","assets/index-BlbjTdG-.js","assets/index-xqLYkiui.css","fuzenova-intro/assets/core-glow.webp","fuzenova-intro/assets/emblem.webp","fuzenova-intro/assets/petal-ember.webp","fuzenova-intro/assets/petal-loam.webp","fuzenova-intro/assets/petal-storm.webp","fuzenova-intro/assets/petal-tide.webp","fuzenova-intro/assets/sting.mp3","fuzenova-intro/assets/word-fuzenova.webp","fuzenova-intro/assets/word-games.webp","fuzenova-intro/fuzenova-intro.js","icons/apple-touch-icon.png","icons/favicon.png","icons/icon-192.png","icons/icon-512.png","icons/icon-maskable-512.png","index.html","manifest.webmanifest","sprites/manifest.json","offline-files.json"];
// The sign-in code (Firebase) comes from Google's servers. It is versioned, so a copy can be kept for good: after one successful visit the game
// opens and signs you in even when Google's servers (or your connection) cannot be reached. Kept in its own cache so game updates do not clear it.
const SDK_CACHE = 'cinder-sdk-10';
// the three files src/cloud.ts loads (keep the version in step with it); fetched when the worker installs so even a first visit is covered
const SDK_FILES = ['app', 'auth', 'firestore'].map((n) => `https://www.gstatic.com/firebasejs/10.14.1/firebase-${n}-compat.js`);
const isSdk = (u) => u.hostname === 'www.gstatic.com' && u.pathname.startsWith('/firebasejs/');

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL))
      .then(() => caches.open(SDK_CACHE))
      .then((c) => Promise.allSettled(SDK_FILES.map(async (u) => { const res = await fetch(u, { mode: 'no-cors' }); await c.put(u, res); }))) // a failure here must never stop the game installing
      .then(() => self.skipWaiting()),
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
  if (isSdk(url)) {
    event.respondWith((async () => {
      const cache = await caches.open(SDK_CACHE);
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok || res.type === 'opaque') cache.put(req, res.clone()); // a script tag gets an opaque answer; it is still a good copy
      return res;
    })());
    return;
  }
  if (url.origin !== self.location.origin) return; // never touch any other site
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
