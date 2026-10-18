import { describe, expect, it } from 'vitest';
import { SnakeGame } from '../../game/snakeGame.js';
import { QuestRegistry } from '../../quests/questRegistry.js';
import { defaultGameConfig } from '../../config/gameConfig.js';
import { createParkedCar, type DrivingCarState } from '../../vehicles/car.js';
import { AuthoritativeGameSession } from '../AuthoritativeGameSession.js';

function setup() {
  const game = new SnakeGame(
    { ...defaultGameConfig, rng: { seed: 'scene-gameplay' } },
    new QuestRegistry(),
  );
  game.reset();
  const room = game.getCurrentRoom();
  room.layout = room.layout.map((row) => '.'.repeat(row.length));
  game.bosses.clearAll();
  const session = new AuthoritativeGameSession({ game, manageBasicFeatures: true });
  const alice = session.registerConnection('alice', 'Alice');
  const bob = session.registerConnection('bob', 'Bob');
  game.placeSnakeBodyAtLocal(room.id, { x: 5, y: 12 }, { x: 1, y: 0 });
  game.runForPlayer(bob, () =>
    game.placeSnakeBodyAtLocal(room.id, { x: 15, y: 16 }, { x: 1, y: 0 }),
  );
  return { game, room, session, alice, bob };
}

describe('normal scene commands on the headless authority', () => {
  it('uses server minigame clocks, gear checks, and outcomes instead of accepting client rewards', async () => {
    const { game, room, session, alice, bob } = setup();
    expect(
      await session.executeCommand({
        type: 'minigameAction',
        action: 'start',
        kind: 'baseball',
        playerId: alice,
      }),
    ).toMatchObject({ ok: false });
    game.getInventory().addItem('baseball-bat', 1);
    game.getInventory().equip('baseball-bat');
    expect(
      await session.executeCommand({
        type: 'minigameAction',
        action: 'start',
        kind: 'baseball',
        playerId: alice,
      }),
    ).toMatchObject({ ok: true });
    const held = session.getSnapshot().players[alice].body;
    const moving = session.getSnapshot().players[bob].body;
    const initial = session.getSnapshot().minigame;
    await session.advance(100);
    expect(session.getSnapshot().players[alice].body).toEqual(held);
    expect(session.getSnapshot().players[bob].body).not.toEqual(moving);
    expect(session.getSnapshot().minigame).not.toEqual(initial);
    expect(
      await session.executeCommand({ type: 'minigameAction', action: 'swing', playerId: alice }),
    ).toMatchObject({ ok: true });
    expect(game.getFlag('baseball.stats')).toMatchObject({ swings: 1 });
    expect(
      await session.executeCommand({ type: 'minigameAction', action: 'swing', playerId: alice }),
    ).toMatchObject({ ok: false });
    for (let step = 0; step < 14; step++) await session.advance(100);
    game.placeSnakeBodyAtLocal(room.id, { x: 5, y: 12 }, { x: 1, y: 0 });
    game.getInventory().addItem('fishing-rod', 1);
    game.getInventory().equip('fishing-rod');
    expect(
      await session.executeCommand({
        type: 'minigameAction',
        action: 'start',
        kind: 'fishing',
        playerId: alice,
      }),
    ).toMatchObject({ ok: false });
    room.biomeId = 'verdigris-basin';
    const row = room.layout[11]!;
    room.layout[11] = row.slice(0, 5) + '~' + row.slice(6);
    expect(
      await session.executeCommand({
        type: 'minigameAction',
        action: 'start',
        kind: 'fishing',
        playerId: alice,
      }),
    ).toMatchObject({ ok: true });
    await session.executeCommand({ type: 'playerInteraction', mode: 'paused', playerId: bob });
    for (let step = 0; step < 200 && !session.getSnapshot().minigame?.result; step++)
      await session.advance(100);
    expect(game.getFlag('fishCaught')).toBe(true);
    expect(game.getFlag<unknown[]>('fishing.catchJournal')).toHaveLength(1);
    for (let step = 0; step < 5; step++) await session.advance(100);
    expect(game.getFlag<unknown[]>('fishing.catchJournal')).toHaveLength(1);
  });

  it('keeps attached guests and their inventory through a host checkpoint load', async () => {
    const { game, session, alice, bob } = setup();
    game.runForPlayer(bob, () => game.getInventory().addItem('healing-potion', 2));
    const guest = session.getSnapshot().players[bob];
    const data = game.getSaveData();
    game.addScore(100);
    expect(game.loadConnectedCheckpoint(data)).toBe(true);
    expect(session.getSnapshot().players[bob]).toEqual(guest);
    expect(game.runForPlayer(bob, () => game.getInventory().getItemCount('healing-potion'))).toBe(
      2,
    );
    expect(session.getSnapshot().players[alice].score).toBe(data.score);
    expect(await session.executeCommand({ type: 'saveGame', playerId: bob })).toMatchObject({
      ok: false,
    });
  });
  it('steps one snake manually in a turn area while peers and the environment advance', async () => {
    const { game, room, session, alice, bob } = setup();
    room.garage = {
      id: 'test-garage',
      name: 'Garage',
      bounds: { left: 2, top: 10, width: 8, height: 5 },
      mechanic: { id: 'mechanic', name: 'Mechanic', x: 3, y: 11 },
      carSpawn: { x: 7, y: 12 },
    };
    const held = session.getSnapshot().players[alice].body;
    const moving = session.getSnapshot().players[bob].body;
    await session.advance(100);
    expect(session.getSnapshot().players[alice].body).toEqual(held);
    expect(session.getSnapshot().players[bob].body).not.toEqual(moving);
    expect(game.getFlag('timeMs')).toBe(100);
    expect(await session.executeCommand({ type: 'manualStep', playerId: alice })).toMatchObject({
      ok: true,
    });
    expect(session.getSnapshot().players[alice].body[0]).toEqual({ x: 6, y: 12 });
    expect(await session.executeCommand({ type: 'manualStep', playerId: bob })).toMatchObject({
      ok: false,
    });
    await session.executeCommand({ type: 'playerInteraction', mode: 'dialogue', playerId: alice });
    expect(await session.executeCommand({ type: 'manualStep', playerId: alice })).toMatchObject({
      ok: false,
    });
  });

  it('owns car entry, input, physics, player-only holds, and exit without a scene', async () => {
    const { game, room, session, alice, bob } = setup();
    game.parkCar(room.id, createParkedCar('shared-car', { x: 6, y: 12 }, Math.PI / 2));
    expect(
      await session.executeCommand({
        type: 'vehicleAction',
        action: 'enter',
        carId: 'shared-car',
        playerId: alice,
      }),
    ).toMatchObject({ ok: true });
    expect(game.getCars(room.id)).toEqual([]);
    expect(
      await session.executeCommand({
        type: 'vehicleAction',
        action: 'enter',
        carId: 'shared-car',
        playerId: bob,
      }),
    ).toMatchObject({ ok: false });
    await session.executeCommand({
      type: 'vehicleAction',
      action: 'input',
      throttle: 1,
      steering: 0,
      playerId: alice,
    });
    const start = structuredClone(game.getFlag<DrivingCarState>('vehicle.active'));
    await session.advance(100);
    expect(game.getFlag('vehicle.active')).not.toEqual(start);
    await session.executeCommand({ type: 'playerInteraction', mode: 'paused', playerId: alice });
    const held = structuredClone(game.getFlag('vehicle.active'));
    const moving = session.getSnapshot().players[bob].body;
    await session.advance(100);
    expect(game.getFlag('vehicle.active')).toEqual(held);
    expect(session.getSnapshot().players[bob].body).not.toEqual(moving);
    expect(
      await session.executeCommand({ type: 'vehicleAction', action: 'exit', playerId: alice }),
    ).toMatchObject({ ok: true });
    expect(game.getFlag('vehicle.active')).toBeUndefined();
    expect(game.getCars(room.id)).toHaveLength(1);
  });

  it('consumes an extra life on the authority and preserves the other player', async () => {
    const { game, room, session, alice, bob } = setup();
    const row = room.layout[12]!;
    room.layout[12] = row.slice(0, 6) + '#' + row.slice(7);
    game.setFlag('skills.extraLifeCharges', 1);
    game.setFlag('player.health', 1);
    const events: string[] = [];
    session.onEvent((event) => events.push(event.type));
    for (let step = 0; step < 5 && game.getFlag<number>('skills.extraLifeCharges') === 1; step++)
      await session.advance(100);
    expect(session.getSnapshot().players[alice].alive).toBe(true);
    expect(session.getSnapshot().players[bob].alive).toBe(true);
    expect(game.getFlag('skills.extraLifeCharges')).toBe(0);
    expect(game.getPlayerHealth().current).toBeGreaterThan(0);
    expect(events).toContain('player.revived');
    expect(events).not.toContain('player.died');
  });
});
