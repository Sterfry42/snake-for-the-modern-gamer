import { Worker } from 'node:worker_threads';
import type { GameServerSession } from './GameServerSession.js';
import type {
  AuthorityInitial,
  AuthorityMethods,
  AuthorityNotice,
  AuthorityRequest,
} from './authorityWorkerMessages.js';
import type { GameConfig } from '../config/gameConfig.js';
import type { GameSnapshot } from '../session/GameSnapshot.js';
import type { MovementUpdate } from '../session/MovementUpdate.js';
import type { GameEvent } from '../session/GameEvent.js';
import type { SessionDiagnostic } from '../session/SessionDiagnostic.js';
import { ServerPerformance } from '../session/ServerPerformance.js';
import { SpawnAreaUnavailable } from '../players/safePlayerSpawn.js';

type Reply = Extract<AuthorityNotice, { type: 'result' | 'failed' }>;

export class WorkerGameSession implements GameServerSession {
  private readonly movement = new Set<(value: MovementUpdate) => void>();
  private readonly events = new Set<(value: GameEvent) => void>();
  private readonly diagnostics = new Set<(value: SessionDiagnostic) => void>();
  private readonly pending = new Map<number, (message: Reply) => void>();
  readonly performance = new ServerPerformance();
  private readonly worker: Worker;
  private readonly ready: Promise<AuthorityInitial>;
  private latest!: AuthorityInitial;
  private nextId = 0;
  private unavailable = false;
  private closing = false;

  private constructor(
    options: {
      saveDirectory?: string;
      worldWorker: boolean;
      requireCharacterCreation?: boolean;
      config?: GameConfig;
    },
    onFailure: (error: Error) => void,
  ) {
    this.worker = new Worker(new URL('./workerBootstrap.mjs', import.meta.url), {
      workerData: { entry: './authorityWorker.ts', options },
    });
    this.ready = new Promise((resolve, reject) => {
      const failed = (error: Error) => {
        if (this.unavailable) return;
        this.unavailable = true;
        reject(error);
        for (const finish of this.pending.values())
          finish({ type: 'failed', id: 0, error: error.message, name: error.name });
        this.pending.clear();
        if (!this.closing) onFailure(error);
      };
      this.worker.on('error', failed);
      this.worker.on('exit', (code) => failed(new Error(`Authority worker exited (${code})`)));
      this.worker.on('message', (message: AuthorityNotice) => {
        switch (message.type) {
          case 'ready':
            this.latest = message.value;
            resolve(message.value);
            break;
          case 'movement':
            for (const handler of this.movement) handler(message.value);
            break;
          case 'event':
            for (const handler of this.events) handler(message.value);
            break;
          case 'diagnostic':
            for (const handler of this.diagnostics) handler(message.value);
            break;
          default: {
            const finish = this.pending.get(message.id);
            this.pending.delete(message.id);
            finish?.(message);
          }
        }
      });
    });
  }

  static async create(
    options: {
      saveDirectory?: string;
      worldWorker: boolean;
      requireCharacterCreation?: boolean;
      config?: GameConfig;
    },
    onFailure: (error: Error) => void,
  ): Promise<WorkerGameSession> {
    const session = new WorkerGameSession(options, onFailure);
    await session.ready;
    return session;
  }

  private call<K extends keyof AuthorityMethods>(
    method: K,
    ...args: Parameters<AuthorityMethods[K]>
  ): Promise<Awaited<ReturnType<AuthorityMethods[K]>>> {
    if (this.unavailable || this.pending.size >= 1024)
      return Promise.reject(new Error('Authority worker unavailable or busy'));
    return new Promise((resolve, reject) => {
      const id = ++this.nextId;
      this.pending.set(id, (message) => {
        if (message.type === 'failed')
          reject(
            message.name === 'SpawnAreaUnavailable'
              ? new SpawnAreaUnavailable()
              : new Error(message.error),
          );
        // Replies originate from the matching method on our worker, indexed by request ID.
        else resolve(message.value as Awaited<ReturnType<AuthorityMethods[K]>>);
      });
      try {
        this.worker.postMessage({ id, method, args } satisfies AuthorityRequest);
      } catch (error) {
        this.pending.delete(id);
        reject(error);
      }
    });
  }

  configureHosting(): void {
    /* Worker startup configures hosting before ready. */
  }
  hasClaimedPrimaryCharacter() {
    return this.latest.claimed;
  }
  getSnapshot() {
    return this.latest.snapshot;
  }
  getPerformanceReport() {
    return this.latest.performance;
  }
  async refreshPerformance(reset: boolean) {
    const authority = await this.call('getPerformanceReport', reset);
    const transport = this.performance.read(authority, reset);
    const report = {
      ...authority,
      snapshotPayloads: transport.snapshotPayloads,
      averagePayloadBytes: transport.averagePayloadBytes,
      maximumPayloadBytes: transport.maximumPayloadBytes,
      snapshotSerializationMs: transport.snapshotSerializationMs,
      maximumSnapshotSerializationMs: transport.maximumSnapshotSerializationMs,
      movementPackets: transport.movementPackets,
      movementBytes: transport.movementBytes,
      movementSerializationMs: transport.movementSerializationMs,
    };
    this.latest.performance = report;
    return report;
  }
  onMovement(handler: (value: MovementUpdate) => void) {
    this.movement.add(handler);
    return () => {
      this.movement.delete(handler);
    };
  }
  onEvent(handler: (value: GameEvent) => void) {
    this.events.add(handler);
    return () => {
      this.events.delete(handler);
    };
  }
  onDiagnostic(handler: (value: SessionDiagnostic) => void) {
    this.diagnostics.add(handler);
    return () => {
      this.diagnostics.delete(handler);
    };
  }
  recordPublishedMovement(connectionId: string, snapshot: GameSnapshot | MovementUpdate): void {
    const player =
      'player' in snapshot ? snapshot.player : snapshot.players[snapshot.localPlayerId];
    if (player && !this.unavailable)
      this.worker.postMessage({
        id: 0,
        method: 'recordPublishedMovementRevision',
        args: [connectionId, player.id, player.movementRevision],
      } satisfies AuthorityRequest);
  }
  async publishNetworkState(publish: (playerId: string, snapshot: GameSnapshot) => void) {
    for (const [id, snapshot] of await this.call('networkState')) publish(id, snapshot);
  }
  attachConnection(...args: Parameters<AuthorityMethods['attachConnection']>) {
    return this.call('attachConnection', ...args);
  }
  detachConnection(...args: Parameters<AuthorityMethods['detachConnection']>) {
    return this.call('detachConnection', ...args);
  }
  suspendConnection(...args: Parameters<AuthorityMethods['suspendConnection']>) {
    return this.call('suspendConnection', ...args);
  }
  enableMovementGrace(id: string) {
    return this.call('enableMovementGrace', id);
  }
  getConnectionSnapshot(id: string) {
    return this.call('getConnectionSnapshot', id);
  }
  executeCommand(...args: Parameters<AuthorityMethods['executeCommand']>) {
    return this.call('executeCommand', ...args);
  }
  resolveResumeDigest(digest: string) {
    return this.call('resolveResumeDigest', digest);
  }
  getPlayerMovementDiagnostic(id: string) {
    return this.call('getPlayerMovementDiagnostic', id);
  }
  getMovementClockTime() {
    return this.call('getMovementClockTime');
  }
  autosave() {
    return this.call('autosave');
  }
  start() {
    return this.call('start');
  }
  stop(): void {
    if (!this.unavailable)
      this.worker.postMessage({ id: 0, method: 'stop', args: [] } satisfies AuthorityRequest);
  }
  flush() {
    return this.unavailable ? Promise.resolve() : this.call('flush');
  }
  async close(): Promise<void> {
    this.closing = true;
    await this.worker.terminate();
  }
}
