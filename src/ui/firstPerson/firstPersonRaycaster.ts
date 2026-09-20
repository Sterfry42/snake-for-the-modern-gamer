import type {
  FirstPersonCamera,
  FirstPersonRayHit,
  FirstPersonWorldView,
} from './firstPersonTypes.js';

export interface CastRayOptions {
  maxDistance: number;
}

export function castRay(
  world: FirstPersonWorldView,
  camera: FirstPersonCamera,
  rayAngle: number,
  options: CastRayOptions,
): FirstPersonRayHit {
  const rayDirX = Math.cos(rayAngle);
  const rayDirY = Math.sin(rayAngle);
  let mapX = Math.floor(camera.x);
  let mapY = Math.floor(camera.y);
  const deltaDistX = rayDirX === 0 ? Number.POSITIVE_INFINITY : Math.abs(1 / rayDirX);
  const deltaDistY = rayDirY === 0 ? Number.POSITIVE_INFINITY : Math.abs(1 / rayDirY);
  const stepX = rayDirX < 0 ? -1 : 1;
  const stepY = rayDirY < 0 ? -1 : 1;
  let sideDistX = rayDirX < 0 ? (camera.x - mapX) * deltaDistX : (mapX + 1 - camera.x) * deltaDistX;
  let sideDistY = rayDirY < 0 ? (camera.y - mapY) * deltaDistY : (mapY + 1 - camera.y) * deltaDistY;
  let side: 'x' | 'y' = 'x';
  let distance = 0;

  while (distance <= options.maxDistance) {
    if (sideDistX < sideDistY) {
      mapX += stepX;
      distance = sideDistX;
      sideDistX += deltaDistX;
      side = 'x';
    } else {
      mapY += stepY;
      distance = sideDistY;
      sideDistY += deltaDistY;
      side = 'y';
    }

    const cell = world.getCell(mapX, mapY);
    if (!cell) {
      return emptyHit(camera, rayDirX, rayDirY, mapX, mapY, distance, side);
    }
    if (cell.material.occludesVision) {
      return {
        hit: true,
        x: camera.x + rayDirX * distance,
        y: camera.y + rayDirY * distance,
        mapX,
        mapY,
        distance,
        side,
        material: cell.material,
      };
    }
  }

  return emptyHit(
    camera,
    rayDirX,
    rayDirY,
    Math.floor(camera.x + rayDirX * options.maxDistance),
    Math.floor(camera.y + rayDirY * options.maxDistance),
    options.maxDistance,
    side,
  );
}

function emptyHit(
  camera: FirstPersonCamera,
  rayDirX: number,
  rayDirY: number,
  mapX: number,
  mapY: number,
  distance: number,
  side: 'x' | 'y',
): FirstPersonRayHit {
  return {
    hit: false,
    x: camera.x + rayDirX * distance,
    y: camera.y + rayDirY * distance,
    mapX,
    mapY,
    distance,
    side,
    material: null,
  };
}
