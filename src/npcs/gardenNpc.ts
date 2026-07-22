/**
 * Garden NPC
 */
import type { NpcProfile } from './profiles.js';
import { buildNpcStats } from './profiles.js';

/** Garden NPC profile — the ghost gardener who teaches apple farming. */
export const GARDEN_NPC_PROFILE: NpcProfile = {
  id: 'garden-npc-ghost-gardener',
  name: 'Old Martha',
  role: 'house',
  encounterType: 'quest',
  portraitId: 'garden-npc-ghost-gardener',
  stats: buildNpcStats('Old Martha'),
  maxHearts: 3,
};

/** Garden NPC dialogue lines. */
export const GARDEN_NPC_DIALOGUE = {
  greeting: [
    "Welcome to your garden, little snake! I'm Old Martha, your ghostly guide to apple farming.",
    "The soil here remembers every seed that's ever been planted. Let's make it remember you.",
    "You've got the green thumb, I can see it in your scales. Ready to grow something beautiful?",
  ],
  tips: [
    "Remember: water your plants every day, or they'll wither faster than a forgotten promise.",
    'Lavender and love apples grow twice as well together. Companion planting is the secret!',
    'Watch out for aphids — they multiply fast. Squash them before they take over your garden.',
    'Rare seeds cost more, but they produce rare apples. Worth the investment, fuhgeddaboudit.',
    'The garden changes with the seasons. Spring is best for most seeds, but wasabi loves winter.',
    'When you see flowers, that means your plants are almost ready. Patience, young snake.',
    "I've tended this garden for 999 years. The wisest thing I've learned? Everything takes time.",
  ],
  quests: [
    "I have a task for you. Harvest 10 ripe apples from your garden. That's the first step to mastery.",
    "Once you've harvested enough, we can expand your garden. More plots mean more apples!",
    'Have you tried companion planting? Some seeds grow better together. Try lavender and love!',
    "Master the garden, and you'll never go hungry. The apples here are worth their weight in gold.",
  ],
  shop: [
    "I've got some rare seeds in storage. Want to take a look?",
    "These seeds cost a bit, but they'll pay for themselves. What do you say?",
    "I don't usually share these, but you seem like a good snake. Special price for you.",
  ],
  farewell: [
    "Take care of those plants, dear. They're counting on you.",
    "The garden grows whether you watch it or not. Make sure you're watching!",
    'Remember: a well-tended garden is a happy garden. And a happy garden feeds a happy snake.',
    "I'll be here, watching over your garden from the great beyond. You betcha!",
  ],
  defeat: [
    "You can't defeat wisdom, little snake. But I appreciate the effort.",
    "The garden forgives. Come back when you're ready to learn.",
    "Even ghosts have dignity. I'll be watching... patiently.",
  ],
};

/** Garden NPC shop items. */
export interface GardenShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  quantity: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
}

export const GARDEN_NPC_SHOP: GardenShopItem[] = [
  {
    id: 'seed-normal',
    name: 'Standard Apple Seed',
    description: 'Grows a standard apple. Reliable and steady.',
    price: 5,
    quantity: 99,
    rarity: 'common',
  },
  {
    id: 'seed-gold',
    name: 'Golden Apple Seed',
    description: 'Grows a gleaming golden apple. Rare and valuable.',
    price: 15,
    quantity: 50,
    rarity: 'uncommon',
  },
  {
    id: 'seed-treat',
    name: 'Treat Apple Seed',
    description: 'Grows a sweet treat apple. Good for snacking.',
    price: 8,
    quantity: 75,
    rarity: 'common',
  },
  {
    id: 'seed-lavender',
    name: 'Lavender Apple Seed',
    description: 'Grows a fragrant lavender apple. Pairs well with love apples.',
    price: 12,
    quantity: 40,
    rarity: 'uncommon',
  },
  {
    id: 'seed-love',
    name: 'Love Apple Seed',
    description: 'Grows a heart-shaped love apple. Double yield with lavender.',
    price: 12,
    quantity: 40,
    rarity: 'uncommon',
  },
  {
    id: 'seed-caffeinated',
    name: 'Caffeinated Apple Seed',
    description: 'Grows a jittery caffeinated apple. Grows faster in heat.',
    price: 25,
    quantity: 25,
    rarity: 'rare',
  },
  {
    id: 'seed-wasabi',
    name: 'Wasabi Apple Seed',
    description: 'Grows a spicy wasabi apple. Pairs with caffeinated for hybrid apples.',
    price: 30,
    quantity: 20,
    rarity: 'rare',
  },
  {
    id: 'seed-mochi',
    name: 'Mochi Apple Seed',
    description: 'Grows a chewy mochi apple. Best in autumn weather.',
    price: 20,
    quantity: 30,
    rarity: 'uncommon',
  },
  {
    id: 'seed-yuzu',
    name: 'Yuzu Apple Seed',
    description: 'Grows a citrusy yuzu apple. Pairs well with mochi.',
    price: 18,
    quantity: 30,
    rarity: 'uncommon',
  },
  {
    id: 'seed-frost',
    name: 'Frost Apple Seed',
    description: 'Grows an icy frost apple. Thrives in cold weather.',
    price: 35,
    quantity: 15,
    rarity: 'rare',
  },
  {
    id: 'seed-winterberry',
    name: 'Winterberry Apple Seed',
    description: 'Grows a winter-hardy berry apple. Pairs with frost.',
    price: 35,
    quantity: 15,
    rarity: 'rare',
  },
  {
    id: 'seed-skittish',
    name: 'Skittish Apple Seed',
    description: 'Grows a twitchy skittish apple. Fast to grow, fast to move.',
    price: 10,
    quantity: 60,
    rarity: 'common',
  },
  {
    id: 'seed-cold-beer',
    name: 'Cold Beer Apple Seed',
    description: 'Grows a crisp cold beer apple. Refreshing in summer.',
    price: 20,
    quantity: 35,
    rarity: 'uncommon',
  },
  {
    id: 'seed-mocha',
    name: 'Mocha Apple Seed',
    description: 'Grows a rich mocha apple. Best in autumn.',
    price: 28,
    quantity: 20,
    rarity: 'rare',
  },
];

/** Garden NPC portrait ID. */
export const GARDEN_NPC_PORTRAIT_ID = 'garden-npc-ghost-gardener';

/**
 * Get a random greeting from Old Martha.
 */
export function getGreeting(): string {
  const greetings = GARDEN_NPC_DIALOGUE.greeting;
  return greetings[Math.floor(Math.random() * greetings.length)];
}

/**
 * Get a random tip from Old Martha.
 */
export function getTip(): string {
  const tips = GARDEN_NPC_DIALOGUE.tips;
  return tips[Math.floor(Math.random() * tips.length)];
}

/**
 * Get a random quest line from Old Martha.
 */
export function getQuestLine(): string {
  const quests = GARDEN_NPC_DIALOGUE.quests;
  return quests[Math.floor(Math.random() * quests.length)];
}

/**
 * Get a random farewell from Old Martha.
 */
export function getFarewell(): string {
  const farewells = GARDEN_NPC_DIALOGUE.farewell;
  return farewells[Math.floor(Math.random() * farewells.length)];
}

/**
 * Get a random shop line from Old Martha.
 */
export function getShopLine(): string {
  const shopLines = GARDEN_NPC_DIALOGUE.shop;
  return shopLines[Math.floor(Math.random() * shopLines.length)];
}
