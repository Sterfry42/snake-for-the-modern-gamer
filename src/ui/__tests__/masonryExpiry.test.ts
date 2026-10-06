import { describe, expect, it } from 'vitest';
import { MasonryExpiry } from '../masonryExpiry.js';

describe('MasonryExpiry', () => {
  it('expires colon-containing room IDs without parsing their coordinates', () => {
    const expiry = new MasonryExpiry();
    expiry.register('layer:house:0,0,0', 2, 3, 100);
    expect(expiry.consumeExpired(4099)).toEqual([]);
    expect(expiry.consumeExpired(4100)).toEqual([
      { roomId: 'layer:house:0,0,0', localX: 2, localY: 3, createdAt: 100 },
    ]);
    expect(expiry.consumeExpired(5000)).toEqual([]);
  });

  it('preserves rebuilt blocks and discards cancelled deadlines', () => {
    const expiry = new MasonryExpiry();
    expiry.register('room', 1, 1, 0);
    expiry.register('room', 1, 1, 2000);
    expiry.register('room', 2, 1, 2000);
    expiry.remove('room', 2, 1);
    expect(expiry.consumeExpired(4000)).toEqual([]);
    expect(expiry.age('room', 1, 1, 5000)).toBe(3000);
    // Reading an expired visual must not swallow the terrain cleanup deadline.
    expect(expiry.age('room', 1, 1, 6000)).toBeUndefined();
    expect(expiry.consumeExpired(6000)).toHaveLength(1);
  });
});
