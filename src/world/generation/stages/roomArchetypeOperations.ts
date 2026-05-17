import type { WorldConfig } from '../../../config/gameConfig.js';
import { vectorKey } from '../../../core/math.js';
import type { RandomGenerator } from '../../../core/rng.js';
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
