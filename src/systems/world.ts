import Phaser from "phaser";
import { paletteConfig, darkenColor, randomBackgroundColor } from "../config/palette.js";
import { INITIAL_SPAWN_SAFE_CELLS } from "./snakeState.js";

export type Portal = {
  x: number;
  y: number;
  destRoomId: string;
  destX: number;
  destY: number;
};

export type Room = {
  id: string;
  layout: string[];
  portals: Portal[];
  apple?: Phaser.Math.Vector2;
  backgroundColor: number;
  wallColor: number;
  wallOutlineColor: number;
};

export type World = Record<string, Room>;

const world: World = {};
const ORIGIN_ROOM_ID = "0,0,0";

function generateRoom(roomId: string, grid: { cols: number; rows: number }): Room {
  const layout = Array.from({ length: grid.rows }, () => Array(grid.cols).fill("."));
  const portals: Portal[] = [];

  const backgroundColor = randomBackgroundColor();
  const wallColor = darkenColor(backgroundColor, paletteConfig.wall.darkenFactor);
  const wallOutlineColor = darkenColor(wallColor, paletteConfig.wall.outlineDarkenFactor);

  const spawnGuard = createSpawnGuard(roomId);

  const numObstacles = Math.floor(Math.random() * 4) + 2;

  for (let i = 0; i < numObstacles; i++) {
    const obstacleWidth = Math.floor(Math.random() * 6) + 3;
    const obstacleHeight = Math.floor(Math.random() * 4) + 2;

    const x = Math.floor(Math.random() * (grid.cols - obstacleWidth - 4)) + 2;
    const y = Math.floor(Math.random() * (grid.rows - obstacleHeight - 4)) + 2;

    for (let row = y; row < y + obstacleHeight; row++) {
      for (let col = x; col < x + obstacleWidth; col++) {
        if (spawnGuard?.has(col, row)) continue;
        layout[row][col] = "#";
      }
    }
  }

  if (Math.random() < 0.3) {
    let ladderX: number;
    let ladderY: number;
    do {
      ladderX = Math.floor(Math.random() * (grid.cols - 4)) + 2;
      ladderY = Math.floor(Math.random() * (grid.rows - 4)) + 2;
    } while (layout[ladderY][ladderX] === "#");
    layout[ladderY][ladderX] = "H";

    const [roomX, roomY, roomZ = 0] = roomId.split(",").map(Number);
    const destZ = roomZ + (Math.random() < 0.5 ? 1 : -1);
    portals.push({
      x: ladderX,
      y: ladderY,
      destRoomId: `${roomX},${roomY},${destZ}`,
      destX: ladderX,
      destY: ladderY,
    });
  }

  spawnGuard?.clear(layout);

  return {
    id: roomId,
    layout: layout.map((row) => row.join("")),
    portals,
    backgroundColor,
    wallColor,
    wallOutlineColor,
  };
}

function createSpawnGuard(roomId: string) {
  if (roomId !== ORIGIN_ROOM_ID) {
    return null;
  }

  const protectedCells = new Set<string>(
    INITIAL_SPAWN_SAFE_CELLS.map(({ x, y }) => `${x},${y}`)
  );

  return {
    has(col: number, row: number) {
      return protectedCells.has(`${col},${row}`);
    },
    clear(layout: string[][]) {
      for (const key of protectedCells.values()) {
        const [col, row] = key.split(",").map(Number);
        if (layout[row]?.[col] === "#") {
          layout[row][col] = ".";
        }
      }
    },
  };
}

export function getRoom(roomId: string, grid: { cols: number; rows: number }): Room {
  if (!world[roomId]) {
    console.log(`Generating new room: ${roomId}`);
    world[roomId] = generateRoom(roomId, grid);
  }
  return world[roomId];
}

export function clearWorld(): void {
  if (Object.keys(world).length === 0) {
    return;
  }
  for (const key in world) {
    delete world[key];
  }
  console.log("World cache cleared.");
}
