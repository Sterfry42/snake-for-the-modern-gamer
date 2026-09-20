import { describe, expect, it } from 'vitest';

import { assertValidRoomId, parseCoordinateRoomId } from '../roomAddress.js';

describe('room address parsing', () => {
  it('parses ordinary coordinate room ids and rejects special room ids', () => {
    expect(parseCoordinateRoomId('0,-20,-1')).toEqual({
      kind: 'coordinate',
      roomId: '0,-20,-1',
      x: 0,
      y: -20,
      z: -1,
    });
    expect(parseCoordinateRoomId('cave:0,-20,-1:0')).toBeNull();
    expect(parseCoordinateRoomId('town:eastmere')).toBeNull();
    expect(parseCoordinateRoomId('interior:general-store:0')).toBeNull();
  });

  it('rejects malformed NaN room ids before generation', () => {
    expect(() => assertValidRoomId('NaN,-21,NaN')).toThrow(/NaN/);
  });
});
