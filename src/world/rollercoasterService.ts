import type { RandomGenerator } from '../core/rng.js';
import type {
  RollercoasterCarVisual,
  RollercoasterDestination,
  RollercoasterDestinationChoice,
  RollercoasterJourney,
  RollercoasterStation,
  RollercoasterTheme,
  RollercoasterTrackSegment,
} from './rollercoasterTypes.js';
import type { RoomSnapshot } from './types.js';

const ROLLERCOASTER_ENTRANCE_TILE = 'C';
const ROLLERCOASTER_STATION_CHANCE = 0.25;
const MIN_DESTINATIONS = 2;
const MAX_DESTINATIONS = 4;

// === THEME CONFIG ===
const THEME_CONFIG: Record<RollercoasterTheme, { name: string; colors: number[] }> = {
  'thunder-ridge': {
    name: 'Thunder Ridge',
    colors: [0x8b4513, 0xa0522d, 0xcd853f, 0xd2691e],
  },
  'neon-nights': {
    name: 'Neon Nights',
    colors: [0xff00ff, 0x00ffff, 0xffff00, 0xff4400],
  },
  'jungle-jolt': {
    name: 'Jungle Jolt',
    colors: [0x228b22, 0x32cd32, 0x8b8000, 0x6b8e23],
  },
  'arctic-avalanche': {
    name: 'Arctic Avalanche',
    colors: [0x87ceeb, 0xb0e0e6, 0xadd8e6, 0xe0ffff],
  },
  'volcanic-veer': {
    name: 'Volcanic Veer',
    colors: [0xff4500, 0xff6347, 0xffd700, 0xff8c00],
  },
  'cosmic-corkscrew': {
    name: 'Cosmic Corkscrew',
    colors: [0x9370db, 0xba55d3, 0x7b68ee, 0x6a5acd],
  },
};

// === STATION NAMES ===
const STATION_NAMES: Record<RollercoasterTheme, string[]> = {
  'thunder-ridge': [
    'Thunder Ridge Coaster',
    'Mountain Madness',
    'Eagle\'s Descent',
    'Granite Rush',
    'Summit Scream',
  ],
  'neon-nights': [
    'Neon Nightmare',
    'Cyber Loop',
    'Electric Express',
    'Neon Nexus',
    'Pixel Plunge',
  ],
  'jungle-jolt': [
    'Jungle Jolt',
    'Temple Terror',
    'Vine Swing',
    'Serpent\'s Coil',
    'Lost Temple Loop',
  ],
  'arctic-avalanche': [
    'Arctic Avalanche',
    'Frost Flip',
    'Glacier Glide',
    'Iceberg Inferno',
    'Blizzard Blast',
  ],
  'volcanic-veer': [
    'Volcanic Veer',
    'Lava Loop',
    'Magma Madness',
    'Pyro Plunge',
    'Inferno Invader',
  ],
  'cosmic-corkscrew': [
    'Cosmic Corkscrew',
    'Star Spinner',
    'Nebula Nightmare',
    'Galaxy Grinder',
    'Astro Assault',
  ],
};

// === FLAVOR TEXT ===
const ARRIVAL_FLAVORS: Record<RollercoasterTheme, string[]> = {
  'thunder-ridge': [
    'The coaster screeches to a halt. Wind still howls in your ears.',
    'You slam into the station platform, heart pounding. Worth it.',
    'The coaster groans to a stop. Eagles circle overhead.',
    'Dust settles as the coaster locks into place. Your tail is still shaking.',
    'The station bell rings. Another run conquered.',
  ],
  'neon-nights': [
    'Neon lights flicker as the coaster slides into the station.',
    'Holographic signs pulse: "Welcome to the other side."',
    'The coaster hums to a stop beneath a canopy of LEDs.',
    'Electric energy crackles in the air. Another ride done.',
    'The station\'s bass drops. You just survived Neon Nightmare.',
  ],
  'jungle-jolt': [
    'The coaster rattles to a halt among ancient stones.',
    'Vines sway as the coaster settles. Jungle sounds return.',
    'The temple coaster groans. A monkey watches from above.',
    'Dust motes dance in shafts of light. The coaster stops.',
    'The coaster locks into the platform. Jungle heat rushes back in.',
  ],
  'arctic-avalanche': [
    'Ice crystals sparkle as the coaster slides into the station.',
    'The coaster hisses to a halt. Frost forms on the rails.',
    'Snow drifts across the platform. The coaster stops.',
    'The coaster\'s brakes squeal. A cold wind follows it in.',
    'Frost clings to the station. Another avalanche conquered.',
  ],
  'volcanic-veer': [
    'Smoke billows as the coaster slams into the station.',
    'The coaster hisses on hot rails. Lava glows below.',
    'Embers drift past as the coaster comes to rest.',
    'The station shakes as the coaster locks in. Heat radiates.',
    'The coaster groans to a stop. You can feel the magma below.',
  ],
  'cosmic-corkscrew': [
    'Stars swirl in the windows as the coaster docks.',
    'The coaster hums with cosmic energy. Zero-G still affects you.',
    'Nebula colors fade as the coaster settles into the station.',
    'The coaster\'s anti-grav engines whine down. Space is quiet.',
    'Stardust drifts past the platform. Another cosmic ride done.',
  ],
};

const DISPLAY_NAMES: Record<RollercoasterTheme, string[]> = {
  'thunder-ridge': ['Thunder Peak', 'Ridge Runner', 'Eagle\'s Nest', 'Granite Station', 'Summit Stop'],
  'neon-nights': ['Neon District', 'Cyber Hub', 'Electric Avenue', 'Pixel Plaza', 'Neon Nexus'],
  'jungle-jolt': ['Jungle Temple', 'Vine Valley', 'Serpent\'s Lair', 'Lost Ruins', 'Green Station'],
  'arctic-avalanche': ['Frost Station', 'Glacier Point', 'Ice Hollow', 'Blizzard Base', 'Avalanche Alley'],
  'volcanic-veer': ['Lava Station', 'Magma Junction', 'Pyro Port', 'Inferno Isle', 'Volcano View'],
  'cosmic-corkscrew': ['Star Dock', 'Nebula Station', 'Galaxy Gate', 'Astro Hub', 'Cosmic Corner'],
};

/** Find contiguous floor tiles suitable for coaster placement. */
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
        if (tile !== '.' && tile !== ROLLERCOASTER_ENTRANCE_TILE) continue;
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
      if (tile !== '.' && tile !== ROLLERCOASTER_ENTRANCE_TILE) continue;
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
      if (tile !== '.' && tile !== ROLLERCOASTER_ENTRANCE_TILE) continue;

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
  return `rollercoaster:${roomId}`;
}

/** Pick a random theme for the station. */
export function pickTheme(rng: RandomGenerator): RollercoasterTheme {
  const themes: RollercoasterTheme[] = [
    'thunder-ridge',
    'neon-nights',
    'jungle-jolt',
    'arctic-avalanche',
    'volcanic-veer',
    'cosmic-corkscrew',
  ];
  return themes[Math.floor(rng() * themes.length)];
}

/** Generate track segments for a station. */
export function generateTrackSegments(
  entranceX: number,
  entranceY: number,
  rng: RandomGenerator,
): RollercoasterTrackSegment[] {
  const segments: RollercoasterTrackSegment[] = [];
  pickTheme(rng);

  // Station platform at entrance
  segments.push({
    type: 'station-platform' as const,
    x: entranceX,
    y: entranceY,
  });

  // Lift hill going up from the station
  const liftDirection = rng() > 0.5 ? ('up' as const) : ('down' as const);
  segments.push({
    type: 'lift-hill' as const,
    x: entranceX + (liftDirection === 'up' ? 3 : -3),
    y: entranceY,
    direction: liftDirection,
  });

  // A drop after the lift
  segments.push({
    type: 'drop' as const,
    x: entranceX + (liftDirection === 'up' ? 7 : -7),
    y: entranceY,
    height: 2 + Math.floor(rng() * 3),
  });

  // A loop or curve
  if (rng() > 0.3) {
    segments.push({
      type: 'loop' as const,
      x: entranceX + (liftDirection === 'up' ? 10 : -10),
      y: entranceY,
      size: 2,
    });
  } else {
    segments.push({
      type: 'curve' as const,
      x: entranceX + (liftDirection === 'up' ? 10 : -10),
      y: entranceY,
      radius: 3,
      arc: Math.PI * 0.75,
    });
  }

  // Bridge over a gap
  if (rng() > 0.4) {
    segments.push({
      type: 'bridge' as const,
      x: entranceX + (liftDirection === 'up' ? 13 : -13),
      y: entranceY,
      length: 4,
    });
  }

  // Straight track connecting segments
  segments.push({
    type: 'straight' as const,
    x: entranceX + (liftDirection === 'up' ? 5 : -5),
    y: entranceY,
    length: 6,
    direction: 'horizontal' as const,
  });

  return segments;
}

/** Generate car visual properties for a theme and RNG. */
export function generateCarVisual(theme: RollercoasterTheme, rng: RandomGenerator): RollercoasterCarVisual {
  const themeColors = THEME_CONFIG[theme].colors;
  const bodyColor = themeColors[Math.floor(rng() * themeColors.length)];
  const stripeColor = themeColors[(Math.floor(rng() * themeColors.length) + 1) % themeColors.length];

  return {
    bodyColor,
    stripeColor,
    wheelColor: 0x333333,
    seatColor: 0x555555,
  };
}

/** Generate a station name for a theme. */
export function generateStationName(theme: RollercoasterTheme, rng: RandomGenerator): string {
  const names = STATION_NAMES[theme];
  return names[Math.floor(rng() * names.length)];
}

/** Generate destinations for a coaster station. */
export function generateDestinations(
  nearbyRooms: RoomSnapshot[],
  rng: RandomGenerator,
  excludeRoomIds: Set<string>,
): RollercoasterDestination[] {
  const destinations: RollercoasterDestination[] = [];
  const usedFlavors = new Set<string>();
  const usedNames = new Set<string>();

  for (const room of nearbyRooms) {
    if (excludeRoomIds.has(room.id)) continue;

    const layout = room.layout;
    const rows = layout.length;
    const cols = layout[0]?.length ?? 0;

    let exitX = Math.floor(cols / 2);
    let exitY = Math.floor(rows / 2);

    if (room.portals && room.portals.length > 0) {
      const portal = room.portals[Math.floor(rng() * room.portals.length)];
      exitX = portal.x;
      exitY = portal.y;
    }

    if (exitY >= 0 && exitY < rows && exitX >= 0 && exitX < cols) {
      const tile = layout[exitY]?.[exitX];
      if (tile === '.' || tile === ROLLERCOASTER_ENTRANCE_TILE) {
        let flavor: string;
        if (ARRIVAL_FLAVORS['thunder-ridge'].length > usedFlavors.size) {
          flavor = ARRIVAL_FLAVORS['thunder-ridge'][usedFlavors.size % ARRIVAL_FLAVORS['thunder-ridge'].length];
        } else {
          flavor = `The coaster arrives at ${room.id}.`;
        }
        usedFlavors.add(flavor);

        let name: string;
        if (DISPLAY_NAMES['thunder-ridge'].length > usedNames.size) {
          name = DISPLAY_NAMES['thunder-ridge'][usedNames.size % DISPLAY_NAMES['thunder-ridge'].length];
        } else {
          name = room.id;
        }
        usedNames.add(name);

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

/** Generate a rollercoaster station for a room. */
export function createRollercoasterStation(
  roomId: string,
  layout: string[][],
  rng: RandomGenerator,
): RollercoasterStation | null {
  if (rng() >= ROLLERCOASTER_STATION_CHANCE) return null;

  const blocks = findContiguousFloorBlocks(layout, 6);
  if (blocks.length === 0) return null;

  blocks.sort((a, b) => b.count - a.count);
  const block = blocks[0];

  const edgeTiles = findEdgeTiles(layout, 3).filter(
    (t) => block.tiles.some((bt) => bt.x === t.x && bt.y === t.y),
  );

  if (edgeTiles.length === 0) return null;

  const entrance = edgeTiles[Math.floor(rng() * edgeTiles.length)];
  const entranceX = entrance.x;
  const entranceY = entrance.y;

  layout[entrance.y][entrance.x] = ROLLERCOASTER_ENTRANCE_TILE;

  const theme = pickTheme(rng);

  const station: RollercoasterStation = {
    entranceX,
    entranceY,
    stationId: generateStationId(roomId),
    destinations: [],
    used: false,
    trackSegments: [],
    stationName: '',
    theme,
  };

  station.trackSegments = generateTrackSegments(entranceX, entranceY, rng);
  station.stationName = generateStationName(theme, rng);

  return station;
}

/** Generate transit room IDs for a rollercoaster journey. */
export function generateTransitRooms(
  stationRoomId: string,
  destinationRoomId: string,
  rng: RandomGenerator,
): string[] {
  const transitRooms: string[] = [];
  const count = 1 + Math.floor(rng() * 2);

  for (let i = 0; i < count; i++) {
    const transitId = `transit:${stationRoomId}:${destinationRoomId}:${i}`;
    transitRooms.push(transitId);
  }

  return transitRooms;
}

/** Build a weighted list of destination choices for the player. */
export function buildDestinationChoices(
  destinations: RollercoasterDestination[],
  _rng: RandomGenerator,
): RollercoasterDestinationChoice[] {
  return destinations.map((d) => ({
    roomId: d.roomId,
    displayName: d.displayName,
    arrivalFlavor: d.arrivalFlavor,
    exitX: d.exitX,
    exitY: d.exitY,
    weight: d.weight,
    coordinates: d.coordinates,
  }));
}

/** Get the speed profile for a coaster ride. */
export function getSpeedProfile(theme: RollercoasterTheme): {
  climbSpeed: number;
  peakSpeed: number;
  brakeSpeed: number;
  totalDuration: number;
} {
  const profiles: Record<RollercoasterTheme, { climbSpeed: number; peakSpeed: number; brakeSpeed: number; totalDuration: number }> = {
    'thunder-ridge': { climbSpeed: 0.3, peakSpeed: 1.0, brakeSpeed: 0.2, totalDuration: 5000 },
    'neon-nights': { climbSpeed: 0.4, peakSpeed: 1.2, brakeSpeed: 0.15, totalDuration: 4500 },
    'jungle-jolt': { climbSpeed: 0.25, peakSpeed: 0.9, brakeSpeed: 0.25, totalDuration: 5500 },
    'arctic-avalanche': { climbSpeed: 0.35, peakSpeed: 1.1, brakeSpeed: 0.3, totalDuration: 4800 },
    'volcanic-veer': { climbSpeed: 0.2, peakSpeed: 1.3, brakeSpeed: 0.1, totalDuration: 4000 },
    'cosmic-corkscrew': { climbSpeed: 0.5, peakSpeed: 1.4, brakeSpeed: 0.2, totalDuration: 5200 },
  };
  return profiles[theme];
}

/** Generate a rollercoaster journey between two rooms. */
export function createRollercoasterJourney(
  stationRoomId: string,
  stationEntranceX: number,
  stationEntranceY: number,
  destinationRoomId: string,
  destinationExitX: number,
  destinationExitY: number,
  theme: RollercoasterTheme,
  rng: RandomGenerator,
): RollercoasterJourney {
  const transitRooms = generateTransitRooms(stationRoomId, destinationRoomId, rng);
  const profile = getSpeedProfile(theme);

  return {
    phase: 'boarding',
    stationRoomId,
    stationEntranceX,
    stationEntranceY,
    destinationRoomId,
    destinationExitX,
    destinationExitY,
    transitRooms,
    transitProgress: 0,
    startedAtMs: Date.now(),
    durationMs: profile.totalDuration,
    maxHeightReached: 0,
    turnsCompleted: 0,
  };
}

export { ROLLERCOASTER_STATION_CHANCE, MIN_DESTINATIONS, MAX_DESTINATIONS, THEME_CONFIG };
