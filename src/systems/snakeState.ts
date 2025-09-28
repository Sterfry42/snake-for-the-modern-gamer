import Phaser from "phaser";
import type { Room } from "./world";

export type GridConfig = {
  cols: number;
  rows: number;
  cell: number;
};

export type SnakeState = {
  grid: GridConfig;
  body: Phaser.Math.Vector2[];
  dir: Phaser.Math.Vector2;
  nextDir: Phaser.Math.Vector2;
  score: number;
  teleport: boolean;
  currentRoomId: string;
  flags: Record<string, unknown>;
};

export type StepOutcome =
  | { status: "dead"; reason: string }
  | { status: "alive"; appleEaten: boolean };

export interface StepDependencies {
  getRoom(roomId: string): Room;
  ensureApple(roomId: string): void;
}

export const INITIAL_DIRECTION = new Phaser.Math.Vector2(1, 0);

export const INITIAL_SNAKE_COORDS: Array<{ x: number; y: number }> = [
  { x: 5, y: 12 },
  { x: 4, y: 12 },
  { x: 3, y: 12 },
];

export const INITIAL_SPAWN_SAFE_CELLS: Array<{ x: number; y: number }> = [
  ...INITIAL_SNAKE_COORDS,
  { x: 6, y: 12 },
  { x: 7, y: 12 },
];

export function createSnakeState(grid: GridConfig): SnakeState {
  const state: SnakeState = {
    grid,
    body: [],
    dir: INITIAL_DIRECTION.clone(),
    nextDir: INITIAL_DIRECTION.clone(),
    score: 0,
    teleport: false,
    currentRoomId: "0,0,0",
    flags: {},
  };

  resetSnakeState(state);
  return state;
}

export function resetSnakeState(state: SnakeState): void {
  state.body = INITIAL_SNAKE_COORDS.map(({ x, y }) => new Phaser.Math.Vector2(x, y));
  state.dir.copy(INITIAL_DIRECTION);
  state.nextDir.copy(INITIAL_DIRECTION);
  state.score = 0;
  state.flags = {};
  state.currentRoomId = "0,0,0";
  state.teleport = false;
}

export function setSnakeDirection(state: SnakeState, x: number, y: number): void {
  if (x + state.dir.x === 0 && y + state.dir.y === 0) {
    return;
  }
  state.nextDir.set(x, y);
}

export function advanceSnake(state: SnakeState, deps: StepDependencies): StepOutcome {
  state.dir.copy(state.nextDir);
  const head = state.body[0].clone().add(state.dir);

  let roomChanged = false;

  const [roomX, roomY, roomZ = 0] = state.currentRoomId.split(",").map(Number);
  const localHeadX = head.x - roomX * state.grid.cols;
  const localHeadY = head.y - roomY * state.grid.rows;
  const currentRoom = deps.getRoom(state.currentRoomId);

  const portal = currentRoom.portals.find((p) => p.x === localHeadX && p.y === localHeadY);
  if (portal) {
    state.currentRoomId = portal.destRoomId;
    roomChanged = true;
  }

  const newRoomX = Math.floor(head.x / state.grid.cols);
  const newRoomY = Math.floor(head.y / state.grid.rows);
  if (newRoomX !== roomX || newRoomY !== roomY) {
    state.currentRoomId = `${newRoomX},${newRoomY},${roomZ}`;
    roomChanged = true;
  }

  if (roomChanged) {
    deps.ensureApple(state.currentRoomId);
  }

  const finalizedRoom = deps.getRoom(state.currentRoomId);
  const baseRoomX = Math.floor(head.x / state.grid.cols) * state.grid.cols;
  const baseRoomY = Math.floor(head.y / state.grid.rows) * state.grid.rows;
  const finalLocalHeadX = head.x - baseRoomX;
  const finalLocalHeadY = head.y - baseRoomY;

  const tile = finalizedRoom.layout[finalLocalHeadY]?.[finalLocalHeadX];
  if (tile === "#") {
    return { status: "dead", reason: "wall" };
  }

  if (state.body.some((segment) => segment.equals(head))) {
    return { status: "dead", reason: "self" };
  }

  state.body.unshift(head);

  const localHead = new Phaser.Math.Vector2(finalLocalHeadX, finalLocalHeadY);
  const appleEaten = Boolean(finalizedRoom.apple && localHead.equals(finalizedRoom.apple));
  if (!appleEaten) {
    state.body.pop();
  }

  return { status: "alive", appleEaten };
}