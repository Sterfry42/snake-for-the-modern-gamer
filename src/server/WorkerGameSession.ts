import { WorkerTransferPerformance } from './WorkerTransferPerformance.js';
import { Worker } from 'node:worker_threads';
import type { GameServerSession } from './GameServerSession.js';
import type {
  AuthorityInitial,
  AuthorityMethods,
  AuthorityNotice,
  AuthorityRequest,
} from './authorityWorkerMessages.js';
import type { GameConfig } from '../config/gameConfig.js';
import type { NetworkPublication } from '../session/NetworkPublication.js';
import type { MovementUpdate } from '../session/MovementUpdate.js';
import type { GameEvent, GameEventTiming } from '../session/GameEvent.js';
import type { SessionDiagnostic } from '../session/SessionDiagnostic.js';
import { ServerPerformance } from '../session/ServerPerformance.js';
import { SpawnAreaUnavailable } from '../players/safePlayerSpawn.js';

type Reply = Extract<AuthorityNotice, { type: 'result' | 'failed' }>;

export class WorkerGameSession implements GameServerSession {
  private readonly movement = new Set<(value: MovementUpdate) => void>();
  private readonly events = new Set<
    (value: GameEvent, sequence: number, timing?: GameEventTiming) => void
  >();
  private readonly diagnostics = new Set<(value: SessionDiagnostic) => void>();
  private readonly pending = new Map<number, (message: Reply) => void>();
  private readonly transfers = new WorkerTransferPerformance();
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
        if (!('id' in message)) this.transfers.receive(message.type, message);
        switch (message.type) {
          case 'ready':
            this.latest = message.value;
            resolve(message.value);
            break;
          case 'movement':
            for (const handler of this.movement) handler(message.value);
            break;
          case 'event':
            for (const handler of this.events)
              handler(message.value, message.sequence, message.timing);
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
        this.transfers.receive(method, message);
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
        const message = { id, method, args } satisfies AuthorityRequest;
        this.transfers.post(method, message, () => this.worker.postMessage(message));
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
  getWorkerTransfers() {
    return this.transfers.read();
  }

  async refreshPerformance(reset: boolean) {
    const authority = await this.call('getPerformanceReport', reset);
    const transport = this.performance.read(authority, reset);
    const report = {
      ...authority,
      workerTransfers: this.getWorkerTransfers(),
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
  onEvent(handler: (value: GameEvent, sequence: number, timing?: GameEventTiming) => void) {
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
  recordPublishedMovementRevision(connectionId: string, playerId: string, revision?: number): void {
    if (revision === undefined || this.unavailable) return;
    const message = {
      id: 0,
      method: 'recordPublishedMovementRevision',
      args: [connectionId, playerId, revision],
    } satisfies AuthorityRequest;
    this.transfers.post(message.method, message, () => this.worker.postMessage(message));
  }

  openNetworkPublication(connectionId: string) {
    return this.call('openNetworkPublication', connectionId);
  }

  publishConnectionState(connectionId: string) {
    return this.call('publishConnectionState', connectionId);
  }

  async publishNetworkDeltas(publish: (publication: NetworkPublication) => void) {
    for (const publication of await this.call('networkDeltas')) publish(publication);
  }

  executeNetworkCommand(...args: Parameters<AuthorityMethods['executeNetworkCommand']>) {
    return this.call('executeNetworkCommand', ...args);
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
