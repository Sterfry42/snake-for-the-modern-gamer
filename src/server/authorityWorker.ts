import { parentPort, workerData } from 'node:worker_threads';
import { markMultiplayer } from '../session/MultiplayerProfiler.js';
import { ProcessPerformance } from './ProcessPerformance.js';
import { AuthoritativeGameSession } from '../session/AuthoritativeGameSession.js';
import { FileGameSaveStore } from '../storage/FileGameSaveStore.js';
import { WorldWorkerClient } from './WorldWorkerClient.js';
import type {
  AuthorityMethods,
  AuthorityNotice,
  AuthorityRequest,
} from './authorityWorkerMessages.js';
import type { GameConfig } from '../config/gameConfig.js';
import type { NetworkPublication } from '../session/NetworkPublication.js';

if (!parentPort) throw new Error('Authority requires a worker port');
const port = parentPort;
const performanceProbe = new ProcessPerformance();
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
session.onEvent((value, sequence, timing) => post({ type: 'event', value, sequence, timing }));
session.onDiagnostic((value) => post({ type: 'diagnostic', value }));
const methods: AuthorityMethods = {
  attachConnection: session.attachConnection.bind(session),
  detachConnection: session.detachConnection.bind(session),
  suspendConnection: session.suspendConnection.bind(session),
  enableMovementGrace: session.enableMovementGrace.bind(session),
  async getConnectionSnapshot(id) {
    return session.getConnectionSnapshot(id, true);
  },
  openNetworkPublication: session.openNetworkPublication.bind(session),
  publishConnectionState: session.publishConnectionState.bind(session),
  executeCommand: session.executeCommand.bind(session),
  async executeNetworkCommand(connectionId, command, trace) {
    markMultiplayer(trace, 'worker-received');
    const reply = await session.executeNetworkCommand(connectionId, command, trace);
    markMultiplayer(trace, 'worker-response');
    return reply;
  },
  autosave: session.autosave.bind(session),
  flush: session.flush.bind(session),
  stop: () => session.stop(),
  getMovementClockTime: session.getMovementClockTime.bind(session),
  resolveResumeDigest: session.resolveResumeDigest.bind(session),
  getPlayerMovementDiagnostic: session.getPlayerMovementDiagnostic.bind(session),
  getPerformanceReport(reset) {
    return { ...session.getPerformanceReport(reset), authorityThread: performanceProbe.read() };
  },
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
  async networkDeltas() {
    const publications: NetworkPublication[] = [];
    await session.publishNetworkDeltas((publication) => publications.push(publication));
    return publications;
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
port.once('close', () => {
  performanceProbe.close();
  void world?.close();
});
post({
  type: 'ready',
  value: {
    snapshot: session.getSnapshot(),
    claimed: session.hasClaimedPrimaryCharacter(),
    performance: session.getPerformanceReport(),
  },
});
