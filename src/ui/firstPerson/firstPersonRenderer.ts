import Phaser from 'phaser';
import type { AppleSnapshot } from '../../apples/types.js';
import type { GridConfig } from '../../config/gameConfig.js';
import type { Vector2Like } from '../../core/math.js';
import type { ClientRoomSnapshot } from '../../session/GameSnapshot.js';
import type { ResolvedAtmosphereView } from '../../world/atmosphereTypes.js';
import { approachCamera, createCameraFromHead } from './firstPersonCamera.js';
import { projectBillboard } from './firstPersonProjection.js';
import { castRay } from './firstPersonRaycaster.js';
import type {
  FirstPersonCamera,
  FirstPersonProjectedBillboard,
  FirstPersonWorldView,
} from './firstPersonTypes.js';
import { createFirstPersonWorldView } from './firstPersonWorldView.js';

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
}

export class FirstPersonRenderer {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private camera: FirstPersonCamera | null = null;
  private readonly wallDepth = new Float32Array(INTERNAL_WIDTH);
  private wasVisible = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly grid: GridConfig,
  ) {
    void this.grid;
    this.graphics = scene.add.graphics().setDepth(14).setScrollFactor(0).setVisible(false);
  }

  render(options: FirstPersonRenderOptions): void {
    const head = options.snakeBody[0];
    if (!head) {
      this.hide();
      return;
    }

    const targetCamera = createCameraFromHead(head, options.direction);
    const deltaMs = this.scene.game.loop.delta;
    this.camera = this.camera
      ? approachCamera(this.camera, targetCamera, deltaMs)
      : { ...targetCamera };
    const world = createFirstPersonWorldView({
      room: options.roomSnapshot,
      snakeBody: options.snakeBody,
      apple: options.apple,
    });
    const scaleX = this.scene.scale.width / INTERNAL_WIDTH;
    const scaleY = this.scene.scale.height / INTERNAL_HEIGHT;

    this.graphics.clear();
    this.graphics.setVisible(true);
    this.graphics.fillStyle(this.applyAmbient(world.skyColor, options.atmosphere), 1);
    this.graphics.fillRect(0, 0, this.scene.scale.width, this.scene.scale.height / 2);
    this.graphics.fillStyle(this.applyAmbient(world.floorColor, options.atmosphere), 1);
    this.graphics.fillRect(
      0,
      this.scene.scale.height / 2,
      this.scene.scale.width,
      this.scene.scale.height / 2,
    );
    this.drawWalls(world, this.camera, scaleX, scaleY, options.atmosphere);
    this.drawBillboards(world, this.camera, scaleX, scaleY, options.atmosphere);
    this.drawReticle(scaleX, scaleY);
    this.wasVisible = true;
  }

  hide(): void {
    this.camera = null;
    if (!this.wasVisible) return;
    this.graphics.clear();
    this.graphics.setVisible(false);
    this.wasVisible = false;
  }

  private drawWalls(
    world: FirstPersonWorldView,
    camera: FirstPersonCamera,
    scaleX: number,
    scaleY: number,
    atmosphere?: ResolvedAtmosphereView,
  ): void {
    for (let column = 0; column < INTERNAL_WIDTH; column += 1) {
      const cameraX = (2 * column) / INTERNAL_WIDTH - 1;
      const rayAngle = camera.yaw + Math.atan(cameraX * Math.tan(FOV_RADIANS / 2));
      const hit = castRay(world, camera, rayAngle, { maxDistance: MAX_DISTANCE });
      const correctedDistance = Math.max(0.0001, hit.distance * Math.cos(rayAngle - camera.yaw));
      this.wallDepth[column] = correctedDistance;
      if (!hit.hit || !hit.material) continue;

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
      this.graphics.fillStyle(color, 1);
      this.graphics.fillRect(
        Math.floor(column * scaleX),
        Math.floor(top * scaleY),
        Math.ceil(scaleX),
        Math.ceil(wallHeight * scaleY),
      );
    }
  }

  private drawBillboards(
    world: FirstPersonWorldView,
    camera: FirstPersonCamera,
    scaleX: number,
    scaleY: number,
    atmosphere?: ResolvedAtmosphereView,
  ): void {
    const projected = world
      .getBillboards()
      .map((billboard) =>
        projectBillboard(billboard, camera, {
          width: INTERNAL_WIDTH,
          height: INTERNAL_HEIGHT,
          fovRadians: FOV_RADIANS,
          nearDistance: NEAR_DISTANCE,
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
      this.graphics.fillStyle(color, 1);
      for (let column = start; column <= end; column += 1) {
        if (billboard.distance >= this.wallDepth[column]!) continue;
        const centerOffset =
          Math.abs(column + 0.5 - billboard.screenX) / Math.max(1, billboard.width / 2);
        const columnHeight =
          billboard.height * Math.sqrt(Math.max(0, 1 - centerOffset * centerOffset));
        const top = billboard.bottom - columnHeight;
        this.graphics.fillRect(
          Math.floor(column * scaleX),
          Math.floor(Math.max(0, top) * scaleY),
          Math.ceil(scaleX),
          Math.ceil(Math.min(INTERNAL_HEIGHT, columnHeight) * scaleY),
        );
      }
    }
  }

  private drawReticle(scaleX: number, scaleY: number): void {
    const centerX = (INTERNAL_WIDTH / 2) * scaleX;
    const centerY = (INTERNAL_HEIGHT / 2) * scaleY;
    this.graphics.lineStyle(Math.max(1, Math.floor(scaleX)), 0xe9ecef, 0.65);
    this.graphics.lineBetween(centerX - 5 * scaleX, centerY, centerX - 2 * scaleX, centerY);
    this.graphics.lineBetween(centerX + 2 * scaleX, centerY, centerX + 5 * scaleX, centerY);
    this.graphics.lineBetween(centerX, centerY - 5 * scaleY, centerX, centerY - 2 * scaleY);
    this.graphics.lineBetween(centerX, centerY + 2 * scaleY, centerX, centerY + 5 * scaleY);
  }

  private applyAmbient(color: number, atmosphere?: ResolvedAtmosphereView): number {
    const darknessAlpha = atmosphere?.darkness.darknessAlpha;
    if (typeof darknessAlpha !== 'number') return color;
    return this.scaleColor(color, Math.max(0.25, 1 - darknessAlpha * 0.75));
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
