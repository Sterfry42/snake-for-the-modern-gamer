import type { MobTypeId, MobState, MobDefinition } from './types.js';
import {
  MAX_MOBS_PER_CHUNK,
  MAX_PASSIVE_MOBS_PER_CHUNK,
  LIGHT_LEVEL_MOB_SPAWN_THRESHOLD,
  MOB_SPAWN_CHECK_INTERVAL_TICKS,
} from './config.js';
import { getMinecraftItem } from './itemRegistry.js';

const MOB_ATTACK_DAMAGE: Record<MobTypeId, number> = {
  zombie: 3,
  skeleton: 2,
  creeper: 4,
  cow: 0,
};

const MOB_ATTACK_COOLDOWN: Record<MobTypeId, number> = {
  zombie: 40,
  skeleton: 30,
  creeper: 40,
  cow: 0,
};

const MOB_DEFINITIONS: Record<MobTypeId, MobDefinition> = {
  zombie: {
    id: 'zombie',
    hostile: true,
    hp: 20,
    speed: 1,
    color: '#2D5A1E',
    drops: [
      { itemId: 'rotten_flesh', count: 2, chance: 1 },
      { itemId: 'armors', count: 1, chance: 0.3 },
    ],
  },
  skeleton: {
    id: 'skeleton',
    hostile: true,
    hp: 20,
    speed: 1,
    color: '#E8E4D4',
    drops: [
      { itemId: 'bones', count: 2, chance: 1 },
      { itemId: 'arrows', count: 3, chance: 1 },
      { itemId: 'bow', count: 1, chance: 0.05 },
    ],
  },
  creeper: {
    id: 'creeper',
    hostile: true,
    hp: 20,
    speed: 1.2,
    color: '#5B8C2A',
    drops: [
      { itemId: 'gunpowder', count: 2, chance: 1 },
      { itemId: 'fire_charge', count: 1, chance: 0.3 },
    ],
  },
  cow: {
    id: 'cow',
    hostile: false,
    hp: 10,
    speed: 0.5,
    color: '#8B5A2B',
    drops: [
      { itemId: 'raw_beef', count: 1, chance: 1 },
      { itemId: 'leather', count: 1, chance: 0.7 },
    ],
  },
};

const MOB_AI_CONFIG: Record<MobTypeId, { chaseRange: number; fleeRange: number }> = {
  zombie: { chaseRange: 12, fleeRange: 0 },
  skeleton: { chaseRange: 8, fleeRange: 0 },
  creeper: { chaseRange: 10, fleeRange: 0 },
  cow: { chaseRange: 0, fleeRange: 5 },
};

function generateMobId(): string {
  return `mc_mob_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export class MobManager {
  private mobs: Map<string, MobState> = new Map();
  private mobIdCounter = 0;
  private lastSpawnCheck: Record<string, number> = {};
  private creeperExploding: Map<string, { startTime: number }> = new Map();
  private readonly CREEPER_EXPLOSION_FUSE = 60;

  init(): void {
    this.mobs.clear();
    this.lastSpawnCheck = {};
  }

  spawnMobsForRoom(
    roomId: string,
    isNight: boolean,
    gridSize: number,
    lightLevelAt: (x: number, y: number, roomId: string) => number,
    playerX: number,
    playerY: number,
    currentTime: number,
  ): void {
    if (this.lastSpawnCheck[roomId] === undefined) {
      this.lastSpawnCheck[roomId] = 0;
    }

    if (currentTime - this.lastSpawnCheck[roomId] < MOB_SPAWN_CHECK_INTERVAL_TICKS) {
      return;
    }
    this.lastSpawnCheck[roomId] = currentTime;

    const roomMobs = this.getMobsInRoom(roomId);
    const hostileMobs = roomMobs.filter((m) => m.ai === 'hostile');
    const passiveMobs = roomMobs.filter((m) => m.ai === 'passive');

    const hostileLimit = MAX_MOBS_PER_CHUNK;
    const passiveLimit = MAX_PASSIVE_MOBS_PER_CHUNK;

    if (isNight) {
      if (hostileMobs.length >= hostileLimit) {
        return;
      }

      const maxAttempts = 10;
      for (let i = 0; i < maxAttempts; i++) {
        if (hostileMobs.length >= hostileLimit) break;

        const x = Math.floor(Math.random() * gridSize);
        const y = Math.floor(Math.random() * gridSize);
        const lightLevel = lightLevelAt(x, y, roomId);

        if (lightLevel > LIGHT_LEVEL_MOB_SPAWN_THRESHOLD) continue;

        if (Math.abs(x - playerX) + Math.abs(y - playerY) < 5) continue;

        if (this.isPositionOccupied(roomId, x, y, 3)) continue;

        const hostileTypes: MobTypeId[] = ['zombie', 'skeleton', 'creeper'];
        const type = hostileTypes[Math.floor(Math.random() * hostileTypes.length)];
        this.spawnMob(roomId, type, x, y);
        hostileMobs.push(this.getMob(this.mobs.keys().next().value!)!);
      }
    } else {
      if (passiveMobs.length >= passiveLimit) {
        return;
      }

      const maxAttempts = 5;
      for (let i = 0; i < maxAttempts; i++) {
        if (passiveMobs.length >= passiveLimit) break;

        const x = Math.floor(Math.random() * gridSize);
        const y = Math.floor(Math.random() * gridSize);

        if (Math.abs(x - playerX) + Math.abs(y - playerY) < 3) continue;

        if (this.isPositionOccupied(roomId, x, y, 3)) continue;

        this.spawnMob(roomId, 'cow', x, y);
        passiveMobs.push(this.getMob(this.mobs.keys().next().value!)!);
      }
    }
  }

  private isPositionOccupied(
    roomId: string,
    x: number,
    y: number,
    minDistance: number,
  ): boolean {
    for (const mob of this.mobs.values()) {
      if (mob.roomId !== roomId) continue;
      const dx = mob.x - x;
      const dy = mob.y - y;
      if (dx * dx + dy * dy <= minDistance * minDistance) {
        return true;
      }
    }
    return false;
  }

  private triggerCreeperExplosion(
    creeper: MobState,
    distToPlayer: number,
    onPlayerHit: (damage: number) => void,
    onMobDeath: (mobId: string) => void,
  ): void {
    const explosionRadius = 3;
    const damage = distToPlayer <= 2 ? 8 : Math.max(1, 8 - distToPlayer);
    onPlayerHit(damage);

    onMobDeath(creeper.id);

    for (const otherMob of this.mobs.values()) {
      if (otherMob.id === creeper.id) continue;
      const dx = otherMob.x - creeper.x;
      const dy = otherMob.y - creeper.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= explosionRadius) {
        const mobDamage = Math.max(1, Math.floor(6 * (1 - dist / explosionRadius)));
        otherMob.health -= mobDamage;
        if (otherMob.health <= 0) {
          onMobDeath(otherMob.id);
        }
      }
    }
  }

  spawnMob(roomId: string, type: MobTypeId, x: number, y: number): MobState {
    const def = MOB_DEFINITIONS[type];
    if (!def) {
      throw new Error(`Unknown mob type: ${type}`);
    }

    const mob: MobState = {
      id: generateMobId(),
      type,
      x,
      y,
      roomId,
      health: def.hp,
      maxHealth: def.hp,
      ai: def.hostile ? 'hostile' : 'passive',
      lastMoveTick: 0,
      lastAttackTick: 0,
    };

    this.mobs.set(mob.id, mob);
    return mob;
  }

  despawnMob(mobId: string): boolean {
    return this.mobs.delete(mobId);
  }

  getMob(mobId: string): MobState | undefined {
    return this.mobs.get(mobId);
  }

  getMobsInRoom(roomId: string): MobState[] {
    const result: MobState[] = [];
    for (const mob of this.mobs.values()) {
      if (mob.roomId === roomId) {
        result.push(mob);
      }
    }
    return result;
  }

  getMobsNearPosition(x: number, y: number, roomId: string, radius: number): MobState[] {
    return Array.from(this.mobs.values()).filter((mob) => {
      if (mob.roomId !== roomId) return false;
      const dx = mob.x - x;
      const dy = mob.y - y;
      return dx * dx + dy * dy <= radius * radius;
    });
  }

  tickMobs(
    currentTime: number,
    playerX: number,
    playerY: number,
    playerRoomId: string,
    lightLevelAt: (x: number, y: number, roomId: string) => number,
    onMobDeath: (mobId: string, x: number, y: number, roomId: string) => void,
    onPlayerHit?: (damage: number) => void,
    onCreeperExplode?: (x: number, y: number, roomId: string) => void,
  ): void {
    for (const mob of this.mobs.values()) {
      const def = MOB_DEFINITIONS[mob.type];
      if (!def) continue;

      const aiConfig = MOB_AI_CONFIG[mob.type];
      const distToPlayer = Math.abs(mob.x - playerX) + Math.abs(mob.y - playerY);

      // AI movement
      if (currentTime - mob.lastMoveTick >= 8) {
        this.tickMobAI(
          mob,
          def,
          aiConfig,
          playerX,
          playerY,
          playerRoomId,
          lightLevelAt,
          distToPlayer,
        );
        mob.lastMoveTick = currentTime;
      }

      // Creeper explosion logic
      if (mob.type === 'creeper' && distToPlayer <= 2) {
        if (!this.creeperExploding.has(mob.id)) {
          this.creeperExploding.set(mob.id, { startTime: currentTime });
        }
        const explosion = this.creeperExploding.get(mob.id)!;
        if (currentTime - explosion.startTime >= this.CREEPER_EXPLOSION_FUSE) {
          const cx = mob.x;
          const cy = mob.y;
          const crId = mob.roomId;
          this.triggerCreeperExplosion(
            mob,
            distToPlayer,
            (damage) => {
              if (onPlayerHit) onPlayerHit(damage);
            },
            (mobId) => {
              onMobDeath(mobId, mob.x, mob.y, mob.roomId);
            },
          );
          if (onCreeperExplode) {
            onCreeperExplode(cx, cy, crId);
          }
          this.creeperExploding.delete(mob.id);
        }
      } else {
        this.creeperExploding.delete(mob.id);
      }

      // Combat: hostile mobs attack player on contact
      const attackDamage = MOB_ATTACK_DAMAGE[mob.type];
      const attackCooldown = MOB_ATTACK_COOLDOWN[mob.type];
      if (attackDamage > 0 && mob.ai === 'hostile' && distToPlayer <= 1 && mob.type !== 'creeper') {
        if (currentTime - mob.lastAttackTick >= attackCooldown) {
          mob.lastAttackTick = currentTime;
          if (onPlayerHit) {
            onPlayerHit(attackDamage);
          }
        }
      }

      // Hostile mobs take damage at light level > 12 during daytime
      if (def.hostile) {
        const lightAtMob = lightLevelAt(mob.x, mob.y, mob.roomId);
        if (lightAtMob > 12) {
          mob.health -= 1;
          if (mob.health <= 0) {
            onMobDeath(mob.id, mob.x, mob.y, mob.roomId);
          }
        }
      }
    }
  }

  private tickMobAI(
    mob: MobState,
    def: MobDefinition,
    aiConfig: { chaseRange: number; fleeRange: number },
    playerX: number,
    playerY: number,
    playerRoomId: string,
    lightLevelAt: (x: number, y: number, roomId: string) => number,
    distToPlayer: number,
  ): void {
    let dx = 0;
    let dy = 0;

    if (mob.ai === 'hostile') {
      // Check for light-based spawning - only spawn in dark
      const lightAtPos = lightLevelAt(mob.x, mob.y, mob.roomId);
      if (distToPlayer <= aiConfig.chaseRange && playerRoomId === mob.roomId) {
        // Chase player
        dx = playerX - mob.x;
        dy = playerY - mob.y;

        // Normalize
        const mag = Math.sqrt(dx * dx + dy * dy);
        if (mag > 0) {
          dx = Math.round(dx / mag);
          dy = Math.round(dy / mag);
        }
      }
    } else if (mob.ai === 'passive') {
      // Cow: wander randomly or flee
      if (distToPlayer <= aiConfig.fleeRange) {
        dx = mob.x - playerX;
        dy = mob.y - playerY;
      } else {
        // Wander
        if (Math.random() < 0.3) {
          dx = Math.random() < 0.5 ? (Math.random() < 0.5 ? 1 : -1) : 0;
          dy = Math.random() < 0.5 ? (Math.random() < 0.5 ? 1 : -1) : 0;
        }
      }

      // Normalize
      if (dx !== 0 || dy !== 0) {
        const mag = Math.sqrt(dx * dx + dy * dy);
        if (mag > 0) {
          dx = Math.round(dx / mag);
          dy = Math.round(dy / mag);
        }
      }
    }

    // Apply movement
    if (dx !== 0 || dy !== 0) {
      const speed = def.speed;
      mob.x += Math.round(dx * speed);
      mob.y += Math.round(dy * speed);
    }
  }

  damageMob(
    mobId: string,
    damage: number,
    onMobDeath: (mobId: string, x: number, y: number, roomId: string) => void,
  ): boolean {
    const mob = this.mobs.get(mobId);
    if (!mob) return false;

    mob.health -= damage;
    if (mob.health <= 0) {
      onMobDeath(mob.id, mob.x, mob.y, mob.roomId);
      return true;
    }
    return false;
  }

  onMobDeath(mobId: string, onDropItem: (itemId: string, count: number) => void): boolean {
    const mob = this.mobs.get(mobId);
    if (!mob) return false;

    const def = MOB_DEFINITIONS[mob.type];
    if (def && def.drops) {
      for (const drop of def.drops) {
        if (Math.random() < drop.chance) {
          for (let i = 0; i < drop.count; i++) {
            onDropItem(drop.itemId, 1);
          }
        }
      }
    }

    this.mobs.delete(mobId);
    return true;
  }

  getMobCount(): number {
    return this.mobs.size;
  }

  despawnMobsNearPosition(
    roomId: string,
    x: number,
    y: number,
    radius: number,
    onMobDeath: (mobId: string, mx: number, my: number, mroomId: string) => void,
  ): void {
    const mobs = this.getMobsNearPosition(x, y, roomId, radius);
    for (const mob of mobs) {
      const def = MOB_DEFINITIONS[mob.type];
      if (!def || !def.hostile) continue;
      onMobDeath(mob.id, mob.x, mob.y, mob.roomId);
    }
  }

  destroy(): void {
    this.mobs.clear();
    this.lastSpawnCheck = {};
  }
}
