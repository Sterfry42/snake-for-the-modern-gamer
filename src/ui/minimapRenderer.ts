import Phaser from 'phaser';
import type { GridConfig } from '../config/gameConfig.js';
import type { Vector2Like } from '../core/math.js';
import type { RoomSnapshot } from '../world/types.js';

export interface MinimapRendererOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  grid: GridConfig;
  getRoom: (roomId: string) => RoomSnapshot;
}

export interface MinimapSnapshot {
  currentRoomId: string;
  snakeSegments: readonly Vector2Like[];
}

type MinimapTileKind = 'empty' | 'wall' | 'masonry' | 'barrier' | 'water';

const ROOM_OFFSETS: ReadonlyArray<{ dx: number; dy: number }> = [
  { dx: -1, dy: -1 },
  { dx: 0, dy: -1 },
  { dx: 1, dy: -1 },
  { dx: -1, dy: 0 },
  { dx: 0, dy: 0 },
  { dx: 1, dy: 0 },
  { dx: -1, dy: 1 },
  { dx: 0, dy: 1 },
  { dx: 1, dy: 1 },
];

const COLORS = {
  panel: 0x05090f,
  room: 0x0b1622,
  empty: 0x102033,
  wall: 0xe6f3ff,
  masonry: 0xd4a06a,
  barrier: 0xcfa77a,
  water: 0x2c9bd8,
  snakeBody: 0xb6ff6a,
  snakeHead: 0xffffff,
  neighborBorder: 0x36536b,
  currentBorder: 0xfff3a8,
};

export class MinimapRenderer {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly roomWidth: number;
  private readonly roomHeight: number;
  private visible = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly options: MinimapRendererOptions,
  ) {
    this.graphics = scene.add.graphics().setDepth(29).setScrollFactor(0).setVisible(false);
    this.roomWidth = options.width / 3;
    this.roomHeight = options.height / 3;
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    this.graphics.setVisible(visible);
    if (!visible) {
      this.graphics.clear();
    }
  }

  render(snapshot: MinimapSnapshot): void {
    if (!this.visible) {
      return;
    }

    const { x, y, width, height } = this.options;
    this.graphics.clear();
    this.graphics
      .fillStyle(COLORS.panel, 0.72)
      .fillRoundedRect(x - 6, y - 6, width + 12, height + 12, 6);
    this.graphics
      .lineStyle(1, 0x9ad1ff, 0.34)
      .strokeRoundedRect(x - 6.5, y - 6.5, width + 13, height + 13, 6);

    const current = parseRoomId(snapshot.currentRoomId);
    for (let index = 0; index < ROOM_OFFSETS.length; index += 1) {
      const offset = ROOM_OFFSETS[index]!;
      const col = index % 3;
      const row = Math.floor(index / 3);
      const roomId = makeRoomId(current.x + offset.dx, current.y + offset.dy, current.z);
      const roomX = x + col * this.roomWidth;
      const roomY = y + row * this.roomHeight;
      const room = this.options.getRoom(roomId);
      this.renderRoom(room, roomX, roomY, offset.dx === 0 && offset.dy === 0);
    }

    this.renderSnake(snapshot, current.z);
  }

  destroy(): void {
    this.graphics.destroy();
  }

  private renderRoom(room: RoomSnapshot, x: number, y: number, current: boolean): void {
    const tileW = this.roomWidth / this.options.grid.cols;
    const tileH = this.roomHeight / this.options.grid.rows;
    this.graphics
      .fillStyle(COLORS.room, current ? 0.88 : 0.64)
      .fillRect(x, y, this.roomWidth, this.roomHeight);

    for (let tileY = 0; tileY < this.options.grid.rows; tileY += 1) {
      const row = room.layout[tileY] ?? '';
      for (let tileX = 0; tileX < this.options.grid.cols; tileX += 1) {
        const kind = getMinimapTileKind(row[tileX] ?? '.');
        if (kind === 'empty') {
          continue;
        }
        const color =
          kind === 'wall' ? COLORS.wall : kind === 'water' ? COLORS.water : COLORS.barrier;
        const alpha = kind === 'water' ? 0.84 : current ? 0.9 : 0.68;
        this.graphics
          .fillStyle(color, alpha)
          .fillRect(x + tileX * tileW, y + tileY * tileH, Math.ceil(tileW), Math.ceil(tileH));
      }
    }

    this.graphics
      .lineStyle(
        current ? 2 : 1,
        current ? COLORS.currentBorder : COLORS.neighborBorder,
        current ? 0.95 : 0.72,
      )
      .strokeRect(x + 0.5, y + 0.5, this.roomWidth - 1, this.roomHeight - 1);
  }

  private renderSnake(snapshot: MinimapSnapshot, levelZ: number): void {
    const current = parseRoomId(snapshot.currentRoomId);
    const visibleRooms = new Set(
      ROOM_OFFSETS.map((offset) =>
        makeRoomId(current.x + offset.dx, current.y + offset.dy, current.z),
      ),
    );
    const tileW = this.roomWidth / this.options.grid.cols;
    const tileH = this.roomHeight / this.options.grid.rows;
    const segmentW = Math.max(2, Math.ceil(tileW));
    const segmentH = Math.max(2, Math.ceil(tileH));

    snapshot.snakeSegments.forEach((segment, index) => {
      const position = worldToRoomPosition(segment, this.options.grid, levelZ);
      if (!visibleRooms.has(position.roomId)) {
        return;
      }
      const room = parseRoomId(position.roomId);
      const col = room.x - current.x + 1;
      const row = room.y - current.y + 1;
      const x = this.options.x + col * this.roomWidth + position.localX * tileW;
      const y = this.options.y + row * this.roomHeight + position.localY * tileH;
      const isHead = index === 0;
      this.graphics
        .fillStyle(isHead ? COLORS.snakeHead : COLORS.snakeBody, isHead ? 1 : 0.92)
        .fillRect(x, y, isHead ? segmentW + 1 : segmentW, isHead ? segmentH + 1 : segmentH);
    });
  }
}

function getMinimapTileKind(tile: string): MinimapTileKind {
  switch (tile) {
    case '#':
      return 'wall';
    case '%':
      return 'masonry';
    case '~':
    case 'O':
      return 'water';
    case 'A':
    case 'B':
    case 'C':
    case 'D':
    case 'E':
    case 'F':
    case 'K':
    case 'L':
    case 'M':
    case 'N':
    case 'P':
    case 'R':
    case 'S':
    case 'T':
    case 'U':
    case 'Y':
    case 'W':
      return 'barrier';
    default:
      return 'empty';
  }
}

function parseRoomId(roomId: string): { x: number; y: number; z: number } {
  if (!/^-?\d+,-?\d+,-?\d+$/.test(roomId)) {
    return { x: 0, y: 0, z: 0 };
  }
  const [x = 0, y = 0, z = 0] = roomId.split(',').map(Number);
  return { x, y, z };
}

function makeRoomId(x: number, y: number, z: number): string {
  return `${x},${y},${z}`;
}

function worldToRoomPosition(
  position: Vector2Like,
  grid: GridConfig,
  levelZ: number,
): { roomId: string; localX: number; localY: number } {
  const roomX = Math.floor(position.x / grid.cols);
  const roomY = Math.floor(position.y / grid.rows);
  return {
    roomId: makeRoomId(roomX, roomY, levelZ),
    localX: positiveModulo(position.x, grid.cols),
    localY: positiveModulo(position.y, grid.rows),
  };
}

function positiveModulo(value: number, size: number): number {
  return ((value % size) + size) % size;
}
