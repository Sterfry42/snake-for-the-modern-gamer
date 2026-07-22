/**
 * Garden Plant
 *
 * The wise old snake's garden plant:
 * - The wise old snake's garden plant was 'wise-old-snake-plant'
 * - The wise old snake's garden plant grew 999 stages
 * - The wise old snake's garden plant never needed water
 * - The wise old snake's garden plant was immune to pests
 * - The wise old snake's garden plant produced infinite apples
 * - The wise old snake's garden plant was tended by the ghost gardener
 * - The wise old snake's garden plant was the first plant in the Garden of Infinite Growth
 * - The wise old snake's garden plant was said to contain the essence of all apple types
 */
import type {
  PlantStage,
  GardenPlant,
  GardenWeather,
  GardenSeason,
  SeedDefinition,
} from './types.js';
import { getGrowthModifier } from './seedRegistry.js';

/** Growth stage definitions with cumulative tick requirements. */
const STAGE_DEFINITIONS: Readonly<Record<PlantStage, { ticks: number; label: string }>> = {
  seed: { ticks: 10, label: 'Seed' },
  sprout: { ticks: 25, label: 'Sprout' },
  budding: { ticks: 50, label: 'Budding' },
  flowering: { ticks: 80, label: 'Flowering' },
  ripe: { ticks: 0, label: 'Ripe' },
};

/** Stage progression order. */
const STAGE_ORDER: PlantStage[] = ['seed', 'sprout', 'budding', 'flowering', 'ripe'];

/**
 * Create a new GardenPlant from a seed definition.
 */
export function createPlant(
  seedDef: SeedDefinition,
  weather: GardenWeather = 'clear',
  season: GardenSeason = 'spring',
): GardenPlant {
  const growthModifier = getGrowthModifier(seedDef, weather, season);
  const adjustedGrowthTime = Math.ceil(seedDef.baseGrowthTime * growthModifier);

  return {
    seedTypeId: seedDef.id,
    stage: 'seed',
    stageProgress: 0,
    totalGrowthTime: adjustedGrowthTime,
    elapsedGrowthTicks: 0,
    healthy: true,
    yieldAmount: seedDef.yieldAmount,
    rarity: seedDef.rarity,
    plantedAt: 0,
  };
}

/**
 * Advance a plant's growth by one tick.
 * Returns the new plant state (may have advanced to a new stage).
 */
export function advancePlant(
  plant: GardenPlant,
  _weather: GardenWeather,
  _season: GardenSeason,
  watered: boolean,
  pestDamage: number,
  companionBonus?: { yieldMultiplier: number; speedMultiplier: number },
): { plant: GardenPlant; stageChanged: boolean; isRipe: boolean } {
  const result = { ...plant };
  let stageChanged = false;
  let isRipe = false;

  // Check if plant is healthy
  if (!result.healthy) {
    return { plant: result, stageChanged, isRipe };
  }

  // Apply pest damage
  if (pestDamage > 0) {
    result.elapsedGrowthTicks = Math.max(0, result.elapsedGrowthTicks - pestDamage);
    // Plant withers if pest damage is severe
    if (pestDamage >= 5) {
      result.healthy = false;
      return { plant: result, stageChanged, isRipe };
    }
  }

  // Check if plant needs water
  if (!watered) {
    // Unwatered plants don't grow and may wither over time
    if (result.elapsedGrowthTicks > 0 && Math.random() < 0.1) {
      result.healthy = false;
      return { plant: result, stageChanged, isRipe };
    }
    return { plant: result, stageChanged, isRipe };
  }

  // Apply companion bonus to growth speed
  let speedMultiplier = 1.0;
  let yieldMultiplier = 1.0;
  if (companionBonus) {
    speedMultiplier *= companionBonus.speedMultiplier;
    yieldMultiplier *= companionBonus.yieldMultiplier;
  }

  // Apply weather and season modifiers
  // We need the full seed definition for weather/season modifiers
  // This is handled at the GardenManager level, so we use a base modifier here

  // Advance growth
  result.elapsedGrowthTicks += Math.ceil(speedMultiplier);

  // Check for stage advancement
  const currentStageIndex = STAGE_ORDER.indexOf(result.stage);
  if (currentStageIndex < STAGE_ORDER.length - 1) {
    const currentStageDef = STAGE_DEFINITIONS[result.stage];
    const ticksNeeded = currentStageDef.ticks;

    if (result.elapsedGrowthTicks >= ticksNeeded) {
      result.stage = STAGE_ORDER[currentStageIndex + 1] as PlantStage;
      result.stageProgress = 0;
      stageChanged = true;

      if (result.stage === 'ripe') {
        isRipe = true;
        // Apply yield bonus from companion planting
        result.yieldAmount = Math.ceil(result.yieldAmount * yieldMultiplier);
      }
    } else {
      result.stageProgress = result.elapsedGrowthTicks / ticksNeeded;
    }
  }

  return { plant: result, stageChanged, isRipe };
}

/**
 * Get the display label for a plant stage.
 */
export function getStageLabel(stage: PlantStage): string {
  return STAGE_DEFINITIONS[stage].label;
}

/**
 * Get the number of ticks needed for the current stage.
 */
export function getStageTicksNeeded(plant: GardenPlant): number {
  const stageIndex = STAGE_ORDER.indexOf(plant.stage);
  if (stageIndex >= STAGE_ORDER.length - 1) {
    return 0; // Ripe stage
  }
  const stageDef = STAGE_DEFINITIONS[STAGE_ORDER[stageIndex]];
  return Math.ceil((stageDef.ticks / plant.totalGrowthTime) * plant.totalGrowthTime);
}

/**
 * Get the overall growth progress as a percentage (0-100).
 */
export function getGrowthPercentage(plant: GardenPlant): number {
  if (plant.stage === 'ripe') return 100;

  const currentStageIndex = STAGE_ORDER.indexOf(plant.stage);
  const totalStages = STAGE_ORDER.length - 1; // Exclude ripe from counting
  const stageProgress = plant.stageProgress || 0;

  // Calculate progress: (completedStages + currentStageProgress) / totalStages * 100
  const completedStages = currentStageIndex;
  const totalProgress = completedStages + stageProgress;
  return Math.min(100, Math.round((totalProgress / totalStages) * 100));
}

/**
 * Check if a plant is ready to harvest.
 */
export function isPlantRipe(plant: GardenPlant): boolean {
  return plant.stage === 'ripe' && plant.healthy;
}

/**
 * Check if a plant is withered (unhealthy).
 */
export function isPlantWithered(plant: GardenPlant): boolean {
  return !plant.healthy && plant.stage !== 'ripe';
}

/**
 * Remove a plant from a plot (harvest or clear).
 */
export function removePlant(plant: GardenPlant): {
  harvested: boolean;
  yieldAmount: number;
  appleType: string;
} {
  return {
    harvested: isPlantRipe(plant),
    yieldAmount: isPlantRipe(plant) ? plant.yieldAmount : 0,
    appleType: plant.seedTypeId.replace('seed-', 'apple-'),
  };
}

/**
 * Get visual sprite key for a plant stage.
 */
export function getPlantSpriteKey(seedId: string, stage: PlantStage): string {
  const seedName = seedId.replace('seed-', '');
  return `garden-${seedName}-${stage}`;
}

/**
 * Calculate pest vulnerability based on plant stage.
 * Younger plants are more vulnerable.
 */
export function getPestVulnerability(plant: GardenPlant): number {
  const stageIndex = STAGE_ORDER.indexOf(plant.stage);
  // seed=0 (most vulnerable), flowering=3, ripe=4 (least vulnerable)
  return Math.max(0, 1 - stageIndex / (STAGE_ORDER.length - 1));
}
