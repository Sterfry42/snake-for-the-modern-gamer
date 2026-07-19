import type { BlockData, ChunkKey, ChunkState } from './types.js';
import { CHUNK_SIZE, MAX_WORLD_CHUNKS } from './config.js';


function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash);
}

// @ts-expect-error TS6133 - unused declaration
function _seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) | 0;
    return (state >>> 0) / 4294967296;
  };
}

function generateNoise(x: number, y: number, seed: number): number {
  const hash = hashString(`${x * 374761393 + y * 668265263 + seed}`);
  return (hash & 0xffff) / 65535;
}

function smoothNoise(x: number, y: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;

  const v00 = generateNoise(ix, iy, seed);
  const v10 = generateNoise(ix + 1, iy, seed);
  const v01 = generateNoise(ix, iy + 1, seed);
  const v11 = generateNoise(ix + 1, iy + 1, seed);

  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);

  return v00 * (1 - sx) * (1 - sy) + v10 * sx * (1 - sy) + v01 * (1 - sx) * sy + v11 * sx * sy;
}

function generateTerrainBlock(
  localX: number,
  localY: number,
  chunkX: number,
  chunkY: number,
  roomSeed: number,
): string {
  const seed = hashString(`${roomSeed}:${chunkX},${chunkY}`);
  const noise1 = smoothNoise(localX * 0.15 + chunkX * 10, localY * 0.15 + chunkY * 10, seed);
  const noise2 = smoothNoise(localX * 0.08 + chunkX * 20, localY * 0.08 + chunkY * 20, seed + 1000);

  const combined = (noise1 + noise2) / 2;

  if (combined > 0.7) {
    return 'stone';
  } else if (combined > 0.45) {
    return 'dirt';
  } else if (combined > 0.38) {
    return 'gravel';
  } else if (combined > 0.34) {
    return 'sand';
  } else if (combined > 0.3) {
    return 'coal_ore';
  } else if (combined > 0.26) {
    return 'iron_ore';
  } else if (combined > 0.22) {
    return 'diamond_ore';
  } else if (combined > 0.18) {
    return 'lava';
  } else {
    return 'grass';
  }
}

export function chunkSeed(roomId: string, chunkX: number, chunkY: number): number {
  return hashString(`${roomId}:${chunkX},${chunkY}`);
}

export function generateChunk(roomId: string, chunkX: number, chunkY: number): Map<string, string> {
  const seed = chunkSeed(roomId, chunkX, chunkY);
  const blocks = new Map<string, string>();

  for (let ly = 0; ly < CHUNK_SIZE; ly++) {
    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      const type = generateTerrainBlock(lx, ly, chunkX, chunkY, seed);
      blocks.set(`${lx},${ly}`, type);
    }
  }

  return blocks;
}

export class ChunkManager {
  private chunks = new Map<string, ChunkState>();

  private toKey(key: ChunkKey): string {
    return `${key.roomId}:${key.chunkX},${key.chunkY}`;
  }

  // @ts-expect-error TS6133 - unused declaration
  private fromKey(str: string): ChunkKey {
    const idx = str.indexOf(':');
    const roomId = str.slice(0, idx);
    const coords = str.slice(idx + 1).split(',');
    return {
      roomId,
      chunkX: parseInt(coords[0], 10),
      chunkY: parseInt(coords[1], 10),
    };
  }

  loadChunk(roomId: string, chunkX: number, chunkY: number): Map<string, string> {
    const key = { roomId, chunkX, chunkY };
    const mapKey = this.toKey(key);

    if (!this.chunks.has(mapKey)) {
      if (this.chunks.size >= MAX_WORLD_CHUNKS) {
        this.unloadOldest();
      }

      const blocks = generateChunk(roomId, chunkX, chunkY);
      this.chunks.set(mapKey, {
        key,
        blocks,
        dirty: false,
        loaded: true,
      });
    }

    const state = this.chunks.get(mapKey)!;
    return state.blocks;
  }

  unloadChunk(roomId: string, chunkX: number, chunkY: number): void {
    const key = this.toKey({ roomId, chunkX, chunkY });
    this.chunks.delete(key);
  }

  getBlock(
    roomId: string,
    chunkX: number,
    chunkY: number,
    localX: number,
    localY: number,
  ): string | undefined {
    const blockKey = `${localX},${localY}`;
    return this.loadChunk(roomId, chunkX, chunkY).get(blockKey);
  }

  setBlock(
    roomId: string,
    chunkX: number,
    chunkY: number,
    localX: number,
    localY: number,
    blockType: string,
  ): void {
    const key = { roomId, chunkX, chunkY };
    const mapKey = this.toKey(key);
    const state = this.chunks.get(mapKey);

    if (state) {
      state.blocks.set(`${localX},${localY}`, blockType);
      state.dirty = true;
    } else {
      this.unloadChunk(roomId, chunkX, chunkY);
      const blocks = generateChunk(roomId, chunkX, chunkY);
      blocks.set(`${localX},${localY}`, blockType);
      this.chunks.set(mapKey, {
        key,
        blocks,
        dirty: true,
        loaded: true,
      });
    }
  }

  removeBlock(
    roomId: string,
    chunkX: number,
    chunkY: number,
    localX: number,
    localY: number,
  ): void {
    const key = { roomId, chunkX, chunkY };
    const mapKey = this.toKey(key);
    const state = this.chunks.get(mapKey);

    if (state) {
      state.blocks.delete(`${localX},${localY}`);
      state.dirty = true;
    }
  }

  getBlocksInRange(
    roomId: string,
    centerX: number,
    centerY: number,
    rangeChunks: number,
  ): Array<BlockData & { chunkX: number; chunkY: number }> {
    const result: Array<BlockData & { chunkX: number; chunkY: number }> = [];

    const centerChunkX = Math.floor(centerX / CHUNK_SIZE);
    const centerChunkY = Math.floor(centerY / CHUNK_SIZE);

    for (let cy = centerChunkY - rangeChunks; cy <= centerChunkY + rangeChunks; cy++) {
      for (let cx = centerChunkX - rangeChunks; cx <= centerChunkX + rangeChunks; cx++) {
        const blocks = this.loadChunk(roomId, cx, cy);
        const baseWorldX = cx * CHUNK_SIZE;
        const baseWorldY = cy * CHUNK_SIZE;

        for (const [localKey, blockType] of blocks.entries()) {
          const [lx, ly] = localKey.split(',').map(Number);
          const worldX = baseWorldX + lx;
          const worldY = baseWorldY + ly;

          const dx = worldX - centerX;
          const dy = worldY - centerY;
          if (
            Math.abs(dx) <= CHUNK_SIZE * (rangeChunks + 1) &&
            Math.abs(dy) <= CHUNK_SIZE * (rangeChunks + 1)
          ) {
            result.push({
              x: worldX,
              y: worldY,
              type: blockType,
              chunkX: cx,
              chunkY: cy,
            });
          }
        }
      }
    }

    return result;
  }

  isChunkLoaded(roomId: string, chunkX: number, chunkY: number): boolean {
    return this.chunks.has(this.toKey({ roomId, chunkX, chunkY }));
  }

  getDirtyChunks(roomId: string): Array<{ chunkX: number; chunkY: number }> {
    const result: Array<{ chunkX: number; chunkY: number }> = [];
    for (const state of this.chunks.values()) {
      if (state.dirty && state.key.roomId === roomId) {
        result.push({
          chunkX: state.key.chunkX,
          chunkY: state.key.chunkY,
        });
      }
    }
    return result;
  }

  markClean(chunkX: number, chunkY: number): void {
    for (const state of this.chunks.values()) {
      if (state.key.chunkX === chunkX && state.key.chunkY === chunkY) {
        state.dirty = false;
      }
    }
  }

  serialize(): Array<{
    roomId: string;
    chunkX: number;
    chunkY: number;
    blocks: Array<{ x: number; y: number; blockType: string }>;
  }> {
    const result: Array<{
      roomId: string;
      chunkX: number;
      chunkY: number;
      blocks: Array<{ x: number; y: number; blockType: string }>;
    }> = [];
    for (const state of this.chunks.values()) {
      if (state.dirty || state.blocks.size > 0) {
        const blocks: Array<{ x: number; y: number; blockType: string }> = [];
        for (const [localKey, blockType] of state.blocks.entries()) {
          const [lx, ly] = localKey.split(',').map(Number);
          blocks.push({
            x: state.key.chunkX * CHUNK_SIZE + lx,
            y: state.key.chunkY * CHUNK_SIZE + ly,
            blockType,
          });
        }
        result.push({
          roomId: state.key.roomId,
          chunkX: state.key.chunkX,
          chunkY: state.key.chunkY,
          blocks,
        });
      }
    }
    return result;
  }

  deserialize(
    data: Array<{
      roomId: string;
      chunkX: number;
      chunkY: number;
      blocks: Array<{ x: number; y: number; blockType: string }>;
    }>,
  ): void {
    for (const entry of data) {
      const chunkX = Math.floor(entry.blocks[0]?.x / CHUNK_SIZE) ?? entry.chunkX;
      const chunkY = Math.floor(entry.blocks[0]?.y / CHUNK_SIZE) ?? entry.chunkY;
      const key = this.toKey({ roomId: entry.roomId, chunkX, chunkY });

      const blocks = new Map<string, string>();
      for (const b of entry.blocks) {
        const lx = b.x - chunkX * CHUNK_SIZE;
        const ly = b.y - chunkY * CHUNK_SIZE;
        blocks.set(`${lx},${ly}`, b.blockType);
      }

      if (!this.chunks.has(key)) {
        this.chunks.set(key, {
          key: { roomId: entry.roomId, chunkX, chunkY },
          blocks,
          dirty: false,
          loaded: true,
        });
      }
    }
  }

  clear(): void {
    this.chunks.clear();
  }

  destroy(): void {
    this.chunks.clear();
  }

  get size(): number {
    return this.chunks.size;
  }

  private unloadOldest(): void {
    let oldestKey: string | null = null;
    // @ts-expect-error TS6133 - unused declaration
    let _oldestState: ChunkState | null = null;
    let oldestTicks = Infinity;

    for (const [key, state] of this.chunks) {
      const ticks = state.key.chunkX + state.key.chunkY;
      if (ticks < oldestTicks) {
        oldestKey = key;
        _oldestState = state;
        oldestTicks = ticks;
      }
    }

    if (oldestKey) {
      this.chunks.delete(oldestKey);
    }
  }
}
