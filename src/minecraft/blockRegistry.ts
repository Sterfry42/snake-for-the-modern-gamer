import type { BlockType } from './types.js';

const BLOCK_DEFINITIONS: BlockType[] = [
  { id: 'dirt', kind: 'solid', color: '#8B6914', hardness: 1 },
  { id: 'grass', kind: 'solid', color: '#5B8C2A', hardness: 1 },
  { id: 'stone', kind: 'solid', color: '#808080', hardness: 3, tool: 'pickaxe' },
  { id: 'cobblestone', kind: 'solid', color: '#6B6B6B', hardness: 3 },
  { id: 'wood', kind: 'solid', color: '#6B4226', hardness: 2, tool: 'axe' },
  { id: 'planks', kind: 'solid', color: '#C19A5B', hardness: 2, tool: 'axe' },
  { id: 'torch', kind: 'light', color: '#FFD700', hardness: 0 },
  { id: 'lava', kind: 'light', color: '#FF4500', hardness: 0 },
  { id: 'water', kind: 'transparent', color: '#1E90FF', hardness: 0 },
  { id: 'glass', kind: 'transparent', color: '#ADD8E6', hardness: 1 },
  { id: 'sand', kind: 'solid', color: '#F4E4A1', hardness: 1 },
  { id: 'gravel', kind: 'solid', color: '#8C8C8C', hardness: 2 },
  { id: 'iron_ore', kind: 'solid', color: '#A0A0A0', hardness: 5, tool: 'pickaxe' },
  { id: 'coal_ore', kind: 'solid', color: '#404040', hardness: 4, tool: 'pickaxe' },
  { id: 'diamond_ore', kind: 'solid', color: '#00CED1', hardness: 7, tool: 'pickaxe' },
  { id: 'iron_block', kind: 'solid', color: '#D4D4D4', hardness: 5, tool: 'pickaxe' },
  { id: 'gold_block', kind: 'solid', color: '#FFD700', hardness: 5, tool: 'pickaxe' },
  { id: 'crafting_table', kind: 'solid', color: '#8B5E3C', hardness: 2, tool: 'axe' },
  { id: 'furnace', kind: 'solid', color: '#808080', hardness: 3.5, tool: 'pickaxe' },
  { id: 'chest', kind: 'solid', color: '#9C6C28', hardness: 2 },
  { id: 'bed', kind: 'solid', color: '#CC0000', hardness: 1 },
  { id: 'pumpkin', kind: 'solid', color: '#E8872A', hardness: 2 },
  { id: 'farmland', kind: 'solid', color: '#5C3A1E', hardness: 1 },
  { id: 'wheat_crop', kind: 'crop', color: '#D4C44A', hardness: 0 },
  // Structural blocks
  { id: 'bookshelf', kind: 'solid', color: '#C19A5B', hardness: 2, tool: 'axe' },
  { id: 'brick', kind: 'solid', color: '#8B4513', hardness: 4, tool: 'pickaxe' },
  { id: 'sandstone', kind: 'solid', color: '#E8D4A1', hardness: 2 },
  { id: 'obsidian', kind: 'solid', color: '#1A0A2E', hardness: 10, tool: 'pickaxe' },
  { id: 'iron_bars', kind: 'transparent', color: '#C0C0C0', hardness: 1 },
  { id: 'door', kind: 'transparent', color: '#6B4226', hardness: 1, tool: 'axe' },
  { id: 'ladder', kind: 'transparent', color: '#8B6914', hardness: 0 },
  { id: 'anvil', kind: 'solid', color: '#404040', hardness: 6, tool: 'pickaxe' },
  { id: 'enchanting_table', kind: 'special', color: '#4A0E4E', hardness: 5, tool: 'pickaxe' },
  { id: 'brewing_stand', kind: 'special', color: '#552200', hardness: 1 },
  { id: 'cauldron', kind: 'special', color: '#505050', hardness: 3, tool: 'pickaxe' },
  // Nether blocks
  { id: 'netherrack', kind: 'solid', color: '#8B2500', hardness: 1 },
  { id: 'nether_wart_block', kind: 'solid', color: '#CC2200', hardness: 1 },
  { id: 'soul_sand', kind: 'solid', color: '#333333', hardness: 1 },
  { id: 'glowstone', kind: 'light', color: '#FFCC00', hardness: 1 },
  { id: 'quartz_block', kind: 'solid', color: '#F5F5DC', hardness: 2 },
  // End blocks
  { id: 'end_stone', kind: 'solid', color: '#E8D4A1', hardness: 3 },
  { id: 'ender_chest', kind: 'special', color: '#2A0A4A', hardness: 3 },
  { id: 'purpur_block', kind: 'solid', color: '#DDAADD', hardness: 3 },
  // Ores
  { id: 'redstone_ore', kind: 'solid', color: '#FF0000', hardness: 4, tool: 'pickaxe' },
  { id: 'lapis_ore', kind: 'solid', color: '#0000FF', hardness: 5, tool: 'pickaxe' },
  { id: 'emerald_ore', kind: 'solid', color: '#00FF00', hardness: 5, tool: 'pickaxe' },
  // More wood types
  { id: 'spruce_wood', kind: 'solid', color: '#5B3A1A', hardness: 2, tool: 'axe' },
  { id: 'birch_wood', kind: 'solid', color: '#E8D4A1', hardness: 2, tool: 'axe' },
  { id: 'oak_planks', kind: 'solid', color: '#C19A5B', hardness: 2, tool: 'axe' },
  { id: 'dark_oak_planks', kind: 'solid', color: '#4A3728', hardness: 2, tool: 'axe' },
  // Decorative
  { id: 'flower_pot', kind: 'special', color: '#8B6914', hardness: 0.5 },
  { id: 'cactus', kind: 'solid', color: '#228B22', hardness: 0.5 },
  { id: 'sugar_cane', kind: 'solid', color: '#90EE90', hardness: 0.3 },
  { id: 'reeds', kind: 'solid', color: '#90EE90', hardness: 0.3 },
  { id: 'tnt', kind: 'special', color: '#FF0000', hardness: 0 },
  // Misc blocks
  { id: 'ice', kind: 'transparent', color: '#ADD8FF', hardness: 0.5 },
  { id: 'packed_ice', kind: 'solid', color: '#B0D4F1', hardness: 3 },
  { id: 'snow', kind: 'transparent', color: '#FFFFFF', hardness: 0.1 },
  { id: 'clay', kind: 'solid', color: '#B0B0C0', hardness: 1.5 },
  { id: 'mossy_cobblestone', kind: 'solid', color: '#6B8B4B', hardness: 3 },
  { id: 'polished_granite', kind: 'solid', color: '#A08070', hardness: 3 },
  { id: 'polished_diorite', kind: 'solid', color: '#C0C0C0', hardness: 3 },
  { id: 'polished_andesite', kind: 'solid', color: '#909090', hardness: 3 },
  { id: 'shulker_box', kind: 'solid', color: '#DDAADD', hardness: 2 },
  { id: 'loom', kind: 'special', color: '#8B5E3C', hardness: 2 },
  { id: 'cartography_table', kind: 'special', color: '#8B5E3C', hardness: 2 },
  { id: 'fletching_table', kind: 'special', color: '#8B5E3C', hardness: 2 },
  { id: 'smithing_table', kind: 'special', color: '#8B5E3C', hardness: 2 },
  { id: 'grindstone', kind: 'special', color: '#808080', hardness: 2 },
  // Crop blocks
  { id: 'beetroot', kind: 'crop', color: '#CC0000', hardness: 0 },
  { id: 'carrot', kind: 'crop', color: '#FF8C00', hardness: 0 },
  { id: 'potato', kind: 'crop', color: '#8B6914', hardness: 0 },
  { id: 'sugar_cane_block', kind: 'crop', color: '#90EE90', hardness: 0.3 },
  // Special
  { id: 'structure_block', kind: 'special', color: '#444444', hardness: 0 },
  { id: 'concrete_white', kind: 'solid', color: '#FFFFFF', hardness: 2 },
  { id: 'concrete_gray', kind: 'solid', color: '#808080', hardness: 2 },
  { id: 'concrete_black', kind: 'solid', color: '#1A1A1A', hardness: 2 },
  { id: 'concrete_red', kind: 'solid', color: '#CC0000', hardness: 2 },
  { id: 'concrete_blue', kind: 'solid', color: '#0000CC', hardness: 2 },
  { id: 'concrete_green', kind: 'solid', color: '#00CC00', hardness: 2 },
  { id: 'concrete_yellow', kind: 'solid', color: '#CCCC00', hardness: 2 },
  { id: 'concrete_purple', kind: 'solid', color: '#8800CC', hardness: 2 },
  { id: 'concrete_cyan', kind: 'solid', color: '#00CCCC', hardness: 2 },
  { id: 'concrete_pink', kind: 'solid', color: '#FF69B4', hardness: 2 },
  { id: 'wool_white', kind: 'solid', color: '#FFFFFF', hardness: 0.8 },
  { id: 'wool_red', kind: 'solid', color: '#CC0000', hardness: 0.8 },
  { id: 'wool_blue', kind: 'solid', color: '#0000CC', hardness: 0.8 },
  { id: 'wool_green', kind: 'solid', color: '#00CC00', hardness: 0.8 },
];

const BLOCK_MAP = new Map<string, BlockType>(BLOCK_DEFINITIONS.map((b) => [b.id, b]));

export function getBlockType(id: string): BlockType | undefined {
  return BLOCK_MAP.get(id);
}

export function getBlockTypes(): BlockType[] {
  return BLOCK_DEFINITIONS;
}

export function blockIdToColor(id: string): string {
  return BLOCK_MAP.get(id)?.color ?? '#FF00FF';
}

export function isSolidBlock(id: string): boolean {
  const bt = BLOCK_MAP.get(id);
  return bt !== undefined && bt.kind === 'solid';
}

export function isLightSource(id: string): boolean {
  const bt = BLOCK_MAP.get(id);
  return bt !== undefined && bt.kind === 'light';
}

export function getBlockHardness(id: string): number {
  return BLOCK_MAP.get(id)?.hardness ?? 1;
}

export function getBlockTool(id: string): 'pickaxe' | 'axe' | undefined {
  return BLOCK_MAP.get(id)?.tool;
}

export function getBlockDrops(id: string): string {
  const bt = BLOCK_MAP.get(id);
  return bt?.drops ?? id;
}

export function isMinecraftBlockType(id: string): boolean {
  return BLOCK_MAP.has(id);
}

export function isCropBlock(id: string): boolean {
  const bt = BLOCK_MAP.get(id);
  return bt !== undefined && bt.kind === 'crop';
}

export function isSpecialBlock(id: string): boolean {
  const bt = BLOCK_MAP.get(id);
  return bt !== undefined && bt.kind === 'special';
}

export function isPlaceableSpecialBlock(id: string): boolean {
  return [
    'furnace',
    'chest',
    'bed',
    'crafting_table',
    'enchanting_table',
    'brewing_stand',
    'cauldron',
    'ender_chest',
  ].includes(id);
}

export function isBlockableBlock(id: string): boolean {
  // Blocks that prevent player movement
  const bt = BLOCK_MAP.get(id);
  if (!bt) return false;
  return bt.kind === 'solid' || bt.kind === 'special';
}

export function isCropGrown(blockId: string): boolean {
  // Wheat is grown at maturity (fully grown = harvestable)
  return blockId === 'wheat_crop';
}
