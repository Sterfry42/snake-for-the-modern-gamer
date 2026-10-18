import { clamp01, lerp } from '../../../core/math.js';
import type { RenderSprite, RenderSpriteKind, WorldRenderScene } from '../worldRenderScene.js';
import { interpolateWorldRenderScene } from './frameInterpolation.js';

export interface Dlss5ClockPhase {
  id: string;
  intervalMs: number;
  accumulatorMs: number;
}

export interface Dlss5InterpolatedSprite {
  id: string;
  kind: RenderSpriteKind;
  x: number;
  y: number;
}

export class Dlss5PresentationProcessor {
  private previousAuthoritativeScene: WorldRenderScene | null = null;
  private currentAuthoritativeScene: WorldRenderScene | null = null;
  private previousSpritesById: ReadonlyMap<string, RenderSprite> = new Map();
  private movingSprites: readonly RenderSprite[] = [];
  private currentAuthoritativeSignature = '';
  private lastStepStartedAtMs = 0;

  acceptAuthoritativeScene(scene: WorldRenderScene, nowMs: number): void {
    const signature = signatureWorldRenderScene(scene);
    if (this.currentAuthoritativeSignature !== signature) {
      this.previousAuthoritativeScene = this.currentAuthoritativeScene;
      this.previousSpritesById = new Map(
        (this.previousAuthoritativeScene?.sprites ?? []).map((sprite) => [sprite.id, sprite]),
      );
      this.currentAuthoritativeScene = scene;
      this.movingSprites = scene.sprites.filter(isRetainedInterpolatedSprite);
      this.currentAuthoritativeSignature = signature;
      this.lastStepStartedAtMs = nowMs;
    }
  }

  process(scene: WorldRenderScene, nowMs: number, stepIntervalMs: number): WorldRenderScene {
    this.acceptAuthoritativeScene(scene, nowMs);
    const interval = Math.max(1, stepIntervalMs);
    const phase = (nowMs - this.lastStepStartedAtMs) / interval;
    return interpolateWorldRenderScene(this.previousAuthoritativeScene, scene, { phase });
  }

  getInterpolatedSprites(clocks: readonly Dlss5ClockPhase[]): readonly Dlss5InterpolatedSprite[] {
    if (!this.currentAuthoritativeScene) {
      return [];
    }

    const phaseByClock = new Map(
      clocks.map((clock) => [
        clock.id,
        clock.intervalMs > 0 ? clamp01(clock.accumulatorMs / clock.intervalMs) : 1,
      ]),
    );

    return this.movingSprites.map((sprite) => {
      const previous = this.previousSpritesById.get(sprite.id);
      const phase = phaseByClock.get(clockIdForSpriteKind(sprite.kind)) ?? 1;
      const position = interpolateSpritePosition(previous, sprite, phase);
      return {
        id: sprite.id,
        kind: sprite.kind,
        x: position.x,
        y: position.y,
      };
    });
  }

  reset(): void {
    this.previousAuthoritativeScene = null;
    this.currentAuthoritativeScene = null;
    this.previousSpritesById = new Map();
    this.movingSprites = [];
    this.currentAuthoritativeSignature = '';
    this.lastStepStartedAtMs = 0;
  }
}

function isRetainedInterpolatedSprite(sprite: RenderSprite): boolean {
  switch (sprite.kind) {
    case 'snake':
    case 'enemy':
    case 'boss':
    case 'npc':
    case 'apple':
    case 'animal':
    case 'projectile':
    case 'bomb':
    case 'football':
    case 'vehicle':
      return true;
    default:
      return false;
  }
}

function signatureWorldRenderScene(scene: WorldRenderScene): string {
  return scene.sprites
    .map(
      (sprite) =>
        `${sprite.id}|${sprite.kind}|${sprite.roomId ?? ''}|${sprite.x}|${sprite.y}|${sprite.width}|${sprite.height}`,
    )
    .sort()
    .join('\n');
}

function interpolateSpritePosition(
  previous: RenderSprite | undefined,
  current: RenderSprite,
  phase: number,
): { x: number; y: number } {
  if (!previous || previous.kind !== current.kind || previous.roomId !== current.roomId) {
    return current;
  }

  const delta = Math.hypot(current.x - previous.x, current.y - previous.y);
  if (delta > 2.25) {
    return current;
  }

  return {
    x: lerp(previous.x, current.x, clamp01(phase)),
    y: lerp(previous.y, current.y, clamp01(phase)),
  };
}

function clockIdForSpriteKind(kind: RenderSpriteKind): string {
  switch (kind) {
    case 'projectile':
    case 'bomb':
    case 'football':
      return 'bullet';
    case 'boss':
      return 'boss';
    case 'enemy':
    case 'animal':
    case 'npc':
    case 'vehicle':
      return 'actor';
    case 'snake':
    case 'apple':
    default:
      return 'action';
  }
}
