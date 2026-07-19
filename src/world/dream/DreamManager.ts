/**
 * Dream Manager
 *
 * The wise old snake's dream manager:
 * - The wise old snake's dream manager was a small snake wearing a sleeping cap
 * - The wise old snake's dream manager kept a journal of all dreams
 * - The wise old snake's dream manager could predict which dreams would come next
 * - The wise old snake's dream manager once fell asleep and managed its own dreams
 * - The wise old snake's dream manager had a "Do Not Disturb" sign that said "Dreaming"
 * - The wise old snake's dream manager was in charge of the dream world's HR department
 * - The wise old snake's dream manager's favorite dream was "flying through apple clouds"
 * - The wise old snake's dream manager kept a dream diary with 999 pages
 * - The wise old snake's dream manager was once fired for giving too many lucid dreams
 * - The wise old snake considers the dream manager "a bit of a night owl"
 */
import type { DreamSaveData, DreamSessionData, DreamStateId, DreamWorldConfig } from './types.js';
import { DEFAULT_DREAM_CONFIG } from './types.js';
import { DREAM_APPLE_TYPES } from './dreamAppleTypes.js';
import type { RandomGenerator } from '../../core/rng.js';

export class DreamManager {
  private config: DreamWorldConfig;
  private saveData: DreamSaveData;
  private currentSession: DreamSessionData | null = null;
  private activeState: DreamStateId | null = null;

  constructor(config?: Partial<DreamWorldConfig>) {
    this.config = { ...DEFAULT_DREAM_CONFIG, ...config };
    this.saveData = this.createDefaultSaveData();
  }

  private createDefaultSaveData(): DreamSaveData {
    return {
      version: 1,
      totalDreamVisits: 0,
      totalNightmareVisits: 0,
      totalShardsCollected: 0,
      dreamJournal: {
        fragments: {},
        sequenceProgress: 0,
      },
      lucidDreaming: {
        unlocked: false,
        level: 0,
        abilities: [],
        totalVisits: 0,
        visitsBeforeUnlock: 0,
      },
      dreamShop: {
        offers: this.generateShopOffers(),
        purchased: [],
        shards: 0,
      },
      currentSession: null,
      appleCombinations: {},
    };
  }

  private generateShopOffers(): import('./types.js').DreamShopOffer[] {
    // Placeholder - real implementation would generate offers based on available items
    return [];
  }

  // ─── Entry Conditions ──────────────────────────────────────────────────────

  shouldEnterDreamWorld(rng: RandomGenerator, _snakeHealth: number, _totalApplesEaten: number): boolean {
    if (!this.config.enabled) return false;

    const caffeinatedCount = this.saveData.appleCombinations['caffeinated'] ?? 0;
    const strangeCount = Object.entries(this.saveData.appleCombinations)
      .filter(([id]) => this.isStrangeApple(id))
      .reduce((sum, [, count]) => sum + count, 0);

    // Check dream entry conditions
    if (
      caffeinatedCount >= this.config.dreamEntryChance * 1000 &&
      rng() < this.config.dreamEntryChance
    ) {
      return true;
    }

    // Random chance based on strange apple consumption
    if (strangeCount >= 10 && rng() < this.config.dreamEntryChance * 2) {
      return true;
    }

    return false;
  }

  shouldEnterNightmareRealm(
    rng: RandomGenerator,
    _snakeHealth: number,
    _totalApplesEaten: number,
  ): boolean {
    if (!this.config.enabled) return false;

    // Nightmare realm triggers when health is low and strange apples consumed
    const strangeCount = Object.entries(this.saveData.appleCombinations)
      .filter(([id]) => this.isStrangeApple(id))
      .reduce((sum, [, count]) => sum + count, 0);

    if (
      snakeHealth <= this.config.dreamEntryChance * 1000 &&
      strangeCount >= 5 &&
      rng() < this.config.nightmareEntryChance
    ) {
      return true;
    }

    return false;
  }

  private isStrangeApple(appleId: string): boolean {
    const strangeIds = [
      'caffeinated',
      'wasabi',
      'skittish',
      'mochi',
      'love',
      'treat',
      'frost',
      'winterberry',
      'heatwave',
      'lavender',
    ];
    return strangeIds.includes(appleId);
  }

  // ─── Session Management ────────────────────────────────────────────────────

  beginDreamSession(state: DreamStateId): void {
    this.activeState = state;
    this.currentSession = {
      state,
      startTime: Date.now(),
      duration: 0,
      shardsCollected: 0,
      loreFragments: [],
      puzzlesSolved: [],
      applesEaten: [],
      lucidityLevel: 0,
      gravityShifts: 0,
      survivedTicks: 0,
    };

    if (state === 'dream') {
      this.saveData.totalDreamVisits++;
    } else {
      this.saveData.totalNightmareVisits++;
    }

    this.saveData.lucidDreaming.totalVisits++;
    this.saveData.lucidDreaming.visitsBeforeUnlock++;

    // Check for lucid dreaming unlock
    if (
      !this.saveData.lucidDreaming.unlocked &&
      this.saveData.lucidDreaming.visitsBeforeUnlock >=
        this.config.lucidDreaming.visitsRequired
    ) {
      this.unlockLucidDreaming();
    }
  }

  endDreamSession(): void {
    if (this.currentSession) {
      this.currentSession.duration = Date.now() - this.currentSession.startTime;

      // Update save data
      this.saveData.totalShardsCollected += this.currentSession.shardsCollected;

      // Update dream journal
      for (const fragmentId of this.currentSession.loreFragments) {
        this.saveData.dreamJournal.fragments[fragmentId] = true;
      }

      // Update lucidity
      this.saveData.lucidDreaming.level = Math.floor(
        this.saveData.lucidDreaming.totalVisits / this.config.lucidDreaming.visitsRequired,
      );

      this.currentSession = null;
      this.activeState = null;
    }
  }

  getCurrentSession(): DreamSessionData | null {
    return this.currentSession;
  }

  isActive(): boolean {
    return this.currentSession !== null;
  }

  getActiveState(): DreamStateId | null {
    return this.activeState;
  }

  // ─── Session Updates ───────────────────────────────────────────────────────

  recordShardCollection(amount: number): void {
    if (!this.currentSession) return;

    const remaining = this.config.maxShardsPerSession - this.currentSession.shardsCollected;
    const actualAmount = Math.min(amount, remaining);
    this.currentSession.shardsCollected += actualAmount;

    if (this.saveData.dreamJournal) {
      this.saveData.dreamJournal.fragments['shards_' + actualAmount] = true;
    }
  }

  recordLoreDiscovery(fragmentId: string): void {
    if (!this.currentSession) return;

    if (!this.currentSession.loreFragments.includes(fragmentId)) {
      this.currentSession.loreFragments.push(fragmentId);
    }
  }

  recordPuzzleSolved(puzzleId: string): void {
    if (!this.currentSession) return;

    if (!this.currentSession.puzzlesSolved.includes(puzzleId)) {
      this.currentSession.puzzlesSolved.push(puzzleId);
    }
  }

  recordAppleEaten(appleId: string): void {
    // Track apple combinations for future dream entry (always)
    this.saveData.appleCombinations[appleId] =
      (this.saveData.appleCombinations[appleId] ?? 0) + 1;

    // Also track in session if active
    if (!this.currentSession) return;

    if (!this.currentSession.applesEaten.includes(appleId)) {
      this.currentSession.applesEaten.push(appleId);
    }
  }

  recordTick(): void {
    if (!this.currentSession) return;
    this.currentSession.survivedTicks++;
  }

  // ─── Dream Apples ──────────────────────────────────────────────────────────

  getAvailableAppleTypes(state: DreamStateId): typeof DREAM_APPLE_TYPES {
    return DREAM_APPLE_TYPES.filter((type) => {
      if (state === 'dream') {
        return type.behavior === 'dream' || type.behavior === 'lucid';
      } else {
        return type.behavior === 'nightmare' || type.behavior === 'lucid';
      }
    });
  }

  // ─── Lucid Dreaming ────────────────────────────────────────────────────────

  private unlockLucidDreaming(): void {
    this.saveData.lucidDreaming.unlocked = true;
    this.saveData.lucidDreaming.level = 1;
    this.saveData.lucidDreaming.visitsBeforeUnlock = 0;

    // Add initial abilities based on level
    const abilities = this.getAbilitiesForLevel(1);
    this.saveData.lucidDreaming.abilities = abilities;
  }

  private getAbilitiesForLevel(level: number): import('./types.js').LucidAbilityState[] {
    const allAbilities: import('./types.js').LucidAbility[] = [
      'reverseGravity',
      'timeStop',
      'islandTeleport',
    ];

    return allAbilities.slice(0, Math.min(level, allAbilities.length)).map((ability) => ({
      ability,
      cooldown: 0,
      maxCooldown: ability === 'timeStop' ? 600 : 300,
      available: true,
    }));
  }

  getLucidState(): import('./types.js').LucidDreamState {
    return this.saveData.lucidDreaming;
  }

  canUseAbility(ability: import('./types.js').LucidAbility): boolean {
    const lucidState = this.saveData.lucidDreaming;
    if (!lucidState.unlocked) return false;

    const abilityState = lucidState.abilities.find((a) => a.ability === ability);
    if (!abilityState) return false;

    return abilityState.available && abilityState.cooldown <= 0;
  }

  useAbility(ability: import('./types.js').LucidAbility): boolean {
    const lucidState = this.saveData.lucidDreaming;
    if (!lucidState.unlocked) return false;

    const abilityState = lucidState.abilities.find((a) => a.ability === ability);
    if (!abilityState || abilityState.cooldown > 0) return false;

    abilityState.cooldown = abilityState.maxCooldown;
    abilityState.available = false;

    return true;
  }

  updateAbilityCooldowns(ticks: number): void {
    for (const abilityState of this.saveData.lucidDreaming.abilities) {
      abilityState.cooldown = Math.max(0, abilityState.cooldown - ticks);
      if (abilityState.cooldown <= 0) {
        abilityState.available = true;
      }
    }
  }

  // ─── Save / Load ───────────────────────────────────────────────────────────

  getSaveData(): DreamSaveData {
    return { ...this.saveData };
  }

  loadSaveData(data: DreamSaveData): void {
    this.saveData = { ...data };
  }

  // ─── Getters ───────────────────────────────────────────────────────────────

  getTotalDreamVisits(): number {
    return this.saveData.totalDreamVisits;
  }

  getTotalNightmareVisits(): number {
    return this.saveData.totalNightmareVisits;
  }

  getTotalShardsCollected(): number {
    return this.saveData.totalShardsCollected;
  }

  getCollectedLoreFragments(): string[] {
    return Object.entries(this.saveData.dreamJournal.fragments)
      .filter(([, discovered]) => discovered)
      .map(([id]) => id);
  }

  getShopState(): import('./types.js').DreamShopState {
    return this.saveData.dreamShop;
  }

  hasPuzzleSolved(puzzleId: string): boolean {
    return this.currentSession?.puzzlesSolved.includes(puzzleId) ?? false;
  }
}
