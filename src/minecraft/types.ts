// ─── Block System ────────────────────────────────────────────────────────────

export type BlockKind = 'solid' | 'transparent' | 'light' | 'crop' | 'special';

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
  | 'crafting_table'
  | 'furnace'
  | 'chest'
  | 'bed'
  | 'pumpkin'
  | 'farmland'
  | 'wheat_crop';

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
  lastAttackTick: number;
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
  tickDelayScalar?: number;
  strengthBonus?: number;
  regenerationActive?: boolean;
  regenerationTicks?: number;
  regenerationRate?: number;
  fireResistant?: boolean;
  waterBreathing?: boolean;
  invisible?: boolean;
  nightVision?: boolean;
  nightVisionIntensity?: number;
  jumpBoost?: boolean;
  jumpBoostLevel?: number;
  absorptionHearts?: number;
  hasteActive?: boolean;
  damageResistance?: boolean;
  enchantedItems?: Array<{
    itemId: string;
    enchantments: Map<string, number>;
    enchantmentLevel: number;
  }>;

  fishingRodDurability?: Record<string, number>;
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
    armorSlots: Record<string, string | null>;
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
  furnaces: Array<{
    x: number;
    y: number;
    roomId: string;
    progress: number;
    inputItem: string | null;
    outputItem: string | null;
    outputCount: number;
    fuelItem: string | null;
    fuelRemaining: number;
    burning: boolean;
  }>;
  chests: Array<{
    x: number;
    y: number;
    roomId: string;
    slots: Array<{ itemId: string; count: number }>;
  }>;
  beds: Array<{ x: number; y: number; roomId: string; occupied: boolean }>;
  creativeMode: boolean;
  creativePaletteSlot: number;
}
