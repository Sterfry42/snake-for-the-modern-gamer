import { describe, expect, it, vi } from 'vitest';
import { usePrimaryAbility } from '../primaryAbility.js';

describe('primary ability dispatch', () => {
  it('uses the action slot exactly once', () => {
    const useActionSlot = vi.fn(() => ({ ok: true as const, label: 'Arcane Pulse' }));
    const onFailure = vi.fn();

    expect(usePrimaryAbility({ useActionSlot, onFailure }, false)).toBe(true);
    expect(useActionSlot).toHaveBeenCalledTimes(1);
    expect(onFailure).not.toHaveBeenCalled();
  });

  it('consumes paused input without using the slot', () => {
    const useActionSlot = vi.fn(() => ({ ok: true as const, label: 'Arcane Pulse' }));
    const onFailure = vi.fn();

    expect(usePrimaryAbility({ useActionSlot, onFailure }, true)).toBe(true);
    expect(useActionSlot).not.toHaveBeenCalled();
  });

  it('reports a failed cast once', () => {
    const useActionSlot = vi.fn(() => ({ ok: false as const, reason: 'No ability bound.' }));
    const onFailure = vi.fn();

    usePrimaryAbility({ useActionSlot, onFailure }, false);
    expect(onFailure).toHaveBeenCalledOnce();
    expect(onFailure).toHaveBeenCalledWith('No ability bound.');
  });
});
