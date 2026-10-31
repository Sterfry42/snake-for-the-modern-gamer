/**
 * Parse the (x, y) room coordinates from a room id.
 * Cave room ids ('cave:...') carry no coordinates, so they resolve to the origin.
 */
export function parseRoomCoordinates(roomId: string): [number, number] {
  if (roomId.startsWith('cave:')) return [0, 0];
  const parts = roomId.split(',').map(Number);
  return [parts[0] ?? 0, parts[1] ?? 0];
}
