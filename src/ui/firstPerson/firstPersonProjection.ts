import type {
  FirstPersonBillboard,
  FirstPersonCamera,
  FirstPersonProjectedBillboard,
} from './firstPersonTypes.js';

export interface ProjectionOptions {
  width: number;
  height: number;
  fovRadians: number;
  nearDistance: number;
  cameraHeight?: number;
}

export function projectBillboard(
  billboard: FirstPersonBillboard,
  camera: FirstPersonCamera,
  options: ProjectionOptions,
): FirstPersonProjectedBillboard | null {
  const dx = billboard.x - camera.x;
  const dy = billboard.y - camera.y;
  const cos = Math.cos(camera.yaw);
  const sin = Math.sin(camera.yaw);
  const forward = dx * cos + dy * sin;
  const right = -dx * sin + dy * cos;
  if (forward <= options.nearDistance) return null;

  const halfFov = options.fovRadians / 2;
  const angle = Math.atan2(right, forward);
  if (Math.abs(angle) > halfFov + 0.35) return null;

  const projectionPlane = options.width / (2 * Math.tan(halfFov));
  const screenX = options.width / 2 + (right / forward) * projectionPlane;
  const height = (billboard.height / forward) * projectionPlane;
  const width = (billboard.width / forward) * projectionPlane;
  const cameraHeight = options.cameraHeight ?? 0.52;
  const bottom =
    options.height / 2 +
    ((cameraHeight + billboard.height * (1 - billboard.anchorY)) / forward) * projectionPlane;
  const top = bottom - height;
  const left = screenX - width / 2;
  const rightEdge = screenX + width / 2;

  return {
    billboard,
    distance: forward,
    screenX,
    width,
    height,
    top,
    bottom,
    left,
    right: rightEdge,
  };
}
