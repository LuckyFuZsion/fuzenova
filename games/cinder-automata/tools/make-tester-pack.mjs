// Builds a zip a tester can unpack and double-click: the game plus a tiny local web server and a launcher.
// Needs nothing installed on Windows (the server is PowerShell, which ships with Windows).
// Usage: npm run tester     ->  release/CinderAutomata-Tester.zip
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const pack = join(root, 'release', 'CinderAutomata-Tester');
const zip = join(root, 'release', 'CinderAutomata-Tester.zip');
// on Windows the shell is needed to find npx; quote any argument with a space in it (this folder has "VB V0" in its path)
const q = (a) => (process.platform === 'win32' && /\s/.test(a) ? `"${a}"` : a);
const run = (cmd, args) => execFileSync(cmd, args.map(q), { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' });

rmSync(join(root, 'release'), { recursive: true, force: true });
mkdirSync(pack, { recursive: true });

run('node', ['tools/build-sound-manifest.mjs']);
run('npx', ['tsc', '--noEmit']);
// build into the pack, NOT into the website folder, so this never touches the live site files
run('npx', ['vite', 'build', '--mode', 'tester', '--outDir', join(pack, 'game'), '--emptyOutDir']);

const version = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version;
const stamp = new Date().toISOString().slice(0, 10);

writeFileSync(join(pack, 'Play Cinder Automata.bat'), [
  '@echo off',
  'title Cinder Automata (leave this window open while you play)',
  'echo.',
  'echo  Starting Cinder Automata... your browser will open in a moment.',
  'echo  Leave this window open while you play. Close it to stop the game.',
  'echo.',
  'powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1"',
  'echo.',
  'echo  The game has stopped. You can close this window.',
  'pause',
  '',
].join('\r\n'));

// a small static web server for the game folder, on this computer only (localhost)
const server = String.raw`param([int]$Port = 5180, [switch]$NoBrowser)
# Serves the "game" folder on this computer only (localhost). Nothing is sent anywhere.
$root = Join-Path $PSScriptRoot 'game'
$mime = @{ '.html'='text/html; charset=utf-8'; '.js'='text/javascript; charset=utf-8'; '.css'='text/css; charset=utf-8'; '.json'='application/json'; '.webmanifest'='application/manifest+json'
  '.png'='image/png'; '.jpg'='image/jpeg'; '.webp'='image/webp'; '.svg'='image/svg+xml'; '.mp3'='audio/mpeg'; '.ogg'='audio/ogg'; '.wav'='audio/wav'; '.mp4'='video/mp4'; '.woff2'='font/woff2'; '.ico'='image/x-icon'; '.txt'='text/plain' }
$listener = $null
for ($p = $Port; $p -lt $Port + 20; $p++) {
  $l = New-Object System.Net.HttpListener
  $l.Prefixes.Add("http://localhost:$p/")
  try { $l.Start(); $listener = $l; $Port = $p; break } catch { $l.Close() }
}
if (-not $listener) { Write-Host 'Could not open a local port. Close other copies of the game and try again.'; exit 1 }
$url = "http://localhost:$Port/"
Write-Host "Cinder Automata is running at $url"
if (-not $NoBrowser) { Start-Process $url }
while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  try {
    $rel = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath).TrimStart('/')
    if ($rel -eq '') { $rel = 'index.html' }
    $file = [System.IO.Path]::GetFullPath((Join-Path $root $rel))
    if (-not $file.StartsWith($root) -or -not (Test-Path $file -PathType Leaf)) { $ctx.Response.StatusCode = 404; $ctx.Response.Close(); continue }
    $bytes = [System.IO.File]::ReadAllBytes($file)
    $ext = [System.IO.Path]::GetExtension($file).ToLower()
    $ctx.Response.ContentType = $(if ($mime.ContainsKey($ext)) { $mime[$ext] } else { 'application/octet-stream' })
    $ctx.Response.Headers.Add('Cache-Control', 'no-cache')
    $ctx.Response.Headers.Add('Accept-Ranges', 'bytes')
    $range = $ctx.Request.Headers['Range']
    if ($range -match 'bytes=(\d*)-(\d*)') {   # audio seeking asks for part of a file
      $start = if ($Matches[1] -ne '') { [int]$Matches[1] } else { 0 }
      $end = if ($Matches[2] -ne '') { [int]$Matches[2] } else { $bytes.Length - 1 }
      if ($end -ge $bytes.Length) { $end = $bytes.Length - 1 }
      $ctx.Response.StatusCode = 206
      $ctx.Response.Headers.Add('Content-Range', "bytes $start-$end/$($bytes.Length)")
      $ctx.Response.ContentLength64 = $end - $start + 1
      $ctx.Response.OutputStream.Write($bytes, $start, $end - $start + 1)
    } else {
      $ctx.Response.ContentLength64 = $bytes.Length
      $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    }
    $ctx.Response.Close()
  } catch { try { $ctx.Response.Abort() } catch {} }
}
`;
writeFileSync(join(pack, 'server.ps1'), server);

writeFileSync(join(pack, 'play.sh'), String.raw`#!/bin/sh
# Mac / Linux: needs python3 (already on most machines). Opens the game in your browser.
cd "$(dirname "$0")/game" || exit 1
PORT=5180
echo "Cinder Automata is running at http://localhost:$PORT/  (press Ctrl+C to stop)"
( sleep 1; (open "http://localhost:$PORT/" || xdg-open "http://localhost:$PORT/") >/dev/null 2>&1 ) &
python3 -m http.server $PORT --bind 127.0.0.1
`);

writeFileSync(join(pack, 'READ ME FIRST.txt'), `CINDER AUTOMATA - tester build ${version} (${stamp})
FuzeNova Games. Thank you for testing!

HOW TO PLAY (Windows)
1. Right-click the zip you were sent, choose Properties, tick "Unblock" at the bottom, press OK. (If you do not see it, skip this.)
2. Unzip it somewhere (right-click, Extract All). Do not run it from inside the zip.
3. Double-click "Play Cinder Automata.bat". A black window opens and your web browser opens the game.
   Windows may say it protected your PC: press "More info", then "Run anyway". It only starts a small server on your own computer.
4. Keep the black window open while you play. Close it to stop.

MAC / LINUX
Open a terminal in this folder and run:   sh play.sh

USE CHROME OR EDGE if you can (they handle the sound best).

THINGS TO KNOW
- Nothing is uploaded. Your progress (stars, unlocks, saved run) is kept in your browser on this computer.
- Press F2 for the controls, F3 to inspect anything, T for research, N to mute. The Menu has a guide.
- The page "sound-test.html" (linked from the game's Menu, Controls tab) lets you rate every sound.

WHAT WE WANT TO KNOW
- Anything confusing in the first 10 minutes.
- Any crash, freeze, or thing that looks broken (and what you were doing).
- Is it too easy or too hard? Which difficulty and commander did you use, and what level did you reach?
- Anything that sounds bad.
Send notes to whoever sent you this. Screenshots help a lot.
`);

if (!existsSync(join(pack, 'game', 'index.html'))) throw new Error('the game did not build');
if (process.platform === 'win32') {
  execFileSync('powershell', ['-NoProfile', '-Command', `Compress-Archive -Path '${pack}\\*' -DestinationPath '${zip}' -Force`], { stdio: 'inherit' });
} else {
  execFileSync('zip', ['-r', zip, '.'], { cwd: pack, stdio: 'inherit' });
}
console.log(`\nTester pack: ${zip}`);
