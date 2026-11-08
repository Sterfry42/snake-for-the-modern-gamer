/**
 * Benchmark the one-time cost of generating a fresh room (entered when the
 * snake crosses a room boundary).
 */
import { performance } from 'node:perf_hooks';
import { SnakeGame } from '../src/game/snakeGame.js';
import { defaultGameConfig } from '../src/config/gameConfig.js';
import { QuestRegistry } from '../src/quests/questRegistry.js';

const game = new SnakeGame(
  { ...defaultGameConfig, rng: { seed: 'room-gen-benchmark' } },
  new QuestRegistry(),
);
game.reset();

// Warm: initial room + a few neighbors.
game.getRoom('0,0,0');
game.getRoom('1,0,0');

const samples: number[] = [];
for (let x = 2; x < 26; x += 1) {
  const start = performance.now();
  game.getRoom(`${x},0,0`);
  samples.push(performance.now() - start);
}
samples.sort((a, b) => a - b);
console.log(JSON.stringify({
  rooms: samples.length,
  averageMs: Number((samples.reduce((a, b) => a + b, 0) / samples.length).toFixed(2)),
  p50Ms: Number(samples[Math.floor(samples.length / 2)]!.toFixed(2)),
  p95Ms: Number(samples[Math.floor(samples.length * 0.95)]!.toFixed(2)),
  maxMs: Number(samples[samples.length - 1]!.toFixed(2)),
  totalMs: Number(samples.reduce((a, b) => a + b, 0).toFixed(1)),
}));
