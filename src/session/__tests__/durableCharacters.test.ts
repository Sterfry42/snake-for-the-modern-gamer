import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, basename } from 'node:path';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { WebSocket } from 'ws';
import { defaultGameConfig } from '../../config/gameConfig.js';
import { SnakeGame } from '../../game/snakeGame.js';
import { QuestRegistry } from '../../quests/questRegistry.js';
import { FileGameSaveStore } from '../../storage/FileGameSaveStore.js';
import { AuthoritativeGameSession } from '../AuthoritativeGameSession.js';
import { createGameServer } from '../../server/createGameServer.js';
import { SnapshotDeltaAssembler } from '../SnapshotDelta.js';
import { parseServerMessage, type ServerMessage } from '../gameProtocol.js';
import type { GameSnapshot } from '../GameSnapshot.js';
import type { ClientCommand, CommandResult } from '../ClientCommand.js';
import { isGameCheckpoint } from '../HostedCheckpoint.js';

const cleanup: Array<() => void | Promise<void>> = [];
afterEach(async () => {
  for (const close of cleanup.splice(0).reverse()) await close();
});

async function directory() {
  const path = await mkdtemp(join(tmpdir(), 'snake-durable-'));
  cleanup.push(async () => {
    if (
      dirname(resolve(path)) !== resolve(tmpdir()) ||
      !basename(path).startsWith('snake-durable-')
    )
      throw new Error('Unsafe temporary directory');
    await rm(path, { recursive: true, force: true });
  });
  return path;
}

async function joinServer(port: number, params: Record<string, string> = {}) {
  const url = new URL(`ws://127.0.0.1:${port}/game`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const socket = new WebSocket(url);
  cleanup.push(() => socket.terminate());
  const assembler = new SnapshotDeltaAssembler();
  let snapshot: GameSnapshot | undefined;
  let welcome: Extract<ServerMessage, { type: 'welcome' }> | undefined;
  const pending = new Map<number, (result: CommandResult) => void>();
  let request = 0;
  const publicMessages: string[] = [];
  socket.on('message', (data) => {
    const message = parseServerMessage(data.toString());
    if (message.type === 'welcome') {
      welcome = message;
      snapshot = message.snapshot;
      assembler.reset(snapshot);
    } else if (message.type === 'delta') snapshot = assembler.apply(message.delta);
    else if (message.type === 'result') {
      pending.get(message.id)?.(message.result);
      pending.delete(message.id);
    }
    if (message.type !== 'welcome') publicMessages.push(data.toString());
  });
  await vi.waitFor(() => expect(welcome).toBeDefined());
  const accepted = welcome;
  if (!accepted) throw new Error('Missing welcome');
  return {
    socket,
    welcome: accepted,
    publicMessages,
    snapshot: () => {
      if (!snapshot) throw new Error('Missing snapshot');
      return snapshot;
    },
    send(command: ClientCommand): Promise<CommandResult> {
      const id = ++request;
      const result = new Promise<CommandResult>((resolve) => pending.set(id, resolve));
      socket.send(JSON.stringify({ type: 'command', id, command }));
      return result;
    },
  };
}

describe('durable hosted characters', () => {
  it('recovers two created characters through a real Node server process restart', async () => {
    const path = await directory();
    const hostToken = 'process-restart-owner-key';
    async function launch(port = 0) {
      const child = spawn(process.execPath, ['--import', 'tsx', 'server/main.ts'], {
        windowsHide: true,
        env: {
          ...process.env,
          PORT: String(port),
          HOST: '127.0.0.1',
          SNAKE_SAVE_DIRECTORY: path,
          SNAKE_LOG_DIRECTORY: join(path, 'logs'),
          SNAKE_HOST_TOKEN: hostToken,
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      const exited = new Promise<void>((resolve) => child.once('exit', () => resolve()));
      const stop = async () => {
        if (child.exitCode === null && child.signalCode === null) child.kill();
        await exited;
      };
      cleanup.push(stop);
      const listening = await new Promise<number>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Child server did not start')), 10000);
        let output = '';
        const finish = () => clearTimeout(timeout);
        child.once('error', (error) => {
          finish();
          reject(error);
        });
        child.once('exit', () => {
          finish();
          reject(new Error(`Child server exited before listening: ${output}`));
        });
        child.stderr.on('data', (data) => {
          output = `${output}${String(data)}`.slice(-16000);
        });
        child.stdout.on('data', (data) => {
          output = `${output}${String(data)}`.slice(-16000);
          const match = /Listening at ws:\/\/127\.0\.0\.1:(\d+)\/game/.exec(output);
          if (match) {
            finish();
            resolve(Number(match[1]));
          }
        });
      });
      return { port: listening, stop };
    }
    const first = await launch();
    const owner = await joinServer(first.port, { name: 'Owner', hostToken });
    const guest = await joinServer(first.port, { name: 'Guest' });
    for (const client of [owner, guest]) {
      for (let choice = 0; choice < 3; choice++) {
        const state = client.snapshot().lifecycle;
        if (state?.kind !== 'creating') throw new Error('New process character skipped creation');
        expect(
          await client.send({
            type: 'characterCreationAction',
            playerId: client.welcome.playerId,
            stage: state.stage,
            optionId: state.offers[state.stage][0],
          }),
        ).toEqual({ ok: true });
      }
      expect(
        await client.send({
          type: 'playerInteraction',
          playerId: client.welcome.playerId,
          mode: 'paused',
        }),
      ).toEqual({ ok: true });
    }
    const ownerBefore = owner.snapshot();
    expect(
      await guest.send({
        type: 'cosmeticAction',
        playerId: guest.welcome.playerId,
        appearance: {
          themeId: 'midnight',
          activeHat: 'cowboy',
          renderStyle: 'sprite',
          palette: {
            baseColor: '#203040',
            bellyColor: '#8090a0',
            patternColor: '#102030',
            outlineColor: '#001020',
            eyeColor: '#ffffff',
          },
        },
      }),
    ).toEqual({ ok: true });
    const guestBefore = guest.snapshot();
    expect(await owner.send({ type: 'saveGame', playerId: owner.welcome.playerId })).toMatchObject({
      ok: true,
    });
    await first.stop();
    const second = await launch(first.port);
    const guestAgain = await joinServer(second.port, {
      name: 'Guest',
      resume: guest.welcome.resumeToken,
    });
    const ownerAgain = await joinServer(second.port, {
      name: 'Owner',
      resume: owner.welcome.resumeToken,
      hostToken,
    });
    for (const [client, before] of [
      [guestAgain, guestBefore],
      [ownerAgain, ownerBefore],
    ] as const) {
      expect(client.welcome.playerId).toBe(before.localPlayerId);
      expect(client.welcome.snapshot.players[before.localPlayerId].body).toEqual(
        before.players[before.localPlayerId].body,
      );
      expect(client.welcome.snapshot.ui.inventory).toEqual(before.ui.inventory);
      expect(client.welcome.snapshot.players[before.localPlayerId].appearance).toEqual(
        before.players[before.localPlayerId].appearance,
      );
      expect(client.welcome.snapshot.lives).toEqual(before.lives);
      expect(client.welcome.snapshot.clientState?.flags['religion.id']).toBe(
        before.clientState?.flags['religion.id'],
      );
      expect(client.welcome.snapshot.clientState?.flags['class.id']).toBe(
        before.clientState?.flags['class.id'],
      );
      expect(client.welcome.snapshot.lifecycle?.kind).toBe('active');
    }
    expect(guestAgain.snapshot().permissions?.manageWorld).toBe(false);
    expect(ownerAgain.snapshot().permissions?.manageWorld).toBe(true);
  }, 30000);

  it('cold-restores world and guests in reversed order without publishing ownership digests or private character records', async () => {
    const path = await directory();
    const store = new FileGameSaveStore(path);
    const game = new SnakeGame(
      { ...defaultGameConfig, rng: { seed: 'durable-world' } },
      new QuestRegistry(),
    );
    game.reset();
    game.bosses.clearAll();
    for (const roomId of ['0,0,0', '2,0,0', '3,0,0']) {
      const room = game.getRoom(roomId);
      room.layout = room.layout.map((row) => '.'.repeat(row.length));
      room.portals = [];
    }
    const session = new AuthoritativeGameSession({
      game,
      manageBasicFeatures: true,
      saveStore: store,
    });
    const server = createGameServer(session, { hostToken: 'durable-owner-separate-key' });
    const port = await server.listen(0);
    let open = true;
    cleanup.push(async () => {
      if (open) await server.close();
    });
    const host = await joinServer(port, { name: 'Host', hostToken: 'durable-owner-separate-key' });
    const bob = await joinServer(port, { name: 'Bob' });
    const carol = await joinServer(port, { name: 'Carol' });
    for (const [client, roomId, count] of [
      [bob, '2,0,0', 2],
      [carol, '3,0,0', 3],
    ] as const) {
      game.runForPlayer(client.welcome.playerId, () => {
        game.placeSnakeBodyAtLocal(roomId, { x: 10, y: 12 }, { x: 0, y: -1 });
        game.getInventory().addItem('healing-potion', count);
        game.setFlag('skills.extraLifeCharges', count);
        game.setFlag('custom.privateQuest', `${client.welcome.playerId}-secret`);
        game.setFlag('religion.id', 'christianity');
      });
    }
    game.getRoom('2,0,0').layout[3] = '#'.repeat(32);
    const bobBefore = session.getSnapshot(bob.welcome.playerId);
    const carolBefore = session.getSnapshot(carol.welcome.playerId);
    expect(await host.send({ type: 'saveGame', playerId: host.welcome.playerId })).toMatchObject({
      ok: true,
    });
    const raw = await readFile(join(path, 'default.json'), 'utf8');
    expect(raw).not.toContain(bob.welcome.resumeToken);
    expect(raw).toContain(createHash('sha256').update(bob.welcome.resumeToken).digest('hex'));
    expect(JSON.stringify(host.snapshot())).not.toContain('resumeDigests');
    expect(JSON.stringify(host.snapshot())).not.toContain('custom.privateQuest');
    await server.close();
    open = false;

    const restored = await AuthoritativeGameSession.create({
      saveStore: store,
      requireCharacterCreation: false,
    });
    const replacement = createGameServer(restored, { hostToken: 'durable-owner-separate-key' });
    const nextPort = await replacement.listen(0);
    cleanup.push(() => replacement.close());
    const newCarol = await joinServer(nextPort, {
      name: 'Carol',
      resume: carol.welcome.resumeToken,
    });
    const stranger = await joinServer(nextPort, { name: 'Host', resume: 'invalid-token' });
    expect(stranger.welcome.playerId).not.toBe(host.welcome.playerId);
    const newBob = await joinServer(nextPort, { name: 'Bob', resume: bob.welcome.resumeToken });
    for (const [client, before] of [
      [newBob, bobBefore],
      [newCarol, carolBefore],
    ] as const) {
      expect(client.welcome.snapshot.localPlayerId).toBe(before.localPlayerId);
      expect(client.welcome.snapshot.players[before.localPlayerId].body).toEqual(
        before.players[before.localPlayerId].body,
      );
      expect(client.welcome.snapshot.ui.inventory).toEqual(before.ui.inventory);
      expect(client.welcome.snapshot.lives).toEqual(before.lives);
      expect(client.welcome.snapshot.clientState?.flags['custom.privateQuest']).toBe(
        before.clientState?.flags['custom.privateQuest'],
      );
      expect(client.welcome.snapshot.permissions?.manageWorld).toBe(false);
    }
    const newHost = await joinServer(nextPort, {
      resume: host.welcome.resumeToken,
      hostToken: 'durable-owner-separate-key',
    });
    expect(newHost.welcome.playerId).toBe(host.welcome.playerId);
    expect(newHost.welcome.snapshot.permissions?.manageWorld).toBe(true);
    expect(newBob.welcome.snapshot.viewport.rooms['2,0,0'].layout[3]).toBe('#'.repeat(32));
    expect(JSON.stringify(newHost.snapshot())).not.toContain('resumeDigests');
    expect(JSON.stringify(newCarol.snapshot())).not.toContain(`${bob.welcome.playerId}-secret`);
  });

  it('rejects unsupported schemas, duplicate character identities and foreign ownership associations', async () => {
    const path = await directory();
    const game = new SnakeGame(defaultGameConfig, new QuestRegistry());
    game.reset();
    const base = game.getSaveData();
    expect(isGameCheckpoint(base)).toBe(true);
    expect(isGameCheckpoint({ ...base, hosted: { schemaVersion: 99 } })).toBe(false);
    const player = game.capturePlayerCheckpoint(game.getLocalPlayerId());
    const hosted = {
      schemaVersion: 1,
      primaryClaimed: true,
      players: [player],
      rooms: game.captureHostedRooms(),
      resumeDigests: { ['a'.repeat(64)]: player.id },
    };
    expect(isGameCheckpoint({ ...base, hosted })).toBe(true);
    expect(isGameCheckpoint({ ...base, hosted: { ...hosted, players: [player, player] } })).toBe(
      false,
    );
    expect(
      isGameCheckpoint({
        ...base,
        hosted: { ...hosted, resumeDigests: { ['a'.repeat(64)]: 'other-character' } },
      }),
    ).toBe(false);
    const store = new FileGameSaveStore(path);
    await store.save('default', { ...base, hosted: { ...hosted, schemaVersion: 1 } });
    expect(await store.load('default')).toMatchObject({ hosted: { schemaVersion: 1 } });
  });
});
