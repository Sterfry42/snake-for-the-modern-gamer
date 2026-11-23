import { AuthoritativeGameSession } from '../src/session/AuthoritativeGameSession.js';
import { WebSocketGameConnection } from '../src/session/WebSocketGameConnection.js';
import { createGameServer } from '../src/server/createGameServer.js';
import { ProcessPerformance } from '../src/server/ProcessPerformance.js';
import { WorkerGameSession } from '../src/server/WorkerGameSession.js';
import { WorldWorkerClient } from '../src/server/WorldWorkerClient.js';
import { defaultGameConfig } from '../src/config/gameConfig.js';
import { createWorldGenerationIdentity } from '../src/world/generation/worldGenerationIdentity.js';
import { SeededBiomeMap } from '../src/world/generation/biomeMap.js';
import { MultiRoomStructureResolver } from '../src/world/generation/townStructureResolver.js';

const threads = Number(process.argv[2] ?? 3);
const durationMs = Number(process.argv[3] ?? 6000);
const scenario = process.argv[4] ?? 'arena';
if (
  ![1, 2, 3].includes(threads) ||
  !Number.isFinite(durationMs) ||
  durationMs < 1000 ||
  !['arena', 'town', 'explore'].includes(scenario)
)
  throw new Error(
    'Usage: benchmark-multiplayer-load.ts [1|2|3 threads] [duration ms] [arena|town|explore]',
  );

function workloadConfig() {
  const seed = scenario === 'town' ? 'multi-room-structure-test' : 'multiplayer-load';
  const config = { ...defaultGameConfig, rng: { seed } };
  if (scenario === 'arena') return config;
  const { cols, rows } = config.grid;
  let roomX = 0;
  let roomY = 0;
  if (scenario === 'town') {
    const identity = createWorldGenerationIdentity(seed);
    const resolver = new MultiRoomStructureResolver(
      identity,
      new SeededBiomeMap(identity),
      config.grid,
    );
    let center;
    for (let ring = 1; ring <= 80 && !center; ring++) {
      for (let y = -ring; y <= ring && !center; y++) {
        for (let x = -ring; x <= ring; x++) {
          if (Math.max(Math.abs(x), Math.abs(y)) !== ring) continue;
          if (resolver.getTownMembership(`${x},${y},0`)?.district !== 'townCenter') continue;
          center = { x, y };
          break;
        }
      }
    }
    if (!center) throw new Error('Expected the workload seed to generate a town center');
    roomX = center.x;
    roomY = center.y;
  }
  const localX = scenario === 'explore' ? cols - 4 : Math.floor(cols / 2);
  const localY = Math.floor(rows / 2);
  const head = { x: roomX * cols + localX, y: roomY * rows + localY };
  return {
    ...config,
    world: { ...config.world, originRoomId: `${roomX},${roomY},0` },
    snake: {
      ...config.snake,
      initialBody: [head, { ...head, x: head.x - 1 }, { ...head, x: head.x - 2 }],
    },
  };
}

const config = workloadConfig();

const directions = [
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
  { x: 0, y: -1 },
];
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const quantiles = (values: number[]) => {
  values.sort((a, b) => a - b);
  const q = (p: number) =>
    Number((values[Math.max(0, Math.ceil(values.length * p) - 1)] ?? 0).toFixed(2));
  return { samples: values.length, p95: q(0.95), p99: q(0.99) };
};

for (const players of [2, 5, 10, 20]) {
  const failures: Error[] = [];
  const failure = (error: Error) => failures.push(error);
  const options = { requireCharacterCreation: false, config };
  const threaded =
    threads === 3
      ? await WorkerGameSession.create({ ...options, worldWorker: true }, failure)
      : null;
  const inline = threaded ? null : await AuthoritativeGameSession.create(options);
  const world = threads === 2 ? new WorldWorkerClient(failure) : null;
  if (world) inline?.setBackgroundWorldWork(world);
  const session = threaded ?? inline;
  if (!session) throw new Error('Missing authority');
  const publishedAcknowledgments: number[] = [];
  const server = createGameServer(session);
  const port = await server.listen(0);
  const clients: WebSocketGameConnection[] = [];
  const revisions = new Map<string, number>();
  const diagnostics = new ProcessPerformance();
  try {
    await Promise.all(
      Array.from({ length: players }, async (_, i) => {
        const client = new WebSocketGameConnection(`ws://127.0.0.1:${port}/game`, `Bench ${i + 1}`);
        clients.push(client);
        await client.ready;
        client.onMovement((update) => {
          if (update.player.id === client.playerId)
            revisions.set(update.player.id, update.player.movementRevision ?? 0);
        });
      }),
    );
    const started = performance.now();
    diagnostics.read();
    inline?.start((error) => failure(error instanceof Error ? error : new Error(String(error))));
    await threaded?.start();
    let round = 0;
    while (performance.now() - started < durationMs) {
      await Promise.all(
        clients.map(async (client, i) => {
          const sent = performance.now();
          const playerId = client.playerId!;
          const direction =
            scenario === 'explore' ? directions[0] : directions[(round + i) % directions.length];
          await client.send({ type: 'setDirection', playerId, direction });
          if (scenario === 'town') await client.send({ type: 'manualStep', playerId });
          publishedAcknowledgments.push(performance.now() - sent);
        }),
      );
      round++;
      await wait(125);
    }
    const serverSample = await server.samplePerformance();
    console.info(
      JSON.stringify({
        threads,
        scenario,
        players,
        origin: config.world.originRoomId,
        activeActors: serverSample.activeActors,
        knownRooms: serverSample.knownRooms,
        simulatedMs: Math.round(performance.now() - started),
        playersWithMovement: [...revisions.values()].filter((revision) => revision > 0).length,
        playersStillAlive: serverSample.players.filter((player) => player.alive).length,
        clientCommandCompletionMs: quantiles(publishedAcknowledgments),
        maximumQueueWaitMs: serverSample.maximumQueueWaitMs,
        maximumUpdateMs: serverSample.maximumUpdateMs,
        maximumAppleCommitToSendMs: server.getMaximumImmediateEventMs(),
        backgroundWorld: serverSample.backgroundWorld,
        updatesOverBudget: serverSample.updatesOverBudget,
        clocks: serverSample.clockTimings,
        process: diagnostics.read(),
      }),
    );
    if (failures.length) throw new AggregateError(failures, 'Multiplayer workload failed');
  } finally {
    diagnostics.close();
    clients.forEach((client) => client.disconnect());
    try {
      await server.close();
    } finally {
      await Promise.all([threaded?.close(), world?.close()]);
    }
  }
}
