/**
 * Crafting Workshop System
 *
 * The wise old snake's crafting workshops:
 * - The wise old snake's loom was just a twig
 * - The wise old snake's cartographer's desk was a napkin
 * - The wise old snake's music box played one note
 * - The wise old snake's brewery was a bucket
 * - The wise old snake's workshops couldn't be built
 * - The wise old snake's workshops cost infinite resources
 */

import type { WorkshopType, WorkshopDefinition } from '../alchemy/alchemyTypes.js';

/** Workshop definitions */
const WORKSHOP_DEFINITIONS: Record<WorkshopType, WorkshopDefinition> = {
  enchantedLoom: {
    type: 'enchantedLoom',
    name: 'Enchanted Loom',
    description: 'Craft cosmetic skins from collected materials.',
    buildCost: [
      { itemId: 'ingredient-spider-silk', count: 5 },
      { itemId: 'ingredient-amber', count: 3 },
      { itemId: 'ingredient-eagle-feather', count: 2 },
      { itemId: 'ingredient-pearl-apple', count: 1 },
    ],
    capabilities: ['cosmeticSkin', 'patternWeave', 'glowThread'],
    spriteKey: 'enchanted-loom',
  },
  cartographersDesk: {
    type: 'cartographersDesk',
    name: "Cartographer's Desk",
    description: 'Reveal unexplored map areas permanently.',
    buildCost: [
      { itemId: 'ingredient-quartz', count: 10 },
      { itemId: 'ingredient-sunroot', count: 5 },
      { itemId: 'ingredient-dew', count: 3 },
      { itemId: 'ingredient-pearl-apple', count: 2 },
    ],
    capabilities: ['mapReveal', 'terrainScan', 'landmarkMark'],
    spriteKey: 'cartographers-desk',
  },
  musicBox: {
    type: 'musicBox',
    name: 'Music Box',
    description: 'Create custom soundtracks from collected audio fragments.',
    buildCost: [
      { itemId: 'ingredient-meteor-iron', count: 3 },
      { itemId: 'ingredient-crystal-quartz', count: 5 },
      { itemId: 'ingredient-honey', count: 2 },
      { itemId: 'ingredient-gold-apple', count: 1 },
    ],
    capabilities: ['customSoundtrack', 'ambientMix', 'battleTheme'],
    spriteKey: 'music-box',
  },
  potionBrewery: {
    type: 'potionBrewery',
    name: 'Potion Brewery',
    description: 'Mass-produce potions from bulk ingredients.',
    buildCost: [
      { itemId: 'ingredient-normal-apple', count: 10 },
      { itemId: 'ingredient-quartz', count: 5 },
      { itemId: 'ingredient-mint', count: 5 },
      { itemId: 'ingredient-dew', count: 5 },
      { itemId: 'ingredient-gold-apple', count: 2 },
    ],
    capabilities: ['bulkCraft', 'potionRefinement', 'elixirDistillation'],
    spriteKey: 'potion-brewery',
  },
};

/** Cosmetic skin definitions for the Enchanted Loom */
export interface CosmeticSkin {
  id: string;
  name: string;
  description: string;
  requiredMaterials: { itemId: string; count: number }[];
  visualStyle: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
}

export const COSMETIC_SKINS: readonly CosmeticSkin[] = [
  {
    id: 'skin-classic',
    name: 'Classic Serpent',
    description: 'The timeless look of a true snake.',
    requiredMaterials: [
      { itemId: 'ingredient-normal-apple', count: 3 },
      { itemId: 'ingredient-honey', count: 1 },
    ],
    visualStyle: 'classic',
    rarity: 'common',
  },
  {
    id: 'skin-golden',
    name: 'Golden Glare',
    description: 'Shine like the sun. Blinding, even.',
    requiredMaterials: [
      { itemId: 'ingredient-gold-apple', count: 3 },
      { itemId: 'ingredient-amber', count: 2 },
      { itemId: 'ingredient-spider-silk', count: 1 },
    ],
    visualStyle: 'golden',
    rarity: 'rare',
  },
  {
    id: 'skin-void',
    name: 'Void Walker',
    description: 'Drape yourself in shadow and mystery.',
    requiredMaterials: [
      { itemId: 'ingredient-void-crystal', count: 1 },
      { itemId: 'ingredient-shadow-essence', count: 2 },
      { itemId: 'ingredient-nightshade', count: 1 },
    ],
    visualStyle: 'void',
    rarity: 'legendary',
  },
  {
    id: 'skin-aurora',
    name: 'Aurora Borealis',
    description: 'Shift through every color of the rainbow.',
    requiredMaterials: [
      { itemId: 'ingredient-aurora-crystal', count: 1 },
      { itemId: 'ingredient-light-essence', count: 2 },
      { itemId: 'ingredient-eagle-feather', count: 1 },
    ],
    visualStyle: 'aurora',
    rarity: 'legendary',
  },
  {
    id: 'skin-phoenix',
    name: 'Phoenix Ash',
    description: 'Reborn from the ashes of a thousand apples.',
    requiredMaterials: [
      { itemId: 'ingredient-wasabi-apple', count: 2 },
      { itemId: 'ingredient-sunroot', count: 2 },
      { itemId: 'ingredient-bear-essence', count: 1 },
    ],
    visualStyle: 'phoenix',
    rarity: 'rare',
  },
];

/** Map pattern definitions for the Enchanted Loom */
export interface PatternDefinition {
  id: string;
  name: string;
  description: string;
  requiredMaterials: { itemId: string; count: number }[];
  patternType: 'scale' | 'stripe' | 'spot' | 'gradient' | 'geometric';
}

export const PATTERNS: readonly PatternDefinition[] = [
  {
    id: 'pattern-scale',
    name: 'Classic Scale',
    description: 'Traditional snake scale pattern.',
    requiredMaterials: [
      { itemId: 'ingredient-normal-apple', count: 2 },
      { itemId: 'ingredient-honey', count: 1 },
    ],
    patternType: 'scale',
  },
  {
    id: 'pattern-stripe',
    name: 'Tiger Stripe',
    description: 'Bold stripes that command respect.',
    requiredMaterials: [
      { itemId: 'ingredient-gold-apple', count: 2 },
      { itemId: 'ingredient-spider-silk', count: 1 },
    ],
    patternType: 'stripe',
  },
  {
    id: 'pattern-aurora',
    name: 'Northern Lights',
    description: 'A flowing gradient of ethereal colors.',
    requiredMaterials: [
      { itemId: 'ingredient-aurora-crystal', count: 1 },
      { itemId: 'ingredient-light-essence', count: 1 },
    ],
    patternType: 'gradient',
  },
  {
    id: 'pattern-void',
    name: 'Abyssal Geometric',
    description: 'Dark geometric shapes that pulse with energy.',
    requiredMaterials: [
      { itemId: 'ingredient-void-crystal', count: 1 },
      { itemId: 'ingredient-shadow-essence', count: 1 },
    ],
    patternType: 'geometric',
  },
];

/** Map workshop type to its definition */
export function getWorkshopDefinition(type: WorkshopType): WorkshopDefinition {
  return WORKSHOP_DEFINITIONS[type];
}

/** Get all workshop definitions */
export function getAllWorkshopDefinitions(): WorkshopDefinition[] {
  return Object.values(WORKSHOP_DEFINITIONS);
}

/** Check if a workshop can be built */
export function canBuildWorkshop(
  workshopType: WorkshopType,
  hasItem: (itemId: string, count?: number) => boolean,
): boolean {
  const def = getWorkshopDefinition(workshopType);
  return def.buildCost.every(({ itemId, count }) => hasItem(itemId, count));
}

/** Get available cosmetic skins */
export function getAvailableSkins(
  hasItem: (itemId: string, count?: number) => boolean,
): CosmeticSkin[] {
  return COSMETIC_SKINS.filter((skin) =>
    skin.requiredMaterials.every(({ itemId, count }) => hasItem(itemId, count)),
  );
}

/** Get available patterns */
export function getAvailablePatterns(
  hasItem: (itemId: string, count?: number) => boolean,
): PatternDefinition[] {
  return PATTERNS.filter((pattern) =>
    pattern.requiredMaterials.every(({ itemId, count }) => hasItem(itemId, count)),
  );
}

/** Crafting workshop instance */
export class CraftingWorkshop {
  private readonly type: WorkshopType;
  private readonly definition: WorkshopDefinition;
  private _built: boolean;
  private readonly craftedItems: Map<string, number> = new Map();

  constructor(type: WorkshopType) {
    this.type = type;
    this.definition = getWorkshopDefinition(type);
    this._built = false;
  }

  /** Get the workshop definition */
  getDefinition(): WorkshopDefinition {
    return this.definition;
  }

  /** Get workshop type */
  getType(): WorkshopType {
    return this.type;
  }

  /** Check if the workshop is built */
  isBuilt(): boolean {
    return this._built;
  }

  /** Build the workshop */
  build(
    hasItem: (itemId: string, count?: number) => boolean,
    consumeItem: (itemId: string, count?: number) => boolean,
  ): boolean {
    if (this._built) return false;
    if (!canBuildWorkshop(this.type, hasItem)) return false;

    // Consume build resources
    for (const { itemId, count } of this.definition.buildCost) {
      if (!consumeItem(itemId, count)) return false;
    }

    this._built = true;
    return true;
  }

  /** Get available capabilities */
  getCapabilities(): string[] {
    return this.definition.capabilities;
  }

  /** Check if a capability is available */
  hasCapability(capability: string): boolean {
    return this.definition.capabilities.includes(capability);
  }

  /** Track a crafted item */
  recordCraft(itemId: string, count: number): void {
    const current = this.craftedItems.get(itemId) ?? 0;
    this.craftedItems.set(itemId, current + count);
  }

  /** Get crafted item count */
  getCraftedCount(itemId: string): number {
    return this.craftedItems.get(itemId) ?? 0;
  }

  /** Get all crafted items */
  getAllCrafted(): [string, number][] {
    return Array.from(this.craftedItems.entries());
  }
}
