import { afterEach, describe, expect, it, vi } from 'vitest';
import { WebSocket } from 'ws';
import type { Duplex } from 'node:stream';
import { SnakeGame } from '../../game/snakeGame.js';
import { defaultGameConfig } from '../../config/gameConfig.js';
import { QuestRegistry } from '../../quests/questRegistry.js';
import { AuthoritativeGameSession } from '../AuthoritativeGameSession.js';
import { createGameServer } from '../../server/createGameServer.js';
import { parseServerMessage, type ServerMessage } from '../gameProtocol.js';
import { WebSocketGameConnection } from '../WebSocketGameConnection.js';
import { SceneGameClient } from '../SceneGameClient.js';

const cleanups: Array<() => void | Promise<void>> = [];
afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup();
});
async function setup() {
  const game = new SnakeGame(
    { ...defaultGameConfig, rng: { seed: 'persistent-crew' } },
    new QuestRegistry(),
  );
  game.reset();
  game.bosses.clearAll();
  const room = game.getCurrentRoom();
  room.layout = room.layout.map((row) => '.'.repeat(row.length));
  const session = new AuthoritativeGameSession({ game, manageBasicFeatures: true });
  const server = createGameServer(session, { hostToken: 'owner-key-separate-from-identity' });
  const port = await server.listen(0);
  cleanups.push(() => server.close());
  return { game, session, server, url: `ws://127.0.0.1:${port}/game` };
}
async function join(url: string, params: Record<string, string> = {}) {
  const endpoint = new URL(url);
  for (const [key, value] of Object.entries(params)) endpoint.searchParams.set(key, value);
  const socket = new WebSocket(endpoint);
  const messages: ServerMessage[] = [];
  cleanups.push(() => socket.close());
  socket.on('message', (data) => messages.push(parseServerMessage(data.toString())));
  await vi.waitFor(() => expect(messages.some((message) => message.type === 'welcome')).toBe(true));
  const welcome = messages.find(
    (message): message is Extract<ServerMessage, { type: 'welcome' }> => message.type === 'welcome',
  )!;
  return { socket, welcome, messages };
}

describe('persistent server crew', () => {
  it('resumes character state with an opaque private token, regardless of connection order', async () => {
    const { game, session, url } = await setup();
    const alice = await join(url, { name: 'Alice' });
    const bob = await join(url, { name: 'Bob' });
    const id = alice.welcome.playerId;
    game.runForPlayer(id, () => {
      game.setScore(123);
      game.getInventory().addItem('healing-potion', 2);
      game.setFlag('crew.test.progress', 42);
    });
    const body = session.getSnapshot(id).players[id].body;
    alice.socket.close();
    await vi.waitFor(() =>
      expect(
        Object.values(session.getSnapshot().connections ?? {}).some((peer) => peer.playerId === id),
      ).toBe(false),
    );
    await session.advance(100);
    expect(session.getSnapshot(id).players[id].body).toEqual(body);
    const stranger = await join(url, { name: 'Alice', resume: 'made-up-token' });
    expect(stranger.welcome.playerId).not.toBe(id);
    const resumed = await join(url, { name: 'Alice', resume: alice.welcome.resumeToken });
    expect(resumed.welcome.playerId).toBe(id);
    expect(resumed.welcome.connectionId).not.toBe(alice.welcome.connectionId);
    expect(resumed.welcome.resumeToken).toMatch(/^[a-f0-9]{64}$/);
    expect(resumed.welcome.snapshot.players[id]).toMatchObject({ score: 123, alive: true, body });
    expect(resumed.welcome.snapshot.ui.inventory?.['healing-potion']).toBe(2);
    expect(resumed.welcome.snapshot.clientState?.flags['crew.test.progress']).toBe(42);
    expect(JSON.stringify(bob.messages)).not.toContain(alice.welcome.resumeToken);
    const other = await setup();
    const unrelated = await join(other.url, { resume: alice.welcome.resumeToken });
    expect(unrelated.welcome.resumeToken).not.toBe(alice.welcome.resumeToken);
    expect(unrelated.welcome.snapshot.clientState?.flags['crew.test.progress']).toBeUndefined();
    expect(bob.messages).toContainEqual(
      expect.objectContaining({
        type: 'event',
        event: { type: 'party.presence', name: 'Alice', status: 'reconnected' },
      }),
    );
  });

  it('requires an explicit host key even for the primary or first guest and binds privileges to the current connection', async () => {
    const { session, url } = await setup();
    const first = await join(url, { name: 'Guest' });
    const id = first.welcome.playerId;
    expect(first.welcome.snapshot.permissions?.manageWorld).toBe(false);
    for (const type of ['pause', 'resume', 'saveGame', 'loadGame', 'clearSave'] as const)
      expect(await session.executeCommand({ type, playerId: id })).toMatchObject({ ok: false });
    const host = await join(url, { name: 'Owner', hostToken: 'owner-key-separate-from-identity' });
    expect(host.welcome.playerId).not.toBe(id);
    expect(host.welcome.snapshot.permissions?.manageWorld).toBe(true);
    expect(
      await session.executeCommand({ type: 'pause', playerId: host.welcome.playerId }),
    ).toEqual({ ok: true });
    first.socket.send(
      JSON.stringify({
        type: 'command',
        id: 777,
        command: { type: 'resume', playerId: host.welcome.playerId },
      }),
    );
    await vi.waitFor(() =>
      expect(first.messages).toContainEqual(
        expect.objectContaining({
          type: 'result',
          id: 777,
          result: expect.objectContaining({ ok: false }),
        }),
      ),
    );
    expect(session.getSnapshot().ui.paused).toBe(true);
    const resumedGuest = await join(url, { resume: host.welcome.resumeToken });
    expect(resumedGuest.welcome.playerId).toBe(host.welcome.playerId);
    expect(resumedGuest.welcome.snapshot.permissions?.manageWorld).toBe(false);
    expect(
      await session.executeCommand({ type: 'resume', playerId: host.welcome.playerId }),
    ).toMatchObject({ ok: false });
    await vi.waitFor(() => expect(host.socket.readyState).toBe(WebSocket.CLOSED));
    expect(
      Object.values(session.getSnapshot().connections ?? {}).filter(
        (peer) => peer.playerId === host.welcome.playerId,
      ),
    ).toHaveLength(1);
  });

  it('does not resurrect a dead character on resume and keeps emotes authoritative and expiring', async () => {
    const { game, session, url } = await setup();
    const alice = await join(url, { name: 'Alice' });
    const bob = await join(url, { name: 'Bob', hostToken: 'owner-key-separate-from-identity' });
    const id = alice.welcome.playerId;
    const owned = game.runForPlayer(id, () => game.getEmoticonState().owned[0]);
    expect(
      await session.executeCommand({ type: 'emote', playerId: id, emoticonId: 'not-owned' }),
    ).toMatchObject({ ok: false });
    expect(
      await session.executeCommand({ type: 'emote', playerId: id, emoticonId: owned }),
    ).toEqual({ ok: true });
    expect(session.getSnapshot(bob.welcome.playerId).players[id].activeEmoticon).toBe(owned);
    await vi.waitFor(() =>
      expect(
        bob.messages.some(
          (message) =>
            message.type === 'snapshot' && message.snapshot.players[id].activeEmoticon === owned,
        ),
      ).toBe(true),
    );
    expect(await session.executeCommand({ type: 'pause', playerId: bob.welcome.playerId })).toEqual(
      { ok: true },
    );
    const observedBeforeExpiry = bob.messages.length;
    await session.advance(5000);
    await vi.waitFor(() =>
      expect(
        bob.messages
          .slice(observedBeforeExpiry)
          .some(
            (message) =>
              message.type === 'snapshot' && message.snapshot.players[id].activeEmoticon === null,
          ),
      ).toBe(true),
    );
    expect(session.getSnapshot().players[id].activeEmoticon).toBeNull();
    game.getPlayer(id)!.alive = false;
    alice.socket.close();
    await vi.waitFor(() =>
      expect(
        Object.values(session.getSnapshot().connections ?? {}).some((peer) => peer.playerId === id),
      ).toBe(false),
    );
    const resumed = await join(url, { resume: alice.welcome.resumeToken });
    expect(resumed.welcome.snapshot.players[id].alive).toBe(false);
  });

  it('automatically reconnects the real client to the same snake without replaying actions', async () => {
    const { session, server, url } = await setup();
    const wires: Duplex[] = [];
    server.http.on('upgrade', (_request, socket) => wires.push(socket));
    const remote = new WebSocketGameConnection(url, 'Alice');
    cleanups.push(() => remote.disconnect());
    const client = new SceneGameClient(remote);
    await remote.ready;
    const id = remote.playerId;
    const connectionId = remote.connectionId;
    const statuses: string[] = [];
    remote.onStatus((status) => statuses.push(status));
    wires[0].destroy();
    await vi.waitFor(() => expect(statuses).toContain('reconnecting'));
    expect(await remote.send({ type: 'restartRun', playerId: id! })).toMatchObject({ ok: false });
    await vi.waitFor(() => expect(remote.connectionId).not.toBe(connectionId), { timeout: 4000 });
    expect(remote.playerId).toBe(id);
    expect(statuses[statuses.length - 1]).toBe('connected');
    expect(Object.values(client.getSnapshot().connections ?? {})).toHaveLength(1);
    expect(session.getSnapshot(id!).players[id!].alive).toBe(true);
  });
});
