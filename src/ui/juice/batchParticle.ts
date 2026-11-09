/**
 * Per-particle interpolation for batched juice particles.
 *
 * The legacy juice code allocated one Phaser GameObject plus one tween per
 * particle (Cubic.easeOut on every property, each with its own random
 * lifetime). Batched rendering keeps the exact same per-particle math —
 * this module is the shared definition of it — while drawing many
 * particles into a single Graphics object under a single tween.
 */
export interface BatchParticleSpec {
  /** Spawn position. */
  x: number;
  y: number;
  /** Radius at birth. */
  radius: number;
  /** Fill color (0xRRGGBB). */
  color: number;
  /** Alpha at birth (fill alpha times object alpha of the legacy arc). */
  alpha: number;
  /** Position drift over the lifetime, eased like the legacy tween. */
  dx: number;
  dy: number;
  /** Scale multiplier at end of life (0 = shrink to nothing). */
  scaleEnd: number;
  /** Lifetime in milliseconds. */
  durationMs: number;
}

export interface BatchParticleValue {
  x: number;
  y: number;
  radius: number;
  alpha: number;
}

/** Phaser.Math.Easing.Cubic.Out without the Phaser dependency. */
export function cubicEaseOut(t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  return 1 - Math.pow(1 - clamped, 3);
}

/**
 * State of a batched particle at `elapsedMs` into its life, matching the
 * legacy per-particle tween exactly, or null once the particle has died.
 */
export function batchParticleValue(
  spec: BatchParticleSpec,
  elapsedMs: number,
): BatchParticleValue | null {
  if (elapsedMs >= spec.durationMs) {
    return null;
  }
  const eased = cubicEaseOut(Math.max(0, elapsedMs) / spec.durationMs);
  return {
    x: spec.x + spec.dx * eased,
    y: spec.y + spec.dy * eased,
    radius: spec.radius * (1 + (spec.scaleEnd - 1) * eased),
    alpha: spec.alpha * (1 - eased),
  };
}
