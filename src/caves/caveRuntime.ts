/**
 * Cave Runtime
 *
 * Owns live cave state: entering/exiting, rush-apple refills, timers,
 * reward claims, and the per-instance save ledger.
 * The wise old snake's obstacles were always ladders.
 */
import type { AppleService } from '../apples/appleService.js';
import type { AppleSnapshot } from '../apples/types.js';
import type { Vector2Like } from '../core/math.js';
import { getItem } from '../inventory/itemRegistry.js';
import type { InventorySystem } from '../inventory/inventory.js';
import type { EnemyManager } from '../systems/enemies.js';
import type { SnakeState } from '../systems/snakeState.js';
import { isBlockingTownTile } from '../world/town.js';
import type { WorldService } from '../world/worldService.js';
import {
  CAVE_EXIT_TILE,
  CAVE_RUBBLE_TILE,
  type CaveEntrance,
  type CaveInstanceSaveData,
  type CaveRuntimeState,
  type CaveSaveState,
} from './caveTypes.js';
import { createDefaultCaveSave, isCaveRoomId } from './caveGenerator.js';
import { getCaveTemplate } from './caveTemplates.js';

export type CaveExitReason = 'manual' | 'timer' | 'reward';

export interface CaveDwellerRewardResult {
  state: 'none' | 'claimed' | 'available';
  itemId?: string;
  itemName?: string;
  pages: string[];
}

/**
 * Live references into the owning SnakeGame. Accessors (not captured
 * objects) because load/reseed replace world, apples, and enemies.
 */
export interface CaveRuntimeContext {
  getWorld(): WorldService;
  getSnake(): SnakeState;
  getApples(): AppleService;
  getEnemies(): EnemyManager;
  getInventory(): InventorySystem;
  getGrid(): { readonly cols: number; readonly rows: number };
  getVisitedRooms(): Set<string>;
  getFlag<T = unknown>(key: string): T | undefined;
  setFlag(key: string, value: unknown): void;
  worldToLocal(roomId: string, position: Vector2Like): Vector2Like;
  setRoomTile(roomId: string, localX: number, localY: number, tile: string): boolean;
}

export class CaveRuntime {
  private readonly context: CaveRuntimeContext;

  constructor(context: CaveRuntimeContext) {
    this.context = context;
  }

  handleHeadTransition(previousRoom: string, roomsChanged: Set<string>): void {
    const world = this.context.getWorld();
    const head = this.context.getSnake().bodySegments[0];
    if (!head) {
      return;
    }
    const room = world.getRoom(this.context.getSnake().currentRoomId);
    const local = this.context.worldToLocal(room.id, head);
    if (room.cave && room.layout[local.y]?.[local.x] === CAVE_EXIT_TILE) {
      this.exit(roomsChanged, 'manual');
      return;
    }
    const entrance = room.caveEntrances?.find(
      (entry) => !entry.collapsed && entry.x === local.x && entry.y === local.y,
    );
    if (!entrance || previousRoom !== room.id) {
      return;
    }
    this.enterCave(entrance, room.id, local, roomsChanged);
  }

  tickTimer(roomsChanged: Set<string>): boolean {
    const runtime = this.context.getFlag<CaveRuntimeState>('caves.active');
    if (!runtime?.timerTicks) {
      return false;
    }
    if (this.context.getSnake().currentRoomId !== runtime.caveId) {
      return false;
    }
    const next = Math.max(0, runtime.timerTicks - 1);
    const updated = { ...runtime, timerTicks: next };
    this.context.setFlag('caves.active', updated);
    this.context.setFlag('caves.timer', {
      caveId: runtime.caveId,
      remaining: next,
      total: runtime.timerTotalTicks ?? next,
    });
    if (next > 0) {
      return false;
    }
    this.exit(roomsChanged, 'timer');
    return true;
  }

  handleAppleEaten(roomsChanged: Set<string>): AppleSnapshot | null {
    const runtime = this.context.getFlag<CaveRuntimeState>('caves.active');
    const apples = this.context.getApples();
    if (!runtime || runtime.caveId !== this.context.getSnake().currentRoomId) {
      return apples.getSnapshot(this.context.getSnake().currentRoomId);
    }
    if (runtime.appleRushRemaining === undefined) {
      return apples.getSnapshot(runtime.caveId);
    }
    const remaining = Math.max(0, (runtime.appleRushRemaining ?? 0) - 1);
    const updated = { ...runtime, appleRushRemaining: remaining };
    this.context.setFlag('caves.active', updated);
    roomsChanged.add(runtime.caveId);
    if (remaining <= 0) {
      this.context.setFlag('achievement.caveAppleRushCleared', {
        caveId: runtime.caveId,
        templateId: runtime.templateId,
      });
      this.exit(roomsChanged, 'reward');
      return null;
    }
    this.refillCaveRushApples(runtime.caveId, runtime.templateId, updated);
    return apples.getSnapshot(runtime.caveId);
  }

  exit(roomsChanged: Set<string>, reason: CaveExitReason = 'manual'): void {
    const world = this.context.getWorld();
    const snake = this.context.getSnake();
    const runtime = this.context.getFlag<CaveRuntimeState>('caves.active');
    if (!runtime) {
      return;
    }
    const template = getCaveTemplate(runtime.templateId);
    const save = this.ensureCaveSave(
      {
        id: runtime.entranceId,
        caveId: runtime.caveId,
        x: runtime.returnPosition.x,
        y: runtime.returnPosition.y,
        templateId: runtime.templateId,
        collapsed: false,
      },
      runtime.parentRoomId,
    );
    const collapse = reason === 'timer' ? template.collapseOnTimerEnd : template.collapseOnExit;
    save.state = collapse ? 'collapsed' : 'completed';
    this.writeCaveSave(save);
    world.setCaveSave(save);
    this.collapseParentEntrance(runtime, collapse);
    this.context.getApples().clearRoomApple(runtime.caveId);
    const exitDirection = this.findSafeCaveExitDirection(
      runtime.parentRoomId,
      runtime.returnPosition,
    );
    snake.teleportTo(runtime.parentRoomId, runtime.returnPosition, exitDirection);
    this.context.setFlag('traversal.exitDirectionLockTicks', 1);
    this.context.setFlag('caves.active', undefined);
    this.context.setFlag('caves.timer', undefined);
    this.context.setFlag('traversal.manualResumePending', true);
    this.context.setFlag('ui.caveTransition', {
      caveId: runtime.caveId,
      parentRoomId: runtime.parentRoomId,
      collapsed: collapse,
      reason,
    });
    this.context.setFlag('ui.questInteraction', {
      message: collapse ? 'The cave collapses behind you.' : 'You climb back out of the cave.',
    });
    roomsChanged.add(runtime.caveId);
    roomsChanged.add(runtime.parentRoomId);
  }

  markRewardClaimed(roomId: string): void {
    if (!isCaveRoomId(roomId)) {
      return;
    }
    const world = this.context.getWorld();
    const runtime = this.context.getFlag<CaveRuntimeState>('caves.active');
    const room = world.getRoom(roomId);
    const templateId = runtime?.templateId ?? room.cave?.templateId;
    const parentRoomId = runtime?.parentRoomId ?? room.cave?.parentRoomId;
    if (!templateId || !parentRoomId) {
      return;
    }
    const save = this.ensureCaveSave(
      {
        id: `${roomId}:entrance`,
        caveId: roomId,
        x: 0,
        y: 0,
        templateId,
        collapsed: false,
      },
      parentRoomId,
    );
    save.rewardClaimed = true;
    save.openedChestIds = Array.from(new Set([...save.openedChestIds, `${roomId}:chest`]));
    save.state = 'completed';
    this.writeCaveSave(save);
    world.setCaveSave(save);
  }

  claimLakeReward(roomId: string, itemId: string, head: Vector2Like): void {
    const world = this.context.getWorld();
    const room = world.getRoom(roomId);
    if (!room.cave) {
      return;
    }
    const save = this.ensureCaveSave(
      {
        id: `${roomId}:entrance`,
        caveId: roomId,
        x: 0,
        y: 0,
        templateId: room.cave.templateId,
        collapsed: false,
      },
      room.cave.parentRoomId,
    );
    if (save.collectedItemIds.includes(itemId)) {
      return;
    }
    const rewardId = this.pickRewardId(room.cave.templateId, itemId);
    this.context.getInventory().addItem(rewardId, 1);
    save.collectedItemIds = [...save.collectedItemIds, itemId];
    this.writeCaveSave(save);
    world.setCaveSave(save);
    this.context.setFlag('loot.itemPicked', {
      head,
      itemName: getItem(rewardId)?.name ?? rewardId,
      itemId: rewardId,
    });
    this.context.setFlag('ui.treasurePickup', { x: head.x, y: head.y, roomId });
  }

  claimDwellerReward(): CaveDwellerRewardResult {
    const world = this.context.getWorld();
    const snake = this.context.getSnake();
    const room = world.getRoom(snake.currentRoomId);
    if (!room.cave || room.cave.templateId !== 'caveDweller') {
      return { state: 'none', pages: [] };
    }
    const save = this.ensureCaveSave(
      {
        id: `${room.id}:entrance`,
        caveId: room.id,
        x: 0,
        y: 0,
        templateId: room.cave.templateId,
        collapsed: false,
      },
      room.cave.parentRoomId,
    );
    if (save.rewardClaimed || room.cave.dwellerRewardClaimed) {
      return {
        state: 'claimed',
        pages: [
          'The cave dweller taps the wall twice and listens.',
          'I already gave you what the stone owed me. If the cave still wants payment, make sure it pays you first.',
        ],
      };
    }
    const rewardId = 'helm-cave-echo';
    const itemName = getItem(rewardId)?.name ?? rewardId;
    const head = snake.bodySegments[0] ?? { x: 0, y: 0 };
    this.context.getInventory().addItem(rewardId, 1);
    save.rewardClaimed = true;
    save.state = 'completed';
    this.writeCaveSave(save);
    world.setCaveSave(save);
    room.cave.dwellerRewardClaimed = true;
    this.context.setFlag('loot.itemPicked', {
      head,
      itemName,
      itemId: rewardId,
    });
    this.context.setFlag('ui.treasurePickup', { x: head.x, y: head.y, roomId: room.id });
    return {
      state: 'available',
      itemId: rewardId,
      itemName,
      pages: [
        'The cave dweller does not look surprised to see a snake. They look surprised the cave let you keep your shape.',
        'Most caves are not cold. This one is. Stone has moods, and old stone remembers winter better than sunlight.',
        `A snake should never enter a cave unarmed. Take the ${itemName}. It makes walls speak before they bite.`,
      ],
    };
  }

  pickRewardId(templateId: CaveRuntimeState['templateId'], salt: string): string {
    const table: Array<{ id: string; weight: number }> =
      templateId === 'lakeTreasure'
        ? [
            { id: 'amulet-phoenix', weight: 3 },
            { id: 'boots-lead-flippers', weight: 3 },
            { id: 'amulet-scavenger', weight: 2 },
            { id: 'belt-regenerator', weight: 2 },
            { id: 'belt-smuggler-cache', weight: 1 },
            { id: 'ring-seismic', weight: 2 },
            { id: 'weapon-revolver', weight: 1 },
            { id: 'helm-cave-echo', weight: 1 },
          ]
        : templateId === 'monsterDen'
          ? [
              { id: 'amulet-phoenix', weight: 4 },
              { id: 'boots-lead-flippers', weight: 3 },
              { id: 'amulet-scavenger', weight: 2 },
              { id: 'belt-regenerator', weight: 2 },
              { id: 'ring-back-alley-dividend', weight: 1 },
              { id: 'ring-seismic', weight: 1 },
            ]
          : [
              { id: 'ring-seismic', weight: 2 },
              { id: 'weapon-revolver', weight: 2 },
              { id: 'boots-swim-fins', weight: 1 },
              { id: 'amulet-phoenix', weight: 1 },
            ];
    let hash = 0;
    for (let i = 0; i < salt.length + templateId.length; i += 1) {
      hash =
        (hash * 31 + `${templateId}:${salt}`.charCodeAt(i % `${templateId}:${salt}`.length)) >>> 0;
    }
    const total = table.reduce((sum, entry) => sum + entry.weight, 0);
    let cursor = hash % total;
    for (const entry of table) {
      cursor -= entry.weight;
      if (cursor < 0) {
        return entry.id;
      }
    }
    return table[0]?.id ?? 'ring-seismic';
  }

  private enterCave(
    entrance: CaveEntrance,
    parentRoomId: string,
    returnPosition: Vector2Like,
    roomsChanged: Set<string>,
  ): void {
    const world = this.context.getWorld();
    const snake = this.context.getSnake();
    const save = this.ensureCaveSave(entrance, parentRoomId);
    if (save.state === 'collapsed') {
      this.context.setFlag('ui.questInteraction', { message: 'The cave has collapsed.' });
      return;
    }
    save.state = 'active';
    this.writeCaveSave(save);
    world.setCaveSave(save);
    const caveRoom = world.getRoom(entrance.caveId);
    const grid = this.context.getGrid();
    const spawn = caveRoom.cave?.spawn ?? {
      x: Math.floor(grid.cols / 2),
      y: grid.rows - 3,
    };
    snake.teleportTo(entrance.caveId, spawn, { x: 0, y: -1 });
    this.context.getVisitedRooms().add(entrance.caveId);
    const template = getCaveTemplate(entrance.templateId);
    const runtime: CaveRuntimeState = {
      caveId: entrance.caveId,
      parentRoomId,
      entranceId: entrance.id,
      returnPosition,
      templateId: entrance.templateId,
    };
    if (template.timerSeconds) {
      const ticks = Math.max(1, Math.round((template.timerSeconds * 1000) / 100));
      runtime.timerTicks = ticks;
      runtime.timerTotalTicks = ticks;
      if (template.applePool) {
        runtime.appleRushRemaining = this.resolveCaveAppleCount(
          entrance.templateId,
          entrance.caveId,
        );
        this.refillCaveRushApples(caveRoom.id, entrance.templateId, runtime);
      }
    }
    if (caveRoom.cave?.enemyCount) {
      this.context
        .getEnemies()
        .ensureCaveEnemies(caveRoom.id, caveRoom, snake.bodySegments, caveRoom.cave.enemyCount);
    }
    this.context.setFlag('caves.active', runtime);
    this.context.setFlag('traversal.manualResumePending', true);
    this.context.setFlag('ui.questInteraction', { message: 'You descend into the cave.' });
    roomsChanged.add(parentRoomId);
    roomsChanged.add(entrance.caveId);
  }

  private findSafeCaveExitDirection(roomId: string, position: Vector2Like): Vector2Like {
    const room = this.context.getWorld().getRoom(roomId);
    const candidates: Vector2Like[] = [
      { x: 0, y: 1 },
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: -1 },
    ];
    return (
      candidates.find((direction) => {
        const x = position.x + direction.x;
        const y = position.y + direction.y;
        const tile = room.layout[y]?.[x];
        return Boolean(tile && tile !== '#' && tile !== '~' && !isBlockingTownTile(tile));
      }) ?? candidates[0]!
    );
  }

  private refillCaveRushApples(
    caveId: string,
    templateId: CaveRuntimeState['templateId'],
    runtime: CaveRuntimeState,
  ): void {
    const apples = this.context.getApples();
    const remaining = Math.max(0, runtime.appleRushRemaining ?? 0);
    const target = Math.min(remaining, this.getCaveRushActiveAppleLimit(templateId, remaining));
    const current = apples.getSnapshots(caveId).length;
    for (let i = current; i < target; i += 1) {
      this.spawnCaveRushApple(caveId, templateId, runtime, i);
    }
  }

  private getCaveRushActiveAppleLimit(
    templateId: CaveRuntimeState['templateId'],
    remaining: number,
  ): number {
    if (templateId === 'skittishAppleRush') {
      return remaining;
    }
    if (templateId === 'caffeinatedAppleRush') {
      return Math.min(5, remaining);
    }
    if (templateId === 'goldenAppleRush') {
      return Math.min(3, remaining);
    }
    return Math.min(1, remaining);
  }

  private spawnCaveRushApple(
    caveId: string,
    templateId: CaveRuntimeState['templateId'],
    runtime: CaveRuntimeState,
    index: number,
  ): AppleSnapshot | null {
    const world = this.context.getWorld();
    const snake = this.context.getSnake();
    const apples = this.context.getApples();
    const room = world.getRoom(caveId);
    const template = getCaveTemplate(templateId);
    const typeId = template.applePool?.typeId ?? 'gold';
    const occupied = Array.from(snake.bodySegments);
    const existing = apples.getSnapshots(caveId).map((apple) => apple.position);
    const seed = `${caveId}:${runtime.appleRushRemaining ?? 0}:${typeId}:${index}`;
    let hash = 0;
    for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
    const options: Vector2Like[] = [];
    const grid = this.context.getGrid();
    for (let y = 2; y < grid.rows - 4; y += 1) {
      for (let x = 2; x < grid.cols - 2; x += 1) {
        if (room.layout[y]?.[x] !== '.') continue;
        if (occupied.some((segment) => segment.x === x && segment.y === y)) continue;
        if (existing.some((apple) => apple.x === x && apple.y === y)) continue;
        options.push({ x, y });
      }
    }
    const position = options[hash % Math.max(1, options.length)] ?? room.cave?.spawn;
    if (!position) {
      return null;
    }
    return apples.placeApple(caveId, position, typeId, occupied, true).snapshot;
  }

  private resolveCaveAppleCount(
    templateId: CaveRuntimeState['templateId'],
    caveId: string,
  ): number {
    const pool = getCaveTemplate(templateId).applePool;
    if (!pool) {
      return 0;
    }
    if (pool.minCount !== undefined && pool.maxCount !== undefined) {
      let hash = 0;
      for (let i = 0; i < caveId.length; i += 1) hash = (hash * 31 + caveId.charCodeAt(i)) >>> 0;
      return pool.minCount + (hash % (pool.maxCount - pool.minCount + 1));
    }
    return pool.count;
  }

  private ensureCaveSave(entrance: CaveEntrance, parentRoomId: string): CaveInstanceSaveData {
    const caveState = this.getCaveSaveState();
    const existing = caveState.caveInstances[entrance.caveId];
    if (existing) {
      return { ...existing };
    }
    return createDefaultCaveSave(entrance.caveId, parentRoomId, entrance.templateId);
  }

  private getCaveSaveState(): CaveSaveState {
    return this.context.getFlag<CaveSaveState>('caves.save') ?? { caveInstances: {} };
  }

  private writeCaveSave(save: CaveInstanceSaveData): void {
    const state = this.getCaveSaveState();
    this.context.setFlag('caves.save', {
      caveInstances: {
        ...state.caveInstances,
        [save.id]: save,
      },
    } satisfies CaveSaveState);
  }

  private collapseParentEntrance(runtime: CaveRuntimeState, collapse?: boolean): void {
    if (!collapse) {
      return;
    }
    const room = this.context.getWorld().getRoom(runtime.parentRoomId);
    const entrance = room.caveEntrances?.find((entry) => entry.caveId === runtime.caveId);
    if (!entrance) {
      return;
    }
    entrance.collapsed = true;
    this.context.setRoomTile(runtime.parentRoomId, entrance.x, entrance.y, CAVE_RUBBLE_TILE);
  }
}
