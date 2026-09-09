import type { Vector2Like } from '../core/math.js';
import { isSolidTile } from '../world/tiles.js';
import type { RoomSnapshot, VegetationType } from '../world/types.js';
import {
  getStructureBlueprint,
  planStructureStamp,
  type StructureRotation,
  type StructureStampCell,
  type StructureStampPlan,
} from './structureBlueprint.js';

export type ConstructionPermission = 'build' | 'demolish';

export interface RoomClaim {
  roomId: string;
  ownerId: string;
  permissions: readonly ConstructionPermission[];
}

export interface PlacedStructure {
  id: string;
  roomId: string;
  ownerId: string;
  blueprintId: string;
  anchor: Vector2Like;
  rotation: StructureRotation;
  cells: readonly StructureStampCell[];
  createdAt: number;
}

export interface ConstructionSaveData {
  claims?: RoomClaim[];
  structures?: PlacedStructure[];
  nextStructureNumber?: number;
}

export type PlacementConflictReason =
  | 'outside-room'
  | 'unclaimed-room'
  | 'solid-terrain'
  | 'existing-structure'
  | 'portal'
  | 'layer-entrance'
  | 'cave-entrance'
  | 'station'
  | 'protected-landmark'
  | 'reserved-cell'
  | 'player'
  | 'npc'
  | 'enemy'
  | 'boss'
  | 'large-vegetation';

export interface PlacementCellValidation {
  x: number;
  y: number;
  valid: boolean;
  reasons: PlacementConflictReason[];
  clearOnCommit?: boolean;
}

export interface StructurePlacementValidation {
  valid: boolean;
  cells: readonly PlacementCellValidation[];
  reasons: readonly PlacementConflictReason[];
}

export interface StructurePlacementContext {
  room: RoomSnapshot;
  ownerId: string;
  plan: StructureStampPlan;
  playerCells?: readonly Vector2Like[];
  npcCells?: readonly Vector2Like[];
  enemyCells?: readonly Vector2Like[];
  bossCells?: readonly Vector2Like[];
}

export class ConstructionState {
  private readonly claims = new Map<string, RoomClaim>();
  private readonly structures = new Map<string, PlacedStructure>();
  private nextStructureNumber = 1;

  claimRoom(
    roomId: string,
    ownerId: string,
    permissions: readonly ConstructionPermission[] = ['build', 'demolish'],
  ): RoomClaim {
    const existing = this.claims.get(roomId);
    if (existing?.ownerId === ownerId) {
      return existing;
    }
    const claim = { roomId, ownerId, permissions: [...permissions] };
    this.claims.set(roomId, claim);
    return claim;
  }

  getClaim(roomId: string): RoomClaim | undefined {
    const claim = this.claims.get(roomId);
    return claim ? cloneClaim(claim) : undefined;
  }

  can(roomId: string, ownerId: string, permission: ConstructionPermission): boolean {
    const claim = this.claims.get(roomId);
    return Boolean(claim?.ownerId === ownerId && claim.permissions.includes(permission));
  }

  getStructures(roomId?: string): PlacedStructure[] {
    return [...this.structures.values()]
      .filter((structure) => roomId === undefined || structure.roomId === roomId)
      .map(cloneStructure);
  }

  getStructure(id: string): PlacedStructure | undefined {
    const structure = this.structures.get(id);
    return structure ? cloneStructure(structure) : undefined;
  }

  getStructureAt(roomId: string, x: number, y: number): PlacedStructure | undefined {
    return this.getStructures(roomId).find((structure) =>
      structure.cells.some((cell) => cell.localX === x && cell.localY === y),
    );
  }

  effectiveCell(
    room: RoomSnapshot,
    x: number,
    y: number,
  ): { tile: string | undefined; solid: boolean } {
    const structure = this.structuresInRoom(room.id).find((entry) =>
      entry.cells.some((cell) => cell.localX === x && cell.localY === y && cell.solid),
    );
    if (structure) {
      const cell = structure.cells.find((entry) => entry.localX === x && entry.localY === y);
      return { tile: cell?.tile ?? '#', solid: true };
    }
    const tile = room.layout[y]?.[x];
    return { tile, solid: isSolidTile(tile) };
  }

  isEffectivelySolid(room: RoomSnapshot, x: number, y: number): boolean {
    return this.effectiveCell(room, x, y).solid;
  }

  validatePlacement(context: StructurePlacementContext): StructurePlacementValidation {
    const claimReason: PlacementConflictReason[] = this.can(
      context.room.id,
      context.ownerId,
      'build',
    )
      ? []
      : ['unclaimed-room'];
    const playerCells = toCellSet(context.playerCells);
    const npcCells = toCellSet(context.npcCells);
    const enemyCells = toCellSet(context.enemyCells);
    const bossCells = toCellSet(context.bossCells);
    const structureCells = new Set<string>();
    for (const structure of this.structuresInRoom(context.room.id)) {
      for (const cell of structure.cells) {
        structureCells.add(cellKey(cell.localX, cell.localY));
      }
    }

    const cells = context.plan.cells.map((cell) => {
      const reasons = [...claimReason];
      if (!isInsideRoom(context.room, cell.localX, cell.localY)) {
        reasons.push('outside-room');
      } else {
        const key = cellKey(cell.localX, cell.localY);
        const tile = context.room.layout[cell.localY]?.[cell.localX];
        if (cell.solid && isSolidTile(tile)) reasons.push('solid-terrain');
        if (structureCells.has(key)) reasons.push('existing-structure');
        if (
          context.room.portals.some(
            (portal) => portal.x === cell.localX && portal.y === cell.localY,
          )
        ) {
          reasons.push('portal');
        }
        if (
          context.room.layerEntrances?.some(
            (entrance) => entrance.x === cell.localX && entrance.y === cell.localY,
          )
        ) {
          reasons.push('layer-entrance');
        }
        if (
          context.room.caveEntrances?.some(
            (entrance) => entrance.x === cell.localX && entrance.y === cell.localY,
          )
        ) {
          reasons.push('cave-entrance');
        }
        if (
          context.room.bulletTrainStation &&
          context.room.bulletTrainStation.entranceX === cell.localX &&
          context.room.bulletTrainStation.entranceY === cell.localY
        ) {
          reasons.push('station');
        }
        if (
          context.room.rollercoasterStation &&
          context.room.rollercoasterStation.entranceX === cell.localX &&
          context.room.rollercoasterStation.entranceY === cell.localY
        ) {
          reasons.push('station');
        }
        if (isProtectedLandmark(context.room, cell.localX, cell.localY)) {
          reasons.push('protected-landmark');
        }
        const vegetation = context.room.vegetation?.find(
          (entry) => entry.x === cell.localX && entry.y === cell.localY,
        );
        if (vegetation && !isClearableVegetation(vegetation.variant)) {
          reasons.push('large-vegetation');
        }
        if (playerCells.has(key)) reasons.push('player');
        if (npcCells.has(key)) reasons.push('npc');
        if (enemyCells.has(key)) reasons.push('enemy');
        if (bossCells.has(key)) reasons.push('boss');
      }
      return {
        x: cell.localX,
        y: cell.localY,
        valid: reasons.length === 0,
        reasons,
        clearOnCommit: reasons.length === 0 && isClearableVegetationAt(context.room, cell),
      };
    });
    const reasons = [...new Set(cells.flatMap((cell) => cell.reasons))];
    return { valid: reasons.length === 0, cells, reasons };
  }

  placeStructure(
    context: StructurePlacementContext,
  ):
    | { ok: true; structure: PlacedStructure }
    | { ok: false; validation: StructurePlacementValidation } {
    const validation = this.validatePlacement(context);
    if (!validation.valid) {
      return { ok: false, validation };
    }
    const id = `player-structure-${this.nextStructureNumber}`;
    this.nextStructureNumber += 1;
    const structure: PlacedStructure = {
      id,
      roomId: context.room.id,
      ownerId: context.ownerId,
      blueprintId: context.plan.blueprintId,
      anchor: { ...context.plan.anchor },
      rotation: context.plan.rotation,
      cells: context.plan.cells.map((cell) => ({ ...cell })),
      createdAt: Date.now(),
    };
    this.clearCommitVegetation(context.room, validation);
    this.structures.set(id, structure);
    return { ok: true, structure: cloneStructure(structure) };
  }

  demolishStructure(roomId: string, structureId: string, ownerId: string): boolean {
    if (!this.can(roomId, ownerId, 'demolish')) return false;
    const structure = this.structures.get(structureId);
    if (!structure || structure.roomId !== roomId) return false;
    this.structures.delete(structureId);
    return true;
  }

  save(): ConstructionSaveData {
    return {
      claims: [...this.claims.values()].map(cloneClaim),
      structures: [...this.structures.values()].map(cloneStructure),
      nextStructureNumber: this.nextStructureNumber,
    };
  }

  load(save: ConstructionSaveData | undefined): void {
    this.claims.clear();
    this.structures.clear();
    this.nextStructureNumber = Math.max(1, Math.floor(save?.nextStructureNumber ?? 1));
    for (const claim of save?.claims ?? []) {
      if (claim.roomId && claim.ownerId) {
        this.claims.set(claim.roomId, cloneClaim(claim));
      }
    }
    for (const structure of save?.structures ?? []) {
      const blueprint = getStructureBlueprint(structure.blueprintId);
      if (!blueprint) continue;
      const plan = planStructureStamp(blueprint, structure.anchor, structure.rotation);
      this.structures.set(structure.id, {
        ...structure,
        anchor: { ...structure.anchor },
        cells: plan.cells.map((cell) => ({ ...cell })),
      });
    }
  }

  clear(): void {
    this.claims.clear();
    this.structures.clear();
    this.nextStructureNumber = 1;
  }

  private structuresInRoom(roomId: string): PlacedStructure[] {
    return [...this.structures.values()].filter((structure) => structure.roomId === roomId);
  }

  private clearCommitVegetation(
    room: RoomSnapshot,
    validation: StructurePlacementValidation,
  ): void {
    const clearable = new Set(
      validation.cells.filter((cell) => cell.clearOnCommit).map((cell) => cellKey(cell.x, cell.y)),
    );
    if (clearable.size === 0 || !room.vegetation) return;
    room.vegetation = room.vegetation.filter((entry) => !clearable.has(cellKey(entry.x, entry.y)));
  }
}

function isInsideRoom(room: RoomSnapshot, x: number, y: number): boolean {
  return y >= 0 && y < room.layout.length && x >= 0 && x < (room.layout[0]?.length ?? 0);
}

function toCellSet(cells: readonly Vector2Like[] | undefined): ReadonlySet<string> {
  return new Set((cells ?? []).map((cell) => cellKey(cell.x, cell.y)));
}

function cellKey(x: number, y: number): string {
  return `${x},${y}`;
}

function isClearableVegetation(variant: VegetationType): boolean {
  return (
    variant.startsWith('grass-') || variant.startsWith('flower-') || variant.startsWith('mushroom-')
  );
}

function isClearableVegetationAt(room: RoomSnapshot, cell: StructureStampCell): boolean {
  const vegetation = room.vegetation?.find(
    (entry) => entry.x === cell.localX && entry.y === cell.localY,
  );
  return Boolean(vegetation && isClearableVegetation(vegetation.variant));
}

function isProtectedLandmark(room: RoomSnapshot, x: number, y: number): boolean {
  return Boolean(
    room.koiPond?.waterTiles.some((cell) => cell.x === x && cell.y === y) ||
    (room.molemanDigSite?.pit.x === x && room.molemanDigSite.pit.y === y) ||
    room.lavenderFarm?.rows.some((cell) => cell.x === x && cell.y === y),
  );
}

function cloneClaim(claim: RoomClaim): RoomClaim {
  return { roomId: claim.roomId, ownerId: claim.ownerId, permissions: [...claim.permissions] };
}

function cloneStructure(structure: PlacedStructure): PlacedStructure {
  return {
    ...structure,
    anchor: { ...structure.anchor },
    cells: structure.cells.map((cell) => ({ ...cell })),
  };
}
