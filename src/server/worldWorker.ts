import { parentPort } from 'node:worker_threads';
import { findActorGridPath } from '../actors/actorNavigation.js';
import { createRng } from '../core/rng.js';
import { RoomGenerator } from '../world/roomGenerator.js';
import type { WorldJob, WorldResult } from '../world/WorldWork.js';

if (!parentPort) throw new Error('World jobs require a worker port');
const port = parentPort;
port.on('message', ({ id, job }: { id: number; job: WorldJob }) => {
  let result: WorldResult | null = null;
  try {
    if (job.kind === 'path') {
      const { cols, rows, walkable } = job;
      const path = findActorGridPath({
        start: job.start,
        goals: [job.goal],
        canStandAt: ({ x, y }) =>
          x >= 0 && y >= 0 && x < cols && y < rows && walkable[y * cols + x] === 1,
      });
      result = { kind: 'path', directions: path?.directions ?? null };
    } else {
      const rng = createRng(job.identity.seed);
      rng.setState(job.rngState);
      const room = new RoomGenerator(job.grid, job.config, rng, job.identity).generate(job.id);
      result = { kind: 'room', room, rngState: rng.getState() };
    }
  } catch {
    result = null;
  } finally {
    port.postMessage({ id, result });
  }
});
