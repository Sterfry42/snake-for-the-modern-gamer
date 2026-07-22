/**
 * Alchemist NPC
 */

import type { NpcTranslations } from '../i18n/types.js';

export interface AlchemistNpcData {
  id: string;
  name: string;
  position: Phaser.Math.Vector2;
  dialogue: string[];
  repeatDialogue?: string[];
  tradesRecipes: boolean;
  availableRecipes: string[];
}

/** Alchemist Hermes — a wandering trader of recipes */
export const ALCHEMIST_HERMES: AlchemistNpcData = {
  id: 'alchemist-hermes',
  name: 'Hermes the Alchemist',
  position: new Phaser.Math.Vector2(0, 0), // Position set at runtime
  dialogue: [
    'Ah, a fellow seeker of alchemical wisdom! I am Hermes, wanderer of worlds and keeper of recipes.',
    'I have traveled far and wide, collecting the secrets of potion-making. Would you like to learn some?',
    'The art of alchemy is not just about mixing ingredients — it is about understanding their essences.',
    'Every apple, every mineral, every herb carries a unique energy. Harness that energy, and you can create wonders.',
    'I can trade you recipes in exchange for rare ingredients. What do you have to offer?',
    'Remember: the wise old snake once told me, "fuhgeddaboudit, the secret ingredient is always curiosity."',
  ],
  repeatDialogue: [
    'The secrets of alchemy are vast. Keep exploring, keep experimenting.',
    'Have you discovered the mythic recipes yet? They are... legendary.',
    'The alchemy station is your best friend. Build one, stock it well, and never stop crafting.',
  ],
  tradesRecipes: true,
  availableRecipes: [
    'recipe-speed-potion',
    'recipe-shield-potion',
    'recipe-size-shrink',
    'recipe-dream-potion',
    'recipe-mythic-apple-rain',
  ],
};

/** Alchemist trade definitions */
export interface AlchemistTrade {
  recipeId: string;
  cost: { itemId: string; count: number }[];
  description: string;
}

export const ALCHEMIST_TRADES: AlchemistTrade[] = [
  {
    recipeId: 'recipe-speed-potion',
    cost: [
      { itemId: 'ingredient-eagle-feather', count: 2 },
      { itemId: 'ingredient-dew', count: 3 },
    ],
    description: 'Swiftstride Elixir recipe — increases movement speed.',
  },
  {
    recipeId: 'recipe-shield-potion',
    cost: [
      { itemId: 'ingredient-meteor-iron', count: 2 },
      { itemId: 'ingredient-quartz', count: 3 },
    ],
    description: 'Guardian Ward recipe — grants temporary invulnerability.',
  },
  {
    recipeId: 'recipe-size-shrink',
    cost: [
      { itemId: 'ingredient-mochi-apple', count: 3 },
      { itemId: 'ingredient-nightshade', count: 2 },
    ],
    description: 'Pip Squeeze recipe — shrink to slip through tight spaces.',
  },
  {
    recipeId: 'recipe-dream-potion',
    cost: [
      { itemId: 'ingredient-nightshade', count: 3 },
      { itemId: 'ingredient-ghost-garlic', count: 2 },
    ],
    description: 'Oneiric Draught recipe — enhanced perception in dreams.',
  },
  {
    recipeId: 'recipe-mythic-apple-rain',
    cost: [
      { itemId: 'ingredient-gold-apple', count: 5 },
      { itemId: 'ingredient-aurora-crystal', count: 1 },
      { itemId: 'ingredient-philosophers-stone', count: 1 },
    ],
    description: 'Apple Storm recipe — summon a legendary rain of apples.',
  },
];

/** Get trade by recipe ID */
export function getAlchemistTrade(recipeId: string): AlchemistTrade | undefined {
  return ALCHEMIST_TRADES.find((t) => t.recipeId === recipeId);
}

/** Get all available trades */
export function getAllAlchemistTrades(): AlchemistTrade[] {
  return ALCHEMIST_TRADES;
}

/** Check if the alchemist can trade a recipe */
export function canTradeRecipe(
  recipeId: string,
  hasItem: (itemId: string, count?: number) => boolean,
): boolean {
  const trade = getAlchemistTrade(recipeId);
  if (!trade) return false;
  return trade.cost.every(({ itemId, count }) => hasItem(itemId, count));
}

/** Complete a trade */
export function completeTrade(
  recipeId: string,
  hasItem: (itemId: string, count?: number) => boolean,
  consumeItem: (itemId: string, count?: number) => boolean,
): { success: boolean; recipeId?: string; error?: string } {
  const trade = getAlchemistTrade(recipeId);
  if (!trade) {
    return { success: false, error: 'No such trade available.' };
  }

  if (!canTradeRecipe(recipeId, hasItem)) {
    return { success: false, error: 'Insufficient ingredients for this trade.' };
  }

  // Consume ingredients
  for (const { itemId, count } of trade.cost) {
    if (!consumeItem(itemId, count)) {
      return { success: false, error: 'Failed to complete trade.' };
    }
  }

  return { success: true, recipeId };
}

/** Alchemist NPC dialogue translations */
export const ALCHEMIST_NPC_EN: NpcTranslations['alchemist-hermes'] = {
  pages: [
    'Ah, a fellow seeker of alchemical wisdom! I am Hermes, wanderer of worlds and keeper of recipes.',
    'The art of alchemy is not just about mixing ingredients — it is about understanding their essences.',
    'I can trade you recipes in exchange for rare ingredients. What do you have to offer?',
  ],
  repeatPages: [
    'The secrets of alchemy are vast. Keep exploring, keep experimenting.',
    'Have you discovered the mythic recipes yet? They are... legendary.',
  ],
};

export const ALCHEMIST_NPC_ES: NpcTranslations['alchemist-hermes'] = {
  pages: [
    '¡Ah, un buscador de la sabiduría alquímica! Soy Hermes, vagabundo de mundos y guardián de recetas.',
    'El arte de la alquimia no es solo mezclar ingredientes — es entender sus esencias.',
    'Puedo cambiarte recetas a cambio de ingredientes raros. ¿Qué tienes para ofrecer?',
  ],
  repeatPages: [
    'Los secretos de la alquimia son vastos. Sigue explorando, sigue experimentando.',
    '¿Has descubierto las recetas míticas todavía? Son... legendarias.',
  ],
};

export const ALCHEMIST_NPC_FR: NpcTranslations['alchemist-hermes'] = {
  pages: [
    'Ah, un chercheur de sagesse alchimique ! Je suis Hermes, vagabond des mondes et gardien de recettes.',
    "L'art de l'alchimie n'est pas seulement mélanger des ingrédients — c'est comprendre leurs essences.",
    'Je peux vous échanger des recettes contre des ingrédients rares. Que avez-vous à offrir ?',
  ],
  repeatPages: [
    "Les secrets de l'alchimie sont vastes. Continuez à explorer, continuez à expérimenter.",
    'Avez-vous découvert les recettes mythiques ? Elles sont... légendaires.',
  ],
};
