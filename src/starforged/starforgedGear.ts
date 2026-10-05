/**
 * GEAR
 *
 * The gear table is stored per slot in ./gearData and reassembled here in the
 * historical round-robin order. Array order is load-bearing: the fallback
 * reward table consumes `STARFORGED_GEAR.slice(0, 6)`, so do not reorder.
 */
import type { StarforgedGearDefinition, StarforgedSlot } from './starforgedTypes.js';
import { ARTIFACT_GEAR } from './gearData/artifact.js';
import { BOOTS_GEAR } from './gearData/boots.js';
import { CHEST_GEAR } from './gearData/chest.js';
import { CLASS_ITEM_GEAR } from './gearData/classItem.js';
import { ENERGY_GEAR } from './gearData/energy.js';
import { GAUNTLETS_GEAR } from './gearData/gauntlets.js';
import { HEAVY_GEAR } from './gearData/heavy.js';
import { HELMET_GEAR } from './gearData/helmet.js';
import { KINETIC_GEAR } from './gearData/kinetic.js';

/** Historical slot rotation order for the merged gear table. */
const GEAR_SLOT_ORDER: readonly StarforgedSlot[] = [
  'kinetic',
  'energy',
  'heavy',
  'helmet',
  'gauntlets',
  'chest',
  'boots',
  'classItem',
  'artifact',
];

const GEAR_BY_SLOT: Record<StarforgedSlot, readonly StarforgedGearDefinition[]> = {
  kinetic: KINETIC_GEAR,
  energy: ENERGY_GEAR,
  heavy: HEAVY_GEAR,
  helmet: HELMET_GEAR,
  gauntlets: GAUNTLETS_GEAR,
  chest: CHEST_GEAR,
  boots: BOOTS_GEAR,
  classItem: CLASS_ITEM_GEAR,
  artifact: ARTIFACT_GEAR,
};

/** Reassemble the per-slot tables in the round-robin order the table shipped in. */
function mergeGearTables(): StarforgedGearDefinition[] {
  const merged: StarforgedGearDefinition[] = [];
  const longest = GEAR_SLOT_ORDER.reduce(
    (max, slot) => Math.max(max, GEAR_BY_SLOT[slot].length),
    0,
  );
  for (let round = 0; round < longest; round += 1) {
    for (const slot of GEAR_SLOT_ORDER) {
      const gear = GEAR_BY_SLOT[slot][round];
      if (gear) {
        merged.push(gear);
      }
    }
  }
  return merged;
}

export const STARFORGED_GEAR: readonly StarforgedGearDefinition[] = mergeGearTables();
