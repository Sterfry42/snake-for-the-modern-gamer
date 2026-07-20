import type { RoomSnapshot } from '../world/types.js';

// ─── Structure Types ────────────────────────────────────────────────────────

export interface StructurePlacement {
  type: StructureType;
  x: number;
  y: number;
  roomId: string;
  rotation: number;
  scale: number;
}

export type StructureType =
  | 'village_house'
  | 'village_house_large'
  | 'village_house_library'
  | 'village_house_blacksmith'
  | 'village_house_church'
  | 'village_tavern'
  | 'village_farm'
  | 'village_well'
  | 'stronghold_corridor'
  | 'stronghold_room'
  | 'stronghold_library'
  | 'stronghold_prison'
  | 'stronghold_portal_room'
  | 'stronghold_armory'
  | 'village_street'
  | 'village_gate'
  | 'desert_well'
  | 'ocean_ruin'
  | 'abandoned_mine_shaft';

export interface StructureDefinition {
  type: StructureType;
  name: string;
  description: string;
  width: number;
  height: number;
  color: string;
  minDay: number;
  maxDay: number;
  spawnWeight: number;
}

// ─── Structure Definitions ──────────────────────────────────────────────────

export const STRUCTURE_DEFS: Record<StructureType, StructureDefinition> = {
  village_house: {
    type: 'village_house',
    name: 'Village House',
    description: 'A simple village house with a door and window.',
    width: 7,
    height: 5,
    color: '#C19A5B',
    minDay: 1,
    maxDay: 999,
    spawnWeight: 8,
  },
  village_house_large: {
    type: 'village_house_large',
    name: 'Large Village House',
    description: 'A larger house with more rooms.',
    width: 9,
    height: 7,
    color: '#A08040',
    minDay: 3,
    maxDay: 999,
    spawnWeight: 5,
  },
  village_house_library: {
    type: 'village_house_library',
    name: 'Village Library',
    description: 'A library with books and an enchanting table.',
    width: 9,
    height: 7,
    color: '#8B6914',
    minDay: 5,
    maxDay: 999,
    spawnWeight: 3,
  },
  village_house_blacksmith: {
    type: 'village_house_blacksmith',
    name: 'Village Blacksmith',
    description: 'A blacksmith shop with a furnace and anvil.',
    width: 8,
    height: 6,
    color: '#666666',
    minDay: 2,
    maxDay: 999,
    spawnWeight: 4,
  },
  village_house_church: {
    type: 'village_house_church',
    name: 'Village Church',
    description: 'A small church with a bed and altar.',
    width: 10,
    height: 8,
    color: '#E8E4D4',
    minDay: 3,
    maxDay: 999,
    spawnWeight: 2,
  },
  village_tavern: {
    type: 'village_tavern',
    name: 'Village Tavern',
    description: 'A tavern with a table and beds for guests.',
    width: 10,
    height: 8,
    color: '#8B5A2B',
    minDay: 2,
    maxDay: 999,
    spawnWeight: 3,
  },
  village_farm: {
    type: 'village_farm',
    name: 'Village Farm',
    description: 'A wheat farm with farmland and crops.',
    width: 12,
    height: 10,
    color: '#5C3A1E',
    minDay: 1,
    maxDay: 999,
    spawnWeight: 5,
  },
  village_well: {
    type: 'village_well',
    name: 'Village Well',
    description: 'A central well with cobblestone surround.',
    width: 5,
    height: 5,
    color: '#808080',
    minDay: 1,
    maxDay: 999,
    spawnWeight: 6,
  },
  stronghold_corridor: {
    type: 'stronghold_corridor',
    name: 'Stronghold Corridor',
    description: 'A dark corridor in the stronghold.',
    width: 4,
    height: 3,
    color: '#808080',
    minDay: 10,
    maxDay: 999,
    spawnWeight: 6,
  },
  stronghold_room: {
    type: 'stronghold_room',
    name: 'Stronghold Room',
    description: 'A room in the stronghold with chests.',
    width: 7,
    height: 5,
    color: '#666666',
    minDay: 10,
    maxDay: 999,
    spawnWeight: 4,
  },
  stronghold_library: {
    type: 'stronghold_library',
    name: 'Stronghold Library',
    description: 'A library with books and a crafting table.',
    width: 8,
    height: 6,
    color: '#8B6914',
    minDay: 15,
    maxDay: 999,
    spawnWeight: 3,
  },
  stronghold_prison: {
    type: 'stronghold_prison',
    name: 'Stronghold Prison',
    description: 'A prison with iron bars and a dark atmosphere.',
    width: 6,
    height: 5,
    color: '#444444',
    minDay: 12,
    maxDay: 999,
    spawnWeight: 3,
  },
  stronghold_portal_room: {
    type: 'stronghold_portal_room',
    name: 'Portal Room',
    description: 'A room with a portal to the End.',
    width: 9,
    height: 9,
    color: '#000000',
    minDay: 20,
    maxDay: 999,
    spawnWeight: 1,
  },
  stronghold_armory: {
    type: 'stronghold_armory',
    name: 'Stronghold Armory',
    description: 'An armory with weapons and armor.',
    width: 8,
    height: 6,
    color: '#666666',
    minDay: 15,
    maxDay: 999,
    spawnWeight: 3,
  },
  village_street: {
    type: 'village_street',
    name: 'Village Street',
    description: 'A cobblestone street connecting buildings.',
    width: 3,
    height: 15,
    color: '#808080',
    minDay: 1,
    maxDay: 999,
    spawnWeight: 10,
  },
  village_gate: {
    type: 'village_gate',
    name: 'Village Gate',
    description: 'A fortified gate at the village entrance.',
    width: 5,
    height: 5,
    color: '#8B5E3C',
    minDay: 5,
    maxDay: 999,
    spawnWeight: 2,
  },
  desert_well: {
    type: 'desert_well',
    name: 'Desert Well',
    description: 'A well in the desert with sandstone.',
    width: 5,
    height: 5,
    color: '#F4E4A1',
    minDay: 5,
    maxDay: 999,
    spawnWeight: 3,
  },
  ocean_ruin: {
    type: 'ocean_ruin',
    name: 'Ocean Ruin',
    description: 'Ruined stones partially underwater.',
    width: 6,
    height: 4,
    color: '#707070',
    minDay: 10,
    maxDay: 999,
    spawnWeight: 2,
  },
  abandoned_mine_shaft: {
    type: 'abandoned_mine_shaft',
    name: 'Abandoned Mine Shaft',
    description: 'Abandoned mine with tracks and chests.',
    width: 10,
    height: 8,
    color: '#404040',
    minDay: 10,
    maxDay: 999,
    spawnWeight: 2,
  },
};

// ─── Structure Block Patterns ───────────────────────────────────────────────

export interface BlockPattern {
  type: string;
  pattern: string[][];
}

// Village house pattern (7x5)
export const VILLAGE_HOUSE_PATTERN: BlockPattern = {
  type: 'village_house',
  pattern: [
    ['wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall'],
    ['wall', 'door', 'floor', 'floor', 'floor', 'floor', 'wall'],
    ['wall', 'floor', 'floor', 'floor', 'floor', 'floor', 'wall'],
    ['wall', 'floor', 'floor', 'floor', 'floor', 'floor', 'wall'],
    ['wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall'],
  ],
};

// Village house library pattern (9x7)
export const VILLAGE_LIBRARY_PATTERN: BlockPattern = {
  type: 'village_house_library',
  pattern: [
    ['wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall'],
    ['wall', 'door', 'floor', 'floor', 'floor', 'floor', 'floor', 'wall', 'wall'],
    ['wall', 'floor', 'shelf', 'shelf', 'shelf', 'shelf', 'floor', 'wall', 'wall'],
    ['wall', 'floor', 'shelf', 'shelf', 'shelf', 'shelf', 'floor', 'floor', 'floor'],
    ['wall', 'floor', 'floor', 'floor', 'table', 'floor', 'floor', 'floor', 'floor'],
    ['wall', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor'],
    ['wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall'],
  ],
};

// Village blacksmith pattern (8x6)
export const VILLAGE_BLACKSMITH_PATTERN: BlockPattern = {
  type: 'village_house_blacksmith',
  pattern: [
    ['wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall'],
    ['wall', 'door', 'floor', 'floor', 'floor', 'floor', 'floor', 'wall'],
    ['wall', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'wall'],
    ['wall', 'floor', 'floor', 'furnace', 'furnace', 'floor', 'floor', 'wall'],
    ['wall', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'wall'],
    ['wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall'],
  ],
};

// Village well pattern (5x5)
export const VILLAGE_WELL_PATTERN: BlockPattern = {
  type: 'village_well',
  pattern: [
    ['cobblestone', 'cobblestone', 'cobblestone', 'cobblestone', 'cobblestone'],
    ['cobblestone', 'water', 'water', 'water', 'cobblestone'],
    ['cobblestone', 'water', 'water', 'water', 'cobblestone'],
    ['cobblestone', 'water', 'water', 'water', 'cobblestone'],
    ['cobblestone', 'cobblestone', 'cobblestone', 'cobblestone', 'cobblestone'],
  ],
};

// Village farm pattern (12x10)
export const VILLAGE_FARM_PATTERN: BlockPattern = {
  type: 'village_farm',
  pattern: [
    [
      'dirt',
      'dirt',
      'dirt',
      'dirt',
      'dirt',
      'dirt',
      'dirt',
      'dirt',
      'dirt',
      'dirt',
      'dirt',
      'dirt',
    ],
    [
      'dirt',
      'farmland',
      'farmland',
      'farmland',
      'dirt',
      'dirt',
      'dirt',
      'farmland',
      'farmland',
      'farmland',
      'farmland',
      'dirt',
    ],
    [
      'dirt',
      'farmland',
      'farmland',
      'farmland',
      'dirt',
      'dirt',
      'dirt',
      'farmland',
      'farmland',
      'farmland',
      'farmland',
      'dirt',
    ],
    [
      'dirt',
      'farmland',
      'farmland',
      'farmland',
      'dirt',
      'dirt',
      'dirt',
      'farmland',
      'farmland',
      'farmland',
      'farmland',
      'dirt',
    ],
    [
      'dirt',
      'dirt',
      'dirt',
      'dirt',
      'dirt',
      'dirt',
      'dirt',
      'dirt',
      'dirt',
      'dirt',
      'dirt',
      'dirt',
    ],
    [
      'dirt',
      'dirt',
      'dirt',
      'dirt',
      'dirt',
      'dirt',
      'dirt',
      'dirt',
      'dirt',
      'dirt',
      'dirt',
      'dirt',
    ],
    [
      'dirt',
      'dirt',
      'dirt',
      'dirt',
      'dirt',
      'dirt',
      'dirt',
      'dirt',
      'dirt',
      'dirt',
      'dirt',
      'dirt',
    ],
    [
      'dirt',
      'farmland',
      'farmland',
      'farmland',
      'farmland',
      'dirt',
      'dirt',
      'dirt',
      'farmland',
      'farmland',
      'farmland',
      'dirt',
    ],
    [
      'dirt',
      'farmland',
      'farmland',
      'farmland',
      'farmland',
      'dirt',
      'dirt',
      'dirt',
      'farmland',
      'farmland',
      'farmland',
      'dirt',
    ],
    [
      'dirt',
      'dirt',
      'dirt',
      'dirt',
      'dirt',
      'dirt',
      'dirt',
      'dirt',
      'dirt',
      'dirt',
      'dirt',
      'dirt',
    ],
  ],
};

// Stronghold corridor pattern (4x3)
export const STRONGHOLD_CORRIDOR_PATTERN: BlockPattern = {
  type: 'stronghold_corridor',
  pattern: [
    ['cobblestone', 'cobblestone', 'cobblestone', 'cobblestone'],
    ['cobblestone', 'floor', 'floor', 'cobblestone'],
    ['cobblestone', 'floor', 'floor', 'cobblestone'],
  ],
};

// Stronghold room pattern (7x5)
export const STRONGHOLD_ROOM_PATTERN: BlockPattern = {
  type: 'stronghold_room',
  pattern: [
    [
      'cobblestone',
      'cobblestone',
      'cobblestone',
      'cobblestone',
      'cobblestone',
      'cobblestone',
      'cobblestone',
    ],
    ['cobblestone', 'floor', 'floor', 'floor', 'floor', 'floor', 'cobblestone'],
    ['cobblestone', 'floor', 'chest', 'floor', 'chest', 'floor', 'cobblestone'],
    ['cobblestone', 'floor', 'floor', 'floor', 'floor', 'floor', 'cobblestone'],
    [
      'cobblestone',
      'cobblestone',
      'cobblestone',
      'cobblestone',
      'cobblestone',
      'cobblestone',
      'cobblestone',
    ],
  ],
};

// ─── Structure Placement ────────────────────────────────────────────────────

export class StructureManager {
  private placedStructures: Map<string, StructurePlacement> = new Map();

  private toKey(placement: StructurePlacement): string {
    return `${placement.roomId}:${placement.type}:${placement.x},${placement.y}`;
  }

  public placeStructure(
    structureType: StructureType,
    x: number,
    y: number,
    roomId: string,
    rotation: number,
  ): void {
    const placement: StructurePlacement = {
      type: structureType,
      x,
      y,
      roomId,
      rotation,
      scale: 1,
    };
    this.placedStructures.set(this.toKey(placement), placement);
  }

  public getStructure(x: number, y: number, roomId: string): StructurePlacement | null {
    for (const placement of this.placedStructures.values()) {
      if (
        placement.roomId === roomId &&
        x >= placement.x &&
        y >= placement.y &&
        x < placement.x + STRUCTURE_DEFS[placement.type].width &&
        y < placement.y + STRUCTURE_DEFS[placement.type].height
      ) {
        return placement;
      }
    }
    return null;
  }

  public isStructureBlock(x: number, y: number, roomId: string): boolean {
    return this.getStructure(x, y, roomId) !== null;
  }

  public getStructuresInRoom(roomId: string): StructurePlacement[] {
    return Array.from(this.placedStructures.values()).filter((s) => s.roomId === roomId);
  }

  public clear(): void {
    this.placedStructures.clear();
  }

  public destroy(): void {
    this.placedStructures.clear();
  }
}

// ─── Structure Generation ───────────────────────────────────────────────────

export function generateStructureForRoom(
  roomId: string,
  roomWidth: number,
  roomHeight: number,
  day: number,
  seed: number,
): StructurePlacement[] {
  const rng = seededRandom(seed);
  const structures: StructurePlacement[] = [];

  // Calculate how many structures can fit based on room size and day
  const maxStructures = Math.min(5, Math.floor((roomWidth * roomHeight) / 50));
  const numStructures = Math.min(maxStructures, Math.floor(rng() * 3) + 1);

  // Filter structures by day
  const eligibleTypes = Object.values(STRUCTURE_DEFS).filter(
    (def) => day >= def.minDay && day <= def.maxDay,
  );

  for (let i = 0; i < numStructures; i++) {
    const def = eligibleTypes[Math.floor(rng() * eligibleTypes.length)];
    if (!def) continue;

    // Generate random position
    const x = Math.floor(rng() * Math.max(1, roomWidth - def.width));
    const y = Math.floor(rng() * Math.max(1, roomHeight - def.height));

    structures.push({
      type: def.type,
      x,
      y,
      roomId,
      rotation: Math.floor(rng() * 4),
      scale: 1,
    });
  }

  return structures;
}

// ─── Structure Block Filler ─────────────────────────────────────────────────

export function fillStructureBlocks(room: RoomSnapshot, structure: StructurePlacement): void {
  const def = STRUCTURE_DEFS[structure.type];
  if (!def) return;

  // Apply block pattern based on structure type
  const patternMap: Record<StructureType, BlockPattern | null> = {
    village_house: VILLAGE_HOUSE_PATTERN,
    village_house_large: VILLAGE_HOUSE_PATTERN,
    village_house_library: VILLAGE_LIBRARY_PATTERN,
    village_house_blacksmith: VILLAGE_BLACKSMITH_PATTERN,
    village_house_church: VILLAGE_HOUSE_PATTERN,
    village_tavern: VILLAGE_HOUSE_PATTERN,
    village_farm: VILLAGE_FARM_PATTERN,
    village_well: VILLAGE_WELL_PATTERN,
    stronghold_corridor: STRONGHOLD_CORRIDOR_PATTERN,
    stronghold_room: STRONGHOLD_ROOM_PATTERN,
    stronghold_library: VILLAGE_LIBRARY_PATTERN,
    stronghold_prison: STRONGHOLD_CORRIDOR_PATTERN,
    stronghold_portal_room: STRONGHOLD_CORRIDOR_PATTERN,
    stronghold_armory: STRONGHOLD_ROOM_PATTERN,
    village_street: null,
    village_gate: null,
    desert_well: VILLAGE_WELL_PATTERN,
    ocean_ruin: null,
    abandoned_mine_shaft: null,
  };

  const pattern = patternMap[structure.type];
  if (!pattern) {
    // Default: fill with the structure's base color
    fillRectangleBlocks(room, structure.x, structure.y, def.width, def.height, 'cobblestone');
    return;
  }

  // Apply pattern
  for (let py = 0; py < pattern.pattern.length; py++) {
    for (let px = 0; px < pattern.pattern[py].length; px++) {
      const blockType = pattern.pattern[py][px];
      const worldX = structure.x + px;
      const worldY = structure.y + py;

      if (blockType && blockType !== 'floor') {
        setRoomMinecraftBlock(room, worldX, worldY, blockType);
      }
    }
  }
}

function setRoomMinecraftBlock(room: RoomSnapshot, x: number, y: number, blockType: string): void {
  if (!room.minecraftBlocks) {
    room.minecraftBlocks = {};
  }
  room.minecraftBlocks[`${x},${y}`] = blockType;
}

function fillRectangleBlocks(
  room: RoomSnapshot,
  x: number,
  y: number,
  width: number,
  height: number,
  blockType: string,
): void {
  for (let dy = 0; dy < height; dy++) {
    for (let dx = 0; dx < width; dx++) {
      setRoomMinecraftBlock(room, x + dx, y + dy, blockType);
    }
  }
}

// ─── Structure Loot Tables ──────────────────────────────────────────────────

export interface LootEntry {
  itemId: string;
  minCount: number;
  maxCount: number;
  weight: number;
}

export interface LootTable {
  type: StructureType;
  entries: LootEntry[];
}

export const STRUCTURE_LOOT_TABLES: LootTable[] = [
  {
    type: 'village_house',
    entries: [
      { itemId: 'bread', minCount: 1, maxCount: 3, weight: 8 },
      { itemId: 'cobblestone', minCount: 4, maxCount: 8, weight: 7 },
      { itemId: 'stick', minCount: 2, maxCount: 5, weight: 6 },
      { itemId: 'coal', minCount: 1, maxCount: 3, weight: 5 },
      { itemId: 'pumpkin_item', minCount: 1, maxCount: 2, weight: 4 },
    ],
  },
  {
    type: 'village_house_library',
    entries: [
      { itemId: 'book', minCount: 2, maxCount: 5, weight: 8 },
      { itemId: 'coal', minCount: 1, maxCount: 4, weight: 6 },
      { itemId: 'torch_item', minCount: 3, maxCount: 8, weight: 7 },
      { itemId: 'diamond', minCount: 1, maxCount: 2, weight: 2 },
    ],
  },
  {
    type: 'village_house_blacksmith',
    entries: [
      { itemId: 'iron_ingot', minCount: 1, maxCount: 3, weight: 7 },
      { itemId: 'cobblestone', minCount: 5, maxCount: 10, weight: 8 },
      { itemId: 'coal', minCount: 2, maxCount: 5, weight: 7 },
      { itemId: 'raw_iron', minCount: 1, maxCount: 2, weight: 5 },
      { itemId: 'iron_pickaxe', minCount: 1, maxCount: 1, weight: 3 },
    ],
  },
  {
    type: 'village_tavern',
    entries: [
      { itemId: 'bread', minCount: 2, maxCount: 5, weight: 8 },
      { itemId: 'raw_beef', minCount: 1, maxCount: 3, weight: 6 },
      { itemId: 'cooked_beef', minCount: 1, maxCount: 2, weight: 7 },
      { itemId: 'pumpkin_item', minCount: 1, maxCount: 3, weight: 5 },
    ],
  },
  {
    type: 'village_well',
    entries: [
      { itemId: 'gold_ingot', minCount: 1, maxCount: 3, weight: 4 },
      { itemId: 'iron_ingot', minCount: 1, maxCount: 2, weight: 5 },
      { itemId: 'raw_gold', minCount: 1, maxCount: 1, weight: 3 },
      { itemId: 'diamond', minCount: 1, maxCount: 1, weight: 1 },
    ],
  },
  {
    type: 'stronghold_room',
    entries: [
      { itemId: 'iron_ingot', minCount: 1, maxCount: 4, weight: 6 },
      { itemId: 'gold_ingot', minCount: 1, maxCount: 2, weight: 4 },
      { itemId: 'diamond', minCount: 1, maxCount: 3, weight: 2 },
      { itemId: 'coal', minCount: 2, maxCount: 5, weight: 6 },
      { itemId: 'torch_item', minCount: 4, maxCount: 10, weight: 7 },
      { itemId: 'raw_iron', minCount: 1, maxCount: 3, weight: 5 },
      { itemId: 'raw_gold', minCount: 1, maxCount: 2, weight: 3 },
    ],
  },
  {
    type: 'stronghold_library',
    entries: [
      { itemId: 'diamond', minCount: 1, maxCount: 4, weight: 3 },
      { itemId: 'iron_ingot', minCount: 1, maxCount: 3, weight: 5 },
      { itemId: 'gold_ingot', minCount: 1, maxCount: 2, weight: 4 },
      { itemId: 'coal', minCount: 3, maxCount: 8, weight: 6 },
    ],
  },
  {
    type: 'stronghold_prison',
    entries: [
      { itemId: 'iron_ingot', minCount: 2, maxCount: 5, weight: 5 },
      { itemId: 'raw_iron', minCount: 1, maxCount: 3, weight: 4 },
      { itemId: 'leather', minCount: 2, maxCount: 5, weight: 6 },
      { itemId: 'rotten_flesh', minCount: 3, maxCount: 8, weight: 3 },
    ],
  },
  {
    type: 'stronghold_portal_room',
    entries: [
      { itemId: 'diamond', minCount: 2, maxCount: 5, weight: 4 },
      { itemId: 'ender_pearl', minCount: 1, maxCount: 3, weight: 3 },
      { itemId: 'diamond_pickaxe', minCount: 1, maxCount: 1, weight: 2 },
      { itemId: 'iron_ingot', minCount: 3, maxCount: 8, weight: 5 },
      { itemId: 'gold_ingot', minCount: 2, maxCount: 5, weight: 4 },
    ],
  },
  {
    type: 'stronghold_armory',
    entries: [
      { itemId: 'iron_ingot', minCount: 2, maxCount: 6, weight: 7 },
      { itemId: 'raw_iron', minCount: 2, maxCount: 4, weight: 5 },
      { itemId: 'iron_pickaxe', minCount: 1, maxCount: 1, weight: 4 },
      { itemId: 'iron_sword', minCount: 1, maxCount: 1, weight: 3 },
      { itemId: 'iron_chestplate', minCount: 1, maxCount: 1, weight: 2 },
    ],
  },
  {
    type: 'village_farm',
    entries: [
      { itemId: 'wheat', minCount: 3, maxCount: 8, weight: 8 },
      { itemId: 'seeds', minCount: 2, maxCount: 6, weight: 7 },
      { itemId: 'pumpkin_item', minCount: 1, maxCount: 3, weight: 5 },
      { itemId: 'cobblestone', minCount: 2, maxCount: 5, weight: 4 },
    ],
  },
];

// ─── Loot Generation ────────────────────────────────────────────────────────

export function generateLootForStructure(
  structureType: StructureType,
  rng: () => number,
): Array<{ itemId: string; count: number }> {
  const table = STRUCTURE_LOOT_TABLES.find((t) => t.type === structureType);
  if (!table) return [];

  const loot: Array<{ itemId: string; count: number }> = [];

  for (const entry of table.entries) {
    const roll = rng() * 100;
    if (roll >= entry.weight * 10) continue;

    const count = Math.floor(rng() * (entry.maxCount - entry.minCount + 1)) + entry.minCount;
    loot.push({ itemId: entry.itemId, count });
  }

  return loot;
}

// ─── Seeded Random ──────────────────────────────────────────────────────────

export function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) | 0;
    return (state >>> 0) / 4294967296;
  };
}
