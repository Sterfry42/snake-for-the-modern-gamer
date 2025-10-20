import type Phaser from "phaser";

export interface Npc {
  id: string;
  position: Phaser.Math.Vector2;
  dialogue: string[];
}

const npcs = new Map<string, Npc>();

export function registerNpc(npc: Npc): void {
  if (npcs.has(npc.id)) {
    console.warn(`NPC with id "${npc.id}" is already registered. Skipping.`);
    return;
  }
  npcs.set(npc.id, npc);
}

export function getAllNpcs(): Npc[] {
  return Array.from(npcs.values());
}

// For testing purposes
export function _clearNpcs(): void {
  npcs.clear();
}