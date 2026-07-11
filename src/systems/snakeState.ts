import type { GridConfig, SnakeConfig } from '../config/gameConfig.js';
import type { Vector2Like } from '../core/math.js';
import { addVectors } from '../core/math.js';
import type { BossManager } from './boss.js';
import type { RoomSnapshot } from '../world/types.js';
import { isSolidTile } from '../world/tiles.js';
import { getSafeZoneRules } from '../world/safeZones.js';

export interface SnakeStepOutcome {
  status: 'alive' | 'dead';
  reason?: 'wall' | 'self' | 'boss' | 'water' | 'shielded' | 'bullet' | 'temperature';
  appleEaten?: boolean;
}

export interface SnakeStepDependencies {
  getRoom(roomId: string): RoomSnapshot;
  ensureApple(roomId: string, snake: readonly Vector2Like[], score: number): void;
  prepareRoomForCollision?: (roomId: string) => void;
  getBossManager(): BossManager;
  skipSelfCollision?: boolean;
  onJasonDamage?: (bossId: string, defeated: boolean, scoreBonus: number) => void;
}

export class SnakeState {
  readonly grid: GridConfig;
  readonly flags: Record<string, unknown> = {};

  private readonly config: SnakeConfig;
  private body: Vector2Like[] = [];
  private direction: Vector2Like;
  private nextDirection: Vector2Like;
  private bufferedDirection: Vector2Like | null = null;
  private scoreValue = 0;
  private teleportEnabled = false;
  private roomId: string;

  constructor(grid: GridConfig, snakeConfig: SnakeConfig, originRoomId: string) {
    this.grid = grid;
    this.config = snakeConfig;
    this.direction = { ...snakeConfig.initialDirection };
    this.nextDirection = { ...snakeConfig.initialDirection };
    this.roomId = originRoomId;
    this.reset(originRoomId);
  }

  reset(originRoomId: string): void {
    this.body = this.config.initialBody.map((segment) => ({ x: segment.x, y: segment.y }));
    this.direction = { ...this.config.initialDirection };
    this.nextDirection = { ...this.config.initialDirection };
    this.bufferedDirection = null;
    this.scoreValue = 0;
    this.teleportEnabled = false;
    this.roomId = originRoomId;
    for (const key of Object.keys(this.flags)) {
      delete this.flags[key];
    }
  }

  get bodySegments(): readonly Vector2Like[] {
    return this.body;
  }

  get head(): Vector2Like {
    return this.body[0];
  }

  get score(): number {
    return this.scoreValue;
  }

  set score(value: number) {
    this.scoreValue = value;
  }

  addScore(amount: number): void {
    this.scoreValue += amount;
  }

  get currentRoomId(): string {
    return this.roomId;
  }

  set currentRoomId(value: string) {
    this.roomId = value;
  }

  get directionVector(): Vector2Like {
    return this.direction;
  }

  get nextDirectionVector(): Vector2Like {
    return this.nextDirection;
  }

  commitQueuedDirectionWithoutMoving(): void {
    this.direction = { ...this.nextDirection };
    if (
      this.bufferedDirection &&
      !this.isOppositeDirection(this.bufferedDirection, this.direction)
    ) {
      this.nextDirection = { ...this.bufferedDirection };
    } else {
      this.nextDirection = { ...this.direction };
    }
    this.bufferedDirection = null;
  }

  setDirection(x: number, y: number): void {
    if (Number(this.flags['traversal.exitDirectionLockTicks'] ?? 0) > 0) {
      return;
    }
    const candidate = { x, y };
    if (this.isSameDirection(candidate, this.nextDirection)) {
      return;
    }
    if (this.isOppositeDirection(candidate, this.nextDirection)) {
      return;
    }

    if (this.isSameDirection(this.nextDirection, this.direction)) {
      this.nextDirection = candidate;
      this.bufferedDirection = null;
      return;
    }

    if (this.isSameDirection(candidate, this.bufferedDirection)) {
      return;
    }
    if (this.bufferedDirection && this.isOppositeDirection(candidate, this.nextDirection)) {
      return;
    }

    this.bufferedDirection = candidate;
  }

  forceDirection(x: number, y: number): void {
    if (Number(this.flags['traversal.exitDirectionLockTicks'] ?? 0) > 0) {
      return;
    }
    const candidate = { x, y };
    if (candidate.x === 0 && candidate.y === 0) {
      return;
    }
    this.direction = { ...candidate };
    this.nextDirection = { ...candidate };
    this.bufferedDirection = null;
  }

  enableTeleport(flag: boolean): void {
    this.teleportEnabled = flag;
  }

  get teleport(): boolean {
    return this.teleportEnabled;
  }

  grow(extraSegments: number): void {
    if (extraSegments <= 0) {
      return;
    }
    const tail = this.body[this.body.length - 1];
    if (!tail) {
      return;
    }
    for (let i = 0; i < extraSegments; i++) {
      this.body.push({ x: tail.x, y: tail.y });
    }
  }

  keepHeadOnly(): void {
    const head = this.body[0];
    this.body = head ? [{ x: head.x, y: head.y }] : [];
  }

  shrinkTail(segments: number): boolean {
    const amount = Math.max(0, Math.floor(segments));
    if (amount <= 0) {
      return true;
    }
    if (this.body.length - amount < 2) {
      return false;
    }
    this.body.splice(Math.max(1, this.body.length - amount), amount);
    return true;
  }

  step(deps: SnakeStepDependencies): SnakeStepOutcome {
    const previousSnapshot = {
      body: this.body.map((segment) => ({ x: segment.x, y: segment.y })),
      roomId: this.roomId,
      direction: { ...this.direction },
      nextDirection: { ...this.nextDirection },
      bufferedDirection: this.bufferedDirection ? { ...this.bufferedDirection } : null,
    };
    this.flags['internal.previousSnapshot'] = previousSnapshot;
    this.repairInvalidBodyPosition();

    const bossManager = deps.getBossManager();
    const cheatImmortal = Boolean(this.flags['cheat.immortal']);
    const currentHeadBeforeMove = this.body[0];
    const pullDirection = currentHeadBeforeMove
      ? bossManager.getPullFor(currentHeadBeforeMove, this.roomId)
      : null;

    if (pullDirection) {
      this.direction = pullDirection;
    } else {
      this.direction = { ...this.nextDirection };
    }

    const currentRoom = deps.getRoom(this.roomId);
    const safeZoneRules = this.getSafeZoneRules(currentRoom, currentHeadBeforeMove);

    // If we're in a safe zone, gently steer away from walls instead of dying
    if (safeZoneRules?.steerAwayFromWalls && !cheatImmortal) {
      const tryDirs = [
        this.direction,
        { x: -this.direction.y, y: this.direction.x }, // left
        { x: this.direction.y, y: -this.direction.x }, // right
        { x: -this.direction.x, y: -this.direction.y }, // reverse
      ];
      const head0 = this.body[0];
      const isBlocked = (dir: Vector2Like): boolean => {
        const candidate = addVectors(head0, dir);
        const [roomX, roomY] = this.parseRoomCoordinates(this.roomId);
        const localX = candidate.x - roomX * this.grid.cols;
        const localY = candidate.y - roomY * this.grid.rows;
        // Allow leaving the room freely; only block on solid wall tiles
        if (localX < 0 || localY < 0 || localX >= this.grid.cols || localY >= this.grid.rows)
          return false;
        const tile = currentRoom.layout[localY]?.[localX];
        if (!tile) return true;
        if (isSolidTile(tile)) return true;
        // Avoid stepping into own body if possible
        return this.body.some((seg) => seg.x === candidate.x && seg.y === candidate.y);
      };
      if (isBlocked(this.direction)) {
        for (let i = 1; i < tryDirs.length; i++) {
          if (!isBlocked(tryDirs[i])) {
            this.direction = { ...tryDirs[i] };
            this.nextDirection = { ...tryDirs[i] };
            break;
          }
        }
      }
    }

    const previousHead = currentHeadBeforeMove;
    if (previousHead) {
      this.flags['internal.previousHead'] = { x: previousHead.x, y: previousHead.y };
    } else {
      delete this.flags['internal.previousHead'];
    }
    delete this.flags['internal.lastRemovedTail'];
    delete this.flags['internal.lastSelfCollision'];
    delete this.flags['ui.swimSplash'];
    delete this.flags['geometry.wallEaten'];
    delete this.flags['geometry.terraShieldTriggered'];

    let head = this.applyDisorientationDrift(addVectors(this.body[0], this.direction));

    let roomChanged = false;
    let verticalRoomChanged = false;
    let portalTransition = false;

    const [roomX, roomY, roomZ = 0] = this.parseRoomCoordinates(this.roomId);
    let localHeadX = head.x - roomX * this.grid.cols;
    let localHeadY = head.y - roomY * this.grid.rows;
    const boundaryMode = currentRoom.cave?.boundaryMode ?? currentRoom.layer?.boundaryMode;
    if (boundaryMode) {
      if (boundaryMode === 'wrap') {
        localHeadX = (localHeadX + this.grid.cols) % this.grid.cols;
        localHeadY = (localHeadY + this.grid.rows) % this.grid.rows;
        head = { x: localHeadX, y: localHeadY };
      } else if (
        localHeadX < 0 ||
        localHeadY < 0 ||
        localHeadX >= this.grid.cols ||
        localHeadY >= this.grid.rows
      ) {
        this.markDeathPosition(head, this.roomId, { x: localHeadX, y: localHeadY }, '#');
        return { status: 'dead', reason: 'wall' };
      }
    }
    const portal = currentRoom.layer
      ? undefined
      : currentRoom.portals.find((p) => p.x === localHeadX && p.y === localHeadY);
    if (portal) {
      const [, , destZ = 0] = this.parseRoomCoordinates(portal.destRoomId);
      const destinationOrigin = this.getRoomWorldOrigin(portal.destRoomId);
      head = {
        x: destinationOrigin.x + portal.destX,
        y: destinationOrigin.y + portal.destY,
      };
      verticalRoomChanged = destZ !== roomZ;
      this.roomId = portal.destRoomId;
      roomChanged = true;
      portalTransition = true;
    }

    const coordinateRoom = this.isCoordinateRoomId(this.roomId);
    const newRoomX = Math.floor(head.x / this.grid.cols);
    const newRoomY = Math.floor(head.y / this.grid.rows);
    if (
      !currentRoom.cave &&
      !currentRoom.layer &&
      coordinateRoom &&
      (newRoomX !== roomX || newRoomY !== roomY)
    ) {
      this.roomId = `${newRoomX},${newRoomY},${roomZ}`;
      roomChanged = true;
    }

    if (roomChanged) {
      deps.ensureApple(this.roomId, this.body, this.scoreValue);
      deps.prepareRoomForCollision?.(this.roomId);
    }

    const finalizedRoom = deps.getRoom(this.roomId);
    const finalizedOrigin = this.getRoomWorldOrigin(this.roomId);
    const baseRoomX = finalizedRoom.cave || finalizedRoom.layer ? 0 : finalizedOrigin.x;
    const baseRoomY = finalizedRoom.cave || finalizedRoom.layer ? 0 : finalizedOrigin.y;
    const finalLocalHeadX = head.x - baseRoomX;
    const finalLocalHeadY = head.y - baseRoomY;

    if (verticalRoomChanged) {
      this.clearLandingZone(finalizedRoom, finalLocalHeadX, finalLocalHeadY);
    }

    const tile = finalizedRoom.layout[finalLocalHeadY]?.[finalLocalHeadX];
    const invulnTicks = Math.max(
      Number(this.flags['fortitude.invulnerabilityTicks'] ?? 0),
      Number(this.flags['traversal.phaseTicks'] ?? 0),
    );
    const wallInvulnTicks = Math.max(
      invulnTicks,
      safeZoneRules?.phaseThroughWalls ? 1 : 0,
      cheatImmortal ? 1 : 0,
    );
    if (isSolidTile(tile)) {
      if (wallInvulnTicks > 0) {
        // Invulnerability lets us phase through the wall.
      } else if (this.flags['equipment.wallSmiteEnabled']) {
        const row = finalizedRoom.layout[finalLocalHeadY];
        if (row) {
          finalizedRoom.layout[finalLocalHeadY] =
            row.slice(0, finalLocalHeadX) + '.' + row.slice(finalLocalHeadX + 1);
        }
        this.flags['equipment.wallSmiteEnabled'] = undefined;
        this.flags['achievement.jadeKatanaWallSmite'] = { roomId: this.roomId };
      } else if (this.tryConsumeWall(finalizedRoom, finalLocalHeadX, finalLocalHeadY, head)) {
        this.flags['geometry.wallEaten'] = { x: head.x, y: head.y, roomId: this.roomId };
      } else {
        this.markDeathPosition(head, this.roomId, { x: finalLocalHeadX, y: finalLocalHeadY }, tile);
        return { status: 'dead', reason: 'wall' };
      }
    }
    // Masonry blocks ('%') are the snake's own temporary walls — always passable.
    if (tile === '%') {
      // Snake passes through its own masonry blocks without dying or eating them.
    }
    if (tile === '~' && !this.flags['equipment.swimmingEnabled'] && !cheatImmortal) {
      this.markDeathPosition(head, this.roomId, { x: finalLocalHeadX, y: finalLocalHeadY }, tile);
      return { status: 'dead', reason: 'water' };
    }
    if (tile === '~' && (this.flags['equipment.swimmingEnabled'] || cheatImmortal)) {
      this.flags['ui.swimSplash'] = {
        x: head.x,
        y: head.y,
        roomId: this.roomId,
        localX: finalLocalHeadX,
        localY: finalLocalHeadY,
      };
    }

    const appleEaten = Boolean(
      (finalizedRoom.apple &&
        finalizedRoom.apple.x === finalLocalHeadX &&
        finalizedRoom.apple.y === finalLocalHeadY) ||
      finalizedRoom.apples?.some(
        (apple) => apple.x === finalLocalHeadX && apple.y === finalLocalHeadY,
      ),
    );
    const bodyForSelfCollision = appleEaten ? this.body : this.getBodyWithoutMovingTailStack();
    const koiFlowActive = this.isKoiFlowActive();
    const selfCollisionIndex = verticalRoomChanged
      ? -1
      : deps.skipSelfCollision
        ? -1
        : bodyForSelfCollision.findIndex((segment) => segment.x === head.x && segment.y === head.y);
    if (selfCollisionIndex !== -1 && !koiFlowActive) {
      if (cheatImmortal || invulnTicks > 0) {
        // Immortal and invulnerability states phase through the body instead of slicing or dying.
      } else if (this.resolveSelfCollision(head, selfCollisionIndex, invulnTicks)) {
        this.sliceSnakeAtIndex(selfCollisionIndex);
      } else {
        const collidedSegment = bodyForSelfCollision[selfCollisionIndex];
        this.flags['internal.lastSelfCollision'] = {
          index: selfCollisionIndex,
          segment: collidedSegment ? { x: collidedSegment.x, y: collidedSegment.y } : undefined,
          checkedBodyLength: bodyForSelfCollision.length,
          fullBodyLength: this.body.length,
          appleEaten,
          body: this.body.map((segment) => ({ x: segment.x, y: segment.y })),
        };
        this.markDeathPosition(head, this.roomId, { x: finalLocalHeadX, y: finalLocalHeadY }, tile);
        return { status: 'dead', reason: 'self' };
      }
    }

    const vulnerableJason = bossManager.getVulnerableJasonNearby(head, this.roomId);
    const collidedBoss = vulnerableJason ?? bossManager.getBossAtPosition(head, this.roomId);
    if (collidedBoss && invulnTicks <= 0 && !cheatImmortal) {
      const smite = Number(this.flags['powerup.smiteTicks'] ?? 0);
      if (smite > 0) {
        // Kill the boss we collided with instead of dying
        bossManager.killBossAtPosition(head, this.roomId);
        this.flags['internal.killedByBossKind'] = undefined;
        this.flags['internal.killedByBossName'] = undefined;
        this.flags['ui.bossSmite'] = {
          x: head.x,
          y: head.y,
          roomId: this.getRoomIdForPosition(head),
        };
      } else if (
        collidedBoss.kind === 'jason-statham' &&
        collidedBoss.jasonPhase === 'vulnerable'
      ) {
        // Jason is vulnerable: damage him instead of dying
        const defeated = bossManager.takeJasonDamage(collidedBoss.id, 12);
        const scoreBonus = defeated ? collidedBoss.maxHealth * 10 : 0;
        this.flags['internal.killedByBossKind'] = collidedBoss.kind;
        this.flags['internal.killedByBossName'] = collidedBoss.name;
        deps.onJasonDamage?.(collidedBoss.id, defeated, scoreBonus);
      } else {
        this.flags['internal.killedByBossKind'] = collidedBoss.kind;
        this.flags['internal.killedByBossName'] = collidedBoss.name;
        this.markDeathPosition(head, this.roomId, { x: finalLocalHeadX, y: finalLocalHeadY }, tile);
        return { status: 'dead', reason: 'boss' };
      }
    }

    this.body.unshift({ x: head.x, y: head.y });
    this.flags['internal.currentHead'] = { x: head.x, y: head.y };

    if (!appleEaten) {
      const removed = this.body.pop();
      if (removed) {
        const tailRoomX = Math.floor(removed.x / this.grid.cols);
        const tailRoomY = Math.floor(removed.y / this.grid.rows);
        const [, , roomZ = 0] = this.parseRoomCoordinates(this.roomId);
        this.flags['internal.lastRemovedTail'] = {
          x: removed.x,
          y: removed.y,
          roomId: !this.isCoordinateRoomId(this.roomId)
            ? this.roomId
            : `${tailRoomX},${tailRoomY},${roomZ}`,
        };
      } else {
        delete this.flags['internal.lastRemovedTail'];
      }
    } else {
      delete this.flags['internal.lastRemovedTail'];
    }

    if (verticalRoomChanged || portalTransition) {
      this.body = this.body.map(() => ({ x: head.x, y: head.y }));
      delete this.flags['internal.lastRemovedTail'];
    }

    if (
      this.bufferedDirection &&
      !this.isOppositeDirection(this.bufferedDirection, this.direction)
    ) {
      this.nextDirection = { ...this.bufferedDirection };
    } else {
      this.nextDirection = { ...this.direction };
    }
    this.bufferedDirection = null;

    const exitDirectionLockTicks = Number(this.flags['traversal.exitDirectionLockTicks'] ?? 0);
    if (exitDirectionLockTicks > 0) {
      this.flags['traversal.exitDirectionLockTicks'] = exitDirectionLockTicks - 1;
    }

    return { status: 'alive', appleEaten };
  }

  private markDeathPosition(
    worldPosition: Vector2Like,
    roomId: string,
    localPosition: Vector2Like,
    tile?: string,
  ): void {
    this.flags['internal.lastDeathPosition'] = {
      world: { x: worldPosition.x, y: worldPosition.y },
      local: { x: localPosition.x, y: localPosition.y },
      roomId,
      tile,
      direction: { ...this.direction },
    };
  }

  private getSafeZoneRules(room: RoomSnapshot, head?: Vector2Like) {
    if (!head) {
      return getSafeZoneRules(room);
    }
    const [roomX, roomY] = this.parseRoomCoordinates(this.roomId);
    const localX = head.x - roomX * this.grid.cols;
    const localY = head.y - roomY * this.grid.rows;
    if (localX < 0 || localY < 0 || localX >= this.grid.cols || localY >= this.grid.rows) {
      return null;
    }
    return getSafeZoneRules(room, { x: localX, y: localY });
  }
  restorePreviousSnapshot(): void {
    const snapshot = this.flags['internal.previousSnapshot'] as
      | {
          body: Vector2Like[];
          roomId: string;
          direction: Vector2Like;
          nextDirection: Vector2Like;
          bufferedDirection: Vector2Like | null;
        }
      | undefined;
    if (!snapshot) {
      return;
    }
    this.body = snapshot.body.map((segment) => ({ x: segment.x, y: segment.y }));
    this.roomId = snapshot.roomId;
    this.direction = { ...snapshot.direction };
    this.nextDirection = { ...snapshot.direction };
    this.bufferedDirection = null;
    const currentHead = this.body[0];
    if (currentHead) {
      this.flags['internal.currentHead'] = { x: currentHead.x, y: currentHead.y };
    }
    delete this.flags['internal.previousSnapshot'];
  }

  restoreFromSave(
    body: Vector2Like[],
    direction: Vector2Like,
    roomId: string,
    length: number,
  ): void {
    this.body = body.map((segment) => ({ x: segment.x, y: segment.y }));
    this.direction = { ...direction };
    this.nextDirection = { ...direction };
    this.roomId = roomId;

    // Ensure the snake length is correct
    while (this.body.length < length) {
      const tail = this.body[this.body.length - 1];
      if (tail) {
        this.body.push({ x: tail.x, y: tail.y });
      }
    }

    const currentHead = this.body[0];
    if (currentHead) {
      this.flags['internal.currentHead'] = { x: currentHead.x, y: currentHead.y };
    }
  }

  teleportTo(
    roomId: string,
    localPosition: Vector2Like,
    direction: Vector2Like = this.direction,
  ): void {
    const origin = this.getRoomWorldOrigin(roomId);
    const world = {
      x: origin.x + localPosition.x,
      y: origin.y + localPosition.y,
    };
    this.body = this.body.map(() => ({ ...world }));
    this.roomId = roomId;
    this.direction = { ...direction };
    this.nextDirection = { ...direction };
    this.bufferedDirection = null;
    this.flags['internal.currentHead'] = { ...world };
  }

  private resolveSelfCollision(
    head: Vector2Like,
    collisionIndex: number,
    invulnTicks: number,
  ): boolean {
    if (invulnTicks > 0) {
      return true;
    }
    return this.tryConsumeSelfCollision(head);
  }

  private applyDisorientationDrift(head: Vector2Like): Vector2Like {
    const ticks = Number(this.flags['status.disorientedTicks'] ?? 0);
    if (ticks <= 0) {
      this.flags['status.disorientedStep'] = undefined;
      return head;
    }
    const step = Number(this.flags['status.disorientedStep'] ?? 0) + 1;
    this.flags['status.disorientedStep'] = step;
    const interval = Number(this.flags['status.disorientedDriftInterval'] ?? 5);
    if (step % Math.max(2, interval) !== 0) {
      return head;
    }
    const left = { x: -this.direction.y, y: this.direction.x };
    const right = { x: this.direction.y, y: -this.direction.x };
    const stumble = Math.floor(step / 7) % 2 === 0 ? left : right;
    if (stumble.x === 0 && stumble.y === 0) {
      return head;
    }
    return { x: head.x + stumble.x, y: head.y + stumble.y };
  }

  private getBodyWithoutMovingTailStack(): Vector2Like[] {
    const tail = this.body[this.body.length - 1];
    if (!tail) {
      return this.body;
    }
    let movingTailStart = this.body.length - 1;
    while (
      movingTailStart > 0 &&
      this.body[movingTailStart - 1].x === tail.x &&
      this.body[movingTailStart - 1].y === tail.y
    ) {
      movingTailStart -= 1;
    }
    return this.body.slice(0, movingTailStart);
  }

  private sliceSnakeAtIndex(index: number): void {
    if (index <= 0) {
      return;
    }
    this.body.splice(index);
  }

  private tryConsumeSelfCollision(head: Vector2Like): boolean {
    const state = this.flags['fortitude.hardened'] as { charges?: number } | undefined;
    const charges = state?.charges ?? 0;
    if (charges <= 0) {
      return false;
    }
    const next = Math.max(0, charges - 1);
    this.flags['fortitude.hardened'] = { ...state, charges: next };
    this.flags['fortitude.hardenedTriggered'] = {
      x: head.x,
      y: head.y,
      roomId: this.getRoomIdForPosition(head),
    };
    return true;
  }

  private getRoomIdForPosition(position: Vector2Like): string {
    if (!this.isCoordinateRoomId(this.roomId)) {
      return this.roomId;
    }
    const roomX = Math.floor(position.x / this.grid.cols);
    const roomY = Math.floor(position.y / this.grid.rows);
    const [, , roomZ = 0] = this.parseRoomCoordinates(this.roomId);
    return `${roomX},${roomY},${roomZ}`;
  }

  private tryConsumeWall(
    room: RoomSnapshot,
    localX: number,
    localY: number,
    _head: Vector2Like,
  ): boolean {
    const canEatWalls = Boolean(this.flags['geometry.canEatWalls']);
    const shieldState = this.flags['geometry.terraShield'] as
      | { charges: number; max?: number; recharge?: number }
      | undefined;
    const traversalShield = this.flags['traversal.ghostShield'] as { charges?: number } | undefined;

    let usingShield = false;

    if (!canEatWalls) {
      const traversalCharges = traversalShield?.charges ?? 0;
      if (traversalCharges > 0) {
        const nextTraversal = {
          ...traversalShield,
          charges: Math.max(0, traversalCharges - 1),
        };
        this.flags['traversal.ghostShield'] = nextTraversal;
        const [roomX, roomY] = this.parseRoomCoordinates(this.roomId);
        const worldX = roomX * this.grid.cols + localX;
        const worldY = roomY * this.grid.rows + localY;
        this.flags['traversal.ghostShieldTriggered'] = {
          x: worldX,
          y: worldY,
          roomId: this.roomId,
        };
        usingShield = true;
      } else {
        const charges = shieldState?.charges ?? 0;
        if (charges <= 0) {
          return false;
        }
        const max = shieldState?.max ?? charges;
        const nextShield = {
          charges: Math.max(0, charges - 1),
          max,
          recharge: shieldState?.recharge,
        };
        this.flags['geometry.terraShield'] = nextShield;
        const [roomX, roomY] = this.parseRoomCoordinates(this.roomId);
        const worldX = roomX * this.grid.cols + localX;
        const worldY = roomY * this.grid.rows + localY;
        this.flags['geometry.terraShieldTriggered'] = { x: worldX, y: worldY, roomId: this.roomId };
        usingShield = true;
      }
    }

    this.clearWallTile(room, localX, localY);
    return canEatWalls || usingShield;
  }

  private clearWallTile(room: RoomSnapshot, localX: number, localY: number): void {
    const row = room.layout[localY];
    if (!row || row[localX] === undefined) {
      return;
    }
    if (row[localX] === '#') {
      room.layout[localY] = row.substring(0, localX) + '.' + row.substring(localX + 1);
    }
    if (room.apple && room.apple.x === localX && room.apple.y === localY) {
      delete room.apple;
    }
  }

  private clearLandingZone(room: RoomSnapshot, centerX: number, centerY: number): void {
    for (let y = centerY - 1; y <= centerY + 1; y += 1) {
      for (let x = centerX - 1; x <= centerX + 1; x += 1) {
        if (x < 0 || y < 0 || x >= this.grid.cols || y >= this.grid.rows) {
          continue;
        }
        this.clearWallTile(room, x, y);
      }
    }
  }

  private isOppositeDirection(a: Vector2Like, b: Vector2Like | null): boolean {
    return Boolean(b) && a.x + b.x === 0 && a.y + b.y === 0;
  }

  private isSameDirection(a: Vector2Like, b: Vector2Like | null): boolean {
    return Boolean(b) && a.x === b.x && a.y === b.y;
  }

  private isKoiFlowActive(): boolean {
    const endMs = Number(this.flags['jadePeak.koiFlowEnd'] ?? 0);
    if (endMs <= 0) return false;
    const nowMs = Number(this.flags['timeMs'] ?? 0);
    return nowMs < endMs;
  }

  private parseRoomCoordinates(roomId: string): [number, number, number] {
    if (!this.isCoordinateRoomId(roomId)) {
      return [0, 0, 0];
    }
    const [x = 0, y = 0, z = 0] = roomId.split(',').map(Number);
    return [x, y, z];
  }

  private getRoomWorldOrigin(roomId: string): Vector2Like {
    const [roomX, roomY] = this.parseRoomCoordinates(roomId);
    return {
      x: roomX * this.grid.cols,
      y: roomY * this.grid.rows,
    };
  }

  private repairInvalidBodyPosition(): void {
    const head = this.body[0];
    if (head && Number.isFinite(head.x) && Number.isFinite(head.y)) {
      return;
    }
    const origin = this.getRoomWorldOrigin(this.roomId);
    const repaired = {
      x: origin.x + Math.floor(this.grid.cols / 2),
      y: origin.y + Math.floor(this.grid.rows / 2),
    };
    this.body = this.body.length > 0 ? this.body.map(() => ({ ...repaired })) : [{ ...repaired }];
    this.flags['internal.currentHead'] = { ...repaired };
    this.flags['internal.repairedInvalidSnakePosition'] = {
      roomId: this.roomId,
      x: repaired.x,
      y: repaired.y,
    };
  }

  private isCoordinateRoomId(roomId: string): boolean {
    return /^-?\d+,-?\d+,-?\d+$/.test(roomId);
  }
}
