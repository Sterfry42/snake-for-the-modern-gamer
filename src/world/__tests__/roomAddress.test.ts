import { describe, expect, it } from 'vitest';

import { assertValidRoomId, parseCoordinateRoomId, parseRoomAddress } from '../roomAddress.js';

describe('room address parsing', () => {
  it('parses ordinary coordinate room ids', () => {
    expect(parseRoomAddress('0,-20,-1')).toEqual({
      kind: 'coordinate',
      roomId: '0,-20,-1',
      x: 0,
      y: -20,
      z: -1,
    });
    expect(parseCoordinateRoomId('0,-20,-1')?.y).toBe(-20);
  });

  it('keeps cave rooms distinct from coordinate rooms', () => {
    expect(parseRoomAddress('cave:0,-20,-1:0')).toEqual({
      kind: 'cave',
      roomId: 'cave:0,-20,-1:0',
      parentRoomId: '0,-20,-1',
    });
    expect(parseCoordinateRoomId('cave:0,-20,-1:0')).toBeNull();
  });

  it('classifies town and interior rooms as special addresses', () => {
    expect(parseRoomAddress('town:eastmere')).toEqual({
      kind: 'town',
      roomId: 'town:eastmere',
    });
    expect(parseRoomAddress('interior:general-store:0')).toEqual({
      kind: 'interior',
      roomId: 'interior:general-store:0',
    });
  });

  it('rejects malformed NaN room ids before generation', () => {
    expect(() => assertValidRoomId('NaN,-21,NaN')).toThrow(/NaN/);
  });
});
