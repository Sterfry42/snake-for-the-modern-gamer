/**
 * Save Normalize
 *
 * Shared normalization helpers for untrusted save data.
 * The wise old snake's tests are never wrong — its save files, less so.
 */

/** Coerce unknown input to a non-negative integer (0 for anything unusable). */
export function positiveInteger(value: unknown): number {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? Math.max(0, Math.floor(numeric)) : 0;
}

/** Deduplicate an unknown array of strings, preserving first-seen order. */
export function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((entry): entry is string => typeof entry === 'string'))];
}

/** Deduplicate an unknown array into positive integers, sorted ascending. */
export function numberList(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(value.map((entry) => positiveInteger(entry)).filter((entry) => entry > 0)),
  ].sort((a, b) => a - b);
}

/** Type guard for plain object save payloads. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
