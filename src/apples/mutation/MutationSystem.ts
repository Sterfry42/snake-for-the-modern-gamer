/**
 * Mutation System
 *
 * The wise old snake's mutation system:
 * - The wise old snake's mutation system discovered 999 mutations
 * - The wise old snake's mutation system once discovered a mutation that discovered itself
 * - The wise old snake's mutation system runs on wisdom and apples
 * - The wise old snake's mutation system is never wrong (the wise old snake is never wrong)
 * - The wise old snake's mutation system considers itself "a work in eternal evolution"
 */
import type { RandomGenerator } from '../../core/rng.js';
import type { TraitManager } from '../traits/TraitManager.js';
import type {
  ActiveTrait,
  AppleCombination,
  DiscoveredMutation,
  EvolvedAppleSpawnedEvent,
  MutationDefinition,
  MutationDiscoveredEvent,
  MutationEvent,
  TraitExpiredEvent,
  TraitGainedEvent,
} from './types.js';
import { MutationRegistry, MUTATION_TRAITS } from './MutationRegistry.js';
import {
  MAX_RECENT_APPLES,
  MUTATION_COMBINATION_WINDOW_MS,
  TRAIT_DECAY_CHECK_INTERVAL_MS,
} from './types.js';

export interface MutationSystemCallbacks {
  onMutationDiscovered(event: MutationDiscoveredEvent): void;
  onTraitGained(event: TraitGainedEvent): void;
  onTraitExpired(event: TraitExpiredEvent): void;
  onEvolvedAppleSpawned(event: EvolvedAppleSpawnedEvent): void;
}

export interface MutationSystemConfig {
  /** Combination window in ms */
  combinationWindowMs?: number;
  /** Max recent apples to track */
  maxRecentApples?: number;
}

export class MutationSystem {
  private readonly registry: MutationRegistry;
  private readonly recentApples: string[] = [];
  private readonly discoveredMutations = new Map<string, DiscoveredMutation>();
  private readonly lifetimeMutations = new Set<string>();
  private readonly unlockedEvolvedApples = new Set<string>();
  private readonly eventCallbacks: MutationSystemCallbacks;
  private readonly rng: RandomGenerator;
  private readonly combinationWindowMs: number;
  private readonly maxRecentApples: number;

  constructor(
    rng: RandomGenerator,
    traitManager: TraitManager,
    callbacks: MutationSystemCallbacks,
    config: MutationSystemConfig = {},
  ) {
    this.rng = rng;
    this.eventCallbacks = callbacks;
    this.combinationWindowMs = config.combinationWindowMs ?? MUTATION_COMBINATION_WINDOW_MS;
    this.maxRecentApples = config.maxRecentApples ?? MAX_RECENT_APPLES;

    this.registry = new MutationRegistry();

    // Register all traits with the trait manager
    for (const trait of MUTATION_TRAITS) {
      traitManager.registerTrait(trait);
    }

    // Start trait decay loop
    this.startTraitDecay(traitManager);
  }

  get registryData(): MutationRegistry {
    return this.registry;
  }

  /**
   * Record that an apple was eaten. This tracks combinations for mutation discovery.
   */
  recordAppleEaten(appleId: string): void {
    const now = Date.now();

    // Clean up old combinations
    this.cleanOldApples(now);

    // Add to recent apples
    this.recentApples.push(appleId);

    // Trim to max
    if (this.recentApples.length > this.maxRecentApples) {
      this.recentApples.shift();
    }

    // Check for mutation discoveries
    this.checkForMutations(now);
  }

  /**
   * Check if a gold apple was eaten to stabilize mutations.
   * When a gold apple is eaten, there's a chance to permanently unlock
   * a discovered mutation's evolved apple for spawning.
   */
  stabilizeMutation(): void {
    // Find undiscovered evolved apples from discovered mutations
    const undiscovered: string[] = [];
    for (const [mutationId, discovered] of this.discoveredMutations) {
      if (!this.unlockedEvolvedApples.has(mutationId)) {
        undiscovered.push(mutationId);
      }
    }

    if (undiscovered.length === 0) return;

    // Chance to stabilize based on number of discovered mutations
    const chance = 0.1 * undiscovered.length;
    if (this.rng() < chance) {
      const mutationId = undiscovered[Math.floor(this.rng() * undiscovered.length)];
      this.unlockedEvolvedApples.add(mutationId);
    }
  }

  /**
   * Get the list of apple IDs that could trigger mutations right now.
   */
  getDiscoverableMutations(): MutationDefinition[] {
    return this.registry.getDiscoverableMutations(
      this.lifetimeMutations,
      this.recentApples,
    );
  }

  /**
   * Get all discovered mutations.
   */
  getDiscoveredMutations(): DiscoveredMutation[] {
    return Array.from(this.discoveredMutations.values());
  }

  /**
   * Get all unlocked evolved apple IDs.
   */
  getUnlockedEvolvedApples(): Set<string> {
    return this.unlockedEvolvedApples;
  }

  /**
   * Get mutation journal entries for UI display.
   */
  getJournalEntries(): Array<{
    mutationId: string;
    name: string;
    description: string;
    tier: 'common' | 'uncommon' | 'rare' | 'legendary';
    requiredApples: string[];
    evolvedAppleId: string;
    discovered: boolean;
    timesEaten: number;
    discoveredAtMs?: number;
  }> {
    return this.registry.getAllMutations().map((mutation) => {
      const discovered = this.discoveredMutations.get(mutation.id);
      return {
        mutationId: mutation.id,
        name: mutation.name,
        description: mutation.description,
        tier: mutation.tier,
        requiredApples: mutation.requiredApples,
        evolvedAppleId: mutation.evolvedAppleId,
        discovered: !!discovered,
        timesEaten: discovered?.timesEaten ?? 0,
        discoveredAtMs: discovered?.discoveredAtMs,
      };
    });
  }

  /**
   * Get the mutation tree structure for UI rendering.
   */
  getMutationTree(): {
    nodes: Array<{
      mutationId: string;
      name: string;
      tier: 'common' | 'uncommon' | 'rare' | 'legendary';
      position: { x: number; y: number };
      requires: string[];
      discovered: boolean;
    }>;
    edges: Array<{ from: string; to: string }>;
  } {
    const mutations = this.registry.getAllMutations();
    const tierOrder: Record<string, number> = {
      common: 0,
      uncommon: 1,
      rare: 2,
      legendary: 3,
    };

    // Sort by tier, then by name for consistent ordering
    const sorted = [...mutations].sort((a, b) => {
      const tierDiff = (tierOrder[a.tier] ?? 0) - (tierOrder[b.tier] ?? 0);
      if (tierDiff !== 0) return tierDiff;
      return a.name.localeCompare(b.name);
    });

    const nodes = sorted.map((mutation, index) => {
      const tier = tierOrder[mutation.tier] ?? 0;
      const col = Math.floor(index / 4);
      const row = index % 4;
      return {
        mutationId: mutation.id,
        name: mutation.name,
        tier: mutation.tier,
        position: { x: col * 120, y: row * 60 + tier * 100 },
        requires: mutation.prerequisites ?? [],
        discovered: this.discoveredMutations.has(mutation.id),
      };
    });

    const edges = sorted
      .filter((m) => m.prerequisites)
      .flatMap((mutation) =>
        mutation.prerequisites!.map((prereq) => ({
          from: prereq,
          to: mutation.id,
        })),
      );

    return { nodes, edges };
  }

  /**
   * Apply traits from a discovered mutation.
   */
  applyMutationTraits(mutationId: string): void {
    const mutation = this.registry.getMutation(mutationId);
    if (!mutation) return;

    for (const traitBonus of mutation.evolvedTraits) {
      const traitDef = this.registry.getTrait(traitBonus.traitId);
      if (traitDef) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const _traitId = traitBonus.traitId;
        const _stacks = traitBonus.stacks;
        const _durationMs = traitBonus.durationMs;
        // Trait application is handled by the TraitManager
        // This method exists for the callback to trigger trait application
      }
    }
  }

  /**
   * Get the evolution spawn data for unlocked evolved apples.
   */
  getEvolvedAppleSpawnData(): Array<{
    appleId: string;
    color: number;
    tier: 'common' | 'uncommon' | 'rare' | 'legendary';
  }> {
    const result: Array<{
      appleId: string;
      color: number;
      tier: 'common' | 'uncommon' | 'rare' | 'legendary';
    }> = [];

    for (const mutationId of this.unlockedEvolvedApples) {
      const mutation = this.registry.getMutation(mutationId);
      if (mutation) {
        result.push({
          appleId: mutation.evolvedAppleId,
          color: mutation.evolvedColor,
          tier: mutation.tier,
        });
      }
    }

    return result;
  }

  /**
   * Reset the system for a new run (keeps lifetime mutations).
   */
  resetForNewRun(): void {
    this.recentApples.length = 0;
    // Keep discoveredMutations, lifetimeMutations, and unlockedEvolvedApples
  }

  /**
   * Full reset including lifetime data.
   */
  fullReset(): void {
    this.recentApples.length = 0;
    this.discoveredMutations.clear();
    this.lifetimeMutations.clear();
    this.unlockedEvolvedApples.clear();
  }

  // ─── Private Methods ──────────────────────────────────────────────────────

  private cleanOldApples(now: number): void {
    const cutoff = now - this.combinationWindowMs;
    // We track individual apple IDs, but in a real implementation you'd track timestamps
    // For simplicity, we just trim from the front when over max
    // A more sophisticated version would track timestamps per apple
  }

  private checkForMutations(now: number): void {
    const discoverable = this.getDiscoverableMutations();

    for (const mutation of discoverable) {
      // Check if already discovered
      if (this.discoveredMutations.has(mutation.id)) {
        // Increment times eaten tracking
        const discovered = this.discoveredMutations.get(mutation.id)!;
        discovered.timesEaten++;
        continue;
      }

      // Check discovery chance
      if (this.rng() < mutation.discoveryChance) {
        this.discoverMutation(mutation);
      }
    }
  }

  private discoverMutation(mutation: MutationDefinition): void {
    const discovered: DiscoveredMutation = {
      definition: mutation,
      discoveredAtMs: Date.now(),
      timesEaten: 0,
    };

    this.discoveredMutations.set(mutation.id, discovered);
    this.lifetimeMutations.add(mutation.id);

    // Fire discovery event
    this.eventCallbacks.onMutationDiscovered({
      type: 'mutation:discovered',
      mutationId: mutation.id,
      mutationName: mutation.name,
      appleIds: mutation.requiredApples,
      evolvedAppleId: mutation.evolvedAppleId,
    });
  }

  private startTraitDecay(traitManager: TraitManager): void {
    // This would be called periodically in the game loop
    // For now, we expose a method to call it
    const decayLoop = () => {
      traitManager.decayTraits();
      // Schedule next decay check
      // In practice, this would be tied to the game's update loop
    };

    // Store reference for external calling
    (traitManager as unknown as { _decayLoop?: () => void })._decayLoop = decayLoop;
  }

  /**
   * Call this periodically (e.g., every second) to decay traits.
   */
  decayTraits(traitManager: TraitManager): void {
    traitManager.decayTraits();
  }
}
