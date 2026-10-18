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

function sprite(
  id: string,
  kind: WorldRenderScene['sprites'][number]['kind'],
  x: number,
): WorldRenderScene['sprites'][number] {
  return {
    id,
    kind,
    x,
    y: 1,
    width: 1,
    height: 1,
    anchorY: 1,
    color: 0xffffff,
    visual: { defaultTextureKey: kind },
    roomId: '0,0,0',
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

  it('uses sprite clock phases for retained interpolation across actor and action sprites', () => {
    const processor = new Dlss5PresentationProcessor();
    const previous: WorldRenderScene = {
      rooms: [],
      effects: [],
      sprites: [
        {
          id: 'snake:0',
          kind: 'snake',
          x: 0.5,
          y: 0.5,
          width: 1,
          height: 1,
          anchorY: 1,
          color: 0xffffff,
          visual: { defaultTextureKey: 'snake' },
          roomId: '0,0,0',
        },
        {
          id: 'actor-npc:villager-1',
          kind: 'npc',
          x: 2.5,
          y: 2.5,
          width: 1,
          height: 1,
          anchorY: 1,
          color: 0xffffff,
          visual: { defaultTextureKey: 'npc' },
          roomId: '0,0,0',
        },
      ],
    };
    const current: WorldRenderScene = {
      ...previous,
      sprites: [
        { ...previous.sprites[0]!, x: 1.5 },
        { ...previous.sprites[1]!, x: 4.5 },
      ],
    };

    processor.acceptAuthoritativeScene(previous, 0);
    processor.acceptAuthoritativeScene(current, 100);

    const retained = processor.getInterpolatedSprites([
      { id: 'action', intervalMs: 100, accumulatorMs: 25 },
      { id: 'actor', intervalMs: 100, accumulatorMs: 75 },
    ]);

    expect(retained.find((sprite) => sprite.id === 'snake:0')).toMatchObject({ x: 0.75 });
    expect(retained.find((sprite) => sprite.id === 'actor-npc:villager-1')).toMatchObject({
      x: 4,
    });
  });

  it('filters retained interpolation to moving entity kinds', () => {
    const processor = new Dlss5PresentationProcessor();
    const previous: WorldRenderScene = {
      rooms: [],
      effects: [],
      sprites: [
        sprite('snake:0', 'snake', 0.5),
        sprite('furniture:chair', 'furniture', 2.5),
        sprite('vegetation:grass', 'vegetation', 3.5),
      ],
    };
    const current: WorldRenderScene = {
      ...previous,
      sprites: [
        sprite('snake:0', 'snake', 1.5),
        sprite('furniture:chair', 'furniture', 2.5),
        sprite('vegetation:grass', 'vegetation', 3.5),
      ],
    };

    processor.acceptAuthoritativeScene(previous, 0);
    processor.acceptAuthoritativeScene(current, 100);

    expect(
      processor.getInterpolatedSprites([{ id: 'action', intervalMs: 100, accumulatorMs: 50 }]),
    ).toEqual([{ id: 'snake:0', kind: 'snake', x: 1, y: 1 }]);
  });

  it('routes footballs and bombs through the bullet clock', () => {
    const processor = new Dlss5PresentationProcessor();
    const previous: WorldRenderScene = {
      rooms: [],
      effects: [],
      sprites: [sprite('football:1', 'football', 0.5), sprite('bomb:1', 'bomb', 1.5)],
    };
    const current: WorldRenderScene = {
      ...previous,
      sprites: [sprite('football:1', 'football', 1.5), sprite('bomb:1', 'bomb', 2.5)],
    };

    processor.acceptAuthoritativeScene(previous, 0);
    processor.acceptAuthoritativeScene(current, 100);

    const retained = processor.getInterpolatedSprites([
      { id: 'action', intervalMs: 100, accumulatorMs: 0 },
      { id: 'bullet', intervalMs: 100, accumulatorMs: 25 },
    ]);

    expect(retained).toEqual([
      { id: 'football:1', kind: 'football', x: 0.75, y: 1 },
      { id: 'bomb:1', kind: 'bomb', x: 1.75, y: 1 },
    ]);
  });
});
