import { describe, expect, it } from 'vitest';
import { defaultGameConfig } from '../../config/gameConfig.js';
import { createRng } from '../../core/rng.js';
import type { GameSaveData } from '../../game/saveManager.js';
import { cellsForEdgeRunup, type EdgeSide } from '../generation/edgeAccess.js';
import { CoordinateBiomeMap } from '../generation/biomeMap.js';
import { formatRoomId } from '../generation/multiRoomStructures.js';
import { MultiRoomStructureResolver } from '../generation/townStructureResolver.js';
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
      if (resolver.getTownMembership(roomId)?.district === 'square') {
        return roomId;
      }
    }
  }
  throw new Error('Expected deterministic test identity to produce at least one town square.');
}

function adjacentRoomFor(side: EdgeSide, anchorRoomId: string): string {
  const [x = 0, y = 0, z = 0] = anchorRoomId.split(',').map(Number);
  if (side === 'east') return `${x - 1},${y},${z}`;
  if (side === 'west') return `${x + 4},${y},${z}`;
  if (side === 'south') return `${x},${y - 1},${z}`;
  return `${x},${y + 4},${z}`;
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

describe('multi-room structure generation', () => {
  it('resolves physical town districts without generation order dependence', () => {
    const squareId = findTownRoom();
    const resolver = createResolver();
    const square = resolver.getTownMembership(squareId);
    expect(square?.district).toBe('square');
    const anchor = square!.placement.anchor;
    const roomIds = [
      formatRoomId(anchor),
      formatRoomId({ x: anchor.x + 1, y: anchor.y, z: anchor.z }),
      formatRoomId({ x: anchor.x + 2, y: anchor.y, z: anchor.z }),
      formatRoomId({ x: anchor.x + 3, y: anchor.y, z: anchor.z }),
      formatRoomId({ x: anchor.x + 2, y: anchor.y + 3, z: anchor.z }),
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
    const anchor = resolver.getTownMembership(squareId)!.placement.anchor;
    const perimeterId = adjacentRoomFor('east', formatRoomId(anchor));
    const perimeter = generateRoomsInOrder([perimeterId])[0]!;
    const eastWallTiles = perimeter.layout.filter((row) => row[row.length - 1] === '#').length;
    expect(eastWallTiles).toBeGreaterThan(0);
  });

  it('keeps gate approach runups clear while blocking non-entrance and outsider-exit perimeter', () => {
    const squareId = findTownRoom();
    const resolver = createResolver();
    const anchor = resolver.getTownMembership(squareId)!.placement.anchor;
    const gateApproach = generateRoomsInOrder([`${anchor.x - 1},${anchor.y},${anchor.z}`])[0]!;
    const blockedPerimeter = generateRoomsInOrder([`${anchor.x + 4},${anchor.y},${anchor.z}`])[0]!;
    const outsiderExit = generateRoomsInOrder([`${anchor.x + 2},${anchor.y + 4},${anchor.z}`])[0]!;
    const plan = {
      side: 'east' as const,
      open: true,
      openingCenter: Math.floor(defaultGameConfig.grid.rows / 2),
      openingWidth: 5,
      runupDepth: 5,
      reason: 'townGate' as const,
    };
    for (const key of cellsForEdgeRunup(defaultGameConfig.grid, plan)) {
      const [x = 0, y = 0] = key.split(',').map(Number);
      expect(['#', '~', 'S']).not.toContain(gateApproach.layout[y]?.[x]);
    }
    const blockedTiles = blockedPerimeter.layout.filter((row) => row[0] === '#').length;
    expect(blockedTiles).toBeGreaterThan(10);
    const exitWallTiles =
      outsiderExit.layout[0]?.split('').filter((tile) => tile === '#').length ?? 0;
    expect(exitWallTiles).toBeGreaterThan(0);
    const exitPlan = {
      side: 'north' as const,
      open: true,
      openingCenter: Math.floor(defaultGameConfig.grid.cols / 2),
      openingWidth: 5,
      runupDepth: 5,
      reason: 'townExit' as const,
    };
    for (const key of cellsForEdgeRunup(defaultGameConfig.grid, exitPlan)) {
      const [x = 0, y = 0] = key.split(',').map(Number);
      expect(['#', '~', 'S']).not.toContain(outsiderExit.layout[y]?.[x]);
    }
  });

  it('renders town perimeter from actual sparse footprint including concave corners', () => {
    const squareId = findTownRoom();
    const resolver = createResolver();
    const anchor = resolver.getTownMembership(squareId)!.placement.anchor;
    const emptyInteriorSlot = generateRoomsInOrder([
      `${anchor.x + 1},${anchor.y + 1},${anchor.z}`,
    ])[0]!;

    expect(emptyInteriorSlot.townPerimeter).toBeTruthy();
    expect(emptyInteriorSlot.townPerimeter?.sidesFacingTown?.sort()).toEqual([
      'east',
      'north',
      'south',
    ]);
    expect(emptyInteriorSlot.layout[0]?.includes('#')).toBe(true);
    expect(emptyInteriorSlot.layout.some((row) => row[row.length - 1] === '#')).toBe(true);
    expect(emptyInteriorSlot.layout[emptyInteriorSlot.layout.length - 1]?.includes('#')).toBe(true);
  });

  it('renders diagonal exterior corner rooms and keeps town exit gate fully blocked until opened', () => {
    const squareId = findTownRoom();
    const resolver = createResolver();
    const anchor = resolver.getTownMembership(squareId)!.placement.anchor;
    const diagonalCorner = generateRoomsInOrder([
      `${anchor.x - 1},${anchor.y - 1},${anchor.z}`,
    ])[0]!;
    const exit = generateRoomsInOrder([`${anchor.x + 2},${anchor.y + 3},${anchor.z}`])[0]!;
    const gateRows = exit.layout.slice(
      defaultGameConfig.grid.rows - 6,
      defaultGameConfig.grid.rows - 3,
    );

    expect(diagonalCorner.townPerimeter?.cornersFacingTown?.sort()).toEqual(['southEast']);
    expect(diagonalCorner.layout.slice(-6).some((row) => row.slice(-6).includes('#'))).toBe(true);
    expect(
      diagonalCorner.layout
        .slice(6, defaultGameConfig.grid.rows - 6)
        .some((row) => row[row.length - 1] === '#'),
    ).toBe(false);
    expect(
      gateRows.every((row) => row.slice(2, defaultGameConfig.grid.cols - 2).includes('#')),
    ).toBe(true);
    expect(gateRows.some((row) => row.includes('S'))).toBe(true);
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

  it('keeps thieves guild off the physical town footprint until grate discovery', () => {
    const squareId = findTownRoom();
    const resolver = createResolver();
    const anchor = resolver.getTownMembership(squareId)!.placement.anchor;
    const guildId = `${anchor.x + 3},${anchor.y + 2},${anchor.z}`;
    const room = generateRoomsInOrder([guildId])[0]!;
    expect(room.town?.districtByRoomId[guildId]).not.toBe('guildHideout');
    const alley = generateRoomsInOrder([`${anchor.x + 2},${anchor.y + 2},${anchor.z}`])[0]!;
    expect(alley.town?.rooms.find((townRoom) => townRoom.kind === 'guildHideout')?.hidden).toBe(
      true,
    );
    expect(alley.town?.discoveredGuild).toBe(false);
    expect(alley.town?.thievesGuild?.discovered).toBe(false);
  });

  it('adds physical service residents and a back-alley guild grate', () => {
    const squareId = findTownRoom();
    const resolver = createResolver();
    const anchor = resolver.getTownMembership(squareId)!.placement.anchor;
    const gate = generateRoomsInOrder([`${anchor.x + 1},${anchor.y},${anchor.z}`])[0]!;
    const alley = generateRoomsInOrder([`${anchor.x + 2},${anchor.y + 2},${anchor.z}`])[0]!;
    const market = generateRoomsInOrder([`${anchor.x + 3},${anchor.y},${anchor.z}`])[0]!;
    const tavern = generateRoomsInOrder([`${anchor.x + 2},${anchor.y + 1},${anchor.z}`])[0]!;
    expect(gate.layout.join('').includes('G')).toBe(true);
    expect(alley.layout.join('').includes('U')).toBe(true);
    expect(
      gate.town?.residents.filter((resident) => resident.role === 'guard').length,
    ).toBeGreaterThanOrEqual(4);
    expect(market.town?.residents.some((resident) => resident.role === 'equipmentMerchant')).toBe(
      true,
    );
    expect(market.town?.residents.some((resident) => resident.role === 'potionMaker')).toBe(true);
    expect(market.town?.residents.some((resident) => resident.role === 'butcher')).toBe(true);
    expect(tavern.town?.residents.some((resident) => resident.role === 'cardDealer')).toBe(true);
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
});
