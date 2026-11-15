import type { RandomGenerator } from '../core/rng.js';
import type { BulletTrainDecoration } from './bulletTrainTypes.js';

/**
 * Bullet train station presentation.
 *
 * Station placement and destination selection live in the
 * BulletTrainStructureResolver; this service only owns the platform
 * decoration layout stamped next to the entrance tile.
 */

/** Generate decorations for a station entrance deterministically. */
export function generateDecorations(
  entranceX: number,
  entranceY: number,
  rng: RandomGenerator,
): BulletTrainDecoration[] {
  const decorations: BulletTrainDecoration[] = [];

  // Lanterns flanking the entrance
  const lanternColors = [0xff4444, 0xff6644, 0xffaa22, 0xff8844];
  decorations.push({
    type: 'lantern',
    x: entranceX - 1,
    y: entranceY,
    color: lanternColors[Math.floor(rng() * lanternColors.length)],
  });
  decorations.push({
    type: 'lantern',
    x: entranceX + 1,
    y: entranceY,
    color: lanternColors[Math.floor(rng() * lanternColors.length)],
  });

  // Ticket booth at a corner
  const boothX = entranceX - 2;
  const boothY = entranceY - 1;
  decorations.push({ type: 'ticket-booth', x: boothX, y: boothY });

  // Bench facing the platform
  const benchFacing: 'north' | 'south' = rng() > 0.5 ? 'north' : 'south';
  decorations.push({
    type: 'bench',
    x: entranceX,
    y: entranceY + (benchFacing === 'south' ? 2 : -2),
    facing: benchFacing,
  });

  // Directional sign
  decorations.push({
    type: 'sign',
    x: entranceX,
    y: entranceY - 1,
    text: 'Jade Peak Express',
  });

  // Platform edge markers
  for (let dx = -3; dx <= 3; dx++) {
    if (dx === 0) continue;
    decorations.push({
      type: 'platform-edge',
      x: entranceX + dx,
      y: entranceY,
    });
  }

  return decorations;
}
