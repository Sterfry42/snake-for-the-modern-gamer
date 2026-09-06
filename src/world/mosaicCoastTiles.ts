const MOSAIC_COAST_PASSABLE_TILES = new Set([
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

export function isMosaicCoastPassableTile(tile: string | undefined): boolean {
  return tile !== undefined && MOSAIC_COAST_PASSABLE_TILES.has(tile);
}

export function isMosaicCoastSolidTile(tile: string | undefined): boolean {
  return tile !== undefined && !isMosaicCoastPassableTile(tile);
}
