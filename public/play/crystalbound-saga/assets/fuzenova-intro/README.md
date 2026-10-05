# FuzeNova Games intro

A 3.5 second studio splash: four element petals fly in, fuse on a big flash, the logo settles and the
FUZENOVA GAMES wordmark reveals, all timed to the sound sting. No dependencies, no build step.

## Files
```
fuzenova-intro/
  fuzenova-intro.js     the whole thing (plain script, defines window.FuzeNovaIntro)
  demo.html             open this to try it
  assets/               petals, emblem, glow, wordmark images (.webp) and sting.mp3   (~330 KB)
```
Copy the whole `fuzenova-intro` folder into any web app or game. The script finds its `assets/` folder
next to itself, so nothing needs configuring.

## Use
```html
<script src="fuzenova-intro/fuzenova-intro.js"></script>
<script>
  FuzeNovaIntro.preload();                 // optional: start downloading while your app loads
  startButton.onclick = () => {            // must be a tap/click/key press, or browsers block the sound
    FuzeNovaIntro.play({ onDone: () => startMyApp() });
  };
</script>
```

## Options for `FuzeNovaIntro.play({...})`
| option | default | what it does |
|---|---|---|
| `onDone` | none | called when the intro ends or is skipped |
| `onFadeStart` | none | called as the closing fade begins (about 0.4s before the end): start your own music here |
| `muted` | false | play the animation without sound |
| `volume` | 1 | sound level, 0 to 1 |
| `audioContext` / `destination` | own context | pass your existing Web Audio context and output node so the sting follows your volume/mute settings |
| `background` | `#05081A` | overlay colour |
| `zIndex` | 100000 | stacking order of the overlay |
| `skippable` | true | tap, click or `ctl.skip()` ends it early |
| `respectReducedMotion` | true | skip the whole intro for people who asked their device for less motion |
| `basePath` | folder next to the script | where `assets/` lives, if you move it |
| `parent` | `document.body` | element the overlay is added to |
| `freezeAt` | none | show one still frame at that many seconds (for screenshots), no sound |

`play()` returns `{ done, skip() }`. `done` is a promise that resolves when it has finished.

## Timing (from the sound file)
The big impact is at 1.33s, the tail fades by about 3.2s, and the whole thing ends at 3.45s. If you
swap in a different sting, change `IMPACT` and `END` at the top of `fuzenova-intro.js`.
