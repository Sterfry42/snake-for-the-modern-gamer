export type SpellSchool = 'destruction' | 'alteration' | 'conjuration' | 'illusion' | 'restoration';

export type SpellFailureReason =
  | 'unknown-spell'
  | 'not-known'
  | 'not-loaded'
  | 'insufficient-mana'
  | 'invalid-target'
  | 'summon-limit'
  | 'blocked-state';

export interface SpellEffectResult {
  affectedPositions?: readonly { x: number; y: number }[];
  affectedActorIds?: readonly string[];
  magnitude?: number;
}

export interface SpellCastContext {
  requireLoaded?: boolean;
}

export type SpellCastCheck = { ok: true } | { ok: false; reason: SpellFailureReason };

export interface SpellRuntime {
  hasRatFamiliar(): boolean;
  castArcanePulse(): SpellEffectResult;
  castSummonRatFamiliar(): SpellEffectResult;
}

export interface SpellDefinition {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly school: SpellSchool;
  readonly tags: readonly string[];
  readonly manaCost: number;
  readonly canCast?: (runtime: SpellRuntime, context: SpellCastContext) => SpellCastCheck;
  readonly cast: (runtime: SpellRuntime, context: SpellCastContext) => SpellEffectResult;
}

export type SpellCastResult =
  | {
      ok: true;
      spellId: string;
      label: string;
      school: SpellSchool;
      tags: readonly string[];
      manaSpent: number;
      overcastSegments: number;
      affectedPositions?: readonly { x: number; y: number }[];
      affectedActorIds?: readonly string[];
      magnitude?: number;
    }
  | {
      ok: false;
      spellId: string;
      reason: SpellFailureReason;
      label?: string;
      manaMissing?: number;
    };
