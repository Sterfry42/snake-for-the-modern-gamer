import { afterEach, describe, expect, it, vi } from 'vitest';
import { WebSocket } from 'ws';
import { SnakeGame } from '../../game/snakeGame.js';
import { QuestRegistry } from '../../quests/questRegistry.js';
import { defaultGameConfig } from '../../config/gameConfig.js';
import { AuthoritativeGameSession } from '../AuthoritativeGameSession.js';
import { SnapshotDeltaEncoder, SnapshotDeltaAssembler } from '../SnapshotDelta.js';
import { copyGameSnapshot, parseServerMessage, type ServerMessage } from '../gameProtocol.js';
import { SceneReadReplica } from '../SceneReadReplica.js';
import { createGameServer } from '../../server/createGameServer.js';
import { WorldService } from '../../world/worldService.js';
import { createBaseActor } from '../../actors/actorFactory.js';
import type { SaveStore } from '../../storage/SaveStore.js';
import type { GameSaveData } from '../../game/saveTypes.js';
import { createPhysicalHumanTown } from '../../world/town.js';

const cleanup: Array<() => void | Promise<void>> = [];
afterEach(async () => {
  for (const close of cleanup.splice(0).reverse()) await close();
  vi.restoreAllMocks();
});
function setup(saveStore?: SaveStore<GameSaveData>) {
  const registry = new QuestRegistry();
  const game = new SnakeGame(
    { ...defaultGameConfig, rng: { seed: 'server-performance' } },
    registry,
  );
  game.reset();
  game.bosses.clearAll();
  const room = game.getCurrentRoom();
  room.layout = room.layout.map((row) => '.'.repeat(row.length));
  const session = new AuthoritativeGameSession({ game, manageBasicFeatures: true, saveStore });
  return { game, room, session, registry };
}
function wireDelta(
  encoder: SnapshotDeltaEncoder,
  snapshot: Awaited<ReturnType<AuthoritativeGameSession['getConnectionSnapshot']>>,
) {
  const message = parseServerMessage(
    JSON.stringify({ type: 'delta', delta: encoder.encode(snapshot) }),
  );
  if (message.type !== 'delta') throw new Error('Expected state delta');
  return message.delta;
}

describe('bounded server replication and simulation', () => {
  it('retains rooms across hot updates, sends only changed selectors/room revisions, and resets on a new world epoch', async () => {
    const { game, session, registry, room } = setup();
    game.getRoom('1,0,0');
    session.configureHosting();
    const id = session.registerConnection('wire', 'Alice', {
      playerId: game.getLocalPlayerId(),
      admin: false,
    });
    const initial = copyGameSnapshot(await session.getConnectionSnapshot(id));
    const encoder = new SnapshotDeltaEncoder();
    encoder.encode(initial);
    const assembler = new SnapshotDeltaAssembler();
    assembler.reset(initial);
    const replica = new SceneReadReplica(defaultGameConfig, registry, initial);
    const replace = vi.spyOn(WorldService.prototype, 'replaceReplicaRooms');
    game.setScore(71);
    game.setFlag('performance.flag', { count: 1 });
    const hot = wireDelta(encoder, await session.getConnectionSnapshot(id));
    expect(hot.clientState.worldRooms).toEqual([]);
    expect(hot.clientState.specialState).toBeUndefined();
    expect(hot.flags.set['performance.flag']).toEqual({ count: 1 });
    expect(hot.viewport.rooms[room.id].room).toBeUndefined();
    replica.hydrate(assembler.apply(hot));
    expect(replica.game.getScore()).toBe(71);
    expect(replica.game.getFlag('performance.flag')).toEqual({ count: 1 });
    expect(replica.game.peekCachedRoom('1,0,0')).toBeDefined();
    game.setFlag('performance.flag', undefined);
    const removed = wireDelta(encoder, await session.getConnectionSnapshot(id));
    expect(removed.flags.removed).toContain('performance.flag');
    replica.hydrate(assembler.apply(removed));
    expect(replica.game.getFlag('performance.flag')).toBeUndefined();
    game.getRoom('3,0,0');
    game.placeSnakeBodyAtLocal('3,0,0', { x: 5, y: 5 }, { x: 1, y: 0 });
    replica.hydrate(assembler.apply(wireDelta(encoder, await session.getConnectionSnapshot(id))));
    expect(replica.game.getCurrentRoom().id).toBe('3,0,0');
    expect(replica.game.peekCachedRoom(room.id)).toBeDefined();
    room.layout[4] = '.'.repeat(game.config.grid.cols);
    room.layout[4] = `${room.layout[4].slice(0, 4)}#${room.layout[4].slice(5)}`;
    game.placeSnakeBodyAtLocal(room.id, { x: 5, y: 5 }, { x: 1, y: 0 });
    const revised = wireDelta(encoder, await session.getConnectionSnapshot(id));
    expect(revised.clientState.worldRooms?.map((entry) => entry.id)).toContain(room.id);
    replica.hydrate(assembler.apply(revised));
    expect(replica.game.getCurrentRoom().layout[4][4]).toBe('#');
    expect(replace).not.toHaveBeenCalled();
    game.setFlag('performance.previousWorld', true);
    replica.hydrate(assembler.apply(wireDelta(encoder, await session.getConnectionSnapshot(id))));
    expect(replica.game.getFlag('performance.previousWorld')).toBe(true);
    game.reset({ preserveRunSeed: true });
    const reset = wireDelta(encoder, await session.getConnectionSnapshot(id));
    replica.hydrate(assembler.apply(reset));
    expect(replace).toHaveBeenCalledTimes(1);
    expect(replica.game.peekCachedRoom('3,0,0')).toBeUndefined();
    expect(replica.game.getFlag('performance.previousWorld')).toBeUndefined();
  });

  it('coalesces multiple clocks/commands to a 10 Hz wire tick and keeps payloads independent of exploration history', async () => {
    const { game, session } = setup();
    for (let index = 20; index < 100; index++) game.getRoom(`${index},20,0`);
    const legacyBytes = Buffer.byteLength(
      JSON.stringify({ ...game.getSnapshot(), clientState: game.getSceneClientState() }),
    );
    const project = vi.spyOn(game, 'getSceneClientState');
    const server = createGameServer(session);
    const port = await server.listen(0);
    cleanup.push(() => server.close());
    const socket = new WebSocket(`ws://127.0.0.1:${port}/game`);
    cleanup.push(() => socket.close());
    const messages: ServerMessage[] = [];
    socket.on('message', (raw) => messages.push(parseServerMessage(raw.toString())));
    await vi.waitFor(() =>
      expect(messages.some((message) => message.type === 'welcome')).toBe(true),
    );
    const welcome = messages.find(
      (message): message is Extract<ServerMessage, { type: 'welcome' }> =>
        message.type === 'welcome',
    )!;
    expect(welcome.snapshot.clientState!.worldRooms.length).toBeLessThanOrEqual(9);
    expect(Buffer.byteLength(JSON.stringify(welcome))).toBeLessThan(legacyBytes / 4);
    await session.executeCommand({
      type: 'playerInteraction',
      playerId: welcome.playerId,
      mode: 'paused',
    });
    session.start((error) => {
      throw error;
    });
    await new Promise((resolve) => setTimeout(resolve, 550));
    session.stop();
    const deltas = messages.filter(
      (message): message is Extract<ServerMessage, { type: 'delta' }> => message.type === 'delta',
    );
    expect(deltas.length).toBeGreaterThanOrEqual(3);
    expect(deltas.length).toBeLessThanOrEqual(7);
    expect(
      deltas.every((message) => (message.delta.clientState.worldRooms?.length ?? 0) === 0),
    ).toBe(true);
    expect(deltas.every((message) => message.delta.clientState.flags === undefined)).toBe(true);
    expect(project.mock.calls.every(([ids]) => ids !== undefined && ids.length <= 9)).toBe(true);
    const report = server.getPerformance();
    expect(report.knownRooms).toBeGreaterThanOrEqual(81);
    expect(report.connectedPlayers).toBe(1);
    expect(report.snapshotPayloads).toBeGreaterThanOrEqual(4);
    expect(report.maximumPayloadBytes).toBeLessThan(legacyBytes / 4);
    expect(report.snapshotBuildMs).toBeGreaterThan(0);
    expect(report.averageActorTickMs).toBeGreaterThan(0);
  });

  it('does not invalidate unchanged populated town geometry on every actor tick', async () => {
    const { game, room, session } = setup();
    room.town = createPhysicalHumanTown({
      townId: 'perf-town',
      biomeId: 'verdigris-basin',
      seed: 712,
      districtRoomIds: { [room.id]: 'square' },
      entranceRoomId: room.id,
      exitRoomIds: [],
    });
    session.configureHosting();
    const id = session.registerConnection('wire', 'Alice');
    await session.executeCommand({ type: 'playerInteraction', playerId: id, mode: 'paused' });
    await session.advance(100);
    const encoder = new SnapshotDeltaEncoder();
    encoder.encode(await session.getConnectionSnapshot(id));
    await session.advance(100);
    const delta = wireDelta(encoder, await session.getConnectionSnapshot(id));
    expect(delta.clientState.worldRooms).toEqual([]);
    expect(game.getCurrentRoom().town?.id).toBe('perf-town');
  });

  it('advances distant schedules logically without generating travel rooms or scanning travelers on every tick', async () => {
    const { game, session } = setup();
    session.configureHosting();
    session.registerConnection('wire', 'Alice');
    const actors = game.getActorSystem();
    for (let index = 0; index < 400; index++) {
      const actor = createBaseActor({
        id: `distant-${index}`,
        displayName: 'Commuter',
        kind: 'civilian',
        role: 'resident',
        species: 'human',
        thickness: 'thin',
        currentRoomId: '100,100,0',
      });
      actor.flags.promoted = index === 0;
      actor.goal = {
        kind: 'sleep',
        priority: 10,
        roomId: '103,100,0',
        targetPosition: { x: 4, y: 4 },
      };
      actor.presence = { roomId: '100,100,0', position: { x: 10, y: 10 }, materialized: false };
      actors.registry.upsert(actor);
    }
    const count = game.getServerSimulationGauges().knownRooms;
    const work = vi.spyOn(actors.registry, 'getForWork');
    for (let step = 1; step <= 20; step++) {
      game.setFlag('timeMs', step * 100);
      await session.actorClockStep(100);
      if (step === 1) expect(actors.getActorsInRoom('101,100,0').length).toBeLessThanOrEqual(128);
    }
    expect(actors.getActor('distant-0')!.currentRoomId).toBe('101,100,0');
    expect(work.mock.calls.filter(([kind]) => kind === 'travel')).toHaveLength(1);
    for (const time of [5100, 10100])
      for (let batch = 0; batch < 4; batch++) {
        game.setFlag('timeMs', time + batch * 100);
        await session.actorClockStep(100);
      }
    expect(actors.getActor('distant-0')).toMatchObject({
      currentRoomId: '103,100,0',
      presence: { materialized: false, position: { x: 4, y: 4 } },
      activity: { kind: 'sleeping' },
    });
    expect(game.getServerSimulationGauges().knownRooms).toBe(count);
  });
  it('keeps nearby and promoted travelers precise at reduced frequency', async () => {
    const { game, session } = setup();
    session.configureHosting();
    session.registerConnection('wire', 'Alice');
    const actors = game.getActorSystem();
    for (const [id, roomId, destination, important] of [
      ['nearby', '1,0,0', '2,0,0', false],
      ['important', '3,0,0', '4,0,0', true],
    ] as const) {
      const room = game.getRoom(roomId);
      room.layout = room.layout.map((row) => '.'.repeat(row.length));
      const actor = createBaseActor({
        id,
        displayName: 'Traveler',
        kind: 'civilian',
        role: 'resident',
        species: 'human',
        thickness: 'thin',
        currentRoomId: roomId,
      });
      actor.goal = {
        kind: 'work',
        priority: 10,
        roomId: destination,
        targetPosition: { x: 4, y: 4 },
      };
      actor.flags.promoted = important;
      actor.presence = { roomId, position: { x: 10, y: 10 }, materialized: false };
      actors.registry.upsert(actor);
    }
    game.setFlag('timeMs', 100);
    await session.actorClockStep(100);
    const near = actors.getActor('nearby')!.presence!;
    const important = actors.getActor('important')!.presence!;
    expect(near.roomId).toBe('1,0,0');
    expect(near.position).not.toEqual({ x: 10, y: 10 });
    expect(important.roomId).toBe('3,0,0');
    expect(important.position).not.toEqual({ x: 10, y: 10 });
    game.setFlag('timeMs', 200);
    await session.actorClockStep(100);
    expect(actors.getActor('nearby')!.presence).toEqual(near);
    expect(actors.getActor('important')!.presence).toEqual(important);
    game.setFlag('timeMs', 600);
    await session.actorClockStep(100);
    expect(actors.getActor('nearby')!.presence!.position).not.toEqual(near.position);
    expect(actors.getActor('important')!.presence!.position).not.toEqual(important.position);
  });

  it('runs one full body pass per occupied room even when players share a room', async () => {
    const { game, session, room } = setup();
    session.configureHosting();
    const alice = session.registerConnection('alice', 'Alice');
    const bob = session.registerConnection('bob', 'Bob');
    const cara = session.registerConnection('cara', 'Cara');
    const other = game.getRoom('2,0,0');
    other.layout = other.layout.map((row) => '.'.repeat(row.length));
    const actors = game.getActorSystem();
    for (const roomId of [room.id, other.id]) {
      const actor = createBaseActor({
        id: `full-${roomId}`,
        displayName: 'Walker',
        kind: 'civilian',
        role: 'resident',
        species: 'human',
        thickness: 'thin',
        currentRoomId: roomId,
      });
      actor.brainId = 'none';
      actor.goal = { kind: 'work', priority: 10, roomId, targetPosition: { x: 22, y: 15 } };
      actor.presence = { roomId, position: { x: 20, y: 15 }, materialized: false };
      actors.registry.upsert(actor);
    }
    game.runForPlayer(alice, () => {
      game.handlePlayerRoomTransition(room.id, other.id, {
        mode: 'snake',
        direction: { x: 1, y: 0 },
      });
      game.handlePlayerRoomTransition(other.id, room.id, {
        mode: 'snake',
        direction: { x: 1, y: 0 },
      });
      game.placeSnakeBodyAtLocal(room.id, { x: 3, y: 3 }, { x: 1, y: 0 });
    });
    game.runForPlayer(bob, () =>
      game.placeSnakeBodyAtLocal(room.id, { x: 10, y: 4 }, { x: 1, y: 0 }),
    );
    game.runForPlayer(cara, () => {
      game.handlePlayerRoomTransition(room.id, other.id, {
        mode: 'snake',
        direction: { x: 1, y: 0 },
      });
      game.placeSnakeBodyAtLocal(other.id, { x: 3, y: 3 }, { x: 1, y: 0 });
    });
    const presence = vi.spyOn(actors, 'setPresence');
    const tickBefore = actors.getTickCount();
    await session.actorClockStep(100);
    expect(actors.getTickCount()).toBe(tickBefore + 1);
    for (const roomId of [room.id, other.id]) {
      expect(
        presence.mock.calls.filter(
          ([id, , reason]) => id === `full-${roomId}` && reason === 'actor-body-moved',
        ),
      ).toHaveLength(1);
      expect(actors.getActor(`full-${roomId}`)!.presence!.position).toEqual({ x: 21, y: 15 });
    }
    expect(session.getPerformanceReport()).toMatchObject({
      materializedRooms: 2,
      connectedPlayers: 3,
    });
  });
  it('replicates checkpoint changes once and omits authority-only population archives from scene flags', async () => {
    let saved: GameSaveData | null = null;
    const { game, session } = setup({
      load: async () => saved,
      save: async (_slot, data) => {
        saved = data;
      },
      clear: async () => {
        saved = null;
      },
      has: async () => saved !== null,
    });
    session.configureHosting();
    const id = session.registerConnection('owner', 'Owner', {
      playerId: game.getLocalPlayerId(),
      admin: true,
    });
    game.setFlag('actors.save', game.getActorSystem().registry.toSaveData());
    expect(await session.executeCommand({ type: 'saveGame', playerId: id })).toMatchObject({
      saved: true,
    });
    const initial = copyGameSnapshot(await session.getConnectionSnapshot(id));
    expect(initial.clientState!.flags['actors.save']).toBeUndefined();
    const assembler = new SnapshotDeltaAssembler();
    assembler.reset(initial);
    const encoder = new SnapshotDeltaEncoder();
    encoder.encode(await session.getConnectionSnapshot(id));
    const unchanged = wireDelta(encoder, await session.getConnectionSnapshot(id));
    expect(unchanged.state.persistence).toBeUndefined();
    expect(assembler.apply(unchanged).persistence?.checkpoint).toEqual(
      initial.persistence?.checkpoint,
    );
    game.addScore(1);
    await session.executeCommand({ type: 'saveGame', playerId: id });
    const revised = wireDelta(encoder, await session.getConnectionSnapshot(id));
    expect(revised.state.persistence?.checkpoint?.score).toBe(game.getScore());
    assembler.apply(revised);
    await session.executeCommand({ type: 'clearSave', playerId: id });
    const removed = wireDelta(encoder, await session.getConnectionSnapshot(id));
    expect(removed.state.persistence?.checkpoint).toBeNull();
    expect(assembler.apply(removed).persistence?.checkpoint).toBeNull();
  });
  it('settles overdue far business schedules without materializing or generating their destinations', async () => {
    const { game, session } = setup();
    expect(
      game.loadFromSaveData({
        ...game.getSaveData(),
        atmosphere: { ...game.getAtmosphereState(), dayPhase: 'day', phaseProgress: 0.99 },
      }),
    ).toBe(true);
    session.configureHosting();
    session.registerConnection('wire', 'Alice');
    const actor = createBaseActor({
      id: 'far-mapper',
      displayName: 'Mapper',
      kind: 'civilian',
      role: 'mapper',
      species: 'human',
      thickness: 'thin',
      currentRoomId: '100,100,0',
    });
    actor.goal = {
      kind: 'work',
      priority: 10,
      roomId: '103,100,0',
      targetPosition: { x: 4, y: 4 },
    };
    actor.presence = { roomId: '100,100,0', position: { x: 10, y: 10 }, materialized: false };
    game.getActorSystem().registry.upsert(actor);
    const count = game.getServerSimulationGauges().knownRooms;
    game.setFlag('timeMs', 6000);
    await session.actorClockStep(100);
    expect(game.getActorSystem().getActor(actor.id)).toMatchObject({
      currentRoomId: '103,100,0',
      presence: { materialized: false, position: { x: 4, y: 4 } },
      activity: { kind: 'mapping' },
    });
    expect(game.getServerSimulationGauges().knownRooms).toBe(count);
  });
});
