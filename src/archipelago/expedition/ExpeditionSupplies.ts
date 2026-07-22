/**
 * Archipelago Island Expeditions
 */
import type { IslandId } from './types.js';
import { ISLAND_BY_ID } from './IslandRegistry.js';
import type { RandomGenerator } from '../../core/rng.js';

export interface SupplySlot {
  index: number;
  appleTypeId: string | null;
  quantity: number;
}

export interface SupplyItem {
  appleTypeId: string;
  name: string;
  quantity: number;
  category: 'essential' | 'recommended' | 'avoid';
  description: string;
}

export interface SupplyPackingResult {
  success: boolean;
  message: string;
  score: number;
  missingEssentials: string[];
  extraRecommended: string[];
  avoidedItems: string[];
}

const MAX_SUPPLY_SLOTS = 6;

interface SupplyDefinition {
  appleTypeId: string;
  name: string;
  category: 'essential' | 'recommended' | 'avoid';
  description: string;
}

interface DragState {
  dragging: boolean;
  sourceSlot: number | null;
  targetSlot: number | null;
  appleTypeId: string | null;
}

const SUPPLY_DEFINITIONS: Record<IslandId, SupplyDefinition[]> = {
  'volcanic-isle': [
    {
      appleTypeId: 'caffeinated',
      name: 'Caffeinated Apple',
      category: 'essential',
      description: 'Required for island entry',
    },
    {
      appleTypeId: 'wasabi',
      name: 'Wasabi Apple',
      category: 'recommended',
      description: 'Increases heat resistance',
    },
    {
      appleTypeId: 'heatwave',
      name: 'Heatwave Apple',
      category: 'recommended',
      description: 'Boosts lava navigation',
    },
    {
      appleTypeId: 'frost',
      name: 'Frost Apple',
      category: 'avoid',
      description: 'Extinguishes lava paths',
    },
    {
      appleTypeId: 'winterberry',
      name: 'Winterberry Apple',
      category: 'avoid',
      description: 'Freezes magma flows',
    },
  ],
  'crystal-cavern': [
    {
      appleTypeId: 'shielded',
      name: 'Shielded Apple',
      category: 'essential',
      description: 'Required for cavern entry',
    },
    {
      appleTypeId: 'yuzu',
      name: 'Yuzu Apple',
      category: 'recommended',
      description: 'Enhances crystal vision',
    },
    {
      appleTypeId: 'amacha',
      name: 'Amacha Apple',
      category: 'recommended',
      description: 'Stabilizes light refraction',
    },
    {
      appleTypeId: 'spicy-energy',
      name: 'Spicy Energy Apple',
      category: 'avoid',
      description: 'Shatters crystal formations',
    },
    {
      appleTypeId: 'caffeinated',
      name: 'Caffeinated Apple',
      category: 'avoid',
      description: 'Causes crystal resonance overload',
    },
  ],
  'sunken-temple': [
    {
      appleTypeId: 'koi',
      name: 'Koi Apple',
      category: 'essential',
      description: 'Required for underwater breathing',
    },
    {
      appleTypeId: 'amacha',
      name: 'Amacha Apple',
      category: 'recommended',
      description: 'Calm waters navigation',
    },
    {
      appleTypeId: 'cold-beer',
      name: 'Cold Beer Apple',
      category: 'recommended',
      description: 'Deep water pressure resistance',
    },
    {
      appleTypeId: 'caffeinated',
      name: 'Caffeinated Apple',
      category: 'avoid',
      description: 'Causes panic in deep water',
    },
    {
      appleTypeId: 'spicy-energy',
      name: 'Spicy Energy Apple',
      category: 'avoid',
      description: 'Overheats underwater systems',
    },
  ],
  'sky-garden': [
    {
      appleTypeId: 'lavender',
      name: 'Lavender Apple',
      category: 'essential',
      description: 'Required for flight capability',
    },
    {
      appleTypeId: 'yuzu',
      name: 'Yuzu Apple',
      category: 'recommended',
      description: 'Wind current sensing',
    },
    {
      appleTypeId: 'love',
      name: 'Love Apple',
      category: 'recommended',
      description: 'Attracts helpful sky creatures',
    },
    {
      appleTypeId: 'lead-flippers',
      name: 'Lead Flippers Apple',
      category: 'avoid',
      description: 'Too heavy for flight',
    },
    {
      appleTypeId: 'heavy',
      name: 'Heavy Apple',
      category: 'avoid',
      description: 'Anchors the snake to the ground',
    },
  ],
  'ancient-ruins': [
    {
      appleTypeId: 'gold',
      name: 'Gold Apple',
      category: 'essential',
      description: 'Required to unlock ruins',
    },
    {
      appleTypeId: 'mochi',
      name: 'Mochi Apple',
      category: 'recommended',
      description: 'Soft movement through traps',
    },
    {
      appleTypeId: 'love',
      name: 'Love Apple',
      category: 'recommended',
      description: 'Peaceful ancient guardians',
    },
    {
      appleTypeId: 'wasabi',
      name: 'Wasabi Apple',
      category: 'avoid',
      description: 'Triggers ancient traps',
    },
    {
      appleTypeId: 'caffeinated',
      name: 'Caffeinated Apple',
      category: 'avoid',
      description: 'Startles ancient guardians',
    },
  ],
  'mirror-dimension': [
    {
      appleTypeId: 'skittish',
      name: 'Skittish Apple',
      category: 'essential',
      description: 'Required to enter mirror world',
    },
    {
      appleTypeId: 'caffeinated',
      name: 'Caffeinated Apple',
      category: 'recommended',
      description: 'Sharpens mirror perception',
    },
    {
      appleTypeId: 'mochi',
      name: 'Mochi Apple',
      category: 'recommended',
      description: 'Flexible mirror navigation',
    },
    {
      appleTypeId: 'lavender',
      name: 'Lavender Apple',
      category: 'avoid',
      description: 'Confuses mirror reflections',
    },
    { appleTypeId: 'koi', name: 'Koi Apple', category: 'avoid', description: 'Drowns reflections' },
  ],
};

export class ExpeditionSupplies {
  private slots: SupplySlot[];
  private rng: RandomGenerator;
  private dragState: DragState = {
    dragging: false,
    sourceSlot: null,
    targetSlot: null,
    appleTypeId: null,
  };

  constructor(rng: RandomGenerator) {
    this.rng = rng;
    this.slots = Array.from({ length: MAX_SUPPLY_SLOTS }, (_, i) => ({
      index: i,
      appleTypeId: null,
      quantity: 1,
    }));
  }

  getSlots(): SupplySlot[] {
    return [...this.slots];
  }

  clearSlots(): void {
    this.slots = Array.from({ length: MAX_SUPPLY_SLOTS }, (_, i) => ({
      index: i,
      appleTypeId: null,
      quantity: 1,
    }));
  }

  setSlotApple(slotIndex: number, appleTypeId: string | null, quantity: number = 1): boolean {
    if (slotIndex < 0 || slotIndex >= MAX_SUPPLY_SLOTS) return false;

    this.slots[slotIndex] = {
      index: slotIndex,
      appleTypeId,
      quantity: Math.max(1, Math.min(3, quantity)),
    };
    return true;
  }

  getSlot(slotIndex: number): SupplySlot {
    return { ...this.slots[slotIndex] };
  }

  getAvailableSupplies(islandId: IslandId): SupplyItem[] {
    const island = ISLAND_BY_ID[islandId];
    if (!island) return [];

    const definitions = SUPPLY_DEFINITIONS[islandId];
    if (!definitions) return [];

    return definitions.map((def) => ({
      appleTypeId: def.appleTypeId,
      name: def.name,
      quantity: 1,
      category: def.category,
      description: def.description,
    }));
  }

  isSlotOccupied(slotIndex: number): boolean {
    return this.slots[slotIndex].appleTypeId !== null;
  }

  getOccupiedSlotCount(): number {
    return this.slots.filter((s) => s.appleTypeId !== null).length;
  }

  packForExpedition(islandId: IslandId): SupplyPackingResult {
    const island = ISLAND_BY_ID[islandId];
    if (!island) {
      return {
        success: false,
        message: 'Unknown island',
        score: 0,
        missingEssentials: [],
        extraRecommended: [],
        avoidedItems: [],
      };
    }

    const definitions = SUPPLY_DEFINITIONS[islandId];
    if (!definitions) {
      return {
        success: false,
        message: 'No supply definitions for this island',
        score: 0,
        missingEssentials: [],
        extraRecommended: [],
        avoidedItems: [],
      };
    }

    const occupiedSlots = this.slots.filter((s) => s.appleTypeId !== null);
    const suppliedApples = new Map<string, number>();
    for (const slot of occupiedSlots) {
      suppliedApples.set(
        slot.appleTypeId!,
        (suppliedApples.get(slot.appleTypeId!) ?? 0) + slot.quantity,
      );
    }

    const essentialDefs = definitions.filter((d) => d.category === 'essential');
    const recommendedDefs = definitions.filter((d) => d.category === 'recommended');
    const avoidDefs = definitions.filter((d) => d.category === 'avoid');

    const missingEssentials: string[] = [];
    const avoidedItems: string[] = [];

    for (const def of essentialDefs) {
      if (!suppliedApples.has(def.appleTypeId)) {
        missingEssentials.push(def.appleTypeId);
      }
    }

    for (const def of avoidDefs) {
      if (suppliedApples.has(def.appleTypeId)) {
        avoidedItems.push(def.appleTypeId);
      }
    }

    let score = 0;
    const maxScore = 100;

    const essentialCount = essentialDefs.length;
    const essentialMet = essentialDefs.filter((d) => suppliedApples.has(d.appleTypeId)).length;
    score += Math.round((essentialMet / Math.max(essentialCount, 1)) * 40);

    const recommendedMet = recommendedDefs.filter((d) => suppliedApples.has(d.appleTypeId)).length;
    score += Math.round((recommendedMet / Math.max(recommendedDefs.length, 1)) * 30);

    score -= avoidedItems.length * 15;

    const utilization = occupiedSlots.length / MAX_SUPPLY_SLOTS;
    score += Math.round(utilization * 20);

    score = Math.max(0, Math.min(maxScore, score));

    const success = missingEssentials.length === 0 && avoidedItems.length === 0;

    return {
      success,
      message: success
        ? 'Expedition supplies are ready!'
        : `Missing: ${missingEssentials.join(', ')}${avoidedItems.length > 0 ? `. Avoided: ${avoidedItems.join(', ')}` : ''}`,
      score,
      missingEssentials,
      extraRecommended: recommendedDefs
        .filter((d) => !suppliedApples.has(d.appleTypeId))
        .map((d) => d.appleTypeId),
      avoidedItems,
    };
  }

  quickPackRandom(islandId: IslandId): void {
    const supplies = this.getAvailableSupplies(islandId);
    const essential = supplies.filter((s) => s.category === 'essential');
    const recommended = supplies.filter((s) => s.category === 'recommended');

    let slotIndex = 0;
    for (const item of essential) {
      if (slotIndex >= MAX_SUPPLY_SLOTS) break;
      this.setSlotApple(slotIndex, item.appleTypeId, 1);
      slotIndex++;
    }

    const remainingSlots = MAX_SUPPLY_SLOTS - slotIndex;
    const shuffled = [...recommended].sort(() => this.rng() - 0.5);
    for (let i = 0; i < Math.min(remainingSlots, shuffled.length); i++) {
      this.setSlotApple(slotIndex + i, shuffled[i].appleTypeId, 1);
    }
  }

  startDrag(slotIndex: number): void {
    const slot = this.slots[slotIndex];
    if (slot.appleTypeId === null) return;

    this.dragState = {
      dragging: true,
      sourceSlot: slotIndex,
      targetSlot: null,
      appleTypeId: slot.appleTypeId,
    };
  }

  endDrag(targetSlotIndex: number): void {
    if (!this.dragState.dragging) return;

    const { sourceSlot } = this.dragState;

    if (sourceSlot !== null && targetSlotIndex !== sourceSlot) {
      const temp = { ...this.slots[sourceSlot] };
      this.slots[sourceSlot] = { ...this.slots[targetSlotIndex] };
      this.slots[targetSlotIndex] = temp;
    }

    this.dragState = {
      dragging: false,
      sourceSlot: null,
      targetSlot: null,
      appleTypeId: null,
    };
  }

  cancelDrag(): void {
    this.dragState = {
      dragging: false,
      sourceSlot: null,
      targetSlot: null,
      appleTypeId: null,
    };
  }

  isDragging(): boolean {
    return this.dragState.dragging;
  }

  getDragData(): { appleTypeId: string | null; sourceSlot: number | null } {
    return {
      appleTypeId: this.dragState.appleTypeId,
      sourceSlot: this.dragState.sourceSlot,
    };
  }
}
