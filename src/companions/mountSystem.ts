// Mount system — handles riding mount companions, speed modifiers, and tradeoffs.

import type { CompanionInstance, CompanionDefinition } from './companionTypes.js';

/** Biome-level temperature categories for mount tradeoff evaluation. */
type BiomeTemperature = 'hot' | 'cold' | 'neutral' | 'water';

/** Tradeoff definition for a mount in a specific biome context. */
interface MountTradeoff {
  active: boolean;
  description: string;
  effect: 'inputDelay' | 'foodRestriction' | 'biomeBurn' | 'heatImmunity' | 'waterSafe' | 'stormRequired' | 'flight';
}

/** Mount tradeoff rules per creature definition + biome temperature. */
interface MountTradeoffRule {
  tradeoffs: MountTradeoff[];
  speedModifier: number;
}

/**
 * Mount system — manages entering/exiting mounts, speed modifiers,
 * biome safety checks, and tradeoff enforcement.
 */
export class MountSystem {
  /**
   * Enter a mount — modify snake movement to use mount speed.
   */
  enterMount(
    instance: CompanionInstance,
    definition: CompanionDefinition,
    currentBiome: string,
  ): MountResult {
    const temp = this.getBiomeTemperature(currentBiome);
    const tradeoff = this.getMountTradeoff(definition, currentBiome);
    const canMount = this.canMountInBiome(definition, currentBiome);

    if (!canMount) {
      return {
        success: false,
        message: tradeoff
          ? `Cannot mount here: ${tradeoff}.`
          : 'Cannot mount in this biome.',
      };
    }

    instance.flags.isMounted = true;
    instance.flags.currentBiomeMounted = currentBiome;

    return {
      success: true,
      speedModifier: this.getMountSpeedModifier(definition, currentBiome),
      tradeoff,
      message: `Rode ${definition.name}!`,
    };
  }

  /**
   * Exit a mount — restore normal movement.
   */
  exitMount(instance: CompanionInstance): MountResult {
    if (!instance.flags.isMounted) {
      return { success: false, message: 'Not mounted.', speedModifier: 1, tradeoff: null };
    }

    const previousBiome = instance.flags.currentBiomeMounted;
    delete instance.flags.isMounted;
    delete instance.flags.currentBiomeMounted;

    return {
      success: true,
      speedModifier: 1,
      tradeoff: null,
      message: `Dismounted ${instance.definitionId}.`,
    };
  }

  /**
   * Get the mount speed modifier based on creature traits and biome.
   */
  getMountSpeedModifier(definition: CompanionDefinition, currentBiome: string): number {
    const baseSpeed = definition.traits.find((t) => t.traitId === 'movementSpeed')?.value ?? 0;

    if (baseSpeed > 0) {
      return 1 + baseSpeed / 10;
    }

    // Default speed for mounts without explicit movementSpeed trait
    if (definition.id === 'river-koi') {
      const temp = this.getBiomeTemperature(currentBiome);
      if (temp === 'water') {
        return 1.5;
      }
      return 1;
    }

    if (definition.id === 'wild-boar') {
      return 1.4; // +40% speed
    }

    return 1;
  }

  /**
   * Check if a mount's tradeoff is active in the current biome.
   */
  getMountTradeoff(definition: CompanionDefinition, currentBiome: string): string | null {
    const temp = this.getBiomeTemperature(currentBiome);

    switch (definition.id) {
      case 'wild-boar':
        return '+40% speed, but 1-frame input delay';
      case 'river-koi':
        if (temp === 'water') {
          return 'Water safe for 20s, cannot eat apples while mounted';
        }
        return 'Cannot eat apples while mounted';
      default:
        return null;
    }
  }

  /**
   * Check if a mount can traverse the current biome safely.
   */
  canMountInBiome(definition: CompanionDefinition, biomeId: string): boolean {
    if (definition.id === 'river-koi') {
      // River Koi is safe in water biomes, restricted in others
      return this.isWaterBiome(biomeId) || this.isAnyBiome(biomeId);
    }

    return true;
  }

  /**
   * Check if a mount tradeoff restricts apple eating.
   */
  hasAppleRestriction(definition: CompanionDefinition): boolean {
    return definition.id === 'river-koi';
  }

  /**
   * Check if a mount tradeoff causes input delay.
   */
  hasInputDelay(definition: CompanionDefinition): boolean {
    return definition.id === 'wild-boar';
  }

  // ---- Private helpers ----

  private getBiomeTemperature(biomeId: string): BiomeTemperature {
    const hotBiomes = ['ember-waste', 'lava-caves', 'sunscorched-wastes'];
    const coldBiomes = ['frost-caverns', 'ice-peak', 'glacier-depths'];
    const waterBiomes = ['sunken-ocean', 'deep-reef', 'tidal-grotto'];

    if (waterBiomes.includes(biomeId)) return 'water';
    if (hotBiomes.includes(biomeId)) return 'hot';
    if (coldBiomes.includes(biomeId)) return 'cold';
    return 'neutral';
  }

  private isWaterBiome(biomeId: string): boolean {
    const waterBiomes = ['sunken-ocean', 'deep-reef', 'tidal-grotto'];
    return waterBiomes.includes(biomeId);
  }

  private isAnyBiome(biomeId: string): boolean {
    return biomeId !== 'sunken-ocean' && biomeId !== 'deep-reef' && biomeId !== 'tidal-grotto';
  }
}

/** Result of a mount enter/exit operation. */
export interface MountResult {
  success: boolean;
  message: string;
  speedModifier?: number;
  tradeoff?: string | null;
}
