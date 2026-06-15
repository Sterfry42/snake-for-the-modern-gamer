import { achievementLocationKey } from './achievementApMapping.js';
import { getAchievementReward } from './achievementRewards.js';
import { normalizeAchievementState, type AchievementStorage } from './achievementStorage.js';
import type {
  AchievementDefinition,
  AchievementEvent,
  AchievementId,
  AchievementSnapshot,
  AchievementState,
  AchievementStatus,
  AchievementUnlockResult,
} from './achievementTypes.js';

export class AchievementManager {
  private state: AchievementState;
  private readonly byId = new Map<AchievementId, AchievementDefinition>();

  constructor(
    private readonly definitions: readonly AchievementDefinition[],
    private readonly storage: AchievementStorage,
  ) {
    this.state = storage.load();
    for (const definition of definitions) this.byId.set(definition.id, definition);
  }

  getState(): AchievementState {
    return structuredClone(this.state);
  }
  getDefinitions(): readonly AchievementDefinition[] {
    return this.definitions;
  }

  restoreState(state: AchievementState): void {
    this.state = normalizeAchievementState(state);
    this.persist();
  }
  isCompleted(id: AchievementId): boolean {
    return Boolean(this.state.completed[id]);
  }

  getAchievementStatus(id: AchievementId): AchievementStatus {
    if (this.isCompleted(id)) return 'completed';
    const definition = this.byId.get(id);
    return (definition?.prerequisites ?? []).every((parent) => this.isCompleted(parent))
      ? 'available'
      : 'locked';
  }

  getProgress(id: AchievementId) {
    return this.state.progress[id] ?? null;
  }

  complete(
    id: AchievementId,
    source: 'local' | 'import' | 'debug' = 'local',
  ): AchievementUnlockResult | null {
    if (this.isCompleted(id)) return null;
    const definition = this.byId.get(id);
    if (!definition) return null;
    const completedAtMs = Date.now();
    this.state.completed[id] = { completedAtMs, source };
    this.persist();
    return {
      id,
      name: definition.name,
      description: definition.description,
      icon: definition.icon,
      scoreReward: getAchievementReward(definition),
      completedAtMs,
      ...(definition.archipelago?.enabledByDefault
        ? {
            archipelago: {
              shouldSubmitLocation: !this.state.apSubmitted[id],
              locationKey: achievementLocationKey(id),
            },
          }
        : {}),
    };
  }

  recordEvent(event: AchievementEvent, snapshot?: AchievementSnapshot): AchievementUnlockResult[] {
    if (event.type === 'water:swamTile') this.state.run.waterTilesSwum += 1;
    if (event.type === 'item:consumed' && !this.state.run.consumedItemIds.includes(event.itemId))
      this.state.run.consumedItemIds.push(event.itemId);
    const unlocks: AchievementUnlockResult[] = [];
    for (const definition of this.definitions) {
      if (
        this.isCompleted(definition.id) ||
        definition.criterion.kind !== 'event' ||
        definition.criterion.eventType !== event.type
      )
        continue;
      if (!this.matchesEvent(definition, event)) continue;
      const unlocked = this.complete(definition.id);
      if (unlocked) unlocks.push(unlocked);
    }
    unlocks.push(...this.evaluateDerived(snapshot));
    this.persist();
    return unlocks;
  }

  evaluateSnapshot(snapshot: AchievementSnapshot): AchievementUnlockResult[] {
    for (const id of snapshot.discoveredBiomeIds)
      if (!this.state.discoveredBiomes.includes(id)) this.state.discoveredBiomes.push(id);
    return this.evaluateDerived(snapshot);
  }

  resetForNewRun(preservePendingAp = false): void {
    this.state.completed = Object.fromEntries(
      Object.entries(this.state.completed).filter(
        ([id, completion]) =>
          completion.source === 'import' ||
          this.state.apSubmitted[id] ||
          (preservePendingAp && this.byId.get(id)?.archipelago?.enabledByDefault),
      ),
    );
    this.state.progress = {};
    this.state.discoveredBiomes = [];
    this.state.run = { consumedItemIds: [], waterTilesSwum: 0 };
    this.persist();
  }

  markApSubmitted(id: AchievementId): void {
    this.state.apSubmitted[id] = true;
    if (this.state.completed[id]) this.state.completed[id].source = 'import';
    this.persist();
  }

  reconcileApSubmitted(
    checkedLocationIds: ReadonlySet<number>,
    locationIdFor: (id: string) => number | undefined,
  ): void {
    for (const definition of this.definitions) {
      if (!definition.archipelago?.enabledByDefault) continue;
      const locationId = locationIdFor(definition.id);
      this.state.apSubmitted[definition.id] =
        locationId !== undefined && checkedLocationIds.has(locationId);
    }
    this.persist();
  }

  reconcileApProgress(
    checkedLocationIds: ReadonlySet<number>,
    locationIdFor: (id: string) => number | undefined,
  ): AchievementUnlockResult[] {
    const imported: AchievementUnlockResult[] = [];
    for (const definition of this.definitions) {
      if (!definition.archipelago?.enabledByDefault) continue;
      const locationId = locationIdFor(definition.id);
      const checked = locationId !== undefined && checkedLocationIds.has(locationId);
      this.state.apSubmitted[definition.id] = checked;
      if (checked && !this.isCompleted(definition.id)) {
        const result = this.complete(definition.id, 'import');
        if (result) imported.push(result);
      } else if (!checked && this.state.completed[definition.id]?.source === 'import') {
        delete this.state.completed[definition.id];
      }
    }
    this.persist();
    return imported;
  }

  getPendingApAchievementIds(enabledKeys?: ReadonlySet<string>): string[] {
    return this.definitions
      .filter(
        (d) =>
          d.archipelago?.enabledByDefault &&
          this.isCompleted(d.id) &&
          !this.state.apSubmitted[d.id] &&
          (!enabledKeys || enabledKeys.has(achievementLocationKey(d.id))),
      )
      .map((d) => d.id);
  }

  private evaluateDerived(snapshot?: AchievementSnapshot): AchievementUnlockResult[] {
    const unlocks: AchievementUnlockResult[] = [];
    for (const definition of this.definitions) {
      if (definition.criterion.kind === 'event') {
        if (definition.id === 'food.comboMeal') {
          const count = ['food-snake-burger', 'food-snake-fries', 'food-snake-nuggets'].filter(
            (id) => this.state.run.consumedItemIds.includes(id),
          ).length;
          this.updateProgress(definition, count);
          if (count >= 3) {
            const result = this.complete(definition.id);
            if (result) unlocks.push(result);
          }
        }
        continue;
      }
      const current = this.currentValue(definition.criterion.field, snapshot);
      const target = this.targetValue(definition, snapshot);
      this.updateProgress(definition, current, target);
      if (current >= target) {
        const result = this.complete(definition.id);
        if (result) unlocks.push(result);
      }
    }
    this.persist();
    return unlocks;
  }

  private currentValue(field: string, snapshot?: AchievementSnapshot): number {
    if (!snapshot) return field === 'waterTilesSwum' ? this.state.run.waterTilesSwum : 0;
    switch (field) {
      case 'discoveredBiomeCount':
        return new Set(
          [...snapshot.discoveredBiomeIds, ...this.state.discoveredBiomes].filter((id) =>
            snapshot.discoverableBiomeIds.includes(id),
          ),
        ).size;
      case 'equippedSlotCount':
        return new Set(snapshot.equippedSlots).size;
      case 'cardsOwned':
        return new Set(snapshot.cardIdsOwned).size;
      case 'fishTypesCaught':
        return new Set(snapshot.fishTypeIdsCaught).size;
      case 'artifactsOwned':
        return new Set(snapshot.artifactsOwned).size;
      case 'skillBranchesCompleted':
        return new Set(snapshot.skillTreeCompletedBranchIds).size;
      case 'waterTilesSwum':
        return this.state.run.waterTilesSwum;
      default:
        return Number(snapshot[field as keyof AchievementSnapshot] ?? 0);
    }
  }

  private targetValue(definition: AchievementDefinition, snapshot?: AchievementSnapshot): number {
    if (definition.id === 'skillTree.allBranches')
      return Math.max(1, snapshot?.skillTreeBranchCount ?? 1);
    return definition.criterion.kind === 'snapshot' ? definition.criterion.target : 0;
  }

  private matchesEvent(definition: AchievementDefinition, event: AchievementEvent): boolean {
    const match = definition.criterion.kind === 'event' ? definition.criterion.match : undefined;
    if (match) {
      for (const [key, expected] of Object.entries(match)) {
        const actual = (event as unknown as Record<string, unknown>)[key];
        if (typeof expected === 'string' && expected.includes('|')) {
          if (!expected.split('|').includes(String(actual))) return false;
        } else if (actual !== expected) return false;
      }
    }
    if (!definition.progress) return true;
    const numeric =
      event.type === 'archaeology:depthReached'
        ? event.depth
        : event.type === 'archaeology:chainReached'
          ? event.chain
          : event.type === 'rivalSnake:lengthReached'
            ? event.length
            : 0;
    this.updateProgress(definition, numeric);
    return numeric >= definition.progress.target;
  }

  private updateProgress(
    definition: AchievementDefinition,
    current: number,
    target = definition.progress?.target ?? 0,
  ): void {
    if (!definition.progress) return;
    const previous = this.state.progress[definition.id]?.current ?? 0;
    this.state.progress[definition.id] = {
      current: Math.max(previous, Math.min(current, target)),
      target,
      updatedAtMs: Date.now(),
    };
  }

  private persist(): void {
    this.storage.save(this.state);
  }
}
