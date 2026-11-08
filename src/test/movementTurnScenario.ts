import { SnakeGame } from '../game/snakeGame.js';
import { defaultGameConfig } from '../config/gameConfig.js';
import { QuestRegistry } from '../quests/questRegistry.js';
import { AuthoritativeGameSession } from '../session/AuthoritativeGameSession.js';
import { ClientMovementPredictor } from '../session/ClientMovementPredictor.js';
import type { MovementPlayer } from '../session/MovementUpdate.js';

export async function movementTurnFixture(interval = 100, grace = true) {
  const game = new SnakeGame(
    { ...defaultGameConfig, rng: { seed: 'turn-authority' } },
    new QuestRegistry(),
  );
  game.reset();
  game.bosses.clearAll();
  const room = game.getCurrentRoom();
  room.layout = room.layout.map((row) => '.'.repeat(row.length));
  room.portals = [];
  game.placeSnakeBodyAtLocal(room.id, { x: 10, y: 10 }, { x: 1, y: 0 });
  game.setFlag('class.mods', {
    derivedModifiers: [
      { stat: 'actionStepIntervalScalar', operation: 'multiply', value: interval / 100 },
    ],
  });
  const session = new AuthoritativeGameSession({ game, manageBasicFeatures: true });
  session.configureHosting();
  const id = session.registerConnection('alice', 'Alice', {
    playerId: game.getLocalPlayerId(),
    admin: true,
  });
  if (grace) await session.enableMovementGrace(id);
  const predictor = new ClientMovementPredictor();
  const initial = session.getSnapshot(id);
  predictor.seedFrom(initial, 0, true);
  predictor.synchronizeClock(0, 0, 0);
  return { game, room, session, id, predictor, initial };
}

/** Identical input-time/arrival-time workload against legacy and step-aware authority. */
export async function runMovementTurnScenario(
  interval: number,
  boundaryOffset: number,
  latency: number,
  grace: boolean,
) {
  const { session, id, predictor, initial } = await movementTurnFixture(interval, grace);
  const authoritative = new Map<number, MovementPlayer>();
  let appliedRevision: number | undefined;
  session.onMovement((update) => {
    if (update.player.id !== id) return;
    const revision = update.player.movementRevision ?? 0;
    authoritative.set(revision, structuredClone(update.player));
    if (appliedRevision === undefined && update.player.direction.y === 1)
      appliedRevision = revision;
  });
  const pressedAt = interval + boundaryOffset;
  predictor.direction({ x: 0, y: 1 }, pressedAt, 1);
  const intent = predictor.turnIntent!;
  const expected = structuredClone(
    predictor.presentation(initial.players[id], intent.intendedRevision * interval)!.body,
  );
  let now = 0;
  while (now + 20 <= pressedAt + latency) {
    await session.advance(20);
    now += 20;
  }
  const result = await session.executeCommand({
    type: 'setDirection',
    playerId: id,
    direction: { x: 0, y: 1 },
    inputSequence: 1,
    ...(grace ? intent : {}),
  });
  let frames = 0;
  while (
    (session.getSnapshot(id).players[id].movementRevision ?? 0) < intent.intendedRevision ||
    (result.ok && appliedRevision === undefined)
  ) {
    if (++frames > 100)
      throw new Error('Authoritative turn did not commit within the scenario budget');
    await session.advance(20);
    now += 20;
  }
  const actual = authoritative.get(intent.intendedRevision);
  if (!actual) throw new Error('Missing authority history at the intended revision');
  const correctionTiles = actual.body.reduce(
    (max, point, i) =>
      Math.max(max, Math.abs(point.x - expected[i].x) + Math.abs(point.y - expected[i].y)),
    0,
  );
  return {
    interval,
    boundaryOffset,
    latency,
    grace,
    intendedRevision: intent.intendedRevision,
    appliedRevision,
    comparedRevision: actual.movementRevision,
    correctionTiles,
    reason: result.reason ?? 'accepted',
  };
}
