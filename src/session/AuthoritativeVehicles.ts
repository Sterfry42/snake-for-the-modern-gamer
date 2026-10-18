import type { SnakeGame } from '../game/snakeGame.js';
import type { Vector2Like } from '../core/math.js';
import { isBlockingTownTile } from '../world/town.js';
import { parseCoordinateRoomId } from '../world/roomAddress.js';
import {
  advanceCarPhysics,
  carForwardVector,
  findNearestValidCarPose,
  getCarCollisionCells,
  resolveCarRoomPosition,
  shouldDamageCarWallImpact,
  updateArcadeCarMotion,
  type CarControlInput,
  type CarControlState,
} from '../vehicles/carPhysics.js';
import type { DrivingCarState } from '../vehicles/car.js';
import type { CommandResult } from './ClientCommand.js';

interface DriverRuntime {
  input: CarControlInput;
  controls: CarControlState;
  lastWallImpact: number;
  impacts: Map<string, number>;
}

/** All car movement, collisions, pickups, and exit placement use server clocks. */
export class AuthoritativeVehicles {
  private readonly drivers = new Map<string, DriverRuntime>();
  constructor(private readonly game: SnakeGame) {}
  reset(playerId?: string): void {
    if (playerId) this.drivers.delete(playerId);
    else this.drivers.clear();
  }
  abandon(): void {
    const car = this.active;
    if (car) {
      this.game.parkCar(car.roomId, car);
      this.game.setFlag('vehicle.active', undefined);
      this.game.setFlag('vehicle.driving', undefined);
    }
    this.reset(this.game.getLocalPlayerId());
  }
  private get active() {
    return this.game.getFlag<DrivingCarState>('vehicle.active');
  }
  private get driver(): DriverRuntime {
    const id = this.game.getLocalPlayerId();
    let driver = this.drivers.get(id);
    if (!driver) {
      driver = {
        input: { throttle: 0, steering: 0 },
        controls: { throttle: 0, steering: 0, steeringVelocity: 0 },
        lastWallImpact: -Infinity,
        impacts: new Map(),
      };
      this.drivers.set(id, driver);
    }
    return driver;
  }

  enter(carId: string): CommandResult {
    if (this.active) return { ok: false, reason: 'Already driving.' };
    const room = this.game.getCurrentRoom();
    const car = this.game.getCars(room.id).find((entry) => entry.id === carId);
    const head = this.game.getSnakeBody()[0];
    const coordinate = parseCoordinateRoomId(room.id);
    if (!car || !head) return { ok: false, reason: 'That car is unavailable.' };
    const local = {
      x: head.x - (coordinate?.x ?? 0) * this.game.config.grid.cols,
      y: head.y - (coordinate?.y ?? 0) * this.game.config.grid.rows,
    };
    const distance = Math.hypot(
      Math.max(car.x - local.x, 0, local.x - car.x - 2),
      Math.max(car.y - local.y, 0, local.y - car.y - 3),
    );
    if (distance > 1.35) return { ok: false, reason: 'Move closer to the car.' };
    const pose = findNearestValidCarPose(
      { ...car, roomId: room.id, speed: 0 },
      this.game.config.grid,
      (cell) => this.blocked(room.id, cell),
    );
    if (!pose) return { ok: false, reason: 'The car is blocked in.' };
    this.game.removeCar(room.id, car.id);
    this.game.setFlag('vehicle.active', pose);
    this.game.setFlag('vehicle.driving', true);
    this.drivers.delete(this.game.getLocalPlayerId());
    this.anchor(pose);
    return { ok: true };
  }

  input(throttle: -1 | 0 | 1, steering: -1 | 0 | 1): CommandResult {
    if (!this.active) return { ok: false, reason: 'You are not driving.' };
    this.driver.input = { throttle, steering };
    return { ok: true };
  }

  exit(): CommandResult {
    const car = this.active;
    if (!car) return { ok: false, reason: 'You are not driving.' };
    const pose = findNearestValidCarPose(car, this.game.config.grid, (cell) =>
      this.blocked(car.roomId, cell),
    );
    if (!pose) return { ok: false, reason: 'No room to exit.' };
    const x = Math.floor(pose.x);
    const y = Math.floor(pose.y);
    const exit = [
      { x: x - 1, y },
      { x: x - 1, y: y - 1 },
      { x: x - 1, y: y + 1 },
      { x: x - 2, y },
      { x, y: y - 1 },
      { x, y: y + 2 },
    ].find(
      (cell) =>
        !this.blocked(pose.roomId, cell) &&
        this.game.getRoom(pose.roomId).layout[cell.y]?.[cell.x] !== '~',
    );
    if (!exit) return { ok: false, reason: 'No room to exit.' };
    this.game.parkCar(pose.roomId, pose);
    this.game.placeSnakeBodyAtLocal(pose.roomId, exit, this.direction(pose));
    this.game.setFlag('vehicle.active', undefined);
    this.game.setFlag('vehicle.driving', undefined);
    this.drivers.delete(this.game.getLocalPlayerId());
    return { ok: true };
  }

  step(deltaMs: number, held: boolean): void {
    const car = this.active;
    if (!car || held) return;
    advanceCarPhysics(deltaMs, (elapsed) => {
      const current = this.active;
      if (!current) return false;
      const runtime = this.driver;
      const dt = elapsed / 1000;
      const motion = updateArcadeCarMotion(current, runtime.controls, runtime.input, dt);
      runtime.controls = motion.controls;
      const forward = carForwardVector(motion.car.angle);
      const next = {
        ...motion.car,
        x: current.x + forward.x * motion.car.speed * dt,
        y: current.y + forward.y * motion.car.speed * dt,
      };
      const resolved = resolveCarRoomPosition(current, next, this.game.config.grid);
      const now = Number(this.game.getFlag<number>('timeMs') ?? 0);
      if (
        getCarCollisionCells(resolved.car).some((cell) => this.blocked(resolved.car.roomId, cell))
      ) {
        if (shouldDamageCarWallImpact(Math.abs(next.speed), now, runtime.lastWallImpact)) {
          current.health -= 1;
          runtime.lastWallImpact = now;
        }
        const slideX = { ...current, x: next.x, angle: next.angle, speed: next.speed * 0.42 };
        const slideY = { ...current, y: next.y, angle: next.angle, speed: next.speed * 0.42 };
        if (!getCarCollisionCells(slideX).some((cell) => this.blocked(slideX.roomId, cell)))
          Object.assign(current, slideX);
        else if (!getCarCollisionCells(slideY).some((cell) => this.blocked(slideY.roomId, cell)))
          Object.assign(current, slideY);
        else current.speed = 0;
      } else {
        if (resolved.transitioned)
          this.game.handlePlayerRoomTransition(current.roomId, resolved.car.roomId, {
            mode: 'vehicle',
            direction: forward,
            localPosition: { x: Math.floor(resolved.car.x), y: Math.floor(resolved.car.y) },
          });
        Object.assign(current, resolved.car);
        this.anchor(current);
        const cells = getCarCollisionCells(current);
        this.game.consumeAppleAtForVehicle(current.roomId, cells, forward);
        if (Math.abs(current.speed) >= 2.2)
          this.game.damageCarImpactAt(current.roomId, cells, {
            nowMs: now,
            cooldowns: runtime.impacts,
          });
        if (
          cells.every((cell) => this.game.getRoom(current.roomId).layout[cell.y]?.[cell.x] === '~')
        )
          current.health = 0;
      }
      if (current.health <= 0) {
        this.game.explodeCar(current.roomId, { x: current.x + 1, y: current.y + 1.5 });
        this.game.setFlag('vehicle.active', undefined);
        this.game.setFlag('vehicle.driving', undefined);
        this.drivers.delete(this.game.getLocalPlayerId());
        return false;
      }
      return true;
    });
  }

  private blocked(roomId: string, cell: Vector2Like): boolean {
    const tile = this.game.getRoom(roomId).layout[cell.y]?.[cell.x];
    return !tile || tile === '#' || tile === '%' || tile === 'N' || isBlockingTownTile(tile);
  }
  private direction(car: DrivingCarState): Vector2Like {
    const forward = carForwardVector(car.angle);
    return Math.abs(forward.x) > Math.abs(forward.y)
      ? { x: forward.x >= 0 ? 1 : -1, y: 0 }
      : { x: 0, y: forward.y >= 0 ? 1 : -1 };
  }
  private anchor(car: DrivingCarState) {
    this.game.syncVehicleDriverToLocal(car.roomId, car, this.direction(car));
  }
}
