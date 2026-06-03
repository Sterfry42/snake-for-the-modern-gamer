import type { MinecraftSaveData } from './types.js';
import { PLAYER_MAX_HEALTH, PLAYER_MAX_HUNGER } from './config.js';
import { RECIPES } from './crafting.js';

export function serializeMinecraftState(
  playerState: {
    health: number;
    maxHealth: number;
    hunger: number;
    maxHunger: number;
    xp: number;
    xpLevel: number;
    armorPoints: number;
    spawnX: number;
    spawnY: number;
    spawnRoomId: string;
    inventory: Array<{ itemId: string; count: number }>;
    equippedTool: string | null;
    armorSlots?: Record<string, string | null>;
  },
  dayNight: { day: number; timeOfDay: number },
  mobs: Array<{ id: string; type: string; roomId: string; x: number; y: number; health: number }>,
  minecraftBlocks: Array<{ roomId: string; x: number; y: number; blockType: string }>,
  dirtyChunks: Array<{ roomId: string; chunkX: number; chunkY: number }>,
  furnaces?: Array<{ x: number; y: number; roomId: string; progress: number; inputItem: string | null; outputItem: string | null; outputCount: number; fuelItem: string | null; fuelRemaining: number; burning: boolean }>,
  chests?: Array<{ x: number; y: number; roomId: string; slots: Array<{ itemId: string; count: number }> }>,
  beds?: Array<{ x: number; y: number; roomId: string; occupied: boolean }>,
): MinecraftSaveData {
  return {
    version: '1.0.0',
    minecraftBlocks,
    playerState: {
      health: playerState.health,
      maxHealth: playerState.maxHealth,
      hunger: playerState.hunger,
      maxHunger: playerState.maxHunger,
      xp: playerState.xp,
      xpLevel: playerState.xpLevel,
      armorPoints: playerState.armorPoints,
      spawnX: playerState.spawnX,
      spawnY: playerState.spawnY,
      spawnRoomId: playerState.spawnRoomId,
      inventory: playerState.inventory,
      equippedTool: playerState.equippedTool,
      armorSlots: playerState.armorSlots ?? { head: null, torso: null, legs: null, feet: null },
    },
    dayNight: {
      day: dayNight.day,
      timeOfDay: dayNight.timeOfDay,
    },
    mobs,
    dirtyChunks,
    furnaces: furnaces ?? [],
    chests: chests ?? [],
    beds: beds ?? [],
  };
}

export function deserializeMinecraftState(data: MinecraftSaveData): MinecraftSaveData {
  return {
    version: data.version ?? '1.0.0',
    minecraftBlocks: data.minecraftBlocks ?? [],
    playerState: {
      health: data.playerState?.health ?? PLAYER_MAX_HEALTH,
      maxHealth: data.playerState?.maxHealth ?? PLAYER_MAX_HEALTH,
      hunger: data.playerState?.hunger ?? PLAYER_MAX_HUNGER,
      maxHunger: data.playerState?.maxHunger ?? PLAYER_MAX_HUNGER,
      xp: data.playerState?.xp ?? 0,
      xpLevel: data.playerState?.xpLevel ?? 0,
      armorPoints: data.playerState?.armorPoints ?? 0,
      spawnX: data.playerState?.spawnX ?? 0,
      spawnY: data.playerState?.spawnY ?? 0,
      spawnRoomId: data.playerState?.spawnRoomId ?? '0,0,0',
      inventory: data.playerState?.inventory ?? [],
      equippedTool: data.playerState?.equippedTool ?? null,
      armorSlots: data.playerState?.armorSlots ?? { head: null, torso: null, legs: null, feet: null },
    },
    dayNight: {
      day: data.dayNight?.day ?? 1,
      timeOfDay: data.dayNight?.timeOfDay ?? 0,
    },
    mobs: data.mobs ?? [],
    dirtyChunks: data.dirtyChunks ?? [],
    furnaces: data.furnaces ?? [],
    chests: data.chests ?? [],
    beds: data.beds ?? [],
  };
}

export function migrateMinecraftState(
  oldPlayerState: {
    health: number;
    maxHealth: number;
    hunger: number;
    maxHunger: number;
    xp: number;
    xpLevel: number;
    armorPoints: number;
    spawnX: number;
    spawnY: number;
    spawnRoomId: string;
    inventory: Array<{ itemId: string; count: number }>;
    equippedTool: string | null;
  },
  oldBlocks?: Array<{ roomId: string; x: number; y: number; blockType: string }>,
  oldDayNight?: { day: number; timeOfDay: number },
  oldMobs?: Array<{ id: string; type: string; roomId: string; x: number; y: number; health: number }>,
): MinecraftSaveData {
  return {
    version: '1.0.0',
    minecraftBlocks: oldBlocks ?? [],
    playerState: {
      health: oldPlayerState.health,
      maxHealth: oldPlayerState.maxHealth,
      hunger: oldPlayerState.hunger,
      maxHunger: oldPlayerState.maxHunger,
      xp: oldPlayerState.xp,
      xpLevel: oldPlayerState.xpLevel,
      armorPoints: oldPlayerState.armorPoints,
      spawnX: oldPlayerState.spawnX,
      spawnY: oldPlayerState.spawnY,
      spawnRoomId: oldPlayerState.spawnRoomId,
      inventory: oldPlayerState.inventory,
      equippedTool: oldPlayerState.equippedTool,
      armorSlots: { head: null, torso: null, legs: null, feet: null },
    },
    dayNight: oldDayNight ?? { day: 1, timeOfDay: 0 },
    mobs: oldMobs ?? [],
    dirtyChunks: [],
    furnaces: [],
    chests: [],
    beds: [],
  };
}

export function getDefaultPlayerState() {
  return {
    health: PLAYER_MAX_HEALTH,
    maxHealth: PLAYER_MAX_HEALTH,
    hunger: PLAYER_MAX_HUNGER,
    maxHunger: PLAYER_MAX_HUNGER,
    xp: 0,
    xpLevel: 0,
    armorPoints: 0,
    spawnX: 0,
    spawnY: 0,
    spawnRoomId: '0,0,0',
    inventory: [] as Array<{ itemId: string; count: number }>,
    equippedTool: null as string | null,
    armorSlots: { head: null, torso: null, legs: null, feet: null } as Record<string, string | null>,
  };
}

export function getDefaultSaveData(): MinecraftSaveData {
  return {
    version: '1.0.0',
    minecraftBlocks: [],
    playerState: getDefaultPlayerState(),
    dayNight: { day: 1, timeOfDay: 0 },
    mobs: [],
    dirtyChunks: [],
    furnaces: [],
    chests: [],
    beds: [],
  };
}
