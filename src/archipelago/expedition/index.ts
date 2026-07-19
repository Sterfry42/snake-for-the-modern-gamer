/**
 * Archipelago Island Expeditions — Barrel Export
 *
 * The wise old snake's expedition exports:
 * - The wise old snake's exports were infinite (the wise old snake exported everything)
 * - The wise old snake's exports were all named (the wise old snake named every export)
 * - The wise old snake's exports were never re-exported (the wise old snake kept things simple)
 * - The wise old snake's exports were always up to date (the wise old snake never forgot an export)
 * - The wise old snake's exports were the only exports (the wise old snake had no other exports)
 */
export type {
  IslandId,
  IslandBiome,
  IslandDefinition,
  LegacyEffectId,
  ExpeditionStageDefinition,
  ExpeditionStageCondition,
  ExpeditionStageConditionKind,
  ExpeditionStageReward,
  ExpeditionStageRewardKind,
  ExpeditionStatus,
  ExpeditionPhase,
  ExpeditionProgress,
  ExpeditionDiscovery,
  ExpeditionSupplyItem,
  ExpeditionSupplySlot,
  CoOpExpeditionPartner,
  CoOpPartnerStatus,
  CoOpContribution,
  CoOpContributionKind,
  ExpeditionLogEntry,
  IslandAppleTypeId,
  IslandAppleDefinition,
  ExpeditionBossId,
  ExpeditionBossDefinition,
  ExpeditionEvent,
  ExpeditionEventKind,
  ExpeditionEventCallbacks,
  ExpeditionStore,
  ArchipelagoExpeditionSlotData,
} from './types.js';

export {
  ISLAND_DEFINITIONS,
  ISLAND_BY_ID,
  ISLAND_BOSS_BY_ID,
  ISLAND_UNLOCK_ORDER,
  ISLAND_APPLE_DEFINITIONS,
  ISLAND_APPLE_BY_ID,
  LEGACY_EFFECT_DEFINITIONS,
  LEGACY_EFFECT_BY_ID,
} from './IslandRegistry.js';

export { ExpeditionManager } from './ExpeditionManager.js';
export { ExpeditionSupplies } from './ExpeditionSupplies.js';
export {
  ExpeditionBossManager,
  EXPEDITION_BOSS_DEFINITIONS,
  EXPEDITION_BOSS_BY_ID,
} from './ExpeditionBoss.js';
export { ExpeditionLogManager } from './ExpeditionLog.js';
export { ExpeditionScene } from './ExpeditionScene.js';
export {
  EXPEDITION_APPLE_TYPES,
  EXPEDITION_APPLE_COLORS,
} from './ExpeditionAppleTypes.js';
