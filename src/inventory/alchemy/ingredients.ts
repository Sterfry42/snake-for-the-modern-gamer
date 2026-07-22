/**
 * Alchemy Ingredients
 */

import type { AlchemyIngredient, IngredientRarity } from './alchemyTypes.js';

export const ALCHEMY_INGREDIENTS: readonly AlchemyIngredient[] = [
  // === APPLE INGREDIENTS ===
  {
    id: 'ingredient-normal-apple',
    name: 'Standard Apple Extract',
    description: 'Basic apple essence. The foundation of all alchemy.',
    rarity: 'common',
    category: 'apple',
    tags: ['apple', 'basic'],
  },
  {
    id: 'ingredient-skittish-apple',
    name: 'Skittish Apple Essence',
    description: 'A twitchy essence that jitters when left unattended.',
    rarity: 'uncommon',
    category: 'apple',
    tags: ['apple', 'skittish', 'movement'],
  },
  {
    id: 'ingredient-pearl-apple',
    name: 'Pearl Apple Concentrate',
    description: 'A pale, polished essence with a smooth texture.',
    rarity: 'uncommon',
    category: 'apple',
    tags: ['apple', 'pearl', 'defense'],
  },
  {
    id: 'ingredient-yuzu-apple',
    name: 'Yuzu Apple Distillate',
    description: 'Sharp citrus essence that stings the nostrils.',
    rarity: 'uncommon',
    category: 'apple',
    tags: ['apple', 'yuzu', 'sensory'],
  },
  {
    id: 'ingredient-gold-apple',
    name: 'Golden Apple Magma',
    description: 'A gleaming essence that radiates warmth.',
    rarity: 'rare',
    category: 'apple',
    tags: ['apple', 'gold', 'energy'],
  },
  {
    id: 'ingredient-wasabi-apple',
    name: 'Wasabi Apple Resin',
    description: 'A hot green resin that clears the sinuses.',
    rarity: 'rare',
    category: 'apple',
    tags: ['apple', 'wasabi', 'stimulant'],
  },
  {
    id: 'ingredient-caf-apple',
    name: 'Caffeinated Apple Tincture',
    description: 'A jittery essence that keeps you awake for days.',
    rarity: 'uncommon',
    category: 'apple',
    tags: ['apple', 'caffeine', 'stimulant'],
  },
  {
    id: 'ingredient-mochi-apple',
    name: 'Mochi Apple Paste',
    description: 'A sticky, chewy essence that clings to everything.',
    rarity: 'uncommon',
    category: 'apple',
    tags: ['apple', 'mochi', 'binding'],
  },
  {
    id: 'ingredient-cold-beer-apple',
    name: 'Cold Beer Apple Brew',
    description: 'A crisp golden brew. The wise old snake says "fuhgeddaboudit."',
    rarity: 'rare',
    category: 'apple',
    tags: ['apple', 'cold-beer', 'relaxant'],
  },

  // === MINERAL INGREDIENTS ===
  {
    id: 'ingredient-quartz',
    name: 'Crystal Quartz',
    description: 'A clear mineral shard from deep caves.',
    rarity: 'common',
    category: 'mineral',
    tags: ['mineral', 'crystal', 'purity'],
  },
  {
    id: 'ingredient-amber',
    name: 'Sun Amber',
    description: 'Warm golden mineral that traps ancient light.',
    rarity: 'uncommon',
    category: 'mineral',
    tags: ['mineral', 'amber', 'light'],
  },
  {
    id: 'ingredient-lapis',
    name: 'Deep Lapis Lazuli',
    description: 'A deep blue stone from the darkest cave layers.',
    rarity: 'rare',
    category: 'mineral',
    tags: ['mineral', 'lapis', 'depth'],
  },
  {
    id: 'ingredient-meteor-iron',
    name: 'Meteor Iron Fragment',
    description: 'A piece of fallen star metal. Warm to the touch.',
    rarity: 'rare',
    category: 'mineral',
    tags: ['mineral', 'meteor', 'energy'],
  },
  {
    id: 'ingredient-void-crystal',
    name: 'Void Crystal',
    description: 'A dark crystal that seems to absorb light around it.',
    rarity: 'legendary',
    category: 'mineral',
    tags: ['mineral', 'void', 'shadow', 'phase'],
  },

  // === ANIMAL PRODUCT INGREDIENTS ===
  {
    id: 'ingredient-honey',
    name: 'Wildflower Honey',
    description: 'Sweet honey from the garden bees.',
    rarity: 'common',
    category: 'animalProduct',
    tags: ['animal', 'honey', 'sweet'],
  },
  {
    id: 'ingredient-spider-silk',
    name: 'Spider Silk Strand',
    description: 'Incredibly strong silk from a cave spider.',
    rarity: 'uncommon',
    category: 'animalProduct',
    tags: ['animal', 'silk', 'binding', 'web'],
  },
  {
    id: 'ingredient-bear-essence',
    name: 'Bear Essence',
    description: 'A powerful essence from a tamed bear.',
    rarity: 'rare',
    category: 'animalProduct',
    tags: ['animal', 'bear', 'strength'],
  },
  {
    id: 'ingredient-eagle-feather',
    name: 'Golden Eagle Feather',
    description: 'A feather from a mountain eagle. Light as air.',
    rarity: 'uncommon',
    category: 'animalProduct',
    tags: ['animal', 'eagle', 'flight', 'speed'],
  },
  {
    id: 'ingredient-fox-cub',
    name: 'Fox Cub Fur Tuft',
    description: 'A tuft of russet fur from a tamed fox.',
    rarity: 'uncommon',
    category: 'animalProduct',
    tags: ['animal', 'fox', 'stealth', 'shadow'],
  },
  {
    id: 'ingredient-snake-scale',
    name: 'Shed Snake Scale',
    description: 'A scale from a wise old snake. Shimmering with potential.',
    rarity: 'rare',
    category: 'animalProduct',
    tags: ['animal', 'snake', 'transformation'],
  },

  // === HERB INGREDIENTS ===
  {
    id: 'ingredient-mint',
    name: 'Garden Mint',
    description: 'Fresh mint from the garden patch.',
    rarity: 'common',
    category: 'herb',
    tags: ['herb', 'mint', 'refresh'],
  },
  {
    id: 'ingredient-nightshade',
    name: 'Moonlit Nightshade',
    description: 'A dark herb that glows faintly under moonlight.',
    rarity: 'uncommon',
    category: 'herb',
    tags: ['herb', 'nightshade', 'shadow', 'dream'],
  },
  {
    id: 'ingredient-sunroot',
    name: 'Sunroot tuber',
    description: 'A golden root that stores sunlight.',
    rarity: 'uncommon',
    category: 'herb',
    tags: ['herb', 'sunroot', 'energy', 'light'],
  },
  {
    id: 'ingredient-ghost-garlic',
    name: 'Ghost Garlic',
    description: 'A translucent bulb that repels spirits.',
    rarity: 'rare',
    category: 'herb',
    tags: ['herb', 'ghost', 'protection', 'shadow'],
  },

  // === ESSENCE INGREDIENTS ===
  {
    id: 'ingredient-dew',
    name: 'Morning Dew',
    description: 'Collected at dawn. Pure and refreshing.',
    rarity: 'common',
    category: 'essence',
    tags: ['essence', 'dew', 'purity'],
  },
  {
    id: 'ingredient-shadow-essence',
    name: 'Shadow Essence',
    description: 'Condensed darkness from the deepest caves.',
    rarity: 'rare',
    category: 'essence',
    tags: ['essence', 'shadow', 'darkness'],
  },
  {
    id: 'ingredient-light-essence',
    name: 'Light Essence',
    description: 'Captured sunlight in a vial. Warm and inviting.',
    rarity: 'rare',
    category: 'essence',
    tags: ['essence', 'light', 'radiance'],
  },
  {
    id: 'ingredient-time-essence',
    name: 'Time Essence',
    description: 'A viscous golden fluid that flows backward.',
    rarity: 'legendary',
    category: 'essence',
    tags: ['essence', 'time', 'temporal'],
  },

  // === MYTHIC COMPONENTS ===
  {
    id: 'ingredient-philosophers-stone',
    name: "Philosopher's Stone Fragment",
    description: 'A fragment of the legendary stone. It hums with power.',
    rarity: 'legendary',
    category: 'mythicComponent',
    tags: ['mythic', 'transformation', 'ultimate'],
  },
  {
    id: 'ingredient-elixir-of-life',
    name: 'Elixir of Life Drop',
    description: 'A single drop that pulses with life force.',
    rarity: 'legendary',
    category: 'mythicComponent',
    tags: ['mythic', 'life', 'healing'],
  },
  {
    id: 'ingredient-void-essence',
    name: 'Void Essence Core',
    description: 'The heart of nothingness. Dangerous to handle.',
    rarity: 'legendary',
    category: 'mythicComponent',
    tags: ['mythic', 'void', 'destruction', 'phase'],
  },
  {
    id: 'ingredient-aurora-crystal',
    name: 'Aurora Crystal',
    description: 'A crystal that shifts through every color. Beautiful and deadly.',
    rarity: 'legendary',
    category: 'mythicComponent',
    tags: ['mythic', 'aurora', 'rainbow', 'transformation'],
  },
];

/** Get an ingredient by ID */
export function getIngredient(id: string): AlchemyIngredient | undefined {
  return ALCHEMY_INGREDIENTS.find((i) => i.id === id);
}

/** Get ingredients filtered by category */
export function getIngredientsByCategory(
  category: AlchemyIngredient['category'],
): AlchemyIngredient[] {
  return ALCHEMY_INGREDIENTS.filter((i) => i.category === category);
}

/** Get ingredients filtered by rarity */
export function getIngredientsByRarity(rarity: IngredientRarity): AlchemyIngredient[] {
  return ALCHEMY_INGREDIENTS.filter((i) => i.rarity === rarity);
}
