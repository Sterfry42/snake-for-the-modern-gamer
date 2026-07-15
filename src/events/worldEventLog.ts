import type { CreateWorldEventInput, WorldEvent, WorldEventSaveData } from './worldEventTypes.js';
import { clamp } from '../core/math.js';

const WORLD_EVENT_SAVE_VERSION = 1;
const DEFAULT_EVENT_CAP = 200;

export class WorldEventLog {
  private readonly events: WorldEvent[] = [];
  private counter = 0;

  constructor(private readonly cap = DEFAULT_EVENT_CAP) {}

  add(input: CreateWorldEventInput): WorldEvent {
    const event: WorldEvent = {
      id: `event:${this.counter++}`,
      type: input.type,
      roomId: input.roomId,
      sourceActorId: input.sourceActorId,
      targetActorIds: input.targetActorIds ?? [],
      witnessActorIds: input.witnessActorIds ?? [],
      severity: clamp(input.severity ?? 1, 0, 100),
      loudness: clamp(input.loudness ?? 0, 0, 100),
      tags: input.tags ?? [],
      summary: input.summary ?? input.type,
      createdAtRoomNumber: input.createdAtRoomNumber,
      createdAtMs: Date.now(),
      data: input.data,
    };
    this.events.push(event);
    while (this.events.length > this.cap) {
      this.events.shift();
    }
    return event;
  }

  getRecent(limit = 20): WorldEvent[] {
    return this.events.slice(Math.max(0, this.events.length - limit));
  }

  getAll(): WorldEvent[] {
    return [...this.events];
  }

  clear(): void {
    this.events.length = 0;
    this.counter = 0;
  }

  toSaveData(): WorldEventSaveData {
    return {
      version: WORLD_EVENT_SAVE_VERSION,
      events: this.getAll(),
    };
  }

  loadSaveData(data: WorldEventSaveData | undefined | null): void {
    this.clear();
    if (!data || !Array.isArray(data.events)) {
      return;
    }
    this.events.push(...data.events.slice(-this.cap));
    this.counter = this.events.length;
  }
}


