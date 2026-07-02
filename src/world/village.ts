import type { GridConfig } from '../config/gameConfig.js';
import { vectorKey } from '../core/math.js';
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
  'jade-peak-province': [
    'Jade Hollow',
    'Amberwake',
    'The Serene Peak',
    'Mistglade',
    'Blossom Rest',
  ],
  'liberty-badlands': ['Dustfork', 'Eaglegate', 'Bellrock', 'Pie Junction', 'Vacancy Wells'],
  rainforest: ['Rainwake', 'Vine Rest', 'The Green Canopy', 'Frogcross', 'Mist Hollow'],
  'wintergreen-forest': ['Pinewake', 'Frost Rest', 'The Needle Grove', 'Snowcross', 'Winter Hollow'],
  'warm-coast': ['Coral Wake', 'Palm Rest', 'The Shell Parish', 'Lagooncross', 'Sun Hollow'],
  'frozen-sea': ['Ice Wake', 'Floe Rest', 'The White Chapel', 'Glaciercross', 'Brine Hollow'],
  'ember-caverns': ['Coalwake', 'Magma Rest', 'The Red Vault', 'Cindercross', 'Glow Hollow'],
  'fungal-grotto': ['Sporewake', 'Glowcap Rest', 'The Soft Vault', 'Mushcross', 'Grotto Hollow'],
  'root-buried-tunnels': ['Rootwake Below', 'Loam Rest', 'The Underbough', 'Tapcross', 'Burrow Hollow'],
  'ash-steppe': ['Ashwake Flats', 'Soot Rest', 'The Grey Measure', 'Dustcross', 'Steppe Hollow'],
  'neon-underpass': ['Neon Wake', 'Glow Rest', 'The Underpass', 'Tubecross', 'Hotwire Hollow'],
  'glass-desert': ['Prism Wake', 'Shard Rest', 'The Glass Measure', 'Miragecross', 'Sun Hollow'],
  'titan-ribcage': ['Rib Wake', 'Marrow Rest', 'The Bone Nave', 'Ossuarycross', 'Titan Hollow'],
  'radioactive-orchard': ['Glow Wake', 'Rad Rest', 'The Green Orchard', 'Isotopecross', 'Mutant Hollow'],
  'clockwork-quarry': ['Gear Wake', 'Brass Rest', 'The Clock Quarry', 'Cogcross', 'Pendulum Hollow'],
  'provence-valley': ['Lavender Wake', 'Vine Rest', 'The Sunlit Orchard', 'Baguettemeasure', 'Rosse Hollow'],
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
const VILLAGE_ATTEMPTS = 28;
const VILLAGE_MARGIN = 5;
const SAFE_AREA_PADDING = 5;

interface VillagePlacementOptions {
  forbiddenCells?: ReadonlySet<string>;
  margin?: number;
}

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

function canPlaceRect(
  layout: string[][],
  left: number,
  top: number,
  width: number,
  height: number,
  forbiddenCells?: ReadonlySet<string>,
): boolean {
  for (let y = top; y < top + height; y++) {
    for (let x = left; x < left + width; x++) {
      if (layout[y]?.[x] !== '.') {
        return false;
      }
      if (forbiddenCells?.has(vectorKey({ x, y }))) {
        return false;
      }
    }
  }
  return true;
}

export function tryPlaceVillage(
  layout: string[][],
  grid: GridConfig,
  rng: RandomGenerator,
  biomeId: BiomeId,
  options: VillagePlacementOptions = {},
): {
  questGiver: RoomSnapshot['questGiver'];
  village: NonNullable<RoomSnapshot['village']>;
} | null {
  if (grid.cols < 26 || grid.rows < 18) {
    return null;
  }

  const margin = options.margin ?? VILLAGE_MARGIN;
  const plazaWidth = 6;
  const plazaHeight = 4;
  const footprintWidth = 18;
  const footprintHeight = plazaHeight + SAFE_AREA_PADDING * 2;
  const minLeft = margin;
  const minTop = margin;
  const maxLeft = grid.cols - footprintWidth - margin;
  const maxTop = grid.rows - footprintHeight - margin;

  if (maxLeft < minLeft || maxTop < minTop) {
    return null;
  }

  let plaza: { left: number; top: number; width: number; height: number } | null = null;
  for (let attempt = 0; attempt < VILLAGE_ATTEMPTS; attempt += 1) {
    const footprintLeft = minLeft + Math.floor(rng() * (maxLeft - minLeft + 1));
    const footprintTop = minTop + Math.floor(rng() * (maxTop - minTop + 1));
    if (
      !canPlaceRect(
        layout,
        footprintLeft,
        footprintTop,
        footprintWidth,
        footprintHeight,
        options.forbiddenCells,
      )
    ) {
      continue;
    }
    plaza = {
      left: footprintLeft + 6,
      top: footprintTop + SAFE_AREA_PADDING,
      width: plazaWidth,
      height: plazaHeight,
    };
    break;
  }

  if (!plaza) {
    return null;
  }

  const safeArea = {
    left: plaza.left - SAFE_AREA_PADDING,
    top: plaza.top - SAFE_AREA_PADDING,
    width: plaza.width + SAFE_AREA_PADDING * 2,
    height: plaza.height + SAFE_AREA_PADDING * 2,
  };
  fillRect(layout, safeArea.left, safeArea.top, safeArea.width, safeArea.height, 'E');
  fillRect(layout, plaza.left, plaza.top, plaza.width, plaza.height, 'E');

  const lanterns = [
    { x: plaza.left + 1, y: plaza.top + 1 },
    { x: plaza.left + plaza.width - 2, y: plaza.top + 1 },
    { x: plaza.left + 1, y: plaza.top + plaza.height - 2 },
    { x: plaza.left + plaza.width - 2, y: plaza.top + plaza.height - 2 },
  ];
  lanterns.forEach((spot) => setChar(layout, spot.x, spot.y, 'L'));

  drawHouse(layout, plaza.left - 6, plaza.top - 1, 5, 4, 'south');
  drawHouse(layout, plaza.left + plaza.width + 1, plaza.top - 1, 5, 4, 'south');
  drawHouse(layout, plaza.left + 1, plaza.top + plaza.height + 1, 6, 4, 'north');

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
      safeArea,
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
