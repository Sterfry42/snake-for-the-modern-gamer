import { RoomGenerator } from '../../world/roomGenerator.js';
import { createRng } from '../../core/rng.js';
import { defaultGameConfig } from '../../config/gameConfig.js';
import { createWorldGenerationIdentity } from '../../world/generation/worldGenerationIdentity.js';
import { describe, expect, it, vi } from 'vitest';
import { WorkerGameSession } from '../WorkerGameSession.js';
import { WorldWorkerClient } from '../WorldWorkerClient.js';
import { createGameServer } from '../createGameServer.js';
import { WebSocketGameConnection } from '../../session/WebSocketGameConnection.js';

describe('worker-backed server', () => {
  it('hosts a real WebSocket with authority and background workers', async () => {
    const errors: Error[] = [];
    const session = await WorkerGameSession.create(
      { worldWorker: true, requireCharacterCreation: false },
      (error) => errors.push(error),
    );
    const server = createGameServer(session);
    const port = await server.listen(0);
    const client = new WebSocketGameConnection(`ws://127.0.0.1:${port}/game`);
    try {
      await client.ready;
      const id = client.playerId!;
      let revision = 0;
      const unsubscribe = client.onMovement((update) => {
        if (update.player.id === id) revision = update.player.movementRevision ?? 0;
      });
      await session.start();
      await vi.waitFor(() => expect(revision).toBeGreaterThan(0), { timeout: 3000 });
      expect(
        await client.send({ type: 'playerInteraction', playerId: id, mode: 'paused' }),
      ).toEqual({ ok: true });
      expect((await session.getConnectionSnapshot(id)).ui.playerInteraction).toBe('paused');
      expect((await session.refreshPerformance(false)).clockTimings.action.updates).toBeGreaterThan(
        0,
      );
      expect(errors).toEqual([]);
      unsubscribe();
    } finally {
      client.disconnect();
      try {
        await server.close();
      } finally {
        await session.close();
      }
    }
  }, 10000);

  it('returns a valid path from the persistent world worker', async () => {
    const world = new WorldWorkerClient((error) => {
      throw error;
    });
    try {
      const result = await new Promise((resolve, reject) => {
        if (
          !world.request(
            {
              kind: 'path',
              start: { x: 0, y: 0 },
              goal: { x: 2, y: 0 },
              cols: 3,
              rows: 2,
              walkable: Uint8Array.of(1, 0, 1, 1, 1, 1),
            },
            resolve,
          )
        )
          reject(new Error('Path request was rejected'));
      });
      expect(result).toEqual({
        kind: 'path',
        directions: [
          { x: 0, y: 1 },
          { x: 1, y: 0 },
          { x: 1, y: 0 },
          { x: 0, y: -1 },
        ],
      });
    } finally {
      await world.close();
    }
  });

  it('prepares the same terrain and RNG state as synchronous generation', async () => {
    const world = new WorldWorkerClient((error) => {
      throw error;
    });
    try {
      const identity = createWorldGenerationIdentity('worker-terrain-comparison');
      const rng = createRng(identity.seed);
      const { grid, world: config } = defaultGameConfig;
      const job = {
        kind: 'room' as const,
        id: '3,-2,0',
        identity,
        grid,
        config,
        rngState: rng.getState(),
      };
      const expected = new RoomGenerator(grid, config, rng, identity).generate(job.id);
      const received = await new Promise((resolve, reject) => {
        if (!world.request(job, resolve)) reject(new Error('Room preparation was rejected'));
      });
      expect(received).toEqual({ kind: 'room', room: expected, rngState: rng.getState() });
    } finally {
      await world.close();
    }
  });
});
