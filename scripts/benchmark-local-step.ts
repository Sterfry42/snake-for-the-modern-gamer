import { performance } from 'node:perf_hooks';
import { SnakeGame } from '../src/game/snakeGame.js';
import { defaultGameConfig } from '../src/config/gameConfig.js';
import { QuestRegistry } from '../src/quests/questRegistry.js';
import { createBaseActor } from '../src/actors/actorFactory.js';
import { AuthoritativeGameSession } from '../src/session/AuthoritativeGameSession.js';
import { SceneReadReplica } from '../src/session/SceneReadReplica.js';
import { SimulationScheduler } from '../src/systems/simulationScheduler.js';

// Mirrors the local single-player step path:
//   session.actionStep -> emitSnapshot -> buildSnapshot (detached)
//   scene onSnapshot handler -> readReplica.hydrate(snapshot)
//   movement presentation -> applyMovementUpdate (measured separately as reference)
const steps = Math.max(10, Math.min(500, Number(process.argv[2] ?? 150)));

const game = new SnakeGame(
  { ...defaultGameConfig, rng: { seed: 'local-step-benchmark' } },
  new QuestRegistry(),
);
game.reset();
game.bosses.clearAll();
const session = new AuthoritativeGameSession({ game, manageBasicFeatures: true });
for (let index = 0; index < 128; index += 1) game.getRoom(`${10 + index},20,0`);
const homeId = '12,20,0';
game.getRoom(homeId);
if (game.getCurrentRoom().id !== homeId) game.moveToRoom(homeId, { x: 4, y: 4 });
for (let index = 0; index < 40; index += 1) {
  const actor = createBaseActor({
    id: `step-bench-${index}`,
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
const registry = new QuestRegistry();
const replica = new SceneReadReplica(
  { ...defaultGameConfig, rng: { seed: game.worldSeed ?? 'local-step-benchmark' } },
  registry,
  session.getSnapshot(),
);
const scheduler = new SimulationScheduler([
  { id: 'action', intervalMs: 150, step: () => session.actionStep(false) },
  { id: 'actor', intervalMs: 500, step: () => {} },
  { id: 'bullet', intervalMs: 100, step: () => {} },
]);
const RULES = { action: true, actor: true, bullet: true };

// Warmup: let the snake wander a bit and the replica settle.
for (let i = 0; i < 20; i += 1) {
  scheduler.update(150, RULES);
  const snapshot = session.getSnapshot();
  replica.hydrate(snapshot);
  if (game.getPlayer(game.getLocalPlayerId()).alive === false)
    game.getPlayer(game.getLocalPlayerId()).alive = true;
}

let stepMs = 0;
let hydrateMs = 0;
let snapshotMs = 0;
const N = steps;
for (let i = 0; i < N; i += 1) {
  const t0 = performance.now();
  const result = game.actionStep(false);
  if (result?.status === 'dead') game.getPlayer(game.getLocalPlayerId()).alive = true;
  const t1 = performance.now();
  const snapshot = session.getSnapshot();
  const t2 = performance.now();
  replica.hydrate(snapshot);
  const t3 = performance.now();
  stepMs += t1 - t0;
  snapshotMs += t2 - t1;
  hydrateMs += t3 - t2;
}
console.log(
  JSON.stringify(
    {
      steps: N,
      perStep: {
        actionStepMs: Number((stepMs / N).toFixed(3)),
        sessionGetSnapshotMs: Number((snapshotMs / N).toFixed(3)),
        replicaHydrateMs: Number((hydrateMs / N).toFixed(3)),
        totalMs: Number(((stepMs + snapshotMs + hydrateMs) / N).toFixed(3)),
      },
    },
    null,
    2,
  ),
);
