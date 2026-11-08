import { afterEach, describe, expect, it, vi } from 'vitest';
import { movementTurnFixture, runMovementTurnScenario } from '../../test/movementTurnScenario.js';
import { MovementTurnAuthority } from '../MovementTurnAuthority.js';
import { parseCommandMessage } from '../gameProtocol.js';
import { SnapshotDeltaAssembler, SnapshotDeltaEncoder } from '../SnapshotDelta.js';

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('client-preferred movement steps', () => {
  it('seeds a late join with the shared authority clock before its first environment update', async () => {
    const { session, game, predictor } = await movementTurnFixture();
    await session.advance(100);
    const bob = session.registerConnection('bob', 'Bob');
    await session.enableMovementGrace(bob);
    const snapshot = session.getSnapshot(bob);
    expect(snapshot.tick).toBe(100);
    expect(snapshot.players[bob].movementPhaseAtMs).toBe(100);
    expect(snapshot.players[bob].movementAccumulatorMs).toBe(0);
    expect(game.runForPlayer(bob, () => session.getMovementTime())).toBe(100);
    predictor.cancel();
    predictor.seedFrom(snapshot, 1000, true);
    predictor.synchronizeClock(1000, 1000, 100);
    expect(predictor.presentation(snapshot.players[bob], 1099)?.body).toEqual(
      snapshot.players[bob].body,
    );
    expect(predictor.presentation(snapshot.players[bob], 1100)?.body[0].x).toBe(
      snapshot.players[bob].body[0].x + 1,
    );
    expect(session.getSnapshot(bob).players[bob].movementRevision).toBe(0);
  });
  it('keeps phase and timestamp atomic when the same phase value repeats across a fast-lane step', async () => {
    const { session, initial, id } = await movementTurnFixture(100);
    const encoder = new SnapshotDeltaEncoder(),
      assembler = new SnapshotDeltaAssembler();
    assembler.reset(initial);
    encoder.encode(initial, true);
    await session.advance(100);
    await session.advance(100);
    assembler.apply(encoder.encode(session.getSnapshot(id), true));
    session.onMovement((update) => {
      assembler.applyMovement(update);
    });
    await session.advance(20);
    await session.advance(80);
    const current = session.getSnapshot(id);
    const delta = encoder.encode(current, true);
    expect(delta.movementResync).toBe(false);
    const received = assembler.apply(delta).players[id];
    expect(received.movementRevision).toBe(1);
    expect(received.movementAccumulatorMs).toBe(current.players[id].movementAccumulatorMs);
    expect(received.movementPhaseAtMs).toBe(300);
  });
  it('rephases input revision assignment immediately when the first clock probe resolves', async () => {
    const { predictor, initial, id } = await movementTurnFixture();
    predictor.cancel();
    predictor.seedFrom(initial, 0, true);
    expect(predictor.presentation(initial.players[id], 50)?.body[0]).toEqual({ x: 10, y: 10 });
    predictor.synchronizeClock(50, 52, 100);
    expect(predictor.presentation(initial.players[id], 52)?.body[0]).toEqual({ x: 11, y: 10 });
    expect(predictor.direction({ x: 0, y: 1 }, 53, 1)).toBe(true);
    expect(predictor.turnIntent?.intendedRevision).toBe(2);
  });

  it('publishes fresh timestamped phase on the existing snapshot lane before a slow first commit', async () => {
    const { session, predictor, initial, id } = await movementTurnFixture(200);
    const encoder = new SnapshotDeltaEncoder(),
      assembler = new SnapshotDeltaAssembler();
    assembler.reset(initial);
    encoder.encode(initial, true);
    for (let now = 100; now <= 300; now += 100) {
      await session.advance(100);
      const delta = encoder.encode(session.getSnapshot(id), true);
      expect(delta.movementResync).toBe(false);
      const received = assembler.apply(delta);
      expect(received.players[id].movementAccumulatorMs).toBe(now);
      expect(received.players[id].movementPhaseAtMs).toBe(now);
      predictor.seedFrom(received, now, true);
      expect(predictor.presentation(received.players[id], now)?.body[0].x).toBe(
        now >= 200 ? 11 : 10,
      );
    }
    expect(session.getSnapshot(id).players[id].movementRevision).toBe(0);
  });
  it('retains the remaining commit delay when reconnecting before the first authoritative step', async () => {
    const { session, predictor, initial, id } = await movementTurnFixture();
    let now = 10000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    session.recordPublishedMovement('alice', initial);
    predictor.direction({ x: 0, y: 1 }, 1, 1);
    predictor.begin('alice', 1);
    await session.suspendConnection('alice');
    now += 100;
    await session.advance(100);
    await session.attachConnection(
      'replacement',
      'Alice',
      { playerId: id, admin: true },
      predictor.replay(101),
    );
    expect(session.getSnapshot(id).players[id].movementRevision).toBe(0);
    expect(session.getSnapshot(id).players[id].movementAccumulatorMs).toBe(100);
    await session.advance(100);
    expect(session.getSnapshot(id).players[id].movementRevision).toBe(0);
    await session.advance(20);
    expect(session.getSnapshot(id).players[id].movementRevision).toBe(1);
    expect(session.getSnapshot(id).players[id].body[0]).toEqual({ x: 10, y: 11 });
  });
  it.each([
    [126, 50, 1],
    [50, 200, 2],
  ] as const)(
    'validates a turn recorded at %i ms cadence before a late %i ms speed update',
    async (before, after, target) => {
      const { session, game, predictor, initial, id } = await movementTurnFixture(before);
      expect(predictor.direction({ x: 0, y: 1 }, 90, 1)).toBe(true);
      expect(predictor.turnIntent?.intendedRevision).toBe(target);
      const predicted = structuredClone(
        predictor.presentation(initial.players[id], target * before)?.body,
      );
      await session.advance(100);
      game.setFlag('class.mods', {
        derivedModifiers: [
          { stat: 'actionStepIntervalScalar', operation: 'multiply', value: after / 100 },
        ],
      });
      await session.advance(20);
      expect(session.getSnapshot(id).players[id].movementIntervalMs).toBe(after);
      expect(
        (
          await session.executeCommand({
            type: 'setDirection',
            playerId: id,
            inputSequence: 1,
            direction: { x: 0, y: 1 },
            ...predictor.turnIntent,
          })
        ).ok,
      ).toBe(true);
      while ((session.getSnapshot(id).players[id].movementRevision ?? 0) < target)
        await session.advance(20);
      expect(session.getSnapshot(id).players[id].body).toEqual(predicted);
      expect(session.getSnapshot(id).players[id].movementAppliedTurnRevision).toBe(target);
    },
  );

  it('retains an already displayed valid prefix when a slower authoritative interval arrives', async () => {
    const { session, game, predictor, initial, id } = await movementTurnFixture(50);
    const shown = structuredClone(predictor.presentation(initial.players[id], 100)?.body);
    await session.advance(100);
    game.setFlag('class.mods', {
      derivedModifiers: [{ stat: 'actionStepIntervalScalar', operation: 'multiply', value: 2 }],
    });
    await session.advance(20);
    predictor.seedFrom(session.getSnapshot(id), 120, true);
    expect(predictor.presentation(session.getSnapshot(id).players[id], 120)?.body).toEqual(shown);
    expect(predictor.getDiagnostics().correctionTiles).toBe(0);
  });
  it('preserves buffered turn timing when presentation stops after a successful room crossing', async () => {
    const { predictor, initial, id } = await movementTurnFixture();
    const snapshot = structuredClone(initial);
    snapshot.players[id].body = [
      { x: 10, y: 23 },
      { x: 9, y: 23 },
      { x: 8, y: 23 },
    ];
    const origin = snapshot.viewport.rooms['0,0,0'];
    snapshot.viewport.rooms['0,1,0'] = {
      ...origin,
      id: '0,1,0',
      room: { ...origin.room, id: '0,1,0' },
    };
    predictor.seedFrom(snapshot, 0, true);
    expect(predictor.direction({ x: 0, y: 1 }, 1, 1)).toBe(true);
    expect(predictor.direction({ x: -1, y: 0 }, 2, 2)).toBe(true);
    expect(predictor.presentation(snapshot.players[id], 100)?.roomId).toBe('0,1,0');
    expect(predictor.direction({ x: 0, y: -1 }, 110, 3)).toBe(true);
    expect(predictor.turnIntent?.intendedRevision).toBe(3);
  });
  it('timestamps clock probes between simulation ticks without granting movement time', async () => {
    const { session, id } = await movementTurnFixture();
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    let now = 10000;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    session.start(() => {});
    try {
      now += 7;
      expect(session.getMovementClockTime()).toBe(7);
      expect(session.getMovementTime()).toBe(0);
      await session.advance(20);
      now += 9;
      expect(session.getMovementClockTime()).toBe(29);
      expect(session.getSnapshot(id).players[id].movementRevision).toBe(0);
      now += 500;
      expect(session.getMovementClockTime()).toBe(40);
      await session.executeCommand({ type: 'pause', playerId: id });
      expect(session.getMovementClockTime()).toBe(20);
    } finally {
      session.stop();
    }
  });
  it('measures presentation frame gaps independently of snapshot catch-up and clock phase', async () => {
    const { predictor, initial, id } = await movementTurnFixture();
    predictor.presentation(initial.players[id], 16);
    predictor.presentation(initial.players[id], 32);
    expect(predictor.getDiagnostics().frameGapMs).toBe(16);
    predictor.seedFrom(initial, 64, true);
    expect(predictor.getDiagnostics().frameGapMs).toBe(16);
    predictor.presentation(initial.players[id], 132);
    expect(predictor.getDiagnostics().frameGapMs).toBe(100);
    expect(predictor.getDiagnostics().maximumFrameGapMs).toBe(100);
  });
  it.each(['inventory', 'global-pause'] as const)(
    'discards uncommitted input across %s without reviving its predicted turn',
    async (hold) => {
      const { session, predictor, id } = await movementTurnFixture();
      predictor.direction({ x: 0, y: 1 }, 99, 1);
      await session.advance(120);
      await session.executeCommand({
        type: 'setDirection',
        playerId: id,
        inputSequence: 1,
        direction: { x: 0, y: 1 },
        ...predictor.turnIntent,
      });
      if (hold === 'inventory')
        await session.executeCommand({
          type: 'playerInteraction',
          playerId: id,
          mode: 'inventory',
        });
      else await session.executeCommand({ type: 'pause', playerId: id });
      predictor.seedFrom(session.getSnapshot(id), 120, true);
      if (hold === 'inventory')
        await session.executeCommand({ type: 'playerInteraction', playerId: id, mode: 'playing' });
      else await session.executeCommand({ type: 'resume', playerId: id });
      predictor.seedFrom(session.getSnapshot(id), 320, true);
      predictor.synchronizeClock(0, 330, 120); // A delayed probe from before the hold is stale.
      expect(predictor.presentation(session.getSnapshot(id).players[id], 420)?.body[0]).toEqual({
        x: 11,
        y: 10,
      });
      await session.advance(100);
      await session.advance(120);
      expect(session.getSnapshot(id).players[id].body[0]).toEqual({ x: 11, y: 10 });
      expect(session.getSnapshot(id).players[id].movementRevision).toBe(1);
    },
  );
  it('uses low-RTT clock samples across skew and ignores a delayed pre-stall sample', async () => {
    const { predictor, initial, id } = await movementTurnFixture();
    predictor.seedFrom(initial, 10000, true);
    predictor.synchronizeClock(10000, 10002, 1);
    predictor.synchronizeClock(10003, 10080, 4);
    expect(predictor.direction({ x: 0, y: 1 }, 10099, 1)).toBe(true);
    expect(predictor.turnIntent).toEqual({ intendedRevision: 1, estimatedServerTimeMs: 99 });
    expect(predictor.presentation(initial.players[id], 10100)?.body[0]).toEqual({ x: 10, y: 11 });
    const afterStall = structuredClone(initial);
    afterStall.tick = 500;
    afterStall.players[id].movementPhaseAtMs = 500;
    predictor.seedFrom(afterStall, 10110, true);
    predictor.synchronizeClock(10000, 10120, 0);
    expect(predictor.direction({ x: -1, y: 0 }, 10121, 2)).toBe(true);
    expect(predictor.turnIntent?.estimatedServerTimeMs).toBeGreaterThanOrEqual(500);
  });

  it.each([false, true])(
    'keeps peer collision and death authoritative (turn arrives before commit: %s)',
    async (beforeCommit) => {
      const { session, game, id } = await movementTurnFixture();
      const bob = session.registerConnection('bob', 'Bob');
      game.runForPlayer(bob, () =>
        game.placeSnakeBodyAtLocal('0,0,0', { x: 11, y: 10 }, { x: 0, y: 1 }),
      );
      await session.executeCommand({ type: 'playerInteraction', playerId: bob, mode: 'paused' });
      await session.advance(beforeCommit ? 120 : 180);
      if (!beforeCommit)
        for (let step = 0; step < 10 && session.getSnapshot(id).lifecycle?.kind !== 'death'; step++)
          await session.advance(100);
      const before = session.getSnapshot(id);
      const reply = await session.executeCommand({
        type: 'setDirection',
        playerId: id,
        inputSequence: 1,
        intendedRevision: 1,
        estimatedServerTimeMs: 99,
        direction: { x: 0, y: 1 },
      });
      if (beforeCommit) {
        expect(reply.ok).toBe(true);
        await session.advance(100);
        expect(session.getSnapshot(id).players[id].body[0]).toEqual({ x: 10, y: 11 });
        expect(session.getSnapshot(id).lifecycle?.kind).toBe('active');
      } else {
        expect(before.lifecycle?.kind).toBe('death');
        expect(reply.ok).toBe(false);
        expect(session.getSnapshot(id).lifecycle).toEqual(before.lifecycle);
        expect(session.getSnapshot(id).players[id].body).toEqual(before.players[id].body);
      }
      expect(session.getSnapshot(bob).players[bob].body[0]).toEqual({ x: 11, y: 10 });
    },
  );

  it('awards a pickup once at commit, never on input receipt or duplicate delivery', async () => {
    const { session, game, id, room } = await movementTurnFixture();
    const apple = game.getApple(room.id)!;
    const x = apple.position.x,
      y = apple.position.y;
    game.placeSnakeBodyAtLocal(room.id, { x, y: y - 1 }, { x: 1, y: 0 });
    const score = game.getScore();
    const command = {
      type: 'setDirection',
      playerId: id,
      inputSequence: 1,
      intendedRevision: 1,
      estimatedServerTimeMs: 99,
      direction: { x: 0, y: 1 },
    } as const;
    await session.advance(120);
    expect((await session.executeCommand(command)).ok).toBe(true);
    expect(game.getScore()).toBe(score);
    expect((await session.executeCommand(command)).ok).toBe(true);
    await session.advance(100);
    expect(game.getFlag('applesEaten')).toBe(1);
    expect(game.getScore()).toBeGreaterThan(score);
    const awarded = game.getScore();
    await session.executeCommand(command);
    expect(game.getScore()).toBe(awarded);
    expect(game.getFlag('applesEaten')).toBe(1);
  });

  it('resumes uncommitted predicted inputs without duplicate movement or a stranded direction plan', async () => {
    const { session, id, predictor, initial } = await movementTurnFixture();
    let now = 10000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    session.recordPublishedMovement('alice', initial);
    predictor.direction({ x: 0, y: 1 }, 99, 1);
    await session.advance(120);
    await session.executeCommand({
      type: 'setDirection',
      playerId: id,
      direction: { x: 0, y: 1 },
      inputSequence: 1,
      ...predictor.turnIntent,
    });
    predictor.begin('alice', 120);
    await session.suspendConnection('alice');
    now += 200;
    await session.advance(200);
    await session.attachConnection(
      'replacement',
      'Alice',
      { playerId: id, admin: true },
      predictor.replay(320),
    );
    expect(session.getSnapshot(id).players[id].movementRevision).toBe(2);
    expect(session.getSnapshot(id).players[id].body[0]).toEqual({ x: 10, y: 12 });
    await session.advance(100);
    expect(session.getSnapshot(id).players[id].movementRevision).toBe(3);
    expect(session.getSnapshot(id).players[id].body[0]).toEqual({ x: 10, y: 13 });
  });
  it.each([50, 70, 100, 126, 200])(
    'preserves turns on both sides of a %i ms boundary under latency and jitter',
    async (interval) => {
      for (const offset of [-1, 1])
        for (const latency of [0, 15, 35, 65]) {
          const sample = await runMovementTurnScenario(interval, offset, latency, true);
          expect(sample.reason).toBe('accepted');
          expect(sample.intendedRevision).toBe(offset < 0 ? 1 : 2);
          expect(sample.appliedRevision).toBe(sample.intendedRevision);
          expect(sample.comparedRevision).toBe(sample.intendedRevision);
          expect(sample.correctionTiles).toBe(0);
        }
      expect(
        (await runMovementTurnScenario(interval, -1, 35, false)).correctionTiles,
      ).toBeGreaterThan(0);
    },
  );

  it('preserves rapid ordered buffered turns and acknowledges only committed inputs', async () => {
    const { session, id, predictor } = await movementTurnFixture(50);
    for (const [sequence, direction] of [
      [1, { x: 0, y: 1 }],
      [2, { x: -1, y: 0 }],
    ] as const) {
      expect(predictor.direction(direction, sequence, sequence)).toBe(true);
      expect(
        (
          await session.executeCommand({
            type: 'setDirection',
            playerId: id,
            inputSequence: sequence,
            direction,
            ...predictor.turnIntent,
          })
        ).ok,
      ).toBe(true);
    }
    expect(session.getSnapshot(id).players[id].acknowledgedDirectionSequence).toBeUndefined();
    for (let i = 0; i < 9; i++) await session.advance(20);
    expect(session.getSnapshot(id).players[id].body[0]).toEqual({ x: 10, y: 11 });
    expect(session.getSnapshot(id).players[id].acknowledgedDirectionSequence).toBe(1);
    await session.advance(40);
    expect(session.getSnapshot(id).players[id].body[0]).toEqual({ x: 9, y: 11 });
    expect(session.getSnapshot(id).players[id].acknowledgedDirectionSequence).toBe(2);
  });

  it('replaces the buffered turn using the shared queue semantics rather than applying two opposite turns at one step', async () => {
    const { session, id, predictor, initial } = await movementTurnFixture(100);
    for (const [sequence, direction] of [
      [1, { x: 0, y: 1 }],
      [2, { x: -1, y: 0 }],
      [3, { x: 1, y: 0 }],
    ] as const) {
      expect(predictor.direction(direction, sequence, sequence)).toBe(true);
      expect(
        (
          await session.executeCommand({
            type: 'setDirection',
            playerId: id,
            direction,
            inputSequence: sequence,
            ...predictor.turnIntent,
          })
        ).ok,
      ).toBe(true);
    }
    const predicted = structuredClone(predictor.presentation(initial.players[id], 200)?.body);
    await session.advance(160);
    await session.advance(160);
    expect(session.getSnapshot(id).players[id].body).toEqual(predicted);
    expect(session.getSnapshot(id).players[id].body[0]).toEqual({ x: 11, y: 11 });
    expect(session.getSnapshot(id).players[id].acknowledgedDirectionSequence).toBe(3);
  });

  it('rejects forced steering and validates reversals using canonical movement before committing a step', async () => {
    const { session, id, game } = await movementTurnFixture();
    expect(
      await session.executeCommand({
        type: 'forceDirection',
        playerId: id,
        direction: { x: -1, y: 0 },
      }),
    ).toMatchObject({ ok: false, reason: 'movement-requires-intended-step' });
    expect(
      (
        await session.executeCommand({
          type: 'setDirection',
          playerId: id,
          direction: { x: -1, y: 0 },
          inputSequence: 1,
          intendedRevision: 1,
          estimatedServerTimeMs: 0,
        })
      ).ok,
    ).toBe(true);
    await session.advance(100);
    await session.advance(120);
    expect(session.getSnapshot(id).players[id].body[0]).toEqual({ x: 11, y: 10 });
    expect(session.getSnapshot(id).players[id].direction).toEqual({ x: 1, y: 0 });
    expect(session.getSnapshot(id).players[id].movementRevision).toBe(1);
    await session.executeCommand({ type: 'playerInteraction', playerId: id, mode: 'inventory' });
    expect(
      await session.executeCommand({
        type: 'forceDirection',
        playerId: id,
        direction: { x: -1, y: 0 },
      }),
    ).toMatchObject({ ok: false, reason: 'movement-requires-intended-step' });
    await session.executeCommand({ type: 'playerInteraction', playerId: id, mode: 'playing' });
    game.setFlag('traversal.manualResumePending', true);
    expect(
      await session.executeCommand({
        type: 'forceDirection',
        playerId: id,
        direction: { x: 0, y: 1 },
      }),
    ).toEqual({ ok: true });
    expect(session.getSnapshot(id).players[id].direction).toEqual({ x: 0, y: 1 });
    expect(session.getSnapshot(id).players[id].movementRevision).toBe(1);
  });

  it('continues sending next-step steering when uncertain collision geometry stops presentation', async () => {
    const { session, room, game, id, predictor } = await movementTurnFixture();
    room.layout[10] = room.layout[10].slice(0, 11) + '#' + room.layout[10].slice(12);
    game.enableTeleport(false);
    const snapshot = session.getSnapshot(id);
    predictor.seedFrom(snapshot, 0, true);
    expect(predictor.presentation(snapshot.players[id], 100)?.body[0]).toEqual({ x: 10, y: 10 });
    expect(predictor.direction({ x: 0, y: 1 }, 110, 1)).toBe(true);
    expect(predictor.turnIntent?.intendedRevision).toBe(2);
    await session.advance(120);
    expect(
      (
        await session.executeCommand({
          type: 'setDirection',
          playerId: id,
          inputSequence: 1,
          direction: { x: 0, y: 1 },
          ...predictor.turnIntent,
        })
      ).ok,
    ).toBe(true);
    await session.advance(100);
    await session.advance(100);
    expect(session.getSnapshot(id).players[id].movementRevision).toBe(2);
    expect(session.getSnapshot(id).players[id].body[0]).toEqual({ x: 10, y: 11 });
  });

  it('applies a valid delayed turn before wall collision but never rewrites a committed wall outcome', async () => {
    const { session, game, room, id } = await movementTurnFixture();
    room.layout[10] = room.layout[10].slice(0, 11) + '#' + room.layout[10].slice(12);
    game.enableTeleport(false);
    await session.advance(120);
    expect(
      (
        await session.executeCommand({
          type: 'setDirection',
          playerId: id,
          inputSequence: 1,
          direction: { x: 0, y: 1 },
          intendedRevision: 1,
          estimatedServerTimeMs: 99,
        })
      ).ok,
    ).toBe(true);
    await session.advance(100);
    expect(session.getSnapshot(id).players[id].body[0]).toEqual({ x: 10, y: 11 });
    const before = session.getSnapshot(id);
    const rejected = await session.executeCommand({
      type: 'setDirection',
      playerId: id,
      inputSequence: 2,
      direction: { x: -1, y: 0 },
      intendedRevision: 1,
      estimatedServerTimeMs: 99,
    });
    expect(rejected.reason).toBe('step-already-committed');
    expect(session.getSnapshot(id).players[id].body).toEqual(before.players[id].body);
  });

  it('does not create steps from fabricated future revisions, old timestamps, or duplicate inputs', () => {
    const authority = new MovementTurnAuthority();
    const turn = {
      type: 'setDirection',
      playerId: 'alice',
      inputSequence: 1,
      direction: { x: 0, y: 1 },
      intendedRevision: 1,
      estimatedServerTimeMs: 99,
    } as const;
    expect(authority.submit(turn, 0, 0, 100, 120)).toBeNull();
    expect(authority.submit(turn, 0, 0, 100, 120)).toBe('duplicate-turn');
    expect(
      authority.submit({ ...turn, inputSequence: 2, intendedRevision: 999 }, 0, 0, 100, 120),
    ).toBe('step-too-far-ahead');
    expect(
      authority.submit({ ...turn, inputSequence: 3, estimatedServerTimeMs: 0 }, 0, 0, 100, 200),
    ).toBe('input-outside-grace');
    expect(authority.take(1)).toHaveLength(1);
    expect(authority.take(1)).toHaveLength(0);
  });

  it('retains fractional simulation phase and server speed limits across a speed change', async () => {
    const { session, game, id } = await movementTurnFixture(126);
    await session.advance(127);
    expect(session.getSnapshot(id).players[id].movementAccumulatorMs).toBe(127);
    expect(session.getSnapshot(id).players[id].movementRevision).toBe(0);
    game.setFlag('class.mods', {
      derivedModifiers: [{ stat: 'actionStepIntervalScalar', operation: 'multiply', value: 0.5 }],
    });
    await session.advance(53);
    expect(session.getSnapshot(id).players[id].movementIntervalMs).toBe(50);
    expect(session.getSnapshot(id).players[id].movementRevision).toBe(1);
    await session.advance(40);
    expect(session.getSnapshot(id).players[id].movementRevision).toBe(2);
  });

  it('rejects malformed intended-step metadata at the protocol boundary', () => {
    for (const intendedRevision of [-1, 0, 1.5, '1', Number.MAX_SAFE_INTEGER + 1])
      expect(
        parseCommandMessage(
          JSON.stringify({
            type: 'command',
            id: 1,
            command: {
              type: 'setDirection',
              playerId: 'alice',
              inputSequence: 1,
              direction: { x: 0, y: 1 },
              intendedRevision,
              estimatedServerTimeMs: 99,
            },
          }),
        ),
      ).toBeNull();
  });
});
