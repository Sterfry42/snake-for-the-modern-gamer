import { describe, expect, it } from 'vitest';
import { SnakeGame } from '../../game/snakeGame.js';
import { QuestRegistry } from '../../quests/questRegistry.js';
import { defaultGameConfig } from '../../config/gameConfig.js';
import { AuthoritativeGameSession } from '../AuthoritativeGameSession.js';
import { SceneReadReplica } from '../SceneReadReplica.js';
import type { GameSnapshot } from '../GameSnapshot.js';

/**
 * Local (non-hosted) snapshots must scope the world payload by room revision:
 * the first snapshot hydrates the whole explored world, steady-state snapshots
 * carry only the player's room, and changed rooms re-join the payload. The
 * read replica follows the revision-scoped stream without losing old rooms.
 * The wise old snake keeps 999 rooms warm; we only ask the wire to carry what
 * actually changed.
 */
describe('local snapshot room scoping', () => {
  function setup() {
    const registry = new QuestRegistry();
    const game = new SnakeGame(
      { ...defaultGameConfig, rng: { seed: 'local-snapshot-scoping' } },
      registry,
    );
    game.reset();
    game.bosses.clearAll();
    for (let index = 0; index < 16; index += 1) game.getRoom(`${index},7,0`);
    const session = new AuthoritativeGameSession({ game, manageBasicFeatures: true });
    return { game, session, registry };
  }

  function roomIds(snapshot: GameSnapshot): string[] {
    return snapshot.clientState?.worldRooms.map((room) => room.id) ?? [];
  }

  it('publishes the whole world once, then only the player room', () => {
    const { game, session } = setup();
    const homeId = game.getCurrentRoom().id;

    const first = session.getSnapshot();
    expect(first.replication?.epoch).toBeTypeOf('number');
    expect(roomIds(first)).toContain(homeId);
    // First publish is the full hydration surface.
    expect(roomIds(first).length).toBeGreaterThanOrEqual(16);

    const steady = session.getSnapshot();
    expect(roomIds(steady)).toEqual([homeId]);

    const steadyAgain = session.getSnapshot();
    expect(roomIds(steadyAgain)).toEqual([homeId]);
  });

  it('re-publishes rooms whose revision changed and skips untouched rooms', () => {
    const { game, session } = setup();
    const homeId = game.getCurrentRoom().id;
    session.getSnapshot();

    // Mutate one distant room through the world cache (proxy write bumps revision).
    const otherId = '15,7,0';
    game.getRoom(otherId).apple = { x: 3, y: 3 };
    const after = session.getSnapshot();
    expect(roomIds(after).sort()).toEqual([homeId, otherId].sort());

    // The mutated room is now "seen" at its new revision: steady state
    // returns to the player's room only, without regressing to full-world.
    const next = session.getSnapshot();
    expect(roomIds(next)).toEqual([homeId]);
  });

  it('keeps the replica complete across revision-scoped snapshots', () => {
    const { game, session, registry } = setup();
    const homeId = game.getCurrentRoom().id;
    const first = session.getSnapshot();
    const replica = new SceneReadReplica(defaultGameConfig, registry, first);
    expect(replica.game.peekCachedRoom('10,7,0')).toBeDefined();

    // Steady snapshot: only the home room ships; the replica must keep the rest.
    replica.hydrate(session.getSnapshot());
    expect(replica.game.peekCachedRoom('10,7,0')).toBeDefined();
    expect(replica.game.peekCachedRoom('14,7,0')).toBeDefined();

    // Mutate a distant room; the scoped stream carries it and the replica sees it.
    const otherId = '14,7,0';
    game.getRoom(otherId).apple = { x: 2, y: 2 };
    replica.hydrate(session.getSnapshot());
    expect(replica.game.peekCachedRoom(otherId)?.apple).toEqual({ x: 2, y: 2 });
    expect(replica.game.peekCachedRoom('10,7,0')).toBeDefined();
    // The visible room and player state stay in sync.
    expect(replica.game.getCurrentRoom().id).toBe(homeId);
    game.setScore(33);
    replica.hydrate(session.getSnapshot());
    expect(replica.game.getScore()).toBe(33);
  });

  it('tracks published revisions per player so debug snapshots do not consume the local stream', () => {
    const { game, session } = setup();
    const homeId = game.getCurrentRoom().id;
    const localId = game.getLocalPlayerId();
    session.getSnapshot();

    // Register a second connected player (own stream, seeded context).
    const otherId = session.registerConnection('bench-conn', 'Bob', {
      playerId: 'bench-bob',
      admin: true,
    });
    expect(otherId).toBe('bench-bob');
    expect(game.getPlayer(otherId)).toBeDefined();

    // The new player's first snapshot publishes the full world for hydration.
    const debug = session.getSnapshot(otherId);
    expect(roomIds(debug).length).toBeGreaterThanOrEqual(16);

    // The local stream must be unaffected: still just the player room.
    expect(roomIds(session.getSnapshot(localId))).toEqual([homeId]);
  });

  it('re-hydrates the replica world when the replication epoch changes', () => {
    const { game, session, registry } = setup();
    const first = session.getSnapshot();
    const replica = new SceneReadReplica(defaultGameConfig, registry, first);
    expect(replica.game.peekCachedRoom('10,7,0')).toBeDefined();

    // A world reset bumps the epoch; the next snapshot must rebuild the replica.
    game.reset();
    const homeId = game.getCurrentRoom().id;
    const after = session.getSnapshot();
    expect(after.replication?.epoch).not.toBe(first.replication?.epoch);
    replica.hydrate(after);
    expect(replica.game.getCurrentRoom().id).toBe(homeId);
    expect(replica.game.peekCachedRoom('10,7,0')).toBeUndefined();
  });
});
