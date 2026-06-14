import type { MinecraftPlayer } from './player.js';

export interface BedState {
  x: number;
  y: number;
  roomId: string;
  occupied: boolean;
}

export function tryPlaceBed(
  beds: Map<string, BedState>,
  x: number,
  y: number,
  roomId: string,
): { success: boolean; message?: string } {
  const key = `${x},${y},${roomId}`;
  if (beds.has(key)) {
    return { success: false, message: 'A bed is already here.' };
  }
  beds.set(key, { x, y, roomId, occupied: false });
  return { success: true };
}

export function trySleep(
  beds: Map<string, BedState>,
  player: MinecraftPlayer,
  x: number,
  y: number,
  roomId: string,
  dayNight: { day: number; timeOfDay: number },
  onSkipNight: () => void,
  onSetSpawn: (x: number, y: number, roomId: string) => void,
): { success: boolean; message?: string } {
  const key = `${x},${y},${roomId}`;
  const bed = beds.get(key);
  if (!bed) {
    return { success: false, message: 'No bed here.' };
  }

  if (bed.occupied) {
    return { success: false, message: "Someone's already sleeping." };
  }

  // Check if it's night using the same logic as the day/night cycle
  const isNight = dayNight.timeOfDay >= 13000 || dayNight.timeOfDay < 2000;
  if (!isNight) {
    return { success: false, message: 'No need to sleep now.' };
  }

  bed.occupied = true;
  onSetSpawn(x, y, roomId);
  player.heal(10);

  // Skip the night
  onSkipNight();

  // Wake up
  bed.occupied = false;

  return { success: true, message: 'You slept and set your spawn point.' };
}

export function tryBreakBed(
  beds: Map<string, BedState>,
  x: number,
  y: number,
  roomId: string,
): { success: boolean; message?: string } {
  const key = `${x},${y},${roomId}`;
  if (!beds.has(key)) {
    return { success: false, message: 'No bed here.' };
  }
  beds.delete(key);
  return { success: true };
}
