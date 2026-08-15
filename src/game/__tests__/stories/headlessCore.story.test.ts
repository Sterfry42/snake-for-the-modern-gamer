import { describe, expect, it } from 'vitest';
import {
  HeadlessScenario,
  createHeadlessScenario,
} from '../../../test/headless/headlessScenario.js';
import {
  ensureScenarioActor,
  firstWalkableTile,
  offsetPosition,
} from '../../../test/headless/scenarioFixtures.js';

describe('Headless user-story harness', () => {
  it('world and Actor reads do not advance simulation', () => {
    const scenario = createHeadlessScenario({ seed: 'story-reads-do-not-simulate' });
    ensureScenarioActor(scenario, {
      id: 'nina',
      name: 'Nina',
      role: 'guard',
      position: firstWalkableTile(scenario),
    });
    const before = scenario.captureSimulationFingerprint();

    for (let index = 0; index < 1_000; index += 1) {
      scenario.game.getRoom('0,0,0');
      scenario.game.getRoom('1,0,0');
      scenario.game.getActorsInCurrentRoom();
      scenario.game.getDebugSnapshot();
      scenario.game.getSaveData();
    }

    expect(scenario.captureSimulationFingerprint()).toEqual(before);
    scenario.assertWorldIntegrity();
  });

  it('Actor clock is frame-independent under heavy read load', async () => {
    const scenario = createHeadlessScenario({ seed: 'story-actor-clock-frame-independent' });

    for (let index = 0; index < 10; index += 1) {
      scenario.readNineRoomsRepeatedly(10);
      await scenario.advanceActorTicks(1);
    }

    expect(scenario.diagnostics().actorTicks).toBe(10);
    scenario.assertWorldIntegrity();
  });

  it('a guard defends town from a thief without attacking an innocent player', async () => {
    const scenario = createHeadlessScenario({ seed: 'story-guard-vs-thief' });
    const base = firstWalkableTile(scenario);
    const guard = ensureScenarioActor(scenario, {
      id: 'gate-guard',
      name: 'Gate Guard',
      role: 'guard',
      position: base,
    });
    const thief = ensureScenarioActor(scenario, {
      id: 'market-thief',
      name: 'Market Thief',
      role: 'thief',
      position: offsetPosition(base, 1, 0),
    });

    await scenario.advanceUntil(() => scenario.actor(guard.id).goal?.targetActorId === thief.id, {
      timeoutMs: 1_000,
    });

    expect(scenario.actor(guard.id).goal).toMatchObject({
      kind: 'attackActor',
      targetActorId: thief.id,
    });
    expect(scenario.actor(guard.id).playerHostility?.state).not.toBe('hostile');
    scenario.assertWorldIntegrity();
  });

  it('a scheduled resident keeps one identity while moving toward home at night', async () => {
    const scenario = createHeadlessScenario({ seed: 'story-shopkeeper-goes-home' });
    const workRoomId = scenario.currentRoom().id;
    const homeRoomId = '1,0,0';
    scenario.getRoom(homeRoomId);
    const shopkeeper = ensureScenarioActor(scenario, {
      id: 'marta',
      name: 'Marta',
      role: 'shopkeeper',
      roomId: workRoomId,
      homeRoomId,
      workRoomId,
      position: firstWalkableTile(scenario, workRoomId),
    });

    scenario.setDayPhase('night');
    await scenario.advanceUntil(
      () => scenario.actor(shopkeeper.id).presence?.roomId === homeRoomId,
      { timeoutMs: 2_000 },
    );

    const arrived = scenario.actor(shopkeeper.id);
    expect(arrived.id).toBe(shopkeeper.id);
    expect(arrived.presence?.roomId).toBe(homeRoomId);
    expect(arrived.currentRoomId).toBe(homeRoomId);
    expect(
      scenario.game
        .getActorSystem()
        .registry.getAll()
        .filter((actor) => actor.id === shopkeeper.id),
    ).toHaveLength(1);
    scenario.assertWorldIntegrity();
  });

  it('save/load mid-story preserves Actor travel state', async () => {
    const scenario = createHeadlessScenario({ seed: 'story-save-mid-travel' });
    const startRoomId = '0,0,0';
    const destinationRoomId = '2,0,0';
    scenario.getRoom(destinationRoomId);
    const traveler = ensureScenarioActor(scenario, {
      id: 'cross-room-resident',
      name: 'Cross Room Resident',
      role: 'resident',
      roomId: startRoomId,
      homeRoomId: destinationRoomId,
      workRoomId: startRoomId,
      position: firstWalkableTile(scenario, startRoomId),
    });

    scenario.setActorGoal(traveler.id, {
      kind: 'travelToRoom',
      priority: 60,
      roomId: destinationRoomId,
      reason: 'story-save-mid-travel',
    });
    scenario.enterRoom(startRoomId);
    expect(scenario.currentRoom().id).toBe(startRoomId);
    await scenario.advanceUntil(() => scenario.actor(traveler.id).presence?.roomId === '1,0,0', {
      timeoutMs: 1_000,
    });

    const reloaded = HeadlessScenario.fromSave(scenario.game.getSaveData());
    expect(reloaded.actor(traveler.id).presence?.roomId).toBe('1,0,0');

    await reloaded.advanceUntil(
      () => reloaded.actor(traveler.id).presence?.roomId === destinationRoomId,
      { timeoutMs: 1_000 },
    );
    expect(reloaded.actor(traveler.id).presence?.roomId).toBe(destinationRoomId);
    reloaded.assertWorldIntegrity();
  });

  it('minimap-like nine-room query stress does not mutate simulation state', () => {
    const scenario = createHeadlessScenario({ seed: 'story-minimap-read-stress' });
    ensureScenarioActor(scenario, {
      id: 'map-guard',
      name: 'Map Guard',
      role: 'guard',
      position: firstWalkableTile(scenario),
    });
    const before = scenario.captureSimulationFingerprint();

    scenario.readNineRoomsRepeatedly(400);

    expect(scenario.captureSimulationFingerprint()).toEqual(before);
  });

  it('a populated town can live under deterministic headless clocks', async () => {
    const scenario = createHeadlessScenario({ seed: 'story-town-soak' });
    const base = firstWalkableTile(scenario);
    ensureScenarioActor(scenario, {
      id: 'soak-guard',
      name: 'Soak Guard',
      role: 'guard',
      position: base,
    });
    ensureScenarioActor(scenario, {
      id: 'soak-shopkeeper',
      name: 'Soak Shopkeeper',
      role: 'shopkeeper',
      position: offsetPosition(base, 1, 0),
      homeRoomId: '1,0,0',
    });
    ensureScenarioActor(scenario, {
      id: 'soak-resident',
      name: 'Soak Resident',
      role: 'resident',
      position: offsetPosition(base, 2, 0),
      homeRoomId: '0,1,0',
    });

    await scenario.advanceSeconds(30, { assertIntegrityEveryMs: 1_000 });

    const diagnostics = scenario.diagnostics();
    expect(diagnostics.actorTicks).toBe(300);
    expect(diagnostics.actorCount).toBeGreaterThanOrEqual(3);
    expect(() => JSON.stringify(scenario.game.getSaveData())).not.toThrow();
    scenario.assertWorldIntegrity();
  });
});
