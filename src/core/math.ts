export interface Vector2Like {
  x: number;
  y: number;
}

export function cloneVector(vec: Vector2Like): Vector2Like {
  return { x: vec.x, y: vec.y };
}

export function addVectors(a: Vector2Like, b: Vector2Like): Vector2Like {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function vectorEquals(a: Vector2Like, b: Vector2Like): boolean {
  return a.x === b.x && a.y === b.y;
}

export function vectorKey(vec: Vector2Like): string {
  return `${vec.x},${vec.y}`;
}

export function manhattanDistance(a: Vector2Like, b: Vector2Like): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export function withinBounds(vec: Vector2Like, width: number, height: number): boolean {
  return vec.x >= 0 && vec.x < width && vec.y >= 0 && vec.y < height;
}

// ── Numeric helpers ──────────────────────────────────────────────

/** Clamp a number between min and max bounds.
 * If `value` is not finite (NaN or Infinity) and `fallback` is provided, returns `fallback`.
 */
export function clamp(value: number, min: number, max: number, fallback?: number): number {
  if (!Number.isFinite(value)) {
    if (fallback !== undefined) return fallback;
    return min;
  }
  return Math.max(min, Math.min(max, value));
}

/** Clamp a number to the [0, 1] range. */
export function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

/** Linear interpolation between a and b by t (t is not clamped). */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Pick a random element from an array using the given RNG. */
export function pickRandom<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

/** Return a new array with only unique values (uses Set internally). */
export function unique<T>(values: readonly T[]): T[] {
  return Array.from(new Set(values));
}

// ── Direction helpers ────────────────────────────────────────────

/** The four cardinal directions (right, left, down, up). */
export const CARDINAL_DIRECTIONS: readonly Vector2Like[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

/** Return a new array with elements shuffled using Fisher-Yates. */
export function shuffle<T>(rng: () => number, arr: readonly T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
