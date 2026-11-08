import { WebSocket } from 'ws';
import { SnakeGame } from '../src/game/snakeGame.js';
import { defaultGameConfig } from '../src/config/gameConfig.js';
import { QuestRegistry } from '../src/quests/questRegistry.js';
import { AuthoritativeGameSession } from '../src/session/AuthoritativeGameSession.js';
import { createGameServer } from '../src/server/createGameServer.js';
import { SnapshotDeltaAssembler } from '../src/session/SnapshotDelta.js';
import { parseServerMessage } from '../src/session/gameProtocol.js';
import type { GameSnapshot } from '../src/session/GameSnapshot.js';

// Identical real-socket workload before/after: two snakes, four speeds, 20 ms frames.
const results = [];
for (const interval of [50, 70, 100, 200]) {
  const game = new SnakeGame(
    { ...defaultGameConfig, rng: { seed: 'movement-benchmark' } },
    new QuestRegistry(),
  );
  game.reset();
  game.bosses.clearAll();
  const room = game.getCurrentRoom();
  room.layout = room.layout.map((row) => '.'.repeat(row.length));
  room.portals = [];
  const session = new AuthoritativeGameSession({ game, manageBasicFeatures: true });
  const server = createGameServer(session);
  const port = await server.listen(0);
  let bytes = 0,
    worlds = 0,
    movements = 0,
    requestId = 0;
  const ages: number[] = [],
    acks: number[] = [];
  const revisions = new Map<string, number>();
  const delivered = new Set<string>();
  const sockets: WebSocket[] = [];
  const clients = [];
  try {
    for (const name of ['Alice', 'Bob']) {
      const socket = new WebSocket(`ws://127.0.0.1:${port}/game?name=${name}`);
      sockets.push(socket);
      const assembler = new SnapshotDeltaAssembler();
      let state: GameSnapshot;
      const pending = new Map<number, { at: number; resolve: () => void }>();
      const ready = new Promise<void>((resolve) =>
        socket.on('message', (data) => {
          const raw = data.toString();
          bytes += Buffer.byteLength(raw);
          const wire = parseServerMessage(raw);
          if (wire.type === 'welcome') {
            state = wire.snapshot;
            assembler.reset(state);
            resolve();
          } else if (wire.type === 'delta') {
            state = assembler.apply(wire.delta);
            worlds++;
          } else if (wire.type === 'result') {
            const entry = pending.get(wire.id);
            if (entry) {
              acks.push(performance.now() - entry.at);
              entry.resolve();
              pending.delete(wire.id);
            }
          }
          // Inspect the packet structurally so this runner also works on the old protocol.
          const value: {
            type: string;
            update?: { player: { id: string; movementRevision: number } };
          } = JSON.parse(raw);
          if (value.type === 'movement' && value.update) {
            movements++;
            const player = value.update.player;
            const at = revisions.get(`${player.id}:${player.movementRevision}`);
            if (at !== undefined && !delivered.has(`${player.id}:${player.movementRevision}`)) {
              ages.push(performance.now() - at);
              delivered.add(`${player.id}:${player.movementRevision}`);
            }
          } else if (wire.type === 'delta') {
            for (const player of Object.values(state.players)) {
              const at = revisions.get(`${player.id}:${player.movementRevision}`);
              if (at !== undefined && !delivered.has(`${player.id}:${player.movementRevision}`)) {
                ages.push(performance.now() - at);
                delivered.add(`${player.id}:${player.movementRevision}`);
              }
            }
          }
        }),
      );
      await ready;
      const id = state!.localPlayerId;
      clients.push({
        id,
        send: (direction: { x: number; y: number }) =>
          new Promise<void>((resolve) => {
            const request = ++requestId;
            pending.set(request, { at: performance.now(), resolve });
            socket.send(
              JSON.stringify({
                type: 'command',
                id: request,
                command: { type: 'setDirection', playerId: id, inputSequence: request, direction },
              }),
            );
          }),
      });
      game.runForPlayer(id, () => {
        game.placeSnakeBodyAtLocal(room.id, { x: 5, y: name === 'Alice' ? 5 : 15 }, { x: 1, y: 0 });
        game.setFlag('class.mods', {
          derivedModifiers: [
            { stat: 'actionStepIntervalScalar', operation: 'multiply', value: interval / 100 },
          ],
        });
      });
    }
    bytes = worlds = movements = 0;
    acks.length = 0;
    const started = performance.now();
    for (let frame = 0; frame < 100; frame++) {
      if (frame % 15 === 0)
        await Promise.all(
          clients.map((client) => client.send(game.getPlayer(client.id)!.snake.directionVector)),
        );
      for (const client of clients) {
        const snake = game.getPlayer(client.id)!.snake;
        if (snake.head.x >= 25 && snake.directionVector.x === 1) await client.send({ x: 0, y: -1 });
        if (snake.head.y <= 2 && snake.directionVector.y === -1) await client.send({ x: -1, y: 0 });
        if (snake.head.x <= 3 && snake.directionVector.x === -1) await client.send({ x: 0, y: 1 });
      }
      await session.advance(20);
      for (const client of clients) {
        const player = session
          .getPerformanceReport()
          .players.find((player) => player.playerId === client.id);
        if (player) {
          const key = `${client.id}:${player.movementRevision}`;
          if (!revisions.has(key)) revisions.set(key, performance.now());
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    const mean = (values: number[]) =>
      Math.round((values.reduce((a, b) => a + b, 0) / Math.max(1, values.length)) * 100) / 100;
    results.push({
      intervalMs: interval,
      durationMs: Math.round(performance.now() - started),
      bytes,
      worldPackets: worlds,
      movementPackets: movements,
      meanMovementDeliveryMs: mean(ages),
      meanCommandAckMs: mean(acks),
      maxCommandAckMs: Math.round(Math.max(0, ...acks)),
      snapshotBuildMs: server.getPerformance().snapshotBuildMs,
    });
  } finally {
    for (const socket of sockets) socket.terminate();
    await server.close();
  }
}
console.info(JSON.stringify(results, null, 2));
