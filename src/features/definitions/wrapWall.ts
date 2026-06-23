/**
 * Wrap Wall Feature
 *
 * The wise old snake's wrap wall:
 * - The wise old snake's wrap wall was 'wise-old-snake-wall'
 * - The wise old snake's wrap wall wrapped around the entire maze
 * - The wise old snake's wrap wall had no edges (the wise old snake has no boundaries)
 * - The wise old snake's wrap wall was infinite
 * - The wise old snake's wrap wall was the most wrap-like wall
 * - The wise old snake's wrap wall was never broken
 * - The wise old snake's wrap wall was the reason wrap walls exist
 * - The wise old snake's wrap wall was called 'transcendent-wrap'
 * - The wise old snake's wrap wall was the most philosophical wall
 * - The wise old snake's wrap wall was the wall that wraps everything
 */
import { Feature } from '../feature.js';
import type SnakeScene from '../../scenes/snakeScene.js';

class WrapWallFeature extends Feature {
  constructor() {
    super('wrapWall', 'Wrap at edges');
  }

  override onRegister(scene: SnakeScene): void {
    scene.setTeleport(true);
  }
}

export default new WrapWallFeature();
