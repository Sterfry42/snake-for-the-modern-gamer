/**
 * Trait Manager
 */
import type { ActiveTrait, TraitDefinition } from '../mutation/types.js';
import type { TraitModifier, TraitManagerOptions, TraitManagerState } from './types.js';

const DEFAULT_MAX_ACTIVE_TRAITS = 20;
const DEFAULT_DECAY_INTERVAL_MS = 1000;

export class TraitManager {
  private activeTraits: ActiveTrait[] = [];
  private readonly traitDefinitions = new Map<string, TraitDefinition>();
  private readonly maxActiveTraits: number;
  private readonly decayCheckIntervalMs: number;
  private totalTraitsGained = 0;
  private totalTraitsExpired = 0;

  constructor(options: TraitManagerOptions = {}) {
    this.maxActiveTraits = options.maxActiveTraits ?? DEFAULT_MAX_ACTIVE_TRAITS;
    this.decayCheckIntervalMs = options.decayCheckIntervalMs ?? DEFAULT_DECAY_INTERVAL_MS;
  }

  registerTrait(definition: TraitDefinition): void {
    this.traitDefinitions.set(definition.id, definition);
  }

  getDefinition(traitId: string): TraitDefinition | undefined {
    return this.traitDefinitions.get(traitId);
  }

  getActiveTraits(): ActiveTrait[] {
    return [...this.activeTraits];
  }

  getActiveTraitIds(): string[] {
    return this.activeTraits.map((t) => t.definition.id);
  }

  hasTrait(traitId: string): boolean {
    return this.activeTraits.some((t) => t.definition.id === traitId);
  }

  getTraitStacks(traitId: string): number {
    const trait = this.activeTraits.find((t) => t.definition.id === traitId);
    return trait?.stacks ?? 0;
  }

  /**
   * Apply a trait to the snake. Stacks with existing instances of the same trait.
   */
  applyTrait(definition: TraitDefinition, stacks = 1, durationMs = 0): void {
    // Check if we already have this trait
    const existingIndex = this.activeTraits.findIndex((t) => t.definition.id === definition.id);

    if (existingIndex >= 0) {
      // Stack with existing trait
      const existing = this.activeTraits[existingIndex];
      const newStacks = Math.min(existing.stacks + stacks, definition.maxStacks);
      existing.stacks = newStacks;
      // Extend duration if trait has one
      if (durationMs > 0) {
        existing.remainingMs = durationMs;
      }
    } else {
      // Check if we're at max active traits
      if (this.activeTraits.length >= this.maxActiveTraits) {
        // Remove the oldest non-permanent trait
        const removableIndex = this.activeTraits.findIndex((t) => t.remainingMs > 0);
        if (removableIndex >= 0) {
          this.removeTraitAt(removableIndex);
        } else {
          return; // Can't add new trait, all slots full and all permanent
        }
      }

      this.activeTraits.push({
        definition,
        stacks: Math.min(stacks, definition.maxStacks),
        remainingMs: durationMs,
        appliedAt: Date.now(),
      });
    }

    this.totalTraitsGained++;
  }

  /**
   * Remove a specific trait instance by definition ID.
   */
  removeTrait(traitId: string): void {
    const index = this.activeTraits.findIndex((t) => t.definition.id === traitId);
    if (index >= 0) {
      this.removeTraitAt(index);
      this.totalTraitsExpired++;
    }
  }

  /**
   * Decay traits that have expired. Call periodically (e.g., every second).
   */
  decayTraits(): void {
    const toRemove: number[] = [];

    for (let i = 0; i < this.activeTraits.length; i++) {
      const trait = this.activeTraits[i];
      if (trait.remainingMs > 0) {
        trait.remainingMs -= this.decayCheckIntervalMs;
        if (trait.remainingMs <= 0) {
          toRemove.push(i);
        }
      }
    }

    // Remove expired traits in reverse order
    for (const index of toRemove.reverse()) {
      this.removeTraitAt(index);
      this.totalTraitsExpired++;
    }
  }

  /**
   * Calculate the combined modifier from all active traits.
   */
  getModifiers(): TraitModifier {
    const modifier: TraitModifier = {};

    for (const trait of this.activeTraits) {
      const effect = trait.definition.effect;
      const value = effect.value * trait.stacks;

      switch (effect.type) {
        case 'speedBoost':
          modifier.speedScalar = (modifier.speedScalar ?? 1) + value * 0.1;
          break;
        case 'growthBonus':
          modifier.growthBonus = (modifier.growthBonus ?? 0) + value;
          break;
        case 'scoreMultiplier':
          modifier.scoreScalar = (modifier.scoreScalar ?? 1) + value * 0.05;
          break;
        case 'shield':
          modifier.shieldPoints = (modifier.shieldPoints ?? 0) + value;
          break;
        case 'phase':
          modifier.phaseEnabled = true;
          break;
        case 'damageOverTime':
          modifier.damagePerTick = (modifier.damagePerTick ?? 0) + value;
          break;
        case 'frost':
          modifier.frostSlow = (modifier.frostSlow ?? 0) + value;
          break;
        case 'mochyBounce':
          modifier.bounceChance = (modifier.bounceChance ?? 0) + value;
          break;
        case 'caffeineFocus':
          modifier.caffeineFocus = (modifier.caffeineFocus ?? 0) + value * 0.05;
          break;
      }
    }

    return modifier;
  }

  getSnapshot(): TraitManagerState {
    return {
      activeTraits: this.activeTraits.map((t) => ({
        traitId: t.definition.id,
        stacks: t.stacks,
        remainingMs: t.remainingMs,
      })),
      totalTraitsGained: this.totalTraitsGained,
      totalTraitsExpired: this.totalTraitsExpired,
    };
  }

  loadSnapshot(snapshot: TraitManagerState): void {
    this.activeTraits = [];
    this.totalTraitsGained = snapshot.totalTraitsGained;
    this.totalTraitsExpired = snapshot.totalTraitsExpired;

    for (const traitData of snapshot.activeTraits) {
      const definition = this.traitDefinitions.get(traitData.traitId);
      if (definition) {
        this.activeTraits.push({
          definition,
          stacks: traitData.stacks,
          remainingMs: traitData.remainingMs,
          appliedAt: Date.now(),
        });
      }
    }
  }

  clearAll(): void {
    this.activeTraits.length = 0;
    this.totalTraitsGained = 0;
    this.totalTraitsExpired = 0;
  }

  private removeTraitAt(index: number): void {
    const removed = this.activeTraits.splice(index, 1)[0];
    if (removed) {
      // Notify that trait expired (for events)
      this.onTraitExpired();
    }
  }

  private onTraitExpired(): void {
    // Subclasses or consumers can hook into trait expiration via event system
    // This is a no-op base implementation
  }

  getTraitCount(): number {
    return this.activeTraits.length;
  }

  getTotalTraitsGained(): number {
    return this.totalTraitsGained;
  }

  getTotalTraitsExpired(): number {
    return this.totalTraitsExpired;
  }
}
