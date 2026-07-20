import {
  biomeCountsAs,
  getBiomeClimateClass,
  type BiomeDefinition,
  type BiomeFamily,
  type BiomeId,
  type ClimateClass,
} from '../biomes.js';

export interface BiomeCompatibilityResult {
  compatible: boolean;
  reason?: string;
  requiresTransition?: 'shoreline' | 'forest-threshold' | 'cave-mouth' | 'blocked';
}

const HOT_CLASSES: ReadonlySet<ClimateClass> = new Set(['hot']);
const COLD_CLASSES: ReadonlySet<ClimateClass> = new Set(['cold', 'frigid']);

function hasFamily(id: BiomeId, family: BiomeFamily): boolean {
  return biomeCountsAs(id, family);
}

export function areBiomesCompatible(
  first: BiomeDefinition,
  second: BiomeDefinition,
): BiomeCompatibilityResult {
  if (first.id === second.id) {
    return { compatible: true };
  }

  const firstClass = getBiomeClimateClass(first.id);
  const secondClass = getBiomeClimateClass(second.id);
  if (
    (HOT_CLASSES.has(firstClass) && COLD_CLASSES.has(secondClass)) ||
    (HOT_CLASSES.has(secondClass) && COLD_CLASSES.has(firstClass))
  ) {
    return { compatible: false, reason: 'hot-cold-direct-adjacency' };
  }

  if (hasFamily(first.id, 'ocean') || hasFamily(second.id, 'ocean')) {
    return { compatible: true, requiresTransition: 'shoreline' };
  }

  if (hasFamily(first.id, 'forest') || hasFamily(second.id, 'forest')) {
    return { compatible: true, requiresTransition: 'forest-threshold' };
  }

  if (hasFamily(first.id, 'cave') !== hasFamily(second.id, 'cave')) {
    return { compatible: true, requiresTransition: 'cave-mouth' };
  }

  return { compatible: true };
}
