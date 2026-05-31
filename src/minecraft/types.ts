import type { Vector2Like } from '../core/math.js';

// ─── Block System ────────────────────────────────────────────────────────────

export type BlockKind = 'solid' | 'transparent' | 'light';

export interface BlockType {
  id: string;
  kind: BlockKind;
  color: string;
  hardness?: number;
  tool?: 'pickaxe' | 'axe';
  drops?: string;
}

export type BlockTypeId =
  | 'dirt'
  | 'grass'
  | 'stone'
  | 'cobblestone'
  | 'wood'
  | 'planks'
  | 'torch'
  | 'lava'
  | 'water'
  | 'glass'
  | 'sand'
  | 'gravel'
  | 'iron_ore'
  | 'coal_ore'
  | 'diamond_ore'
  | 'iron_block'
  | 'gold_block'
  | 'crafting_table';

// ─── Mob System ──────────────────────────────────────────────────────────────

export type MobTypeId = 'zombie' | 'skeleton' | 'creeper' | 'cow';

export interface MobDefinition {
  id: MobTypeId;
  hostile: boolean;
  hp: number;
  speed: number;
  color: string;
  drops?: Array<{ itemId: string; count: number; chance: number }>;
}

export interface MobState {
  id: string;
  type: MobTypeId;
  x: number;
  y: number;
  roomId: string;
  health: number;
  maxHealth: number;
  ai: 'hostile' | 'passive' | 'neutral';
  lastMoveTick: number;
}

// ─── Player State ────────────────────────────────────────────────────────────

export interface MinecraftPlayerState {
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
}

// ─── Chunk System ────────────────────────────────────────────────────────────

export interface ChunkKey {
  roomId: string;
  chunkX: number;
  chunkY: number;
}

export interface BlockData {
  x: number;
  y: number;
  type: string;
}

export interface ChunkState {
  key: ChunkKey;
  blocks: Map<string, string>;
  dirty: boolean;
  loaded: boolean;
}

// ─── Light System ────────────────────────────────────────────────────────────

export type LightSourceType = 'torch' | 'lava';

export interface LightSource {
  x: number;
  y: number;
  roomId: string;
  type: LightSourceType;
  level: number;
}

// ─── Crafting ────────────────────────────────────────────────────────────────

export interface CraftingRecipe {
  id: string;
  name: string;
  result: { itemId: string; count: number };
  ingredients: Array<{ itemId: string; count: number }>;
  craftingTable: boolean;
}

export interface CraftResult {
  success: boolean;
  recipeId?: string;
  message?: string;
}

// ─── Save/Load ───────────────────────────────────────────────────────────────

export interface MinecraftSaveData {
  version: string;
  minecraftBlocks: Array<{ roomId: string; x: number; y: number; blockType: string }>;
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
  };
  dayNight: { day: number; timeOfDay: number };
  mobs: Array<{
    id: string;
    type: string;
    roomId: string;
    x: number;
    y: number;
    health: number;
  }>;
  dirtyChunks: Array<{ roomId: string; chunkX: number; chunkY: number }>;
}
