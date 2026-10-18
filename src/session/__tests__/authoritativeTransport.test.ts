import { afterEach, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import { AuthoritativeGameSession } from '../AuthoritativeGameSession.js';
import { LocalGameConnection } from '../LocalGameConnection.js';
import { WebSocketGameConnection } from '../WebSocketGameConnection.js';
import { SceneGameBridge } from '../SceneGameBridge.js';
import { parseCommandMessage } from '../gameProtocol.js';
import { createGameServer } from '../../server/createGameServer.js';
import { defaultGameConfig } from '../../config/gameConfig.js';
import { QuestRegistry } from '../../quests/questRegistry.js';
import { SnakeGame } from '../../game/snakeGame.js';
import type { GameSnapshot } from '../GameSnapshot.js';
import type { GameSaveData } from '../../game/saveTypes.js';
import type { SaveStore } from '../../storage/SaveStore.js';

const cleanups: Array<() => void | Promise<void>> = [];
afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup();
});

async function createSession(saveStore?: SaveStore<GameSaveData>) {
  return AuthoritativeGameSession.create({
    config: { ...defaultGameConfig, rng: { seed: 'authoritative-transport' } },
    saveStore,
  });
}

describe('authoritative transport', () => {
  it('applies core apple rewards and bonus/hunger hooks without registering a scene feature', async () => {
    const game = new SnakeGame(
      { ...defaultGameConfig, rng: { seed: 'headless-apple-hooks' } },
      new QuestRegistry(),
    );
    game.reset();
    const room = game.getCurrentRoom();
    room.layout = room.layout.map((row) => '.'.repeat(row.length));
    const apple = game.getApple(room.id)!;
    const direction = apple.position.x >= 3 ? { x: 1, y: 0 } : { x: -1, y: 0 };
    game.placeSnakeBodyAtLocal(
      room.id,
      { x: apple.position.x - direction.x, y: apple.position.y },
      direction,
    );
    game.setFlag('bonusActive', true);
    const session = new AuthoritativeGameSession({ game, manageBasicFeatures: true });
    await session.advance(100);
    expect(game.getFlag('applesEaten')).toBe(1);
    expect(game.getFlag('bonusActive')).toBe(false);
    expect(game.getFlag('timeSinceEat')).toBe(0);
    expect(session.getSnapshot().players['player-1'].score).toBeGreaterThanOrEqual(5);
  });

  it('loads production quests in a plain headless runtime and isolates registry membership', async () => {
    const first = new QuestRegistry();
    const second = new QuestRegistry();
    await first.loadBuiltIns();
    await second.loadBuiltIns();
    expect(first.getById('eat-5-apples')).toBeDefined();
    expect(first.getAll().length).toBeGreaterThan(40);
    first.clear();
    expect(second.getById('eat-5-apples')).toBeDefined();
  });

  it('rejects malformed commands, arbitrary methods, and injected creation modifiers', () => {
    for (const command of [
      { type: 'setFlag', playerId: 'player-1', key: 'cheat', value: true },
      { type: 'setDirection', playerId: 'player-1', direction: { x: 1, y: 1 } },
      { type: 'forceDirection', playerId: 'player-1', direction: { x: 0.5, y: 0.5 } },
      { type: 'saveGame', playerId: 'player-1', classChoice: { mods: { speed: 999 } } },
    ]) {
      expect(parseCommandMessage(JSON.stringify({ type: 'command', id: 1, command }))).toBeNull();
    }
    expect(parseCommandMessage('{')).toBeNull();
  });

  it('owns clocks, honors pause, and publishes detached snapshots through a local bridge', async () => {
    const session = await createSession();
    const connection = new LocalGameConnection(session, (command) =>
      session.executeCommand(command),
    );
    const bridge = new SceneGameBridge(connection);
    cleanups.push(() => bridge.destroy());
    const playerId = bridge.getLocalPlayerId();
    const original = bridge.getCurrentRoom().layout[0];
    bridge.getCurrentRoom().layout[0] = 'corrupted-client-copy';
    expect(session.getSnapshot().viewport.rooms[bridge.getCurrentRoom().id].room.layout[0]).toBe(
      original,
    );
    await bridge.send({ type: 'pause', playerId });
    const before = bridge.getSnapshot().tick;
    await session.advance(100);
    expect(session.getSnapshot().tick).toBe(before);
    await bridge.send({ type: 'resume', playerId });
    await session.advance(100);
    expect(bridge.getSnapshot().tick).toBe(before + 100);
    expect(bridge.getSnapshot()).toEqual(session.getSnapshot());
  });

  it('keeps public refresh reads detached after unobserved headless clock steps', async () => {
    const session = await createSession();
    await session.advance(100);
    const snapshot = session.refreshSnapshot();
    const roomId = snapshot.viewport.centerRoomId;
    const original = snapshot.viewport.rooms[roomId].room.layout[0];
    snapshot.viewport.rooms[roomId].room.layout[0] = 'client-copy';
    expect(session.getSnapshot().viewport.rooms[roomId].room.layout[0]).toBe(original);
  });

  it('attaches two clients to one world and acknowledges commands after authoritative publication', async () => {
    const session = await createSession();
    const server = createGameServer(session);
    const port = await server.listen(0);
    cleanups.push(() => server.close());
    const first = new WebSocketGameConnection(`ws://127.0.0.1:${port}/game`, 'Alice');
    const second = new WebSocketGameConnection(`ws://127.0.0.1:${port}/game`, 'Bob');
    cleanups.push(
      () => first.disconnect(),
      () => second.disconnect(),
    );
    const firstBridge = new SceneGameBridge(first);
    const secondBridge = new SceneGameBridge(second);
    await Promise.all([first.ready, second.ready]);
    await vi.waitFor(() =>
      expect(Object.keys(firstBridge.getSnapshot().connections ?? {})).toHaveLength(2),
    );
    expect(first.connectionId).not.toBe(second.connectionId);
    expect(first.playerId).not.toBe(second.playerId);
    expect(firstBridge.getSnapshot().players[first.playerId!].body).not.toEqual(
      firstBridge.getSnapshot().players[second.playerId!].body,
    );
    expect(firstBridge.getSnapshot().viewport).toEqual(secondBridge.getSnapshot().viewport);
    expect(
      Object.values(firstBridge.getSnapshot().connections ?? {})
        .map((peer) => peer.displayName)
        .sort(),
    ).toEqual(['Alice', 'Bob']);
    const nextSnapshot = new Promise<GameSnapshot>((resolve) => {
      const unsubscribe = second.onSnapshot((snapshot) => {
        if (snapshot.players[first.playerId!].direction.y === -1) {
          unsubscribe();
          resolve(snapshot);
        }
      });
    });
    expect(
      await first.send({
        type: 'forceDirection',
        playerId: 'forged-player',
        direction: { x: 0, y: -1 },
      }),
    ).toEqual({ ok: true });
    await nextSnapshot;
    expect(firstBridge.getDirection()).toEqual({ x: 0, y: -1 });
    expect(secondBridge.getDirection()).toEqual({ x: 1, y: 0 });
    expect(secondBridge.getSnapshot().players[first.playerId!].body).toEqual(
      firstBridge.getSnapshot().players[first.playerId!].body,
    );
    const tick = firstBridge.getSnapshot().tick;
    await session.advance(100);
    // A subsequent acknowledged command acts as an ordered transport barrier.
    await first.send({ type: 'pause', playerId: first.playerId! });
    expect(firstBridge.getSnapshot().tick).toBe(tick + 100);
    expect(firstBridge.getSnapshot()).toEqual(session.getSnapshot());
    second.disconnect();
    await vi.waitFor(() =>
      expect(
        Object.values(firstBridge.getSnapshot().connections ?? {}).map((peer) => peer.displayName),
      ).toEqual(['Alice']),
    );
  });

  it('closes malformed peers without interrupting the authority', async () => {
    const session = await createSession();
    const server = createGameServer(session);
    const port = await server.listen(0);
    cleanups.push(() => server.close());
    const socket = new WebSocket(`ws://127.0.0.1:${port}/game`);
    const closed = new Promise<number>((resolve) => socket.on('close', resolve));
    await new Promise<void>((resolve) => socket.on('open', resolve));
    socket.send('{');
    expect(await closed).toBe(1008);
    const healthy = new WebSocketGameConnection(`ws://127.0.0.1:${port}/game`);
    cleanups.push(() => healthy.disconnect());
    await healthy.ready;
    await session.advance(100);
    expect(session.getSnapshot().tick).toBe(100);
  });

  it('serializes persistence with commands and recovers the work queue after a failed write', async () => {
    let checkpoint: GameSaveData | null = null;
    let fail = true;
    const store: SaveStore<GameSaveData> = {
      async save(_slot, data) {
        if (fail) throw new Error('disk full');
        checkpoint = structuredClone(data);
      },
      async load() {
        return checkpoint;
      },
      async clear() {
        checkpoint = null;
      },
      async has() {
        return checkpoint !== null;
      },
    };
    const session = await createSession(store);
    const playerId = session.getSnapshot().localPlayerId;
    await expect(session.executeCommand({ type: 'saveGame', playerId })).rejects.toThrow(
      'disk full',
    );
    fail = false;
    expect(await session.executeCommand({ type: 'saveGame', playerId })).toEqual({
      ok: true,
      saved: true,
    });
    await session.advance(100);
    expect(await session.executeCommand({ type: 'loadGame', playerId })).toEqual({
      ok: true,
      loaded: true,
    });
    expect(session.getSnapshot().tick).toBe(0);
    expect(await session.executeCommand({ type: 'clearSave', playerId })).toEqual({
      ok: true,
      cleared: true,
    });
    expect(await session.hasSave()).toBe(false);
  });
});
