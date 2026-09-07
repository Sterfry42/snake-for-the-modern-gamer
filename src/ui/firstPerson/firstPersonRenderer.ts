import Phaser from 'phaser';
import type { AppleSnapshot } from '../../apples/types.js';
import type { Vector2Like } from '../../core/math.js';
import type { ClientRoomSnapshot } from '../../session/GameSnapshot.js';
import type { ResolvedAtmosphereView } from '../../world/atmosphereTypes.js';
import { createFirstPersonSpatialView } from '../presentation/renderSceneSpatialIndex.js';
import type { WorldRenderScene } from '../presentation/worldRenderScene.js';
import { shouldHideFirstPersonSelfBodyBillboard } from './firstPersonBodyVisibility.js';
import { approachCamera, createCameraFromHead } from './firstPersonCamera.js';
import { projectBillboard } from './firstPersonProjection.js';
import { castRay } from './firstPersonRaycaster.js';
import type {
  FirstPersonBillboard,
  FirstPersonCamera,
  FirstPersonProjectedBillboard,
  FirstPersonWorldView,
} from './firstPersonTypes.js';

const INTERNAL_WIDTH = 320;
const INTERNAL_HEIGHT = 240;
const FOV_RADIANS = (70 * Math.PI) / 180;
const MAX_DISTANCE = 18;
const NEAR_DISTANCE = 0.2;

export interface FirstPersonRenderOptions {
  roomSnapshot: ClientRoomSnapshot;
  snakeBody: readonly Vector2Like[];
  direction: Vector2Like;
  apple?: AppleSnapshot | null;
  atmosphere?: ResolvedAtmosphereView;
  renderTimeMs?: number;
  manualStepActive?: boolean;
  presentationScene: WorldRenderScene;
}

export class FirstPersonRenderer {
  private readonly texture: Phaser.Textures.CanvasTexture;
  private readonly image: Phaser.GameObjects.Image;
  private readonly context: CanvasRenderingContext2D;
  private camera: FirstPersonCamera | null = null;
  private readonly wallDepth = new Float32Array(INTERNAL_WIDTH);
  private renderedRoomId: string | null = null;

  constructor(private readonly scene: Phaser.Scene) {
    const textureKey = 'first-person:daggerfell-frame';
    const existing = scene.textures.exists(textureKey) ? scene.textures.get(textureKey) : null;
    if (existing instanceof Phaser.Textures.CanvasTexture) {
      this.texture = existing;
    } else {
      const texture = scene.textures.createCanvas(textureKey, INTERNAL_WIDTH, INTERNAL_HEIGHT);
      if (!texture) {
        throw new Error('Unable to create first-person render texture.');
      }
      this.texture = texture;
    }
    this.context = this.texture.getContext();
    this.context.imageSmoothingEnabled = false;
    this.image = scene.add
      .image(0, 0, textureKey)
      .setOrigin(0, 0)
      .setDepth(14)
      .setScrollFactor(0)
      .setVisible(false);
  }

  render(options: FirstPersonRenderOptions): void {
    const head = options.snakeBody[0];
    if (!head) {
      this.hide();
      return;
    }

    const localHead = this.findPresentedSnakeHead(options.presentationScene, head);
    const targetCamera = createCameraFromHead(localHead, options.direction);
    const deltaMs = this.scene.game.loop.delta;
    this.camera =
      this.camera && this.renderedRoomId === options.roomSnapshot.id
        ? approachCamera(this.camera, targetCamera, deltaMs)
        : { ...targetCamera };
    this.renderedRoomId = options.roomSnapshot.id;
    const world = createFirstPersonSpatialView(options.presentationScene, options.roomSnapshot.id);

    this.context.clearRect(0, 0, INTERNAL_WIDTH, INTERNAL_HEIGHT);
    this.context.fillStyle = colorToCss(this.applyAmbient(world.skyColor, options.atmosphere));
    this.context.fillRect(0, 0, INTERNAL_WIDTH, INTERNAL_HEIGHT / 2);
    this.drawFloor(world, this.camera, options.manualStepActive, options.atmosphere);
    if (options.manualStepActive) {
      this.drawManualStepFloor(options.renderTimeMs ?? this.scene.time.now);
    }
    this.drawWalls(world, this.camera, options.atmosphere);
    this.drawBillboards(world, this.camera, options.atmosphere);
    this.drawReticle();
    this.texture.refresh();
    this.image.setDisplaySize(this.scene.scale.width, this.scene.scale.height).setVisible(true);
  }

  hide(): void {
    this.camera = null;
    this.renderedRoomId = null;
    this.image.setVisible(false);
  }

  private drawWalls(
    world: FirstPersonWorldView,
    camera: FirstPersonCamera,
    atmosphere?: ResolvedAtmosphereView,
  ): void {
    for (let column = 0; column < INTERNAL_WIDTH; column += 1) {
      const cameraX = (2 * column) / INTERNAL_WIDTH - 1;
      const rayAngle = camera.yaw + Math.atan(cameraX * Math.tan(FOV_RADIANS / 2));
      const hit = castRay(world, camera, rayAngle, { maxDistance: MAX_DISTANCE });
      const correctedDistance = Math.max(0.0001, hit.distance * Math.cos(rayAngle - camera.yaw));
      this.wallDepth[column] = correctedDistance;
      if (!hit.hit || !hit.material) {
        const fogAmount = Math.max(0.18, 1 - correctedDistance / MAX_DISTANCE);
        this.context.fillStyle = colorToCss(this.applyAmbient(world.fogColor, atmosphere));
        this.context.globalAlpha = 0.28 * fogAmount;
        this.context.fillRect(column, 0, 1, INTERNAL_HEIGHT);
        this.context.globalAlpha = 1;
        continue;
      }

      const wallHeight = Math.min(
        INTERNAL_HEIGHT * 2,
        (INTERNAL_HEIGHT / correctedDistance) * hit.material.wallHeight,
      );
      const top = Math.max(0, INTERNAL_HEIGHT / 2 - wallHeight / 2);
      const shade = hit.side === 'y' ? 0.84 : 1;
      const color = this.applyFog(
        this.scaleColor(hit.material.wallColor, shade),
        world.fogColor,
        correctedDistance,
        atmosphere,
      );
      this.context.fillStyle = colorToCss(color);
      this.context.fillRect(column, Math.floor(top), 1, Math.ceil(wallHeight));
    }
  }

  private drawFloor(
    world: FirstPersonWorldView,
    camera: FirstPersonCamera,
    manualStepActive: boolean | undefined,
    atmosphere?: ResolvedAtmosphereView,
  ): void {
    const horizon = INTERNAL_HEIGHT / 2;
    const cameraHeight = 0.52;
    const tanHalfFov = Math.tan(FOV_RADIANS / 2);
    for (let y = horizon; y < INTERNAL_HEIGHT; y += 2) {
      const depth = cameraHeight / Math.max(0.01, y / INTERNAL_HEIGHT - 0.5);
      const shade = Math.max(0.32, Math.min(1, 1 - depth / (MAX_DISTANCE * 1.12)));
      for (let x = 0; x < INTERNAL_WIDTH; x += 2) {
        const cameraX = (2 * x) / INTERNAL_WIDTH - 1;
        const rayAngle = camera.yaw + Math.atan(cameraX * tanHalfFov);
        const floorX = Math.floor(camera.x + Math.cos(rayAngle) * depth);
        const floorY = Math.floor(camera.y + Math.sin(rayAngle) * depth);
        const cell = world.getCell(floorX, floorY);
        const baseColor = cell?.floor.color ?? world.floorColor;
        const tinted = this.resolveFloorColor(baseColor, manualStepActive, atmosphere);
        this.context.fillStyle = colorToCss(this.scaleColor(tinted, shade));
        this.context.fillRect(x, y, 2, 2);
      }
    }
  }

  private drawBillboards(
    world: FirstPersonWorldView,
    camera: FirstPersonCamera,
    atmosphere?: ResolvedAtmosphereView,
  ): void {
    const projected = world
      .getBillboards()
      .filter((billboard) => !this.isImmediateSelfBodyBillboard(billboard))
      .map((billboard) =>
        projectBillboard(billboard, camera, {
          width: INTERNAL_WIDTH,
          height: INTERNAL_HEIGHT,
          fovRadians: FOV_RADIANS,
          nearDistance: NEAR_DISTANCE,
          cameraHeight: 0.52,
        }),
      )
      .filter((billboard): billboard is FirstPersonProjectedBillboard => Boolean(billboard))
      .sort((a, b) => b.distance - a.distance);

    for (const billboard of projected) {
      const start = Math.max(0, Math.floor(billboard.left));
      const end = Math.min(INTERNAL_WIDTH - 1, Math.ceil(billboard.right));
      const color = this.applyFog(
        billboard.billboard.color,
        world.fogColor,
        billboard.distance,
        atmosphere,
      );
      const source = this.getTextureSource(billboard.billboard.textureKey);
      if (!source) {
        this.context.fillStyle = colorToCss(color);
      }
      for (let column = start; column <= end; column += 1) {
        if (billboard.distance >= this.wallDepth[column]!) continue;
        const top = Math.max(0, Math.floor(billboard.top));
        const bottom = Math.min(INTERNAL_HEIGHT, Math.ceil(billboard.bottom));
        if (bottom <= top) continue;
        if (source) {
          const u = (column - billboard.left) / Math.max(1, billboard.width);
          const sx = Math.max(0, Math.min(source.width - 1, Math.floor(u * source.width)));
          this.context.globalAlpha = Math.max(0.35, 1 - billboard.distance / (MAX_DISTANCE * 1.3));
          this.context.drawImage(source, sx, 0, 1, source.height, column, top, 1, bottom - top);
          this.context.globalAlpha = 1;
        } else {
          this.context.fillRect(column, top, 1, bottom - top);
        }
      }
    }
  }

  private drawReticle(): void {
    const centerX = INTERNAL_WIDTH / 2;
    const centerY = INTERNAL_HEIGHT / 2;
    this.context.strokeStyle = 'rgba(233,238,239,0.72)';
    this.context.lineWidth = 1;
    this.context.beginPath();
    this.context.moveTo(centerX - 5, centerY);
    this.context.lineTo(centerX - 2, centerY);
    this.context.moveTo(centerX + 2, centerY);
    this.context.lineTo(centerX + 5, centerY);
    this.context.moveTo(centerX, centerY - 5);
    this.context.lineTo(centerX, centerY - 2);
    this.context.moveTo(centerX, centerY + 2);
    this.context.lineTo(centerX, centerY + 5);
    this.context.stroke();
  }

  private isImmediateSelfBodyBillboard(billboard: FirstPersonBillboard): boolean {
    return shouldHideFirstPersonSelfBodyBillboard(billboard);
  }

  private drawManualStepFloor(renderTimeMs: number): void {
    const pulse = 0.42 + Math.sin(renderTimeMs / 180) * 0.16;
    this.context.strokeStyle = `rgba(115, 255, 214, ${pulse.toFixed(3)})`;
    this.context.lineWidth = 1;
    for (let y = INTERNAL_HEIGHT / 2 + 20; y < INTERNAL_HEIGHT; y += 18) {
      const spread = (y - INTERNAL_HEIGHT / 2) / (INTERNAL_HEIGHT / 2);
      const halfWidth = INTERNAL_WIDTH * Math.min(0.55, spread * 0.7);
      this.context.beginPath();
      this.context.moveTo(INTERNAL_WIDTH / 2 - halfWidth, y);
      this.context.lineTo(INTERNAL_WIDTH / 2 + halfWidth, y);
      this.context.stroke();
    }
    for (const x of [-0.44, -0.22, 0.22, 0.44]) {
      this.context.beginPath();
      this.context.moveTo(INTERNAL_WIDTH / 2, INTERNAL_HEIGHT / 2);
      this.context.lineTo(INTERNAL_WIDTH / 2 + INTERNAL_WIDTH * x, INTERNAL_HEIGHT);
      this.context.stroke();
    }
  }

  private findPresentedSnakeHead(scene: WorldRenderScene, fallback: Vector2Like): Vector2Like {
    const head = scene.sprites.find(
      (sprite) => sprite.kind === 'snake' && sprite.segmentIndex === 0,
    );
    return head ? { x: head.x - 0.5, y: head.y - 0.5 } : fallback;
  }

  private getTextureSource(
    textureKey: string | undefined,
  ): HTMLCanvasElement | HTMLImageElement | null {
    if (!textureKey || !this.scene.textures.exists(textureKey)) return null;
    const source = this.scene.textures.get(textureKey).getSourceImage();
    return source instanceof HTMLCanvasElement || source instanceof HTMLImageElement
      ? source
      : null;
  }

  private applyAmbient(color: number, atmosphere?: ResolvedAtmosphereView): number {
    const darknessAlpha = atmosphere?.darkness.darknessAlpha;
    if (typeof darknessAlpha !== 'number') return color;
    return this.scaleColor(color, Math.max(0.25, 1 - darknessAlpha * 0.75));
  }

  private resolveFloorColor(
    color: number,
    manualStepActive: boolean | undefined,
    atmosphere?: ResolvedAtmosphereView,
  ): number {
    const ambient = this.applyAmbient(color, atmosphere);
    return manualStepActive ? mixColor(ambient, 0x43ffd0, 0.18) : ambient;
  }

  private applyFog(
    color: number,
    fogColor: number,
    distance: number,
    atmosphere?: ResolvedAtmosphereView,
  ): number {
    const visibilityScalar = atmosphere?.gameplay.visibilityScalar ?? 1;
    const weatherFog = visibilityScalar < 1 ? (1 - visibilityScalar) * 0.55 : 0;
    const darknessFog = atmosphere?.darkness.darknessAlpha ?? 0;
    const amount = Math.max(
      0,
      Math.min(0.92, distance / MAX_DISTANCE + weatherFog + darknessFog * 0.3),
    );
    return mixColor(color, this.applyAmbient(fogColor, atmosphere), amount);
  }

  private scaleColor(color: number, scale: number): number {
    const r = Math.round(((color >> 16) & 0xff) * scale);
    const g = Math.round(((color >> 8) & 0xff) * scale);
    const b = Math.round((color & 0xff) * scale);
    return (r << 16) | (g << 8) | b;
  }
}

function colorToCss(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

function mixColor(a: number, b: number, amount: number): number {
  const ar = (a >> 16) & 0xff;
  const ag = (a >> 8) & 0xff;
  const ab = a & 0xff;
  const br = (b >> 16) & 0xff;
  const bg = (b >> 8) & 0xff;
  const bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * amount);
  const g = Math.round(ag + (bg - ag) * amount);
  const blue = Math.round(ab + (bb - ab) * amount);
  return (r << 16) | (g << 8) | blue;
}
