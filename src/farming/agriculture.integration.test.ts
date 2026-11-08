import { describe, expect, it } from 'vitest';
import { createHeadlessScenario } from '../test/headless/headlessScenario.js';
import { ConstructionState } from '../building/constructionState.js';
import { getStructureBlueprint, planStructureStamp } from '../building/structureBlueprint.js';
import { FarmingState, WORLD_DAY_MS } from './farmingState.js';
import { processFarmDawn, exteriorFarmAccess } from './farmingIncidents.js';
import { farmShelter } from './farmingActions.js';
import { WorldAtmosphereSystem } from '../world/atmosphereSystem.js';
import { defaultGameConfig } from '../config/gameConfig.js';
import type { RoomSnapshot } from '../world/types.js';
import type { GameSaveData } from '../game/saveTypes.js';
import { isClientCommand } from '../session/gameProtocol.js';
import { adjacentWalkableTile, findGeneratedTownDoor } from '../test/headless/scenarioFixtures.js';

function room(): RoomSnapshot {
  return {
    id: '20,20,0',
    biomeId: 'verdigris-basin',
    biomeTitle: 'Meadow',
    backgroundColor: 0,
    wallColor: 0,
    wallOutlineColor: 0,
    portals: [],
    layout: Array.from({ length: 20 }, () => '.'.repeat(20)),
  };
}
function stamp(
  construction: ConstructionState,
  target: RoomSnapshot,
  blueprintId: string,
  x: number,
  y: number,
) {
  const blueprint = getStructureBlueprint(blueprintId);
  if (!blueprint) throw new Error('Missing blueprint');
  construction.claimRoom(target.id, 'owner');
  return construction.placeStructure({
    room: target,
    ownerId: 'owner',
    plan: planStructureStamp(blueprint, { x, y }, 'north'),
  });
}

describe('greenhouse, fences and world-owned farm incidents', () => {
  it.each(['north', 'east', 'south', 'west'] as const)(
    'rotates greenhouse grow coverage and door together (%s)',
    (rotation) => {
      const target = room(),
        construction = new ConstructionState();
      construction.claimRoom(target.id, 'owner');
      const blueprint = getStructureBlueprint('greenhouse');
      if (!blueprint) throw new Error('Missing greenhouse');
      const plan = planStructureStamp(blueprint, { x: 10, y: 10 }, rotation);
      const placed = construction.placeStructure({ room: target, ownerId: 'owner', plan });
      expect(placed.ok).toBe(true);
      expect(plan.cells).toHaveLength(25);
      expect(plan.cells.filter((cell) => cell.tile === 'G')).toHaveLength(9);
      const farms = new FarmingState();
      for (const position of plan.cells.filter((cell) => cell.tile === 'G')) {
        const cell = farms.till(
          target.id,
          target.biomeId,
          position.localX,
          position.localY,
          'artificial',
        )!;
        expect(farmShelter(construction, target.id, cell).greenhouse).toBe(true);
        expect(construction.isEffectivelySolid(target, cell.x, cell.y)).toBe(false);
      }
      const door = plan.cells.find((cell) => cell.kind === 'door')!;
      expect(construction.isEffectivelySolid(target, door.localX, door.localY)).toBe(false);
      expect(construction.isCreatureSolid(target, door.localX, door.localY)).toBe(true);
    },
  );
  it('refuses greenhouse grow-bed footprint over water or crops', () => {
    const target = room(),
      construction = new ConstructionState();
    construction.claimRoom(target.id, 'owner');
    const blueprint = getStructureBlueprint('greenhouse');
    if (!blueprint) throw new Error('Missing greenhouse');
    const plan = planStructureStamp(blueprint, { x: 10, y: 10 }, 'north');
    const bed = plan.cells.find((cell) => cell.tile === 'G')!;
    expect(
      construction.validatePlacement({
        room: target,
        ownerId: 'owner',
        plan,
        cropCells: [{ x: bed.localX, y: bed.localY }],
      }).valid,
    ).toBe(false);
    target.layout[bed.localY] = '.'.repeat(bed.localX) + '~' + '.'.repeat(19 - bed.localX);
    expect(construction.validatePlacement({ room: target, ownerId: 'owner', plan }).valid).toBe(
      false,
    );
    expect(construction.getStructures()).toHaveLength(0);
  });
  it('ends coverage on destruction without deleting the underlying crop, and persists durability', () => {
    const target = room(),
      construction = new ConstructionState(),
      farms = new FarmingState();
    const placed = stamp(construction, target, 'greenhouse', 10, 10);
    if (!placed.ok) throw new Error('Placement failed');
    const cell = farms.till(target.id, target.biomeId, 10, 8, 'artificial')!;
    farms.plant(cell, 'tomato', 'owner');
    expect(construction.damage(placed.structure.id, 30)).toBe(true);
    const loaded = new ConstructionState();
    loaded.load(
      JSON.parse(JSON.stringify(construction.save())) as ReturnType<ConstructionState['save']>,
    );
    expect(loaded.getStructure(placed.structure.id)?.health).toBe(70);
    expect(farmShelter(loaded, target.id, cell).greenhouse).toBe(true);
    loaded.damage(placed.structure.id, 70);
    expect(farmShelter(loaded, target.id, cell).greenhouse).toBe(false);
    expect(cell.crop?.cropId).toBe('tomato');
  });
  it('enforces gate operation permissions and keeps open/closed collision through save/load', () => {
    const target = room(),
      construction = new ConstructionState();
    stamp(construction, target, 'farm-gate', 5, 5);
    expect(construction.isEffectivelySolid(target, 5, 5)).toBe(true);
    expect(construction.toggleGate(target.id, 5, 5, 'intruder')).toBe(false);
    expect(construction.toggleGate(target.id, 5, 5, 'owner')).toBe(true);
    const next = new ConstructionState();
    next.load(
      JSON.parse(JSON.stringify(construction.save())) as ReturnType<ConstructionState['save']>,
    );
    expect(next.isEffectivelySolid(target, 5, 5)).toBe(false);
    expect(next.toggleGate(target.id, 5, 5, 'owner')).toBe(true);
    expect(next.isEffectivelySolid(target, 5, 5)).toBe(true);
  });
  it('physical fence enclosure prevents exterior access; a real gap restores it', () => {
    const target = room(),
      construction = new ConstructionState();
    for (let x = 4; x <= 6; x++) {
      stamp(construction, target, 'farm-fence', x, 4);
      stamp(construction, target, 'farm-fence', x, 6);
    }
    stamp(construction, target, 'farm-fence', 4, 5);
    const gate = stamp(construction, target, 'farm-gate', 6, 5);
    expect(gate.ok).toBe(true);
    expect(exteriorFarmAccess(target, construction).has('5,5')).toBe(false);
    construction.toggleGate(target.id, 6, 5, 'owner');
    expect(exteriorFarmAccess(target, construction).has('5,5')).toBe(true);
  });
  it('waters only covered cells at dawn and needs an actual water source', () => {
    const target = room(),
      construction = new ConstructionState(),
      farms = new FarmingState();
    stamp(construction, target, 'sprinkler', 5, 5);
    const near = farms.till(target.id, target.biomeId, 5, 6, 'loam')!,
      far = farms.till(target.id, target.biomeId, 10, 10, 'loam')!;
    processFarmDawn({
      room: target,
      construction,
      farms,
      worldDay: 1,
      seed: 'irrigation',
      occupied: true,
    });
    expect(near.moisture).toBe(40);
    target.layout[5] = '....~...............';
    farms.dawn(2, () =>
      processFarmDawn({
        room: target,
        construction,
        farms,
        worldDay: 2,
        seed: 'irrigation',
        occupied: true,
      }),
    );
    farms.dawn(2, () =>
      processFarmDawn({
        room: target,
        construction,
        farms,
        worldDay: 2,
        seed: 'irrigation',
        occupied: true,
      }),
    );
    expect(near.moisture).toBe(70);
    expect(far.moisture).toBe(40);
  });
  it('produces deterministic, bounded offscreen fauna incidents without inventing a thief', () => {
    const run = () => {
      const target = room(),
        construction = new ConstructionState(),
        farms = new FarmingState();
      for (let day = 1; day <= 30; day++) {
        const cell = farms.till(target.id, target.biomeId, 5, 5, 'loam')!;
        farms.plant(cell, 'lettuce', 'owner').stage = 'ready';
        farms.dawn(day, () =>
          processFarmDawn({
            room: target,
            construction,
            farms,
            worldDay: day,
            seed: 'animal-incidents',
            occupied: false,
          }),
        );
      }
      return farms.save();
    };
    const save = run();
    expect(save).toEqual(run());
    expect(save.incidents.length).toBeGreaterThan(0);
    expect(save.incidents.length).toBeLessThanOrEqual(30);
    expect(
      save.incidents.every(
        (event) => event.actorId === undefined && event.summary.includes('simulated regional'),
      ),
    ).toBe(true);
  });
});

describe('house migration, atmosphere replay and authority', () => {
  it('retains cultivated world state after the room falls out of the hot cache', () => {
    const scenario = createHeadlessScenario({seed:'farm-cache'}), game = scenario.game;
    game.setFlag('house.purchases', {garden:true});
    game.tickHouseGarden(1);
    const before = structuredClone(game.getFarmCells('0,-1,0'));
    for (let i=0; i<150; i++) game.getRoom(`${i+50},50,0`);
    expect(game.getWorld().getCachedRoomCount()).toBeLessThanOrEqual(128);
    expect(game.getFarmCells('0,-1,0')).toEqual(before);
    game.getRoom('0,-1,0');
    expect(game.getFarmCells('0,-1,0')).toEqual(before);
  });
  it('advances an offscreen annex through inn rest exactly once using the same climate timeline', async () => {
    const scenario = createHeadlessScenario({seed:'town-life-041-tavern-rest-time'}), game = scenario.game;
    game.setFlag('house.purchases', {garden:true});
    game.tickHouseGarden(1);
    const {room,entrance} = findGeneratedTownDoor(scenario,{templateId:'tavern'});
    scenario.enterRoom(room.id, adjacentWalkableTile(room,entrance));
    expect(game.enterNearbyTownBuildingDoor().ok).toBe(true);
    scenario.setDayPhase('night'); game.setScore(40);
    const farms = new FarmingState(); farms.load(game.getFarmingState());
    const config = defaultGameConfig.atmosphere;
    if (!config) throw new Error('Missing atmosphere');
    const clock = new WorldAtmosphereSystem(config,'rest-reference'); clock.hydrate(game.getAtmosphereState());
    const rest = await game.restAtCurrentInnUntilDawn();
    expect(rest.ok).toBe(true);
    clock.update(rest.elapsedMs, (duration, climate) => farms.advance(duration, climate, () => ({greenhouse:true})));
    expect(game.getFarmCells('0,-1,0')).toEqual(farms.cells('0,-1,0'));
    expect(game.getFarmingState().elapsedMs).toBe(farms.elapsedMs);
  });
  it('grandfathers a saved ready garden exactly once and preserves score/furniture', () => {
    const scenario = createHeadlessScenario({ seed: 'farm-legacy-garden' });
    const save = scenario.game.getSaveData();
    save.farming = undefined;
    save.flags = {
      ...save.flags,
      'house.purchases': { garden: true, couch: true },
      'house.garden.ready': true,
    };
    const score = save.score;
    expect(scenario.game.loadFromSaveData(JSON.parse(JSON.stringify(save)) as GameSaveData)).toBe(
      true,
    );
    const cells = scenario.game.getFarmCells('0,-1,0');
    expect(cells).toHaveLength(2);
    expect(cells.every((cell) => cell.crop?.stage === 'ready')).toBe(true);
    expect(scenario.game.getScore()).toBe(score);
    const once = scenario.game.getSaveData();
    expect(scenario.game.loadFromSaveData(JSON.parse(JSON.stringify(once)) as GameSaveData)).toBe(
      true,
    );
    expect(scenario.game.getFarmCells('0,-1,0')).toHaveLength(2);
    expect(scenario.game.getFarmingState().nextInstance).toBe(once.farming?.nextInstance);
  });
  it('keeps an old no-garden save valid and clears farms only on world reset', () => {
    const scenario = createHeadlessScenario({ seed: 'farm-no-garden' });
    const save = scenario.game.getSaveData();
    save.farming = undefined;
    expect(scenario.game.loadFromSaveData(save)).toBe(true);
    expect(scenario.game.getFarmRoomIds()).toHaveLength(0);
    scenario.game.setFlag('house.purchases', { garden: true });
    scenario.game.tickHouseGarden(1);
    expect(scenario.game.getFarmRoomIds()).toContain('0,-1,0');
    scenario.game.reset();
    expect(scenario.game.getFarmRoomIds()).toHaveLength(0);
  });
  it('retains exact future weather RNG and crop growth after a mid-phase refresh', () => {
    const config = defaultGameConfig.atmosphere;
    if (!config) throw new Error('Missing atmosphere');
    const first = new WorldAtmosphereSystem(config, 'refresh-weather');
    first.update(123456);
    const reloaded = new WorldAtmosphereSystem(config, 'refresh-weather');
    reloaded.hydrate(
      JSON.parse(JSON.stringify(first.getState())) as ReturnType<WorldAtmosphereSystem['getState']>,
    );
    first.update(WORLD_DAY_MS * 10);
    reloaded.update(WORLD_DAY_MS * 10);
    expect(reloaded.getState()).toEqual(first.getState());
  });
  it('rejects malformed economy intents before the transport queue', () => {
    const base = { playerId: 'a', nonce: 1, contextToken: 'authoritative-context' };
    expect(
      isClientCommand({
        ...base,
        type: 'farmingAction',
        action: 'till',
        target: { dx: NaN, dy: 0 },
      }),
    ).toBe(false);
    expect(
      isClientCommand({
        ...base,
        type: 'farmSellAction',
        merchantActorId: 'shop',
        itemId: 'produce-radish',
        count: -1,
      }),
    ).toBe(false);
    expect(
      isClientCommand({
        ...base,
        type: 'territoryAction',
        action: 'grant',
        granteePlayerId: 'b',
        permission: 'admin',
      }),
    ).toBe(false);
    expect(
      isClientCommand({
        ...base,
        type: 'farmingAction',
        action: 'plant',
        seedItemId: 'seed-radish',
      }),
    ).toBe(true);
  });
});
