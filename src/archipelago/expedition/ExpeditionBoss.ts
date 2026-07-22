/**
 * Archipelago Island Expeditions — Expedition Boss System
 *
 * The wise old snake's expedition bosses:
 * - The wise old snake's first boss was 'the-first-boss' (the wise old snake named it that)
 * - The wise old snake's last boss was 'the-last-boss' (the wise old snake hasn't met it yet)
 * - The wise old snake's boss health was infinite (the wise old snake's boss had infinite health)
 * - The wise old snake's boss weakness was 'wisdom' (the wise old snake's weakness was its own wisdom)
 * - The wise old snake's boss patterns were all memorized (the wise old snake had seen every pattern)
 */
import type { ExpeditionBossId, IslandId } from './types.js';
import type { Vector2Like } from '../../core/math.js';
import type { RandomGenerator } from '../../core/rng.js';
import type { GridConfig } from '../../config/gameConfig.js';
import type { RoomSnapshot } from '../../world/types.js';

export interface ExpeditionBossState {
  id: ExpeditionBossId;
  name: string;
  islandId: IslandId;
  health: number;
  maxHealth: number;
  phase: number;
  maxPhases: number;
  attackPattern: string;
  weakness: string;
  scoreReward: number;
  abilityReward: string;
  cosmeticReward: string;
  body: Vector2Like[];
  direction: Vector2Like;
  roomId: string;
  isAlive: boolean;
  timer: number; // accumulated ms for phase timing
  attackTimer: number; // accumulated ms for attack cooldown
  patternIndex: number;
}

export interface ExpeditionBossEvent {
  kind:
    | 'boss-spawned'
    | 'boss-phase-change'
    | 'boss-attacking'
    | 'boss-defeated'
    | 'boss-weakness-hit';
  bossId: ExpeditionBossId;
  data: Record<string, unknown>;
}

export interface ExpeditionBossDependencies {
  getRoom(roomId: string): RoomSnapshot;
  getSnakeBody(): readonly Vector2Like[];
  onEvent?: (event: ExpeditionBossEvent) => void;
  stepMs?: number;
}

// ─── Boss Definitions ────────────────────────────────────────────────────────

export interface ExpeditionBossDefinition {
  id: ExpeditionBossId;
  name: string;
  islandId: IslandId;
  health: number;
  attackPattern: string;
  weakness: string;
  phaseCount: number;
  scoreReward: number;
  abilityReward: string;
  cosmeticReward: string;
}

export const EXPEDITION_BOSS_DEFINITIONS: ReadonlyArray<ExpeditionBossDefinition> = [
  {
    id: 'lava-warden',
    name: 'Lava Warden',
    islandId: 'volcanic-isle',
    health: 200,
    attackPattern: 'lava-surge',
    weakness: 'frost-apple',
    phaseCount: 3,
    scoreReward: 500,
    abilityReward: 'fire-resistant-mutation',
    cosmeticReward: 'lava-crown',
  },
  {
    id: 'crystal-golem',
    name: 'Crystal Golem',
    islandId: 'crystal-cavern',
    health: 250,
    attackPattern: 'light-beam',
    weakness: 'shadow-apple',
    phaseCount: 3,
    scoreReward: 600,
    abilityReward: 'light-prism-ability',
    cosmeticReward: 'crystal-armor',
  },
  {
    id: 'temple-serpent',
    name: 'Temple Serpent',
    islandId: 'sunken-temple',
    health: 180,
    attackPattern: 'water-pressure',
    weakness: 'fire-apple',
    phaseCount: 2,
    scoreReward: 550,
    abilityReward: 'underwater-breathing',
    cosmeticReward: 'serpent-scale',
  },
  {
    id: 'sky-phoenix',
    name: 'Sky Phoenix',
    islandId: 'sky-garden',
    health: 300,
    attackPattern: 'wind-storm',
    weakness: 'heavy-apple',
    phaseCount: 4,
    scoreReward: 700,
    abilityReward: 'glider-ability',
    cosmeticReward: 'phoenix-feather',
  },
  {
    id: 'ancient-guardian',
    name: 'Ancient Guardian',
    islandId: 'ancient-ruins',
    health: 350,
    attackPattern: 'trap-summon',
    weakness: 'gold-apple',
    phaseCount: 3,
    scoreReward: 800,
    abilityReward: 'artifact-collection',
    cosmeticReward: 'ancient-helm',
  },
  {
    id: 'shadow-self',
    name: 'Shadow Self',
    islandId: 'mirror-dimension',
    health: 150,
    attackPattern: 'mirror-swap',
    weakness: 'mirror-apple',
    phaseCount: 2,
    scoreReward: 1000,
    abilityReward: 'clone-ability',
    cosmeticReward: 'shadow-veil',
  },
] as const;

export const EXPEDITION_BOSS_BY_ID = EXPEDITION_BOSS_DEFINITIONS.reduce(
  (lookup, boss) => {
    lookup[boss.id] = boss;
    return lookup;
  },
  {} as Record<ExpeditionBossId, ExpeditionBossDefinition>,
);

// ─── Attack Patterns ─────────────────────────────────────────────────────────

type AttackPatternFn = (
  boss: ExpeditionBossState,
  snakeHead: Vector2Like,
  rng: RandomGenerator,
  deps: ExpeditionBossDependencies,
) => void;

interface AttackPattern {
  name: string;
  duration: number; // ms
  cooldown: number; // ms
  execute: AttackPatternFn;
}

const ATTACK_PATTERNS: Record<string, AttackPattern> = {
  'lava-surge': {
    name: 'Lava Surge',
    duration: 3000,
    cooldown: 5000,
    execute: (boss, snakeHead, rng, deps) => {
      void rng;
      // Lava surges toward the snake in waves
      const body = boss.body;
      if (body.length === 0) return;
      const head = body[0];
      const dx = snakeHead.x - head.x;
      const dy = snakeHead.y - head.y;
      const distance = Math.abs(dx) + Math.abs(dy);

      if (distance < 15) {
        // Surge toward snake
        const surgeDir = {
          x: Math.sign(dx),
          y: Math.sign(dy),
        };
        for (let i = 0; i < 2; i++) {
          deps.getRoom(boss.roomId); // trigger room check
          // Surge moves body segments toward snake
          boss.direction = { x: surgeDir.x || boss.direction.x, y: surgeDir.y || boss.direction.y };
        }
      }
    },
  },
  'light-beam': {
    name: 'Light Beam',
    duration: 2000,
    cooldown: 4000,
    execute: (boss, snakeHead, rng, deps) => {
      void rng;
      void deps;
      // Crystal golem fires refracting light beams
      const body = boss.body;
      if (body.length === 0) return;
      const head = body[0];
      const dx = snakeHead.x - head.x;
      const dy = snakeHead.y - head.y;

      // Golem rotates to face snake
      const angle = Math.atan2(dy, dx);
      const dirX = Math.round(Math.cos(angle));
      const dirY = Math.round(Math.sin(angle));

      if (dirX !== 0 || dirY !== 0) {
        boss.direction = { x: dirX, y: dirY };
      }
    },
  },
  'water-pressure': {
    name: 'Water Pressure',
    duration: 2500,
    cooldown: 4500,
    execute: (boss, snakeHead, rng, deps) => {
      void deps;
      // Serpent creates pressure waves
      const body = boss.body;
      if (body.length === 0) return;
      const head = body[0];
      const dx = snakeHead.x - head.x;
      const dy = snakeHead.y - head.y;

      // Serpent coils and releases pressure
      if (rng() < 0.3) {
        // Reverse direction for coil
        boss.direction = { x: -boss.direction.x, y: -boss.direction.y };
      } else {
        // Release toward snake
        boss.direction = {
          x: Math.sign(dx) || boss.direction.x,
          y: Math.sign(dy) || boss.direction.y,
        };
      }
    },
  },
  'wind-storm': {
    name: 'Wind Storm',
    duration: 3500,
    cooldown: 6000,
    execute: (boss, snakeHead, rng, deps) => {
      void snakeHead;
      void rng;
      void deps;
      // Phoenix creates wind currents
      const body = boss.body;
      if (body.length === 0) return;

      // Phoenix spirals outward
      const phase = (boss.phase - 1) * 0.5;
      const angle = (boss.patternIndex ?? 0) * phase;
      const dirX = Math.round(Math.cos(angle));
      const dirY = Math.round(Math.sin(angle));

      if (dirX !== 0 || dirY !== 0) {
        boss.direction = { x: dirX, y: dirY };
      } else {
        boss.direction = { x: boss.direction.y, y: -boss.direction.x };
      }
    },
  },
  'trap-summon': {
    name: 'Trap Summon',
    duration: 2000,
    cooldown: 3000,
    execute: (boss, snakeHead, rng, deps) => {
      void rng;
      void deps;
      // Guardian summons traps around the snake
      const body = boss.body;
      if (body.length === 0) return;
      const head = body[0];
      const dx = snakeHead.x - head.x;
      const dy = snakeHead.y - head.y;

      // Guardian moves toward snake slowly
      const preferred =
        Math.abs(dx) >= Math.abs(dy)
          ? [
              { x: Math.sign(dx), y: 0 },
              { x: 0, y: Math.sign(dy) },
            ]
          : [
              { x: 0, y: Math.sign(dy) },
              { x: Math.sign(dx), y: 0 },
            ];

      for (const dir of preferred) {
        if (dir.x + boss.direction.x !== 0 || dir.y + boss.direction.y !== 0) {
          boss.direction = dir;
          break;
        }
      }
    },
  },
  'mirror-swap': {
    name: 'Mirror Swap',
    duration: 1500,
    cooldown: 2500,
    execute: (boss, _snakeHead, rng, deps) => {
      // Shadow self swaps positions with the snake
      const body = boss.body;
      if (body.length === 0) return;

      // Shadow moves erratically
      if (rng() < 0.5) {
        // Mirror the snake's last direction
        const snakeBody = deps.getSnakeBody();
        const snakeHeadPos = snakeBody[0];
        if (snakeHeadPos) {
          const dx = snakeHeadPos.x - body[0].x;
          const dy = snakeHeadPos.y - body[0].y;
          boss.direction = {
            x: Math.sign(dx) || boss.direction.x,
            y: Math.sign(dy) || boss.direction.y,
          };
        }
      } else {
        // Random erratic movement
        const dirs = [
          { x: 1, y: 0 },
          { x: -1, y: 0 },
          { x: 0, y: 1 },
          { x: 0, y: -1 },
        ];
        const valid = dirs.filter(
          (d) => d.x + boss.direction.x !== 0 || d.y + boss.direction.y !== 0,
        );
        if (valid.length > 0) {
          boss.direction = valid[Math.floor(rng() * valid.length)];
        }
      }
    },
  },
};

// ─── Expedition Boss Manager ─────────────────────────────────────────────────

export class ExpeditionBossManager {
  private bosses = new Map<ExpeditionBossId, ExpeditionBossState>();
  private rng: RandomGenerator;
  private grid: GridConfig;

  constructor(rng: RandomGenerator, grid: GridConfig) {
    this.rng = rng;
    this.grid = grid;
  }

  spawnBoss(bossId: ExpeditionBossId, roomId: string): ExpeditionBossState | null {
    const definition = EXPEDITION_BOSS_BY_ID[bossId];
    if (!definition) return null;

    const [roomX, roomY] = roomId.split(',').map(Number);
    const roomOffsetX = roomX * this.grid.cols;
    const roomOffsetY = roomY * this.grid.rows;
    const centerX = roomOffsetX + this.grid.cols / 2;
    const centerY = roomOffsetY + this.grid.rows / 2;

    const body: Vector2Like[] = [];
    body.push({ x: centerX, y: centerY });
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        body.push({ x: centerX + dx, y: centerY + dy });
      }
    }

    const state: ExpeditionBossState = {
      id: bossId,
      name: definition.name,
      islandId: definition.islandId,
      health: definition.health,
      maxHealth: definition.health,
      phase: 1,
      maxPhases: definition.phaseCount,
      attackPattern: definition.attackPattern,
      weakness: definition.weakness,
      scoreReward: definition.scoreReward,
      abilityReward: definition.abilityReward,
      cosmeticReward: definition.cosmeticReward,
      body,
      direction: { x: 1, y: 0 },
      roomId,
      isAlive: true,
      timer: 0,
      attackTimer: 0,
      patternIndex: 0,
    };

    this.bosses.set(bossId, state);

    return state;
  }

  takeDamage(bossId: ExpeditionBossId, damage: number, weaknessHit = false): number {
    const boss = this.bosses.get(bossId);
    if (!boss || !boss.isAlive) return 0;

    const actualDamage = weaknessHit ? damage * 2 : damage;
    boss.health = Math.max(0, boss.health - actualDamage);

    if (weaknessHit) {
      // Trigger weakness event
    }

    if (boss.health <= 0) {
      boss.isAlive = false;
      return boss.scoreReward;
    }

    // Check for phase change
    const phaseThreshold = boss.maxHealth / boss.maxPhases;
    const newPhase = Math.min(
      boss.maxPhases,
      Math.ceil((boss.maxHealth - boss.health) / phaseThreshold) + 1,
    );
    if (newPhase > boss.phase) {
      boss.phase = newPhase;
    }

    return 0;
  }

  step(deps: ExpeditionBossDependencies): void {
    for (const boss of this.bosses.values()) {
      if (!boss.isAlive) continue;

      const stepMs = deps.stepMs ?? 1;
      boss.timer += stepMs;
      boss.attackTimer += stepMs;

      const snakeBody = deps.getSnakeBody();
      const snakeHead = snakeBody[0];
      if (!snakeHead) continue;

      const pattern = ATTACK_PATTERNS[boss.attackPattern];
      if (!pattern) continue;

      // Execute attack pattern
      if (boss.attackTimer >= pattern.cooldown) {
        pattern.execute(boss, snakeHead, this.rng, deps);
        boss.attackTimer = 0;
        boss.patternIndex = (boss.patternIndex ?? 0) + 1;

        deps.onEvent?.({
          kind: 'boss-attacking',
          bossId: boss.id,
          data: { pattern: pattern.name, phase: boss.phase },
        });
      }

      // Phase transition
      if (boss.phase > boss.maxPhases) {
        boss.phase = boss.maxPhases;
      }

      // Move boss body
      this.moveBossBody(boss, deps);

      // Check for boss defeat
      if (boss.health <= 0) {
        deps.onEvent?.({
          kind: 'boss-defeated',
          bossId: boss.id,
          data: {
            scoreReward: boss.scoreReward,
            abilityReward: boss.abilityReward,
            cosmeticReward: boss.cosmeticReward,
          },
        });
      }
    }
  }

  getBoss(bossId: ExpeditionBossId): ExpeditionBossState | undefined {
    return this.bosses.get(bossId);
  }

  getAllBosses(): ExpeditionBossState[] {
    return [...this.bosses.values()];
  }

  isBossAlive(bossId: ExpeditionBossId): boolean {
    return this.bosses.get(bossId)?.isAlive ?? false;
  }

  defeatBoss(
    bossId: ExpeditionBossId,
    deps?: ExpeditionBossDependencies,
  ): ExpeditionBossState | null {
    const boss = this.bosses.get(bossId);
    if (!boss) return null;

    boss.health = 0;
    boss.isAlive = false;

    if (deps) {
      deps.onEvent?.({
        kind: 'boss-defeated',
        bossId: boss.id,
        data: {
          scoreReward: boss.scoreReward,
          abilityReward: boss.abilityReward,
          cosmeticReward: boss.cosmeticReward,
        },
      });
    }

    return boss;
  }

  clearAll(): void {
    this.bosses.clear();
  }

  private moveBossBody(boss: ExpeditionBossState, deps: ExpeditionBossDependencies): void {
    if (boss.body.length === 0) return;

    const nextHead = {
      x: boss.body[0].x + boss.direction.x,
      y: boss.body[0].y + boss.direction.y,
    };

    const room = deps.getRoom(boss.roomId);
    if (!room) return;

    const [roomX, roomY] = boss.roomId.split(',').map(Number);
    const localX = nextHead.x - roomX * this.grid.cols;
    const localY = nextHead.y - roomY * this.grid.rows;

    if (localX < 0 || localX >= this.grid.cols || localY < 0 || localY >= this.grid.rows) {
      // Reverse direction
      boss.direction = { x: -boss.direction.x, y: -boss.direction.y };
      return;
    }

    const tile = room.layout[localY]?.[localX];
    if (tile === '#' || tile === '%') {
      boss.direction = { x: -boss.direction.x, y: -boss.direction.y };
      return;
    }

    boss.body = boss.body.map((segment) => ({
      x: segment.x + boss.direction.x,
      y: segment.y + boss.direction.y,
    }));
  }
}
