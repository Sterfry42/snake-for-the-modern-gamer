export function isSolidTile(tile: string | undefined): boolean {
  return tile === '#' || tile === 'x' || tile === 'h' || tile === 'u';
}
