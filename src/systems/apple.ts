import Phaser from "phaser";
import type { GridConfig } from "./snakeState";
import { getRoom, type Room } from "./world";

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

function pickSpawn(
  options: Phaser.Math.Vector2[],
  rng: () => number
): Phaser.Math.Vector2 {
  return options[Math.floor(rng() * options.length)];
}

export function spawnAppleInRoom(
  roomId: string,
  grid: GridConfig,
  snake: Phaser.Math.Vector2[],
  rng: () => number = Math.random
): void {
  const room = getRoom(roomId, grid);
  spawnAppleInExistingRoom(room, snake, rng);
}

export function spawnAppleInExistingRoom(
  room: Room,
  snake: Phaser.Math.Vector2[],
  rng: () => number = Math.random
): void {
  const validSpawns = collectValidSpawns(room);
  if (validSpawns.length === 0) {
    room.apple = undefined;
    return;
  }

  let attempts = 0;
  const maxAttempts = validSpawns.length * 2;
  let applePos = pickSpawn(validSpawns, rng);
  while (snake.some((segment) => segment.equals(applePos)) && attempts < maxAttempts) {
    applePos = pickSpawn(validSpawns, rng);
    attempts += 1;
  }

  room.apple = applePos.clone();
}

export function ensureAppleInRoom(
  roomId: string,
  grid: GridConfig,
  snake: Phaser.Math.Vector2[],
  rng: () => number = Math.random
): void {
  const room = getRoom(roomId, grid);
  if (!room.apple) {
    spawnAppleInExistingRoom(room, snake, rng);
  }
}