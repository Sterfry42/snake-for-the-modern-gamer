import { describe, expect, it } from 'vitest';
import { defaultGameConfig, type GridConfig } from '../../config/gameConfig.js';
import { vectorKey } from '../../core/math.js';
import { createRng } from '../../core/rng.js';
import { getBiomeForRoom } from '../biomes.js';
import { tryPlaceQuestHouse } from '../questHouse.js';
import { RoomGenerator } from '../roomGenerator.js';
import { SafetyOperations } from '../generation/stages/safetyOperations.js';
import type { RoomSnapshot } from '../types.js';
import { tryPlaceVillage } from '../village.js';

type DirectionName = 'east' | 'west' | 'south' | 'north';

interface RoomCoord {
  x: number;
  y: number;
  z: number;
}

interface Direction {
  name: DirectionName;
  dx: number;
  dy: number;
}

const HARD_RUNUP_TILES = 5;

const DIRECTIONS: Direction[] = [
  { name: 'east', dx: 1, dy: 0 },
  { name: 'west', dx: -1, dy: 0 },
  { name: 'south', dx: 0, dy: 1 },
  { name: 'north', dx: 0, dy: -1 },
];

const FIXTURE_CENTERS: RoomCoord[] = [
  { x: 0, y: 0, z: 0 },
  { x: 3, y: -1, z: 0 },
  { x: 0, y: -9, z: 0 },
  { x: 0, y: 2, z: 0 },
  { x: -3, y: 0, z: 0 },
  { x: 6, y: 0, z: 0 },
  { x: -7, y: -6, z: 0 },
];

function roomId(coord: RoomCoord): string {
  return `${coord.x},${coord.y},${coord.z}`;
}

function generateNeighborhood(center: RoomCoord, radius: number): Map<string, RoomSnapshot> {
  const generator = new RoomGenerator(
    defaultGameConfig.world,
    createRng(`fairness:${roomId(center)}`),
  );
  const rooms = new Map<string, RoomSnapshot>();
  for (let y = center.y - radius; y <= center.y + radius; y += 1) {
    for (let x = center.x - radius; x <= center.x + radius; x += 1) {
      const coord = { x, y, z: center.z };
      rooms.set(roomId(coord), generator.generate(roomId(coord), defaultGameConfig.grid));
    }
  }
  return rooms;
}

function generateArea(
  seed: string,
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
): Map<string, RoomSnapshot> {
  const generator = new RoomGenerator(defaultGameConfig.world, createRng(seed));
  const rooms = new Map<string, RoomSnapshot>();
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const coord = { x, y, z: 0 };
      rooms.set(roomId(coord), generator.generate(roomId(coord), defaultGameConfig.grid));
    }
  }
  return rooms;
}

function isImmediatelySafe(tile: string | undefined): boolean {
  return tile !== undefined && tile !== '#' && tile !== '~';
}

function edgeCellsFor(
  room: RoomSnapshot,
  grid: GridConfig,
  direction: Direction,
): Array<{ x: number; y: number }> {
  if (direction.name === 'east') {
    return Array.from({ length: grid.rows }, (_, y) => ({ x: grid.cols - 1, y }));
  }
  if (direction.name === 'west') {
    return Array.from({ length: grid.rows }, (_, y) => ({ x: 0, y }));
  }
  if (direction.name === 'south') {
    return Array.from({ length: grid.cols }, (_, x) => ({ x, y: grid.rows - 1 }));
  }
  return Array.from({ length: grid.cols }, (_, x) => ({ x, y: 0 }));
}

function runupCells(
  grid: GridConfig,
  direction: Direction,
  start: { x: number; y: number },
  length: number,
): Array<{ x: number; y: number }> {
  const cells: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < length; i += 1) {
    const x = start.x + direction.dx * i;
    const y = start.y + direction.dy * i;
    if (x < 0 || y < 0 || x >= grid.cols || y >= grid.rows) {
      break;
    }
    cells.push({ x, y });
  }
  return cells;
}

function roomSummary(room: RoomSnapshot): string {
  return `${room.id} ${room.biomeTitle} (${room.biomeId})\n${room.layout.join('\n')}`;
}

function emptyLayout(grid: GridConfig): string[][] {
  return Array.from({ length: grid.rows }, () => Array.from({ length: grid.cols }, () => '.'));
}

function filledLayout(grid: GridConfig, tile: string): string[][] {
  return Array.from({ length: grid.rows }, () => Array.from({ length: grid.cols }, () => tile));
}

function entranceRunupCells(grid: GridConfig, length: number): ReadonlySet<string> {
  const cells = new Set<string>();
  for (let y = 0; y < grid.rows; y += 1) {
    for (let x = 0; x < length && x < grid.cols; x += 1) {
      cells.add(vectorKey({ x, y }));
      cells.add(vectorKey({ x: grid.cols - 1 - x, y }));
    }
  }
  for (let x = 0; x < grid.cols; x += 1) {
    for (let y = 0; y < length && y < grid.rows; y += 1) {
      cells.add(vectorKey({ x, y }));
      cells.add(vectorKey({ x, y: grid.rows - 1 - y }));
    }
  }
  return cells;
}

function unsafeStructureTilesIn(cells: ReadonlySet<string>, layout: string[][]): string[] {
  const failures: string[] = [];
  for (const key of cells) {
    const [x = 0, y = 0] = key.split(',').map(Number);
    const tile = layout[y]?.[x];
    if (tile === '#' || tile === '~') {
      failures.push(`${key}=${tile}`);
    }
  }
  return failures;
}

function countTiles(room: RoomSnapshot, tiles: ReadonlySet<string>): number {
  return room.layout.reduce(
    (count, row) => count + [...row].filter((tile) => tiles.has(tile)).length,
    0,
  );
}

function hasRiverSegment(room: RoomSnapshot, grid: GridConfig): boolean {
  if (room.biomeId === 'sunken-ocean') {
    return false;
  }
  const westEastWater = Array.from({ length: grid.rows }, (_, y) => y).some(
    (y) => room.layout[y]?.[0] === '~' && room.layout[y]?.[grid.cols - 1] === '~',
  );
  const northSouthWater = Array.from({ length: grid.cols }, (_, x) => x).some(
    (x) => room.layout[0]?.[x] === '~' && room.layout[grid.rows - 1]?.[x] === '~',
  );
  return westEastWater || northSouthWater;
}

function sharedWallRun(
  first: RoomSnapshot | undefined,
  second: RoomSnapshot | undefined,
  direction: 'east' | 'south',
  grid: GridConfig,
): number {
  if (
    !first ||
    !second ||
    first.biomeId === 'elderwood-maze' ||
    second.biomeId === 'elderwood-maze'
  ) {
    return 0;
  }
  if (first.biomeId === 'sunken-ocean' || second.biomeId === 'sunken-ocean') {
    return 0;
  }

  let best = 0;
  let current = 0;
  const length = direction === 'east' ? grid.rows : grid.cols;
  for (let i = 0; i < length; i += 1) {
    const firstTile =
      direction === 'east' ? first.layout[i]?.[grid.cols - 1] : first.layout[grid.rows - 1]?.[i];
    const secondTile = direction === 'east' ? second.layout[i]?.[0] : second.layout[0]?.[i];
    if (firstTile === '#' && secondTile === '#') {
      current += 1;
      best = Math.max(best, current);
    } else {
      current = 0;
    }
  }
  return best;
}

function oppositeEdgeTile(
  room: RoomSnapshot,
  direction: 'east' | 'south',
  index: number,
  grid: GridConfig,
): string | undefined {
  return direction === 'east'
    ? room.layout[index]?.[grid.cols - 1]
    : room.layout[grid.rows - 1]?.[index];
}

function neighborEdgeTile(
  room: RoomSnapshot,
  direction: 'east' | 'south',
  index: number,
): string | undefined {
  return direction === 'east' ? room.layout[index]?.[0] : room.layout[0]?.[index];
}

function passableEdgeRunupClear(
  room: RoomSnapshot,
  side: 'east' | 'west' | 'south' | 'north',
  index: number,
  grid: GridConfig,
): boolean {
  const inward =
    side === 'east'
      ? { x: grid.cols - 1, y: index, dx: -1, dy: 0 }
      : side === 'west'
        ? { x: 0, y: index, dx: 1, dy: 0 }
        : side === 'south'
          ? { x: index, y: grid.rows - 1, dx: 0, dy: -1 }
          : { x: index, y: 0, dx: 0, dy: 1 };
  for (let step = 0; step < HARD_RUNUP_TILES; step += 1) {
    const tile = room.layout[inward.y + inward.dy * step]?.[inward.x + inward.dx * step];
    if (!isImmediatelySafe(tile)) {
      return false;
    }
  }
  return true;
}

describe('world generation fairness', () => {
  it('provides a hard five-tile run-up inward from every safe border entry tile', () => {
    const failures: string[] = [];

    for (const center of FIXTURE_CENTERS) {
      const rooms = generateNeighborhood(center, 1);
      for (const room of rooms.values()) {
        for (const direction of DIRECTIONS) {
          const inward = { name: direction.name, dx: -direction.dx, dy: -direction.dy };
          for (const entry of edgeCellsFor(room, defaultGameConfig.grid, direction)) {
            if (!isImmediatelySafe(room.layout[entry.y]?.[entry.x])) {
              continue;
            }
            const runup = runupCells(defaultGameConfig.grid, inward, entry, HARD_RUNUP_TILES);
            const unsafe = runup.find((cell) => !isImmediatelySafe(room.layout[cell.y]?.[cell.x]));
            if (unsafe) {
              failures.push(
                [
                  `${room.id} has a safe ${direction.name} entry at (${entry.x},${entry.y}) but hard run-up hits (${unsafe.x},${unsafe.y})=${room.layout[unsafe.y]?.[unsafe.x]}`,
                  `run-up: ${runup.map((cell) => `(${cell.x},${cell.y})=${room.layout[cell.y]?.[cell.x]}`).join(' ')}`,
                  roomSummary(room),
                ].join('\n\n'),
              );
            }
          }
        }
      }
    }

    expect(failures).toEqual([]);
  });

  it('reproduces generated rooms for the same fairness fixture seed', () => {
    for (const center of FIXTURE_CENTERS) {
      const first = generateNeighborhood(center, 1);
      const second = generateNeighborhood(center, 1);
      for (const [id, room] of first) {
        expect(second.get(id)?.layout).toEqual(room.layout);
        expect(second.get(id)?.biomeId).toBe(room.biomeId);
        expect(second.get(id)?.portals).toEqual(room.portals);
      }
    }
  });

  it('clears only a local spawn corridor instead of whole rows', () => {
    const safety = new SafetyOperations(defaultGameConfig.world);
    const guard = safety.createSpawnGuard(defaultGameConfig.world.originRoomId);
    const layout = filledLayout(defaultGameConfig.grid, '#');

    guard?.clear(layout);

    expect(layout[12]?.[3]).toBe('.');
    expect(layout[12]?.[7]).toBe('.');
    expect(layout[12]?.[17]).toBe('.');
    expect(layout[12]?.[18]).toBe('#');
    expect(layout[11]?.[17]).toBe('.');
    expect(layout[13]?.[17]).toBe('.');
    expect(layout[12]?.[0]).toBe('#');
    expect(layout[12]?.[defaultGameConfig.grid.cols - 1]).toBe('#');
  });

  it('places local structures without relying on entrance run-up cleanup', () => {
    const forbiddenCells = entranceRunupCells(defaultGameConfig.grid, HARD_RUNUP_TILES);

    const houseLayout = emptyLayout(defaultGameConfig.grid);
    const house = tryPlaceQuestHouse(houseLayout, defaultGameConfig.grid, createRng('fair-house'), {
      forbiddenCells,
      margin: HARD_RUNUP_TILES,
    });
    expect(house).not.toBeNull();
    expect(unsafeStructureTilesIn(forbiddenCells, houseLayout)).toEqual([]);

    const villageLayout = emptyLayout(defaultGameConfig.grid);
    const village = tryPlaceVillage(
      villageLayout,
      defaultGameConfig.grid,
      createRng('fair-village'),
      'verdigris-basin',
      {
        forbiddenCells,
        margin: HARD_RUNUP_TILES,
      },
    );
    expect(village).not.toBeNull();
    expect(unsafeStructureTilesIn(forbiddenCells, villageLayout)).toEqual([]);
  });

  it('keeps rivers out of the starting neighborhood', () => {
    const rooms = generateNeighborhood({ x: 0, y: 0, z: 0 }, 1);
    const wateryRooms = [...rooms.values()].filter((room) =>
      room.layout.some((row) => row.includes('~')),
    );
    expect(wateryRooms.map((room) => room.id)).toEqual([]);
  });

  it('spawns optional structures and cross-room features in a broad generated area', () => {
    const rooms = generateArea('spawn-sanity', -18, 18, -18, 18);
    const villages = [...rooms.values()].filter((room) => room.village);
    const goblinCamps = [...rooms.values()].filter((room) => room.goblinCamp);
    const questHouses = [...rooms.values()].filter((room) => room.questGiver && !room.village);
    const rivers = [...rooms.values()].filter((room) =>
      hasRiverSegment(room, defaultGameConfig.grid),
    );

    let crossRoomBoundaryWalls = 0;
    for (let y = -18; y <= 18; y += 1) {
      for (let x = -18; x <= 18; x += 1) {
        const current = rooms.get(`${x},${y},0`);
        if (
          sharedWallRun(current, rooms.get(`${x + 1},${y},0`), 'east', defaultGameConfig.grid) >= 4
        ) {
          crossRoomBoundaryWalls += 1;
        }
        if (
          sharedWallRun(current, rooms.get(`${x},${y + 1},0`), 'south', defaultGameConfig.grid) >= 4
        ) {
          crossRoomBoundaryWalls += 1;
        }
      }
    }

    expect(villages.length).toBeGreaterThan(0);
    expect(goblinCamps.length).toBeGreaterThan(0);
    expect(questHouses.length).toBeGreaterThan(0);
    expect(rivers.length).toBeGreaterThan(0);
    expect(crossRoomBoundaryWalls).toBeGreaterThan(0);
  });

  it('keeps adjacent cross-room barrier edges mutually blocked or mutually passable', () => {
    const min = -18;
    const max = 18;
    const rooms = generateArea('cross-room-edge-consistency', min, max, min, max);
    const failures: string[] = [];

    for (let y = min; y <= max; y += 1) {
      for (let x = min; x <= max; x += 1) {
        for (const direction of ['east', 'south'] as const) {
          const first = rooms.get(`${x},${y},0`);
          const second = rooms.get(
            direction === 'east' ? `${x + 1},${y},0` : `${x},${y + 1},0`,
          );
          if (!first || !second) {
            continue;
          }
          const length = direction === 'east' ? defaultGameConfig.grid.rows : defaultGameConfig.grid.cols;
          for (let index = 0; index < length; index += 1) {
            const firstTile = oppositeEdgeTile(first, direction, index, defaultGameConfig.grid);
            const secondTile = neighborEdgeTile(second, direction, index);
            const firstBlocked = firstTile === '#';
            const secondBlocked = secondTile === '#';
            if (firstBlocked === secondBlocked) {
              continue;
            }
            const openRoom = firstBlocked ? second : first;
            const openSide = firstBlocked
              ? direction === 'east'
                ? 'west'
                : 'north'
              : direction;
            if (passableEdgeRunupClear(openRoom, openSide, index, defaultGameConfig.grid)) {
              failures.push(
                `${first.id} ${direction} edge ${index}=${firstTile} mismatches ${second.id} opposite=${secondTile}`,
              );
            }
          }
        }
      }
    }

    expect(failures.slice(0, 12)).toEqual([]);
    expect(failures).toHaveLength(0);
  });

  it('assigns multiple first-class room archetypes across generated rooms', () => {
    const rooms = generateArea('archetype-sanity', -12, 12, -12, 12);
    const archetypes = new Set([...rooms.values()].map((room) => room.archetypeId));

    expect(archetypes.has('classic')).toBe(true);
    expect(archetypes.has('open-clearing')).toBe(true);
    expect(archetypes.has('four-corners')).toBe(true);
    expect(archetypes.has('choke-point')).toBe(true);
    expect(archetypes.size).toBeGreaterThanOrEqual(4);
  });

  it('does not flatten the full starting neighborhood into open clearings', () => {
    const rooms = generateNeighborhood({ x: 0, y: 0, z: 0 }, 1);
    expect(rooms.get('0,0,0')?.archetypeId).toBe('classic');

    const openClearingRooms = [...rooms.values()].filter(
      (room) => room.archetypeId === 'open-clearing',
    );
    expect(openClearingRooms).toEqual([]);
  });

  it('uses open clearings as structure-friendly rooms instead of empty rooms', () => {
    const rooms = generateArea('open-clearing-structure-sanity', -24, 24, -24, 24);
    const openClearings = [...rooms.values()].filter(
      (room) =>
        room.archetypeId === 'open-clearing' &&
        room.biomeId !== 'sunken-ocean' &&
        room.biomeId !== 'elderwood-maze',
    );

    expect(openClearings.length).toBeGreaterThan(0);
    expect(
      openClearings.every((room) => {
        const hasNpcStructure = Boolean(
          room.village || room.goblinCamp || room.town || room.townPerimeter || room.questGiver,
        );
        const hasLake = countTiles(room, new Set(['~'])) > 0;
        const hasStructuredDressing = countTiles(room, new Set(['G', 'M', 'S', 'A', 'N', 'U'])) > 0;
        return hasNpcStructure || hasLake || hasStructuredDressing;
      }),
    ).toBe(true);
  });

  it('reports biome-owned archetypes for ocean and dense forest rooms', () => {
    const rooms = generateArea('biome-archetype-sanity', -12, 12, -12, 12);
    const ocean = [...rooms.values()].find((room) => room.biomeId === 'sunken-ocean');
    const denseForest = [...rooms.values()].find((room) => room.biomeId === 'elderwood-maze');

    expect(ocean?.archetypeId).toBe('ocean');
    expect(denseForest?.archetypeId).toBe('dense-forest');
  });

  it('maps Liberty Badlands into the intended southwest coordinate band', () => {
    expect(getBiomeForRoom('-7,-6,0').id).toBe('liberty-badlands');
    expect(getBiomeForRoom('-5,-3,0').id).toBe('liberty-badlands');
    expect(getBiomeForRoom('-4,-6,0').id).toBe('jade-peak-province');
  });

  it('generates Liberty Badlands archetypes and signature structures across its region', () => {
    const rooms = generateArea('liberty-badlands-sanity', -10, -5, -8, -3);
    const libertyRooms = [...rooms.values()].filter((room) => room.biomeId === 'liberty-badlands');
    const archetypes = new Set(libertyRooms.map((room) => room.archetypeId));

    expect(libertyRooms.length).toBeGreaterThan(0);
    expect(archetypes.has('billboard-maze')).toBe(true);
    expect(archetypes.has('firework-field')).toBe(true);
    expect(archetypes.has('monument-plaza')).toBe(true);
    expect(archetypes.has('motel-pool-ruins')).toBe(true);
    expect(archetypes.has('interstate-cut')).toBe(true);
    expect(
      libertyRooms.some(
        (room) =>
          room.allNiteDiner ||
          room.roadsideMonument ||
          room.fireworkStand ||
          room.jackalopeLodge ||
          room.koiPond ||
          room.motelPool ||
          room.billboardOracle ||
          room.roadCrew ||
          room.gridironYard,
      ),
    ).toBe(true);
  });
});
