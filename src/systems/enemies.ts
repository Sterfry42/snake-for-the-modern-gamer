import type { GridConfig } from "../config/gameConfig.js";
import type { Vector2Like } from "../core/math.js";
import type { RandomGenerator } from "../core/rng.js";
import type { RoomSnapshot } from "../world/types.js";
import { getBiomeDefinition, getBiomeEnemySpawnChance } from "../world/biomes.js";

export interface EnemyInstance {
  id: string;
  roomId: string;
  position: Vector2Like;
  fireCooldown: number;
  moveCooldown: number;
  aimDirection: Vector2Like;
  flashTicks: number;
  name?: string;
  currentHearts?: number;
  maxHearts?: number;
  encounterKind?: "enemy" | "duelist" | "npc-hostile";
}

export interface BulletInstance {
  id: string;
  roomId: string;
  position: Vector2Like;
  direction: Vector2Like;
  owner: "enemy" | "player";
  style?: "enemy" | "npc-hostile" | "duelist" | "freak-joey" | "player";
}

export interface DuelBossDisplay {
  id: string;
  name: string;
  health: number;
  maxHealth: number;
  roomId: string;
  body: Vector2Like[];
}

interface EnemyStepParams {
  getRoom(roomId: string): RoomSnapshot;
  snake: readonly Vector2Like[];
  currentRoomId: string;
  snakeDirection: Vector2Like;
}

interface EnemyStepResult {
  bulletHits: number;
  hitStyle?: BulletInstance["style"];
}

function localToGlobal(roomId: string, position: Vector2Like, grid: GridConfig): Vector2Like {
  const [roomX, roomY] = roomId.split(",").map(Number);
  return {
    x: roomX * grid.cols + position.x,
    y: roomY * grid.rows + position.y,
  };
}

function globalToLocal(roomId: string, position: Vector2Like, grid: GridConfig): Vector2Like {
  const [roomX, roomY] = roomId.split(",").map(Number);
  return {
    x: position.x - roomX * grid.cols,
    y: position.y - roomY * grid.rows,
  };
}

export class EnemyManager {
  private readonly enemies = new Map<string, EnemyInstance[]>();
  private readonly bullets = new Map<string, BulletInstance[]>();
  private idCounter = 0;

  constructor(
    private readonly grid: GridConfig,
    private readonly rng: RandomGenerator
  ) {}

  clearAll(): void {
    this.enemies.clear();
    this.bullets.clear();
    this.idCounter = 0;
  }

  ensureEnemy(roomId: string, room: RoomSnapshot, occupied: readonly Vector2Like[]): void {
    if (roomId === "0,-1,0") {
      return;
    }
    if (room.village) {
      return;
    }
    if ((this.enemies.get(roomId)?.length ?? 0) > 0) {
      return;
    }
    const biome = getBiomeDefinition(room.biomeId);
    if (this.rng() > getBiomeEnemySpawnChance(biome)) {
      return;
    }

    const candidates: Vector2Like[] = [];
    for (let y = 0; y < this.grid.rows; y++) {
      for (let x = 0; x < this.grid.cols; x++) {
        if (room.layout[y]?.[x] === "#") continue;
        if (room.apple && room.apple.x === x && room.apple.y === y) continue;
        if (room.treasure && room.treasure.x === x && room.treasure.y === y) continue;
        if (room.powerup && room.powerup.x === x && room.powerup.y === y) continue;
        if (room.questGiver && room.questGiver.x === x && room.questGiver.y === y) continue;
        if (occupied.some((segment) => segment.x === x && segment.y === y)) continue;
        candidates.push({ x, y });
      }
    }

    if (candidates.length === 0) {
      return;
    }

    const position = candidates[Math.floor(this.rng() * candidates.length)];
    const enemy: EnemyInstance = {
      id: `enemy-${this.idCounter++}`,
      roomId,
      position,
      fireCooldown: Math.max(4, 8 + biome.enemyFireBias + Math.floor(this.rng() * 5)),
      moveCooldown: Math.max(2, 4 + biome.enemyMoveBias + Math.floor(this.rng() * 4)),
      aimDirection: { x: 0, y: 1 },
      flashTicks: 0,
      currentHearts: 1,
      maxHearts: 1,
      encounterKind: "enemy",
    };
    this.enemies.set(roomId, [enemy]);
  }

  spawnHostileNpc(roomId: string, position: Vector2Like, name: string, hearts: number): EnemyInstance {
    const id = `npc-hostile:${roomId}`;
    const existing = (this.enemies.get(roomId) ?? []).find((enemy) => enemy.id === id);
    if (existing) {
      return existing;
    }
    const hostileNpc: EnemyInstance = {
      id,
      roomId,
      position,
      fireCooldown: 7,
      moveCooldown: 3,
      aimDirection: { x: 0, y: 1 },
      flashTicks: 0,
      name,
      currentHearts: hearts,
      maxHearts: hearts,
      encounterKind: "npc-hostile",
    };
    const current = this.enemies.get(roomId) ?? [];
    current.push(hostileNpc);
    this.enemies.set(roomId, current);
    return hostileNpc;
  }

  spawnDuelist(
    roomId: string,
    room: RoomSnapshot,
    occupied: readonly Vector2Like[],
    options: { id: string; name: string; hearts: number }
  ): EnemyInstance | null {
    const existing = (this.enemies.get(roomId) ?? []).find((enemy) => enemy.id === options.id);
    if (existing) {
      return existing;
    }

    const candidates: Vector2Like[] = [];
    for (let y = 0; y < this.grid.rows; y++) {
      for (let x = 0; x < this.grid.cols; x++) {
        if (room.layout[y]?.[x] === "#") continue;
        if (room.apple && room.apple.x === x && room.apple.y === y) continue;
        if (room.treasure && room.treasure.x === x && room.treasure.y === y) continue;
        if (room.powerup && room.powerup.x === x && room.powerup.y === y) continue;
        if (room.questGiver && room.questGiver.x === x && room.questGiver.y === y) continue;
        if (occupied.some((segment) => segment.x === x && segment.y === y)) continue;
        candidates.push({ x, y });
      }
    }
    if (candidates.length === 0) {
      return null;
    }

    const position = candidates[Math.floor(this.rng() * candidates.length)];
    const duelist: EnemyInstance = {
      id: options.id,
      roomId,
      position,
      fireCooldown: 6,
      moveCooldown: 2,
      aimDirection: { x: -1, y: 0 },
      flashTicks: 0,
      name: options.name,
      currentHearts: options.hearts,
      maxHearts: options.hearts,
      encounterKind: "duelist",
    };
    const current = this.enemies.get(roomId) ?? [];
    current.push(duelist);
    this.enemies.set(roomId, current);
    return duelist;
  }

  spawnFreakJoey(roomId: string, room: RoomSnapshot, occupied: readonly Vector2Like[]): EnemyInstance | null {
    return this.spawnDuelist(roomId, room, occupied, {
      id: "freak-joey",
      name: "Freak Joey",
      hearts: 15,
    });
  }

  step(params: EnemyStepParams): EnemyStepResult {
    const { getRoom, snake, currentRoomId, snakeDirection } = params;
    let bulletHits = 0;
    let hitStyle: BulletInstance["style"] | undefined;

    for (const [roomId, bullets] of this.bullets) {
      const room = getRoom(roomId);
      const nextBullets: BulletInstance[] = [];

      for (const bullet of bullets) {
        const nextPosition = {
          x: bullet.position.x + bullet.direction.x,
          y: bullet.position.y + bullet.direction.y,
        };

        if (
          nextPosition.x < 0 ||
          nextPosition.x >= this.grid.cols ||
          nextPosition.y < 0 ||
          nextPosition.y >= this.grid.rows
        ) {
          continue;
        }

        if (room.layout[nextPosition.y]?.[nextPosition.x] === "#") {
          continue;
        }

        const bulletGlobal = localToGlobal(roomId, nextPosition, this.grid);
        if (bullet.owner === "enemy") {
          if (
            roomId === currentRoomId &&
            snake.some((segment) => segment.x === bulletGlobal.x && segment.y === bulletGlobal.y)
          ) {
            bulletHits += 1;
            hitStyle ??= bullet.style;
            continue;
          }
        } else {
          const enemies = this.enemies.get(roomId) ?? [];
          const hitEnemy = enemies.find(
            (enemy) => enemy.position.x === nextPosition.x && enemy.position.y === nextPosition.y
          );
          if (hitEnemy) {
            this.damageEnemyById(roomId, hitEnemy.id, 1);
            continue;
          }
        }

        nextBullets.push({ ...bullet, position: nextPosition });
      }

      if (nextBullets.length > 0) {
        this.bullets.set(roomId, nextBullets);
      } else {
        this.bullets.delete(roomId);
      }
    }

    const head = snake[0];
    if (!head) {
      return { bulletHits, hitStyle };
    }

    const roomEnemies = this.enemies.get(currentRoomId) ?? [];
    if (roomEnemies.length === 0) {
      return { bulletHits, hitStyle };
    }

    const room = getRoom(currentRoomId);
    const headLocal = globalToLocal(currentRoomId, head, this.grid);
    const nextEnemies: EnemyInstance[] = [];

    for (const enemy of roomEnemies) {
      if (enemy.position.x === headLocal.x && enemy.position.y === headLocal.y) {
        nextEnemies.push({
          ...enemy,
          fireCooldown: Math.max(0, enemy.fireCooldown - 1),
          flashTicks: Math.max(0, enemy.flashTicks - 1),
        });
        continue;
      }

      const nextCooldown = enemy.fireCooldown - 1;
      let moveCooldown = enemy.moveCooldown - 1;
      let position = enemy.position;
      let aimDirection = enemy.aimDirection;
      let flashTicks = Math.max(0, enemy.flashTicks - 1);

      const snakeCharging = this.isSnakeChargingEnemy(enemy.position, headLocal, snakeDirection);

      if (moveCooldown <= 0) {
        position = snakeCharging
          ? this.tryMoveEnemyAway(enemy, room, headLocal)
          : this.tryMoveEnemy(enemy, room, headLocal);
        moveCooldown = enemy.encounterKind === "duelist"
          ? (snakeCharging ? 4 : 2) + Math.floor(this.rng() * 2)
          : (snakeCharging ? 7 : 5) + Math.floor(this.rng() * 5);
      }

      if (nextCooldown <= 0 && !snakeCharging) {
        const shot = this.tryCreateShot({ ...enemy, position }, headLocal, room);
        if (shot) {
          const bullets = this.bullets.get(currentRoomId) ?? [];
          bullets.push(shot, ...this.createBonusShots(enemy, shot, room));
          this.bullets.set(currentRoomId, bullets);
          aimDirection = shot.direction;
          flashTicks = 2;
          nextEnemies.push({
            ...enemy,
            position,
            moveCooldown,
            aimDirection,
            flashTicks,
            fireCooldown: enemy.encounterKind === "duelist"
              ? 4 + Math.floor(this.rng() * 3)
              : 12 + Math.floor(this.rng() * 6),
          });
          continue;
        }
      }

      const trackedAim = this.resolveAimDirection(position, headLocal) ?? aimDirection;

      nextEnemies.push({
        ...enemy,
        position,
        moveCooldown,
        aimDirection: trackedAim,
        flashTicks,
        fireCooldown: snakeCharging ? Math.max(2, nextCooldown) : Math.max(0, nextCooldown),
      });
    }

    if (nextEnemies.length > 0) {
      this.enemies.set(currentRoomId, nextEnemies);
    } else {
      this.enemies.delete(currentRoomId);
    }

    return { bulletHits, hitStyle };
  }

  consumeEnemyAt(roomId: string, head: Vector2Like): { eaten: boolean } {
    const enemies = this.enemies.get(roomId) ?? [];
    if (enemies.length === 0) {
      return { eaten: false };
    }

    const headLocal = globalToLocal(roomId, head, this.grid);
    const target = enemies.find(
      (enemy) => enemy.position.x === headLocal.x && enemy.position.y === headLocal.y
    );
    if (!target || target.encounterKind !== "enemy") {
      return { eaten: false };
    }
    const remaining = enemies.filter((enemy) => enemy.id !== target.id);

    if (remaining.length === enemies.length) {
      return { eaten: false };
    }

    if (remaining.length > 0) {
      this.enemies.set(roomId, remaining);
    } else {
      this.enemies.delete(roomId);
    }

    return { eaten: true };
  }

  getEnemiesInRoom(roomId: string): readonly EnemyInstance[] {
    return this.enemies.get(roomId) ?? [];
  }

  getBulletsInRoom(roomId: string): readonly BulletInstance[] {
    return this.bullets.get(roomId) ?? [];
  }

  hasHarmfulOccupantAt(roomId: string, worldPosition: Vector2Like): boolean {
    const local = globalToLocal(roomId, worldPosition, this.grid);
    return (this.enemies.get(roomId) ?? []).some(
      (enemy) =>
        enemy.position.x === local.x &&
        enemy.position.y === local.y &&
        enemy.encounterKind !== "enemy"
    );
  }

  firePlayerBullet(roomId: string, origin: Vector2Like, direction: Vector2Like): boolean {
    const spawnX = origin.x + direction.x;
    const spawnY = origin.y + direction.y;
    if (
      spawnX < 0 ||
      spawnX >= this.grid.cols ||
      spawnY < 0 ||
      spawnY >= this.grid.rows
    ) {
      return false;
    }

    const directHit = (this.enemies.get(roomId) ?? []).find(
      (enemy) => enemy.position.x === spawnX && enemy.position.y === spawnY
    );
    if (directHit) {
      this.damageEnemyById(roomId, directHit.id, 1);
      return true;
    }

    const bullets = this.bullets.get(roomId) ?? [];
    bullets.push({
      id: `bullet-${this.idCounter++}`,
      roomId,
      position: { x: spawnX, y: spawnY },
      direction,
      owner: "player",
      style: "player",
    });
    this.bullets.set(roomId, bullets);
    return true;
  }

  damageEnemyAt(roomId: string, worldPosition: Vector2Like, damage = 1): { hit: boolean; defeated?: EnemyInstance } {
    const local = globalToLocal(roomId, worldPosition, this.grid);
    const target = (this.enemies.get(roomId) ?? []).find(
      (enemy) => enemy.position.x === local.x && enemy.position.y === local.y
    );
    if (!target) {
      return { hit: false };
    }
    const defeated = this.damageEnemyById(roomId, target.id, damage);
    return { hit: true, defeated };
  }

  getDuelBossInRoom(roomId: string): DuelBossDisplay | null {
    const duelist = (this.enemies.get(roomId) ?? []).find((enemy) => enemy.encounterKind === "duelist");
    if (!duelist || duelist.currentHearts === undefined || duelist.maxHearts === undefined) {
      return null;
    }
    const [roomX, roomY] = roomId.split(",").map(Number);
    return {
      id: duelist.id,
      name: duelist.name ?? "Nameless Horror",
      health: duelist.currentHearts,
      maxHealth: duelist.maxHearts,
      roomId,
      body: [{
        x: roomX * this.grid.cols + duelist.position.x,
        y: roomY * this.grid.rows + duelist.position.y,
      }],
    };
  }

  hasEnemyWithId(id: string): boolean {
    for (const enemies of this.enemies.values()) {
      if (enemies.some((enemy) => enemy.id === id)) {
        return true;
      }
    }
    return false;
  }

  private tryCreateShot(
    enemy: EnemyInstance,
    headLocal: Vector2Like,
    room: RoomSnapshot
  ): BulletInstance | null {
    let direction: Vector2Like | null = null;

    if (enemy.position.x === headLocal.x) {
      direction = { x: 0, y: headLocal.y > enemy.position.y ? 1 : -1 };
    } else if (enemy.position.y === headLocal.y) {
      direction = { x: headLocal.x > enemy.position.x ? 1 : -1, y: 0 };
    }

    if (!direction) {
      return null;
    }

    let cx = enemy.position.x + direction.x;
    let cy = enemy.position.y + direction.y;

    while (cx >= 0 && cx < this.grid.cols && cy >= 0 && cy < this.grid.rows) {
      if (room.layout[cy]?.[cx] === "#") {
        return null;
      }
      if (cx === headLocal.x && cy === headLocal.y) {
        break;
      }
      cx += direction.x;
      cy += direction.y;
    }

    if (cx !== headLocal.x || cy !== headLocal.y) {
      return null;
    }

    const spawnX = enemy.position.x + direction.x;
    const spawnY = enemy.position.y + direction.y;
    if (
      spawnX < 0 ||
      spawnX >= this.grid.cols ||
      spawnY < 0 ||
      spawnY >= this.grid.rows ||
      room.layout[spawnY]?.[spawnX] === "#"
    ) {
      return null;
    }

    return {
      id: `bullet-${this.idCounter++}`,
      roomId: enemy.roomId,
      position: { x: spawnX, y: spawnY },
      direction,
      owner: "enemy",
      style:
        enemy.encounterKind === "npc-hostile" ? "npc-hostile" :
        enemy.encounterKind === "duelist" && enemy.id === "freak-joey" ? "freak-joey" :
        enemy.encounterKind === "duelist" ? "duelist" :
        "enemy",
    };
  }

  private createBonusShots(
    enemy: EnemyInstance,
    shot: BulletInstance,
    room: RoomSnapshot
  ): BulletInstance[] {
    if (enemy.encounterKind !== "duelist") {
      return [];
    }

    const origin = shot.position;
    const orthogonal =
      shot.direction.x !== 0
        ? [{ x: 0, y: -1 }, { x: 0, y: 1 }]
        : [{ x: -1, y: 0 }, { x: 1, y: 0 }];

    const candidates = orthogonal.filter((direction) => {
      const nx = origin.x + direction.x;
      const ny = origin.y + direction.y;
      return (
        nx >= 0 &&
        nx < this.grid.cols &&
        ny >= 0 &&
        ny < this.grid.rows &&
        room.layout[ny]?.[nx] !== "#"
      );
    });

    const selected =
      enemy.id === "freak-joey"
        ? candidates
        : candidates.length > 0
          ? [candidates[Math.floor(this.rng() * candidates.length)]]
          : [];

    return selected.map((direction) => ({
      id: `bullet-${this.idCounter++}`,
      roomId: enemy.roomId,
      position: origin,
      direction,
      owner: "enemy" as const,
      style: enemy.id === "freak-joey" ? "freak-joey" : "duelist",
    }));
  }

  private tryMoveEnemy(
    enemy: EnemyInstance,
    room: RoomSnapshot,
    headLocal: Vector2Like
  ): Vector2Like {
    const directions: Vector2Like[] = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ];

    const shuffled = directions
      .map((direction) => ({ direction, roll: this.rng() }))
      .sort((a, b) => a.roll - b.roll)
      .map((entry) => entry.direction);

    for (const direction of shuffled) {
      const next = {
        x: enemy.position.x + direction.x,
        y: enemy.position.y + direction.y,
      };
      if (
        next.x < 0 ||
        next.x >= this.grid.cols ||
        next.y < 0 ||
        next.y >= this.grid.rows
      ) {
        continue;
      }
      if (room.layout[next.y]?.[next.x] === "#") {
        continue;
      }
      if (next.x === headLocal.x && next.y === headLocal.y) {
        continue;
      }
      return next;
    }

    return enemy.position;
  }

  private tryMoveEnemyAway(
    enemy: EnemyInstance,
    room: RoomSnapshot,
    headLocal: Vector2Like
  ): Vector2Like {
    const dx = Math.sign(enemy.position.x - headLocal.x);
    const dy = Math.sign(enemy.position.y - headLocal.y);
    const preferred: Vector2Like[] = [];
    if (Math.abs(enemy.position.x - headLocal.x) >= Math.abs(enemy.position.y - headLocal.y) && dx !== 0) {
      preferred.push({ x: dx, y: 0 });
    }
    if (dy !== 0) {
      preferred.push({ x: 0, y: dy });
    }
    if (dx !== 0 && !preferred.some((dir) => dir.x === dx && dir.y === 0)) {
      preferred.push({ x: dx, y: 0 });
    }
    preferred.push(...[
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ].sort(() => this.rng() - 0.5));

    let best = enemy.position;
    let bestDistance = Math.abs(enemy.position.x - headLocal.x) + Math.abs(enemy.position.y - headLocal.y);
    for (const direction of preferred) {
      const next = {
        x: enemy.position.x + direction.x,
        y: enemy.position.y + direction.y,
      };
      if (
        next.x < 0 ||
        next.x >= this.grid.cols ||
        next.y < 0 ||
        next.y >= this.grid.rows ||
        room.layout[next.y]?.[next.x] === "#"
      ) {
        continue;
      }
      const distance = Math.abs(next.x - headLocal.x) + Math.abs(next.y - headLocal.y);
      if (distance > bestDistance) {
        best = next;
        bestDistance = distance;
      }
    }
    return best;
  }

  private isSnakeChargingEnemy(enemyPosition: Vector2Like, headLocal: Vector2Like, snakeDirection: Vector2Like): boolean {
    if (snakeDirection.x !== 0 && headLocal.y === enemyPosition.y) {
      return Math.sign(enemyPosition.x - headLocal.x) === snakeDirection.x;
    }
    if (snakeDirection.y !== 0 && headLocal.x === enemyPosition.x) {
      return Math.sign(enemyPosition.y - headLocal.y) === snakeDirection.y;
    }
    return false;
  }

  private resolveAimDirection(
    position: Vector2Like,
    headLocal: Vector2Like
  ): Vector2Like | null {
    const dx = headLocal.x - position.x;
    const dy = headLocal.y - position.y;
    if (Math.abs(dx) >= Math.abs(dy) && dx !== 0) {
      return { x: dx > 0 ? 1 : -1, y: 0 };
    }
    if (dy !== 0) {
      return { x: 0, y: dy > 0 ? 1 : -1 };
    }
    return null;
  }

  private damageEnemyById(roomId: string, enemyId: string, damage: number): EnemyInstance | undefined {
    const enemies = this.enemies.get(roomId) ?? [];
    const target = enemies.find((enemy) => enemy.id === enemyId);
    if (!target) {
      return undefined;
    }
    const currentHearts = target.currentHearts ?? 1;
    const nextHearts = Math.max(0, currentHearts - Math.max(1, damage));
    target.currentHearts = nextHearts;
    if (nextHearts > 0) {
      return undefined;
    }
    const remaining = enemies.filter((enemy) => enemy.id !== enemyId);
    if (remaining.length > 0) {
      this.enemies.set(roomId, remaining);
    } else {
      this.enemies.delete(roomId);
    }
    return target;
  }
}
