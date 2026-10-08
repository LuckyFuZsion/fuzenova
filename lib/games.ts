export type GameStatus = 'Out now' | 'Playable prototype'

export type FeatureIcon =
  | 'flame'
  | 'swords'
  | 'shield'
  | 'hammer'
  | 'map'
  | 'book'
  | 'skull'
  | 'gauge'
  | 'cloud'
  | 'factory'
  | 'crosshair'
  | 'bot'
  | 'flask'
  | 'expand'
  | 'sparkles'
  | 'crown'
  | 'gem'
  | 'rabbit'
  | 'timer'
  | 'eye'
  | 'heart'
  | 'medal'

export type Feature = { icon: FeatureIcon; title: string; body: string; image?: string }
export type Faq = { q: string; a: string }

export type GameTheme = {
  bgFrom: string
  bgTo: string
  accent: string
  glow: string
  secondary: string
}

export type Game = {
  slug: 'crystalbound-saga' | 'cinder-automata'
  title: string
  tagline: string
  pitch: string
  shortDescription: string
  longDescription: string
  genre: string
  status: GameStatus
  inDevelopment: boolean
  platforms: string[]
  price: 'Free'
  playUrl: string
  playLabel: string
  theme: GameTheme
  keyart: string
  logo?: string
  features: Feature[]
  screenshots: string[]
  faq: Faq[]
}

const shots = (dir: string) => Array.from({ length: 6 }, (_, i) => `/images/games/${dir}/shot-${i + 1}.webp`)

export const games: Game[] = [
  {
    slug: 'crystalbound-saga',
    title: 'Crystalbound Saga',
    tagline: 'Restore the Heartstones.',
    pitch:
      "Aurelith is fading. Match elemental tiles to strike your foes, cast your Guardians' spells, forge your blade, and mend the shattered Heartstones across 300 hand-crafted levels.",
    shortDescription: 'A fantasy match-3 RPG with 300 hand-crafted levels, three Guardians and a blade you forge yourself.',
    longDescription:
      "Crystalbound Saga is a free fantasy match-3 RPG that runs in your browser. Match Ember, Tide, Storm, Loam and Dawn tiles to strike foes who fight back on a timer. Hit their elemental weakness for double damage, fill your Guardians' gauges to unleash their Arts, and rescue Brann the smith to temper your Wardblade. Book I spans 300 levels across 10 chapters, with mini-boss lieutenants, chapter bosses, illustrated story scenes and a separate Rift Raid mode.",
    genre: 'Fantasy match-3 RPG',
    status: 'Out now',
    inDevelopment: false,
    platforms: ['Browser (mobile-first)', 'Installable app', 'Gamepad supported'],
    price: 'Free',
    playUrl: '/play/crystalbound-saga/index.html',
    playLabel: 'Play free now',
    theme: { bgFrom: '#2A2160', bgTo: '#171236', accent: '#FFD27A', glow: '#A45CFF', secondary: '#2EC8FF' },
    keyart: '/images/games/crystalbound/keyart.webp',
    logo: '/images/games/crystalbound/logo.webp',
    features: [
      {
        icon: 'flame',
        image: '/images/games/crystalbound/feature-elements.webp',
        title: 'Five elements, one weakness cycle',
        body: 'Ember, Tide, Storm, Loam and Dawn. Ember beats Loam, Tide beats Ember, Storm beats Tide, Loam beats Storm. Hit a weakness for double damage.',
      },
      {
        icon: 'swords',
        image: '/images/games/crystalbound/feature-fight.webp',
        title: 'Every level is a fight',
        body: 'Foes strike back on a timer. Bosses change phase, turn Hollow, heal and enrage.',
      },
      {
        icon: 'shield',
        image: '/images/games/crystalbound/feature-guardians.webp',
        title: 'Three Guardians',
        body: 'Mirelle, Rosalind and Verdanne fight at your side. Fill their gauge and unleash their Art.',
      },
      {
        icon: 'hammer',
        image: '/images/games/crystalbound/feature-forge.webp',
        title: "Brann's Forge",
        body: 'Rescue Brann the smith, then temper your Wardblade. It evolves into new forms that change how you fight.',
      },
      {
        icon: 'map',
        image: '/images/games/crystalbound/feature-map.webp',
        title: '300 levels, 10 chapters',
        body: 'From the Tidefall Archipelago to Stormspire Peaks and the Ashen Underworld. A lieutenant every 5 levels, a chapter boss every 30.',
      },
      {
        icon: 'book',
        image: '/images/games/crystalbound/feature-story.webp',
        title: 'Story scenes',
        body: 'Illustrated story beats between chapters, voiced in text, that carry the tale of Aurelith forward.',
      },
      {
        icon: 'skull',
        image: '/images/games/crystalbound/feature-raid.webp',
        title: 'Rift Raid',
        body: 'A separate mode where you chip away at a giant Rift Titan for shards and outfits.',
      },
      {
        icon: 'gauge',
        image: '/images/games/crystalbound/feature-difficulty.webp',
        title: 'Three difficulties',
        body: 'Story, Hero and Legend. Pick the pace that suits you and change it whenever you like.',
      },
      {
        icon: 'cloud',
        image: '/images/games/crystalbound/feature-cloud.webp',
        title: 'Cloud saves',
        body: 'Sign in with a FuzeNova account to sync across devices, or keep a backup code instead.',
      },
    ],
    screenshots: shots('crystalbound'),
    faq: [
      { q: 'Is it free?', a: 'Yes. Crystalbound Saga is free to play.' },
      { q: 'Do I need to download it?', a: 'No. It runs in your browser. You can add it to your home screen if you would like it to feel like an app.' },
      {
        q: 'Does my progress save?',
        a: 'Yes, automatically on your device, and to the cloud if you sign in with a FuzeNova account.',
      },
      { q: 'Can I use a controller?', a: 'Yes. Gamepads are supported, as well as touch, mouse and keyboard.' },
    ],
  },
  {
    slug: 'cinder-automata',
    title: 'Cinder Automata',
    tagline: 'Build a factory. Arm it. Hold the line.',
    pitch:
      'Rogue machines march on your base. You survive by running a factory: mine ore, smelt it, craft ammunition and robots, wire up power, and hold the line through level after level of tougher waves. Factorio and Mindustry, distilled into short, replayable runs in your browser.',
    shortDescription: 'A factory-building tower-defence roguelite. Mine, smelt, craft and hold the line in short, replayable runs.',
    longDescription:
      'Cinder Automata is a free factory-building tower-defence roguelite for the browser, currently a playable prototype. Build real supply chains from raw ore to artillery shells, feed turrets straight from your belts, manufacture a robot army and research new tech with science packs you make yourself. Each win opens a new square of map, each fight brings a random omen, and each run builds towards three bosses and an Endless mode.',
    genre: 'Factory-building tower-defence roguelite',
    status: 'Playable prototype',
    inDevelopment: true,
    platforms: ['Browser (desktop first)', 'Installable app'],
    price: 'Free',
    playUrl: '/play/cinder-automata/index.html',
    playLabel: 'Play the prototype',
    theme: { bgFrom: '#1A1210', bgTo: '#0E0B0A', accent: '#FF7A2A', glow: '#FF4A1A', secondary: '#4FA8FF' },
    keyart: '/images/games/cinder/keyart.webp',
    logo: '/images/games/cinder/logo.webp',
    features: [
      {
        icon: 'factory',
        image: '/images/games/cinder/feature-supply.webp',
        title: 'Real supply chains',
        body: 'Iron, copper, coal, tin, lead, sulfur and wood become plates, gunpowder, bullets, bronze, steel and artillery shells.',
      },
      {
        icon: 'crosshair',
        image: '/images/games/cinder/feature-turrets.webp',
        title: 'Turrets fed by your belts',
        body: 'Upgrade into Scatter guns and Snipers. Add Storm coils and walls to shape the fight.',
      },
      {
        icon: 'bot',
        image: '/images/games/cinder/feature-army.webp',
        title: 'Build your own army',
        body: 'Robots from small drones to towering automatons that defend the base.',
      },
      {
        icon: 'flask',
        image: '/images/games/cinder/feature-research.webp',
        title: 'Research you manufacture',
        body: 'New tech is paid for in science packs that your own factory produces.',
      },
      {
        icon: 'expand',
        image: '/images/games/cinder/feature-map.webp',
        title: 'An expanding map',
        body: 'Start on one square around your core and open new land after every win.',
      },
      {
        icon: 'medal',
        image: '/images/games/cinder/feature-commander.webp',
        title: 'Choose your commander',
        body: 'Start each run with a commander, each with a bonus and a drawback. Back the guns, the robots, the lightning or pure factory.',
      },
      {
        icon: 'sparkles',
        image: '/images/games/cinder/feature-omens.webp',
        title: 'Omens and boons',
        body: 'A random twist on each fight (Swarm, Ironhide, Two fronts, Ash fog and more) and a choice of upgrades as you go.',
      },
      {
        icon: 'crown',
        image: '/images/games/cinder/feature-bosses.webp',
        title: 'Three bosses, then Endless',
        body: 'Siege Brute at level 10, Colossus Walker at 20 and Hive Queen at 30. Then see how long you last.',
      },
      {
        icon: 'cloud',
        image: '/images/games/cinder/feature-cloud.webp',
        title: 'Autosave and cloud saves',
        body: 'Your run saves as you play, and syncs with a FuzeNova account.',
      },
    ],
    screenshots: shots('cinder'),
    faq: [
      { q: 'Is it free?', a: 'Yes. Cinder Automata is free to play.' },
      { q: 'Is it finished?', a: 'Not yet. It is a playable prototype, and playtester feedback is shaping what comes next.' },
      {
        q: 'Can I play on my phone?',
        a: 'It runs in a mobile browser, but a desktop or laptop with a mouse is recommended for factory building.',
      },
      { q: 'Does my run save?', a: 'Yes. It autosaves on your device, and to the cloud if you sign in.' },
    ],
  },
]

export const getGame = (slug: Game['slug']) => games.find((g) => g.slug === slug)!

export const elements = [
  { name: 'Ember', hex: '#FF7A2A' },
  { name: 'Tide', hex: '#2EC8FF' },
  { name: 'Storm', hex: '#A45CFF' },
  { name: 'Loam', hex: '#7AD12A' },
  { name: 'Dawn', hex: '#FFE27A' },
]

export const guardians = [
  { name: 'Mirelle', role: 'Tide Guardian', art: 'Riptide', colour: '#2EC8FF', image: '/images/games/crystalbound/guardian-mirelle.webp' },
  { name: 'Rosalind', role: 'Dawn Guardian', art: 'Radiant Veil', colour: '#FFE27A', image: '/images/games/crystalbound/guardian-rosalind.webp' },
  { name: 'Verdanne', role: 'Storm Guardian', art: 'Skyfall', colour: '#A45CFF', image: '/images/games/crystalbound/guardian-verdanne.webp' },
]

export const cinderPillars = [
  { title: 'A factory that fights', body: 'Your production line is your defence. Every belt you lay ends at a gun.' },
  { title: 'Short, complete runs', body: 'Sit down, play a full run, and stop. No hundred-hour commitment.' },
  { title: 'Readable at a glance', body: 'Clear shapes and colours so you can see what is wrong before it breaks.' },
  { title: 'Forgiving, not shallow', body: 'Mistakes cost you a little, not everything. The depth is in the choices.' },
]

export const cinderLoop = ['Build', 'Fight', 'Win or lose', 'Pick a boon', 'Open a new square', 'Read the omen', 'Repeat, harder']

export const cinderBosses = [
  { name: 'Siege Brute', level: 10, body: 'A slow, armoured battering ram that tests your walls and focus fire.', image: '/images/games/cinder/boss-siege-brute.webp' },
  { name: 'Colossus Walker', level: 20, body: 'A towering machine that steps over defences and shrugs off small arms.', image: '/images/games/cinder/boss-colossus.webp' },
  { name: 'Hive Queen', level: 30, body: 'Spawns endless drones. Break the swarm, then break the Queen.', image: '/images/games/cinder/boss-hive-queen.webp' },
]

export const cinderCommanders = [
  { name: 'Gunnery Chief Brakka Vesh', focus: 'Arsenal' },
  { name: 'The Foundry Regent', focus: 'Robot army' },
  { name: 'Stormwarden Ilka Thorne', focus: 'Lightning' },
  { name: 'Forewoman Tamsin Brassgate', focus: 'Pure factory' },
]
