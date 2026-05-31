import type { BlockType, BlockTypeId } from './types.js';

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
];

const BLOCK_MAP = new Map<string, BlockType>(
  BLOCK_DEFINITIONS.map((b) => [b.id, b]),
);

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
