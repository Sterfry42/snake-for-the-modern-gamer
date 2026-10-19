import { afterEach, describe, expect, it, vi } from 'vitest';
import { SnakeGame } from '../../game/snakeGame.js';
import { defaultGameConfig } from '../../config/gameConfig.js';
import { QuestRegistry } from '../../quests/questRegistry.js';
import eatApples from '../../quests/definitions/eatApples.js';
import { createBaseActor } from '../../actors/actorFactory.js';
import { AuthoritativeGameSession } from '../AuthoritativeGameSession.js';
import { LocalGameConnection } from '../LocalGameConnection.js';
import { SceneGameClient } from '../SceneGameClient.js';
import { isClientCommand } from '../gameProtocol.js';
import { createGameServer } from '../../server/createGameServer.js';
import { WebSocketGameConnection } from '../WebSocketGameConnection.js';

const cleanups: Array<() => void | Promise<void>> = [];
afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup();
});

function setup() {
  const registry = new QuestRegistry();
  registry.register(eatApples);
  const game = new SnakeGame(
    { ...defaultGameConfig, rng: { seed: 'scene-state-mirror' } },
    registry,
  );
  game.reset();
  const room = game.getCurrentRoom();
  room.layout = room.layout.map((row) => '.'.repeat(row.length));
  game.bosses.clearAll();
  const session = new AuthoritativeGameSession({ game });
  return { game, session, room };
}

function localClient(session: AuthoritativeGameSession) {
  const connection = new LocalGameConnection(session, (command) => session.executeCommand(command));
  const client = new SceneGameClient(connection);
  cleanups.push(() => client.destroy());
  return { client, connection };
}

describe('scene state mirror and command facade', () => {
  it('projects private player state, equipment, quests, relationships, and shared world data', () => {
    const { game, session } = setup();
    const alice = session.registerConnection('alice', 'Alice');
    const bob = session.registerConnection('bob', 'Bob');
    game.getInventory().addItem('boots-quick', 2);
    expect(game.getInventory().equip('boots-quick')).toBe(true);
    game.setFlag('mirror.private', { value: 'alice' });
    game.runForPlayer(bob, () => {
      game.getInventory().addItem('private-bob-item', 3);
      game.setFlag('mirror.private', { value: 'bob' });
    });
    const first = session.getSnapshot(alice).clientState!;
    const second = session.getSnapshot(bob).clientState!;
    expect(first.inventory['boots-quick']).toBe(2);
    expect(first.equipment.boots).toBe('boots-quick');
    expect(second.equipment.boots).toBeUndefined();
    expect(second.inventory['boots-quick']).toBeUndefined();
    expect(second.inventory['private-bob-item']).toBe(3);
    expect(first.flags['mirror.private']).toEqual({ value: 'alice' });
    expect(second.flags['mirror.private']).toEqual({ value: 'bob' });
    expect(first.special).toEqual(game.getSpecialStatsView());
    expect(first.atmosphere).toEqual(second.atmosphere);
    expect(first.cars).toEqual(game.getCars());
    expect(first.construction.structures).toEqual(game.placedStructures());
    expect(first.relationships).toEqual(game.getDatingCandidateViews());
    expect(first.quests.active.map((quest) => quest.id)).toEqual(
      game.getActiveQuests().map((quest) => quest.id),
    );
    expect(first).not.toHaveProperty('rng');
    expect(first).not.toHaveProperty('rngState');
  });

  it('answers selectors without requests or a runtime replica and protects its last snapshot', () => {
    const { game, session } = setup();
    game.setFlag('mirror.nested', { score: 1 });
    game.getInventory().addItem('private-item', 2);
    const { client, connection } = localClient(session);
    const send = vi.spyOn(connection, 'send');
    const before = game.getSaveData();
    const flags = structuredClone(game.getPlayer(game.getLocalPlayerId())!.flags);
    for (let index = 0; index < 3; index++) {
      const snapshot = client.getSnapshot();
      snapshot.clientState!.inventory['private-item'] = 999;
      snapshot.clientState!.flags['mirror.nested'] = { score: 999 };
      const room = client.getCurrentRoom();
      room.layout[0] = 'client contamination';
      client.getActorsInCurrentRoom().splice(0);
      client.getSpecialStatsView();
      client.getDatingCandidateViews();
      client.getActiveQuests();
      client.getAtmosphereForRoom();
      client.getModernRunState();
      client.getGeneratedRoomIds().push('fake-room');
      expect(client.getInventory().getItemCount('private-item')).toBe(2);
      expect(client.getFlag('mirror.nested')).toEqual({ score: 1 });
      expect(client.getCurrentRoom().layout[0]).not.toBe('client contamination');
    }
    expect(send).not.toHaveBeenCalled();
    expect(client).not.toHaveProperty('reset');
    expect(client).not.toHaveProperty('setFlag');
    expect(client.getInventory()).not.toHaveProperty('addItem');
    expect(game.getSaveData().rngState).toBe(before.rngState);
    expect(game.getPlayer(game.getLocalPlayerId())!.flags).toEqual(flags);
  });

  it('does not mutate flags or consume gameplay randomness while building repeated mirrors', () => {
    const { game, session } = setup();
    const before = structuredClone(game.getPlayer(game.getLocalPlayerId())!.flags);
    const rngState = game.getSaveData().rngState;
    for (let index = 0; index < 4; index++) session.getSnapshot();
    expect(game.getPlayer(game.getLocalPlayerId())!.flags).toEqual(before);
    expect(game.getSaveData().rngState).toBe(rngState);
  });

  it('holds one player in inventory while peers, hazards, and world time continue', async () => {
    const { game, session } = setup();
    const alice = session.registerConnection('alice', 'Alice');
    const bob = session.registerConnection('bob', 'Bob');
    const { client } = localClient(session);
    const hazard = vi.spyOn(game, 'hazardClockStep');
    const actor = vi.spyOn(game, 'actorClockStep');
    const atmosphere = vi.spyOn(game, 'updateAtmosphere');
    const before = session.getSnapshot().players;
    expect(await client.setPlayerInteraction('inventory')).toEqual({ ok: true });
    await session.advance(100);
    const after = session.getSnapshot();
    expect(after.players[alice].body).toEqual(before[alice].body);
    expect(after.players[bob].body).not.toEqual(before[bob].body);
    expect(after.ui.playerInteraction).toBe('inventory');
    expect(session.getSnapshot(bob).ui.playerInteraction).toBe('playing');
    expect(after.ui.paused).toBe(false);
    expect(after.tick).toBe(100);
    expect(hazard).toHaveBeenCalledTimes(2);
    expect(actor).toHaveBeenCalledTimes(1);
    expect(atmosphere).toHaveBeenCalledWith(100);
    await client.setPlayerInteraction('playing');
    await session.advance(100);
    expect(client.getSnakeBody()).not.toEqual(before[alice].body);
  });

  it('orders construction intents, validates claims, and exposes authoritative placement state', async () => {
    const { game, session, room } = setup();
    const alice = session.registerConnection('alice', 'Alice');
    const bob = session.registerConnection('bob', 'Bob');
    const { client } = localClient(session);
    expect(await client.claimRoom()).toEqual({ ok: true });
    expect(client.getRoomClaim()?.ownerId).toBe(alice);
    expect(
      await session.executeCommand({ type: 'construction', action: 'claim', playerId: bob }),
    ).toMatchObject({ ok: false });
    expect(await client.beginStructurePlacement('not-a-blueprint')).toEqual({ ok: false });
    expect(client.getStructurePlacement()).toBeNull();
    const claim = client.getRoomClaim()!;
    expect(game.getRoomClaim(room.id)?.ownerId).toBe(alice);
    expect(claim.roomId).toBe(room.id);
    expect(await client.cancelStructurePlacement()).toEqual({ ok: true });
    expect(await client.demolishStructure('missing')).toMatchObject({ ok: false });
  });

  it('rejects unknown quest, unreachable purchase, absent relationship, and dead-player actions', async () => {
    const { game, session } = setup();
    const { client } = localClient(session);
    expect(await client.setActiveQuestMarkerQuestId('unaccepted')).toMatchObject({ ok: false });
    expect(await client.purchaseActorShopOffer('absent', 'forged-offer')).toMatchObject({
      ok: false,
    });
    expect(await client.applyRelationshipChoice('absent', 'propose')).toMatchObject({ ok: false });
    const before = game.getScore();
    game.getPlayer(game.getLocalPlayerId())!.alive = false;
    expect(await client.claimRoom()).toEqual({ ok: false, reason: 'Respawn before acting.' });
    expect(game.getScore()).toBe(before);
    expect(game.getRoomClaim()).toBeUndefined();
  });

  it('commits placement and demolition through the authority and rejects another owner', async () => {
    const { game, session, room } = setup();
    const alice = session.registerConnection('alice', 'Alice');
    const bob = session.registerConnection('bob', 'Bob');
    const { client } = localClient(session);
    await client.claimRoom();
    let valid = false;
    for (let y = 3; y < defaultGameConfig.grid.rows - 4 && !valid; y++) {
      for (let x = 3; x < defaultGameConfig.grid.cols - 4 && !valid; x++) {
        game.placeSnakeBodyAtLocal(room.id, { x, y }, { x: 1, y: 0 });
        game.beginStructurePlacement('small-house');
        valid = game.previewStructurePlacement()?.valid ?? false;
      }
    }
    expect(valid).toBe(true);
    session.refreshSnapshot();
    expect(client.previewStructurePlacement()?.valid).toBe(true);
    expect(await client.confirmStructurePlacement()).toEqual({ ok: true });
    expect(client.getStructurePlacement()).toBeNull();
    const structure = client.placedStructures(room.id)[0]!;
    expect(structure.ownerId).toBe(alice);
    expect(
      await session.executeCommand({
        type: 'construction',
        action: 'demolish',
        playerId: bob,
        structureId: structure.id,
      }),
    ).toEqual({ ok: false });
    expect(client.placedStructures()).toHaveLength(1);
    expect(await client.demolishStructure(structure.id)).toEqual({ ok: true });
    expect(client.placedStructures()).toEqual([]);
  });

  it('resolves relationship profiles on the server and publishes the resulting private state', async () => {
    const { game, session, room } = setup();
    const { client } = localClient(session);
    const actor = createBaseActor({
      id: 'nearby-friend',
      displayName: 'Ada',
      kind: 'civilian',
      role: 'romanceCandidate',
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
    game.placeSnakeBodyAtLocal(room.id, { x: 9, y: 10 }, { x: 0, y: -1 });
    // The scene consumes relationshipResult to render the outcome.
    expect(await client.applyRelationshipChoice(actor.id, 'talk')).toMatchObject({
      ok: true,
      relationshipResult: { ok: true },
    });
    const profile = client
      .getPresentRelationshipProfilesForRoom()
      .find((entry) => entry.actorId === actor.id)!;
    expect(client.getRelationshipState(profile)).toEqual(game.getRelationshipState(profile));
    expect(client.getRelationshipActions(profile)).toEqual(game.getRelationshipActions(profile));
    expect(client.getRelationshipState(profile)?.displayName).toBe('Ada');
    expect(client.getRelationshipState(profile)).toMatchObject({
      affection: 2,
      trust: 2,
      fascination: 1,
    });
  });

  it('validates intent payloads rather than accepting arbitrary method calls or state', () => {
    for (const command of [
      { type: 'playerInteraction', mode: ['paused'] },
      { type: 'playerInteraction', mode: 'freeze-everyone' },
      { type: 'construction', action: 'step', direction: { x: 999, y: 0 } },
      { type: 'construction', action: 'face', direction: { x: 1, y: 1 } },
      { type: 'construction', action: 'begin', blueprintId: '' },
      { type: 'specialAction', action: 'preview', statId: 'luck', delta: 999 },
      { type: 'specialAction', action: 'preview', statId: 'fake', delta: 1 },
      { type: 'relationshipAction', actorId: 'npc', choice: 'grant-reward' },
      { type: 'vehicleAction', action: 'replace', car: { speed: 999 } },
      { type: 'setFlag', key: 'score', value: 999 },
    ])
      expect(isClientCommand({ ...command, playerId: 'player-1' })).toBe(false);
    expect(
      isClientCommand({
        type: 'specialAction',
        action: 'preview',
        statId: 'luck',
        delta: 1,
        playerId: 'player-1',
      }),
    ).toBe(true);
  });

  it('keeps debug weather decisions in the authority and disables them for hosted sessions', async () => {
    const { game, session } = setup();
    const playerId = game.getLocalPlayerId();
    const before = game.getAtmosphereState().globalWeather;
    const command = { type: 'debugAction', action: 'cycleWeather', playerId } as const;
    expect(await session.executeCommand(command)).toEqual({
      ok: false,
      reason: 'Debug commands are disabled for this session.',
    });
    expect(game.getAtmosphereState().globalWeather).toBe(before);
    const debugSession = new AuthoritativeGameSession({ game, allowDebugCommands: true });
    expect(await debugSession.executeCommand(command)).toEqual({ ok: true });
    expect(game.getAtmosphereState().globalWeather).not.toBe(before);
  });

  it('uses the same facade over real WebSocket state and binds purchases to socket identity', async () => {
    const { game, session, room } = setup();
    const server = createGameServer(session);
    const port = await server.listen(0);
    cleanups.push(() => server.close());
    const remote = new WebSocketGameConnection(`ws://127.0.0.1:${port}/game`, 'Alice');
    const client = new SceneGameClient(remote);
    cleanups.push(() => client.destroy());
    await remote.ready;
    const actor = createBaseActor({
      id: 'remote-merchant',
      displayName: 'Ada',
      kind: 'civilian',
      role: 'potionMaker',
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
    actor.flags.shopClosedReason = undefined;
    game.getActorSystem().registry.upsert(actor);
    game.placeSnakeBodyAtLocal(room.id, { x: 9, y: 10 }, { x: 0, y: -1 });
    game.setScore(10000);
    session.refreshSnapshot();
    const offer = game.getActorShopView(actor.id)!.offers[0]!;
    expect(
      await remote.send({
        type: 'purchase',
        playerId: 'forged-player',
        actorId: actor.id,
        offerId: offer.id,
      }),
    ).toMatchObject({ ok: true, message: `Purchased ${offer.label}.` });
    expect(client.getScore()).toBe(10000 - offer.price);
    if (offer.itemId) expect(client.getInventory().getItemCount(offer.itemId)).toBe(1);
    expect(await client.setPlayerInteraction('inventory')).toEqual({ ok: true });
    expect(client.getSnapshot().ui.playerInteraction).toBe('inventory');
    expect(client.getSpecialStatsView()).toEqual(game.getSpecialStatsView());
    expect(client.getSnapshot().clientState).toEqual(session.getSnapshot().clientState);
  });
});
