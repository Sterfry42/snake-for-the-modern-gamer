import { describe, expect, it } from 'vitest';
import type { WorldRenderScene } from '../worldRenderScene.js';
import { Dlss5PresentationProcessor } from './dlss5PresentationProcessor.js';

function scene(x: number): WorldRenderScene {
  return {
    rooms: [],
    effects: [],
    sprites: [
      {
        id: 'snake:0',
        kind: 'snake',
        x,
        y: 1,
        width: 1,
        height: 1,
        anchorY: 1,
        color: 0xffffff,
        visual: { defaultTextureKey: 'snake' },
        roomId: '0,0,0',
      },
    ],
  };
}

describe('DLSS 5 presentation processor', () => {
  it('does not reset interpolation phase for freshly rebuilt identical scenes', () => {
    const processor = new Dlss5PresentationProcessor();

    processor.process(scene(0), 0, 100);
    processor.process(scene(1), 100, 100);
    const result = processor.process(scene(1), 150, 100);

    expect(result.sprites[0]).toMatchObject({ x: 0.5, y: 1 });
  });
});
