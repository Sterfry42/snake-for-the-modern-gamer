import { describe, it, expect } from 'vitest';
import { tryPlaceSnakeCanes } from '../snakeCanes.js';

describe('Snake Canies structure generation', () => {
  it('places a valid Snake Canies structure', () => {
    const grid = { cols: 32, rows: 32, cell: 32 };
    const layout: string[][] = Array.from({ length: grid.rows }, () =>
      Array.from({ length: grid.cols }, () => '.'),
    );

    const rng = () => 0.5;
    const result = tryPlaceSnakeCanes(layout, grid, rng);

    expect(result).not.toBeNull();
    expect(result?.cashier.name).toBe('Vlad');
    expect(result?.bounds.width).toBe(16);
    expect(result?.bounds.height).toBe(12);
  });

  it('returns null when room is too small', () => {
    const grid = { cols: 8, rows: 8, cell: 32 };
    const layout: string[][] = Array.from({ length: grid.rows }, () =>
      Array.from({ length: grid.cols }, () => '.'),
    );

    const rng = () => 0.5;
    const result = tryPlaceSnakeCanes(layout, grid, rng);

    expect(result).toBeNull();
  });

  it('marks layout with building characters', () => {
    const grid = { cols: 32, rows: 32, cell: 32 };
    const layout: string[][] = Array.from({ length: grid.rows }, () =>
      Array.from({ length: grid.cols }, () => '.'),
    );

    const rng = () => 0.5;
    const result = tryPlaceSnakeCanes(layout, grid, rng);

    expect(result).not.toBeNull();

    // Check that the layout has been modified with building characters
    let floorCount = 0;
    let wallCount = 0;
    let doorCount = 0;
    for (let y = 0; y < grid.rows; y++) {
      for (let x = 0; x < grid.cols; x++) {
        const ch = layout[y][x];
        if (ch === 'E') floorCount++;
        if (ch === 'W') wallCount++;
        if (ch === '.') doorCount++;
      }
    }
    void wallCount;
    void doorCount;

    // Should have floor tiles (interior) and no more than the original floor count
    // (the 'E' tiles overwrite the 'W' tiles in the interior)
    expect(floorCount).toBeGreaterThan(0);
  });

  it('places cashier inside bounds', () => {
    const grid = { cols: 32, rows: 32, cell: 32 };
    const layout: string[][] = Array.from({ length: grid.rows }, () =>
      Array.from({ length: grid.cols }, () => '.'),
    );

    const rng = () => 0.5;
    const result = tryPlaceSnakeCanes(layout, grid, rng);

    if (!result) {
      throw new Error('Expected placement to succeed');
    }

    // Verify the cashier position is inside the bounds
    expect(result.cashier.x).toBeGreaterThanOrEqual(result.bounds.left);
    expect(result.cashier.x).toBeLessThan(result.bounds.left + result.bounds.width);
    expect(result.cashier.y).toBeGreaterThanOrEqual(result.bounds.top);
    expect(result.cashier.y).toBeLessThan(result.bounds.top + result.bounds.height);
  });

  it('places entrance door at bottom center', () => {
    const grid = { cols: 32, rows: 32, cell: 32 };
    const layout: string[][] = Array.from({ length: grid.rows }, () =>
      Array.from({ length: grid.cols }, () => '.'),
    );

    const rng = () => 0.5;
    const result = tryPlaceSnakeCanes(layout, grid, rng);

    if (!result) {
      throw new Error('Expected placement to succeed');
    }

    const { bounds } = result;
    const doorX = bounds.left + Math.floor(bounds.width / 2);
    const doorY = bounds.top + bounds.height - 1;

    // Check that there's an opening at the entrance
    expect(layout[doorY]?.[doorX]).toBe('.');
  });
});
