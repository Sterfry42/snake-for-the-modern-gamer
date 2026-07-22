import { MANEUVER_IDS, MANEUVER_SHARED_COOLDOWN_STEPS, isManeuverId } from './maneuverCatalog.js';
import type { ManeuverId, ManeuverSaveState, ManeuverSnapshot } from './maneuverTypes.js';

const SAVE_VERSION = 1;
const HISTORY_LIMIT = 10;

export function createDefaultManeuverState(): ManeuverSaveState {
  return {
    version: SAVE_VERSION,
    learnedIds: [],
    equippedId: null,
    cooldownRemaining: 0,
    discoveredTrainerIds: [],
  };
}

export function normalizeManeuverState(value: unknown): ManeuverSaveState {
  if (!value || typeof value !== 'object') {
    return createDefaultManeuverState();
  }
  const raw = value as Partial<ManeuverSaveState>;
  const learnedIds = Array.from(
    new Set(Array.isArray(raw.learnedIds) ? raw.learnedIds.filter(isManeuverId) : []),
  );
  const equippedId =
    isManeuverId(raw.equippedId) && learnedIds.includes(raw.equippedId) ? raw.equippedId : null;
  const rawCooldown = Number(raw.cooldownRemaining ?? 0);
  const cooldownRemaining = Number.isFinite(rawCooldown)
    ? Math.max(0, Math.min(MANEUVER_SHARED_COOLDOWN_STEPS, Math.floor(rawCooldown)))
    : 0;
  const discoveredTrainerIds = Array.from(
    new Set(
      Array.isArray(raw.discoveredTrainerIds)
        ? raw.discoveredTrainerIds.filter((id): id is string => typeof id === 'string')
        : [],
    ),
  );
  return {
    version: SAVE_VERSION,
    learnedIds,
    equippedId,
    cooldownRemaining,
    discoveredTrainerIds,
  };
}

export class ManeuverController {
  private state: ManeuverSaveState = createDefaultManeuverState();
  private readonly history: ManeuverSnapshot[] = [];

  reset(): void {
    this.state = createDefaultManeuverState();
    this.history.length = 0;
  }

  restore(value: unknown): void {
    this.state = normalizeManeuverState(value);
    this.history.length = 0;
  }

  exportState(): ManeuverSaveState {
    return {
      version: SAVE_VERSION,
      learnedIds: [...this.state.learnedIds],
      equippedId: this.state.equippedId,
      cooldownRemaining: this.state.cooldownRemaining,
      discoveredTrainerIds: [...this.state.discoveredTrainerIds],
    };
  }

  getState(): ManeuverSaveState {
    return this.exportState();
  }

  learn(id: ManeuverId): { learnedNow: boolean; autoEquipped: boolean } {
    const learnedNow = !this.state.learnedIds.includes(id);
    if (learnedNow) {
      this.state.learnedIds = [...this.state.learnedIds, id];
    }
    const autoEquipped = this.state.equippedId === null;
    if (autoEquipped) {
      this.state.equippedId = id;
    }
    return { learnedNow, autoEquipped };
  }

  equip(id: ManeuverId): boolean {
    if (!this.state.learnedIds.includes(id)) {
      return false;
    }
    this.state.equippedId = id;
    return true;
  }

  markTrainerDiscovered(trainerId: string): void {
    if (!this.state.discoveredTrainerIds.includes(trainerId)) {
      this.state.discoveredTrainerIds = [...this.state.discoveredTrainerIds, trainerId];
    }
  }

  ensureTrainerDiscovered(trainerId: string): number {
    const existingIndex = this.state.discoveredTrainerIds.indexOf(trainerId);
    if (existingIndex >= 0) {
      return existingIndex;
    }
    this.state.discoveredTrainerIds = [...this.state.discoveredTrainerIds, trainerId];
    return this.state.discoveredTrainerIds.length - 1;
  }

  tickCooldown(): boolean {
    if (this.state.cooldownRemaining <= 0) {
      return false;
    }
    this.state.cooldownRemaining -= 1;
    return this.state.cooldownRemaining === 0;
  }

  startCooldown(): void {
    this.state.cooldownRemaining = MANEUVER_SHARED_COOLDOWN_STEPS;
  }

  recordSnapshot(snapshot: ManeuverSnapshot): void {
    this.history.unshift({
      roomId: snapshot.roomId,
      body: snapshot.body.map((segment) => ({ ...segment })),
      direction: { ...snapshot.direction },
      health: Math.max(0, Math.floor(snapshot.health)),
    });
    this.history.splice(HISTORY_LIMIT);
  }

  clearHistory(): void {
    this.history.length = 0;
  }

  consumeRewindSnapshot(
    currentLength: number,
    historySteps = HISTORY_LIMIT,
  ): ManeuverSnapshot | null {
    const searchLimit = Math.max(1, Math.min(HISTORY_LIMIT, Math.floor(historySteps)));
    let index = -1;
    for (let i = searchLimit - 1; i >= 0; i -= 1) {
      if (this.history[i]?.body.length === currentLength) {
        index = i;
        break;
      }
    }
    if (index < 0) {
      return null;
    }
    const [snapshot] = this.history.splice(index, 1);
    return {
      roomId: snapshot.roomId,
      body: snapshot.body.map((segment) => ({ ...segment })),
      direction: { ...snapshot.direction },
      health: snapshot.health,
    };
  }

  hasLearned(id: ManeuverId): boolean {
    return this.state.learnedIds.includes(id);
  }

  get equippedId(): ManeuverId | null {
    return this.state.equippedId;
  }

  get cooldownRemaining(): number {
    return this.state.cooldownRemaining;
  }
}

export function allManeuverIds(): readonly ManeuverId[] {
  return MANEUVER_IDS;
}
