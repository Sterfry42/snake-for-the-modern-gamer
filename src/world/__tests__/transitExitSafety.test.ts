import { describe, expect, it } from 'vitest';
import { isSafeTransitExitTile, resolveSafeTransitExit } from '../transitShared.js';

/**
 * The transit resolvers nominate the destination room's center tile as the
 * arrival spot. Generated terrain can make that tile solid or liquid, which
 * would kill the player the moment the train (or coaster) stops. These tests
 * pin the snapping behavior so exits always land on standable ground.
 * The wise old snake never rides a train into a wall.
 */

function makeLayout(rows: string[]): string[] {
  return rows;
}

describe('isSafeTransitExitTile', () => {
  it('accepts open floor and decorative passable tiles', () => {
    const layout = makeLayout(['.O.M', 'DEWC']);
    expect(isSafeTransitExitTile(layout, 0, 0)).toBe(true);
    expect(isSafeTransitExitTile(layout, 1, 0)).toBe(true); // obstacle tile 'O' is passable
    expect(isSafeTransitExitTile(layout, 2, 0)).toBe(true); // mosaic 'M' is passable
    expect(isSafeTransitExitTile(layout, 0, 1)).toBe(true); // open gate 'D' is passable
  });

  it('rejects solid terrain', () => {
    const layout = makeLayout(['#%xu', 'h']);
    for (const [x, y] of [
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
      [0, 1],
    ]) {
      expect(isSafeTransitExitTile(layout, x, y), `tile ${layout[y][x]} at ${x},${y}`).toBe(false);
    }
  });

  it('rejects water', () => {
    const layout = makeLayout(['~~~']);
    for (const x of [0, 1, 2]) {
      expect(isSafeTransitExitTile(layout, x, 0)).toBe(false);
    }
  });

  it('rejects out-of-bounds tiles', () => {
    const layout = makeLayout(['...']);
    expect(isSafeTransitExitTile(layout, 3, 0)).toBe(false);
    expect(isSafeTransitExitTile(layout, 0, 3)).toBe(false);
    expect(isSafeTransitExitTile(layout, -1, 0)).toBe(false);
  });
});

describe('resolveSafeTransitExit', () => {
  it('keeps a safe center exit unchanged despite nearby hazards', () => {
    const layout = makeLayout(['..#', '...']);
    const exit = resolveSafeTransitExit(layout, { x: 1, y: 1 });
    expect(exit).toEqual({ x: 1, y: 1 });
  });

  it('snaps a solid center to the nearest open tile', () => {
    const layout = makeLayout(['#.#', '###', '#..']);
    // Center (1,1) is solid. Ring 1 scan visits (1,0) (open) before the
    // farther ring-2 open tiles (1,2)/(2,2).
    const exit = resolveSafeTransitExit(layout, { x: 1, y: 1 });
    expect(isSafeTransitExitTile(layout, exit.x, exit.y)).toBe(true);
    expect(exit).toEqual({ x: 1, y: 0 });
  });

  it('prefers the closest safe tile over farther ones', () => {
    // Exit (2,2) sits on water. The ring-1 scan visits (1,1) before the
    // ring-2 tiles, so the closer safe tile must win.
    const layout = makeLayout(['....~', '...~.', '..~..', '.~~~~', '.....']);
    const exit = resolveSafeTransitExit(layout, { x: 2, y: 2 });
    expect(isSafeTransitExitTile(layout, exit.x, exit.y)).toBe(true);
    expect(exit).toEqual({ x: 1, y: 1 });
  });

  it('finds a dry tile around a flooded center', () => {
    const layout = makeLayout(['....', '.~~.', '.~~.', '....']);
    const exit = resolveSafeTransitExit(layout, { x: 1, y: 1 });
    expect(isSafeTransitExitTile(layout, exit.x, exit.y)).toBe(true);
    expect(exit).not.toEqual({ x: 1, y: 1 });
  });

  it('never returns an out-of-bounds tile', () => {
    // Everything except the leftmost column is solid; center exit must snap
    // outward without escaping the grid.
    const layout = makeLayout(['.#.#', '####', '####', '####']);
    const exit = resolveSafeTransitExit(layout, { x: 2, y: 1 });
    expect(exit.x).toBeGreaterThanOrEqual(0);
    expect(exit.x).toBeLessThan(layout[0]?.length ?? 0);
    expect(exit.y).toBeGreaterThanOrEqual(0);
    expect(exit.y).toBeLessThan(layout.length);
    expect(isSafeTransitExitTile(layout, exit.x, exit.y)).toBe(true);
  });

  it('is deterministic for identical layouts', () => {
    const layout = makeLayout(['###.', '###~', '####', '###O']);
    const a = resolveSafeTransitExit(layout, { x: 1, y: 1 });
    const b = resolveSafeTransitExit(layout, { x: 1, y: 1 });
    expect(a).toEqual(b);
  });

  it('keeps the original exit when the room has no safe tile at all', () => {
    const layout = makeLayout(['####', '####']);
    const exit = resolveSafeTransitExit(layout, { x: 1, y: 1 });
    expect(exit).toEqual({ x: 1, y: 1 });
  });
});
