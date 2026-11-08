import type { ConstructionState } from '../building/constructionState.js';
import type { Vector2Like } from '../core/math.js';
import { CROPS, produceItem } from './cropCatalog.js';
import { farmShelter } from './farmingActions.js';
import type { FarmIncident } from './farmingTypes.js';
import type { FarmingState } from './farmingState.js';

interface FarmCreatureContext {
  farms: FarmingState;
  construction: ConstructionState;
  worldDay: number;
  record(event: FarmIncident): boolean;
}
export function farmCreatureTarget(
  ctx: FarmCreatureContext,
  roomId: string,
  position: Vector2Like,
  kind: 'graze' | 'steal',
): Vector2Like | undefined {
  const deterrents = ctx.construction
    .getStructures(roomId)
    .filter((structure) => structure.blueprintId === 'scarecrow');
  return ctx.farms
    .cells(roomId)
    .filter(
      (cell) =>
        cell.crop?.stage === 'ready' &&
        Math.abs(cell.x - position.x) + Math.abs(cell.y - position.y) <= 6 &&
        !farmShelter(ctx.construction, roomId, cell).greenhouse &&
        (kind !== 'graze' ||
          !deterrents.some(
            (structure) =>
              Math.abs(structure.anchor.x - cell.x) + Math.abs(structure.anchor.y - cell.y) <= 5,
          )),
    )
    .sort(
      (a, b) =>
        Math.abs(a.x - position.x) +
        Math.abs(a.y - position.y) -
        Math.abs(b.x - position.x) -
        Math.abs(b.y - position.y),
    )[0];
}
export function applyFarmContact(
  ctx: FarmCreatureContext,
  roomId: string,
  actorId: string,
  position: Vector2Like,
  kind: 'graze' | 'trample' | 'steal' | 'destroy',
): void {
  if (kind === 'destroy') {
    const structure = ctx.construction
      .getStructures(roomId)
      .find(
        (structure) =>
          ['greenhouse', 'farm-fence', 'farm-gate'].includes(structure.blueprintId) &&
          structure.cells.some(
            (cell) => Math.abs(cell.localX - position.x) + Math.abs(cell.localY - position.y) <= 1,
          ),
      );
    if (structure) {
      const event: FarmIncident = {
        id: `damage:${structure.id}:${actorId}:${Math.floor(ctx.farms.elapsedMs / 5000)}`,
        roomId,
        x: position.x,
        y: position.y,
        worldDay: ctx.worldDay,
        actorId,
        cropId: '',
        kind: 'structure-damaged',
        summary: `${structure.blueprintId} attacked by ${actorId}.`,
      };
      if (ctx.record(event)) ctx.construction.damage(structure.id, 25);
      return;
    }
  }
  const cell =
    kind === 'trample'
      ? ctx.farms.get(roomId, position.x, position.y)
      : ctx.farms
          .cells(roomId)
          .find(
            (cell) =>
              cell.crop &&
              cell.crop.stage !== 'withered' &&
              (kind === 'destroy' || cell.crop.stage === 'ready') &&
              Math.abs(cell.x - position.x) + Math.abs(cell.y - position.y) <= 1,
          );
  if (!cell?.crop || farmShelter(ctx.construction, roomId, cell).greenhouse) return;
  const crop = cell.crop,
    def = CROPS.find((def) => def.id === crop.cropId);
  if (!def || (kind === 'trample' && crop.progress >= 0.8)) return;
  const id = `${crop.instanceId}:${crop.regrowCount}:${actorId}:${ctx.worldDay}:${kind}`;
  if (
    !ctx.record({
      id,
      roomId,
      x: cell.x,
      y: cell.y,
      worldDay: ctx.worldDay,
      actorId,
      cropId: crop.cropId,
      kind:
        kind === 'graze'
          ? 'eaten'
          : kind === 'steal'
            ? 'stolen'
            : kind === 'trample'
              ? 'trampled'
              : 'destroyed',
      summary: `${def.label} ${kind === 'steal' ? 'stolen by a nearby bandit' : kind === 'graze' ? 'eaten by a grazing animal' : kind === 'trample' ? 'trampled on contact' : 'destroyed by a hostile creature'}.`,
    })
  )
    return;
  if (kind === 'trample') {
    crop.health = Math.max(0, crop.health - 20);
    if (crop.health === 0) crop.stage = 'withered';
  } else {
    if (kind === 'steal')
      ctx.farms.storeLoot(actorId, produceItem(def, ctx.farms.quality(cell)), def.yield);
    delete cell.crop;
  }
  ctx.farms.touch(roomId, cell);
}
