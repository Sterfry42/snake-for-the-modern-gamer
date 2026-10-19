import { performance } from 'node:perf_hooks';
import { SnakeGame } from '../src/game/snakeGame.js';
import { defaultGameConfig } from '../src/config/gameConfig.js';
import { QuestRegistry } from '../src/quests/questRegistry.js';
import { createBaseActor } from '../src/actors/actorFactory.js';
import { AuthoritativeGameSession } from '../src/session/AuthoritativeGameSession.js';
import { WebSocketGameConnection } from '../src/session/WebSocketGameConnection.js';
import { SnapshotDeltaEncoder } from '../src/session/SnapshotDelta.js';
import { createGameServer } from '../src/server/createGameServer.js';

// Run with: npx tsx scripts/benchmark-server-performance.ts [historical rooms] [distant actors]
const rooms = Math.max(1, Math.min(5000, Number(process.argv[2] ?? 160)));
const actors = Math.max(0, Math.min(10000, Number(process.argv[3] ?? 1000)));
if (!Number.isFinite(rooms) || !Number.isFinite(actors))
  throw new Error('Expected numeric room/actor counts');
const game = new SnakeGame(
  { ...defaultGameConfig, rng: { seed: 'server-performance-benchmark' } },
  new QuestRegistry(),
);
game.reset();
game.bosses.clearAll();
const session = new AuthoritativeGameSession({ game, manageBasicFeatures: true });
for (let index = 0; index < rooms; index++) game.getRoom(`${20 + index},20,0`);
for (let index = 0; index < actors; index++) {
  const actor = createBaseActor({
    id: `benchmark-${index}`,
    displayName: 'Commuter',
    kind: 'civilian',
    role: 'resident',
    species: 'human',
    thickness: 'thin',
    currentRoomId: '100,100,0',
  });
  actor.goal = { kind: 'work', priority: 10, roomId: '110,100,0', targetPosition: { x: 4, y: 4 } };
  actor.presence = { roomId: '100,100,0', position: { x: 10, y: 10 }, materialized: false };
  game.getActorSystem().registry.upsert(actor);
}
const legacyBytes = Buffer.byteLength(
  JSON.stringify({ ...game.getSnapshot(), clientState: game.getSceneClientState() }),
);
const server = createGameServer(session);
const port = await server.listen(0);
const connection = new WebSocketGameConnection(`ws://127.0.0.1:${port}/game`, 'Benchmark');
try {
  await connection.ready;
  const playerId = connection.playerId!;
  await connection.send({ type: 'playerInteraction', playerId, mode: 'paused' });
  const initial = await session.getConnectionSnapshot(playerId);
  const encoder = new SnapshotDeltaEncoder();
  encoder.encode(initial);
  const initialBytes = Buffer.byteLength(JSON.stringify(initial));
  const startedAt = performance.now();
  for (let frame = 0; frame < 100; frame++) await session.advance(20);
  const simulationDurationMs = performance.now() - startedAt;
  const hot = encoder.encode(await session.getConnectionSnapshot(playerId));
  const hotBytes = Buffer.byteLength(JSON.stringify(hot));
  await connection.send({ type: 'playerInteraction', playerId, mode: 'paused' });
  console.info(
    JSON.stringify(
      {
        historicalRooms: rooms,
        distantActors: actors,
        legacyFullSnapshotBytes: legacyBytes,
        initialSnapshotBytes: initialBytes,
        hotSnapshotBytes: hotBytes,
        hotReductionPercent: Number((100 * (1 - hotBytes / legacyBytes)).toFixed(2)),
        initialRoomCount: initial.clientState!.worldRooms.length,
        revisedRoomsInHotSnapshot: hot.clientState.worldRooms?.length ?? 0,
        simulationFrames: 100,
        simulationDurationMs: Number(simulationDurationMs.toFixed(2)),
        telemetry: server.getPerformance(),
      },
      null,
      2,
    ),
  );
} finally {
  connection.disconnect();
  await server.close();
}
