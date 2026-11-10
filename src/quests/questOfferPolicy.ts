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
export const SCRIPTED_QUEST_IDS = new Set(['deep-lying-bouquet']);

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
  'alchemy-basics',
  'alchemy-apprentice',
  'alchemy-master',
  'animal-ambassador',
  'biome-explorer',
  'big-catcher',
  'bird-watcher',
  'egg-hunter',
  'ecosystem-explorer',
  'fisherman',
  'buy-2-upgrades',
  'buy-4-upgrades',
  'garden-tutorial',
  'garden-expansion',
  'garden-master',
  'garden-companions',
  'herd-master',
  'honey-collector',
  'kingdom-diplomat',
  'legendary-hunter',
  'rare-collector',
  'seven-dragon-temples',
  'settlement-builder',
  'trade-master',
  'wildlife-photographer',
  'wolf-tamer',
  'tame-the-fox',
]);

// Positive list: a newly added quest is NOT automatically something a random
// person in a house (or the starting quest lottery) is permitted to narrate.
// New content must deliberately opt into this ambient category.
export const AMBIENT_HOUSE_QUEST_IDS = new Set([
  'eat-5-apples',
  'eat-12-apples',
  'explore-10-rooms',
  'hunt-rabbit',
  'bear-hunter',
  'hide-collector',
  'score-50',
  'reach-length-10',
  'reach-length-15',
  'speed-snacker',
  'room-dasher',
  'room-sprint',
  'treasure-hunter',
  'loot-and-power',
  'powerup-fiend',
]);

export function canOfferQuestFromSource(
  quest: Pick<Quest, 'id' | 'acquisition'>,
  source: QuestOfferSource,
): boolean {
  if (
    quest.acquisition === 'scripted' ||
    SCRIPTED_QUEST_IDS.has(quest.id) ||
    NAMED_ENCOUNTER_QUEST_IDS.has(quest.id)
  ) {
    return false;
  }
  if (STAGED_TOWN_QUEST_IDS.has(quest.id)) {
    return source === 'town';
  }
  if (BOARD_ONLY_QUEST_IDS.has(quest.id) || quest.id.startsWith('archaeology.')) {
    return source === 'board';
  }
  if (source === 'town') return false;
  if (source === 'house' || source === 'starting') {
    return AMBIENT_HOUSE_QUEST_IDS.has(quest.id);
  }
  // A future quest must explicitly opt in rather than appearing on every
  // noticeboard simply because somebody added it to the registry.
  return source === 'board' && AMBIENT_HOUSE_QUEST_IDS.has(quest.id);
}
