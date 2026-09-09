import { describe, expect, it } from 'vitest';
import { isSnakeSceneSupportedActorInteraction } from '../snakeSceneActorInteractionSupport.js';

describe('SnakeScene actor interaction adapter', () => {
  it('passes civic interactions through to the player-facing relationship popup', () => {
    expect(
      [
        'run-for-mayor',
        'campaign-shake-hands',
        'campaign-button',
        'campaign-smear',
        'campaign-buy-round',
        'mayor-free-beer',
      ].every((id) => isSnakeSceneSupportedActorInteraction(id)),
    ).toBe(true);
  });
});
