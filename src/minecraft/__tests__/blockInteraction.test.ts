import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  tryPlaceBlock,
  tryBreakBlockCreative,
  tryPlaceBlockCreative,
} from '../blockInteraction.js';
import { MinecraftPlayer } from '../player.js';
import type { RoomSnapshot } from '../../world/types.js';
import type { NpcProfile } from '../../npcs/profiles.js';
import type SnakeScene from '../../scenes/snakeScene.js';

// Create a minimal mock scene for testing
function createMockScene(): SnakeScene {
  return {
    grid: { cell: 24 },
    snakeGame: {
      getCurrentRoom: () => mockRoom,
    },
    juice: {
      blockBreak: vi.fn(),
      blockPlace: vi.fn(),
    },
  } as unknown as SnakeScene;
}

function createMockRoom(): RoomSnapshot {
  return {
    id: '0,0,0',
    layout: ['................'],
    portals: [],
    biomeId: 'verdigris-basin',
    biomeTitle: 'Test',
    backgroundColor: 0xffffff,
    wallColor: 0x000000,
    wallOutlineColor: 0x333333,
    minecraftBlocks: {},
  } as unknown as RoomSnapshot;
}

const mockRoom = createMockRoom();

function createMockPlayer(): MinecraftPlayer {
  const player = new MinecraftPlayer();
  player.addItem('cobblestone', 10);
  player.addItem('torch_item', 5);
  return player;
}

beforeEach(() => {
  Object.assign(mockRoom, createMockRoom());
});

describe('Block Interaction - Special Tile Protection', () => {
  it('should not place on portal', () => {
    const room: RoomSnapshot = {
      ...mockRoom,
      portals: [{ x: 5, y: 5, destRoomId: '0,0,1', destX: 10, destY: 10 }],
    } as unknown as RoomSnapshot;

    const scene = createMockScene();
    (scene.snakeGame.getCurrentRoom as () => RoomSnapshot) = () => room;

    const result = tryPlaceBlock(scene as unknown as SnakeScene, createMockPlayer(), 5, 5, 'dirt');
    expect(result.success).toBe(false);
    expect(result.message).toContain('portal');
  });

  it('should not place on shrine maiden', () => {
    const room: RoomSnapshot = {
      ...mockRoom,
      shrine: {
        maiden: { x: 5, y: 5, name: 'Test' } as Partial<NpcProfile & { x: number; y: number }>,
        hasBlessings: false,
      },
    } as unknown as RoomSnapshot;

    const scene = createMockScene();
    (scene.snakeGame.getCurrentRoom as () => RoomSnapshot) = () => room;

    const result = tryPlaceBlock(scene as unknown as SnakeScene, createMockPlayer(), 5, 5, 'dirt');
    expect(result.success).toBe(false);
    expect(result.message).toContain('shrine');
  });

  it('should not place on ramen chef', () => {
    const room: RoomSnapshot = {
      ...mockRoom,
      ramenStand: {
        chef: { x: 5, y: 5, name: 'Chef' } as Partial<NpcProfile & { x: number; y: number }>,
        sellsRamen: true,
      },
    } as unknown as RoomSnapshot;

    const scene = createMockScene();
    (scene.snakeGame.getCurrentRoom as () => RoomSnapshot) = () => room;

    const result = tryPlaceBlock(scene as unknown as SnakeScene, createMockPlayer(), 5, 5, 'dirt');
    expect(result.success).toBe(false);
    expect(result.message).toContain('ramen');
  });

  it('should not place on koi pond center', () => {
    const room: RoomSnapshot = {
      ...mockRoom,
      koiPond: {
        center: { x: 5, y: 5 },
        waterTiles: [{ x: 6, y: 5 }],
      },
    } as unknown as RoomSnapshot;

    const scene = createMockScene();
    (scene.snakeGame.getCurrentRoom as () => RoomSnapshot) = () => room;

    const result = tryPlaceBlock(scene as unknown as SnakeScene, createMockPlayer(), 5, 5, 'dirt');
    expect(result.success).toBe(false);
    expect(result.message).toContain('koi');
  });

  it('should not place on koi pond water tiles', () => {
    const room: RoomSnapshot = {
      ...mockRoom,
      koiPond: {
        center: { x: 3, y: 3 },
        waterTiles: [{ x: 5, y: 5 }],
      },
    } as unknown as RoomSnapshot;

    const scene = createMockScene();
    (scene.snakeGame.getCurrentRoom as () => RoomSnapshot) = () => room;

    const result = tryPlaceBlock(scene as unknown as SnakeScene, createMockPlayer(), 5, 5, 'dirt');
    expect(result.success).toBe(false);
    expect(result.message).toContain('koi');
  });

  it('should not place on McDonalds locations', () => {
    const room: RoomSnapshot = {
      ...mockRoom,
      snakeMcDonalds: {
        cashier: { name: 'Cashier', x: 5, y: 5 },
        toilet: { x: 8, y: 8 },
        bounds: { left: 0, top: 0, width: 24, height: 24 },
      },
    } as unknown as RoomSnapshot;

    const scene = createMockScene();
    (scene.snakeGame.getCurrentRoom as () => RoomSnapshot) = () => room;

    const result1 = tryPlaceBlock(scene as unknown as SnakeScene, createMockPlayer(), 5, 5, 'dirt');
    expect(result1.success).toBe(false);
    expect(result1.message).toContain('McDonalds');

    const result2 = tryPlaceBlock(scene as unknown as SnakeScene, createMockPlayer(), 8, 8, 'dirt');
    expect(result2.success).toBe(false);
    expect(result2.message).toContain('McDonalds');
  });

  it('should not place on quest giver', () => {
    const room: RoomSnapshot = {
      ...mockRoom,
      questGiver: { x: 5, y: 5, name: 'Quest Giver' } as Partial<
        NpcProfile & { x: number; y: number }
      >,
    } as unknown as RoomSnapshot;

    const scene = createMockScene();
    (scene.snakeGame.getCurrentRoom as () => RoomSnapshot) = () => room;

    const result = tryPlaceBlock(scene as unknown as SnakeScene, createMockPlayer(), 5, 5, 'dirt');
    expect(result.success).toBe(false);
    expect(result.message).toContain('quest');
  });

  it('should not place on village residents', () => {
    const room: RoomSnapshot = {
      ...mockRoom,
      village: {
        name: 'Test Village',
        center: { x: 10, y: 10 },
        safeArea: { left: 0, top: 0, width: 24, height: 24 },
        lanterns: [],
        residents: [
          { x: 5, y: 5, name: 'Resident' } as Partial<NpcProfile & { x: number; y: number }>,
        ],
        shopkeeper: { x: 20, y: 20, name: 'Shopkeeper' } as Partial<
          NpcProfile & { x: number; y: number }
        >,
      },
    } as unknown as RoomSnapshot;

    const scene = createMockScene();
    (scene.snakeGame.getCurrentRoom as () => RoomSnapshot) = () => room;

    const result = tryPlaceBlock(scene as unknown as SnakeScene, createMockPlayer(), 5, 5, 'dirt');
    expect(result.success).toBe(false);
    expect(result.message).toContain('village');
  });

  it('should not place on goblin camp guards', () => {
    const room: RoomSnapshot = {
      ...mockRoom,
      goblinCamp: {
        id: 'goblin1',
        name: 'Goblin Camp',
        center: { x: 10, y: 10 },
        safeArea: { left: 0, top: 0, width: 24, height: 24 },
        tents: [],
        fires: [],
        guards: [{ x: 5, y: 5, name: 'Guard' } as Partial<NpcProfile & { x: number; y: number }>],
        shopkeeper: { x: 20, y: 20, name: 'Goblin Shopkeeper' } as Partial<
          NpcProfile & { x: number; y: number }
        >,
      },
    } as unknown as RoomSnapshot;

    const scene = createMockScene();
    (scene.snakeGame.getCurrentRoom as () => RoomSnapshot) = () => room;

    const result = tryPlaceBlock(scene as unknown as SnakeScene, createMockPlayer(), 5, 5, 'dirt');
    expect(result.success).toBe(false);
    expect(result.message).toContain('goblin');
  });
});

describe('Creative Block Breaking', () => {
  it('should break any block without tool requirements', () => {
    const room: RoomSnapshot = {
      ...mockRoom,
      minecraftBlocks: { '5,0': 'diamond_ore' },
    } as unknown as RoomSnapshot;
    const scene = createMockScene();
    (scene.snakeGame.getCurrentRoom as () => RoomSnapshot) = () => room;

    const result = tryBreakBlockCreative(scene as unknown as SnakeScene, 5, 0);
    expect(result.success).toBe(true);
    expect(result.droppedItem).toBeUndefined();
  });

  it('should break special blocks (furnace) in creative mode', () => {
    const room: RoomSnapshot = {
      ...mockRoom,
      minecraftBlocks: { '5,0': 'furnace' },
    } as unknown as RoomSnapshot;
    const scene = createMockScene();
    (scene.snakeGame.getCurrentRoom as () => RoomSnapshot) = () => room;

    const result = tryBreakBlockCreative(scene as unknown as SnakeScene, 5, 0);
    expect(result.success).toBe(true);
    expect(result.droppedItem).toBeUndefined();
  });

  it('should fail when no block at position', () => {
    const room: RoomSnapshot = {
      ...mockRoom,
      minecraftBlocks: {},
    } as unknown as RoomSnapshot;
    const scene = createMockScene();
    (scene.snakeGame.getCurrentRoom as () => RoomSnapshot) = () => room;

    const result = tryBreakBlockCreative(scene as unknown as SnakeScene, 5, 0);
    expect(result.success).toBe(false);
  });

  it('should break cobblestone without a pickaxe in creative mode', () => {
    const room: RoomSnapshot = {
      ...mockRoom,
      minecraftBlocks: { '5,0': 'cobblestone' },
    } as unknown as RoomSnapshot;
    const scene = createMockScene();
    (scene.snakeGame.getCurrentRoom as () => RoomSnapshot) = () => room;

    const result = tryBreakBlockCreative(scene as unknown as SnakeScene, 5, 0);
    expect(result.success).toBe(true);
    expect(result.droppedItem).toBeUndefined();
  });
});

describe('Creative Block Placement', () => {
  it('should place any block type without inventory drain', () => {
    const room: RoomSnapshot = {
      ...mockRoom,
      minecraftBlocks: {},
    } as unknown as RoomSnapshot;
    const scene = createMockScene();
    (scene.snakeGame.getCurrentRoom as () => RoomSnapshot) = () => room;

    const result = tryPlaceBlockCreative(scene as unknown as SnakeScene, 5, 0, 'diamond_ore');
    expect(result.success).toBe(true);
    expect(room.minecraftBlocks!['5,0']).toBe('diamond_ore');
  });

  it('should not place on protected tiles in creative mode', () => {
    const room: RoomSnapshot = {
      ...mockRoom,
      portals: [{ x: 5, y: 5, destRoomId: '0,0,1', destX: 10, destY: 10 }],
    } as unknown as RoomSnapshot;
    const scene = createMockScene();
    (scene.snakeGame.getCurrentRoom as () => RoomSnapshot) = () => room;

    const result = tryPlaceBlockCreative(scene as unknown as SnakeScene, 5, 5, 'dirt');
    expect(result.success).toBe(false);
    expect(result.message).toContain('portal');
  });

  it('should place special blocks in creative mode', () => {
    const room: RoomSnapshot = {
      ...mockRoom,
      minecraftBlocks: {},
    } as unknown as RoomSnapshot;
    const scene = createMockScene();
    (scene.snakeGame.getCurrentRoom as () => RoomSnapshot) = () => room;

    const result = tryPlaceBlockCreative(scene as unknown as SnakeScene, 5, 0, 'furnace');
    expect(result.success).toBe(true);
    expect(room.minecraftBlocks!['5,0']).toBe('furnace');
  });
});
