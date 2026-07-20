import type { AnimalType } from './types.js';
import { getTameInfo } from './taming.js';

export interface HerdMember {
  animalId: string;
  type: AnimalType;
  roomId: string;
  followOffset: number;
}

export interface HerdConfig {
  maxMembers: number;
  followGap: number;
}

const DEFAULT_HERD_CONFIG: HerdConfig = {
  maxMembers: 5,
  followGap: 2,
};

export function isHerdableType(type: AnimalType): boolean {
  const tameInfo = getTameInfo(type);
  return tameInfo !== null && tameInfo.tameScore <= 15;
}

export function createHerdMember(
  animalId: string,
  type: AnimalType,
  roomId: string,
  offset: number,
): HerdMember {
  return { animalId, type, roomId, followOffset: offset };
}

export function getHerdConfig(): HerdConfig {
  return DEFAULT_HERD_CONFIG;
}

export function calculateFollowPosition(
  snakeBody: Array<{ x: number; y: number }>,
  herdMember: HerdMember,
  _gridCols: number,
  _gridRows: number,
): { x: number; y: number } | null {
  const gap = herdMember.followOffset * DEFAULT_HERD_CONFIG.followGap;
  const bodyIndex = gap;

  if (bodyIndex >= snakeBody.length) {
    return null;
  }

  const target = snakeBody[bodyIndex];
  if (!target) {
    return null;
  }

  return { x: target.x, y: target.y };
}

export function getHerdableTypes(): AnimalType[] {
  return ['rabbit', 'deer', 'jackalope'] as AnimalType[];
}

export function isHerdingBiome(biomeId: string): boolean {
  return ['verdigris-basin', 'gloam-garden', 'elderwood-maze', 'liberty-badlands'].includes(
    biomeId,
  );
}
