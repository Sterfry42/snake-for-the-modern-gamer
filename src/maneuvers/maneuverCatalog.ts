import type { ManeuverDefinition, ManeuverId } from './maneuverTypes.js';

export const MANEUVER_SHARED_COOLDOWN_STEPS = 24;
export const MANEUVER_PRICE_SCORE = 1000;

export const MANEUVER_DEFINITIONS: readonly ManeuverDefinition[] = [
  {
    id: 'dash',
    name: 'Dash',
    shortLabel: 'DASH',
    description: 'Burst seven validated tiles straight ahead.',
    priceScore: MANEUVER_PRICE_SCORE,
    cooldownSteps: MANEUVER_SHARED_COOLDOWN_STEPS,
    activationMode: 'press',
    distanceTiles: 7,
  },
  {
    id: 'ghost',
    name: 'Ghost',
    shortLabel: 'GHOST',
    description: 'Phase with revival-style protection for eight normal steps.',
    priceScore: MANEUVER_PRICE_SCORE,
    cooldownSteps: MANEUVER_SHARED_COOLDOWN_STEPS,
    activationMode: 'press',
    durationSteps: 8,
  },
  {
    id: 'sidewinder',
    name: 'Sidewinder',
    shortLabel: 'SIDE',
    description: 'Shift three tiles to a relative side while preserving facing.',
    priceScore: MANEUVER_PRICE_SCORE,
    cooldownSteps: MANEUVER_SHARED_COOLDOWN_STEPS,
    activationMode: 'modifier-direction',
    distanceTiles: 3,
  },
  {
    id: 'rewind',
    name: 'Rewind',
    shortLabel: 'REW',
    description: 'Restore snake position, facing, and hearts from ten tiles back.',
    priceScore: MANEUVER_PRICE_SCORE,
    cooldownSteps: MANEUVER_SHARED_COOLDOWN_STEPS,
    activationMode: 'press',
    historySteps: 10,
  },
];

export const MANEUVER_IDS = MANEUVER_DEFINITIONS.map((definition) => definition.id);

const DEFINITION_BY_ID = new Map(
  MANEUVER_DEFINITIONS.map((definition) => [definition.id, definition]),
);

export function isManeuverId(value: unknown): value is ManeuverId {
  return typeof value === 'string' && DEFINITION_BY_ID.has(value as ManeuverId);
}

export function getManeuverDefinition(id: ManeuverId): ManeuverDefinition {
  const definition = DEFINITION_BY_ID.get(id);
  if (!definition) {
    throw new Error(`Unknown maneuver id: ${id}`);
  }
  return definition;
}

export function getManeuverTrainerAssignment(
  stableTownId: string,
  discoveryIndex?: number,
): ManeuverId {
  if (discoveryIndex !== undefined && Number.isFinite(discoveryIndex) && discoveryIndex >= 0) {
    return MANEUVER_IDS[Math.floor(discoveryIndex) % MANEUVER_IDS.length];
  }
  let hash = 0;
  for (let i = 0; i < stableTownId.length; i += 1) {
    hash = (hash * 31 + stableTownId.charCodeAt(i)) >>> 0;
  }
  return MANEUVER_IDS[hash % MANEUVER_IDS.length];
}

export function validateManeuverCatalog(): void {
  const seen = new Set<ManeuverId>();
  for (const definition of MANEUVER_DEFINITIONS) {
    if (seen.has(definition.id)) throw new Error(`Duplicate maneuver id: ${definition.id}`);
    seen.add(definition.id);
    if (definition.priceScore !== MANEUVER_PRICE_SCORE) {
      throw new Error(`${definition.id} must cost ${MANEUVER_PRICE_SCORE}`);
    }
    if (definition.cooldownSteps !== MANEUVER_SHARED_COOLDOWN_STEPS) {
      throw new Error(`${definition.id} must use the shared cooldown`);
    }
    if (
      definition.activationMode !== 'press' &&
      definition.activationMode !== 'modifier-direction'
    ) {
      throw new Error(`${definition.id} has an invalid activation mode`);
    }
    for (const key of ['distanceTiles', 'durationSteps', 'historySteps'] as const) {
      const value = definition[key];
      if (value !== undefined && (!Number.isFinite(value) || value <= 0)) {
        throw new Error(`${definition.id} has invalid ${key}`);
      }
    }
  }
}
