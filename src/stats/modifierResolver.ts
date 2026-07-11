export type ModifierSourceKind =
  | 'special'
  | 'skill'
  | 'equipment'
  | 'apple'
  | 'status'
  | 'zone'
  | 'artifact'
  | 'quest'
  | 'cheat';

export type ModifierOperation = 'add' | 'multiply' | 'set' | 'max' | 'min' | 'addPercent';
export type ModifierValue = number | boolean | string;

export interface ModifierAtom<TTarget extends string = string> {
  id: string;
  sourceId: string;
  sourceKind: ModifierSourceKind;
  target: TTarget;
  op: ModifierOperation;
  value: ModifierValue;
  priority?: number;
  expiresAtTick?: number;
}

export interface ModifierResolveContext {
  tick?: number;
}

export interface NumericModifierOptions {
  base?: number;
  min?: number;
  max?: number;
}

export function resolveNumericModifier<TTarget extends string>(
  atoms: readonly ModifierAtom<TTarget>[],
  target: TTarget,
  options: NumericModifierOptions = {},
  context: ModifierResolveContext = {},
): number {
  let value = options.base ?? 0;
  for (const atom of activeAtoms(atoms, target, context)) {
    if (typeof atom.value !== 'number') continue;
    switch (atom.op) {
      case 'add':
      case 'addPercent':
        value += atom.value;
        break;
      case 'multiply':
        value *= atom.value;
        break;
      case 'set':
        value = atom.value;
        break;
      case 'max':
        value = Math.max(value, atom.value);
        break;
      case 'min':
        value = Math.min(value, atom.value);
        break;
    }
  }
  return clamp(value, options.min, options.max);
}

export function resolveBooleanModifier<TTarget extends string>(
  atoms: readonly ModifierAtom<TTarget>[],
  target: TTarget,
  base = false,
  context: ModifierResolveContext = {},
): boolean {
  let value = base;
  for (const atom of activeAtoms(atoms, target, context)) {
    if (typeof atom.value !== 'boolean') continue;
    if (atom.op === 'set') value = atom.value;
  }
  return value;
}

function activeAtoms<TTarget extends string>(
  atoms: readonly ModifierAtom<TTarget>[],
  target: TTarget,
  context: ModifierResolveContext,
): ModifierAtom<TTarget>[] {
  return atoms
    .filter((atom) => atom.target === target && !isExpired(atom, context.tick))
    .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
}

function isExpired(atom: ModifierAtom, tick?: number): boolean {
  return tick !== undefined && atom.expiresAtTick !== undefined && atom.expiresAtTick <= tick;
}

function clamp(value: number, min?: number, max?: number): number {
  return Math.max(min ?? Number.NEGATIVE_INFINITY, Math.min(max ?? Number.POSITIVE_INFINITY, value));
}
