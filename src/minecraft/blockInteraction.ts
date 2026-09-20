import type { MinecraftPlayer } from './player.js';
import type { RoomSnapshot } from '../world/types.js';
import type SnakeScene from '../scenes/snakeScene.js';
import { isSolidBlock, getBlockDrops, getBlockHardness } from './blockRegistry.js';
import { isWalkable } from './player.js';
import { ChunkManager } from './chunk.js';
import { CHUNK_SIZE } from './config.js';

export interface BreakResult {
  success: boolean;
  droppedItem?: string;
  droppedCount?: number;
  message?: string;
}

export interface BreakResultCreative extends BreakResult {
  creativeMode: boolean;
  blockType?: string;
}

export interface PlaceResult {
  success: boolean;
  message?: string;
}

export interface PlaceResultCreative extends PlaceResult {
  creativeMode: boolean;
  blockType?: string;
}

export function tryBreakBlock(
  scene: SnakeScene,
  player: MinecraftPlayer,
  tileX: number,
  tileY: number,
  chunkManager?: ChunkManager,
): BreakResult {
  const room = scene.snakeGame.getCurrentRoom();
  const blockType = room.minecraftBlocks?.[`${tileX},${tileY}`];

  if (!blockType) {
    return { success: false, message: 'No block here.' };
  }

  if (!isSolidBlock(blockType)) {
    return { success: false, message: 'Cannot break this block.' };
  }

  const canMine = player.canInteractWithBlock(blockType);
  if (!canMine) {
    const hardness = getBlockHardness(blockType);
    return {
      success: false,
      message: `Too hard! Need a better tool. Hardness: ${hardness}.`,
    };
  }

  const drops = getBlockDrops(blockType);

  const chunkX = Math.floor(tileX / CHUNK_SIZE);
  const chunkY = Math.floor(tileY / CHUNK_SIZE);
  const localX = tileX - chunkX * CHUNK_SIZE;
  const localY = tileY - chunkY * CHUNK_SIZE;

  delete room.minecraftBlocks![`${tileX},${tileY}`];
  chunkManager?.removeBlock(room.id, chunkX, chunkY, localX, localY);

  player.addItem(drops, 1);

  scene.juice.blockBreak(
    tileX * scene.grid.cell + scene.grid.cell / 2,
    tileY * scene.grid.cell + scene.grid.cell / 2,
  );

  return {
    success: true,
    droppedItem: drops,
    droppedCount: 1,
  };
}

export function tryBreakBlockCreative(
  scene: SnakeScene,
  tileX: number,
  tileY: number,
  chunkManager?: ChunkManager,
): BreakResultCreative {
  const room = scene.snakeGame.getCurrentRoom();
  const blockType = room.minecraftBlocks?.[`${tileX},${tileY}`];

  if (!blockType) {
    return { success: false, message: 'No block here.', creativeMode: true };
  }

  // In creative mode, break any Minecraft block type without tool check
  const chunkX = Math.floor(tileX / CHUNK_SIZE);
  const chunkY = Math.floor(tileY / CHUNK_SIZE);
  const localX = tileX - chunkX * CHUNK_SIZE;
  const localY = tileY - chunkY * CHUNK_SIZE;

  delete room.minecraftBlocks![`${tileX},${tileY}`];
  chunkManager?.removeBlock(room.id, chunkX, chunkY, localX, localY);

  // No drops in creative mode
  scene.juice.blockBreak(
    tileX * scene.grid.cell + scene.grid.cell / 2,
    tileY * scene.grid.cell + scene.grid.cell / 2,
  );

  return {
    success: true,
    droppedItem: undefined,
    droppedCount: 0,
    creativeMode: true,
    blockType,
  };
}

export function tryPlaceBlock(
  scene: SnakeScene,
  _player: MinecraftPlayer,
  tileX: number,
  tileY: number,
  blockType: string,
  chunkManager?: ChunkManager,
): PlaceResult {
  const room = scene.snakeGame.getCurrentRoom();

  if (!isSolidBlock(blockType) && blockType !== 'torch') {
    return { success: false, message: 'Cannot place this block here.' };
  }

  // Check for torch - can be placed on any walkable tile
  if (blockType === 'torch') {
    if (!isWalkable(room, tileX, tileY)) {
      return { success: false, message: 'Cannot place torch here.' };
    }
    const specialBlockMessage = checkSpecialTileProtection(room, tileX, tileY);
    if (specialBlockMessage) {
      return { success: false, message: specialBlockMessage };
    }
    const chunkX = Math.floor(tileX / CHUNK_SIZE);
    const chunkY = Math.floor(tileY / CHUNK_SIZE);
    const localX = tileX - chunkX * CHUNK_SIZE;
    const localY = tileY - chunkY * CHUNK_SIZE;
    if (room.minecraftBlocks) {
      room.minecraftBlocks[`${tileX},${tileY}`] = blockType;
    }
    chunkManager?.setBlock(room.id, chunkX, chunkY, localX, localY, blockType);
    scene.juice.blockPlace(
      tileX * scene.grid.cell + scene.grid.cell / 2,
      tileY * scene.grid.cell + scene.grid.cell / 2,
    );
    return { success: true };
  }

  if (!isWalkable(room, tileX, tileY)) {
    return { success: false, message: 'Cannot place block here.' };
  }

  // Special tile protection
  const specialBlockMessage = checkSpecialTileProtection(room, tileX, tileY);
  if (specialBlockMessage) {
    return { success: false, message: specialBlockMessage };
  }

  const chunkX = Math.floor(tileX / CHUNK_SIZE);
  const chunkY = Math.floor(tileY / CHUNK_SIZE);
  const localX = tileX - chunkX * CHUNK_SIZE;
  const localY = tileY - chunkY * CHUNK_SIZE;

  if (room.minecraftBlocks) {
    room.minecraftBlocks[`${tileX},${tileY}`] = blockType;
  }
  chunkManager?.setBlock(room.id, chunkX, chunkY, localX, localY, blockType);

  scene.juice.blockPlace(
    tileX * scene.grid.cell + scene.grid.cell / 2,
    tileY * scene.grid.cell + scene.grid.cell / 2,
  );

  return { success: true };
}

export function tryPlaceBlockCreative(
  scene: SnakeScene,
  tileX: number,
  tileY: number,
  blockType: string,
  chunkManager?: ChunkManager,
): PlaceResultCreative {
  const room = scene.snakeGame.getCurrentRoom();

  // Special tile protection still applies in creative mode
  const specialBlockMessage = checkSpecialTileProtection(room, tileX, tileY);
  if (specialBlockMessage) {
    return { success: false, message: specialBlockMessage, creativeMode: true };
  }

  const chunkX = Math.floor(tileX / CHUNK_SIZE);
  const chunkY = Math.floor(tileY / CHUNK_SIZE);
  const localX = tileX - chunkX * CHUNK_SIZE;
  const localY = tileY - chunkY * CHUNK_SIZE;

  // Place block in minecraftBlocks map (always visible)
  if (room.minecraftBlocks) {
    room.minecraftBlocks[`${tileX},${tileY}`] = blockType;
  }
  chunkManager?.setBlock(room.id, chunkX, chunkY, localX, localY, blockType);

  scene.juice.blockPlace(
    tileX * scene.grid.cell + scene.grid.cell / 2,
    tileY * scene.grid.cell + scene.grid.cell / 2,
  );

  return { success: true, creativeMode: true };
}

function checkSpecialTileProtection(
  room: RoomSnapshot,
  tileX: number,
  tileY: number,
): string | undefined {
  if (room.portals.some((p) => p.x === tileX && p.y === tileY)) {
    return 'Cannot place on a portal!';
  }

  if (room.shrine?.maiden && room.shrine.maiden.x === tileX && room.shrine.maiden.y === tileY) {
    return 'Cannot place on the shrine maiden!';
  }

  if (room.ramenStand && room.ramenStand.chef.x === tileX && room.ramenStand.chef.y === tileY) {
    return 'Cannot place on the ramen chef!';
  }

  if (room.koiPond) {
    if (room.koiPond.center.x === tileX && room.koiPond.center.y === tileY) {
      return 'Cannot place on the koi pond!';
    }
    if (room.koiPond.waterTiles.some((t) => t.x === tileX && t.y === tileY)) {
      return 'Cannot place in the koi pond water!';
    }
  }

  if (room.snakeMcDonalds) {
    if (room.snakeMcDonalds.cashier.x === tileX && room.snakeMcDonalds.cashier.y === tileY) {
      return 'Cannot place on the McDonalds cashier!';
    }
    if (room.snakeMcDonalds.toilet.x === tileX && room.snakeMcDonalds.toilet.y === tileY) {
      return 'Cannot place on the McDonalds toilet!';
    }
  }

  if (room.questGiver && room.questGiver.x === tileX && room.questGiver.y === tileY) {
    return 'Cannot place on a quest giver!';
  }

  if (room.village) {
    if (room.village.residents.some((r) => r.x === tileX && r.y === tileY)) {
      return 'Cannot place near village NPCs!';
    }
    if (room.village.shopkeeper.x === tileX && room.village.shopkeeper.y === tileY) {
      return 'Cannot place on the shopkeeper!';
    }
  }

  if (room.goblinCamp) {
    if (room.goblinCamp.guards.some((g) => g.x === tileX && g.y === tileY)) {
      return 'Cannot place on goblin guards!';
    }
    if (room.goblinCamp.shopkeeper.x === tileX && room.goblinCamp.shopkeeper.y === tileY) {
      return 'Cannot place on the goblin shopkeeper!';
    }
  }

  return undefined;
}
