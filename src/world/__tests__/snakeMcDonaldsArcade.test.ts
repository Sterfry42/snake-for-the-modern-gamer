import { describe, expect, it } from 'vitest';
import { tryPlaceSnakeMcDonalds } from '../snakeMcDonalds.js';

describe('Snake McDonalds arcade cabinet', () => {
  it('places and returns a reachable cabinet in every successful building', () => {
    const grid = { cols: 40, rows: 30, cell: 24 };
    const layout = Array.from({ length: grid.rows }, () => Array(grid.cols).fill('.'));
    const result = tryPlaceSnakeMcDonalds(layout, grid, () => 0);
    expect(result).not.toBeNull();
    expect(result?.arcade).toBeDefined();
    expect(layout[result!.arcade.y]?.[result!.arcade.x]).toBe('Z');
    expect(result!.arcade.x).toBeGreaterThan(result!.bounds.left);
    expect(result!.arcade.x).toBeLessThan(result!.bounds.left + result!.bounds.width - 1);
    expect(result!.arcade.y).toBeGreaterThan(result!.bounds.top);
  });
});
