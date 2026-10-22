import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Duplex } from 'node:stream';
import { WebSocket } from 'ws';
import { SnakeGame } from '../../game/snakeGame.js';
import { defaultGameConfig } from '../../config/gameConfig.js';
import { QuestRegistry } from '../../quests/questRegistry.js';
import { AuthoritativeGameSession } from '../AuthoritativeGameSession.js';
import { ClientMovementPredictor } from '../ClientMovementPredictor.js';
import { isMovementReplay, parseMovementHello, type MovementReplay } from '../MovementResume.js';
import { createGameServer } from '../../server/createGameServer.js';
import { WebSocketGameConnection } from '../WebSocketGameConnection.js';
import { SceneReadReplica } from '../SceneReadReplica.js';
import type { GameEvent } from '../GameEvent.js';

const cleanup: Array<() => void | Promise<void>> = [];
afterEach(async () => {
  for (const close of cleanup.splice(0).reverse()) await close();
  vi.restoreAllMocks();
});
function setup() {
  const registry = new QuestRegistry();
  const game = new SnakeGame(
    { ...defaultGameConfig, rng: { seed: 'movement-reconnect' } },
    registry,
  );
  game.reset();
  game.bosses.clearAll();
  const room = game.getCurrentRoom();
  room.layout = room.layout.map((row) => '.'.repeat(row.length));
  room.portals = [];
  const session = new AuthoritativeGameSession({ game, manageBasicFeatures: true });
  session.configureHosting();
  const id = session.registerConnection('original', 'Alice', {
    playerId: game.getLocalPlayerId(),
    admin: false,
  });
  game.placeSnakeBodyAtLocal(room.id, { x: 10, y: 10 }, { x: 1, y: 0 });
  const snapshot = session.getSnapshot(id);
  const interval = snapshot.players[id].movementIntervalMs!;
  return { game, room, session, registry, id, snapshot, interval };
}
function replay(baseRevision: number, steps: number, elapsedMs: number): MovementReplay {
  return { connectionId: 'original', baseRevision, steps, elapsedMs, inputs: [] };
}

describe('short movement reconnects', () => {
  it.each([
    [false, 1013],
    [true, 1008],
  ] as const)(
    'distinguishes a delayed hello from malformed input (malformed: %s)',
    async (malformed, code) => {
      const { session } = setup();
      const server = createGameServer(session);
      const port = await server.listen(0);
      cleanup.push(() => server.close());
      const socket = new WebSocket(`ws://127.0.0.1:${port}/game?prediction=1`);
      cleanup.push(() => socket.terminate());
      const closed = new Promise<number>((resolve) => socket.once('close', resolve));
      if (malformed)
        socket.once('open', () =>
          socket.send(JSON.stringify({ type: 'movementResume', replay: { x: 99, y: 99 } })),
        );
      expect(await closed).toBe(code);
      expect(Object.keys(session.getSnapshot().connections!)).toEqual(['original']);
    },
  );
  it('keeps world clocks running when its only player is suspended, without moving their snake', async () => {
    const { session, id, snapshot } = setup();
    await session.suspendConnection('original');
    await session.advance(100);
    const current = session.getSnapshot(id);
    expect(current.tick).toBe(snapshot.tick + 100);
    expect(current.players[id].body).toEqual(snapshot.players[id].body);
    expect(current.players[id].movementRevision).toBe(snapshot.players[id].movementRevision);
  });
  it('suspends movement without clearing player holds or announcing a departure; peers continue', async () => {
    const { game, session, id, interval } = setup();
    const bob = session.registerConnection('bob', 'Bob');
    game.runForPlayer(bob, () =>
      game.placeSnakeBodyAtLocal('0,0,0', { x: 10, y: 15 }, { x: 1, y: 0 }),
    );
    await session.executeCommand({ type: 'playerInteraction', playerId: id, mode: 'paused' });
    await session.advance(40);
    const before = session.getSnapshot(id);
    const events: GameEvent[] = [];
    session.onEvent((event) => events.push(event));
    await session.suspendConnection('original');
    await session.advance(interval);
    const suspended = session.getSnapshot(id);
    expect(suspended.connections?.original.suspended).toBe(true);
    expect(suspended.players[id].body).toEqual(before.players[id].body);
    expect(suspended.players[bob].body).not.toEqual(before.players[bob].body);
    expect(
      await session.executeCommand({
        type: 'setDirection',
        playerId: id,
        direction: { x: 0, y: 1 },
      }),
    ).toMatchObject({ ok: false });
    await session.attachConnection('replacement', 'Alice', { playerId: id, admin: false });
    expect(session.getSnapshot(id).ui.playerInteraction).toBe('paused');
    expect(events.filter((event) => event.type === 'party.presence')).toEqual([]);
  });

  it('predicts rapid queued turns without mutating authority or the read replica, then replays identically', async () => {
    const { session, id, snapshot, interval, registry } = setup();
    let now = 10000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    const replica = new SceneReadReplica(defaultGameConfig, registry, snapshot);
    const body = replica.game.getSnakeBody();
    const predictor = new ClientMovementPredictor();
    predictor.seedFrom(snapshot, 0);
    predictor.begin('original', 0);
    predictor.direction({ x: 0, y: 1 }, 0);
    predictor.direction({ x: -1, y: 0 }, 1);
    predictor.direction({ x: 0, y: -1 }, 2); // reversal of queued down is rejected
    await session.suspendConnection('original');
    now += interval * 2;
    predictor.advance(interval * 2);
    const predicted = predictor.presentation(snapshot.players[id], interval * 2)!;
    expect(predicted.body[0]).toEqual({ x: 9, y: 11 });
    expect(replica.game.getSnakeBody()).toEqual(body);
    expect(session.getSnapshot(id).players[id].body).toEqual(snapshot.players[id].body);
    await session.attachConnection(
      'replacement',
      'Alice',
      { playerId: id, admin: false },
      predictor.replay(interval * 2),
    );
    const authoritative = session.getSnapshot(id);
    expect(authoritative.players[id].body).toEqual(predicted.body);
    expect(authoritative.players[id].movementRevision).toBe(
      snapshot.players[id].movementRevision! + 2,
    );
    predictor.seedFrom(authoritative, interval * 2);
    expect(predictor.presentation(authoritative.players[id], interval * 2)).toBeNull();
  });

  it('uses the authoritative accumulator and retains the remaining movement phase on resume', async () => {
    const { session, id, interval } = setup();
    await session.advance(40);
    const snapshot = session.getSnapshot(id);
    const accumulator = snapshot.players[id].movementAccumulatorMs!;
    expect(accumulator).toBe(40);
    const predictor = new ClientMovementPredictor();
    predictor.seedFrom(snapshot, 0);
    predictor.begin('original', 0);
    predictor.advance(interval - accumulator - 1);
    expect(predictor.replay(interval - accumulator - 1)?.steps).toBe(0);
    const other = new ClientMovementPredictor();
    other.seedFrom(snapshot, 0);
    other.begin('original', 0);
    expect(other.replay(interval - accumulator)?.steps).toBe(1);
    let now = 10000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    await session.suspendConnection('original');
    now += interval;
    await session.attachConnection(
      'replacement',
      'Alice',
      { playerId: id, admin: false },
      replay(snapshot.players[id].movementRevision!, 1, interval),
    );
    expect(session.getSnapshot(id).players[id].movementAccumulatorMs).toBe(accumulator);
  });

  it.each(['revision', 'attempt', 'too-fast', 'expired'] as const)(
    'rejects %s catch-up while allowing normal character resume',
    async (reason) => {
      const { session, id, snapshot, interval } = setup();
      let now = 10000;
      vi.spyOn(Date, 'now').mockImplementation(() => now);
      await session.suspendConnection('original');
      now += reason === 'expired' ? 3001 : interval;
      const request = replay(snapshot.players[id].movementRevision!, 1, interval);
      if (reason === 'revision') request.baseRevision++;
      if (reason === 'attempt') request.connectionId = 'another-suspension';
      if (reason === 'too-fast') request.steps = 30;
      await session.attachConnection(
        'replacement',
        'Alice',
        { playerId: id, admin: false },
        request,
      );
      expect(session.getSnapshot(id).players[id].body).toEqual(snapshot.players[id].body);
      expect(session.getSnapshot(id).players[id].alive).toBe(true);
    },
  );

  it('lets real authoritative wall safety holds stop replay and override speculative movement', async () => {
    const { session, game, room, id, snapshot, interval } = setup();
    let now = 10000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    const predictor = new ClientMovementPredictor();
    predictor.seedFrom(snapshot, 0);
    predictor.begin('original', 0);
    await session.suspendConnection('original');
    const head = snapshot.players[id].body[0];
    room.layout[head.y] =
      room.layout[head.y].slice(0, head.x + 1) + '#' + room.layout[head.y].slice(head.x + 2);
    game.enableTeleport(false);
    now += interval * 3;
    const request = predictor.replay(interval * 3);
    expect(request?.steps).toBe(3);
    await session.attachConnection('replacement', 'Alice', { playerId: id, admin: false }, request);
    const authoritative = session.getSnapshot(id);
    expect(authoritative.players[id].body).toEqual(snapshot.players[id].body);
    expect(authoritative.players[id].alive).toBe(true);
    expect(authoritative.players[id].movementRevision).toBe(1);
    predictor.seedFrom(authoritative, interval * 3);
    expect(predictor.presentation(authoritative.players[id], interval * 3)).toBeNull();
  });

  it('caps prediction and stops at cached walls/unknown geometry without inventing health or pickups', () => {
    const { id, snapshot } = setup();
    snapshot.players[id].movementIntervalMs = 20;
    const predictor = new ClientMovementPredictor();
    predictor.seedFrom(snapshot, 0);
    predictor.begin('original', 0);
    const before = structuredClone(snapshot);
    predictor.advance(10000);
    const request = predictor.replay(10000)!;
    expect(request.steps).toBeLessThanOrEqual(30);
    expect(request.elapsedMs).toBe(3000);
    expect(predictor.exhausted).toBe(true);
    expect(predictor.direction({ x: 0, y: -1 }, 10001)).toBe(false);
    expect(snapshot).toEqual(before);
    const blocked = structuredClone(snapshot);
    const head = blocked.players[id].body[0];
    const room = blocked.viewport.rooms[blocked.players[id].roomId].room;
    room.layout[head.y] =
      room.layout[head.y].slice(0, head.x + 1) + '#' + room.layout[head.y].slice(head.x + 2);
    const wall = new ClientMovementPredictor();
    wall.seedFrom(blocked, 0);
    wall.begin('original', 0);
    expect(wall.replay(100)?.steps).toBe(0);
    expect(wall.presentation(blocked.players[id], 100)?.body).toEqual(blocked.players[id].body);
  });

  it('enforces the 30-step cap even with clear cached geometry, and never predicts manual holds', () => {
    const { id, snapshot } = setup();
    snapshot.players[id].body = [{ x: 10, y: 10 }];
    snapshot.players[id].movementIntervalMs = 20;
    const predictor = new ClientMovementPredictor();
    predictor.seedFrom(snapshot, 0);
    predictor.begin('original', 0);
    const turns = [
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
      { x: 0, y: -1 },
    ];
    for (let step = 0; step < 32; step++) {
      if (step % 4 === 0)
        predictor.direction(turns[Math.floor(step / 4) % turns.length], step * 20);
      predictor.advance((step + 1) * 20);
    }
    expect(predictor.replay(640)?.steps).toBe(30);
    expect(predictor.exhausted).toBe(true);
    snapshot.players[id].movementPredictionAllowed = false;
    const manual = new ClientMovementPredictor();
    manual.seedFrom(snapshot, 0);
    manual.begin('original', 0);
    expect(manual.replay(1000)).toBeUndefined();
    expect(manual.presentation(snapshot.players[id], 1000)).toBeNull();
  });

  it('replays against another player at their current position and immediately respects authoritative death', async () => {
    const { game, session, id, snapshot, interval } = setup();
    const bob = session.registerConnection('bob', 'Bob');
    game.runForPlayer(bob, () =>
      game.placeSnakeBodyAtLocal('0,0,0', { x: 11, y: 10 }, { x: 0, y: 1 }),
    );
    const predictor = new ClientMovementPredictor();
    predictor.seedFrom(snapshot, 0);
    predictor.begin('original', 0);
    let now = 10000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    await session.suspendConnection('original');
    now += interval * 3;
    await session.attachConnection(
      'replacement',
      'Alice',
      { playerId: id, admin: false },
      predictor.replay(interval * 3),
    );
    const authoritative = session.getSnapshot(id);
    expect(authoritative.players[id].alive).toBe(false);
    expect(authoritative.players[id].movementRevision).toBe(1);
    predictor.seedFrom(authoritative, interval * 3);
    expect(predictor.presentation(authoritative.players[id], interval * 3)).toBeNull();
  });

  it('takes small and large corrections immediately without ever displaying fractional grid cells', () => {
    const { id, snapshot, interval } = setup();
    const predictor = new ClientMovementPredictor();
    predictor.seedFrom(snapshot, 0);
    predictor.begin('original', 0);
    predictor.advance(interval);
    expect(predictor.presentation(snapshot.players[id], interval)!.body[0].x).toBe(11);
    predictor.seedFrom(snapshot, interval);
    expect(predictor.presentation(snapshot.players[id], interval)).toBeNull();
    expect(predictor.presentation(snapshot.players[id], interval + 60)).toBeNull();
    expect(predictor.presentation(snapshot.players[id], interval + 120)).toBeNull();
    predictor.begin('replacement', 1000);
    predictor.advance(1000 + interval * 3);
    predictor.seedFrom(snapshot, 1000 + interval * 3);
    expect(predictor.presentation(snapshot.players[id], 1000 + interval * 3)).toBeNull();
  });

  it('validates bounded ordered cardinal inputs and rejects claimed positions', () => {
    expect(parseMovementHello(JSON.stringify({ type: 'movementResume' }))).toEqual({});
    expect(isMovementReplay(replay(0, 30, 3000))).toBe(true);
    expect(isMovementReplay({ ...replay(0, 31, 3000) })).toBe(false);
    expect(
      isMovementReplay({ ...replay(0, 1, 200), inputs: [{ step: 0, direction: { x: 1, y: 1 } }] }),
    ).toBe(false);
    expect(
      isMovementReplay({
        ...replay(0, 1, 200),
        inputs: [
          { step: 1, direction: { x: 0, y: 1 } },
          { step: 0, direction: { x: -1, y: 0 } },
        ],
      }),
    ).toBe(false);
    expect(
      parseMovementHello(JSON.stringify({ type: 'movementResume', replay: { x: 10, y: 20 } })),
    ).toBeNull();
  });

  it('resumes the real transport with movement-only inputs and expires lost sockets after grace', async () => {
    const { session, game, interval } = setup();
    await session.detachConnection('original');
    const server = createGameServer(session);
    const wires: Duplex[] = [];
    server.http.on('upgrade', (_request, socket) => wires.push(socket));
    const port = await server.listen(0);
    cleanup.push(() => server.close());
    const client = new WebSocketGameConnection(`ws://127.0.0.1:${port}/game`, 'Alice');
    cleanup.push(() => client.disconnect());
    await client.ready;
    const id = client.playerId!;
    const original = client.connectionId!;
    const start = session.getSnapshot(id).players[id].body[0];
    const notices: GameEvent[] = [];
    session.onEvent((event) => notices.push(event));
    wires[0].destroy();
    await vi.waitFor(() =>
      expect(session.getSnapshot(id).connections?.[original].suspended).toBe(true),
    );
    expect(
      await client.send({ type: 'setDirection', playerId: id, direction: { x: 0, y: 1 } }),
    ).toEqual({ ok: true });
    expect(
      await client.send({ type: 'useItem', playerId: id, itemId: 'healing-potion' }),
    ).toMatchObject({ ok: false });
    await new Promise((resolve) => setTimeout(resolve, Math.min(interval + 10, 400)));
    expect(client.getMovementPresentation()?.body[0].y).toBeGreaterThan(start.y);
    expect(game.getPlayer(id)?.snake.bodySegments[0]).toEqual(start);
    await vi.waitFor(() => expect(client.connectionId).not.toBe(original));
    expect(session.getSnapshot(id).players[id].body[0].y).toBeGreaterThan(start.y);
    expect(notices.filter((event) => event.type === 'party.presence')).toEqual([]);
    const replacement = client.connectionId!;
    // Prevent the client's automatic retry while leaving this socket as an abrupt loss.
    wires[1].destroy();
    await vi.waitFor(() =>
      expect(session.getSnapshot(id).connections?.[replacement].suspended).toBe(true),
    );
    client.disconnect();
    await vi.waitFor(
      () => expect(session.getSnapshot(id).connections?.[replacement]).toBeUndefined(),
      { timeout: 4000 },
    );
    expect(notices).toContainEqual({ type: 'party.presence', name: 'Alice', status: 'left' });
  });
});
