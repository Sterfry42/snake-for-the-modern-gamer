import { describe, expect, it } from 'vitest';
import { defaultGameConfig } from '../../config/gameConfig.js';
import { QuestRegistry } from '../../quests/questRegistry.js';
import { SnakeGame } from '../snakeGame.js';

function floodNextTile(game: SnakeGame): { before: { x: number; y: number } } {
  game.forceDirection(1, 0);
  const before = { ...game.getSnakeBody()[0]! };
  const target = { x: before.x + 1, y: before.y };
  const info = game.resolveRoomPosition(target)!;
  const room = game.getCurrentRoom();
  room.apple = undefined;
  room.apples = [];
  room.powerup = undefined;
  const row = room.layout[info.localY];
  room.layout[info.localY] = `${row.slice(0, info.localX)}~${row.slice(info.localX + 1)}`;
  return { before };
}

describe('SnakeGame swimming grace', () => {
  it('does not spend lethal-step grace when swimming gear makes the next water tile safe', () => {
    const game = new SnakeGame(defaultGameConfig, new QuestRegistry(), {});
    const { before } = floodNextTile(game);
    game.setFlag('equipment.swimmingEnabled', true);

    expect((game as any).getImminentLethalStep()).toBeNull();
    const result = game.actionStep(false);

    expect(result.status).toBe('alive');
    expect(game.getSnakeBody()[0]).toEqual({ x: before.x + 1, y: before.y });
    expect(game.getFlag('ui.swimSplash')).toMatchObject({
      x: before.x + 1,
      y: before.y,
    });
  });

  it('uses equipped swimming modifiers before the scene refreshes equipment flags', () => {
    const game = new SnakeGame(defaultGameConfig, new QuestRegistry(), {});
    const { before } = floodNextTile(game);
    const inventory = game.getInventory();
    inventory.addItem('boots-swim-fins', 1);
    expect(inventory.equip('boots-swim-fins')).toBe(true);
    game.setFlag('equipment.swimmingEnabled', undefined);

    expect((game as any).getImminentLethalStep()).toBeNull();
    const result = game.actionStep(false);

    expect(result.status).toBe('alive');
    expect(game.getSnakeBody()[0]).toEqual({ x: before.x + 1, y: before.y });
    expect(game.getFlag('equipment.swimmingEnabled')).toBe(true);
  });
});
