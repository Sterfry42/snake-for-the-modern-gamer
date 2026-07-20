/**
 * Companion Manager (Enhanced)
 *
 * The wise old snake's companions:
 * - The wise old snake had companions from every species
 * - The wise old snake's companions were never bought, only chosen
 * - The wise old snake's companions had unique traits
 * - The wise old snake's companions formed families
 * - The wise old snake's companions passed traits to their offspring
 * - The wise old snake's companions were loyal beyond measure
 * - The wise old snake's companions were family
 * - The wise old snake's companions were eternal
 */
import type { AnimalType } from '../types.js';
import type {
  EnhancedCompanion,
  CompanionTrait,
  CompanionTraitDefinition,
  CompanionFamily,
} from '../ecosystem/types.js';

// ── Companion View Type ───────────────────────────────────────────

export interface CompanionView {
  id: string;
  type: AnimalType;
  name: string;
  bond: number;
  bondTier: string;
  huntingBonusPercent: number;
  traits: CompanionTrait[];
  level: number;
  xp: number;
  xpToNext: number;
  generation: number;
  photoTaken: boolean;
  timesFed: number;
}

// ── Trait Definitions ─────────────────────────────────────────────

const TRAIT_DEFINITIONS: Record<CompanionTrait, CompanionTraitDefinition> = {
  swift: {
    trait: 'swift',
    label: 'Swift',
    description: 'Faster movement and evasion.',
    huntingBonus: 0.02,
    bondBonus: 0,
    specialAbility: 'speed-boost',
  },
  strong: {
    trait: 'strong',
    label: 'Strong',
    description: 'Increased combat effectiveness.',
    huntingBonus: 0.03,
    bondBonus: 0,
    specialAbility: 'power-strike',
  },
  clever: {
    trait: 'clever',
    label: 'Clever',
    description: 'Higher intelligence, better at learning.',
    huntingBonus: 0.01,
    bondBonus: 1,
    specialAbility: 'problem-solving',
  },
  fierce: {
    trait: 'fierce',
    label: 'Fierce',
    description: 'Intimidating presence, scares weaker animals.',
    huntingBonus: 0.04,
    bondBonus: -1,
    specialAbility: 'intimidation',
  },
  gentle: {
    trait: 'gentle',
    label: 'Gentle',
    description: 'Easier to bond with, calmer demeanor.',
    huntingBonus: 0,
    bondBonus: 2,
    specialAbility: 'calming-presence',
  },
  stealthy: {
    trait: 'stealthy',
    label: 'Stealthy',
    description: 'Harder to detect, better at sneaking.',
    huntingBonus: 0.02,
    bondBonus: 0,
    specialAbility: 'stealth',
  },
  loyal: {
    trait: 'loyal',
    label: 'Loyal',
    description: 'Unwavering devotion, never abandons the snake.',
    huntingBonus: 0.01,
    bondBonus: 2,
    specialAbility: 'unbreakable-bond',
  },
  wild: {
    trait: 'wild',
    label: 'Wild',
    description: 'Unpredictable but powerful.',
    huntingBonus: 0.03,
    bondBonus: -2,
    specialAbility: 'wild-card',
  },
  ancient: {
    trait: 'ancient',
    label: 'Ancient',
    description: 'Wisdom of ages, rare and powerful.',
    huntingBonus: 0.05,
    bondBonus: 1,
    specialAbility: 'ancient-wisdom',
  },
  'rare-breed': {
    trait: 'rare-breed',
    label: 'Rare Breed',
    description: 'A unique genetic lineage.',
    huntingBonus: 0.04,
    bondBonus: 1,
    specialAbility: 'unique-gene',
  },
};

// ── Trait Inheritance Rules ───────────────────────────────────────

const TRAIT_INHERITANCE: Record<CompanionTrait, CompanionTrait[]> = {
  swift: ['swift', 'stealthy'],
  strong: ['strong', 'fierce'],
  clever: ['clever', 'loyal'],
  fierce: ['fierce', 'wild'],
  gentle: ['gentle', 'loyal'],
  stealthy: ['stealthy', 'swift'],
  loyal: ['loyal', 'gentle', 'clever'],
  wild: ['wild', 'fierce'],
  ancient: ['ancient', 'clever', 'rare-breed'],
  'rare-breed': ['rare-breed', 'ancient'],
};

// ── CompanionManager Class ────────────────────────────────────────

export class CompanionManager {
  private companions: Map<string, EnhancedCompanion> = new Map();
  private families: Map<string, CompanionFamily> = new Map();
  private nextId = 0;

  /** Get all trait definitions */
  static getTraitDefinitions(): Record<CompanionTrait, CompanionTraitDefinition> {
    return TRAIT_DEFINITIONS;
  }

  /** Get a trait definition by trait ID */
  static getTraitDefinition(trait: CompanionTrait): CompanionTraitDefinition {
    return TRAIT_DEFINITIONS[trait];
  }

  /** Get trait inheritance map */
  static getTraitInheritance(): Record<CompanionTrait, CompanionTrait[]> {
    return TRAIT_INHERITANCE;
  }

  /** Add a companion */
  addCompanion(
    type: AnimalType,
    name: string,
    bond: number,
    timesFed: number,
    joinedAtRoom: number,
    initialTraits: CompanionTrait[] = [],
  ): EnhancedCompanion {
    const id = `companion-${this.nextId++}`;

    const companion: EnhancedCompanion = {
      id,
      type,
      name,
      bond,
      timesFed,
      joinedAtRoom,
      traits: [...initialTraits],
      generation: 1,
      photoTaken: false,
      level: 1,
      xp: 0,
    };

    this.companions.set(id, companion);
    return companion;
  }

  /** Get a companion by ID */
  getCompanion(id: string): EnhancedCompanion | undefined {
    return this.companions.get(id);
  }

  /** Get all companions */
  getAllCompanions(): EnhancedCompanion[] {
    return [...this.companions.values()];
  }

  /** Get companions by type */
  getCompanionsByType(type: AnimalType): EnhancedCompanion[] {
    return [...this.companions.values()].filter((c) => c.type === type);
  }

  /** Feed a companion and update bond */
  feedCompanion(
    companionId: string,
    bondGain: number,
  ): {
    success: boolean;
    companion?: EnhancedCompanion;
    previousBond: number;
    crossedMilestone: boolean;
  } {
    const companion = this.companions.get(companionId);
    if (!companion) {
      return { success: false, previousBond: 0, crossedMilestone: false };
    }

    const previousBond = companion.bond;
    const traitBonus = companion.traits.reduce(
      (sum, trait) => sum + (TRAIT_DEFINITIONS[trait]?.bondBonus ?? 0),
      0,
    );

    companion.bond += Math.max(1, Math.floor(bondGain + traitBonus * 0.5));
    companion.timesFed++;

    // Add XP
    companion.xp += 10;
    this.checkLevelUp(companion);

    // Check bond milestones
    const milestones = [5, 10, 20];
    const crossedMilestone = milestones.some((m) => previousBond < m && companion.bond >= m);

    // Chance to gain a trait when crossing milestones
    if (crossedMilestone && companion.traits.length < 3) {
      this.tryGainTrait(companion);
    }

    return {
      success: true,
      companion,
      previousBond,
      crossedMilestone,
    };
  }

  /** Remove a companion (release or death) */
  removeCompanion(id: string): boolean {
    const companion = this.companions.get(id);
    if (!companion) return false;

    this.companions.delete(id);

    // Update family connections
    if (companion.familyId) {
      const family = this.families.get(companion.familyId);
      if (family) {
        family.offspringIds = family.offspringIds.filter((oid) => oid !== id);
        if (family.offspringIds.length === 0 && family.parentIds.length === 0) {
          this.families.delete(companion.familyId);
        }
      }
    }

    return true;
  }

  /** Create a companion family */
  createFamily(parentIds: string[], traits: CompanionTrait[]): CompanionFamily | null {
    const parents = parentIds.map((id) => this.companions.get(id)).filter(Boolean);
    if (parents.length < 2) return null;

    const id = `family-${this.nextId++}`;
    const family: CompanionFamily = {
      id,
      parentIds,
      offspringIds: [],
      traits,
      formedAtRoom: 0,
    };

    this.families.set(id, family);

    // Link parents
    for (const parentId of parentIds) {
      const parent = this.companions.get(parentId);
      if (parent) {
        parent.familyId = id;
      }
    }

    return family;
  }

  /** Breed companions to create offspring */
  breedCompanions(
    parent1Id: string,
    parent2Id: string,
    joinedAtRoom: number,
  ): { success: boolean; offspring?: EnhancedCompanion } {
    const parent1 = this.companions.get(parent1Id);
    const parent2 = this.companions.get(parent2Id);

    if (!parent1 || !parent2) {
      return { success: false };
    }

    // Must be same type to breed
    if (parent1.type !== parent2.type) {
      return { success: false };
    }

    // Must have sufficient bond
    if (parent1.bond < 10 || parent2.bond < 10) {
      return { success: false };
    }

    // Combine traits from both parents
    const combinedTraits = [...new Set([...parent1.traits, ...parent2.traits])];
    const inheritedTraits = this.inheritTraits(combinedTraits);

    // Create offspring
    const offspring = this.addCompanion(
      parent1.type,
      `${parent1.name} Jr.`,
      Math.floor((parent1.bond + parent2.bond) / 4),
      0,
      joinedAtRoom,
      inheritedTraits,
    );

    offspring.generation = Math.max(parent1.generation, parent2.generation) + 1;

    // Create family
    const family = this.createFamily([parent1Id, parent2Id], inheritedTraits);
    if (family) {
      family.offspringIds.push(offspring.id);
    }

    return { success: true, offspring };
  }

  /** Take a photo of a companion */
  takePhoto(companionId: string): { success: boolean; photoTaken: boolean } {
    const companion = this.companions.get(companionId);
    if (!companion) {
      return { success: false, photoTaken: false };
    }

    companion.photoTaken = true;
    return { success: true, photoTaken: true };
  }

  /** Calculate total hunting bonus from all companions */
  getHuntingBonus(): number {
    return [...this.companions.values()].reduce((total, companion) => {
      let bonus = 0;

      // Base bond bonus
      if (companion.bond >= 20) bonus += 0.05;
      else if (companion.bond >= 10) bonus += 0.03;
      else if (companion.bond >= 5) bonus += 0.01;

      // Trait bonuses
      for (const trait of companion.traits) {
        bonus += TRAIT_DEFINITIONS[trait]?.huntingBonus ?? 0;
      }

      return total + bonus;
    }, 0);
  }

  /** Get companion bond tier */
  getBondTier(bond: number): string {
    if (bond >= 20) return 'SOULBOUND';
    if (bond >= 10) return 'LOYAL';
    if (bond >= 5) return 'TRUSTING';
    return 'WARY';
  }

  /** Check if companion crossed a bond milestone */
  crossedMilestone(previousBond: number, currentBond: number): boolean {
    const milestones = [5, 10, 20];
    return milestones.some((m) => previousBond < m && currentBond >= m);
  }

  /** Get companion view data for UI */
  getCompanionView(companion: EnhancedCompanion): CompanionView {
    const huntingBonus = this.getCompanionHuntingBonus(companion);

    return {
      id: companion.id,
      type: companion.type,
      name: companion.name,
      bond: companion.bond,
      bondTier: this.getBondTier(companion.bond),
      huntingBonusPercent: Math.round(huntingBonus * 100),
      traits: companion.traits,
      level: companion.level,
      xp: companion.xp,
      xpToNext: this.getXpForLevel(companion.level + 1),
      generation: companion.generation,
      photoTaken: companion.photoTaken,
      timesFed: companion.timesFed,
    };
  }

  /** Get all companion views */
  getAllCompanionViews(): CompanionView[] {
    return [...this.companions.values()].map((c) => this.getCompanionView(c));
  }

  // ── Private Helpers ─────────────────────────────────────────────

  private rng(): number {
    return Math.random();
  }

  private checkLevelUp(companion: EnhancedCompanion): void {
    const xpNeeded = this.getXpForLevel(companion.level + 1);
    if (companion.xp >= xpNeeded) {
      companion.level++;
      companion.xp -= xpNeeded;

      // Level up bonus: small chance to gain a trait
      if (companion.traits.length < 3 && this.rng() < 0.3) {
        this.tryGainTrait(companion);
      }
    }
  }

  private getXpForLevel(level: number): number {
    return level * 50;
  }

  private tryGainTrait(companion: EnhancedCompanion): void {
    const allTraits = Object.keys(TRAIT_DEFINITIONS) as CompanionTrait[];
    const availableTraits = allTraits.filter((t) => !companion.traits.includes(t));

    if (availableTraits.length === 0) return;

    const newTrait = availableTraits[Math.floor(this.rng() * availableTraits.length)];
    companion.traits.push(newTrait);
  }

  private inheritTraits(parentTraits: CompanionTrait[]): CompanionTrait[] {
    const inherited: CompanionTrait[] = [];

    for (const trait of parentTraits) {
      const inheritance = TRAIT_INHERITANCE[trait];
      if (inheritance && this.rng() < 0.4) {
        // 40% chance to inherit a related trait
        const relatedTrait = inheritance[Math.floor(this.rng() * inheritance.length)];
        if (!inherited.includes(relatedTrait)) {
          inherited.push(relatedTrait);
        }
      }
    }

    // Also inherit the direct trait with 50% chance
    for (const trait of parentTraits) {
      if (this.rng() < 0.5 && !inherited.includes(trait)) {
        inherited.push(trait);
      }
    }

    return inherited;
  }

  private getCompanionHuntingBonus(companion: EnhancedCompanion): number {
    let bonus = 0;

    // Base bond bonus
    if (companion.bond >= 20) bonus += 0.05;
    else if (companion.bond >= 10) bonus += 0.03;
    else if (companion.bond >= 5) bonus += 0.01;

    // Trait bonuses
    for (const trait of companion.traits) {
      bonus += TRAIT_DEFINITIONS[trait]?.huntingBonus ?? 0;
    }

    return bonus;
  }
}
