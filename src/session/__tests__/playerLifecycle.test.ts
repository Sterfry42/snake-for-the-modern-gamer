import { describe, expect, it } from 'vitest';
import { SnakeGame } from '../../game/snakeGame.js';
import { defaultGameConfig } from '../../config/gameConfig.js';
import { QuestRegistry } from '../../quests/questRegistry.js';
import { AuthoritativeGameSession } from '../AuthoritativeGameSession.js';
import { SpawnAreaUnavailable } from '../../players/safePlayerSpawn.js';
import type { DeathChoice, DeathEncounterView } from '../../players/playerLifecycle.js';
import { getCharacterCreationOption } from '../../features/characterCreationDefinitions.js';

function setup() {
  const game = new SnakeGame(
    { ...defaultGameConfig, rng: { seed: 'player-lifecycle' } },
    new QuestRegistry(),
  );
  game.reset();
  game.bosses.clearAll();
  const room = game.getCurrentRoom();
  room.layout = room.layout.map((row) => '.'.repeat(row.length));
  room.portals = [];
  const session = new AuthoritativeGameSession({ game, manageBasicFeatures: true });
  session.configureHosting();
  const alice = session.registerConnection('alice', 'Alice', {
    playerId: game.getLocalPlayerId(),
    admin: false,
  });
  return { game, room, session, alice };
}

describe('player lifecycle cutover', () => {
  function encounter(session: AuthoritativeGameSession, id: string): DeathEncounterView {
    const state = session.getSnapshot(id).lifecycle;
    if (state?.kind !== 'death') throw new Error('Expected a death encounter');
    return state.encounter;
  }
  function choose(session: AuthoritativeGameSession, id: string, choice: DeathChoice) {
    const view = encounter(session, id);
    return session.executeCommand({
      type: 'deathEncounterAction',
      playerId: id,
      encounterId: view.id,
      revision: view.revision,
      choice,
    });
  }
  async function collide(session: AuthoritativeGameSession, game: SnakeGame, alice: string) {
    const bob = session.registerConnection('bob', 'Bob');
    game.placeSnakeBodyAtLocal('0,0,0', { x: 10, y: 10 }, { x: 1, y: 0 });
    game.runForPlayer(bob, () =>
      game.placeSnakeBodyAtLocal('0,0,0', { x: 11, y: 10 }, { x: 0, y: 1 }),
    );
    await session.executeCommand({ type: 'playerInteraction', playerId: bob, mode: 'paused' });
    session.actionStep(false);
    return { bob, view: encounter(session, alice) };
  }

  it('spends one life, preserves the encounter across reconnect, and safely returns after a peer occupies its body', async () => {
    const { game, session, alice } = setup();
    game.setFlag('skills.extraLifeCharges', 1);
    const { bob, view } = await collide(session, game, alice);
    expect(view).toMatchObject({ terminal: false, rescueSource: 'extra-life', rescuer: 'angel' });
    expect(session.getSnapshot(alice).lives?.skill).toBe(0);
    game.runForPlayer(bob, () =>
      game.placeSnakeBodyAtLocal('0,0,0', { x: 9, y: 10 }, { x: 1, y: 0 }),
    );
    await session.executeCommand({ type: 'playerInteraction', playerId: bob, mode: 'playing' });
    await session.advance(100);
    expect(session.getSnapshot(bob).players[bob].alive).toBe(true);
    expect(session.getSnapshot(bob).players[bob].body[0]).toEqual({ x: 10, y: 10 });
    expect(session.getSnapshot(bob).lifecycle?.kind).toBe('active');
    expect(
      await session.executeCommand({
        type: 'combatAction',
        playerId: alice,
        action: 'fire',
        direction: { x: 1, y: 0 },
      }),
    ).toMatchObject({ ok: false });
    await session.suspendConnection('alice');
    await session.attachConnection('alice-back', 'Alice', { playerId: alice, admin: false });
    expect(encounter(session, alice)).toEqual(view);
    expect(await choose(session, alice, 'return')).toEqual({ ok: true });
    expect(session.getSnapshot(alice).lifecycle?.kind).toBe('active');
    const returned = session.getSnapshot(alice).players[alice].body;
    expect(
      returned.some((point) =>
        session
          .getSnapshot(bob)
          .players[bob].body.some((other) => point.x === other.x && point.y === other.y),
      ),
    ).toBe(false);
    expect(
      await session.executeCommand({
        type: 'deathEncounterAction',
        playerId: alice,
        encounterId: view.id,
        revision: view.revision,
        choice: 'return',
      }),
    ).toMatchObject({ ok: false });
  });

  it('uses a ward before ordinary lives, exposes Goblin Angel choices, and rejects a stale complaint', async () => {
    const { game, session, alice } = setup();
    game.setFlag('skills.extraLifeCharges', 2);
    game.setFlag('wards.contracts', { self: 1 });
    const { view } = await collide(session, game, alice);
    expect(view).toMatchObject({ rescueSource: 'ward', rescuer: 'goblin-angel', terminal: false });
    expect(session.getSnapshot(alice).lives).toMatchObject({ skill: 2, ward: 0 });
    expect(await choose(session, alice, 'complain')).toEqual({ ok: true });
    expect(
      await session.executeCommand({
        type: 'deathEncounterAction',
        playerId: alice,
        encounterId: view.id,
        revision: view.revision,
        choice: 'complain',
      }),
    ).toMatchObject({ ok: false });
    expect(encounter(session, alice).taunts).toBe(1);
  });

  it('excludes pending bodies from bullets and bombs and keeps simultaneous encounters private', async () => {
    const { game, session, alice } = setup();
    game.setFlag('skills.extraLifeCharges', 1);
    const { bob, view } = await collide(session, game, alice);
    const health = game.getPlayerHealth();
    game.runForPlayer(bob, () => {
      game.setFlag('equipment.gunEnabled', true);
      game.addItem('bomb', 1);
    });
    expect(
      await session.executeCommand({
        type: 'combatAction',
        playerId: bob,
        action: 'fire',
        direction: { x: -1, y: 0 },
      }),
    ).toMatchObject({ ok: true });
    for (let step = 0; step < 4; step++) session.bulletClockStep();
    expect(
      await session.executeCommand({ type: 'useItem', playerId: bob, itemId: 'bomb' }),
    ).toMatchObject({ ok: true });
    await session.advance(3000);
    expect(game.getPlayerHealth()).toEqual(health);
    expect(encounter(session, alice)).toEqual(view);
    const carol = session.registerConnection('carol', 'Carol');
    game.runForPlayer(carol, () =>
      game.placeSnakeBodyAtLocal('0,0,0', { x: 21, y: 20 }, { x: 0, y: 1 }),
    );
    game.runForPlayer(bob, () => {
      game.placeSnakeBodyAtLocal('0,0,0', { x: 20, y: 20 }, { x: 1, y: 0 });
      game.setFlag('skills.extraLifeCharges', 1);
    });
    await session.executeCommand({ type: 'playerInteraction', playerId: carol, mode: 'paused' });
    await session.executeCommand({ type: 'playerInteraction', playerId: bob, mode: 'playing' });
    await session.advance(100);
    const other = encounter(session, bob);
    expect(other.id).not.toBe(view.id);
    expect(encounter(session, alice)).toEqual(view);
    expect(session.getSnapshot(carol).lifecycle?.kind).toBe('active');
    expect(
      await session.executeCommand({
        type: 'deathEncounterAction',
        playerId: bob,
        encounterId: view.id,
        revision: view.revision,
        choice: 'return',
      }),
    ).toMatchObject({ ok: false });
    expect(encounter(session, bob)).toEqual(other);
  });

  it.each(['phoenix', 'fellowship', 'growth'] as const)(
    'keeps %s ahead of regular life charges and records its real cost',
    async (source) => {
      const { game, session, alice } = setup();
      game.setFlag('skills.extraLifeCharges', 2);
      if (source === 'phoenix') game.setFlag('fortitude.phoenix', { charges: 1 });
      if (source === 'fellowship') {
        game.setFlag('fellowship.rescue', true);
        game.setFlag('animals.companions', [
          { id: 'rescue-fox', type: 'fox', name: 'Friend', bond: 20, timesFed: 3, joinedAtRoom: 1 },
        ]);
      }
      if (source === 'growth') {
        game.growSnake(10);
        game.setFlag('growth.tooBigToFail', { minimumLength: 12, cost: 8 });
      }
      const { view } = await collide(session, game, alice);
      expect(view).toMatchObject({ terminal: false, rescueSource: source });
      expect(session.getSnapshot(alice).lives?.skill).toBe(2);
      if (source === 'phoenix') expect(session.getSnapshot(alice).lives?.fortitudePhoenix).toBe(0);
      if (source === 'fellowship') expect(game.getFlag('fellowship.rescueUsed')).toBe(true);
      if (source === 'growth') expect(game.getSnakeLength()).toBe(5);
      const id = view.id;
      await session.advance(300);
      expect(encounter(session, alice).id).toBe(id);
      expect(session.getSnapshot(alice).lives?.skill).toBe(2);
    },
  );

  it('resolves romance once and restores every unfinished terminal phase without spending or choosing again', async () => {
    const { game, session, alice } = setup();
    game.setFlag('skills.extraLifeCharges', 1);
    await collide(session, game, alice);
    const view = encounter(session, alice);
    expect(await choose(session, alice, 'romance')).toEqual({ ok: true });
    expect(encounter(session, alice).romance?.message).toBeTruthy();
    const result = encounter(session, alice).romance;
    expect(
      await session.executeCommand({
        type: 'deathEncounterAction',
        playerId: alice,
        encounterId: view.id,
        revision: view.revision,
        choice: 'romance',
      }),
    ).toMatchObject({ ok: false });
    await session.detachConnection('alice');
    await session.attachConnection('again', 'Alice', { playerId: alice, admin: false });
    expect(encounter(session, alice).romance).toEqual(result);
    await choose(session, alice, 'return');
    game.setFlag('boss.insultedAngel', true);
    const bob = session.getSnapshot().connections!.bob.playerId;
    game.placeSnakeBodyAtLocal('0,0,0', { x: 10, y: 10 }, { x: 1, y: 0 });
    game.runForPlayer(bob, () =>
      game.placeSnakeBodyAtLocal('0,0,0', { x: 11, y: 10 }, { x: 0, y: 1 }),
    );
    session.actionStep(false);
    let connection = 'again';
    for (let phase = 0; phase < 3; phase++) {
      const pending = encounter(session, alice);
      await session.detachConnection(connection);
      connection = `phase-${phase}`;
      await session.attachConnection(connection, 'Alice', { playerId: alice, admin: false });
      expect(encounter(session, alice)).toEqual(pending);
      expect(await choose(session, alice, 'continue')).toEqual({ ok: true });
    }
    expect(encounter(session, alice).phase).toBe('awaiting-respawn');
  });

  it('escapes Hell through the canonical card once, keeps peers intact, and grants the real escape rewards', async () => {
    const { game, session, alice } = setup();
    game.setKarmaToMinimum('test');
    game.getInventory().addItem('get-out-of-hell-free-card', 1);
    const { bob } = await collide(session, game, alice);
    const peer = session.getSnapshot(bob).players[bob];
    expect(encounter(session, alice).afterlifeDestination).toBe('hell');
    for (let step = 0; step < 3; step++)
      expect(await choose(session, alice, 'continue')).toEqual({ ok: true });
    expect(session.getSnapshot(alice).lifecycle?.kind).toBe('active');
    expect(session.getSnapshot(alice).players[alice].roomId).toBe('0,0,-1000');
    expect(session.getSnapshot(alice).ui.inventory?.['get-out-of-hell-free-card']).toBeUndefined();
    expect(session.getSnapshot(alice).lives?.skill).toBe(1);
    expect(game.getFlag('cosmetics.hellEscapeUnlocked')).toBe(true);
    expect(session.getSnapshot(bob).players[bob]).toEqual(peer);
  });

  it('runs terminal afterlife and ledger transitions without resetting world progress or peers', async () => {
    const { game, session, alice } = setup();
    game.getInventory().addItem('healing-potion', 2);
    game.setScore(77);
    const { bob, view } = await collide(session, game, alice);
    expect(view.terminal).toBe(true);
    expect(await choose(session, alice, 'romance')).toMatchObject({ ok: false });
    expect(await session.executeCommand({ type: 'restartRun', playerId: alice })).toMatchObject({
      ok: false,
    });
    const peer = session.getSnapshot(bob).players[bob];
    await session.advance(100);
    const tick = session.getSnapshot().tick;
    expect(await choose(session, alice, 'continue')).toEqual({ ok: true });
    expect(encounter(session, alice).stage).toBe('afterlife');
    await choose(session, alice, 'continue');
    expect(encounter(session, alice).stage).toBe('ledger');
    await choose(session, alice, 'continue');
    expect(encounter(session, alice).phase).toBe('awaiting-respawn');
    await choose(session, alice, 'return');
    expect(session.getSnapshot(alice).players[alice]).toMatchObject({
      alive: true,
      roomId: '0,0,0',
      score: 77,
    });
    expect(session.getSnapshot(alice).ui.inventory?.['healing-potion']).toBe(2);
    expect(session.getSnapshot(bob).players[bob]).toEqual(peer);
    expect(session.getSnapshot().tick).toBe(tick);
  });

  it('applies repeated taunts on authority, and Angel execution bypasses ordinary rescue sources', async () => {
    const { game, session, alice } = setup();
    game.setFlag('skills.extraLifeCharges', 1);
    await collide(session, game, alice);
    for (let count = 0; count < 3; count++)
      expect(await choose(session, alice, 'taunt')).toEqual({ ok: true });
    expect(game.getKarmaAfterlifeDestination()).toBe('hell');
    expect(encounter(session, alice).availableChoices).toEqual(['return']);
    await choose(session, alice, 'return');
    expect(game.getFlag('boss.insultedAngel')).toBe(true);
    game.setFlag('skills.extraLifeCharges', 2);
    game.setFlag('wards.contracts', { self: 1 });
    const bob = session.getSnapshot().connections!.bob.playerId;
    game.placeSnakeBodyAtLocal('0,0,0', { x: 10, y: 10 }, { x: 1, y: 0 });
    game.runForPlayer(bob, () =>
      game.placeSnakeBodyAtLocal('0,0,0', { x: 11, y: 10 }, { x: 0, y: 1 }),
    );
    session.actionStep(false);
    expect(encounter(session, alice)).toMatchObject({
      terminal: true,
      specialExecution: 'insulted-angel',
    });
    expect(session.getSnapshot(alice).lives?.skill).toBe(0);
    expect(session.getSnapshot(alice).lives?.ward).toBe(1);
  });

  it('offers independent canonical creation, blocks play while pending, and grants starters once', async () => {
    const { game } = setup();
    const session = new AuthoritativeGameSession({
      game,
      manageBasicFeatures: true,
      requireCharacterCreation: true,
    });
    session.configureHosting();
    const alice = session.registerConnection('new-alice', 'Alice');
    const bob = session.registerConnection('new-bob', 'Bob');
    const first = game.getPlayer(alice)!.lifecycle;
    if (first?.kind !== 'creating') throw new Error('Missing creation');
    first.offers.faith = ['christianity'];
    expect(
      await session.executeCommand({
        type: 'setDirection',
        playerId: alice,
        direction: { x: 0, y: 1 },
      }),
    ).toMatchObject({ ok: false });
    expect(
      await session.executeCommand({
        type: 'characterCreationAction',
        playerId: alice,
        stage: 'faith',
        optionId: 'forged',
      }),
    ).toMatchObject({ ok: false });
    const faith = {
      type: 'characterCreationAction',
      playerId: alice,
      stage: 'faith',
      optionId: 'christianity',
    } as const;
    expect(await session.executeCommand(faith)).toEqual({ ok: true });
    expect(await session.executeCommand(faith)).toMatchObject({ ok: false });
    expect(session.getSnapshot(alice).lives?.skill).toBe(1);
    for (const id of [alice, bob])
      for (let step = 0; step < 3; step++) {
        const lifecycle = session.getSnapshot(id).lifecycle;
        if (lifecycle?.kind !== 'creating') break;
        const optionId = lifecycle.offers[lifecycle.stage][0];
        expect(getCharacterCreationOption(lifecycle.stage, optionId)).toBeDefined();
        expect(
          await session.executeCommand({
            type: 'characterCreationAction',
            playerId: id,
            stage: lifecycle.stage,
            optionId,
          }),
        ).toEqual({ ok: true });
      }
    expect(session.getSnapshot(alice).lifecycle?.kind).toBe('active');
    expect(session.getSnapshot(bob).lifecycle?.kind).toBe('active');
    const before = session.getSnapshot(alice).lives;
    await session.detachConnection('new-alice');
    await session.attachConnection('back', 'Alice', { playerId: alice, admin: false });
    expect(session.getSnapshot(alice).lives).toEqual(before);
    expect(session.getSnapshot(alice).clientState?.flags['religion.id']).toBe('christianity');
  });
  it('finishes only missing legacy selections without granting an existing class twice', async () => {
    const { game } = setup();
    game.getPlayer(game.getLocalPlayerId())!.lifecycle = undefined;
    game.setFlag('class.id', 'runner');
    game.setFlag('religion.id', 'christianity');
    game.setFlag('skills.extraLifeCharges', 2);
    const session = new AuthoritativeGameSession({
      game,
      manageBasicFeatures: true,
      requireCharacterCreation: true,
    });
    const id = session.registerConnection('legacy', 'Legacy');
    const state = session.getSnapshot(id).lifecycle;
    if (state?.kind !== 'creating') throw new Error('Missing legacy creation stage');
    expect(state.stage).toBe('background');
    expect(await session.executeCommand({ type: 'restartRun', playerId: id })).toMatchObject({
      ok: false,
    });
    expect(
      await session.executeCommand({
        type: 'characterCreationAction',
        playerId: id,
        stage: 'background',
        optionId: state.offers.background[0],
      }),
    ).toEqual({ ok: true });
    expect(session.getSnapshot(id).lifecycle?.kind).toBe('active');
    expect(session.getSnapshot(id).clientState?.flags['class.id']).toBe('runner');
    expect(session.getSnapshot(id).lives?.skill).toBe(2);
  });

  it('spawns three newcomers at origin when the incumbent and a guest travel far away', async () => {
    const { game, session, alice } = setup();
    game.placeSnakeBodyAtLocal('2,0,0', { x: 10, y: 10 }, { x: 1, y: 0 });
    const guests: string[] = [];
    for (const name of ['bob', 'carol', 'dave'])
      guests.push(session.registerConnection(name, name));
    const bodies = guests.map((id) => session.getSnapshot(id).players[id]);
    expect(bodies.every((player) => player.roomId === '0,0,0')).toBe(true);
    expect(
      new Set(bodies.flatMap((player) => player.body.map((point) => `${point.x},${point.y}`))).size,
    ).toBe(9);
    game.runForPlayer(guests[0], () =>
      game.placeSnakeBodyAtLocal('3,0,0', { x: 8, y: 9 }, { x: 1, y: 0 }),
    );
    game.runForPlayer(guests[0], () => {
      game.getInventory().addItem('healing-potion', 2);
      game.setFlag('skills.extraLifeCharges', 3);
    });
    const returning = session.getSnapshot(guests[0]).players[guests[0]];
    await session.detachConnection('bob');
    await session.attachConnection('bob-again', 'Bob', { playerId: guests[0], admin: false });
    expect(session.getSnapshot(guests[0]).players[guests[0]].body).toEqual(returning.body);
    expect(session.getSnapshot(guests[0]).ui.inventory?.['healing-potion']).toBe(2);
    expect(game.runForPlayer(guests[0], () => game.getFlag('skills.extraLifeCharges'))).toBe(3);
    expect(session.getSnapshot(alice).permissions?.manageWorld).toBe(false);
    const fourth = session.registerConnection('eve', 'Eve');
    expect(session.getSnapshot(fourth).players[fourth].roomId).toBe('0,0,0');
  });

  it('fails visibly when origin is full and never falls back to the incumbent room', () => {
    const { game, room, session } = setup();
    game.placeSnakeBodyAtLocal('2,0,0', { x: 10, y: 10 }, { x: 1, y: 0 });
    room.layout = room.layout.map((row) => '~'.repeat(row.length));
    expect(() => session.registerConnection('guest', 'Guest')).toThrow(SpawnAreaUnavailable);
    expect(game.getPlayers()).toHaveLength(1);
  });

  it('respawns only the selected dead character, excluding dead bodies from occupancy', async () => {
    const { game, session, alice } = setup();
    const bob = session.registerConnection('bob', 'Bob');
    const before = session.getSnapshot(bob).players[bob];
    game.getPlayer(alice)!.alive = false;
    const tick = session.getSnapshot().tick;
    expect(await session.executeCommand({ type: 'restartRun', playerId: alice })).toMatchObject({
      ok: true,
    });
    expect(session.getSnapshot().tick).toBe(tick);
    expect(session.getSnapshot(bob).players[bob]).toEqual(before);
    expect(session.getSnapshot(alice).players[alice].roomId).toBe('0,0,0');
  });
});
