import { describe, expect, it } from 'vitest';
import { projectBillboard } from './firstPersonProjection.js';
import type { FirstPersonBillboard } from './firstPersonTypes.js';

const billboard: FirstPersonBillboard = {
  id: 'apple',
  kind: 'apple',
  x: 3.5,
  y: 1.5,
  width: 1,
  height: 1,
  anchorY: 1,
  color: 0xff0000,
};

const options = {
  width: 320,
  height: 240,
  fovRadians: (70 * Math.PI) / 180,
  nearDistance: 0.2,
};

describe('first-person projection', () => {
  it('centers an object straight ahead', () => {
    const projected = projectBillboard(billboard, { x: 1.5, y: 1.5, yaw: 0 }, options);
    expect(projected?.screenX).toBeCloseTo(160);
  });

  it('places side objects on the matching side of the screen', () => {
    const left = projectBillboard(
      { ...billboard, x: 3.5, y: 0.5 },
      { x: 1.5, y: 1.5, yaw: 0 },
      options,
    );
    const right = projectBillboard(
      { ...billboard, x: 3.5, y: 2.5 },
      { x: 1.5, y: 1.5, yaw: 0 },
      options,
    );
    expect(left?.screenX).toBeLessThan(160);
    expect(right?.screenX).toBeGreaterThan(160);
  });

  it('culls objects behind the camera', () => {
    expect(
      projectBillboard({ ...billboard, x: 0.5 }, { x: 1.5, y: 1.5, yaw: 0 }, options),
    ).toBeNull();
  });

  it('projects nearby objects larger than distant objects', () => {
    const near = projectBillboard({ ...billboard, x: 2.5 }, { x: 1.5, y: 1.5, yaw: 0 }, options);
    const far = projectBillboard({ ...billboard, x: 5.5 }, { x: 1.5, y: 1.5, yaw: 0 }, options);
    expect(near?.height).toBeGreaterThan(far?.height ?? 0);
  });
});
