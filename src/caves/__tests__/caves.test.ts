import { describe, expect, it } from 'vitest';
import { defaultGameConfig } from '../../config/gameConfig.js';
import { createRng } from '../../core/rng.js';
import { createWorldGenerationIdentity } from '../../world/generation/worldGenerationIdentity.js';
import { WorldService } from '../../world/worldService.js';
import { findCaveEntranceCandidates, createCaveId } from '../caveEntrancePlacement.js';
import { generateCave } from '../caveGenerator.js';
import {
  CAVE_TEMPLATE_TABLE,
  CAVE_TEMPLATES,
  getCaveTemplate,
  pickWeightedCaveTemplate,
} from '../caveTemplates.js';
import type { RoomSnapshot } from '../../world/types.js';
import type { CaveTemplateId } from '../caveTypes.js';

function baseRoom(layout: string[]): RoomSnapshot {
  return {
    id: '2,0,0',
    layout,
    portals: [],
    biomeId: 'verdigris-basin',
    biomeTitle: 'Verdigris Basin',
    backgroundColor: 0,
    wallColor: 0,
    wallOutlineColor: 0,
  };
}

describe('cave entrance placement', () => {
  it('finds only wall candidates reachable from the spawn guard', () => {
    const grid = { ...defaultGameConfig.grid, cols: 8, rows: 6 };
    const room = baseRoom(['########', '#......#', '#..##..#', '#......#', '#......#', '########']);

    const candidates = findCaveEntranceCandidates(room, grid, [{ x: 1, y: 1 }]);

    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates.every((candidate) => room.layout[candidate.y]?.[candidate.x] === '#')).toBe(
      true,
    );
    expect(candidates.every((candidate) => candidate.x > 0 && candidate.y > 0)).toBe(true);
  });
});

describe('cave determinism', () => {
  it('uses deterministic cave ids and template selection', () => {
    expect(createCaveId('-6,-7,0', 0)).toBe('cave:-6,-7,0:0');

    const first = createRng('template-seed');
    const second = createRng('template-seed');
    const picksA = Array.from({ length: 8 }, () => pickWeightedCaveTemplate(first()));
    const picksB = Array.from({ length: 8 }, () => pickWeightedCaveTemplate(second()));

    expect(picksA).toEqual(picksB);
  });

  it('generates lake treasure with a dry path from spawn to exit', () => {
    const result = generateCave({
      caveId: 'cave:4,0,0:0',
      parentRoomId: '4,0,0',
      templateId: 'lakeTreasure',
      grid: defaultGameConfig.grid,
      worldSeed: 'lake-test',
      returnPosition: { x: 8, y: 8 },
    });

    const room = result.room;
    expect(room.cave?.lakeRewards).toHaveLength(4);
    expect(room.layout[result.spawn.y]?.[result.spawn.x]).toBe('.');
    expect(room.layout[result.exit.y]?.[result.exit.x]).toBe('X');
    expect(hasDryPath(room.layout, result.spawn, result.exit)).toBe(true);
  });

  it('applies cave save overlays so collected lake items do not respawn', () => {
    const result = generateCave({
      caveId: 'cave:5,0,0:0',
      parentRoomId: '5,0,0',
      templateId: 'lakeTreasure',
      grid: defaultGameConfig.grid,
      worldSeed: 'lake-save-test',
      returnPosition: { x: 8, y: 8 },
      save: {
        id: 'cave:5,0,0:0',
        parentRoomId: '5,0,0',
        templateId: 'lakeTreasure',
        state: 'completed',
        collectedItemIds: ['lake-1', 'lake-3'],
        openedChestIds: [],
        killedEnemyIds: [],
        rewardClaimed: false,
        discoveredZones: ['0,0,0'],
      },
    });

    expect(result.room.cave?.lakeRewards?.map((reward) => reward.id).sort()).toEqual([
      'lake-0',
      'lake-2',
    ]);
  });

  it('generates random structure caves from real structure stamps', () => {
    const result = generateCave({
      caveId: 'cave:6,0,0:0',
      parentRoomId: '6,0,0',
      templateId: 'randomStructureRoom',
      grid: defaultGameConfig.grid,
      worldSeed: 'structure-cave-test',
      returnPosition: { x: 8, y: 8 },
    });

    const room = result.room;
    const hasStampedStructure = Boolean(
      room.village || room.goblinCamp || room.snakeMcDonalds || room.shrine || room.questGiver,
    );

    expect(room.cave?.forcedStructureId).toBeDefined();
    expect(room.cave?.forcedStructureId).not.toBe('fallbackTreasure');
    expect(hasStampedStructure).toBe(true);
    expect(room.layout[result.spawn.y]?.[result.spawn.x]).toBe('.');
    expect(room.layout[result.exit.y]?.[result.exit.x]).toBe('X');
    expect(hasDryPath(room.layout, result.spawn, result.exit)).toBe(true);
  });

  it('defines a 20-apple caffeinated rush cave with a 15-second timer', () => {
    const template = getCaveTemplate('caffeinatedAppleRush');
    const result = generateCave({
      caveId: 'cave:7,0,0:0',
      parentRoomId: '7,0,0',
      templateId: 'caffeinatedAppleRush',
      grid: defaultGameConfig.grid,
      worldSeed: 'caffeinated-cave-test',
      returnPosition: { x: 8, y: 8 },
    });

    expect(template.timerSeconds).toBe(15);
    expect(template.applePool).toEqual({ typeId: 'caffeinated', count: 20 });
    expect(result.room.biomeTitle).toBe('Caffeinated Apple Rush');
    expect(result.room.cave?.templateId).toBe('caffeinatedAppleRush');
    expect(hasDryPath(result.room.layout, result.spawn, result.exit)).toBe(true);
  });

  it('registers the world-expansion cave templates in the weighted table', () => {
    const newTemplateIds: CaveTemplateId[] = [
      'targetingGallery',
      'echoMaze',
      'floodedTreasury',
      'shrineOfBadProbability',
      'fossilDigSite',
    ];
    const weightedIds = new Set(CAVE_TEMPLATE_TABLE.map((entry) => entry.id));

    for (const templateId of newTemplateIds) {
      expect(CAVE_TEMPLATES[templateId]).toBeDefined();
      expect(weightedIds.has(templateId)).toBe(true);
      expect(CAVE_TEMPLATES[templateId].exitMode).toMatch(/manual|rewardClaimed|combatClear/);
    }
    expect(weightedIds.has('goblinTollTunnel' as CaveTemplateId)).toBe(false);
  });

  it.each([
    'targetingGallery',
    'echoMaze',
    'floodedTreasury',
    'shrineOfBadProbability',
    'fossilDigSite',
  ] as CaveTemplateId[])('generates %s with a completion path', (templateId) => {
    const result = generateCave({
      caveId: `cave:${templateId}:0`,
      parentRoomId: '8,0,0',
      templateId,
      grid: defaultGameConfig.grid,
      worldSeed: `world-expansion-${templateId}`,
      returnPosition: { x: 8, y: 8 },
    });

    expect(result.room.cave?.templateId).toBe(templateId);
    expect(result.room.layout[result.exit.y]?.[result.exit.x]).toBe('X');
    expect(hasDryPath(result.room.layout, result.spawn, result.exit)).toBe(true);
    if (getCaveTemplate(templateId).exitMode === 'rewardClaimed') {
      expect(result.room.treasure).toBeDefined();
      expect(hasDryPath(result.room.layout, result.spawn, result.room.treasure!)).toBe(true);
    }
  });
});

describe('cave spawn rate', () => {
  it('spawns cave entrances in approximately ten percent of generated overworld rooms', () => {
    const radius = 36;
    const identity = createWorldGenerationIdentity('cave-spawn-rate');
    const world = new WorldService(
      defaultGameConfig.grid,
      defaultGameConfig.world,
      createRng(identity.seed),
      identity,
    );
    let generated = 0;
    let caves = 0;

    for (let y = -radius; y <= radius; y += 1) {
      for (let x = -radius; x <= radius; x += 1) {
        const room = world.getRoom(`${x},${y},0`);
        generated += 1;
        caves += room.caveEntrances?.length ?? 0;
      }
    }

    const rate = caves / generated;
    expect({ generated, caves, rate }).toMatchInlineSnapshot(`
      {
        "caves": 559,
        "generated": 5329,
        "rate": 0.10489772940514168,
      }
    `);
    expect(rate).toBeGreaterThanOrEqual(0.085);
    expect(rate).toBeLessThanOrEqual(0.115);
  }, 10000);
});

function hasDryPath(
  layout: string[],
  start: { x: number; y: number },
  exit: { x: number; y: number },
): boolean {
  const queue = [start];
  const seen = new Set<string>();
  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index]!;
    const key = `${current.x},${current.y}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (current.x === exit.x && current.y === exit.y) return true;
    for (const dir of [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ]) {
      const next = { x: current.x + dir.x, y: current.y + dir.y };
      const tile = layout[next.y]?.[next.x];
      if (tile && tile !== '#' && tile !== '~') queue.push(next);
    }
  }
  return false;
}
