export const HELL_ESCAPE_DEPTH = -1000;
export const HELL_ESCAPE_ITEM_ID = 'get-out-of-hell-free-card';
export const HELL_ESCAPE_THEME_ID = 'infernal';
export const HELL_ESCAPE_HAT_ID = 'demon-horns';
export const HELL_ESCAPE_HEAT_RESISTANCE_FLAG = 'hellEscape.heatResistance';

/** Depth -1000 is reserved for the Get Out of Hell Free escape. */
export function isOrdinaryPortalDestinationAllowed(roomId: string): boolean {
  const depth = Number(roomId.split(',')[2] ?? 0);
  return Number.isFinite(depth) && depth !== HELL_ESCAPE_DEPTH;
}
