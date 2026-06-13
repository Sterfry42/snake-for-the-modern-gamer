import type { SnakeGame } from '../game/snakeGame.js';
import type { ArchipelagoReceivedItem } from './archipelagoConnectionTypes.js';
import { AP_ITEM_BY_ID, type ArchipelagoTrapId } from './archipelagoCheckManifest.js';

export interface ArchipelagoItemApplyResult {
  applied: boolean;
  message: string;
  trapId?: ArchipelagoTrapId;
}

export function applyArchipelagoReceivedItem(
  game: SnakeGame,
  item: ArchipelagoReceivedItem,
): ArchipelagoItemApplyResult {
  const definition = AP_ITEM_BY_ID[item.itemId];
  if (!definition) {
    return {
      applied: false,
      message: `Received unknown AP item ${item.itemName} (${item.itemId}).`,
    };
  }

  switch (definition.kind) {
    case 'score-bundle':
      game.grantScore(definition.amount ?? 0);
      return {
        applied: true,
        message: `${definition.name}: +${definition.amount ?? 0} score`,
      };
    case 'length-bundle':
      game.grantSnakeLength(definition.amount ?? 0);
      return {
        applied: true,
        message: `${definition.name}: +${definition.amount ?? 0} length`,
      };
    case 'inventory-item':
      if (!definition.itemId) break;
      game.grantInventoryItem(definition.itemId);
      return {
        applied: true,
        message: `${definition.name} added to your pack.`,
      };
    case 'card':
      if (!definition.cardId) break;
      game.grantCard(definition.cardId);
      return {
        applied: true,
        message: `${definition.name} added to your deck.`,
      };
    case 'artifact':
      if (!definition.artifactId) break;
      game.grantArtifact(definition.artifactId);
      return {
        applied: true,
        message: `${definition.name} recovered.`,
      };
    case 'trap':
      if (!definition.trapId) break;
      return {
        applied: true,
        message: `${definition.name} queued.`,
        trapId: definition.trapId,
      };
    case 'victory':
      return {
        applied: true,
        message: 'Goal complete.',
      };
  }

  return {
    applied: false,
    message: `Received AP item ${definition.name}, but it is missing handler data.`,
  };
}
