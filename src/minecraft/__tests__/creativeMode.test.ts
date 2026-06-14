import { describe, it, expect, vi } from 'vitest';
import { MinecraftPlayer } from '../player.js';
import { isWalkableWithCreativeOverride } from '../player.js';
import { tryBreakBlockCreative, tryPlaceBlockCreative } from '../blockInteraction.js';
import type { RoomSnapshot } from '../../world/types.js';

describe('Creative Mode - Palette', () => {
  it('should have 20 block types in creative palette', () => {
    expect(MinecraftPlayer.CREATIVE_BLOCK_TYPES.length).toBe(20);
  });

  it('should include all expected block types', () => {
    const expected = [
      'dirt', 'grass', 'stone', 'cobblestone', 'sand',
      'gravel', 'wood', 'planks', 'torch', 'glass',
      'furnace', 'chest', 'bed', 'crafting_table', 'pumpkin',
      'iron_block', 'gold_block', 'diamond_ore', 'iron_ore', 'coal_ore',
    ];
    for (const bt of expected) {
      expect(MinecraftPlayer.CREATIVE_BLOCK_TYPES).toContain(bt);
    }
  });
});

describe('Creative Mode - Block Breaking', () => {
  const mockRoom: RoomSnapshot = {
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

  function createMockScene(): any {
    return {
      grid: { cell: 24 },
      snakeGame: { getCurrentRoom: () => mockRoom },
      juice: { blockBreak: vi.fn(), blockPlace: vi.fn() },
    };
  }

  it('should break stone without a pickaxe in creative mode', () => {
    const room: RoomSnapshot = {
      ...mockRoom,
      minecraftBlocks: { '5,0': 'stone' },
    } as any;
    const scene = createMockScene();
    (scene.snakeGame.getCurrentRoom as () => any) = () => room;

    const result = tryBreakBlockCreative(scene as any, 5, 0);
    expect(result.success).toBe(true);
    expect(result.droppedItem).toBeUndefined();
  });

  it('should not drop items in creative mode', () => {
    const room: RoomSnapshot = {
      ...mockRoom,
      minecraftBlocks: { '5,0': 'cobblestone' },
    } as any;
    const scene = createMockScene();
    (scene.snakeGame.getCurrentRoom as () => any) = () => room;

    const player = new MinecraftPlayer();

    tryBreakBlockCreative(scene as any, 5, 0);
    expect(player.getItemCount('cobblestone')).toBe(0);
  });
});

describe('Creative Mode - Walkability', () => {
  it('should walk through placed solid blocks in creative mode', () => {
    const room = {
      id: '0,0,0',
      layout: ['................'],
      portals: [],
      biomeId: 'verdigris-basin' as any,
      biomeTitle: 'Test',
      backgroundColor: 0xffffff,
      wallColor: 0x000000,
      wallOutlineColor: 0x333333,
      minecraftBlocks: { '5,0': 'stone', '6,0': 'cobblestone' },
    } as any;

    expect(isWalkableWithCreativeOverride(room, 5, 0, true)).toBe(true);
    expect(isWalkableWithCreativeOverride(room, 6, 0, true)).toBe(true);
    expect(isWalkableWithCreativeOverride(room, 5, 0, false)).toBe(false);
  });

  it('should not walk through walls in creative mode', () => {
    const room = {
      id: '0,0,0',
      layout: ['##############..'],
      portals: [],
      biomeId: 'verdigris-basin' as any,
      biomeTitle: 'Test',
      backgroundColor: 0xffffff,
      wallColor: 0x000000,
      wallOutlineColor: 0x333333,
      minecraftBlocks: {},
    } as any;

    expect(isWalkableWithCreativeOverride(room, 5, 0, true)).toBe(false);
  });

  it('should not walk through lava in creative mode', () => {
    const room = {
      id: '0,0,0',
      layout: ['................'],
      portals: [],
      biomeId: 'verdigris-basin' as any,
      biomeTitle: 'Test',
      backgroundColor: 0xffffff,
      wallColor: 0x000000,
      wallOutlineColor: 0x333333,
      minecraftBlocks: { '5,0': 'lava' },
    } as any;

    expect(isWalkableWithCreativeOverride(room, 5, 0, true)).toBe(false);
  });
});
