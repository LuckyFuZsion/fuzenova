/*!
 * FuzeNova Games - studio intro (splash animation + sound)
 * Self-contained: no dependencies, no build step. Keep this file next to its assets/ folder.
 *
 *   <script src="fuzenova-intro/fuzenova-intro.js"></script>
 *   // call from a tap / click / key press so the browser allows sound:
 *   const intro = FuzeNovaIntro.play({ onDone: () => startMyApp() });
 *   intro.skip();            // e.g. on a second tap (a tap on the intro itself already skips)
 *   intro.done.then(...)     // resolves when the intro has finished or been skipped
 *
 * See README.md for every option.
 */
(function (global) {
  'use strict';

  // Folder this script was loaded from, so the assets are found wherever the package is copied to.
  var SCRIPT_BASE = '';
  try { if (document.currentScript && document.currentScript.src) SCRIPT_BASE = new URL('.', document.currentScript.src).href; } catch (e) {}

  var IMPACT = 1.33;       // seconds into the sting where the big hit lands (measured from the audio file)
  var END = 3.45;          // total length
  var FADE = 0.4;          // fade-out at the end
  var PAL = ['#ff7a2a', '#7ad12a', '#2ec8ff', '#a45cff', '#ffe27a', '#ffffff'];   // Ember, Loam, Tide, Storm, Dawn, white
  var PETALS = [           // clockwise from the top; dx/dy = the side each petal flies in from
    { n: 'ember', dx: 0, dy: -1, delay: 0.00 },
    { n: 'loam', dx: -1, dy: 0, delay: 0.08 },
    { n: 'storm', dx: 0, dy: 1, delay: 0.16 },
    { n: 'tide', dx: 1, dy: 0, delay: 0.24 }
  ];
  var CX = 0.5, CY = 0.49; // centre of the emblem, as a fraction of the stage
  var IMG_NAMES = ['petal-ember', 'petal-loam', 'petal-tide', 'petal-storm', 'core-glow', 'emblem', 'word-fuzenova', 'word-games'];

  var cache = {};          // base -> { images, sound }
  var current = null;      // the intro that is playing right now (only one at a time)

  var clamp = function (x, a, b) { return x < a ? a : x > b ? b : x; };
  var c01 = function (x) { return clamp(x, 0, 1); };
  var easeOut4 = function (x) { return 1 - Math.pow(1 - c01(x), 4); };
  var easeOut3 = function (x) { return 1 - Math.pow(1 - c01(x), 3); };
  var easeInOut = function (x) { x = c01(x); return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; };

  function baseFor(opts) {
    var b = (opts && opts.basePath) || (SCRIPT_BASE ? SCRIPT_BASE + 'assets/' : 'fuzenova-intro/assets/');
    return b.charAt(b.length - 1) === '/' ? b : b + '/';
  }

  // Start downloading everything ahead of time (safe to call more than once; call it while your app loads).
  function preload(opts) {
    var base = baseFor(opts);
    if (cache[base]) return cache[base].images;
    var images = Promise.all(IMG_NAMES.map(function (n) {
      return new Promise(function (res) {
        var im = new Image(); im.onload = function () { res([n, im]); }; im.onerror = function () { res([n, null]); };
        im.src = base + n + '.webp';
      });
    })).then(function (a) { var o = {}; a.forEach(function (p) { o[p[0]] = p[1]; }); return o; });
    var sound = fetch(base + 'sting.mp3').then(function (r) { return r.ok ? r.arrayBuffer() : null; }).catch(function () { return null; });
    cache[base] = { images: images, sound: sound, buffers: typeof WeakMap === 'function' ? new WeakMap() : null };
    return images;
  }

  function injectStyle(z) {
    var s = document.getElementById('fni-style');
    if (!s) { s = document.createElement('style'); s.id = 'fni-style'; document.head.appendChild(s); }
    s.textContent =
      '.fni{position:fixed;inset:0;z-index:' + z + ';display:flex;align-items:center;justify-content:center;overflow:hidden;cursor:pointer;-webkit-tap-highlight-color:transparent;user-select:none;-webkit-user-select:none}' +
      '.fni-col{display:flex;flex-direction:column;align-items:center}' +
      '.fni canvas{position:absolute;left:0;top:0;pointer-events:none}' +
      '.fni-word{display:flex;flex-direction:column;align-items:center}' +
      '.fni-fz{position:relative}.fni-fz img,.fni-gm img{display:block;width:100%;height:auto;pointer-events:none}' +
      '.fni-shine{position:absolute;inset:0;pointer-events:none;background:linear-gradient(105deg,transparent 0,transparent 40%,rgba(255,255,255,.95) 50%,transparent 60%,transparent 100%) no-repeat;background-size:250% 100%;' +
      '-webkit-mask-size:100% 100%;mask-size:100% 100%;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat}' +
      '.fni-flash{position:absolute;inset:0;pointer-events:none;opacity:0}' +
      '.fni-hint{position:absolute;left:0;right:0;bottom:calc(env(safe-area-inset-bottom,0px) + 18px);text-align:center;font:600 11px/1 system-ui,sans-serif;letter-spacing:.2em;text-transform:uppercase;color:rgba(255,255,255,.4);opacity:0;pointer-events:none}';
  }

  function play(opts) {
    opts = opts || {};
    if (current) return current;
    var ctl = { skip: function () {} };
    ctl.done = new Promise(function (resolve) { ctl._resolve = resolve; });
    var reduced = opts.respectReducedMotion !== false && global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || typeof document === 'undefined') { ctl._resolve(); return ctl; }
    current = ctl;
    var base = baseFor(opts);
    preload(opts);
    var parent = opts.parent || document.body;

    // --- Build the overlay right away so the tap gives instant feedback ---
    injectStyle(opts.zIndex || 100000);
    var root = document.createElement('div'); root.className = 'fni'; root.style.background = opts.background || '#05081A';
    root.setAttribute('role', 'presentation');
    var col = document.createElement('div'); col.className = 'fni-col';
    var stage = document.createElement('div'); stage.style.position = 'relative';
    var canvas = document.createElement('canvas');
    var word = document.createElement('div'); word.className = 'fni-word';
    var fzWrap = document.createElement('div'); fzWrap.className = 'fni-fz';
    var fzImg = document.createElement('img'); fzImg.alt = 'FuzeNova'; fzImg.src = base + 'word-fuzenova.webp'; fzImg.draggable = false;
    var shine = document.createElement('div'); shine.className = 'fni-shine';
    var maskUrl = 'url("' + base + 'word-fuzenova.webp")';
    shine.style.webkitMaskImage = maskUrl; shine.style.maskImage = maskUrl;
    fzWrap.appendChild(fzImg); fzWrap.appendChild(shine);
    var gmWrap = document.createElement('div'); gmWrap.className = 'fni-gm';
    var gmImg = document.createElement('img'); gmImg.alt = 'Games'; gmImg.src = base + 'word-games.webp'; gmImg.draggable = false;
    gmWrap.appendChild(gmImg);
    word.appendChild(fzWrap); word.appendChild(gmWrap);
    col.appendChild(stage); col.appendChild(word);
    var flash = document.createElement('div'); flash.className = 'fni-flash';
    var hint = document.createElement('div'); hint.className = 'fni-hint'; hint.textContent = opts.skipText || 'Tap to skip';
    root.appendChild(canvas); root.appendChild(col); root.appendChild(flash);
    if (opts.skippable !== false) root.appendChild(hint);
    parent.appendChild(root);
    var ctx2d = canvas.getContext('2d');

    var S = 0, dpr = 1, VW = 0, VH = 0, OX = 0, OY = 0;
    function layout() {
      VW = global.innerWidth || 400; VH = global.innerHeight || 700;
      S = Math.floor(Math.min(VW * 0.88, 560, VH * 0.62));
      dpr = Math.min(global.devicePixelRatio || 1, 2);
      canvas.width = Math.round(VW * dpr); canvas.height = Math.round(VH * dpr);
      canvas.style.width = VW + 'px'; canvas.style.height = VH + 'px';
      stage.style.width = S + 'px'; stage.style.height = S + 'px';
      word.style.marginTop = (-0.018 * S) + 'px';
      fzWrap.style.width = S + 'px';
      gmWrap.style.width = (0.687 * S) + 'px'; gmWrap.style.marginTop = (0.061 * S) + 'px';
      col.style.transform = 'translateY(' + (-0.03 * S) + 'px)';
      var r = stage.getBoundingClientRect(); OX = r.left; OY = r.top;   // where the logo sits on screen
      flash.style.background = 'radial-gradient(circle at ' + (OX + CX * S) + 'px ' + (OY + CY * S) + 'px,#fff 0,rgba(255,240,200,.85) ' + (0.09 * S) + 'px,rgba(255,210,120,.25) ' + (0.35 * S) + 'px,transparent ' + (0.75 * S) + 'px)';
    }
    layout(); global.addEventListener('resize', layout);

    // --- State ---
    var finished = false, skipAt = null, fadeCalled = false, raf = 0;
    var images = null, actx = null, gainNode = null, src = null, p0 = 0, lat = 0, frozen = opts.freezeAt != null;
    var parts = [], burst = false, embers = [];
    for (var i = 0; i < 26; i++) embers.push({ x: Math.random(), y: Math.random(), v: 0.02 + Math.random() * 0.05, r: 0.6 + Math.random() * 1.6, ph: Math.random() * 6.28 });

    function elapsed() { return frozen ? opts.freezeAt : (performance.now() - p0) / 1000 - lat; }

    function stopAudio(fast) {
      try {
        if (gainNode && actx) { var n = actx.currentTime; gainNode.gain.cancelScheduledValues(n); gainNode.gain.setValueAtTime(gainNode.gain.value, n); gainNode.gain.linearRampToValueAtTime(0, n + (fast ? 0.15 : 0.05)); }
        if (src) src.stop((actx ? actx.currentTime : 0) + (fast ? 0.2 : 0.1));
      } catch (e) {}
    }

    function finish() {
      if (finished) return; finished = true;
      cancelAnimationFrame(raf); global.removeEventListener('resize', layout);
      stopAudio(true);
      if (root.parentNode) root.parentNode.removeChild(root);
      current = null;
      try { if (opts.onDone) opts.onDone(); } catch (e) {}
      ctl._resolve();
    }
    function fadeStart() { if (fadeCalled) return; fadeCalled = true; try { if (opts.onFadeStart) opts.onFadeStart(); } catch (e) {} }
    ctl.skip = function () { if (finished || skipAt !== null || frozen) return; skipAt = elapsed(); fadeStart(); stopAudio(true); };
    if (opts.skippable !== false) root.addEventListener('pointerdown', function (e) { e.preventDefault(); ctl.skip(); });
    ctl.canvas = canvas;

    // --- Drawing ---
    function drawImg(im, x, y, w, h, a, mode) {
      if (!im || a <= 0) return; ctx2d.globalAlpha = a; ctx2d.globalCompositeOperation = mode || 'source-over'; ctx2d.drawImage(im, x, y, w, h);
    }
    function petalPass(im, p, t, alphaMul) {
      var tp = (t - p.delay) / 0.95, E = easeOut4(tp);
      var passes = [{ e: E, a: 1 }];
      for (var g = 1; g <= 5; g++) { var eg = easeOut4((t - g * 0.03 - p.delay) / 0.95); if (eg < E - 0.002) passes.push({ e: eg, a: 0.22 / g, trail: true }); }
      passes.forEach(function (ps) {
        var off = (0.75 * Math.max(VW, VH) + 0.5 * S) * (1 - ps.e), ang = 0.9 * (1 - ps.e), cx = CX * S, cy = CY * S;
        ctx2d.save(); ctx2d.translate(cx, cy); ctx2d.rotate(ang); ctx2d.translate(-cx + p.dx * off, -cy + p.dy * off);
        var a = ps.a * alphaMul * c01(tp * 4);
        drawImg(im, 0, 0, S, S, a, ps.trail ? 'lighter' : 'source-over');
        ctx2d.restore();
      });
    }
    function core(scale, alpha) {
      var im = images['core-glow']; if (!im || alpha <= 0) return;
      var w = im.width * (S / 1500) * scale, h = im.height * (S / 1500) * scale;
      drawImg(im, CX * S - w / 2, CY * S - h / 2, w, h, alpha, 'lighter');
    }
    function render(t) {
      var s = ctx2d; s.setTransform(dpr, 0, 0, dpr, 0, 0); s.clearRect(0, 0, VW, VH);
      var dt = 1 / 60;
      // ambient embers
      var emA = c01(t / 0.6) * 0.5;
      embers.forEach(function (e) {
        if (!frozen) { e.y -= e.v * dt; if (e.y < -0.02) { e.y = 1.02; e.x = Math.random(); } }
        var a = emA * (0.5 + 0.5 * Math.sin(t * 2.4 + e.ph));
        s.globalCompositeOperation = 'lighter'; s.globalAlpha = a; s.fillStyle = '#ffcf8a';
        s.beginPath(); s.arc(e.x * VW, e.y * VH, e.r, 0, 6.283); s.fill();
      });
      var post = t - IMPACT;
      var sh = post >= 0 && post < 0.5 ? 7 * Math.exp(-post * 9) : 0;
      s.setTransform(dpr, 0, 0, dpr, (OX + (sh ? (Math.random() - 0.5) * 2 * sh : 0)) * dpr, (OY + (sh ? (Math.random() - 0.5) * 2 * sh : 0)) * dpr);
      // petals fly in, then swap for the finished emblem under the flash
      var petalA = post < 0 ? 1 : 1 - c01(post / 0.14);
      if (petalA > 0) PETALS.forEach(function (p) {
        var im = images['petal-' + p.n]; if (!im) return;
        var hang = t > 1.0 && post < 0 ? 1 + Math.sin(t * 90) * 0.0016 * c01((t - 1.0) / 0.3) : 1;   // tiny tremble before the hit
        s.save(); if (hang !== 1) { s.translate(CX * S, CY * S); s.scale(hang, hang); s.translate(-CX * S, -CY * S); }
        petalPass(im, p, t, petalA); s.restore();
      });
      if (post >= -0.01) {
        var ea = c01((post + 0.01) / 0.1), pu = 1 + 0.07 * Math.exp(-Math.max(post, 0) * 7), rot = 0.12 * Math.exp(-Math.max(post, 0) * 5);
        s.save(); s.translate(CX * S, CY * S); s.rotate(rot); s.scale(pu, pu); s.translate(-CX * S, -CY * S);
        drawImg(images.emblem, 0, 0, S, S, ea, 'source-over'); s.restore();
      }
      // core glow: gathers before the hit, blooms on it, then breathes
      if (post < 0) core(0.04 + 0.32 * Math.pow(c01((t - 0.5) / (IMPACT - 0.5)), 2.2), c01((t - 0.4) / 0.5));
      else core(0.9 + 1.6 * Math.exp(-post * 5.5) + 0.05 * Math.sin(post * 4), 0.4 + 0.5 * Math.exp(-post * 2) + 0.1 * Math.sin(post * 3.2));
      // shockwave rings
      if (post >= 0) [0, 0.09].forEach(function (d, k) {
        var q = post - d; if (q < 0 || q > 1) return;
        s.globalCompositeOperation = 'lighter'; s.globalAlpha = (1 - q) * (k ? 0.5 : 0.8); s.lineWidth = (k ? 1.5 : 3) * (1 - q * 0.6);
        s.strokeStyle = k ? '#7fd8ff' : '#ffe6a8'; s.beginPath(); s.arc(CX * S, CY * S, q * S * 0.75, 0, 6.283); s.stroke();
      });
      // sparkles
      if (post >= 0 && !burst) {
        burst = true;
        for (var i = 0; i < 120; i++) { var a = Math.random() * 6.283, sp = (0.15 + Math.random() * 0.85); parts.push({ x: CX, y: CY, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.8 + Math.random() * 1.3, age: 0, r: 0.8 + Math.random() * 2.6, c: PAL[(Math.random() * PAL.length) | 0], ph: Math.random() * 6.28 }); }
      }
      if (frozen && post >= 0 && !parts.some(function (p) { return p.sim; })) {   // stills: fast-forward the sparkles
        parts.forEach(function (p) { var k = Math.exp(-2.2 * post); p.x = CX + p.vx * (1 - k) / 2.2; p.y = CY + p.vy * (1 - k) / 2.2; p.age = post; p.sim = 1; });
      }
      parts.forEach(function (p) {
        if (!frozen) { p.age += dt; var dr = Math.exp(-2.2 * dt); p.vx *= dr; p.vy *= dr; p.x += p.vx * dt; p.y += p.vy * dt; }
        if (p.age >= p.life) return;
        var a = (1 - p.age / p.life) * (0.6 + 0.4 * Math.sin(p.age * 18 + p.ph));
        s.globalCompositeOperation = 'lighter'; s.globalAlpha = Math.max(a, 0); s.fillStyle = p.c;
        s.beginPath(); s.arc(p.x * S, p.y * S, p.r, 0, 6.283); s.fill();
      });
      s.globalAlpha = 1; s.globalCompositeOperation = 'source-over';
      // screen flash and shake
      flash.style.opacity = post >= 0 ? String(Math.pow(Math.max(0, 1 - post / 0.4), 2)) : '0';
      // wordmark
      var fz = easeOut3((t - 1.75) / 0.75);
      fzWrap.style.clipPath = fzWrap.style.webkitClipPath = 'inset(0 ' + ((1 - fz) * 100).toFixed(1) + '% 0 0)';
      shine.style.backgroundPosition = (100 - 100 * easeInOut((t - 1.85) / 0.95)).toFixed(1) + '% 0';
      var gm = c01((t - 2.35) / 0.6);
      gmWrap.style.opacity = gm.toFixed(3); gmWrap.style.transform = 'translateY(' + ((1 - gm) * 8).toFixed(1) + 'px)';
      hint.style.opacity = String(c01((t - 0.6) / 0.5) * (1 - c01((t - 2.6) / 0.4)));
      // overall fade out
      var fadeT = skipAt !== null ? skipAt : END - FADE, fadeLen = skipAt !== null ? 0.25 : FADE;
      var o = 1 - c01((t - fadeT) / fadeLen);
      root.style.opacity = frozen ? '1' : o.toFixed(3);
      return o;
    }

    function tick() {
      if (finished) return;
      var t = elapsed(), o = render(t);
      if (!fadeCalled && t >= END - FADE) fadeStart();
      if (o <= 0 || (skipAt === null && t >= END)) { finish(); return; }
      raf = requestAnimationFrame(tick);
    }

    // --- Load, then start picture and sound together ---
    var timeout = new Promise(function (r) { setTimeout(function () { r(null); }, opts.loadTimeout || 2500); });
    Promise.race([cache[base].images, timeout]).then(function (imgs) {
      if (finished) return;
      var need = ['emblem', 'core-glow'].concat(PETALS.map(function (p) { return 'petal-' + p.n; }));
      if (!imgs || need.some(function (n) { return !imgs[n]; })) { finish(); return; }
      images = imgs;
      if (frozen) { render(opts.freezeAt); return; }
      var wantSound = !opts.muted && opts.sound !== false;
      var soundReady = wantSound ? Promise.race([cache[base].sound, new Promise(function (r) { setTimeout(function () { r(null); }, 800); })]) : Promise.resolve(null);
      soundReady.then(function (raw) {
        if (finished) return;
        var begin = function () { if (finished) return; p0 = performance.now(); raf = requestAnimationFrame(tick); };
        if (!raw) { begin(); return; }
        try {
          actx = opts.audioContext || new (global.AudioContext || global.webkitAudioContext)();
          if (actx.state === 'suspended') actx.resume();
          var store = cache[base].buffers, got = store && store.get(actx);
          var decoded = got ? Promise.resolve(got) : new Promise(function (res, rej) { var p = actx.decodeAudioData(raw.slice(0), res, rej); if (p && p.catch) p.catch(rej); });
          decoded.then(function (buf) {
            if (store) store.set(actx, buf);
            if (finished) return;
            gainNode = actx.createGain(); var vol = opts.volume == null ? 1 : opts.volume; var n = actx.currentTime;
            gainNode.gain.setValueAtTime(vol, n); gainNode.gain.setValueAtTime(vol, n + 2.6); gainNode.gain.linearRampToValueAtTime(0, n + 3.2);   // the file ends mid-swell, so fade it out
            src = actx.createBufferSource(); src.buffer = buf; src.connect(gainNode); gainNode.connect(opts.destination || actx.destination);
            lat = (actx.outputLatency || actx.baseLatency || 0.03) + 0.02;
            src.start(); begin();
          }, function () { begin(); });
        } catch (e) { begin(); }
      });
    });
    return ctl;
  }

  global.FuzeNovaIntro = { play: play, preload: preload, version: '1.0.0' };
})(typeof window !== 'undefined' ? window : this);
