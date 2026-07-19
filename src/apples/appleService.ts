import type { AppleSystemConfig, AppleTypeConfig, GridConfig } from '../config/gameConfig.js';
import type { Vector2Like } from '../core/math.js';
import type { RandomGenerator } from '../core/rng.js';
import type { WorldService } from '../world/worldService.js';
import type { SpecialStats } from '../stats/specialTypes.js';
import type { AtmosphereState } from '../world/atmosphereTypes.js';
import { createDefaultSpecialStats } from '../stats/specialStats.js';
import { getEligibleAppleWeights } from '../stats/appleSpecial.js';
import { getSpawnPolicy } from '../world/safeZones.js';
import type {
  AppleInstance,
  AppleSnapshot,
  AppleRewards,
  AppleMoveContext,
  AppleConsumptionContext,
} from './types.js';
import { AppleRegistry } from './appleRegistry.js';

export interface WeatherAppleContext {
  atmosphere: AtmosphereState;
}

export interface WeatherSpawnModifiers {
  spawnRateScalar: number;
  decayRateScalar: number;
  visibilityScalar: number;
  bonusApples: Set<string>;
  suppressedApples: Set<string>;
}

export interface AppleSpawnResult {
  snapshot: AppleSnapshot | null;
  changed: boolean;
}

export interface AppleConsumptionResult {
  fatal: boolean;
  rewards: AppleRewards;
  worldPosition: Vector2Like | null;
  changed: boolean;
  snapshot: AppleSnapshot | null;
  typeId?: string;
}

interface AppleSpawnOption extends Vector2Like {
  tile: string;
}

export class AppleService {
  private readonly registry: AppleRegistry;
  private readonly apples = new Map<string, AppleInstance>();
  private nextAppleId = 0;

  constructor(
    private readonly config: AppleSystemConfig,
    private readonly grid: GridConfig,
    private readonly world: WorldService,
    private readonly rng: RandomGenerator,
    private readonly getSpecialStats: () => SpecialStats = createDefaultSpecialStats,
  ) {
    this.registry = new AppleRegistry(config);
  }

  getSnapshot(roomId: string): AppleSnapshot | null {
    const apple = this.getRoomApples(roomId)[0];
    return apple ? apple.getSnapshot() : null;
  }

  getSnapshots(roomId: string): AppleSnapshot[] {
    return this.getRoomApples(roomId).map((apple) => apple.getSnapshot());
  }

  ensureApple(roomId: string, snake: Vector2Like[], score: number): AppleSpawnResult {
    const room = this.world.getRoom(roomId);
    const policy = getSpawnPolicy(room);
    if (policy.apples === 'suppress') {
      return { snapshot: null, changed: false };
    }
    if (policy.apples === 'clearExisting') {
      this.clearApple(roomId);
      return { snapshot: null, changed: false };
    }
    const existing = this.getRoomApples(roomId)[0];
    if (existing) {
      return { snapshot: existing.getSnapshot(), changed: false };
    }
    return this.spawnApple(roomId, snake, score);
  }

  spawnApple(roomId: string, snake: Vector2Like[], score: number): AppleSpawnResult {
    return this.spawnAppleWithContext(roomId, snake, score, undefined);
  }

  spawnAppleWithWeather(
    roomId: string,
    snake: Vector2Like[],
    score: number,
    atmosphere: AtmosphereState,
  ): AppleSpawnResult {
    return this.spawnAppleWithContext(roomId, snake, score, { atmosphere });
  }

  private spawnAppleWithContext(
    roomId: string,
    snake: Vector2Like[],
    score: number,
    weatherContext?: WeatherAppleContext,
  ): AppleSpawnResult {
    const room = this.world.getRoom(roomId);
    const policy = getSpawnPolicy(room);
    if (policy.apples === 'suppress') {
      return { snapshot: null, changed: false };
    }
    if (policy.apples === 'clearExisting') {
      this.clearApple(roomId);
      return { snapshot: null, changed: false };
    }
    const spawnOptions = this.collectSpawnOptions(roomId, room.layout, snake);
    if (spawnOptions.length === 0) {
      return { snapshot: null, changed: false };
    }

    const spawnIndex = Math.floor(this.rng() * spawnOptions.length);
    const position = spawnOptions[spawnIndex];
    const appleType = this.chooseAppleType(score, position.tile === '~', weatherContext);
    if (!appleType) {
      return { snapshot: null, changed: false };
    }

    const instance = this.registry.createInstance(appleType, roomId, position);
    instance.initialize({ rng: this.rng });

    this.clearRoomApple(roomId);
    this.trackApple(instance);
    this.syncRoomApples(roomId);
    return { snapshot: instance.getSnapshot(), changed: true };
  }

  placeApple(
    roomId: string,
    position: Vector2Like,
    typeId: string,
    snake: Vector2Like[] = [],
    allowMultiple = false,
  ): AppleSpawnResult {
    const room = this.world.getRoom(roomId);
    const tile = room.layout[position.y]?.[position.x];
    if (tile !== '.' && tile !== '~') {
      return { snapshot: this.getSnapshot(roomId), changed: false };
    }
    const global = this.toGlobal(roomId, position);
    if (this.isSnakeAtGlobal(snake, global.x, global.y)) {
      return { snapshot: this.getSnapshot(roomId), changed: false };
    }
    const appleType = this.registry.getTypes().find((type) => type.id === typeId);
    if (!appleType) {
      return { snapshot: this.getSnapshot(roomId), changed: false };
    }
    if (!allowMultiple) {
      this.clearRoomApple(roomId);
    }
    const instance = this.registry.createInstance(appleType, roomId, position);
    instance.initialize({ rng: this.rng });
    this.trackApple(instance);
    this.syncRoomApples(roomId);
    return { snapshot: instance.getSnapshot(), changed: true };
  }

  clearRoomApple(roomId: string): void {
    this.clearRoomApplesInternal(roomId);
  }

  moveApples(snake: Vector2Like[]): Set<string> {
    const affectedRooms = new Set<string>();
    for (const apple of Array.from(this.apples.values())) {
      const context = this.createMoveContext(apple, snake);
      const explicitMove = apple.maybeMove(context);
      if (explicitMove) {
        const movement = this.applyMovement(
          apple,
          explicitMove.roomId,
          explicitMove.position,
          snake,
        );
        if (movement) {
          affectedRooms.add(movement.from);
          affectedRooms.add(movement.to);
        }
        continue;
      }

      if (!apple.shouldAttemptMove(context)) {
        continue;
      }

      const directions = apple.getMoveDirections(context);
      const movement = this.tryDirections(apple, directions, snake);
      if (movement) {
        affectedRooms.add(movement.from);
        affectedRooms.add(movement.to);
      }
    }
    return affectedRooms;
  }

  handleConsumption(
    roomId: string,
    direction: Vector2Like,
    phasing = false,
    position?: Vector2Like,
  ): AppleConsumptionResult {
    const apple = this.findApple(roomId, position) ?? null;
    if (!apple) {
      return {
        fatal: false,
        rewards: { growth: 1, bonusScore: 0 },
        worldPosition: null,
        changed: false,
        snapshot: null,
      };
    }

    const context: AppleConsumptionContext = { direction, phasing };
    const fatal = apple.isFatalApproach(context);
    if (fatal) {
      return {
        fatal: true,
        rewards: { growth: 0, bonusScore: 0 },
        worldPosition: null,
        changed: false,
        snapshot: apple.getSnapshot(),
      };
    }

    const rewards = apple.onConsume();
    const worldPosition = this.appleWorldPosition(apple);
    this.untrackApple(apple);
    this.syncRoomApples(roomId);

    return {
      fatal: false,
      rewards,
      worldPosition,
      changed: true,
      snapshot: null,
      typeId: apple.typeId,
    };
  }

  clearApple(roomId: string): void {
    this.clearRoomApplesInternal(roomId);
  }

  clearAll(): void {
    this.apples.clear();
    this.nextAppleId = 0;
  }

  private appleWorldPosition(apple: AppleInstance): Vector2Like {
    if (apple.roomId.startsWith('cave:')) {
      return {
        x: (apple.position.x + 0.5) * this.grid.cell,
        y: (apple.position.y + 0.5) * this.grid.cell,
      };
    }
    const [roomX, roomY] = apple.roomId.split(',').map(Number);
    const worldX = (roomX * this.grid.cols + apple.position.x + 0.5) * this.grid.cell;
    const worldY = (roomY * this.grid.rows + apple.position.y + 0.5) * this.grid.cell;
    return { x: worldX, y: worldY };
  }

  private tryDirections(
    apple: AppleInstance,
    directions: Vector2Like[],
    snake: Vector2Like[],
  ): { from: string; to: string } | null {
    for (const dir of directions) {
      const candidate = this.resolveMove(apple, dir, snake);
      if (!candidate) {
        continue;
      }
      const movement = this.applyMovement(apple, candidate.roomId, candidate.position, snake);
      if (movement) {
        return movement;
      }
    }
    return null;
  }

  private applyMovement(
    apple: AppleInstance,
    roomId: string,
    position: Vector2Like,
    snake: Vector2Like[],
  ): { from: string; to: string } | null {
    if (getSpawnPolicy(this.world.getRoom(roomId)).apples !== 'allow') {
      return null;
    }
    const fromRoom = apple.roomId;

    const occupant = this.findApple(roomId, position);
    if (
      occupant &&
      occupant !== apple &&
      occupant.position.x === position.x &&
      occupant.position.y === position.y
    ) {
      return null;
    }

    const global = this.toGlobal(roomId, position);
    if (this.isSnakeAtGlobal(snake, global.x, global.y)) {
      return null;
    }

    this.untrackApple(apple);
    if (fromRoom !== roomId) {
      this.syncRoomApples(fromRoom);
    }
    apple.relocate(roomId, position);
    this.trackApple(apple);
    this.syncRoomApples(roomId);

    return { from: fromRoom, to: apple.roomId };
  }

  private resolveMove(
    apple: AppleInstance,
    dir: Vector2Like,
    snake: Vector2Like[],
  ): { roomId: string; position: Vector2Like } | null {
    if (apple.roomId.startsWith('cave:')) {
      const localX = apple.position.x + dir.x;
      const localY = apple.position.y + dir.y;
      if (localX < 0 || localY < 0 || localX >= this.grid.cols || localY >= this.grid.rows) {
        return null;
      }
      const targetRoom = this.world.getRoom(apple.roomId);
      const tile = targetRoom.layout[localY]?.[localX];
      if (tile !== '.') {
        return null;
      }
      const occupant = this.findApple(apple.roomId, { x: localX, y: localY });
      if (
        occupant &&
        occupant !== apple &&
        occupant.position.x === localX &&
        occupant.position.y === localY
      ) {
        return null;
      }
      if (this.isSnakeAtGlobal(snake, localX, localY)) {
        return null;
      }
      return { roomId: apple.roomId, position: { x: localX, y: localY } };
    }

    let localX = apple.position.x + dir.x;
    let localY = apple.position.y + dir.y;
    let [roomX, roomY, roomZ = 0] = apple.roomId.split(',').map(Number);

    if (localX < 0) {
      localX = this.grid.cols - 1;
      roomX -= 1;
    } else if (localX >= this.grid.cols) {
      localX = 0;
      roomX += 1;
    }

    if (localY < 0) {
      localY = this.grid.rows - 1;
      roomY -= 1;
    } else if (localY >= this.grid.rows) {
      localY = 0;
      roomY += 1;
    }

    const targetRoomId = `${roomX},${roomY},${roomZ}`;
    if (getSpawnPolicy(this.world.getRoom(targetRoomId)).apples !== 'allow') {
      return null;
    }
    const targetRoom = this.world.getRoom(targetRoomId);
    const tile = targetRoom.layout[localY]?.[localX];
    if (tile !== '.') {
      return null;
    }

    const occupant = this.findApple(targetRoomId, { x: localX, y: localY });
    if (
      occupant &&
      occupant !== apple &&
      occupant.position.x === localX &&
      occupant.position.y === localY
    ) {
      return null;
    }

    const global = this.toGlobal(targetRoomId, { x: localX, y: localY });
    if (this.isSnakeAtGlobal(snake, global.x, global.y)) {
      return null;
    }

    return { roomId: targetRoomId, position: { x: localX, y: localY } };
  }

  private createMoveContext(apple: AppleInstance, snake: Vector2Like[]): AppleMoveContext {
    return {
      rng: this.rng,
      grid: this.grid,
      snake,
      currentRoom: this.world.getRoom(apple.roomId),
      getRoom: (roomId: string) => this.world.getRoom(roomId),
      isAppleOccupied: (roomId: string, position: Vector2Like) => {
        const occupant = this.findApple(roomId, position);
        if (!occupant) return false;
        if (occupant === apple) return false;
        return true;
      },
    };
  }

  private chooseAppleType(
    score: number,
    waterOnly = false,
    weatherContext?: WeatherAppleContext,
  ): AppleTypeConfig | null {
    const eligible = getEligibleAppleWeights(this.config, this.getSpecialStats(), {
      score,
      waterOnly,
    });

    if (eligible.length === 0) {
      return this.registry.getTypes().find((t) => t.id === 'normal') ?? null;
    }

    // Apply weather modifiers to apple weights
    const weatherModifiers = this.calculateWeatherModifiers(weatherContext);
    const modifiedEligible = eligible.map((entry) => {
      let weight = entry.weight;
      if (weatherModifiers.suppressedApples.has(entry.type.id)) {
        weight *= 0.1;
      }
      if (weatherModifiers.bonusApples.has(entry.type.id)) {
        weight *= 3;
      }
      // Seasonal apple preferences
      if (weatherContext) {
        const { season, globalWeather } = weatherContext.atmosphere;
        const typeId = entry.type.id;
        // Spring: lavender, love apples favored
        if (season === 'spring' && (typeId === 'lavender' || typeId === 'love')) {
          weight *= 2;
        }
        // Summer: caffeinated, treat apples favored
        if (season === 'summer' && (typeId === 'caffeinated' || typeId === 'treat')) {
          weight *= 2;
        }
        // Autumn: mochi, yuzu apples favored
        if (season === 'autumn' && (typeId === 'mochi' || typeId === 'yuzu')) {
          weight *= 2;
        }
        // Winter: wasabi favored
        if (season === 'winter' && typeId === 'wasabi') {
          weight *= 2.5;
        }
        // Weather-specific bonuses
        if (globalWeather === 'rain' && (typeId === 'skittish' || typeId === 'koi')) {
          // Rain makes slippery apples more likely but harder to catch
          weight *= 1.5;
        }
        if (globalWeather === 'coldfront' && typeId === 'wasabi') {
          weight *= 2;
        }
        if (globalWeather === 'heatwave' && typeId === 'caffeinated') {
          weight *= 2;
        }
        if (globalWeather === 'fog' && typeId === 'caffeinated') {
          // Caffeinated apples help clear fog
          weight *= 1.5;
        }
      }
      return { ...entry, weight: Math.max(0.01, weight) };
    });

    const totalWeight = modifiedEligible.reduce((total, entry) => total + entry.weight, 0);
    if (totalWeight <= 0) {
      return modifiedEligible[0]?.type ?? null;
    }

    const choice = this.rng() * totalWeight;
    let cumulative = 0;
    for (const { type, weight } of modifiedEligible) {
      cumulative += weight;
      if (choice <= cumulative) {
        return type;
      }
    }
    return modifiedEligible[modifiedEligible.length - 1]?.type ?? null;
  }

  calculateWeatherModifiers(weatherContext?: WeatherAppleContext): WeatherSpawnModifiers {
    const defaultModifiers: WeatherSpawnModifiers = {
      spawnRateScalar: 1,
      decayRateScalar: 1,
      visibilityScalar: 1,
      bonusApples: new Set(),
      suppressedApples: new Set(),
    };

    if (!weatherContext) {
      return defaultModifiers;
    }

    const { season, globalWeather } = weatherContext.atmosphere;

    switch (globalWeather) {
      case 'rain':
        return {
          ...defaultModifiers,
          spawnRateScalar: 1,
          visibilityScalar: 0.95,
          bonusApples: new Set(['skittish', 'koi']),
        };
      case 'coldfront':
        return {
          ...defaultModifiers,
          spawnRateScalar: 0.8,
          visibilityScalar: 0.7,
          bonusApples: new Set(['wasabi']),
        };
      case 'fog':
        return {
          ...defaultModifiers,
          spawnRateScalar: 1,
          visibilityScalar: 0.6,
          bonusApples: new Set(['caffeinated']),
        };
      case 'storm':
        return {
          ...defaultModifiers,
          spawnRateScalar: 0.7,
          visibilityScalar: 0.75,
          suppressedApples: new Set(['caffeinated']),
        };
      case 'heatwave':
        return {
          ...defaultModifiers,
          spawnRateScalar: 1.5,
          decayRateScalar: 1.5,
          visibilityScalar: 0.9,
          bonusApples: new Set(['caffeinated', 'treat']),
        };
      case 'wind':
        return {
          ...defaultModifiers,
          spawnRateScalar: 1,
          visibilityScalar: 0.9,
          bonusApples: new Set(['skittish']),
        };
      default:
        // Seasonal defaults
        switch (season) {
          case 'spring':
            return { ...defaultModifiers, bonusApples: new Set(['lavender', 'love']) };
          case 'summer':
            return { ...defaultModifiers, spawnRateScalar: 1.1, bonusApples: new Set(['caffeinated', 'treat']) };
          case 'autumn':
            return { ...defaultModifiers, visibilityScalar: 0.9, bonusApples: new Set(['mochi', 'yuzu']) };
          case 'winter':
            return { ...defaultModifiers, spawnRateScalar: 0.85, visibilityScalar: 0.8, bonusApples: new Set(['wasabi']) };
          default:
            return defaultModifiers;
        }
    }
  }

  private collectSpawnOptions(
    roomId: string,
    layout: string[],
    snake: Vector2Like[],
  ): AppleSpawnOption[] {
    const options: AppleSpawnOption[] = [];
    const isCaveRoom = roomId.startsWith('cave:');
    const [roomX, roomY] = isCaveRoom ? [0, 0] : roomId.split(',').map(Number);
    const roomApples = this.getRoomApples(roomId);

    for (let y = 0; y < layout.length; y++) {
      const row = layout[y];
      for (let x = 0; x < row.length; x++) {
        const tile = row[x];
        if (tile !== '.' && tile !== '~') continue;
        // Avoid spawning on treasure chests
        if (this.world.hasTreasureAt(roomId, x, y)) continue;
        if (roomApples.some((apple) => apple.position.x === x && apple.position.y === y)) continue;
        const globalX = roomX * this.grid.cols + x;
        const globalY = roomY * this.grid.rows + y;
        if (this.isSnakeAtGlobal(snake, globalX, globalY)) continue;
        options.push({ x, y, tile });
      }
    }
    return options;
  }

  private toGlobal(roomId: string, position: Vector2Like): Vector2Like {
    if (roomId.startsWith('cave:')) {
      return { x: position.x, y: position.y };
    }
    const [roomX, roomY] = roomId.split(',').map(Number);
    return {
      x: roomX * this.grid.cols + position.x,
      y: roomY * this.grid.rows + position.y,
    };
  }

  private isSnakeAtGlobal(snake: Vector2Like[], x: number, y: number): boolean {
    return snake.some((segment) => segment.x === x && segment.y === y);
  }

  private getRoomApples(roomId: string): AppleInstance[] {
    return Array.from(this.apples.values()).filter((apple) => apple.roomId === roomId);
  }

  private findApple(roomId: string, position?: Vector2Like): AppleInstance | undefined {
    const apples = this.getRoomApples(roomId);
    if (!position) {
      return apples[0];
    }
    return apples.find(
      (apple) => apple.position.x === position.x && apple.position.y === position.y,
    );
  }

  private trackApple(apple: AppleInstance): void {
    this.apples.set(`apple:${this.nextAppleId++}`, apple);
  }

  private untrackApple(apple: AppleInstance): void {
    for (const [key, candidate] of this.apples) {
      if (candidate === apple) {
        this.apples.delete(key);
        return;
      }
    }
  }

  private clearRoomApplesInternal(roomId: string): void {
    let changed = false;
    for (const [key, apple] of Array.from(this.apples.entries())) {
      if (apple.roomId === roomId) {
        this.apples.delete(key);
        changed = true;
      }
    }
    if (changed) {
      this.syncRoomApples(roomId);
    } else {
      this.world.setApple(roomId, undefined);
      this.world.getRoom(roomId).apples = undefined;
    }
  }

  private syncRoomApples(roomId: string): void {
    const positions = this.getRoomApples(roomId).map((apple) => ({ ...apple.position }));
    const primary = positions[0];
    this.world.setApple(roomId, primary);
    this.world.getRoom(roomId).apples = positions.length > 1 ? positions : undefined;
  }
}
