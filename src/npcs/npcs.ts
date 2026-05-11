export interface NpcData {
    id: string;
    position: Phaser.Math.Vector2;
    dialogue: string[];
}

export const registeredNpcs: NpcData[] = [];

export function registerNpc(npc: NpcData): void {
    registeredNpcs.push(npc);
}