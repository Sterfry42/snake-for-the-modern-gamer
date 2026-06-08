import type { WorldEvent } from '../events/worldEventTypes.js';
import {
  distortWorldEventSummary,
  factionIdsForWorldEvent,
  rumorFromFactionEvent,
  rumorTypeForWorldEvent,
  shouldCreateRumorFromWorldEvent,
  sourceKindForWorldEvent,
} from './rumorText.js';
import type { FactionCurrentEvent } from '../factions/factionTypes.js';
import type { Rumor, RumorSaveData } from './rumorTypes.js';

const RUMOR_SAVE_VERSION = 1;
const DEFAULT_MAX_RUMORS = 100;

export class RumorSystem {
  private rumors: Rumor[] = [];

  constructor(private readonly maxRumors = DEFAULT_MAX_RUMORS) {}

  getAll(): Rumor[] {
    return [...this.rumors];
  }

  getRecent(limit = 8): Rumor[] {
    return this.rumors.slice(-Math.max(0, limit)).reverse();
  }

  getByTown(townId: string, limit = 8): Rumor[] {
    return this.rumors
      .filter((rumor) => rumor.townId === townId || rumor.public)
      .slice(-Math.max(0, limit))
      .reverse();
  }

  getByFaction(factionId: string, limit = 8): Rumor[] {
    return this.rumors
      .filter((rumor) => rumor.factionIds.includes(factionId))
      .slice(-Math.max(0, limit))
      .reverse();
  }

  getKnownByActor(actorId: string, limit = 8): Rumor[] {
    return this.rumors
      .filter((rumor) => rumor.knownByActorIds.includes(actorId))
      .slice(-Math.max(0, limit))
      .reverse();
  }

  rememberForActor(rumorId: string, actorId: string): Rumor | undefined {
    const rumor = this.rumors.find((entry) => entry.id === rumorId);
    if (!rumor || rumor.knownByActorIds.includes(actorId)) {
      return rumor;
    }
    rumor.knownByActorIds = [...rumor.knownByActorIds, actorId];
    return rumor;
  }

  createFromWorldEvent(event: WorldEvent, townId?: string): Rumor | undefined {
    if (!shouldCreateRumorFromWorldEvent(event)) {
      return undefined;
    }
    const existing = this.rumors.find((rumor) => rumor.sourceEventId === event.id);
    if (existing) {
      return existing;
    }
    const exaggeration = exaggerationForWorldEvent(event);
    const rumor: Rumor = {
      id: `rumor:${event.id}`,
      sourceEventId: event.id,
      sourceActorId: event.sourceActorId,
      subjectActorId: event.targetActorIds[0],
      roomId: event.roomId,
      townId,
      factionIds: factionIdsForWorldEvent(event),
      type: rumorTypeForWorldEvent(event),
      sourceKind: sourceKindForWorldEvent(event),
      truthLevel: truthLevelForWorldEvent(event),
      exaggeration,
      severity: event.severity,
      textSeed: event.summary,
      summary: distortWorldEventSummary(event, exaggeration),
      tags: [...event.tags],
      createdAt: event.createdAtRoomNumber ?? 0,
      knownByActorIds: [...new Set([...event.witnessActorIds, ...event.targetActorIds])],
      public: event.severity >= 35 || event.loudness >= 35,
    };
    this.addRumor(rumor);
    return rumor;
  }

  createFromFactionEvent(event: FactionCurrentEvent, createdAt: number): Rumor {
    const existing = this.rumors.find((rumor) => rumor.sourceEventId === event.id);
    if (existing) {
      return existing;
    }
    const rumor = rumorFromFactionEvent(event, createdAt);
    this.addRumor(rumor);
    return rumor;
  }

  addRumor(rumor: Rumor): Rumor {
    this.rumors = [
      ...this.rumors.filter(
        (entry) => entry.id !== rumor.id && entry.sourceEventId !== rumor.sourceEventId,
      ),
      rumor,
    ].slice(-this.maxRumors);
    return rumor;
  }

  tick(currentRoomNumber: number): void {
    this.rumors = this.rumors.filter(
      (rumor) => rumor.expiresAt === undefined || rumor.expiresAt > currentRoomNumber,
    );
  }

  save(): RumorSaveData {
    return {
      version: RUMOR_SAVE_VERSION,
      rumors: this.getAll(),
    };
  }

  load(save?: RumorSaveData): void {
    this.rumors = save?.rumors ? save.rumors.slice(-this.maxRumors) : [];
  }
}

function exaggerationForWorldEvent(event: WorldEvent): number {
  let value = Math.round(event.severity / 4);
  if (event.tags.includes('eaten')) value += 14;
  if (event.tags.includes('romance') || event.tags.includes('marriage')) value += 8;
  if (event.witnessActorIds.length === 0) value += 10;
  if (event.loudness >= 50) value += 8;
  return Math.max(0, Math.min(70, value));
}

function truthLevelForWorldEvent(event: WorldEvent): number {
  let value = 90;
  if (event.witnessActorIds.length === 0) value -= 18;
  if (event.tags.includes('false')) value -= 45;
  if (event.tags.includes('exaggerated')) value -= 20;
  if (event.severity >= 70) value -= 5;
  return Math.max(5, Math.min(100, value));
}
