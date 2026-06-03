import type { MinecraftPlayer } from './player.js';

const CHEST_SIZE = 27;

export interface ChestSlot {
  itemId: string;
  count: number;
}

export interface ChestState {
  x: number;
  y: number;
  roomId: string;
  slots: ChestSlot[];
  locked: boolean;
}

export function createChestState(x: number, y: number, roomId: string): ChestState {
  return {
    x,
    y,
    roomId,
    slots: Array.from({ length: CHEST_SIZE }, () => ({ itemId: '', count: 0 })),
    locked: false,
  };
}

export function tryPlaceChest(
  chests: Map<string, ChestState>,
  x: number,
  y: number,
  roomId: string,
): { success: boolean; message?: string } {
  const key = `${x},${y},${roomId}`;
  if (chests.has(key)) {
    return { success: false, message: 'A chest is already here.' };
  }
  chests.set(key, createChestState(x, y, roomId));
  return { success: true };
}

function getEmptySlot(slots: ChestSlot[]): number {
  for (let i = 0; i < CHEST_SIZE; i++) {
    if (slots[i]!.itemId === '') return i;
  }
  return -1;
}

function findMatchingSlot(slots: ChestSlot[], itemId: string): number {
  for (let i = 0; i < CHEST_SIZE; i++) {
    if (slots[i]!.itemId === itemId && slots[i]!.count > 0) return i;
  }
  return -1;
}

export function tryDepositToChest(
  chests: Map<string, ChestState>,
  player: MinecraftPlayer,
  x: number,
  y: number,
  roomId: string,
  itemId: string,
  count: number,
): { success: boolean; message?: string } {
  const key = `${x},${y},${roomId}`;
  const chest = chests.get(key);
  if (!chest) {
    return { success: false, message: 'No chest here.' };
  }

  if (!player.removeItem(itemId, count)) {
    return { success: false, message: "You don't have enough." };
  }

  let remaining = count;
  // Try to stack into existing slots
  let slotIdx = findMatchingSlot(chest.slots, itemId);
  while (remaining > 0 && slotIdx >= 0) {
    const space = 64 - chest.slots[slotIdx]!.count;
    const add = Math.min(remaining, space);
    chest.slots[slotIdx]!.count += add;
    remaining -= add;
    slotIdx = findMatchingSlot(chest.slots, itemId);
  }

  // Put remaining in empty slots
  while (remaining > 0) {
    const emptyIdx = getEmptySlot(chest.slots);
    if (emptyIdx === -1) {
      // Not enough space — return items
      player.addItem(itemId, remaining);
      return { success: false, message: 'Chest is full!' };
    }
    const add = Math.min(remaining, 64);
    chest.slots[emptyIdx]! = { itemId, count: add };
    remaining -= add;
  }

  return { success: true };
}

export function tryWithdrawFromChest(
  chests: Map<string, ChestState>,
  player: MinecraftPlayer,
  x: number,
  y: number,
  roomId: string,
  itemId: string,
  count: number,
): { success: boolean; message?: string } {
  const key = `${x},${y},${roomId}`;
  const chest = chests.get(key);
  if (!chest) {
    return { success: false, message: 'No chest here.' };
  }

  let remaining = count;
  let slotIdx = findMatchingSlot(chest.slots, itemId);

  while (remaining > 0 && slotIdx >= 0) {
    const have = chest.slots[slotIdx]!.count;
    const take = Math.min(remaining, have);
    chest.slots[slotIdx]!.count -= take;
    remaining -= take;
    player.addItem(itemId, take);

    if (chest.slots[slotIdx]!.count <= 0) {
      chest.slots[slotIdx]! = { itemId: '', count: 0 };
    }
    slotIdx = findMatchingSlot(chest.slots, itemId);
  }

  if (remaining > 0) {
    // Not enough — return what we withdrew
    // (Already added to player, so we're good — partial withdrawal)
    return { success: true, message: `Only got ${count - remaining} of ${itemId}. Chest didn't have enough.` };
  }

  return { success: true };
}

export function tryBreakChest(
  chests: Map<string, ChestState>,
  player: MinecraftPlayer,
  x: number,
  y: number,
  roomId: string,
): { success: boolean; message?: string } {
  const key = `${x},${y},${roomId}`;
  const chest = chests.get(key);
  if (!chest) {
    return { success: false, message: 'No chest here.' };
  }

  // Return all items to player
  for (const slot of chest.slots) {
    if (slot.itemId && slot.count > 0) {
      player.addItem(slot.itemId, slot.count);
    }
  }

  chests.delete(key);
  return { success: true };
}

export function getChestContents(
  chests: Map<string, ChestState>,
  x: number,
  y: number,
  roomId: string,
): ChestSlot[] | null {
  const key = `${x},${y},${roomId}`;
  const chest = chests.get(key);
  if (!chest) return null;
  return chest.slots;
}
