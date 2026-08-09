import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultGameConfig } from '../../config/gameConfig.js';
import type { Vector2Like } from '../../core/math.js';
import { QuestRegistry } from '../../quests/questRegistry.js';
import { CAR_HEIGHT_TILES, CAR_WIDTH_TILES } from '../../vehicles/car.js';
import { getCarCollisionCells } from '../../vehicles/carPhysics.js';
import { SnakeGame } from '../snakeGame.js';

interface ApplePlacementAccess {
  apples: {
    placeApple(roomId: string, position: Vector2Like, type: string, snake?: Vector2Like[]): void;
  };
}

beforeEach(() => {
  const storage = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
    clear: () => storage.clear(),
  });
});

describe('vehicle runtime', () => {
  it('lets a 2x3 car pick up apples through its collision footprint', () => {
    const game = new SnakeGame(defaultGameConfig, new QuestRegistry(), {});
    game.reset();
    const roomId = game.getCurrentRoom().id;
    const applePosition = { x: 12, y: 11 };
    const room = game.getRoom(roomId);
    const rows = room.layout.map((row) => row.split(''));
    for (let y = 10; y < 10 + CAR_HEIGHT_TILES; y += 1) {
      for (let x = 10; x < 10 + CAR_WIDTH_TILES; x += 1) {
        rows[y]![x] = '.';
      }
    }
    rows[applePosition.y]![applePosition.x] = '.';
    room.layout = rows.map((row) => row.join(''));
    (game as unknown as ApplePlacementAccess).apples.placeApple(roomId, applePosition, 'normal', [
      ...game.getSnakeBody(),
    ]);
    const lengthBefore = game.getSnakeLength();

    const result = game.consumeAppleAtForVehicle(
      roomId,
      getCarCollisionCells({ x: 10, y: 10, angle: Math.PI / 4 }),
      { x: 1, y: 0 },
    );

    expect(result.eaten).toBe(true);
    expect(result.typeId).toBe('normal');
    expect(result.roomsChanged.has(roomId)).toBe(true);
    expect(game.getSnakeLength()).toBeGreaterThan(lengthBefore);
    expect(game.getApple(roomId)?.position).not.toEqual(applePosition);
  });
});
