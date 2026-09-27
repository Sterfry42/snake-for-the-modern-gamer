import { resolveNumericModifier, type ModifierAtom } from './modifierResolver.js';

export type DerivedStatId =
  | 'maxHealth'
  | 'actionStepIntervalScalar'
  | 'manaMax'
  | 'manaRegen'
  | 'pickupRadius'
  | 'companionCapacity'
  | 'spellSlotCapacity'
  | 'extraLifeCapacity'
  | 'nutritionCapacity'
  | 'wardDuration'
  | 'storedVitalityCapacity'
  | 'shopPriceScalar';

export interface DerivedStatModifier {
  stat: DerivedStatId;
  operation: 'add' | 'multiply';
  value: number;
}

export interface DerivedStatSource {
  id: string;
  category: 'special' | 'background' | 'class' | 'faith' | 'perk' | 'equipment' | 'status';
  modifiers: readonly DerivedStatModifier[];
}

export interface DerivedStatBreakdown {
  base: number;
  additions: readonly { sourceId: string; value: number }[];
  multipliers: readonly { sourceId: string; value: number }[];
  value: number;
}

const DEFAULT_BASES: Record<DerivedStatId, number> = {
  maxHealth: 3,
  actionStepIntervalScalar: 1,
  manaMax: 0,
  manaRegen: 0,
  pickupRadius: 1,
  companionCapacity: 5,
  spellSlotCapacity: 1,
  extraLifeCapacity: 0,
  nutritionCapacity: 0,
  wardDuration: 0,
  storedVitalityCapacity: 0,
  shopPriceScalar: 1,
};

const CLAMPS: Record<DerivedStatId, readonly [number, number]> = {
  maxHealth: [1, 99],
  actionStepIntervalScalar: [0.2, 3],
  manaMax: [0, 9_999],
  manaRegen: [0, 999],
  pickupRadius: [0, 20],
  companionCapacity: [0, 20],
  spellSlotCapacity: [0, 20],
  extraLifeCapacity: [0, 20],
  nutritionCapacity: [0, 99],
  wardDuration: [0, 9_999],
  storedVitalityCapacity: [0, 99],
  shopPriceScalar: [0.25, 1],
};

export class DerivedStatResolver {
  private readonly sources = new Map<string, DerivedStatSource>();

  constructor(private readonly bases: Readonly<Partial<Record<DerivedStatId, number>>> = {}) {}

  setSource(source: DerivedStatSource): void {
    this.sources.set(source.id, {
      ...source,
      modifiers: source.modifiers.map((modifier) => ({ ...modifier })),
    });
  }

  removeSource(sourceId: string): boolean {
    return this.sources.delete(sourceId);
  }

  clear(): void {
    this.sources.clear();
  }

  resolve(stat: DerivedStatId): number {
    return this.getBreakdown(stat).value;
  }

  getBreakdown(stat: DerivedStatId): DerivedStatBreakdown {
    const base = this.bases[stat] ?? DEFAULT_BASES[stat];
    const additions: Array<{ sourceId: string; value: number }> = [];
    const multipliers: Array<{ sourceId: string; value: number }> = [];
    const atoms: ModifierAtom<DerivedStatId>[] = [];
    for (const source of [...this.sources.values()].sort((a, b) => a.id.localeCompare(b.id))) {
      for (const modifier of source.modifiers) {
        if (modifier.stat !== stat || !Number.isFinite(modifier.value)) continue;
        (modifier.operation === 'add' ? additions : multipliers).push({
          sourceId: source.id,
          value: modifier.value,
        });
        // Additive atoms run before multiplicative ones so the resolver applies
        // every source's additions first, matching the historical breakdown math.
        atoms.push({
          id: `${source.id}:${modifier.operation}`,
          sourceId: source.id,
          sourceKind: source.category,
          target: stat,
          op: modifier.operation,
          value: modifier.value,
          priority: modifier.operation === 'add' ? 0 : 1,
        });
      }
    }
    const [minimum, maximum] = CLAMPS[stat];
    const value = resolveNumericModifier(atoms, stat, { base, min: minimum, max: maximum });
    return {
      base,
      additions,
      multipliers,
      value,
    };
  }
}
