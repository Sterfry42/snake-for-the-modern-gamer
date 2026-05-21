export const LIBERTY_BILLBOARD_LINES = [
  'EAT PIE',
  'NEXT EXIT: DESTINY',
  'GAS / BAIT / PROPHECY',
  'EAGLES ARE WATCHING',
  'TRY THE MEAT',
  'YOU MISSED THE TURN',
  'REAL FREEDOM, REAL FAST',
  'BLESSED ARE THE HUNGRY',
  'PIE. GAS. FORGIVENESS.',
  'TURN BACK FOR BISCUITS',
  'THE DINER IS OPEN',
  'ONE MORE EXIT',
  'MONUMENT AHEAD MAYBE',
  'VACANCY IN YOUR SOUL',
] as const;

export const LIBERTY_AMBIENT_LINES = [
  'Red earth, white scars, blue neon.',
  'The diner lights are still on.',
  'The billboards know where you are.',
  'An eagle screams at nothing in particular.',
  'The monument plaque has faded into prophecy.',
  'The road continues, despite all available evidence.',
  'Every exit promises food, fuel, and forgiveness.',
  'The desert is open twenty-four hours.',
  'A tumbleweed crosses with legal confidence.',
  'The pool is blue in a way nature did not request.',
] as const;

export const LIBERTY_MONUMENT_LINES = [
  'This plaque commemorates a conflict between hunger, property, and weather.',
  'Nobody agrees what the monument means, but everyone agrees it has a parking lot.',
  'The stone is warm, official, and slightly for sale.',
  'The inscription has faded into something legally distinct from prophecy.',
  'A civic bird seems to have judged you from above.',
] as const;

export const LIBERTY_DINER_LINES = [
  'The diner is open. It has always been open.',
  'The coffee tastes like speed limit violations.',
  'The waitress calls you honey in a way that counts as a binding contract.',
  'The pie rotates slowly behind glass, gathering power.',
  'The jukebox knows one song and several crimes.',
] as const;

export type LibertyNpcRole =
  | 'coach'
  | 'waitress'
  | 'cook'
  | 'regular'
  | 'fireworkVendor'
  | 'inspector'
  | 'ranger'
  | 'docent'
  | 'elder'
  | 'witness'
  | 'motelClerk'
  | 'maintenance'
  | 'signPainter'
  | 'roadCrew';

const LIBERTY_NPC_ROLE_LINES: Record<LibertyNpcRole, readonly string[]> = {
  coach: [
    'This is a five-yard drill with a hundred-yard soul.',
    'Keep your eyes on the laces and your heart on the scoreboard.',
    'Run the route like the desert owes you rent.',
  ],
  waitress: [
    "Coffee's hot, pie's legal, and the booth knows your secrets.",
    'Honey, the mug refills itself if you believe hard enough.',
    'Sit anywhere. The jukebox already picked you.',
  ],
  cook: [
    'The grill has opinions and most of them are butter.',
    'I flip pancakes by instinct and civic duty.',
    'Blue plate is ready when the plate says it is.',
  ],
  regular: [
    "I've been in this booth since Tuesday, spiritually speaking.",
    'Road dust tastes better with coffee.',
    'The pie saw me first.',
  ],
  fireworkVendor: [
    'Every fuse is a promise with a short attention span.',
    'The good stuff is legal in at least one county of the imagination.',
    'If it whistles, salute it.',
  ],
  inspector: [
    'These fireworks are inspected by confidence and laminated paper.',
    'Safety is a clipboard, a hat, and a surprisingly loud whistle.',
    'I have read the warning labels and chosen hope.',
  ],
  ranger: [
    'The plaque is mostly accurate if you stand far enough away.',
    'Trail is open, truth is pending.',
    'A civic bird circled twice. That counts as approval.',
  ],
  docent: [
    'The monument commemorates a thing that probably happened.',
    'Please keep hands, tails, and alternate histories off the stone.',
    'The gift shop is where memory becomes merchandise.',
  ],
  elder: [
    'I saw the jackalope once. It saw me twice.',
    'Truth is just a tall tale with better shoes.',
    'The antlers were real enough for the receipt.',
  ],
  witness: [
    'I also saw it, unless you need me not to.',
    'There were hoofprints, harmonica music, and a smell like pancakes.',
    'Nobody believes us, which is how you know it matters.',
  ],
  motelClerk: [
    'Vacancy is a state of mind and a flickering sign.',
    'Pool is open if you ignore the part where it is closed.',
    'Room key works on doors, hearts, and one vending machine.',
  ],
  maintenance: [
    'The skimmer pulled up sunglasses, coins, and one prophecy.',
    'Chlorine fixes what nature starts.',
    'If the pool bubbles, wave back.',
  ],
  signPainter: [
    "I don't write ads. I receive them from the highway.",
    'The billboard knows where you are going and what you forgot.',
    'Paint dries faster when the message is inevitable.',
  ],
  roadCrew: [
    "Road's out, spirit's open. Take the detour with your whole chest.",
    'Cone placement is the last honest art.',
    'The shoulder is for emergencies and sandwiches.',
  ],
};

export function getLibertyNpcLine(role: LibertyNpcRole, seed = 0): string {
  const lines = LIBERTY_NPC_ROLE_LINES[role];
  return lines[Math.abs(seed) % lines.length] ?? lines[0] ?? '';
}
