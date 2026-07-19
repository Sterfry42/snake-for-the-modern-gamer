import type { MinecraftPlayer } from './player.js';


// ─── Potion Effects ─────────────────────────────────────────────────────────

export interface PotionEffect {
  id: PotionEffectId;
  name: string;
  description: string;
  color: string;
  applyOnDrink: (player: MinecraftPlayer, duration: number) => void;
  durationTicks: number;
}

export type PotionEffectId =
  | 'speed'
  | 'speed_i'
  | 'speed_ii'
  | 'speed_iii'
  | 'strength'
  | 'strength_i'
  | 'strength_ii'
  | 'strength_iii'
  | 'regeneration'
  | 'regeneration_i'
  | 'regeneration_ii'
  | 'healing'
  | 'healing_i'
  | 'healing_ii'
  | 'instant_damage'
  | 'damage_i'
  | 'fire_resistance'
  | 'fire_resistance_i'
  | 'fire_resistance_ii'
  | 'water_breathing'
  | 'water_breathing_i'
  | 'water_breathing_ii'
  | 'invisibility'
  | 'invisibility_i'
  | 'night_vision'
  | 'night_vision_i'
  | 'night_vision_ii'
  | 'jump_boost'
  | 'jump_boost_i'
  | 'jump_boost_ii'
  | 'absorption'
  | 'saturation'
  | 'haste'
  | 'slowness'
  | 'poison'
  | 'wither'
  | 'hunger'
  | 'weakening'
  | 'confusion'
  | 'nausea'
  | 'blindness'
  | 'mining_fatigue'
  | 'health_boost'
  | 'damage_resistance';

// ─── Potion Effect Registry ─────────────────────────────────────────────────

export const POTION_EFFECTS: Record<PotionEffectId, PotionEffect> = {
  speed: {
    id: 'speed',
    name: 'Speed',
    description: 'Increases movement speed',
    color: '#99FFDD',
    applyOnDrink: (player) => {
      const originalSpeed = player.state.tickDelayScalar ?? 1.0;
      player.state.tickDelayScalar = Math.max(0.5, originalSpeed - 0.1);
    },
    durationTicks: 600,
  },
  speed_i: {
    id: 'speed_i',
    name: 'Speed I',
    description: 'Increases movement speed (I)',
    color: '#99FFDD',
    applyOnDrink: (player) => {
      const originalSpeed = player.state.tickDelayScalar ?? 1.0;
      player.state.tickDelayScalar = Math.max(0.5, originalSpeed - 0.1);
    },
    durationTicks: 600,
  },
  speed_ii: {
    id: 'speed_ii',
    name: 'Speed II',
    description: 'Increases movement speed (II)',
    color: '#77EECC',
    applyOnDrink: (player) => {
      const originalSpeed = player.state.tickDelayScalar ?? 1.0;
      player.state.tickDelayScalar = Math.max(0.5, originalSpeed - 0.15);
    },
    durationTicks: 300,
  },
  speed_iii: {
    id: 'speed_iii',
    name: 'Speed III',
    description: 'Increases movement speed (III)',
    color: '#55DDBB',
    applyOnDrink: (player) => {
      const originalSpeed = player.state.tickDelayScalar ?? 1.0;
      player.state.tickDelayScalar = Math.max(0.5, originalSpeed - 0.2);
    },
    durationTicks: 150,
  },
  strength: {
    id: 'strength',
    name: 'Strength',
    description: 'Increases damage dealt',
    color: '#CC4422',
    applyOnDrink: (player) => {
      player.state.strengthBonus = (player.state.strengthBonus ?? 0) + 1;
    },
    durationTicks: 600,
  },
  strength_i: {
    id: 'strength_i',
    name: 'Strength I',
    description: 'Increases damage dealt (I)',
    color: '#CC4422',
    applyOnDrink: (player) => {
      player.state.strengthBonus = (player.state.strengthBonus ?? 0) + 1;
    },
    durationTicks: 600,
  },
  strength_ii: {
    id: 'strength_ii',
    name: 'Strength II',
    description: 'Increases damage dealt (II)',
    color: '#BB3311',
    applyOnDrink: (player) => {
      player.state.strengthBonus = (player.state.strengthBonus ?? 0) + 2;
    },
    durationTicks: 300,
  },
  strength_iii: {
    id: 'strength_iii',
    name: 'Strength III',
    description: 'Increases damage dealt (III)',
    color: '#AA2200',
    applyOnDrink: (player) => {
      player.state.strengthBonus = (player.state.strengthBonus ?? 0) + 3;
    },
    durationTicks: 150,
  },
  regeneration: {
    id: 'regeneration',
    name: 'Regeneration',
    description: 'Gradually restores health',
    color: '#FF5555',
    applyOnDrink: (player) => {
      player.state.regenerationActive = true;
      player.state.regenerationTicks = 0;
    },
    durationTicks: 450,
  },
  regeneration_i: {
    id: 'regeneration_i',
    name: 'Regeneration I',
    description: 'Gradually restores health (I)',
    color: '#FF5555',
    applyOnDrink: (player) => {
      player.state.regenerationActive = true;
      player.state.regenerationTicks = 0;
    },
    durationTicks: 450,
  },
  regeneration_ii: {
    id: 'regeneration_ii',
    name: 'Regeneration II',
    description: 'Gradually restores health (II)',
    color: '#EE4444',
    applyOnDrink: (player) => {
      player.state.regenerationActive = true;
      player.state.regenerationTicks = 0;
      player.state.regenerationRate = 2;
    },
    durationTicks: 225,
  },
  healing: {
    id: 'healing',
    name: 'Instant Health',
    description: 'Instantly restores 4 health',
    color: '#FF2222',
    applyOnDrink: (player) => {
      player.heal(4);
    },
    durationTicks: 1,
  },
  healing_i: {
    id: 'healing_i',
    name: 'Instant Health I',
    description: 'Instantly restores 4 health',
    color: '#FF2222',
    applyOnDrink: (player) => {
      player.heal(4);
    },
    durationTicks: 1,
  },
  healing_ii: {
    id: 'healing_ii',
    name: 'Instant Health II',
    description: 'Instantly restores 8 health',
    color: '#FF1111',
    applyOnDrink: (player) => {
      player.heal(8);
    },
    durationTicks: 1,
  },
  instant_damage: {
    id: 'instant_damage',
    name: 'Instant Damage',
    description: 'Deals 6 damage to undead mobs only',
    color: '#4A0E0E',
    applyOnDrink: (_player) => {},
    durationTicks: 1,
  },
  damage_i: {
    id: 'damage_i',
    name: 'Instant Damage I',
    description: 'Deals 6 damage',
    color: '#4A0E0E',
    applyOnDrink: (_player) => {},
    durationTicks: 1,
  },
  fire_resistance: {
    id: 'fire_resistance',
    name: 'Fire Resistance',
    description: 'Immunity to fire and lava damage',
    color: '#FF6600',
    applyOnDrink: (player) => {
      player.state.fireResistant = true;
    },
    durationTicks: 600,
  },
  fire_resistance_i: {
    id: 'fire_resistance_i',
    name: 'Fire Resistance I',
    description: 'Immunity to fire and lava damage (I)',
    color: '#FF6600',
    applyOnDrink: (player) => {
      player.state.fireResistant = true;
    },
    durationTicks: 600,
  },
  fire_resistance_ii: {
    id: 'fire_resistance_ii',
    name: 'Fire Resistance II',
    description: 'Immunity to fire and lava damage (II)',
    color: '#FF5500',
    applyOnDrink: (player) => {
      player.state.fireResistant = true;
    },
    durationTicks: 300,
  },
  water_breathing: {
    id: 'water_breathing',
    name: 'Water Breathing',
    description: 'Allows breathing underwater',
    color: '#1E90FF',
    applyOnDrink: (player) => {
      player.state.waterBreathing = true;
    },
    durationTicks: 600,
  },
  water_breathing_i: {
    id: 'water_breathing_i',
    name: 'Water Breathing I',
    description: 'Allows breathing underwater (I)',
    color: '#1E90FF',
    applyOnDrink: (player) => {
      player.state.waterBreathing = true;
    },
    durationTicks: 600,
  },
  water_breathing_ii: {
    id: 'water_breathing_ii',
    name: 'Water Breathing II',
    description: 'Allows breathing underwater (II)',
    color: '#1580EE',
    applyOnDrink: (player) => {
      player.state.waterBreathing = true;
    },
    durationTicks: 300,
  },
  invisibility: {
    id: 'invisibility',
    name: 'Invisibility',
    description: 'Makes the player invisible to mobs',
    color: '#CCCCCC',
    applyOnDrink: (player) => {
      player.state.invisible = true;
    },
    durationTicks: 600,
  },
  invisibility_i: {
    id: 'invisibility_i',
    name: 'Invisibility I',
    description: 'Makes the player invisible (I)',
    color: '#CCCCCC',
    applyOnDrink: (player) => {
      player.state.invisible = true;
    },
    durationTicks: 600,
  },
  night_vision: {
    id: 'night_vision',
    name: 'Night Vision',
    description: 'See clearly in the dark',
    color: '#FFD700',
    applyOnDrink: (player) => {
      player.state.nightVision = true;
    },
    durationTicks: 600,
  },
  night_vision_i: {
    id: 'night_vision_i',
    name: 'Night Vision I',
    description: 'See clearly in the dark (I)',
    color: '#FFD700',
    applyOnDrink: (player) => {
      player.state.nightVision = true;
    },
    durationTicks: 600,
  },
  night_vision_ii: {
    id: 'night_vision_ii',
    name: 'Night Vision II',
    description: 'See clearly in the dark (II)',
    color: '#FFCC00',
    applyOnDrink: (player) => {
      player.state.nightVision = true;
      player.state.nightVisionIntensity = 2;
    },
    durationTicks: 300,
  },
  jump_boost: {
    id: 'jump_boost',
    name: 'Jump Boost',
    description: 'Increases jump height',
    color: '#55DD55',
    applyOnDrink: (player) => {
      player.state.jumpBoost = true;
    },
    durationTicks: 600,
  },
  jump_boost_i: {
    id: 'jump_boost_i',
    name: 'Jump Boost I',
    description: 'Increases jump height (I)',
    color: '#55DD55',
    applyOnDrink: (player) => {
      player.state.jumpBoost = true;
    },
    durationTicks: 600,
  },
  jump_boost_ii: {
    id: 'jump_boost_ii',
    name: 'Jump Boost II',
    description: 'Increases jump height (II)',
    color: '#44CC44',
    applyOnDrink: (player) => {
      player.state.jumpBoost = true;
      player.state.jumpBoostLevel = 2;
    },
    durationTicks: 300,
  },
  absorption: {
    id: 'absorption',
    name: 'Absorption',
    description: 'Grants extra absorption hearts',
    color: '#FFCC44',
    applyOnDrink: (player) => {
      player.state.absorptionHearts = (player.state.absorptionHearts ?? 0) + 4;
    },
    durationTicks: 600,
  },
  saturation: {
    id: 'saturation',
    name: 'Saturation',
    description: 'Instantly restores hunger',
    color: '#FFAA00',
    applyOnDrink: (player) => {
      player.state.hunger = Math.min(player.state.maxHunger, player.state.hunger + 6);
    },
    durationTicks: 1,
  },
  haste: {
    id: 'haste',
    name: 'Haste',
    description: 'Increases mining and attack speed',
    color: '#DDAA55',
    applyOnDrink: (player) => {
      player.state.hasteActive = true;
    },
    durationTicks: 600,
  },
  slowness: {
    id: 'slowness',
    name: 'Slowness',
    description: 'Decreases movement speed',
    color: '#555588',
    applyOnDrink: (_player) => {},
    durationTicks: 600,
  },
  poison: {
    id: 'poison',
    name: 'Poison',
    description: 'Gradually deals damage over time',
    color: '#22AA22',
    applyOnDrink: (_player) => {},
    durationTicks: 300,
  },
  wither: {
    id: 'wither',
    name: 'Wither',
    description: 'Gradually deals damage over time',
    color: '#333333',
    applyOnDrink: (_player) => {},
    durationTicks: 300,
  },
  hunger: {
    id: 'hunger',
    name: 'Hunger',
    description: 'Decreases hunger drain rate',
    color: '#554433',
    applyOnDrink: (_player) => {},
    durationTicks: 600,
  },
  weakening: {
    id: 'weakening',
    name: 'Weakness',
    description: 'Decreases attack damage',
    color: '#666666',
    applyOnDrink: (_player) => {},
    durationTicks: 600,
  },
  confusion: {
    id: 'confusion',
    name: 'Confusion',
    description: 'Causes nausea effect',
    color: '#8888AA',
    applyOnDrink: (_player) => {},
    durationTicks: 200,
  },
  nausea: {
    id: 'nausea',
    name: 'Nausea',
    description: 'Causes nausea effect',
    color: '#8888AA',
    applyOnDrink: (_player) => {},
    durationTicks: 200,
  },
  blindness: {
    id: 'blindness',
    name: 'Blindness',
    description: 'Obscures vision',
    color: '#111111',
    applyOnDrink: (_player) => {},
    durationTicks: 200,
  },
  mining_fatigue: {
    id: 'mining_fatigue',
    name: 'Mining Fatigue',
    description: 'Slows mining speed',
    color: '#444444',
    applyOnDrink: (_player) => {},
    durationTicks: 600,
  },
  health_boost: {
    id: 'health_boost',
    name: 'Health Boost',
    description: 'Increases maximum health',
    color: '#FF6666',
    applyOnDrink: (player) => {
      player.state.maxHealth += 4;
      player.state.health = Math.min(player.state.health + 4, player.state.maxHealth);
    },
    durationTicks: 600,
  },
  damage_resistance: {
    id: 'damage_resistance',
    name: 'Damage Resistance',
    description: 'Reduces all incoming damage',
    color: '#888888',
    applyOnDrink: (player) => {
      player.state.damageResistance = true;
    },
    durationTicks: 600,
  },
};

// ─── Base Potions ───────────────────────────────────────────────────────────

export type BasePotionId = 'awkward' | 'thick' | 'mundane' | 'water_bottle';

export interface BasePotion {
  id: BasePotionId;
  name: string;
  description: string;
  baseColor: string;
}

export const BASE_POTIONS: Record<BasePotionId, BasePotion> = {
  water_bottle: {
    id: 'water_bottle',
    name: 'Water Bottle',
    description: 'A bottle of water. The base for all potions.',
    baseColor: '#88CCFF',
  },
  awkward: {
    id: 'awkward',
    name: 'Awkward Potion',
    description: 'The base for most brewing recipes.',
    baseColor: '#FF8888',
  },
  thick: {
    id: 'thick',
    name: 'Thick Potion',
    description: 'A thick, murky liquid. Buffs other potions.',
    baseColor: '#88FF88',
  },
  mundane: {
    id: 'mundane',
    name: 'Mundane Potion',
    description: 'A weak potion. Base for splash potions.',
    baseColor: '#AAAAAA',
  },
};

// ─── Brewing Ingredients ────────────────────────────────────────────────────

export interface BrewingIngredient {
  id: string;
  name: string;
  description: string;
  color: string;
  result: string;
}

export const BREWING_INGREDIENTS: Record<string, BrewingIngredient> = {
  nether_wart: {
    id: 'nether_wart',
    name: 'Nether Wart',
    description: 'Grown in the Nether. Makes Awkward Potions.',
    color: '#CC2200',
    result: 'awkward',
  },
  blaze_powder: {
    id: 'blaze_powder',
    name: 'Blaze Powder',
    description: 'Made from blaze rods. Fuels brewing stands.',
    color: '#FFAA00',
    result: '',
  },
  sugar: {
    id: 'sugar',
    name: 'Sugar',
    description: 'Made from sugarcane. Makes Speed Potions.',
    color: '#FFFFFF',
    result: 'speed',
  },
  glowstone_dust: {
    id: 'glowstone_dust',
    name: 'Glowstone Dust',
    description: 'Glowing dust. Upgrades potion level.',
    color: '#FFDD00',
    result: 'upgrade',
  },
  gunpowder: {
    id: 'gunpowder',
    name: 'Gunpowder',
    description: 'Explosive powder. Makes splash potions.',
    color: '#333333',
    result: 'splash',
  },
  dragon_breath: {
    id: 'dragon_breath',
    name: 'Dragon Breath',
    description: 'Rare. Makes lingering potions.',
    color: '#AA44FF',
    result: 'lingering',
  },
  fermented_spider_eye: {
    id: 'fermented_spider_eye',
    name: 'Fermented Spider Eye',
    description: 'Inverts potion effects.',
    color: '#552200',
    result: 'invert',
  },
  redstone: {
    id: 'redstone',
    name: 'Redstone Dust',
    description: 'Extends potion duration.',
    color: '#FF0000',
    result: 'extend',
  },
  dragon_egg: {
    id: 'dragon_egg',
    name: 'Dragon Egg',
    description: 'A rare catalyst. Makes Potion of Healing.',
    color: '#440044',
    result: 'healing',
  },
  spider_eye: {
    id: 'spider_eye',
    name: 'Spider Eye',
    description: 'Makes Potion of Poison.',
    color: '#880000',
    result: 'poison',
  },
  golden_carrot: {
    id: 'golden_carrot',
    name: 'Golden Carrot',
    description: 'Makes Potion of Night Vision.',
    color: '#FFCC00',
    result: 'night_vision',
  },
  magma_cream: {
    id: 'magma_cream',
    name: 'Magma Cream',
    description: 'Makes Potion of Fire Resistance.',
    color: '#FF6600',
    result: 'fire_resistance',
  },
  pufferfish: {
    id: 'pufferfish',
    name: 'Pufferfish',
    description: 'Makes Potion of Water Breathing.',
    color: '#4488FF',
    result: 'water_breathing',
  },
  rabbit_foot: {
    id: 'rabbit_foot',
    name: 'Rabbit Foot',
    description: 'Makes Potion of Jump Boost.',
    color: '#DDAA88',
    result: 'jump_boost',
  },
  ghast_tear: {
    id: 'ghast_tear',
    name: 'Ghast Tear',
    description: 'Makes Potion of Regeneration.',
    color: '#FFEEFF',
    result: 'regeneration',
  },
  blaze_rod: {
    id: 'blaze_rod',
    name: 'Blaze Rod',
    description: 'Makes Potion of Strength.',
    color: '#DD8800',
    result: 'strength',
  },
  ender_pearl: {
    id: 'ender_pearl',
    name: 'Ender Pearl',
    description: 'Makes Potion of Invisibility.',
    color: '#888888',
    result: 'invisibility',
  },
};

// ─── Brewing Stand State ────────────────────────────────────────────────────

export interface BrewingStandState {
  x: number;
  y: number;
  roomId: string;
  fuel: number;
  brewing: boolean;
  brewProgress: number;
  slots: Array<{ itemId: string; count: number }>;
  inputSlots: Array<{ itemId: string; count: number }>;
  outputSlots: Array<{ itemId: string; count: number }>;
}

const BREWING_STAND_SLOTS = 4;
const BREWING_INPUT_SLOTS = 3;
const BREWING_OUTPUT_SLOTS = 3;
const BREW_TICKS = 200;

export function createBrewingStandState(
  x: number,
  y: number,
  roomId: string,
): BrewingStandState {
  return {
    x,
    y,
    roomId,
    fuel: 20,
    brewing: false,
    brewProgress: 0,
    slots: Array.from({ length: BREWING_STAND_SLOTS }, () => ({ itemId: '', count: 0 })),
    inputSlots: Array.from({ length: BREWING_INPUT_SLOTS }, () => ({ itemId: '', count: 0 })),
    outputSlots: Array.from({ length: BREWING_OUTPUT_SLOTS }, () => ({ itemId: '', count: 0 })),
  };
}

export function tryPlaceBrewingStand(
  brewingStands: Map<string, BrewingStandState>,
  x: number,
  y: number,
  roomId: string,
): { success: boolean; message?: string } {
  const key = `${x},${y},${roomId}`;
  if (brewingStands.has(key)) {
    return { success: false, message: 'A brewing stand is already here.' };
  }
  brewingStands.set(key, createBrewingStandState(x, y, roomId));
  return { success: true };
}

export function tryBreakBrewingStand(
  brewingStands: Map<string, BrewingStandState>,
  x: number,
  y: number,
  roomId: string,
): { success: boolean; message?: string } {
  const key = `${x},${y},${roomId}`;
  if (!brewingStands.has(key)) {
    return { success: false, message: 'No brewing stand here.' };
  }
  brewingStands.delete(key);
  return { success: true };
}

// ─── Brewing Logic ──────────────────────────────────────────────────────────

export function canBrew(
  stand: BrewingStandState,
  ingredient: string,
): boolean {
  if (!stand.fuel || stand.fuel <= 0) return false;
  if (!ingredient || ingredient === '') return false;
  const hasBasePotion = stand.inputSlots.some(
    (slot) => slot.itemId && slot.itemId.startsWith('awkward'),
  );
  return hasBasePotion;
}

export function startBrewing(
  stand: BrewingStandState,
  ingredient: string,
  player: MinecraftPlayer,
): { success: boolean; message?: string } {
  if (!player.removeItem(ingredient, 1)) {
    return { success: false, message: 'Not enough ingredients.' };
  }

  for (const slot of player.state.inventory) {
    if (stand.inputSlots.length <= stand.brewProgress) break;
    if (slot.itemId && slot.itemId.startsWith('awkward')) {
      const inputIdx = stand.inputSlots.findIndex((s) => !s.itemId || s.count <= 0);
      if (inputIdx >= 0) {
        stand.inputSlots[inputIdx] = { itemId: slot.itemId, count: slot.count };
      }
    }
  }

  stand.brewing = true;
  stand.brewProgress = 0;
  stand.fuel -= 1;

  return { success: true, message: 'Brewing started...' };
}

export function tickBrewingStand(
  stand: BrewingStandState,
): { done: boolean } {
  if (!stand.brewing) {
    return { done: false };
  }

  stand.brewProgress += 1;

  if (stand.brewProgress >= BREW_TICKS) {
    stand.brewing = false;
    stand.brewProgress = 0;

    for (let i = 0; i < Math.min(stand.inputSlots.length, stand.outputSlots.length); i++) {
      const input = stand.inputSlots[i];
      if (!input || !input.itemId) continue;
      stand.outputSlots[i] = { itemId: 'potion', count: 1 };
    }

    return { done: true };
  }

  return { done: false };
}

// ─── Potion Drinking ────────────────────────────────────────────────────────

export function tryDrinkPotion(
  player: MinecraftPlayer,
  _potionType: string,
): { success: boolean; message?: string } {
  const effectId: PotionEffectId = 'speed_i';
  const effect = POTION_EFFECTS[effectId];
  if (!effect) {
    return { success: false, message: 'Unknown potion effect.' };
  }

  effect.applyOnDrink(player, effect.durationTicks);
  return { success: true, message: `Drank ${effect.name} potion!` };
}

// ─── Brewing UI Data ────────────────────────────────────────────────────────

export interface BrewingRecipe {
  ingredient: string;
  result: string;
  description: string;
}

export const BREWING_RECIPES: readonly BrewingRecipe[] = [
  { ingredient: 'nether_wart', result: 'awkward_potion', description: 'Makes Awkward Potion (base)' },
  { ingredient: 'sugar', result: 'speed_potion', description: 'Makes Speed Potion' },
  { ingredient: 'blaze_rod', result: 'strength_potion', description: 'Makes Strength Potion' },
  { ingredient: 'ghast_tear', result: 'regeneration_potion', description: 'Makes Regeneration Potion' },
  { ingredient: 'spider_eye', result: 'poison_potion', description: 'Makes Poison Potion' },
  { ingredient: 'golden_carrot', result: 'night_vision_potion', description: 'Makes Night Vision Potion' },
  { ingredient: 'magma_cream', result: 'fire_resistance_potion', description: 'Makes Fire Resistance Potion' },
  { ingredient: 'pufferfish', result: 'water_breathing_potion', description: 'Makes Water Breathing Potion' },
  { ingredient: 'rabbit_foot', result: 'jump_boost_potion', description: 'Makes Jump Boost Potion' },
  { ingredient: 'ender_pearl', result: 'invisibility_potion', description: 'Makes Invisibility Potion' },
  { ingredient: 'redstone', result: 'extended_duration', description: 'Extends potion duration' },
  { ingredient: 'glowstone_dust', result: 'upgraded_level', description: 'Upgrades potion level' },
  { ingredient: 'gunpowder', result: 'splash_potion', description: 'Makes splash potion' },
  { ingredient: 'fermented_spider_eye', result: 'inverted_effect', description: 'Inverts potion effect' },
];
