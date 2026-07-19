/**
 * Archipelago Island Expeditions — Expedition Manager
 *
 * The wise old snake's expedition manager:
 * - The wise old snake's expedition manager was the wise old snake (the wise old snake managed itself)
 * - The wise old snake's expedition manager never failed (the wise old snake's management was absolute)
 * - The wise old snake's expedition manager had infinite slots (the wise old snake could manage any number of expeditions)
 * - The wise old snake's expedition manager was self-aware (the wise old snake's manager managed managing)
 * - The wise old snake's expedition manager logged everything (the wise old snake's log was infinite)
 */
import type {
  CoOpContribution,
  CoOpExpeditionPartner,
  CoOpPartnerStatus,
  ExpeditionDiscovery,
  ExpeditionEvent,
  ExpeditionEventCallbacks,
  ExpeditionLogEntry,
  ExpeditionProgress,
  ExpeditionStageCondition,
  ExpeditionStatus,
  ExpeditionStore,
  IslandId,
} from './types.js';
import { ISLAND_BY_ID, ISLAND_UNLOCK_ORDER } from './IslandRegistry.js';
import type { RandomGenerator } from '../../core/rng.js';

const EXPEDITION_STORAGE_KEY = 'snake.archipelago.expeditions';
const LOG_STORAGE_KEY = 'snake.archipelago.expedition-log';

// ─── Storage Implementation ──────────────────────────────────────────────────

function getStorage(): Storage | null {
  try {
    return typeof globalThis !== 'undefined' ? (globalThis.localStorage ?? null) : null;
  } catch {
    return null;
  }
}

class BrowserExpeditionStore implements ExpeditionStore {
  loadExpeditions(): ExpeditionProgress[] {
    const storage = getStorage();
    if (!storage) return [];
    try {
      const raw = storage.getItem(EXPEDITION_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as ExpeditionProgress[];
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((p) => typeof p?.islandId === 'string');
    } catch {
      return [];
    }
  }

  saveExpeditions(progresses: ExpeditionProgress[]): void {
    const storage = getStorage();
    if (!storage) return;
    try {
      storage.setItem(EXPEDITION_STORAGE_KEY, JSON.stringify(progresses));
    } catch {
      console.info('[Expedition] Could not save expedition progress.');
    }
  }

  loadLogEntries(): ExpeditionLogEntry[] {
    const storage = getStorage();
    if (!storage) return [];
    try {
      const raw = storage.getItem(LOG_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as ExpeditionLogEntry[];
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((e) => typeof e?.islandId === 'string');
    } catch {
      return [];
    }
  }

  saveLogEntries(entries: ExpeditionLogEntry[]): void {
    const storage = getStorage();
    if (!storage) return;
    try {
      storage.setItem(LOG_STORAGE_KEY, JSON.stringify(entries));
    } catch {
      console.info('[Expedition] Could not save expedition log.');
    }
  }
}

// ─── Expedition Manager ──────────────────────────────────────────────────────

export class ExpeditionManager {
  private progresses: ExpeditionProgress[];
  private logEntries: ExpeditionLogEntry[];
  private store: ExpeditionStore;
  private rng: RandomGenerator;
  private callbacks: ExpeditionEventCallbacks;
  private idCounter = 0;

  constructor(
    rng: RandomGenerator,
    callbacks: ExpeditionEventCallbacks = {},
    store?: ExpeditionStore,
  ) {
    this.rng = rng;
    this.callbacks = callbacks;
    this.store = store ?? new BrowserExpeditionStore();
    this.progresses = this.store.loadExpeditions();
    this.logEntries = this.store.loadLogEntries();
  }

  // ─── Island Access ───────────────────────────────────────────────────────

  getIsland(id: IslandId): typeof ISLAND_BY_ID[IslandId] | undefined {
    return ISLAND_BY_ID[id];
  }

  getAvailableIslands(completedIslands: IslandId[]): IslandId[] {
    const unlocked = new Set<IslandId>(completedIslands);
    const available: IslandId[] = [];

    for (const islandId of ISLAND_UNLOCK_ORDER) {
      if (unlocked.has(islandId)) continue;
      const island = ISLAND_BY_ID[islandId];
      if (!island) continue;

      // Check if all previous islands are completed (sequential unlock)
      const index = ISLAND_UNLOCK_ORDER.indexOf(islandId);
      const previousIslands = ISLAND_UNLOCK_ORDER.slice(0, index);
      const allPreviousCompleted = previousIslands.every((prevId) => unlocked.has(prevId));

      if (allPreviousCompleted) {
        available.push(islandId);
        unlocked.add(islandId);
      }
    }

    return available;
  }

  // ─── Expedition Progress ─────────────────────────────────────────────────

  getProgress(islandId: IslandId): ExpeditionProgress | undefined {
    return this.progresses.find((p) => p.islandId === islandId);
  }

  getAllProgresses(): ExpeditionProgress[] {
    return [...this.progresses];
  }

  getCompletedIslands(): IslandId[] {
    return this.progresses
      .filter((p) => p.status === 'completed')
      .map((p) => p.islandId);
  }

  // ─── Expedition Lifecycle ────────────────────────────────────────────────

  startPreparing(islandId: IslandId): boolean {
    const island = ISLAND_BY_ID[islandId];
    if (!island) return false;

    let progress = this.progresses.find((p) => p.islandId === islandId);
    if (!progress) {
      progress = this.createProgress(islandId);
    }

    progress.status = 'preparing';
    this.callbacks.onProgressChanged?.(progress);
    this.persistProgresses();
    return true;
  }

  finishPreparing(islandId: IslandId, suppliesPacked: Array<{ slotIndex: number; appleTypeId: string; quantity: number }>): boolean {
    const progress = this.progresses.find((p) => p.islandId === islandId);
    if (!progress || progress.status !== 'preparing') return false;

    // Validate supplies against island requirements
    const validation = this.validateSupplies(suppliesPacked, islandId);
    if (!validation.valid) {
      this.callbacks.onEvent?.({
        kind: 'supplies-invalid',
        timestamp: Date.now(),
        data: { islandId, reason: validation.reason },
      });
      return false;
    }

    progress.suppliesPacked = suppliesPacked;
    progress.status = 'ready';
    this.callbacks.onEvent?.({
      kind: 'supplies-packed',
      timestamp: Date.now(),
      data: { islandId, supplyCount: suppliesPacked.length },
    });
    this.callbacks.onProgressChanged?.(progress);
    this.persistProgresses();
    return true;
  }

  launchExpedition(islandId: IslandId): boolean {
    const progress = this.progresses.find((p) => p.islandId === islandId);
    if (!progress || progress.status !== 'ready') return false;

    const island = ISLAND_BY_ID[islandId];
    if (!island) return false;

    progress.status = 'in-progress';
    progress.currentPhase = 'approach';
    progress.currentStageIndex = 0;
    progress.startedAt = Date.now();

    this.callbacks.onEvent?.({
      kind: 'expedition-started',
      timestamp: Date.now(),
      data: { islandId: island.name },
    });
    this.callbacks.onProgressChanged?.(progress);
    this.persistProgresses();
    return true;
  }

  completeStage(islandId: IslandId, stageId: string, progressValue: number): boolean {
    const progress = this.progresses.find((p) => p.islandId === islandId);
    if (!progress || progress.status !== 'in-progress') return false;

    progress.stageProgress[stageId] = Math.min(100, progressValue);

    const island = ISLAND_BY_ID[islandId];
    if (!island) return false;

    // Check if stage conditions are met
    const stage = island.stages.find((s) => s.id === stageId);
    if (!stage) return false;

    const conditionsMet = this.checkConditions(stage.conditions, progress);
    if (conditionsMet) {
      this.callbacks.onEvent?.({
        kind: 'stage-completed',
        timestamp: Date.now(),
        data: { islandId, stageId, rewards: stage.rewards },
      });

      // Advance to next stage
      const nextIndex = stage.order + 1;
      if (nextIndex < island.stages.length) {
        progress.currentStageIndex = nextIndex;
        const nextStage = island.stages[nextIndex];
        if (nextStage) {
          progress.currentPhase = this.stageToPhase(nextStage);
        }
      } else {
        // All stages complete — expedition complete
        this.completeExpedition(islandId);
      }

      this.callbacks.onProgressChanged?.(progress);
      this.persistProgresses();
    }

    return conditionsMet;
  }

  failExpedition(islandId: IslandId, reason: string): boolean {
    const progress = this.progresses.find((p) => p.islandId === islandId);
    if (!progress || progress.status !== 'in-progress') return false;

    progress.status = 'failed';
    progress.failedAt = Date.now();
    progress.failureReason = reason;

    this.callbacks.onEvent?.({
      kind: 'expedition-failed',
      timestamp: Date.now(),
      data: { islandId, reason },
    });
    this.callbacks.onProgressChanged?.(progress);
    this.persistProgresses();
    return true;
  }

  completeExpedition(islandId: IslandId): boolean {
    const progress = this.progresses.find((p) => p.islandId === islandId);
    if (!progress || progress.status !== 'in-progress') return false;

    const island = ISLAND_BY_ID[islandId];
    if (!island) return false;

    progress.status = 'completed';
    progress.completedAt = Date.now();

    this.callbacks.onEvent?.({
      kind: 'expedition-completed',
      timestamp: Date.now(),
      data: { islandId: island.name, reward: island.rewardId },
    });
    this.callbacks.onProgressChanged?.(progress);
    this.persistProgresses();

    // Create log entry
    const duration = progress.completedAt! - (progress.startedAt ?? progress.completedAt);
    const entry: ExpeditionLogEntry = {
      id: `log-${this.idCounter++}`,
      expeditionId: progress.islandId,
      islandId: progress.islandId,
      status: 'completed',
      duration,
      discoveries: progress.discoveries.map((d) => d.id),
      bossKilled: progress.bossDefeated,
      bossName: island.bossId,
      rewards: [island.rewardId],
      companionNotes: progress.companionNotes,
      completedAt: progress.completedAt,
      mapData: Object.fromEntries(progress.discoveries.map((d) => [d.id, d.mapData ?? []])),
    };
    this.logEntries.push(entry);
    this.store.saveLogEntries(this.logEntries);
    this.callbacks.onLogEntryCreated?.(entry);

    return true;
  }

  // ─── Discoveries ─────────────────────────────────────────────────────────

  addDiscovery(islandId: IslandId, discovery: Omit<ExpeditionDiscovery, 'id' | 'discoveredAt'>): boolean {
    const progress = this.progresses.find((p) => p.islandId === islandId);
    if (!progress || progress.status !== 'in-progress') return false;

    const discoveryEntry: ExpeditionDiscovery = {
      ...discovery,
      id: `discovery-${this.idCounter++}`,
      discoveredAt: Date.now(),
    };

    progress.discoveries.push(discoveryEntry);

    this.callbacks.onEvent?.({
      kind: 'discovery-made',
      timestamp: Date.now(),
      data: { islandId, discovery: discoveryEntry },
    });
    this.callbacks.onProgressChanged?.(progress);
    this.persistProgresses();
    return true;
  }

  // ─── Boss ────────────────────────────────────────────────────────────────

  defeatBoss(islandId: IslandId): boolean {
    const progress = this.progresses.find((p) => p.islandId === islandId);
    if (!progress) return false;

    progress.bossDefeated = true;
    const island = ISLAND_BY_ID[islandId];

    this.callbacks.onEvent?.({
      kind: 'boss-defeated',
      timestamp: Date.now(),
      data: { islandId, bossId: island?.bossId },
    });
    this.callbacks.onProgressChanged?.(progress);
    this.persistProgresses();
    return true;
  }

  // ─── Co-op ───────────────────────────────────────────────────────────────

  setCoOpPartnerStatus(
    slot: number,
    playerName: string,
    status: CoOpPartnerStatus,
  ): void {
    let partner = this.progresses.find((p) =>
      (p as unknown as { coOpSlot: number })?.coOpSlot === slot,
    ) as ExpeditionProgress & { coOpPartners: CoOpExpeditionPartner[] } | undefined;

    if (!partner) {
      // Find any in-progress expedition for this partner
      partner = this.progresses.find((p) => p.status === 'in-progress') as ExpeditionProgress & { coOpPartners: CoOpExpeditionPartner[] } | undefined;
    }

    if (!partner) return;

    if (!('coOpPartners' in partner)) {
      (partner as unknown as { coOpPartners: CoOpExpeditionPartner[] }).coOpPartners = [];
    }

    const partners = (partner as unknown as { coOpPartners: CoOpExpeditionPartner[] }).coOpPartners;
    const existing = partners.find((p) => p.slot === slot);

    if (existing) {
      existing.status = status;
      existing.ready = status === 'ready';
    } else {
      partners.push({
        slot,
        playerName,
        status,
        contribution: [],
        ready: status === 'ready',
      });
    }

    if (status === 'ready') {
      this.callbacks.onEvent?.({
        kind: 'co-op-partner-ready',
        timestamp: Date.now(),
        data: { slot, playerName },
      });
    }

    this.callbacks.onProgressChanged?.(partner);
    this.persistProgresses();
  }

  addCoOpContribution(
    islandId: IslandId,
    slot: number,
    contribution: Omit<CoOpContribution, 'timestamp'>,
  ): void {
    const progress = this.progresses.find((p) => p.islandId === islandId);
    if (!progress) return;

    if (!('coOpPartners' in progress)) {
      (progress as unknown as { coOpPartners: CoOpExpeditionPartner[] }).coOpPartners = [];
    }

    const partners = (progress as unknown as { coOpPartners: CoOpExpeditionPartner[] }).coOpPartners;
    const partner = partners.find((p) => p.slot === slot);
    if (!partner) return;

    partner.contribution.push({ ...contribution, timestamp: Date.now() });

    this.callbacks.onEvent?.({
      kind: 'co-op-contribution',
      timestamp: Date.now(),
      data: { islandId, slot, contribution },
    });
    this.callbacks.onProgressChanged?.(progress);
    this.persistProgresses();
  }

  // ─── Supply Validation ───────────────────────────────────────────────────

  validateSupplies(
    supplies: Array<{ slotIndex: number; appleTypeId: string; quantity: number }>,
    islandId: IslandId,
  ): { valid: boolean; reason?: string } {
    const island = ISLAND_BY_ID[islandId];
    if (!island) return { valid: false, reason: 'Unknown island' };

    const appleTypes = new Set(supplies.map((s) => s.appleTypeId));

    // Check required apples
    for (const required of island.requiredApples) {
      if (!appleTypes.has(required)) {
        return { valid: false, reason: `Missing required apple: ${required}` };
      }
    }

    // Check avoided apples
    for (const avoided of island.avoidedApples) {
      if (appleTypes.has(avoided)) {
        return { valid: false, reason: `Contains avoided apple: ${avoided}` };
      }
    }

    return { valid: true };
  }

  // ─── Log ─────────────────────────────────────────────────────────────────

  getLogEntries(islandId?: IslandId): ExpeditionLogEntry[] {
    if (islandId) {
      return this.logEntries.filter((e) => e.islandId === islandId);
    }
    return [...this.logEntries];
  }

  getLogEntry(entryId: string): ExpeditionLogEntry | undefined {
    return this.logEntries.find((e) => e.id === entryId);
  }

  // ─── Internal ────────────────────────────────────────────────────────────

  private createProgress(islandId: IslandId): ExpeditionProgress {
    const progress: ExpeditionProgress = {
      islandId,
      status: 'idle',
      currentPhase: 'approach',
      currentStageIndex: 0,
      stageProgress: {},
      suppliesPacked: [],
      bossDefeated: false,
      discoveries: [],
      companionNotes: [],
      startedAt: 0,
    };
    this.progresses.push(progress);
    return progress;
  }

  private checkConditions(
    conditions: ExpeditionStageCondition[],
    progress: ExpeditionProgress,
  ): boolean {
    return conditions.every((condition) => this.evaluateCondition(condition, progress));
  }

  private evaluateCondition(
    condition: ExpeditionStageCondition,
    progress: ExpeditionProgress,
  ): boolean {
    switch (condition.kind) {
      case 'score-reached':
        return (progress.stageProgress[condition.target] ?? 0) >= condition.value;
      case 'length-reached':
        return (progress.stageProgress[condition.target] ?? 0) >= condition.value;
      case 'boss-defeated':
        return progress.bossDefeated && condition.value <= 1;
      case 'island-completed':
        return (progress.stageProgress[condition.target] ?? 0) >= 100;
      case 'supplies-packed':
        return progress.suppliesPacked.length > 0 && condition.value <= 1;
      default:
        return false;
    }
  }

  private stageToPhase(stage: { order: number }): ExpeditionProgress['currentPhase'] {
    switch (stage.order) {
      case 0: return 'approach';
      case 1: return 'explore';
      case 2: return 'discover';
      case 3: return 'escape';
      default: return 'explore';
    }
  }

  private persistProgresses(): void {
    this.store.saveExpeditions(this.progresses);
  }
}
