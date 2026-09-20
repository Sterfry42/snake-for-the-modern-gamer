import { describe, expect, it } from 'vitest';
import { ConstructionState } from '../constructionState.js';
import { getStructureBlueprint, planStructureStamp } from '../structureBlueprint.js';
import type { RoomSnapshot } from '../../world/types.js';

describe('construction state', () => {
  it('rejects unclaimed rooms per cell and becomes valid after a claim', () => {
    const construction = new ConstructionState();
    const room = openRoom();
    const blueprint = getStructureBlueprint('test-fence');
    const plan = planStructureStamp(blueprint!, { x: 4, y: 4 }, 'north');

    const rejected = construction.validatePlacement({ room, ownerId: 'player-1', plan });
    expect(rejected.valid).toBe(false);
    expect(rejected.reasons).toContain('unclaimed-room');

    construction.claimRoom(room.id, 'player-1');
    const accepted = construction.validatePlacement({ room, ownerId: 'player-1', plan });
    expect(accepted.valid).toBe(true);
    expect(accepted.cells.every((cell) => cell.valid)).toBe(true);
  });

  it('atomically places, persists, and demolishes effective geometry', () => {
    const construction = new ConstructionState();
    const room = openRoom();
    const blueprint = getStructureBlueprint('test-fence');
    const plan = planStructureStamp(blueprint!, { x: 4, y: 4 }, 'north');
    construction.claimRoom(room.id, 'player-1');

    const result = construction.placeStructure({ room, ownerId: 'player-1', plan });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(construction.effectiveCell(room, 4, 4).solid).toBe(true);
    expect(room.layout[4]?.[4]).toBe('.');

    const reloaded = new ConstructionState();
    reloaded.load(construction.save());
    expect(reloaded.getStructure(result.structure.id)?.id).toBe(result.structure.id);
    expect(reloaded.effectiveCell(room, 4, 4).solid).toBe(true);

    expect(reloaded.demolishStructure(room.id, result.structure.id, 'player-1')).toBe(true);
    expect(reloaded.effectiveCell(room, 4, 4).solid).toBe(false);
  });

  it('reports precise occupancy conflicts without mutating structures', () => {
    const construction = new ConstructionState();
    const room = openRoom();
    const blueprint = getStructureBlueprint('test-fence');
    const plan = planStructureStamp(blueprint!, { x: 4, y: 4 }, 'north');
    construction.claimRoom(room.id, 'player-1');

    const result = construction.placeStructure({
      room,
      ownerId: 'player-1',
      plan,
      npcCells: [{ x: 5, y: 4 }],
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.validation.cells.find((cell) => cell.x === 5 && cell.y === 4)?.reasons).toEqual([
      'npc',
    ]);
    expect(construction.getStructures(room.id)).toHaveLength(0);
  });
});

function openRoom(): RoomSnapshot {
  return {
    id: '0,0,0',
    layout: Array.from({ length: 18 }, () => '.'.repeat(32)),
    portals: [],
    biomeId: 'verdigris-basin',
    biomeTitle: 'Meadow',
    backgroundColor: 0x123456,
    wallColor: 0x654321,
    wallOutlineColor: 0x111111,
  };
}
