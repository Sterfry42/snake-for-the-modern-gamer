import type { ActionSlotUseResult } from './actionSlots.js';

export interface PrimaryAbilityRuntime {
  useActionSlot(): ActionSlotUseResult;
  onFailure(reason: string): void;
}

export function usePrimaryAbility(runtime: PrimaryAbilityRuntime, paused: boolean): boolean {
  if (paused) return true;
  const result = runtime.useActionSlot();
  if (result.ok === false) runtime.onFailure(result.reason);
  return true;
}
