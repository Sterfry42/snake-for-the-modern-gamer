import { describe, it, expect } from 'vitest';
import { ChunkManager, chunkSeed, generateChunk } from '../chunk.js';

describe('Chunk Manager', () => {
  it('should generate chunks deterministically', () => {
    const seed1 = chunkSeed('test-room', 0, 0);
    const seed2 = chunkSeed('test-room', 0, 0);
    expect(seed1).toBe(seed2);

    const seed3 = chunkSeed('test-room', 0, 1);
    expect(seed1).not.toBe(seed3);
  });

  it('should generate blocks for a chunk', () => {
    const blocks = generateChunk('test-room', 0, 0);
    expect(blocks.size).toBe(256); // 16x16

    // All values should be valid block types
    for (const [key, value] of blocks) {
      expect(value).toBeDefined();
      expect(typeof value).toBe('string');
      expect(value).not.toBe('');
    }
  });

  it('should load and return chunks', () => {
    const manager = new ChunkManager();
    const blocks = manager.loadChunk('room1', 0, 0);
    expect(blocks.size).toBe(256);

    const blocks2 = manager.loadChunk('room1', 0, 0);
    expect(blocks === blocks2).toBe(true); // Same reference

    manager.destroy();
  });

  it('should allow setting and getting blocks', () => {
    const manager = new ChunkManager();
    manager.loadChunk('room1', 0, 0);
    manager.setBlock('room1', 0, 0, 8, 8, 'stone');

    const block = manager.getBlock('room1', 0, 0, 8, 8);
    expect(block).toBe('stone');

    manager.destroy();
  });

  it('should allow removing blocks', () => {
    const manager = new ChunkManager();
    manager.loadChunk('room1', 0, 0);
    manager.setBlock('room1', 0, 0, 5, 5, 'cobblestone');

    manager.removeBlock('room1', 0, 0, 5, 5);
    const block = manager.getBlock('room1', 0, 0, 5, 5);
    expect(block).toBeUndefined();

    manager.destroy();
  });

  it('should mark chunks as dirty when modified', () => {
    const manager = new ChunkManager();
    manager.loadChunk('room1', 0, 0);
    manager.setBlock('room1', 0, 0, 0, 0, 'dirt');

    const dirty = manager.getDirtyChunks('room1');
    expect(dirty).toHaveLength(1);
    expect(dirty[0]!.chunkX).toBe(0);
    expect(dirty[0]!.chunkY).toBe(0);

    manager.destroy();
  });

  it('should serialize and deserialize chunks', () => {
    const manager = new ChunkManager();
    manager.loadChunk('room1', 0, 0);
    manager.setBlock('room1', 0, 0, 10, 10, 'stone');

    const serialized = manager.serialize();
    expect(serialized.length).toBeGreaterThan(0);

    const manager2 = new ChunkManager();
    manager2.deserialize(serialized);

    const block = manager2.getBlock('room1', 0, 0, 10, 10);
    expect(block).toBe('stone');

    manager.destroy();
    manager2.destroy();
  });

  it('should not crash with out-of-bounds setBlock', () => {
    const manager = new ChunkManager();
    manager.loadChunk('room1', 0, 0);

    // Should not throw
    manager.setBlock('room1', 0, 0, 20, 20, 'dirt');

    manager.destroy();
  });
});

describe('Chunk Seed', () => {
  it('should produce unique seeds for different chunks', () => {
    expect(chunkSeed('room', 0, 0)).not.toBe(chunkSeed('room', 1, 0));
    expect(chunkSeed('room', 0, 0)).not.toBe(chunkSeed('room', 0, 1));
  });

  it('should produce different seeds for different rooms', () => {
    expect(chunkSeed('room1', 0, 0)).not.toBe(chunkSeed('room2', 0, 0));
  });
});
