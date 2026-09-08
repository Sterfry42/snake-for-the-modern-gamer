import type {
  FirstPersonBillboard,
  FirstPersonCell,
  FirstPersonMaterial,
  FirstPersonWorldView,
} from '../firstPerson/firstPersonTypes.js';
import type { RenderSprite, RenderTile, WorldRenderScene } from './worldRenderScene.js';

const OPEN_MATERIAL: FirstPersonMaterial = {
  id: 'open',
  occludesVision: false,
  wallHeight: 0,
  wallColor: 0,
};

export class RenderSceneSpatialIndex {
  private readonly tiles = new Map<string, RenderTile>();

  constructor(scene: WorldRenderScene) {
    for (const room of scene.rooms) {
      for (const tile of room.tiles) {
        this.tiles.set(tileKey(tile.x, tile.y), tile);
      }
    }
  }

  getTile(x: number, y: number): RenderTile | null {
    return this.tiles.get(tileKey(x, y)) ?? null;
  }
}

export function createFirstPersonSpatialView(
  scene: WorldRenderScene,
  centerRoomId: string,
): FirstPersonWorldView {
  const spatial = new RenderSceneSpatialIndex(scene);
  const centerRoom = scene.rooms.find((room) => room.id === centerRoomId) ?? scene.rooms[0];
  const backgroundColor = centerRoom?.backgroundColor ?? 0x1d332f;
  const wallColor = centerRoom?.wallColor ?? 0x3d665d;
  return {
    width: scene.rooms.reduce(
      (max, room) => Math.max(max, room.offsetX + room.width),
      centerRoom?.width ?? 0,
    ),
    height: scene.rooms.reduce(
      (max, room) => Math.max(max, room.offsetY + room.height),
      centerRoom?.height ?? 0,
    ),
    roomId: centerRoomId,
    skyColor: mixColor(backgroundColor, 0x111a2f, 0.42),
    floorColor: mixColor(backgroundColor, 0x1d1712, 0.35),
    fogColor: mixColor(backgroundColor, wallColor, 0.28),
    getCell(x, y): FirstPersonCell | null {
      const tile = spatial.getTile(x, y);
      if (!tile) return null;
      return {
        x,
        y,
        tile: tile.tile,
        floor: tile.floor,
        material: tile.wall
          ? {
              id: `tile:${tile.tile ?? 'unknown'}`,
              occludesVision: tile.occludesVision,
              wallHeight: 1,
              wallColor: tile.wall.color,
            }
          : OPEN_MATERIAL,
      };
    },
    getBillboards() {
      return scene.sprites
        .map(toFirstPersonBillboard)
        .filter((sprite): sprite is FirstPersonBillboard => Boolean(sprite));
    },
  };
}

function toFirstPersonBillboard(sprite: RenderSprite): FirstPersonBillboard | null {
  if (sprite.kind === 'snake' && sprite.segmentIndex === 0) {
    return null;
  }
  const presentation = sprite.firstPersonPresentation;
  return {
    id: sprite.id,
    kind: sprite.kind === 'snake' ? 'snake-body' : mapBillboardKind(sprite.kind),
    x: sprite.x,
    y: sprite.y,
    width: presentation?.width ?? sprite.width,
    height: presentation?.height ?? sprite.height,
    anchorY: presentation?.anchorY ?? sprite.anchorY,
    color: presentation?.color ?? sprite.color,
    textureKey:
      presentation?.textureKey ??
      sprite.visual.firstPersonTextureKey ??
      sprite.visual.defaultTextureKey,
    roomId: sprite.roomId,
    facing: sprite.facing,
    segmentIndex: sprite.segmentIndex,
  };
}

function mapBillboardKind(kind: RenderSprite['kind']): FirstPersonBillboard['kind'] {
  switch (kind) {
    case 'apple':
      return 'apple';
    case 'enemy':
      return 'enemy';
    case 'boss':
      return 'boss';
    case 'npc':
      return 'npc';
    case 'animal':
      return 'animal';
    default:
      return 'prop';
  }
}

function tileKey(x: number, y: number): string {
  return `${x},${y}`;
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
