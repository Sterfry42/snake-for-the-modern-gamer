import { describe, expect, it } from 'vitest';
import { AppleBitePresentation } from '../AppleBitePresentation.js';

const apple = { roomId: '0,0,0', spawnId: 1, typeId: 'normal', color: 0, position: { x: 5, y: 5 } };

describe('predicted apple feedback', () => {
  it('hides the selected apple, plays one bite for both lanes, and reveals a replacement apple', () => {
    const bites = new AppleBitePresentation();
    bites.useEpoch(1);
    expect(bites.predict(apple, apple.position, 4, 0)).toBe(true);
    expect(bites.hidden(apple, 3, 10, true)).toBe(true);
    expect(bites.confirm(1, 4)).toBe(false);
    expect(bites.confirm(1, 4)).toBe(false);
    expect(bites.hidden(apple, 4, 20, true)).toBe(true);
    expect(bites.hidden({ ...apple, spawnId: 2 }, 4, 20, true)).toBe(false);
  });

  it('restores on correction, timeout, hold or epoch change and excludes special apples', () => {
    const bites = new AppleBitePresentation();
    bites.useEpoch(1);
    expect(bites.predict({ ...apple, typeId: 'roadRash' }, apple.position, 4, 0)).toBe(false);
    bites.predict(apple, apple.position, 4, 0);
    expect(bites.hidden(apple, 5, 10, true)).toBe(false);
    bites.predict(apple, apple.position, 6, 100);
    expect(bites.hidden(apple, 5, 501, true)).toBe(false);
    bites.predict(apple, apple.position, 7, 600);
    expect(bites.hidden(apple, 6, 601, false)).toBe(false);
    bites.confirm(1, 8);
    bites.useEpoch(2);
    expect(bites.hidden(apple, 0, 610, true)).toBe(false);
  });
});
