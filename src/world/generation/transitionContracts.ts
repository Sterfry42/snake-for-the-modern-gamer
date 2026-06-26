import type { GridConfig } from '../../config/gameConfig.js';
import type { TransitionKind } from '../biomes.js';
import { areBiomesCompatible } from './biomeCompatibility.js';
import type { BiomeMap } from './biomeMap.js';
import type { EdgeAccessPlan, EdgeSide } from './edgeAccess.js';
import { hashWorldCoordinate } from './worldHash.js';
import type { WorldGenerationIdentity } from './worldGenerationIdentity.js';

export interface TransitionContract {
  side: EdgeSide;
  kind: TransitionKind;
  passable: boolean;
  openingCenter: number;
  openingWidth: number;
  runupDepth: number;
}

const SIDES: readonly EdgeSide[] = ['north', 'south', 'west', 'east'];

function parseRoomId(roomId: string): { x: number; y: number; z: number } {
  const [x = 0, y = 0, z = 0] = roomId.split(',').map(Number);
  return { x, y, z };
}

function neighborForSide(
  room: { x: number; y: number; z: number },
  side: EdgeSide,
): { x: number; y: number; z: number } {
  switch (side) {
    case 'north':
      return { ...room, y: room.y - 1 };
    case 'south':
      return { ...room, y: room.y + 1 };
    case 'west':
      return { ...room, x: room.x - 1 };
    case 'east':
      return { ...room, x: room.x + 1 };
  }
}

function canonicalEdge(
  room: { x: number; y: number; z: number },
  side: EdgeSide,
): { x: number; y: number; z: number; orientation: 'horizontal' | 'vertical' } {
  if (side === 'west') return { x: room.x - 1, y: room.y, z: room.z, orientation: 'vertical' };
  if (side === 'east') return { x: room.x, y: room.y, z: room.z, orientation: 'vertical' };
  if (side === 'north') return { x: room.x, y: room.y - 1, z: room.z, orientation: 'horizontal' };
  return { x: room.x, y: room.y, z: room.z, orientation: 'horizontal' };
}

function openingCenter(side: EdgeSide, grid: GridConfig, hash: number): number {
  const span = side === 'north' || side === 'south' ? grid.cols : grid.rows;
  const margin = 5;
  const range = Math.max(1, span - margin * 2);
  return margin + (hash % range);
}

function transitionKind(args: {
  roomId: string;
  side: EdgeSide;
  biomeMap: BiomeMap;
}): { kind: TransitionKind; passable: boolean } {
  const room = parseRoomId(args.roomId);
  const neighbor = neighborForSide(room, args.side);
  const first = args.biomeMap.getBiomeForRoomId(args.roomId);
  const second = args.biomeMap.getBiomeForRoomId(`${neighbor.x},${neighbor.y},${neighbor.z}`);
  const compatibility = areBiomesCompatible(first, second);
  if (!compatibility.compatible) {
    return { kind: 'blocked', passable: false };
  }
  if (compatibility.requiresTransition) {
    return { kind: compatibility.requiresTransition, passable: compatibility.requiresTransition !== 'blocked' };
  }
  return { kind: 'open', passable: true };
}

export class TransitionContractResolver {
  constructor(
    private readonly identity: WorldGenerationIdentity,
    private readonly biomeMap: BiomeMap,
    private readonly grid: GridConfig,
  ) {}

  resolveForRoom(roomId: string): TransitionContract[] {
    return SIDES.map((side) => this.resolve(roomId, side));
  }

  resolve(roomId: string, side: EdgeSide): TransitionContract {
    const room = parseRoomId(roomId);
    const edge = canonicalEdge(room, side);
    const hash = hashWorldCoordinate({
      x: edge.x,
      y: edge.y,
      z: edge.z,
      salt: this.identity.worldSalt,
      featureSalt: edge.orientation === 'vertical' ? 0xedd1 : 0xedd2,
    });
    const transition = transitionKind({ roomId, side, biomeMap: this.biomeMap });
    return {
      side,
      kind: transition.kind,
      passable: transition.passable,
      openingCenter: openingCenter(side, this.grid, hash),
      openingWidth: transition.kind === 'shoreline' ? 9 : transition.kind === 'forest-threshold' ? 5 : 7,
      runupDepth: 5,
    };
  }

  toEdgeAccessPlan(contract: TransitionContract): EdgeAccessPlan {
    return {
      side: contract.side,
      open: contract.passable,
      openingCenter: contract.openingCenter,
      openingWidth: contract.openingWidth,
      runupDepth: contract.runupDepth,
      reason: contract.kind === 'forest-threshold' ? 'forestMouth' : 'normalExit',
    };
  }
}

