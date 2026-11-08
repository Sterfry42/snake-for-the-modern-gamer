import { describe, expect, it } from 'vitest';
import { AnimalManager } from '../animals/animalManager.js';
import { EnemyManager } from '../systems/enemies.js';
import { defaultGameConfig } from '../config/gameConfig.js';
import { ConstructionState } from '../building/constructionState.js';
import { getStructureBlueprint, planStructureStamp } from '../building/structureBlueprint.js';
import { FarmingState } from './farmingState.js';
import { farmCreatureTarget, applyFarmContact } from './farmingCreatures.js';
import type { FarmInteractions } from './farmInteractions.js';
import type { RoomSnapshot } from '../world/types.js';
import { farmShelter } from './farmingActions.js';
import { processFarmDawn } from './farmingIncidents.js';

function fixture() {
  const target: RoomSnapshot = {
    id: '0,0,0',
    layout: Array.from({ length: 24 }, () => '.'.repeat(32)),
    portals: [],
    biomeId: 'verdigris-basin',
    biomeTitle: 'Meadow',
    backgroundColor: 0,
    wallColor: 0,
    wallOutlineColor: 0,
  };
  const farms = new FarmingState(),
    construction = new ConstructionState();
  const cell = farms.till(target.id, target.biomeId, 5, 5, 'loam')!;
  farms.plant(cell, 'lettuce', 'owner').stage = 'ready';
  const ctx = {
    farms,
    construction,
    worldDay: 1,
    record: (event: Parameters<FarmingState['incident']>[0]) => farms.incident(event),
  };
  const farm: FarmInteractions = {
    isSolid: (room, x, y) => construction.isCreatureSolid(room, x, y),
    target: (roomId, position, kind) => farmCreatureTarget(ctx, roomId, position, kind),
    contact: (roomId, actorId, position, kind) =>
      applyFarmContact(ctx, roomId, actorId, position, kind),
    carrying: (id) => farms.carrying(id),
  };
  const stamp = (id: string, x: number, y: number) => {
    const blueprint = getStructureBlueprint(id);
    if (!blueprint) throw new Error('Missing blueprint');
    construction.claimRoom(target.id, 'owner');
    const result = construction.placeStructure({
      room: target,
      ownerId: 'owner',
      plan: planStructureStamp(blueprint, { x, y }, 'north'),
    });
    if (!result.ok) throw new Error('Invalid fixture placement');
    return result.structure;
  };
  return { target, farms, construction, cell, farm, ctx, stamp };
}

describe('real creature movement and farm effects', () => {
  it('an actual grazing deer approaches a crop, eats once and records contact', () => {
    const { target, farms, cell, farm } = fixture(),
      animals = new AnimalManager(defaultGameConfig.grid, () => 0);
    animals.ensureAnimals(target.id, target, []);
    const deer = animals.getAnimalsInRoom(target.id).find((animal) => animal.type === 'deer');
    if (!deer) throw new Error('No deer spawned');
    deer.position = { x: 3, y: 5 };
    deer.moveCooldown = 0;
    animals.step({
      getRoom: () => target,
      currentRoomId: target.id,
      snake: [{ x: 20, y: 15 }],
      snakeDirection: { x: 0, y: 1 },
      farm,
    });
    expect(cell.crop).toBeUndefined();
    expect(
      farms.incidents().some((event) => event.actorId === deer.id && event.kind === 'eaten'),
    ).toBe(true);
    expect(farms.incidents().filter((event) => event.kind === 'eaten')).toHaveLength(1);
  });
  it('grazers cannot walk through a fully enclosed player fence or eat through it', () => {
    const { target, cell, construction, farm, stamp } = fixture();
    for (let x = 4; x <= 6; x++) {
      stamp('farm-fence', x, 4);
      stamp('farm-fence', x, 6);
    }
    stamp('farm-fence', 4, 5);
    stamp('farm-fence', 6, 5);
    const animals = new AnimalManager(defaultGameConfig.grid, () => 0);
    animals.ensureAnimals(target.id, target, []);
    for (const animal of animals.getAnimalsInRoom(target.id)) {
      animal.position = { x: 2, y: 5 };
      animal.moveCooldown = 0;
    }
    for (let i = 0; i < 100; i++)
      animals.step({
        getRoom: () => target,
        currentRoomId: target.id,
        snake: [{ x: 20, y: 15 }],
        snakeDirection: { x: 0, y: 1 },
        farm,
      });
    expect(cell.crop?.stage).toBe('ready');
    expect(
      animals
        .getAnimalsInRoom(target.id)
        .every(
          (animal) => !construction.isCreatureSolid(target, animal.position.x, animal.position.y),
        ),
    ).toBe(true);
  });
  it('scarecrows deter grazing in their radius without deterring a bandit', () => {
    const { target, farm, stamp } = fixture();
    stamp('scarecrow', 5, 7);
    expect(farm.target(target.id, { x: 3, y: 5 }, 'graze')).toBeUndefined();
    expect(farm.target(target.id, { x: 3, y: 5 }, 'steal')).toMatchObject({ x: 5, y: 5 });
  });
  it('an actual bandit steals physical produce and departs into a neighboring room', () => {
    const { target, cell, farms, farm } = fixture(),
      enemies = new EnemyManager(defaultGameConfig.grid, () => 0);
    const bandit = enemies.spawnHostileNpc(
      target.id,
      { x: 3, y: 5 },
      'Bandit',
      2,
      'raidBandit-farmer',
    );
    bandit.moveCooldown = 0;
    const rooms = new Map([[target.id, target]]);
    const getRoom = (id: string) => {
      let room = rooms.get(id);
      if (!room) {
        room = { ...target, id };
        rooms.set(id, room);
      }
      return room;
    };
    for (let i = 0; i < 80; i++)
      enemies.stepEnemies({
        getRoom,
        currentRoomId: target.id,
        snake: [{ x: 20, y: 15 }],
        snakeDirection: { x: 0, y: 1 },
        farm,
      });
    expect(cell.crop).toBeUndefined();
    expect(enemies.getEnemiesInRoom(target.id)).toHaveLength(0);
    expect([...rooms.keys()].some((id) => id !== target.id)).toBe(true);
    expect(farms.takeLoot(bandit.id)).toEqual([{ itemId: 'produce-lettuce', count: 2 }]);
    expect(farms.takeLoot(bandit.id)).toEqual([]);
  });
  it('trampling requires actual cell contact and is deduplicated per actor and crop', () => {
    const { target, cell, farm } = fixture();
    cell.crop!.stage = 'sprout';
    cell.crop!.progress = 0.3;
    farm.contact(target.id, 'large-deer', { x: 6, y: 5 }, 'trample');
    expect(cell.crop!.health).toBe(100);
    farm.contact(target.id, 'large-deer', { x: 5, y: 5 }, 'trample');
    farm.contact(target.id, 'large-deer', { x: 5, y: 5 }, 'trample');
    expect(cell.crop!.health).toBe(80);
  });
  it('a known offscreen raider steals reachable produce once and retains recoverable loot', () => {
    const { target, farms, cell, construction } = fixture();
    const context = {
      room: target,
      farms,
      construction,
      worldDay: 3,
      seed: 'raid',
      occupied: false,
      raiders: [{ id: 'known-bandit', position: { x: 2, y: 5 }, kind: 'steal' as const }],
    };
    farms.dawn(3, () => processFarmDawn(context));
    farms.dawn(3, () => processFarmDawn(context));
    expect(cell.crop).toBeUndefined();
    expect(farms.incidents().filter((event) => event.kind === 'stolen')).toHaveLength(1);
    expect(farms.takeLoot('known-bandit')).toEqual([{ itemId: 'produce-lettuce', count: 2 }]);
  });
  it('a hostile attack damages actual greenhouse durability without erasing its plants', () => {
    const { target, farms, construction, ctx, stamp } = fixture();
    const structure = stamp('greenhouse', 10, 10);
    const bed = farms.till(target.id, target.biomeId, 10, 8, 'artificial')!;
    farms.plant(bed, 'tomato', 'owner');
    applyFarmContact(ctx, target.id, 'monster', { x: 7, y: 6 }, 'destroy');
    expect(construction.getStructure(structure.id)?.health).toBe(75);
    expect(farmShelter(construction, target.id, bed).greenhouse).toBe(true);
    expect(bed.crop?.cropId).toBe('tomato');
    applyFarmContact(ctx, target.id, 'monster', { x: 7, y: 6 }, 'destroy');
    expect(construction.getStructure(structure.id)?.health).toBe(75);
  });
});
