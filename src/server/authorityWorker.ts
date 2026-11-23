import { copyGameSnapshot } from '../session/gameProtocol.js';
import { parentPort, workerData } from 'node:worker_threads';
import { AuthoritativeGameSession } from '../session/AuthoritativeGameSession.js';
import { FileGameSaveStore } from '../storage/FileGameSaveStore.js';
import { WorldWorkerClient } from './WorldWorkerClient.js';
import type {
  AuthorityMethods,
  AuthorityNotice,
  AuthorityRequest,
} from './authorityWorkerMessages.js';
import type { GameConfig } from '../config/gameConfig.js';
import type { GameSnapshot } from '../session/GameSnapshot.js';

if (!parentPort) throw new Error('Authority requires a worker port');
const port = parentPort;
const options: {
  saveDirectory?: string;
  worldWorker: boolean;
  requireCharacterCreation?: boolean;
  config?: GameConfig;
} = workerData.options;
const post = (message: AuthorityNotice) => port.postMessage(message);
const session = await AuthoritativeGameSession.create({
  requireCharacterCreation: options.requireCharacterCreation,
  config: options.config,
  saveStore: options.saveDirectory ? new FileGameSaveStore(options.saveDirectory) : undefined,
});
session.configureHosting();
const world = options.worldWorker
  ? new WorldWorkerClient((error) =>
      post({
        type: 'diagnostic',
        value: { level: 'error', event: 'world-worker.failed', fields: { error } },
      }),
    )
  : null;
if (world) session.setBackgroundWorldWork(world);
session.onMovement((value) => post({ type: 'movement', value }));
session.onEvent((value) => post({ type: 'event', value }));
session.onDiagnostic((value) => post({ type: 'diagnostic', value }));
const methods: AuthorityMethods = {
  attachConnection: session.attachConnection.bind(session),
  detachConnection: session.detachConnection.bind(session),
  suspendConnection: session.suspendConnection.bind(session),
  enableMovementGrace: session.enableMovementGrace.bind(session),
  async getConnectionSnapshot(id) {
    return session.getConnectionSnapshot(id, true);
  },
  executeCommand: session.executeCommand.bind(session),
  autosave: session.autosave.bind(session),
  flush: session.flush.bind(session),
  stop: () => session.stop(),
  getMovementClockTime: session.getMovementClockTime.bind(session),
  resolveResumeDigest: session.resolveResumeDigest.bind(session),
  getPlayerMovementDiagnostic: session.getPlayerMovementDiagnostic.bind(session),
  getPerformanceReport: session.getPerformanceReport.bind(session),
  recordPublishedMovementRevision: session.recordPublishedMovementRevision.bind(session),
  start: () =>
    session.start((error) => {
      session.stop();
      post({
        type: 'diagnostic',
        value: {
          level: 'error',
          event: 'simulation.stopped',
          fields: { error, ...session.getQueueDiagnostics() },
        },
      });
    }),
  async networkState() {
    const snapshots: Array<[string, GameSnapshot]> = [];
    await session.publishNetworkState((id, snapshot) =>
      snapshots.push([id, copyGameSnapshot(snapshot)]),
    );
    return snapshots;
  },
};
port.on('message', async ({ id, method, args }: AuthorityRequest) => {
  try {
    const value: unknown = await Reflect.apply(methods[method], methods, args);
    if (id) post({ type: 'result', id, value });
  } catch (error) {
    post({
      type: 'failed',
      id,
      error: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.name : 'Error',
    });
  }
});
port.once('close', () => void world?.close());
post({
  type: 'ready',
  value: {
    snapshot: session.getSnapshot(),
    claimed: session.hasClaimedPrimaryCharacter(),
    performance: session.getPerformanceReport(),
  },
});
