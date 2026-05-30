// Compendium system — tracks discovered, encountered, and tamed creatures.
// Used by UI overlays and the companion service.

import type { CompanionDefinition, CompendiumSaveData } from './companionTypes.js';
import { COMPANION_DEFINITIONS } from './companionRegistry.js';

/**
 * Tracks which creatures the player has discovered, encountered, tamed, or reached max bond with.
 * Provides snapshot/restore for save/load integration.
 */
export class CompendiumSystem {
  private discovered = new Set<string>();
  private firstEncountered = new Map<string, number>();
  private totalEncounters = new Map<string, number>();
  private tamed = new Set<string>();
  private maxBondReached = new Map<string, number>();

  /**
   * Mark a creature as discovered and record the room number of first encounter.
   */
  discoverCompanion(companionId: string, roomNumber: number): void {
    if (!this.discovered.has(companionId)) {
      this.discovered.add(companionId);
      this.firstEncountered.set(companionId, roomNumber);
    }
    this.totalEncounters.set(
      companionId,
      (this.totalEncounters.get(companionId) ?? 0) + 1,
    );
  }

  /**
   * Check if a creature has been discovered.
   */
  isDiscovered(companionId: string): boolean {
    return this.discovered.has(companionId);
  }

  /**
   * Get the number of discovered creatures.
   */
  getDiscoveryCount(): number {
    return this.discovered.size;
  }

  /**
   * Get the total number of creature definitions in the registry.
   */
  getTotalCompanions(): number {
    return COMPANION_DEFINITIONS.length;
  }

  /**
   * Build the full compendium view for UI rendering.
   */
  getCompendiumView(definitions: readonly CompanionDefinition[]): Array<{
    companionId: string;
    discovered: boolean;
    tamed: boolean;
    bondLevel?: number;
    definition: CompanionDefinition;
    maxBondReached?: number;
    totalEncounters: number;
  }> {
    return definitions.map((def) => ({
      companionId: def.id,
      discovered: this.isDiscovered(def.id),
      tamed: this.tamed.has(def.id),
      bondLevel: this.maxBondReached.get(def.id),
      definition: def,
      maxBondReached: this.maxBondReached.get(def.id),
      totalEncounters: this.totalEncounters.get(def.id) ?? 0,
    }));
  }

  /**
   * Get lore for a discovered creature, or undefined if not discovered.
   */
  getLore(companionId: string): string | undefined {
    if (!this.discovered.has(companionId)) return undefined;
    const def = COMPANION_DEFINITIONS.find((d) => d.id === companionId);
    return def?.lore;
  }

  /**
   * Get serialized snapshot of compendium state.
   */
  getSnapshot(): CompendiumSaveData {
    return {
      discovered: Array.from(this.discovered),
      maxBondReached: Object.fromEntries(this.maxBondReached),
      totalEncounters: Object.fromEntries(this.totalEncounters),
      totalBred: 0,
    };
  }

  /**
   * Restore compendium state from a snapshot.
   */
  loadSnapshot(data: CompendiumSaveData): void {
    this.discovered = new Set(data.discovered ?? []);
    this.maxBondReached = new Map(
      Object.entries(data.maxBondReached ?? {}),
    );
    this.totalEncounters = new Map(
      Object.entries(data.totalEncounters ?? {}),
    );
    this.tamed = new Set(); // Will be set by CompanionService when loading instances
    this.firstEncountered = new Map();
  }

  /**
   * Mark a creature as tamed.
   */
  markTamed(companionId: string): void {
    this.tamed.add(companionId);
  }

  /**
   * Mark that a companion has reached a specific bond level.
   */
  markBondReached(companionId: string, bondLevel: number): void {
    const current = this.maxBondReached.get(companionId) ?? 0;
    if (bondLevel > current) {
      this.maxBondReached.set(companionId, bondLevel);
    }
  }

  /**
   * Record an encounter with a creature (including wild sightings).
   */
  recordEncounter(companionId: string): void {
    this.totalEncounters.set(
      companionId,
      (this.totalEncounters.get(companionId) ?? 0) + 1,
    );
  }
}
