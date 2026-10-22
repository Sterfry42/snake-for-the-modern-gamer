export interface ServerPerformanceGauges {
  cachedRooms: number;
  knownRooms: number;
  materializedRooms: number;
  totalActors: number;
  activeActors: number;
  travelingActors: number;
  offscreenActors: number;
  connectedPlayers: number;
}

/** Aggregated counters only; no per-frame logging or world projection. */
export class ServerPerformance {
  private since = performance.now();
  private publications = 0;
  private payloads = 0;
  private bytes = 0;
  private maxBytes = 0;
  private buildMs = 0;
  private buildMaxMs = 0;
  private serializeMs = 0;
  private serializeMaxMs = 0;
  private actorMs = 0;
  private actorMaxMs = 0;
  private actorTicks = 0;
  private updateMs = 0;
  private updateMaxMs = 0;
  private updates = 0;
  private builds = 0;
  private movementPackets = 0;
  private movementBytes = 0;
  private movementSerializeMs = 0;

  publication(): void {
    this.publications++;
  }
  build(durationMs: number): void {
    this.builds++;
    this.buildMs += durationMs;
    this.buildMaxMs = Math.max(this.buildMaxMs, durationMs);
  }
  payload(bytes: number, durationMs: number): void {
    this.payloads++;
    this.bytes += bytes;
    this.maxBytes = Math.max(this.maxBytes, bytes);
    this.serializeMs += durationMs;
    this.serializeMaxMs = Math.max(this.serializeMaxMs, durationMs);
  }
  movement(bytes: number, durationMs: number): void {
    this.movementPackets++;
    this.movementBytes += bytes;
    this.movementSerializeMs += durationMs;
  }
  actor(durationMs: number): void {
    this.actorMs += durationMs;
    this.actorMaxMs = Math.max(this.actorMaxMs, durationMs);
    this.actorTicks++;
  }
  update(durationMs: number): void {
    this.updateMs += durationMs;
    this.updateMaxMs = Math.max(this.updateMaxMs, durationMs);
    this.updates++;
  }
  read(gauges: ServerPerformanceGauges, reset = false) {
    const seconds = Math.max(0.001, (performance.now() - this.since) / 1000);
    const report = {
      ...gauges,
      intervalSeconds: seconds,
      snapshotPublications: this.publications,
      snapshotPublicationsPerSecond: this.publications / seconds,
      snapshotPayloads: this.payloads,
      averagePayloadBytes: this.bytes / Math.max(1, this.payloads),
      maximumPayloadBytes: this.maxBytes,
      snapshotBuildMs: this.buildMs,
      snapshotBuilds: this.builds,
      movementPackets: this.movementPackets,
      movementBytes: this.movementBytes,
      movementSerializationMs: this.movementSerializeMs,
      maximumSnapshotBuildMs: this.buildMaxMs,
      snapshotSerializationMs: this.serializeMs,
      maximumSnapshotSerializationMs: this.serializeMaxMs,
      averageActorTickMs: this.actorMs / Math.max(1, this.actorTicks),
      maximumActorTickMs: this.actorMaxMs,
      averageUpdateMs: this.updateMs / Math.max(1, this.updates),
      maximumUpdateMs: this.updateMaxMs,
    };
    if (reset) {
      this.since = performance.now();
      this.publications = 0;
      this.builds = this.movementPackets = this.movementBytes = this.movementSerializeMs = 0;
      this.payloads = 0;
      this.bytes = 0;
      this.maxBytes = 0;
      this.buildMs = 0;
      this.buildMaxMs = 0;
      this.serializeMs = 0;
      this.serializeMaxMs = 0;
      this.actorMs = 0;
      this.actorMaxMs = 0;
      this.actorTicks = 0;
      this.updateMs = 0;
      this.updateMaxMs = 0;
      this.updates = 0;
    }
    return report;
  }
}
export type ServerPerformanceReport = ReturnType<ServerPerformance['read']>;
