import type { GridConfig } from '../config/gameConfig.js';
import type { Vector2Like } from '../core/math.js';
import { manhattanDistance, pickRandom, vectorKey } from '../core/math.js';
import type { RandomGenerator } from '../core/rng.js';
import type { RoomSnapshot } from '../world/types.js';
import { isSolidTile } from '../world/tiles.js';
import {
  getBiomeDefinition,
  getBiomeAnimalSpawnBias,
  getBiomeAnimalSpawnChance,
  type BiomeId,
} from '../world/biomes.js';
import type { ResolvedAtmosphereView } from '../world/atmosphereTypes.js';
import type { AnimalDefinition, AnimalInstance, AnimalType } from './types.js';
import { AnimalRegistry } from './animalRegistry.js';
import { canTameAnimal } from './taming.js';

interface AnimalStepParams {
  getRoom(roomId: string): RoomSnapshot;
  snake: readonly Vector2Like[];
  currentRoomId: string;
  snakeDirection: Vector2Like;
  canHuntHarmless?: boolean;
  tameCallback?: (animalId: string, tamed: boolean) => void;
}

interface AnimalStepResult {
  tames: number;
  damageDealt: number;
  damageTaken: number;
  hunted: number;
  startleCount: number;
  huntedAnimals: HuntedAnimalResult[];
}

export interface HuntedAnimalResult {
  animalId: string;
  actorId?: string;
  animalType: AnimalDefinition['type'];
  animalName: string;
  position: Vector2Like;
  drops: AnimalDefinition['drops'];
}

export interface SnakeAnimalResult {
  tamed: boolean;
  tamableAnimal?: AnimalInstance;
  damaged: boolean;
  hunted: boolean;
  huntedAnimal?: HuntedAnimalResult;
  startleCount: number;
}

function shuffle<T>(rng: RandomGenerator, arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export class AnimalManager {
  private readonly animals = new Map<string, AnimalInstance[]>();
  private nextId = 0;

  constructor(
    private readonly grid: GridConfig,
    private readonly rng: RandomGenerator,
  ) {}

  ensureAnimals(
    roomId: string,
    room: RoomSnapshot,
    occupied: readonly Vector2Like[],
    atmosphere?: ResolvedAtmosphereView,
  ): void {
    if (roomId === '0,-1,0') {
      return;
    }
    if (room.village || room.goblinCamp || room.town || room.townPerimeter) {
      return;
    }
    if (this.animals.has(roomId)) {
      return;
    }

    const biome = getBiomeDefinition(room.biomeId);
    const spawnChance =
      getBiomeAnimalSpawnChance(biome) * (atmosphere?.gameplay.animalSpawnChanceScalar ?? 1);
    if (spawnChance <= 0) {
      return;
    }
    if (this.rng() > spawnChance) {
      return;
    }

    const biomeAnimals = AnimalRegistry.getForBiome(biome.id);
    if (biomeAnimals.length === 0) {
      return;
    }

    const weighted = this.buildSpawnTable(biomeAnimals, biome, atmosphere);
    if (weighted.length === 0) {
      return;
    }

    const roomAnimals: AnimalInstance[] = [];
    const usedPositions = new Set<string>();

    for (const segment of occupied) {
      usedPositions.add(vectorKey(segment));
    }
    if (room.apple) {
      usedPositions.add(vectorKey(room.apple));
    }
    if (room.treasure) {
      usedPositions.add(vectorKey(room.treasure));
    }

    for (const entry of weighted) {
      let spawnedOfType = roomAnimals.filter(
        (animal) => animal.type === entry.definition.type,
      ).length;
      while (spawnedOfType < entry.maxPerRoom) {
        const animal = this.trySpawnAnimal(roomId, room, entry, usedPositions);
        if (!animal) {
          break;
        }
        roomAnimals.push(animal);
        usedPositions.add(vectorKey(animal.position));
        spawnedOfType++;
      }
    }

    if (roomAnimals.length > 0) {
      this.animals.set(roomId, roomAnimals);
    }
  }

  private buildSpawnTable(
    biomeAnimals: readonly AnimalDefinition[],
    biome: ReturnType<typeof getBiomeDefinition>,
    atmosphere?: ResolvedAtmosphereView,
  ): Array<{ definition: AnimalDefinition; maxPerRoom: number; weight: number }> {
    const weighted: Array<{ definition: AnimalDefinition; maxPerRoom: number; weight: number }> =
      [];

    for (const def of biomeAnimals) {
      let weight = def.spawnWeight;
      const biomeBias = getBiomeAnimalSpawnBias(biome, def.type);
      if (biomeBias > 0) {
        weight *= biomeBias;
      }
      const atmosphereBias = atmosphere?.gameplay.animalSpawnBiasAdd[def.type] ?? 0;
      if (atmosphereBias !== 0) {
        weight *= Math.max(0, 1 + atmosphereBias * 0.35);
      }
      if (def.snakeEncounter === 'dangerous') {
        weight = Math.max(1, weight * (biome.dangerLevel / 5));
      }
      if (def.behavior === 'school' && biome.id !== 'sunken-ocean') {
        weight *= 0.5;
      }
      if (def.behavior === 'perch') {
        weight *= 1.5;
      }
      weighted.push({
        definition: def,
        maxPerRoom: Math.min(def.maxPerRoom, Math.max(1, Math.ceil(weight / 10))),
        weight,
      });
    }

    return weighted.sort((left, right) => right.weight - left.weight);
  }

  private trySpawnAnimal(
    roomId: string,
    room: RoomSnapshot,
    entry: { definition: AnimalDefinition; maxPerRoom: number },
    usedPositions: Set<string>,
  ): AnimalInstance | null {
    const def = entry.definition;
    const candidates: Vector2Like[] = [];

    for (let y = 0; y < this.grid.rows; y++) {
      for (let x = 0; x < this.grid.cols; x++) {
        if (usedPositions.has(`${x},${y}`)) {
          continue;
        }
        if (!this.isValidAnimalTile(room, def, x, y)) {
          continue;
        }
        candidates.push({ x, y });
      }
    }

    if (candidates.length === 0) {
      return null;
    }

    const position = candidates[Math.floor(this.rng() * candidates.length)];
    const directions: Vector2Like[] = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ];

    const id = `animal-${this.nextId++}`;
    return {
      id,
      actorId: `animal:${roomId}:${id}`,
      type: def.type,
      roomId,
      position,
      direction: pickRandom(this.rng, directions),
      moveCooldown: Math.floor(this.rng() * def.moveInterval),
      isTamed: false,
      flashTicks: 0,
      currentHearts: def.maxHearts ?? 1,
    };
  }

  private isValidAnimalTile(
    room: RoomSnapshot,
    def: AnimalDefinition,
    x: number,
    y: number,
  ): boolean {
    const tile = room.layout[y]?.[x];
    if (!tile || isSolidTile(tile) || tile === '%') {
      return false;
    }
    if (def.behavior === 'school') {
      return tile === '~';
    }
    if (def.behavior === 'perch') {
      return isSolidTile(tile) || tile === '%' || tile === '.';
    }
    return tile === '.' || tile === 'O';
  }

  step(params: AnimalStepParams): AnimalStepResult {
    const { getRoom, snake, currentRoomId, snakeDirection, tameCallback } = params;

    const result: AnimalStepResult = {
      tames: 0,
      damageDealt: 0,
      damageTaken: 0,
      hunted: 0,
      startleCount: 0,
      huntedAnimals: [],
    };

    const head = snake[0];
    if (!head) {
      return result;
    }

    const roomAnimals = this.animals.get(currentRoomId) ?? [];
    if (roomAnimals.length === 0) {
      return result;
    }

    const room = getRoom(currentRoomId);
    const headLocal = this.worldToLocal(currentRoomId, head);
    const nextAnimals: AnimalInstance[] = [];

    for (const animal of roomAnimals) {
      const def = AnimalRegistry.getDefinition(animal.type);
      let next = { ...animal };

      if (next.flashTicks > 0) {
        next.flashTicks--;
      }

      if (next.moveCooldown > 0) {
        next.moveCooldown--;
        nextAnimals.push(next);
        continue;
      }

      next = this.moveAnimal(next, def, room, headLocal, snakeDirection, roomAnimals);
      next.moveCooldown = def.moveInterval + Math.floor(this.rng() * def.moveInterval);

      nextAnimals.push(next);
    }

    this.handleAnimalInteractions(
      nextAnimals,
      headLocal,
      currentRoomId,
      result,
      Boolean(params.canHuntHarmless),
    );

    if (nextAnimals.length > 0) {
      this.animals.set(currentRoomId, nextAnimals);
    } else {
      this.animals.delete(currentRoomId);
    }

    return result;
  }

  private moveAnimal(
    animal: AnimalInstance,
    def: AnimalDefinition,
    room: RoomSnapshot,
    headLocal: Vector2Like,
    snakeDirection: Vector2Like,
    roomAnimals: AnimalInstance[],
  ): AnimalInstance {
    if (animal.isTamed) {
      const next = this.tryMoveToward(animal, room, headLocal, this.isWalkableAnimalTile);
      return next ? { ...animal, position: next } : animal;
    }
    switch (def.behavior) {
      case 'wander':
        return this.moveWander(animal, def, room, headLocal);
      case 'flee':
        return this.moveFlee(animal, def, room, headLocal);
      case 'chase':
        return this.moveChase(animal, def, room, headLocal, snakeDirection);
      case 'graze':
        return this.moveGraze(animal, def, room, headLocal);
      case 'school':
        return this.moveSchool(animal, def, room, headLocal, roomAnimals);
      case 'perch':
        return this.movePerch(animal, def, room, headLocal, snakeDirection);
      default:
        return this.moveWander(animal, def, room, headLocal);
    }
  }

  private moveWander(
    animal: AnimalInstance,
    def: AnimalDefinition,
    room: RoomSnapshot,
    headLocal: Vector2Like,
  ): AnimalInstance {
    const next = this.tryMoveRandom(animal, room, headLocal, this.isWalkableAnimalTile);
    return next ? { ...animal, position: next } : animal;
  }

  private moveFlee(
    animal: AnimalInstance,
    def: AnimalDefinition,
    room: RoomSnapshot,
    headLocal: Vector2Like,
  ): AnimalInstance {
    const next = this.tryMoveAway(animal, room, headLocal, this.isWalkableAnimalTile);
    return next ? { ...animal, position: next } : animal;
  }

  private moveChase(
    animal: AnimalInstance,
    def: AnimalDefinition,
    room: RoomSnapshot,
    headLocal: Vector2Like,
    snakeDirection: Vector2Like,
  ): AnimalInstance {
    if (
      def.snakeEncounter === 'dangerous' &&
      this.isSnakeCharging(animal.position, headLocal, snakeDirection)
    ) {
      const next = this.tryMoveAway(animal, room, headLocal, this.isWalkableAnimalTile);
      return next ? { ...animal, position: next } : animal;
    }
    const next = this.tryMoveToward(animal, room, headLocal, this.isWalkableAnimalTile);
    return next ? { ...animal, position: next } : animal;
  }

  private moveGraze(
    animal: AnimalInstance,
    def: AnimalDefinition,
    room: RoomSnapshot,
    headLocal: Vector2Like,
  ): AnimalInstance {
    const next = this.tryMoveWander(animal, room, headLocal, this.isWalkableAnimalTile);
    return next ? { ...animal, position: next } : animal;
  }

  private moveSchool(
    animal: AnimalInstance,
    def: AnimalDefinition,
    room: RoomSnapshot,
    headLocal: Vector2Like,
    roomAnimals: AnimalInstance[],
  ): AnimalInstance {
    const nearestSchoolmate = this.findNearestAnimal(animal, roomAnimals, 4);
    if (nearestSchoolmate) {
      const next = this.tryMoveToward(animal, room, nearestSchoolmate.position, this.isWaterTile);
      if (next) {
        return { ...animal, position: next };
      }
    }
    const next = this.tryMoveRandom(animal, room, headLocal, this.isWaterTile);
    return next ? { ...animal, position: next } : animal;
  }

  private movePerch(
    animal: AnimalInstance,
    def: AnimalDefinition,
    room: RoomSnapshot,
    headLocal: Vector2Like,
    snakeDirection: Vector2Like,
  ): AnimalInstance {
    if (this.isSnakeCharging(animal.position, headLocal, snakeDirection)) {
      const next = this.tryMoveAway(animal, room, headLocal, this.isWalkableAnimalTile);
      return next ? { ...animal, position: next } : animal;
    }
    return animal;
  }

  private tryMoveRandom(
    animal: AnimalInstance,
    room: RoomSnapshot,
    headLocal: Vector2Like,
    tileCheck: (tile: string, x: number, y: number) => boolean,
  ): Vector2Like | null {
    const directions = shuffle(this.rng, [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ]);

    for (const dir of directions) {
      const next = { x: animal.position.x + dir.x, y: animal.position.y + dir.y };
      if (this.isValidPosition(next, room, tileCheck, headLocal)) {
        return next;
      }
    }
    return null;
  }

  private tryMoveToward(
    animal: AnimalInstance,
    room: RoomSnapshot,
    target: Vector2Like,
    tileCheck: (tile: string, x: number, y: number) => boolean,
  ): Vector2Like | null {
    const dx = Math.sign(target.x - animal.position.x);
    const dy = Math.sign(target.y - animal.position.y);
    const preferred: Vector2Like[] = [];
    if (dx !== 0) {
      preferred.push({ x: dx, y: 0 });
    }
    if (dy !== 0) {
      preferred.push({ x: 0, y: dy });
    }
    preferred.push(
      ...shuffle(this.rng, [
        { x: 1, y: 0 },
        { x: -1, y: 0 },
        { x: 0, y: 1 },
        { x: 0, y: -1 },
      ]),
    );

    for (const dir of preferred) {
      const next = { x: animal.position.x + dir.x, y: animal.position.y + dir.y };
      if (this.isValidPosition(next, room, tileCheck, target)) {
        return next;
      }
    }
    return null;
  }

  private tryMoveAway(
    animal: AnimalInstance,
    room: RoomSnapshot,
    target: Vector2Like,
    tileCheck: (tile: string, x: number, y: number) => boolean,
  ): Vector2Like | null {
    const dx = Math.sign(animal.position.x - target.x);
    const dy = Math.sign(animal.position.y - target.y);
    const preferred: Vector2Like[] = [];
    if (dx !== 0) {
      preferred.push({ x: dx, y: 0 });
    }
    if (dy !== 0) {
      preferred.push({ x: 0, y: dy });
    }
    preferred.push(
      ...shuffle(this.rng, [
        { x: 1, y: 0 },
        { x: -1, y: 0 },
        { x: 0, y: 1 },
        { x: 0, y: -1 },
      ]),
    );

    let best: Vector2Like | null = null;
    let bestDist = manhattanDistance(animal.position, target);

    for (const dir of preferred) {
      const next = { x: animal.position.x + dir.x, y: animal.position.y + dir.y };
      if (!this.isValidPosition(next, room, tileCheck, target)) {
        continue;
      }
      const dist = manhattanDistance(next, target);
      if (dist > bestDist) {
        best = next;
        bestDist = dist;
      }
    }
    return best;
  }

  private tryMoveWander(
    animal: AnimalInstance,
    room: RoomSnapshot,
    headLocal: Vector2Like,
    tileCheck: (tile: string, x: number, y: number) => boolean,
  ): Vector2Like | null {
    return this.tryMoveRandom(animal, room, headLocal, tileCheck);
  }

  private isValidPosition(
    next: Vector2Like,
    room: RoomSnapshot,
    tileCheck: (tile: string, x: number, y: number) => boolean,
    headLocal: Vector2Like,
  ): boolean {
    if (next.x < 0 || next.x >= this.grid.cols || next.y < 0 || next.y >= this.grid.rows) {
      return false;
    }
    if (next.x === headLocal.x && next.y === headLocal.y) {
      return false;
    }
    const tile = room.layout[next.y]?.[next.x];
    return tileCheck(tile, next.x, next.y);
  }

  private isWalkableAnimalTile(tile: string): boolean {
    return tile === '.' || tile === 'O';
  }

  private isWaterTile(tile: string): boolean {
    return tile === '~';
  }

  private findNearestAnimal(
    source: AnimalInstance,
    others: AnimalInstance[],
    maxDistance: number,
  ): AnimalInstance | null {
    let nearest: AnimalInstance | null = null;
    let nearestDist = maxDistance;

    for (const other of others) {
      if (other.id === source.id) {
        continue;
      }
      const dist = manhattanDistance(source.position, other.position);
      if (dist < nearestDist) {
        nearest = other;
        nearestDist = dist;
      }
    }
    return nearest;
  }

  private isSnakeCharging(
    animalPos: Vector2Like,
    headLocal: Vector2Like,
    snakeDirection: Vector2Like,
  ): boolean {
    if (snakeDirection.x !== 0 && headLocal.y === animalPos.y) {
      return Math.sign(animalPos.x - headLocal.x) === snakeDirection.x;
    }
    if (snakeDirection.y !== 0 && headLocal.x === animalPos.x) {
      return Math.sign(animalPos.y - headLocal.y) === snakeDirection.y;
    }
    return false;
  }

  private handleAnimalInteractions(
    animals: AnimalInstance[],
    headLocal: Vector2Like,
    roomId: string,
    result: AnimalStepResult,
    canHuntHarmless: boolean,
  ): void {
    const newAnimals: AnimalInstance[] = [];

    for (const animal of animals) {
      const def = AnimalRegistry.getDefinition(animal.type);

      if (animal.position.x === headLocal.x && animal.position.y === headLocal.y) {
        if (animal.isTamed) {
          newAnimals.push({ ...animal, flashTicks: Math.max(animal.flashTicks, 1) });
          continue;
        }
        switch (def.snakeEncounter) {
          case 'harmless':
            if (canHuntHarmless) {
              result.hunted++;
              result.huntedAnimals.push(this.createHuntedAnimalResult(animal, def));
            } else {
              result.startleCount++;
              newAnimals.push({ ...animal, flashTicks: 3 });
            }
            break;
          case 'dangerous':
            result.damageTaken++;
            newAnimals.push({ ...animal, flashTicks: 2 });
            break;
          case 'hunt':
            result.hunted++;
            result.huntedAnimals.push(this.createHuntedAnimalResult(animal, def));
            break;
          case 'tamable':
            newAnimals.push({ ...animal, flashTicks: 2 });
            break;
        }
        continue;
      }

      if (def.snakeEncounter === 'harmless' && this.isAdjacentToSnake(animal.position, headLocal)) {
        newAnimals.push({ ...animal, flashTicks: 2 });
        continue;
      }

      newAnimals.push(animal);
    }

    this.animals.set(roomId, newAnimals);
  }

  private isAdjacentToSnake(pos: Vector2Like, headLocal: Vector2Like): boolean {
    return Math.abs(pos.x - headLocal.x) <= 1 && Math.abs(pos.y - headLocal.y) <= 1;
  }

  handleSnakeOverlap(
    roomId: string,
    head: Vector2Like,
    snakeDirection: Vector2Like,
    canHuntHarmless = false,
    canAttemptTame?: (animalType: AnimalType) => boolean,
  ): SnakeAnimalResult {
    const local = this.worldToLocal(roomId, head);
    const roomAnimals = this.animals.get(roomId) ?? [];
    if (roomAnimals.length === 0) {
      return { tamed: false, damaged: false, hunted: false, startleCount: 0 };
    }

    const target = roomAnimals.find((a) => a.position.x === local.x && a.position.y === local.y);

    if (!target) {
      return { tamed: false, damaged: false, hunted: false, startleCount: 0 };
    }
    if (target.isTamed) {
      return { tamed: false, damaged: false, hunted: false, startleCount: 0 };
    }

    const def = AnimalRegistry.getDefinition(target.type);
    const result: SnakeAnimalResult = {
      tamed: false,
      damaged: false,
      hunted: false,
      startleCount: 0,
    };

    const remaining = roomAnimals.filter((a) => a.id !== target.id);
    const updated = remaining.map((a) => ({ ...a, flashTicks: 3 }));

    if (canAttemptTame?.(target.type)) {
      result.tamed = true;
      result.tamableAnimal = { ...target };
      this.animals.set(roomId, [...remaining, { ...target, flashTicks: 4 }]);
      return result;
    }

    switch (def.snakeEncounter) {
      case 'harmless':
        if (canHuntHarmless) {
          result.hunted = true;
          result.huntedAnimal = this.createHuntedAnimalResult(target, def);
          this.animals.set(roomId, updated);
        } else {
          result.startleCount = 1;
          this.animals.set(roomId, [...remaining, { ...target, flashTicks: 3 }]);
        }
        break;
      case 'dangerous':
        result.damaged = true;
        this.animals.set(roomId, updated);
        break;
      case 'hunt':
        result.hunted = true;
        result.huntedAnimal = this.createHuntedAnimalResult(target, def);
        this.animals.set(roomId, updated);
        break;
      case 'tamable':
        result.tamed = true;
        result.tamableAnimal = { ...target };
        this.animals.set(roomId, [...remaining, { ...target, flashTicks: 4 }]);
        break;
    }

    return result;
  }

  private createHuntedAnimalResult(
    animal: AnimalInstance,
    def: AnimalDefinition,
  ): HuntedAnimalResult {
    return {
      animalId: animal.id,
      actorId: animal.actorId,
      animalType: animal.type,
      animalName: def.name,
      position: { ...animal.position },
      drops: def.drops,
    };
  }

  damageAnimal(
    roomId: string,
    position: Vector2Like,
    damage: number,
  ): { hit: boolean; defeated?: AnimalInstance } {
    const roomAnimals = this.animals.get(roomId) ?? [];
    if (roomAnimals.length === 0) {
      return { hit: false };
    }

    const target = roomAnimals.find(
      (a) => a.position.x === position.x && a.position.y === position.y,
    );

    if (!target) {
      return { hit: false };
    }

    const currentHearts = target.currentHearts ?? 1;
    const nextHearts = Math.max(0, currentHearts - damage);
    const defeated = { ...target, currentHearts: nextHearts };

    if (nextHearts > 0) {
      defeated.flashTicks = 3;
      const remaining = roomAnimals.map((a) => (a.id === target.id ? defeated : a));
      this.animals.set(roomId, remaining);
      return { hit: true };
    }

    const remaining = roomAnimals.filter((a) => a.id !== target.id);
    if (remaining.length > 0) {
      this.animals.set(roomId, remaining);
    } else {
      this.animals.delete(roomId);
    }

    return { hit: true, defeated };
  }

  getAnimalsInRoom(roomId: string): readonly AnimalInstance[] {
    return this.animals.get(roomId) ?? [];
  }

  transferTamedAnimals(fromRoomId: string, toRoomId: string, destination: Vector2Like): void {
    if (fromRoomId === toRoomId) return;
    const source = this.animals.get(fromRoomId) ?? [];
    const followers = source.filter((animal) => animal.isTamed);
    if (followers.length === 0) return;

    const remaining = source.filter((animal) => !animal.isTamed);
    if (remaining.length > 0) this.animals.set(fromRoomId, remaining);
    else this.animals.delete(fromRoomId);

    const destinationAnimals = this.animals.get(toRoomId) ?? [];
    const transferred = followers.map((animal, index) => ({
      ...animal,
      roomId: toRoomId,
      position: {
        x: Math.max(1, Math.min(this.grid.cols - 2, destination.x - 1 - (index % 2))),
        y: Math.max(1, Math.min(this.grid.rows - 2, destination.y + Math.floor(index / 2))),
      },
      moveCooldown: 0,
      flashTicks: 4,
    }));
    this.animals.set(toRoomId, [...destinationAnimals, ...transferred]);
  }

  restoreTamedAnimals(
    roomId: string,
    companions: readonly { id: string; type: AnimalType }[],
    destination: Vector2Like,
  ): void {
    if (companions.length === 0) return;
    const existing = this.animals.get(roomId) ?? [];
    const existingIds = new Set(existing.map((animal) => animal.id));
    const restored = companions
      .filter((companion) => !existingIds.has(companion.id))
      .map((companion, index): AnimalInstance => {
        const definition = AnimalRegistry.getDefinition(companion.type);
        return {
          id: companion.id,
          type: companion.type,
          roomId,
          position: {
            x: Math.max(1, Math.min(this.grid.cols - 2, destination.x - 1 - (index % 2))),
            y: Math.max(1, Math.min(this.grid.rows - 2, destination.y + Math.floor(index / 2))),
          },
          direction: { x: 1, y: 0 },
          moveCooldown: 0,
          isTamed: true,
          tameOwner: 'player',
          flashTicks: 4,
          currentHearts: definition.maxHearts ?? 1,
        };
      });
    if (restored.length > 0) this.animals.set(roomId, [...existing, ...restored]);
  }

  tameAnimal(
    roomId: string,
    animalId: string,
    owner: string,
  ): { success: boolean; animal: AnimalInstance | null } {
    const roomAnimals = this.animals.get(roomId) ?? [];
    const target = roomAnimals.find((a) => a.id === animalId);

    if (!target || target.isTamed) {
      return { success: false, animal: null };
    }

    const def = AnimalRegistry.getDefinition(target.type);
    if (!canTameAnimal(target.type)) {
      return { success: false, animal: null };
    }

    const updated = {
      ...target,
      isTamed: true,
      tameOwner: owner,
      flashTicks: 4,
    };

    const remaining = roomAnimals.map((a) => (a.id === animalId ? updated : a));
    this.animals.set(roomId, remaining);

    return { success: true, animal: updated };
  }

  releaseTamedAnimal(roomId: string, animalId: string): boolean {
    const roomAnimals = this.animals.get(roomId) ?? [];
    let released = false;
    const next = roomAnimals.map((animal) => {
      if (animal.id !== animalId || !animal.isTamed) return animal;
      released = true;
      const { tameOwner: _tameOwner, ...wild } = animal;
      return { ...wild, isTamed: false, flashTicks: 4 };
    });
    if (released) this.animals.set(roomId, next);
    return released;
  }

  private worldToLocal(roomId: string, worldPos: Vector2Like): Vector2Like {
    const [roomX, roomY] = roomId.split(',').map(Number);
    return {
      x: worldPos.x - roomX * this.grid.cols,
      y: worldPos.y - roomY * this.grid.rows,
    };
  }

  private discoveredTypes: Set<string> = new Set();

  reportDiscovered(animalType: string): void {
    this.discoveredTypes.add(animalType);
  }

  getDiscoveredTypes(): readonly string[] {
    return [...this.discoveredTypes];
  }

  clearAll(): void {
    this.animals.clear();
    this.nextId = 0;
    this.discoveredTypes.clear();
  }
}
