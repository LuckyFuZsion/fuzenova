// Lists every sound in public/audio (length, size, and the untouched original where there is one) for the sound test page.
// Usage: node tools/build-sound-manifest.mjs    (run again whenever sounds are added)
import { readdirSync, existsSync, statSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const dir = join(root, 'public', 'audio');

const duration = (file) => {
  try { return Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString().trim()); } catch { return 0; }
};
const list = (sub) => {
  const d = join(dir, sub);
  if (!existsSync(d)) return [];
  return readdirSync(d).filter((f) => f.endsWith('.mp3')).sort().map((f) => {
    const name = f.replace(/\.mp3$/, '');
    return {
      name, file: `audio/${sub}/${f}`, seconds: Math.round(duration(join(d, f)) * 100) / 100, kb: Math.round(statSync(join(d, f)).size / 1024),
      original: existsSync(join(dir, 'original', f)) ? `audio/original/${f}` : null,
    };
  });
};

const manifest = { sfx: list('sfx'), alt: list('alt'), music: list('music') };
writeFileSync(join(dir, 'manifest.json'), JSON.stringify(manifest, null, 1));
console.log(`manifest: ${manifest.sfx.length} effects, ${manifest.alt.length} alternates, ${manifest.music.length} music tracks`);
