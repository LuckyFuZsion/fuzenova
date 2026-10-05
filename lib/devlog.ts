import type { Game } from './games'

export type DevlogBlock = string | { heading: string } | { image: string; alt: string; caption?: string }

export type DevlogPost = {
  slug: string
  title: string
  date: string
  game: Game['slug'] | 'studio'
  excerpt: string
  cover: string
  body: DevlogBlock[]
}

const img = (name: string, alt: string, caption?: string): DevlogBlock => ({ image: `/images/devlog/${name}.webp`, alt, caption })

// Newest first.
export const posts: DevlogPost[] = [
  {
    slug: 'cinder-automata-is-a-playable-prototype',
    title: 'Cinder Automata is a playable prototype',
    date: '2026-10-04',
    game: 'cinder-automata',
    excerpt: 'A factory that fights back. Here is how a run works, what the factory has to make, and where the game is today.',
    cover: '/images/games/cinder/keyart.webp',
    body: [
      'Cinder Automata is a top-down factory and defence roguelite that runs in your browser. You mine ore, smelt it, craft ammunition, science packs and robots, wire up power, and hold the line against waves of rogue machines. Think Factorio and Mindustry, squeezed into short runs you can finish in one sitting.',
      { heading: 'The factory only runs when it matters' },
      'The factory runs during fights, and for a short cooldown after a win. The rest of the build phase is frozen, so you can place and rearrange things without the clock ticking. Belts, inserters, crossovers and splitters are always free, and pulling up anything else refunds 75% of its cost.',
      'The core is a one-way store. It accepts iron plates, copper plates and science packs, and nothing can be taken back out. That means turret ammunition has to arrive by belt from a smelter, so every belt you lay ends at a gun.',
      { heading: 'From ore to artillery shells' },
      'Iron, copper, coal, tin, lead, sulfur and wood become plates, gunpowder, bullets, bronze, steel and artillery shells. Bullets need a casing and gunpowder, steel needs iron and charcoal, and a shell needs steel and bronze. Each step is a small puzzle about getting the right things to the right place.',
      img('cinder-supply-chain', 'Plates and ammunition sprites from Cinder Automata', 'Plates and ammunition: the raw end of the supply chain.'),
      { heading: 'Where it is today' },
      'The balance is a first guess, especially after level 8, and it needs more real playtesting. A few things are not built yet: capturable enemy nests, more research branches, flame, laser and rocket turrets, and a Codex. All the art the game needs exists now, and a few sounds are still to come.',
      'If you try it, I would love to know where it felt too easy, too hard or just confusing. Use the contact page and tell me.',
    ],
  },
  {
    slug: 'three-machines-to-break',
    title: 'Three machines to break: the Cinder Automata bosses',
    date: '2026-10-02',
    game: 'cinder-automata',
    excerpt: 'The Siege Brute, the Colossus Walker and the Hive Queen, and how each one is meant to test a different part of your base.',
    cover: '/images/devlog/cinder-bosses.webp',
    body: [
      'Every run builds towards three bosses, at levels 10, 20 and 30. After that, Endless mode lets you see how long you can last.',
      { heading: 'Siege Brute, level 10' },
      'The Brute walks straight at your core and ignores your turrets unless they are in its way. It hits buildings much harder than other enemies, so it is a test of your walls and your focus fire. If it gets stuck on rocks or trees, it simply crushes them.',
      { heading: 'Colossus Walker, level 20' },
      'A towering machine that steps over defences and shrugs off small arms. Heavy enemies have flat armour, so a pile of cheap bullets will not do. You will want better ammunition and turret upgrades by then.',
      { heading: 'Hive Queen, level 30' },
      'The Queen keeps spawning drones. Break the swarm first, then break the Queen. Some enemies are insulated against Storm coils, so lightning is not the answer to everything.',
      img('cinder-enemies', 'Enemy variants from Cinder Automata', 'Some of the ordinary enemies you meet on the way.'),
      'The visual rule I settled on early is that your own robots look clean and freshly built, with blue and orange trim, while the enemies stay rusted and feral with red glows. In the middle of a fight you can tell at a glance whose side something is on.',
    ],
  },
  {
    slug: 'build-your-own-robot-army',
    title: 'Build your own robot army',
    date: '2026-10-01',
    game: 'cinder-automata',
    excerpt: 'Small drones to towering automatons, and the rules that keep them useful instead of wandering off.',
    cover: '/images/devlog/cinder-robots.webp',
    body: [
      'Turrets are only one way to hold the line. Your factory can also build robots, from small scouts and drones up to the Heavy, the Turret walker, the Artillery and the Titan.',
      { heading: 'Space, not just cost' },
      'Each fabricator holds 12 units of robot. Scouts and drones take one or two, the Heavy takes four, the Turret walker and the Artillery take six, and the Titan takes the whole twelve. So you choose between a swarm and a single giant.',
      { heading: 'A leash, so they do not wander' },
      'Robots only go after enemies within 30 tiles of the fabricator that built them, or of the core. They always fight anything within 9 tiles, and they march to help anywhere inside the leash. Idle ones stand guard just outside your base.',
      'The big ones plan their routes to keep a tile clear of obstacles. A robot walled into a pocket gets lifted out after about three seconds, because nothing is worse than a Titan stuck behind a fence you built.',
    ],
  },
  {
    slug: 'omens-boons-and-a-growing-map',
    title: 'Omens, boons and a growing map',
    date: '2026-09-30',
    game: 'cinder-automata',
    excerpt: 'Why no two fights in Cinder Automata feel quite the same.',
    cover: '/images/devlog/cinder-omens.webp',
    body: [
      'A short run needs variety, or it turns into a spreadsheet. Cinder Automata gets that from three places: omens, boons and the map itself.',
      { heading: 'Omens' },
      'Each fight comes with a random twist. There is Swarm, Ironhide, Two fronts, Ash fog and Acid rain, and a few kinder ones like Bounty. You read the omen before the fight starts, so you can adapt your base to it.',
      { heading: 'Boons' },
      'Every second level you pick one of three upgrades. Small choices stack up into a build, and that is what makes one run different from the next.',
      { heading: 'A map that opens up' },
      'You start on a single 24 by 24 plot with iron only. After each win you pick one of three neighbouring plots to open, and the game opens a second one. Copper is always next door, and forests start two plots out. The map is generated from a seed, so you can replay one you liked.',
    ],
  },
  {
    slug: 'cloud-saves-are-here',
    title: 'One account for every FuzeNova game',
    date: '2026-09-29',
    game: 'studio',
    excerpt: 'One email, one password, and your progress follows you between games and devices.',
    cover: '/images/devlog/studio-cloud.webp',
    body: [
      'You can now sign in with one FuzeNova account and use it in every game. Your progress is saved to the cloud, so you can pick up on your phone where you left off on your laptop.',
      'Your games still save on your device first, and signing in simply adds a copy online. If your device and the cloud disagree, the game keeps whichever has more progress, and asks you if it cannot tell.',
      'Crystalbound Saga also lets you play as a guest. If you would rather not make an account, nothing changes, and backup codes still work. Cinder Automata asks you to sign in and confirm your email before you play.',
      'Usernames are checked against a blocklist when you create an account. On a shared device, signing out asks whether you want to keep a copy of your progress on that device or clear it.',
    ],
  },
  {
    slug: 'hit-effects-and-game-feel',
    title: 'Making every hit feel good in Crystalbound Saga',
    date: '2026-09-27',
    game: 'crystalbound-saga',
    excerpt: 'Painted slashes, lightning and shockwaves, screen shake, and a lot of sound.',
    cover: '/images/devlog/cb-battle.webp',
    body: [
      'A match-3 game lives or dies on how a match feels. Over the last few weeks most of my time on Crystalbound Saga has gone into the moment of impact.',
      img('cb-fx', 'Painted slash, lightning, impact, halo, shockwave and torrent effects', 'The painted effect sheets, drawn on pure black.'),
      { heading: 'Painted effects' },
      'The slashes, lightning, halos and shockwaves are painted images drawn with a screen blend, which makes the black background vanish. A Burst sweeps a slash along its line, tinted to the tile colour. A Crest sends out a shockwave. Skyfall brings lightning down on each cell, and Riptide pours water down the columns.',
      { heading: 'Juice, on purpose' },
      'Smashing a relic cracks the whole screen, with a freeze for a split second and a boom. Winning stages a short celebration, then every special left on the board goes off one at a time. Damage dealt after the last foe falls is not wasted: it counts as Overkill and goes into your score.',
      { heading: 'Sound' },
      'There are recorded sound effects for slashes, impacts, victory, stars, the forge hammer and more. The villains also laugh and roar, with a few takes each so you do not hear the same one twice in a row. Music and effects have separate switches, because some people want one without the other.',
    ],
  },
  {
    slug: 'rift-raid-and-the-titans',
    title: 'Rift Raid: a dice game inside the match-3',
    date: '2026-09-24',
    game: 'crystalbound-saga',
    excerpt: 'Three giant Titans, a d20, and a reason to come back every day.',
    cover: '/images/devlog/cb-raid.webp',
    body: [
      'After chapter 3, Crystalbound Saga unlocks a side mode called Rift Raid. It is a small dice game where you chip away at a giant Rift Titan across many visits.',
      { heading: 'How a visit works' },
      'A visit costs a Raid Key and gives you a handful of turns. You can attack with a d20 roll against the Titan armour, heal, block, or use your Guardian Art once. A natural 20 does double damage, and a 1 is a fumble. The Titan hits back after each action.',
      'Damage stays on the Titan between visits, so you can wear one down over days. Each visit pays out ore, remnants, essence and Rift Shards. Felling a Titan pays a big haul and the Titanbreaker title.',
      { heading: 'Keys and the Exchange' },
      "You earn one key a day, plus keys for first wins over mini-bosses and chapter bosses, and a small chance on other wins. Shards are spent at the Rift Exchange, run by Seren the Shard-Keeper, on a Titan's Tear that restores your Ward, a pommel that adds to your rolls, and Riftborn outfits for your Guardians.",
    ],
  },
  {
    slug: 'crystalbound-saga-branns-rescue-and-the-forge',
    title: "Crystalbound Saga: Brann's rescue and the Forge",
    date: '2026-09-15',
    game: 'crystalbound-saga',
    excerpt: 'Meet the smith, temper the Wardblade, and see how its forms change the way you fight.',
    cover: '/images/devlog/cb-brann.webp',
    body: [
      'Brann the smith is the first person you rescue in Crystalbound Saga. He is held captive by the first mini-boss, the Abyssal Weaver Matriarch, at level 5. Beat her and he is free, and the Forge opens.',
      img('cb-brann-rescue', 'Brann, webbed and captive', 'Brann, before the rescue.'),
      { heading: 'Tempering the Wardblade' },
      'The Forge is where you spend what you earn. Tempering raises your damage, Resolve gives you more moves, and five Affinities tune the blade towards an element. It was too easy at first, so I made the cost curve steep.',
      img('cb-forge', 'The five forms of the Wardblade', 'The five forms of the Wardblade.'),
      { heading: 'Forms that change how you fight' },
      'The Wardblade evolves at 6, 14, 24 and 36 upgrades, and each new form adds a real bonus in battle. Each upgrade line is capped by the chapter you have reached, so the forms land around chapters 1, 3, 6 and 9. Capped rows show a lock and the chapter that opens them.',
      'The first time you can afford an upgrade, the game walks you through the Forge, and holds you there until you buy one. After that, Brann has something to say depending on whether you are broke, close to a new form, or fully forged.',
    ],
  },
  {
    slug: 'building-book-one',
    title: 'Building Book I: 300 levels, one idea at a time',
    date: '2026-09-10',
    game: 'crystalbound-saga',
    excerpt: 'Ten chapters, thirty levels each, and a lesson from Candy Crush about teaching.',
    cover: '/images/devlog/cb-book1.webp',
    body: [
      'Book I of Crystalbound Saga is ten chapters of thirty levels, three hundred in all. Every level is a fight: you match elemental tiles to hurt a foe, and the foe hits back on a timer.',
      img('cb-tiles', 'The five element tiles and the Summon Orb', 'Ember, Tide, Storm, Loam, Dawn and the Summon Orb.'),
      { heading: 'A weakness cycle' },
      'There are five elements: Ember, Tide, Storm, Loam and Dawn. Ember beats Loam, Tide beats Ember, Storm beats Tide and Loam beats Storm. Hit a weakness for double damage. Dawn is special, because it is the only thing the Hollow are weak to, and Dawn tiles also heal.',
      { heading: 'Teaching one thing at a time' },
      'The first five levels used to introduce around fifteen ideas, which is far too many. Candy Crush teaches roughly one new idea every ten levels. Chapter 1 now works the same way: basics and special tiles first, then Chains, then Miasma, then Relics, then Elemental Wards, with a mini-boss every fifth level.',
      { heading: 'Three Guardians' },
      "Mirelle, Rosalind and Verdanne are your companions. Fill a Guardian's gauge from their element and you can cast their Art. The story decides who can fight in each chapter, so you meet them gradually.",
      img('cb-guardians', 'Mirelle, Rosalind and Verdanne', 'Mirelle, Rosalind and Verdanne.'),
      { heading: 'Tuning it by playing it a lot' },
      'To check the difficulty, I ran a bot through all 300 levels many times on each setting. It won about 96% of the time on Hero, 98% on Story and 82% on Legend. Levels that came in under 70% got extra moves or less boss health, so now every level can be beaten.',
    ],
  },
]

export const getPost = (slug: string) => posts.find((p) => p.slug === slug)

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
