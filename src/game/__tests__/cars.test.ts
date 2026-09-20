import { beforeEach, describe, expect, it, vi } from 'vitest';
import { actorIdForTownResident } from '../../actors/actorFactory.js';
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

interface ActiveVehicleSceneStub {
  activeVehicle?: unknown;
  getActiveVehicleSaveData(): unknown;
  setActiveVehicleSaveData(data: unknown): void;
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

  it('routes vehicle room transitions through normal room-entry state without manual resume spam', () => {
    const game = new SnakeGame(defaultGameConfig, new QuestRegistry(), {});
    game.reset();
    game.setFlag('traversal.manualResumePending', undefined);

    game.handlePlayerRoomTransition('0,0,0', '1,0,0', {
      mode: 'vehicle',
      direction: { x: 1, y: 0 },
      localPosition: { x: 1, y: 12 },
    });

    expect(game.getCurrentRoom().id).toBe('1,0,0');
    expect(game.getFlag('roomsVisited')).toBe(2);
    expect(game.getFlag('traversal.manualResumePending')).toBeUndefined();
    expect(game.getApple('1,0,0')).toBeDefined();
  });

  it('rebuilds a contiguous snake body when exiting after vehicle travel', () => {
    const game = new SnakeGame(defaultGameConfig, new QuestRegistry(), {});
    game.reset();
    while (game.getSnakeLength() < 5) {
      game.growSnake(1);
    }

    game.placeSnakeBodyAtLocal('1,0,0', { x: 8, y: 10 }, { x: 1, y: 0 });

    const body = game.getSnakeBody();
    const roomWidth = defaultGameConfig.grid.cols;
    expect(game.getCurrentRoom().id).toBe('1,0,0');
    expect(body).toHaveLength(5);
    expect(body).toEqual([
      { x: roomWidth + 8, y: 10 },
      { x: roomWidth + 7, y: 10 },
      { x: roomWidth + 6, y: 10 },
      { x: roomWidth + 5, y: 10 },
      { x: roomWidth + 4, y: 10 },
    ]);
  });

  it('keeps the hidden driver anchor with the vehicle across multiple rooms before exit', () => {
    const game = new SnakeGame(defaultGameConfig, new QuestRegistry(), {});
    game.reset();
    while (game.getSnakeLength() < 4) {
      game.growSnake(1);
    }

    game.handlePlayerRoomTransition('0,0,0', '1,0,0', {
      mode: 'vehicle',
      direction: { x: 1, y: 0 },
      localPosition: { x: 2, y: 10 },
    });
    game.syncVehicleDriverToLocal('1,0,0', { x: 2.8, y: 10.2 }, { x: 1, y: 0 });
    game.handlePlayerRoomTransition('1,0,0', '2,0,0', {
      mode: 'vehicle',
      direction: { x: 1, y: 0 },
      localPosition: { x: 4, y: 12 },
    });
    game.syncVehicleDriverToLocal('2,0,0', { x: 4.9, y: 12.1 }, { x: 1, y: 0 });

    game.placeSnakeBodyAtLocal('2,0,0', { x: 3, y: 12 }, { x: 1, y: 0 });

    const roomWidth = defaultGameConfig.grid.cols;
    expect(game.getCurrentRoom().id).toBe('2,0,0');
    expect(game.getSnakeBody()).toEqual([
      { x: roomWidth * 2 + 3, y: 12 },
      { x: roomWidth * 2 + 2, y: 12 },
      { x: roomWidth * 2 + 1, y: 12 },
      { x: roomWidth * 2, y: 12 },
    ]);
  });

  it('registers a garage mechanic as a normal shopkeeper NPC with talk and shop verbs', () => {
    const game = new SnakeGame(defaultGameConfig, new QuestRegistry(), {});
    game.reset();
    const startRoom = game.getCurrentRoom();
    startRoom.layout = startRoom.layout.map((row) => '.'.repeat(row.length));

    expect(game.spawnGarage()).toBe(true);
    const room = game.getCurrentRoom();
    expect(room.garage).toBeDefined();

    const garage = room.garage!;
    const actorId = actorIdForTownResident(`garage:${room.id}`, garage.mechanic.id, 'shopkeeper');
    const menu = game.getActorInteractionMenu(actorId);

    expect(game.getActorRole(actorId)).toBe('shopkeeper');
    expect(menu?.options.some((option) => option.id === 'talk')).toBe(true);
    expect(menu?.options.some((option) => option.id === 'shop')).toBe(true);
  });

  it('returns empty vehicle impact telemetry when no entity was hit', () => {
    const game = new SnakeGame(defaultGameConfig, new QuestRegistry(), {});
    game.reset();
    const room = game.getCurrentRoom();
    const occupied = new Set([
      ...game.getEnemies(room.id).map((enemy) => `${enemy.position.x},${enemy.position.y}`),
      ...game.getAnimals(room.id).map((animal) => `${animal.position.x},${animal.position.y}`),
    ]);
    const emptyPosition = room.layout
      .flatMap((row, y) =>
        [...row].map((tile, x) => ({
          tile,
          x,
          y,
        })),
      )
      .find((cell) => cell.tile !== '#' && !occupied.has(`${cell.x},${cell.y}`)) ?? {
      x: 1,
      y: 1,
    };

    expect(game.damageCarImpactAt(room.id, [emptyPosition])).toEqual({
      enemiesHit: 0,
      animalsHit: 0,
      npcsHit: 0,
      defeated: [],
    });
  });

  it('persists active vehicle state separately from parked room cars', () => {
    const scene: ActiveVehicleSceneStub = {
      activeVehicle: {
        id: 'car:test',
        roomId: '1,0,0',
        x: 4.5,
        y: 6.25,
        angle: Math.PI / 2,
        health: 3,
        speed: 7,
      },
      getActiveVehicleSaveData() {
        return this.activeVehicle;
      },
      setActiveVehicleSaveData(data: unknown) {
        this.activeVehicle = data;
      },
    };
    const game = new SnakeGame(defaultGameConfig, new QuestRegistry(), scene);
    game.reset();

    const save = game.getSaveData();

    expect(save.activeVehicle).toEqual(scene.activeVehicle);
  });
});
