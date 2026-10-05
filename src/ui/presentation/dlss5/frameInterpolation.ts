import { clamp01, lerp } from '../../../core/math.js';
import type { RenderSprite, WorldRenderScene } from '../worldRenderScene.js';

export interface FrameInterpolationOptions {
  phase: number;
  maxDeltaTiles?: number;
}

export function interpolateWorldRenderScene(
  previous: WorldRenderScene | null | undefined,
  current: WorldRenderScene,
  options: FrameInterpolationOptions,
): WorldRenderScene {
  if (!previous) {
    return current;
  }

  const phase = clamp01(options.phase);
  if (phase >= 1) {
    return current;
  }

  const previousById = new Map(previous.sprites.map((sprite) => [sprite.id, sprite]));
  const maxDeltaTiles = options.maxDeltaTiles ?? 2.25;
  const sprites = current.sprites.map((sprite) =>
    interpolateSprite(previousById.get(sprite.id), sprite, phase, maxDeltaTiles),
  );

  return {
    ...current,
    rooms: current.rooms,
    effects: current.effects,
    sprites,
  };
}

function interpolateSprite(
  previous: RenderSprite | undefined,
  current: RenderSprite,
  phase: number,
  maxDeltaTiles: number,
): RenderSprite {
  if (!previous || previous.kind !== current.kind) {
    return current;
  }
  if (previous.roomId !== current.roomId) {
    return current;
  }

  const delta = Math.hypot(current.x - previous.x, current.y - previous.y);
  if (delta > maxDeltaTiles) {
    return current;
  }

  const x = lerp(previous.x, current.x, phase);
  const y = lerp(previous.y, current.y, phase);
  if (x === current.x && y === current.y) {
    return current;
  }

  return { ...current, x, y };
}
