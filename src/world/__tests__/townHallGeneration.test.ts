import { describe, expect, it } from 'vitest';
import { createPhysicalHumanTown, createTownDistrictRoom } from '../town.js';

describe('Town Hall generation', () => {
  it('gives every physical human town one enterable Town Hall and a civic official', () => {
    const town = createPhysicalHumanTown({
      biomeId: 'verdigris-basin',
      seed: 99,
      townId: 'town-hall-test',
      districtRoomIds: {
        '0,0,0': 'townCenter',
        '1,0,0': 'marketStreet',
        '0,1,0': 'residentialStreet',
        '1,1,0': 'backAlley',
      },
      entranceRoomId: '0,0,0',
      exitRoomIds: ['1,1,0'],
    });

    const halls = town.buildings.filter((building) => building.kind === 'townHall');
    expect(halls).toHaveLength(1);
    expect(halls[0]).toMatchObject({
      district: 'townCenter',
      templateId: 'townHall',
      enterable: true,
      publicAccess: true,
    });
    expect(town.residents.filter((resident) => resident.role === 'civicOfficial')).toHaveLength(1);

    const room = createTownDistrictRoom({
      town,
      roomId: '0,0,0',
      districtKind: 'townCenter',
      grid: { cols: 32, rows: 24, cell: 16 },
      biomeId: 'verdigris-basin',
      biomeTitle: 'Verdigris Basin',
      backgroundColor: 0,
      wallColor: 0,
      wallOutlineColor: 0,
      connections: { east: '1,0,0', south: '0,1,0' },
    });

    expect(room.layerEntrances?.some((entrance) => entrance.templateId === 'townHall')).toBe(true);
  });
});
