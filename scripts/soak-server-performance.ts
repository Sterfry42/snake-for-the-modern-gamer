import { performance } from 'node:perf_hooks';
import { SnakeGame } from '../src/game/snakeGame.js';
import { defaultGameConfig } from '../src/config/gameConfig.js';
import { QuestRegistry } from '../src/quests/questRegistry.js';
import { createBaseActor } from '../src/actors/actorFactory.js';
import { AuthoritativeGameSession } from '../src/session/AuthoritativeGameSession.js';
import { WebSocketGameConnection } from '../src/session/WebSocketGameConnection.js';
import { createGameServer } from '../src/server/createGameServer.js';
import { ServerLogger } from '../src/server/ServerLogger.js';

// Isolated synthetic world: never opens the player's checkpoint directory.
// node --expose-gc --import tsx scripts/soak-server-performance.ts [minutes=30]
const minutes = Number(process.argv[2] ?? 30);
if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 120)
  throw new Error('Duration must be greater than zero and at most 120 minutes');
const game = new SnakeGame(
  { ...defaultGameConfig, rng: { seed: 'fixed-population-soak' } },
  new QuestRegistry(),
);
game.reset();
game.bosses.clearAll();
for (let index = 0; index < 40; index++) game.getRoom(`${20 + index},20,0`);
for (let index = 0; index < 40; index++) {
  const actor = createBaseActor({
    id: `soak-${index}`,
    displayName: 'Commuter',
    kind: 'civilian',
    role: 'resident',
    species: 'human',
    thickness: 'thin',
    currentRoomId: '100,100,0',
  });
  actor.goal = { kind: 'work', priority: 10, roomId: '103,100,0', targetPosition: { x: 4, y: 4 } };
  actor.presence = { roomId: '100,100,0', position: { x: 10, y: 10 }, materialized: false };
  game.getActorSystem().registry.upsert(actor);
}
const session = new AuthoritativeGameSession({ game, manageBasicFeatures: true });
const logger = await ServerLogger.create({ directory: `.snake-server-logs/soak-${Date.now()}` });
const server = createGameServer(session, { onDiagnostic: logger.log });
const port = await server.listen(0);
const clients = ['Alice', 'Bob'].map(
  (name) => new WebSocketGameConnection(`ws://127.0.0.1:${port}/game`, name),
);
let stopped = false;
const stop = () => {
  stopped = true;
};
process.once('SIGINT', stop);
process.once('SIGTERM', stop);
try {
  await Promise.all(
    clients.map(async (client) => {
      await client.ready;
      await client.send({ type: 'playerInteraction', playerId: client.playerId!, mode: 'paused' });
    }),
  );
  game.runForPlayer(clients[1].playerId!, () =>
    game.handlePlayerRoomTransition('0,0,0', '1,0,0', { mode: 'snake', direction: { x: 1, y: 0 } }),
  );
  session.refreshSnapshot();
  console.info(`Fixed-population soak: ${minutes} minutes; log ${logger.path}`);
  session.start((error) => {
    logger.log({ level: 'error', event: 'soak.simulation-failed', fields: { error } });
    stop();
  });
  // Let loaded-room materialization and initial publications settle before
  // comparing memory against a fixed room/Actor population.
  await new Promise((resolve) => setTimeout(resolve, 5000));
  const baseline = session.getPerformanceReport();
  const startedAt = performance.now();
  let sampleAt = -Infinity;
  while (!stopped && performance.now() - startedAt < minutes * 60000) {
    if (performance.now() - sampleAt >= 10000) {
      sampleAt = performance.now();
      globalThis.gc?.();
      const report = session.getPerformanceReport();
      const sample = {
        elapsedSeconds: (sampleAt - startedAt) / 1000,
        forcedGc: typeof globalThis.gc === 'function',
        heapUsedBytes: process.memoryUsage().heapUsed,
        rssBytes: process.memoryUsage().rss,
        cachedRooms: report.cachedRooms,
        totalActors: report.totalActors,
        fixedPopulation:
          report.cachedRooms === baseline.cachedRooms &&
          report.totalActors === baseline.totalActors,
      };
      logger.log({ level: 'info', event: 'soak.sample', fields: sample });
      console.info(JSON.stringify(sample));
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
} finally {
  process.off('SIGINT', stop);
  process.off('SIGTERM', stop);
  for (const client of clients) client.disconnect();
  await server.close();
  await logger.close();
}
