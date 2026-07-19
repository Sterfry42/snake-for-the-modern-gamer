import type { MinecraftPlayer } from './player.js';
import type { RoomSnapshot } from '../world/types.js';

// ─── Fishing Types ──────────────────────────────────────────────────────────

export interface FishingRod {
  itemId: string;
  durability: number;
  maxDurability: number;
  enchanted: boolean;
  enchantments: Map<string, number>;
}

export interface FishCaught {
  type: FishType;
  weight: number;
  isLegendary: boolean;
  itemId: string;
  count: number;
  xp: number;
}

export type FishType =
  | 'salmon'
  | 'cod'
  | 'pufferfish'
  | 'tropical_fish'
  | 'jellyfish'
  | 'shark'
  | 'whale'
  | 'squid'
  | 'lobster'
  | 'crab'
  | 'seahorse'
  | 'octopus'
  | 'clownfish'
  | 'barracuda'
  | 'marlin'
  | 'swordfish'
  | 'eel'
  | 'ray'
  | 'stingray'
  | 'manta_ray';

export interface FishDefinition {
  id: FishType;
  name: string;
  itemId: string;
  baseWeight: number;
  maxWeight: number;
  color: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  biome: 'ocean' | 'river' | 'lake' | 'any';
  xp: number;
  dropItem?: string;
  dropCount?: number;
}

// ─── Fishing Rod Types ──────────────────────────────────────────────────────

export interface FishingRodDefinition {
  id: string;
  name: string;
  description: string;
  castRange: number;
  durability: number;
  lureSpeed: number;
  hookStrength: number;
}

export const FISHING_ROD_DEFS: Record<string, FishingRodDefinition> = {
  fishing_rod: {
    id: 'fishing_rod',
    name: 'Fishing Rod',
    description: 'A basic fishing rod for catching fish.',
    castRange: 10,
    durability: 64,
    lureSpeed: 1,
    hookStrength: 1,
  },
  enchanted_fishing_rod: {
    id: 'enchanted_fishing_rod',
    name: 'Enchanted Fishing Rod',
    description: 'An enchanted rod with better catch rates.',
    castRange: 15,
    durability: 128,
    lureSpeed: 1.5,
    hookStrength: 1.5,
  },
  diamond_fishing_rod: {
    id: 'diamond_fishing_rod',
    name: 'Diamond Fishing Rod',
    description: 'A diamond fishing rod for the best catches.',
    castRange: 20,
    durability: 256,
    lureSpeed: 2,
    hookStrength: 2,
  },
};

// ─── Fish Definitions ───────────────────────────────────────────────────────

export const FISH_DEFINITIONS: Record<FishType, FishDefinition> = {
  salmon: {
    id: 'salmon',
    name: 'Salmon',
    itemId: 'salmon',
    baseWeight: 1,
    maxWeight: 10,
    color: '#FFB6C1',
    rarity: 'common',
    biome: 'any',
    xp: 1,
    dropItem: 'cooked_salmon',
    dropCount: 1,
  },
  cod: {
    id: 'cod',
    name: 'Cod',
    itemId: 'cod',
    baseWeight: 0.5,
    maxWeight: 5,
    color: '#C0C0C0',
    rarity: 'common',
    biome: 'any',
    xp: 1,
    dropItem: 'cooked_cod',
    dropCount: 1,
  },
  pufferfish: {
    id: 'pufferfish',
    name: 'Pufferfish',
    itemId: 'pufferfish',
    baseWeight: 0.2,
    maxWeight: 1,
    color: '#FFD700',
    rarity: 'common',
    biome: 'any',
    xp: 1,
  },
  tropical_fish: {
    id: 'tropical_fish',
    name: 'Tropical Fish',
    itemId: 'tropical_fish',
    baseWeight: 0.1,
    maxWeight: 1,
    color: '#FF6347',
    rarity: 'uncommon',
    biome: 'ocean',
    xp: 2,
  },
  jellyfish: {
    id: 'jellyfish',
    name: 'Jellyfish',
    itemId: 'jellyfish',
    baseWeight: 0.5,
    maxWeight: 3,
    color: '#DDA0DD',
    rarity: 'uncommon',
    biome: 'ocean',
    xp: 2,
  },
  shark: {
    id: 'shark',
    name: 'Shark',
    itemId: 'shark',
    baseWeight: 50,
    maxWeight: 500,
    color: '#808080',
    rarity: 'rare',
    biome: 'ocean',
    xp: 10,
    dropItem: 'shark_tooth',
    dropCount: 1,
  },
  whale: {
    id: 'whale',
    name: 'Whale',
    itemId: 'whale',
    baseWeight: 100,
    maxWeight: 1000,
    color: '#4169E1',
    rarity: 'epic',
    biome: 'ocean',
    xp: 25,
  },
  squid: {
    id: 'squid',
    name: 'Squid',
    itemId: 'squid',
    baseWeight: 2,
    maxWeight: 15,
    color: '#9932CC',
    rarity: 'uncommon',
    biome: 'ocean',
    xp: 3,
  },
  lobster: {
    id: 'lobster',
    name: 'Lobster',
    itemId: 'lobster',
    baseWeight: 3,
    maxWeight: 20,
    color: '#FF4500',
    rarity: 'uncommon',
    biome: 'any',
    xp: 3,
    dropItem: 'cooked_lobster',
    dropCount: 1,
  },
  crab: {
    id: 'crab',
    name: 'Crab',
    itemId: 'crab',
    baseWeight: 0.5,
    maxWeight: 5,
    color: '#DC143C',
    rarity: 'common',
    biome: 'any',
    xp: 1,
    dropItem: 'crab_meat',
    dropCount: 1,
  },
  seahorse: {
    id: 'seahorse',
    name: 'Seahorse',
    itemId: 'seahorse',
    baseWeight: 0.01,
    maxWeight: 0.1,
    color: '#FFD700',
    rarity: 'rare',
    biome: 'ocean',
    xp: 5,
  },
  octopus: {
    id: 'octopus',
    name: 'Octopus',
    itemId: 'octopus',
    baseWeight: 5,
    maxWeight: 30,
    color: '#8B0000',
    rarity: 'rare',
    biome: 'ocean',
    xp: 8,
  },
  clownfish: {
    id: 'clownfish',
    name: 'Clownfish',
    itemId: 'clownfish',
    baseWeight: 0.1,
    maxWeight: 0.5,
    color: '#FF8C00',
    rarity: 'rare',
    biome: 'ocean',
    xp: 6,
  },
  barracuda: {
    id: 'barracuda',
    name: 'Barracuda',
    itemId: 'barracuda',
    baseWeight: 10,
    maxWeight: 50,
    color: '#C0C0C0',
    rarity: 'rare',
    biome: 'ocean',
    xp: 12,
  },
  marlin: {
    id: 'marlin',
    name: 'Marlin',
    itemId: 'marlin',
    baseWeight: 20,
    maxWeight: 100,
    color: '#00008B',
    rarity: 'epic',
    biome: 'ocean',
    xp: 20,
  },
  swordfish: {
    id: 'swordfish',
    name: 'Swordfish',
    itemId: 'swordfish',
    baseWeight: 30,
    maxWeight: 200,
    color: '#708090',
    rarity: 'epic',
    biome: 'ocean',
    xp: 25,
  },
  eel: {
    id: 'eel',
    name: 'Eel',
    itemId: 'eel',
    baseWeight: 2,
    maxWeight: 15,
    color: '#2F4F4F',
    rarity: 'uncommon',
    biome: 'any',
    xp: 4,
  },
  ray: {
    id: 'ray',
    name: 'Ray',
    itemId: 'ray',
    baseWeight: 10,
    maxWeight: 80,
    color: '#8B8B8B',
    rarity: 'rare',
    biome: 'ocean',
    xp: 10,
  },
  stingray: {
    id: 'stingray',
    name: 'Stingray',
    itemId: 'stingray',
    baseWeight: 5,
    maxWeight: 40,
    color: '#696969',
    rarity: 'rare',
    biome: 'ocean',
    xp: 10,
  },
  manta_ray: {
    id: 'manta_ray',
    name: 'Manta Ray',
    itemId: 'manta_ray',
    baseWeight: 50,
    maxWeight: 300,
    color: '#2F2F4F',
    rarity: 'legendary',
    biome: 'ocean',
    xp: 50,
  },
};

// ─── Fishing State ──────────────────────────────────────────────────────────

export interface FishingState {
  casting: boolean;
  baited: boolean;
  waiting: boolean;
  hookTime: number;
  bobberX: number;
  bobberY: number;
  bobberRoomId: string;
  inWater: boolean;
  lureTimer: number;
  biteDelay: number;
  rod: FishingRod | null;
}

export interface FishingBait {
  itemId: string;
  name: string;
  lureSpeedBonus: number;
}

export const FISHING_BAITS: Record<string, FishingBait> = {
  worm: {
    itemId: 'worm',
    name: 'Worm',
    lureSpeedBonus: 0.3,
  },
  shrimp: {
    itemId: 'shrimp',
    name: 'Shrimp',
    lureSpeedBonus: 0.5,
  },
  cricket: {
    itemId: 'cricket',
    name: 'Cricket',
    lureSpeedBonus: 0.4,
  },
  fly: {
    itemId: 'fly',
    name: 'Fly',
    lureSpeedBonus: 0.35,
  },
  bread: {
    itemId: 'bread',
    name: 'Bread',
    lureSpeedBonus: 0.1,
  },
};

// ─── Fishing Logic ──────────────────────────────────────────────────────────

export function createFishingState(rod: FishingRod): FishingState {
  return {
    casting: false,
    baited: false,
    waiting: false,
    hookTime: 0,
    bobberX: 0,
    bobberY: 0,
    bobberRoomId: '',
    inWater: false,
    lureTimer: 0,
    biteDelay: 0,
    rod,
  };
}

export function canFish(
  player: MinecraftPlayer,
  room: RoomSnapshot,
  x: number,
  y: number,
): { canFish: boolean; message?: string } {
  // Check if player has a fishing rod
  const hasRod = player.getItemCount('fishing_rod') > 0 || player.getItemCount('enchanted_fishing_rod') > 0 || player.getItemCount('diamond_fishing_rod') > 0;
  if (!hasRod) {
    return { canFish: false, message: 'You need a fishing rod to fish!' };
  }

  // Check if adjacent to water
  const hasWater = isAdjacentToWater(room, x, y);
  if (!hasWater) {
    return { canFish: false, message: 'You need to be next to water to fish!' };
  }

  return { canFish: true };
}

function isAdjacentToWater(room: RoomSnapshot, x: number, y: number): boolean {
  const neighbors = [
    `${x - 1},${y}`,
    `${x + 1},${y}`,
    `${x},${y - 1}`,
    `${x},${y + 1}`,
  ];

  if (room.minecraftBlocks) {
    for (const n of neighbors) {
      if (room.minecraftBlocks[n] === 'water') return true;
    }
  }

  // Check room layout for water tiles
  if (room.layout) {
    const waterTiles = getWaterTilesFromLayout(room.layout);
    for (const wt of waterTiles) {
      const dx = Math.abs(wt.x - x);
      const dy = Math.abs(wt.y - y);
      if (dx <= 1 && dy <= 1) return true;
    }
  }

  return false;
}

function getWaterTilesFromLayout(layout: string[]): Array<{ x: number; y: number }> {
  const result: Array<{ x: number; y: number }> = [];
  layout.length > 0 ? layout[0].split('') : [];
  for (let y = 0; y < layout.length; y++) {
    const row = layout[y] ?? '';
    for (let x = 0; x < row.length; x++) {
      if (row[x] === '~') {
        result.push({ x, y });
      }
    }
  }
  return result;
}

export function castLine(
  state: FishingState,
  x: number,
  y: number,
  roomId: string,
): { success: boolean; message?: string } {
  if (state.casting) {
    return { success: false, message: 'Your line is already in the water!' };
  }

  state.casting = true;
  state.bobberX = x;
  state.bobberY = y;
  state.bobberRoomId = roomId;
  state.hookTime = 0;
  state.lureTimer = 0;
  state.biteDelay = calculateBiteDelay(state);
  state.inWater = true;

  return { success: true };
}

function calculateBiteDelay(state: FishingState, rng: () => number = Math.random): number {
  const baseDelay = 100 + rng() * 300;
  const lureMultiplier = getLureSpeedMultiplier(state);
  return Math.floor(baseDelay / lureMultiplier);
}

function getLureSpeedMultiplier(state: FishingState): number {
  let multiplier = 1;

  const rodDef = FISHING_ROD_DEFS[state.rod?.itemId ?? 'fishing_rod'];
  if (rodDef) {
    multiplier *= rodDef.lureSpeed;
  }

  if (state.rod && state.rod.enchanted) {
    const luckLevel = state.rod.enchantments.get('luck_of_the_sea') ?? 0;
    multiplier *= (1 + luckLevel * 0.2);
  }

  return Math.max(0.5, multiplier);
}

export function tickFishing(
  state: FishingState,
  rng: () => number = Math.random,
): { bite: boolean; fishCaught: FishCaught | null; message?: string } {
  if (!state.casting || !state.inWater) {
    return { bite: false, fishCaught: null };
  }

  state.hookTime += 1;
  state.lureTimer += 1;

  // Check if it's time to bite
  if (state.lureTimer >= state.biteDelay) {
    // Chance to bite depends on enchantments and rod
    const biteChance = calculateBiteChance(state);

    if (rng() < biteChance) {
      const fish = tryCatchFish(state, rng);
      return { bite: true, fishCaught: fish };
    }

    // Reset bite delay
    state.lureTimer = 0;
    state.biteDelay = calculateBiteDelay(state, rng);
  }

  return { bite: false, fishCaught: null };
}

function calculateBiteChance(state: FishingState): number {
  let chance = 0.03; // Base 3% chance per tick

  if (state.rod && state.rod.enchanted) {
    const lureLevel = state.rod.enchantments.get('lure') ?? 0;
    chance += lureLevel * 0.01;
  }

  return Math.min(0.15, chance);
}

function tryCatchFish(state: FishingState, rng: () => number = Math.random): FishCaught | null {
  // Get available fish based on biome
  const availableFish = getAvailableFish();
  if (availableFish.length === 0) return null;

  // Weighted random selection
  const totalWeight = availableFish.reduce((sum, f) => sum + getFishWeight(f), 0);
  let roll = rng() * totalWeight;

  let selected: FishDefinition | null = null;
  for (const fish of availableFish) {
    roll -= getFishWeight(fish);
    if (roll <= 0) {
      selected = fish;
      break;
    }
  }

  if (!selected) {
    selected = availableFish[0];
  }

  // Calculate weight
  const weight = selected.baseWeight + rng() * (selected.maxWeight - selected.baseWeight);
  const isLegendary = selected.rarity === 'legendary' || (selected.rarity === 'epic' && rng() < 0.2);

  return {
    type: selected.id,
    weight,
    isLegendary,
    itemId: selected.itemId,
    count: 1,
    xp: selected.xp * (isLegendary ? 2 : 1),
  };
}

function getFishWeight(fish: FishDefinition): number {
  const rarityWeights: Record<string, number> = {
    common: 60,
    uncommon: 25,
    rare: 10,
    epic: 4,
    legendary: 1,
  };
  return rarityWeights[fish.rarity] ?? 10;
}

function getAvailableFish(): FishDefinition[] {
  // For now, return all fish - could filter by biome later
  return Object.values(FISH_DEFINITIONS);
}

// ─── Fishing Rewards ────────────────────────────────────────────────────────

export function applyFishCatch(
  player: MinecraftPlayer,
  fish: FishCaught,
  rng: () => number = Math.random,
): { success: boolean; message: string } {
  // Add fish to inventory
  player.addItem(fish.itemId, fish.count);

  // Add XP
  player.addXp(fish.xp);

  // Chance for bonus drops
  const fishDef = FISH_DEFINITIONS[fish.type];
  if (fishDef?.dropItem && fishDef.dropItem && rng() < 0.3) {
    const dropCount = fishDef.dropCount ?? 1;
    player.addItem(fishDef.dropItem, dropCount);
  }

  const rarityText = fish.isLegendary ? 'LEGENDARY' : fishDef?.rarity.toUpperCase() ?? '';
  const message = fish.isLegendary
    ? `🐟 YOU CAUGHT A ${rarityText} ${fishDef?.name ?? fish.type} (${fish.weight.toFixed(1)} kg)! +${fish.xp} XP`
    : `🎣 Caught ${fishDef?.name ?? fish.type}! +${fish.xp} XP`;

  return { success: true, message };
}

// ─── Fishing Rod Usage ──────────────────────────────────────────────────────

export function useFishingRod(
  player: MinecraftPlayer,
  rodItemId: string,
): { success: boolean; message?: string } {
  const rodDef = FISHING_ROD_DEFS[rodItemId];
  if (!rodDef) {
    return { success: false, message: 'Not a valid fishing rod.' };
  }

  const rodItem = player.state.inventory.find((i) => i.itemId === rodItemId);
  if (!rodItem || rodItem.count <= 0) {
    return { success: false, message: 'No fishing rod in inventory.' };
  }

  // Check durability
  if (player.state.fishingRodDurability) {
    const durability = player.state.fishingRodDurability[rodItemId] ?? 0;
    if (durability <= 0) {
      return { success: false, message: 'Your fishing rod is broken!' };
    }
  }

  return { success: true };
}

export function damageFishingRod(
  player: MinecraftPlayer,
  rodItemId: string,
  amount: number,
): void {
  if (!player.state.fishingRodDurability) {
    player.state.fishingRodDurability = {};
  }

  const current = player.state.fishingRodDurability[rodItemId] ?? 0;
  player.state.fishingRodDurability[rodItemId] = Math.max(0, current - amount);
}

// ─── Fishing UI Data ────────────────────────────────────────────────────────

export interface FishingUIState {
  showUI: boolean;
  castLine: boolean;
  reelLine: boolean;
  bobberX: number;
  bobberY: number;
  waitTime: number;
  maxWaitTime: number;
  caughtFish: FishCaught | null;
}

export function createFishingUIState(): FishingUIState {
  return {
    showUI: false,
    castLine: false,
    reelLine: false,
    bobberX: 0,
    bobberY: 0,
    waitTime: 0,
    maxWaitTime: 0,
    caughtFish: null,
  };
}

export interface FishEntry {
  type: FishType;
  name: string;
  rarity: string;
  color: string;
  minWeight: number;
  maxWeight: number;
  xp: number;
}

export function getFishList(): FishEntry[] {
  return Object.values(FISH_DEFINITIONS).map((f) => ({
    type: f.id,
    name: f.name,
    rarity: f.rarity,
    color: f.color,
    minWeight: f.baseWeight,
    maxWeight: f.maxWeight,
    xp: f.xp,
  }));
}

export function getFishByRarity(rarity: string): FishEntry[] {
  return getFishList().filter((f) => f.rarity === rarity);
}

export function getRareFish(): FishEntry[] {
  return getFishList().filter((f) => f.rarity === 'rare' || f.rarity === 'epic' || f.rarity === 'legendary');
}

export function getLegendaryFish(): FishEntry[] {
  return getFishList().filter((f) => f.rarity === 'legendary');
}
