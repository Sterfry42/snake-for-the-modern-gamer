import { describe, expect, it, vi } from 'vitest';
import {
  resolveSpanishWebAudioFontState,
  SpanishWebAudioFontMusic,
} from './spanishWebAudioFontMusic.js';

function createAudioContextStub(): AudioContext {
  const gain = {
    gain: { value: 0 },
    connect: vi.fn(),
    disconnect: vi.fn(),
  };
  const buffer = {
    getChannelData: () => new Float32Array(128),
  };
  return {
    sampleRate: 44100,
    currentTime: 1,
    destination: {},
    createGain: () => gain,
    createBuffer: () => buffer,
  } as unknown as AudioContext;
}

describe('SpanishWebAudioFontMusic', () => {
  it('does not request WebAudioFont states for non-Mosaic music paths', () => {
    expect(
      resolveSpanishWebAudioFontState({
        biomeId: 'verdigris-basin',
        archetypeId: 'classic',
        exposure: 'direct-sun',
      }),
    ).toBeNull();
    expect(
      resolveSpanishWebAudioFontState({
        biomeId: 'mosaic-coast',
        archetypeId: 'classic',
        exposure: 'shade',
      }),
    ).toBe('mosaic-coast-shade');
  });

  it('uses WebAudioFontPlayer queueWaveTable when available', () => {
    const queueWaveTable = vi.fn();
    vi.stubGlobal('window', {
      WebAudioFontPlayer: class {
        queueWaveTable = queueWaveTable;
      },
    });

    const music = new SpanishWebAudioFontMusic(createAudioContextStub());
    music.start('mosaic-coast-base');

    expect(queueWaveTable).toHaveBeenCalled();
    music.stop();
    vi.unstubAllGlobals();
  });
});
