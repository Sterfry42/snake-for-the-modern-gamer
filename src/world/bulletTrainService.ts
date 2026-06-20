import type { RandomGenerator } from '../core/rng.js';
import type {
  BulletTrainDecoration,
  BulletTrainDestination,
  BulletTrainDestinationChoice,
  BulletTrainStation,
} from './bulletTrainTypes.js';
import type { RoomSnapshot } from './types.js';

const BULLET_TRAIN_ENTRANCE_TILE = '@';
const BULLET_TRAIN_STATION_CHANCE = 0.60;
const MIN_DESTINATIONS = 2;
const MAX_DESTINATIONS = 4;

const JADE_PEAK_FLAVOR_TEXTS: string[] = [
  'Mist clings to the terraced slopes. The train hums to a stop.',
  'Through the window: silk fields stretching to the horizon.',
  'A rickety bridge sways over a gorge. The train slows.',
  'Red lanterns sway overhead. The station smells of incense.',
  'A hidden garden blooms on the mountainside. Peaceful.',
  'Cherry blossoms drift past the windows like pink snow.',
  'The mountain air is thin and sharp. You can see forever.',
  'Stone steps lead up from the platform into mist.',
  'A paper crane lands on the platform edge, then takes flight.',
  'The train groans to a halt between two towering peaks.',
  'Steam rises from hot springs near the platform.',
  'Bamboo sways in the wind. The station is quiet.',
];

const JADE_PEAK_DISPLAY_NAMES: string[] = [
  'Terraced Slopes',
  'Silk Fields',
  'Gorge Crossing',
  'Lantern District',
  'Hidden Garden',
  'Cherry Blossom Hill',
  'Mountain Summit',
  'Mist Stone Steps',
  'Paper Crane Plaza',
  'Twin Peaks',
  'Hot Springs',
  'Bamboo Grove',
];

/** Find contiguous blocks of floor tiles in a room layout. */
function findContiguousFloorBlocks(layout: string[][], minSize: number): Array<{ tiles: Array<{ x: number; y: number }>; count: number }> {
  const visited = new Set<string>();
  const blocks: Array<{ tiles: Array<{ x: number; y: number }>; count: number }> = [];

  function floodFill(startX: number, startY: number): Array<{ x: number; y: number }> {
    const tiles: Array<{ x: number; y: number }> = [];
    const queue: Array<{ x: number; y: number }> = [{ x: startX, y: startY }];
    const key = `${startX},${startY}`;
    visited.add(key);

    while (queue.length > 0) {
      const { x, y } = queue.shift()!;
      tiles.push({ x, y });

      const neighbors = [
        { x: x + 1, y }, { x: x - 1, y },
        { x, y: y + 1 }, { x, y: y - 1 },
      ];

      for (const n of neighbors) {
        if (n.x < 0 || n.y < 0 || n.y >= layout.length || n.x >= layout[0].length) continue;
        const nk = `${n.x},${n.y}`;
        if (visited.has(nk)) continue;
        const tile = layout[n.y]?.[n.x];
        if (tile !== '.' && tile !== BULLET_TRAIN_ENTRANCE_TILE) continue;
        visited.add(nk);
        queue.push(n);
      }
    }
    return tiles;
  }

  for (let y = 0; y < layout.length; y++) {
    for (let x = 0; x < layout[y].length; x++) {
      const key = `${x},${y}`;
      if (visited.has(key)) continue;
      const tile = layout[y][x];
      if (tile !== '.' && tile !== BULLET_TRAIN_ENTRANCE_TILE) continue;
      const tiles = floodFill(x, y);
      if (tiles.length >= minSize) {
        blocks.push({ tiles, count: tiles.length });
      }
    }
  }
  return blocks;
}

/** Find tiles near a room edge (within maxDistance tiles of a wall). */
function findEdgeTiles(layout: string[][], maxDistance: number): Array<{ x: number; y: number }> {
  const tiles: Array<{ x: number; y: number }> = [];
  const rows = layout.length;
  const cols = layout[0]?.length ?? 0;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const tile = layout[y][x];
      if (tile !== '.' && tile !== BULLET_TRAIN_ENTRANCE_TILE) continue;

      const distToEdge = Math.min(x, y, cols - 1 - x, rows - 1 - y);
      if (distToEdge <= maxDistance) {
        tiles.push({ x, y });
      }
    }
  }
  return tiles;
}

/** Generate a unique station ID from a room ID. */
export function generateStationId(roomId: string): string {
  return `bullet-train:${roomId}`;
}

/** Generate decorations for a station entrance deterministically. */
export function generateDecorations(entranceX: number, entranceY: number, rng: RandomGenerator): BulletTrainDecoration[] {
  const decorations: BulletTrainDecoration[] = [];

  // Lanterns flanking the entrance
  const lanternColors = [0xff4444, 0xff6644, 0xffaa22, 0xff8844];
  decorations.push({
    type: 'lantern',
    x: entranceX - 1,
    y: entranceY,
    color: lanternColors[Math.floor(rng() * lanternColors.length)],
  });
  decorations.push({
    type: 'lantern',
    x: entranceX + 1,
    y: entranceY,
    color: lanternColors[Math.floor(rng() * lanternColors.length)],
  });

  // Ticket booth at a corner
  const boothX = entranceX - 2;
  const boothY = entranceY - 1;
  decorations.push({ type: 'ticket-booth', x: boothX, y: boothY });

  // Bench facing the platform
  const benchFacing: 'north' | 'south' = rng() > 0.5 ? 'north' : 'south';
  decorations.push({
    type: 'bench',
    x: entranceX,
    y: entranceY + (benchFacing === 'south' ? 2 : -2),
    facing: benchFacing,
  });

  // Directional sign
  decorations.push({
    type: 'sign',
    x: entranceX,
    y: entranceY - 1,
    text: 'Jade Peak Express',
  });

  // Platform edge markers
  for (let dx = -3; dx <= 3; dx++) {
    if (dx === 0) continue;
    decorations.push({
      type: 'platform-edge',
      x: entranceX + dx,
      y: entranceY,
    });
  }

  return decorations;
}

/** Generate destination pool for a station. */
export function generateDestinations(
  nearbyRooms: RoomSnapshot[],
  rng: RandomGenerator,
  excludeRoomIds: Set<string>,
): BulletTrainDestination[] {
  const destinations: BulletTrainDestination[] = [];
  const usedFlavors = new Set<string>();
  const usedNames = new Set<string>();

  for (const room of nearbyRooms) {
    if (excludeRoomIds.has(room.id)) continue;

    // Find a good exit tile (near center or on an edge that connects to portals)
    const layout = room.layout;
    const rows = layout.length;
    const cols = layout[0]?.length ?? 0;

    // Prefer tiles near portals or center
    let exitX = Math.floor(cols / 2);
    let exitY = Math.floor(rows / 2);

    // Check if there are portals and pick a tile near one
    if (room.portals && room.portals.length > 0) {
      const portal = room.portals[Math.floor(rng() * room.portals.length)];
      exitX = portal.x;
      exitY = portal.y;
    }

    // Make sure the exit tile is walkable
    if (exitY >= 0 && exitY < rows && exitX >= 0 && exitX < cols) {
      const tile = layout[exitY]?.[exitX];
      if (tile === '.' || tile === BULLET_TRAIN_ENTRANCE_TILE) {
        // Assign a unique flavor text
        let flavor: string;
        if (JADE_PEAK_FLAVOR_TEXTS.length > usedFlavors.size) {
          flavor = JADE_PEAK_FLAVOR_TEXTS[usedFlavors.size];
        } else {
          flavor = `The train arrives at ${room.id}.`;
        }
        usedFlavors.add(flavor);

        // Assign a unique display name
        let name: string;
        if (JADE_PEAK_DISPLAY_NAMES.length > usedNames.size) {
          name = JADE_PEAK_DISPLAY_NAMES[usedNames.size];
        } else {
          name = room.id;
        }
        usedNames.add(name);

        // Parse coordinates from room ID
        const parts = room.id.split(',').map(Number);
        const coordStr = `(${parts[0] ?? 0}, ${parts[1] ?? 0}, ${parts[2] ?? 0})`;

        destinations.push({
          roomId: room.id,
          exitX,
          exitY,
          arrivalFlavor: flavor,
          displayName: name,
          weight: 1,
          condition: 'any',
          coordinates: coordStr,
        });
      }
    }
  }

  return destinations;
}

/** Generate a station for a Jade Peak room. */
export function createBulletTrainStation(
  roomId: string,
  layout: string[][],
  rng: RandomGenerator,
): BulletTrainStation | null {
  // Check chance
  if (rng() >= BULLET_TRAIN_STATION_CHANCE) return null;

  // Find contiguous floor blocks
  const blocks = findContiguousFloorBlocks(layout, 8);
  if (blocks.length === 0) return null;

  // Pick the largest block
  blocks.sort((a, b) => b.count - a.count);
  const block = blocks[0];

  // Find edge tiles within the block
  const edgeTiles = findEdgeTiles(layout, 3).filter(
    (t) => block.tiles.some((bt) => bt.x === t.x && bt.y === t.y),
  );

  if (edgeTiles.length === 0) return null;

  // Pick a random edge tile for the entrance
  const entrance = edgeTiles[Math.floor(rng() * edgeTiles.length)];

  // Stamp the entrance tile
  layout[entrance.y][entrance.x] = BULLET_TRAIN_ENTRANCE_TILE;

  const station: BulletTrainStation = {
    entranceX: entrance.x,
    entranceY: entrance.y,
    stationId: generateStationId(roomId),
    destinations: [],
    used: false,
    decorations: [],
  };

  station.decorations = generateDecorations(entrance.x, entrance.y, rng);

  return station;
}

/** Generate transit room IDs for a bullet train journey. */
export function generateTransitRooms(
  stationRoomId: string,
  destinationRoomId: string,
  rng: RandomGenerator,
): string[] {
  const transitRooms: string[] = [];
  const count = 1 + Math.floor(rng() * 2); // 1-2 transit rooms

  for (let i = 0; i < count; i++) {
    const transitId = `transit:${stationRoomId}:${destinationRoomId}:${i}`;
    transitRooms.push(transitId);
  }

  return transitRooms;
}

/** Build a weighted list of destination choices for the player to pick from. */
export function buildDestinationChoices(
  destinations: BulletTrainDestination[],
  rng: RandomGenerator,
): BulletTrainDestinationChoice[] {
  return destinations.map((d) => ({
    roomId: d.roomId,
    displayName: d.displayName,
    arrivalFlavor: d.arrivalFlavor,
    exitX: d.exitX,
    exitY: d.exitY,
    weight: d.weight,
  }));
}

export { BULLET_TRAIN_STATION_CHANCE, MIN_DESTINATIONS, MAX_DESTINATIONS };
