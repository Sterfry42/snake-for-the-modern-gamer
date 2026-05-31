import { describe, it, expect } from 'vitest';
import { MinecraftPlayer, isWalkable, canMineBlock, getToolTier } from '../player.js';

describe('MinecraftPlayer', () => {
  it('should create player with default stats', () => {
    const player = new MinecraftPlayer();
    expect(player.state.health).toBe(20);
    expect(player.state.maxHealth).toBe(20);
    expect(player.state.hunger).toBe(20);
    expect(player.state.maxHunger).toBe(20);
    expect(player.state.xp).toBe(0);
    expect(player.state.xpLevel).toBe(0);
    expect(player.state.armorPoints).toBe(0);
  });

  it('should handle damage correctly', () => {
    const player = new MinecraftPlayer();
    player.takeDamage(5);
    expect(player.state.health).toBe(15);
  });

  it('should not drop below 0 health', () => {
    const player = new MinecraftPlayer();
    player.takeDamage(30);
    expect(player.state.health).toBe(0);
  });

  it('should heal up to max health', () => {
    const player = new MinecraftPlayer();
    player.takeDamage(10);
    player.heal(15);
    expect(player.state.health).toBe(20);
  });

  it('should reset health and hunger', () => {
    const player = new MinecraftPlayer();
    player.takeDamage(10);
    player.state.hunger = 5;
    player.reset();
    expect(player.state.health).toBe(20);
    expect(player.state.hunger).toBe(20);
    expect(player.state.xp).toBe(0);
  });

  it('should set spawn point', () => {
    const player = new MinecraftPlayer();
    player.setSpawn(100, 200, '1,2,0');
    expect(player.state.spawnX).toBe(100);
    expect(player.state.spawnY).toBe(200);
    expect(player.state.spawnRoomId).toBe('1,2,0');
  });

  it('should add items to inventory', () => {
    const player = new MinecraftPlayer();
    player.addItem('cobblestone', 5);
    expect(player.getItemCount('cobblestone')).toBe(5);
  });

  it('should remove items from inventory', () => {
    const player = new MinecraftPlayer();
    player.addItem('cobblestone', 3);
    const success = player.removeItem('cobblestone', 2);
    expect(success).toBe(true);
    expect(player.getItemCount('cobblestone')).toBe(1);
  });

  it('should fail to remove non-existent item', () => {
    const player = new MinecraftPlayer();
    const success = player.removeItem('nonexistent');
    expect(success).toBe(false);
  });
});

describe('isWalkable', () => {
  it('should be walkable on empty tile', () => {
    const room = {
      id: '0,0,0',
      layout: ['................'],
      portals: [],
      biomeId: 'verdigris-basin' as any,
      biomeTitle: 'Test',
      backgroundColor: 0xffffff,
      wallColor: 0x000000,
      wallOutlineColor: 0x333333,
    } as any;
    expect(isWalkable(room, 5, 0)).toBe(true);
  });

  it('should not be walkable on wall tile', () => {
    const room = {
      id: '0,0,0',
      layout: ['##############..'],
      portals: [],
      biomeId: 'verdigris-basin' as any,
      biomeTitle: 'Test',
      backgroundColor: 0xffffff,
      wallColor: 0x000000,
      wallOutlineColor: 0x333333,
    } as any;
    expect(isWalkable(room, 5, 0)).toBe(false);
  });

  it('should not be walkable on water tile', () => {
    const room = {
      id: '0,0,0',
      layout: ['~~~...............'],
      portals: [],
      biomeId: 'verdigris-basin' as any,
      biomeTitle: 'Test',
      backgroundColor: 0xffffff,
      wallColor: 0x000000,
      wallOutlineColor: 0x333333,
    } as any;
    expect(isWalkable(room, 2, 0)).toBe(false);
  });

  it('should not be walkable on solid minecraft block', () => {
    const room = {
      id: '0,0,0',
      layout: ['................'],
      portals: [],
      biomeId: 'verdigris-basin' as any,
      biomeTitle: 'Test',
      backgroundColor: 0xffffff,
      wallColor: 0x000000,
      wallOutlineColor: 0x333333,
      minecraftBlocks: { '5,0': 'stone' },
    } as any;
    expect(isWalkable(room, 5, 0)).toBe(false);
  });

  it('should be walkable on transparent minecraft block', () => {
    const room = {
      id: '0,0,0',
      layout: ['................'],
      portals: [],
      biomeId: 'verdigris-basin' as any,
      biomeTitle: 'Test',
      backgroundColor: 0xffffff,
      wallColor: 0x000000,
      wallOutlineColor: 0x333333,
      minecraftBlocks: { '5,0': 'water' },
    } as any;
    expect(isWalkable(room, 5, 0)).toBe(true);
  });
});

describe('canMineBlock', () => {
  it('should mine dirt with any tool', () => {
    expect(canMineBlock('wooden_pickaxe', 'dirt')).toBe(true);
    expect(canMineBlock('stone_pickaxe', 'dirt')).toBe(true);
  });

  it('should not mine stone without pickaxe', () => {
    expect(canMineBlock('wooden_pickaxe', 'stone')).toBe(false);
    expect(canMineBlock('stone_pickaxe', 'stone')).toBe(true);
  });

  it('should not mine iron ore without iron pickaxe', () => {
    expect(canMineBlock('stone_pickaxe', 'iron_ore')).toBe(false);
    expect(canMineBlock('iron_pickaxe', 'iron_ore')).toBe(true);
  });

  it('should not mine diamond ore without diamond pickaxe', () => {
    expect(canMineBlock('iron_pickaxe', 'diamond_ore')).toBe(false);
    expect(canMineBlock('diamond_pickaxe', 'diamond_ore')).toBe(true);
  });
});

describe('getToolTier', () => {
  it('should return correct tier for pickaxes', () => {
    expect(getToolTier('wooden_pickaxe')).toBe(1);
    expect(getToolTier('stone_pickaxe')).toBe(2);
    expect(getToolTier('iron_pickaxe')).toBe(3);
    expect(getToolTier('diamond_pickaxe')).toBe(4);
  });

  it('should return 0 for non-tool items', () => {
    expect(getToolTier('cobblestone')).toBe(0);
    expect(getToolTier('torch_item')).toBe(0);
  });
});
