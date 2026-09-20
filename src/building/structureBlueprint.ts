import type { Vector2Like } from '../core/math.js';

export type StructureRotation = 'north' | 'east' | 'south' | 'west';

export type StructureCellKind = 'wall' | 'floor' | 'door' | 'prop' | 'light';

export interface StructureBlueprintCell {
  x: number;
  y: number;
  kind: StructureCellKind;
  solid: boolean;
  tile: string;
}

export interface StructureBlueprint {
  id: string;
  name: string;
  anchor: Vector2Like;
  cells: readonly StructureBlueprintCell[];
}

export interface StructureStampCell extends StructureBlueprintCell {
  localX: number;
  localY: number;
}

export interface StructureStampPlan {
  blueprintId: string;
  anchor: Vector2Like;
  rotation: StructureRotation;
  cells: readonly StructureStampCell[];
  bounds: { left: number; top: number; width: number; height: number };
}

export const TEST_STRUCTURE_BLUEPRINTS: readonly StructureBlueprint[] = [
  blueprintFromPattern('test-fence', 'Test Fence', ['###'], { x: 0, y: 0 }),
  blueprintFromPattern('test-house', 'Test House', ['####', '#..#', '#.B#', '##D#'], {
    x: 2,
    y: 3,
  }),
  blueprintFromPattern('test-lamp', 'Test Lamp', ['L'], { x: 0, y: 0 }),
  blueprintFromPattern('test-l-shape', 'Test L Shape', ['###', '#..', '#D.'], { x: 1, y: 2 }),
];

export const STRUCTURE_BLUEPRINTS: readonly StructureBlueprint[] = [
  ...TEST_STRUCTURE_BLUEPRINTS,
  blueprintFromPattern('small-house', 'Small House', ['####', '#..#', '#.B#', '##D#'], {
    x: 2,
    y: 3,
  }),
];

export function getStructureBlueprint(id: string): StructureBlueprint | undefined {
  return STRUCTURE_BLUEPRINTS.find((blueprint) => blueprint.id === id);
}

export function planStructureStamp(
  blueprint: StructureBlueprint,
  anchor: Vector2Like,
  rotation: StructureRotation,
): StructureStampPlan {
  const cells = blueprint.cells.map((cell) => {
    const rotated = rotateAroundAnchor(cell, blueprint.anchor, rotation);
    return {
      ...cell,
      localX: anchor.x + rotated.x,
      localY: anchor.y + rotated.y,
    };
  });
  assertUniqueCells(blueprint.id, cells);
  const xs = cells.map((cell) => cell.localX);
  const ys = cells.map((cell) => cell.localY);
  const left = Math.min(...xs);
  const right = Math.max(...xs);
  const top = Math.min(...ys);
  const bottom = Math.max(...ys);
  return {
    blueprintId: blueprint.id,
    anchor: { ...anchor },
    rotation,
    cells,
    bounds: { left, top, width: right - left + 1, height: bottom - top + 1 },
  };
}

export function rotationFromDirection(direction: Vector2Like): StructureRotation {
  if (Math.abs(direction.x) >= Math.abs(direction.y)) {
    return direction.x < 0 ? 'west' : 'east';
  }
  return direction.y < 0 ? 'north' : 'south';
}

export function anchorOneTileAhead(head: Vector2Like, direction: Vector2Like): Vector2Like {
  return { x: head.x + direction.x, y: head.y + direction.y };
}

function blueprintFromPattern(
  id: string,
  name: string,
  pattern: readonly string[],
  anchor: Vector2Like,
): StructureBlueprint {
  const cells: StructureBlueprintCell[] = [];
  pattern.forEach((row, y) => {
    [...row].forEach((tile, x) => {
      if (tile === '.') return;
      cells.push({
        x,
        y,
        kind: kindForTile(tile),
        solid: tile === '#',
        tile,
      });
    });
  });
  return { id, name, anchor: { ...anchor }, cells };
}

function kindForTile(tile: string): StructureCellKind {
  switch (tile) {
    case '#':
      return 'wall';
    case 'D':
      return 'door';
    case 'B':
      return 'prop';
    case 'L':
      return 'light';
    default:
      return 'floor';
  }
}

function rotateAroundAnchor(
  cell: StructureBlueprintCell,
  anchor: Vector2Like,
  rotation: StructureRotation,
): Vector2Like {
  const dx = cell.x - anchor.x;
  const dy = cell.y - anchor.y;
  switch (rotation) {
    case 'north':
      return { x: dx, y: dy };
    case 'east':
      return { x: -dy, y: dx };
    case 'south':
      return { x: -dx, y: -dy };
    case 'west':
      return { x: dy, y: -dx };
  }
}

function assertUniqueCells(blueprintId: string, cells: readonly StructureStampCell[]): void {
  const seen = new Set<string>();
  for (const cell of cells) {
    const key = `${cell.localX},${cell.localY}`;
    if (seen.has(key)) {
      throw new Error(`Structure blueprint "${blueprintId}" planned duplicate cell ${key}.`);
    }
    seen.add(key);
  }
}
