import type {
  FishDefinition,
  FishTypeId,
  FishCatchResult,
  FishingState,
  FishingSessionResult,
} from './types.js';
import type { BiomeId } from '../world/biomes.js';
import { FISH_DEFINITIONS, getFishDefinition, pickRandomFish } from './fishDefinitions.js';
import {
  getTensionZone,
  getEscapeChance,
  getLineBreakChance,
  calculateTensionChange,
  getProgressGain,
} from './tensionZones.js';
import { calculateFishSellPrice } from './fishingShopOffers.js';
import type { FishingSpecialModifiers } from '../stats/fishingSpecial.js';
import { applyBonus, applyReduction } from '../stats/statModifiers.js';

export interface FishingRegistryOptions {
  /** Random number generator (0-1) */
  rng: () => number;
  /** Whether debug mode is enabled */
  debug?: boolean;
  /** Runtime SPECIAL-derived modifiers. Defaults to neutral behavior. */
  getModifiers?: () => FishingSpecialModifiers;
}

export class FishingRegistry {
  private readonly rng: () => number;
  private readonly debug: boolean;
  private readonly getModifiers: () => FishingSpecialModifiers;

  constructor(options: FishingRegistryOptions) {
    this.rng = options.rng;
    this.debug = options.debug ?? false;
    this.getModifiers =
      options.getModifiers ??
      (() => ({
        fishingControl: 0,
        fishingStability: 0,
        fishRetention: 0,
        catchProgressBonus: 0,
        rareFishChance: 0,
      }));
  }

  /** Get all fish definitions */
  getFishDefinitions(): readonly FishDefinition[] {
    return FISH_DEFINITIONS;
  }

  /** Get a fish definition by type id */
  getFishDefinition(typeId: string): FishDefinition | undefined {
    return getFishDefinition(typeId);
  }

  /** Get all fish for a biome */
  getFishByBiome(biomeId: BiomeId): readonly FishDefinition[] {
    return FISH_DEFINITIONS.filter((f) => f.biomeId === biomeId);
  }

  /**
   * Pick a random fish for a biome using weighted random selection.
   */
  pickRandomFish(biomeId: BiomeId): FishDefinition | undefined {
    const fish = this.getFishByBiome(biomeId);
    if (fish.length === 0) return undefined;

    const rareFishChance = this.getModifiers().rareFishChance;
    const totalWeight = fish.reduce(
      (sum, entry) => sum + this.getEffectiveFishSpawnWeight(entry, rareFishChance),
      0,
    );
    if (totalWeight <= 0) {
      return pickRandomFish(biomeId, this.rng);
    }

    let roll = this.rng() * totalWeight;
    for (const entry of fish) {
      roll -= this.getEffectiveFishSpawnWeight(entry, rareFishChance);
      if (roll <= 0) return entry;
    }

    return fish[fish.length - 1];
  }

  /**
   * Start a new fishing session.
   * Returns the initial FishingState.
   */
  startFishing(biomeId: BiomeId, fish: FishDefinition): FishingState {
    return {
      tension: 50, // Start in the middle
      fish,
      progress: 0,
      fightTicks: 0,
      struggleDirection: this.rng() < 0.5 ? 1 : -1,
      biomeId,
      escaped: false,
      lineBroken: false,
      complete: false,
    };
  }

  /**
   * Process one tick of the fishing minigame.
   *
   * @param state — current fishing state
   * @param pullDirection — player's input: -1 (left) or 1 (right), 0 (no input)
   * @returns { updatedState, sessionResult }
   */
  tickFishing(
    state: FishingState,
    pullDirection: number,
  ): { state: FishingState; result?: FishingSessionResult } {
    const updated = { ...state };
    updated.fightTicks += 1;

    // Switch struggle direction at interval boundaries
    if (updated.fightTicks > 0 && updated.fightTicks % state.fish.fightStruggleInterval === 0) {
      updated.struggleDirection = this.rng() < 0.5 ? 1 : -1;
    }

    // Calculate tension change from player input
    if (pullDirection !== 0) {
      const control = this.getModifiers().fishingControl;
      updated.tension = calculateTensionChange(
        updated.tension,
        pullDirection,
        updated.struggleDirection,
        Math.max(1, applyReduction(state.fish.difficulty, control)),
      );
    }

    // Get the tension zone
    const zone = getTensionZone(updated.tension);

    // Check for line break (critical zones)
    const modifiers = this.getModifiers();
    const lineBreakChance = applyReduction(getLineBreakChance(zone), modifiers.fishingStability);
    if (lineBreakChance > 0 && this.rng() < lineBreakChance) {
      updated.lineBroken = true;
      updated.complete = true;
      const result: FishingSessionResult = {
        caught: false,
        reason: 'lineBroken',
      };
      return { state: updated, result };
    }

    // Check for escape (critical zones have high escape chance)
    if (zone === 'critical-low' || zone === 'critical-high') {
      if (this.rng() < applyReduction(0.5, modifiers.fishRetention)) {
        updated.escaped = true;
        updated.complete = true;
        const result: FishingSessionResult = {
          caught: false,
          reason: 'escape',
        };
        return { state: updated, result };
      }
    }

    // Check for danger zone escape chance
    if (zone === 'danger-low' || zone === 'danger-high') {
      const dangerEscapeChance = applyReduction(
        getEscapeChance(zone, state.fish.fightAggression),
        modifiers.fishRetention,
      );
      if (this.rng() < dangerEscapeChance) {
        // Small chance of line break in danger
        if (this.rng() < applyReduction(0.01, modifiers.fishingStability)) {
          updated.lineBroken = true;
          updated.complete = true;
          const result: FishingSessionResult = {
            caught: false,
            reason: 'lineBroken',
          };
          return { state: updated, result };
        }
        updated.escaped = true;
        updated.complete = true;
        const result: FishingSessionResult = {
          caught: false,
          reason: 'escape',
        };
        return { state: updated, result };
      }
    }

    // Calculate progress gain
    const progressGain = applyBonus(
      getProgressGain(zone, state.fish.difficulty),
      modifiers.catchProgressBonus,
    );
    updated.progress = Math.min(100, updated.progress + progressGain);

    // Check for successful catch
    if (updated.progress >= 100) {
      updated.complete = true;
      const weight =
        state.fish.minWeight + this.rng() * (state.fish.maxWeight - state.fish.minWeight);
      const weightBonus = Math.floor((weight - state.fish.minWeight) * 0.5);
      const totalScore = state.fish.baseScore + weightBonus;
      const result: FishCatchResult = {
        fish: state.fish,
        weight: Math.round(weight * 100) / 100,
        totalScore,
      };
      const sessionResult: FishingSessionResult = {
        caught: true,
        result,
      };
      return { state: updated, result: sessionResult };
    }

    return { state: updated };
  }

  /**
   * Calculate the sell price for a fish.
   * Formula: max(1, floor(baseScore × RARITY_MULTIPLIERS[rarity] × fishingMod))
   */
  calculateSellPrice(
    baseScore: number,
    rarity: string = 'common',
    fishingMod: number = 1.0,
  ): number {
    return calculateFishSellPrice(baseScore, rarity as any, fishingMod);
  }

  /**
   * Abort a fishing session (player intentionally stops).
   */
  abortFishing(state: FishingState): FishingSessionResult {
    return {
      caught: false,
      reason: 'playerAbort',
    };
  }

  /**
   * Get the tension zone info for the current tension value.
   */
  getTensionInfo(tension: number): {
    zone: string;
    dangerLevel: 'safe' | 'warning' | 'danger' | 'critical';
  } {
    const zone = getTensionZone(tension);
    let dangerLevel: 'safe' | 'warning' | 'danger' | 'critical';
    if (zone === 'safe') {
      dangerLevel = 'safe';
    } else if (zone === 'warning-low' || zone === 'warning-high') {
      dangerLevel = 'warning';
    } else if (zone === 'danger-low' || zone === 'danger-high') {
      dangerLevel = 'danger';
    } else {
      dangerLevel = 'critical';
    }
    return { zone, dangerLevel };
  }

  private getEffectiveFishSpawnWeight(fish: FishDefinition, rareFishChance: number): number {
    if (fish.rarity === 'rare' || fish.rarity === 'legendary') {
      return Math.max(0, fish.spawnWeight * (1 + rareFishChance));
    }
    return Math.max(0, fish.spawnWeight);
  }
}
