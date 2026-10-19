import { describe, expect, it } from 'vitest';
import { SnakeGame } from '../../game/snakeGame.js';
import { defaultGameConfig } from '../../config/gameConfig.js';
import { QuestRegistry } from '../../quests/questRegistry.js';
import { createBaseActor } from '../../actors/actorFactory.js';
import { createPhysicalHumanTown, discoverThievesGuild } from '../../world/town.js';
import {
  ARCHAEOLOGY_TILE_DEFINITIONS,
  type ArchaeologySessionSnapshot,
} from '../../archaeology/molemanArchaeology.js';
import { AuthoritativeGameSession } from '../AuthoritativeGameSession.js';
import type { GameEvent } from '../GameEvent.js';
import type { SaveStore } from '../../storage/SaveStore.js';
import type { GameSaveData } from '../../game/saveTypes.js';
import { isClientCommand } from '../gameProtocol.js';

function setup(saveStore?: SaveStore<GameSaveData>) {
  const game = new SnakeGame(
    { ...defaultGameConfig, rng: { seed: 'specialty-services' } },
    new QuestRegistry(),
  );
  game.reset();
  const room = game.getCurrentRoom();
  room.layout = room.layout.map((row) => '.'.repeat(row.length));
  game.bosses.clearAll();
  const session = new AuthoritativeGameSession({ game, manageBasicFeatures: true, saveStore });
  const alice = session.registerConnection('alice', 'Alice');
  const bob = session.registerConnection('bob', 'Bob');
  game.placeSnakeBodyAtLocal(room.id, { x: 5, y: 5 }, { x: 1, y: 0 });
  game.runForPlayer(bob, () =>
    game.placeSnakeBodyAtLocal(room.id, { x: 15, y: 15 }, { x: 0, y: -1 }),
  );
  const events: GameEvent[] = [];
  session.onEvent((event) => events.push(event));
  return { game, room, session, alice, bob, events };
}

function withDig(saveStore?: SaveStore<GameSaveData>) {
  const context = setup(saveStore);
  const { game, room, bob } = context;
  expect(game.spawnMolemanDigSite()).toBe(true);
  const site = room.molemanDigSite!;
  room.layout = room.layout.map((row) => '.'.repeat(row.length));
  game.placeSnakeBodyAtLocal(
    room.id,
    { x: site.foreman.x - 1, y: site.foreman.y },
    { x: 0, y: -1 },
  );
  game.runForPlayer(bob, () => game.placeSnakeBodyAtLocal(room.id, { x: 3, y: 3 }, { x: 0, y: 1 }));
  return { ...context, site };
}

function matchingSwap(snapshot: ArchaeologySessionSnapshot): { x: number; y: number } | undefined {
  for (let y = 0; y < snapshot.board.length; y++)
    for (let x = 0; x < snapshot.board[y].length - 1; x++) {
      const board = snapshot.board.map((row) => [...row]);
      const a = board[y][x];
      const b = board[y][x + 1];
      if (!a || !b || a === b) continue;
      board[y][x] = b;
      board[y][x + 1] = a;
      for (let cy = 0; cy < board.length; cy++)
        for (let cx = 0; cx < board[cy].length; cx++) {
          const tile = board[cy][cx];
          if (
            tile &&
            ARCHAEOLOGY_TILE_DEFINITIONS[tile].matchable &&
            ((board[cy][cx + 1] === tile && board[cy][cx + 2] === tile) ||
              (board[cy + 1]?.[cx] === tile && board[cy + 2]?.[cx] === tile))
          )
            return { x, y };
        }
    }
  return undefined;
}

describe('specialty services on the shared authority', () => {
  it('clears active excavations on a checkpoint load and rejects the old settlement token', async () => {
    const saves = new Map<string, GameSaveData>();
    const { session, alice } = withDig({
      load: async (slot) => structuredClone(saves.get(slot) ?? null),
      save: async (slot, data) => {
        saves.set(slot, structuredClone(data));
      },
      clear: async (slot) => {
        saves.delete(slot);
      },
      has: async (slot) => saves.has(slot),
    });
    expect(await session.executeCommand({ type: 'saveGame', playerId: alice })).toMatchObject({
      ok: true,
    });
    await session.executeCommand({ type: 'archaeologyAction', action: 'start', playerId: alice });
    const id = session.getSnapshot(alice).archaeology!.id;
    expect(await session.executeCommand({ type: 'loadGame', playerId: alice })).toMatchObject({
      loaded: true,
    });
    expect(session.getSnapshot(alice).archaeology).toBeNull();
    expect(
      await session.executeCommand({
        type: 'archaeologyAction',
        action: 'leave',
        id,
        playerId: alice,
      }),
    ).toMatchObject({ ok: false });
  });

  it('clears disconnected excavation state and rejects the previous session after reconnect', async () => {
    const { session, alice } = withDig();
    await session.executeCommand({ type: 'archaeologyAction', action: 'start', playerId: alice });
    const id = session.getSnapshot(alice).archaeology!.id;
    await session.detachConnection('alice');
    expect(session.getSnapshot(alice).archaeology).toBeNull();
    expect(await session.attachConnection('alice', 'Alice')).toBe(alice);
    expect(
      await session.executeCommand({ type: 'archaeologyAction', action: 'start', playerId: alice }),
    ).toEqual({ ok: true });
    expect(session.getSnapshot(alice).archaeology!.id).not.toBe(id);
    expect(
      await session.executeCommand({
        type: 'archaeologyAction',
        action: 'leave',
        id,
        playerId: alice,
      }),
    ).toMatchObject({ ok: false });
  });

  it('does not open a dig through a dead foreman', async () => {
    const { session, game, room, site, alice } = withDig();
    game
      .getActorSystem()
      .registry.update(`relationship:moleman:${room.id}:${site.foreman.id}`, (actor) => ({
        ...actor,
        health: { current: 0, max: 3, state: 'dead' },
      }));
    expect(
      await session.executeCommand({ type: 'archaeologyAction', action: 'start', playerId: alice }),
    ).toMatchObject({ ok: false });
    expect(session.getSnapshot(alice).archaeology).toBeNull();
  });

  it('keeps two simultaneous excavations independent and binds controls to each player session', async () => {
    const { session, game, room, site, alice, bob } = withDig();
    game.runForPlayer(bob, () =>
      game.placeSnakeBodyAtLocal(
        room.id,
        { x: site.foreman.x + 1, y: site.foreman.y },
        { x: 0, y: 1 },
      ),
    );
    for (const playerId of [alice, bob])
      expect(
        await session.executeCommand({ type: 'archaeologyAction', action: 'start', playerId }),
      ).toEqual({ ok: true });
    const a = session.getSnapshot(alice).archaeology!;
    const b = session.getSnapshot(bob).archaeology!;
    expect(a.id).not.toBe(b.id);
    expect(a.state.board).not.toEqual(b.state.board);
    expect(
      await session.executeCommand({
        type: 'archaeologyAction',
        action: 'move',
        id: a.id,
        direction: { x: 1, y: 0 },
        playerId: bob,
      }),
    ).toMatchObject({ ok: false });
    expect(
      await session.executeCommand({
        type: 'archaeologyAction',
        action: 'move',
        id: a.id,
        direction: { x: 1, y: 0 },
        playerId: alice,
      }),
    ).toEqual({ ok: true });
    expect(session.getSnapshot(bob).archaeology!.state.cursor).toEqual(b.state.cursor);
    const before = session.getSnapshot().players;
    await session.advance(100);
    for (const playerId of [alice, bob]) {
      expect(session.getSnapshot().players[playerId].body).toEqual(before[playerId].body);
      expect(session.getSnapshot(playerId).archaeology!.state.riseProgress).toBeGreaterThan(0);
    }
  });

  it('runs excavation on world time, holds its owner, and isolates private boards and inputs', async () => {
    const { session, game, alice, bob, events } = withDig();
    expect(
      await session.executeCommand({ type: 'archaeologyAction', action: 'start', playerId: bob }),
    ).toMatchObject({ ok: false });
    expect(
      await session.executeCommand({ type: 'archaeologyAction', action: 'start', playerId: alice }),
    ).toEqual({ ok: true });
    const initial = session.getSnapshot(alice).archaeology!;
    expect(initial.state.variant.id).toBe(game.getCurrentRoom().molemanDigSite!.variantId);
    expect(session.getSnapshot(bob).archaeology).toBeNull();
    expect(
      await session.executeCommand({
        type: 'archaeologyAction',
        action: 'swap',
        id: initial.id,
        playerId: bob,
      }),
    ).toMatchObject({ ok: false });
    const before = session.getSnapshot().players;
    await session.advance(100);
    expect(session.getSnapshot().players[alice].body).toEqual(before[alice].body);
    expect(session.getSnapshot().players[bob].body).not.toEqual(before[bob].body);
    expect(session.getSnapshot(alice).archaeology!.state.riseProgress).toBeGreaterThan(
      initial.state.riseProgress,
    );
    expect(
      events
        .filter((event) => event.type === 'archaeology.outcome')
        .every((event) => event.playerId === alice),
    ).toBe(true);
    const event = events.find((candidate) => candidate.type === 'archaeology.outcome');
    expect(event?.type).toBe('archaeology.outcome');
    if (event?.type !== 'archaeology.outcome') throw new Error('Missing excavation outcome');
    const originalLine = session.getSnapshot(alice).archaeology!.state.variant.foremanLine;
    expect(event.outcome.messages.join(' ')).toContain(originalLine);
    expect(event.outcome.messages.join(' ')).not.toContain(initial.state.variant.i18nNameKey);
    event.outcome.state.variant.foremanLine = 'Client tried to rewrite the foreman.';
    expect(session.getSnapshot(alice).archaeology!.state.variant.foremanLine).toBe(originalLine);
    initial.state.cursor.x = 999;
    expect(session.getSnapshot(alice).archaeology!.state.cursor.x).not.toBe(999);
    expect(
      await session.executeCommand({
        type: 'minigameAction',
        action: 'start',
        kind: 'baseball',
        playerId: alice,
      }),
    ).toMatchObject({ ok: false, reason: 'Finish the excavation first.' });
  });

  it('pays canonical earned excavation rewards once and rejects repeated or stale session controls', async () => {
    const { session, game, alice } = withDig();
    await session.executeCommand({ type: 'archaeologyAction', action: 'start', playerId: alice });
    const initial = session.getSnapshot(alice).archaeology!;
    const swap = matchingSwap(initial.state);
    expect(swap).toBeDefined();
    for (const axis of ['x', 'y'] as const) {
      while (session.getSnapshot(alice).archaeology!.state.cursor[axis] !== swap![axis]) {
        const delta = Math.sign(
          swap![axis] - session.getSnapshot(alice).archaeology!.state.cursor[axis],
        );
        await session.executeCommand({
          type: 'archaeologyAction',
          action: 'move',
          id: initial.id,
          direction: { x: axis === 'x' ? delta : 0, y: axis === 'y' ? delta : 0 },
          playerId: alice,
        });
      }
    }
    expect(
      await session.executeCommand({
        type: 'archaeologyAction',
        action: 'swap',
        id: initial.id,
        playerId: alice,
      }),
    ).toEqual({ ok: true });
    for (let step = 0; step < 20; step++) await session.advance(100);
    const earned = session.getSnapshot(alice).archaeology!.state.rewards;
    expect(session.getSnapshot(alice).archaeology!.state.score).toBeGreaterThan(0);
    const before = game.getScore();
    const leave = {
      type: 'archaeologyAction',
      action: 'leave',
      id: initial.id,
      playerId: alice,
    } as const;
    expect(await session.executeCommand(leave)).toEqual({ ok: true });
    const result = session.getSnapshot(alice).archaeology!.result!;
    expect(result.payout.score).toBe(
      earned.score + Object.values(earned.apples).reduce((total, count) => total + count, 0),
    );
    expect(game.getScore()).toBe(before + result.payout.score);
    expect(await session.executeCommand(leave)).toMatchObject({ ok: false });
    expect(game.getScore()).toBe(before + result.payout.score);
    await session.executeCommand({
      type: 'archaeologyAction',
      action: 'close',
      id: initial.id,
      playerId: alice,
    });
    await session.executeCommand({ type: 'archaeologyAction', action: 'start', playerId: alice });
    expect(session.getSnapshot(alice).archaeology!.id).not.toBe(initial.id);
    expect(await session.executeCommand(leave)).toMatchObject({ ok: false });
  });

  it('cancels an excavation when its held player dies, without granting a leave reward', async () => {
    const { session, game, room, alice, bob, site } = withDig();
    await session.executeCommand({ type: 'archaeologyAction', action: 'start', playerId: alice });
    game.setFlag('player.health', 1);
    game.runForPlayer(bob, () => {
      game.placeSnakeBodyAtLocal(
        room.id,
        { x: site.foreman.x - 2, y: site.foreman.y },
        { x: 0, y: -1 },
      );
      game.setFlag('equipment.gunEnabled', true);
    });
    const score = game.getScore();
    await session.executeCommand({
      type: 'combatAction',
      action: 'fire',
      direction: { x: 1, y: 0 },
      playerId: bob,
    });
    expect(session.getSnapshot().players[alice].alive).toBe(false);
    expect(session.getSnapshot(alice).archaeology).toBeNull();
    expect(game.getScore()).toBe(score);
  });

  it('promotes the foreman to the canonical Moleman actor for ordinary dialogue and dating', async () => {
    const { session, game, alice, site } = withDig();
    const profile = game
      .getPresentRelationshipProfilesForRoom()
      .find(
        (candidate) => candidate.id === `moleman:${game.getCurrentRoom().id}:${site.foreman.id}`,
      );
    expect(profile).toMatchObject({ species: 'moleman', portraitId: 'moleman-date' });
    expect(
      await session.executeCommand({
        type: 'actorAction',
        action: 'begin',
        actorId: profile!.actorId!,
        playerId: alice,
      }),
    ).toMatchObject({ ok: true });
    expect(game.getRelationshipState(profile!)?.species).toBe('moleman');
  });

  it('validates guild proximity, town identity, costs and job availability before granting rewards', async () => {
    const { game, room, session, alice, bob } = setup();
    const town = discoverThievesGuild(
      createPhysicalHumanTown({
        biomeId: 'verdigris-basin',
        seed: 712,
        townId: 'specialty-guild',
        districtRoomIds: { [room.id]: 'backAlley' },
        entranceRoomId: room.id,
        exitRoomIds: [],
      }),
    );
    town.wantedLevel = 2;
    room.town = town;
    const actor = createBaseActor({
      id: 'guild-contact',
      displayName: 'The Fence',
      kind: 'civilian',
      role: 'guildContact',
      species: 'human',
      thickness: 'medium',
      currentRoomId: room.id,
    });
    actor.presence = {
      roomId: room.id,
      position: { x: 6, y: 5 },
      materialized: true,
      stationary: true,
    };
    game.getActorSystem().registry.upsert(actor);
    expect(
      await session.executeCommand({
        type: 'guildAction',
        action: 'fence',
        townId: town.id,
        playerId: bob,
      }),
    ).toMatchObject({ ok: false });
    expect(
      await session.executeCommand({
        type: 'guildAction',
        action: 'fence',
        townId: 'stale-town',
        playerId: alice,
      }),
    ).toMatchObject({ ok: false });
    expect(
      await session.executeCommand({
        type: 'guildAction',
        action: 'lower-wanted',
        townId: town.id,
        playerId: alice,
      }),
    ).toMatchObject({ ok: false });
    game.setScore(1000);
    expect(
      await session.executeCommand({
        type: 'guildAction',
        action: 'lower-wanted',
        townId: town.id,
        playerId: alice,
      }),
    ).toMatchObject({ ok: true });
    expect(game.getCurrentTown()!.wantedLevel).toBeLessThan(2);
    expect(game.getScore()).toBeLessThan(1000);
    const job = game
      .getCurrentTown()!
      .guildJobs.find((candidate) => candidate.status === 'available')!;
    const command = {
      type: 'guildAction',
      action: 'job',
      townId: town.id,
      jobId: job.id,
      playerId: alice,
    } as const;
    expect(await session.executeCommand(command)).toMatchObject({ ok: true });
    const score = game.getScore();
    expect(await session.executeCommand(command)).toMatchObject({ ok: false });
    expect(game.getScore()).toBe(score);
    expect(game.getPlayer(bob)!.snake.score).toBe(0);
    game.runForPlayer(bob, () =>
      game.placeSnakeBodyAtLocal(room.id, { x: 7, y: 5 }, { x: 0, y: -1 }),
    );
    await session.executeCommand({ type: 'playerInteraction', mode: 'dialogue', playerId: alice });
    await session.executeCommand({ type: 'playerInteraction', mode: 'dialogue', playerId: bob });
    await session.advance(100);
    expect(await session.executeCommand({ ...command, playerId: bob })).toMatchObject({
      ok: false,
    });
    expect(game.getPlayer(bob)!.snake.score).toBe(0);
    const merchant = createBaseActor({
      id: 'guild-merchant',
      displayName: 'Black Market Merchant',
      kind: 'civilian',
      role: 'blackMarketMerchant',
      species: 'human',
      thickness: 'medium',
      currentRoomId: room.id,
    });
    merchant.presence = {
      roomId: room.id,
      position: { x: 18, y: 12 },
      materialized: true,
      stationary: true,
    };
    game.getActorSystem().registry.upsert(merchant);
    game.setScore(10000);
    const market = await session.executeCommand({
      type: 'guildAction',
      action: 'market',
      townId: town.id,
      playerId: alice,
    });
    expect(market.ok).toBe(true);
    const offer = market.shop!.offers.find((entry) => entry.itemId)!;
    expect(
      await session.executeCommand({
        type: 'purchase',
        actorId: merchant.id,
        offerId: offer.id,
        playerId: alice,
      }),
    ).toMatchObject({ ok: false });
    const owned = game.getInventory().getItemCount(offer.itemId!);
    expect(
      await session.executeCommand({
        type: 'guildAction',
        action: 'purchase',
        townId: town.id,
        offerId: offer.id,
        playerId: alice,
      }),
    ).toMatchObject({ ok: true });
    expect(game.getScore()).toBe(10000 - offer.price);
    expect(game.getInventory().getItemCount(offer.itemId!)).toBe(owned + 1);
    expect(
      await session.executeCommand({
        type: 'guildAction',
        action: 'purchase',
        townId: town.id,
        offerId: offer.id,
        playerId: bob,
      }),
    ).toMatchObject({ ok: false });
  });

  it('rejects invalid excavation movement, ids, and guild intents at the protocol boundary', () => {
    expect(
      isClientCommand({
        type: 'archaeologyAction',
        action: 'move',
        id: 1,
        playerId: 'alice',
        direction: { x: 100, y: 0 },
      }),
    ).toBe(false);
    expect(
      isClientCommand({ type: 'archaeologyAction', action: 'leave', id: -1, playerId: 'alice' }),
    ).toBe(false);
    expect(
      isClientCommand({
        type: 'archaeologyAction',
        action: 'award',
        id: 1,
        playerId: 'alice',
        score: 9999,
      }),
    ).toBe(false);
    expect(
      isClientCommand({ type: 'guildAction', action: 'job', playerId: 'alice', townId: 'town' }),
    ).toBe(false);
  });
});
