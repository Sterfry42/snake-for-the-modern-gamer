import { afterEach, describe, expect, it, vi } from 'vitest';
import { defaultGameConfig } from '../../config/gameConfig.js';
import { SnakeGame } from '../../game/snakeGame.js';
import { QuestRegistry } from '../../quests/questRegistry.js';
import { AuthoritativeGameSession } from '../AuthoritativeGameSession.js';
import { ClientMovementPredictor } from '../ClientMovementPredictor.js';
import { PeerMovementPresentation } from '../PeerMovementPresentation.js';
import { PlayerHoldSynchronizer } from '../PlayerHoldSynchronizer.js';
import { createGameServer } from '../../server/createGameServer.js';
import type { SaveStore } from '../../storage/SaveStore.js';
import type { GameSaveData } from '../../game/saveTypes.js';
import type { SessionDiagnostic } from '../SessionDiagnostic.js';
import { parseCommandMessage } from '../gameProtocol.js';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function setup(saveStore?: SaveStore<GameSaveData>) {
  const game = new SnakeGame(
    { ...defaultGameConfig, rng: { seed: 'movement-reliability' } },
    new QuestRegistry(),
  );
  game.reset();
  game.bosses.clearAll();
  const room = game.getCurrentRoom();
  room.layout = room.layout.map((row) => '.'.repeat(row.length));
  room.portals = [];
  game.placeSnakeBodyAtLocal(room.id, { x: 10, y: 10 }, { x: 1, y: 0 });
  const session = new AuthoritativeGameSession({ game, manageBasicFeatures: true, saveStore });
  session.configureHosting();
  const id = session.registerConnection('alice', 'Alice', {
    playerId: game.getLocalPlayerId(),
    admin: true,
  });
  return { game, session, id };
}

describe('movement reliability', () => {
  it('keeps a connected movement clock through late publications without changing authority', async () => {
    const { session, id } = setup();
    await session.advance(40);
    const initial = session.getSnapshot(id);
    const interval = initial.players[id].movementIntervalMs!;
    const predictor = new ClientMovementPredictor();
    predictor.seedFrom(initial, 1000, true);
    const due = 1000 + interval - 40;
    expect(predictor.presentation(initial.players[id], due - 1)?.body).toEqual(
      initial.players[id].body,
    );
    expect(predictor.presentation(initial.players[id], due)?.body[0].x).toBe(11);
    expect(session.getSnapshot(id).players[id].body[0].x).toBe(10);
    await session.advance(interval - 40);
    const next = session.getSnapshot(id);
    predictor.seedFrom(next, due + 35, true);
    expect(predictor.presentation(next.players[id], due + interval - 1)?.body[0].x).toBe(11);
    expect(predictor.presentation(next.players[id], due + interval)?.body[0].x).toBe(12);
    await session.advance(interval);
    const matching = session.getSnapshot(id);
    predictor.seedFrom(matching, due + interval + 10, true);
    expect(predictor.presentation(matching.players[id], due + interval + 10)?.body).toEqual(
      matching.players[id].body,
    );
  });

  it('turns immediately on the local clock, re-applies only unacknowledged directions, and obeys authoritative holds/death', async () => {
    const { session, id } = setup();
    const initial = session.getSnapshot(id);
    const predictor = new ClientMovementPredictor();
    const interval = initial.players[id].movementIntervalMs!;
    predictor.seedFrom(initial, 0, true);
    expect(predictor.direction({ x: 0, y: 1 }, 10)).toBe(true);
    expect(predictor.direction({ x: -1, y: 0 }, 11)).toBe(true);
    predictor.seedFrom(initial, 20, true, [
      { x: 0, y: 1 },
      { x: -1, y: 0 },
    ]);
    expect(predictor.presentation(initial.players[id], interval)?.body[0]).toEqual({
      x: 10,
      y: 11,
    });
    expect(predictor.presentation(initial.players[id], interval * 2)?.body[0]).toEqual({
      x: 9,
      y: 11,
    });
    await session.executeCommand({
      type: 'setDirection',
      playerId: id,
      direction: { x: 0, y: 1 },
      inputSequence: 7,
    });
    expect(session.getSnapshot(id).players[id].acknowledgedDirectionSequence).toBe(7);
    await session.executeCommand({ type: 'playerInteraction', playerId: id, mode: 'dialogue' });
    const held = session.getSnapshot(id);
    predictor.seedFrom(held, 400, true);
    expect(predictor.presentation(held.players[id], 1000)).toBeNull();
    const dead = structuredClone(initial);
    dead.players[id].alive = false;
    predictor.seedFrom(dead, 1100, true);
    expect(predictor.presentation(dead.players[id], 1100)).toBeNull();
    expect(initial.players[id].body[0]).toEqual({ x: 10, y: 10 });
  });

  it('uses snapshot acknowledgement to retry lost holds, throttles retries, and immediately sends a changed intent', () => {
    const hold = new PlayerHoldSynchronizer();
    expect(hold.shouldSend('playing', 'dialogue', 0)).toBe(true);
    expect(hold.shouldSend('playing', 'dialogue', 499)).toBe(false);
    expect(hold.shouldSend('playing', 'dialogue', 500)).toBe(true);
    expect(hold.shouldSend('paused', 'dialogue', 501)).toBe(true);
    expect(hold.shouldSend('paused', 'paused', 502)).toBe(false);
    expect(hold.shouldSend('playing', 'paused', 503)).toBe(true);
    expect(hold.shouldSend('playing', 'playing', 504)).toBe(false);
    expect(hold.shouldSend('playing', 'dialogue', 505)).toBe(true);
  });

  it('cancels speculative movement when a menu opens, without creating an offline hold command', () => {
    const { session, id } = setup();
    const snapshot = session.getSnapshot(id);
    const predictor = new ClientMovementPredictor();
    predictor.seedFrom(snapshot, 0, true);
    expect(predictor.presentation(snapshot.players[id], 100)?.body[0].x).toBe(11);
    predictor.cancel();
    predictor.begin('alice', 101);
    expect(predictor.presentation(snapshot.players[id], 500)).toBeNull();
    expect(predictor.replay(500)).toBeUndefined();
    expect(session.getSnapshot(id).ui.playerInteraction).toBe('playing');
  });

  it('interpolates peers without mutating snapshots, and snaps room changes, death and suspension', async () => {
    const { game, session, id } = setup();
    const bob = session.registerConnection('bob', 'Bob');
    game.runForPlayer(bob, () =>
      game.placeSnakeBodyAtLocal('0,0,0', { x: 10, y: 15 }, { x: 1, y: 0 }),
    );
    const peers = new PeerMovementPresentation();
    const initial = session.getSnapshot(id);
    peers.accept(initial, 0);
    await session.advance(100);
    const next = session.getSnapshot(id);
    const copy = structuredClone(next);
    peers.accept(next, 100);
    expect(peers.sample(bob, 150)?.body[0].x).toBe(10.5);
    expect(peers.active(150)).toBe(true);
    expect(peers.sample(bob, 200)?.body).toEqual(next.players[bob].body);
    expect(next).toEqual(copy);
    next.players[bob].roomId = '1,0,0';
    peers.accept(next, 201);
    expect(peers.sample(bob, 201)?.roomId).toBe('1,0,0');
    next.connections!.bob.suspended = true;
    next.players[bob].body[0].x++;
    peers.accept(next, 202);
    expect(peers.sample(bob, 202)?.body).toEqual(next.players[bob].body);
    next.players[bob].alive = false;
    peers.accept(next, 203);
    expect(peers.sample(bob, 203)).toBeNull();
  });

  it('records the exact movement hold and revision for a stationary player', async () => {
    const { session, id } = setup();
    await session.advance(100);
    const revision = session.getSnapshot(id).players[id].movementRevision;
    await session.executeCommand({ type: 'playerInteraction', playerId: id, mode: 'dialogue' });
    await session.advance(1000);
    expect(session.getPerformanceReport().players).toContainEqual(
      expect.objectContaining({
        playerId: id,
        held: true,
        holdReason: 'playerInteraction:dialogue',
        movementRevision: revision,
        movementIntervalMs: 100,
        movementAccumulatorMs: 0,
        head: { x: 11, y: 10 },
      }),
    );
  });

  it('bounds optional direction acknowledgements at the protocol boundary', () => {
    for (const inputSequence of [-1, 0, 1.5, Number.MAX_SAFE_INTEGER + 1, '7']) {
      expect(
        parseCommandMessage(
          JSON.stringify({
            type: 'command',
            id: 1,
            command: {
              type: 'setDirection',
              playerId: 'alice',
              direction: { x: 0, y: 1 },
              inputSequence,
            },
          }),
        ),
      ).toBeNull();
    }
    expect(
      parseCommandMessage(
        JSON.stringify({
          type: 'command',
          id: 1,
          command: {
            type: 'setDirection',
            playerId: 'alice',
            direction: { x: 0, y: 1 },
            inputSequence: 7,
          },
        }),
      ),
    ).not.toBeNull();
  });

  it('rebases a previously published movement base without duplicating steps; unpublished revisions stay rejected', async () => {
    const { session, id } = setup();
    const base = session.getSnapshot(id);
    session.recordPublishedMovement('alice', base);
    await session.advance(100);
    let now = Date.now();
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    await session.suspendConnection('alice');
    now += 500;
    await session.attachConnection(
      'resumed',
      'Alice',
      { playerId: id, admin: true },
      {
        connectionId: 'alice',
        baseRevision: base.players[id].movementRevision!,
        steps: 5,
        elapsedMs: 500,
        inputs: [],
      },
    );
    expect(session.getSnapshot(id).players[id].movementRevision).toBe(5);
    expect(session.getSnapshot(id).players[id].body[0]).toEqual({ x: 15, y: 10 });
    await session.suspendConnection('resumed');
    now += 500;
    await session.attachConnection(
      'again',
      'Alice',
      { playerId: id, admin: true },
      { connectionId: 'resumed', baseRevision: 4, steps: 5, elapsedMs: 500, inputs: [] },
    );
    expect(session.getSnapshot(id).players[id].movementRevision).toBe(5);
  });

  it('takes one server autosave per interval and keeps moving while a checkpoint write is blocked', async () => {
    let release = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const saved: GameSaveData[] = [];
    const { session, id } = setup({
      load: async () => null,
      has: async () => false,
      clear: async () => {},
      save: async (_slot, data) => {
        saved.push(data);
        await gate;
      },
    });
    session.registerConnection('bob', 'Bob');
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    const records: SessionDiagnostic[] = [];
    const server = createGameServer(session, { onDiagnostic: (record) => records.push(record) });
    await server.listen(0);
    try {
      await vi.advanceTimersByTimeAsync(30000);
      expect(saved).toHaveLength(1);
      const revision = session.getSnapshot(id).players[id].movementRevision!;
      await session.advance(100);
      expect(session.getSnapshot(id).players[id].movementRevision).toBe(revision + 1);
      expect(session.getQueueDiagnostics().pendingOperations).toBe(0);
      await vi.advanceTimersByTimeAsync(60000);
      expect(saved).toHaveLength(1);
      release();
      await vi.waitFor(() =>
        expect(records.some((record) => record.event === 'checkpoint.autosaved')).toBe(true),
      );
      await vi.advanceTimersByTimeAsync(30000);
      expect(saved).toHaveLength(2);
    } finally {
      release();
      await server.close();
    }
  });

  it('returns an explicit expected-fire reason and keeps manual checkpoint privilege enforced', async () => {
    const { session } = setup();
    const guest = session.registerConnection('bob', 'Bob');
    expect(
      await session.executeCommand({
        type: 'combatAction',
        playerId: guest,
        action: 'fire',
        direction: { x: 1, y: 0 },
      }),
    ).toEqual({ ok: false, reason: 'shot-unavailable' });
    expect(await session.executeCommand({ type: 'saveGame', playerId: guest })).toMatchObject({
      ok: false,
      reason: expect.stringContaining('server owner'),
    });
  });
});
