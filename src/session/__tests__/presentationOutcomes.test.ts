import { describe, expect, it } from 'vitest';
import { SnakeGame } from '../../game/snakeGame.js';
import { defaultGameConfig } from '../../config/gameConfig.js';
import { QuestRegistry } from '../../quests/questRegistry.js';
import { createBaseActor } from '../../actors/actorFactory.js';
import { AuthoritativeGameSession } from '../AuthoritativeGameSession.js';
import type { GameEvent } from '../GameEvent.js';
import { isClientCommand } from '../gameProtocol.js';

function setup() {
  const game = new SnakeGame(
    { ...defaultGameConfig, rng: { seed: 'presentation-outcomes' } },
    new QuestRegistry(),
  );
  game.reset();
  const room = game.getCurrentRoom();
  room.layout = room.layout.map((row) => '.'.repeat(row.length));
  game.bosses.clearAll();
  const session = new AuthoritativeGameSession({ game, manageBasicFeatures: true });
  const alice = session.registerConnection('alice', 'Alice');
  const bob = session.registerConnection('bob', 'Bob');
  game.placeSnakeBodyAtLocal(room.id, { x: 5, y: 10 }, { x: 1, y: 0 });
  game.runForPlayer(bob, () =>
    game.placeSnakeBodyAtLocal(room.id, { x: 15, y: 15 }, { x: 0, y: -1 }),
  );
  const events: GameEvent[] = [];
  session.onEvent((event) => events.push(event));
  return { game, room, session, alice, bob, events };
}

describe('authoritative presentation and multiplayer combat', () => {
  it('keeps bomb fuses on world time while both players hold menus and damages every snake in the blast', async () => {
    const { game, room, session, alice, bob, events } = setup();
    game.runForPlayer(bob, () => {
      game.placeSnakeBodyAtLocal(room.id, { x: 7, y: 10 }, { x: 0, y: -1 });
      game.setFlag('player.health', 1);
    });
    game.addItem('bomb', 1);
    await session.executeCommand({ type: 'playerInteraction', playerId: alice, mode: 'paused' });
    await session.executeCommand({ type: 'playerInteraction', playerId: bob, mode: 'dialogue' });
    await session.executeCommand({ type: 'useItem', playerId: alice, itemId: 'bomb' });
    const before = session.getSnapshot().players;
    for (let step = 0; step < 29; step++) await session.advance(100);
    expect(game.getBombs(room.id)).toHaveLength(1);
    expect(game.getBombs(room.id)[0].fuseTicks).toBe(1);
    await session.advance(100);
    expect(game.getBombs(room.id)).toHaveLength(0);
    expect(session.getSnapshot().players[alice].body).toEqual(before[alice].body);
    expect(session.getSnapshot().players[bob].body).toEqual(before[bob].body);
    expect(game.getPlayerHealth().current).toBe(1);
    expect(session.getSnapshot().players[bob].alive).toBe(false);
    expect(events).toContainEqual({ type: 'player.died', playerId: bob, reason: 'bomb' });
    for (const playerId of [alice, bob])
      expect(
        events.flatMap((event) =>
          event.type === 'gameplay.outcome' && event.playerId === playerId
            ? event.outcome.feedback
            : [],
        ),
      ).toContainEqual(expect.objectContaining({ key: 'ui.bombExplosion' }));
  });

  it('uses canonical dating branches and rejects forged, replayed, and stale interaction choices', async () => {
    const { game, room, session, alice } = setup();
    const actor = createBaseActor({
      id: 'dating-ada',
      displayName: 'Ada',
      role: 'resident',
      kind: 'civilian',
      species: 'human',
      thickness: 'medium',
      currentRoomId: room.id,
    });
    actor.presence = {
      roomId: room.id,
      position: { x: 6, y: 10 },
      materialized: true,
      stationary: true,
    };
    game.getActorSystem().registry.upsert(actor);
    const begun = await session.executeCommand({
      type: 'actorAction',
      action: 'begin',
      actorId: actor.id,
      includeBark: true,
      playerId: alice,
    });
    expect(begun.actorOutcome?.bark?.text).toBeTruthy();
    const revision = begun.actorOutcome!.revision;
    const started = await session.executeCommand({
      type: 'datingAction',
      action: 'start',
      kind: 'talk',
      actorId: actor.id,
      revision,
      playerId: alice,
    });
    expect(started.ok).toBe(true);
    expect(started.actorOutcome?.sequence?.pages.length).toBeGreaterThan(0);
    const branchId = Object.keys(started.actorOutcome!.sequence!.branchResults)[0];
    expect(
      await session.executeCommand({
        type: 'datingAction',
        action: 'choose',
        actorId: actor.id,
        revision,
        branchId: 'forged-free-rewards',
        playerId: alice,
      }),
    ).toMatchObject({ ok: false });
    const choice = {
      type: 'datingAction',
      action: 'choose',
      actorId: actor.id,
      revision,
      branchId,
      playerId: alice,
    } as const;
    expect(await session.executeCommand(choice)).toMatchObject({
      ok: true,
      actorOutcome: { relationship: { ok: true } },
    });
    expect(await session.executeCommand(choice)).toMatchObject({ ok: false });
    await session.executeCommand({
      type: 'actorAction',
      action: 'begin',
      actorId: actor.id,
      playerId: alice,
    });
    expect(
      await session.executeCommand({
        type: 'actorAction',
        action: 'talk',
        actorId: actor.id,
        revision,
        playerId: alice,
      }),
    ).toMatchObject({ ok: false });
  });

  it('publishes repeated feedback once, preserves order, and keeps snapshots free of consumed effects', async () => {
    const { game, session, alice, bob, events } = setup();
    game.setFlag('ui.wallChomp', { x: 5, y: 10, roomId: game.getCurrentRoom().id });
    game.setFlag('ui.wallChomp', { x: 6, y: 10, roomId: game.getCurrentRoom().id });
    await session.executeCommand({ type: 'playerInteraction', playerId: alice, mode: 'paused' });
    const outcomes = events.filter((event) => event.type === 'gameplay.outcome');
    const walls = outcomes.flatMap((event) =>
      event.outcome.feedback.filter((feedback) => feedback.key === 'ui.wallChomp'),
    );
    expect(walls.map((effect) => effect.value)).toEqual([
      { x: 5, y: 10, roomId: game.getCurrentRoom().id },
      { x: 6, y: 10, roomId: game.getCurrentRoom().id },
    ]);
    expect(outcomes.every((event) => event.playerId === alice)).toBe(true);
    expect(session.getSnapshot(alice).clientState?.flags['ui.wallChomp']).toBeUndefined();
    expect(session.getSnapshot(bob).clientState?.flags['ui.wallChomp']).toBeUndefined();
    events.length = 0;
    await session.executeCommand({ type: 'playerInteraction', playerId: alice, mode: 'paused' });
    expect(events.filter((event) => event.type === 'gameplay.outcome')).toEqual([]);
    game.setFlag('ui.wallChomp', { x: 7, y: 10 });
    game.reset();
    expect(game.drainGameplayFeedback().filter((effect) => effect.key === 'ui.wallChomp')).toEqual(
      [],
    );
  });

  it('holds only the approached player and rejects stale encounter decisions', async () => {
    const { game, room, session, alice, bob } = setup();
    const actor = createBaseActor({
      id: 'wanderer:arrival',
      displayName: 'Road Sage',
      kind: 'civilian',
      role: 'resident',
      species: 'human',
      thickness: 'medium',
      currentRoomId: room.id,
    });
    actor.presence = {
      roomId: room.id,
      position: { x: 6, y: 10 },
      materialized: true,
      stationary: true,
    };
    game.getActorSystem().registry.upsert(actor);
    game.setFlag('npc.randomEncounter', {
      id: 'arrival',
      name: 'Road Sage',
      kind: 'flavor',
      pages: ['The road remembers.'],
      statsNote: 'Wanderer',
      actorId: actor.id,
      roomId: room.id,
    });
    await session.executeCommand({ type: 'playerInteraction', playerId: alice, mode: 'playing' });
    const forced = session.getSnapshot(alice).forcedEncounter;
    expect(forced).toMatchObject({
      encounter: { actorId: actor.id, pages: ['The road remembers.'] },
    });
    expect(session.getSnapshot(bob).forcedEncounter).toBeNull();
    const before = session.getSnapshot().players;
    await session.advance(100);
    expect(session.getSnapshot().players[alice].body).toEqual(before[alice].body);
    expect(session.getSnapshot().players[bob].body).not.toEqual(before[bob].body);
    expect(
      await session.executeCommand({
        type: 'randomEncounterAction',
        playerId: bob,
        action: 'accept',
        token: forced!.token,
      }),
    ).toMatchObject({ ok: false });
    expect(
      await session.executeCommand({
        type: 'randomEncounterAction',
        playerId: alice,
        action: 'reject',
        token: forced!.token,
      }),
    ).toMatchObject({ ok: true });
    expect(
      await session.executeCommand({
        type: 'randomEncounterAction',
        playerId: alice,
        action: 'accept',
        token: forced!.token,
      }),
    ).toMatchObject({ ok: false });
    expect(session.getSnapshot(alice).forcedEncounter).toBeNull();
  });

  it('kills a moving snake on another live snake body', () => {
    const { game, room, session, alice, bob } = setup();
    game.runForPlayer(bob, () =>
      game.placeSnakeBodyAtLocal(room.id, { x: 6, y: 10 }, { x: 0, y: -1 }),
    );
    expect(session.actionStep(false).status).toBe('dead');
    expect(session.getSnapshot().players[alice].alive).toBe(false);
    expect(session.getSnapshot().players[bob].alive).toBe(true);
  });

  it('does not collide with disconnected or dead snake bodies', () => {
    const { game, room, session, bob } = setup();
    game.runForPlayer(bob, () =>
      game.placeSnakeBodyAtLocal(room.id, { x: 6, y: 10 }, { x: 0, y: -1 }),
    );
    game.getPlayer(bob)!.alive = false;
    expect(session.actionStep(false).status).toBe('alive');
  });

  it('resolves an adjacent guest shot against the primary player and publishes death once', async () => {
    const { game, room, session, alice, bob, events } = setup();
    game.setFlag('player.health', 1);
    game.runForPlayer(bob, () => {
      game.placeSnakeBodyAtLocal(room.id, { x: 6, y: 10 }, { x: 0, y: -1 });
      game.setFlag('equipment.gunEnabled', true);
    });
    expect(
      await session.executeCommand({
        type: 'combatAction',
        action: 'fire',
        direction: { x: -1, y: 0 },
        playerId: bob,
      }),
    ).toMatchObject({ ok: true });
    expect(session.getSnapshot().players[alice].alive).toBe(false);
    expect(session.getSnapshot().players[bob].alive).toBe(true);
    await session.executeCommand({ type: 'playerInteraction', mode: 'paused', playerId: bob });
    expect(
      events.filter((event) => event.type === 'player.died' && event.playerId === alice),
    ).toEqual([{ type: 'player.died', playerId: alice, reason: 'bullet' }]);
    expect(game.getEnemyBullets(room.id)).toHaveLength(0);
  });

  it('damages a peer with owned gunfire, keeps the shooter safe, and emits private hit feedback', async () => {
    const { game, room, session, alice, bob, events } = setup();
    game.setFlag('equipment.gunEnabled', true);
    game.runForPlayer(bob, () =>
      game.placeSnakeBodyAtLocal(room.id, { x: 9, y: 10 }, { x: 0, y: -1 }),
    );
    const before = game.runForPlayer(bob, () => game.getFlag<number>('player.health') ?? 3);
    expect(
      await session.executeCommand({
        type: 'combatAction',
        action: 'fire',
        playerId: alice,
        direction: { x: 1, y: 0 },
      }),
    ).toMatchObject({ ok: true });
    for (let step = 0; step < 3; step++) session.bulletClockStep();
    await session.executeCommand({ type: 'playerInteraction', mode: 'paused', playerId: bob });
    expect(game.runForPlayer(bob, () => game.getFlag<number>('player.health'))).toBe(before - 1);
    expect(game.getFlag('player.health') ?? 3).toBe(3);
    expect(
      events.flatMap((event) =>
        event.type === 'gameplay.outcome' && event.playerId === bob ? event.outcome.feedback : [],
      ),
    ).toContainEqual(expect.objectContaining({ key: 'ui.playerHit' }));
  });

  it('projects per-player cosmetics and validates bounded appearance inputs', async () => {
    const { session, alice, bob } = setup();
    const appearance = {
      themeId: 'midnight',
      renderStyle: 'sprite',
      activeHat: 'cowboy',
      palette: {
        baseColor: '#4f69ff',
        bellyColor: '#d4dcff',
        patternColor: '#26358f',
        outlineColor: '#18204a',
        eyeColor: '#f5f7ff',
      },
    } as const;
    expect(isClientCommand({ type: 'cosmeticAction', playerId: alice, appearance })).toBe(true);
    expect(
      isClientCommand({
        type: 'cosmeticAction',
        playerId: alice,
        appearance: { ...appearance, activeHat: '../../invalid' },
      }),
    ).toBe(false);
    expect(
      isClientCommand({
        type: 'cosmeticAction',
        playerId: alice,
        appearance: { ...appearance, palette: { ...appearance.palette, baseColor: 'url(evil)' } },
      }),
    ).toBe(false);
    await session.executeCommand({ type: 'cosmeticAction', playerId: alice, appearance });
    const snapshot = session.getSnapshot(bob);
    expect(snapshot.players[alice].appearance).toEqual(appearance);
    expect(snapshot.players[bob].appearance).toBeUndefined();
    snapshot.players[alice].appearance!.palette.baseColor = '#000000';
    expect(session.getSnapshot().players[alice].appearance?.palette.baseColor).toBe('#4f69ff');
  });
});
