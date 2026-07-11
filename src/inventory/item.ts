export type EquipmentSlot =
  | 'weapon'
  | 'boots'
  | 'helm'
  | 'ring'
  | 'gloves'
  | 'cloak'
  | 'belt'
  | 'amulet';

export const EQUIPMENT_SLOTS: readonly EquipmentSlot[] = [
  'weapon',
  'boots',
  'helm',
  'ring',
  'gloves',
  'cloak',
  'belt',
  'amulet',
];

export interface BaseItem {
  id: string;
  name: string;
  description: string;
  category?: 'food' | 'material' | 'charm' | 'recipe' | 'quest' | 'consumable';
}

export interface EquipmentModifiers {
  // Multiplies the game tick delay. < 1 speeds up, > 1 slows down.
  tickDelayScalar?: number;
  // Adds to wall sensing radius used for wall highlighting.
  wallSenseBonus?: number;
  // Adds to seismic pulse radius triggered on apple.
  seismicPulseBonus?: number;
  // Enables masonry building mechanic.
  masonryEnabled?: boolean;
  // Adds to invulnerability duration granted on apple.
  invulnerabilityBonus?: number;
  // Passive growth over time
  regenerator?: { interval: number; amount: number };
  // Extra life effect for one revive
  phoenixCharges?: number;
  // Enables player shooting when equipped.
  gunEnabled?: boolean;
  // Reduces exposure in temperature hazard biomes.
  heatResistance?: number;
  coldResistance?: number;
  // Allows safe traversal over water tiles.
  swimmingEnabled?: boolean;
  refundEveryRooms?: { interval: number; score: number };
  appleScorePenalty?: number;
  hazardMapSense?: number;
  radiationTimerScalar?: number;
  // Enables wall-smite ability for katana.
  wallSmiteEnabled?: boolean;
  // Periodic shrine blessings from Kami religion.
  shrineBlessing?: boolean;
  // Reveals yokai disguises in NPC encounters.
  yokaiInsight?: boolean;
  // Passive length growth (spiritual discipline).
  spiritualLength?: boolean;
  // Enables the fishing minigame overlay.
  fishingEnabled?: boolean;
  // Multiplies fish sell prices and score when fishing.
  fishingMod?: number;
  // Adds a player-centered light radius in dark rooms.
  lightRadiusTiles?: number;
}

export interface EquipableItem extends BaseItem {
  kind: 'equipment';
  slot: EquipmentSlot;
  modifiers?: EquipmentModifiers;
}

export interface SimpleItem extends BaseItem {
  kind?: undefined | 'consumable';
}

export type Item = EquipableItem | SimpleItem;
