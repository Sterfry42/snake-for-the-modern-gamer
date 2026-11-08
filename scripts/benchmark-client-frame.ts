import { performance } from 'node:perf_hooks';
import { SnakeGame } from '../src/game/snakeGame.js';
import { defaultGameConfig } from '../src/config/gameConfig.js';
import { QuestRegistry } from '../src/quests/questRegistry.js';
import { createBaseActor } from '../src/actors/actorFactory.js';
import { AuthoritativeGameSession } from '../src/session/AuthoritativeGameSession.js';
import { SimulationScheduler } from '../src/systems/simulationScheduler.js';
import { isSolidTile } from '../src/world/tiles.js';
import { furnitureVariantForTile } from '../src/ui/spriteRecipes/furnitureRecipe.js';

// Run with: npx tsx scripts/benchmark-client-frame.ts [frames]
//
// Measures the local single-player frame hot path, mirroring SnakeScene:
//   - per-draw snapshot build (AuthoritativeGameSession.getSnapshot)
//   - per-frame scheduler update with a rules closure (getGameMode pattern)
//   - per-move action step + snapshot (snake moved this frame)
//   - proxy vs plain tile scans (renderer passes over room.layout)
const frames = Math.max(10, Math.min(2000, Number(process.argv[2] ?? 300)));
if (!Number.isFinite(frames)) throw new Error('Expected numeric frame count');

const game = new SnakeGame(
  { ...defaultGameConfig, rng: { seed: 'client-frame-benchmark' } },
  new QuestRegistry(),
);
game.reset();
game.bosses.clearAll();
const session = new AuthoritativeGameSession({ game, manageBasicFeatures: true });

// A realistic explored world: the hot room cache holds up to 128 rooms.
for (let index = 0; index < 128; index += 1) game.getRoom(`${10 + index},20,0`);
const homeId = '12,20,0';
game.getRoom(homeId);

// Materialized residents + furniture-like tiles in the visible room.
const home = game.getRoom(homeId);
if (game.getCurrentRoom().id !== homeId) {
  game.moveToRoom(homeId, { x: 4, y: 4 });
}
for (let index = 0; index < 40; index += 1) {
  const actor = createBaseActor({
    id: `frame-bench-${index}`,
    displayName: 'Commuter',
    kind: 'civilian',
    role: 'resident',
    species: 'human',
    thickness: 'thin',
    currentRoomId: homeId,
  });
  actor.goal = { kind: 'work', priority: 10, roomId: homeId, targetPosition: { x: 4, y: 4 } };
  actor.presence = {
    roomId: homeId,
    position: { x: (index % 8) + 2, y: Math.floor(index / 8) + 2 },
    materialized: true,
  };
  game.getActorSystem().registry.upsert(actor);
}

// A scheduler shaped like the scene's (action/actor/bullet/hazard/manual-world/boss).
const scheduler = new SimulationScheduler([
  { id: 'boss', intervalMs: 250, step: () => {} },
  { id: 'action', intervalMs: 150, step: () => game.actionStep(false) },
  { id: 'actor', intervalMs: 500, step: () => {} },
  { id: 'bullet', intervalMs: 100, step: () => {} },
  { id: 'hazard', intervalMs: 1000, step: () => {} },
  { id: 'manual-world', intervalMs: 150, step: () => {} },
]);
const MODE_RULES: Record<string, Record<string, boolean | 'manual'>> = {
  action: { boss: true, action: true, actor: true, bullet: true, hazard: true, 'manual-world': false },
};
// Mirrors the scene's per-frame closure: mode checks + rules lookup.
let modeChecks = 0;
const gameMode = (): string => {
  modeChecks += 1;
  return 'action';
};

function benchmark(label: string, run: () => void, samples: number): { avgMs: number; minMs: number; maxMs: number } {
  const values: number[] = [];
  for (let sample = 0; sample < samples; sample += 1) {
    const startedAt = performance.now();
    run();
    values.push(performance.now() - startedAt);
  }
  values.sort((a, b) => a - b);
  const avgMs = values.reduce((total, value) => total + value, 0) / values.length;
  return { avgMs, minMs: values[0] ?? 0, maxMs: values.at(-1) ?? 0 };
}

function fmt(value: number): string {
  return value >= 0.1 ? `${value.toFixed(2)}ms` : `${(value * 1000).toFixed(1)}us`;
}

// Warmup so JIT + caches settle before measuring.
for (let frame = 0; frame < 30; frame += 1) {
  scheduler.update(16.7, () => MODE_RULES[gameMode()]);
  session.getSnapshot();
}

const snapshotBuild = benchmark('snapshotBuild', () => {
  session.getSnapshot();
}, frames);

const schedulerUpdate = benchmark('schedulerUpdate', () => {
  scheduler.update(16.7, () => MODE_RULES[gameMode()]);
}, frames);

const actionFrame = benchmark('actionFrame', () => {
  const result = game.actionStep(false);
  if (result?.status === 'dead') {
    game.getPlayer(game.getLocalPlayerId()).alive = true;
  }
  session.getSnapshot();
}, Math.min(frames, 120));

// Renderer-style tile scan: furniture pass through the cached (proxied) room.
const proxied = game.getRoom(homeId);
const plain = JSON.parse(JSON.stringify(proxied));
const proxyScan = benchmark('proxyScan', () => {
  let count = 0;
  for (let y = 0; y < proxied.layout.length; y += 1) {
    for (let x = 0; x < proxied.layout[y].length; x += 1) {
      if (furnitureVariantForTile(proxied.layout[y][x])) count += 1;
      if (isSolidTile(proxied.layout[y][x])) count += 1;
    }
  }
  if (count === -1) console.error('unreachable');
}, frames);
const plainScan = benchmark('plainScan', () => {
  let count = 0;
  for (let y = 0; y < plain.layout.length; y += 1) {
    for (let x = 0; x < plain.layout[y].length; x += 1) {
      if (furnitureVariantForTile(plain.layout[y][x])) count += 1;
      if (isSolidTile(plain.layout[y][x])) count += 1;
    }
  }
  if (count === -1) console.error('unreachable');
}, frames);

const snapshotBytes = Buffer.byteLength(JSON.stringify(session.getSnapshot()));

console.info(
  JSON.stringify(
    {
      frames,
      snapshotBytes,
      snapshotBuildPerDraw: {
        label: 'per-draw session.getSnapshot() (local mode)',
        ...Object.fromEntries(
          Object.entries(snapshotBuild).map(([key, value]) => [key, fmt(value as number)]),
        ),
      },
      schedulerUpdatePerFrame: {
        label: 'per-frame scheduler.update(rules closure)',
        ...Object.fromEntries(
          Object.entries(schedulerUpdate).map(([key, value]) => [key, fmt(value as number)]),
        ),
      },
      actionFrame: {
        label: 'actionStep + getSnapshot (snake moved)',
        ...Object.fromEntries(
          Object.entries(actionFrame).map(([key, value]) => [key, fmt(value as number)]),
        ),
      },
      tileScan: {
        label: 'furniture pass over 1 room',
        proxy: fmt(proxyScan.avgMs),
        plain: fmt(plainScan.avgMs),
        proxyVsPlain: `${((proxyScan.avgMs / Math.max(plainScan.avgMs, 1e-9)) * 100).toFixed(0)}%`,
      },
    },
    null,
    2,
  ),
);
