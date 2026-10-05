# Cinder Automata - roadmap (FuzeNova Games)

Browser factory game, Factorio-style top-down 2D. Stack: TypeScript + Vite + Canvas (swap to PixiJS only if sprite counts demand it).
Sim is headless and tested (`src/sim`), rendering is separate (`src/render.ts`).

## Done
- **Phase 1 - Vertical slice:** map + ore, belts, inserters, drills, smelters, chests, camera, splash/title.

## Next
| Phase | Goal | Main work |
|---|---|---|
| 2 - Art pipeline | Real graphics in game | Gemini sprite sheets -> slicer script -> atlas -> sprite renderer with procedural fallback. Belt animation strip, rotation, 2x2 / 3x3 footprints. |
| 3 - Crafting | Items beyond plates | Assemblers, recipes (gear, wire, circuit), player inventory + hand crafting, item stack limits, build costs (stop free building). |
| 4 - Power | Something to keep fed | Coal, boilers, steam engines, poles/network, satisfaction ratio (machines slow when under-supplied), drills/assemblers need power. |
| 5 - Research | Progression | Labs, science packs, tech tree UI, unlocks (faster belts, splitters, underground belts, better drills). Two-lane belts, splitters. |
| 6 - Combat | Pressure | Pollution spread by chunk, enemy nests (rogue automata), attack waves, gun turrets + ammo, walls, player health. |
| 7 - Fluids + goal | Late game | Pipes, oil/refining, launch pad and the escape objective (win screen). |
| 8 - Polish | Ship it | Save/load (localStorage + export), sound + music, settings, tutorial, bigger/infinite map, performance pass, mobile controls decision, leaderboard/analytics on luckyfuzsion.com. |

## Decisions log
- Title: **Cinder Automata**. Publisher: FuzeNova Games. Hosted at /play/cinder-automata/.
- Art: AI-generated (Gemini) sprite sheets, sliced automatically. Style bible in ART_PROMPTS.md.
- Enemies: rogue corroded automata (not bugs), to fit the name and stay distinct from Factorio.
