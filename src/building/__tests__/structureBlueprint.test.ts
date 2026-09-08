import { describe, expect, it } from 'vitest';
import {
  anchorOneTileAhead,
  getStructureBlueprint,
  planStructureStamp,
  rotationFromDirection,
} from '../structureBlueprint.js';

describe('structure blueprint planning', () => {
  it('keeps the anchor fixed through every rotation', () => {
    const blueprint = getStructureBlueprint('test-house');
    expect(blueprint).toBeDefined();
    const anchor = { x: 10, y: 12 };

    for (const rotation of ['north', 'east', 'south', 'west'] as const) {
      const plan = planStructureStamp(blueprint!, anchor, rotation);
      const door = plan.cells.find((cell) => cell.tile === 'D');
      expect(door).toMatchObject({ localX: anchor.x, localY: anchor.y });
    }
  });

  it('transforms asymmetric cells without duplicates and bounds every cell', () => {
    const blueprint = getStructureBlueprint('test-l-shape');
    expect(blueprint).toBeDefined();
    const plan = planStructureStamp(blueprint!, { x: 7, y: 8 }, 'east');
    const keys = new Set(plan.cells.map((cell) => `${cell.localX},${cell.localY}`));

    expect(keys.size).toBe(plan.cells.length);
    for (const cell of plan.cells) {
      expect(cell.localX).toBeGreaterThanOrEqual(plan.bounds.left);
      expect(cell.localX).toBeLessThan(plan.bounds.left + plan.bounds.width);
      expect(cell.localY).toBeGreaterThanOrEqual(plan.bounds.top);
      expect(cell.localY).toBeLessThan(plan.bounds.top + plan.bounds.height);
    }
  });

  it('places the anchor exactly one tile ahead of snake facing', () => {
    const head = { x: 5, y: 5 };
    expect(anchorOneTileAhead(head, { x: 1, y: 0 })).toEqual({ x: 6, y: 5 });
    expect(anchorOneTileAhead(head, { x: 0, y: -1 })).toEqual({ x: 5, y: 4 });
    expect(rotationFromDirection({ x: -1, y: 0 })).toBe('west');
  });

  it('is deterministic for the same blueprint, anchor, and rotation', () => {
    const blueprint = getStructureBlueprint('test-house');
    expect(blueprint).toBeDefined();
    const first = planStructureStamp(blueprint!, { x: 3, y: 9 }, 'south');
    const second = planStructureStamp(blueprint!, { x: 3, y: 9 }, 'south');
    expect(second).toEqual(first);
  });
});
