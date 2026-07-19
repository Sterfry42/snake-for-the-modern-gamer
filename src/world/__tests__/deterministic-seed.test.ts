import { describe, expect, it } from 'vitest';
import { defaultGameConfig } from '../../config/gameConfig.js';
import { createRng } from '../../core/rng.js';
import { RoomGenerator } from '../roomGenerator.js';
import { WorldService } from '../worldService.js';
import type { RoomSnapshot } from '../types.js';
import { createWorldGenerationIdentity } from '../generation/worldGenerationIdentity.js';

type RoomCoord = { x: number; y: number; z: number };

function roomId(coord: RoomCoord): string {
  return `${coord.x},${coord.y},${coord.z}`;
}

function generateRoomsWithGenerator(
  seed: string,
  coords: RoomCoord[],
): Map<string, RoomSnapshot> {
  const identity = createWorldGenerationIdentity(seed);
  const rng = createRng(seed);
  const generator = new RoomGenerator(defaultGameConfig.world, rng, identity);
  const rooms = new Map<string, RoomSnapshot>();
  for (const coord of coords) {
    rooms.set(roomId(coord), generator.generate(roomId(coord), defaultGameConfig.grid));
  }
  return rooms;
}

function generateRoomsWithService(
  seed: string,
  coords: RoomCoord[],
): Map<string, RoomSnapshot> {
  const identity = createWorldGenerationIdentity(seed);
  const rng = createRng(seed);
  const service = new WorldService(
    defaultGameConfig.grid,
    defaultGameConfig.world,
    rng,
    identity,
  );
  const rooms = new Map<string, RoomSnapshot>();
  for (const coord of coords) {
    rooms.set(roomId(coord), service.getRoom(roomId(coord)));
  }
  return rooms;
}

function snapshotRoom(room: RoomSnapshot): Record<string, unknown> {
  return {
    id: room.id,
    layout: room.layout,
    archetypeId: room.archetypeId ?? null,
    biomeId: room.biomeId,
    biomeTitle: room.biomeTitle,
    portals: room.portals,
    apple: room.apple ?? null,
    apples: room.apples ?? null,
    treasure: room.treasure ?? null,
    powerup: room.powerup ?? null,
    caveEntrances: room.caveEntrances ?? null,
    layerEntrances: room.layerEntrances ?? null,
    village: room.village
      ? {
          name: room.village.name,
          center: room.village.center,
          safeArea: room.village.safeArea,
          lanterns: room.village.lanterns,
          residentCount: room.village.residents.length,
        }
      : null,
    goblinCamp: room.goblinCamp
      ? {
          id: room.goblinCamp.id,
          name: room.goblinCamp.name,
          center: room.goblinCamp.center,
          safeArea: room.goblinCamp.safeArea,
          tentCount: room.goblinCamp.tents.length,
          guardCount: room.goblinCamp.guards.length,
        }
      : null,
    town: room.town
      ? { id: room.town.id, name: room.town.name, districtCount: Object.keys(room.town.districtByRoomId).length }
      : null,
    townPerimeter: room.townPerimeter
      ? { townId: room.townPerimeter.townId }
      : null,
    snakeMcDonalds: room.snakeMcDonalds
      ? { cashier: room.snakeMcDonalds.cashier }
      : null,
    shrine: room.shrine ? { hasBlessings: room.shrine.hasBlessings } : null,
    ramenStand: room.ramenStand
      ? { sellsRamen: room.ramenStand.sellsRamen }
      : null,
    koiPond: room.koiPond
      ? { center: room.koiPond.center, waterTileCount: room.koiPond.waterTiles.length }
      : null,
    motelPool: room.motelPool
      ? { center: room.motelPool.center, waterTileCount: room.motelPool.waterTiles.length }
      : null,
    tenguCamp: room.tenguCamp
      ? { featherCount: room.tenguCamp.feathers.length }
      : null,
    roadsideMonument: room.roadsideMonument
      ? { monumentName: room.roadsideMonument.monumentName }
      : null,
    allNiteDiner: room.allNiteDiner
      ? { dinerName: room.allNiteDiner.dinerName }
      : null,
    fireworkStand: room.fireworkStand
      ? { standName: room.fireworkStand.standName }
      : null,
    jackalopeLodge: room.jackalopeLodge
      ? { lodgeName: room.jackalopeLodge.lodgeName }
      : null,
    gridironYard: room.gridironYard
      ? { fieldName: room.gridironYard.fieldName }
      : null,
    billboardOracle: room.billboardOracle
      ? { slogan: room.billboardOracle.slogan }
      : null,
    roadCrew: room.roadCrew
      ? { roadName: room.roadCrew.roadName }
      : null,
    molemanDigSite: room.molemanDigSite
      ? { id: room.molemanDigSite.id, name: room.molemanDigSite.name, variantId: room.molemanDigSite.variantId }
      : null,
    temperatureReliefs: room.temperatureReliefs ?? null,
    vegetation: room.vegetation ?? null,
    backgroundColor: room.backgroundColor,
    wallColor: room.wallColor,
    wallOutlineColor: room.wallOutlineColor,
  };
}

function roomsMatch(a: RoomSnapshot, b: RoomSnapshot): boolean {
  if (a.id !== b.id) return false;
  if (a.layout.length !== b.layout.length) return false;
  for (let i = 0; i < a.layout.length; i++) {
    if (a.layout[i] !== b.layout[i]) return false;
  }
  if (a.biomeId !== b.biomeId) return false;
  if (a.biomeTitle !== b.biomeTitle) return false;
  if (a.backgroundColor !== b.backgroundColor) return false;
  if (a.wallColor !== b.wallColor) return false;
  if (a.wallOutlineColor !== b.wallOutlineColor) return false;
  if (a.archetypeId !== b.archetypeId) return false;
  if (!portalsMatch(a.portals, b.portals)) return false;
  if (!vectorLikeMatch(a.apple, b.apple)) return false;
  if (!vectorLikeMatch(a.treasure, b.treasure)) return false;
  if (!powerupMatch(a.powerup, b.powerup)) return false;
  if (!caveEntrancesMatch(a.caveEntrances, b.caveEntrances)) return false;
  if (!layerEntrancesMatch(a.layerEntrances, b.layerEntrances)) return false;
  if (!vegetationMatch(a.vegetation, b.vegetation)) return false;
  if (!villageMatch(a.village, b.village)) return false;
  if (!goblinCampMatch(a.goblinCamp, b.goblinCamp)) return false;
  if (!townMatch(a.town, b.town)) return false;
  if (!townPerimeterMatch(a.townPerimeter, b.townPerimeter)) return false;
  if (!snakeMcDonaldsMatch(a.snakeMcDonalds, b.snakeMcDonalds)) return false;
  if (!shrineMatch(a.shrine, b.shrine)) return false;
  if (!ramenStandMatch(a.ramenStand, b.ramenStand)) return false;
  if (!koiPondMatch(a.koiPond, b.koiPond)) return false;
  if (!motelPoolMatch(a.motelPool, b.motelPool)) return false;
  if (!tenguCampMatch(a.tenguCamp, b.tenguCamp)) return false;
  if (!roadsideMonumentMatch(a.roadsideMonument, b.roadsideMonument)) return false;
  if (!allNiteDinerMatch(a.allNiteDiner, b.allNiteDiner)) return false;
  if (!fireworkStandMatch(a.fireworkStand, b.fireworkStand)) return false;
  if (!jackalopeLodgeMatch(a.jackalopeLodge, b.jackalopeLodge)) return false;
  if (!gridironYardMatch(a.gridironYard, b.gridironYard)) return false;
  if (!billboardOracleMatch(a.billboardOracle, b.billboardOracle)) return false;
  if (!roadCrewMatch(a.roadCrew, b.roadCrew)) return false;
  if (!molemanDigSiteMatch(a.molemanDigSite, b.molemanDigSite)) return false;
  if (!tempReliefsMatch(a.temperatureReliefs, b.temperatureReliefs)) return false;
  return true;
}

function portalsMatch(a: RoomSnapshot['portals'], b: RoomSnapshot['portals']): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].x !== b[i].x || a[i].y !== b[i].y || a[i].destRoomId !== b[i].destRoomId || a[i].destX !== b[i].destX || a[i].destY !== b[i].destY) {
      return false;
    }
  }
  return true;
}

function vectorLikeMatch(a: { x: number; y: number } | undefined, b: { x: number; y: number } | undefined): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return a.x === b.x && a.y === b.y;
}

function powerupMatch(a: RoomSnapshot['powerup'], b: RoomSnapshot['powerup']): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return a.x === b.x && a.y === b.y && a.kind === b.kind;
}

function caveEntrancesMatch(a: RoomSnapshot['caveEntrances'], b: RoomSnapshot['caveEntrances']): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].caveId !== b[i].caveId || a[i].collapsed !== b[i].collapsed) return false;
  }
  return true;
}

function layerEntrancesMatch(a: RoomSnapshot['layerEntrances'], b: RoomSnapshot['layerEntrances']): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].id !== b[i].id || a[i].layerId !== b[i].layerId) return false;
  }
  return true;
}

function vegetationMatch(a: RoomSnapshot['vegetation'], b: RoomSnapshot['vegetation']): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].x !== b[i].x || a[i].y !== b[i].y || a[i].variant !== b[i].variant) return false;
  }
  return true;
}

function villageMatch(a: RoomSnapshot['village'], b: RoomSnapshot['village']): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a.name !== b.name) return false;
  if (a.center.x !== b.center.x || a.center.y !== b.center.y) return false;
  if (a.safeArea.left !== b.safeArea.left || a.safeArea.top !== b.safeArea.top || a.safeArea.width !== b.safeArea.width || a.safeArea.height !== b.safeArea.height) return false;
  if (a.lanterns.length !== b.lanterns.length) return false;
  for (let i = 0; i < a.lanterns.length; i++) {
    if (a.lanterns[i].x !== b.lanterns[i].x || a.lanterns[i].y !== b.lanterns[i].y) return false;
  }
  if (a.residents.length !== b.residents.length) return false;
  return true;
}

function goblinCampMatch(a: RoomSnapshot['goblinCamp'], b: RoomSnapshot['goblinCamp']): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a.id !== b.id || a.name !== b.name) return false;
  if (a.center.x !== b.center.x || a.center.y !== b.center.y) return false;
  if (a.safeArea.left !== b.safeArea.left || a.safeArea.top !== b.safeArea.top || a.safeArea.width !== b.safeArea.width || a.safeArea.height !== b.safeArea.height) return false;
  if (a.tents.length !== b.tents.length || a.fires.length !== b.fires.length || a.guards.length !== b.guards.length) return false;
  return true;
}

function townMatch(a: RoomSnapshot['town'], b: RoomSnapshot['town']): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a.id !== b.id || a.name !== b.name) return false;
  if (Object.keys(a.districtByRoomId).length !== Object.keys(b.districtByRoomId).length) return false;
  return true;
}

function townPerimeterMatch(a: RoomSnapshot['townPerimeter'], b: RoomSnapshot['townPerimeter']): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a.townId !== b.townId) return false;
  return true;
}

function snakeMcDonaldsMatch(a: RoomSnapshot['snakeMcDonalds'], b: RoomSnapshot['snakeMcDonalds']): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a.cashier.x !== b.cashier.x || a.cashier.y !== b.cashier.y || a.cashier.name !== b.cashier.name) return false;
  if (a.bounds.left !== b.bounds.left || a.bounds.top !== b.bounds.top || a.bounds.width !== b.bounds.width || a.bounds.height !== b.bounds.height) return false;
  return true;
}

function shrineMatch(a: RoomSnapshot['shrine'], b: RoomSnapshot['shrine']): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a.hasBlessings !== b.hasBlessings) return false;
  return true;
}

function ramenStandMatch(a: RoomSnapshot['ramenStand'], b: RoomSnapshot['ramenStand']): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a.sellsRamen !== b.sellsRamen) return false;
  return true;
}

function koiPondMatch(a: RoomSnapshot['koiPond'], b: RoomSnapshot['koiPond']): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a.center.x !== b.center.x || a.center.y !== b.center.y) return false;
  if (a.waterTiles.length !== b.waterTiles.length) return false;
  return true;
}

function motelPoolMatch(a: RoomSnapshot['motelPool'], b: RoomSnapshot['motelPool']): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a.center.x !== b.center.x || a.center.y !== b.center.y) return false;
  if (a.waterTiles.length !== b.waterTiles.length) return false;
  if (a.poolName !== b.poolName) return false;
  return true;
}

function tenguCampMatch(a: RoomSnapshot['tenguCamp'], b: RoomSnapshot['tenguCamp']): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a.feathers.length !== b.feathers.length) return false;
  return true;
}

function roadsideMonumentMatch(a: RoomSnapshot['roadsideMonument'], b: RoomSnapshot['roadsideMonument']): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a.monumentName !== b.monumentName) return false;
  if (a.hasBlessings !== b.hasBlessings) return false;
  return true;
}

function allNiteDinerMatch(a: RoomSnapshot['allNiteDiner'], b: RoomSnapshot['allNiteDiner']): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a.dinerName !== b.dinerName) return false;
  return true;
}

function fireworkStandMatch(a: RoomSnapshot['fireworkStand'], b: RoomSnapshot['fireworkStand']): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a.standName !== b.standName) return false;
  return true;
}

function jackalopeLodgeMatch(a: RoomSnapshot['jackalopeLodge'], b: RoomSnapshot['jackalopeLodge']): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a.lodgeName !== b.lodgeName) return false;
  if (a.witnesses.length !== b.witnesses.length) return false;
  return true;
}

function gridironYardMatch(a: RoomSnapshot['gridironYard'], b: RoomSnapshot['gridironYard']): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a.fieldName !== b.fieldName) return false;
  if (a.players.length !== b.players.length) return false;
  return true;
}

function billboardOracleMatch(a: RoomSnapshot['billboardOracle'], b: RoomSnapshot['billboardOracle']): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a.slogan !== b.slogan) return false;
  return true;
}

function roadCrewMatch(a: RoomSnapshot['roadCrew'], b: RoomSnapshot['roadCrew']): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a.roadName !== b.roadName) return false;
  return true;
}

function molemanDigSiteMatch(a: RoomSnapshot['molemanDigSite'], b: RoomSnapshot['molemanDigSite']): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a.id !== b.id || a.name !== b.name || a.variantId !== b.variantId) return false;
  if (a.bounds.left !== b.bounds.left || a.bounds.top !== b.bounds.top || a.bounds.width !== b.bounds.width || a.bounds.height !== b.bounds.height) return false;
  return true;
}

function tempReliefsMatch(a: RoomSnapshot['temperatureReliefs'], b: RoomSnapshot['temperatureReliefs']): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].x !== b[i].x || a[i].y !== b[i].y || a[i].kind !== b[i].kind) return false;
  }
  return true;
}

function buildCoords(minX: number, maxX: number, minY: number, maxY: number, z = 0): RoomCoord[] {
  const coords: RoomCoord[] = [];
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      coords.push({ x, y, z });
    }
  }
  return coords;
}

describe('deterministic seed test harness', () => {
  const smallArea = buildCoords(-2, 2, -2, 2);
  const mediumArea = buildCoords(-5, 5, -5, 5);
  const largeArea = buildCoords(-8, 8, -8, 8);

  describe('RoomGenerator determinism', () => {
    it('reproduces identical rooms for the same seed (small area)', () => {
      const seed = 'determinism-small';
      const first = generateRoomsWithGenerator(seed, smallArea);
      const second = generateRoomsWithGenerator(seed, smallArea);

      for (const [id, room] of first) {
        const other = second.get(id);
        expect(other).toBeDefined();
        expect(roomsMatch(room, other!)).toBe(true);
      }
    });

    it('reproduces identical rooms for the same seed (medium area)', () => {
      const seed = 'determinism-medium';
      const first = generateRoomsWithGenerator(seed, mediumArea);
      const second = generateRoomsWithGenerator(seed, mediumArea);

      for (const [id, room] of first) {
        const other = second.get(id);
        expect(other).toBeDefined();
        expect(roomsMatch(room, other!)).toBe(true);
      }
    });

    it('reproduces identical rooms for the same seed (large area)', () => {
      const seed = 'determinism-large';
      const first = generateRoomsWithGenerator(seed, largeArea);
      const second = generateRoomsWithGenerator(seed, largeArea);

      for (const [id, room] of first) {
        const other = second.get(id);
        expect(other).toBeDefined();
        expect(roomsMatch(room, other!)).toBe(true);
      }
    });

    it('produces different rooms for different seeds', () => {
      const seed1 = 'diff-seed-alpha';
      const seed2 = 'diff-seed-beta';
      const first = generateRoomsWithGenerator(seed1, smallArea);
      const second = generateRoomsWithGenerator(seed2, smallArea);

      let differentCount = 0;
      for (const [id, room] of first) {
        const other = second.get(id);
        if (other && !roomsMatch(room, other)) {
          differentCount++;
        }
      }
      expect(differentCount).toBeGreaterThan(0);
    });

    it('produces different room flavor for sequential seeds', () => {
      const seed1 = 'sequential-1';
      const seed2 = 'sequential-2';
      const seed3 = 'sequential-3';
      const first = generateRoomsWithGenerator(seed1, smallArea);
      const second = generateRoomsWithGenerator(seed2, smallArea);
      const third = generateRoomsWithGenerator(seed3, smallArea);

      // Rooms share the same biome/archetype (coordinate-dependent), but should differ in flavor
      let flavorDifferences12 = 0;
      let flavorDifferences13 = 0;
      let flavorDifferences23 = 0;
      let _totalRooms = 0;

      for (const [id, room] of first) {
        const other1 = second.get(id);
        const other2 = third.get(id);
        _totalRooms++;

        // Check vegetation differences
        if (other1 && room.vegetation && other1.vegetation) {
          if (room.vegetation.length !== other1.vegetation.length ||
              room.vegetation.some((v, i) => v.x !== other1.vegetation![i].x || v.y !== other1.vegetation![i].y)) {
            flavorDifferences12++;
          }
        }

        if (other2 && room.vegetation && other2.vegetation) {
          if (room.vegetation.length !== other2.vegetation.length ||
              room.vegetation.some((v, i) => v.x !== other2.vegetation![i].x || v.y !== other2.vegetation![i].y)) {
            flavorDifferences13++;
          }
        }

        if (other1 && other2 && other1.vegetation && other2.vegetation) {
          if (other1.vegetation.length !== other2.vegetation.length ||
              other1.vegetation.some((v, i) => v.x !== other2.vegetation![i].x || v.y !== other2.vegetation![i].y)) {
            flavorDifferences23++;
          }
        }
      }

      // At least some rooms should have different vegetation across seeds
      expect(flavorDifferences12).toBeGreaterThan(0);
      expect(flavorDifferences13).toBeGreaterThan(0);
      expect(flavorDifferences23).toBeGreaterThan(0);
    });

    it('reproduces layout for the origin room (0,0,0) across runs', () => {
      const seed = 'origin-room';
      const originCoord = { x: 0, y: 0, z: 0 };
      const first = generateRoomsWithGenerator(seed, [originCoord]);
      const second = generateRoomsWithGenerator(seed, [originCoord]);

      const firstRoom = first.get('0,0,0')!;
      const secondRoom = second.get('0,0,0')!;
      expect(firstRoom.layout).toEqual(secondRoom.layout);
      expect(firstRoom.biomeId).toBe(secondRoom.biomeId);
      expect(firstRoom.archetypeId).toBe(secondRoom.archetypeId);
    });

    it('reproduces portal configurations across runs', () => {
      const seed = 'portals-test';
      const coords = buildCoords(-2, 2, -2, 2);
      const first = generateRoomsWithGenerator(seed, coords);
      const second = generateRoomsWithGenerator(seed, coords);

      for (const [id, room] of first) {
        const other = second.get(id);
        if (other) {
          expect(other.portals.length).toBe(room.portals.length);
          for (let i = 0; i < room.portals.length; i++) {
            expect(room.portals[i].destRoomId).toBe(other.portals[i].destRoomId);
            expect(room.portals[i].x).toBe(other.portals[i].x);
            expect(room.portals[i].y).toBe(other.portals[i].y);
          }
        }
      }
    });

    it('reproduces structure placement across runs', () => {
      const seed = 'structures-test';
      const coords = buildCoords(-10, 10, -10, 10);
      const first = generateRoomsWithGenerator(seed, coords);
      const second = generateRoomsWithGenerator(seed, coords);

      for (const [id, room] of first) {
        const other = second.get(id);
        if (other) {
          expect(!!room.village).toBe(!!other.village);
          expect(!!room.goblinCamp).toBe(!!other.goblinCamp);
          expect(!!room.town).toBe(!!other.town);
          expect(!!room.townPerimeter).toBe(!!other.townPerimeter);
          expect(!!room.questGiver).toBe(!!other.questGiver);
          expect(!!room.shrine).toBe(!!other.shrine);
          expect(!!room.ramenStand).toBe(!!other.ramenStand);
        }
      }
    });

    it('reproduces vegetation placement across runs', () => {
      const seed = 'vegetation-test';
      const coords = buildCoords(-3, 3, -3, 3);
      const first = generateRoomsWithGenerator(seed, coords);
      const second = generateRoomsWithGenerator(seed, coords);

      for (const [id, room] of first) {
        const other = second.get(id);
        if (other) {
          if (room.vegetation && other.vegetation) {
            expect(other.vegetation.length).toBe(room.vegetation.length);
            for (let i = 0; i < room.vegetation.length; i++) {
              expect(room.vegetation[i].x).toBe(other.vegetation[i].x);
              expect(room.vegetation[i].y).toBe(other.vegetation[i].y);
              expect(room.vegetation[i].variant).toBe(other.vegetation[i].variant);
            }
          } else {
            expect(room.vegetation).toBe(other.vegetation);
          }
        }
      }
    });

    it('reproduces biome assignments across runs', () => {
      const seed = 'biome-test';
      const coords = buildCoords(-15, 15, -15, 15);
      const first = generateRoomsWithGenerator(seed, coords);
      const second = generateRoomsWithGenerator(seed, coords);

      for (const [id, room] of first) {
        const other = second.get(id);
        if (other) {
          expect(room.biomeId).toBe(other.biomeId);
          expect(room.biomeTitle).toBe(other.biomeTitle);
        }
      }
    });

    it('reproduces obstacle placement across runs', () => {
      const seed = 'obstacles-test';
      const coords = buildCoords(-3, 3, -3, 3);
      const first = generateRoomsWithGenerator(seed, coords);
      const second = generateRoomsWithGenerator(seed, coords);

      for (const [id, room] of first) {
        const other = second.get(id);
        if (other) {
          expect(room.layout).toEqual(other.layout);
        }
      }
    });

    it('reproduces room colors across runs', () => {
      const seed = 'colors-test';
      const coords = buildCoords(-3, 3, -3, 3);
      const first = generateRoomsWithGenerator(seed, coords);
      const second = generateRoomsWithGenerator(seed, coords);

      for (const [id, room] of first) {
        const other = second.get(id);
        if (other) {
          expect(room.backgroundColor).toBe(other.backgroundColor);
          expect(room.wallColor).toBe(other.wallColor);
          expect(room.wallOutlineColor).toBe(other.wallOutlineColor);
        }
      }
    });
  });

  describe('WorldService determinism', () => {
    it('reproduces identical rooms for the same seed (small area)', () => {
      const seed = 'service-determinism-small';
      const first = generateRoomsWithService(seed, smallArea);
      const second = generateRoomsWithService(seed, smallArea);

      for (const [id, room] of first) {
        const other = second.get(id);
        expect(other).toBeDefined();
        expect(roomsMatch(room, other!)).toBe(true);
      }
    });

    it('reproduces identical rooms for the same seed (medium area)', () => {
      const seed = 'service-determinism-medium';
      const first = generateRoomsWithService(seed, mediumArea);
      const second = generateRoomsWithService(seed, mediumArea);

      for (const [id, room] of first) {
        const other = second.get(id);
        expect(other).toBeDefined();
        expect(roomsMatch(room, other!)).toBe(true);
      }
    });

    it('produces different rooms for different seeds via WorldService', () => {
      const seed1 = 'service-diff-alpha';
      const seed2 = 'service-diff-beta';
      const first = generateRoomsWithService(seed1, smallArea);
      const second = generateRoomsWithService(seed2, smallArea);

      let differentCount = 0;
      for (const [id, room] of first) {
        const other = second.get(id);
        if (other && !roomsMatch(room, other)) {
          differentCount++;
        }
      }
      expect(differentCount).toBeGreaterThan(0);
    });

    it('reproduces portal reciprocity across runs', () => {
      const seed = 'service-portals';
      const coords = buildCoords(-3, 3, -3, 3);
      const first = generateRoomsWithService(seed, coords);
      const second = generateRoomsWithService(seed, coords);

      for (const [id, room] of first) {
        const other = second.get(id);
        if (other) {
          expect(other.portals.length).toBe(room.portals.length);
          for (let i = 0; i < room.portals.length; i++) {
            expect(room.portals[i].destRoomId).toBe(other.portals[i].destRoomId);
          }
        }
      }
    });

    it('reproduces cave entrance placement across runs', () => {
      const seed = 'service-caves';
      const coords = buildCoords(-10, 10, -10, 10);
      const first = generateRoomsWithService(seed, coords);
      const second = generateRoomsWithService(seed, coords);

      for (const [id, room] of first) {
        const other = second.get(id);
        if (other) {
          expect(!!room.caveEntrances).toBe(!!other.caveEntrances);
          if (room.caveEntrances && other.caveEntrances) {
            expect(other.caveEntrances.length).toBe(room.caveEntrances.length);
            for (let i = 0; i < room.caveEntrances.length; i++) {
              expect(room.caveEntrances[i].caveId).toBe(other.caveEntrances[i].caveId);
              expect(room.caveEntrances[i].collapsed).toBe(other.caveEntrances[i].collapsed);
            }
          }
        }
      }
    });
  });

  describe('cross-seed consistency', () => {
    it('same structural features appear at same coordinates for same seed', () => {
      const seed = 'structure-coords';
      const coords = buildCoords(-10, 10, -10, 10);
      const first = generateRoomsWithGenerator(seed, coords);
      const second = generateRoomsWithGenerator(seed, coords);

      // Find village rooms in first run
      const villageCoords1 = new Set<string>();
      const townCoords1 = new Set<string>();
      for (const [id, room] of first) {
        if (room.village) villageCoords1.add(id);
        if (room.town) townCoords1.add(id);
      }

      // Verify they appear in same rooms in second run
      for (const id of villageCoords1) {
        const other = second.get(id);
        expect(other?.village).toBeDefined();
      }
      for (const id of townCoords1) {
        const other = second.get(id);
        expect(other?.town).toBeDefined();
      }
    });

    it('biome regions align across runs', () => {
      const seed = 'biome-regions';
      const coords = buildCoords(-15, 15, -15, 15);
      const first = generateRoomsWithGenerator(seed, coords);
      const second = generateRoomsWithGenerator(seed, coords);

      // Count unique biomes in each run
      const biomes1 = new Set<string>();
      const biomes2 = new Set<string>();
      for (const room of first.values()) biomes1.add(room.biomeId);
      for (const room of second.values()) biomes2.add(room.biomeId);

      expect(biomes1).toEqual(biomes2);

      // Verify each room has the same biome
      for (const [id, room] of first) {
        const other = second.get(id);
        if (other) {
          expect(other.biomeId).toBe(room.biomeId);
        }
      }
    });

    it('generates the same Liberty Badlands region', () => {
      const seed = 'liberty-badlands';
      const coords = buildCoords(-10, -5, -8, -3);
      const first = generateRoomsWithGenerator(seed, coords);
      const second = generateRoomsWithGenerator(seed, coords);

      for (const [id, room] of first) {
        const other = second.get(id);
        if (other) {
          expect(other.biomeId).toBe(room.biomeId);
          // Liberty Badlands rooms should have specific archetypes
          if (room.biomeId === 'liberty-badlands') {
            expect(other.archetypeId).toBe(room.archetypeId);
          }
        }
      }
    });

    it('generates the same ocean region', () => {
      const seed = 'ocean-region';
      const coords = buildCoords(-5, 5, -20, -15);
      const first = generateRoomsWithGenerator(seed, coords);
      const second = generateRoomsWithGenerator(seed, coords);

      for (const [id, room] of first) {
        const other = second.get(id);
        if (other) {
          expect(other.biomeId).toBe(room.biomeId);
          if (room.biomeId === 'sunken-ocean') {
            expect(other.layout).toEqual(room.layout);
          }
        }
      }
    });

    it('reproduces cross-room features (rivers, barriers)', () => {
      const seed = 'cross-room-features';
      const coords = buildCoords(-8, 8, -8, 8);
      const first = generateRoomsWithGenerator(seed, coords);
      const second = generateRoomsWithGenerator(seed, coords);

      // Check that rooms at shared edges have matching barrier patterns
      for (let x = -7; x < 8; x++) {
        const east = first.get(`${x},0,0`);
        const west = first.get(`${x + 1},0,0`);
        const eastB = second.get(`${x},0,0`);
        const westB = second.get(`${x + 1},0,0`);

        if (east && west && eastB && westB) {
          // East edge of east room should match west edge of west room
          const eastEdge = east.layout.map((row) => row[east.layout[0].length - 1]);
          const westEdge = west.layout.map((row) => row[0]);
          const eastEdgeB = eastB.layout.map((row) => row[eastB.layout[0].length - 1]);
          const westEdgeB = westB.layout.map((row) => row[0]);

          expect(eastEdge).toEqual(westEdge);
          expect(eastEdgeB).toEqual(westEdgeB);
          expect(eastEdge).toEqual(eastEdgeB);
        }
      }
    });
  });

  describe('deterministic identity', () => {
    it('creates identical WorldGenerationIdentity for the same seed', () => {
      const identity1 = createWorldGenerationIdentity('identity-test');
      const identity2 = createWorldGenerationIdentity('identity-test');
      expect(identity1).toEqual(identity2);
    });

    it('creates different WorldGenerationIdentity for different seeds', () => {
      const identity1 = createWorldGenerationIdentity('identity-alpha');
      const identity2 = createWorldGenerationIdentity('identity-beta');
      expect(identity1.seed).not.toBe(identity2.seed);
      expect(identity1.worldSalt).not.toBe(identity2.worldSalt);
      expect(identity1.biomeSalt).not.toBe(identity2.biomeSalt);
    });

    it('normalizes whitespace in seed', () => {
      const identity1 = createWorldGenerationIdentity('  trimmed-seed  ');
      const identity2 = createWorldGenerationIdentity('trimmed-seed');
      expect(identity1.seed).toBe('trimmed-seed');
      expect(identity2.seed).toBe('trimmed-seed');
      expect(identity1).toEqual(identity2);
    });

    it('defaults to "default-world" for empty string', () => {
      const identity = createWorldGenerationIdentity('');
      expect(identity.seed).toBe('default-world');
    });
  });

  describe('deterministic serialization', () => {
    it('produces serializable room summaries that match across runs', () => {
      const seed = 'serialization-test';
      const coords = buildCoords(-3, 3, -3, 3);
      const first = generateRoomsWithGenerator(seed, coords);
      const second = generateRoomsWithGenerator(seed, coords);

      const summaries1 = new Map<string, string>();
      const summaries2 = new Map<string, string>();

      for (const room of first.values()) {
        summaries1.set(room.id, JSON.stringify(snapshotRoom(room)));
      }
      for (const room of second.values()) {
        summaries2.set(room.id, JSON.stringify(snapshotRoom(room)));
      }

      for (const [id, summary] of summaries1) {
        expect(summaries2.get(id)).toBe(summary);
      }
    });
  });
});
