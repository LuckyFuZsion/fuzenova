# Cinder Automata: instructions for coding agents (Cursor, Claude Code, others)

Browser factory + defence roguelite. TypeScript, Vite, Canvas 2D, no game engine. **Read `HANDOVER.md` first**: it has the commands, the deploy steps, the code map and the design rules that must not be undone.

## Always
- Work in `games/cinder-automata` (inside the `luckyfuzsion` repo folder). Not the old `slot-streamers` project.
- Before finishing any change run `npx tsc --noEmit` and `npx vitest run`. Both must pass.
- The simulation (`src/sim/*`) is headless and deterministic-ish; put game rules there and cover them with a vitest test next to it. Rendering and UI live outside `src/sim`.
- Update the changelog in `docs/gdd/content.ts` for every player-visible change, then `npm run gdd` to rebuild the PDF. Keep `HANDOVER.md` current when a rule changes.
- Do **not** commit, push or deploy unless the owner asks. Deploying = the steps in `HANDOVER.md` section 2; commit only `public/play/cinder-automata` in the `luckyfuzsion` repo, never `git add -A` at its root.
- Do not create accounts on the live Firebase project. Publish game build first, then `firestore.rules`.

## Practical
- Windows + OneDrive: the dev server sometimes dies; restart it (`npx vite --port 5177 --strictPort --host localhost`). Add `?nologin=1` in dev to skip sign-in.
- Write scripts to files rather than long shell heredocs.
- Art arrives as Gemini sheets; cut with Pillow into `public/sprites/`, declare roles in `src/sprites.ts`. Missing art falls back to drawn shapes.
- Keep answers short and plain. The owner is not a programmer by trade; explain what changed and why in everyday words.

## Where things are
`src/sim/combat.ts` (turrets, robots, enemy attacks), `round.ts` (waves, phases), `flowfield.ts` + `pathfind.ts` (movement), `world.ts` (entities, belts, inserters), `research.ts`, `items.ts`; `src/game.ts` (input/HUD), `render.ts`, `menu.ts` (in-game guide). Full map in `HANDOVER.md` section 3.
