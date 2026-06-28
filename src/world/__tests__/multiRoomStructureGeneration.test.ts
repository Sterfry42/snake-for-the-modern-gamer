import { describe, expect, it } from 'vitest';
import { defaultGameConfig } from '../../config/gameConfig.js';
import { createRng } from '../../core/rng.js';
import type { GameSaveData } from '../../game/saveManager.js';
import { cellsForEdgeRunup, type EdgeSide } from '../generation/edgeAccess.js';
import { CoordinateBiomeMap } from '../generation/biomeMap.js';
import { formatRoomId } from '../generation/multiRoomStructures.js';
import {
  getHumanTownDistricts,
  MultiRoomStructureResolver,
} from '../generation/townStructureResolver.js';
import { createWorldGenerationIdentity } from '../generation/worldGenerationIdentity.js';
import { RoomGenerator } from '../roomGenerator.js';
import { WorldService } from '../worldService.js';
import { isTownShopRole } from '../townRoles.js';

const identity = createWorldGenerationIdentity('multi-room-structure-test');

function createResolver(): MultiRoomStructureResolver {
  return new MultiRoomStructureResolver(identity, new CoordinateBiomeMap(), defaultGameConfig.grid);
}

function findTownRoom(): string {
  const resolver = createResolver();
  for (let y = -80; y <= 80; y += 1) {
    for (let x = -80; x <= 80; x += 1) {
      const roomId = `${x},${y},0`;
      if (resolver.getTownMembership(roomId)?.district === 'townCenter') {
        return roomId;
      }
    }
  }
  throw new Error('Expected deterministic test identity to produce at least one town center.');
}

function adjacentRoomFor(side: EdgeSide, anchorRoomId: string): string {
  const [x = 0, y = 0, z = 0] = anchorRoomId.split(',').map(Number);
  if (side === 'east') return `${x - 1},${y},${z}`;
  if (side === 'west') return `${x + 4},${y},${z}`;
  if (side === 'south') return `${x},${y - 1},${z}`;
  return `${x},${y + 4},${z}`;
}

function townRoomIdForDistrict(
  resolver: MultiRoomStructureResolver,
  townRoomId: string,
  district: string,
): string {
  const membership = resolver.getTownMembership(townRoomId);
  if (!membership) {
    throw new Error(`Expected ${townRoomId} to be inside a town.`);
  }
  for (const [offset, currentDistrict] of Object.entries(
    getHumanTownDistricts(membership.placement),
  )) {
    if (currentDistrict !== district) continue;
    const [dx = 0, dy = 0] = offset.split(',').map(Number);
    return formatRoomId({
      x: membership.placement.anchor.x + dx,
      y: membership.placement.anchor.y + dy,
      z: membership.placement.anchor.z,
    });
  }
  throw new Error(`Expected town to include ${district}.`);
}

function townApproachRoomId(
  resolver: MultiRoomStructureResolver,
  townRoomId: string,
  kind: 'entrance' | 'exit',
): string {
  const membership = resolver.getTownMembership(townRoomId);
  if (!membership) {
    throw new Error(`Expected ${townRoomId} to be inside a town.`);
  }
  const anchor = membership.placement.anchor;
  for (let y = anchor.y - 1; y <= anchor.y + 4; y += 1) {
    for (let x = anchor.x - 1; x <= anchor.x + 4; x += 1) {
      const roomId = `${x},${y},${anchor.z}`;
      const adjacency = resolver.getTownAdjacency(roomId);
      if (
        adjacency?.placement.id === membership.placement.id &&
        (kind === 'entrance' ? adjacency.isEntranceApproach : adjacency.isExitApproach)
      ) {
        return roomId;
      }
    }
  }
  throw new Error(`Expected town to include a ${kind} approach.`);
}

function townBlockedPerimeterRoomId(
  resolver: MultiRoomStructureResolver,
  townRoomId: string,
): string {
  const membership = resolver.getTownMembership(townRoomId);
  if (!membership) {
    throw new Error(`Expected ${townRoomId} to be inside a town.`);
  }
  const anchor = membership.placement.anchor;
  for (let y = anchor.y - 1; y <= anchor.y + 4; y += 1) {
    for (let x = anchor.x - 1; x <= anchor.x + 4; x += 1) {
      const roomId = `${x},${y},${anchor.z}`;
      const adjacency = resolver.getTownAdjacency(roomId);
      if (
        adjacency?.placement.id === membership.placement.id &&
        !adjacency.isEntranceApproach &&
        !adjacency.isExitApproach &&
        (adjacency.adjacentSidesFacingTown?.length ?? 0) > 0
      ) {
        return roomId;
      }
    }
  }
  throw new Error('Expected town to include a blocked perimeter room.');
}

function generateRoomsInOrder(roomIds: readonly string[]) {
  const generator = new RoomGenerator(
    defaultGameConfig.grid,
    defaultGameConfig.world,
    createRng('order-independent-town'),
    identity,
  );
  return roomIds.map((roomId) => generator.generate(roomId, defaultGameConfig.grid));
}

function townFacingEdgeTiles(roomLayout: readonly string[], side: EdgeSide): string[] {
  const { cols, rows } = defaultGameConfig.grid;
  if (side === 'north') return roomLayout[0]?.split('') ?? [];
  if (side === 'south') return roomLayout[rows - 1]?.split('') ?? [];
  if (side === 'west') return roomLayout.map((row) => row[0] ?? '#');
  return roomLayout.map((row) => row[cols - 1] ?? '#');
}

function expectedTownGateIndexes(side: EdgeSide): Set<number> {
  const length =
    side === 'north' || side === 'south'
      ? defaultGameConfig.grid.cols
      : defaultGameConfig.grid.rows;
  const center = Math.floor(length / 2);
  return new Set([center - 2, center - 1, center, center + 1, center + 2]);
}

describe('multi-room structure generation', () => {
  it('resolves physical town districts without generation order dependence', () => {
    const squareId = findTownRoom();
    const resolver = createResolver();
    const square = resolver.getTownMembership(squareId);
    expect(square?.district).toBe('townCenter');
    const anchor = square!.placement.anchor;
    const roomIds = [
      townRoomIdForDistrict(resolver, squareId, 'townCenter'),
      townRoomIdForDistrict(resolver, squareId, 'marketStreet'),
      townRoomIdForDistrict(resolver, squareId, 'residentialStreet'),
      townRoomIdForDistrict(resolver, squareId, 'backAlley'),
      adjacentRoomFor('east', formatRoomId(anchor)),
    ];

    const forward = generateRoomsInOrder(roomIds);
    const reverse = generateRoomsInOrder([...roomIds].reverse()).reverse();

    forward.forEach((room, index) => {
      expect(room.layout).toEqual(reverse[index]?.layout);
      expect(room.town?.id).toEqual(reverse[index]?.town?.id);
      expect(room.town?.districtByRoomId[room.id]).toEqual(
        reverse[index]?.town?.districtByRoomId[room.id],
      );
    });
  });

  it('does not overwrite already generated perimeter rooms when town rooms are generated later', () => {
    const squareId = findTownRoom();
    const resolver = createResolver();
    const anchor = resolver.getTownMembership(squareId)!.placement.anchor;
    const perimeterId = adjacentRoomFor('east', formatRoomId(anchor));
    const townId = formatRoomId(anchor);
    const world = new WorldService(
      defaultGameConfig.grid,
      defaultGameConfig.world,
      createRng('no-overwrite-town'),
      identity,
    );
    const perimeterBefore = world.getRoom(perimeterId);
    const layoutBefore = [...perimeterBefore.layout];
    world.getRoom(townId);
    const perimeterAfter = world.getRoom(perimeterId);

    expect(perimeterAfter).toBe(perimeterBefore);
    expect(perimeterAfter.layout).toEqual(layoutBefore);
  });

  it('uses physical room ids for town residents and relationship homes', () => {
    const squareId = findTownRoom();
    const room = generateRoomsInOrder([squareId])[0]!;
    expect(room.town).toBeTruthy();
    for (const resident of room.town!.residents) {
      expect(resident.homeRoomId).toMatch(/^-?\d+,-?\d+,-?\d+$/);
      expect(resident.workRoomId).toMatch(/^-?\d+,-?\d+,-?\d+$/);
    }
  });

  it('renders perimeter walls before the interior town room is generated', () => {
    const squareId = findTownRoom();
    const resolver = createResolver();
    const perimeterId = townBlockedPerimeterRoomId(resolver, squareId);
    const perimeter = generateRoomsInOrder([perimeterId])[0]!;
    const side = resolver.getTownAdjacency(perimeterId)!.adjacentSideFacingTown!;
    const wallTiles = townFacingEdgeTiles(perimeter.layout, side).filter((tile) => tile === '#');
    expect(wallTiles.length).toBeGreaterThan(0);
  });

  it('keeps gate approach runups clear while blocking non-entrance and outsider-exit perimeter', () => {
    const squareId = findTownRoom();
    const resolver = createResolver();
    const gateApproachId = townApproachRoomId(resolver, squareId, 'entrance');
    const exitApproachId = townApproachRoomId(resolver, squareId, 'exit');
    const blockedPerimeterId = townBlockedPerimeterRoomId(resolver, squareId);
    const gateApproach = generateRoomsInOrder([gateApproachId])[0]!;
    const blockedPerimeter = generateRoomsInOrder([blockedPerimeterId])[0]!;
    const outsiderExit = generateRoomsInOrder([exitApproachId])[0]!;
    const gateAdjacency = resolver.getTownAdjacency(gateApproachId)!;
    const exitAdjacency = resolver.getTownAdjacency(exitApproachId)!;
    const blockedAdjacency = resolver.getTownAdjacency(blockedPerimeterId)!;
    const plan = {
      side: gateAdjacency.adjacentSideFacingTown!,
      open: true,
      openingCenter:
        gateAdjacency.adjacentSideFacingTown === 'north' ||
        gateAdjacency.adjacentSideFacingTown === 'south'
          ? Math.floor(defaultGameConfig.grid.cols / 2)
          : Math.floor(defaultGameConfig.grid.rows / 2),
      openingWidth: 5,
      runupDepth: 5,
      reason: 'townGate' as const,
    };
    for (const key of cellsForEdgeRunup(defaultGameConfig.grid, plan)) {
      const [x = 0, y = 0] = key.split(',').map(Number);
      expect(['#', '~', 'S']).not.toContain(gateApproach.layout[y]?.[x]);
    }
    const blockedTiles = townFacingEdgeTiles(
      blockedPerimeter.layout,
      blockedAdjacency.adjacentSideFacingTown!,
    ).filter((tile) => tile === '#').length;
    expect(blockedTiles).toBeGreaterThan(10);
    const exitWallTiles = townFacingEdgeTiles(
      outsiderExit.layout,
      exitAdjacency.adjacentSideFacingTown!,
    ).filter((tile) => tile === '#').length;
    expect(exitWallTiles).toBeGreaterThan(0);
    const exitPlan = {
      side: exitAdjacency.adjacentSideFacingTown!,
      open: true,
      openingCenter:
        exitAdjacency.adjacentSideFacingTown === 'north' ||
        exitAdjacency.adjacentSideFacingTown === 'south'
          ? Math.floor(defaultGameConfig.grid.cols / 2)
          : Math.floor(defaultGameConfig.grid.rows / 2),
      openingWidth: 5,
      runupDepth: 5,
      reason: 'townExit' as const,
    };
    for (const key of cellsForEdgeRunup(defaultGameConfig.grid, exitPlan)) {
      const [x = 0, y = 0] = key.split(',').map(Number);
      expect(['#', '~', 'S']).not.toContain(outsiderExit.layout[y]?.[x]);
    }
  });

  it('keeps town perimeter walls continuous except at authored gate openings', () => {
    const squareId = findTownRoom();
    const resolver = createResolver();
    const anchor = resolver.getTownMembership(squareId)!.placement.anchor;
    const roomIds: string[] = [];
    for (let y = anchor.y - 1; y <= anchor.y + 4; y += 1) {
      for (let x = anchor.x - 1; x <= anchor.x + 4; x += 1) {
        roomIds.push(`${x},${y},${anchor.z}`);
      }
    }
    const rooms = generateRoomsInOrder(roomIds);

    for (const room of rooms) {
      const adjacency = resolver.getTownAdjacency(room.id);
      if (!room.townPerimeter || !adjacency) {
        continue;
      }
      const openingAllowed = Boolean(adjacency.isEntranceApproach || adjacency.isExitApproach);
      for (const side of room.townPerimeter.sidesFacingTown ?? []) {
        const edgeTiles = townFacingEdgeTiles(room.layout, side);
        const gateIndexes = expectedTownGateIndexes(side);
        edgeTiles.forEach((tile, index) => {
          if (
            openingAllowed &&
            side === adjacency.adjacentSideFacingTown &&
            gateIndexes.has(index)
          ) {
            expect(tile).not.toBe('#');
            return;
          }
          expect(tile).toBe('#');
        });
      }
    }
  });

  it('renders the compact town influence ring around the 2x2 core', () => {
    const squareId = findTownRoom();
    const resolver = createResolver();
    const blockedPerimeterId = townBlockedPerimeterRoomId(resolver, squareId);
    const perimeter = generateRoomsInOrder([blockedPerimeterId])[0]!;

    expect(perimeter.townPerimeter).toBeTruthy();
    expect(perimeter.townPerimeter?.sidesFacingTown?.length).toBeGreaterThan(0);
    for (const side of perimeter.townPerimeter?.sidesFacingTown ?? []) {
      expect(townFacingEdgeTiles(perimeter.layout, side).some((tile) => tile === '#')).toBe(true);
    }
  });

  it('renders diagonal exterior corner rooms and keeps old gate districts out of the core', () => {
    const squareId = findTownRoom();
    const resolver = createResolver();
    const anchor = resolver.getTownMembership(squareId)!.placement.anchor;
    const diagonalCorner = generateRoomsInOrder([`${anchor.x},${anchor.y},${anchor.z}`])[0]!;
    const coreDistricts = Object.values(
      getHumanTownDistricts(resolver.getTownMembership(squareId)!.placement),
    );

    expect(diagonalCorner.townPerimeter?.cornersFacingTown?.sort()).toEqual(['southEast']);
    expect(diagonalCorner.layout.slice(-6).some((row) => row.slice(-6).includes('#'))).toBe(true);
    expect(
      diagonalCorner.layout
        .slice(6, defaultGameConfig.grid.rows - 6)
        .some((row) => row[row.length - 1] === '#'),
    ).toBe(false);
    expect(coreDistricts).toEqual(
      expect.arrayContaining(['townCenter', 'marketStreet', 'residentialStreet', 'backAlley']),
    );
    expect(coreDistricts).not.toContain('gate');
    expect(coreDistricts).not.toContain('townExit');
    expect(coreDistricts).not.toContain('tavernInterior');
  });

  it('keeps actual town structure density discoverable', () => {
    const resolver = new MultiRoomStructureResolver(
      createWorldGenerationIdentity(defaultGameConfig.rng.seed),
      new CoordinateBiomeMap(),
      defaultGameConfig.grid,
    );
    const towns = new Set<string>();
    const radius = 60;
    let rooms = 0;
    for (let y = -radius; y <= radius; y += 1) {
      for (let x = -radius; x <= radius; x += 1) {
        rooms += 1;
        const membership = resolver.getTownMembership(`${x},${y},0`);
        if (membership) {
          towns.add(membership.placement.id);
        }
      }
    }
    expect(rooms / towns.size).toBeLessThan(260);
  });

  it('saves world generation identity explicitly', () => {
    const save: GameSaveData = {
      version: '1.0.0',
      timestamp: Date.now(),
      score: 0,
      inventory: {},
      equipment: {},
      flags: {},
      worldGeneration: identity,
    };
    expect(save.worldGeneration?.townSalt).toBe(identity.townSalt);
  });

  it('keeps town placement independent from unrelated rng history', () => {
    const resolverA = createResolver();
    const noisyRng = createRng('unrelated-noise');
    for (let i = 0; i < 1000; i += 1) {
      noisyRng();
    }
    const resolverB = createResolver();
    for (let y = -24; y <= 24; y += 1) {
      for (let x = -24; x <= 24; x += 1) {
        const roomId = `${x},${y},0`;
        expect(resolverA.getTownMembership(roomId)?.placement.id).toBe(
          resolverB.getTownMembership(roomId)?.placement.id,
        );
        expect(resolverA.getTownAdjacency(roomId)?.placement.id).toBe(
          resolverB.getTownAdjacency(roomId)?.placement.id,
        );
      }
    }
  });

  it('keeps every physical town district outside the two-room spawn radius', () => {
    const resolver = createResolver();
    for (let y = -2; y <= 2; y += 1) {
      for (let x = -2; x <= 2; x += 1) {
        expect(resolver.getTownMembership(`${x},${y},0`)).toBeNull();
      }
    }
  });

  it('keeps barriers and optional structures stable regardless of room generation order', () => {
    const roomIds = ['8,3,0', '-7,5,0', '12,-4,0', '-11,-8,0'];
    const forward = generateRoomsInOrder(roomIds);
    const reverse = generateRoomsInOrder([...roomIds].reverse()).reverse();

    for (let index = 0; index < roomIds.length; index += 1) {
      expect(reverse[index]?.layout).toEqual(forward[index]?.layout);
      expect(reverse[index]?.village).toEqual(forward[index]?.village);
      expect(reverse[index]?.goblinCamp).toEqual(forward[index]?.goblinCamp);
      expect(reverse[index]?.questGiver).toEqual(forward[index]?.questGiver);
      expect(reverse[index]?.snakeMcDonalds).toEqual(forward[index]?.snakeMcDonalds);
      expect(reverse[index]?.shrine).toEqual(forward[index]?.shrine);
      expect(reverse[index]?.ramenStand).toEqual(forward[index]?.ramenStand);
      expect(reverse[index]?.koiPond).toEqual(forward[index]?.koiPond);
      expect(reverse[index]?.tenguCamp).toEqual(forward[index]?.tenguCamp);
      expect(reverse[index]?.roadsideMonument).toEqual(forward[index]?.roadsideMonument);
      expect(reverse[index]?.allNiteDiner).toEqual(forward[index]?.allNiteDiner);
      expect(reverse[index]?.fireworkStand).toEqual(forward[index]?.fireworkStand);
      expect(reverse[index]?.jackalopeLodge).toEqual(forward[index]?.jackalopeLodge);
      expect(reverse[index]?.molemanDigSite).toEqual(forward[index]?.molemanDigSite);
    }
  });

  it('keeps thieves guild off the physical town footprint until grate discovery', () => {
    const squareId = findTownRoom();
    const resolver = createResolver();
    const backAlleyId = townRoomIdForDistrict(resolver, squareId, 'backAlley');
    const room = generateRoomsInOrder([backAlleyId])[0]!;
    expect(room.town?.districtByRoomId[backAlleyId]).not.toBe('guildHideout');
    const alley = room;
    expect(alley.town?.rooms.find((townRoom) => townRoom.kind === 'guildHideout')?.hidden).toBe(
      true,
    );
    expect(alley.town?.discoveredGuild).toBe(false);
    expect(alley.town?.thievesGuild?.discovered).toBe(false);
  });

  it('adds physical service residents and a back-alley guild grate', () => {
    const squareId = findTownRoom();
    const resolver = createResolver();
    const townCenter = generateRoomsInOrder([
      townRoomIdForDistrict(resolver, squareId, 'townCenter'),
    ])[0]!;
    const alley = generateRoomsInOrder([
      townRoomIdForDistrict(resolver, squareId, 'backAlley'),
    ])[0]!;
    const market = generateRoomsInOrder([
      townRoomIdForDistrict(resolver, squareId, 'marketStreet'),
    ])[0]!;
    expect(townCenter.layout.join('').includes('G')).toBe(true);
    expect(alley.layout.join('').includes('Y')).toBe(true);
    expect(
      townCenter.town?.residents.filter((resident) => resident.role === 'guard').length,
    ).toBeGreaterThanOrEqual(4);
    expect(
      townCenter.town?.residents.some(
        (resident) =>
          resident.role === 'guard' && resident.x > Math.floor(defaultGameConfig.grid.cols / 2),
      ),
    ).toBe(true);
    expect(market.town?.residents.some((resident) => resident.role === 'equipmentMerchant')).toBe(
      true,
    );
    expect(market.town?.residents.some((resident) => resident.role === 'potionMaker')).toBe(true);
    expect(market.town?.residents.some((resident) => resident.role === 'butcher')).toBe(true);
    expect(townCenter.town?.residents.some((resident) => resident.role === 'cardDealer')).toBe(
      true,
    );
    expect(townCenter.layerEntrances?.some((entry) => entry.templateId === 'tavern')).toBe(true);
    expect(
      townCenter.town?.buildings.some(
        (building) => building.kind === 'tavern' && building.roomId === townCenter.id,
      ),
    ).toBe(true);
    expect(market.layerEntrances?.map((entry) => entry.templateId).sort()).toEqual([
      'butcherShop',
      'generalStore',
      'potionMaker',
    ]);
    expect(
      market.town?.buildings
        .filter((building) => building.district === 'marketStreet' && building.enterable)
        .map((building) => building.kind)
        .sort(),
    ).toEqual(['butcherShop', 'generalStore', 'potionMaker']);
    expect(
      alley.town?.residents.filter(
        (resident) => resident.role === 'thief' || resident.role === 'thiefContact',
      ).length,
    ).toBeGreaterThanOrEqual(2);
    expect(market.town?.shopkeeper.role).toBe('equipmentMerchant');
    expect(market.town?.shopkeeper.name).not.toBe('Town Clerk');
    expect(market.town?.shopkeeper.actorId).toBeTruthy();
    expect(market.town?.shopkeeper.factionId).toBe('human-town');
    expect(isTownShopRole(market.town?.shopkeeper.role ?? '')).toBe(true);

    const equipmentMerchant = market.town?.residents.find(
      (resident) => resident.role === 'equipmentMerchant',
    );
    expect(equipmentMerchant?.actorId).toBe(
      `town:${market.town!.id}:equipmentMerchant:${equipmentMerchant!.id}`,
    );
    expect(equipmentMerchant?.actorId).not.toContain(
      `${market.town!.id}:resident:${market.town!.id}`,
    );

    const thiefContact = alley.town?.residents.find((resident) => resident.role === 'thiefContact');
    expect(thiefContact?.factionId).toBe('thieves-guild');
  });

  it('materializes thieves guild interior as a town guild district with guild residents', () => {
    const squareId = findTownRoom();
    const resolver = createResolver();
    const alleyId = townRoomIdForDistrict(resolver, squareId, 'backAlley');
    const world = new WorldService(
      defaultGameConfig.grid,
      defaultGameConfig.world,
      createRng('guild-interior-town'),
      identity,
    );
    const alley = world.getRoom(alleyId);
    expect(alley.town).toBeTruthy();
    const discoveredTown = {
      ...alley.town!,
      discoveredGuild: true,
      thievesGuild: alley.town!.thievesGuild
        ? { ...alley.town!.thievesGuild, discovered: true }
        : alley.town!.thievesGuild,
    };
    world.updateTown(discoveredTown);

    const centerX = Math.floor(defaultGameConfig.grid.cols / 2);
    const centerY = Math.floor(defaultGameConfig.grid.rows / 2);
    const grate = { x: Math.max(1, centerX - 5), y: centerY };
    const entrance = {
      id: `town:${alley.town!.id}:guild-grate`,
      layerId: `layer:townInterior:${alley.town!.id}:thievesGuild`,
      parentRoomId: alley.id,
      x: grate.x,
      y: grate.y,
      kind: 'townInterior' as const,
      templateId: 'thievesGuild' as const,
      returnPosition: grate,
      tile: 'Y',
    };
    const instance = world.ensureLayerInstance(entrance);
    const interior = world.getRoom(instance.id);

    expect(interior.layer?.parentRoomId).toBe(alley.id);
    expect(interior.layer?.entranceId).toBe(entrance.id);
    expect(interior.layer?.returnPosition).toEqual(grate);
    expect(interior.town?.districtByRoomId[interior.id]).toBe('guildHideout');
    expect(interior.town?.residents.some((resident) => resident.role === 'thiefContact')).toBe(
      true,
    );
    expect(
      interior.town?.residents.some((resident) => resident.factionId === 'thieves-guild'),
    ).toBe(true);
    const guildResident = interior.town?.residents.find(
      (resident) => resident.role === 'thiefContact' || resident.role === 'thief',
    );
    expect(guildResident?.workRoomId).toBe(interior.id);
    expect(guildResident?.x).toBeGreaterThan(1);
    expect(guildResident?.y).toBeGreaterThan(1);
    expect(interior.layout.join('').includes('G')).toBe(true);
    expect(interior.layout.join('').includes('D')).toBe(false);
    expect(interior.portals).toEqual([]);
    expect(interior.layout[interior.layer!.exit.y]?.[interior.layer!.exit.x]).toBe('Y');
  });

  it('materializes generated town storefront and tavern interiors', () => {
    const squareId = findTownRoom();
    const resolver = createResolver();
    const world = new WorldService(
      defaultGameConfig.grid,
      defaultGameConfig.world,
      createRng('town-generic-interiors'),
      identity,
    );
    const townCenter = world.getRoom(townRoomIdForDistrict(resolver, squareId, 'townCenter'));
    const market = world.getRoom(townRoomIdForDistrict(resolver, squareId, 'marketStreet'));
    const tavernDoor = townCenter.layerEntrances?.find((entry) => entry.templateId === 'tavern');
    const storeDoor = market.layerEntrances?.find((entry) => entry.templateId === 'generalStore');

    expect(tavernDoor).toBeTruthy();
    expect(storeDoor).toBeTruthy();

    const tavern = world.getRoom(world.ensureLayerInstance(tavernDoor!).id);
    const store = world.getRoom(world.ensureLayerInstance(storeDoor!).id);

    expect(tavern.layer?.templateId).toBe('tavern');
    expect(tavern.town?.districtByRoomId[tavern.id]).toBe('tavernInterior');
    expect(tavern.town?.residents.some((resident) => resident.role === 'bartender')).toBe(true);
    expect(store.layer?.templateId).toBe('generalStore');
    expect(store.town?.districtByRoomId[store.id]).toBe('marketStreet');
    expect(store.town?.residents.some((resident) => resident.role === 'equipmentMerchant')).toBe(
      true,
    );
    const positionedStoreRoles =
      store.town?.residents
        .filter((resident) => resident.workRoomId === store.id)
        .map((resident) => resident.role)
        .sort() ?? [];
    expect(positionedStoreRoles).toEqual(['equipmentMerchant']);
    expect(store.layout[store.layer!.exit.y]?.[store.layer!.exit.x]).toBe('Y');
  });

  it('rejects unresolved layer room ids instead of generating fallback rooms', () => {
    const world = new WorldService(
      defaultGameConfig.grid,
      defaultGameConfig.world,
      createRng('missing-layer-room'),
      identity,
    );

    expect(() => world.getRoom('layer:townInterior:missing-town:thievesGuild')).toThrow(
      /Unknown layer room/,
    );
  });

  it('uses a side quest-board tile instead of a central town interaction marker', () => {
    const squareId = findTownRoom();
    const square = generateRoomsInOrder([squareId])[0]!;
    const centerX = Math.floor(defaultGameConfig.grid.cols / 2);
    const centerY = Math.floor(defaultGameConfig.grid.rows / 2);

    expect(square.town?.districtByRoomId[square.id]).toBe('townCenter');
    expect(square.layout[centerY]?.[centerX]).not.toBe('N');
    expect(square.layout.join('').includes('D')).toBe(true);
  });

  it('suppresses special room archetype metadata inside town rooms', () => {
    const squareId = findTownRoom();
    const room = generateRoomsInOrder([squareId])[0]!;

    expect(room.town).toBeTruthy();
    expect(room.archetypeId).toBeUndefined();
    expect(room.gridironYard).toBeUndefined();
    expect(room.motelPool).toBeUndefined();
    expect(room.billboardOracle).toBeUndefined();
    expect(room.roadCrew).toBeUndefined();
    expect(room.fireworkStand).toBeUndefined();
  });
});
