import type { WorldConfig } from '../../../config/gameConfig.js';
import { vectorKey } from '../../../core/math.js';
import type { RandomGenerator } from '../../../core/rng.js';
import { buildHouseNpcProfile } from '../../../npcs/profiles.js';
import type { RoomArchetype, RoomArchetypeId, RoomGenerationContext } from '../types.js';

interface WeightedArchetype {
  id: RoomArchetypeId;
  weight: number;
}

const DEFAULT_ARCHETYPE_POOL: WeightedArchetype[] = [
  { id: 'classic', weight: 65 },
  { id: 'open-clearing', weight: 5 },
  { id: 'four-corners', weight: 15 },
  { id: 'choke-point', weight: 15 },
];

const JADE_PEAK_UPPER_POOL: WeightedArchetype[] = [
  { id: 'cherry-garden', weight: 30 },
  { id: 'shrine-courtyard', weight: 10 },
  { id: 'classic', weight: 50 },
  { id: 'open-clearing', weight: 10 },
];

const JADE_PEAK_MID_POOL: WeightedArchetype[] = [
  { id: 'bamboo-thicket', weight: 25 },
  { id: 'shrine-courtyard', weight: 15 },
  { id: 'classic', weight: 40 },
  { id: 'choke-point', weight: 10 },
  { id: 'onsen-village', weight: 10 },
];

const JADE_PEAK_LOWER_POOL: WeightedArchetype[] = [
  { id: 'mountain-pass', weight: 15 },
  { id: 'tatami-dojo', weight: 10 },
  { id: 'bamboo-thicket', weight: 20 },
  { id: 'classic', weight: 35 },
  { id: 'choke-point', weight: 15 },
  { id: 'onsen-village', weight: 5 },
];

const LIBERTY_BADLANDS_POOL: WeightedArchetype[] = [
  { id: 'billboard-maze', weight: 22 },
  { id: 'firework-field', weight: 18 },
  { id: 'monument-plaza', weight: 14 },
  { id: 'motel-pool-ruins', weight: 12 },
  { id: 'interstate-cut', weight: 16 },
  { id: 'gridiron-yard', weight: 8 },
  { id: 'classic', weight: 10 },
];
const BILLBOARD_SLOGANS = [
  'NEXT EXIT: DESTINY, PIE, GAS',
  'HONK IF YOU BELIEVE IN THE PLAQUE',
  'THE EAGLE SAW WHAT YOU DID',
  'VACANCY: PROBABLY',
  'FOURTH QUARTER FOREVER',
] as const;
const ROAD_NAMES = ['Liberty Spur', 'Blue State Route', 'Old Glory Bypass', 'The Long Weekend'] as const;
const MOTEL_POOL_NAMES = ['Vacancy Wells', 'Chlorine Shrine', 'The Last Pool', 'No-Dive Motor Court'] as const;

export class RoomArchetypeOperations {
  constructor(
    private readonly config: WorldConfig,
    private readonly rng: RandomGenerator,
  ) {}

  apply(context: RoomGenerationContext): void {
    const archetype = this.chooseArchetype(context);
    context.archetype = archetype;

    switch (archetype.id) {
      case 'four-corners':
        this.applyFourCorners(context);
        break;
      case 'choke-point':
        this.applyChokePoint(context);
        break;
      case 'cherry-garden':
        this.applyCherryGarden(context);
        break;
      case 'bamboo-thicket':
        this.applyBambooThicket(context);
        break;
      case 'shrine-courtyard':
        this.applyShrineCourtyard(context);
        break;
      case 'onsen-village':
        this.applyOnsenVillage(context);
        break;
      case 'mountain-pass':
        this.applyMountainPass(context);
        break;
      case 'tatami-dojo':
        this.applyTatamiDojo(context);
        break;
      case 'firework-field':
        this.applyFireworkField(context);
        break;
      case 'billboard-maze':
        this.applyBillboardMaze(context);
        break;
      case 'monument-plaza':
        this.applyMonumentPlaza(context);
        break;
      case 'motel-pool-ruins':
        this.applyMotelPoolRuins(context);
        break;
      case 'interstate-cut':
        this.applyInterstateCut(context);
        break;
      case 'gridiron-yard':
        this.applyGridironYard(context);
        break;
      case 'open-clearing':
      case 'classic':
      case 'ocean':
      case 'dense-forest':
        break;
    }
  }

  private chooseArchetype(context: RoomGenerationContext): RoomArchetype {
    if (context.isOcean) {
      return { id: 'ocean', suppressRandomObstacles: true };
    }
    if (context.isDenseForest) {
      return { id: 'dense-forest', suppressRandomObstacles: true };
    }
    if (context.roomId === this.config.originRoomId) {
      return { id: 'classic' };
    }
    if (context.isJadePeak) {
      const [x = 0, y = 0] = context.roomId.split(',').map(Number);
      let pool: WeightedArchetype[];
      if (y === -5 || y === -6) {
        pool = JADE_PEAK_UPPER_POOL;
      } else if (y === -7) {
        pool = JADE_PEAK_MID_POOL;
      } else {
        pool = JADE_PEAK_LOWER_POOL;
      }
      const id = this.weightedChoice(pool);
      return {
        id,
        suppressRandomObstacles: id === 'bamboo-thicket',
      };
    }
    if (context.isLibertyBadlands) {
      const id = this.weightedChoice(LIBERTY_BADLANDS_POOL);
      return {
        id,
        suppressRandomObstacles:
          id === 'billboard-maze' ||
          id === 'gridiron-yard' ||
          id === 'motel-pool-ruins' ||
          id === 'interstate-cut',
      };
    }

    const id = this.weightedChoice(DEFAULT_ARCHETYPE_POOL);
    return {
      id,
      suppressRandomObstacles: id === 'open-clearing',
    };
  }

  private applyFourCorners(context: RoomGenerationContext): void {
    const safe = this.createEntranceRunupCells(context, 5);
    const roomWidth = context.grid.cols;
    const roomHeight = context.grid.rows;
    const width = this.randomIntInRange(4, 7);
    const height = this.randomIntInRange(3, 5);
    const inset = 6;
    const anchors = [
      { left: inset, top: inset },
      { left: roomWidth - inset - width, top: inset },
      { left: inset, top: roomHeight - inset - height },
      { left: roomWidth - inset - width, top: roomHeight - inset - height },
    ];

    for (const anchor of anchors) {
      this.fillRect(context, anchor.left, anchor.top, width, height, '#', safe);
    }
  }

  private applyChokePoint(context: RoomGenerationContext): void {
    const safe = this.createEntranceRunupCells(context, 5);
    const vertical = this.rng() < 0.5;
    const gapSize = 5 + this.randomInt(3);

    if (vertical) {
      const wallX = Math.floor(context.grid.cols / 2) - 1 + this.randomInt(3);
      const gapTop = 7 + this.randomInt(Math.max(1, context.grid.rows - 14 - gapSize));
      for (let y = 5; y < context.grid.rows - 5; y += 1) {
        if (y >= gapTop && y < gapTop + gapSize) {
          continue;
        }
        this.fillRect(context, wallX, y, 2, 1, '#', safe);
      }
      return;
    }

    const wallY = Math.floor(context.grid.rows / 2) - 1 + this.randomInt(3);
    const gapLeft = 7 + this.randomInt(Math.max(1, context.grid.cols - 14 - gapSize));
    for (let x = 5; x < context.grid.cols - 5; x += 1) {
      if (x >= gapLeft && x < gapLeft + gapSize) {
        continue;
      }
      this.fillRect(context, x, wallY, 1, 2, '#', safe);
    }
  }

  private applyCherryGarden(context: RoomGenerationContext): void {
    const safe = this.createEntranceRunupCells(context, 4);
    const roomWidth = context.grid.cols;
    const roomHeight = context.grid.rows;
    const petalCount = Math.floor((roomWidth * roomHeight) * 0.08);
    let placed = 0;
    let attempts = 0;
    while (placed < petalCount && attempts < petalCount * 5) {
      const x = 2 + this.randomInt(Math.max(1, roomWidth - 4));
      const y = 2 + this.randomInt(Math.max(1, roomHeight - 4));
      const key = vectorKey({ x, y });
      if (!context.layout[y]?.[x] || context.layout[y][x] === '.') {
        if (!safe.has(key)) {
          context.canvas.set(x, y, 'P');
          placed++;
        }
      }
      attempts++;
    }
    const lanternCount = 1 + this.randomInt(2);
    let lanternsPlaced = 0;
    let lanternAttempts = 0;
    while (lanternsPlaced < lanternCount && lanternAttempts < 50) {
      const x = 3 + this.randomInt(Math.max(1, roomWidth - 6));
      const y = 3 + this.randomInt(Math.max(1, roomHeight - 6));
      const key = vectorKey({ x, y });
      if (context.layout[y]?.[x] === '.' && !safe.has(key)) {
        context.canvas.set(x, y, 'L');
        lanternsPlaced++;
      }
      lanternAttempts++;
    }
  }

  private applyBambooThicket(context: RoomGenerationContext): void {
    const safe = this.createEntranceRunupCells(context, 4);
    const roomWidth = context.grid.cols;
    const roomHeight = context.grid.rows;
    const wallCount = 2 + this.randomInt(3);
    for (let w = 0; w < wallCount; w++) {
      const startX = 3 + this.randomInt(Math.max(1, roomWidth - 8));
      const height = Math.floor(roomHeight * 0.4) + this.randomInt(Math.floor(roomHeight * 0.3));
      const wallLength = 3 + this.randomInt(3);
      for (let i = 0; i < wallLength && (startX + i) < roomWidth - 2; i++) {
        const y = 3 + this.randomInt(Math.max(1, roomHeight - 8));
        const key = vectorKey({ x: startX + i, y });
        if (!safe.has(key)) {
          context.canvas.set(startX + i, y, 'B');
        }
      }
    }
    const corridorWidth = 2 + this.randomInt(2);
    const corridorX = Math.floor(roomWidth / 2) - Math.floor(corridorWidth / 2);
    for (let x = corridorX; x < corridorX + corridorWidth; x++) {
      const key = vectorKey({ x, y: Math.floor(roomHeight / 2) });
      if (!safe.has(key)) {
        context.canvas.set(x, Math.floor(roomHeight / 2), '.');
      }
    }
  }

  private applyShrineCourtyard(context: RoomGenerationContext): void {
    const safe = this.createEntranceRunupCells(context, 4);
    const roomWidth = context.grid.cols;
    const roomHeight = context.grid.rows;
    const midY = Math.floor(roomHeight / 2);
    const shrineWidth = 6 + this.randomInt(3);
    const shrineHeight = 4 + this.randomInt(2);
    const shrineLeft = Math.floor((roomWidth - shrineWidth) / 2);
    const shrineTop = 2;
    const courtyardTop = shrineTop + shrineHeight + 2;
    for (let y = shrineTop; y < shrineTop + shrineHeight; y++) {
      for (let x = shrineLeft; x < shrineLeft + shrineWidth; x++) {
        const key = vectorKey({ x, y });
        if (!safe.has(key)) {
          context.canvas.set(x, y, '#');
        }
      }
    }
    const toriiPillarWidth = 1;
    const pillarSpacing = shrineWidth - 1;
    const pillar1X = shrineLeft + 1;
    const pillar2X = shrineLeft + pillarSpacing;
    for (let y = shrineTop - 2; y < shrineTop; y++) {
      for (let px = 0; px < toriiPillarWidth; px++) {
        const key1 = vectorKey({ x: pillar1X + px, y });
        const key2 = vectorKey({ x: pillar2X + px, y });
        if (!safe.has(key1) && y >= 0) {
          context.canvas.set(pillar1X + px, y, 'T');
        }
        if (!safe.has(key2) && y >= 0) {
          context.canvas.set(pillar2X + px, y, 'T');
        }
      }
    }
    const beamY = shrineTop - 2;
    for (let x = pillar1X; x <= pillar2X; x++) {
      const key = vectorKey({ x, y: beamY });
      if (!safe.has(key) && beamY >= 0) {
        context.canvas.set(x, beamY, 'T');
      }
    }
    for (let y = courtyardTop; y < Math.min(courtyardTop + 3, roomHeight - 2); y++) {
      for (let x = 2; x < roomWidth - 2; x++) {
        const key = vectorKey({ x, y });
        if (!safe.has(key)) {
          context.canvas.set(x, y, 'E');
        }
      }
    }
  }

  private applyOnsenVillage(context: RoomGenerationContext): void {
    const safe = new Set<string>();
    const roomWidth = context.grid.cols;
    const roomHeight = context.grid.rows;
    const poolCenterX = Math.floor(roomWidth / 2);
    const poolCenterY = Math.floor(roomHeight / 2);
    const poolRadius = 3 + this.randomInt(2);
    for (let y = 0; y < roomHeight; y++) {
      for (let x = 0; x < roomWidth; x++) {
        const dx = x - poolCenterX;
        const dy = y - poolCenterY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= poolRadius) {
          const key = vectorKey({ x, y });
          if (!safe.has(key)) {
            context.canvas.set(x, y, 'O');
          }
        }
      }
    }
    const bathhouseLeft = poolCenterX + poolRadius + 2;
    const bathhouseTop = poolCenterY - 2;
    const bathhouseWidth = 4;
    const bathhouseHeight = 3;
    for (let y = bathhouseTop; y < bathhouseTop + bathhouseHeight && y < roomHeight - 1; y++) {
      for (let x = bathhouseLeft; x < bathhouseLeft + bathhouseWidth && x < roomWidth - 1; x++) {
        const key = vectorKey({ x, y });
        if (!safe.has(key)) {
          context.canvas.set(x, y, '#');
        }
      }
    }
  }

  private applyMountainPass(context: RoomGenerationContext): void {
    const safe = this.createEntranceRunupCells(context, 4);
    const roomWidth = context.grid.cols;
    const roomHeight = context.grid.rows;
    const corridorWidth = 2 + this.randomInt(2);
    const corridorX = Math.floor(roomWidth / 2) - Math.floor(corridorWidth / 2);
    for (let y = 0; y < roomHeight; y++) {
      for (let x = 0; x < roomWidth; x++) {
        if (x >= corridorX && x < corridorX + corridorWidth) {
          const key = vectorKey({ x, y });
          if (!safe.has(key)) {
            context.canvas.set(x, y, '.');
          }
        } else if (this.rng() < 0.4) {
          const key = vectorKey({ x, y });
          if (!safe.has(key)) {
            context.canvas.set(x, y, '.');
          }
        }
      }
    }
  }

  private applyTatamiDojo(context: RoomGenerationContext): void {
    const safe = this.createEntranceRunupCells(context, 4);
    const roomWidth = context.grid.cols;
    const roomHeight = context.grid.rows;
    const centerX = Math.floor(roomWidth / 2);
    const centerY = Math.floor(roomHeight / 2);
    const wallThickness = 2;
    for (let y = 0; y < roomHeight; y++) {
      for (let x = 0; x < roomWidth; x++) {
        const key = vectorKey({ x, y });
        if (safe.has(key)) {
          continue;
        }
        const dx = Math.abs(x - centerX);
        const dy = Math.abs(y - centerY);
        const halfW = Math.floor(roomWidth / 2) - 3;
        const halfH = Math.floor(roomHeight / 2) - 3;
        const isLeftWall = dx >= halfW && dx <= halfW + wallThickness;
        const isRightWall = dx >= halfW && dx <= halfW + wallThickness;
        const isTopWall = dy >= halfH && dy <= halfH + wallThickness;
        const isBottomWall = dy >= halfH && dy <= halfH + wallThickness;
        const onLeftEdge = x === centerX - halfW - wallThickness || x === centerX - halfW - 1;
        const onRightEdge = x === centerX + halfW || x === centerX + halfW + wallThickness;
        const onTopEdge = y === centerY - halfH - wallThickness || y === centerY - halfH - 1;
        const onBottomEdge = y === centerY + halfH || y === centerY + halfH + wallThickness;
        if ((onLeftEdge && (onTopEdge || onBottomEdge)) || (onRightEdge && (onTopEdge || onBottomEdge)) || (onTopEdge && (onLeftEdge || onRightEdge))) {
          context.canvas.set(x, y, '#');
        } else if ((onLeftEdge || onRightEdge || onTopEdge || onBottomEdge) && (dx >= halfW || dy >= halfH)) {
          context.canvas.set(x, y, '#');
        } else if (dx < halfW && dy < halfH) {
          context.canvas.set(x, y, 'E');
        } else {
          context.canvas.set(x, y, '.');
        }
      }
    }
  }

  private applyFireworkField(context: RoomGenerationContext): void {
    const safe = this.createEntranceRunupCells(context, 4);
    const roomWidth = context.grid.cols;
    const roomHeight = context.grid.rows;
    const debrisCount = Math.floor(roomWidth * roomHeight * 0.055);
    let placed = 0;
    let attempts = 0;
    while (placed < debrisCount && attempts < debrisCount * 8) {
      const x = 3 + this.randomInt(Math.max(1, roomWidth - 6));
      const y = 3 + this.randomInt(Math.max(1, roomHeight - 6));
      const key = vectorKey({ x, y });
      if (context.layout[y]?.[x] === '.' && !safe.has(key)) {
        context.canvas.set(x, y, this.rng() < 0.28 ? 'F' : this.rng() < 0.5 ? 'P' : 'L');
        placed += 1;
      }
      attempts += 1;
    }

    const crateClusters = 2 + this.randomInt(3);
    for (let i = 0; i < crateClusters; i += 1) {
      const left = 5 + this.randomInt(Math.max(1, roomWidth - 12));
      const top = 5 + this.randomInt(Math.max(1, roomHeight - 10));
      this.fillVisualRect(context, left, top, 2 + this.randomInt(2), 1 + this.randomInt(2), 'F', safe);
    }
  }

  private pick<T>(values: readonly T[]): T {
    return values[Math.floor(this.rng() * values.length)] ?? values[0]!;
  }

  private applyBillboardMaze(context: RoomGenerationContext): void {
    const safe = this.createEntranceRunupCells(context, 5);
    const roomWidth = context.grid.cols;
    const roomHeight = context.grid.rows;
    const wallCount = 3 + this.randomInt(3);
    for (let i = 0; i < wallCount; i += 1) {
      const vertical = this.rng() < 0.5;
      if (vertical) {
        const x = 7 + this.randomInt(Math.max(1, roomWidth - 14));
        const top = 5 + this.randomInt(Math.max(1, roomHeight - 13));
        const height = 5 + this.randomInt(5);
        for (let y = top; y < Math.min(roomHeight - 5, top + height); y += 1) {
          const key = vectorKey({ x, y });
          if (!safe.has(key)) {
            context.canvas.set(x, y, '#');
            if (context.layout[y]?.[x + 1] === '.' && !safe.has(vectorKey({ x: x + 1, y }))) {
              context.canvas.set(x + 1, y, 'N');
            }
          }
        }
      } else {
        const y = 6 + this.randomInt(Math.max(1, roomHeight - 12));
        const left = 5 + this.randomInt(Math.max(1, roomWidth - 16));
        const width = 7 + this.randomInt(6);
        for (let x = left; x < Math.min(roomWidth - 5, left + width); x += 1) {
          const key = vectorKey({ x, y });
          if (!safe.has(key)) {
            context.canvas.set(x, y, '#');
            if (context.layout[y + 1]?.[x] === '.' && !safe.has(vectorKey({ x, y: y + 1 }))) {
              context.canvas.set(x, y + 1, 'N');
            }
          }
        }
      }
    }
    const painter = this.findOpenCell(context, safe, 4);
    if (painter) {
      context.canvas.set(painter.x, painter.y, 'G');
      context.billboardOracle = {
        signPainter: {
          ...buildHouseNpcProfile(this.pick(['Sign-Paint Marlene', 'Billboard Dale', 'Ad-Man Walt']), 'sage-1'),
          x: painter.x,
          y: painter.y,
        },
        slogan: this.pick(BILLBOARD_SLOGANS),
      };
    }
  }

  private applyMonumentPlaza(context: RoomGenerationContext): void {
    const safe = this.createEntranceRunupCells(context, 4);
    const roomWidth = context.grid.cols;
    const roomHeight = context.grid.rows;
    const plazaWidth = Math.min(18, roomWidth - 10);
    const plazaHeight = Math.min(10, roomHeight - 10);
    const left = Math.floor((roomWidth - plazaWidth) / 2);
    const top = 4;
    this.fillVisualRect(context, left, top, plazaWidth, plazaHeight, 'E', safe);

    const monumentLeft = Math.floor(roomWidth / 2) - 2;
    const monumentTop = top + 2;
    this.fillRect(context, monumentLeft, monumentTop, 5, 3, '#', safe);
    this.fillVisualRect(context, monumentLeft + 1, monumentTop - 1, 3, 1, 'M', safe);

    const pathX = Math.floor(roomWidth / 2);
    for (let y = top + plazaHeight; y < roomHeight - 4; y += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        const x = pathX + dx;
        const key = vectorKey({ x, y });
        if (!safe.has(key) && context.layout[y]?.[x] === '.') {
          context.canvas.set(x, y, 'W');
        }
      }
    }
    this.placeGlints(context, safe, 5);
  }

  private applyMotelPoolRuins(context: RoomGenerationContext): void {
    const safe = this.createEntranceRunupCells(context, 5);
    const roomWidth = context.grid.cols;
    const roomHeight = context.grid.rows;
    const deckWidth = Math.min(18, roomWidth - 12);
    const deckHeight = Math.min(12, roomHeight - 10);
    const left = Math.floor((roomWidth - deckWidth) / 2);
    const top = Math.floor((roomHeight - deckHeight) / 2);
    this.fillVisualRect(context, left, top, deckWidth, deckHeight, 'E', safe);

    const poolLeft = left + 4;
    const poolTop = top + 3;
    const poolWidth = deckWidth - 8;
    const poolHeight = deckHeight - 6;
    const water = this.rng() < 0.68;
    const waterTiles: Array<{ x: number; y: number }> = [];
    for (let y = poolTop; y < poolTop + poolHeight; y += 1) {
      for (let x = poolLeft; x < poolLeft + poolWidth; x += 1) {
        const key = vectorKey({ x, y });
        if (safe.has(key)) {
          continue;
        }
        context.canvas.set(x, y, water ? '~' : 'O');
        waterTiles.push({ x, y });
      }
    }

    const wallTop = Math.max(5, top - 3);
    this.fillRect(context, left + 2, wallTop, deckWidth - 4, 2, '#', safe);
    this.fillVisualRect(context, left + deckWidth - 6, wallTop + 2, 4, 1, 'N', safe);
    const clerk = { x: left + deckWidth - 4, y: top + 2 };
    const maintenance = { x: left + 3, y: top + deckHeight - 3 };
    if (context.layout[clerk.y]?.[clerk.x]) {
      context.canvas.set(clerk.x, clerk.y, 'G');
    }
    if (context.layout[maintenance.y]?.[maintenance.x]) {
      context.canvas.set(maintenance.x, maintenance.y, 'G');
    }
    context.motelPool = {
      clerk: {
        ...buildHouseNpcProfile(this.pick(['Vacancy Vera', 'Clerk Connie', 'Pool Key Dale']), 'sage-1'),
        x: clerk.x,
        y: clerk.y,
      },
      maintenance: {
        ...buildHouseNpcProfile(this.pick(['Skimmer Hank', 'Chlorine Tammy', 'Net Earl']), 'sage-2'),
        x: maintenance.x,
        y: maintenance.y,
      },
      poolName: this.pick(MOTEL_POOL_NAMES),
      center: { x: poolLeft + Math.floor(poolWidth / 2), y: poolTop + Math.floor(poolHeight / 2) },
      waterTiles,
    };
  }

  private applyInterstateCut(context: RoomGenerationContext): void {
    const safe = this.createEntranceRunupCells(context, 4);
    const roomWidth = context.grid.cols;
    const roomHeight = context.grid.rows;
    const horizontal = this.rng() < 0.5;
    if (horizontal) {
      const roadTop = Math.floor(roomHeight / 2) - 2;
      this.fillVisualRect(context, 0, roadTop, roomWidth, 5, 'A', safe);
      for (let x = 2; x < roomWidth - 2; x += 4) {
        if (!safe.has(vectorKey({ x, y: roadTop + 2 }))) {
          context.canvas.set(x, roadTop + 2, 'W');
        }
      }
      this.placeRockShoulders(context, safe, horizontal, roadTop, 5);
      const ranger = this.findOpenCell(context, safe, 4);
      if (ranger) {
        context.canvas.set(ranger.x, ranger.y, 'G');
        context.roadCrew = {
          ranger: {
            ...buildHouseNpcProfile(this.pick(['Cone Ranger Buck', 'Shoulder Sue', 'Detour Dale']), 'sage-1'),
            x: ranger.x,
            y: ranger.y,
          },
          roadName: this.pick(ROAD_NAMES),
        };
      }
    } else {
      const roadLeft = Math.floor(roomWidth / 2) - 2;
      this.fillVisualRect(context, roadLeft, 0, 5, roomHeight, 'A', safe);
      for (let y = 2; y < roomHeight - 2; y += 4) {
        if (!safe.has(vectorKey({ x: roadLeft + 2, y }))) {
          context.canvas.set(roadLeft + 2, y, 'W');
        }
      }
      this.placeRockShoulders(context, safe, horizontal, roadLeft, 5);
      const ranger = this.findOpenCell(context, safe, 4);
      if (ranger) {
        context.canvas.set(ranger.x, ranger.y, 'G');
        context.roadCrew = {
          ranger: {
            ...buildHouseNpcProfile(this.pick(['Cone Ranger Buck', 'Shoulder Sue', 'Detour Dale']), 'sage-1'),
            x: ranger.x,
            y: ranger.y,
          },
          roadName: this.pick(ROAD_NAMES),
        };
      }
    }
  }

  private applyGridironYard(context: RoomGenerationContext): void {
    const safe = this.createEntranceRunupCells(context, 4);
    const roomWidth = context.grid.cols;
    const roomHeight = context.grid.rows;
    const left = 5;
    const top = 5;
    const width = roomWidth - 10;
    const height = roomHeight - 10;
    this.fillVisualRect(context, left, top, width, height, 'E', safe);
    for (let x = left + 3; x < left + width - 2; x += 4) {
      this.fillVisualRect(context, x, top + 1, 1, height - 2, 'W', safe);
    }
    this.fillRect(context, left - 1, top - 1, width + 2, 1, '#', safe);
    this.fillRect(context, left - 1, top + height, width + 2, 1, '#', safe);
    this.fillRect(context, left - 1, top - 1, 1, height + 2, '#', safe);
    this.fillRect(context, left + width, top - 1, 1, height + 2, '#', safe);
    this.fillVisualRect(context, left + 1, top - 3, 2, 2, 'L', safe);
    this.fillVisualRect(context, left + width - 3, top - 3, 2, 2, 'L', safe);
    this.fillVisualRect(context, left + Math.floor(width / 2) - 2, top - 3, 4, 1, 'N', safe);
    const coach = { x: left + Math.floor(width / 2), y: top + height - 3 };
    const playerSpots = [
      { x: left + 5, y: top + 4 },
      { x: left + width - 6, y: top + 4 },
      { x: left + 8, y: top + height - 5 },
      { x: left + width - 9, y: top + height - 5 },
    ];
    context.canvas.set(coach.x, coach.y, 'G');
    playerSpots.forEach((spot) => context.canvas.set(spot.x, spot.y, 'G'));
    context.gridironYard = {
      coach: {
        ...buildHouseNpcProfile('Coach Hank', 'sage-2'),
        x: coach.x,
        y: coach.y,
      },
      players: playerSpots.map((spot, index) => ({
        ...buildHouseNpcProfile(
          ['Left Tackle Tammy', 'Wide Earl', 'Safety Sue', 'Bobby-Joe Blitz'][index] ?? 'Yard Player',
          'sage-1',
        ),
        x: spot.x,
        y: spot.y,
      })),
      fieldName: 'Glory Inches Yard',
    };
  }

  private fillRect(
    context: RoomGenerationContext,
    left: number,
    top: number,
    width: number,
    height: number,
    tile: '#',
    safe: ReadonlySet<string>,
  ): void {
    for (let y = top; y < top + height; y += 1) {
      for (let x = left; x < left + width; x += 1) {
        if (!context.layout[y]?.[x]) {
          continue;
        }
        if (safe.has(vectorKey({ x, y }))) {
          continue;
        }
        if (context.spawnGuard?.protected.has(vectorKey({ x, y }))) {
          continue;
        }
        context.canvas.set(x, y, tile);
      }
    }
  }

  private fillVisualRect(
    context: RoomGenerationContext,
    left: number,
    top: number,
    width: number,
    height: number,
    tile: string,
    safe: ReadonlySet<string>,
  ): void {
    for (let y = top; y < top + height; y += 1) {
      for (let x = left; x < left + width; x += 1) {
        if (!context.layout[y]?.[x] || safe.has(vectorKey({ x, y }))) {
          continue;
        }
        context.canvas.set(x, y, tile);
      }
    }
  }

  private placeGlints(context: RoomGenerationContext, safe: ReadonlySet<string>, count: number): void {
    let placed = 0;
    let attempts = 0;
    while (placed < count && attempts < count * 12) {
      const x = 4 + this.randomInt(Math.max(1, context.grid.cols - 8));
      const y = 4 + this.randomInt(Math.max(1, context.grid.rows - 8));
      const key = vectorKey({ x, y });
      if (!safe.has(key) && context.layout[y]?.[x] === '.') {
        context.canvas.set(x, y, 'L');
        placed += 1;
      }
      attempts += 1;
    }
  }

  private findOpenCell(
    context: RoomGenerationContext,
    safe: ReadonlySet<string>,
    margin: number,
  ): { x: number; y: number } | null {
    for (let attempt = 0; attempt < 80; attempt += 1) {
      const x = margin + this.randomInt(Math.max(1, context.grid.cols - margin * 2));
      const y = margin + this.randomInt(Math.max(1, context.grid.rows - margin * 2));
      if (safe.has(vectorKey({ x, y })) || context.layout[y]?.[x] !== '.') {
        continue;
      }
      return { x, y };
    }
    return null;
  }

  private placeRockShoulders(
    context: RoomGenerationContext,
    safe: ReadonlySet<string>,
    horizontal: boolean,
    roadStart: number,
    roadSize: number,
  ): void {
    const roomWidth = context.grid.cols;
    const roomHeight = context.grid.rows;
    const attempts = 18;
    for (let i = 0; i < attempts; i += 1) {
      const x = 4 + this.randomInt(Math.max(1, roomWidth - 8));
      const y = 4 + this.randomInt(Math.max(1, roomHeight - 8));
      const inRoad = horizontal
        ? y >= roadStart - 1 && y < roadStart + roadSize + 1
        : x >= roadStart - 1 && x < roadStart + roadSize + 1;
      if (inRoad || safe.has(vectorKey({ x, y })) || context.layout[y]?.[x] !== '.') {
        continue;
      }
      this.fillRect(context, x, y, 1 + this.randomInt(2), 1 + this.randomInt(2), '#', safe);
    }
  }

  private createEntranceRunupCells(
    context: RoomGenerationContext,
    length: number,
  ): ReadonlySet<string> {
    const cells = new Set<string>();
    for (let y = 0; y < context.grid.rows; y += 1) {
      for (let x = 0; x < length && x < context.grid.cols; x += 1) {
        cells.add(vectorKey({ x, y }));
        cells.add(vectorKey({ x: context.grid.cols - 1 - x, y }));
      }
    }
    for (let x = 0; x < context.grid.cols; x += 1) {
      for (let y = 0; y < length && y < context.grid.rows; y += 1) {
        cells.add(vectorKey({ x, y }));
        cells.add(vectorKey({ x, y: context.grid.rows - 1 - y }));
      }
    }
    return cells;
  }

  private weightedChoice(pool: WeightedArchetype[]): RoomArchetypeId {
    const total = pool.reduce((sum, entry) => sum + entry.weight, 0);
    let roll = this.rng() * total;
    for (const entry of pool) {
      roll -= entry.weight;
      if (roll <= 0) {
        return entry.id;
      }
    }
    return pool[pool.length - 1]?.id ?? 'classic';
  }

  private randomInt(maxExclusive: number): number {
    return Math.floor(this.rng() * maxExclusive);
  }

  private randomIntInRange(minInclusive: number, maxExclusive: number): number {
    return minInclusive + this.randomInt(Math.max(1, maxExclusive - minInclusive));
  }
}
