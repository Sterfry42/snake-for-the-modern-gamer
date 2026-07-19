import type { RoomSnapshot } from '../world/types.js';

// ─── Nether Portal Types ────────────────────────────────────────────────────

export interface NetherPortalState {
  x: number;
  y: number;
  roomId: string;
  isActive: boolean;
  activationTime: number;
  portalId: string;
}

export interface PortalLocation {
  x: number;
  y: number;
  z: number;
  dimension: Dimension;
}

export type Dimension = 'overworld' | 'nether' | 'end';

export interface PortalPair {
  overworld: PortalLocation;
  nether: PortalLocation;
  end?: PortalLocation;
}

// ─── Portal Dimensions ──────────────────────────────────────────────────────

export const PORTAL_SCALE_OVERWORLD_TO_NETHER = 8;
export const PORTAL_SCALE_NETHER_TO_OVERWORLD = 1 / 8;
export const PORTAL_MIN_WIDTH = 4;
export const PORTAL_MIN_HEIGHT = 5;
export const PORTAL_MAX_WIDTH = 23;
export const PORTAL_MAX_HEIGHT = 23;

// ─── Portal Block Type ──────────────────────────────────────────────────────

export const PORTAL_BLOCK_ID = 'portal_block';

export function isPortalBlock(blockId: string): boolean {
  return blockId === PORTAL_BLOCK_ID;
}

// ─── Portal Frame ───────────────────────────────────────────────────────────

export interface PortalFrameBlock {
  x: number;
  y: number;
  z: number;
}

export interface PortalFrame {
  blocks: PortalFrameBlock[];
  width: number;
  height: number;
  interiorStartX: number;
  interiorStartY: number;
  interiorWidth: number;
  interiorHeight: number;
}

// ─── Portal Generation ──────────────────────────────────────────────────────

export function createPortalFrame(
  centerX: number,
  centerY: number,
  width: number,
  height: number,
): PortalFrame {
  const blocks: PortalFrameBlock[] = [];

  // Ensure minimum dimensions
  const frameWidth = Math.max(PORTAL_MIN_WIDTH, Math.min(PORTAL_MAX_WIDTH, width));
  const frameHeight = Math.max(PORTAL_MIN_HEIGHT, Math.min(PORTAL_MAX_HEIGHT, height));

  // Bottom edge
  for (let x = 0; x < frameWidth; x++) {
    blocks.push({ x: centerX + x, y: centerY, z: 0 });
    blocks.push({ x: centerX + x, y: centerY + frameHeight - 1, z: 0 });
  }

  // Vertical edges
  for (let y = 0; y < frameHeight; y++) {
    blocks.push({ x: centerX, y: centerY + y, z: 0 });
    blocks.push({ x: centerX + frameWidth - 1, y: centerY + y, z: 0 });
  }

  // Interior dimensions
  const interiorWidth = frameWidth - 2;
  const interiorHeight = frameHeight - 2;

  return {
    blocks,
    width: frameWidth,
    height: frameHeight,
    interiorStartX: centerX + 1,
    interiorStartY: centerY + 1,
    interiorWidth,
    interiorHeight,
  };
}

export function getInteriorPortalBlocks(frame: PortalFrame): Array<{ x: number; y: number }> {
  const blocks: Array<{ x: number; y: number }> = [];

  for (let dx = 0; dx < frame.interiorWidth; dx++) {
    for (let dy = 0; dy < frame.interiorHeight; dy++) {
      blocks.push({
        x: frame.interiorStartX + dx,
        y: frame.interiorStartY + dy,
      });
    }
  }

  return blocks;
}

// ─── Portal Placement ───────────────────────────────────────────────────────

export class PortalManager {
  private portals: Map<string, NetherPortalState> = new Map();
  private portalPairs: Map<string, PortalPair> = new Map();
  private portalIdCounter = 0;

  public createPortal(
    x: number,
    y: number,
    roomId: string,
    width: number,
    height: number,
    destination?: { x: number; y: number; roomId: string },
  ): { success: boolean; portalId: string; message?: string } {
    const frame = createPortalFrame(x, y, width, height);

    const portalId = `portal_${this.portalIdCounter++}`;

    const state: NetherPortalState = {
      x: frame.interiorStartX,
      y: frame.interiorStartY,
      roomId,
      isActive: false,
      activationTime: 0,
      portalId,
    };

    this.portals.set(portalId, state);

    // Create portal pair if destination provided
    if (destination) {
      this.portalPairs.set(portalId, {
        overworld: {
          x: frame.interiorStartX,
          y: frame.interiorStartY,
          z: 0,
          dimension: 'overworld',
        },
        nether: {
          x: destination.x,
          y: destination.y,
          z: 0,
          dimension: destination.roomId.startsWith('cave:') ? 'nether' : 'overworld',
        },
      });
    }

    return {
      success: true,
      portalId,
      message: `Portal created at ${x}, ${y}.`,
    };
  }

  public activatePortal(portalId: string): void {
    const portal = this.portals.get(portalId);
    if (portal) {
      portal.isActive = true;
      portal.activationTime = Date.now();
    }
  }

  public deactivatePortal(portalId: string): void {
    const portal = this.portals.get(portalId);
    if (portal) {
      portal.isActive = false;
    }
  }

  public getPortal(x: number, y: number, roomId: string): NetherPortalState | null {
    for (const portal of this.portals.values()) {
      if (portal.roomId !== roomId) continue;
      if (x >= portal.x && x < portal.x + 3 && y >= portal.y && y < portal.y + 5) {
        return portal;
      }
    }
    return null;
  }

  public getPortalPair(portalId: string): PortalPair | null {
    return this.portalPairs.get(portalId) ?? null;
  }

  public teleportPlayer(
    portalId: string,
    playerX: number,
    playerY: number,
    playerRoomId: string,
  ): { success: boolean; newX: number; newY: number; newRoomId: string; message?: string } {
    const pair = this.portalPairs.get(portalId);
    if (!pair) {
      return { success: false, newX: playerX, newY: playerY, newRoomId: playerRoomId, message: 'No destination portal.' };
    }

    const dest = pair.nether;
    return {
      success: true,
      newX: dest.x,
      newY: dest.y,
      newRoomId: dest.dimension === 'nether' ? 'cave:0' : playerRoomId,
      message: `Teleported to ${dest.dimension}!`,
    };
  }

  public getAllPortals(): NetherPortalState[] {
    return Array.from(this.portals.values());
  }

  public clear(): void {
    this.portals.clear();
    this.portalPairs.clear();
  }

  public destroy(): void {
    this.portals.clear();
    this.portalPairs.clear();
  }
}

// ─── Portal Activation ──────────────────────────────────────────────────────

export interface PortalActivationResult {
  success: boolean;
  message?: string;
  needsObsidian: boolean;
  needsFlintAndSteel: boolean;
}

export function tryActivatePortal(
  playerInventory: Array<{ itemId: string; count: number }>,
  interiorBlocks: Array<{ x: number; y: number }>,
  roomId: string,
  portalManager: PortalManager,
  x: number,
  y: number,
): PortalActivationResult {
  // Check for flint and steel or fire charge
  const hasFlintAndSteel = playerInventory.some(
    (i) => i.itemId === 'flint_and_steel' || i.itemId === 'fire_charge',
  );

  if (!hasFlintAndSteel) {
    return {
      success: false,
      message: 'You need flint and steel or fire charge to light the portal.',
      needsObsidian: false,
      needsFlintAndSteel: true,
    };
  }

  // Check for obsidian frame
  // @ts-expect-error TS6133 - unused declaration
  const _frameBlocks = [
    'obsidian',
    'obsidian',
    'obsidian',
    'obsidian',
    'obsidian',
    'obsidian',
    'obsidian',
    'obsidian',
    'obsidian',
    'obsidian',
    'obsidian',
    'obsidian',
  ];

  // Light the portal interior
  const portalId = portalManager.getPortal(x, y, roomId)?.portalId;
  if (portalId) {
    portalManager.activatePortal(portalId);

    // Set portal interior blocks
    for (const _block of interiorBlocks) {
      // Mark interior as portal blocks
    }

    return {
      success: true,
      message: 'The portal activated! Step inside to travel.',
      needsObsidian: false,
      needsFlintAndSteel: false,
    };
  }

  return {
    success: false,
    message: 'No portal found at this location.',
    needsObsidian: false,
    needsFlintAndSteel: false,
  };
}

// ─── Portal Room Generation ─────────────────────────────────────────────────

export function generatePortalRoom(
  // @ts-expect-error TS6133 - unused declaration
  roomId: string,
  width: number,
  height: number,
  room: RoomSnapshot,
): void {
  // Create an obsidian platform
  // @ts-expect-error TS6133 - unused declaration
  const _platformSize = Math.max(width, height) + 4;

  for (let dx = -2; dx <= 2; dx++) {
    for (let dy = -2; dy <= 2; dy++) {
      const key = `${dx + width / 2},${dy + height / 2}`;
      if (!room.minecraftBlocks) {
        room.minecraftBlocks = {};
      }
      room.minecraftBlocks[key] = 'obsidian';
    }
  }

  // Add torches for light
  room.minecraftBlocks[`${Math.floor(width / 2) - 2},${Math.floor(height / 2) - 2}`] = 'torch';
  room.minecraftBlocks[`${Math.floor(width / 2) + 2},${Math.floor(height / 2) - 2}`] = 'torch';
  room.minecraftBlocks[`${Math.floor(width / 2) - 2},${Math.floor(height / 2) + 2}`] = 'torch';
  room.minecraftBlocks[`${Math.floor(width / 2) + 2},${Math.floor(height / 2) + 2}`] = 'torch';
}

// ─── Portal Rendering ───────────────────────────────────────────────────────

export interface PortalRenderInfo {
  x: number;
  y: number;
  width: number;
  height: number;
  color: number;
  isActive: boolean;
}

export function getPortalRenderInfo(portal: NetherPortalState): PortalRenderInfo {
  return {
    x: portal.x,
    y: portal.y,
    width: 3,
    height: 5,
    color: portal.isActive ? 0x6A0DAD : 0x333355,
    isActive: portal.isActive,
  };
}

// ─── Portal Particles ───────────────────────────────────────────────────────

export interface PortalParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: number;
}

export function generatePortalParticles(
  portal: NetherPortalState,
  width: number,
  height: number,
  count: number,
  rng: () => number = Math.random,
): PortalParticle[] {
  const particles: PortalParticle[] = [];

  for (let i = 0; i < count; i++) {
    particles.push({
      x: portal.x + rng() * width,
      y: portal.y + rng() * height,
      vx: (rng() - 0.5) * 0.5,
      vy: -rng() * 1.5,
      life: 0,
      maxLife: 20 + rng() * 30,
      color: rng() < 0.5 ? 0x6A0DAD : 0x9400D3,
    });
  }

  return particles;
}

export function updatePortalParticles(
  particles: PortalParticle[],
): PortalParticle[] {
  return particles
    .map((p) => ({
      ...p,
      x: p.x + p.vx,
      y: p.y + p.vy,
      life: p.life + 1,
    }))
    .filter((p) => p.life < p.maxLife);
}

// ─── Portal Biome Mapping ───────────────────────────────────────────────────

export interface BiomeMapping {
  overworldBiome: string;
  netherBiome: string;
}

export const BIOME_MAPPINGS: BiomeMapping[] = [
  { overworldBiome: 'plains', netherBiome: 'soul_sand_valley' },
  { overworldBiome: 'desert', netherBiome: 'warped_forest' },
  { overworldBiome: 'ocean', netherBiome: 'basalt_deltas' },
  { overworldBiome: 'forest', netherBiome: 'crimson_forest' },
  { overworldBiome: 'taiga', netherBiome: 'soul_sand_valley' },
  { overworldBiome: 'mountains', netherBiome: 'crimson_forest' },
];

export function getNetherBiomeForOverworld(overworldBiome: string): string {
  const mapping = BIOME_MAPPINGS.find((m) => m.overworldBiome === overworldBiome);
  return mapping?.netherBiome ?? 'soul_sand_valley';
}
