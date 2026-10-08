# Cinder Automata: proposed next features

Status: **proposal for review.** Nothing in sections 2 to 6 has been built yet. Section 1 is built and waiting to be pushed.
Prepared from the tester's feedback and the follow-up discussion.

---

## 1. Already built: underground belts

A pair of 1x1 pieces (the Tunnel, key U, 8 iron plates, free to remove). Place the entrance at the end of a belt, then place a second piece in a straight line in front of it, facing the same way, with **up to 4 tiles** of anything in between (so no more than 5 tiles apart). The game makes the second piece the exit by itself. Items pass under walls, machines, rocks and other belts.

- The pieces are solid, so a wall line with a tunnel through it stays sealed against enemies.
- A dashed line shows the underground link, and the hover text says how far it goes or that no exit is in range.
- Artwork (sleeve-over-belt style) is in the game. Six automated tests cover pairing, range, direction and item transport.

**Waiting for:** a decision to push.

---

## 2. Out-of-game progression ("prestige") (BUILT: Embers and the Workshop; every run pays out by levels reached)

**Problem (tester):** a run that ends in a cascade failure is fine, and gives replay value, but at the moment a loss gives nothing back. Only in-run research and boons exist, plus commander unlocks.

**Proposal**
- A currency earned on **every run**, win or lose (a loss pays about half a win), plus a bonus for each level reached and for each level past 30 in Endless.
- A "Workshop" screen where it is spent on permanent global buffs, saved to the player's account.
- Many small buffs, about 12 to 20, for example: +3% turret damage, a better starting plate stock, a cheaper first research, one extra boon choice, a little more core health.
- Buffs are capped so veterans cannot trivialise early levels.

**Endless:** best level reached per commander becomes the score ("Best: level 47"), with milestone rewards (levels 40, 50, 60) and a natural basis for a leaderboard. A clean "win" is clearing level 30.

**Effort:** a few days. The simulation already has multiplier slots (`rfx`, `mods`) to plug the buffs into.

**Decision needed:** should a lost run still pay out? (Recommended: yes, at about half rate.)

---

## 3. Damage types and enemy weaknesses (BUILT)

**Today:** enemies have flat armour (hurts weak guns) and some are insulated against lightning (coils do 40%). So projectile versus lightning is partly there. There are no flame or laser turrets yet, and the art for them already exists.

**Proposal:** a small weakness table shown on the Enemies tab, using four damage types:

| Type | Source | Example weakness / resistance |
|---|---|---|
| Kinetic / projectile | Gun family, artillery | Armoured enemies resist |
| Flame | Flamer family | Swarms and unarmoured enemies are weak |
| Laser / plasma | Later family (art exists) | Ignores armour |
| Lightning | Storm coil family | Drones weak, insulated enemies resist |

- Resist about 50% and weak about 150%, never 0% and 200%, so no single turret is required.
- Tell the player in the game what each enemy is weak to.
- Fills the **range gap** the tester noted: the far end (Sniper 12.5, Siege spitter 10.5) and the short, heavy-damage end.

---

## 4. Weapon families: base, two level-1 variants, one level-2 (BUILT, with its art)

Every family follows the same shape.

| Family | Base | Level 1 (choose one) | Level 2 |
|---|---|---|---|
| Projectile | Gun turret | Scatter gun / Sniper (**built**) | Artillery (art exists; Artillery commander waits on it) |
| Lightning | Storm coil | Shield / Stun (both **support**) | Railgun |
| Fire | Flamer | Incendiary launcher / Focused torch | Plasma |

- **Support variants** for the coil: Shield protects nearby buildings and walls, Stun slows or stops enemies. They add a role beyond damage.
- **Level 2 reachable from either level-1 variant**, at a higher price, so an early choice does not lock a player in. (Decision needed.)
- The Railgun is not electric damage, so it needs its own damage type, or a name such as "Arc cannon".
- The existing laser and rocket turret art does not fit these three families. It could become a fourth family later.
- Upgrades keep using the double-click picker. The research ("Turret designs") grows one tier per family.

**Effort:** the picker and research already do base to level 1. A tier system needs a small data table, then each turret is its own work. Each family is a few days, mostly behaviour and art.

---

## 5. Robot production chain (BUILT; art pending)

**Today:** one Robot fabricator with a dropdown of 8 robots, all made from iron plates, 12 space per building.

**Proposal:** a chain of building types that mirrors the weapon tree. Units are made from **raw plates, not from lower-tier units**, and each step up adds another kind of plate.

| Building | Makes | Plates needed | Room (per building) |
|---|---|---|---|
| **Drone Workshop** (base; stays as the current fabricator is) | Scout drone, Scout walker | copper + iron | 12 space |
| **Gunship Hangar** (mid, fliers) | Gunship drone, **Bomber** (new) | copper + iron + tin | 12 space |
| **Walker Foundry** (mid, walkers) | Trooper, Turret walker (Quad) | copper + iron + lead | 12 space |
| **Heavy Works** (top) | Heavy walker, Mobile artillery, Titan, **Carrier** (new) | copper + iron + tin + lead | 12 space |

**Heavy Works capacity:** the building holds **4 Heavy walkers, or 2 Mobile artillery, or 1 Titan or Carrier**. This falls out of the existing 12-space rule if the Heavy walker takes 3 space (it takes 4 today), the Mobile artillery 6, and the Titan and Carrier 12 each. No new mechanism is needed.

- Two mid buildings align with the two level-1 variants of the weapons. A single top building matches the single level 2.
- The Drone Workshop keeps behaving as the current fabricator does for the small units. Old saves convert their fabricators to Drone Workshops.
- Recipes are per robot, so a Titan costs far more than a Heavy walker even though both need the same kinds.
- The 12-space rule per building stays. The Drone Workshop keeps doing everything the old fabricator did for small units.
- Ore progression drives it: tin and lead come from squares further out, so the player reaches super units at about level 8 or later.

**New units**
- **Bomber:** a flying robot that flies over a ground enemy and drops splash bombs. Ground targets only, short range, fragile against ranged attackers, about 4 space. Needs a different name from the enemy "Bomber drone" (suggest "Sapper drone").
- **Carrier:** a large flying ship that holds and launches its own drones, recalling them after a fight, with a cap on the drones it keeps. The Hive Queen already spawns brood for enemies, so the mechanics exist.

**Effort:** the largest item here. Three to four new buildings with art, per-plate stock instead of a single iron count, a recipe table per robot, conversion of old saves (a fabricator becomes a Drone Workshop and its robots stay), and new balance work.

**Decisions needed**
1. **Settled:** the mapping in the table above, including the Heavy Works making Heavy walker, Artillery, Titan and Carrier.
2. Should the Heavy walker drop from 4 space to 3 (needed for 4 per Heavy Works)? Recommended: yes.

---

## 6. Suggested order

1. **Prestige and Endless scoring** (biggest effect on replay).
2. **Tiered turret system, proving it with Artillery** (art exists).
3. **Flamer family** (short-range damage, burning).
4. **Coil support variants (Shield, Stun) and the Railgun.**
5. **Robot production chain**, then the **Carrier** last.

Also available when wanted: a leaderboard (public score cards only, never the private saves, with plausibility checks and a moderation flag), and a web hub page on luckyfuzsion.com listing both games.

---

## 7. Open decisions summary

| # | Question | Recommended |
|---|---|---|
| 1 | Does a lost run pay prestige currency? | Yes, about half rate |
| 2 | Can level 2 be reached from either level-1 variant? | Yes, at a higher price |
| 3 | Name for the Railgun's damage type | Its own type ("Arc cannon") |
| 4 | Robot mapping | Settled (section 5) |
| 5 | Heavy walker 4 space to 3, so a Heavy Works holds 4 | Yes |
| 6 | Whether to push the underground belts now | Yes |
