import type { SnakeGame } from '../game/snakeGame.js';
import type { ArchipelagoReceivedItem } from './archipelagoConnectionTypes.js';
import { AP_PHASE_1_ITEM_BY_ID } from './archipelagoCheckManifest.js';

export interface ArchipelagoItemApplyResult {
  applied: boolean;
  message: string;
}

export function applyArchipelagoReceivedItem(
  game: SnakeGame,
  item: ArchipelagoReceivedItem,
): ArchipelagoItemApplyResult {
  const definition = AP_PHASE_1_ITEM_BY_ID[item.itemId];
  if (!definition) {
    return {
      applied: false,
      message: `Received unknown AP item ${item.itemName} (${item.itemId}).`,
    };
  }

  game.addScore(definition.amount);
  return {
    applied: true,
    message: `${definition.name}: +${definition.amount} score`,
  };
}
