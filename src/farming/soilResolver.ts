import type { RoomSnapshot } from '../world/types.js';
import { getBiomeDefinition } from '../world/biomes.js';
import type { SoilSubstrate } from './farmingTypes.js';

export function isWildernessRoom(room: RoomSnapshot): boolean {
  const coordinate = /^-?\d+,-?\d+,0$/.test(room.id);
  return (
    coordinate &&
    room.id !== '0,-1,0' &&
    !room.town &&
    !room.townPerimeter &&
    !room.village &&
    !room.goblinCamp &&
    !room.layer &&
    !room.cave &&
    !room.bulletTrainStation &&
    !room.rollercoasterStation &&
    !room.roadsideMonument
  );
}
/** Base terrain stays immutable; ordinary floor alone does not establish municipal soil. */
export function resolveSoilSubstrate(
  room: RoomSnapshot,
  x: number,
  y: number,
  cultivated = false,
): SoilSubstrate | undefined {
  if (
    !Number.isInteger(x) ||
    !Number.isInteger(y) ||
    x < 0 ||
    y < 0 ||
    y >= room.layout.length ||
    x >= (room.layout[y]?.length ?? 0)
  )
    return undefined;
  const tile = room.layout[y]?.[x];
  if (tile !== '.') return undefined;
  if (room.layer || room.cave || room.id === '0,-1,0') return undefined;
  if (
    room.portals.some((cell) => cell.x === x && cell.y === y) ||
    room.layerEntrances?.some((cell) => cell.x === x && cell.y === y) ||
    room.caveEntrances?.some((cell) => cell.x === x && cell.y === y)
  )
    return undefined;
  if (
    room.bulletTrainStation ||
    room.rollercoasterStation ||
    room.koiPond ||
    room.lavenderFarm ||
    room.molemanDigSite ||
    room.roadsideMonument
  )
    return undefined;
  const vegetation = room.vegetation?.find((cell) => cell.x === x && cell.y === y);
  if (
    vegetation &&
    !vegetation.variant.startsWith('grass-') &&
    !vegetation.variant.startsWith('flower-')
  )
    return undefined;
  if (
    room.town?.buildings.some(
      (building) =>
        building.roomId === room.id &&
        x >= building.bounds.left &&
        y >= building.bounds.top &&
        x < building.bounds.left + building.bounds.width &&
        y < building.bounds.top + building.bounds.height,
    )
  )
    return undefined;
  if ((room.town || room.townPerimeter) && !vegetation?.variant.startsWith('grass-') && !cultivated)
    return undefined;
  const biome = getBiomeDefinition(room.biomeId);
  if (biome.family === 'ocean' || biome.family === 'cave') return undefined;
  if (biome.tags.includes('hot') && biome.tags.includes('dry'))
    return biome.id.includes('ember') || biome.id.includes('ash') ? 'ash' : 'dry';
  if (biome.tags.includes('wet') || biome.tags.includes('humid')) return 'rich';
  return 'loam';
}
