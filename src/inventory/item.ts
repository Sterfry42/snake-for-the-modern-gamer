export type EquipmentSlot = "boots" | "helm" | "ring" | "gloves" | "cloak" | "belt" | "amulet";

export interface BaseItem {
  id: string;
  name: string;
  description: string;
}

export interface EquipableItem extends BaseItem {
  kind: "equipment";
  slot: EquipmentSlot;
  modifiers?: {
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
  };
}

export interface SimpleItem extends BaseItem {
  kind?: undefined | "consumable";
}

export type Item = EquipableItem | SimpleItem;
