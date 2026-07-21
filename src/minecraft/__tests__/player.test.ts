import { describe, it, expect } from 'vitest';
import {
  MinecraftPlayer,
  isWalkable,
  isWalkableWithCreativeOverride,
  canMineBlock,
  getToolTier,
} from '../player.js';
import type { BiomeId } from '../../world/biomes.js';
import type { RoomSnapshot } from '../../world/types.js';

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
      biomeId: 'verdigris-basin' as BiomeId,
      biomeTitle: 'Test',
      backgroundColor: 0xffffff,
      wallColor: 0x000000,
      wallOutlineColor: 0x333333,
    } as unknown as RoomSnapshot;
    expect(isWalkable(room, 5, 0)).toBe(true);
  });

  it('should not be walkable on wall tile', () => {
    const room = {
      id: '0,0,0',
      layout: ['##############..'],
      portals: [],
      biomeId: 'verdigris-basin' as BiomeId,
      biomeTitle: 'Test',
      backgroundColor: 0xffffff,
      wallColor: 0x000000,
      wallOutlineColor: 0x333333,
    } as unknown as RoomSnapshot;
    expect(isWalkable(room, 5, 0)).toBe(false);
  });

  it('should not be walkable on water tile', () => {
    const room = {
      id: '0,0,0',
      layout: ['~~~...............'],
      portals: [],
      biomeId: 'verdigris-basin' as BiomeId,
      biomeTitle: 'Test',
      backgroundColor: 0xffffff,
      wallColor: 0x000000,
      wallOutlineColor: 0x333333,
    } as unknown as RoomSnapshot;
    expect(isWalkable(room, 2, 0)).toBe(false);
  });

  it('should not be walkable on solid minecraft block', () => {
    const room = {
      id: '0,0,0',
      layout: ['................'],
      portals: [],
      biomeId: 'verdigris-basin' as BiomeId,
      biomeTitle: 'Test',
      backgroundColor: 0xffffff,
      wallColor: 0x000000,
      wallOutlineColor: 0x333333,
      minecraftBlocks: { '5,0': 'stone' },
    } as unknown as RoomSnapshot;
    expect(isWalkable(room, 5, 0)).toBe(false);
  });

  it('should be walkable on transparent minecraft block', () => {
    const room = {
      id: '0,0,0',
      layout: ['................'],
      portals: [],
      biomeId: 'verdigris-basin' as BiomeId,
      biomeTitle: 'Test',
      backgroundColor: 0xffffff,
      wallColor: 0x000000,
      wallOutlineColor: 0x333333,
      minecraftBlocks: { '5,0': 'water' },
    } as unknown as RoomSnapshot;
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

describe('MinecraftPlayer creative mode', () => {
  it('should initialize creativePaletteSlot to 0', () => {
    const player = new MinecraftPlayer();
    expect(player.creativePaletteSlot).toBe(0);
  });

  it('should cycle palette slot forward', () => {
    const player = new MinecraftPlayer();
    player.creativePaletteSlot = 0;
    player.cyclePaletteSlot(1);
    expect(player.creativePaletteSlot).toBe(1);
  });

  it('should wrap backward at start of block list', () => {
    const player = new MinecraftPlayer();
    player.creativePaletteSlot = 0;
    player.cyclePaletteSlot(-1);
    expect(player.creativePaletteSlot).toBe(19);
  });

  it('should handle multiple backward cycles', () => {
    const player = new MinecraftPlayer();
    player.creativePaletteSlot = 0;
    player.cyclePaletteSlot(-5);
    expect(player.creativePaletteSlot).toBe(15);
  });

  it('should have 20 CREATIVE_BLOCK_TYPES', () => {
    expect(MinecraftPlayer.CREATIVE_BLOCK_TYPES.length).toBe(20);
  });

  it('should include all expected block types', () => {
    const expected = [
      'dirt',
      'grass',
      'stone',
      'cobblestone',
      'sand',
      'gravel',
      'wood',
      'planks',
      'torch',
      'glass',
      'furnace',
      'chest',
      'bed',
      'crafting_table',
      'pumpkin',
      'iron_block',
      'gold_block',
      'diamond_ore',
      'iron_ore',
      'coal_ore',
    ];
    for (const bt of expected) {
      expect(MinecraftPlayer.CREATIVE_BLOCK_TYPES).toContain(bt);
    }
  });
});

describe('isWalkableWithCreativeOverride', () => {
  it('should walk over solid blocks in creative mode', () => {
    const room = {
      id: '0,0,0',
      layout: ['................'],
      portals: [],
      biomeId: 'verdigris-basin' as BiomeId,
      biomeTitle: 'Test',
      backgroundColor: 0xffffff,
      wallColor: 0x000000,
      wallOutlineColor: 0x333333,
      minecraftBlocks: { '5,0': 'stone' },
    } as unknown as RoomSnapshot;
    expect(isWalkableWithCreativeOverride(room, 5, 0, true)).toBe(true);
  });

  it('should NOT walk over walls in creative mode', () => {
    const room = {
      id: '0,0,0',
      layout: ['##############..'],
      portals: [],
      biomeId: 'verdigris-basin' as BiomeId,
      biomeTitle: 'Test',
      backgroundColor: 0xffffff,
      wallColor: 0x000000,
      wallOutlineColor: 0x333333,
      minecraftBlocks: {},
    } as unknown as RoomSnapshot;
    expect(isWalkableWithCreativeOverride(room, 5, 0, true)).toBe(false);
  });

  it('should NOT walk over solid blocks in non-creative mode', () => {
    const room = {
      id: '0,0,0',
      layout: ['................'],
      portals: [],
      biomeId: 'verdigris-basin' as BiomeId,
      biomeTitle: 'Test',
      backgroundColor: 0xffffff,
      wallColor: 0x000000,
      wallOutlineColor: 0x333333,
      minecraftBlocks: { '5,0': 'stone' },
    } as unknown as RoomSnapshot;
    expect(isWalkableWithCreativeOverride(room, 5, 0, false)).toBe(false);
  });
});

describe('Armor System', () => {
  it('should start with no armor equipped', () => {
    const player = new MinecraftPlayer();
    expect(player.state.armorPoints).toBe(0);
    expect(player.armorSlots.head).toBeNull();
    expect(player.armorSlots.torso).toBeNull();
    expect(player.armorSlots.legs).toBeNull();
    expect(player.armorSlots.feet).toBeNull();
  });

  it('should equip armor via equipArmor', () => {
    const player = new MinecraftPlayer();
    player.addItem('leather_helmet', 1);
    const success = player.equipArmor('leather_helmet');
    expect(success).toBe(true);
    expect(player.armorSlots.head).toBe('leather_helmet');
    expect(player.state.armorPoints).toBe(2);
    expect(player.getItemCount('leather_helmet')).toBe(0);
  });

  it('should replace existing armor in same slot', () => {
    const player = new MinecraftPlayer();
    player.addItem('leather_helmet', 1);
    player.addItem('iron_helmet', 1);
    player.equipArmor('leather_helmet');
    expect(player.armorSlots.head).toBe('leather_helmet');
    player.equipArmor('iron_helmet');
    expect(player.armorSlots.head).toBe('iron_helmet');
    expect(player.state.armorPoints).toBe(6);
    expect(player.getItemCount('leather_helmet')).toBe(1);
  });

  it('should unequip armor back to inventory', () => {
    const player = new MinecraftPlayer();
    player.addItem('leather_boots', 1);
    player.equipArmor('leather_boots');
    expect(player.getItemCount('leather_boots')).toBe(0);
    player.unequipArmor('feet');
    expect(player.armorSlots.feet).toBeNull();
    expect(player.getItemCount('leather_boots')).toBe(1);
  });

  it('should auto-equip best armor for slot', () => {
    const player = new MinecraftPlayer();
    player.addItem('leather_helmet', 1);
    player.addItem('iron_helmet', 1);
    player.addItem('diamond_helmet', 1);
    const success = player.autoEquipArmor('helmet');
    expect(success).toBe(true);
    expect(player.armorSlots.head).toBe('diamond_helmet');
    expect(player.state.armorPoints).toBe(8);
  });

  it('should fail to auto-equip when no matching armor', () => {
    const player = new MinecraftPlayer();
    player.addItem('cobblestone', 5);
    const success = player.autoEquipArmor('helmet');
    expect(success).toBe(false);
    expect(player.armorSlots.head).toBeNull();
  });

  it('should auto-unequip armor', () => {
    const player = new MinecraftPlayer();
    player.addItem('iron_chestplate', 1);
    player.equipArmor('iron_chestplate');
    expect(player.armorSlots.torso).toBe('iron_chestplate');
    const success = player.autoUnequipArmor('chestplate');
    expect(success).toBe(true);
    expect(player.armorSlots.torso).toBeNull();
    expect(player.getItemCount('iron_chestplate')).toBe(1);
  });

  it('should get equipped armor slot name', () => {
    const player = new MinecraftPlayer();
    expect(player.getArmorSlotName('helmet')).toBeNull();
    player.addItem('diamond_leggings', 1);
    player.equipArmor('diamond_leggings');
    expect(player.getArmorSlotName('leggings')).toBe('diamond_leggings');
  });

  it('should calculate armor reduction correctly', () => {
    const player = new MinecraftPlayer();
    // Full diamond armor = 8 + 20 + 12 + 4 = 44 points
    player.addItem('diamond_helmet', 1);
    player.addItem('diamond_chestplate', 1);
    player.addItem('diamond_leggings', 1);
    player.addItem('diamond_boots', 1);
    player.equipArmor('diamond_helmet');
    player.equipArmor('diamond_chestplate');
    player.equipArmor('diamond_leggings');
    player.equipArmor('diamond_boots');
    expect(player.state.armorPoints).toBe(44);

    // 44/25 = 1.76, capped at 0.8 reduction
    // damage = max(1, floor(10 * 0.2)) = max(1, 2) = 2
    player.takeDamageWithArmor(10);
    expect(player.state.health).toBe(19);
  });
});
