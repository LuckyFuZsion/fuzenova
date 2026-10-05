"""Turns a music track (which fades in from silence and fades out at the end) into one that loops without a dip or a jump.

The last N seconds are blended (equal-power crossfade) with the first N seconds, and the file then starts at second N.
Played round and round, the end flows straight into the start's continuation.

Usage: python tools/make-music-loop.py <source.mp3> <name> [crossfade_seconds=8]
       python tools/make-music-loop.py <source.mp3> <name> --once      (a stinger that plays once: trim and fade, no looping)
       writes public/audio/music/<name>.mp3
"""
import subprocess, sys, os, wave
import numpy as np

SR = 44100
once = '--once' in sys.argv
args = [x for x in sys.argv[1:] if x != '--once']
src, name = args[0], args[1]
xf = float(args[2]) if len(args) > 2 else 8.0

r = subprocess.run(['ffmpeg', '-v', 'error', '-i', src, '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'], capture_output=True, check=True)
a = np.frombuffer(r.stdout, dtype=np.float32).reshape(-1, 2).copy()
if once:
    loud = np.where(np.abs(a).max(axis=1) > 0.003)[0]        # drop leading and trailing silence
    a = a[loud[0]:loud[-1] + 1]
    fi, fo = int(0.02 * SR), min(len(a) // 3, int(1.2 * SR))
    a[:fi] *= np.linspace(0, 1, fi)[:, None]
    a[-fo:] *= np.linspace(1, 0, fo)[:, None]
    out = a
else:
    n = int(xf * SR)
    t = np.linspace(0, np.pi / 2, n)[:, None]
    blend = a[-n:] * np.cos(t) + a[:n] * np.sin(t)          # tail fading out while the head fades in
    out = np.concatenate([a[n:-n], blend])                    # starts at second N, ends on the blend
out = out / (np.abs(out).max() + 1e-9) * (10 ** (-1.0 / 20))

dst = os.path.join(os.path.dirname(__file__), '..', 'public', 'audio', 'music', name + '.mp3')
os.makedirs(os.path.dirname(dst), exist_ok=True)
tmp = dst + '.wav'
with wave.open(tmp, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((np.clip(out, -1, 1) * 32767).astype(np.int16).tobytes())
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', tmp, '-codec:a', 'libmp3lame', '-b:a', '128k', dst], check=True)
os.remove(tmp)
print(f'{name}: {len(out) / SR:.1f}s, {os.path.getsize(dst) / 1e6:.2f} MB')
