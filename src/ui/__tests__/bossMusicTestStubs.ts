import { vi } from 'vitest';

export function createAudioParam(): { value: number; setValueAtTime: ReturnType<typeof vi.fn> } {
  return { value: 0, setValueAtTime: vi.fn() };
}

export function createOscillatorNodeStub(context?: Record<string, unknown>) {
  return {
    type: 'sine',
    frequency: createAudioParam(),
    gain: createAudioParam(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    context,
  };
}

export function createGainNodeStub(context: Record<string, unknown>) {
  return {
    gain: createAudioParam(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    context,
  };
}

export function createGainWithContext() {
  const context = {
    createOscillator: () => createOscillatorNodeStub(),
    createGain: () => createGainNodeStub(context),
  };
  const gain = createGainNodeStub(context);
  return { gain: gain as unknown as GainNode, context };
}
