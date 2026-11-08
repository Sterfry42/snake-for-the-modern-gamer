import type { RoomSnapshot } from '../world/types.js';
import type { ConstructionState } from '../building/constructionState.js';
import { stableStringHashUnsigned } from '../core/math.js';
import { getBiomeDefinition } from '../world/biomes.js';
import type { FarmingState } from './farmingState.js';
import { farmShelter } from './farmingActions.js';
import { CROPS, produceItem } from './cropCatalog.js';
import type { Vector2Like } from '../core/math.js';

/** Flood-fill effective geometry once per daily incident window, never per rendered crop. */
export function exteriorFarmAccess(
  room: RoomSnapshot,
  construction: ConstructionState,
  origins?: readonly Vector2Like[],
): ReadonlySet<string> {
  const accessible = new Set<string>(),
    queue: Array<{ x: number; y: number }> = [];
  const width = room.layout[0]?.length ?? 0,
    height = room.layout.length;
  const add = (x: number, y: number) => {
    const key = `${x},${y}`;
    if (
      x < 0 ||
      y < 0 ||
      x >= width ||
      y >= height ||
      accessible.has(key) ||
      construction.isEffectivelySolid(room, x, y) ||
      room.layout[y]?.[x] === '~'
    )
      return;
    accessible.add(key);
    queue.push({ x, y });
  };
  if (origins) for (const origin of origins) add(origin.x, origin.y);
  else {
    for (let x = 0; x < width; x++) {
      add(x, 0);
      add(x, height - 1);
    }
    for (let y = 0; y < height; y++) {
      add(0, y);
      add(width - 1, y);
    }
  }
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const position = queue[cursor];
    if (!position) continue;
    add(position.x + 1, position.y);
    add(position.x - 1, position.y);
    add(position.x, position.y + 1);
    add(position.x, position.y - 1);
  }
  return accessible;
}

export function processFarmDawn(context: {
  room: RoomSnapshot;
  construction: ConstructionState;
  farms: FarmingState;
  worldDay: number;
  seed: string;
  occupied: boolean;
  raiders?: readonly { id: string; position: Vector2Like; kind: 'steal' | 'destroy' }[];
}): void {
  const { room, construction, farms, worldDay, seed } = context;
  const structures = construction.getStructures(room.id),
    cells = farms.cells(room.id);
  for (const structure of structures.filter((structure) => structure.blueprintId === 'sprinkler')) {
    const water = [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
    ].some(([dx, dy]) => room.layout[structure.anchor.y + dy]?.[structure.anchor.x + dx] === '~');
    if (!water) continue;
    for (const cell of cells)
      if (Math.abs(cell.x - structure.anchor.x) + Math.abs(cell.y - structure.anchor.y) <= 2) {
        cell.moisture = Math.min(100, cell.moisture + 30);
        farms.touch(room.id, cell);
      }
  }
  if (context.occupied || room.id === '0,-1,0') return;
  for (const raider of context.raiders ?? []) {
    if (farms.carrying(raider.id)) continue;
    const reachable = exteriorFarmAccess(room, construction, [raider.position]);
    const cell = cells.find(
      (cell) =>
        cell.crop &&
        cell.crop.stage !== 'withered' &&
        (raider.kind === 'destroy' || cell.crop.stage === 'ready') &&
        reachable.has(`${cell.x},${cell.y}`) &&
        !farmShelter(construction, room.id, cell).greenhouse,
    );
    const def = cell?.crop && CROPS.find((crop) => crop.id === cell.crop?.cropId);
    if (cell?.crop && def) {
      if (
        farms.incident({
          id: `known-raider:${room.id}:${raider.id}:${worldDay}`,
          roomId: room.id,
          x: cell.x,
          y: cell.y,
          worldDay,
          actorId: raider.id,
          kind: raider.kind === 'steal' ? 'stolen' : 'destroyed',
          cropId: def.id,
          summary: `${def.label} ${raider.kind === 'steal' ? 'stolen' : 'destroyed'} during an offscreen incident involving known hostile ${raider.id}; a path through the farm was open.`,
        })
      ) {
        if (raider.kind === 'steal')
          farms.storeLoot(raider.id, produceItem(def, farms.quality(cell)), def.yield);
        delete cell.crop;
        farms.touch(room.id, cell);
      }
      return;
    }
    const structure = structures.find(
      (structure) =>
        ['greenhouse', 'farm-fence', 'farm-gate'].includes(structure.blueprintId) &&
        structure.cells.some((cell) =>
          [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
          ].some(([dx, dy]) => reachable.has(`${cell.localX + dx},${cell.localY + dy}`)),
        ),
    );
    if (
      structure &&
      farms.incident({
        id: `known-raider:${room.id}:${raider.id}:${worldDay}`,
        roomId: room.id,
        x: structure.anchor.x,
        y: structure.anchor.y,
        worldDay,
        actorId: raider.id,
        kind: 'structure-damaged',
        cropId: '',
        summary: `${structure.blueprintId} damaged during an offscreen attack by known hostile ${raider.id}.`,
      })
    ) {
      construction.damage(structure.id, 25);
      return;
    }
  }
  if (room.town || room.townPerimeter || room.layer || room.cave) return;
  const biome = getBiomeDefinition(room.biomeId);
  if (biome.animalSpawnChance <= 0) return;
  const hash = stableStringHashUnsigned(`${seed}:${room.id}:${worldDay}:farm-fauna`);
  if (hash % 100 >= 18) return;
  const accessible = exteriorFarmAccess(room, construction);
  const candidates = cells.filter(
    (cell) =>
      cell.crop &&
      cell.crop.stage !== 'withered' &&
      accessible.has(`${cell.x},${cell.y}`) &&
      !farmShelter(construction, room.id, cell).greenhouse &&
      !structures.some(
        (structure) =>
          structure.blueprintId === 'scarecrow' &&
          Math.abs(structure.anchor.x - cell.x) + Math.abs(structure.anchor.y - cell.y) <= 5,
      ),
  );
  const cell = candidates[hash % Math.max(1, candidates.length)];
  if (!cell?.crop) return;
  const ready = cell.crop.stage === 'ready';
  if (
    !farms.incident({
      id: `regional-fauna:${room.id}:${worldDay}`,
      roomId: room.id,
      x: cell.x,
      y: cell.y,
      worldDay,
      kind: ready ? 'eaten' : 'trampled',
      cropId: cell.crop.cropId,
      summary: `${ready ? 'An exposed crop was eaten' : 'An exposed seedling was trampled'} during a simulated regional animal visit. No specific actor was identified.`,
    })
  )
    return;
  if (ready) delete cell.crop;
  else {
    cell.crop.health = Math.max(0, cell.crop.health - 20);
    if (cell.crop.health === 0) cell.crop.stage = 'withered';
  }
  farms.touch(room.id, cell);
}
