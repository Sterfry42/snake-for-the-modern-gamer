import type { GridConfig } from "../config/gameConfig.js";
import type { Vector2Like } from "../core/math.js";
import { addVectors, manhattanDistance } from "../core/math.js";
import type { RoomSnapshot } from "../world/types.js";

const FREAK_YOU_TURN_MARGIN = 5;

export interface Boss {
  id: string;
  name: string;
  kind?: "freak-dennis" | "freaker-dennis" | "freak-you" | "revenant" | "angel";
  body: Vector2Like[];
  health: number;
  maxHealth: number;
  roomId: string;
  direction: Vector2Like;
  headCenter?: Vector2Like;
  moveTick?: number;
  turnCounter?: number;
  maxBodyCells?: number;
  pull?: {
    radius: number;
    strength: number;
  };
  rainbowPalette?: boolean;
  trackingMode?: boolean;
}

export interface BossStepDependencies {
  getRoom(roomId: string): RoomSnapshot;
  getSnakeBody(): readonly Vector2Like[];
}

export class BossManager {
  private bosses = new Map<string, Boss>();
  private readonly grid: GridConfig;
  private rainbowColorTimer: number = 0;

  constructor(grid: GridConfig) {
    this.grid = grid;
  }

  public spawnBoss(roomId: string, bossType: "freak-dennis" | "freaker-dennis" | "random" | "fallen-angel" = "random"): void {
    if (!roomId || typeof roomId !== "string" || !roomId.includes(",")) {
      console.warn('[spawnBoss] Invalid roomId provided:', roomId);
      return;
    }
    const [roomX, roomY] = roomId.split(",").map(Number);
    const roomOffsetX = roomX * this.grid.cols;
    const roomOffsetY = roomY * this.grid.rows;

    const id = `boss-${Date.now()}`;
    const name =
      bossType === "freak-dennis" ? "Freak Dennis" :
      bossType === "freaker-dennis" ? "Freaker Dennis" :
      bossType === "fallen-angel" ? "The Angel, Insulted" :
      "Dread Revenant";
    const kind = bossType === "fallen-angel" ? "angel" : bossType === "freak-dennis" ? "freak-dennis" : "freaker-dennis";

    const centerX = roomOffsetX + this.grid.cols / 2 + 5;
    const centerY = roomOffsetY + this.grid.rows / 2;
    const body: Vector2Like[] = [];
    body.push({ x: centerX, y: centerY });
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        body.push({ x: centerX + dx, y: centerY + dy });
      }
    }

    const isFreaker = bossType === "freaker-dennis";
    const baseHealth = isFreaker ? 150 : 100;
    const basePullRadius = isFreaker ? 10 : 8;
    const basePullStrength = isFreaker ? 0.6 : 0.4;

    const boss: Boss = {
      id,
      name,
      kind,
      body,
      health: baseHealth,
      maxHealth: baseHealth,
      roomId,
      direction: { x: 1, y: 0 },
      rainbowPalette: isFreaker,
      trackingMode: isFreaker,
      pull: {
        radius: basePullRadius,
        strength: basePullStrength,
      },
    };
    this.bosses.set(id, boss);
  }

  public spawnFreakYou(roomId: string): string | null {
    if (!roomId || typeof roomId !== "string" || !roomId.includes(",")) {
      console.warn("[spawnFreakYou] Invalid roomId provided:", roomId);
      return null;
    }
    if (this.hasBossWithKind("freak-you")) {
      return Array.from(this.bosses.values()).find((boss) => boss.kind === "freak-you")?.id ?? null;
    }

    const [roomX, roomY] = roomId.split(",").map(Number);
    const roomOffsetX = roomX * this.grid.cols;
    const roomOffsetY = roomY * this.grid.rows;
    const centerX = Math.floor(roomOffsetX + this.grid.cols / 2);
    const centerY = Math.floor(roomOffsetY + this.grid.rows / 2);
    const direction = { x: 1, y: 0 };
    const body = this.wideHeadBand({ x: centerX, y: centerY }, direction);

    const boss: Boss = {
      id: `boss-freak-you-${Date.now()}`,
      name: "Freak You",
      kind: "freak-you",
      body,
      health: 1,
      maxHealth: 1,
      roomId,
      direction,
      headCenter: { x: centerX, y: centerY },
      moveTick: 0,
      turnCounter: 0,
      maxBodyCells: 400 * 3,
      trackingMode: true,
    };
    this.bosses.set(boss.id, boss);
    return boss.id;
  }

  public step(deps: BossStepDependencies): void {
    for (const boss of this.bosses.values()) {
      if (boss.kind === "freak-you") {
        this.moveFreakYou(boss, deps);
      } else if (boss.kind === "angel") {
        this.moveAngelBoss(boss, deps);
      } else if (boss.kind === "freaker-dennis") {
        this.moveFreakerDennis(boss, deps);
      } else {
        this.moveStandardBoss(boss, deps);
      }
    }
  }

  public getBossesInRoom(roomId: string): Boss[] {
    const [targetRoomX, targetRoomY, targetRoomZ = 0] = roomId.split(",").map(Number);
    return Array.from(this.bosses.values()).filter((boss) => {
      const [, , bossRoomZ = 0] = boss.roomId.split(",").map(Number);
      if (bossRoomZ !== targetRoomZ) {
        return false;
      }
      return boss.body.some((segment) => {
        const roomX = Math.floor(segment.x / this.grid.cols);
        const roomY = Math.floor(segment.y / this.grid.rows);
        return roomX === targetRoomX && roomY === targetRoomY;
      });
    });
  }

  public isCollidingWithBoss(position: Vector2Like, roomId: string): boolean {
    return Boolean(this.getBossAtPosition(position, roomId));
  }

  public getBossAtPosition(position: Vector2Like, roomId: string): Boss | null {
    const bossesInRoom = this.getBossesInRoom(roomId);
    for (const boss of bossesInRoom) {
      if (boss.body.some((segment) => segment.x === position.x && segment.y === position.y)) {
        return boss;
      }
    }
    return null;
  }

  public killBossAtPosition(position: Vector2Like, roomId: string): boolean {
    // Remove the first boss that contains the position
    for (const [id, boss] of this.bosses) {
      if (boss.roomId.split(",")[2] !== roomId.split(",")[2]) continue;
      if (boss.body.some((segment) => segment.x === position.x && segment.y === position.y)) {
        this.bosses.delete(id);
        return true;
      }
    }
    return false;
  }

  public hasBoss(id: string): boolean {
    return this.bosses.has(id);
  }

  public hasBossWithKind(kind: Boss["kind"]): boolean {
    return Array.from(this.bosses.values()).some((boss) => boss.kind === kind);
  }

  public getBossHeadRoomId(id: string): string | null {
    const boss = this.bosses.get(id);
    const head = boss?.kind === "freak-you" ? boss.headCenter ?? boss.body[1] ?? boss.body[0] : boss?.body[0];
    if (!boss || !head) {
      return null;
    }
    const [, , roomZ = 0] = boss.roomId.split(",").map(Number);
    return `${Math.floor(head.x / this.grid.cols)},${Math.floor(head.y / this.grid.rows)},${roomZ}`;
  }

 public getPullFor(snakeHead: Vector2Like, roomId: string, rng: () => number): Vector2Like | null {
    const bossesInRoom = this.getBossesInRoom(roomId);
    for (const boss of bossesInRoom) {
      if (!boss.pull || !boss.body.length) continue;

      const bossHead = boss.body[0];
      const distance = manhattanDistance(snakeHead, bossHead);

      if (distance > 0 && distance <= boss.pull.radius) {
        if (boss.kind === "freaker-dennis") {
          if (rng() > boss.pull.strength * 0.8) {
            return null;
          }
        } else {
          if (rng() > boss.pull.strength) {
            return null;
          }
        }

        const dx = bossHead.x - snakeHead.x;
        const dy = bossHead.y - snakeHead.y;

        if (Math.abs(dx) > Math.abs(dy)) {
          return { x: Math.sign(dx), y: 0 };
        }
        if (Math.abs(dy) > 0) {
          return { x: 0, y: Math.sign(dy) };
        }
      }
    }

    return null;
  }

  private moveBoss(boss: Boss, deps: BossStepDependencies): void {
    if (boss.kind === "angel") {
      this.moveAngelBoss(boss, deps);
      return;
    }

    if (Math.random() < 0.2) {
      const directions = [
        { x: 1, y: 0 },
        { x: -1, y: 0 },
        { x: 0, y: 1 },
        { x: 0, y: -1 },
      ];
      const validDirections = directions.filter(
        (d) => d.x + boss.direction.x !== 0 || d.y + boss.direction.y !== 0
      );
      const choices = validDirections.length > 0 ? validDirections : directions;
      boss.direction = choices[Math.floor(Math.random() * choices.length)];
    }

    if (!boss.body.length) {
      return;
    }

    const nextHead = addVectors(boss.body[0], boss.direction);
    const [, , roomZ = 0] = boss.roomId.split(",").map(Number);

    const targetRoomX = Math.floor(nextHead.x / this.grid.cols);
    const targetRoomY = Math.floor(nextHead.y / this.grid.rows);
    const baseRoomX = targetRoomX * this.grid.cols;
    const baseRoomY = targetRoomY * this.grid.rows;
    const localHeadX = nextHead.x - baseRoomX;
    const localHeadY = nextHead.y - baseRoomY;

    const targetRoomId = `${targetRoomX},${targetRoomY},${roomZ}`;
    const targetRoom = deps.getRoom(targetRoomId);
    if (!targetRoom) {
      boss.direction = { x: -boss.direction.x, y: -boss.direction.y };
      return;
    }

    const tile = targetRoom.layout[localHeadY]?.[localHeadX];
    if (tile === "#") {
      boss.direction = { x: -boss.direction.x, y: -boss.direction.y };
      return;
    }

    const moveVector = boss.direction;
    boss.body = boss.body.map((segment) => addVectors(segment, moveVector));
    boss.roomId = targetRoomId;
  }

  private moveFreakerDennis(boss: Boss, deps: BossStepDependencies): void {
    if (!boss.trackingMode) {
      this.moveStandardBoss(boss, deps);
      return;
    }

    const snakeHead = deps.getSnakeBody()[0];
    const bossHead = boss.body[0];
    if (!snakeHead || !bossHead) {
      this.moveStandardBoss(boss, deps);
      return;
    }

    const playerRoomX = Math.floor(snakeHead.x / this.grid.cols);
    const playerRoomY = Math.floor(snakeHead.y / this.grid.rows);
    const bossRoomX = Math.floor(bossHead.x / this.grid.cols);
    const bossRoomY = Math.floor(bossHead.y / this.grid.rows);

    if (playerRoomX === bossRoomX && playerRoomY === bossRoomY) {
      this.moveTrackingBoss(boss, snakeHead, deps);
    } else {
      this.moveStandardBoss(boss, deps);
    }
  }

  private moveTrackingBoss(boss: Boss, snakeHead: Vector2Like, deps: BossStepDependencies): void {
    const bossHead = boss.body[0];
    const dx = snakeHead.x - bossHead.x;
    const dy = snakeHead.y - bossHead.y;
    const distance = Math.abs(dx) + Math.abs(dy);

    let targetDirection: Vector2Like;
    let shouldMove = false;

    if (distance > 0) {
      const normalizedDx = dx / distance;
      const normalizedDy = dy / distance;

      targetDirection = {
        x: normalizedDx > 0.5 ? 1 : normalizedDx < -0.5 ? -1 : 0,
        y: normalizedDy > 0.5 ? 1 : normalizedDy < -0.5 ? -1 : 0,
      };

      if (targetDirection.x !== 0 && boss.direction.x !== 0) return;
      if (targetDirection.y !== 0 && boss.direction.y !== 0) return;

      if (Math.random() < 0.7) {
        shouldMove = true;
      }
    }

    if (!shouldMove) {
      if (Math.random() < 0.2) {
        const directions = [
          { x: 1, y: 0 },
          { x: -1, y: 0 },
          { x: 0, y: 1 },
          { x: 0, y: -1 },
        ];
        const validDirections = directions.filter(
          (d) => d.x + boss.direction.x !== 0 || d.y + boss.direction.y !== 0
        );
        boss.direction = validDirections[Math.floor(Math.random() * validDirections.length)];
      }
    }

    if (boss.body.length > 0) {
      this.attemptMove(boss, boss.direction, deps);
    }
  }

  private moveStandardBoss(boss: Boss, deps: BossStepDependencies): void {
    if (Math.random() < 0.2) {
      const directions = [
        { x: 1, y: 0 },
        { x: -1, y: 0 },
        { x: 0, y: 1 },
        { x: 0, y: -1 },
      ];
      const validDirections = directions.filter(
        (d) => d.x + boss.direction.x !== 0 || d.y + boss.direction.y !== 0
      );
      const choices = validDirections.length > 0 ? validDirections : directions;
      boss.direction = choices[Math.floor(Math.random() * choices.length)];
    }

    if (boss.body.length > 0) {
      this.attemptMove(boss, boss.direction, deps);
    }
  }

  private moveAngelBoss(boss: Boss, deps: BossStepDependencies): void {
    const snakeHead = deps.getSnakeBody()[0];
    const bossHead = boss.body[0];
    if (!snakeHead || !bossHead) {
      return;
    }

    const dx = snakeHead.x - bossHead.x;
    const dy = snakeHead.y - bossHead.y;
    const preferred =
      Math.abs(dx) >= Math.abs(dy)
        ? [{ x: Math.sign(dx), y: 0 }, { x: 0, y: Math.sign(dy) }]
        : [{ x: 0, y: Math.sign(dy) }, { x: Math.sign(dx), y: 0 }];

    const directions = preferred.filter((direction) => direction.x !== 0 || direction.y !== 0);
    for (const direction of directions) {
      if (this.tryMoveBoss(boss, direction, deps)) {
        return;
      }
    }
  }

  private moveFreakYou(boss: Boss, deps: BossStepDependencies): void {
    const snakeBody = deps.getSnakeBody();
    const snakeHead = snakeBody[0];
    const bossHead = this.getFreakYouHeadCenter(boss);
    if (!snakeHead || !bossHead) {
      return;
    }

    const shouldConsiderTurn = (boss.turnCounter ?? 0) >= 20;
    const directions = shouldConsiderTurn ? this.preferredTrackingDirections(boss, snakeHead) : [boss.direction];
    for (const direction of directions) {
      if (this.tryMoveFreakYou(boss, direction, deps, snakeBody)) {
        return;
      }
    }

    for (const direction of this.preferredTrackingDirections(boss, snakeHead)) {
      if (direction.x === boss.direction.x && direction.y === boss.direction.y) {
        continue;
      }
      if (this.tryMoveFreakYou(boss, direction, deps, snakeBody)) {
        return;
      }
    }
  }

  private preferredTrackingDirections(boss: Boss, target: Vector2Like): Vector2Like[] {
    const head = this.getFreakYouHeadCenter(boss);
    if (!head) {
      return [boss.direction];
    }
    const dx = target.x - head.x;
    const dy = target.y - head.y;
    const primary = Math.abs(dx) >= Math.abs(dy)
      ? { x: Math.sign(dx), y: 0 }
      : { x: 0, y: Math.sign(dy) };
    const secondary = Math.abs(dx) >= Math.abs(dy)
      ? { x: 0, y: Math.sign(dy) }
      : { x: Math.sign(dx), y: 0 };
    const options = [primary, secondary, boss.direction, { x: boss.direction.y, y: -boss.direction.x }, { x: -boss.direction.y, y: boss.direction.x }]
      .filter((direction) => direction.x !== 0 || direction.y !== 0)
      .filter((direction) => direction.x + boss.direction.x !== 0 || direction.y + boss.direction.y !== 0);
    return options.length > 0 ? options : [boss.direction];
  }

  private tryMoveFreakYou(
    boss: Boss,
    direction: Vector2Like,
    deps: BossStepDependencies,
    snakeBody: readonly Vector2Like[]
  ): boolean {
    if (direction.x + boss.direction.x === 0 && direction.y + boss.direction.y === 0) {
      return false;
    }
    const head = this.getFreakYouHeadCenter(boss);
    if (!head) {
      return false;
    }
    const changedDirection = direction.x !== boss.direction.x || direction.y !== boss.direction.y;
    if (changedDirection && !this.canFreakYouTurnWithMargin(head, direction)) {
      return false;
    }
    const nextCenter = addVectors(head, direction);
    const nextBand = this.wideHeadBand(nextCenter, direction);
    for (const cell of nextBand) {
      const [, , roomZ = 0] = boss.roomId.split(",").map(Number);
      const targetRoomX = Math.floor(cell.x / this.grid.cols);
      const targetRoomY = Math.floor(cell.y / this.grid.rows);
      const localHeadX = cell.x - targetRoomX * this.grid.cols;
      const localHeadY = cell.y - targetRoomY * this.grid.rows;
      const targetRoom = deps.getRoom(`${targetRoomX},${targetRoomY},${roomZ}`);
      if (targetRoom.layout[localHeadY]?.[localHeadX] === "#") {
        this.carveBossWall(targetRoom, localHeadX, localHeadY);
      }
    }

    const playerBodyWithoutHead = snakeBody.slice(1);
    if (nextBand.some((cell) => playerBodyWithoutHead.some((segment) => segment.x === cell.x && segment.y === cell.y))) {
      this.bosses.delete(boss.id);
      return true;
    }

    boss.direction = direction;
    boss.headCenter = nextCenter;
    boss.turnCounter = changedDirection ? 0 : (boss.turnCounter ?? 0) + 1;
    const maxBodyCells = Math.max(nextBand.length, boss.maxBodyCells ?? 400 * 3);
    const keepLength = boss.body.length < maxBodyCells
      ? boss.body.length
      : Math.max(0, maxBodyCells - nextBand.length);
    boss.body = [...nextBand, ...boss.body.slice(0, keepLength)];
    const [, , roomZ = 0] = boss.roomId.split(",").map(Number);
    boss.roomId = `${Math.floor(nextCenter.x / this.grid.cols)},${Math.floor(nextCenter.y / this.grid.rows)},${roomZ}`;
    return true;
  }

  private getFreakYouHeadCenter(boss: Boss): Vector2Like | null {
    return boss.headCenter ?? boss.body[1] ?? boss.body[0] ?? null;
  }

  private canFreakYouTurnWithMargin(head: Vector2Like, direction: Vector2Like): boolean {
    const nextCenter = addVectors(head, direction);
    return this.wideHeadBand(nextCenter, direction).every((cell) => this.isInsideFreakYouTurnMargin(cell));
  }

  private isInsideFreakYouTurnMargin(cell: Vector2Like): boolean {
    const localX = this.mod(cell.x, this.grid.cols);
    const localY = this.mod(cell.y, this.grid.rows);
    return (
      localX >= FREAK_YOU_TURN_MARGIN &&
      localX <= this.grid.cols - 1 - FREAK_YOU_TURN_MARGIN &&
      localY >= FREAK_YOU_TURN_MARGIN &&
      localY <= this.grid.rows - 1 - FREAK_YOU_TURN_MARGIN
    );
  }

  private mod(value: number, divisor: number): number {
    return ((value % divisor) + divisor) % divisor;
  }

  private wideHeadBand(center: Vector2Like, direction: Vector2Like): Vector2Like[] {
    const perpendicular = direction.x !== 0 ? { x: 0, y: 1 } : { x: 1, y: 0 };
    return [-1, 0, 1].map((offset) => ({
      x: center.x + perpendicular.x * offset,
      y: center.y + perpendicular.y * offset,
    }));
  }

  private carveBossWall(room: RoomSnapshot, localX: number, localY: number): void {
    const row = room.layout[localY];
    if (!row || row[localX] !== "#") {
      return;
    }
    room.layout[localY] = `${row.slice(0, localX)}.${row.slice(localX + 1)}`;
  }

  private tryMoveBoss(boss: Boss, direction: Vector2Like, deps: BossStepDependencies): boolean {
    const nextHead = addVectors(boss.body[0], direction);
    const [, , roomZ = 0] = boss.roomId.split(",").map(Number);
    const targetRoomX = Math.floor(nextHead.x / this.grid.cols);
    const targetRoomY = Math.floor(nextHead.y / this.grid.rows);
    const baseRoomX = targetRoomX * this.grid.cols;
    const baseRoomY = targetRoomY * this.grid.rows;
    const localHeadX = nextHead.x - baseRoomX;
    const localHeadY = nextHead.y - baseRoomY;
    const targetRoomId = `${targetRoomX},${targetRoomY},${roomZ}`;
    const targetRoom = deps.getRoom(targetRoomId);
    if (!targetRoom || targetRoom.layout[localHeadY]?.[localHeadX] === "#") {
      return false;
    }

    boss.direction = direction;
    boss.body = boss.body.map((segment) => addVectors(segment, direction));
    boss.roomId = targetRoomId;
    return true;
  }

  public clearAll(): void {
    this.bosses.clear();
  }

  private attemptMove(boss: Boss, direction: Vector2Like, deps: BossStepDependencies): void {
    const nextHead = addVectors(boss.body[0], direction);
    const [, , roomZ = 0] = boss.roomId.split(",").map(Number);

    const targetRoomX = Math.floor(nextHead.x / this.grid.cols);
    const targetRoomY = Math.floor(nextHead.y / this.grid.rows);
    const baseRoomX = targetRoomX * this.grid.cols;
    const baseRoomY = targetRoomY * this.grid.rows;
    const localHeadX = nextHead.x - baseRoomX;
    const localHeadY = nextHead.y - baseRoomY;

    const targetRoomId = `${targetRoomX},${targetRoomY},${roomZ}`;
    const targetRoom = deps.getRoom(targetRoomId);
    if (!targetRoom) {
      boss.direction = { x: -boss.direction.x, y: -boss.direction.y };
      return;
    }

    const tile = targetRoom.layout[localHeadY]?.[localHeadX];
    if (tile === "#") {
      boss.direction = { x: -boss.direction.x, y: -boss.direction.y };
      return;
    }

    const moveVector = boss.direction;
    boss.body = boss.body.map((segment) => addVectors(segment, moveVector));
    boss.roomId = targetRoomId;
  }
}
