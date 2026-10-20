import type { SaveStore } from '../../storage/SaveStore.js';
import type { GameSaveData } from '../../game/saveTypes.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WebSocket } from 'ws';
import { SnakeGame } from '../../game/snakeGame.js';
import { defaultGameConfig } from '../../config/gameConfig.js';
import { QuestRegistry } from '../../quests/questRegistry.js';
import { AuthoritativeGameSession } from '../../session/AuthoritativeGameSession.js';
import { WebSocketGameConnection } from '../../session/WebSocketGameConnection.js';
import { parseClientDiagnostic } from '../../session/ClientDiagnostic.js';
import type { SessionDiagnostic } from '../../session/SessionDiagnostic.js';
import { createGameServer } from '../createGameServer.js';
import type { Duplex } from 'node:stream';

const cleanup: Array<() => void | Promise<void>> = [];
afterEach(async () => {
  for (const close of cleanup.splice(0).reverse()) await close();
  vi.restoreAllMocks();
  vi.useRealTimers();
});
async function setup(saveStore?: SaveStore<GameSaveData>) {
  const game = new SnakeGame(
    { ...defaultGameConfig, rng: { seed: 'diagnostic-server' } },
    new QuestRegistry(),
  );
  game.reset();
  game.bosses.clearAll();
  const session = new AuthoritativeGameSession({ game, manageBasicFeatures: true, saveStore });
  const records: SessionDiagnostic[] = [];
  const server = createGameServer(session, { onDiagnostic: (record) => records.push(record) });
  const port = await server.listen(0);
  cleanup.push(() => server.close());
  return { game, session, records, server, url: `ws://127.0.0.1:${port}/game` };
}

describe('operational server logging', () => {
  it('correlates a real client loss, suspension, resume and browser diagnostic without logging credentials', async () => {
    const { records, server, url } = await setup();
    const wires: Duplex[] = [];
    server.http.on('upgrade', (_request, socket) => wires.push(socket));
    const client = new WebSocketGameConnection(url, 'A name that should not be logged');
    cleanup.push(() => client.disconnect());
    await client.ready;
    const connectionId = client.connectionId;
    const playerId = client.playerId;
    expect(records).toContainEqual(
      expect.objectContaining({
        event: 'connection.ready',
        fields: expect.objectContaining({ connectionId, playerId }),
      }),
    );
    wires[0].destroy();
    await vi.waitFor(() =>
      expect(records.some((record) => record.event === 'player.suspended')).toBe(true),
    );
    await vi.waitFor(() => expect(client.connectionId).not.toBe(connectionId));
    await vi.waitFor(() =>
      expect(records.some((record) => record.event === 'client.connection-lost')).toBe(true),
    );
    expect(records).toContainEqual(
      expect.objectContaining({
        event: 'connection.closed',
        fields: expect.objectContaining({
          connectionId,
          code: 1006,
          cause: 'abnormal-transport-close',
        }),
      }),
    );
    expect(records).toContainEqual(
      expect.objectContaining({
        event: 'player.attached',
        fields: expect.objectContaining({ playerId, resumedWithinGrace: true }),
      }),
    );
    const raw = JSON.stringify(records);
    expect(raw).not.toContain('A name that should not be logged');
    expect(raw).not.toContain('resumeToken');
    expect(raw).not.toContain('hostToken');
  });

  it('reports malformed hello close causes even before a player was attached', async () => {
    const { records, url } = await setup();
    const socket = new WebSocket(`${url}?prediction=1&hostToken=keep-this-private`);
    cleanup.push(() => socket.terminate());
    socket.once('open', () => socket.send('{}'));
    await new Promise((resolve) => socket.once('close', resolve));
    expect(records).toContainEqual(
      expect.objectContaining({
        event: 'connection.closed',
        fields: expect.objectContaining({ code: 1008, cause: 'invalid-resume-hello' }),
      }),
    );
    expect(JSON.stringify(records)).not.toContain('keep-this-private');
  });

  it('periodically reports real world/transport/process gauges without publishing gameplay diagnostics to clients', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    const { session, records, url } = await setup();
    const client = new WebSocketGameConnection(url);
    cleanup.push(() => client.disconnect());
    await client.ready;
    await session.advance(100);
    const events: string[] = [];
    client.onEvent((event) => events.push(event.type));
    await vi.advanceTimersByTimeAsync(10000);
    const sample = records.find((record) => record.event === 'performance.sample');
    expect(sample?.fields).toMatchObject({
      connectedPlayers: 1,
      attachedSockets: 1,
      pendingAttachments: 0,
      rssBytes: expect.any(Number),
      cpuPercent: expect.any(Number),
      eventLoopMaxMs: expect.any(Number),
      maximumQueueWaitMs: expect.any(Number),
      maximumPublicationMs: expect.any(Number),
    });
    expect(Number(sample?.fields?.rssBytes)).toBeGreaterThan(0);
    expect(
      events.some((event) => event.startsWith('connection.') || event.startsWith('performance.')),
    ).toBe(false);
    const report = session.getPerformanceReport();
    expect(report).toMatchObject({ connectedPlayers: 1, suspendedPlayers: 0 });
    expect(report.maximumSnapshotBuildMs).toBeGreaterThanOrEqual(0);
    expect(records.some((record) => record.event === 'server.listening')).toBe(true);
  });

  it('records replay rejection reasons and leaves queue accounting balanced', async () => {
    const { session, game, records } = await setup();
    const id = game.getLocalPlayerId();
    await session.attachConnection('diagnostic-wire', 'Alice', { playerId: id, admin: false });
    await session.suspendConnection('diagnostic-wire');
    await session.attachConnection(
      'replacement',
      'Alice',
      { playerId: id, admin: false },
      {
        connectionId: 'diagnostic-wire',
        baseRevision: 999,
        steps: 1,
        elapsedMs: 100,
        inputs: [],
      },
    );
    expect(records).toContainEqual(
      expect.objectContaining({
        event: 'movement.replay',
        fields: expect.objectContaining({
          reason: 'revision-mismatch',
          requestedSteps: 1,
          replayedSteps: 0,
        }),
      }),
    );
    const report = session.getQueueDiagnostics();
    expect(report.pendingOperations).toBe(0);
    expect(report.activeOperation).toBeNull();
    expect(report.maximumQueueWaitMs).toBeGreaterThanOrEqual(0);
    expect(report.maximumOperationMs).toBeGreaterThanOrEqual(0);
  });

  it('identifies an in-flight save and reports operations waiting behind it', async () => {
    let release = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const { session, game, records } = await setup({
      load: async () => null,
      has: async () => false,
      clear: async () => {},
      save: async () => gate,
    });
    const id = game.getLocalPlayerId();
    await session.attachConnection('save-wire', 'Alice', { playerId: id, admin: true });
    const saving = session.executeCommand({ type: 'saveGame', playerId: id });
    try {
      await vi.waitFor(() =>
        expect(session.getQueueDiagnostics().activeOperation).toBe('command:saveGame'),
      );
      const advancing = session.advance(20);
      expect(session.getQueueDiagnostics().pendingOperations).toBe(2);
      const later = performance.now() + 600;
      vi.spyOn(performance, 'now').mockReturnValue(later);
      release();
      await Promise.all([saving, advancing]);
      expect(records).toContainEqual(
        expect.objectContaining({
          event: 'session.slow-operation',
          fields: expect.objectContaining({ operation: 'command:saveGame' }),
        }),
      );
      expect(session.getQueueDiagnostics().maximumQueueWaitMs).toBeGreaterThan(500);
      expect(session.getQueueDiagnostics().maximumOperationMs).toBeGreaterThan(500);
    } finally {
      release();
      await saving;
    }
  });

  it('records a real browser transport command timeout while an authoritative save is waiting', async () => {
    let release = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const { session, records, url } = await setup({
      load: async () => null,
      has: async () => false,
      clear: async () => {},
      save: async () => gate,
    });
    const client = new WebSocketGameConnection(url);
    cleanup.push(() => client.disconnect());
    await client.ready;
    const id = client.playerId!;
    session.registerConnection(client.connectionId!, 'Owner', { playerId: id, admin: true });
    const saving = session.executeCommand({ type: 'saveGame', playerId: id });
    try {
      await vi.waitFor(() =>
        expect(session.getQueueDiagnostics().activeOperation).toBe('command:saveGame'),
      );
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      const received = vi.spyOn(session, 'executeCommand');
      const result = client
        .send({ type: 'setDirection', playerId: id, direction: { x: 0, y: 1 } })
        .catch((error: unknown) => error);
      await vi.waitFor(() =>
        expect(received).toHaveBeenCalledWith({
          type: 'setDirection',
          playerId: id,
          direction: { x: 0, y: 1 },
        }),
      );
      await vi.advanceTimersByTimeAsync(10001);
      expect(await result).toBeInstanceOf(Error);
      expect(await result).toMatchObject({ message: 'Game command timed out' });
      await vi.waitFor(() =>
        expect(records).toContainEqual(
          expect.objectContaining({
            event: 'client.command-timeout',
            fields: expect.objectContaining({
              playerId: id,
              commandType: 'setDirection',
              source: 'client',
            }),
          }),
        ),
      );
    } finally {
      vi.useRealTimers();
      release();
      await saving;
      await session.flush();
    }
  });

  it('accepts only bounded client diagnostics and strips all additional client-supplied data', () => {
    const value = {
      type: 'clientDiagnostic',
      event: 'command-timeout',
      previousConnectionId: 'old-wire',
      snapshotAgeMs: 1234,
      pendingCommands: 1,
      requestId: 7,
      commandType: 'saveGame',
      password: 'private',
      claimedPlayerId: 'someone-else',
    };
    expect(parseClientDiagnostic(JSON.stringify(value))).toEqual({
      type: 'clientDiagnostic',
      event: 'command-timeout',
      previousConnectionId: 'old-wire',
      snapshotAgeMs: 1234,
      pendingCommands: 1,
      requestId: 7,
      commandType: 'saveGame',
      closeCode: undefined,
    });
    expect(parseClientDiagnostic(JSON.stringify({ ...value, event: 'arbitrary-text' }))).toBeNull();
    expect(parseClientDiagnostic(JSON.stringify({ ...value, pendingCommands: -1 }))).toBeNull();
    expect(parseClientDiagnostic(JSON.stringify({ ...value, snapshotAgeMs: Infinity }))).toBeNull();
  });
});
