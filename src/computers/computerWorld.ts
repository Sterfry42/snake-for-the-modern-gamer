import type { RoomSnapshot } from '../world/types.js';
import type { ComputerSaveData, ComputerTemplate } from './computerRuntime.js';

export const PERSONAL_COMPUTER_ITEM_ID = 'personal-computer';
export const HOME_COMPUTER_FLAG = 'house.computer';

export interface ComputerLocation {
  id: string;
  roomId: string;
  x: number;
  y: number;
  hostname: string;
  template: ComputerTemplate;
}

export interface HomeComputerRecord {
  location: ComputerLocation;
  state: ComputerSaveData;
}

/** A computer is an overlay, not a terrain stamp. */
export function homeComputerLocation(roomId: string, x: number, y: number): ComputerLocation {
  return {
    id: 'home-computer',
    roomId,
    x,
    y,
    hostname: 'home-pc',
    template: 'home',
  };
}

export function isHomeComputerSurface(tile: string | undefined): boolean {
  return tile === 'W' || tile === 'K';
}

export function computerIsWithinReach(
  computer: ComputerLocation,
  roomId: string,
  position: { x: number; y: number },
): boolean {
  return (
    computer.roomId === roomId &&
    Math.abs(computer.x - position.x) + Math.abs(computer.y - position.y) <= 1
  );
}

/** Stable row-major selection of an NPC counter bordering interior floor. */
export function townComputerLocation(
  room: Pick<RoomSnapshot, 'id' | 'layout'>,
  templateId: string | undefined,
): ComputerLocation | undefined {
  const template = templateId === 'tavern' ? 'barkeep' : templateId === 'townHall' ? 'mayor' : null;
  if (!template) return undefined;
  for (let y = 0; y < room.layout.length; y += 1) {
    const row = room.layout[y];
    for (let x = 0; x < row.length; x += 1) {
      if (row[x] !== 'A') continue;
      const neighbors = [
        room.layout[y - 1]?.[x],
        room.layout[y + 1]?.[x],
        row[x - 1],
        row[x + 1],
      ];
      if (!neighbors.includes('W')) continue;
      return {
        id: `computer:${room.id}:${template}`,
        roomId: room.id,
        x,
        y,
        hostname: template === 'barkeep' ? 'tavern-pc' : 'town-hall-pc',
        template,
      };
    }
  }
  return undefined;
}
