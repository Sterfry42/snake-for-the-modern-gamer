import { describe, it, expect } from 'vitest';
import {
  getBlockType,
  getBlockTypes,
  blockIdToColor,
  isSolidBlock,
  isLightSource,
  getBlockHardness,
  getBlockTool,
  isMinecraftBlockType,
} from '../blockRegistry.js';

describe('Block Registry', () => {
  it('should have all expected block types', () => {
    const types = getBlockTypes();
    const ids = types.map((t) => t.id);
    expect(ids).toContain('dirt');
    expect(ids).toContain('stone');
    expect(ids).toContain('cobblestone');
    expect(ids).toContain('wood');
    expect(ids).toContain('planks');
    expect(ids).toContain('torch');
    expect(ids).toContain('lava');
    expect(ids).toContain('water');
    expect(ids).toContain('sand');
  });

  it('should return correct block type by id', () => {
    const dirt = getBlockType('dirt');
    expect(dirt).toBeDefined();
    expect(dirt?.id).toBe('dirt');
    expect(dirt?.kind).toBe('solid');
    expect(dirt?.color).toBe('#8B6914');
  });

  it('should return undefined for unknown block type', () => {
    expect(getBlockType('nonexistent')).toBeUndefined();
  });

  it('should map block id to correct color', () => {
    expect(blockIdToColor('dirt')).toBe('#8B6914');
    expect(blockIdToColor('stone')).toBe('#808080');
    expect(blockIdToColor('nonexistent')).toBe('#FF00FF');
  });

  it('should correctly identify solid blocks', () => {
    expect(isSolidBlock('dirt')).toBe(true);
    expect(isSolidBlock('stone')).toBe(true);
    expect(isSolidBlock('torch')).toBe(false);
    expect(isSolidBlock('water')).toBe(false);
  });

  it('should correctly identify light sources', () => {
    expect(isLightSource('torch')).toBe(true);
    expect(isLightSource('lava')).toBe(true);
    expect(isLightSource('dirt')).toBe(false);
  });

  it('should return correct hardness for blocks', () => {
    expect(getBlockHardness('dirt')).toBe(1);
    expect(getBlockHardness('stone')).toBe(3);
    expect(getBlockHardness('iron_ore')).toBe(5);
    expect(getBlockHardness('diamond_ore')).toBe(7);
  });

  it('should return correct tool requirements', () => {
    expect(getBlockTool('dirt')).toBeUndefined();
    expect(getBlockTool('wood')).toBe('axe');
    expect(getBlockTool('stone')).toBe('pickaxe');
    expect(getBlockTool('iron_ore')).toBe('pickaxe');
  });

  it('should validate minecraft block types', () => {
    expect(isMinecraftBlockType('dirt')).toBe(true);
    expect(isMinecraftBlockType('stone')).toBe(true);
    expect(isMinecraftBlockType('nonexistent')).toBe(false);
  });
});
