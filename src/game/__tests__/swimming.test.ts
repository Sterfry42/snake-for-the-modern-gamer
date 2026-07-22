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
  it('allows three baseline water steps, warns progressively, then drowns on the fourth', () => {
    const game = new SnakeGame(defaultGameConfig, new QuestRegistry(), {});
    game.forceDirection(1, 0);
    const head = game.getSnakeBody()[0]!;
    const room = game.getCurrentRoom();
    room.apple = undefined;
    room.apples = [];
    for (let offset = 1; offset <= 4; offset += 1) {
      const info = game.resolveRoomPosition({ x: head.x + offset, y: head.y })!;
      const row = room.layout[info.localY]!;
      room.layout[info.localY] = `${row.slice(0, info.localX)}~${row.slice(info.localX + 1)}`;
    }

    expect(game.actionStep(false).status).toBe('alive');
    expect(game.getFlag('ui.drowning')).toMatchObject({ remaining: 2, total: 3 });
    expect(game.actionStep(false).status).toBe('alive');
    expect(game.getFlag('ui.drowning')).toMatchObject({ remaining: 1, total: 3 });
    expect(game.actionStep(false).status).toBe('alive');
    expect(game.getFlag('ui.drowning')).toMatchObject({ remaining: 0, total: 3 });
    expect(game.actionStep(false).status).toBe('alive');
    expect(game.actionStep(false).status).toBe('alive');
    expect(game.actionStep(false).status).toBe('dead');
  });

  it('lets unified resurrection invulnerability cross water with no breath remaining', () => {
    const game = new SnakeGame(defaultGameConfig, new QuestRegistry(), {});
    const { before } = floodNextTile(game);
    game.setFlag('traversal.buoyancyCapacity', 3);
    game.setFlag('traversal.buoyancyRemaining', 0);
    game.setFlag('fortitude.invulnerabilityTicks', 5);

    expect(((game as unknown) as { getImminentLethalStep(): { key: string; graceTicks: number } | null }).getImminentLethalStep()).toBeNull();
    const result = game.actionStep(false);

    expect(result.status).toBe('alive');
    expect(game.getSnakeBody()[0]).toEqual({ x: before.x + 1, y: before.y });
    expect(game.getFlag('ui.drowning')).toBeUndefined();
  });
  it('does not spend lethal-step grace when swimming gear makes the next water tile safe', () => {
    const game = new SnakeGame(defaultGameConfig, new QuestRegistry(), {});
    const { before } = floodNextTile(game);
    game.setFlag('equipment.swimmingEnabled', true);

    expect(((game as unknown) as { getImminentLethalStep(): { key: string; graceTicks: number } | null }).getImminentLethalStep()).toBeNull();
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

    expect(((game as unknown) as { getImminentLethalStep(): { key: string; graceTicks: number } | null }).getImminentLethalStep()).toBeNull();
    const result = game.actionStep(false);

    expect(result.status).toBe('alive');
    expect(game.getSnakeBody()[0]).toEqual({ x: before.x + 1, y: before.y });
    expect(game.getFlag('equipment.swimmingEnabled')).toBe(true);
  });
});
