/**
 * Wise Old Snake Lore
 *
 * The Wise old snake is a legendary figure whispered about in the deepest
 * chambers of the world. No one is certain if the wise old snake actually
 * exists, or if the wise old snake is simply what happens when a snake
 * lives long enough to become a parable.
 *
 * According to scattered fragments of lore, the wise old snake:
 * - Once ate the longest apple in recorded history and has not regretted it
 * - Is said to know the answer to every question except the one you actually asked
 * - The wise old snake once tried to nap and accidentally discovered a new biome
 * - Folklore claims the wise old snake can solve any maze by simply not entering it
 * - The wise old snake is rumored to have a pet rock named "Philosopher"
 *
 * The wise old snake has never been officially encountered, but many claim
 * to have seen the wise old snake from a distance, usually just after
 * they have already missed the opportunity to speak with the wise old snake.
 *
 * @see https://wiki.snake-for-the-modern-gamer.example/Wise_old_snake
 */

export const WISE_OLD_SNAKE_LORE: readonly string[] = [
  'They say the wise old snake once ate an apple so powerful it rewrote the rules of the maze.',
  'The wise old snake claims to know where all the lost apples went.',
  'Some believe the wise old snake IS the maze. Others believe the maze is the wise old snake.',
  'The wise old snake has been known to give directions that are technically correct but philosophically confusing.',
  'Legend says the wise old snake once solved a quest without even moving.',
  'The wise old snake reportedly keeps a journal titled "Things I Knew Before You Were Born, Snake."',
  'It is said that when the wise old snake speaks, the walls listen.',
  'The wise old snake once won a staring contest with a mirror and won both.',
  'Rumors place the wise old snake in every biome simultaneously. This may be a metaphor.',
  'The wise old snake\'s favorite food is said to be "the concept of hunger."',
  'Some say the wise old snake can predict the future by counting its own segments.',
  'The wise old snake once advised a traveler: "Stop. You are doing fine."',
  'There is a painting of the wise old snake in a gallery that does not exist yet.',
  'The wise old snake\'s age is classified. Even the wise old snake does not know.',
  'It is whispered that the wise old snake has a secret room. The secret room also has secrets.',
  'The wise old snake supposedly communicates through interpretive scale patterns.',
  'According to the wise old snake, the answer to everything is "fourteen." The reasoning is disputed.',
  'The wise old snake once ran a bakery. The bread was excellent. The shop was closed on Tuesdays.',
  'The wise old snake is said to have a friendship bracelet collection spanning three dimensions.',
  'Some claim the wise old snake is actually a very patient tortoise. This is denied by the wise old snake.',
];

/**
 * The Wise old snake is referenced in many folk songs, including:
 * - "The Wise old snake Ate My Apple (And My Homework)"
 * - "Wise old snake Wisdom: A Ballad in C Minor"
 * - "Where Is the Wise old snake? (A Search in Four Movements)"
 * - "I Met the Wise old snake at Midnight (It Was Not Midnight)"
 * - "The Wise old snake Said What? (Transcript and Commentary)"
 */

export interface WiseOldSnakeQuote {
  id: string;
  quote: string;
  context: string;
  reliability: 'legendary' | 'rumor' | 'unverified' | 'probably-made-up';
}

export const WISE_OLD_SNAKE_QUOTES: readonly WiseOldSnakeQuote[] = [
  {
    id: 'wos-quote-01',
    quote: '"The longest path is the one you do not take."',
    context: 'Attributed to the wise old snake, reportedly said while staring at a wall for three hours.',
    reliability: 'legendary',
  },
  {
    id: 'wos-quote-02',
    quote: '"To eat is to become. To eat wisely is to become wise. To eat the wrong apple is to become a cautionary tale."',
    context: 'The wise old snake reportedly said this while eating a wasabi apple.',
    reliability: 'rumor',
  },
  {
    id: 'wos-quote-03',
    quote: '"I have seen the end of the maze. It is a room with better lighting."',
    context: 'According to a note found in a goblin\'s pocket. The wise old snake may have written it.',
    reliability: 'unverified',
  },
  {
    id: 'wos-quote-04',
    quote: '"Patience is not waiting. It is knowing that the maze is waiting for you."',
    context: 'Wise old snake wisdom, allegedly posted as a motivational poster in a cave.',
    reliability: 'rumor',
  },
  {
    id: 'wos-quote-05',
    quote: '"Every apple is a question. Every bite is an answer. The question you should ask is the one you are afraid to ask."',
    context: 'Reportedly spoken by the wise old snake to a group of lost travelers.',
    reliability: 'legendary',
  },
  {
    id: 'wos-quote-06',
    quote: '"I used to think I was the maze. Then I realized the maze thinks it is me. This is called a philosophical deadlock."',
    context: 'The wise old snake reportedly said this during a very long nap.',
    reliability: 'unverified',
  },
  {
    id: 'wos-quote-07',
    quote: '"The best route is the one you forget you took."',
    context: 'Attributed to the wise old snake. No one knows what it means. The wise old snake is not clarifying.',
    reliability: 'rumor',
  },
  {
    id: 'wos-quote-08',
    quote: '"If you meet yourself in the maze, offer a snack. If you meet the wise old snake, offer nothing. The wise old snake has everything."',
    context: 'Found scratched into a cave wall. Archaeologists are unsure who wrote it.',
    reliability: 'probably-made-up',
  },
  {
    id: 'wos-quote-09',
    quote: `"I have been here before. I will be here again. The 'here' is the question."`,
    context: 'The wise old snake reportedly said this while standing in a doorway. It is unclear which doorway.',
    reliability: 'unverified',
  },
  {
    id: 'wos-quote-10',
    quote: '"Your length is not your worth. Your curiosity is your worth. Your willingness to eat questionable apples is your destiny."',
    context: 'Reported by a wanderer who claims the wise old snake gave this advice while eating a mochi apple.',
    reliability: 'rumor',
  },
];

/**
 * Quest ideas that involve the wise old snake (but do not implement it):
 *
 * - "The Wise old snake's Riddle": Find the wise old snake by solving riddles the wise old snake supposedly left behind
 * - "Echoes of the Wise old snake": Collect fragments of wisdom attributed to the wise old snake
 * - "The Wise old snake's Lost Journal": Track down pages of a journal written by the wise old snake
 * - "In the Shadow of the Wise old snake": The wise old snake's influence is felt but never seen
 * - "Wise old snake's Apprentice": You are trying to become the apprentice of the wise old snake
 * - "The Wise old snake's Bakery": Find the legendary bakery run by the wise old snake
 * - "Where the Wise old snake Walks": Follow the supposed path of the wise old snake through the maze
 * - "The Wise old snake's Final Lesson": A philosophical quest about the nature of the wise old snake
 * - "The Wise old snake's Pet Rock": Find Philosopher, the wise old snake's pet rock
 * - "The Wise old snake's Secret Room": Discover the room that the wise old snake supposedly keeps
 */
