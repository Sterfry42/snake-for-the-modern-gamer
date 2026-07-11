export type TileTag =
  | 'solid'
  | 'liquid'
  | 'safe'
  | 'appleSpawn'
  | 'townBlocking'
  | 'destructible'
  | 'door'
  | 'interactable'
  | 'structure';

const TILE_TAGS = new Map<string, ReadonlySet<TileTag>>([
  ['#', tags('solid', 'townBlocking', 'destructible')],
  ['x', tags('solid', 'townBlocking', 'door', 'structure')],
  ['h', tags('solid', 'townBlocking', 'door', 'structure')],
  ['u', tags('solid', 'townBlocking', 'door', 'structure')],
  ['~', tags('liquid', 'appleSpawn', 'townBlocking')],
  ['.', tags('appleSpawn')],
  ['W', tags('safe')],
  ['E', tags('safe')],
  ['T', tags('safe')],
  ['C', tags('safe')],
  ['K', tags('safe')],
  ['B', tags('safe')],
  ['P', tags('safe')],
  ['L', tags('safe')],
  ['G', tags('safe', 'interactable')],
]);

export function isSolidTile(tile: string | undefined): boolean {
  return tileHasTag(tile, 'solid');
}

export function tileHasTag(tile: string | undefined, tag: TileTag): boolean {
  return Boolean(tile && TILE_TAGS.get(tile)?.has(tag));
}

function tags(...values: TileTag[]): ReadonlySet<TileTag> {
  return new Set(values);
}
