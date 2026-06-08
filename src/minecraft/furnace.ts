import type { MinecraftPlayer } from './player.js';

export interface SmeltingRecipe {
  input: string;
  fuel: string;
  output: string;
  count: number;
  time: number;
}

export interface FurnaceState {
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
}

const SMELTING_RECIPES: SmeltingRecipe[] = [
  { input: 'raw_iron', fuel: 'coal', output: 'iron_ingot', count: 1, time: 20 },
  { input: 'raw_gold', fuel: 'coal', output: 'gold_ingot', count: 1, time: 20 },
  { input: 'raw_beef', fuel: 'coal', output: 'cooked_beef', count: 1, time: 15 },
  { input: 'cobblestone', fuel: 'coal', output: 'stone', count: 1, time: 10 },
  { input: 'sand', fuel: 'coal', output: 'glass', count: 1, time: 10 },
];

const FUEL_MAP: Record<string, number> = {
  coal: 10,
  stick: 2,
  planks_item: 2,
  wood: 4,
};

export function canSmelt(input: string): string | null {
  return SMELTING_RECIPES.find((r) => r.input === input)?.output ?? null;
}

export function getSmeltingTime(input: string): number {
  const recipe = SMELTING_RECIPES.find((r) => r.input === input);
  return recipe?.time ?? 0;
}

export function isFuel(item: string): boolean {
  return item in FUEL_MAP;
}

export function getFuelBurnTime(item: string): number {
  return FUEL_MAP[item] ?? 0;
}

export function createFurnaceState(x: number, y: number, roomId: string): FurnaceState {
  return {
    x,
    y,
    roomId,
    progress: 0,
    inputItem: null,
    outputItem: null,
    outputCount: 0,
    fuelItem: null,
    fuelRemaining: 0,
    burning: false,
  };
}

export function tryLoadFurnace(
  furnaces: Map<string, FurnaceState>,
  player: MinecraftPlayer,
  x: number,
  y: number,
  roomId: string,
  itemId: string,
): { success: boolean; message?: string } {
  const key = `${x},${y},${roomId}`;
  const furnace = furnaces.get(key);
  if (!furnace) {
    return { success: false, message: 'No furnace here.' };
  }

  // If furnace has output, collect it first
  if (furnace.outputItem && furnace.outputCount > 0) {
    return { success: false, message: 'Collect output first by breaking the furnace.' };
  }

  // Load fuel if needed
  if (!furnace.fuelItem || furnace.fuelRemaining <= 0) {
    if (isFuel(itemId)) {
      if (player.removeItem(itemId)) {
        const burnTime = getFuelBurnTime(itemId);
        if (furnace.burning) {
          furnace.fuelRemaining += burnTime;
        } else {
          furnace.fuelItem = itemId;
          furnace.fuelRemaining = burnTime;
          furnace.burning = true;
        }
        return { success: true };
      }
    }
    return { success: false, message: 'Place coal or wood to fuel the furnace.' };
  }

  // Load input item
  if (!furnace.inputItem) {
    const output = canSmelt(itemId);
    if (!output) {
      return {
        success: false,
        message: 'Cannot smelt that. Try raw_iron, raw_gold, raw_beef, cobblestone, or sand.',
      };
    }
    if (player.removeItem(itemId)) {
      furnace.inputItem = itemId;
      furnace.outputItem = output;
      const recipe = SMELTING_RECIPES.find((r) => r.input === itemId)!;
      furnace.outputCount = recipe.count;
      return { success: true };
    }
  }

  return { success: false, message: 'Furnace is busy. Wait for it to finish or collect output.' };
}

export function tickFurnaces(
  furnaces: Map<string, FurnaceState>,
  playerInventory: Array<{ itemId: string; count: number }>,
): void {
  for (const furnace of furnaces.values()) {
    // Burn fuel
    if (furnace.burning && furnace.fuelRemaining > 0) {
      furnace.fuelRemaining -= 1;
      if (furnace.fuelRemaining <= 0) {
        furnace.burning = false;
        furnace.fuelItem = null;
      }
    }

    // Process smelting
    if (furnace.burning && furnace.inputItem && furnace.outputItem) {
      const smeltTime = getSmeltingTime(furnace.inputItem);
      if (smeltTime > 0) {
        furnace.progress += 1;
        if (furnace.progress >= smeltTime) {
          // Done smelting
          furnace.progress = 0;
          furnace.inputItem = null;
          furnace.burning = false;
          furnace.fuelRemaining = 0;
          furnace.fuelItem = null;
        }
      }
    }
  }
}

export function tryPlaceFurnace(
  furnaces: Map<string, FurnaceState>,
  x: number,
  y: number,
  roomId: string,
): { success: boolean; message?: string } {
  const key = `${x},${y},${roomId}`;
  if (furnaces.has(key)) {
    return { success: false, message: 'A furnace is already here.' };
  }
  furnaces.set(key, createFurnaceState(x, y, roomId));
  return { success: true };
}

export function tryCollectFurnaceOutput(
  furnaces: Map<string, FurnaceState>,
  player: MinecraftPlayer,
  x: number,
  y: number,
  roomId: string,
): { success: boolean; message?: string } {
  const key = `${x},${y},${roomId}`;
  const furnace = furnaces.get(key);
  if (!furnace) {
    return { success: false, message: 'No furnace here.' };
  }

  if (!furnace.outputItem || furnace.outputCount <= 0) {
    return { success: false, message: 'Nothing to collect.' };
  }

  player.addItem(furnace.outputItem, furnace.outputCount);
  furnace.outputItem = null;
  furnace.outputCount = 0;

  return { success: true };
}
