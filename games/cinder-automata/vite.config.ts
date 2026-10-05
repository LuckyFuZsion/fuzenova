import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// Source lives in /games/cinder-automata; the built game is served from /play/cinder-automata/.
export default defineConfig({
  base: './',
  build: {
    outDir: fileURLToPath(new URL('../../public/play/cinder-automata', import.meta.url)),
    emptyOutDir: true,
    target: 'es2022',
  },
  css: { postcss: {} }, // don't inherit the Next.js site's Tailwind/PostCSS config
  server: { watch: { ignored: ['**/docs/**', '**/art/**', '**/release/**', '**/tools/**'] } }, // rebuilding the design document must not reload (or crash) the dev server
  test: { environment: 'node' },
});
