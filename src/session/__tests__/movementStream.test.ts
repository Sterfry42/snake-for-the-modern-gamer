import { afterEach, describe, expect, it, vi } from 'vitest';
import { defaultGameConfig } from '../../config/gameConfig.js';
import { SnakeGame } from '../../game/snakeGame.js';
import { QuestRegistry } from '../../quests/questRegistry.js';
import { AuthoritativeGameSession } from '../AuthoritativeGameSession.js';
import { createGameServer } from '../../server/createGameServer.js';
import { WebSocketGameConnection } from '../WebSocketGameConnection.js';
import { ClientMovementPredictor } from '../ClientMovementPredictor.js';
import { SnapshotDeltaAssembler, SnapshotDeltaEncoder } from '../SnapshotDelta.js';
import type { MovementUpdate } from '../MovementUpdate.js';
import { isMovementUpdate } from '../MovementUpdate.js';
import { SceneGameClient } from '../SceneGameClient.js';
import { parseCommandMessage } from '../gameProtocol.js';
import { SceneReadReplica } from '../SceneReadReplica.js';
import { ActorRegistry } from '../../actors/actorRegistry.js';

const cleanup: Array<() => void | Promise<void>> = [];
afterEach(async () => {
  for (const close of cleanup.splice(0).reverse()) await close();
  vi.restoreAllMocks();
  vi.useRealTimers();
});
function setup(interval = 100) {
  const game = new SnakeGame(
    { ...defaultGameConfig, rng: { seed: 'discrete-movement' } },
    new QuestRegistry(),
  );
  game.reset();
  game.bosses.clearAll();
  const room = game.getCurrentRoom();
  room.layout = room.layout.map((row) => '.'.repeat(row.length));
  room.portals = [];
  game.placeSnakeBodyAtLocal(room.id, { x: 10, y: 10 }, { x: 1, y: 0 });
  game.setFlag('class.mods', {
    derivedModifiers: [
      { stat: 'actionStepIntervalScalar', operation: 'multiply', value: interval / 100 },
    ],
  });
  const session = new AuthoritativeGameSession({ game, manageBasicFeatures: true });
  return { game, session };
}

describe('discrete movement stream', () => {
  it('keeps room selectors coherent until a fast transition receives its authoritative geometry', async () => {
    const { game, session } = setup();
    const server = createGameServer(session);
    const port = await server.listen(0);
    cleanup.push(() => server.close());
    const client = new WebSocketGameConnection(`ws://127.0.0.1:${port}/game`);
    cleanup.push(() => client.disconnect());
    await client.ready;
    const mirror = new SceneGameClient(client);
    cleanup.push(() => mirror.destroy());
    const id = client.playerId!;
    const moved = new Promise<void>((resolve) =>
      client.onMovement!((update) => {
        if (update.player.id !== id || update.player.roomId !== '9,9,0') return;
        expect(mirror.getCurrentRoom().id).toBe('0,0,0');
        resolve();
      }),
    );
    game.runForPlayer(id, () =>
      game.placeSnakeBodyAtLocal('9,9,0', { x: 10, y: 10 }, { x: 1, y: 0 }),
    );
    session.refreshSnapshot();
    await moved;
    await vi.waitFor(() => expect(mirror.getCurrentRoom().id).toBe('9,9,0'));
  });
  it('caps a bounded connected prediction lead to server elapsed time instead of discarding the valid reconnect prefix', async () => {
    const { game, session } = setup();
    session.configureHosting();
    const id = session.registerConnection('alice', 'Alice');
    session.recordPublishedMovement('alice', session.getSnapshot(id));
    let now = Date.now();
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    await session.suspendConnection('alice');
    now += 500;
    await session.attachConnection(
      'again',
      'Alice',
      { playerId: id, admin: false },
      {
        connectionId: 'alice',
        baseRevision: 0,
        steps: 7,
        elapsedMs: 500,
        inputs: [{ step: 0, direction: { x: 0, y: 1 } }],
      },
    );
    expect(session.getSnapshot(id).players[id].movementRevision).toBe(5);
    expect(game.getPlayer(id)!.snake.head).toEqual({ x: 10, y: 15 });
  });
  it.each([50, 70, 100, 200])(
    'publishes every %i ms step and promptly acknowledges turns with the world publication timer stopped',
    async (interval) => {
      vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
      const { game, session } = setup(interval);
      const server = createGameServer(session);
      const port = await server.listen(0);
      cleanup.push(() => server.close());
      const client = new WebSocketGameConnection(`ws://127.0.0.1:${port}/game`);
      cleanup.push(() => client.disconnect());
      await client.ready;
      const mirror = new SceneGameClient(client);
      cleanup.push(() => mirror.destroy());
      const id = client.playerId!;
      const movement: MovementUpdate[] = [];
      let receive: (() => void) | undefined;
      client.onMovement!((update) => {
        movement.push(update);
        receive?.();
      });
      const build = vi.spyOn(game, 'getSceneClientState');
      const snapshot = vi.fn();
      client.onSnapshot(snapshot);
      snapshot.mockClear();
      expect(
        await client.send({
          type: 'setDirection',
          playerId: id,
          inputSequence: 1,
          direction: { x: 0, y: 1 },
        }),
      ).toEqual({ ok: true });
      for (let frame = 0; frame < 10; frame++) await session.advance(20);
      await new Promise<void>((resolve) => {
        const check = () => {
          if (
            movement.some((update) => update.player.movementRevision === Math.floor(200 / interval))
          )
            resolve();
        };
        receive = check;
        check();
      });
      expect(
        movement
          .filter((update) => update.player.movementRevision! > 0)
          .map((update) => update.player.movementRevision),
      ).toEqual(Array.from({ length: Math.floor(200 / interval) }, (_, index) => index + 1));
      expect(movement[movement.length - 1].player.movementIntervalMs).toBe(interval);
      expect(mirror.getSnakeBody()).toEqual(game.getPlayer(id)!.snake.bodySegments);
      expect(build).not.toHaveBeenCalled();
      expect(snapshot).not.toHaveBeenCalled();
      expect(
        movement.every((update) => !('clientState' in update) && !('viewport' in update)),
      ).toBe(true);
    },
  );

  it.each([50, 70, 100, 200])(
    'reconciles rapid buffered turns at %i ms without duplicate steps or fractional cells',
    async (interval) => {
      const { game, session } = setup(interval);
      session.configureHosting();
      const id = session.registerConnection('alice', 'Alice');
      const predictor = new ClientMovementPredictor();
      const initial = session.getSnapshot(id);
      predictor.seedFrom(initial, 0, true);
      predictor.direction({ x: 0, y: 1 }, 5, 1);
      predictor.direction({ x: -1, y: 0 }, 6, 2);
      await session.executeCommand({
        type: 'setDirection',
        playerId: id,
        inputSequence: 1,
        direction: { x: 0, y: 1 },
      });
      await session.executeCommand({
        type: 'setDirection',
        playerId: id,
        inputSequence: 2,
        direction: { x: -1, y: 0 },
      });
      const queue = structuredClone(game.getPlayer(id)!.snake.directionQueue);
      await session.executeCommand({
        type: 'setDirection',
        playerId: id,
        inputSequence: 1,
        direction: { x: 0, y: -1 },
      });
      expect(game.getPlayer(id)!.snake.directionQueue).toEqual(queue);
      const due = Math.ceil((interval * 2) / 20) * 20;
      for (let now = 20; now <= due; now += 20) {
        await session.advance(20);
        const authoritative = session.getSnapshot(id);
        predictor.seedFrom(authoritative, now + 3, true);
        for (const offset of [0, 1, 5]) {
          const body = predictor.presentation(authoritative.players[id], now + 3 + offset)?.body;
          expect(
            body?.every((point) => Number.isInteger(point.x) && Number.isInteger(point.y)),
          ).toBe(true);
        }
      }
      expect(game.getPlayer(id)!.snake.head).toEqual({ x: 9, y: 11 });
    },
  );

  it('preserves a newer movement packet through an older world delta, rejects duplicates and old epochs, and periodically resynchronizes', async () => {
    const { session } = setup();
    session.configureHosting();
    const id = session.registerConnection('alice', 'Alice');
    const initial = session.getSnapshot(id),
      assembler = new SnapshotDeltaAssembler(),
      encoder = new SnapshotDeltaEncoder();
    assembler.reset(initial);
    encoder.encode(initial, true);
    const updates: MovementUpdate[] = [];
    session.onMovement((update) => updates.push(update));
    const old = encoder.encode(session.getSnapshot(id), true);
    await session.advance(100);
    const latest = updates[updates.length - 1];
    expect(isMovementUpdate(latest)).toBe(true);
    expect(
      isMovementUpdate({ ...latest, player: { ...latest.player, body: [{ x: 10.5, y: 10 }] } }),
    ).toBe(false);
    expect(
      parseCommandMessage(
        JSON.stringify({
          type: 'command',
          id: 1,
          command: { type: 'movement', ...latest.player, playerId: id },
        }),
      ),
    ).toBeNull();
    expect(assembler.applyMovement(latest)?.players[id].body[0].x).toBe(11);
    expect(assembler.applyMovement(latest)).toBeNull();
    expect(assembler.applyMovement({ ...latest, epoch: -1 })).toBeNull();
    expect(assembler.apply(old).players[id].body[0].x).toBe(11);
    const hot = encoder.encode(session.getSnapshot(id), true);
    expect(hot.movementResync).toBe(false);
    expect(hot.state.players[id]).toHaveProperty('patch');
    expect(JSON.stringify(hot.state.players)).not.toContain('"body"');
    for (let frame = 0; frame < 45; frame++) await session.advance(20);
    const resync = encoder.encode(session.getSnapshot(id), true);
    expect(resync.movementResync).toBe(true);
    expect(JSON.stringify(resync.state.players)).toContain('"body"');
    expect(assembler.apply(resync).players[id].body).toEqual(
      session.getSnapshot(id).players[id].body,
    );
  });

  it('hydrates only authoritative bodies on the movement lane and retains unchanged slow selectors', async () => {
    const { game, session } = setup();
    session.configureHosting();
    const id = session.registerConnection('alice', 'Alice');
    const replica = new SceneReadReplica(
      defaultGameConfig,
      new QuestRegistry(),
      session.getSnapshot(id),
    );
    const load = vi.spyOn(ActorRegistry.prototype, 'loadSaveData');
    const clear = vi.spyOn(game.getInventory(), 'clear');
    session.onMovement((update) => replica.hydrateMovement(update));
    for (let frame = 0; frame < 10; frame++) await session.advance(20);
    expect(replica.game.getSnakeBody()).toEqual(game.getPlayer(id)!.snake.bodySegments);
    expect(load).not.toHaveBeenCalled();
    expect(clear).not.toHaveBeenCalled();
    replica.hydrate(session.getSnapshot(id));
    expect(load).not.toHaveBeenCalled();
    expect(() =>
      replica.game.hydrateClientMovement({
        epoch: 0,
        tick: 0,
        sequence: 1,
        player: { id, body: [], roomId: '0,0,0', direction: { x: 1, y: 0 }, alive: true, score: 0 },
      }),
    ).toThrow('Client replica');
  });

  it('preserves the displayed connected step when a socket is lost and replays inputs against the current world once', async () => {
    const { session, game } = setup(70);
    session.configureHosting();
    const id = session.registerConnection('alice', 'Alice');
    const initial = session.getSnapshot(id);
    session.recordPublishedMovement('alice', initial);
    const predictor = new ClientMovementPredictor();
    predictor.seedFrom(initial, 0, true);
    predictor.direction({ x: 0, y: 1 }, 1, 1);
    const before = structuredClone(predictor.presentation(initial.players[id], 80));
    await session.executeCommand({
      type: 'setDirection',
      playerId: id,
      inputSequence: 1,
      direction: { x: 0, y: 1 },
    });
    await session.advance(80);
    predictor.begin('alice', 80);
    expect(predictor.presentation(initial.players[id], 80)).toEqual(before);
    let now = Date.now();
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    await session.suspendConnection('alice');
    now += 210;
    const replay = predictor.replay(290)!;
    await session.attachConnection('again', 'Alice', { playerId: id, admin: false }, replay);
    expect(game.getPlayer(id)!.snake.head).toEqual(
      predictor.presentation(initial.players[id], 290)!.body[0],
    );
    const revision = session.getSnapshot(id).players[id].movementRevision;
    await session.attachConnection('third', 'Alice', { playerId: id, admin: false }, replay);
    expect(session.getSnapshot(id).players[id].movementRevision).toBe(revision);
  });
});
