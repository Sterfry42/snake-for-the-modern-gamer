import { describe, it, expect } from 'vitest';
import { SnakeGame } from '../../game/snakeGame.js';
import { QuestRegistry } from '../../quests/questRegistry.js';
import { defaultGameConfig } from '../../config/gameConfig.js';
import { AuthoritativeGameSession } from '../AuthoritativeGameSession.js';
import { createBaseActor } from '../../actors/actorFactory.js';
import { isRecord } from '../../core/saveNormalize.js';
import type { GameEvent } from '../GameEvent.js';

function setup() {
  const game = new SnakeGame(
    { ...defaultGameConfig, rng: { seed: 'independent-players' } },
    new QuestRegistry(),
  );
  game.reset();
  const room = game.getCurrentRoom();
  room.layout = room.layout.map((row) => '.'.repeat(row.length));
  const session = new AuthoritativeGameSession({
    game,
    manageBasicFeatures: true,
  });
  const alice = session.registerConnection('alice', 'Alice');
  const bob = session.registerConnection('bob', 'Bob');
  return { game, room, session, alice, bob };
}

describe('independent authoritative players', () => {
  it('supports a third real player and keeps peers running after the primary disconnects', async () => {
    const { game, session, alice, bob } = setup();
    const carol = await session.attachConnection('carol', 'Carol');
    expect(new Set([alice, bob, carol]).size).toBe(3);
    expect(Object.keys(session.getSnapshot().players)).toHaveLength(3);
    session.unregisterConnection('alice');
    const before = session.getSnapshot(carol).players[carol].body[0];
    await session.executeCommand({
      type: 'forceDirection',
      playerId: carol,
      direction: { x: 0, y: 1 },
    });
    await session.advance(100);
    expect(game.getPlayer(alice)!.alive).toBe(false);
    expect(session.getSnapshot(carol).players[carol].body[0]).toEqual({
      x: before.x,
      y: before.y + 1,
    });
    expect(session.getSnapshot(carol).players[bob].alive).toBe(true);
  });

  it('applies shared apple consumption and player rewards only to the eater', async () => {
    const { game, room, session, alice, bob } = setup();
    const apple = game.getApple(room.id)!;
    const direction = apple.position.x >= 3 ? { x: 1, y: 0 } : { x: -1, y: 0 };
    game.getPlayer(alice)!.alive = false;
    expect(
      await session.executeCommand({ type: 'talkToActor', playerId: alice, actorId: 'anyone' }),
    ).toEqual({ ok: false, reason: 'Respawn before acting.' });
    game.runForPlayer(bob, () =>
      game.placeSnakeBodyAtLocal(
        room.id,
        { x: apple.position.x - direction.x, y: apple.position.y },
        direction,
      ),
    );
    const score = game.getPlayer(alice)!.snake.score;
    await session.advance(100);
    expect(game.runForPlayer(bob, () => game.getFlag('applesEaten'))).toBe(1);
    expect(game.getFlag('applesEaten')).toBeUndefined();
    expect(session.getSnapshot(bob).players[bob].score).toBeGreaterThan(0);
    expect(session.getSnapshot().players[alice].score).toBe(score);
  });

  it('owns distinct bodies and inventories, binds commands, and projects each player room', async () => {
    const { game, session, alice, bob } = setup();
    expect(alice).not.toBe(bob);
    expect(game.getPlayer(alice)!.snake).not.toBe(game.getPlayer(bob)!.snake);
    const aliceBefore = session.getSnapshot(alice).players[alice].body;
    const bobBefore = session.getSnapshot(bob).players[bob].body;
    expect(
      aliceBefore.some((cell) =>
        bobBefore.some((other) => other.x === cell.x && other.y === cell.y),
      ),
    ).toBe(false);
    await session.executeCommand({
      type: 'forceDirection',
      playerId: bob,
      direction: { x: 0, y: 1 },
    });
    await session.advance(100);
    expect(session.getSnapshot(bob).localPlayerId).toBe(bob);
    expect(session.getSnapshot(bob).players[bob].body[0]).toEqual({
      x: bobBefore[0].x,
      y: bobBefore[0].y + 1,
    });
    expect(session.getSnapshot(alice).players[alice].direction).not.toEqual({ x: 0, y: 1 });
    game.runForPlayer(bob, () => {
      game.getInventory().addItem('test-item', 2);
      game.setFlag('quest.only-bob', true);
      game.getPlayer(bob)!.snake.currentRoomId = '1,0,0';
    });
    expect(session.getSnapshot(bob).ui.inventory?.['test-item']).toBe(2);
    expect(session.getSnapshot(alice).ui.inventory?.['test-item']).toBeUndefined();
    expect(game.getFlag('quest.only-bob')).toBeUndefined();
    expect(session.getSnapshot(bob).viewport.centerRoomId).toBe('1,0,0');
    expect(session.getSnapshot(alice).viewport.centerRoomId).toBe('0,0,0');
    session.unregisterConnection('bob');
    expect(session.getSnapshot().players[bob]).toBeUndefined();
  });

  it('keeps the world moving after one death and respawns without resetting another player', async () => {
    const { game, session, alice, bob } = setup();
    game.setFlag('town.runtime.test', { reputation: 10 });
    game.setFlag('quest.keep-progress', 5);
    game.getInventory().addItem('test-item', 2);
    game.getPlayer(alice)!.alive = false;
    await session.advance(100);
    const bobBefore = session.getSnapshot(bob).players[bob];
    expect(session.getSnapshot().tick).toBe(100);
    await session.executeCommand({ type: 'restartRun', playerId: alice });
    expect(session.getSnapshot().players[alice].alive).toBe(true);
    expect(session.getSnapshot(bob).players[bob]).toEqual(bobBefore);
    expect(session.getSnapshot().tick).toBe(100);
    expect(game.getFlag('town.runtime.test')).toEqual({ reputation: 10 });
    expect(game.getFlag('quest.keep-progress')).toBe(5);
    expect(session.getSnapshot().ui.inventory?.['test-item']).toBe(2);
  });

  it('sends actual materialized actors, detaches client copies, and validates talk proximity', async () => {
    const { game, room, session, alice, bob } = setup();
    const head = game.getPlayer(bob)!.snake.head;
    const actor = createBaseActor({
      id: 'town-resident',
      displayName: 'Ada',
      kind: 'civilian',
      role: 'resident',
      species: 'human',
      thickness: 'medium',
      currentRoomId: room.id,
    });
    actor.presence = {
      roomId: room.id,
      materialized: true,
      position: { x: head.x, y: head.y + 1 },
    };
    game.getActorSystem().registry.upsert(actor);
    const snapshot = session.getSnapshot(bob);
    expect(
      snapshot.viewport.rooms[room.id].npcs?.find((npc) => npc.id === actor.id)?.displayName,
    ).toBe('Ada');
    snapshot.viewport.rooms[room.id].npcs!.find(
      (npc) => npc.id === actor.id,
    )!.presence!.position.x = 999;
    expect(game.getActorSystem().getActor(actor.id)!.presence!.position.x).toBe(head.x);
    // Talk lines are transient feedback: each player receives them through
    // their own gameplay.outcome event, after which the flag is drained.
    const outcomeEvents: GameEvent[] = [];
    const unsubscribeEvents = session.onEvent((event) => outcomeEvents.push(event));
    expect(
      await session.executeCommand({ type: 'talkToActor', playerId: bob, actorId: actor.id }),
    ).toEqual({ ok: true });
    unsubscribeEvents();
    const talkMessageFor = (playerId: string) =>
      outcomeEvents
        .filter(
          (event): event is Extract<GameEvent, { type: 'gameplay.outcome' }> =>
            event.type === 'gameplay.outcome' && event.playerId === playerId,
        )
        .flatMap((event) => event.outcome.feedback)
        .find((entry) => entry.key === 'ui.questInteraction')?.value;
    const bobTalk = talkMessageFor(bob);
    expect(
      isRecord(bobTalk) && typeof bobTalk.message === 'string' ? bobTalk.message : '',
    ).toContain('Ada:');
    expect(talkMessageFor(alice)).toBeUndefined();
    expect(session.getSnapshot(bob).clientState?.flags['ui.questInteraction']).toBeUndefined();
    expect(session.getSnapshot().ui.messages?.join(' ')).not.toContain('Ada:');
    expect(
      await session.executeCommand({ type: 'talkToActor', playerId: bob, actorId: 'missing' }),
    ).toEqual({ ok: false, reason: 'Move closer to talk.' });
  });
});
