import type { Quest } from './quest.js';

/**
 * Offer sources are deliberately narrower than registration. The registry contains
 * every quest so saved runs and authored encounters can resolve their IDs, but
 * being registered does not make a story eligible for a random house or board.
 */
export type QuestOfferSource = 'starting' | 'house' | 'board' | 'town';

// Staged quests instantiate physical objectives tied to the NPC who assigned them.
// The town's dedicated large-job contact remains a valid entry point.
export const STAGED_TOWN_QUEST_IDS = new Set([
  'tax-collector-future-body',
  'green-purchase',
  'find-my-baby',
  'goblin-ledger-debt',
  'freak-you',
]);

// These belong to a particular character/scene. Named encounters and scripted
// gameplay can still invoke offerSpecificQuestById on the authoritative server.
export const NAMED_ENCOUNTER_QUEST_IDS = new Set([
  'explore-6-rooms',       // Lindsey
  'survive-20s-no-eat',   // Aurex
  'tanukis-shenanigans',  // Tanuki
  'kappas-challenge',     // Kappa
  'shrine-maidens-request', // Miko
  'ramen-recipe-hunt',    // The Ramen Master
]);

// Profession, faction, and progression challenges belong on public notices until
// they have a specialist NPC interaction. An arbitrary house sage cannot claim
// to be the archaeologist, shrine maiden, alchemist, or guild official.
export const BOARD_ONLY_QUEST_IDS = new Set([
  'alchemy-basics', 'alchemy-apprentice', 'alchemy-master',
  'animal-ambassador', 'biome-explorer', 'big-catcher',
  'bird-watcher', 'egg-hunter', 'ecosystem-explorer',
  'fisherman', 'garden-tutorial', 'garden-expansion',
  'garden-master', 'garden-companions', 'herd-master',
  'honey-collector', 'kingdom-diplomat', 'legendary-hunter',
  'rare-collector', 'seven-dragon-temples', 'settlement-builder',
  'trade-master', 'wildlife-photographer', 'wolf-tamer',
]);

export function canOfferQuestFromSource(
  quest: Pick<Quest, 'id' | 'acquisition'>,
  source: QuestOfferSource,
): boolean {
  if (quest.acquisition === 'scripted' || NAMED_ENCOUNTER_QUEST_IDS.has(quest.id)) {
    return false;
  }
  if (STAGED_TOWN_QUEST_IDS.has(quest.id)) {
    return source === 'town';
  }
  if (BOARD_ONLY_QUEST_IDS.has(quest.id) || quest.id.startsWith('archaeology.')) {
    return source === 'board';
  }
  return true;
}
