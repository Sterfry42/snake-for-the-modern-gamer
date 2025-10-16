import type { Vector2Like } from "../core/math.js";

export interface PortalConfig {
  x: number;
  y: number;
  destRoomId: string;
  destX: number;
  destY: number;
}

export interface RoomSnapshot {
  id: string;
  layout: string[];
  portals: PortalConfig[];
  apple?: Vector2Like;
  treasure?: Vector2Like;
  powerup?: { x: number; y: number; kind: "phase" | "smite" };
  backgroundColor: number;
  wallColor: number;
  wallOutlineColor: number;
}
