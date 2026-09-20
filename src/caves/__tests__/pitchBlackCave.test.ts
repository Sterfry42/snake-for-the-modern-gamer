import { describe, expect, it } from 'vitest';
import { generateCave } from '../caveGenerator.js';
import { getCaveTemplate } from '../caveTemplates.js';

describe('pitch-black cave', () => {
  it('generates as a treasure cave with a reachable treasure and solid-wall boundaries', () => {
    const template = getCaveTemplate('pitchBlackTreasure');
    expect(template.category).toBe('treasure');
    expect(template.exitMode).toBe('rewardClaimed');

    const result = generateCave({
      caveId: 'cave:4,4,0:0',
      parentRoomId: '4,4,0',
      templateId: 'pitchBlackTreasure',
      grid: { cols: 32, rows: 24, cell: 16 },
      worldSeed: 'test-world',
      returnPosition: { x: 16, y: 20 },
    });

    expect(result.room.cave?.templateId).toBe('pitchBlackTreasure');
    expect(result.room.cave?.boundaryMode).toBe('solidWalls');
    expect(result.exit).toEqual({ x: 16, y: 22 });
    expect(result.room.cave?.exit).toEqual({ x: 16, y: 22 });
    expect(result.room.layout[22]?.[16]).toBe('X');
    expect(result.room.treasure).toEqual({ x: 16, y: 5 });
    expect(result.room.layout[0]).toMatch(/^#+$/);
    expect(result.room.layout.some((row) => row.slice(3, -3).includes('#'))).toBe(true);
  });
});
