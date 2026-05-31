import type { LightSourceType, LightSource } from './types.js';
import {
  LIGHT_LEVEL_TORCH,
  LIGHT_LEVEL_LAVA,
  LIGHT_LEVEL_MOB_SPAWN_THRESHOLD,
} from './config.js';
import { isLightSource as isBlockLightSource } from './blockRegistry.js';

export class LightingSystem {
  private lightSources: Map<string, LightSource> = new Map();
  private cachedLightMap = new Map<string, Map<string, number>>();

  addLightSource(
    x: number,
    y: number,
    roomId: string,
    type: LightSourceType = 'torch',
  ): void {
    const key = `${roomId}:${x},${y}`;
    const level = type === 'lava' ? LIGHT_LEVEL_LAVA : LIGHT_LEVEL_TORCH;

    this.lightSources.set(key, { x, y, roomId, type, level });
    this.cachedLightMap.clear();
  }

  removeLightSource(x: number, y: number, roomId: string): void {
    const key = `${roomId}:${x},${y}`;
    this.lightSources.delete(key);
    this.cachedLightMap.clear();
  }

  calculateLightMap(roomId: string): Map<string, number> {
    const roomKey = roomId;
    if (this.cachedLightMap.has(roomKey)) {
      return this.cachedLightMap.get(roomKey)!;
    }

    const lightMap = new Map<string, number>();

    // Initialize with 0
    for (const source of this.lightSources.values()) {
      if (source.roomId === roomId) {
        lightMap.set(`${source.x},${source.y}`, source.level);
      }
    }

    // BFS propagation
    const toPropagate: Array<{ x: number; y: number; level: number }> = [];
    for (const [pos, level] of lightMap.entries()) {
      const [x, y] = pos.split(',').map(Number);
      toPropagate.push({ x, y, level });
    }

    while (toPropagate.length > 0) {
      const current = toPropagate.shift()!;
      const neighbors = [
        { x: current.x + 1, y: current.y },
        { x: current.x - 1, y: current.y },
        { x: current.x, y: current.y + 1 },
        { x: current.x, y: current.y - 1 },
      ];

      for (const neighbor of neighbors) {
        const nKey = `${neighbor.x},${neighbor.y}`;
        const currentLevel = lightMap.get(nKey) ?? 0;
        const newLevel = current.level - 1;

        if (newLevel > currentLevel && newLevel > 0) {
          lightMap.set(nKey, newLevel);
          toPropagate.push({ x: neighbor.x, y: neighbor.y, level: newLevel });
        }
      }
    }

    this.cachedLightMap.set(roomKey, lightMap);
    return lightMap;
  }

  getLightLevel(x: number, y: number, roomId: string): number {
    const lightMap = this.calculateLightMap(roomId);
    return lightMap.get(`${x},${y}`) ?? 0;
  }

  isBlockDarkened(x: number, y: number, roomId: string): boolean {
    const light = this.getLightLevel(x, y, roomId);
    return light <= LIGHT_LEVEL_MOB_SPAWN_THRESHOLD;
  }

  getSpawnablePositions(
    roomId: string,
    centerX: number,
    centerY: number,
    radius: number,
  ): Array<{ x: number; y: number }> {
    const positions: Array<{ x: number; y: number }> = [];

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const px = centerX + dx;
        const py = centerY + dy;
        if (dx * dx + dy * dy <= radius * radius) {
          if (this.isBlockDarkened(px, py, roomId)) {
            positions.push({ x: px, y: py });
          }
        }
      }
    }

    return positions;
  }

  getLightLevelAtPosition(x: number, y: number, roomId: string): number {
    return this.getLightLevel(x, y, roomId);
  }

  hasAnyLightSource(): boolean {
    return this.lightSources.size > 0;
  }

  getLightSourceCount(): number {
    return this.lightSources.size;
  }

  clear(): void {
    this.lightSources.clear();
    this.cachedLightMap.clear();
  }

  destroy(): void {
    this.clear();
  }
}
