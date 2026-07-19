/**
 * Ecosystem Manager
 *
 * The wise old snake's ecosystem manager:
 * - The wise old snake managed the ecosystem with wisdom and patience
 * - The wise old snake's ecosystem was always balanced
 * - The wise old snake never needed to intervene
 * - The wise old snake's ecosystem ran itself
 * - The wise old snake's ecosystem was perfect
 * - The wise old snake's ecosystem had no problems
 * - The wise old snake's ecosystem was the gold standard
 * - The wise old snake's ecosystem was eternal
 */
import type { AnimalType } from '../types.js';
import type { RandomGenerator } from '../../core/rng.js';
import { clamp } from '../../core/math.js';
import type {
  EcosystemBalance,
  EcosystemBalanceState,
  EcosystemEvent,
  EcosystemEventType,
  EcosystemRole,
  EcosystemRoleDefinition,
} from './types.js';
import type { EcologySystem } from '../ecology.js';
import {
  findPredatorPreyRelations,
  getHuntRange,
  type PredatorPreyRelation,
} from '../ecology.js';

// ── Ecosystem Role Definitions ────────────────────────────────────

const ECOSYSTEM_ROLES: Record<AnimalType, EcosystemRoleDefinition> = {
  rabbit: {
    role: 'herbivore',
    consumptionRate: 2,
    reproductionRate: 1.5,
    naturalDeathRate: 0.02,
  },
  deer: {
    role: 'herbivore',
    consumptionRate: 3,
    reproductionRate: 0.8,
    naturalDeathRate: 0.01,
  },
  fox: {
    role: 'predator',
    consumptionRate: 2,
    reproductionRate: 0.6,
    naturalDeathRate: 0.03,
  },
  wolf: {
    role: 'predator',
    consumptionRate: 3,
    reproductionRate: 0.5,
    naturalDeathRate: 0.04,
  },
  bear: {
    role: 'omnivore',
    consumptionRate: 4,
    reproductionRate: 0.3,
    naturalDeathRate: 0.03,
  },
  snake: {
    role: 'predator',
    consumptionRate: 2,
    reproductionRate: 0.5,
    naturalDeathRate: 0.02,
  },
  eagle: {
    role: 'predator',
    consumptionRate: 2,
    reproductionRate: 0.4,
    naturalDeathRate: 0.04,
  },
  jackalope: {
    role: 'herbivore',
    consumptionRate: 1,
    reproductionRate: 1.2,
    naturalDeathRate: 0.03,
  },
  raccoon: {
    role: 'omnivore',
    consumptionRate: 2,
    reproductionRate: 1.0,
    naturalDeathRate: 0.02,
  },
  coyote: {
    role: 'predator',
    consumptionRate: 2,
    reproductionRate: 0.6,
    naturalDeathRate: 0.03,
  },
  bison: {
    role: 'herbivore',
    consumptionRate: 4,
    reproductionRate: 0.5,
    naturalDeathRate: 0.01,
  },
  bass: {
    role: 'omnivore',
    consumptionRate: 1,
    reproductionRate: 1.5,
    naturalDeathRate: 0.03,
  },
  possum: {
    role: 'scavenger',
    consumptionRate: 1,
    reproductionRate: 1.0,
    naturalDeathRate: 0.02,
  },
  armadillo: {
    role: 'omnivore',
    consumptionRate: 1,
    reproductionRate: 0.6,
    naturalDeathRate: 0.02,
  },
  frog: {
    role: 'omnivore',
    consumptionRate: 1,
    reproductionRate: 1.8,
    naturalDeathRate: 0.04,
  },
  fish: {
    role: 'omnivore',
    consumptionRate: 1,
    reproductionRate: 2.0,
    naturalDeathRate: 0.05,
  },
  bird: {
    role: 'omnivore',
    consumptionRate: 1,
    reproductionRate: 1.0,
    naturalDeathRate: 0.03,
  },
};

// ── Predator-Prey Population Targets ──────────────────────────────

interface PopulationTarget {
  predator: AnimalType;
  prey: AnimalType;
  /** Ideal ratio: predators per 10 prey */
  idealRatio: number;
  /** Tolerance band around the ideal ratio */
  tolerance: number;
}

const POPULATION_TARGETS: PopulationTarget[] = [
  { predator: 'wolf', prey: 'rabbit', idealRatio: 2, tolerance: 1 },
  { predator: 'wolf', prey: 'deer', idealRatio: 1, tolerance: 0.5 },
  { predator: 'fox', prey: 'rabbit', idealRatio: 3, tolerance: 1.5 },
  { predator: 'bear', prey: 'rabbit', idealRatio: 1, tolerance: 0.5 },
  { predator: 'eagle', prey: 'jackalope', idealRatio: 1, tolerance: 0.5 },
  { predator: 'eagle', prey: 'frog', idealRatio: 2, tolerance: 1 },
  { predator: 'coyote', prey: 'jackalope', idealRatio: 1, tolerance: 0.5 },
  { predator: 'coyote', prey: 'possum', idealRatio: 2, tolerance: 1 },
  { predator: 'fox', prey: 'frog', idealRatio: 2, tolerance: 1 },
];

// ── Ecosystem Event Definitions ───────────────────────────────────

const ECOSYSTEM_EVENTS: Array<{
  type: EcosystemEventType;
  triggerCondition: (balance: EcosystemBalance) => boolean;
  severity: EcosystemEvent['severity'];
  description: string;
}> = [
  {
    type: 'predator-outbreak',
    triggerCondition: (b) => b.predatorPreyRatio > 3,
    severity: 'high',
    description: 'Predator population surges — prey species scatter!',
  },
  {
    type: 'herbivore-migration',
    triggerCondition: (b) => b.herbivorePopulation > 80 && b.plantBiomass < 30,
    severity: 'medium',
    description: 'Herbivores migrate in search of fresh grazing lands.',
  },
  {
    type: 'plague',
    triggerCondition: (b) => b.overallHealth < 20,
    severity: 'catastrophic',
    description: 'A mysterious plague sweeps through the ecosystem!',
  },
  {
    type: 'famine',
    triggerCondition: (b) => b.plantBiomass < 10,
    severity: 'high',
    description: 'Plant life withers — starvation looms over the ecosystem.',
  },
  {
    type: 'mating-season',
    triggerCondition: (b) => b.overallHealth > 70 && b.herbivorePopulation > 40,
    severity: 'low',
    description: 'The mating season brings new life to the ecosystem.',
  },
  {
    type: 'ecosystem-recovery',
    triggerCondition: (b) => b.overallHealth < 40 && b.overallHealth > 20,
    severity: 'low',
    description: 'Nature begins to heal and restore balance.',
  },
];

// ── EcosystemManager Class ────────────────────────────────────────

export class EcosystemManager {
  private balance: EcosystemBalance;
  private activeEvents: EcosystemEvent[] = [];
  private eventCounter = 0;
  private stepCounter = 0;

  constructor(
    private readonly rng: RandomGenerator,
    private readonly ecology: EcologySystem,
  ) {
    this.balance = {
      state: 'balanced',
      overallHealth: 75,
      predatorPreyRatio: 1,
      herbivorePopulation: 50,
      plantBiomass: 60,
      decomposerActivity: 40,
      lastEvent: null,
      lastEventTimestamp: null,
    };
  }

  /** Get the current ecosystem balance state */
  getBalance(): EcosystemBalance {
    return { ...this.balance };
  }

  /** Get all active ecosystem events */
  getActiveEvents(): readonly EcosystemEvent[] {
    return [...this.activeEvents];
  }

  /** Get the ecosystem role for an animal type */
  getAnimalRole(animalType: AnimalType): EcosystemRole {
    return ECOSYSTEM_ROLES[animalType]?.role ?? 'omnivore';
  }

  /** Get all predator-prey relations for an animal */
  getEcologicalRelations(animalType: AnimalType): {
    predators: AnimalType[];
    prey: AnimalType[];
    role: EcosystemRole;
  } {
    const { predators, prey } = findPredatorPreyRelations(this.ecology, animalType);
    return {
      predators,
      prey,
      role: this.getAnimalRole(animalType),
    };
  }

  /** Process one ecosystem step — called each game tick */
  step(
    animalCounts: ReadonlyMap<AnimalType, number>,
    plantBiomass: number,
  ): {
    balance: EcosystemBalance;
    triggeredEvents: EcosystemEvent[];
    spawnModifiers: ReadonlyMap<AnimalType, number>;
  } {
    this.stepCounter++;

    // Update population counts
    const predatorCount = this.countPredators(animalCounts);
    const herbivoreCount = this.countHerbivores(animalCounts);
    const preyCount = this.countPrey(animalCounts);

    // Calculate ratios and metrics
    const predatorPreyRatio = preyCount > 0 ? predatorCount / preyCount : 0;

    // Apply natural dynamics
    const newPlantBiomass = this.updatePlantBiomass(plantBiomass, herbivoreCount);
    const newHerbivorePop = this.updateHerbivorePopulation(animalCounts);
    const newDecomposerActivity = this.updateDecomposerActivity(animalCounts);

    // Calculate health
    const health = this.calculateHealth(
      newPlantBiomass,
      predatorPreyRatio,
      newHerbivorePop,
      newDecomposerActivity,
    );

    // Update balance state
    this.balance = {
      state: this.determineBalanceState(health),
      overallHealth: health,
      predatorPreyRatio,
      herbivorePopulation: newHerbivorePop,
      plantBiomass: newPlantBiomass,
      decomposerActivity: newDecomposerActivity,
      lastEvent: this.balance.lastEvent,
      lastEventTimestamp: this.balance.lastEventTimestamp,
    };

    // Process active events (tick down durations)
    this.activeEvents = this.activeEvents
      .map((event) => ({
        ...event,
        durationSteps: event.durationSteps - 1,
      }))
      .filter((event) => event.durationSteps > 0);

    // Check for new events
    const triggeredEvents: EcosystemEvent[] = [];
    for (const eventDef of ECOSYSTEM_EVENTS) {
      if (
        eventDef.triggerCondition(this.balance) &&
        !this.activeEvents.some((e) => e.type === eventDef.type)
      ) {
        const event = this.createEcosystemEvent(eventDef);
        this.activeEvents.push(event);
        triggeredEvents.push(event);
        this.balance.lastEvent = eventDef.description;
        this.balance.lastEventTimestamp = this.stepCounter;
      }
    }

    // Calculate spawn modifiers based on current balance and events
    const spawnModifiers = this.calculateSpawnModifiers(animalCounts);

    return {
      balance: this.balance,
      triggeredEvents,
      spawnModifiers,
    };
  }

  /** Get spawn modifier for a specific animal type */
  getSpawnModifier(animalType: AnimalType): number {
    return this.calculateSpawnModifiers().get(animalType) ?? 1;
  }

  /** Check if an animal should flee due to ecosystem stress */
  shouldFleeFromEcosystemStress(animalType: AnimalType, distance: number): boolean {
    const { predators } = this.getEcologicalRelations(animalType);
    // If ecosystem is stressed, predators hunt more aggressively
    if (
      this.balance.state === 'stressed' ||
      this.balance.state === 'critical' ||
      this.balance.state === 'collapsing'
    ) {
      for (const predator of predators) {
        const range = getHuntRange(this.ecology, predator, animalType);
        if (range && distance < range * 1.5) {
          return true;
        }
      }
    }
    return false;
  }

  /** Apply snake interaction effects to the ecosystem */
  applySnakeInteraction(
    action: 'hunt' | 'tame' | 'eat' | 'observe',
    animalType: AnimalType,
  ): void {
    const role = ECOSYSTEM_ROLES[animalType];
    if (!role) return;

    switch (action) {
      case 'hunt':
        // Hunting reduces population, affects balance
        if (role.role === 'predator') {
          this.balance.predatorPreyRatio = Math.max(0, this.balance.predatorPreyRatio - 0.1);
          this.balance.overallHealth = clamp(
            this.balance.overallHealth + 2,
            0,
            100,
          );
        } else if (role.role === 'herbivore') {
          this.balance.herbivorePopulation = Math.max(
            0,
            this.balance.herbivorePopulation - 1,
          );
          this.balance.overallHealth = clamp(
            this.balance.overallHealth - 1,
            0,
            100,
          );
        }
        break;
      case 'tame':
        // Taming reduces wild population slightly
        if (role.role === 'herbivore') {
          this.balance.herbivorePopulation = Math.max(
            0,
            this.balance.herbivorePopulation - 0.5,
          );
        }
        break;
      case 'observe':
        // Observing has minimal impact
        this.balance.overallHealth = clamp(
          this.balance.overallHealth + 0.5,
          0,
          100,
        );
        break;
    }
  }

  /** Get ecosystem status for HUD display */
  getHudStatus(): {
    healthBar: number;
    balanceState: EcosystemBalanceState;
    predatorPreyRatio: number;
    herbivoreCount: number;
    plantBiomass: number;
    eventWarnings: string[];
  } {
    const eventWarnings: string[] = [];
    for (const event of this.activeEvents) {
      if (event.severity === 'high' || event.severity === 'catastrophic') {
        eventWarnings.push(event.description);
      }
    }

    return {
      healthBar: Math.round(this.balance.overallHealth),
      balanceState: this.balance.state,
      predatorPreyRatio: Math.round(this.balance.predatorPreyRatio * 100) / 100,
      herbivoreCount: Math.round(this.balance.herbivorePopulation),
      plantBiomass: Math.round(this.balance.plantBiomass),
      eventWarnings,
    };
  }

  // ── Private Helpers ─────────────────────────────────────────────

  private countPredators(animalCounts: ReadonlyMap<AnimalType, number>): number {
    let count = 0;
    for (const [type, num] of animalCounts) {
      if (ECOSYSTEM_ROLES[type]?.role === 'predator') {
        count += num;
      }
    }
    return count;
  }

  private countHerbivores(animalCounts: ReadonlyMap<AnimalType, number>): number {
    let count = 0;
    for (const [type, num] of animalCounts) {
      if (ECOSYSTEM_ROLES[type]?.role === 'herbivore') {
        count += num;
      }
    }
    return count;
  }

  private countPrey(animalCounts: ReadonlyMap<AnimalType, number>): number {
    let count = 0;
    for (const [type, num] of animalCounts) {
      const role = ECOSYSTEM_ROLES[type]?.role;
      if (role === 'herbivore' || role === 'scavenger') {
        count += num;
      }
    }
    return count;
  }

  private updatePlantBiomass(
    current: number,
    herbivoreCount: number,
  ): number {
    // Plants grow naturally but are consumed by herbivores
    const growth = 2;
    const consumption = herbivoreCount * 0.3;
    return clamp(current + growth - consumption, 0, 100);
  }

  private updateHerbivorePopulation(
    animalCounts: ReadonlyMap<AnimalType, number>,
  ): number {
    let total = 0;
    for (const [type, count] of animalCounts) {
      if (ECOSYSTEM_ROLES[type]?.role === 'herbivore') {
        total += count;
      }
    }
    return total;
  }

  private updateDecomposerActivity(
    animalCounts: ReadonlyMap<AnimalType, number>,
  ): number {
    let activity = 0;
    for (const [type, count] of animalCounts) {
      if (ECOSYSTEM_ROLES[type]?.role === 'decomposer' || type === 'possum') {
        activity += count * 5;
      }
    }
    return clamp(activity, 0, 100);
  }

  private calculateHealth(
    plantBiomass: number,
    predatorPreyRatio: number,
    herbivorePopulation: number,
    decomposerActivity: number,
  ): number {
    // Health is a weighted average of ecosystem factors
    const plantHealth = plantBiomass;
    const ratioHealth = predatorPreyRatio < 2 ? 80 : Math.max(0, 80 - (predatorPreyRatio - 2) * 20);
    const populationHealth = herbivorePopulation > 10 && herbivorePopulation < 100 ? 80 : 50;
    const decomposerHealth = decomposerActivity > 20 ? 80 : 50;

    return Math.round(
      plantHealth * 0.3 +
        ratioHealth * 0.3 +
        populationHealth * 0.2 +
        decomposerHealth * 0.2,
    );
  }

  private determineBalanceState(health: number): EcosystemBalanceState {
    if (health >= 80) return 'balanced';
    if (health >= 60) return 'healthy';
    if (health >= 40) return 'stressed';
    if (health >= 20) return 'critical';
    return 'collapsing';
  }

  private createEcosystemEvent(eventDef: {
    type: EcosystemEventType;
    severity: EcosystemEvent['severity'];
    description: string;
  }): EcosystemEvent {
    this.eventCounter++;

    const affectedTypes: AnimalType[] = [];
    for (const [type, roleDef] of Object.entries(ECOSYSTEM_ROLES)) {
      if (
        eventDef.type === 'predator-outbreak' && roleDef.role === 'predator'
      ) {
        affectedTypes.push(type as AnimalType);
      }
      if (
        eventDef.type === 'herbivore-migration' && roleDef.role === 'herbivore'
      ) {
        affectedTypes.push(type as AnimalType);
      }
      if (
        eventDef.type === 'plague' &&
        (roleDef.role === 'herbivore' || roleDef.role === 'predator')
      ) {
        affectedTypes.push(type as AnimalType);
      }
    }

    return {
      id: `eco-event-${this.eventCounter}`,
      type: eventDef.type,
      severity: eventDef.severity,
      affectedBiome: 'multiple',
      affectedTypes,
      description: eventDef.description,
      timestamp: this.stepCounter,
      durationSteps: eventDef.severity === 'catastrophic' ? 50 : 30,
      effects: this.generateEventEffects(eventDef.type),
    };
  }

  private generateEventEffects(type: EcosystemEventType): Array<{
    type: 'population-modifier' | 'spawn-modifier' | 'behavior-modifier' | 'balance-modifier';
    target: AnimalType | 'all';
    modifier: number;
    durationSteps: number;
  }> {
    const effects: Array<{
      type: 'population-modifier' | 'spawn-modifier' | 'behavior-modifier' | 'balance-modifier';
      target: AnimalType | 'all';
      modifier: number;
      durationSteps: number;
    }> = [];

    switch (type) {
      case 'predator-outbreak':
        effects.push({
          type: 'population-modifier',
          target: 'all',
          modifier: -0.2,
          durationSteps: 30,
        });
        break;
      case 'herbivore-migration':
        effects.push({
          type: 'spawn-modifier',
          target: 'all',
          modifier: -0.3,
          durationSteps: 20,
        });
        break;
      case 'plague':
        effects.push({
          type: 'population-modifier',
          target: 'all',
          modifier: -0.5,
          durationSteps: 40,
        });
        break;
      case 'mating-season':
        effects.push({
          type: 'spawn-modifier',
          target: 'all',
          modifier: 0.5,
          durationSteps: 25,
        });
        break;
      case 'ecosystem-recovery':
        effects.push({
          type: 'balance-modifier',
          target: 'all',
          modifier: 0.3,
          durationSteps: 35,
        });
        break;
    }

    return effects;
  }

  private calculateSpawnModifiers(
    animalCounts?: ReadonlyMap<AnimalType, number>,
  ): Map<AnimalType, number> {
    const modifiers = new Map<AnimalType, number>();

    // Base modifier from ecosystem balance
    const baseModifier =
      this.balance.state === 'balanced'
        ? 1
        : this.balance.state === 'healthy'
          ? 1.1
          : this.balance.state === 'stressed'
            ? 0.8
            : this.balance.state === 'critical'
              ? 0.5
              : 0.3;

    for (const [type, roleDef] of Object.entries(ECOSYSTEM_ROLES)) {
      modifiers.set(type as AnimalType, baseModifier);
    }

    // Apply active event modifiers
    for (const event of this.activeEvents) {
      for (const effect of event.effects) {
        if (effect.target === 'all') {
          for (const type of modifiers.keys()) {
            const current = modifiers.get(type) ?? 1;
            modifiers.set(type, current * (1 + effect.modifier));
          }
        } else if (modifiers.has(effect.target as AnimalType)) {
          const current = modifiers.get(effect.target as AnimalType) ?? 1;
          modifiers.set(effect.target as AnimalType, current * (1 + effect.modifier));
        }
      }
    }

    // Clamp all modifiers
    for (const [type, mod] of modifiers) {
      modifiers.set(type, clamp(mod, 0.1, 3));
    }

    return modifiers;
  }
}
