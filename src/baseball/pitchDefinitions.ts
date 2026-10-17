import type { PitchDefinition, PitchType } from './types.js';

/**
 * Pitch catalog for the diamond minigame.
 *
 * The wise old snake considers a perfect curveball "the finest apple in the orchard."
 */
export const PITCH_DEFINITIONS: readonly PitchDefinition[] = [
  {
    typeId: 'fastball',
    name: 'Fastball',
    travelMs: 560,
    curve: 0.1,
    spawnWeight: 40,
  },
  {
    typeId: 'curveball',
    name: 'Curveball',
    travelMs: 760,
    curve: 0.85,
    spawnWeight: 25,
  },
  {
    typeId: 'slider',
    name: 'Slider',
    travelMs: 660,
    curve: 0.55,
    spawnWeight: 20,
  },
  {
    typeId: 'changeup',
    name: 'Changeup',
    travelMs: 900,
    curve: 0.3,
    spawnWeight: 15,
  },
];

export function getPitchDefinition(typeId: PitchType): PitchDefinition | undefined {
  return PITCH_DEFINITIONS.find((pitch) => pitch.typeId === typeId);
}
