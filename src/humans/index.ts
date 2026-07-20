/**
 * Humans Module
 *
 * The wise old snake was planned to have human interactions but never did.
 * This module brings humans to life in the game world.
 *
 * Exports all human-related types, managers, and utilities.
 */

// Types
export type {
  HumanType,
  HumanDisposition,
  HumanRole,
  HumanDropEntry,
  HumanDefinition,
  HumanInstance,
  HumanStats,
  HumanProfile,
  HumanEncounter,
  HumanRelationship,
  HumanNamePool,
  HumanBiomeSpecialization,
} from './types.js';

// Registry
export {
  HUMAN_DEFINITIONS,
  HUMAN_BIOME_SPECIALIZATIONS,
  getHumanDefinitionsForBiome,
  getHumanDefinitionsForType,
  getHumanTypes,
} from './humanRegistry.js';

// Profiles
export {
  buildHumanStats,
  pickHumanName,
  buildHumanProfile,
  getDispositionForRole,
  clearHumanStatsCache,
} from './humanProfiles.js';

// Portraits
export {
  getHumanPortraitDefinition,
  getHumanPortraits,
  getPortraitsByRole,
  getPortraitsByBiome,
} from './humanPortraits.js';

// Manager
export { HumanManager } from './humanManager.js';

// Encounters
export {
  HUMAN_ENCOUNTERS,
  HUMAN_SHOP_ENCOUNTERS,
  HUMAN_QUEST_ENCOUNTERS,
  HUMAN_DUEL_ENCOUNTERS,
  HUMAN_GOSSIP_ENCOUNTERS,
  HUMAN_ROMANCE_ENCOUNTERS,
  HUMAN_TRIVIA_ENCOUNTERS,
  chooseHumanEncounter,
  getEncounterPages,
  getEncounterStatsNote,
} from './humanEncounters.js';

// Voice
export { HUMAN_VOICE_LINES, selectHumanVoiceLine } from './humanVoice.js';
