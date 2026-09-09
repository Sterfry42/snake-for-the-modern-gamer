import type { Vector2Like } from '../../core/math.js';
import type { ResolvedAtmosphereView } from '../../world/atmosphereTypes.js';

export interface SurfaceVisual {
  color: number;
  textureKey?: string;
  alpha?: number;
}

export interface RenderTile {
  x: number;
  y: number;
  floor: SurfaceVisual;
  wall?: SurfaceVisual;
  occludesVision: boolean;
  tile?: string;
}

export interface RenderRoom {
  id: string;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
  backgroundColor: number;
  wallColor: number;
  tiles: readonly RenderTile[];
}

export type RenderSpriteKind =
  | 'snake'
  | 'enemy'
  | 'boss'
  | 'npc'
  | 'apple'
  | 'animal'
  | 'vegetation'
  | 'furniture'
  | 'powerup'
  | 'projectile'
  | 'bomb'
  | 'football'
  | 'vehicle'
  | 'treasure'
  | 'prop';

export interface RenderSpriteVisual {
  defaultTextureKey: string;
  firstPersonTextureKey?: string;
}

export interface RenderSpriteProjectionPresentation {
  textureKey?: string;
  width?: number;
  height?: number;
  anchorY?: number;
  color?: number;
}

export interface RenderSprite {
  id: string;
  kind: RenderSpriteKind;
  x: number;
  y: number;
  width: number;
  height: number;
  anchorY: number;
  color: number;
  visual: RenderSpriteVisual;
  topDownPresentation?: RenderSpriteProjectionPresentation;
  firstPersonPresentation?: RenderSpriteProjectionPresentation;
  badges?: readonly string[];
  roomId?: string;
  facing?: Vector2Like;
  segmentIndex?: number;
}

export interface RenderEffect {
  id: string;
  kind: string;
  x?: number;
  y?: number;
  radius?: number;
  color?: number;
  intensity?: number;
}

export interface WorldRenderScene {
  rooms: readonly RenderRoom[];
  sprites: readonly RenderSprite[];
  effects: readonly RenderEffect[];
  atmosphere?: ResolvedAtmosphereView;
}
