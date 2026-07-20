import type { MobTypeId } from './types.js';
import type { RandomGenerator } from '../core/rng.js';
import { MobManager } from './mobManager.js';
import { LightingSystem } from './lighting.js';


// ─── Mob Spawner Types ──────────────────────────────────────────────────────

export interface MobSpawnerState {
  x: number;
  y: number;
  roomId: string;
  mobType: MobTypeId;
  spawnDelay: number;
  maxNearbyMobs: number;
  playerDistance: number;
  active: boolean;
  lastSpawn: number;
  spawnCount: number;
  requirePlayersNearby: boolean;
  delayBetweenSpawns: number;
}

export interface MobSpawnerDefinition {
  mobType: MobTypeId;
  spawnDelay: number;
  maxNearbyMobs: number;
  playerDistance: number;
  active: boolean;
  spawnCount: number;
  requirePlayersNearby: boolean;
  delayBetweenSpawns: number;
}

// ─── Default Spawner Definitions ────────────────────────────────────────────

export const DEFAULT_SPAWNERS: Record<MobTypeId, MobSpawnerDefinition> = {
  zombie: {
    mobType: 'zombie',
    spawnDelay: 200,
    maxNearbyMobs: 4,
    playerDistance: 16,
    active: true,
    spawnCount: 1,
    requirePlayersNearby: true,
    delayBetweenSpawns: 100,
  },
  skeleton: {
    mobType: 'skeleton',
    spawnDelay: 200,
    maxNearbyMobs: 3,
    playerDistance: 16,
    active: true,
    spawnCount: 1,
    requirePlayersNearby: true,
    delayBetweenSpawns: 120,
  },
  creeper: {
    mobType: 'creeper',
    spawnDelay: 300,
    maxNearbyMobs: 2,
    playerDistance: 16,
    active: true,
    spawnCount: 1,
    requirePlayersNearby: true,
    delayBetweenSpawns: 150,
  },
  cow: {
    mobType: 'cow',
    spawnDelay: 500,
    maxNearbyMobs: 6,
    playerDistance: 8,
    active: true,
    spawnCount: 1,
    requirePlayersNearby: false,
    delayBetweenSpawns: 300,
  },
};

// ─── Spawner Block Types ────────────────────────────────────────────────────

export type SpawnerBlockId =
  | 'zombie_spawner'
  | 'skeleton_spawner'
  | 'creeper_spawner'
  | 'spider_spawner'
  | 'slime_spawner'
  | 'enderman_spawner'
  | 'witch_spawner'
  | 'blaze_spawner'
  | 'phantom_spawner'
  | 'silverfish_spawner'
  | 'guardian_spawner'
  | 'drowned_spawner'
  | 'husk_spawner'
  | 'stray_spawner'
  | 'piglin_spawner'
  | 'zoglin_spawner';

export interface SpawnerBlockDefinition {
  blockId: SpawnerBlockId;
  mobType: MobTypeId;
  color: string;
  name: string;
  hardness: number;
  tool: 'pickaxe' | 'axe';
}

export const SPAWNER_BLOCK_DEFS: Record<SpawnerBlockId, SpawnerBlockDefinition> = {
  zombie_spawner: {
    blockId: 'zombie_spawner',
    mobType: 'zombie',
    color: '#2D5A1E',
    name: 'Zombie Spawner',
    hardness: 5,
    tool: 'pickaxe',
  },
  skeleton_spawner: {
    blockId: 'skeleton_spawner',
    mobType: 'skeleton',
    color: '#E8E4D4',
    name: 'Skeleton Spawner',
    hardness: 5,
    tool: 'pickaxe',
  },
  creeper_spawner: {
    blockId: 'creeper_spawner',
    mobType: 'creeper',
    color: '#5B8C2A',
    name: 'Creeper Spawner',
    hardness: 5,
    tool: 'pickaxe',
  },
  spider_spawner: {
    blockId: 'spider_spawner',
    mobType: 'zombie', // Use zombie as proxy since spider not defined
    color: '#1A1A1A',
    name: 'Spider Spawner',
    hardness: 5,
    tool: 'pickaxe',
  },
  slime_spawner: {
    blockId: 'slime_spawner',
    mobType: 'cow', // Use cow as proxy
    color: '#00CC00',
    name: 'Slime Spawner',
    hardness: 5,
    tool: 'pickaxe',
  },
  enderman_spawner: {
    blockId: 'enderman_spawner',
    mobType: 'skeleton', // Use skeleton as proxy
    color: '#0A0A0A',
    name: 'Enderman Spawner',
    hardness: 10,
    tool: 'pickaxe',
  },
  witch_spawner: {
    blockId: 'witch_spawner',
    mobType: 'zombie', // Use zombie as proxy
    color: '#4A0E4E',
    name: 'Witch Spawner',
    hardness: 5,
    tool: 'pickaxe',
  },
  blaze_spawner: {
    blockId: 'blaze_spawner',
    mobType: 'zombie', // Use zombie as proxy
    color: '#FF6600',
    name: 'Blaze Spawner',
    hardness: 10,
    tool: 'pickaxe',
  },
  phantom_spawner: {
    blockId: 'phantom_spawner',
    mobType: 'skeleton', // Use skeleton as proxy
    color: '#8888CC',
    name: 'Phantom Spawner',
    hardness: 5,
    tool: 'pickaxe',
  },
  silverfish_spawner: {
    blockId: 'silverfish_spawner',
    mobType: 'cow', // Use cow as proxy
    color: '#C0C0C0',
    name: 'Silverfish Spawner',
    hardness: 5,
    tool: 'pickaxe',
  },
  guardian_spawner: {
    blockId: 'guardian_spawner',
    mobType: 'zombie', // Use zombie as proxy
    color: '#4488AA',
    name: 'Guardian Spawner',
    hardness: 5,
    tool: 'pickaxe',
  },
  drowned_spawner: {
    blockId: 'drowned_spawner',
    mobType: 'zombie', // Use zombie as proxy
    color: '#2D5A1E',
    name: 'Drowned Spawner',
    hardness: 5,
    tool: 'pickaxe',
  },
  husk_spawner: {
    blockId: 'husk_spawner',
    mobType: 'zombie', // Use zombie as proxy
    color: '#8B7355',
    name: 'Husk Spawner',
    hardness: 5,
    tool: 'pickaxe',
  },
  stray_spawner: {
    blockId: 'stray_spawner',
    mobType: 'skeleton', // Use skeleton as proxy
    color: '#B0D4F1',
    name: 'Stray Spawner',
    hardness: 5,
    tool: 'pickaxe',
  },
  piglin_spawner: {
    blockId: 'piglin_spawner',
    mobType: 'zombie', // Use zombie as proxy
    color: '#AA6666',
    name: 'Piglin Spawner',
    hardness: 5,
    tool: 'pickaxe',
  },
  zoglin_spawner: {
    blockId: 'zoglin_spawner',
    mobType: 'zombie', // Use zombie as proxy
    color: '#CC4444',
    name: 'Zoglin Spawner',
    hardness: 5,
    tool: 'pickaxe',
  },
};

// ─── Spawner Manager ────────────────────────────────────────────────────────

export class MobSpawnerManager {
  private spawners: Map<string, MobSpawnerState> = new Map();
  private _rng: (() => number) | null = null;

  private get rng(): () => number {
    if (!this._rng) {
      this._rng = () => Math.random();
    }
    return this._rng;
  }

  setRng(rng: () => number): void {
    this._rng = rng;
  }

  private toKey(x: number, y: number, roomId: string): string {
    return `${roomId}:${x},${y}`;
  }

  public createSpawner(
    x: number,
    y: number,
    roomId: string,
    mobType: MobTypeId = 'zombie',
    def?: Partial<MobSpawnerDefinition>,
  ): { success: boolean; message?: string } {
    const key = this.toKey(x, y, roomId);
    if (this.spawners.has(key)) {
      return { success: false, message: 'A spawner is already here.' };
    }

    const baseDef = DEFAULT_SPAWNERS[mobType] ?? DEFAULT_SPAWNERS['zombie'];

    this.spawners.set(key, {
      x,
      y,
      roomId,
      mobType,
      spawnDelay: baseDef.spawnDelay,
      maxNearbyMobs: baseDef.maxNearbyMobs,
      playerDistance: baseDef.playerDistance,
      active: baseDef.active,
      lastSpawn: 0,
      spawnCount: baseDef.spawnCount,
      requirePlayersNearby: baseDef.requirePlayersNearby,
      delayBetweenSpawns: baseDef.delayBetweenSpawns,
      ...def,
    });

    return { success: true };
  }

  public removeSpawner(x: number, y: number, roomId: string): { success: boolean; message?: string } {
    const key = this.toKey(x, y, roomId);
    if (!this.spawners.has(key)) {
      return { success: false, message: 'No spawner here.' };
    }
    this.spawners.delete(key);
    return { success: true };
  }

  public getSpawner(x: number, y: number, roomId: string): MobSpawnerState | null {
    const key = this.toKey(x, y, roomId);
    return this.spawners.get(key) ?? null;
  }

  public getAllSpawnersInRoom(roomId: string): MobSpawnerState[] {
    return Array.from(this.spawners.values()).filter((s) => s.roomId === roomId);
  }

  public tickSpawners(
    currentTime: number,
    mobManager: MobManager,
    lighting: LightingSystem,
    playerX: number,
    playerY: number,
    playerRoomId: string,
    onMobDeath: (mobId: string, x: number, y: number, roomId: string) => void,
    gridSize: number,
  ): void {
    for (const spawner of this.spawners.values()) {
      if (!spawner.active) continue;
      if (spawner.roomId !== playerRoomId) continue;

      // Check player distance
      const dist = Math.abs(spawner.x - playerX) + Math.abs(spawner.y - playerY);
      if (spawner.requirePlayersNearby && dist > spawner.playerDistance) continue;

      // Check if too many mobs
      const mobsInRoom = mobManager.getMobsInRoom(spawner.roomId);
      const mobsNearSpawner = mobsInRoom.filter(
        (m) => Math.abs(m.x - spawner.x) <= 4 && Math.abs(m.y - spawner.y) <= 4,
      );
      if (mobsNearSpawner.length >= spawner.maxNearbyMobs) continue;

      // Check light level at spawner
      const lightLevel = lighting.getLightLevel(spawner.x, spawner.y, spawner.roomId);
      if (lightLevel > 4) continue;

      // Check spawn timer
      if (currentTime - spawner.lastSpawn < spawner.delayBetweenSpawns) continue;

      // Try to spawn
      if (this.rng() < 0.05) {
        this.trySpawnFromSpawner(spawner, mobManager, currentTime, gridSize, onMobDeath);
        spawner.lastSpawn = currentTime;
      }
    }
  }

  private trySpawnFromSpawner(
    spawner: MobSpawnerState,
    mobManager: MobManager,
    // @ts-expect-error TS6133 - unused declaration
    currentTime: number,
    gridSize: number,
    onMobDeath: (mobId: string, x: number, y: number, roomId: string) => void,
  ): void {
    // Find a valid spawn position near the spawner
    const spawnPositions = this.findValidSpawnPositions(spawner, gridSize);

    if (spawnPositions.length === 0) return;

    const chosen = spawnPositions[Math.floor(this.rng() * spawnPositions.length)];
    mobManager.spawnMob(spawner.roomId, spawner.mobType, chosen.x, chosen.y);

    // Handle mob death drops
    const mob = mobManager.getMob(Array.from(mobManager['mobs'].values()).pop()?.id ?? '');
    if (mob) {
      mobManager.onMobDeath(mob.id, (_itemId, _count) => {
        // Drops would be handled by the game
      });
    }

    onMobDeath(mobManager['mobs'].keys().next().value ?? '', chosen.x, chosen.y, spawner.roomId);
  }

  private findValidSpawnPositions(spawner: MobSpawnerState, gridSize: number): Array<{ x: number; y: number }> {
    const positions: Array<{ x: number; y: number }> = [];
    const range = 4;

    for (let dx = -range; dx <= range; dx++) {
      for (let dy = -range; dy <= range; dy++) {
        const x = Math.floor(spawner.x + dx);
        const y = Math.floor(spawner.y + dy);

        if (x < 0 || y < 0 || x >= gridSize || y >= gridSize) continue;
        if (x === spawner.x && y === spawner.y) continue;

        // Check light level
        positions.push({ x, y });
      }
    }

    return positions;
  }

  public clear(): void {
    this.spawners.clear();
  }

  public destroy(): void {
    this.spawners.clear();
  }
}

// ─── Spawner Block Interaction ──────────────────────────────────────────────

export function breakSpawnerBlock(
  spawnerManager: MobSpawnerManager,
  x: number,
  y: number,
  roomId: string,
): { success: boolean; message?: string } {
  return spawnerManager.removeSpawner(x, y, roomId);
}

export function activateSpawner(
  spawnerManager: MobSpawnerManager,
  x: number,
  y: number,
  roomId: string,
  _playerX: number,
  _playerY: number,
): { success: boolean; message?: string } {
  const spawner = spawnerManager.getSpawner(x, y, roomId);
  if (!spawner) {
    return { success: false, message: 'No spawner here.' };
  }

  spawner.active = !spawner.active;
  return {
    success: true,
    message: `Spawner ${spawner.active ? 'activated' : 'deactivated'}.`,
  };
}

// ─── Spawner Rendering Data ─────────────────────────────────────────────────

export interface SpawnerVisualInfo {
  blockId: string;
  color: string;
  name: string;
  mobType: MobTypeId;
}

export function getSpawnerVisualInfo(blockId: string): SpawnerVisualInfo | null {
  const def = SPAWNER_BLOCK_DEFS[blockId as SpawnerBlockId];
  if (!def) return null;

  return {
    blockId: def.blockId,
    color: def.color,
    name: def.name,
    mobType: def.mobType,
  };
}

// ─── Spawner Loot ───────────────────────────────────────────────────────────

export interface SpawnerLootEntry {
  itemId: string;
  minCount: number;
  maxCount: number;
  weight: number;
}

export const SPAWNER_LOOT_TABLE: SpawnerLootEntry[] = [
  { itemId: 'rotten_flesh', minCount: 2, maxCount: 5, weight: 8 },
  { itemId: 'bones', minCount: 1, maxCount: 3, weight: 6 },
  { itemId: 'gunpowder', minCount: 1, maxCount: 2, weight: 5 },
  { itemId: 'iron_ingot', minCount: 1, maxCount: 2, weight: 3 },
  { itemId: 'coal', minCount: 1, maxCount: 4, weight: 7 },
  { itemId: 'arrow', minCount: 1, maxCount: 3, weight: 5 },
  { itemId: 'leather', minCount: 1, maxCount: 2, weight: 4 },
  { itemId: 'raw_iron', minCount: 1, maxCount: 1, weight: 2 },
  { itemId: 'diamond', minCount: 1, maxCount: 1, weight: 1 },
];

export function getSpawnerLoot(rng: RandomGenerator): Array<{ itemId: string; count: number }> {
  const loot: Array<{ itemId: string; count: number }> = [];

  for (const entry of SPAWNER_LOOT_TABLE) {
    const roll = rng() * 100;
    if (roll >= entry.weight * 10) continue;

    const count = Math.floor(rng() * (entry.maxCount - entry.minCount + 1)) + entry.minCount;
    loot.push({ itemId: entry.itemId, count });
  }

  return loot;
}
