import { describe, expect, it } from 'vitest';
import type { WorldRenderScene } from '../worldRenderScene.js';
import { interpolateWorldRenderScene } from './frameInterpolation.js';

function scene(sprite: WorldRenderScene['sprites'][number]): WorldRenderScene {
  return { rooms: [], sprites: [sprite], effects: [] };
}

function sprite(
  overrides: Partial<WorldRenderScene['sprites'][number]> = {},
): WorldRenderScene['sprites'][number] {
  return {
    id: 'snake:0',
    kind: 'snake',
    x: 1,
    y: 1,
    width: 1,
    height: 1,
    anchorY: 1,
    color: 0xffffff,
    visual: { defaultTextureKey: 'snake' },
    roomId: '0,0,0',
    ...overrides,
  };
}

describe('DLSS 5 frame interpolation', () => {
  it('interpolates matched moving sprite coordinates without mutating the current scene', () => {
    const previous = scene(sprite({ x: 1, y: 1 }));
    const current = scene(sprite({ x: 3, y: 2 }));

    const result = interpolateWorldRenderScene(previous, current, { phase: 0.5 });

    expect(result.sprites[0]).toMatchObject({ x: 2, y: 1.5 });
    expect(current.sprites[0]).toMatchObject({ x: 3, y: 2 });
  });

  it('clamps phase to the supported range', () => {
    const previous = scene(sprite({ x: 1, y: 1 }));
    const current = scene(sprite({ x: 2, y: 2 }));

    expect(interpolateWorldRenderScene(previous, current, { phase: -1 }).sprites[0]).toMatchObject({
      x: 1,
      y: 1,
    });
    expect(interpolateWorldRenderScene(previous, current, { phase: 2 }).sprites[0]).toBe(
      current.sprites[0],
    );
  });

  it('snaps across room changes and large discontinuities', () => {
    const previous = scene(sprite({ x: 1, y: 1 }));
    const roomChanged = scene(sprite({ x: 1.5, y: 1, roomId: '1,0,0' }));
    const jumped = scene(sprite({ x: 20, y: 20 }));

    expect(interpolateWorldRenderScene(previous, roomChanged, { phase: 0.5 }).sprites[0]).toBe(
      roomChanged.sprites[0],
    );
    expect(interpolateWorldRenderScene(previous, jumped, { phase: 0.5 }).sprites[0]).toBe(
      jumped.sprites[0],
    );
  });

  it('does not keep missing current sprites alive', () => {
    const previous = scene(sprite({ id: 'snake:0' }));
    const current: WorldRenderScene = { rooms: [], sprites: [], effects: [] };

    expect(interpolateWorldRenderScene(previous, current, { phase: 0.5 }).sprites).toEqual([]);
  });

  it('interpolates every stable render sprite kind without a kind allowlist', () => {
    const previous = scene(sprite({ id: 'furniture:chair', kind: 'furniture', x: 4, y: 4 }));
    const current = scene(sprite({ id: 'furniture:chair', kind: 'furniture', x: 5, y: 4 }));

    expect(
      interpolateWorldRenderScene(previous, current, { phase: 0.25 }).sprites[0],
    ).toMatchObject({
      x: 4.25,
      y: 4,
    });
  });
});
