// Breeding system — manages companion breeding, compatibility checks,
// trait inheritance, and offspring rarity determination.

import type {
  CompanionDefinition,
  CompanionInstance,
  CompanionRarity,
  CompanionTrait,
} from './companionTypes.js';

/** Result of a breeding attempt. */
export interface BreedingResult {
  success: boolean;
  offspringDefinitionId?: string;
  message: string;
  failedReason?:
    | 'incompatible'
    | 'notBondLevel5'
    | 'notSameRoom'
    | 'noBreedingFood'
    | 'maxCompanionsReached';
}

/** Rarity tiers ordered from weakest to strongest. */
const RARITY_ORDER: CompanionRarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

/** Rarity tier indices for quick lookup. */
const RARITY_INDEX: Record<CompanionRarity, number> = {
  common: 0,
  uncommon: 1,
  rare: 2,
  epic: 3,
  legendary: 4,
};

/** ID of the breeding food item used to produce offspring. */
const BREEDING_FOOD_ID = 'primordial-egg';

/**
 * Breeding system — manages companion breeding mechanics including
 * compatibility checks, trait inheritance, and offspring rarity.
 */
export class BreedingSystem {
  /**
   * Check if two companion definitions are compatible for breeding.
   * Requires same kind, same biome origin, and same rarity tier.
   */
  areCompatible(a: CompanionDefinition, b: CompanionDefinition): boolean {
    if (a.kind !== b.kind) {
      return false;
    }

    // Must share at least one biome
    const aBiomes = new Set(a.spawnTable.map((s) => s.biomeId));
    const bBiomes = new Set(b.spawnTable.map((s) => s.biomeId));
    for (const biome of aBiomes) {
      if (bBiomes.has(biome)) {
        return true;
      }
    }
    return false;
  }

/**
 * Attempt breeding between two tamed companion instances.
 * Validates all preconditions before producing offspring traits and rarity.
 */
  attemptBreeding(
    parent1: CompanionInstance,
    parent2: CompanionInstance,
    breedingFoodId: string,
    currentRoom: string,
    definitions: readonly CompanionDefinition[],
    maxCompanions: number,
    activeCompanionCount: number,
    spawnOffspring: (
      definitionId: string,
      roomId: string,
      x: number,
      y: number,
      isTamed: boolean,
    ) => void,
    incrementTotalBred: () => void,
  ): BreedingResult {
    // Must be different instances
    if (parent1.id === parent2.id) {
      return {
        success: false,
        message: 'Cannot breed a creature with itself.',
        failedReason: 'incompatible',
      };
    }

    // Must be in the same room
    if (parent1.currentRoomId !== parent2.currentRoomId) {
      return {
        success: false,
        message: 'Companions must be in the same room.',
        failedReason: 'notSameRoom',
      };
    }

    // Check breeding food
    if (breedingFoodId !== BREEDING_FOOD_ID) {
      return {
        success: false,
        message: `Requires ${BREEDING_FOOD_ID}.`,
        failedReason: 'noBreedingFood',
      };
    }

    // Both must be tamed
    if (!parent1.isTamed || !parent2.isTamed) {
      return {
        success: false,
        message: 'Both companions must be tamed.',
        failedReason: 'incompatible',
      };
    }

    // Look up parent definitions
    const parent1Def = this.resolveDefinition(parent1.definitionId, definitions);
    const parent2Def = this.resolveDefinition(parent2.definitionId, definitions);
    if (!parent1Def || !parent2Def) {
      return {
        success: false,
        message: 'Unknown companion definition.',
        failedReason: 'incompatible',
      };
    }

    if (parent1.bondLevel < 5) {
      return {
        success: false,
        message: `${parent1Def.name} must be at bond level 5.`,
        failedReason: 'notBondLevel5',
      };
    }

    if (parent2.bondLevel < 5) {
      return {
        success: false,
        message: `${parent2Def.name} must be at bond level 5.`,
        failedReason: 'notBondLevel5',
      };
    }

    // Check compatibility
    if (!this.areCompatible(parent1Def, parent2Def)) {
      return {
        success: false,
        message: 'These creatures are not compatible for breeding.',
        failedReason: 'incompatible',
      };
    }

    // Check max companions
    if (activeCompanionCount >= maxCompanions) {
      return {
        success: false,
        message: 'Maximum companion limit reached.',
        failedReason: 'maxCompanionsReached',
      };
    }

    // Generate offspring traits and rarity
    const offspringTraits = this.generateOffspringTraits(parent1Def, parent2Def);
    const offspringRarity = this.determineOffspringRarity(parent1Def.rarity, parent2Def.rarity);
    const offspringKind = parent1Def.kind;

    // Create offspring definition on the fly
    const offspringDef: CompanionDefinition = {
      id: `${parent1Def.id}-x-${parent2Def.id}`,
      name: `${parent1Def.name} + ${parent2Def.name}`,
      species: 'hybrid',
      kind: offspringKind,
      rarity: offspringRarity,
      portraitId: `companion-portrait-${parent1Def.id}-x-${parent2Def.id}`,
      spriteRecipeId: `companion-${parent1Def.id}-x-${parent2Def.id}`,
      size: parent1Def.size,
      followOffset: { x: 0, y: 2 },
      maxBonds: 5,
      traits: offspringTraits,
      abilities: [...parent1Def.abilities, ...parent2Def.abilities],
      spawnTable: [...parent1Def.spawnTable, ...parent2Def.spawnTable],
      tameCost: {
        foodItems: parent1Def.tameCost.foodItems,
        minimumBondLevel: Math.max(parent1Def.tameCost.minimumBondLevel, parent2Def.tameCost.minimumBondLevel),
      },
      description: `A rare offspring of ${parent1Def.name} and ${parent2Def.name}.`,
      lore: `Born from the union of two legendary companions.`,
    };

    // Determine spawn position (between the two parents)
    const spawnX = Math.round((parent1.gridX + parent2.gridX) / 2);
    const spawnY = Math.round((parent1.gridY + parent2.gridY) / 2);

    // Spawn the offspring as a tamed companion
    spawnOffspring(offspringDef.id, currentRoom, spawnX, spawnY, true);

    incrementTotalBred();

    return {
      success: true,
      offspringDefinitionId: offspringDef.id,
      message: `A new companion has been born!`,
    };
  }

  /**
   * Generate offspring traits by inheriting from both parents.
   * Each parent trait has a 50% chance of being inherited.
   */
  generateOffspringTraits(
    parent1: CompanionDefinition,
    parent2: CompanionDefinition,
  ): CompanionTrait[] {
    const traits: CompanionTrait[] = [];

    // Merge all unique trait IDs from both parents
    const traitMap = new Map<string, { value: number; description: string; traitId: CompanionTrait['traitId'] }>();

    // Add parent 1 traits
    for (const trait of parent1.traits) {
      traitMap.set(trait.traitId, {
        value: trait.value,
        description: trait.description,
        traitId: trait.traitId,
      });
    }

    // Add parent 2 traits
    for (const trait of parent2.traits) {
      traitMap.set(trait.traitId, {
        value: trait.value,
        description: trait.description,
        traitId: trait.traitId,
      });
    }

    // For each unique trait, 50% chance to inherit from either parent
    // If both parents have the same trait, always inherit it
    for (const [traitId, data] of traitMap) {
      const p1Trait = parent1.traits.find((t) => t.traitId === traitId);
      const p2Trait = parent2.traits.find((t) => t.traitId === traitId);

      if (p1Trait && p2Trait) {
        // Both parents have this trait — inherit it (same trait from both)
        traits.push({
          traitId: p1Trait.traitId,
          value: p1Trait.value,
          description: p1Trait.description,
        });
      } else if (p1Trait) {
        // Only parent 1 has it — 50% chance
        if (Math.random() < 0.5) {
          traits.push(p1Trait);
        }
      } else if (p2Trait) {
        // Only parent 2 has it — 50% chance
        if (Math.random() < 0.5) {
          traits.push(p2Trait);
        }
      }
    }

    return traits;
  }

  /**
   * Determine offspring rarity based on parent rarities.
   * Offspring can be up to 1 tier better than either parent.
   */
  determineOffspringRarity(
    parent1Rarity: CompanionRarity,
    parent2Rarity: CompanionRarity,
  ): CompanionRarity {
    const p1Index = RARITY_INDEX[parent1Rarity];
    const p2Index = RARITY_INDEX[parent2Rarity];
    const maxParentIndex = Math.max(p1Index, p2Index);

    // Offspring can be up to 1 tier better
    const offspringIndex = Math.min(maxParentIndex + 1, RARITY_ORDER.length - 1);

    return RARITY_ORDER[offspringIndex];
  }

  /**
   * Resolve a companion definition from a list of definitions by ID.
   */
  private resolveDefinition(
    id: string,
    definitions: readonly CompanionDefinition[],
  ): CompanionDefinition | undefined {
    return definitions.find((d) => d.id === id);
  }
}
