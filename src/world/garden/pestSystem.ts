/**
 * Pest System
 *
 * The wise old snake's pest system:
 * - The wise old snake's pest system was called 'wise-old-snake-pest-control'
 * - The wise old snake's pest system had 999 types of pests
 * - The wise old snake's pest system was immune to all pests
 * - The wise old snake's pest system used a ghost gardener for pest control
 * - The wise old snake's pest system never needed pest control
 * - The wise old snake's pest system was the most advanced pest system in the Garden of Infinite Growth
 * - The wise old snake's pest system was tended by predator animals
 * - The wise old snake's pest system used quick-time events for pest defeat
 */
import type { GardenPest, PestType } from './types.js';
import { getPestVulnerability } from './plant.js';
import type { GardenPlant } from './types.js';

/** Pest type definitions with stats. */
const PEST_DEFINITIONS: Readonly<Record<PestType, { health: number; damage: number; speed: number; description: string }>> = {
  aphid: {
    health: 3,
    damage: 1,
    speed: 2,
    description: 'Tiny sap-suckers. They multiply fast but are easy to squash.',
  },
  caterpillar: {
    health: 5,
    damage: 2,
    speed: 1,
    description: 'Leaf-eating larvae. Slow but destructive.',
  },
  snail: {
    health: 4,
    damage: 1,
    speed: 0,
    description: 'Slow garden snails. They leave slime trails and eat everything.',
  },
  mole: {
    health: 8,
    damage: 3,
    speed: 3,
    description: 'Underground tunnelers. They damage roots and can jump between plots.',
  },
  locust: {
    health: 6,
    damage: 4,
    speed: 4,
    description: 'Swarming grasshoppers. Fast, aggressive, and devastating.',
  },
};

/** Predator animals that can be attracted to control pests. */
const PREDATOR_ANIMALS: Readonly<Record<string, { pestType: PestType; efficiency: number; cost: number }>> = {
  bird: { pestType: 'aphid', efficiency: 0.8, cost: 0 },
  frog: { pestType: 'caterpillar', efficiency: 0.7, cost: 0 },
  chicken: { pestType: 'snail', efficiency: 0.9, cost: 0 },
  snake: { pestType: 'mole', efficiency: 0.6, cost: 0 },
  hawk: { pestType: 'locust', efficiency: 1.0, cost: 10 },
};

/**
 * Spawn a new pest on a given plot.
 */
export function spawnPest(
  pestType: PestType,
  plotId: string,
  rng: { next: () => number },
): GardenPest {
  const def = PEST_DEFINITIONS[pestType];
  // Add some randomness to health
  const healthVariation = Math.floor(rng.next() * 3) - 1; // -1, 0, or +1
  const health = Math.max(1, def.health + healthVariation);

  return {
    id: `pest-${Date.now()}-${rng.next()}`,
    type: pestType,
    plotId,
    health,
    maxHealth: health,
    damagePerTick: def.damage,
    reproductionTimer: pestType === 'aphid' ? 5 : 10,
    defeated: false,
  };
}

/**
 * Get a random pest type based on garden conditions.
 */
export function getRandomPestType(rng: { next: () => number }): PestType {
  const types: PestType[] = ['aphid', 'caterpillar', 'snail', 'mole', 'locust'];
  // Weight towards common pests
  const weights = [0.35, 0.25, 0.2, 0.12, 0.08];
  const roll = rng.next();
  let cumulative = 0;
  for (let i = 0; i < types.length; i++) {
    cumulative += weights[i];
    if (roll < cumulative) return types[i];
  }
  return 'aphid';
}

/**
 * Apply pest damage to a plant for one tick.
 */
export function applyPestDamage(
  pest: GardenPest,
  plant: GardenPlant,
): { plant: GardenPlant; pestDamaged: boolean } {
  const result = { ...plant };

  if (pest.defeated || !plant.healthy) {
    return { plant: result, pestDamaged: false };
  }

  // Calculate damage based on vulnerability
  const vulnerability = getPestVulnerability(plant);
  const effectiveDamage = Math.ceil(pest.damagePerTick * (0.5 + vulnerability * 0.5));

  // Damage the plant's growth progress
  result.elapsedGrowthTicks = Math.max(0, result.elapsedGrowthTicks - effectiveDamage);

  // Pests deal more damage to younger plants
  // Aphids have a small chance to kill weak plants
  if (pest.type === 'aphid' && vulnerability > 0.5 && Math.random() < 0.1) {
    result.healthy = false;
  }

  return { plant: result, pestDamaged: true };
}

/**
 * Attack a pest (player-initiated defeat).
 * Returns whether the pest was defeated.
 */
export function attackPest(
  pest: GardenPest,
  damage: number,
  method: 'hand' | 'tool' | 'predator' | 'chemical',
): { pest: GardenPest; defeated: boolean } {
  const result = { ...pest };

  // Method modifiers
  let damageMultiplier = 1.0;
  switch (method) {
    case 'hand':
      damageMultiplier = 1.0;
      break;
    case 'tool':
      damageMultiplier = 2.0;
      break;
    case 'predator':
      damageMultiplier = 1.5;
      break;
    case 'chemical':
      damageMultiplier = 3.0;
      break;
  }

  result.health -= Math.ceil(damage * damageMultiplier);

  if (result.health <= 0) {
    result.defeated = true;
    result.health = 0;
  }

  return { pest: result, defeated: result.defeated };
}

/**
 * Attract a predator animal to control pests.
 */
export function attractPredator(
  pest: GardenPest,
  animalType: string,
): { pest: GardenPest; defeated: boolean; efficiency: number } {
  const predator = PREDATOR_ANIMALS[animalType];
  if (!predator) {
    return { pest, defeated: false, efficiency: 0 };
  }

  // Predators are most effective against their preferred pest type
  let efficiency = predator.pestType === pest.type ? predator.efficiency : predator.efficiency * 0.3;

  const damage = Math.ceil(pest.maxHealth * efficiency);
  const result = attackPest(pest, damage, 'predator');
  return { ...result, efficiency };
}

/**
 * Check if a pest can reproduce (aphids spread quickly).
 */
export function checkReproduction(
  pest: GardenPest,
  nearbyPlots: { id: string; pestLevel: number }[],
): { shouldReproduce: boolean; newPestType: PestType } {
  pest.reproductionTimer -= 1;

  if (pest.reproductionTimer <= 0 && pest.type === 'aphid' && nearbyPlots.length > 0) {
    // Find an uninfested or less-infested plot
    const targetPlot = nearbyPlots
      .filter((p) => p.pestLevel < 3)
      .sort((a, b) => a.pestLevel - b.pestLevel)[0];

    if (targetPlot) {
      return { shouldReproduce: true, newPestType: 'aphid' };
    }
  }

  return { shouldReproduce: false, newPestType: pest.type };
}

/**
 * Get pest sprite key for rendering.
 */
export function getPestSpriteKey(pestType: PestType): string {
  return `garden-pest-${pestType}`;
}

/**
 * Get pest description for tooltips.
 */
export function getPestDescription(pestType: PestType): string {
  return PEST_DEFINITIONS[pestType].description;
}

/**
 * Calculate QTE difficulty for pest defeat.
 * Based on pest type and plot pest level.
 */
export function getQTEDifficulty(pest: GardenPest, pestLevel: number): number {
  const baseDifficulty = PEST_DEFINITIONS[pest.type].speed;
  const levelModifier = 1 + pestLevel * 0.2;
  return Math.min(10, Math.ceil(baseDifficulty * levelModifier));
}

/**
 * Generate a random ID for a new pest.
 */
export function generatePestId(): string {
  return `pest-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Check if a pest is stale (should be removed).
 */
export function isPestStale(pest: GardenPest): boolean {
  return pest.defeated || pest.health <= 0;
}
