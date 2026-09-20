import { describe, expect, it } from 'vitest';
import type { HeadlessScenario } from '../../../test/headless/headlessScenario.js';
import { createHeadlessScenario } from '../../../test/headless/headlessScenario.js';
import type { RoomSnapshot } from '../../../world/types.js';

describe('Town household door invariants', () => {
  it('TOWN-HARDEN-005 - visible residential doors have one-to-one entrance metadata across 50 seeds', () => {
    for (let index = 0; index < 50; index += 1) {
      const seed = `town-harden-005-residential-doors-${index}`;
      const scenario = createHeadlessScenario({ seed });
      const residentialRooms = generatedTownRooms(scenario).filter(
        (room) => room.town?.districtByRoomId[room.id] === 'residentialStreet',
      );

      expect(residentialRooms.length, seed).toBeGreaterThan(0);
      for (const room of residentialRooms) {
        const visibleDoors = visibleResidentialDoors(room);
        const entrances = residentialEntrances(room);

        expect(entrances.map((entrance) => `${entrance.x},${entrance.y}`).sort(), seed).toEqual(
          visibleDoors.map((door) => `${door.x},${door.y}`).sort(),
        );
        expect(new Set(entrances.map((entrance) => entrance.id)).size, seed).toBe(
          visibleDoors.length,
        );
        expect(new Set(entrances.map((entrance) => entrance.layerId)).size, seed).toBe(
          visibleDoors.length,
        );
      }
    }
  }, 120_000);
});

function generatedTownRooms(scenario: HeadlessScenario, radius = 10): RoomSnapshot[] {
  const rooms: RoomSnapshot[] = [];
  for (let y = -radius; y <= radius; y += 1) {
    for (let x = -radius; x <= radius; x += 1) {
      const room = scenario.getRoom(`${x},${y},0`);
      if (room.town) {
        rooms.push(room);
      }
    }
  }
  return rooms;
}

function visibleResidentialDoors(room: RoomSnapshot): Array<{ x: number; y: number }> {
  const doors: Array<{ x: number; y: number }> = [];
  room.layout.forEach((row, y) => {
    [...row].forEach((tile, x) => {
      if (tile === 'h' || tile === 'j') {
        doors.push({ x, y });
      }
    });
  });
  return doors;
}

function residentialEntrances(room: RoomSnapshot) {
  return (room.layerEntrances ?? []).filter(
    (entrance) => entrance.templateId === 'residentialHome',
  );
}
