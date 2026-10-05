export const site = {
  name: 'FuzeNova Games',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://fuzenova.tech',
  line: 'Elemental worlds, forged in your browser.',
  subline: 'Free games you can play right now: no download, no install, saves that follow you.',
  email: 'fuzenova@webfuzsion.co.uk',
  pressEmail: 'fuzenova@webfuzsion.co.uk',
}

export const nav = [
  { href: '/games', label: 'Games' },
  { href: '/devlog', label: 'Devlog' },
  { href: '/studio', label: 'Studio' },
  { href: '/press', label: 'Press kit' },
  { href: '/contact', label: 'Contact' },
]

export const tagColour: Record<string, string> = {
  'crystalbound-saga': '#A45CFF',
  'cinder-automata': '#FF7A2A',
  studio: '#FFE27A',
}

export const tagLabel: Record<string, string> = {
  'crystalbound-saga': 'Crystalbound Saga',
  'cinder-automata': 'Cinder Automata',
  studio: 'Studio',
}
