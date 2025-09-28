import Phaser from "phaser";
import type { GridConfig } from "./snakeState";
import { getRoom, type Room } from "./world";
import { paletteConfig } from "../config/palette.js";

export type AppleType = "normal" | "shielded" | "gold" | "skittish";

export type AppleInfo = {
  roomId: string;
  position: Phaser.Math.Vector2;
  type: AppleType;
  protectedDirs?: Phaser.Math.Vector2[];
  color: number;
};

export const APPLE_COLORS: Record<AppleType, number> = {
  normal: paletteConfig.apple.colors.normal,
  shielded: paletteConfig.apple.colors.shielded,
  gold: paletteConfig.apple.colors.gold,
  skittish: paletteConfig.apple.colors.skittish,
};

const SPECIAL_APPLE_SCORE_THRESHOLD = 10;
const SKITTISH_MOVE_CHANCE = 0.45;
const appleInfoByRoom = new Map<string, AppleInfo>();

function cloneVector(vec: Phaser.Math.Vector2): Phaser.Math.Vector2 {
  return new Phaser.Math.Vector2(vec.x, vec.y);
}

function cloneDirs(dirs?: Phaser.Math.Vector2[]): Phaser.Math.Vector2[] | undefined {
  return dirs?.map((dir) => cloneVector(dir));
}

function cloneInfo(info: AppleInfo): AppleInfo {
  return {
    roomId: info.roomId,
    position: cloneVector(info.position),
    type: info.type,
    protectedDirs: cloneDirs(info.protectedDirs),
    color: info.color,
  };
}

function storeInfo(info: AppleInfo): void {
  appleInfoByRoom.set(info.roomId, info);
}

function removeInfo(roomId: string): void {
  appleInfoByRoom.delete(roomId);
}

function getStoredInfo(roomId: string): AppleInfo | undefined {
  const info = appleInfoByRoom.get(roomId);
  if (!info) {
    return undefined;
  }
  return info;
}

function collectValidSpawns(room: Room): Phaser.Math.Vector2[] {
  const valid: Phaser.Math.Vector2[] = [];
  for (let y = 0; y < room.layout.length; y++) {
    for (let x = 0; x < room.layout[y].length; x++) {
      if (room.layout[y][x] === ".") {
        valid.push(new Phaser.Math.Vector2(x, y));
      }
    }
  }
  return valid;
}

function pickSpawn(options: Phaser.Math.Vector2[], rng: () => number): Phaser.Math.Vector2 {
  return options[Math.floor(rng() * options.length)];
}

function randomShuffle<T>(source: T[], rng: () => number): T[] {
  const arr = source.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function chooseAppleType(score: number, rng: () => number): AppleType {
  if (score < SPECIAL_APPLE_SCORE_THRESHOLD) {
    return "normal";
  }
  if (rng() < 0.5) {
    return "normal";
  }
  const specials: AppleType[] = ["shielded", "gold", "skittish"];
  return specials[Math.floor(rng() * specials.length)];
}

function createAppleInfo(
  roomId: string,
  position: Phaser.Math.Vector2,
  type: AppleType,
  protectedDirs?: Phaser.Math.Vector2[]
): AppleInfo {
  return {
    roomId,
    position: cloneVector(position),
    type,
    protectedDirs: cloneDirs(protectedDirs),
    color: APPLE_COLORS[type],
  };
}

function selectShieldedDirs(rng: () => number): Phaser.Math.Vector2[] {
  const directions = [
    new Phaser.Math.Vector2(1, 0),
    new Phaser.Math.Vector2(-1, 0),
    new Phaser.Math.Vector2(0, 1),
    new Phaser.Math.Vector2(0, -1),
  ];
  const shuffled = randomShuffle(directions, rng);
  const shields = Math.max(1, Math.floor(rng() * 3) + 1);
  return shuffled.slice(0, shields).map((dir) => cloneVector(dir));
}

function spawnAppleInExistingRoomInternal(
  roomId: string,
  room: Room,
  snake: Phaser.Math.Vector2[],
  score: number,
  rng: () => number
): AppleInfo | null {
  const validSpawns = collectValidSpawns(room);
  if (validSpawns.length === 0) {
    room.apple = undefined;
    removeInfo(roomId);
    return null;
  }

  let attempts = 0;
  const maxAttempts = validSpawns.length * 2;
  let applePos = pickSpawn(validSpawns, rng);
  while (snake.some((segment) => segment.equals(applePos)) && attempts < maxAttempts) {
    applePos = pickSpawn(validSpawns, rng);
    attempts += 1;
  }

  room.apple = cloneVector(applePos);

  const type = chooseAppleType(score, rng);
  const protectedDirs = type === "shielded" ? selectShieldedDirs(rng) : undefined;
  const info = createAppleInfo(roomId, applePos, type, protectedDirs);
  storeInfo(info);
  return cloneInfo(info);
}

export function spawnAppleInRoom(
  roomId: string,
  grid: GridConfig,
  snake: Phaser.Math.Vector2[],
  score: number,
  rng: () => number = Math.random
): AppleInfo | null {
  const room = getRoom(roomId, grid);
  return spawnAppleInExistingRoomInternal(roomId, room, snake, score, rng);
}

export function ensureAppleInRoom(
  roomId: string,
  grid: GridConfig,
  snake: Phaser.Math.Vector2[],
  score: number,
  rng: () => number = Math.random
): AppleInfo | null {
  const room = getRoom(roomId, grid);
  if (!room.apple) {
    return spawnAppleInExistingRoomInternal(roomId, room, snake, score, rng);
  }

  const stored = getStoredInfo(roomId);
  if (stored) {
    stored.position.copy(room.apple);
    return cloneInfo(stored);
  }

  const info = createAppleInfo(roomId, room.apple, "normal");
  storeInfo(info);
  return cloneInfo(info);
}

export function maybeMoveSkittishApple(
  roomId: string,
  grid: GridConfig,
  snake: Phaser.Math.Vector2[],
  rng: () => number = Math.random
): AppleInfo | null {
  const info = getStoredInfo(roomId);
  if (!info || info.type !== "skittish") {
    return info ? cloneInfo(info) : null;
  }

  if (rng() > SKITTISH_MOVE_CHANCE) {
    return cloneInfo(info);
  }

  const originalRoomId = info.roomId;
  const [roomX, roomY, roomZ = 0] = originalRoomId.split(",").map(Number);
  const apple = cloneVector(info.position);
  const head = snake[0];
  if (!head) {
    return cloneInfo(info);
  }

  const appleGlobal = new Phaser.Math.Vector2(
    roomX * grid.cols + apple.x,
    roomY * grid.rows + apple.y
  );

  const diffX = appleGlobal.x - head.x;
  const diffY = appleGlobal.y - head.y;

  const dirs: Phaser.Math.Vector2[] = [];
  if (Math.abs(diffX) >= Math.abs(diffY)) {
    if (diffX !== 0) {
      dirs.push(new Phaser.Math.Vector2(diffX >= 0 ? 1 : -1, 0));
    }
    dirs.push(new Phaser.Math.Vector2(0, diffY >= 0 ? 1 : -1));
  } else {
    if (diffY !== 0) {
      dirs.push(new Phaser.Math.Vector2(0, diffY >= 0 ? 1 : -1));
    }
    dirs.push(new Phaser.Math.Vector2(diffX >= 0 ? 1 : -1, 0));
  }
  const randomSign = () => (rng() < 0.5 ? -1 : 1);
  dirs.push(new Phaser.Math.Vector2(randomSign(), 0));
  dirs.push(new Phaser.Math.Vector2(0, randomSign()));

  type MoveResult = {
    targetRoomId: string;
    targetRoom: Room;
    localX: number;
    localY: number;
  };

  const attemptMove = (dir: Phaser.Math.Vector2): MoveResult | null => {
    let targetRoomX = roomX;
    let targetRoomY = roomY;
    let localX = apple.x + dir.x;
    let localY = apple.y + dir.y;

    if (localX < 0) {
      localX = grid.cols - 1;
      targetRoomX -= 1;
    } else if (localX >= grid.cols) {
      localX = 0;
      targetRoomX += 1;
    }

    if (localY < 0) {
      localY = grid.rows - 1;
      targetRoomY -= 1;
    } else if (localY >= grid.rows) {
      localY = 0;
      targetRoomY += 1;
    }

    const targetRoomId = `${targetRoomX},${targetRoomY},${roomZ}`;
    const targetRoom = getRoom(targetRoomId, grid);

    if (targetRoom.layout[localY]?.[localX] !== '.') {
      return null;
    }

    const occupant = appleInfoByRoom.get(targetRoomId);
    if (occupant && occupant !== info) {
      return null;
    }

    const globalX = targetRoomX * grid.cols + localX;
    const globalY = targetRoomY * grid.rows + localY;
    if (snake.some((segment) => segment.x === globalX && segment.y === globalY)) {
      return null;
    }

    return { targetRoomId, targetRoom, localX, localY };
  };

  let candidate: MoveResult | null = null;
  for (const dir of dirs) {
    const result = attemptMove(dir);
    if (result) {
      candidate = result;
      break;
    }
  }

  if (!candidate) {
    return cloneInfo(info);
  }

  const { targetRoomId, targetRoom, localX, localY } = candidate;
  const oldRoomId = info.roomId;
  const oldRoom = getRoom(oldRoomId, grid);

  if (oldRoomId !== targetRoomId) {
    oldRoom.apple = undefined;
    appleInfoByRoom.delete(oldRoomId);
  }

  targetRoom.apple = new Phaser.Math.Vector2(localX, localY);
  info.position.set(localX, localY);
  info.roomId = targetRoomId;
  storeInfo(info);

  return cloneInfo(info);
}

export function moveSkittishApples(
  grid: GridConfig,
  snake: Phaser.Math.Vector2[],
  rng: () => number = Math.random
): Set<string> {
  const affectedRooms = new Set<string>();
  const apples = Array.from(appleInfoByRoom.values());

  for (const info of apples) {
    if (info.type !== "skittish") continue;

    const originalRoomId = info.roomId;
    const originalPosition = cloneVector(info.position);

    const updated = maybeMoveSkittishApple(originalRoomId, grid, snake, rng);
    if (!updated) continue;

    if (
      updated.roomId !== originalRoomId ||
      !updated.position.equals(originalPosition)
    ) {
      affectedRooms.add(originalRoomId);
      affectedRooms.add(updated.roomId);
    }
  }

  return affectedRooms;
}

export function hasAnyApples(): boolean {
  return appleInfoByRoom.size > 0;
}

export function getAppleInfo(roomId: string): AppleInfo | null {
  const stored = getStoredInfo(roomId);
  return stored ? cloneInfo(stored) : null;
}

export function clearAppleInfo(roomId: string): void {
  removeInfo(roomId);
}

export function clearAllAppleInfo(): void {
  appleInfoByRoom.clear();
}

export function isShieldedApproachFatal(info: AppleInfo | null, dir: Phaser.Math.Vector2): boolean {
  if (!info || info.type !== "shielded" || !info.protectedDirs) {
    return false;
  }
  return info.protectedDirs.some((shield) => shield.x === dir.x && shield.y === dir.y);
}

export function getAppleRewards(info: AppleInfo | null): { growth: number; bonusScore: number } {
  switch (info?.type) {
    case "gold":
      return { growth: 4, bonusScore: 4 };
    case "skittish":
      return { growth: 2, bonusScore: 1 };
    case "shielded":
      return { growth: 1, bonusScore: 1 };
    default:
      return { growth: 1, bonusScore: 0 };
  }
}

export function appleWorldPosition(info: AppleInfo, grid: GridConfig): Phaser.Math.Vector2 {
  const [roomX, roomY] = info.roomId.split(",").map(Number);
  const worldX = (roomX * grid.cols + info.position.x + 0.5) * grid.cell;
  const worldY = (roomY * grid.rows + info.position.y + 0.5) * grid.cell;
  return new Phaser.Math.Vector2(worldX, worldY);
}
