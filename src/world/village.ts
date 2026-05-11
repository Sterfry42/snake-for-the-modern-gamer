import type { GridConfig } from '../config/gameConfig.js';
import type { RandomGenerator } from '../core/rng.js';
import { buildHouseNpcProfile } from '../npcs/profiles.js';
import type { RoomSnapshot } from './types.js';
import type { BiomeId } from './biomes.js';

const VILLAGE_NAMES: Record<BiomeId, readonly string[]> = {
  'verdigris-basin': ['Verdant Wake', 'Mossbell', 'Reedcross', 'The Green Measure', 'Basin Mercy'],
  'ember-waste': ['Ashwake', 'Cinder Rest', 'The Char Parish', 'Kiln Row', 'Ember Hollow'],
  'moonlit-parish': [
    'Lantern Wake',
    'Moon Chapel',
    'Pale Crossing',
    'The Bent Parish',
    'Silver Hollow',
  ],
  'sable-depths': [
    'Mourning Hollow',
    'Graveside Row',
    'The Black Nave',
    "Sepulcher's Reach",
    'Dusk Reliquary',
  ],
  'gloam-garden': ['Gloam Orchard', 'Rootwake', 'The Bent Arbor', 'Petal Grave', 'Thorn Vigil'],
  'elderwood-maze': ['Briarwake', 'The Green Labyrinth', 'Elder Root', 'Canopy Rest', 'Mossgate'],
  'sunken-ocean': ['Pearl Wake', 'Brine Rest', 'The Salt Chapel', 'Foamcross', 'Tide Hollow'],
  'home-hearth': ['Home Hearth', 'Hearthwake', 'The Quiet Room', 'Lamp Rest', 'Cinder Home'],
} as const;

const VILLAGER_NAMES = [
  'Lindsey',
  'Ryan',
  'Aurex',
  'Belisar',
  'Cyrene',
  'Ilyra',
  'Thalestra',
] as const;

const VILLAGER_PORTRAITS = ['sage-1', 'sage-2', 'sage-3'] as const;
const SHOPKEEPER_NAMES = ['Marlow', 'Penny Coil', 'Brindle', 'Tillia'] as const;

function setChar(layout: string[][], x: number, y: number, ch: string): void {
  if (y < 0 || y >= layout.length) return;
  if (x < 0 || x >= layout[y].length) return;
  layout[y][x] = ch;
}

function fillRect(
  layout: string[][],
  left: number,
  top: number,
  width: number,
  height: number,
  ch: string,
): void {
  for (let y = top; y < top + height; y++) {
    for (let x = left; x < left + width; x++) {
      setChar(layout, x, y, ch);
    }
  }
}

function drawHouse(
  layout: string[][],
  left: number,
  top: number,
  width: number,
  height: number,
  doorSide: 'south' | 'north',
) {
  const right = left + width - 1;
  const bottom = top + height - 1;
  for (let y = top; y <= bottom; y++) {
    for (let x = left; x <= right; x++) {
      const border = x === left || x === right || y === top || y === bottom;
      setChar(layout, x, y, border ? '#' : 'W');
    }
  }
  const cx = Math.floor((left + right) / 2);
  const doorY = doorSide === 'south' ? bottom : top;
  const rugY = doorSide === 'south' ? bottom - 1 : top + 1;
  const trimY = doorSide === 'south' ? bottom - 2 : top + 2;
  setChar(layout, cx, doorY, '.');
  setChar(layout, cx, rugY, 'E');
  setChar(layout, cx, trimY, 'T');
}

function drawMarketStall(layout: string[][], left: number, top: number): void {
  for (let x = left; x < left + 5; x++) {
    setChar(layout, x, top, 'S');
    setChar(layout, x, top + 1, 'A');
    setChar(layout, x, top + 2, 'E');
  }
  setChar(layout, left, top + 2, 'L');
  setChar(layout, left + 4, top + 2, 'L');
}

export function tryPlaceVillage(
  layout: string[][],
  grid: GridConfig,
  rng: RandomGenerator,
  biomeId: BiomeId,
): {
  questGiver: RoomSnapshot['questGiver'];
  village: NonNullable<RoomSnapshot['village']>;
} | null {
  if (grid.cols < 26 || grid.rows < 18) {
    return null;
  }

  const plaza = {
    left: Math.max(4, Math.floor(grid.cols / 2) - 5),
    top: Math.max(4, Math.floor(grid.rows / 2) - 3),
    width: 10,
    height: 6,
  };
  fillRect(layout, plaza.left, plaza.top, plaza.width, plaza.height, 'E');

  const lanterns = [
    { x: plaza.left + 1, y: plaza.top + 1 },
    { x: plaza.left + plaza.width - 2, y: plaza.top + 1 },
    { x: plaza.left + 1, y: plaza.top + plaza.height - 2 },
    { x: plaza.left + plaza.width - 2, y: plaza.top + plaza.height - 2 },
  ];
  lanterns.forEach((spot) => setChar(layout, spot.x, spot.y, 'L'));

  drawHouse(layout, plaza.left - 8, plaza.top - 1, 7, 6, 'south');
  drawHouse(layout, plaza.left + plaza.width + 1, plaza.top - 1, 7, 6, 'south');
  drawHouse(layout, plaza.left + 2, plaza.top + plaza.height + 1, 8, 6, 'north');

  const questSpot = {
    x: plaza.left + Math.floor(plaza.width / 2),
    y: plaza.top + Math.floor(plaza.height / 2),
  };
  setChar(layout, questSpot.x, questSpot.y, 'G');
  const stall = { left: plaza.left + 1, top: plaza.top - 3 };
  drawMarketStall(layout, stall.left, stall.top);
  const shopSpot = { x: stall.left + 2, y: stall.top + 2 };

  const residentSpots = [
    { x: plaza.left + 2, y: plaza.top + 2 },
    { x: plaza.left + plaza.width - 3, y: plaza.top + 2 },
    { x: plaza.left + 2, y: plaza.top + plaza.height - 3 },
    { x: plaza.left + plaza.width - 3, y: plaza.top + plaza.height - 3 },
  ].filter((spot) => spot.x !== questSpot.x || spot.y !== questSpot.y);

  const villagerName = VILLAGER_NAMES[Math.floor(rng() * VILLAGER_NAMES.length)];
  const portraitId = VILLAGER_PORTRAITS[Math.floor(rng() * VILLAGER_PORTRAITS.length)];
  const villageNames = VILLAGE_NAMES[biomeId];
  const villageName = villageNames[Math.floor(rng() * villageNames.length)];
  const residents = residentSpots.slice(0, 3).map((spot, index) => {
    const name =
      VILLAGER_NAMES[
        (Math.floor(rng() * VILLAGER_NAMES.length) + index + 1) % VILLAGER_NAMES.length
      ];
    const residentPortrait =
      VILLAGER_PORTRAITS[
        (Math.floor(rng() * VILLAGER_PORTRAITS.length) + index) % VILLAGER_PORTRAITS.length
      ];
    return {
      ...buildHouseNpcProfile(name, residentPortrait),
      x: spot.x,
      y: spot.y,
    };
  });
  const shopkeeperName = SHOPKEEPER_NAMES[Math.floor(rng() * SHOPKEEPER_NAMES.length)];
  const shopkeeperPortrait = VILLAGER_PORTRAITS[Math.floor(rng() * VILLAGER_PORTRAITS.length)];

  return {
    questGiver: {
      ...buildHouseNpcProfile(villagerName, portraitId),
      x: questSpot.x,
      y: questSpot.y,
    },
    village: {
      name: villageName,
      center: { x: questSpot.x, y: questSpot.y },
      lanterns,
      residents,
      shopkeeper: {
        ...buildHouseNpcProfile(shopkeeperName, shopkeeperPortrait),
        x: shopSpot.x,
        y: shopSpot.y,
      },
    },
  };
}
