import { describe, expect, it } from 'vitest';
import { isSnakeSceneRuntimeReady } from '../snakeSceneStartup.js';

describe('SnakeScene async startup', () => {
  it('stays inactive until SnakeGame initialization finishes', () => {
    expect(isSnakeSceneRuntimeReady(undefined)).toBe(false);
    expect(isSnakeSceneRuntimeReady(null)).toBe(false);
    expect(isSnakeSceneRuntimeReady({})).toBe(true);
  });
});
