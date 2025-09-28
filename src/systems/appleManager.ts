import Phaser from "phaser";
import type { GridConfig } from "./snakeState.js";
import {
  ensureAppleInRoom,
  spawnAppleInRoom,
  moveSkittishApples,
  hasAnyApples,
  getAppleRewards,
  isShieldedApproachFatal,
  clearAppleInfo,
  clearAllAppleInfo,
  getAppleInfo,
  appleWorldPosition,
  type AppleInfo,
} from "./apple.js";

type AppleChange = {
  info: AppleInfo | null;
  changed: boolean;
};

type AppleConsumptionResult = {
  fatal: boolean;
  rewards: { growth: number; bonusScore: number };
  worldPosition: Phaser.Math.Vector2 | null;
  changed: boolean;
};

function cloneVector(vec: Phaser.Math.Vector2): Phaser.Math.Vector2 {
  return new Phaser.Math.Vector2(vec.x, vec.y);
}

function cloneDirs(dirs?: Phaser.Math.Vector2[]): Phaser.Math.Vector2[] | undefined {
  return dirs?.map((dir) => cloneVector(dir));
}

function cloneInfo(info: AppleInfo | null): AppleInfo | null {
  if (!info) return null;
  return {
    roomId: info.roomId,
    position: cloneVector(info.position),
    type: info.type,
    protectedDirs: cloneDirs(info.protectedDirs),
    color: info.color,
  };
}

function dirsEqual(a: Phaser.Math.Vector2[] | undefined, b: Phaser.Math.Vector2[] | undefined): boolean {
  const lenA = a?.length ?? 0;
  const lenB = b?.length ?? 0;
  if (lenA !== lenB) return false;
  if (!a || !b) return true;
  for (let i = 0; i < lenA; i++) {
    const da = a[i];
    const db = b[i];
    if (da.x !== db.x || da.y !== db.y) {
      return false;
    }
  }
  return true;
}

function infoChanged(previous: AppleInfo | null, next: AppleInfo | null, roomChanged: boolean): boolean {
  if (roomChanged) return true;
  if (!previous && !next) return false;
  if (!previous || !next) return true;
  if (previous.type !== next.type) return true;
  if (!previous.position.equals(next.position)) return true;
  if (!dirsEqual(previous.protectedDirs, next.protectedDirs)) return true;
  return false;
}

export class AppleManager {
  private currentRoomId: string | null = null;
  private currentInfo: AppleInfo | null = null;

  constructor(private readonly grid: GridConfig) {}

  resetAll(): void {
    clearAllAppleInfo();
    this.currentRoomId = null;
    this.currentInfo = null;
  }

  setCurrentRoom(roomId: string): AppleChange {
    const info = getAppleInfo(roomId);
    return this.replaceCurrent(roomId, info);
  }

  ensureRoom(roomId: string, snake: Phaser.Math.Vector2[], score: number): AppleChange {
    const info = ensureAppleInRoom(roomId, this.grid, snake, score);
    if (roomId === this.currentRoomId) {
      return this.replaceCurrent(roomId, info);
    }
    return { info: cloneInfo(info), changed: false };
  }

  ensureCurrent(roomId: string, snake: Phaser.Math.Vector2[], score: number): AppleChange {
    const existing = getAppleInfo(roomId);
    if (!existing && hasAnyApples()) {
      this.currentRoomId = roomId;
      this.currentInfo = null;
      return { info: null, changed: false };
    }
    const info = ensureAppleInRoom(roomId, this.grid, snake, score);
    return this.replaceCurrent(roomId, info);
  }

  spawnCurrent(roomId: string, snake: Phaser.Math.Vector2[], score: number): AppleChange {
    const info = spawnAppleInRoom(roomId, this.grid, snake, score);
    return this.replaceCurrent(roomId, info);
  }

  updateSkittish(roomId: string, snake: Phaser.Math.Vector2[]): AppleChange {
    moveSkittishApples(this.grid, snake);
    return this.replaceCurrent(roomId, getAppleInfo(roomId));
  }

  getCurrent(): AppleInfo | null {
    return cloneInfo(this.currentInfo);
  }

  handleConsumption(consumedInfo: AppleInfo | null, dir: Phaser.Math.Vector2): AppleConsumptionResult {
    const info = consumedInfo ?? this.currentInfo;
    const fatal = isShieldedApproachFatal(info ?? null, dir);
    const rewards = getAppleRewards(info ?? null);
    const worldPosition = info ? appleWorldPosition(info, this.grid) : null;
    const changed = !fatal && Boolean(info);

    if (!fatal && info) {
      clearAppleInfo(info.roomId);
      if (this.currentRoomId === info.roomId) {
        this.currentInfo = null;
      }
    }

    return {
      fatal,
      rewards,
      worldPosition,
      changed,
    };
  }

  private replaceCurrent(roomId: string, info: AppleInfo | null): AppleChange {
    const roomChanged = this.currentRoomId !== roomId;
    const changed = infoChanged(this.currentInfo, info, roomChanged);
    this.currentRoomId = roomId;
    this.currentInfo = cloneInfo(info);
    return { info: this.getCurrent(), changed };
  }
}
