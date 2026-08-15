import { describe, expect, it } from 'vitest';
import {
  HeadlessScenario,
  createHeadlessScenario,
} from '../../../test/headless/headlessScenario.js';
import {
  adjacentWalkableTile,
  ensureScenarioActor,
  findGeneratedTownDoor,
  firstWalkableTile,
  offsetPosition,
  walkableTileAwayFrom,
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
      { timeoutMs: 16_000 },
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

  it('a same-room night schedule moves a resident to their home tile and sleeps', async () => {
    const scenario = createHeadlessScenario({ seed: 'story-same-room-home-tile' });
    const roomId = scenario.currentRoom().id;
    const homeTile = firstWalkableTile(scenario, roomId);
    const startTile = walkableTileAwayFrom(scenario, roomId, homeTile, 6);
    const resident = ensureScenarioActor(scenario, {
      id: 'same-room-sleeper',
      name: 'Same Room Sleeper',
      role: 'resident',
      roomId,
      homeRoomId: roomId,
      workRoomId: roomId,
      position: homeTile,
    });
    scenario.placeActor(resident.id, {
      roomId,
      position: startTile,
      anchor: startTile,
      materialized: true,
    });
    scenario.enterRoom(roomId);

    scenario.setDayPhase('night');
    expect(scenario.actor(resident.id).goal).toMatchObject({
      kind: 'sleep',
      roomId,
      targetPosition: homeTile,
    });

    await scenario.advanceUntil(
      () =>
        scenario.actor(resident.id).presence?.position.x === homeTile.x &&
        scenario.actor(resident.id).presence?.position.y === homeTile.y &&
        scenario.actor(resident.id).activity?.kind === 'sleeping',
      { timeoutMs: 5_000 },
    );
    expect(scenario.actor(resident.id).activity?.kind).toBe('sleeping');
    scenario.assertWorldIntegrity();
  });

  it('adjacent sleeping residents stay quiet without casual conversations', async () => {
    const scenario = createHeadlessScenario({ seed: 'story-sleep-is-quiet' });
    const roomId = scenario.currentRoom().id;
    const first = firstWalkableTile(scenario, roomId);
    const second = adjacentWalkableTile(scenario.currentRoom(), first);
    const alice = ensureScenarioActor(scenario, {
      id: 'quiet-sleeper-alice',
      name: 'Quiet Sleeper Alice',
      role: 'resident',
      roomId,
      position: first,
    });
    const bob = ensureScenarioActor(scenario, {
      id: 'quiet-sleeper-bob',
      name: 'Quiet Sleeper Bob',
      role: 'resident',
      roomId,
      position: second,
    });
    for (const actor of [alice, bob]) {
      const position = scenario.actor(actor.id).presence?.position;
      expect(position).toBeDefined();
      if (!position) {
        throw new Error(`Sleeping Actor ${actor.id} has no presence.`);
      }
      scenario.setActorGoal(actor.id, {
        kind: 'sleep',
        priority: 20,
        roomId,
        targetPosition: position,
        reason: 'story-sleep-is-quiet',
      });
      scenario.game.getActorSystem().setActivity(
        actor.id,
        {
          kind: 'sleeping',
          source: 'schedule',
        },
        'story-sleep-is-quiet',
      );
    }

    await scenario.advanceSeconds(30, { assertIntegrityEveryMs: 5_000 });

    expect(scenario.actor(alice.id).activity?.kind).toBe('sleeping');
    expect(scenario.actor(bob.id).activity?.kind).toBe('sleeping');
    expect(scenario.actor(alice.id).flags.actorConversation).toBeUndefined();
    expect(scenario.actor(bob.id).flags.actorConversation).toBeUndefined();
    scenario.assertWorldIntegrity();
  });

  it('waking a sleeping butcher interrupts sleep without opening the shop', async () => {
    const scenario = createHeadlessScenario({ seed: 'story-wake-sleeping-butcher' });
    const roomId = scenario.currentRoom().id;
    const butcher = ensureScenarioActor(scenario, {
      id: 'midnight-butcher',
      name: 'Midnight Butcher',
      role: 'shopkeeper',
      roomId,
      position: firstWalkableTile(scenario, roomId),
    });
    scenario.game.getActorSystem().registry.update(butcher.id, (actor) => ({
      ...actor,
      role: 'butcher',
    }));
    scenario.setActorGoal(butcher.id, {
      kind: 'sleep',
      priority: 20,
      roomId,
      targetPosition: scenario.actor(butcher.id).presence?.position,
      reason: 'story-wake-sleeping-butcher',
    });
    scenario.game
      .getActorSystem()
      .setActivity(
        butcher.id,
        { kind: 'sleeping', source: 'schedule' },
        'story-wake-sleeping-butcher',
      );

    expect(
      scenario.game.getActorInteractionMenu(butcher.id)?.options.map((option) => option.id),
    ).toEqual(['wake', 'leave']);

    const result = scenario.game.wakeActor(butcher.id);

    expect(result.ok).toBe(true);
    expect(scenario.actor(butcher.id).goal?.kind).toBe('sleep');
    expect(scenario.actor(butcher.id).activity?.kind).not.toBe('sleeping');
    expect(scenario.actor(butcher.id).flags.sleepInterrupted).toBe(true);
    const shop = scenario.game
      .getActorInteractionMenu(butcher.id)
      ?.options.find((option) => option.id === 'shop');
    expect(shop).toMatchObject({
      enabled: false,
      reason: 'Closed: let them sleep',
    });
    expect(scenario.game.getActorClosedServiceLine(butcher.id)).toContain('sunrise');

    await scenario.advanceSeconds(31);

    expect(scenario.actor(butcher.id).flags.sleepInterrupted).toBeUndefined();
    expect(scenario.actor(butcher.id).activity?.kind).toBe('sleeping');
    scenario.assertWorldIntegrity();
  });

  it('a stationary shopkeeper can leave the post when the schedule changes', async () => {
    const scenario = createHeadlessScenario({ seed: 'story-stationary-worker-leaves-post' });
    const workRoomId = scenario.currentRoom().id;
    const homeRoomId = '1,0,0';
    scenario.getRoom(homeRoomId);
    const shopkeeper = ensureScenarioActor(scenario, {
      id: 'night-shift-shopkeeper',
      name: 'Night Shift Shopkeeper',
      role: 'shopkeeper',
      roomId: workRoomId,
      homeRoomId,
      workRoomId,
      position: { x: 8, y: 8 },
    });
    scenario.placeActor(shopkeeper.id, {
      roomId: workRoomId,
      position: { x: 8, y: 8 },
      anchor: { x: 8, y: 8 },
      materialized: true,
      stationary: true,
    });
    scenario.enterRoom(workRoomId);

    scenario.setDayPhase('night');

    await scenario.advanceUntil(
      () => scenario.actor(shopkeeper.id).presence?.roomId === homeRoomId,
      { timeoutMs: 16_000 },
    );
    expect(scenario.actor(shopkeeper.id).activity?.kind).not.toBe('merchant');
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
      position: { x: 26, y: 1 },
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
      timeoutMs: 4_000,
    });

    const reloaded = HeadlessScenario.fromSave(scenario.game.getSaveData());
    expect(reloaded.actor(traveler.id).presence?.roomId).toBe('1,0,0');

    await reloaded.advanceUntil(
      () => reloaded.actor(traveler.id).presence?.roomId === destinationRoomId,
      { timeoutMs: 16_000 },
    );
    expect(reloaded.actor(traveler.id).presence?.roomId).toBe(destinationRoomId);
    reloaded.assertWorldIntegrity();
  });

  it('the player can follow an Actor through consecutive room transitions', async () => {
    const scenario = createHeadlessScenario({ seed: 'story-player-can-follow-actor-transition' });
    const startRoomId = '0,0,0';
    const middleRoomId = '1,0,0';
    const destinationRoomId = '2,0,0';
    scenario.getRoom(destinationRoomId);
    const traveler = ensureScenarioActor(scenario, {
      id: 'followable-traveler',
      name: 'Followable Traveler',
      role: 'resident',
      roomId: startRoomId,
      position: { x: 26, y: 1 },
    });
    scenario.enterRoom(startRoomId);
    scenario.setActorGoal(traveler.id, {
      kind: 'travelToRoom',
      priority: 80,
      roomId: destinationRoomId,
      reason: 'story-player-can-follow-actor-transition',
    });

    await scenario.advanceUntil(
      () => scenario.actor(traveler.id).presence?.roomId === middleRoomId,
      { timeoutMs: 4_000 },
    );
    const entryPosition = scenario.actor(traveler.id).presence?.position;
    expect(entryPosition).toEqual({ x: 1, y: 1 });

    await scenario.advanceActorTicks(1);
    expect(scenario.actor(traveler.id).presence?.roomId).toBe(middleRoomId);
    expect(scenario.actor(traveler.id).presence?.materialized).toBe(false);

    scenario.enterRoom(middleRoomId);
    expect(scenario.actor(traveler.id).presence?.roomId).toBe(middleRoomId);
    expect(scenario.actor(traveler.id).presence?.materialized).toBe(true);
    expect(scenario.actor(traveler.id).presence?.position.x).toBeGreaterThan(1);
    expect(scenario.actor(traveler.id).presence?.position.x).toBeLessThan(
      scenario.game.config.grid.cols - 2,
    );
    scenario.assertWorldIntegrity();
  });

  it('a visible Actor can leave the loaded room and continue cross-room travel', async () => {
    const scenario = createHeadlessScenario({ seed: 'story-onscreen-cross-room-travel' });
    const startRoomId = '0,0,0';
    const destinationRoomId = '2,0,0';
    scenario.getRoom(destinationRoomId);
    const traveler = ensureScenarioActor(scenario, {
      id: 'onscreen-traveler',
      name: 'Onscreen Traveler',
      role: 'resident',
      roomId: startRoomId,
      position: { x: 26, y: 1 },
    });
    scenario.enterRoom(startRoomId);
    scenario.setActorGoal(traveler.id, {
      kind: 'travelToRoom',
      priority: 80,
      roomId: destinationRoomId,
      reason: 'story-onscreen-cross-room-travel',
    });

    await scenario.advanceUntil(() => scenario.actor(traveler.id).presence?.roomId === '1,0,0', {
      timeoutMs: 4_000,
    });
    expect(scenario.actor(traveler.id).presence?.materialized).toBe(false);

    await scenario.advanceUntil(
      () => scenario.actor(traveler.id).presence?.roomId === destinationRoomId,
      { timeoutMs: 16_000 },
    );
    expect(scenario.actor(traveler.id).currentRoomId).toBe(destinationRoomId);
    scenario.assertWorldIntegrity();
  });

  it('a visible Actor takes a cardinal intermediate room for diagonal travel', async () => {
    const scenario = createHeadlessScenario({ seed: 'story-onscreen-diagonal-travel' });
    const startRoomId = '0,0,0';
    const destinationRoomId = '1,1,0';
    scenario.getRoom(destinationRoomId);
    const traveler = ensureScenarioActor(scenario, {
      id: 'diagonal-traveler',
      name: 'Diagonal Traveler',
      role: 'resident',
      roomId: startRoomId,
      position: { x: 26, y: 1 },
    });
    scenario.enterRoom(startRoomId);
    scenario.setActorGoal(traveler.id, {
      kind: 'travelToRoom',
      priority: 80,
      roomId: destinationRoomId,
      reason: 'story-onscreen-diagonal-travel',
    });

    await scenario.advanceUntil(
      () => scenario.actor(traveler.id).presence?.roomId !== startRoomId,
      { timeoutMs: 4_000 },
    );
    expect(scenario.actor(traveler.id).presence?.roomId).not.toBe(destinationRoomId);
    expect(['1,0,0', '0,1,0']).toContain(scenario.actor(traveler.id).presence?.roomId);

    await scenario.advanceUntil(
      () => scenario.actor(traveler.id).presence?.roomId === destinationRoomId,
      { timeoutMs: 16_000 },
    );
    scenario.assertWorldIntegrity();
  });

  it('a visible Actor does not use an unrelated town door as a cross-room shortcut', async () => {
    const scenario = createHeadlessScenario({ seed: 'story-cross-town-ignores-shop-door' });
    const { room, entrance } = findGeneratedTownDoor(scenario, { templateId: 'generalStore' });
    const [roomX, roomY, roomZ] = room.id.split(',').map(Number);
    const destinationRoomId = `${roomX + 1},${roomY},${roomZ}`;
    scenario.getRoom(destinationRoomId);
    const traveler = ensureScenarioActor(scenario, {
      id: 'door-ignoring-traveler',
      name: 'Door Ignoring Traveler',
      role: 'resident',
      roomId: room.id,
      position: adjacentWalkableTile(room, entrance),
    });
    scenario.enterRoom(room.id);
    scenario.setActorGoal(traveler.id, {
      kind: 'travelToRoom',
      priority: 80,
      roomId: destinationRoomId,
      reason: 'story-cross-town-ignores-shop-door',
    });

    await scenario.advanceUntil(
      () => scenario.actor(traveler.id).presence?.roomId === destinationRoomId,
      { timeoutMs: 20_000 },
    );

    expect(scenario.actor(traveler.id).presence?.roomId).toBe(destinationRoomId);
    expect(scenario.actor(traveler.id).presence?.roomId.startsWith('layer:')).toBe(false);
    scenario.assertWorldIntegrity();
  });

  it('a town interior round trip restores the parent room and return tile', () => {
    const scenario = createHeadlessScenario({ seed: 'story-interior-round-trip' });
    const { room, entrance } = findGeneratedTownDoor(scenario, { templateId: 'generalStore' });
    const approach = adjacentWalkableTile(room, entrance);
    scenario.enterRoom(room.id, approach);

    const entered = scenario.game.enterNearbyTownBuildingDoor();

    expect(entered.ok).toBe(true);
    const activeLayer = scenario.game.getFlag<{
      layerId: string;
      parentRoomId: string;
      returnPosition: { x: number; y: number };
    }>('layers.active');
    expect(activeLayer?.parentRoomId).toBe(room.id);
    if (!activeLayer) return;
    const interior = scenario.currentRoom();
    expect(interior.layer?.kind).toBe('townInterior');
    expect(interior.layer?.parentRoomId).toBe(room.id);

    const exit = interior.layer?.exit;
    expect(exit).toBeDefined();
    if (!exit) return;
    const beforeExit = adjacentWalkableTile(interior, exit);
    scenario.enterRoom(interior.id, beforeExit);
    scenario.game.forceDirection(exit.x - beforeExit.x, exit.y - beforeExit.y);
    scenario.advanceActionTicks(1);

    expect(scenario.currentRoom().id).toBe(room.id);
    expect(scenario.game.getFlag('layers.active')).toBeUndefined();
    const [roomX, roomY] = room.id.split(',').map(Number);
    expect(scenario.game.getSnakeBody()[0]).toEqual({
      x: activeLayer.returnPosition.x + roomX * scenario.game.config.grid.cols,
      y: activeLayer.returnPosition.y + roomY * scenario.game.config.grid.rows,
    });
    scenario.assertWorldIntegrity();
  });

  it('save/load inside a town interior preserves exit routing', () => {
    const scenario = createHeadlessScenario({ seed: 'story-save-inside-interior' });
    const { room, entrance } = findGeneratedTownDoor(scenario, { templateId: 'tavern' });
    scenario.enterRoom(room.id, adjacentWalkableTile(room, entrance));
    expect(scenario.game.enterNearbyTownBuildingDoor().ok).toBe(true);
    const interiorRoomId = scenario.currentRoom().id;
    const saved = scenario.game.getSaveData();

    const reloaded = HeadlessScenario.fromSave(saved);

    expect(reloaded.currentRoom().id).toBe(interiorRoomId);
    const runtime = reloaded.game.getFlag<{ parentRoomId: string }>('layers.active');
    expect(runtime?.parentRoomId).toBe(room.id);
    const exit = reloaded.currentRoom().layer?.exit;
    expect(exit).toBeDefined();
    if (!exit) return;
    const beforeExit = adjacentWalkableTile(reloaded.currentRoom(), exit);
    reloaded.enterRoom(interiorRoomId, beforeExit);
    reloaded.game.forceDirection(exit.x - beforeExit.x, exit.y - beforeExit.y);
    reloaded.advanceActionTicks(1);

    expect(reloaded.currentRoom().id).toBe(room.id);
    expect(reloaded.game.getFlag('layers.active')).toBeUndefined();
    reloaded.assertWorldIntegrity();
  });

  it('gossip can move from one bonded Actor to another', async () => {
    const scenario = createHeadlessScenario({ seed: 'story-bonded-rumor-diffusion' });
    const base = firstWalkableTile(scenario);
    const source = ensureScenarioActor(scenario, {
      id: 'rumor-source',
      name: 'Rumor Source',
      role: 'resident',
      position: base,
    });
    const listener = ensureScenarioActor(scenario, {
      id: 'rumor-listener',
      name: 'Rumor Listener',
      role: 'resident',
      position: offsetPosition(base, 1, 0),
    });
    scenario.game.getActorSystem().registry.update(source.id, (actor) => ({
      ...actor,
      relationships: [{ actorId: listener.id, relationship: 'friend', strength: 90 }],
      memory: [
        ...actor.memory,
        {
          id: 'memory:story:secret-tunnel',
          type: 'rumor',
          summary: 'a secret tunnel under the market smells like wasabi apples',
          source: 'rumor',
          intensity: 55,
          roomId: scenario.currentRoom().id,
          tags: ['rumor', 'town', 'market'],
        },
      ],
    }));
    scenario.game.getActorSystem().registry.update(listener.id, (actor) => ({
      ...actor,
      relationships: [{ actorId: source.id, relationship: 'friend', strength: 90 }],
    }));
    scenario.enterRoom(scenario.currentRoom().id);

    await scenario.advanceUntil(
      () =>
        scenario
          .actor(listener.id)
          .memory.some((memory) => memory.summary.includes('secret tunnel under the market')),
      { timeoutMs: 30_000, stepMs: 100 },
    );

    expect(scenario.actor(listener.id).memory.some((memory) => memory.source === 'heard')).toBe(
      true,
    );
    await scenario.advanceUntil(
      () =>
        scenario.actor(source.id).activity?.kind !== 'talking' &&
        scenario.actor(listener.id).activity?.kind !== 'talking',
      { timeoutMs: 10_000, stepMs: 100 },
    );
    expect(scenario.actor(listener.id).activity?.kind).not.toBe('talking');
    scenario.assertWorldIntegrity();
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
