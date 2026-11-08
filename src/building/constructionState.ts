import { vectorKey, type Vector2Like } from '../core/math.js';
import { isSolidTile } from '../world/tiles.js';
import type { RoomSnapshot, VegetationType } from '../world/types.js';
import {
  getStructureBlueprint,
  planStructureStamp,
  type StructureRotation,
  type StructureStampCell,
  type StructureStampPlan,
} from './structureBlueprint.js';

export type ConstructionPermission = 'build' | 'demolish' | 'farm' | 'harvest' | 'manage';

export interface RoomClaim {
  roomId: string;
  ownerId: string;
  permissions: readonly ConstructionPermission[];
  access?: Record<string, ConstructionPermission[]>;
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
  health?: number;
  open?: boolean;
  reinforced?: boolean;
}

export interface ConstructionSaveData {
  claims?: RoomClaim[];
  structures?: Array<Omit<PlacedStructure, 'cells'> & { cells?: readonly StructureStampCell[] }>;
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
// Crop overlays remain independent of stamped geometry.

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
  cropCells?: readonly Vector2Like[];
  municipalBuildAuthorized?: boolean;
}

export class ConstructionState {
  private readonly claims = new Map<string, RoomClaim>();
  private readonly structures = new Map<string, PlacedStructure>();
  private nextStructureNumber = 1;
  private readonly cellIndex = new Map<string, PlacedStructure>();

  claimRoom(
    roomId: string,
    ownerId: string,
    permissions: readonly ConstructionPermission[] = ['build', 'demolish'],
  ): RoomClaim {
    const existing = this.claims.get(roomId);
    if (existing) {
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
    return Boolean(
      claim &&
        (claim.ownerId === ownerId ||
          (claim.access && Object.prototype.hasOwnProperty.call(claim.access, ownerId) &&
            claim.access[ownerId]?.includes(permission))),
    );
  }

  grant(
    roomId: string,
    ownerId: string,
    grantee: string,
    permission: ConstructionPermission,
    enabled: boolean,
  ): boolean {
    const claim = this.claims.get(roomId);
    if (
      !claim ||
      claim.ownerId !== ownerId ||
      !grantee ||
      grantee === '__proto__' ||
      grantee === 'constructor'
    )
      return false;
    const access = { ...claim.access };
    const permissions = new Set(Object.prototype.hasOwnProperty.call(access, grantee) ? access[grantee] : []);
    if (enabled) permissions.add(permission);
    else permissions.delete(permission);
    access[grantee] = [...permissions];
    claim.access = access;
    return true;
  }

  release(roomId: string, ownerId: string): boolean {
    if (this.claims.get(roomId)?.ownerId !== ownerId || this.structuresInRoom(roomId).length)
      return false;
    return this.claims.delete(roomId);
  }

  ownedCount(ownerId: string): number {
    return [...this.claims.values()].filter((claim) => claim.ownerId === ownerId).length;
  }
  getClaims(): RoomClaim[] {
    return [...this.claims.values()].map(cloneClaim);
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
    const structure = this.cellIndex.get(`${roomId}:${x},${y}`);
    return structure ? cloneStructure(structure) : undefined;
  }

  effectiveCell(
    room: RoomSnapshot,
    x: number,
    y: number,
  ): { tile: string | undefined; solid: boolean } {
    const indexed = this.cellIndex.get(`${room.id}:${x},${y}`);
    const structure = indexed?.cells.some(
      (cell) => cell.localX === x && cell.localY === y && cell.solid,
    )
      ? indexed
      : undefined;
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

  isCreatureSolid(room: RoomSnapshot, x: number, y: number): boolean {
    const structure = this.cellIndex.get(`${room.id}:${x},${y}`);
    const door =
      structure?.blueprintId === 'greenhouse' &&
      structure.cells.some(
        (cell) => cell.localX === x && cell.localY === y && cell.kind === 'door',
      );
    return Boolean(door) || this.isEffectivelySolid(room, x, y);
  }

  validatePlacement(context: StructurePlacementContext): StructurePlacementValidation {
    const claimReason: PlacementConflictReason[] =
      context.municipalBuildAuthorized || this.can(context.room.id, context.ownerId, 'build')
        ? []
        : ['unclaimed-room'];
    const playerCells = toCellSet(context.playerCells);
    const npcCells = toCellSet(context.npcCells);
    const enemyCells = toCellSet(context.enemyCells);
    const bossCells = toCellSet(context.bossCells);
    const cropCells = toCellSet(context.cropCells);
    const structureCells = new Set<string>();
    for (const structure of this.structuresInRoom(context.room.id)) {
      for (const cell of structure.cells) {
        structureCells.add(vectorKey({ x: cell.localX, y: cell.localY }));
      }
    }

    const cells = context.plan.cells.map((cell) => {
      const reasons = [...claimReason];
      if (!isInsideRoom(context.room, cell.localX, cell.localY)) {
        reasons.push('outside-room');
      } else {
        const key = vectorKey({ x: cell.localX, y: cell.localY });
        const tile = context.room.layout[cell.localY]?.[cell.localX];
        if (
          (cell.solid ||
            getStructureBlueprint(context.plan.blueprintId)?.agriculture?.climateControlled) &&
          (isSolidTile(tile) || tile === '~')
        )
          reasons.push('solid-terrain');
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
        if (cropCells.has(key)) reasons.push('reserved-cell');
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
    this.index(structure);
    return { ok: true, structure: cloneStructure(structure) };
  }

  demolishStructure(roomId: string, structureId: string, ownerId: string): boolean {
    if (!this.can(roomId, ownerId, 'demolish')) return false;
    const structure = this.structures.get(structureId);
    if (!structure || structure.roomId !== roomId) return false;
    this.structures.delete(structureId);
    this.reindex();
    return true;
  }

  damage(structureId: string, amount: number): boolean {
    const structure = this.structures.get(structureId);
    if (!structure || !Number.isFinite(amount) || amount <= 0) return false;
    structure.health = Math.max(0, (structure.health ?? 100) - amount);
    if (structure.health === 0) {
      this.structures.delete(structureId);
      this.reindex();
    }
    return true;
  }
  toggleGate(roomId: string, x: number, y: number, playerId: string): boolean {
    const structure = this.cellIndex.get(`${roomId}:${x},${y}`);
    if (!structure || structure.blueprintId !== 'farm-gate' || !this.can(roomId, playerId, 'build'))
      return false;
    structure.open = !structure.open;
    structure.cells = structure.cells.map((cell) => ({
      ...cell,
      solid: !structure.open,
      tile: structure.open ? 'D' : '#',
      kind: 'door',
    }));
    this.reindex();
    return true;
  }
  reinforce(structureId: string): boolean {
    const structure = this.structures.get(structureId);
    if (!structure || structure.blueprintId !== 'greenhouse' || structure.reinforced) return false;
    structure.reinforced = true;
    structure.health = 200;
    return true;
  }

  save(): ConstructionSaveData {
    return {
      claims: [...this.claims.values()].map(cloneClaim),
      structures: [...this.structures.values()].map((structure) => ({
        id: structure.id,
        roomId: structure.roomId,
        ownerId: structure.ownerId,
        blueprintId: structure.blueprintId,
        anchor: { ...structure.anchor },
        rotation: structure.rotation,
        createdAt: structure.createdAt,
        health: structure.health,
        open: structure.open,
        reinforced: structure.reinforced,
      })),
      nextStructureNumber: this.nextStructureNumber,
    };
  }

  load(save: ConstructionSaveData | undefined): void {
    this.claims.clear();
    this.structures.clear();
    this.cellIndex.clear();
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
        cells: plan.cells.map((cell) => ({
          ...cell,
          ...(structure.blueprintId === 'farm-gate' && structure.open
            ? { solid: false, tile: 'D', kind: 'door' as const }
            : {}),
        })),
      });
    }
    this.reindex();
  }

  clear(): void {
    this.claims.clear();
    this.structures.clear();
    this.cellIndex.clear();
    this.nextStructureNumber = 1;
  }

  private structuresInRoom(roomId: string): PlacedStructure[] {
    return [...this.structures.values()].filter((structure) => structure.roomId === roomId);
  }

  private index(structure: PlacedStructure): void {
    for (const cell of structure.cells)
      this.cellIndex.set(`${structure.roomId}:${cell.localX},${cell.localY}`, structure);
  }
  private reindex(): void {
    this.cellIndex.clear();
    for (const structure of this.structures.values()) this.index(structure);
  }

  private clearCommitVegetation(
    room: RoomSnapshot,
    validation: StructurePlacementValidation,
  ): void {
    const clearable = new Set(
      validation.cells.filter((cell) => cell.clearOnCommit).map((cell) => vectorKey(cell)),
    );
    if (clearable.size === 0 || !room.vegetation) return;
    room.vegetation = room.vegetation.filter((entry) => !clearable.has(vectorKey(entry)));
  }
}

function isInsideRoom(room: RoomSnapshot, x: number, y: number): boolean {
  return y >= 0 && y < room.layout.length && x >= 0 && x < (room.layout[0]?.length ?? 0);
}

function toCellSet(cells: readonly Vector2Like[] | undefined): ReadonlySet<string> {
  return new Set((cells ?? []).map(vectorKey));
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
  return {
    roomId: claim.roomId,
    ownerId: claim.ownerId,
    permissions: [...claim.permissions],
    ...(claim.access ? { access: structuredClone(claim.access) } : {}),
  };
}

function cloneStructure(structure: PlacedStructure): PlacedStructure {
  return {
    ...structure,
    anchor: { ...structure.anchor },
    cells: structure.cells.map((cell) => ({ ...cell })),
  };
}
