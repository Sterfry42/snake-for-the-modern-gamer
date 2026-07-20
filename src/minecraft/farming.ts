import type { RoomSnapshot } from '../world/types.js';

const GROWTH_STAGES = 4;
const GROWTH_TIME_PER_STAGE = 300;
const PUMPKIN_SPREAD_CHANCE = 0.05;
const PUMPKIN_SPREAD_INTERVAL = 200;

export interface CropState {
  stage: number;
  planted: number;
}

export function tryCreateFarmland(
  room: RoomSnapshot,
  player: {
    getItemCount: (id: string) => number;
    removeItem: (id: string, count?: number) => boolean;
  },
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
  player: {
    getItemCount: (id: string) => number;
    removeItem: (id: string, count?: number) => boolean;
  },
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

  if (!room.minecraftCropData) {
    room.minecraftCropData = new Map();
  }
  room.minecraftCropData.set(`${x},${y}`, { stage: 0, growthTicks: 0 });

  return { success: true };
}

export function tryPlantPumpkin(
  room: RoomSnapshot,
  player: {
    getItemCount: (id: string) => number;
    removeItem: (id: string, count?: number) => boolean;
  },
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

  const neighbors = [`${x - 1},${y}`, `${x + 1},${y}`, `${x},${y - 1}`, `${x},${y + 1}`];
  neighbors.some((n) => room.minecraftBlocks?.[n] === 'pumpkin');

  if (player.getItemCount('pumpkin_item') <= 0) {
    return { success: false, message: "You don't have a pumpkin to plant." };
  }

  player.removeItem('pumpkin_item', 1);
  room.minecraftBlocks[`${x},${y}`] = 'pumpkin';

  return { success: true };
}

export function tickCrops(
  room: RoomSnapshot,
  dayNight: { timeOfDay: number },
  rng: () => number = Math.random,
): void {
  if (!room.minecraftBlocks) return;
  if (!room.minecraftCropData) return;

  // Only grow during daytime (tick 2000-13000 covers dawn through dusk)
  if (dayNight.timeOfDay < 2000 || dayNight.timeOfDay > 13000) return;

  for (const [key, cropData] of room.minecraftCropData) {
    const blockType = room.minecraftBlocks[key];
    if (blockType !== 'wheat_crop') continue;

    // Increment growth ticks - crops grow as long as they're on farmland
    cropData.growthTicks += 1;

    // Calculate stage based on growth ticks
    const newStage = Math.min(
      Math.floor(cropData.growthTicks / GROWTH_TIME_PER_STAGE),
      GROWTH_STAGES - 1,
    );

    if (newStage !== cropData.stage) {
      cropData.stage = newStage;
    }
  }

  // Pumpkin spread: check placed pumpkin blocks for spread
  for (const [key, blockType] of Object.entries(room.minecraftBlocks)) {
    if (blockType !== 'pumpkin') continue;

    const [px, py] = key.split(',').map(Number);
    const neighbors = [`${px - 1},${py}`, `${px + 1},${py}`, `${px},${py - 1}`, `${px},${py + 1}`];

    // Only spread during daytime with some randomness
    if (dayNight.timeOfDay % PUMPKIN_SPREAD_INTERVAL !== 0 || rng() > PUMPKIN_SPREAD_CHANCE)
      continue;

    // Check if adjacent to farmland
    const hasAdjacentFarmland = neighbors.some((n) => room.minecraftBlocks?.[n] === 'farmland');
    if (!hasAdjacentFarmland) continue;

    // Find adjacent air blocks to place new pumpkins
    const airNeighbors = neighbors.filter((n) => !room.minecraftBlocks?.[n]);

    if (airNeighbors.length === 0) continue;

    // Pick a random air neighbor and place a pumpkin
    const spreadTo = airNeighbors[Math.floor(rng() * airNeighbors.length)];
    room.minecraftBlocks[spreadTo] = 'pumpkin';
  }
}

export function tryHarvestCrop(
  room: RoomSnapshot,
  player: { addItem: (id: string, count?: number) => void },
  x: number,
  y: number,
  blockType: string | undefined,
  rng: () => number = Math.random,
): {
  success: boolean;
  drops?: Array<{ itemId: string; count: number }>;
  xp?: number;
  message?: string;
} {
  if (!blockType) {
    return { success: false, message: 'Nothing to harvest.' };
  }

  if (!room.minecraftBlocks) {
    return { success: false, message: 'Nothing to harvest.' };
  }

  if (blockType === 'wheat_crop') {
    const drops: Array<{ itemId: string; count: number }> = [];
    const wheatCount = Math.floor(rng() * 3) + 1;
    const seedDrop = rng() < 0.5 ? 1 : 0;

    drops.push({ itemId: 'wheat', count: wheatCount });
    if (seedDrop > 0) {
      drops.push({ itemId: 'seeds', count: seedDrop });
    }

    delete room.minecraftBlocks[`${x},${y}`];

    if (room.minecraftCropData) {
      room.minecraftCropData.delete(`${x},${y}`);
    }

    for (const drop of drops) {
      player.addItem(drop.itemId, drop.count);
    }

    return { success: true, drops, xp: Math.floor(rng() * 3) + 1 };
  }

  if (blockType === 'pumpkin') {
    delete room.minecraftBlocks[`${x},${y}`];
    player.addItem('pumpkin_item', 1);
    return { success: true, drops: [{ itemId: 'pumpkin_item', count: 1 }], xp: 3 };
  }

  return { success: false, message: "Can't harvest that." };
}
