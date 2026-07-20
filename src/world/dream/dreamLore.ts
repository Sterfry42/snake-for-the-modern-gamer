/**
 * Dream Lore Fragments
 *
 * The wise old snake's dream lore:
 * - The wise old snake's first dream was about a world made entirely of apples
 * - The wise old snake's second dream revealed the history of the maze
 * - The wise old snake's third dream was a warning about the nightmare realm
 * - The wise old snake's dream lore was written by a dream version of the wise old snake
 * - The wise old snake's dream journal contained 999 fragments
 * - The wise old snake's dream lore was pieced together over 999 dream visits
 * - The wise old snake's dream lore revealed that the snake was once a dream itself
 * - The wise old snake's dream lore was too surreal to be fully understood
 * - The wise old snake's dream lore was written in a language that only exists in dreams
 * - The wise old snake considers the dream lore "deeply philosophical, slightly confusing"
 */
export type { LoreFragment } from './types.js';
import type { LoreFragment } from './types.js';

export const DREAM_LORE_FRAGMENTS: LoreFragment[] = [
  // Dream World Lore (Sequence 1-10)
  {
    id: 'lore.dream.origin',
    title: 'The First Dream',
    artwork: 'dream-lore-01',
    text: 'Before the maze existed, there was only the Dream. The ancient snakes drifted through clouds of apple-scented mist, their bodies weaving patterns that would one day become the walls of the world.',
    discovered: false,
    sequence: 1,
  },
  {
    id: 'lore.dream.apple_garden',
    title: 'The Garden of Floating Apples',
    artwork: 'dream-lore-02',
    text: 'In the Dream World, apples do not grow on trees. They float freely, each one containing a memory of a snake who ate it in the waking world. The garden is infinite, and every apple tells a story.',
    discovered: false,
    sequence: 2,
  },
  {
    id: 'lore.dream.rainbow_bridges',
    title: 'The Rainbow Bridges',
    artwork: 'dream-lore-03',
    text: 'The islands of the Dream World are connected by bridges made of pure rainbow light. These bridges appear only when a snake truly believes in the impossible. They shimmer with colors that have no names.',
    discovered: false,
    sequence: 3,
  },
  {
    id: 'lore.dream.gravity',
    title: 'The Shifting Gravity',
    artwork: 'dream-lore-04',
    text: 'In the Dream World, gravity is a suggestion, not a law. Sometimes you fall up. Sometimes you fall sideways. The wise old snake learned to fall in all directions at once.',
    discovered: false,
    sequence: 4,
  },
  {
    id: 'lore.dream.time',
    title: 'The Timeless Realm',
    artwork: 'dream-lore-05',
    text: 'Time moves differently in dreams. A night in the Dream World can feel like a century, or a century can feel like a night. The wise old snake once spent seven days in a dream that lasted seven seconds.',
    discovered: false,
    sequence: 5,
  },
  {
    id: 'lore.dream.shards',
    title: 'Dream Shards',
    artwork: 'dream-lore-06',
    text: 'Dream Shards are crystallized fragments of imagination. They glow with inner light and hum with the energy of sleeping minds. Collect enough, and you can trade them for wonders beyond the waking world.',
    discovered: false,
    sequence: 6,
  },
  {
    id: 'lore.dream.puzzles',
    title: 'The Puzzle Keepers',
    artwork: 'dream-lore-07',
    text: "Hidden within the Dream World are Puzzle Keepers — ancient spirits who test the dreams of visitors. Solve their puzzles, and they grant you glimpses of the world's true nature.",
    discovered: false,
    sequence: 7,
  },
  {
    id: 'lore.dream.treasure',
    title: 'Dream Treasure',
    artwork: 'dream-lore-08',
    text: 'Beneath the floating islands lie treasure chests filled with dream artifacts. These are not gold or jewels, but objects of pure meaning — a mirror that shows your true self, a key that opens any door.',
    discovered: false,
    sequence: 8,
  },
  {
    id: 'lore.dream.lucidity',
    title: 'The Gift of Lucidity',
    artwork: 'dream-lore-09',
    text: 'After many visits to the Dream World, some snakes awaken with the ability to control their dreams. They can reverse gravity, stop time, and teleport between islands. This is the gift of lucidity.',
    discovered: false,
    sequence: 9,
  },
  {
    id: 'lore.dream.wisdom',
    title: "The Wise Old Snake's Dream",
    artwork: 'dream-lore-10',
    text: 'The wise old snake dreams every night. In its dreams, it is young again, exploring the Dream World for the first time. It remembers everything, and forgets nothing. This is both a blessing and a curse.',
    discovered: false,
    sequence: 10,
  },
  // Nightmare Realm Lore (Sequence 11-20)
  {
    id: 'lore.nightmare.origin',
    title: 'The Dark Reflection',
    artwork: 'dream-lore-11',
    text: 'The Nightmare Realm is the shadow of the Dream World. Where the Dream is light, the Nightmare is dark. Where the Dream is peaceful, the Nightmare is dangerous. They are two sides of the same coin.',
    discovered: false,
    sequence: 11,
  },
  {
    id: 'lore.nightmare.twisted',
    title: 'The Twisted Map',
    artwork: 'dream-lore-12',
    text: 'In the Nightmare Realm, the normal map is distorted and twisted. Walls that once led to safety now lead to danger. The familiar becomes foreign, and the familiar becomes frightening.',
    discovered: false,
    sequence: 12,
  },
  {
    id: 'lore.nightmare.hostile',
    title: 'Hostile Apples',
    artwork: 'dream-lore-13',
    text: 'In the Nightmare Realm, apples are not passive treats. They chase the snake, hiding behind walls and ambushing from corners. They are the opposite of the peaceful floating apples of the Dream World.',
    discovered: false,
    sequence: 13,
  },
  {
    id: 'lore.nightmare.enemies',
    title: 'Strengthened Enemies',
    artwork: 'dream-lore-14',
    text: 'The enemies of the Nightmare Realm are darker versions of their waking counterparts. They are faster, stronger, and more numerous. Surviving in the Nightmare Realm requires courage and skill.',
    discovered: false,
    sequence: 14,
  },
  {
    id: 'lore.nightmare.cosmetics',
    title: 'Nightmare Cosmetics',
    artwork: 'dream-lore-15',
    text: 'Those who survive the Nightmare Realm are rewarded with dark, twisted cosmetics. These items glow with an eerie light and mark their wearer as a conqueror of the darkest dreams.',
    discovered: false,
    sequence: 15,
  },
  {
    id: 'lore.nightmare.achievement',
    title: 'The Nightmare Conqueror',
    artwork: 'dream-lore-16',
    text: 'The ultimate achievement of the Nightmare Realm is the title of Nightmare Conqueror. Only those who survive the darkest depths and emerge victorious earn this honor.',
    discovered: false,
    sequence: 16,
  },
  {
    id: 'lore.nightmare.balance',
    title: 'The Balance of Dreams',
    artwork: 'dream-lore-17',
    text: 'The Dream World and the Nightmare Realm are in balance. One cannot exist without the other. The wise old snake understands that both light and dark are necessary for the dream to be complete.',
    discovered: false,
    sequence: 17,
  },
  {
    id: 'lore.nightmare.fear',
    title: 'The Nature of Fear',
    artwork: 'dream-lore-18',
    text: 'The Nightmare Realm feeds on fear. The more you fear, the stronger it becomes. The only way to defeat it is to face it without fear. The wise old snake has faced many nightmares.',
    discovered: false,
    sequence: 18,
  },
  {
    id: 'lore.nightmare.awakening',
    title: 'The Awakening',
    artwork: 'dream-lore-19',
    text: 'When a snake awakens from a Nightmare Realm visit, it carries with it a fragment of the darkness. This fragment can be used to strengthen the snake against future nightmares, or it can corrupt the snake if left unchecked.',
    discovered: false,
    sequence: 19,
  },
  {
    id: 'lore.final',
    title: 'The Complete Dream',
    artwork: 'dream-lore-20',
    text: 'When all lore fragments are collected, the snake sees the Complete Dream — a vision of the world as it truly is, a place of infinite possibility where the snake is both the dreamer and the dream. The wise old snake has seen this vision. It was beautiful.',
    discovered: false,
    sequence: 20,
  },
];

export function getLoreFragment(id: string): LoreFragment | undefined {
  return DREAM_LORE_FRAGMENTS.find((f) => f.id === id);
}

export function getLoreBySequence(sequence: number): LoreFragment | undefined {
  return DREAM_LORE_FRAGMENTS.find((f) => f.sequence === sequence);
}

export function getNextLoreFragment(collected: string[]): LoreFragment | undefined {
  const collectedSequences = new Set(
    collected
      .map((id) => getLoreFragment(id)?.sequence)
      .filter((s): s is number => s !== undefined),
  );

  for (let i = 1; i <= DREAM_LORE_FRAGMENTS.length; i++) {
    if (!collectedSequences.has(i)) {
      return getLoreBySequence(i);
    }
  }
  return undefined;
}

export function getAllLoreFragments(): LoreFragment[] {
  return [...DREAM_LORE_FRAGMENTS].sort((a, b) => a.sequence - b.sequence);
}
