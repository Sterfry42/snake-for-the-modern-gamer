import { describe, expect, it } from 'vitest';
import { defaultGameConfig } from '../../config/gameConfig.js';
import { getItem } from '../../inventory/itemRegistry.js';
import { QuestRegistry } from '../../quests/questRegistry.js';
import {
  BLACK_MARKET_SUPPLIES,
  ensurePermanentBlackMarketSupplies,
} from '../../shops/villageShop.js';
import {
  HELL_ESCAPE_DEPTH,
  HELL_ESCAPE_HEAT_RESISTANCE_FLAG,
  HELL_ESCAPE_ITEM_ID,
  isOrdinaryPortalDestinationAllowed,
} from '../../world/hellDepth.js';
import { SnakeGame } from '../snakeGame.js';

describe('Get Out of Hell Free', () => {
  it('is a permanent Thieves Guild shop supply', () => {
    expect(getItem(HELL_ESCAPE_ITEM_ID)?.name).toBe('Get Out of Hell Free');
    expect(BLACK_MARKET_SUPPLIES.some((offer) => offer.itemId === HELL_ESCAPE_ITEM_ID)).toBe(true);
    expect(ensurePermanentBlackMarketSupplies({})[HELL_ESCAPE_ITEM_ID]).toBe(1);
    expect(
      ensurePermanentBlackMarketSupplies({ [HELL_ESCAPE_ITEM_ID]: 0 })[HELL_ESCAPE_ITEM_ID],
    ).toBe(1);
  });

  it('reserves depth -1000 from ordinary ladder destinations', () => {
    expect(isOrdinaryPortalDestinationAllowed(`0,0,${HELL_ESCAPE_DEPTH}`)).toBe(false);
    expect(isOrdinaryPortalDestinationAllowed('0,0,-999')).toBe(true);
    expect(isOrdinaryPortalDestinationAllowed('0,0,-1001')).toBe(true);
  });

  it('consumes the card, revives, and teleports to the reserved hot depth', () => {
    const game = new SnakeGame(defaultGameConfig, new QuestRegistry(), {});
    game.getInventory().addItem(HELL_ESCAPE_ITEM_ID, 1);
    game.setFlag('caves.active', { caveId: 'old-cave' });
    game.setFlag('layers.active', { layerId: 'old-layer' });

    expect(game.tryEscapeHellEnding('test')).toBe(true);
    expect(game.getInventory().getItemCount(HELL_ESCAPE_ITEM_ID)).toBe(0);
    expect(game.getCurrentRoom().id).toBe(`0,0,${HELL_ESCAPE_DEPTH}`);
    expect(game.getPlayerHealth().current).toBe(game.getPlayerHealth().max);
    expect(game.getFlag(HELL_ESCAPE_HEAT_RESISTANCE_FLAG)).toBe(1);
    expect(game.getFlag('caves.active')).toBeUndefined();
    expect(game.getFlag('layers.active')).toBeUndefined();
    expect(game.getFlag('traversal.manualResumePending')).toBeUndefined();
    expect(game.tryEscapeHellEnding('test-again')).toBe(false);
  });
});
