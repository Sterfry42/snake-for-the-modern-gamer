import { describe, it, expect } from 'vitest';
import { LightingSystem } from '../lighting.js';
import { LIGHT_LEVEL_TORCH, LIGHT_LEVEL_LAVA, LIGHT_LEVEL_MOB_SPAWN_THRESHOLD } from '../config.js';

describe('LightingSystem', () => {
  it('should start with no light sources', () => {
    const system = new LightingSystem();
    expect(system.hasAnyLightSource()).toBe(false);
    expect(system.getLightSourceCount()).toBe(0);
  });

  it('should add a light source', () => {
    const system = new LightingSystem();
    system.addLightSource(5, 5, '0,0,0', 'torch');
    expect(system.hasAnyLightSource()).toBe(true);
    expect(system.getLightSourceCount()).toBe(1);
  });

  it('should remove a light source', () => {
    const system = new LightingSystem();
    system.addLightSource(5, 5, '0,0,0', 'torch');
    expect(system.getLightSourceCount()).toBe(1);
    system.removeLightSource(5, 5, '0,0,0');
    expect(system.getLightSourceCount()).toBe(0);
  });

  it('should return torch light level at source position', () => {
    const system = new LightingSystem();
    system.addLightSource(5, 5, '0,0,0', 'torch');
    expect(system.getLightLevel(5, 5, '0,0,0')).toBe(LIGHT_LEVEL_TORCH);
  });

  it('should return lava light level at source position', () => {
    const system = new LightingSystem();
    system.addLightSource(5, 5, '0,0,0', 'lava');
    expect(system.getLightLevel(5, 5, '0,0,0')).toBe(LIGHT_LEVEL_LAVA);
  });

  it('should return 0 for unknown positions', () => {
    const system = new LightingSystem();
    expect(system.getLightLevel(5, 5, '0,0,0')).toBe(0);
  });

  it('should propagate torch light in BFS', () => {
    const system = new LightingSystem();
    system.addLightSource(0, 0, '0,0,0', 'torch');

    // Adjacent tiles should have level 13
    expect(system.getLightLevel(1, 0, '0,0,0')).toBe(13);
    expect(system.getLightLevel(-1, 0, '0,0,0')).toBe(13);
    expect(system.getLightLevel(0, 1, '0,0,0')).toBe(13);
    expect(system.getLightLevel(0, -1, '0,0,0')).toBe(13);

    // Two tiles away should have level 12
    expect(system.getLightLevel(2, 0, '0,0,0')).toBe(12);
    expect(system.getLightLevel(1, 1, '0,0,0')).toBe(12);
  });

  it('should propagate lava light from level 15', () => {
    const system = new LightingSystem();
    system.addLightSource(0, 0, '0,0,0', 'lava');

    // Adjacent tiles should have level 14
    expect(system.getLightLevel(1, 0, '0,0,0')).toBe(14);
    expect(system.getLightLevel(0, 1, '0,0,0')).toBe(14);

    // Four tiles away should have level 11
    expect(system.getLightLevel(4, 0, '0,0,0')).toBe(11);
  });

  it('should have two light sources with correct levels', () => {
    const system = new LightingSystem();
    system.addLightSource(0, 0, '0,0,0', 'torch');
    system.addLightSource(10, 0, '0,0,0', 'lava');

    expect(system.getLightSourceCount()).toBe(2);
    expect(system.getLightLevel(0, 0, '0,0,0')).toBe(LIGHT_LEVEL_TORCH);
    expect(system.getLightLevel(10, 0, '0,0,0')).toBe(LIGHT_LEVEL_LAVA);
  });

  it('should combine light from multiple sources (take highest)', () => {
    const system = new LightingSystem();
    system.addLightSource(0, 0, '0,0,0', 'lava'); // level 15
    system.addLightSource(6, 0, '0,0,0', 'torch'); // level 14

    // Position 3 is equidistant: 3 from lava (15-3=12), 3 from torch (14-3=11)
    // Should get the higher value: 12
    expect(system.getLightLevel(3, 0, '0,0,0')).toBe(12);

    // Position 2: 2 from lava (15-2=13), 4 from torch (14-4=10)
    expect(system.getLightLevel(2, 0, '0,0,0')).toBe(13);
  });

  it('should not propagate light across room boundaries', () => {
    const system = new LightingSystem();
    system.addLightSource(5, 5, '0,0,0', 'torch');

    expect(system.getLightLevel(5, 5, '0,0,0')).toBe(LIGHT_LEVEL_TORCH);
    expect(system.getLightLevel(5, 5, '1,1,1')).toBe(0);
  });

  it('should clear cached light map when source is removed', () => {
    const system = new LightingSystem();
    system.addLightSource(0, 0, '0,0,0', 'torch');
    expect(system.getLightLevel(1, 0, '0,0,0')).toBe(13);

    system.removeLightSource(0, 0, '0,0,0');
    expect(system.getLightLevel(1, 0, '0,0,0')).toBe(0);
  });

  it('should identify darkened blocks below threshold', () => {
    const system = new LightingSystem();

    // No light sources = all blocks are darkened
    expect(system.isBlockDarkened(0, 0, '0,0,0')).toBe(true);
    expect(system.isBlockDarkened(100, 100, '0,0,0')).toBe(true);

    // Add a torch - position at torch is not darkened
    system.addLightSource(5, 5, '0,0,0', 'torch');
    expect(system.isBlockDarkened(5, 5, '0,0,0')).toBe(false);

    // A far position should still be darkened
    expect(system.isBlockDarkened(50, 50, '0,0,0')).toBe(true);
  });

  it('should return spawnable positions in dark areas', () => {
    const system = new LightingSystem();

    // No light = all positions are spawnable
    const positions = system.getSpawnablePositions('0,0,0', 0, 0, 2);
    expect(positions.length).toBeGreaterThan(0);
  });

  it('should return no spawnable positions with torch in center', () => {
    const system = new LightingSystem();
    system.addLightSource(0, 0, '0,0,0', 'torch');

    // Within torch range, positions should not be spawnable
    const positions = system.getSpawnablePositions('0,0,0', 0, 0, 3);
    // With torch at level 14, positions up to 7 away are well-lit
    // Within radius 3, all positions should be above threshold 7
    expect(positions.length).toBe(0);
  });

  it('should return spawnable positions beyond torch range', () => {
    const system = new LightingSystem();
    system.addLightSource(0, 0, '0,0,0', 'torch');

    // At distance 8, torch light = 14-8 = 6, which is <= threshold (7)
    const positions = system.getSpawnablePositions('0,0,0', 0, 0, 8);
    expect(positions.length).toBeGreaterThan(0);
  });

  it('should handle multiple rooms independently', () => {
    const system = new LightingSystem();
    system.addLightSource(0, 0, '0,0,0', 'torch');
    system.addLightSource(0, 0, '1,0,0', 'lava');

    expect(system.getLightLevel(0, 0, '0,0,0')).toBe(LIGHT_LEVEL_TORCH);
    expect(system.getLightLevel(0, 0, '1,0,0')).toBe(LIGHT_LEVEL_LAVA);
    expect(system.getLightSourceCount()).toBe(2);
  });

  it('should handle same coordinates in different rooms', () => {
    const system = new LightingSystem();
    system.addLightSource(5, 5, '0,0,0', 'torch');
    system.addLightSource(5, 5, '1,0,0', 'torch');

    expect(system.getLightLevel(5, 5, '0,0,0')).toBe(LIGHT_LEVEL_TORCH);
    expect(system.getLightLevel(5, 5, '1,0,0')).toBe(LIGHT_LEVEL_TORCH);
  });

  it('should clear all light sources', () => {
    const system = new LightingSystem();
    system.addLightSource(0, 0, '0,0,0', 'torch');
    system.addLightSource(1, 0, '0,0,0', 'lava');
    system.clear();

    expect(system.hasAnyLightSource()).toBe(false);
    expect(system.getLightSourceCount()).toBe(0);
    expect(system.getLightLevel(0, 0, '0,0,0')).toBe(0);
  });

  it('should destroy and clear', () => {
    const system = new LightingSystem();
    system.addLightSource(0, 0, '0,0,0', 'torch');
    system.destroy();

    expect(system.hasAnyLightSource()).toBe(false);
    expect(system.getLightSourceCount()).toBe(0);
  });

  it('should use correct threshold constant', () => {
    expect(LIGHT_LEVEL_MOB_SPAWN_THRESHOLD).toBe(7);
  });

  it('should return correct torch constant', () => {
    expect(LIGHT_LEVEL_TORCH).toBe(14);
  });

  it('should return correct lava constant', () => {
    expect(LIGHT_LEVEL_LAVA).toBe(15);
  });

  it('should propagate light diagonally via BFS', () => {
    const system = new LightingSystem();
    system.addLightSource(0, 0, '0,0,0', 'torch');

    // Diagonal distance of sqrt(2) means 2 steps in BFS
    // Position (3, 3) is 6 BFS steps away from (0, 0)
    expect(system.getLightLevel(3, 3, '0,0,0')).toBe(14 - 6);

    // Position (1, 1) is 2 steps away
    expect(system.getLightLevel(1, 1, '0,0,0')).toBe(14 - 2);
  });

  it('should not propagate light below level 0', () => {
    const system = new LightingSystem();
    system.addLightSource(0, 0, '0,0,0', 'torch');

    // Position 15 away should have level 14-15 = -1, clamped to 0
    const levelAt15 = system.getLightLevel(15, 0, '0,0,0');
    expect(levelAt15).toBe(0);

    // Position 14 away should have level 0 (14-14=0)
    const levelAt14 = system.getLightLevel(14, 0, '0,0,0');
    expect(levelAt14).toBe(0);

    // Position 13 away should have level 1
    const levelAt13 = system.getLightLevel(13, 0, '0,0,0');
    expect(levelAt13).toBe(1);
  });

  it('should support getLightLevelAtPosition alias', () => {
    const system = new LightingSystem();
    system.addLightSource(0, 0, '0,0,0', 'torch');
    expect(system.getLightLevelAtPosition(0, 0, '0,0,0')).toBe(LIGHT_LEVEL_TORCH);
    expect(system.getLightLevelAtPosition(1, 0, '0,0,0')).toBe(13);
  });
});
