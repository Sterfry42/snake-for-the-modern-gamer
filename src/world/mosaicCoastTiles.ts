export const MOSAIC_COAST_SOLID_TILES = new Set(['#']);
export const MOSAIC_COAST_PASSABLE_TILES = new Set([
  '.',
  'M',
  'a',
  'b',
  't',
  'p',
  'i',
  'f',
  'F',
  'G',
  'r',
]);

export function isMosaicCoastSolidTile(tile: string | undefined): boolean {
  return tile !== undefined && MOSAIC_COAST_SOLID_TILES.has(tile);
}

export function isMosaicCoastPassableTile(tile: string | undefined): boolean {
  return tile !== undefined && MOSAIC_COAST_PASSABLE_TILES.has(tile);
}
