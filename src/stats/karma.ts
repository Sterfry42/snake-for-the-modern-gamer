export const KARMA_MIN = -100;
export const KARMA_MAX = 100;
export const KARMA_ALIGNMENT_THRESHOLD = 10;

export type KarmaDisposition = 'bad' | 'neutral' | 'good';

export interface KarmaState {
  value: number;
  talkedActorIds: string[];
  angelProvoked: boolean;
}

export interface KarmaView {
  value: number;
  disposition: KarmaDisposition;
}

export function createDefaultKarmaState(): KarmaState {
  return { value: 0, talkedActorIds: [], angelProvoked: false };
}

export function normalizeKarmaState(value: unknown): KarmaState {
  if (!value || typeof value !== 'object') return createDefaultKarmaState();
  const candidate = value as Partial<KarmaState>;
  return {
    value: clampKarma(Number(candidate.value ?? 0)),
    talkedActorIds: Array.isArray(candidate.talkedActorIds)
      ? [...new Set(candidate.talkedActorIds.filter((id): id is string => typeof id === 'string'))]
      : [],
    angelProvoked: Boolean(candidate.angelProvoked),
  };
}

export function clampKarma(value: number): number {
  return Math.max(KARMA_MIN, Math.min(KARMA_MAX, Math.round(Number.isFinite(value) ? value : 0)));
}

export function karmaDisposition(value: number): KarmaDisposition {
  const clamped = clampKarma(value);
  if (clamped >= KARMA_ALIGNMENT_THRESHOLD) return 'good';
  if (clamped <= -KARMA_ALIGNMENT_THRESHOLD) return 'bad';
  return 'neutral';
}

export function karmaView(state: KarmaState): KarmaView {
  return { value: clampKarma(state.value), disposition: karmaDisposition(state.value) };
}

export function karmaAfterlifeDestination(value: number): 'heaven' | 'hell' {
  return clampKarma(value) >= 0 ? 'heaven' : 'hell';
}
