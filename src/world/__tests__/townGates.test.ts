import { describe, expect, it } from 'vitest';
import type { GridConfig } from '../../config/gameConfig.js';
import {
  createPhysicalHumanTown,
  createTownDistrictRoom,
  renderTownGateSide,
  TOWN_GATE_WIDTH,
  townResidentsForRoom,
} from '../town.js';
import { isSolidTile } from '../tiles.js';

const grid: GridConfig = { cols: 32, rows: 24, cell: 16 };
const districtRoomIds = {
  '10,10,0': 'townCenter',
  '11,10,0': 'marketStreet',
  '10,11,0': 'residentialStreet',
  '11,11,0': 'backAlley',
} as const;

function makeTown() {
  return createPhysicalHumanTown({
    biomeId: 'verdigris-basin',
    seed: 12345,
    townId: 'test-town',
    districtRoomIds,
    entranceRoomId: '10,10,0',
    exitRoomIds: ['11,11,0'],
  });
}

describe('town gates', () => {
  it('creates first-class paired entrance and exit gates with guard assignments', () => {
    const town = makeTown();
    const entrance = town.gates.find((gate) => gate.kind === 'entrance');
    const exit = town.gates.find((gate) => gate.kind === 'exit');

    expect(entrance).toMatchObject({
      townRoomId: '10,10,0',
      approachRoomId: '10,9,0',
      side: 'north',
      state: 'closed',
    });
    expect(entrance?.insideGuardResidentId).toBeTruthy();
    expect(entrance?.outsideGuardResidentId).toBeTruthy();
    expect(exit).toMatchObject({
      townRoomId: '11,11,0',
      approachRoomId: '11,12,0',
      side: 'south',
      state: 'closed',
    });
    expect(exit?.insideGuardResidentId).toBeTruthy();
    expect(exit?.outsideGuardResidentId).toBeUndefined();
  });

  it('renders closed and open gate tiles as blocking and walkable state markers', () => {
    const town = makeTown();
    const gate = town.gates[0]!;
    const closedLayout = Array.from({ length: grid.rows }, () =>
      Array.from({ length: grid.cols }, () => '.'),
    );
    renderTownGateSide({
      layout: closedLayout,
      gate,
      side: gate.side,
      perspective: 'inside',
      state: 'closed',
      includeGuard: true,
    });
    expect(closedLayout[0]?.filter((tile) => tile === 'x')).toHaveLength(TOWN_GATE_WIDTH);
    expect(closedLayout[1]?.filter((tile) => tile === 'x')).toHaveLength(TOWN_GATE_WIDTH);
    expect(closedLayout.some((row) => row.includes('G'))).toBe(true);
    expect(isSolidTile('x')).toBe(true);

    const openLayout = Array.from({ length: grid.rows }, () =>
      Array.from({ length: grid.cols }, () => '.'),
    );
    renderTownGateSide({
      layout: openLayout,
      gate,
      side: gate.side,
      perspective: 'inside',
      state: 'open',
      includeGuard: false,
    });
    expect(openLayout[0]?.join('')).not.toContain('x');
    expect(openLayout[0]?.join('')).not.toContain('o');
    expect(openLayout[1]?.join('')).not.toContain('x');
    expect(openLayout[1]?.join('')).not.toContain('o');
    expect(isSolidTile('o')).toBe(false);
  });

  it('uses explicit resolver gate sides for corner exits instead of the first exterior side', () => {
    const town = createPhysicalHumanTown({
      biomeId: 'verdigris-basin',
      seed: 12345,
      townId: 'east-exit-town',
      districtRoomIds,
      entranceRoomId: '10,10,0',
      exitRoomIds: ['11,11,0'],
      entranceGateSide: 'north',
      exitGateSides: ['east'],
    });
    const exit = town.gates.find((gate) => gate.kind === 'exit')!;

    expect(exit.side).toBe('east');
    expect(exit.approachRoomId).toBe('12,11,0');

    const layout = Array.from({ length: grid.rows }, () =>
      Array.from({ length: grid.cols }, () => '.'),
    );
    renderTownGateSide({
      layout,
      gate: exit,
      side: exit.side,
      perspective: 'inside',
      state: 'closed',
      includeGuard: false,
    });
    expect(layout.map((row) => row[grid.cols - 1]).filter((tile) => tile === 'x')).toHaveLength(
      TOWN_GATE_WIDTH,
    );
    expect(layout.map((row) => row[grid.cols - 2]).filter((tile) => tile === 'x')).toHaveLength(
      TOWN_GATE_WIDTH,
    );
  });

  it('places gate guards only in their gate rooms and keeps shop residents out of approach copies', () => {
    const town = makeTown();
    const entrance = town.gates.find((gate) => gate.kind === 'entrance')!;
    const room = createTownDistrictRoom({
      town,
      roomId: entrance.townRoomId,
      districtKind: town.districtByRoomId[entrance.townRoomId]!,
      grid,
      biomeId: 'verdigris-basin',
      biomeTitle: 'Verdigris Basin',
      backgroundColor: 0,
      wallColor: 0,
      wallOutlineColor: 0,
      connections: { north: entrance.approachRoomId, east: '11,10,0', south: '10,11,0' },
    });
    const residents = townResidentsForRoom(room.town!, room.id);

    expect(residents.some((resident) => resident.id === entrance.insideGuardResidentId)).toBe(true);
    expect(residents.some((resident) => resident.role === 'bartender')).toBe(false);
    expect(residents.some((resident) => resident.role === 'cardDealer')).toBe(false);
  });
});
