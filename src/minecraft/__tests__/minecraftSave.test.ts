import { describe, it, expect } from 'vitest';
import {
  serializeMinecraftState,
  deserializeMinecraftState,
  migrateMinecraftState,
  getDefaultSaveData,
} from '../save.js';

describe('Minecraft Save System', () => {
  it('should serialize player state', () => {
    const state = {
      health: 15,
      maxHealth: 20,
      hunger: 18,
      maxHunger: 20,
      xp: 100,
      xpLevel: 3,
      armorPoints: 4,
      spawnX: 100,
      spawnY: 200,
      spawnRoomId: '1,1,0',
      inventory: [{ itemId: 'cobblestone', count: 10 }],
      equippedTool: 'wooden_pickaxe',
    };

    const data = serializeMinecraftState(
      state,
      { day: 5, timeOfDay: 12000 },
      [],
      [{ roomId: '1,1,0', x: 100, y: 200, blockType: 'stone' }],
      [],
    );

    expect(data.playerState.health).toBe(15);
    expect(data.playerState.hunger).toBe(18);
    expect(data.dayNight.day).toBe(5);
    expect(data.dayNight.timeOfDay).toBe(12000);
    expect(data.minecraftBlocks).toHaveLength(1);
  });

  it('should deserialize player state', () => {
    const data: Parameters<typeof deserializeMinecraftState>[0] = {
      version: '1.0.0',
      minecraftBlocks: [],
      playerState: {
        health: 10,
        maxHealth: 20,
        hunger: 15,
        maxHunger: 20,
        xp: 50,
        xpLevel: 2,
        armorPoints: 2,
        spawnX: 50,
        spawnY: 75,
        spawnRoomId: '0,0,0',
        inventory: [],
        equippedTool: null,
        armorSlots: { head: null, torso: null, legs: null, feet: null },
      },
      dayNight: { day: 1, timeOfDay: 0 },
      mobs: [],
      dirtyChunks: [],
      furnaces: [],
      chests: [],
      beds: [],
      creativeMode: false,
      creativePaletteSlot: 0,
    };

    const result = deserializeMinecraftState(data);
    expect(result.playerState.health).toBe(10);
    expect(result.dayNight.day).toBe(1);
    expect(result.mobs).toHaveLength(0);
  });

  it('should use defaults for missing fields', () => {
    const partialData = {
      minecraftBlocks: [],
      playerState: {},
      dayNight: { day: 1, timeOfDay: 0 },
      mobs: [],
      dirtyChunks: [],
    };

    const result = deserializeMinecraftState(partialData as any);
    expect(result.playerState.health).toBe(20);
    expect(result.playerState.hunger).toBe(20);
    expect(result.playerState.xp).toBe(0);
  });

  it('should serialize and deserialize round-trip', () => {
    const state = {
      health: 12,
      maxHealth: 20,
      hunger: 16,
      maxHunger: 20,
      xp: 200,
      xpLevel: 5,
      armorPoints: 6,
      spawnX: 10,
      spawnY: 20,
      spawnRoomId: '2,3,0',
      inventory: [
        { itemId: 'cobblestone', count: 20 },
        { itemId: 'torch_item', count: 5 },
      ],
      equippedTool: 'stone_pickaxe',
    };

    const original = serializeMinecraftState(state, { day: 10, timeOfDay: 8000 }, [], [], []);

    const restored = deserializeMinecraftState(original);
    expect(restored.playerState.health).toBe(12);
    expect(restored.playerState.maxHealth).toBe(20);
    expect(restored.playerState.hunger).toBe(16);
    expect(restored.playerState.xp).toBe(200);
    expect(restored.playerState.xpLevel).toBe(5);
    expect(restored.playerState.spawnX).toBe(10);
    expect(restored.dayNight.day).toBe(10);
    expect(restored.dayNight.timeOfDay).toBe(8000);
  });

  it('should migrate from old data format', () => {
    const oldState = {
      health: 18,
      maxHealth: 20,
      hunger: 20,
      maxHunger: 20,
      xp: 0,
      xpLevel: 0,
      armorPoints: 0,
      spawnX: 0,
      spawnY: 0,
      spawnRoomId: '0,0,0',
      inventory: [],
      equippedTool: null,
    };

    const result = migrateMinecraftState(oldState);
    expect(result.playerState.health).toBe(18);
    expect(result.dayNight.day).toBe(1);
    expect(result.minecraftBlocks).toHaveLength(0);
    expect(result.version).toBe('1.0.0');
  });

  it('should return default save data', () => {
    const data = getDefaultSaveData();
    expect(data.playerState.health).toBe(20);
    expect(data.playerState.hunger).toBe(20);
    expect(data.dayNight.day).toBe(1);
    expect(data.dayNight.timeOfDay).toBe(0);
  });

  it('should serialize mobs', () => {
    const mobs = [
      {
        id: 'mob_123',
        type: 'zombie',
        roomId: '0,0,0',
        x: 10,
        y: 20,
        health: 15,
      },
    ];

    const data = serializeMinecraftState(
      {
        health: 20,
        maxHealth: 20,
        hunger: 20,
        maxHunger: 20,
        xp: 0,
        xpLevel: 0,
        armorPoints: 0,
        spawnX: 0,
        spawnY: 0,
        spawnRoomId: '0,0,0',
        inventory: [],
        equippedTool: null,
      },
      { day: 1, timeOfDay: 0 },
      mobs,
      [],
      [],
    );

    expect(data.mobs).toHaveLength(1);
    expect(data.mobs[0]!.type).toBe('zombie');
    expect(data.mobs[0]!.health).toBe(15);
  });

  it('should serialize dirty chunks', () => {
    const dirtyChunks = [
      { roomId: '0,0,0', chunkX: 0, chunkY: 0 },
      { roomId: '0,0,0', chunkX: 1, chunkY: 1 },
    ];

    const data = serializeMinecraftState(
      {
        health: 20,
        maxHealth: 20,
        hunger: 20,
        maxHunger: 20,
        xp: 0,
        xpLevel: 0,
        armorPoints: 0,
        spawnX: 0,
        spawnY: 0,
        spawnRoomId: '0,0,0',
        inventory: [],
        equippedTool: null,
      },
      { day: 1, timeOfDay: 0 },
      [],
      [],
      dirtyChunks,
    );

    expect(data.dirtyChunks).toHaveLength(2);
    expect(data.dirtyChunks[0]!.chunkX).toBe(0);
    expect(data.dirtyChunks[0]!.chunkY).toBe(0);
  });
});

describe('Creative Mode - Save/Load', () => {
  it('should serialize creative mode state', () => {
    const data = serializeMinecraftState(
      {
        health: 20,
        maxHealth: 20,
        hunger: 20,
        maxHunger: 20,
        xp: 0,
        xpLevel: 0,
        armorPoints: 0,
        spawnX: 0,
        spawnY: 0,
        spawnRoomId: '0,0,0',
        inventory: [],
        equippedTool: null,
      },
      { day: 1, timeOfDay: 0 },
      [],
      [],
      [],
      [],
      [],
      [],
      false,
      3,
    );

    expect(data.creativeMode).toBe(false);
    expect(data.creativePaletteSlot).toBe(3);
  });

  it('should serialize with creative mode enabled', () => {
    const data = serializeMinecraftState(
      {
        health: 20,
        maxHealth: 20,
        hunger: 20,
        maxHunger: 20,
        xp: 0,
        xpLevel: 0,
        armorPoints: 0,
        spawnX: 0,
        spawnY: 0,
        spawnRoomId: '0,0,0',
        inventory: [],
        equippedTool: null,
      },
      { day: 1, timeOfDay: 0 },
      [],
      [],
      [],
      [],
      [],
      [],
      true,
      7,
    );

    expect(data.creativeMode).toBe(true);
    expect(data.creativePaletteSlot).toBe(7);
  });

  it('should deserialize creative mode state with defaults for old saves', () => {
    const oldData: Parameters<typeof deserializeMinecraftState>[0] = {
      version: '1.0.0',
      minecraftBlocks: [],
      playerState: {
        health: 20,
        maxHealth: 20,
        hunger: 20,
        maxHunger: 20,
        xp: 0,
        xpLevel: 0,
        armorPoints: 0,
        spawnX: 0,
        spawnY: 0,
        spawnRoomId: '0,0,0',
        inventory: [],
        equippedTool: null,
        armorSlots: { head: null, torso: null, legs: null, feet: null },
      },
      dayNight: { day: 1, timeOfDay: 0 },
      mobs: [],
      dirtyChunks: [],
      furnaces: [],
      chests: [],
      beds: [],
      creativeMode: true,
      creativePaletteSlot: 7,
    };

    const result = deserializeMinecraftState(oldData);
    expect(result.creativeMode).toBe(true);
    expect(result.creativePaletteSlot).toBe(7);
  });

  it('should default creative mode to false for old saves without creative fields', () => {
    const oldData: any = {
      version: '1.0.0',
      minecraftBlocks: [],
      playerState: {
        health: 20,
        maxHealth: 20,
        hunger: 20,
        maxHunger: 20,
        xp: 0,
        xpLevel: 0,
        armorPoints: 0,
        spawnX: 0,
        spawnY: 0,
        spawnRoomId: '0,0,0',
        inventory: [],
        equippedTool: null,
        armorSlots: { head: null, torso: null, legs: null, feet: null },
      },
      dayNight: { day: 1, timeOfDay: 0 },
      mobs: [],
      dirtyChunks: [],
      furnaces: [],
      chests: [],
      beds: [],
    };

    const result = deserializeMinecraftState(oldData);
    expect(result.creativeMode).toBe(false);
    expect(result.creativePaletteSlot).toBe(0);
  });

  it('should default creative mode in getDefaultSaveData', () => {
    const data = getDefaultSaveData();
    expect(data.creativeMode).toBe(false);
    expect(data.creativePaletteSlot).toBe(0);
  });

  it('should default creative mode in migrateMinecraftState', () => {
    const oldState = {
      health: 18,
      maxHealth: 20,
      hunger: 20,
      maxHunger: 20,
      xp: 0,
      xpLevel: 0,
      armorPoints: 0,
      spawnX: 0,
      spawnY: 0,
      spawnRoomId: '0,0,0',
      inventory: [],
      equippedTool: null,
    };

    const result = migrateMinecraftState(oldState);
    expect(result.creativeMode).toBe(false);
    expect(result.creativePaletteSlot).toBe(0);
  });
});
