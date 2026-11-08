import type { Vector2Like } from '../core/math.js';
import type { InventorySystem } from '../inventory/inventory.js';
import type { ConstructionState } from '../building/constructionState.js';
import { getStructureBlueprint } from '../building/structureBlueprint.js';
import type { RoomSnapshot } from '../world/types.js';
import type { AtmosphereState } from '../world/atmosphereTypes.js';
import { CROPS, produceItem } from './cropCatalog.js';
import { FarmingState } from './farmingState.js';
import type { FarmAction, FarmCell } from './farmingTypes.js';
import { isWildernessRoom, resolveSoilSubstrate } from './soilResolver.js';

export interface FarmActionContext {
  playerId: string;
  room: RoomSnapshot;
  head: Vector2Like;
  alive: boolean;
  inventory: InventorySystem;
  construction: ConstructionState;
  farms: FarmingState;
  climate: AtmosphereState;
  canFarmMunicipal(x: number, y: number, harvest: boolean): boolean;
  occupied(x: number, y: number): boolean;
  getCharges(): number;
  setCharges(value: number): void;
}
export interface FarmResult {
  ok: boolean;
  message: string;
}
export function farmShelter(construction: ConstructionState, roomId: string, cell: FarmCell) {
  const structure = construction.getStructureAt(roomId, cell.x, cell.y);
  const blueprint = structure && getStructureBlueprint(structure.blueprintId);
  return {
    greenhouse: Boolean(
      blueprint?.agriculture?.climateControlled &&
      structure?.cells.some(
        (part) => part.tile === 'G' && part.localX === cell.x && part.localY === cell.y,
      ),
    ),
  };
}
export function executeFarmAction(ctx: FarmActionContext, action: FarmAction): FarmResult {
  const fail = (message: string): FarmResult => ({ ok: false, message });
  if (!ctx.alive) return fail('Cannot farm while dead or absent.');
  const dx = action.target?.dx ?? 0,
    dy = action.target?.dy ?? 0;
  if (!Number.isInteger(dx) || !Number.isInteger(dy) || Math.abs(dx) + Math.abs(dy) > 1)
    return fail('Select the head cell or one adjacent cell.');
  const x = ctx.head.x + dx,
    y = ctx.head.y + dy;
  if (action.action === 'refillCan') {
    if (!ctx.inventory.getItemCount('watering-can') && !ctx.inventory.getItemCount('garden-watering-can'))
      return fail('Requires a watering can.');
    const nearWater = [
      [0, 0],
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ].some(([ox, oy]) => ctx.room.layout[ctx.head.y + oy]?.[ctx.head.x + ox] === '~');
    if (!nearWater && ctx.inventory.getItemCount('farm-water-refill') < 1)
      return fail('Refill beside water or buy a Water Refill.');
    if (ctx.getCharges() >= 8) return fail('Watering can is full.');
    if (!nearWater) ctx.inventory.removeItem('farm-water-refill');
    ctx.setCharges(8);
    return { ok: true, message: 'Watering can refilled: 8/8.' };
  }
  if (x < 0 || y < 0 || y >= ctx.room.layout.length || x >= (ctx.room.layout[y]?.length ?? 0))
    return fail('Target is outside this room.');
  const claim = ctx.construction.getClaim(ctx.room.id);
  const harvest = action.action === 'harvest';
  if (claim && !ctx.construction.can(ctx.room.id, ctx.playerId, harvest ? 'harvest' : 'farm'))
    return fail(`Foreign claim: ${harvest ? 'harvest' : 'farm'} permission required.`);
  const municipal = Boolean(ctx.room.town || ctx.room.townPerimeter);
  if (municipal && !ctx.canFarmMunicipal(x, y, harvest))
    return fail('Cannot farm: this is town land; mayor or community-bed permission required.');
  if (ctx.room.village || ctx.room.goblinCamp) return fail('Settlement permission required.');
  const cell = ctx.farms.get(ctx.room.id, x, y);
  const structure = ctx.construction.getStructureAt(ctx.room.id, x, y);
  const greenhouse = farmShelter(ctx.construction, ctx.room.id, {
    x,
    y,
    substrate: 'artificial',
    fertility: 70,
    moisture: 40,
    weeds: 0,
    revision: 0,
  }).greenhouse;
  const annex =
    ctx.room.id === '0,-1,0' &&
    ctx.farms.hasAnnex(ctx.playerId) &&
    cell?.substrate === 'artificial' &&
    cell.annexOwnerId === ctx.playerId;
  if (!isWildernessRoom(ctx.room) && !municipal && !annex)
    return fail('This special room is not farmland.');
  if (structure && !greenhouse) return fail('Cannot farm through a structure.');
  if (ctx.occupied(x, y)) return fail('Target is occupied by another actor.');
  if (!greenhouse && !annex && resolveSoilSubstrate(ctx.room, x, y, Boolean(cell)) === undefined)
    return fail('Unsuitable or protected terrain.');
  if (action.action === 'inspect')
    return {
      ok: true,
      message: cell
        ? describeFarmCell(cell, greenhouse || annex)
        : 'Untilled natural ground. Till with a hoe; no deed required.',
    };
  if (action.action === 'till') {
    if (!ctx.inventory.getItemCount('farm-hoe'))
      return fail('Requires a hoe (general merchant, 12 score).');
    if (cell) {
      if (cell.crop) return fail('A crop is already here; clear it deliberately.');
      if (cell.weeds > 0) {
        cell.weeds = 0;
        ctx.farms.touch(ctx.room.id, cell);
        return { ok: true, message: 'Weeds removed with the hoe.' };
      }
      return { ok: true, message: 'Already tilled; no charge.' };
    }
    const substrate = greenhouse ? 'artificial' : resolveSoilSubstrate(ctx.room, x, y);
    if (!substrate) return fail('Unsuitable ground.');
    if (!ctx.farms.till(ctx.room.id, ctx.room.biomeId, x, y, substrate))
      return fail('This room has reached its 200-cell farm limit.');
    ctx.room.vegetation = ctx.room.vegetation?.filter((cover) => cover.x !== x || cover.y !== y);
    return { ok: true, message: 'Soil tilled. No score or deed required.' };
  }
  if (!cell) return fail('Till this cell first.');
  if (action.action === 'toggleGate' || action.action === 'reinforce')
    return fail('Use the authoritative structure interaction.');
  switch (action.action) {
    case 'plant': {
      const def = CROPS.find((crop) => crop.seedItemId === action.seedItemId);
      if (!def) return fail('Choose registered crop seeds.');
      if (cell.crop) return fail('A crop already occupies this cell.');
      if (!greenhouse && !annex && !def.seasons.includes(ctx.climate.season))
        return fail(`Requires ${def.seasons.join(' or ')} outdoors.`);
      if (def.specialty === 'magic' && !cell.magicBed)
        return fail('Requires luminous substrate (apply from Farming).');
      if (def.specialty === 'ash' && cell.substrate !== 'ash' && !cell.magicBed)
        return fail('Requires ash soil or a prepared specialty bed.');
      if (ctx.inventory.getItemCount(def.seedItemId) < 1) return fail('Missing seed.');
      ctx.inventory.removeItem(def.seedItemId);
      ctx.farms.plant(cell, def.id, ctx.playerId);
      break;
    }
    case 'water':
      if ((!ctx.inventory.getItemCount('watering-can') &&
          !ctx.inventory.getItemCount('garden-watering-can')) || ctx.getCharges() < 1)
        return fail('Requires a charged watering can. Refill beside water or use a refill.');
      ctx.setCharges(ctx.getCharges() - 1);
      cell.moisture = Math.min(100, cell.moisture + 50);
      break;
    case 'harvest': {
      if (cell.crop?.stage !== 'ready') return fail('Not ready or already harvested.');
      const def = CROPS.find((crop) => crop.id === cell.crop?.cropId);
      if (!def) return fail('Unknown crop.');
      const item = produceItem(def, ctx.farms.quality(cell));
      if (def.regrowDays) {
        cell.crop.progress = 0;
        cell.crop.stage = 'young';
        cell.crop.regrowCount++;
        cell.crop.care = 0;
        cell.crop.exposure = 0;
      } else delete cell.crop;
      cell.fertility = Math.max(0, cell.fertility - 5);
      ctx.inventory.addItem(item, def.yield);
      ctx.farms.touch(ctx.room.id, cell);
      return { ok: true, message: `Harvested ${def.yield} ${def.label}: ${item}.` };
    }
    case 'clear':
      if (cell.crop && cell.crop.stage !== 'withered' && !action.confirmed)
        return fail('Confirm clearing the living crop; no produce will be awarded.');
      delete cell.crop;
      break;
    case 'weed':
      cell.weeds = 0;
      break;
    case 'compost':
      const compost = ctx.inventory.getItemCount('farm-compost') > 0
        ? 'farm-compost' : 'garden-fertilizer';
      if (ctx.inventory.getItemCount(compost) < 1) return fail('Requires compost.');
      ctx.inventory.removeItem(compost);
      cell.fertility = Math.min(100, cell.fertility + 25);
      break;
    case 'magicBed':
      if (cell.magicBed) return fail('Specialty substrate already installed.');
      if (ctx.inventory.getItemCount('farm-magic-bed') < 1)
        return fail('Requires luminous substrate.');
      ctx.inventory.removeItem('farm-magic-bed');
      cell.magicBed = true;
      break;
  }
  ctx.farms.touch(ctx.room.id, cell);
  return { ok: true, message: describeFarmCell(cell, greenhouse || annex) };
}
export function describeFarmCell(cell: FarmCell, greenhouse: boolean): string {
  const crop = cell.crop && CROPS.find((crop) => crop.id === cell.crop?.cropId);
  const remaining =
    crop && cell.crop
      ? (
          (1 - cell.crop.progress) *
          (cell.crop.regrowCount ? (crop.regrowDays ?? crop.growDays) : crop.growDays)
        ).toFixed(2)
      : undefined;
  return `${cell.crop ? `${cell.crop.cropId} — ${cell.crop.stage} (${Math.floor(cell.crop.progress * 100)}%), health ${Math.round(cell.crop.health)}; ${remaining} baseline world days remaining (water/soil/climate affect the estimate)` : 'Tilled soil'}; moisture ${Math.round(cell.moisture)}, fertility ${Math.round(cell.fertility)}, invasive weeds ${Math.round(cell.weeds)}.${cell.moisture < 15 ? ' Drought: growth paused.' : ''}${greenhouse ? ' Greenhouse: neutral all-season climate; no rain watering.' : ''}`;
}
