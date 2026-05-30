import type { GridConfig } from '../config/gameConfig.js';
import type { Vector2Like } from '../core/math.js';
import type { RandomGenerator } from '../core/rng.js';
import type { RoomSnapshot } from '../world/types.js';
import { getBiomeDefinition, getBiomeEnemySpawnChance } from '../world/biomes.js';

export interface EnemyInstance {
  id: string;
  actorId?: string;
  roomId: string;
  position: Vector2Like;
  fireCooldown: number;
  moveCooldown: number;
  aimDirection: Vector2Like;
  flashTicks: number;
  name?: string;
  currentHearts?: number;
  maxHearts?: number;
  encounterKind?: 'enemy' | 'duelist' | 'npc-hostile' | 'shark' | 'goblin';
}

export interface BulletInstance {
  id: string;
  roomId: string;
  position: Vector2Like;
  direction: Vector2Like;
  owner: 'enemy' | 'player';
  style?: 'enemy' | 'npc-hostile' | 'duelist' | 'freak-joey' | 'goblin' | 'player';
}

export interface DuelBossDisplay {
  id: string;
  name: string;
  health: number;
  maxHealth: number;
  roomId: string;
  body: Vector2Like[];
  kind?: 'freak-dennis' | 'freaker-dennis' | 'freak-you' | 'revenant' | 'angel';
  rainbowPalette?: boolean;
  headCenter?: Vector2Like;
  direction?: Vector2Like;
}

interface EnemyStepParams {
  getRoom(roomId: string): RoomSnapshot;
  snake: readonly Vector2Like[];
  currentRoomId: string;
  snakeDirection: Vector2Like;
}

interface EnemyStepResult {
  bulletHits: number;
  meleeHits?: number;
  hitStyle?: BulletInstance['style'];
  defeatedEnemies?: EnemyInstance[];
}

function localToGlobal(roomId: string, position: Vector2Like, grid: GridConfig): Vector2Like {
  if (isCaveRoomId(roomId)) {
    return { ...position };
  }
  const [roomX, roomY] = roomId.split(',').map(Number);
  return {
    x: roomX * grid.cols + position.x,
    y: roomY * grid.rows + position.y,
  };
}

function globalToLocal(roomId: string, position: Vector2Like, grid: GridConfig): Vector2Like {
  if (isCaveRoomId(roomId)) {
    return { ...position };
  }
  const [roomX, roomY] = roomId.split(',').map(Number);
  return {
    x: position.x - roomX * grid.cols,
    y: position.y - roomY * grid.rows,
  };
}

function isCaveRoomId(roomId: string): boolean {
  return roomId.startsWith('cave:');
}

function canEatEnemyKind(kind: EnemyInstance['encounterKind']): boolean {
  return kind === 'enemy' || kind === 'npc-hostile' || kind === 'goblin' || kind === 'duelist';
}

function canHumanoidSlash(kind: EnemyInstance['encounterKind']): boolean {
  return canEatEnemyKind(kind);
}

export class EnemyManager {
  private readonly enemies = new Map<string, EnemyInstance[]>();
  private readonly bullets = new Map<string, BulletInstance[]>();
  private idCounter = 0;

  constructor(
    private readonly grid: GridConfig,
    private readonly rng: RandomGenerator,
  ) {}

  clearAll(): void {
    this.enemies.clear();
    this.bullets.clear();
    this.idCounter = 0;
  }

  ensureEnemy(roomId: string, room: RoomSnapshot, occupied: readonly Vector2Like[]): void {
    if (roomId === '0,-1,0') {
      return;
    }
    if (room.village || room.town || room.townPerimeter) {
      return;
    }
    if ((this.enemies.get(roomId)?.length ?? 0) > 0) {
      return;
    }
    if (room.biomeId === 'sunken-ocean') {
      this.ensureShark(roomId, room, occupied);
      return;
    }
    const biome = getBiomeDefinition(room.biomeId);
    if (this.rng() > getBiomeEnemySpawnChance(biome)) {
      return;
    }

    const candidates: Vector2Like[] = [];
    for (let y = 0; y < this.grid.rows; y++) {
      for (let x = 0; x < this.grid.cols; x++) {
        if (!this.isDryEnemyTile(room.layout[y]?.[x])) continue;
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
    const id = `enemy-${this.idCounter++}`;
    const enemy: EnemyInstance = {
      id,
      actorId: `enemy:${roomId}:${id}`,
      roomId,
      position,
      fireCooldown: Math.max(4, 8 + biome.enemyFireBias + Math.floor(this.rng() * 5)),
      moveCooldown: Math.max(2, 4 + biome.enemyMoveBias + Math.floor(this.rng() * 4)),
      aimDirection: { x: 0, y: 1 },
      flashTicks: 0,
      currentHearts: 1,
      maxHearts: 1,
      encounterKind: 'enemy',
    };
    this.enemies.set(roomId, [enemy]);
  }

  ensureCaveEnemies(
    roomId: string,
    room: RoomSnapshot,
    occupied: readonly Vector2Like[],
    count: number,
  ): void {
    if ((this.enemies.get(roomId)?.length ?? 0) > 0) {
      return;
    }
    const occupiedLocals = this.toLocalOccupied(roomId, occupied);
    const candidates: Vector2Like[] = [];
    for (let y = 0; y < this.grid.rows; y += 1) {
      for (let x = 0; x < this.grid.cols; x += 1) {
        if (!this.isDryEnemyTile(room.layout[y]?.[x])) continue;
        if (room.apple && room.apple.x === x && room.apple.y === y) continue;
        if (room.treasure && room.treasure.x === x && room.treasure.y === y) continue;
        if (
          occupiedLocals.some((segment) => Math.abs(segment.x - x) + Math.abs(segment.y - y) <= 3)
        )
          continue;
        candidates.push({ x, y });
      }
    }
    const enemies: EnemyInstance[] = [];
    for (let index = 0; index < count && candidates.length > 0; index += 1) {
      const pickIndex = Math.floor(this.rng() * candidates.length);
      const [position] = candidates.splice(pickIndex, 1);
      if (!position) continue;
      const id = `cave-enemy-${this.idCounter++}`;
      enemies.push({
        id,
        actorId: `enemy:${roomId}:${id}`,
        roomId,
        position,
        fireCooldown: 7 + Math.floor(this.rng() * 5),
        moveCooldown: 3 + Math.floor(this.rng() * 4),
        aimDirection: { x: 0, y: 1 },
        flashTicks: 0,
        name: 'Cave Monster',
        currentHearts: 1,
        maxHearts: 1,
        encounterKind: 'enemy',
      });
    }
    if (enemies.length > 0) {
      this.enemies.set(roomId, enemies);
    }
  }

  private ensureShark(roomId: string, room: RoomSnapshot, occupied: readonly Vector2Like[]): void {
    if (this.rng() > 0.32) {
      return;
    }
    const occupiedLocals = this.toLocalOccupied(roomId, occupied);
    const candidates: Vector2Like[] = [];
    for (let y = 0; y < this.grid.rows; y++) {
      for (let x = 0; x < this.grid.cols; x++) {
        if (room.layout[y]?.[x] !== '~') continue;
        if (room.apple && room.apple.x === x && room.apple.y === y) continue;
        if (room.treasure && room.treasure.x === x && room.treasure.y === y) continue;
        if (room.powerup && room.powerup.x === x && room.powerup.y === y) continue;
        if (room.questGiver && room.questGiver.x === x && room.questGiver.y === y) continue;
        if (occupiedLocals.some((segment) => segment.x === x && segment.y === y)) continue;
        candidates.push({ x, y });
      }
    }

    if (candidates.length === 0) {
      return;
    }

    const position = candidates[Math.floor(this.rng() * candidates.length)];
    const id = `shark-${this.idCounter++}`;
    const shark: EnemyInstance = {
      id,
      actorId: `enemy:${roomId}:${id}`,
      roomId,
      position,
      fireCooldown: 999,
      moveCooldown: 2 + Math.floor(this.rng() * 2),
      aimDirection: { x: 0, y: 1 },
      flashTicks: 0,
      name: 'Shark',
      currentHearts: 2,
      maxHearts: 2,
      encounterKind: 'shark',
    };
    this.enemies.set(roomId, [shark]);
  }

  spawnHostileNpc(
    roomId: string,
    position: Vector2Like,
    name: string,
    hearts: number,
    idSuffix?: string,
    currentHearts = hearts,
    actorId?: string,
  ): EnemyInstance {
    const id = `npc-hostile:${idSuffix ?? roomId}`;
    const existing = (this.enemies.get(roomId) ?? []).find((enemy) => enemy.id === id);
    if (existing) {
      existing.actorId = actorId ?? existing.actorId;
      existing.position = { ...position };
      existing.currentHearts = Math.min(
        existing.currentHearts ?? currentHearts,
        Math.max(1, currentHearts),
        Math.max(1, existing.maxHearts ?? hearts),
      );
      existing.fireCooldown = Math.min(existing.fireCooldown, 3);
      existing.moveCooldown = Math.min(existing.moveCooldown, 2);
      existing.flashTicks = Math.max(existing.flashTicks, 2);
      return existing;
    }
    const maxHearts = Math.max(1, hearts);
    const hostileNpc: EnemyInstance = {
      id,
      actorId: actorId ?? `enemy:${roomId}:${id}`,
      roomId,
      position,
      fireCooldown: 3,
      moveCooldown: 2,
      aimDirection: { x: 0, y: 1 },
      flashTicks: 0,
      name,
      currentHearts: Math.min(Math.max(1, currentHearts), maxHearts),
      maxHearts,
      encounterKind: 'npc-hostile',
    };
    const current = this.enemies.get(roomId) ?? [];
    current.push(hostileNpc);
    this.enemies.set(roomId, current);
    return hostileNpc;
  }

  spawnGoblin(
    roomId: string,
    position: Vector2Like,
    name: string,
    hearts: number,
    index: number,
  ): EnemyInstance {
    const id = `goblin:${roomId}:${index}`;
    const existing = (this.enemies.get(roomId) ?? []).find((enemy) => enemy.id === id);
    if (existing) {
      return existing;
    }
    const goblin: EnemyInstance = {
      id,
      actorId: `enemy:${roomId}:${id}`,
      roomId,
      position,
      fireCooldown: 6,
      moveCooldown: 2,
      aimDirection: { x: 0, y: 1 },
      flashTicks: 0,
      name,
      currentHearts: hearts,
      maxHearts: hearts,
      encounterKind: 'goblin',
    };
    const current = this.enemies.get(roomId) ?? [];
    current.push(goblin);
    this.enemies.set(roomId, current);
    return goblin;
  }

  spawnDuelist(
    roomId: string,
    room: RoomSnapshot,
    occupied: readonly Vector2Like[],
    options: { id: string; name: string; hearts: number },
  ): EnemyInstance | null {
    const existing = (this.enemies.get(roomId) ?? []).find((enemy) => enemy.id === options.id);
    if (existing) {
      return existing;
    }

    const candidates: Vector2Like[] = [];
    for (let y = 0; y < this.grid.rows; y++) {
      for (let x = 0; x < this.grid.cols; x++) {
        if (!this.isDryEnemyTile(room.layout[y]?.[x])) continue;
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
      actorId: `enemy:${roomId}:${options.id}`,
      roomId,
      position,
      fireCooldown: 6,
      moveCooldown: 2,
      aimDirection: { x: -1, y: 0 },
      flashTicks: 0,
      name: options.name,
      currentHearts: options.hearts,
      maxHearts: options.hearts,
      encounterKind: 'duelist',
    };
    const current = this.enemies.get(roomId) ?? [];
    current.push(duelist);
    this.enemies.set(roomId, current);
    return duelist;
  }

  spawnFreakJoey(
    roomId: string,
    room: RoomSnapshot,
    occupied: readonly Vector2Like[],
  ): EnemyInstance | null {
    return this.spawnDuelist(roomId, room, occupied, {
      id: 'freak-joey',
      name: 'Freak Joey',
      hearts: 15,
    });
  }

  step(params: EnemyStepParams): EnemyStepResult {
    const bulletStep = this.stepBullets(params);
    const meleeStep = this.stepEnemies(params);
    return {
      bulletHits: bulletStep.bulletHits,
      meleeHits: meleeStep.meleeHits,
      hitStyle: bulletStep.hitStyle ?? meleeStep.hitStyle,
      defeatedEnemies: bulletStep.defeatedEnemies,
    };
  }

  stepBullets(params: EnemyStepParams): EnemyStepResult {
    const { getRoom, snake, currentRoomId } = params;
    let bulletHits = 0;
    let hitStyle: BulletInstance['style'] | undefined;
    const defeatedEnemies: EnemyInstance[] = [];

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

        if (room.layout[nextPosition.y]?.[nextPosition.x] === '#') {
          continue;
        }

        const bulletGlobal = localToGlobal(roomId, nextPosition, this.grid);
        if (bullet.owner === 'enemy') {
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
            (enemy) => enemy.position.x === nextPosition.x && enemy.position.y === nextPosition.y,
          );
          if (hitEnemy) {
            const defeated = this.damageEnemyById(roomId, hitEnemy.id, 1);
            if (defeated) {
              defeatedEnemies.push(defeated);
            }
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

    return { bulletHits, hitStyle, defeatedEnemies };
  }

  stepEnemies(params: EnemyStepParams): EnemyStepResult {
    const { getRoom, snake, currentRoomId, snakeDirection } = params;
    const head = snake[0];
    if (!head) {
      return { bulletHits: 0, meleeHits: 0 };
    }

    const roomEnemies = this.enemies.get(currentRoomId) ?? [];
    if (roomEnemies.length === 0) {
      return { bulletHits: 0, meleeHits: 0 };
    }

    const room = getRoom(currentRoomId);
    const headLocal = globalToLocal(currentRoomId, head, this.grid);
    const nextEnemies: EnemyInstance[] = [];
    let meleeHits = 0;
    let meleeHitStyle: BulletInstance['style'] | undefined;
    const occupied = new Set(roomEnemies.map((enemy) => `${enemy.position.x},${enemy.position.y}`));
    occupied.add(`${headLocal.x},${headLocal.y}`);

    for (const enemy of roomEnemies) {
      if (enemy.position.x === headLocal.x && enemy.position.y === headLocal.y) {
        nextEnemies.push({
          ...enemy,
          fireCooldown: Math.max(0, enemy.fireCooldown - 1),
          flashTicks: Math.max(0, enemy.flashTicks - 1),
        });
        continue;
      }

      let nextCooldown = enemy.fireCooldown - 1;
      let moveCooldown = enemy.moveCooldown - 1;
      let position = enemy.position;
      let aimDirection = enemy.aimDirection;
      let flashTicks = Math.max(0, enemy.flashTicks - 1);

      const snakeCharging = this.isSnakeChargingEnemy(enemy.position, headLocal, snakeDirection);

      occupied.delete(`${enemy.position.x},${enemy.position.y}`);
      if (moveCooldown <= 0) {
        if (enemy.encounterKind === 'shark') {
          position = this.tryMoveShark(enemy, room, headLocal, occupied);
        } else {
          position = snakeCharging
            ? this.tryMoveEnemyAway(enemy, room, headLocal, occupied)
            : this.tryMoveEnemy(enemy, room, headLocal, occupied);
        }
        moveCooldown =
          enemy.encounterKind === 'shark'
            ? 2 + Math.floor(this.rng() * 2)
            : enemy.encounterKind === 'duelist'
              ? (snakeCharging ? 4 : 2) + Math.floor(this.rng() * 2)
              : enemy.encounterKind === 'goblin'
                ? (snakeCharging ? 5 : 3) + Math.floor(this.rng() * 3)
                : enemy.encounterKind === 'npc-hostile'
                  ? (snakeCharging ? 4 : 2) + Math.floor(this.rng() * 3)
                  : (snakeCharging ? 7 : 5) + Math.floor(this.rng() * 5);
      }

      if (nextCooldown <= 0 && !snakeCharging && enemy.encounterKind !== 'shark') {
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
            fireCooldown:
              enemy.encounterKind === 'duelist'
                ? 4 + Math.floor(this.rng() * 3)
                : enemy.encounterKind === 'goblin'
                  ? 7 + Math.floor(this.rng() * 4)
                  : enemy.encounterKind === 'npc-hostile'
                    ? 5 + Math.floor(this.rng() * 3)
                    : 12 + Math.floor(this.rng() * 6),
          });
          continue;
        }
      }

      const trackedAim = this.resolveAimDirection(position, headLocal) ?? aimDirection;
      const adjacentToHead =
        Math.abs(position.x - headLocal.x) + Math.abs(position.y - headLocal.y) === 1;
      if (adjacentToHead && canHumanoidSlash(enemy.encounterKind) && nextCooldown <= 0) {
        meleeHits += 1;
        meleeHitStyle =
          enemy.encounterKind === 'goblin'
            ? 'goblin'
            : enemy.encounterKind === 'duelist'
              ? 'duelist'
              : enemy.encounterKind === 'npc-hostile'
                ? 'npc-hostile'
                : 'enemy';
        flashTicks = Math.max(flashTicks, 2);
        nextCooldown = enemy.encounterKind === 'goblin' ? 4 : 5;
      }

      nextEnemies.push({
        ...enemy,
        position,
        moveCooldown,
        aimDirection: trackedAim,
        flashTicks,
        fireCooldown: snakeCharging ? Math.max(2, nextCooldown) : Math.max(0, nextCooldown),
      });
      occupied.add(`${position.x},${position.y}`);
    }

    if (nextEnemies.length > 0) {
      this.enemies.set(currentRoomId, nextEnemies);
    } else {
      this.enemies.delete(currentRoomId);
    }
    return { bulletHits: 0, meleeHits, hitStyle: meleeHitStyle };
  }

  consumeEnemyAt(roomId: string, head: Vector2Like): { eaten: boolean; enemy?: EnemyInstance } {
    const enemies = this.enemies.get(roomId) ?? [];
    if (enemies.length === 0) {
      return { eaten: false };
    }

    const headLocal = globalToLocal(roomId, head, this.grid);
    const target = enemies.find(
      (enemy) => enemy.position.x === headLocal.x && enemy.position.y === headLocal.y,
    );
    if (!target || !canEatEnemyKind(target.encounterKind)) {
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

    return { eaten: true, enemy: target };
  }

  getEnemiesInRoom(roomId: string): readonly EnemyInstance[] {
    return this.enemies.get(roomId) ?? [];
  }

  getBulletsInRoom(roomId: string): readonly BulletInstance[] {
    return this.bullets.get(roomId) ?? [];
  }

  hasHarmfulOccupantAt(roomId: string, worldPosition: Vector2Like): boolean {
    return this.getHarmfulOccupantAt(roomId, worldPosition) !== null;
  }

  getHarmfulOccupantAt(roomId: string, worldPosition: Vector2Like): EnemyInstance | null {
    const local = globalToLocal(roomId, worldPosition, this.grid);
    return (
      (this.enemies.get(roomId) ?? []).find(
        (enemy) =>
          enemy.position.x === local.x &&
          enemy.position.y === local.y &&
          enemy.encounterKind !== 'enemy',
      ) ?? null
    );
  }

  firePlayerBullet(roomId: string, origin: Vector2Like, direction: Vector2Like): boolean {
    const spawnX = origin.x + direction.x;
    const spawnY = origin.y + direction.y;
    if (spawnX < 0 || spawnX >= this.grid.cols || spawnY < 0 || spawnY >= this.grid.rows) {
      return false;
    }

    const directHit = (this.enemies.get(roomId) ?? []).find(
      (enemy) => enemy.position.x === spawnX && enemy.position.y === spawnY,
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
      owner: 'player',
      style: 'player',
    });
    this.bullets.set(roomId, bullets);
    return true;
  }

  damageEnemyAt(
    roomId: string,
    worldPosition: Vector2Like,
    damage = 1,
  ): { hit: boolean; defeated?: EnemyInstance } {
    const local = globalToLocal(roomId, worldPosition, this.grid);
    const target = (this.enemies.get(roomId) ?? []).find(
      (enemy) => enemy.position.x === local.x && enemy.position.y === local.y,
    );
    if (!target) {
      return { hit: false };
    }
    const defeated = this.damageEnemyById(roomId, target.id, damage);
    return { hit: true, defeated };
  }

  getDuelBossInRoom(roomId: string): DuelBossDisplay | null {
    const duelist = (this.enemies.get(roomId) ?? []).find(
      (enemy) => enemy.encounterKind === 'duelist',
    );
    if (!duelist || duelist.currentHearts === undefined || duelist.maxHearts === undefined) {
      return null;
    }
    const [roomX, roomY] = isCaveRoomId(roomId) ? [0, 0] : roomId.split(',').map(Number);
    return {
      id: duelist.id,
      name: duelist.name ?? 'Nameless Horror',
      health: duelist.currentHearts,
      maxHealth: duelist.maxHearts,
      roomId,
      body: [
        {
          x: roomX * this.grid.cols + duelist.position.x,
          y: roomY * this.grid.rows + duelist.position.y,
        },
      ],
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
    room: RoomSnapshot,
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
      if (room.layout[cy]?.[cx] === '#') {
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
      room.layout[spawnY]?.[spawnX] === '#'
    ) {
      return null;
    }

    return {
      id: `bullet-${this.idCounter++}`,
      roomId: enemy.roomId,
      position: { x: spawnX, y: spawnY },
      direction,
      owner: 'enemy',
      style:
        enemy.encounterKind === 'npc-hostile'
          ? 'npc-hostile'
          : enemy.encounterKind === 'goblin'
            ? 'goblin'
            : enemy.encounterKind === 'duelist' && enemy.id === 'freak-joey'
              ? 'freak-joey'
              : enemy.encounterKind === 'duelist'
                ? 'duelist'
                : 'enemy',
    };
  }

  private createBonusShots(
    enemy: EnemyInstance,
    shot: BulletInstance,
    room: RoomSnapshot,
  ): BulletInstance[] {
    if (enemy.encounterKind !== 'duelist') {
      return [];
    }

    const origin = shot.position;
    const orthogonal =
      shot.direction.x !== 0
        ? [
            { x: 0, y: -1 },
            { x: 0, y: 1 },
          ]
        : [
            { x: -1, y: 0 },
            { x: 1, y: 0 },
          ];

    const candidates = orthogonal.filter((direction) => {
      const nx = origin.x + direction.x;
      const ny = origin.y + direction.y;
      return (
        nx >= 0 &&
        nx < this.grid.cols &&
        ny >= 0 &&
        ny < this.grid.rows &&
        room.layout[ny]?.[nx] !== '#'
      );
    });

    const selected =
      enemy.id === 'freak-joey'
        ? candidates
        : candidates.length > 0
          ? [candidates[Math.floor(this.rng() * candidates.length)]]
          : [];

    return selected.map((direction) => ({
      id: `bullet-${this.idCounter++}`,
      roomId: enemy.roomId,
      position: origin,
      direction,
      owner: 'enemy' as const,
      style: enemy.id === 'freak-joey' ? 'freak-joey' : 'duelist',
    }));
  }

  private tryMoveEnemy(
    enemy: EnemyInstance,
    room: RoomSnapshot,
    headLocal: Vector2Like,
    occupied: ReadonlySet<string>,
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
      if (next.x < 0 || next.x >= this.grid.cols || next.y < 0 || next.y >= this.grid.rows) {
        continue;
      }
      if (!this.isDryEnemyTile(room.layout[next.y]?.[next.x])) {
        continue;
      }
      if (next.x === headLocal.x && next.y === headLocal.y) {
        continue;
      }
      if (occupied.has(`${next.x},${next.y}`)) {
        continue;
      }
      return next;
    }

    return enemy.position;
  }

  private tryMoveEnemyAway(
    enemy: EnemyInstance,
    room: RoomSnapshot,
    headLocal: Vector2Like,
    occupied: ReadonlySet<string>,
  ): Vector2Like {
    const dx = Math.sign(enemy.position.x - headLocal.x);
    const dy = Math.sign(enemy.position.y - headLocal.y);
    const preferred: Vector2Like[] = [];
    if (
      Math.abs(enemy.position.x - headLocal.x) >= Math.abs(enemy.position.y - headLocal.y) &&
      dx !== 0
    ) {
      preferred.push({ x: dx, y: 0 });
    }
    if (dy !== 0) {
      preferred.push({ x: 0, y: dy });
    }
    if (dx !== 0 && !preferred.some((dir) => dir.x === dx && dir.y === 0)) {
      preferred.push({ x: dx, y: 0 });
    }
    preferred.push(
      ...[
        { x: 1, y: 0 },
        { x: -1, y: 0 },
        { x: 0, y: 1 },
        { x: 0, y: -1 },
      ].sort(() => this.rng() - 0.5),
    );

    let best = enemy.position;
    let bestDistance =
      Math.abs(enemy.position.x - headLocal.x) + Math.abs(enemy.position.y - headLocal.y);
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
        !this.isDryEnemyTile(room.layout[next.y]?.[next.x])
      ) {
        continue;
      }
      if (occupied.has(`${next.x},${next.y}`)) {
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

  private tryMoveShark(
    enemy: EnemyInstance,
    room: RoomSnapshot,
    headLocal: Vector2Like,
    occupied: ReadonlySet<string>,
  ): Vector2Like {
    const dx = Math.sign(headLocal.x - enemy.position.x);
    const dy = Math.sign(headLocal.y - enemy.position.y);
    const preferred: Vector2Like[] = [];
    if (
      Math.abs(headLocal.x - enemy.position.x) >= Math.abs(headLocal.y - enemy.position.y) &&
      dx !== 0
    ) {
      preferred.push({ x: dx, y: 0 });
    }
    if (dy !== 0) {
      preferred.push({ x: 0, y: dy });
    }
    if (dx !== 0 && !preferred.some((dir) => dir.x === dx && dir.y === 0)) {
      preferred.push({ x: dx, y: 0 });
    }
    preferred.push(
      ...[
        { x: 1, y: 0 },
        { x: -1, y: 0 },
        { x: 0, y: 1 },
        { x: 0, y: -1 },
      ].sort(() => this.rng() - 0.5),
    );

    for (const direction of preferred) {
      const next = {
        x: enemy.position.x + direction.x,
        y: enemy.position.y + direction.y,
      };
      if (next.x < 0 || next.x >= this.grid.cols || next.y < 0 || next.y >= this.grid.rows) {
        continue;
      }
      if (next.x === headLocal.x && next.y === headLocal.y) {
        return next;
      }
      if (occupied.has(`${next.x},${next.y}`)) {
        continue;
      }
      if (room.layout[next.y]?.[next.x] !== '~') {
        continue;
      }
      return next;
    }

    return enemy.position;
  }

  private isDryEnemyTile(tile: string | undefined): boolean {
    return Boolean(tile && '.OEWTSAMRUNPFLG'.includes(tile));
  }

  private toLocalOccupied(roomId: string, occupied: readonly Vector2Like[]): Vector2Like[] {
    if (isCaveRoomId(roomId)) {
      return occupied.map((segment) => ({ ...segment }));
    }
    const [roomX, roomY] = roomId.split(',').map(Number);
    return occupied.map((segment) => {
      if (
        segment.x >= roomX * this.grid.cols &&
        segment.x < (roomX + 1) * this.grid.cols &&
        segment.y >= roomY * this.grid.rows &&
        segment.y < (roomY + 1) * this.grid.rows
      ) {
        return globalToLocal(roomId, segment, this.grid);
      }
      return segment;
    });
  }

  private isSnakeChargingEnemy(
    enemyPosition: Vector2Like,
    headLocal: Vector2Like,
    snakeDirection: Vector2Like,
  ): boolean {
    if (snakeDirection.x !== 0 && headLocal.y === enemyPosition.y) {
      return Math.sign(enemyPosition.x - headLocal.x) === snakeDirection.x;
    }
    if (snakeDirection.y !== 0 && headLocal.x === enemyPosition.x) {
      return Math.sign(enemyPosition.y - headLocal.y) === snakeDirection.y;
    }
    return false;
  }

  private resolveAimDirection(position: Vector2Like, headLocal: Vector2Like): Vector2Like | null {
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

  private damageEnemyById(
    roomId: string,
    enemyId: string,
    damage: number,
  ): EnemyInstance | undefined {
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
