import { WebSocket } from 'ws';
import type { Duplex } from 'node:stream';
import { SnakeGame } from '../src/game/snakeGame.js';
import { defaultGameConfig } from '../src/config/gameConfig.js';
import { QuestRegistry } from '../src/quests/questRegistry.js';
import { AuthoritativeGameSession } from '../src/session/AuthoritativeGameSession.js';
import { createGameServer } from '../src/server/createGameServer.js';
import { parseServerMessage } from '../src/session/gameProtocol.js';
import type { ClientCommand, CommandResult } from '../src/session/ClientCommand.js';
import type { Vector2Like } from '../src/core/math.js';
import { setTimeout as wait } from 'node:timers/promises';

const durationMs = Number(process.argv[2] ?? 300000);
if (!Number.isSafeInteger(durationMs) || durationMs < 12000)
  throw new Error('Expected a duration of at least 12000 ms');
const config = {
  ...defaultGameConfig,
  rng: { seed: 'two-active-player-soak' },
  features: { enabled: defaultGameConfig.features.enabled.filter((id) => id !== 'hungerTimer') },
  apples: {
    ...defaultGameConfig.apples,
    types: defaultGameConfig.apples.types.filter((type) => type.id === 'normal'),
  },
};
const game = new SnakeGame(config, new QuestRegistry());
game.reset();
game.bosses.clearAll();
const { cols, rows } = config.grid;
for (const id of ['0,0,0', '1,0,0', '2,0,0']) {
  const room = game.getRoom(id);
  room.layout = Array.from({ length: rows }, () => '.'.repeat(cols));
  room.portals = [];
  room.village = room.town = room.bulletTrainStation = room.questGiver = undefined;
}
const session = new AuthoritativeGameSession({ game, manageBasicFeatures: true });
const log: string[] = [];
const server = createGameServer(session, { onDiagnostic: ({ event }) => log.push(event) });
const wires: Duplex[] = [];
server.http.on('upgrade', (_request, socket) => wires.push(socket));
const port = await server.listen(0);
const sockets: WebSocket[] = [];
async function join(name: string, token?: string) {
  const url = new URL(`ws://127.0.0.1:${port}/game`);
  url.searchParams.set('name', name);
  if (token) url.searchParams.set('resume', token);
  const socket = new WebSocket(url);
  sockets.push(socket);
  let nextId = 0;
  const pending = new Map<number, (result: CommandResult) => void>();
  const welcome = await new Promise<
    Extract<ReturnType<typeof parseServerMessage>, { type: 'welcome' }>
  >((resolve, reject) => {
    socket.on('error', reject);
    socket.once('close', () => reject(new Error('Closed before welcome')));
    socket.on('message', (raw) => {
      const message = parseServerMessage(raw.toString());
      if (message.type === 'welcome') resolve(message);
      if (message.type === 'result') {
        pending.get(message.id)?.(message.result);
        pending.delete(message.id);
      }
    });
  });
  const id = welcome.playerId;
  const turn = (direction: Vector2Like) =>
    new Promise<CommandResult>((resolve, reject) => {
      const request = ++nextId;
      pending.set(request, resolve);
      const command: ClientCommand = {
        type: 'setDirection',
        playerId: id,
        direction,
        inputSequence: request,
      };
      socket.send(JSON.stringify({ type: 'command', id: request, command }), (error) => {
        if (error) reject(error);
      });
    });
  return { id, token: welcome.resumeToken, turn };
}

const revision = (id: string) => session.getPlayerMovementDiagnostic(id)?.movementRevision ?? 0;
const visited = new Map<string, Set<string>>();
let interruptionSteps = 0;
let recovered = false;
let recovery: Promise<void> | undefined;
try {
  let alice = await join('Alice');
  const bob = await join('Bob');
  const players = [alice.id, bob.id];
  for (const [index, id] of players.entries()) {
    game.runForPlayer(id, () => {
      game.placeSnakeBodyAtLocal('0,0,0', { x: 5, y: 5 + index * 10 }, { x: 1, y: 0 });
      game.setFlag('cheat.immortal', true);
    });
    visited.set(id, new Set());
  }
  const started = performance.now();
  for (let frame = 0; performance.now() - started < durationMs; frame++) {
    if (!recovery && performance.now() - started >= durationMs / 2) {
      const before = revision(bob.id);
      const old = alice;
      const frozen = revision(alice.id);
      wires[0].destroy();
      recovery = (async () => {
        await wait(6000);
        interruptionSteps = revision(bob.id) - before;
        alice = await join('Alice', old.token);
        recovered = alice.id === old.id && revision(alice.id) === frozen;
      })();
    }
    for (const [index, player] of [alice, bob].entries()) {
      if (index === 0 && recovery && !recovered) continue;
      const runtime = game.getPlayer(player.id);
      if (!runtime?.alive)
        throw new Error(
          `Player ${index + 1} died at frame ${frame}: ${String(runtime?.snake.flags['recent.deathReason'] ?? 'unknown')}`,
        );
      const { head, directionVector: dir, currentRoomId } = runtime.snake;
      visited.get(player.id)?.add(currentRoomId);
      const top = 5 + index * 10;
      const bottom = top + 4;
      const next =
        dir.x === 1 && head.x >= cols * 3 - 5
          ? { x: 0, y: 1 }
          : dir.y === 1 && head.y >= bottom
            ? { x: -1, y: 0 }
            : dir.x === -1 && head.x <= 4
              ? { x: 0, y: -1 }
              : dir.y === -1 && head.y <= top
                ? { x: 1, y: 0 }
                : undefined;
      if (next && !(await player.turn(next)).ok) throw new Error('Soak turn rejected');
    }
    await session.advance(20);
    await wait(20);
  }
  await recovery;
  const movement = players.map((id) => ({
    revisions: revision(id),
    rooms: [...visited.get(id)!],
    apples: Number(game.getPlayer(id)?.snake.flags.applesEaten ?? 0),
  }));
  console.info(
    JSON.stringify(
      {
        durationMs,
        movement,
        recovered,
        interruptionSteps,
        failureEvents: log.filter(
          (event) => event === 'socket.send-failed' || event === 'command.failed',
        ),
        maximumUpdateMs: server.getPerformance().maximumUpdateMs,
      },
      null,
      2,
    ),
  );
  if (
    !recovered ||
    interruptionSteps <= 0 ||
    movement.some(({ rooms, revisions }) => rooms.length < 2 || revisions === 0)
  )
    throw new Error('Soak did not exercise independent movement and recovery');
} finally {
  for (const socket of sockets) socket.terminate();
  await server.close();
}
