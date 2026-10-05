import type { WorldRenderScene } from '../worldRenderScene.js';
import { interpolateWorldRenderScene } from './frameInterpolation.js';

export class Dlss5PresentationProcessor {
  private previousAuthoritativeScene: WorldRenderScene | null = null;
  private currentAuthoritativeScene: WorldRenderScene | null = null;
  private currentAuthoritativeSignature = '';
  private lastStepStartedAtMs = 0;

  acceptAuthoritativeScene(scene: WorldRenderScene, nowMs: number): void {
    const signature = signatureWorldRenderScene(scene);
    if (this.currentAuthoritativeSignature !== signature) {
      this.previousAuthoritativeScene = this.currentAuthoritativeScene;
      this.currentAuthoritativeScene = scene;
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

  reset(): void {
    this.previousAuthoritativeScene = null;
    this.currentAuthoritativeScene = null;
    this.currentAuthoritativeSignature = '';
    this.lastStepStartedAtMs = 0;
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
