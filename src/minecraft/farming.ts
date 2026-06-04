import type { RoomSnapshot } from '../world/types.js';

const GROWTH_STAGES = 4;
const GROWTH_TIME_PER_STAGE = 300;

export interface CropState {
  stage: number;
  planted: number;
}

export function tryCreateFarmland(
  room: RoomSnapshot,
  player: { getItemCount: (id: string) => number; removeItem: (id: string, count?: number) => boolean },
  x: number,
  y: number,
  blockType: string | undefined,
): { success: boolean; message?: string } {
  if (blockType !== 'dirt' && blockType !== 'grass') {
    return { success: false, message: 'Only on dirt or grass.' };
  }

  if (!room.minecraftBlocks) {
    room.minecraftBlocks = {};
  }

  // Consume a tool use (shovel) — for simplicity, just check player has a shovel
  const hasShovel = ['wooden_shovel', 'stone_shovel', 'iron_shovel'].some(
    (t) => player.getItemCount(t) > 0,
  );
  if (!hasShovel) {
    return { success: false, message: 'Need a shovel to till farmland.' };
  }

  room.minecraftBlocks[`${x},${y}`] = 'farmland';
  return { success: true };
}

export function tryPlantSeeds(
  room: RoomSnapshot,
  player: { getItemCount: (id: string) => number; removeItem: (id: string, count?: number) => boolean },
  x: number,
  y: number,
  blockType: string | undefined,
): { success: boolean; message?: string } {
  if (blockType !== 'farmland') {
    return { success: false, message: 'Seeds need farmland.' };
  }

  if (!room.minecraftBlocks) {
    room.minecraftBlocks = {};
  }

  if (player.getItemCount('seeds') <= 0) {
    return { success: false, message: "You don't have any seeds." };
  }

  player.removeItem('seeds', 1);
  room.minecraftBlocks[`${x},${y}`] = 'wheat_crop';

  return { success: true };
}

export function tryPlantPumpkin(
  room: RoomSnapshot,
  player: { getItemCount: (id: string) => number; removeItem: (id: string, count?: number) => boolean },
  x: number,
  y: number,
  blockType: string | undefined,
): { success: boolean; message?: string } {
  if (blockType !== 'farmland') {
    return { success: false, message: 'Pumpkins need farmland.' };
  }

  if (!room.minecraftBlocks) {
    room.minecraftBlocks = {};
  }

  // Check if pumpkin can grow here (needs empty space and adjacent pumpkin)
  const neighbors = [
    `${x - 1},${y}`,
    `${x + 1},${y}`,
    `${x},${y - 1}`,
    `${x},${y + 1}`,
  ];
  const hasPumpkin = neighbors.some((n) => room.minecraftBlocks?.[n] === 'pumpkin');

  // Always allow planting for simplicity (pumpkin block itself can be the "seed")
  if (player.getItemCount('pumpkin_item') <= 0) {
    return { success: false, message: "You don't have a pumpkin to plant." };
  }

  player.removeItem('pumpkin_item', 1);
  room.minecraftBlocks[`${x},${y}`] = 'pumpkin';

  return { success: true };
}

export function tickCrops(room: RoomSnapshot, dayNight: { timeOfDay: number }): void {
  if (!room.minecraftBlocks) return;

  // Only grow during daytime (tick 5000-15000 is daytime-ish)
  if (dayNight.timeOfDay < 2000 || dayNight.timeOfDay > 13000) return;

  for (const [key, blockType] of Object.entries(room.minecraftBlocks)) {
    if (blockType !== 'wheat_crop') continue;

    const [x, y] = key.split(',').map(Number);

    // Check adjacent farmland for moisture
    const hasAdjacentFarmland = [
      `${x - 1},${y}`,
      `${x + 1},${y}`,
      `${x},${y - 1}`,
      `${x},${y + 1}`,
    ].some((n) => room.minecraftBlocks?.[n] === 'farmland');

    if (!hasAdjacentFarmland) continue;

    // Random growth chance
    if (Math.random() < 0.01) {
      // Check if fully grown
      const stage = getCropStage(room.minecraftBlocks, key);
      if (stage < GROWTH_STAGES) {
        room.minecraftBlocks[key] = 'wheat_crop'; // same block, different stage tracked
      }
    }
  }
}

function getCropStage(blocks: Record<string, string>, key: string): number {
  // For simplicity, track growth by counting how many ticks this crop has existed
  // In a real implementation, we'd track stages in a separate map
  // Here we'll use a heuristic based on the number of wheat crops that exist
  let count = 0;
  for (const v of Object.values(blocks)) {
    if (v === 'wheat_crop') count++;
  }
  return Math.min(count % GROWTH_STAGES, GROWTH_STAGES - 1);
}

export function tryHarvestCrop(
  room: RoomSnapshot,
  player: { addItem: (id: string, count?: number) => void },
  x: number,
  y: number,
  blockType: string | undefined,
): { success: boolean; drops?: Array<{ itemId: string; count: number }>; message?: string } {
  if (!blockType) {
    return { success: false, message: 'Nothing to harvest.' };
  }

  if (!room.minecraftBlocks) {
    return { success: false, message: 'Nothing to harvest.' };
  }

  if (blockType === 'wheat_crop') {
    // Always drop something
    const drops: Array<{ itemId: string; count: number }> = [];
    const wheatCount = Math.floor(Math.random() * 3) + 1;
    const seedDrop = Math.random() < 0.5 ? 1 : 0;

    drops.push({ itemId: 'wheat', count: wheatCount });
    if (seedDrop > 0) {
      drops.push({ itemId: 'seeds', count: seedDrop });
    }

    delete room.minecraftBlocks[`${x},${y}`];

    for (const drop of drops) {
      player.addItem(drop.itemId, drop.count);
    }

    return { success: true, drops };
  }

  if (blockType === 'pumpkin') {
    delete room.minecraftBlocks[`${x},${y}`];
    player.addItem('pumpkin_item', 1);
    return { success: true, drops: [{ itemId: 'pumpkin_item', count: 1 }] };
  }

  return { success: false, message: "Can't harvest that." };
}
