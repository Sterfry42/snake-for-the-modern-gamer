import { describe, it, expect, afterEach } from 'vitest';
import { SnakeGame } from '../../game/snakeGame.js';
import { QuestRegistry } from '../../quests/questRegistry.js';
import eatApples from '../../quests/definitions/eatApples.js';
import { defaultGameConfig } from '../../config/gameConfig.js';
import { createBaseActor } from '../../actors/actorFactory.js';
import type { ActorRole } from '../../actors/actorTypes.js';
import { AuthoritativeGameSession } from '../AuthoritativeGameSession.js';
import { LocalGameConnection } from '../LocalGameConnection.js';
import { WebSocketGameConnection } from '../WebSocketGameConnection.js';
import { SceneGameBridge } from '../SceneGameBridge.js';
import { createGameServer } from '../../server/createGameServer.js';
import { parseCommandMessage } from '../gameProtocol.js';

const cleanups: Array<() => void | Promise<void>> = [];
afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup();
});

function setup(role: ActorRole = 'shopkeeper') {
  const registry = new QuestRegistry();
  registry.register(eatApples);
  const game = new SnakeGame({ ...defaultGameConfig, rng: { seed: 'connected-menus' } }, registry);
  game.reset();
  expect(
    game.loadFromSaveData({
      ...game.getSaveData(),
      atmosphere: { ...game.getAtmosphereState(), dayPhase: 'day', phaseProgress: 0 },
    }),
  ).toBe(true);
  const room = game.getCurrentRoom();
  room.layout = room.layout.map((row) => '.'.repeat(row.length));
  game.bosses.clearAll();
  const session = new AuthoritativeGameSession({ game, manageBasicFeatures: true });
  const alice = session.registerConnection('alice', 'Alice');
  const bob = session.registerConnection('bob', 'Bob');
  const actor = createBaseActor({
    id: 'menu-npc',
    displayName: 'Ada',
    kind: 'civilian',
    role,
    species: 'human',
    thickness: 'medium',
    currentRoomId: room.id,
  });
  actor.presence = {
    roomId: room.id,
    position: { x: 10, y: 10 },
    materialized: true,
    stationary: true,
  };
  game.getActorSystem().registry.upsert(actor);
  for (const id of [alice, bob])
    game.runForPlayer(id, () => {
      game.placeSnakeBodyAtLocal(room.id, { x: id === alice ? 9 : 11, y: 10 }, { x: 0, y: -1 });
      game.setScore(10000);
    });
  return { game, session, actor, room, alice, bob };
}

function view(session: AuthoritativeGameSession, playerId: string) {
  const menu = session.getSnapshot(playerId).ui.interaction;
  if (!menu) throw new Error('Missing interaction menu');
  return menu;
}

async function pick(session: AuthoritativeGameSession, playerId: string, optionId: string) {
  return session.executeCommand({
    type: 'selectInteraction',
    playerId,
    menuId: view(session, playerId).id,
    optionId,
  });
}

describe('connected authoritative interactions', () => {
  it('uses the queued local connection, holds only the browsing player, and closes without pausing peers', async () => {
    const { game, session, actor, alice, bob } = setup();
    const connection = new LocalGameConnection(session);
    cleanups.push(() => connection.disconnect());
    expect(
      await connection.send({ type: 'openActor', playerId: alice, actorId: actor.id }),
    ).toEqual({ ok: true });
    expect(view(session, alice).kind).toBe('actor');
    expect(session.getSnapshot(bob).ui.interaction).toBeNull();
    const before = session.getSnapshot().players;
    await session.advance(100);
    expect(session.getSnapshot().players[alice].body).toEqual(before[alice].body);
    expect(session.getSnapshot().players[bob].body).not.toEqual(before[bob].body);
    expect(session.getSnapshot().ui.paused).toBe(false);
    expect(
      await connection.send({
        type: 'closeInteraction',
        playerId: alice,
        menuId: view(session, alice).id,
      }),
    ).toEqual({ ok: true });
    await session.advance(100);
    expect(session.getSnapshot().players[alice].body).not.toEqual(before[alice].body);
    expect(game.getLocalPlayerId()).toBe(alice);
  });

  it('dispatches real shop opening and serializes competing purchases against shared Actor stock', async () => {
    const { game, session, actor, alice, bob } = setup('wizard');
    for (const playerId of [alice, bob]) {
      expect(
        await session.executeCommand({ type: 'openActor', playerId, actorId: actor.id }),
      ).toEqual({ ok: true });
      expect(await pick(session, playerId, 'shop')).toEqual({ ok: true });
      expect(view(session, playerId).kind).toBe('shop');
    }
    const offer = game
      .getActorShopView(actor.id)!
      .offers.find((entry) => entry.id === 'spell-tome-arcane-pulse')!;
    expect(offer.quantity).toBe(1);
    const firstMenu = view(session, alice).id;
    const commands = [alice, bob].map((playerId) => ({
      type: 'selectInteraction' as const,
      playerId,
      menuId: view(session, playerId).id,
      optionId: `offer:${offer.id}`,
    }));
    const results = await Promise.all(commands.map((command) => session.executeCommand(command)));
    expect(results.map((result) => result.ok)).toEqual([true, false]);
    expect(session.getSnapshot(alice).ui.inventory?.[offer.itemId!]).toBe(1);
    expect(session.getSnapshot(bob).ui.inventory?.[offer.itemId!]).toBeUndefined();
    expect(session.getSnapshot(alice).players[alice].score).toBe(10000 - offer.price);
    expect(session.getSnapshot(bob).players[bob].score).toBe(10000);
    expect(view(session, bob).options.some((option) => option.id === `offer:${offer.id}`)).toBe(
      false,
    );
    expect(await session.executeCommand({ ...commands[0]!, menuId: firstMenu })).toMatchObject({
      ok: false,
    });
    expect(game.getLocalPlayerId()).toBe(alice);
    const save = game.getSaveData();
    expect(game.loadFromSaveData(save)).toBe(true);
    expect(game.getActorShopView(actor.id)!.offers.some((entry) => entry.id === offer.id)).toBe(
      false,
    );
  });

  it('revalidates price, shop availability, NPC presence, and menu ownership on every action', async () => {
    const { game, session, actor, alice, bob } = setup('potionMaker');
    await session.executeCommand({ type: 'openActor', playerId: alice, actorId: actor.id });
    const menuId = view(session, alice).id;
    expect(
      await session.executeCommand({
        type: 'selectInteraction',
        playerId: bob,
        menuId,
        optionId: 'shop',
      }),
    ).toMatchObject({ ok: false });
    await pick(session, alice, 'shop');
    game.setScore(0);
    expect(
      view(session, alice).options.find((option) => option.id === 'offer:healing-potion')?.enabled,
    ).toBe(false);
    expect(await pick(session, alice, 'offer:healing-potion')).toMatchObject({ ok: false });
    expect(game.getScore()).toBe(0);
    game.getActorSystem().registry.update(actor.id, (current) => ({
      ...current,
      flags: { ...current.flags, shopClosedReason: 'Closed for the night.' },
    }));
    expect(await pick(session, alice, 'offer:healing-potion')).toMatchObject({ ok: false });
    game.getActorSystem().registry.update(actor.id, (current) => ({
      ...current,
      presence: { roomId: '1,0,0', position: { x: 10, y: 10 }, materialized: true },
    }));
    expect(session.getSnapshot(alice).ui.interaction).toBeNull();
    expect(
      await session.executeCommand({
        type: 'selectInteraction',
        playerId: alice,
        menuId,
        optionId: 'shop',
      }),
    ).toMatchObject({ ok: false });
    expect(session.getSnapshot(alice).ui.inventory?.['healing-potion']).toBeUndefined();
  });

  it('offers, declines, accepts, and completes a production quest for only the accepting player', async () => {
    const { game, session, actor, alice, bob } = setup('questGiver');
    await session.executeCommand({ type: 'openActor', playerId: bob, actorId: actor.id });
    await pick(session, bob, 'take-quest');
    expect(view(session, bob).kind).toBe('quest');
    await pick(session, bob, 'reject');
    expect(game.runForPlayer(bob, () => game.getAcceptedQuestIds())).toEqual([]);
    await pick(session, bob, 'take-quest');
    const offerId = view(session, bob).id;
    expect(await pick(session, bob, 'accept')).toEqual({ ok: true });
    expect(game.runForPlayer(bob, () => game.getAcceptedQuestIds())).toContain('eat-5-apples');
    expect(game.getAcceptedQuestIds()).toEqual([]);
    expect(
      await session.executeCommand({
        type: 'selectInteraction',
        playerId: bob,
        menuId: offerId,
        optionId: 'accept',
      }),
    ).toMatchObject({ ok: false });
    await session.executeCommand({
      type: 'closeInteraction',
      playerId: bob,
      menuId: view(session, bob).id,
    });
    game.runForPlayer(bob, () => game.setFlag('applesEaten', 5));
    await session.advance(100);
    expect(game.runForPlayer(bob, () => game.getCompletedQuestIds())).toContain('eat-5-apples');
    expect(game.getCompletedQuestIds()).toEqual([]);
    expect(session.getSnapshot(bob).players[bob].score).toBe(10010);
    expect(session.getSnapshot(alice).players[alice].score).toBe(10000);
  });

  it('uses real WebSocket commands for private menus and never trusts a supplied price', async () => {
    const { game, session, actor } = setup('potionMaker');
    const server = createGameServer(session);
    const port = await server.listen(0);
    cleanups.push(() => server.close());
    const remote = new WebSocketGameConnection(`ws://127.0.0.1:${port}/game`, 'Remote');
    cleanups.push(() => remote.disconnect());
    const bridge = new SceneGameBridge(remote);
    await remote.ready;
    const playerId = bridge.getLocalPlayerId();
    game.runForPlayer(playerId, () => {
      game.placeSnakeBodyAtLocal(actor.presence!.roomId, { x: 9, y: 10 }, { x: 0, y: -1 });
      game.setScore(100);
    });
    await remote.send({ type: 'openActor', playerId: 'forged-player', actorId: actor.id });
    expect(bridge.getSnapshot().ui.interaction?.kind).toBe('actor');
    await remote.send({
      type: 'selectInteraction',
      playerId,
      menuId: bridge.getSnapshot().ui.interaction!.id,
      optionId: 'shop',
    });
    const command = parseCommandMessage(
      JSON.stringify({
        type: 'command',
        id: 99,
        command: {
          type: 'selectInteraction',
          playerId,
          menuId: bridge.getSnapshot().ui.interaction!.id,
          optionId: 'offer:healing-potion',
          price: -999,
        },
      }),
    )!;
    expect(await remote.send(command.command)).toEqual({ ok: true });
    expect(bridge.getSnapshot().players[playerId].score).toBe(76);
    expect(bridge.getSnapshot().ui.inventory?.['healing-potion']).toBe(1);
    expect(session.getSnapshot().ui.interaction).toBeNull();
    expect(game.getLocalPlayerId()).toBe('player-1');
  });

  it('grants a purchased card to only the paying player through the canonical collection', async () => {
    const { game, session, actor, alice, bob } = setup('cardDealer');
    await session.executeCommand({ type: 'openActor', playerId: bob, actorId: actor.id });
    await pick(session, bob, 'shop');
    const offer = game.runForPlayer(bob, () => game.getActorShopView(actor.id)!.offers[0]);
    expect(offer.cardId).toBeDefined();
    expect(await pick(session, bob, `offer:${offer.id}`)).toEqual({ ok: true });
    expect(
      game.runForPlayer(bob, () => game.getFlag<Record<string, number>>('cards.collection')),
    ).toEqual({ [offer.cardId!]: 1 });
    expect(game.runForPlayer(alice, () => game.getFlag('cards.collection'))).toBeUndefined();
    expect(session.getSnapshot(bob).players[bob].score).toBe(10000 - offer.price);
    expect(session.getSnapshot(alice).players[alice].score).toBe(10000);
  });

  it('rejects malformed menu tokens and overlong or missing option IDs', () => {
    for (const command of [
      { type: 'selectInteraction', playerId: 'player-1', menuId: -1, optionId: 'shop' },
      { type: 'selectInteraction', playerId: 'player-1', menuId: 1.5, optionId: 'shop' },
      { type: 'selectInteraction', playerId: 'player-1', menuId: 1 },
      { type: 'selectInteraction', playerId: 'player-1', menuId: 1, optionId: 'a'.repeat(257) },
      { type: 'closeInteraction', playerId: 'player-1', menuId: '1' },
    ])
      expect(parseCommandMessage(JSON.stringify({ type: 'command', id: 1, command }))).toBeNull();
  });
});
