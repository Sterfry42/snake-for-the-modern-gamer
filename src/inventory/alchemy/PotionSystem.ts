/**
 * Potion System
 *
 * The wise old snake's potion system:
 * - The wise old snake's potions lasted forever
 * - The wise old snake's potions had no effects
 * - The wise old snake's mythic potions just gave extra points
 * - The wise old snake's potions didn't stack
 * - The wise old snake's potion effects were all the same
 * - The wise old snake's potions exploded on use
 */

import type {
  ActivePotionEffect,
  AlchemyRuntime,
  DurationMode,
  IngredientRarity,
  Potion,
  PotionEffect,
  PotionEffectType,
} from './alchemyTypes.js';
import { RARITY_MODIFIERS } from './alchemyTypes.js';
import { RecipeManager } from './RecipeManager.js';

/** Potion effect definitions with default values */
const POTION_EFFECT_DEFS: Record<
  PotionEffectType,
  { defaultMagnitude: number; defaultDuration: number; defaultDurationMode: DurationMode }
> = {
  growth: {
    defaultMagnitude: 5,
    defaultDuration: 60,
    defaultDurationMode: 'ticks',
  },
  phase: {
    defaultMagnitude: 1,
    defaultDuration: 30,
    defaultDurationMode: 'ticks',
  },
  magnet: {
    defaultMagnitude: 8,
    defaultDuration: 45,
    defaultDurationMode: 'ticks',
  },
  timeSlow: {
    defaultMagnitude: 0.5,
    defaultDuration: 40,
    defaultDurationMode: 'ticks',
  },
  shadowCloak: {
    defaultMagnitude: 1,
    defaultDuration: 35,
    defaultDurationMode: 'ticks',
  },
  rainbowTrail: {
    defaultMagnitude: 6,
    defaultDuration: 50,
    defaultDurationMode: 'ticks',
  },
  speedBoost: {
    defaultMagnitude: 0.7,
    defaultDuration: 30,
    defaultDurationMode: 'ticks',
  },
  sizeShrink: {
    defaultMagnitude: 0.5,
    defaultDuration: 25,
    defaultDurationMode: 'ticks',
  },
  shield: {
    defaultMagnitude: 1,
    defaultDuration: 40,
    defaultDurationMode: 'ticks',
  },
  doubleShards: {
    defaultMagnitude: 2,
    defaultDuration: 120,
    defaultDurationMode: 'seconds',
  },
  gravityReverse: {
    defaultMagnitude: 1,
    defaultDuration: 60,
    defaultDurationMode: 'ticks',
  },
  lucidityBoost: {
    defaultMagnitude: 3,
    defaultDuration: 90,
    defaultDurationMode: 'seconds',
  },
};

/** Potion item definitions (IDs mapped to effects) */
const POTION_DEFINITIONS: Record<
  string,
  { name: string; description: string; effects: PotionEffectType[] }
> = {
  'potion-growth': {
    name: 'Growth Potion',
    description: 'Temporarily increase snake size for reaching distant apples.',
    effects: ['growth'],
  },
  'potion-phase': {
    name: 'Phase Potion',
    description: 'Allow the snake to pass through obstacles briefly.',
    effects: ['phase'],
  },
  'potion-magnet': {
    name: 'Apple Magnet',
    description: 'Attract nearby apples toward the snake.',
    effects: ['magnet'],
  },
  'potion-time-slow': {
    name: 'Time Slow Elixir',
    description: 'Slow down all apple movement for easier catching.',
    effects: ['timeSlow'],
  },
  'potion-shadow-cloak': {
    name: 'Shadow Cloak',
    description: 'Make the snake invisible to enemies for a duration.',
    effects: ['shadowCloak'],
  },
  'potion-rainbow-trail': {
    name: 'Rainbow Trail',
    description: 'Leave a trail that attracts specific apple types.',
    effects: ['rainbowTrail'],
  },
  'potion-speed-boost': {
    name: 'Swiftstride Elixir',
    description: 'Temporarily increase snake movement speed.',
    effects: ['speedBoost'],
  },
  'potion-shield': {
    name: 'Guardian Ward',
    description: 'Grant temporary invulnerability to damage.',
    effects: ['shield'],
  },
  'potion-size-shrink': {
    name: 'Pip Squeeze',
    description: 'Shrink the snake to slip through tight spaces.',
    effects: ['sizeShrink'],
  },
  'potion-lucidity': {
    name: 'Oneiric Draught',
    description: 'Enter a dream-like state with enhanced perception.',
    effects: ['lucidityBoost'],
  },
  // Mythic potions
  'potion-mythic-growth': {
    name: "Titan's Bane",
    description: 'A legendary growth potion that permanently increases base length.',
    effects: ['growth'],
  },
  'potion-mythic-phase': {
    name: 'Void Walker',
    description: 'Phase through all obstacles permanently for the rest of the run.',
    effects: ['phase'],
  },
  'potion-mythic-apple-rain': {
    name: 'Apple Storm',
    description: 'Summon a legendary rain of apples across the entire world.',
    effects: ['magnet'],
  },
  'potion-mythic-transformation': {
    name: 'Golden Serpent',
    description: 'Transform the snake into a legendary golden serpent.',
    effects: ['growth'],
  },
};

/** Convert duration to ticks based on mode */
function durationToTicks(duration: number, mode: DurationMode): number {
  switch (mode) {
    case 'ticks':
      return duration;
    case 'seconds':
      // Assume 1 tick = 0.5 seconds (2 ticks per second)
      return duration * 2;
    case 'permanent':
      return 999999; // Effectively permanent
  }
}

export class PotionSystem {
  private readonly activeEffects: ActivePotionEffect[] = [];
  private readonly runtime: AlchemyRuntime;
  private readonly recipeManager: RecipeManager;

  constructor(runtime: AlchemyRuntime, recipeManager: RecipeManager) {
    this.runtime = runtime;
    this.recipeManager = recipeManager;
  }

  /** Create a potion from a recipe and rarity */
  createPotion(recipeId: string, rarity: IngredientRarity): Potion | null {
    const recipe = this.recipeManager.getRecipe(recipeId);
    if (!recipe) return null;

    const potionDef = POTION_DEFINITIONS[recipe.resultPotionId];
    if (!potionDef) return null;

    const modifiers = RARITY_MODIFIERS[rarity];
    const effects: PotionEffect[] = potionDef.effects.map((effectType) => {
      const def = POTION_EFFECT_DEFS[effectType];
      return {
        type: effectType,
        magnitude: Math.round(def.defaultMagnitude * modifiers.magnitudeScalar * 100) / 100,
        duration: Math.round(def.defaultDuration * modifiers.durationScalar),
        durationMode: def.defaultDurationMode,
        visualEffect: `${effectType}-${rarity}`,
      };
    });

    const isMythic = recipe.isMythic && Math.random() < modifiers.mythicChance;

    return {
      id: recipe.resultPotionId,
      name: potionDef.name,
      description: potionDef.description,
      effects,
      rarity,
      isMythic,
      mythicEffect: isMythic ? this.generateMythicEffect(recipe, rarity) : undefined,
    };
  }

  /** Generate a mythic effect for a potion */
  private generateMythicEffect(recipe: ReturnType<RecipeManager['getRecipe']>, _rarity: IngredientRarity) {
    if (!recipe) return undefined;

    const baseEffects: Record<string, { type: PotionEffectType; durationTicks: number; parameters?: Record<string, unknown> }> = {
      'potion-mythic-growth': {
        type: 'growth',
        durationTicks: 0, // Permanent
        parameters: { permanent: true, baseLengthBonus: 50 },
      },
      'potion-mythic-phase': {
        type: 'phase',
        durationTicks: 0, // Permanent
        parameters: { permanent: true, phaseAllObstacles: true },
      },
      'potion-mythic-apple-rain': {
        type: 'magnet',
        durationTicks: 120,
        parameters: { appleRain: true, appleCount: 50, radius: 20 },
      },
      'potion-mythic-transformation': {
        type: 'growth',
        durationTicks: 0,
        parameters: { transformation: 'golden-serpent', visualChange: true },
      },
    };

    const effect = baseEffects[recipe.resultPotionId];
    if (!effect) return undefined;

    return {
      id: `mythic-${recipe.id}`,
      name: recipe.name,
      description: recipe.description,
      effectType: this.mapEffectToMythicType(effect.type),
      durationTicks: effect.durationTicks,
      parameters: effect.parameters,
    };
  }

  /** Map potion effect to mythic effect type */
  private mapEffectToMythicType(effectType: PotionEffectType): Potion['mythicEffect']['effectType'] {
    const map: Record<PotionEffectType, Potion['mythicEffect']['effectType']> = {
      growth: 'snakeTransformation',
      phase: 'permanentBiomeChange',
      magnet: 'appleRain',
      timeSlow: 'timeFreeze',
      shadowCloak: 'enemyPacify',
      rainbowTrail: 'worldEvent',
      speedBoost: 'unlockArea',
      sizeShrink: 'grantTitle',
      shield: 'spawnTreasure',
      doubleShards: 'worldEvent',
      gravityReverse: 'worldEvent',
      lucidityBoost: 'worldEvent',
    };
    return map[effectType];
  }

  /** Craft a potion using the recipe manager */
  craftPotion(recipeId: string): CraftResult {
    const recipe = this.recipeManager.getRecipe(recipeId);
    if (!recipe) {
      return { success: false, error: `Recipe "${recipeId}" not found.` };
    }

    if (!this.recipeManager.canCraft(recipe)) {
      return { success: false, error: 'Missing ingredients.' };
    }

    // Consume ingredients
    if (!this.recipeManager.consumeIngredients(recipe)) {
      return { success: false, error: 'Failed to consume ingredients.' };
    }

    // Determine rarity based on ingredients used
    const rarity = this.calculateCraftRarity(recipe);

    // Create the potion
    const potion = this.createPotion(recipeId, rarity);
    if (!potion) {
      return { success: false, error: 'Failed to create potion.' };
    }

    // Add potion to inventory
    this.runtime.addItem(recipe.resultPotionId);

    // Check for experiment discovery
    const discoveredRecipe = this.checkForDiscovery(recipe);

    return {
      success: true,
      recipeId,
      potion,
      discoveredNewRecipe: discoveredRecipe,
    };
  }

  /** Calculate crafting rarity based on ingredient quality */
  private calculateCraftRarity(recipe: ReturnType<RecipeManager['getRecipe']>): IngredientRarity {
    if (!recipe) return 'common';

    for (const { itemId } of recipe.ingredients) {
      // Simplified: use the recipe's minIngredientRarity if set, otherwise default
    }

    if (recipe.minIngredientRarity) {
      return recipe.minIngredientRarity;
    }

    // Default: average of ingredient rarities (simplified)
    return 'common';
  }

  /** Check if crafting this recipe could discover a new experiment */
  private checkForDiscovery(recipe: ReturnType<RecipeManager['getRecipe']>): string | undefined {
    if (!recipe) return undefined;

    // Gather tags from ingredients
    const tags = new Set<string>();
    for (const { itemId: _itemId } of recipe.ingredients) {
      // Would look up ingredient tags here
      tags.add('apple'); // Simplified
    }

    return this.recipeManager.tryDiscoverRecipe(Array.from(tags));
  }

  /** Activate a potion effect */
  activatePotion(potionId: string): boolean {
    const potionDef = POTION_DEFINITIONS[potionId];
    if (!potionDef) return false;

    // Remove the potion from inventory
    this.runtime.consumeItem(potionId);

    // Create active effects
    for (const effectType of potionDef.effects) {
      const def = POTION_EFFECT_DEFS[effectType];
      const activeEffect: ActivePotionEffect = {
        potionId,
        effect: {
          type: effectType,
          magnitude: def.defaultMagnitude,
          duration: def.defaultDuration,
          durationMode: def.defaultDurationMode,
          visualEffect: effectType,
        },
        remainingDuration: durationToTicks(def.defaultDuration, def.defaultDurationMode),
        startTime: Date.now(),
        rarity: 'common',
        isMythic: false,
      };

      this.activeEffects.push(activeEffect);
    }

    return true;
  }

  /** Activate a mythic potion */
  activateMythicPotion(potion: Potion): boolean {
    const success = this.activatePotion(potion.id);
    if (!success) return false;

    // Apply mythic effect immediately
    if (potion.mythicEffect) {
      this.applyMythicEffect(potion.mythicEffect);
    }

    return true;
  }

  /** Apply a mythic potion effect */
  private applyMythicEffect(mythicEffect: NonNullable<Potion['mythicEffect']>): void {
    // This would trigger world-altering events
    // For now, just log and set a flag
    this.runtime.setFlag('mythicEffectApplied', {
      id: mythicEffect.id,
      type: mythicEffect.effectType,
      timestamp: Date.now(),
      parameters: mythicEffect.parameters,
    });
  }

  /** Tick all active effects */
  tickActiveEffects(): void {
    for (let i = this.activeEffects.length - 1; i >= 0; i--) {
      const effect = this.activeEffects[i];
      effect.remainingDuration--;

      if (effect.remainingDuration <= 0) {
        this.activeEffects.splice(i, 1);
      }
    }
  }

  /** Get all active effects of a specific type */
  getActiveEffectsByType(type: PotionEffectType): ActivePotionEffect[] {
    return this.activeEffects.filter((e) => e.effect.type === type);
  }

  /** Get all active effects */
  getAllActiveEffects(): ActivePotionEffect[] {
    return [...this.activeEffects];
  }

  /** Check if a specific effect is active */
  hasActiveEffect(type: PotionEffectType): boolean {
    return this.activeEffects.some((e) => e.effect.type === type);
  }

  /** Get the magnitude of an active effect (taking stacks into account) */
  getEffectMagnitude(type: PotionEffectType): number {
    const effects = this.getActiveEffectsByType(type);
    return effects.reduce((sum, e) => sum + e.effect.magnitude, 0);
  }

  /** Clear all active effects */
  clearAllEffects(): void {
    this.activeEffects.length = 0;
  }

  /** Get effect summary for UI */
  getEffectSummary(): Array<{ type: string; magnitude: number; remaining: number; isMythic: boolean }> {
    return this.activeEffects.map((e) => ({
      type: e.effect.type,
      magnitude: e.effect.magnitude,
      remaining: e.remainingDuration,
      isMythic: e.isMythic,
    }));
  }
}
