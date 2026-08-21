import { describe, expect, it } from 'vitest';
import { defaultGameConfig } from '../../../config/gameConfig.js';
import type { Vector2Like } from '../../../core/math.js';
import { createRng } from '../../../core/rng.js';
import {
  HeadlessScenario,
  createHeadlessScenario,
} from '../../../test/headless/headlessScenario.js';
import {
  adjacentWalkableTile,
  ensureScenarioActor,
  ensureScenarioEnemyActor,
  findGeneratedTownDoor,
  firstWalkableTile,
  offsetPosition,
} from '../../../test/headless/scenarioFixtures.js';
import {
  isTownWalkable,
  renderTownAtlas,
  unreachableTargets,
  type ReachabilityTarget,
} from '../../../test/headless/townAtlas.js';
import { getActorActivityProp } from '../../../actors/actorActivityProps.js';
import type { LayerTemplateId } from '../../../layers/layerTypes.js';
import { getItem } from '../../../inventory/itemRegistry.js';
import { buildMapperStock } from '../../../shops/mapperShop.js';
import type { AtmosphereState } from '../../../world/atmosphereTypes.js';
import { getBiomeDefinition } from '../../../world/biomes.js';
import { tryPlaceGarage } from '../../../world/garage.js';
import { tryPlaceMolemanDigSite } from '../../../world/molemanDigSite.js';
import { findNearestStructureLocatorTarget } from '../../../world/structureLocatorSearch.js';
import type { StructureLocatorKind } from '../../../world/structureLocators.js';
import {
  isMosaicCoastPassableTile,
  isMosaicCoastSolidTile,
} from '../../../world/mosaicCoastTiles.js';
import { isSolidTile } from '../../../world/tiles.js';
import type { RoomSnapshot } from '../../../world/types.js';

describe('Town NPC living-world core stories', () => {
  it('TOWN-LIFE-001 - Open doors enter automatically', () => {
    const scenario = createHeadlessScenario({ seed: 'town-life-001-open-door-auto-entry' });
    const { room, entrance } = findGeneratedTownDoor(scenario, { templateId: 'tavern' });
    const approach = adjacentWalkableTile(room, entrance);
    scenario.enterRoom(room.id, approach);

    scenario.game.forceDirection(entrance.x - approach.x, entrance.y - approach.y);
    scenario.advanceActionTicks(1);

    expect(scenario.currentRoom().layer).toMatchObject({
      kind: 'townInterior',
      parentRoomId: room.id,
    });
    expect(scenario.game.getFlag('layers.active')).toMatchObject({
      parentRoomId: room.id,
    });
  });

  it('TOWN-LIFE-002 - A closed business door explains the closure', () => {
    const scenario = createHeadlessScenario({ seed: 'town-life-002-closed-business-door' });
    scenario.setDayPhase('night');
    const { room, entrance } = generatedTownEntrances(scenario, 'mapper')[0]!;
    scenario.enterRoom(room.id, adjacentWalkableTile(room, entrance));

    const access = scenario.game.resolveNearbyTownDoorAccess();
    const entered = scenario.game.enterNearbyTownBuildingDoor();

    expect(access).toMatchObject({
      access: 'closed',
      autoEnter: false,
      entranceId: entrance.id,
      displayName: entrance.displayName,
      publicHours: { opens: 'day', closes: 'night' },
      nextOpen: { dayPhase: 'day' },
    });
    expect(access?.closureReason).toContain('day');
    expect(access?.actions).toEqual(['knock', 'leave']);
    expect(entered.ok).toBe(false);
    expect(entered.message).toContain('closed');
    scenario.assertWorldIntegrity();
  });

  it('TOWN-LIFE-003 - Open hours unlock physical access', () => {
    const scenario = createHeadlessScenario({ seed: 'town-life-003-open-hours-unlock' });
    scenario.setDayPhase('day');
    const { room, entrance } = generatedTownEntrances(scenario, 'mapper')[0]!;
    scenario.enterRoom(room.id, adjacentWalkableTile(room, entrance));

    expect(scenario.game.resolveNearbyTownDoorAccess()).toMatchObject({
      access: 'open',
      autoEnter: true,
      entranceId: entrance.id,
    });
    expect(scenario.game.enterNearbyTownBuildingDoor().ok).toBe(true);
    expect(scenario.currentRoom().layer).toMatchObject({
      parentRoomId: room.id,
      templateId: 'mapper',
    });
  });

  it('TOWN-LIFE-004 - Closed means no commerce', () => {
    const scenario = createHeadlessScenario({ seed: 'town-life-004-no-commerce-closed' });
    scenario.setDayPhase('night');
    const { room, entrance } = generatedTownEntrances(scenario, 'wizardShop')[0]!;
    scenario.enterRoom(room.id, adjacentWalkableTile(room, entrance));

    const beforeRoomId = scenario.currentRoom().id;
    const access = scenario.game.resolveNearbyTownDoorAccess();
    const entered = scenario.game.enterNearbyTownBuildingDoor();

    expect(access).toMatchObject({
      access: 'closed',
      serviceId: entrance.townBuildingId,
    });
    expect(entered.ok).toBe(false);
    expect(scenario.currentRoom().id).toBe(beforeRoomId);
    expect(scenario.game.getFlag('layers.active')).toBeUndefined();
    scenario.assertWorldIntegrity();
  });

  it('TOWN-LIFE-005 - Waking a merchant does not open the business', async () => {
    const scenario = createHeadlessScenario({ seed: 'town-life-005-wake-merchant-closed' });
    const roomId = scenario.currentRoom().id;
    const butcher = ensureScenarioActor(scenario, {
      id: 'town-life-005-butcher',
      name: 'Town Life Butcher',
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
      reason: 'town-life-005',
    });
    scenario.game
      .getActorSystem()
      .setActivity(butcher.id, { kind: 'sleeping', source: 'schedule' }, 'town-life-005');

    expect(scenario.game.wakeActor(butcher.id).ok).toBe(true);

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
    scenario.assertWorldIntegrity();
  });

  it('TOWN-LIFE-006 - Village merchants may opt into informal trade', () => {
    const scenario = createHeadlessScenario({ seed: 'town-life-006-informal-trade' });
    const merchant = ensureScenarioActor(scenario, {
      id: 'town-life-006-goblin-merchant',
      name: 'Town Life Goblin Merchant',
      role: 'shopkeeper',
      roomId: scenario.currentRoom().id,
      position: firstWalkableTile(scenario),
    });
    scenario.game.getActorSystem().registry.update(merchant.id, (actor) => ({
      ...actor,
      role: 'goblinMerchant',
      flags: { ...actor.flags, sleepInterrupted: true },
    }));

    const shop = scenario.game
      .getActorInteractionMenu(merchant.id)
      ?.options.find((option) => option.id === 'shop');

    expect(shop).toMatchObject({
      enabled: true,
      reason: undefined,
    });
    scenario.assertWorldIntegrity();
  });

  it('TOWN-LIFE-007 - Exceptional closure overrides normal hours', () => {
    const scenario = createHeadlessScenario({ seed: 'town-life-007-exceptional-closure' });
    scenario.setDayPhase('day');
    const { room, entrance } = generatedTownEntrances(scenario, 'inn')[0]!;
    scenario.enterRoom(room.id, adjacentWalkableTile(room, entrance));
    scenario.game.setFlag(`town.doorClosure.${entrance.townBuildingId}`, 'Closed during a raid');

    const access = scenario.game.resolveNearbyTownDoorAccess();
    const entered = scenario.game.enterNearbyTownBuildingDoor();

    expect(access).toMatchObject({
      access: 'closed',
      autoEnter: false,
      closureReason: 'Closed during a raid',
      actions: ['leave'],
    });
    expect(entered.ok).toBe(false);
    expect(entered.message).toContain('Closed during a raid');
    scenario.assertWorldIntegrity();
  });

  it('TOWN-LIFE-008 - Door state survives save/load', () => {
    const scenario = createHeadlessScenario({ seed: 'town-life-008-door-save-load' });
    const { room, entrance } = findGeneratedTownDoor(scenario, {
      templateId: 'residentialHome',
      includeLocked: true,
    });
    scenario.enterRoom(room.id, adjacentWalkableTile(room, entrance));

    expect(scenario.game.getNearbyTownBuildingDoor()).toMatchObject({
      entranceId: entrance.id,
      locked: true,
      publicAccess: false,
    });

    const reloaded = HeadlessScenario.fromSave(scenario.game.getSaveData());
    expect(reloaded.game.getNearbyTownBuildingDoor()).toMatchObject({
      entranceId: entrance.id,
      locked: true,
      publicAccess: false,
    });
    reloaded.assertWorldIntegrity();
  });

  it('TOWN-LIFE-012 - Shop service follows the business schedule', () => {
    const scenario = createHeadlessScenario({ seed: 'town-life-012-shop-service-schedule' });
    const { room, entrance } = generatedTownEntrances(scenario, 'generalStore')[0]!;
    scenario.enterRoom(room.id, adjacentWalkableTile(room, entrance));

    scenario.setDayPhase('day');
    expect(scenario.game.resolveNearbyTownDoorAccess()).toMatchObject({
      access: 'open',
      autoEnter: true,
    });

    scenario.setDayPhase('night');
    expect(scenario.game.resolveNearbyTownDoorAccess()).toMatchObject({
      access: 'closed',
      autoEnter: false,
      serviceId: entrance.townBuildingId,
    });
    expect(scenario.game.enterNearbyTownBuildingDoor().ok).toBe(false);
    scenario.assertWorldIntegrity();
  });

  it('TOWN-LIFE-009 - Schedule generation is repeatable per Actor', async () => {
    const first = scheduledShopkeeperScenario('town-life-009-repeatable-schedule');
    const second = scheduledShopkeeperScenario('town-life-009-repeatable-schedule');

    first.setDayPhase('night');
    second.setDayPhase('night');
    await first.advanceActorTicks(1);
    await second.advanceActorTicks(1);

    expect(first.actor('town-life-009-shopkeeper').scheduleGoal).toEqual(
      second.actor('town-life-009-shopkeeper').scheduleGoal,
    );
    expect(first.actor('town-life-009-shopkeeper').goal).toEqual(
      second.actor('town-life-009-shopkeeper').goal,
    );
    first.assertWorldIntegrity();
    second.assertWorldIntegrity();
  });

  it('TOWN-LIFE-010 - Personality produces real schedule variation', async () => {
    const scenario = createHeadlessScenario({ seed: 'town-life-010-personality-schedule' });
    const homeRoomId = '1,0,0';
    const tavernRoomId = '2,0,0';
    scenario.getRoom(homeRoomId);
    scenario.getRoom(tavernRoomId);
    const base = firstWalkableTile(scenario);
    const social = ensureScenarioActor(scenario, {
      id: 'town-life-010-social',
      name: 'Town Life Social Resident',
      role: 'resident',
      roomId: scenario.currentRoom().id,
      homeRoomId,
      workRoomId: tavernRoomId,
      position: base,
    });
    const cautious = ensureScenarioActor(scenario, {
      id: 'town-life-010-cautious',
      name: 'Town Life Cautious Resident',
      role: 'resident',
      roomId: scenario.currentRoom().id,
      homeRoomId,
      workRoomId: tavernRoomId,
      position: offsetPosition(base, 1, 0),
    });
    scenario.game.getActorSystem().registry.update(social.id, (actor) => ({
      ...actor,
      personality: ['romantic', 'nosy'],
    }));
    scenario.game.getActorSystem().registry.update(cautious.id, (actor) => ({
      ...actor,
      personality: ['cowardly'],
    }));

    scenario.setDayPhase('dusk');
    await scenario.advanceActorTicks(1);

    expect(scenario.actor(social.id).scheduleGoal).toMatchObject({
      kind: 'socialize',
      roomId: tavernRoomId,
      reason: 'evening-social-schedule',
    });
    expect(scenario.actor(cautious.id).scheduleGoal).toMatchObject({
      kind: 'goHome',
      roomId: homeRoomId,
      reason: 'evening-schedule',
    });
    scenario.assertWorldIntegrity();
  });

  it('TOWN-LIFE-011 - A resident keeps one identity across a full day', async () => {
    const scenario = scheduledShopkeeperScenario('town-life-011-full-day-identity');
    const actorId = 'town-life-009-shopkeeper';

    scenario.setDayPhase('night');
    await scenario.advanceUntil(() => scenario.actor(actorId).presence?.roomId === '1,0,0', {
      timeoutMs: 16_000,
    });
    scenario.setDayPhase('day');
    await scenario.advanceUntil(() => scenario.actor(actorId).presence?.roomId === '0,0,0', {
      timeoutMs: 16_000,
    });

    expect(
      scenario.game
        .getActorSystem()
        .registry.getAll()
        .filter((actor) => actor.id === actorId),
    ).toHaveLength(1);
    expect(scenario.actor(actorId).id).toBe(actorId);
    scenario.assertWorldIntegrity();
  });

  it('TOWN-LIFE-013 - Higher-priority danger interrupts a schedule', async () => {
    const scenario = scheduledGuardWithBanditScenario('town-life-013-danger-interrupts');
    scenario.setDayPhase('day');
    await scenario.advanceActorTicks(1);

    await scenario.advanceUntil(
      () => scenario.actor('town-life-guard').goal?.targetActorId === 'town-life-bandit',
      { timeoutMs: 1_000 },
    );

    expect(scenario.actor('town-life-guard').scheduleGoal?.kind).not.toBe('attackActor');
    expect(scenario.actor('town-life-guard').goal).toMatchObject({
      kind: 'attackActor',
      targetActorId: 'town-life-bandit',
    });
    scenario.assertWorldIntegrity();
  });

  it('TOWN-LIFE-014 - An Actor resumes life after interruption', async () => {
    const scenario = scheduledGuardWithBanditScenario('town-life-014-resume-after-interrupt');
    scenario.setDayPhase('day');

    await scenario.advanceUntil(
      () => scenario.actor('town-life-guard').goal?.targetActorId === 'town-life-bandit',
      { timeoutMs: 1_000 },
    );
    scenario.game.getActorSystem().registry.update('town-life-bandit', (actor) => ({
      ...actor,
      health: { current: 0, max: actor.health?.max ?? 1, state: 'dead' },
      hostility: 'dead',
      presence: undefined,
    }));
    scenario.game.getActorSystem().resumeGoal('town-life-guard', 'town-life-014-interrupt-ended');

    expect(scenario.actor('town-life-guard').goal).toEqual(
      scenario.actor('town-life-guard').scheduleGoal,
    );
    scenario.assertWorldIntegrity();
  });

  it('TOWN-LIFE-015 - Storm behavior depends on role and personality', async () => {
    const scenario = scheduledGuardAndResidentScenario('town-life-015-storm-roles');

    scenario.game.forceAtmosphereWeather('storm');
    await scenario.advanceActorTicks(1);

    expect(scenario.actor('town-life-dutiful-guard').personality).toContain('lawful');
    expect(scenario.actor('town-life-cautious-resident').personality).toContain('cowardly');
    expect(scenario.actor('town-life-dutiful-guard').goal).toMatchObject({
      kind: 'defendArea',
      reason: 'storm-watch',
    });
    expect(scenario.actor('town-life-dutiful-guard').activity?.kind).toBe('guarding');
    expect(scenario.actor('town-life-cautious-resident').goal).toMatchObject({
      kind: 'goHome',
      reason: 'storm-shelter',
    });
    scenario.assertWorldIntegrity();
  });

  it('TOWN-LIFE-016 - Weather clearing restores schedule intent', async () => {
    const scenario = scheduledGuardAndResidentScenario('town-life-016-clear-restores-schedule');

    scenario.game.forceAtmosphereWeather('storm');
    await scenario.advanceActorTicks(1);
    expect(scenario.actor('town-life-cautious-resident').goal?.reason).toBe('storm-shelter');

    scenario.game.forceAtmosphereWeather('clear');
    await scenario.advanceActorTicks(1);

    expect(scenario.actor('town-life-cautious-resident').goal).toEqual(
      scenario.actor('town-life-cautious-resident').scheduleGoal,
    );
    expect(scenario.actor('town-life-cautious-resident').goal?.reason).not.toBe('storm-shelter');
    scenario.assertWorldIntegrity();
  });

  it('TOWN-LIFE-017 - Mild weather cannot cancel sleep', async () => {
    const scenario = createHeadlessScenario({ seed: 'town-life-017-mild-weather-sleep' });
    const roomId = scenario.currentRoom().id;
    const sleeper = ensureScenarioActor(scenario, {
      id: 'town-life-017-sleeper',
      name: 'Town Life Sleeper',
      role: 'resident',
      roomId,
      homeRoomId: '1,0,0',
      position: firstWalkableTile(scenario, roomId),
    });
    const sleepPosition = scenario.actor(sleeper.id).presence?.position;
    scenario.setActorGoal(sleeper.id, {
      kind: 'sleep',
      priority: 20,
      roomId,
      targetPosition: sleepPosition,
      reason: 'town-life-017-sleep',
    });
    scenario.game
      .getActorSystem()
      .setActivity(sleeper.id, { kind: 'sleeping', source: 'schedule' }, 'town-life-017');

    scenario.game.forceAtmosphereWeather('fog');
    await scenario.advanceActorTicks(1);

    expect(scenario.actor(sleeper.id).goal).toMatchObject({
      kind: 'sleep',
      reason: 'town-life-017-sleep',
    });
    expect(scenario.actor(sleeper.id).presence?.roomId).toBe(roomId);
    expect(scenario.actor(sleeper.id).activity?.kind).toBe('sleeping');
    scenario.assertWorldIntegrity();
  });

  it('TOWN-LIFE-018 - A sky event creates specialized activity', async () => {
    const scenario = createHeadlessScenario({ seed: 'town-life-018-sky-event-wizard' });
    const roomId = scenario.currentRoom().id;
    const wizard = ensureScenarioActor(scenario, {
      id: 'town-life-018-wizard',
      name: 'Town Life Wizard',
      role: 'shopkeeper',
      roomId,
      homeRoomId: roomId,
      workRoomId: roomId,
      position: firstWalkableTile(scenario, roomId),
    });
    scenario.game.getActorSystem().registry.update(wizard.id, (actor) => ({
      ...actor,
      role: 'wizard',
      personality: ['practical', 'poetic'],
    }));
    scenario.setDayPhase('night');
    await scenario.advanceActorTicks(1);
    expect(scenario.actor(wizard.id).scheduleGoal).toMatchObject({
      kind: 'sleep',
      reason: 'night-schedule',
    });

    setScenarioSkyEvent(scenario, 'meteorShower');
    await scenario.advanceActorTicks(1);

    expect(scenario.actor(wizard.id).goal).toMatchObject({
      kind: 'defendArea',
      reason: 'observe-meteorShower',
    });
    expect(scenario.actor(wizard.id).activity).toMatchObject({
      kind: 'observing-sky',
    });

    setScenarioSkyEvent(scenario, 'none');
    await scenario.advanceActorTicks(1);

    expect(scenario.actor(wizard.id).goal).toEqual(scenario.actor(wizard.id).scheduleGoal);
    expect(scenario.actor(wizard.id).goal).toMatchObject({
      kind: 'sleep',
      reason: 'night-schedule',
    });
    scenario.assertWorldIntegrity();
  });

  it('TOWN-LIFE-023 - Exterior shells are solid', () => {
    const scenario = createHeadlessScenario({ seed: 'town-life-023-solid-shells' });
    let checkedCells = 0;
    let checkedDoorways = 0;

    for (const room of generatedTownRooms(scenario, 8)) {
      for (const building of room.town?.buildings.filter(
        (entry) =>
          entry.roomId === room.id &&
          ['tavern', 'generalStore', 'butcherShop', 'potionMaker', 'residentialHome'].includes(
            entry.kind,
          ),
      ) ?? []) {
        const right = building.bounds.left + building.bounds.width - 1;
        const bottom = building.bounds.top + building.bounds.height - 1;
        for (let y = building.bounds.top; y <= bottom; y += 1) {
          for (let x = building.bounds.left; x <= right; x += 1) {
            if (
              x !== building.bounds.left &&
              x !== right &&
              y !== building.bounds.top &&
              y !== bottom
            ) {
              continue;
            }
            const isDoor = building.door.x === x && building.door.y === y;
            if (isDoor) {
              checkedDoorways += 1;
              continue;
            }
            const tile = room.layout[y]?.[x];
            expect(isSolidTile(tile), `${building.id} shell ${x},${y} should block.`).toBe(true);
            checkedCells += 1;
          }
        }
      }
    }

    expect(checkedCells).toBeGreaterThan(0);
    expect(checkedDoorways).toBeGreaterThan(0);
  });

  it('TOWN-LIFE-024 - Structural tiles reject spawns', () => {
    const seeds = ['town-life-024-a', 'town-life-024-b', 'town-life-024-c'];
    let checkedSpawns = 0;

    for (const seed of seeds) {
      const scenario = createHeadlessScenario({ seed });
      for (const room of generatedTownRooms(scenario, 8)) {
        scenario.enterRoom(room.id, firstWalkableTile(scenario, room.id));
        for (const actor of scenario.actorsInRoom(room.id)) {
          if (actor.presence) {
            assertPointNotSolid(room, actor.presence.position, `Actor ${actor.id}`);
            checkedSpawns += 1;
          }
        }
        for (const resident of room.town?.residentPresences ?? []) {
          assertPointNotSolid(room, resident, `Town resident ${resident.residentId}`);
          checkedSpawns += 1;
        }
        for (const enemy of scenario.game.getEnemies(room.id)) {
          assertPointNotSolid(room, enemy.position, `Enemy ${enemy.id}`);
          checkedSpawns += 1;
        }
        for (const apple of room.apples ?? (room.apple ? [room.apple] : [])) {
          assertPointNotSolid(room, apple, 'Apple');
          checkedSpawns += 1;
        }
        for (const item of [room.treasure, room.powerup].filter((entry) => entry !== undefined)) {
          assertPointNotSolid(room, item, 'Item');
          checkedSpawns += 1;
        }
      }
      scenario.assertWorldIntegrity();
    }

    expect(checkedSpawns).toBeGreaterThan(0);
  });

  it('TOWN-LIFE-025 - Canopy behavior remains unchanged', () => {
    const scenario = createHeadlessScenario({ seed: 'town-life-025-canopy-passable' });
    const rooms = [];
    for (let y = -11; y <= -9; y += 1) {
      for (let x = -4; x <= 2; x += 1) {
        rooms.push(scenario.getRoom(`${x},${y},0`));
      }
    }
    const grove = rooms.find(
      (room) => room.mosaicCoast && room.layout.some((row) => row.includes('t')),
    );

    expect(grove).toBeDefined();
    if (!grove) return;
    const canopyTile = grove.layout.flatMap((row) => row.split('')).find((tile) => tile === 't');
    expect(canopyTile).toBe('t');
    expect(isMosaicCoastPassableTile(canopyTile)).toBe(true);
    expect(isMosaicCoastSolidTile(canopyTile)).toBe(false);
    expect(isSolidTile(canopyTile)).toBe(false);
  });

  it('TOWN-LIFE-026 - Residential homes are distinct households', () => {
    const scenario = createHeadlessScenario({ seed: 'town-life-026-distinct-households' });
    const homes = generatedTownEntrances(scenario, 'residentialHome').slice(0, 2);

    expect(homes).toHaveLength(2);
    const interiors = new Map<string, string | undefined>();
    for (const { room, entrance } of homes) {
      scenario.enterRoom(room.id, adjacentWalkableTile(room, entrance));

      const entered = scenario.game.enterNearbyTownBuildingDoor();

      expect(entered.ok).toBe(true);
      const interior = scenario.currentRoom();
      expect(interior.layer).toMatchObject({
        parentRoomId: room.id,
        entranceId: entrance.id,
        templateId: 'residentialHome',
        townBuildingId: entrance.townBuildingId,
        ownerResidentId: entrance.ownerResidentId,
      });
      expect(interior.layer?.returnPosition).toEqual(entrance.returnPosition);
      interiors.set(interior.id, interior.layer?.ownerResidentId);
      exitCurrentLayerThroughDoor(scenario);
      expect(scenario.currentRoom().id).toBe(room.id);
      expect(scenario.game.getFlag('layers.active')).toBeUndefined();
    }

    expect(new Set(interiors.keys()).size).toBe(homes.length);
    expect(new Set(interiors.values()).size).toBe(homes.length);
    scenario.assertWorldIntegrity();
  });

  it('TOWN-LIFE-027 - Interior routing survives save/load', () => {
    const scenario = createHeadlessScenario({ seed: 'town-life-027-residence-save-load-exit' });
    const { room, entrance } = generatedTownEntrances(scenario, 'residentialHome')[0]!;
    scenario.enterRoom(room.id, adjacentWalkableTile(room, entrance));
    expect(scenario.game.enterNearbyTownBuildingDoor().ok).toBe(true);

    const reloaded = HeadlessScenario.fromSave(scenario.game.getSaveData());
    const activeLayer = reloaded.game.getFlag<{
      parentRoomId: string;
      returnPosition: { x: number; y: number };
    }>('layers.active');

    expect(reloaded.currentRoom().layer).toMatchObject({
      parentRoomId: room.id,
      entranceId: entrance.id,
      templateId: 'residentialHome',
    });
    expect(activeLayer?.parentRoomId).toBe(room.id);
    expect(activeLayer?.returnPosition).toEqual(entrance.returnPosition);

    exitCurrentLayerThroughDoor(reloaded);

    expect(reloaded.currentRoom().id).toBe(room.id);
    expect(reloaded.game.getFlag('layers.active')).toBeUndefined();
    expect(reloaded.game.getSnakeBody()[0]).toEqual({
      x: entrance.returnPosition.x + Number(room.id.split(',')[0]) * reloaded.game.config.grid.cols,
      y: entrance.returnPosition.y + Number(room.id.split(',')[1]) * reloaded.game.config.grid.rows,
    });
    reloaded.assertWorldIntegrity();
  });

  it('TOWN-LIFE-028 - Required businesses have functional interiors', () => {
    const scenario = createHeadlessScenario({ seed: 'town-life-028-required-businesses' });
    const required = [
      { templateId: 'mapper' as const, role: 'mapper', serviceTiles: ['M', 'S'] },
      { templateId: 'wizardShop' as const, role: 'wizard', serviceTiles: ['P', 'M', 'A'] },
      { templateId: 'inn' as const, role: 'innkeeper', serviceTiles: ['R', 'S', 'P'] },
    ];

    for (const requirement of required) {
      const { room, entrance } = generatedTownEntrances(scenario, requirement.templateId)[0]!;
      scenario.enterRoom(room.id, adjacentWalkableTile(room, entrance));

      const entered = scenario.game.enterNearbyTownBuildingDoor();

      expect(entered.ok).toBe(true);
      const interior = scenario.currentRoom();
      expect(interior.layer).toMatchObject({
        parentRoomId: room.id,
        templateId: requirement.templateId,
        townBuildingId: entrance.townBuildingId,
      });
      for (const tile of requirement.serviceTiles) {
        expect(interior.layout.join('')).toContain(tile);
      }
      expect(
        interior.town?.residentPresences?.some((presence) =>
          interior.town?.residents.some(
            (resident) => resident.id === presence.residentId && resident.role === requirement.role,
          ),
        ),
      ).toBe(true);
      assertInteriorExitReachable(interior);
      exitCurrentLayerThroughDoor(scenario);
      expect(scenario.currentRoom().id).toBe(room.id);
    }

    scenario.assertWorldIntegrity();
  });

  it('TOWN-LIFE-029 - Decorative variety preserves traversability', () => {
    const seeds = [
      'town-life-029-traversability-a',
      'town-life-029-traversability-b',
      'town-life-029-traversability-c',
    ];

    for (const seed of seeds) {
      const scenario = createHeadlessScenario({ seed });
      const townRoomsByTownId = groupRoomsByTownId(generatedTownRooms(scenario, 10));

      expect(townRoomsByTownId.size).toBeGreaterThan(0);
      for (const townRooms of townRoomsByTownId.values()) {
        const atlas = renderTownAtlas(townRooms);
        for (const room of townRooms) {
          const exteriorTargets = exteriorReachabilityTargets(room);
          if (exteriorTargets.length > 0) {
            assertTownTargetsReachable(room, exteriorTargets, atlas);
          }
          for (const entrance of room.layerEntrances ?? []) {
            if (entrance.templateId === 'thievesGuild') {
              continue;
            }
            scenario.enterRoom(room.id, adjacentWalkableTile(room, entrance));
            const entered = scenario.game.enterNearbyTownBuildingDoor();

            expect(entered.ok, `${entrance.templateId} failed to enter from ${room.id}`).toBe(true);
            const interior = scenario.currentRoom();
            assertTownTargetsReachable(
              interior,
              interiorReachabilityTargets(interior),
              `${atlas}\n\n${interior.id}\n${interior.layout.join('\n')}`,
              interior.layer?.spawn
                ? [{ ...interior.layer.spawn, label: `${interior.layer.templateId} spawn` }]
                : undefined,
            );
            exitCurrentLayerThroughDoor(scenario);
          }
        }
      }
      scenario.assertWorldIntegrity();
    }
  });

  it('TOWN-LIFE-030 - Mapper stock is deterministic', () => {
    const first = mapperStockScenario('town-life-030-mapper-stock');
    const second = HeadlessScenario.fromSave(first.game.getSaveData());

    expect(mapperStockFor(first, 3)).toEqual(mapperStockFor(second, 3));
    first.assertWorldIntegrity();
    second.assertWorldIntegrity();
  });

  it('TOWN-LIFE-031 - Mapper stock changes only at its stock boundary', () => {
    const scenario = mapperStockScenario('town-life-031-mapper-boundary');

    const before = mapperStockFor(scenario, 12);
    const stillBefore = mapperStockFor(scenario, 12);
    const after = mapperStockFor(scenario, 13);

    expect(stillBefore).toEqual(before);
    expect(after).not.toEqual(before);
    scenario.assertWorldIntegrity();
  });

  it('TOWN-LIFE-032 - Rare biome stock uses rarity and usefulness', () => {
    const scenario = mapperStockScenario('town-life-032-rare-useful-biome-stock');

    const biomeOffers = mapperStockFor(scenario, 0).filter(
      (offer) => offer.kind === 'biome-locator' && offer.targetBiomeId,
    );

    expect(biomeOffers.length).toBeGreaterThan(0);
    expect(
      biomeOffers.some((offer) => {
        const biome = getBiomeDefinition(offer.targetBiomeId!);
        return (
          biome.generation?.rarity === 'rare' ||
          biome.generation?.rarity === 'legendary' ||
          biome.tags.includes('civilized') ||
          biome.tags.includes('special') ||
          biome.tags.includes('dangerous')
        );
      }),
    ).toBe(true);
    scenario.assertWorldIntegrity();
  });

  it('TOWN-LIFE-033 - Garage and dig-site locators can be sold', () => {
    const scenario = mapperStockScenario('town-life-033-structure-locators');

    const structureOffers = mapperStockFor(scenario, 0).filter(
      (offer) => offer.kind === 'structure-locator',
    );

    expect(structureOffers.map((offer) => offer.targetStructureKind).sort()).toEqual([
      'garage',
      'moleman-dig-site',
    ]);
    for (const offer of structureOffers) {
      expect(getItem(offer.itemId)?.name).toContain('Locator');
      expect(offer.price).toBeGreaterThan(0);
    }
    scenario.assertWorldIntegrity();
  });

  it('TOWN-LIFE-034 - Locator searches do not generate the world cache', () => {
    const scenario = mapperStockScenario('town-life-034-locator-no-cache-growth');
    const beforeSearch = scenario.game.getGeneratedRoomCount();

    const result = structureLocatorSearch(scenario, 'garage', 48);

    expect(result.found).toBe(true);
    expect(scenario.game.getGeneratedRoomCount()).toBe(beforeSearch);
    expect(result.roomId).toBeDefined();
    if (result.roomId) {
      expect(scenario.getRoom(result.roomId).garage).toBeDefined();
    }
    expect(scenario.game.getGeneratedRoomCount()).toBeGreaterThanOrEqual(beforeSearch);
    expect(scenario.game.getGeneratedRoomCount()).toBeLessThanOrEqual(beforeSearch + 1);
    scenario.assertWorldIntegrity();
  });

  it('TOWN-LIFE-035 - Structure locators resolve real structure rooms', () => {
    const scenario = mapperStockScenario('town-life-035-locator-real-structures');

    const garage = structureLocatorSearch(scenario, 'garage', 48);
    const digSite = structureLocatorSearch(scenario, 'moleman-dig-site', 48);

    expect(garage.found).toBe(true);
    expect(digSite.found).toBe(true);
    expect(garage.roomId).toBeDefined();
    expect(digSite.roomId).toBeDefined();
    if (garage.roomId) {
      expect(scenario.getRoom(garage.roomId).garage).toBeDefined();
    }
    if (digSite.roomId) {
      expect(scenario.getRoom(digSite.roomId).molemanDigSite).toBeDefined();
    }
    scenario.assertWorldIntegrity();
  });

  it('TOWN-LIFE-036 - Failed preferred geometry has a valid fallback', () => {
    const garageLayout = crampedStructureLayout();
    const digSiteLayout = crampedStructureLayout();

    const garage = tryPlaceGarage(
      garageLayout,
      defaultGameConfig.grid,
      createRng('town-life-036-garage-fallback'),
    );
    const digSite = tryPlaceMolemanDigSite(
      digSiteLayout,
      defaultGameConfig.grid,
      createRng('town-life-036-dig-site-fallback'),
      { biomeId: 'home-hearth' },
    );

    expect(garage).toBeDefined();
    expect(digSite).toBeDefined();
    if (!garage || !digSite) return;
    expect(garageLayout[garage.mechanic.y]?.[garage.mechanic.x]).toBe('G');
    expect(garageLayout[garage.carSpawn.y]?.[garage.carSpawn.x]).toBe('E');
    expect(digSiteLayout[digSite.foreman.y]?.[digSite.foreman.x]).toBe('E');
    expect(digSiteLayout[digSite.pit.y]?.[digSite.pit.x]).toBe('D');
  });

  it('TOWN-LIFE-037 - Locator searches are deterministic across reloads', () => {
    const scenario = mapperStockScenario('town-life-037-locator-deterministic');
    const reloaded = HeadlessScenario.fromSave(scenario.game.getSaveData());

    expect(structureLocatorSearch(scenario, 'garage', 48)).toEqual(
      structureLocatorSearch(reloaded, 'garage', 48),
    );
    expect(structureLocatorSearch(scenario, 'moleman-dig-site', 48)).toEqual(
      structureLocatorSearch(reloaded, 'moleman-dig-site', 48),
    );
    scenario.assertWorldIntegrity();
    reloaded.assertWorldIntegrity();
  });

  it('TOWN-LIFE-038 - Locator results expose actionable room directions', () => {
    const scenario = mapperStockScenario('town-life-038-locator-directions');

    const result = structureLocatorSearch(scenario, 'garage', 48);

    expect(result.found).toBe(true);
    expect(result.roomId).toMatch(/^-?\d+,-?\d+,-?\d+$/);
    expect(result.coordinates).toHaveLength(3);
    expect(result.distance).toBeGreaterThanOrEqual(0);
    expect(['here', 'north', 'south', 'east', 'west']).toContain(result.direction);
    expect(result.searchedRooms).toBeGreaterThan(0);
    scenario.assertWorldIntegrity();
  });

  it('TOWN-LIFE-039 - Bounded locator searches fail safely', () => {
    const scenario = mapperStockScenario('town-life-039-locator-bounded-failure');
    const beforeSearch = scenario.game.getGeneratedRoomCount();

    const first = structureLocatorSearch(scenario, 'garage', 0);
    const second = structureLocatorSearch(scenario, 'garage', 0);

    expect(first).toEqual(second);
    expect(first).toMatchObject({
      found: false,
      structureKind: 'garage',
      searchedRooms: 1,
    });
    expect(first.roomId).toBeUndefined();
    expect(scenario.game.getGeneratedRoomCount()).toBe(beforeSearch);
    scenario.assertWorldIntegrity();
  });

  it('TOWN-LIFE-040 - Generation versions preserve old destinations', () => {
    const scenario = mapperStockScenario('town-life-040-generation-compatibility');
    const target = structureLocatorSearch(scenario, 'garage', 48);
    expect(target.found).toBe(true);
    expect(target.roomId).toBeDefined();
    const legacySave = scenario.game.getSaveData();
    const legacyIdentity = legacySave.worldGeneration;
    expect(legacyIdentity).toBeDefined();
    if (!target.roomId || !legacyIdentity) return;

    const reloaded = HeadlessScenario.fromSave({
      ...legacySave,
      worldGeneration: {
        seed: legacyIdentity.seed,
        worldSalt: legacyIdentity.worldSalt,
        biomeSalt: legacyIdentity.biomeSalt,
        riverSalt: legacyIdentity.riverSalt,
        barrierSalt: legacyIdentity.barrierSalt,
        structureSalt: legacyIdentity.structureSalt,
        townSalt: legacyIdentity.townSalt,
      },
    });

    expect(structureLocatorSearch(reloaded, 'garage', 48)).toEqual(target);
    expect(reloaded.getRoom(target.roomId).garage).toBeDefined();
    reloaded.assertWorldIntegrity();
  });

  it('TOWN-LIFE-041 - Inn rest advances canonical time', async () => {
    const scenario = enterGeneratedInnScenario('town-life-041-inn-rest-time');
    setScenarioAtmosphere(scenario, {
      dayPhase: 'night',
      phaseProgress: 0,
      globalWeather: 'clear',
    });
    scenario.game.setScore(40);
    scenario.game.setFlag('player.health', 2);

    const result = await scenario.game.restAtCurrentInnUntilDawn();

    expect(result).toMatchObject({
      ok: true,
      startedPhase: 'night',
      endedPhase: 'dawn',
      scoreBefore: 40,
      scoreAfter: 28,
      healthBefore: 2,
      healthAfter: 3,
    });
    expect(result.phasesCrossed).toContain('dawn');
    exitCurrentLayerThroughDoor(scenario);
    scenario.assertWorldIntegrity();
  });

  it('TOWN-LIFE-042 - Every crossed phase updates schedules and services', async () => {
    const scenario = enterGeneratedInnScenario('town-life-042-rest-schedule-services');
    const innRoom = scenario.currentRoom();
    const parentRoomId = innRoom.layer?.parentRoomId;
    expect(parentRoomId).toBeDefined();
    if (!parentRoomId) return;
    const worker = ensureScenarioActor(scenario, {
      id: 'town-life-042-worker',
      name: 'Town Life Worker',
      role: 'shopkeeper',
      roomId: parentRoomId,
      homeRoomId: parentRoomId,
      workRoomId: parentRoomId,
      position: firstWalkableTile(scenario, parentRoomId),
    });
    setScenarioAtmosphere(scenario, { dayPhase: 'day', phaseProgress: 0, globalWeather: 'clear' });
    scenario.game.setScore(40);

    const result = await scenario.game.restAtCurrentInnUntilDawn();

    expect(result.phasesCrossed).toEqual(expect.arrayContaining(['dusk', 'night', 'dawn']));
    expect(scenario.actor(worker.id).scheduleGoal).toMatchObject({
      kind: 'goHome',
      reason: 'morning-schedule',
    });
    exitCurrentLayerThroughDoor(scenario);
    const store = generatedTownEntrances(scenario, 'generalStore')[0]!;
    scenario.enterRoom(store.room.id, adjacentWalkableTile(store.room, store.entrance));
    expect(scenario.game.resolveNearbyTownDoorAccess()).toMatchObject({
      access: 'closed',
      nextOpen: { dayPhase: 'day' },
    });
    scenario.assertWorldIntegrity();
  });

  it('TOWN-LIFE-043 - Rest can change weather deterministically', async () => {
    const first = enterGeneratedInnScenario('town-life-043-weather-a');
    const second = enterGeneratedInnScenario('town-life-043-weather-a');
    for (const scenario of [first, second]) {
      setScenarioAtmosphere(scenario, {
        dayPhase: 'night',
        phaseProgress: 0.9,
        globalWeather: 'clear',
        remainingWeatherPhaseTicks: 1,
      });
      scenario.game.setScore(40);
    }

    const firstResult = await first.game.restAtCurrentInnUntilDawn();
    const secondResult = await second.game.restAtCurrentInnUntilDawn();

    expect(firstResult.weatherAfter).toBe(secondResult.weatherAfter);
    expect(firstResult.elapsedMs).toBe(secondResult.elapsedMs);
    expect(first.game.getAtmosphereState()).toEqual(second.game.getAtmosphereState());
  });

  it('TOWN-LIFE-044 - Rest benefits are applied once', async () => {
    const scenario = enterGeneratedInnScenario('town-life-044-rest-benefits-once');
    setScenarioAtmosphere(scenario, {
      dayPhase: 'night',
      phaseProgress: 0,
      globalWeather: 'clear',
    });
    scenario.game.setScore(80);
    scenario.game.setFlag('player.health', 2);

    const first = await scenario.game.restAtCurrentInnUntilDawn();
    setScenarioAtmosphere(scenario, {
      dayPhase: 'night',
      phaseProgress: 0,
      globalWeather: 'clear',
    });
    const second = await scenario.game.restAtCurrentInnUntilDawn();

    expect(first.healed).toBe(1);
    expect(second.healed).toBe(0);
    expect(scenario.game.getPlayerHealth()).toEqual({ current: 3, max: 3 });
  });

  it('TOWN-LIFE-045 - Rest cannot skip immediate danger', async () => {
    const scenario = createHeadlessScenario({ seed: 'town-life-045-rest-danger' });
    const { room, entrance } = generatedTownEntrances(scenario, 'inn')[0]!;
    scenario.enterRoom(room.id, adjacentWalkableTile(room, entrance));
    expect(scenario.game.enterNearbyTownBuildingDoor().ok).toBe(true);
    scenario.game.startBanditRaidForCurrentRoom();
    scenario.game.setScore(40);

    const result = await scenario.game.restAtCurrentInnUntilDawn();

    expect(result).toMatchObject({
      ok: false,
      refusedReason: 'danger',
      scoreBefore: 40,
      scoreAfter: 40,
    });
  });

  it('TOWN-LIFE-046 - Rest reports meaningful elapsed changes', async () => {
    const scenario = enterGeneratedInnScenario('town-life-046-rest-report');
    setScenarioAtmosphere(scenario, {
      dayPhase: 'dusk',
      phaseProgress: 0,
      globalWeather: 'clear',
      remainingWeatherPhaseTicks: 1,
    });
    scenario.game.setScore(40);
    scenario.game.setFlag('player.health', 2);

    const result = await scenario.game.restAtCurrentInnUntilDawn();

    expect(result.ok).toBe(true);
    expect(result.message).toContain('dawn');
    expect(result.message).toContain('businesses are closed');
    expect(result.message).toContain('healed 1');
    expect(result.message).toContain('well rested');
  });

  it('TOWN-LIFE-047 - Rest outcome survives save/load', async () => {
    const scenario = enterGeneratedInnScenario('town-life-047-rest-save-load');
    setScenarioAtmosphere(scenario, {
      dayPhase: 'night',
      phaseProgress: 0,
      globalWeather: 'clear',
    });
    scenario.game.setScore(40);
    scenario.game.setFlag('player.health', 2);
    const result = await scenario.game.restAtCurrentInnUntilDawn();

    const reloaded = HeadlessScenario.fromSave(scenario.game.getSaveData());

    expect(reloaded.game.getAtmosphereState()).toMatchObject({
      worldDay: scenario.game.getAtmosphereState().worldDay,
      dayPhase: scenario.game.getAtmosphereState().dayPhase,
      globalWeather: scenario.game.getAtmosphereState().globalWeather,
    });
    expect(reloaded.game.getScore()).toBe(result.scoreAfter);
    expect(reloaded.game.getPlayerHealth().current).toBe(result.healthAfter);
    expect(reloaded.game.getFlag('inn.wellRestedUntilRoom')).toBeDefined();
    expect(reloaded.game.getFlag('inn.lastRestResult')).toMatchObject({
      elapsedMs: result.elapsedMs,
      scoreAfter: result.scoreAfter,
      healed: result.healed,
    });
    exitCurrentLayerThroughDoor(reloaded);
    reloaded.assertWorldIntegrity();
  });

  it('TOWN-LIFE-048 - Outer patrols never spawn in town', () => {
    const scenario = townPatrolScenario('town-life-048-outer-patrol-band');
    const town = scenario.currentRoom().town;
    expect(town).toBeDefined();
    if (!town) return;

    const patrol = scenario.game.resolveTownPatrolExcursion(town.id);

    expect(patrol).toBeDefined();
    if (!patrol) return;
    for (const roomId of patrol.routeRoomIds) {
      expect(town.districtByRoomId[roomId]).toBeUndefined();
      expect(townWallDistance(town.physicalRoomIds, roomId)).toBeGreaterThanOrEqual(2);
      expect(townWallDistance(town.physicalRoomIds, roomId)).toBeLessThanOrEqual(3);
    }
    scenario.assertWorldIntegrity();
  });

  it('TOWN-LIFE-049 - Patrol size is one to four', () => {
    const scenario = townPatrolScenario('town-life-049-patrol-size');
    const patrol = scenario.game.resolveTownPatrolExcursion();

    expect(patrol?.members.length).toBeGreaterThanOrEqual(1);
    expect(patrol?.members.length).toBeLessThanOrEqual(4);
    scenario.assertWorldIntegrity();
  });

  it('TOWN-LIFE-050 - Patrol identity is stable', () => {
    const scenario = townPatrolScenario('town-life-050-patrol-identity');
    const patrol = scenario.game.resolveTownPatrolExcursion();
    expect(patrol).toBeDefined();
    if (!patrol) return;
    const before = patrol.members.map((member) => ({
      actorId: member.actorId,
      health: scenario.actor(member.actorId).health,
    }));

    const reloaded = HeadlessScenario.fromSave(scenario.game.getSaveData());
    const afterPatrol = reloaded.game.resolveTownPatrolExcursion(patrol.townId);

    expect(afterPatrol?.id).toBe(patrol.id);
    expect(afterPatrol?.members.map((member) => member.actorId)).toEqual(
      patrol.members.map((member) => member.actorId),
    );
    expect(
      afterPatrol?.members.map((member) => ({
        actorId: member.actorId,
        health: reloaded.actor(member.actorId).health,
      })),
    ).toEqual(before);
    reloaded.assertWorldIntegrity();
  });

  it('TOWN-LIFE-051 - Patrols do not multiply under repeated reads', () => {
    const scenario = townPatrolScenario('town-life-051-patrol-read-stability');
    const patrol = scenario.game.resolveTownPatrolExcursion();
    expect(patrol).toBeDefined();
    if (!patrol) return;
    const before = patrol.members.map((member) => member.actorId);

    for (let index = 0; index < 20; index += 1) {
      for (const roomId of patrol.routeRoomIds) {
        scenario.getRoom(roomId);
      }
      scenario.game.resolveTownPatrolExcursion(patrol.townId);
    }

    const after = scenario.game.resolveTownPatrolExcursion(patrol.townId);
    expect(after?.members.map((member) => member.actorId)).toEqual(before);
    expect(
      scenario.game
        .getActorSystem()
        .registry.getAll()
        .filter((actor) => actor.flags.patrolExcursionId === patrol.id),
    ).toHaveLength(before.length);
    scenario.assertWorldIntegrity();
  });

  it('TOWN-LIFE-052 - A squad crosses rooms coherently', () => {
    const scenario = townPatrolScenario('town-life-052-patrol-route');
    const patrol = scenario.game.resolveTownPatrolExcursion();
    expect(patrol).toBeDefined();
    if (!patrol) return;

    const advanced = scenario.game.advanceTownPatrolExcursion(patrol.id);

    expect(advanced?.currentRouteIndex).toBe(1);
    expect(new Set(advanced?.members.map((member) => member.roomId))).toEqual(
      new Set([advanced?.routeRoomIds[1]]),
    );
    for (const member of advanced?.members ?? []) {
      expect(scenario.actor(member.actorId).presence?.roomId).toBe(advanced?.routeRoomIds[1]);
    }
    scenario.assertWorldIntegrity();
  });

  it('TOWN-LIFE-053 - A weakened patrol can retreat', () => {
    const scenario = townPatrolScenario('town-life-053-patrol-retreat');
    const patrol = scenario.game.resolveTownPatrolExcursion();
    expect(patrol).toBeDefined();
    if (!patrol) return;
    scenario.game.advanceTownPatrolExcursion(patrol.id);
    scenario.game.woundTownPatrolMember(patrol.members[0]!.actorId, 1);

    const retreat = scenario.game.evaluateTownPatrolRetreat(patrol.id);

    expect(retreat?.retreating).toBe(true);
    expect(scenario.actor(patrol.members[0]!.actorId).goal).toMatchObject({
      kind: 'travelToRoom',
      roomId: patrol.homeRoomId,
      reason: 'patrol-retreat',
    });
    scenario.assertWorldIntegrity();
  });

  it('TOWN-LIFE-054 - Guards attack bandits without attacking an innocent player', async () => {
    const scenario = scheduledGuardWithBanditScenario('town-life-054-guard-bandit-player-safe');

    await scenario.advanceUntil(
      () => scenario.actor('town-life-guard').goal?.targetActorId === 'town-life-bandit',
      { timeoutMs: 1_000 },
    );

    expect(scenario.actor('town-life-guard').targetedThreat).toMatchObject({
      targetActorId: 'town-life-bandit',
      source: 'faction',
    });
    expect(scenario.actor('town-life-guard').playerHostility?.state).not.toBe('hostile');
    scenario.assertWorldIntegrity();
  });

  it('TOWN-LIFE-055 - Goblin tension is not automatic combat', async () => {
    const scenario = createHeadlessScenario({ seed: 'town-life-055-goblin-tension' });
    const base = firstWalkableTile(scenario);
    ensureScenarioActor(scenario, {
      id: 'town-life-055-guard',
      name: 'Town Life Guard',
      role: 'guard',
      position: base,
    });
    ensureScenarioEnemyActor(scenario, {
      id: 'town-life-055-goblin',
      name: 'Town Life Goblin',
      encounterKind: 'goblin',
      position: offsetPosition(base, 1, 0),
    });

    await scenario.advanceSeconds(1);

    expect(scenario.actor('town-life-055-guard').goal?.targetActorId).not.toBe(
      'town-life-055-goblin',
    );
    expect(scenario.actor('town-life-055-goblin').goal?.targetActorId).not.toBe(
      'town-life-055-guard',
    );
    scenario.assertWorldIntegrity();
  });

  it('TOWN-LIFE-056 - Goblin aggression can escalate the encounter', () => {
    const scenario = createHeadlessScenario({ seed: 'town-life-056-goblin-aggression' });
    const base = firstWalkableTile(scenario);
    ensureScenarioActor(scenario, {
      id: 'town-life-056-guard',
      name: 'Town Life Escalation Guard',
      role: 'guard',
      position: base,
    });
    ensureScenarioEnemyActor(scenario, {
      id: 'town-life-056-goblin',
      name: 'Town Life Aggressor Goblin',
      encounterKind: 'goblin',
      position: offsetPosition(base, 1, 0),
    });

    const event = scenario.game.escalateGoblinAggressionAgainstGuards('town-life-056-goblin');

    expect(event).toMatchObject({
      type: 'skirmish',
      phase: 'active',
      tags: expect.arrayContaining(['goblin', 'hostile']),
    });
    expect(scenario.actor('town-life-056-guard')).toMatchObject({
      targetedThreat: {
        targetActorId: 'town-life-056-goblin',
        source: 'faction',
        reason: 'goblin-aggression',
      },
      goal: {
        kind: 'attackActor',
        targetActorId: 'town-life-056-goblin',
        reason: 'goblin-aggression',
      },
    });
    expect(
      scenario.game
        .getEnemies(scenario.currentRoom().id)
        .filter((enemy) => enemy.id.startsWith('npc-hostile:')),
    ).toEqual([]);
    scenario.assertWorldIntegrity();
  });

  it('TOWN-LIFE-057 - Faction combat preserves Actor identity', async () => {
    const scenario = scheduledGuardWithBanditScenario('town-life-057-actor-identity-combat');

    await scenario.advanceUntil(
      () => scenario.actor('town-life-guard').goal?.targetActorId === 'town-life-bandit',
      { timeoutMs: 1_000 },
    );

    expect(scenario.actor('town-life-guard').id).toBe('town-life-guard');
    expect(scenario.actor('town-life-bandit').id).toBe('town-life-bandit');
    expect(
      scenario.game.getEnemies(scenario.currentRoom().id).map((enemy) => enemy.actorId),
    ).toEqual([]);
    expect(
      scenario.game
        .getActorSystem()
        .registry.getAll()
        .filter((actor) => actor.id === 'town-life-guard' || actor.id === 'town-life-bandit'),
    ).toHaveLength(2);
    scenario.assertWorldIntegrity();
  });

  it('TOWN-LIFE-058 - A raid begins outside town', () => {
    const scenario = townPatrolScenario('town-life-058-raid-outside-town');
    const town = scenario.currentRoom().town;
    expect(town).toBeDefined();
    if (!town) return;

    const raid = scenario.game.startApproachingBanditRaidForCurrentTown(56);

    expect(raid).toBeDefined();
    if (!raid) return;
    expect(raid.phase).toBe('approaching');
    expect(town.districtByRoomId[raid.routeRoomIds[0]!]).toBeUndefined();
    expect(raid.banditActorIds).toHaveLength(raid.strength);
    expect(raid.banditActorIds.map((id) => scenario.actor(id).currentRoomId)).toEqual(
      Array.from({ length: raid.strength }, () => raid.routeRoomIds[0]),
    );
    scenario.assertWorldIntegrity();
  });

  it('TOWN-LIFE-059 - Raiders enter through a physical gate', () => {
    const scenario = townPatrolScenario('town-life-059-raid-gate-entry');
    const town = scenario.currentRoom().town;
    expect(town).toBeDefined();
    if (!town) return;
    const raid = scenario.game.startApproachingBanditRaidForCurrentTown(56);
    expect(raid).toBeDefined();
    if (!raid) return;

    const atGate = scenario.game.advanceApproachingBanditRaid(raid.id);
    const inside = atGate ? scenario.game.advanceApproachingBanditRaid(atGate.id) : null;

    expect(inside).toMatchObject({
      phase: 'inside',
      gateRoomId: town.entranceRoomId,
      targetRoomId: town.entranceRoomId,
    });
    expect(
      scenario.game
        .getCurrentFactionEvents()
        .some(
          (event) =>
            event.type === 'raid-active' &&
            event.roomId === town.entranceRoomId &&
            event.tags.includes('gate-entry'),
        ),
    ).toBe(true);
    scenario.assertWorldIntegrity();
  });

  it('TOWN-LIFE-060 - Patrol interception changes raid progress', () => {
    const scenario = townPatrolScenario('town-life-060-patrol-raid-intercept');
    const patrol = scenario.game.resolveTownPatrolExcursion();
    const raid = scenario.game.startApproachingBanditRaidForCurrentTown(64);
    expect(patrol).toBeDefined();
    expect(raid).toBeDefined();
    if (!patrol || !raid) return;

    const result = scenario.game.resolvePatrolRaidInterception(raid.id, patrol.id);

    expect(result).toMatchObject({
      warningCreated: true,
      delayedByRooms: 1,
    });
    expect(result?.strengthAfter).toBeLessThan(result?.strengthBefore ?? 0);
    expect(result?.patrol.retreating).toBe(true);
    expect(
      scenario.game.getRecentWorldRumors().some((rumor) => rumor.tags.includes('warning')),
    ).toBe(true);
    scenario.assertWorldIntegrity();
  });

  it('TOWN-LIFE-061 - Town emergency behavior composes', () => {
    const scenario = townPatrolScenario('town-life-061-town-emergency');
    const town = scenario.currentRoom().town;
    expect(town).toBeDefined();
    if (!town) return;
    const raid = scenario.game.startApproachingBanditRaidForCurrentTown(56);
    expect(raid).toBeDefined();
    if (!raid) return;

    scenario.game.advanceApproachingBanditRaid(raid.id);
    const inside = scenario.game.advanceApproachingBanditRaid(raid.id);

    expect(inside?.phase).toBe('inside');
    expect(
      town.buildings
        .filter((building) => building.enterable && building.publicAccess !== false)
        .every(
          (building) =>
            building.kind === 'residentialHome' ||
            scenario.game.getFlag(`town.doorClosure.${building.id}`) === 'Closed during the raid',
        ),
    ).toBe(true);
    expect(
      scenario.game
        .getActorSystem()
        .registry.getByRoom(town.entranceRoomId)
        .some((actor) => actor.flags.raidDefender || actor.flags.raidShelter),
    ).toBe(true);
    scenario.assertWorldIntegrity();
  });

  it('TOWN-LIFE-062 - Raid aftermath returns to current-time life', () => {
    const scenario = townPatrolScenario('town-life-062-raid-aftermath-resume');
    const town = scenario.currentRoom().town;
    expect(town).toBeDefined();
    if (!town) return;
    const raid = scenario.game.startApproachingBanditRaidForCurrentTown(56);
    expect(raid).toBeDefined();
    if (!raid) return;
    scenario.game.advanceApproachingBanditRaid(raid.id);
    const inside = scenario.game.advanceApproachingBanditRaid(raid.id);
    expect(inside).toBeDefined();
    if (!inside) return;

    const aftermath = scenario.game.resolveApproachingBanditRaidAftermath(inside.id, {
      casualties: 2,
      damage: 1,
    });

    expect(aftermath).toMatchObject({
      type: 'raid-aftermath',
      phase: 'aftermath',
    });
    expect(
      town.buildings.every(
        (building) => scenario.game.getFlag(`town.doorClosure.${building.id}`) === undefined,
      ),
    ).toBe(true);
    expect(
      scenario.game
        .getActorSystem()
        .registry.getByRoom(town.entranceRoomId)
        .every((actor) => !actor.flags.raidDefender && !actor.flags.raidShelter),
    ).toBe(true);
    scenario.assertWorldIntegrity();
  });

  it('TOWN-LIFE-063 - Raid consequences persist', () => {
    const scenario = townPatrolScenario('town-life-063-raid-consequences-save-load');
    const town = scenario.currentRoom().town;
    expect(town).toBeDefined();
    if (!town) return;
    const raid = scenario.game.startApproachingBanditRaidForCurrentTown(56);
    expect(raid).toBeDefined();
    if (!raid) return;
    scenario.game.advanceApproachingBanditRaid(raid.id);
    const inside = scenario.game.advanceApproachingBanditRaid(raid.id);
    expect(inside).toBeDefined();
    if (!inside) return;
    scenario.game.resolveApproachingBanditRaidAftermath(inside.id, {
      casualties: 2,
      damage: 3,
    });

    const reloaded = HeadlessScenario.fromSave(scenario.game.getSaveData());
    const savedRaid = reloaded.game.getFlag(`town.runtime.raid.${town.id}`);

    expect(savedRaid).toMatchObject({
      id: inside.id,
      phase: 'aftermath',
      casualties: 2,
      damage: 3,
    });
    expect(
      reloaded.game
        .getCurrentFactionEvents()
        .some((event) => event.type === 'raid-aftermath' && event.townId === town.id),
    ).toBe(true);
    expect(
      reloaded.game
        .getActorSystem()
        .registry.getByRoom(town.entranceRoomId)
        .some((actor) => actor.memory.some((memory) => memory.tags.includes('aftermath'))),
    ).toBe(true);
    reloaded.assertWorldIntegrity();
  });

  it('TOWN-LIFE-064 - Armed roles receive explicit loadouts', () => {
    const scenario = scheduledGuardWithBanditScenario('town-life-064-explicit-loadouts');

    expect(scenario.actor('town-life-guard').combat?.weapons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'firearm' }),
        expect.objectContaining({ kind: 'sword' }),
      ]),
    );
    expect(scenario.actor('town-life-bandit').combat?.weapons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'firearm' }),
        expect.objectContaining({ kind: 'sword' }),
      ]),
    );
    scenario.assertWorldIntegrity();
  });

  it('TOWN-LIFE-065 - Every civilian humanoid owns a gun', () => {
    const scenario = createHeadlessScenario({ seed: 'town-life-065-civilian-firearms' });
    const base = firstWalkableTile(scenario);
    const roles = ['resident', 'shopkeeper'] as const;

    for (const [index, role] of roles.entries()) {
      ensureScenarioActor(scenario, {
        id: `town-life-065-${role}`,
        name: `Town Life ${role}`,
        role,
        position: offsetPosition(base, index, 0),
      });
    }

    for (const role of roles) {
      expect(scenario.actor(`town-life-065-${role}`).combat?.weapons).toEqual(
        expect.arrayContaining([expect.objectContaining({ kind: 'firearm' })]),
      );
    }
    scenario.assertWorldIntegrity();
  });

  it('TOWN-LIFE-066 - Close player targets force a ready sword choice', () => {
    const scenario = weaponScenario('town-life-066-close-sword');
    scenario.enterRoom(scenario.currentRoom().id, { x: 13, y: 12 });

    const attack = scenario.game.chooseActorAttackAgainstPlayer('town-life-weapon-guard');

    expect(attack).toMatchObject({
      selectedWeaponKind: 'sword',
      activityKind: 'combat-melee',
      damagedPlayer: true,
    });
    expect(scenario.actor('town-life-weapon-guard').combat?.activeWeaponId).toBe('standard-sword');
    scenario.assertWorldIntegrity();
  });

  it('TOWN-LIFE-067 - Distant targets retain ranged combat', () => {
    const scenario = weaponScenario('town-life-067-distant-ranged');
    scenario.enterRoom(scenario.currentRoom().id, { x: 20, y: 12 });

    const attack = scenario.game.chooseActorAttackAgainstPlayer('town-life-weapon-guard');

    expect(attack).toMatchObject({
      selectedWeaponKind: 'firearm',
      activityKind: 'combat-ranged',
    });
    expect(scenario.actor('town-life-weapon-guard').combat?.activeWeaponId).toBe('guard-revolver');
    scenario.assertWorldIntegrity();
  });

  it('TOWN-LIFE-068 - Sword attacks emit a directional 2x3 footprint', () => {
    const scenario = weaponScenario('town-life-068-sword-footprints');
    const expected = {
      east: [
        { x: 13, y: 11 },
        { x: 14, y: 11 },
        { x: 13, y: 12 },
        { x: 14, y: 12 },
        { x: 13, y: 13 },
        { x: 14, y: 13 },
      ],
      west: [
        { x: 11, y: 11 },
        { x: 10, y: 11 },
        { x: 11, y: 12 },
        { x: 10, y: 12 },
        { x: 11, y: 13 },
        { x: 10, y: 13 },
      ],
      south: [
        { x: 11, y: 13 },
        { x: 11, y: 14 },
        { x: 12, y: 13 },
        { x: 12, y: 14 },
        { x: 13, y: 13 },
        { x: 13, y: 14 },
      ],
      north: [
        { x: 11, y: 11 },
        { x: 11, y: 10 },
        { x: 12, y: 11 },
        { x: 12, y: 10 },
        { x: 13, y: 11 },
        { x: 13, y: 10 },
      ],
    };

    expect(
      scenario.game.previewActorSwordAttack('town-life-weapon-guard', { x: 20, y: 12 })?.cells,
    ).toEqual(expected.east);
    expect(
      scenario.game.previewActorSwordAttack('town-life-weapon-guard', { x: 4, y: 12 })?.cells,
    ).toEqual(expected.west);
    expect(
      scenario.game.previewActorSwordAttack('town-life-weapon-guard', { x: 12, y: 20 })?.cells,
    ).toEqual(expected.south);
    expect(
      scenario.game.previewActorSwordAttack('town-life-weapon-guard', { x: 12, y: 4 })?.cells,
    ).toEqual(expected.north);
    scenario.assertWorldIntegrity();
  });

  it('TOWN-LIFE-069 - Direction ties resolve deterministically', () => {
    const first = weaponScenario('town-life-069-tie-a');
    const second = weaponScenario('town-life-069-tie-a');

    const a = first.game.previewActorSwordAttack('town-life-weapon-guard', { x: 14, y: 14 });
    const b = second.game.previewActorSwordAttack('town-life-weapon-guard', { x: 14, y: 14 });

    expect(a?.facing).toBe('east');
    expect(b).toMatchObject({ facing: a?.facing, cells: a?.cells });
    first.assertWorldIntegrity();
    second.assertWorldIntegrity();
  });

  it('TOWN-LIFE-070 - Walls clip a sword arc', () => {
    const scenario = weaponScenario('town-life-070-wall-clips-sword');
    replaceRoomTile(scenario.currentRoom(), 13, 12, '#');

    const attack = scenario.game.previewActorSwordAttack('town-life-weapon-guard', {
      x: 14,
      y: 12,
    });

    expect(attack?.blocked).toBe(true);
    expect(attack?.cells).not.toContainEqual({ x: 14, y: 12 });
    scenario.assertWorldIntegrity();
  });

  it('TOWN-LIFE-071 - The snake head is the player hit target', () => {
    const scenario = weaponScenario('town-life-071-head-only-target');
    setScenarioSnakeBody(scenario, [
      { x: 15, y: 12 },
      { x: 13, y: 12 },
    ]);
    scenario.game.setFlag('player.health', 3);

    const attack = scenario.game.resolveActorSwordAttackAgainstPlayer('town-life-weapon-guard');

    expect(attack?.visualCells).toContainEqual({ x: 13, y: 12 });
    expect(attack?.damagedPlayer).toBe(false);
    expect(scenario.game.getPlayerHealth().current).toBe(3);
    scenario.assertWorldIntegrity();
  });

  it("TOWN-LIFE-072 - A head inside the arc takes one attack's damage", () => {
    const scenario = weaponScenario('town-life-072-head-damage-once');
    setScenarioSnakeBody(scenario, [
      { x: 13, y: 12 },
      { x: 14, y: 12 },
    ]);
    scenario.game.setFlag('player.health', 3);

    const attack = scenario.game.resolveActorSwordAttackAgainstPlayer('town-life-weapon-guard');

    expect(attack?.damagedPlayer).toBe(true);
    expect(scenario.game.getPlayerHealth().current).toBe(2);
    scenario.assertWorldIntegrity();
  });

  it('TOWN-LIFE-073 - The sword prop follows the attack', () => {
    const scenario = weaponScenario('town-life-073-weapon-prop');
    scenario.enterRoom(scenario.currentRoom().id, { x: 20, y: 12 });
    scenario.game.chooseActorAttackAgainstPlayer('town-life-weapon-guard');
    expect(getActorActivityProp(scenario.actor('town-life-weapon-guard'))?.kind).toBe('bow');
    scenario.enterRoom(scenario.currentRoom().id, { x: 13, y: 12 });

    scenario.game.chooseActorAttackAgainstPlayer('town-life-weapon-guard');

    expect(getActorActivityProp(scenario.actor('town-life-weapon-guard'))?.kind).toBe('sword');
    scenario.assertWorldIntegrity();
  });

  it('TOWN-LIFE-074 - Slash juice consumes canonical cells', () => {
    const scenario = weaponScenario('town-life-074-slash-cells');

    const attack = scenario.game.previewActorSwordAttack('town-life-weapon-guard', {
      x: 20,
      y: 12,
    });

    expect(attack?.visualCells).toEqual(attack?.cells);
    expect(attack?.visualCells).toHaveLength(6);
    scenario.assertWorldIntegrity();
  });

  it('TOWN-LIFE-075 - Sword cooldown prevents duplicate damage', () => {
    const scenario = weaponScenario('town-life-075-sword-cooldown');
    scenario.enterRoom(scenario.currentRoom().id, { x: 13, y: 12 });
    scenario.game.setFlag('player.health', 3);

    const first = scenario.game.resolveActorSwordAttackAgainstPlayer('town-life-weapon-guard');
    const second = scenario.game.resolveActorSwordAttackAgainstPlayer('town-life-weapon-guard');

    expect(first?.damagedPlayer).toBe(true);
    expect(second).toMatchObject({ cooldownActive: true, damagedPlayer: false });
    expect(scenario.game.getPlayerHealth().current).toBe(2);
    scenario.assertWorldIntegrity();
  });

  it('TOWN-LIFE-076 - A blocked or cooling melee attack uses a legal fallback', () => {
    const scenario = weaponScenario('town-life-076-melee-fallback');
    scenario.enterRoom(scenario.currentRoom().id, { x: 14, y: 12 });
    replaceRoomTile(scenario.currentRoom(), 13, 12, '#');

    const attack = scenario.game.chooseActorAttackAgainstPlayer('town-life-weapon-guard');

    expect(attack).toMatchObject({
      selectedWeaponKind: 'firearm',
      activityKind: 'combat-ranged',
    });
    scenario.assertWorldIntegrity();
  });

  it('TOWN-LIFE-077 - Guards can sword-fight bandits', () => {
    const scenario = weaponScenario('town-life-077-guard-bandit-sword');
    ensureScenarioEnemyActor(scenario, {
      id: 'town-life-077-bandit',
      name: 'Town Life Sword Bandit',
      encounterKind: 'bandit',
      position: { x: 13, y: 12 },
    });

    const attack = scenario.game.resolveActorSwordAttackAgainstActor(
      'town-life-weapon-guard',
      'town-life-077-bandit',
    );

    expect(attack).toMatchObject({
      damagedActorIds: ['town-life-077-bandit'],
      selectedWeaponKind: 'sword',
    });
    expect(scenario.actor('town-life-077-bandit').health?.current).toBe(0);
    scenario.assertWorldIntegrity();
  });

  it('TOWN-LIFE-078 - Melee does not damage allies in the arc', () => {
    const scenario = weaponScenario('town-life-078-no-friendly-sword-fire');
    ensureScenarioActor(scenario, {
      id: 'town-life-078-ally',
      name: 'Town Life Patrol Ally',
      role: 'guard',
      position: { x: 13, y: 11 },
    });
    ensureScenarioEnemyActor(scenario, {
      id: 'town-life-078-bandit',
      name: 'Town Life Hostile Target',
      encounterKind: 'bandit',
      position: { x: 13, y: 12 },
    });

    const attack = scenario.game.resolveActorSwordAttackAgainstActor(
      'town-life-weapon-guard',
      'town-life-078-bandit',
    );

    expect(attack?.damagedActorIds).toEqual(['town-life-078-bandit']);
    expect(scenario.actor('town-life-078-ally').health?.state).toBe('healthy');
    scenario.assertWorldIntegrity();
  });

  it('TOWN-LIFE-079 - Combat end clears weapon presentation', () => {
    const scenario = weaponScenario('town-life-079-combat-clear');
    scenario.enterRoom(scenario.currentRoom().id, { x: 13, y: 12 });
    scenario.game.chooseActorAttackAgainstPlayer('town-life-weapon-guard');
    expect(getActorActivityProp(scenario.actor('town-life-weapon-guard'))?.kind).toBe('sword');

    scenario.game.clearActorCombatState('town-life-weapon-guard');

    expect(scenario.actor('town-life-weapon-guard').combat?.activeWeaponId).toBeUndefined();
    expect(getActorActivityProp(scenario.actor('town-life-weapon-guard'))).toBeNull();
    scenario.assertWorldIntegrity();
  });

  it('TOWN-LIFE-080 - Weapon state survives mid-combat save/load', () => {
    const scenario = weaponScenario('town-life-080-weapon-save-load');
    scenario.enterRoom(scenario.currentRoom().id, { x: 13, y: 12 });
    scenario.game.resolveActorSwordAttackAgainstPlayer('town-life-weapon-guard');

    const reloaded = HeadlessScenario.fromSave(scenario.game.getSaveData());
    const actor = reloaded.actor('town-life-weapon-guard');

    expect(actor.combat?.weapons).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'standard-sword', kind: 'sword' })]),
    );
    expect(actor.combat?.activeWeaponId).toBe('standard-sword');
    expect(actor.flags.actorSwordCooldownUntilRoom).toBeDefined();
    expect(actor.flags.actorSwordAttack).toMatchObject({ selectedWeaponKind: 'sword' });
    reloaded.assertWorldIntegrity();
  });

  it('TOWN-LIFE-081 - Town life survives a composed save/load', () => {
    const scenario = mapperStockScenario('town-life-081-composed-save-load');
    const town = scenario.currentRoom().town;
    expect(town).toBeDefined();
    if (!town) return;
    const patrol = scenario.game.resolveTownPatrolExcursion();
    const raid = scenario.game.startApproachingBanditRaidForCurrentTown(56);
    scenario.setDayPhase('dusk');
    setScenarioAtmosphere(scenario, { globalWeather: 'rain' });
    scenario.game.setFlag(`town.doorClosure.${town.buildings[0]!.id}`, 'Closed during a raid');
    ensureScenarioActor(scenario, {
      id: 'town-life-081-traveler',
      name: 'Town Life Traveler',
      role: 'resident',
      roomId: scenario.currentRoom().id,
      homeRoomId: scenario.currentRoom().id,
      workRoomId: patrol?.routeRoomIds[0] ?? scenario.currentRoom().id,
      position: firstWalkableTile(scenario),
    });
    scenario.setActorGoal('town-life-081-traveler', {
      kind: 'travelToRoom',
      priority: 80,
      roomId: patrol?.routeRoomIds[0] ?? scenario.currentRoom().id,
      reason: 'composed-save-load',
    });
    const stock = mapperStockFor(scenario, 12);

    const reloaded = HeadlessScenario.fromSave(scenario.game.getSaveData());

    expect(reloaded.actor('town-life-081-traveler').goal).toMatchObject({
      kind: 'travelToRoom',
      reason: 'composed-save-load',
    });
    expect(reloaded.game.getAtmosphereState()).toMatchObject({
      dayPhase: 'dusk',
      globalWeather: 'rain',
    });
    expect(reloaded.game.getFlag(`town.doorClosure.${town.buildings[0]!.id}`)).toBe(
      'Closed during a raid',
    );
    expect(reloaded.game.resolveTownPatrolExcursion(town.id)?.id).toBe(patrol?.id);
    expect(reloaded.game.getFlag(`town.runtime.raid.${town.id}`)).toMatchObject({
      id: raid?.id,
      phase: 'approaching',
    });
    expect(mapperStockFor(reloaded, 12)).toEqual(stock);
    reloaded.assertWorldIntegrity();
  });

  it('TOWN-LIFE-082 - Repeated reads do not simulate time or population', () => {
    const scenario = createHeadlessScenario({ seed: 'town-life-082-reads-do-not-simulate' });
    ensureScenarioActor(scenario, {
      id: 'town-life-082-guard',
      name: 'Town Life Read Guard',
      role: 'guard',
      position: firstWalkableTile(scenario),
    });
    const before = scenario.captureSimulationFingerprint();

    scenario.readNineRoomsRepeatedly(200);

    expect(scenario.captureSimulationFingerprint()).toEqual(before);
    scenario.assertWorldIntegrity();
  });

  it('TOWN-LIFE-083 - Unrelated RNG does not rewrite the town', () => {
    const first = townPatrolScenario('town-life-083-rng-isolation');
    const second = townPatrolScenario('town-life-083-rng-isolation');
    const unrelated = createRng('town-life-083-unrelated-rolls');
    for (let index = 0; index < 999; index += 1) {
      unrelated();
    }

    expect(townDeterminismSnapshot(first)).toEqual(townDeterminismSnapshot(second));
    first.assertWorldIntegrity();
    second.assertWorldIntegrity();
  });

  it('TOWN-LIFE-084 - Offscreen work remains bounded', async () => {
    const scenario = townPatrolScenario('town-life-084-offscreen-bounded');
    const nearbyTown = scenario.currentRoom().town;
    expect(nearbyTown).toBeDefined();
    if (!nearbyTown) return;
    const firstPatrol = scenario.game.resolveTownPatrolExcursion();
    const secondTownRoom = generatedTownRooms(scenario, 64).find(
      (room) => room.town && room.town.id !== nearbyTown.id,
    );
    expect(secondTownRoom).toBeDefined();
    if (!secondTownRoom) return;
    scenario.enterRoom(secondTownRoom.id, firstWalkableTile(scenario, secondTownRoom.id));
    const secondPatrol = scenario.game.resolveTownPatrolExcursion();
    expect(firstPatrol).toBeDefined();
    expect(secondPatrol).toBeDefined();
    const before = scenario.diagnostics();
    const generatedBefore = scenario.game.getGeneratedRoomCount();

    scenario.enterRoom('40,40,0', { x: 5, y: 5 });
    await scenario.advanceSeconds(5);

    const after = scenario.diagnostics();
    expect(after.actorTicks - before.actorTicks).toBeLessThanOrEqual(50);
    expect(after.actorMutations - before.actorMutations).toBeLessThan(80);
    expect(scenario.game.getGeneratedRoomCount() - generatedBefore).toBeLessThanOrEqual(2);
    expect(scenario.game.getFlag(`town.runtime.patrol.${nearbyTown.id}`)).toMatchObject({
      id: firstPatrol?.id,
    });
    scenario.assertWorldIntegrity();
  }, 15_000);

  it('TOWN-LIFE-085 - World integrity holds after a town emergency day', async () => {
    const scenario = enterGeneratedInnScenario('town-life-085-emergency-day-integrity');
    setScenarioAtmosphere(scenario, { dayPhase: 'dusk', globalWeather: 'storm' });
    scenario.game.setScore(50);
    const rest = await scenario.game.restAtCurrentInnUntilDawn(12);
    expect(rest.ok).toBe(true);
    exitCurrentLayerThroughDoor(scenario);
    const town = scenario.currentRoom().town;
    expect(town).toBeDefined();
    if (!town) return;
    const patrol = scenario.game.resolveTownPatrolExcursion();
    const raid = scenario.game.startApproachingBanditRaidForCurrentTown(64);
    expect(patrol).toBeDefined();
    expect(raid).toBeDefined();
    if (!patrol || !raid) return;
    scenario.game.resolvePatrolRaidInterception(raid.id, patrol.id);
    scenario.game.advanceApproachingBanditRaid(raid.id);
    const inside = scenario.game.advanceApproachingBanditRaid(raid.id);
    expect(inside).toBeDefined();
    if (!inside) return;
    const defender = scenario.game
      .getActorSystem()
      .registry.getByRoom(town.entranceRoomId)
      .find((actor) => actor.flags.raidDefender);
    if (defender) {
      scenario.game.getActorSystem().registry.update(defender.id, (actor) => ({
        ...actor,
        health: { current: 0, max: actor.health?.max ?? 3, state: 'dead' },
        hostility: 'dead',
      }));
    }
    scenario.game.resolveApproachingBanditRaidAftermath(inside.id, {
      casualties: 3,
      damage: 2,
    });

    const reloaded = HeadlessScenario.fromSave(scenario.game.getSaveData());

    expect(reloaded.game.getFlag(`town.runtime.raid.${town.id}`)).toMatchObject({
      phase: 'aftermath',
      damage: 2,
    });
    reloaded.assertWorldIntegrity();
  });
});

function scheduledShopkeeperScenario(seed: string): HeadlessScenario {
  const scenario = createHeadlessScenario({ seed });
  scenario.getRoom('1,0,0');
  ensureScenarioActor(scenario, {
    id: 'town-life-009-shopkeeper',
    name: 'Town Life Shopkeeper',
    role: 'shopkeeper',
    roomId: '0,0,0',
    homeRoomId: '1,0,0',
    workRoomId: '0,0,0',
    position: firstWalkableTile(scenario, '0,0,0'),
  });
  return scenario;
}

function setScenarioSkyEvent(
  scenario: HeadlessScenario,
  current: 'none' | 'bloodMoon' | 'eclipse' | 'meteorShower' | 'aurora',
): void {
  const loaded = scenario.game.loadFromSaveData({
    ...scenario.game.getSaveData(),
    atmosphere: {
      ...scenario.game.getAtmosphereState(),
      skyEvent: {
        current,
        remainingPhaseTicks: current === 'none' ? 0 : 2,
        intensity: current === 'none' ? 0 : 1,
        seed: 18,
      },
    },
  });
  expect(loaded).toBe(true);
}

function setScenarioAtmosphere(
  scenario: HeadlessScenario,
  atmosphere: Partial<AtmosphereState>,
): void {
  const loaded = scenario.game.loadFromSaveData({
    ...scenario.game.getSaveData(),
    atmosphere: {
      ...scenario.game.getAtmosphereState(),
      ...atmosphere,
    },
  });
  expect(loaded).toBe(true);
  scenario.game.getActorSystem().markSchedulesDirty();
}

function scheduledGuardWithBanditScenario(seed: string): HeadlessScenario {
  const scenario = createHeadlessScenario({ seed });
  const base = firstWalkableTile(scenario);
  ensureScenarioActor(scenario, {
    id: 'town-life-guard',
    name: 'Town Life Guard',
    role: 'guard',
    roomId: scenario.currentRoom().id,
    homeRoomId: scenario.currentRoom().id,
    workRoomId: scenario.currentRoom().id,
    position: base,
  });
  ensureScenarioEnemyActor(scenario, {
    id: 'town-life-bandit',
    name: 'Town Life Bandit',
    encounterKind: 'bandit',
    position: offsetPosition(base, 1, 0),
  });
  return scenario;
}

function scheduledGuardAndResidentScenario(seed: string): HeadlessScenario {
  const scenario = createHeadlessScenario({ seed });
  const roomId = scenario.currentRoom().id;
  const base = firstWalkableTile(scenario, roomId);
  const guard = ensureScenarioActor(scenario, {
    id: 'town-life-dutiful-guard',
    name: 'Town Life Dutiful Guard',
    role: 'guard',
    roomId,
    homeRoomId: roomId,
    workRoomId: roomId,
    position: base,
  });
  const resident = ensureScenarioActor(scenario, {
    id: 'town-life-cautious-resident',
    name: 'Town Life Cautious Resident',
    role: 'resident',
    roomId,
    homeRoomId: '1,0,0',
    workRoomId: roomId,
    position: offsetPosition(base, 1, 0),
  });
  scenario.game.getActorSystem().registry.update(guard.id, (actor) => ({
    ...actor,
    personality: ['lawful'],
  }));
  scenario.game.getActorSystem().registry.update(resident.id, (actor) => ({
    ...actor,
    personality: ['cowardly'],
  }));
  scenario.setDayPhase('day');
  return scenario;
}

function mapperStockScenario(seed: string): HeadlessScenario {
  const scenario = createHeadlessScenario({ seed });
  const { room, entrance } = generatedTownEntrances(scenario, 'mapper')[0]!;
  scenario.enterRoom(room.id, adjacentWalkableTile(room, entrance));
  expect(scenario.game.getNearbyTownBuildingDoor()).toMatchObject({
    entranceId: entrance.id,
    doorKind: 'shopDoorClosed',
  });
  return scenario;
}

function enterGeneratedInnScenario(seed: string): HeadlessScenario {
  const scenario = createHeadlessScenario({ seed });
  const { room, entrance } = generatedTownEntrances(scenario, 'inn')[0]!;
  scenario.enterRoom(room.id, adjacentWalkableTile(room, entrance));
  expect(scenario.game.enterNearbyTownBuildingDoor().ok).toBe(true);
  expect(scenario.currentRoom().layer?.templateId).toBe('inn');
  return scenario;
}

function townPatrolScenario(seed: string): HeadlessScenario {
  const scenario = createHeadlessScenario({ seed });
  const townRoom = generatedTownRooms(scenario, 8).find((room) => room.town);
  expect(townRoom).toBeDefined();
  if (townRoom) {
    scenario.enterRoom(townRoom.id, firstWalkableTile(scenario, townRoom.id));
  }
  return scenario;
}

function weaponScenario(seed: string): HeadlessScenario {
  const scenario = createHeadlessScenario({ seed });
  const room = scenario.currentRoom();
  for (let y = 9; y <= 15; y += 1) {
    for (let x = 9; x <= 21; x += 1) {
      replaceRoomTile(room, x, y, '.');
    }
  }
  scenario.enterRoom(room.id, { x: 20, y: 12 });
  ensureScenarioActor(scenario, {
    id: 'town-life-weapon-guard',
    name: 'Town Life Weapon Guard',
    role: 'guard',
    roomId: room.id,
    homeRoomId: room.id,
    workRoomId: room.id,
    position: { x: 12, y: 12 },
  });
  return scenario;
}

function townDeterminismSnapshot(scenario: HeadlessScenario): Record<string, unknown> {
  const room = scenario.currentRoom();
  const town = room.town;
  expect(town).toBeDefined();
  if (!town) return {};
  return {
    generationIdentity: scenario.game.getWorldGenerationIdentity(),
    roomIds: town.physicalRoomIds,
    buildings: town.buildings.map((building) => ({
      id: building.id,
      roomId: building.roomId,
      kind: building.kind,
      door: building.door,
    })),
    residents: town.residents.map((resident) => ({
      id: resident.id,
      actorId: resident.actorId,
      role: resident.role,
      roomId: resident.workRoomId,
      x: resident.x,
      y: resident.y,
    })),
    schedules: scenario.game
      .getActorSystem()
      .registry.getByRoom(room.id)
      .map((actor) => ({ id: actor.id, schedule: actor.schedule })),
    mapperStock: mapperStockFor(scenario, 12),
    garageTarget: structureLocatorSearch(scenario, 'garage', 48),
    patrol: scenario.game.resolveTownPatrolExcursion(town.id),
  };
}

function replaceRoomTile(room: RoomSnapshot, x: number, y: number, tile: string): void {
  const row = room.layout[y];
  expect(row).toBeDefined();
  if (!row) return;
  room.layout[y] = `${row.slice(0, x)}${tile}${row.slice(x + 1)}`;
}

function setScenarioSnakeBody(scenario: HeadlessScenario, localBody: Vector2Like[]): void {
  const roomId = scenario.currentRoom().id;
  const [roomX, roomY] = parseCoordinateRoomId(roomId);
  const loaded = scenario.game.loadFromSaveData({
    ...scenario.game.getSaveData(),
    snakeRoomId: roomId,
    snakeBody: localBody.map((segment) => ({
      x: segment.x + roomX * scenario.game.config.grid.cols,
      y: segment.y + roomY * scenario.game.config.grid.rows,
    })),
  });
  expect(loaded).toBe(true);
}

function townWallDistance(townRoomIds: readonly string[], roomId: string): number {
  const coords = townRoomIds.map(parseCoordinateRoomId);
  const xs = coords.map(([x]) => x);
  const ys = coords.map(([, y]) => y);
  const [x, y] = parseCoordinateRoomId(roomId);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  if (x < minX && y >= minY && y <= maxY) return minX - x;
  if (x > maxX && y >= minY && y <= maxY) return x - maxX;
  if (y < minY && x >= minX && x <= maxX) return minY - y;
  if (y > maxY && x >= minX && x <= maxX) return y - maxY;
  return Math.max(
    Math.min(Math.abs(x - minX), Math.abs(x - maxX)),
    Math.min(Math.abs(y - minY), Math.abs(y - maxY)),
  );
}

function parseCoordinateRoomId(roomId: string): [number, number, number] {
  const [x = 0, y = 0, z = 0] = roomId.split(',').map(Number);
  return [x, y, z];
}

function crampedStructureLayout(): string[][] {
  const { rows, cols } = defaultGameConfig.grid;
  return Array.from({ length: rows }, (_, y) =>
    Array.from({ length: cols }, (_, x) =>
      x === 0 || y === 0 || x === cols - 1 || y === rows - 1 ? '#' : 'W',
    ),
  );
}

function mapperStockFor(scenario: HeadlessScenario, stockPeriod: number) {
  const room = scenario.currentRoom();
  const town = room.town;
  expect(town).toBeDefined();
  if (!town) return [];
  return buildMapperStock({
    townId: town.id,
    worldSeed: scenario.game.worldSeed,
    currentBiomeId: town.biomeId,
    stockPeriod,
  });
}

function structureLocatorSearch(
  scenario: HeadlessScenario,
  structureKind: StructureLocatorKind,
  maxRadius: number,
) {
  return findNearestStructureLocatorTarget({
    originRoomId: scenario.currentRoom().id,
    structureKind,
    identity: scenario.game.getWorldGenerationIdentity(),
    grid: scenario.game.config.grid,
    worldConfig: scenario.game.config.world,
    maxRadius,
  });
}

function exteriorReachabilityTargets(room: RoomSnapshot): ReachabilityTarget[] {
  const targets: ReachabilityTarget[] = [];
  for (const entrance of room.layerEntrances ?? []) {
    targets.push({
      ...entrance.returnPosition,
      label: `${entrance.templateId} return position`,
    });
    if (isTownWalkable(room.layout[entrance.y]?.[entrance.x])) {
      targets.push({ x: entrance.x, y: entrance.y, label: `${entrance.templateId} doorway` });
    }
  }
  for (const presence of room.town?.residentPresences ?? []) {
    targets.push({
      x: presence.x,
      y: presence.y,
      label: `${presence.role ?? presence.residentId} resident`,
    });
  }
  if (room.town?.center && room.town.districtByRoomId[room.id]) {
    targets.push({ ...room.town.center, label: `${room.town.districtByRoomId[room.id]} center` });
  }
  return targets;
}

function interiorReachabilityTargets(room: RoomSnapshot): ReachabilityTarget[] {
  const targets: ReachabilityTarget[] = [];
  if (room.layer?.exit) {
    targets.push({ ...room.layer.exit, label: `${room.layer.templateId} exit` });
  }
  for (const presence of room.town?.residentPresences ?? []) {
    targets.push({
      x: presence.x,
      y: presence.y,
      label: `${presence.role ?? presence.residentId} interior resident`,
    });
  }
  for (const tile of requiredInteriorTiles(room.layer?.templateId)) {
    targets.push(
      ...tilesMatching(room, tile).map((point) => ({ ...point, label: `${tile} tile` })),
    );
  }
  return targets;
}

function requiredInteriorTiles(templateId: LayerTemplateId | undefined): string[] {
  switch (templateId) {
    case 'tavern':
      return ['A', 'R', 'S'];
    case 'generalStore':
      return ['M', 'S'];
    case 'butcherShop':
      return ['F', 'K'];
    case 'potionMaker':
      return ['A', 'P'];
    case 'mapper':
      return ['M', 'S', 'P'];
    case 'wizardShop':
      return ['A', 'M', 'P', 'S'];
    case 'inn':
      return ['A', 'P', 'R', 'S'];
    case 'residentialHome':
      return ['R', 'S'];
    case 'thievesGuild':
      return ['G'];
    case undefined:
      return [];
  }
}

function tilesMatching(room: RoomSnapshot, tile: string): Array<{ x: number; y: number }> {
  const matches: Array<{ x: number; y: number }> = [];
  room.layout.forEach((row, y) => {
    [...row].forEach((candidate, x) => {
      if (candidate === tile) {
        matches.push({ x, y });
      }
    });
  });
  return matches;
}

function assertTownTargetsReachable(
  room: RoomSnapshot,
  targets: readonly ReachabilityTarget[],
  atlas: string,
  starts?: readonly ReachabilityTarget[],
): void {
  expect(targets.length, `${room.id} should expose reachability targets.`).toBeGreaterThan(0);
  const unreachable = unreachableTargets(room, targets, starts);
  if (unreachable.length > 0) {
    throw new Error(
      [
        `${room.id} has unreachable town targets:`,
        ...unreachable.map(
          (target) =>
            `- ${target.label} at (${target.x},${target.y}) tile=${room.layout[target.y]?.[target.x]}`,
        ),
        '',
        atlas,
      ].join('\n'),
    );
  }
}

function groupRoomsByTownId(rooms: readonly RoomSnapshot[]): Map<string, RoomSnapshot[]> {
  const groups = new Map<string, RoomSnapshot[]>();
  for (const room of rooms) {
    const townId = room.town?.id ?? room.townPerimeter?.townId;
    if (!townId) {
      continue;
    }
    const group = groups.get(townId) ?? [];
    group.push(room);
    groups.set(townId, group);
  }
  return groups;
}

function generatedTownRooms(scenario: HeadlessScenario, radius: number): RoomSnapshot[] {
  const rooms: RoomSnapshot[] = [];
  const seen = new Set<string>();
  for (let y = -radius; y <= radius; y += 1) {
    for (let x = -radius; x <= radius; x += 1) {
      const room = scenario.getRoom(`${x},${y},0`);
      if (room.town && !seen.has(room.id)) {
        rooms.push(room);
        seen.add(room.id);
      }
    }
  }
  return rooms;
}

function generatedTownEntrances(
  scenario: HeadlessScenario,
  templateId: LayerTemplateId,
): Array<{
  room: RoomSnapshot;
  entrance: NonNullable<RoomSnapshot['layerEntrances']>[number];
}> {
  return generatedTownRooms(scenario, 8).flatMap((room) =>
    (room.layerEntrances ?? [])
      .filter((entrance) => entrance.kind === 'townInterior' && entrance.templateId === templateId)
      .map((entrance) => ({ room, entrance })),
  );
}

function assertInteriorExitReachable(room: RoomSnapshot): void {
  const start = room.layer?.spawn;
  const exit = findLayerExitTile(room);
  expect(start).toBeDefined();
  expect(exit).toBeDefined();
  if (!start || !exit) return;
  const queue = [start];
  const seen = new Set<string>([`${start.x},${start.y}`]);
  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index]!;
    if (current.x === exit.x && current.y === exit.y) {
      return;
    }
    for (const direction of [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ]) {
      const next = { x: current.x + direction.x, y: current.y + direction.y };
      const key = `${next.x},${next.y}`;
      if (seen.has(key) || isSolidTile(room.layout[next.y]?.[next.x])) {
        continue;
      }
      seen.add(key);
      queue.push(next);
    }
  }
  throw new Error(`Interior exit is not reachable in ${room.id}.`);
}

function exitCurrentLayerThroughDoor(scenario: HeadlessScenario): void {
  const interior = scenario.currentRoom();
  const exit = findLayerExitTile(interior);
  expect(exit).toBeDefined();
  if (!exit) return;
  const beforeExit = adjacentWalkableTile(interior, exit);
  const direction = { x: exit.x - beforeExit.x, y: exit.y - beforeExit.y };
  scenario.game.placeSnakeBodyAtLocal(interior.id, beforeExit, direction);
  scenario.game.forceDirection(direction.x, direction.y);
  scenario.advanceActionTicks(1);
}

function findLayerExitTile(room: RoomSnapshot): { x: number; y: number } | undefined {
  for (let y = 0; y < room.layout.length; y += 1) {
    const x = room.layout[y]?.indexOf('v') ?? -1;
    if (x >= 0) {
      return { x, y };
    }
  }
  return undefined;
}

function assertPointNotSolid(
  room: RoomSnapshot,
  point: { x: number; y: number },
  label: string,
): void {
  const tile = room.layout[point.y]?.[point.x];
  expect(isSolidTile(tile), `${label} spawned on solid tile "${tile}" in ${room.id}.`).toBe(false);
}
