/**
 * RNG (Random Number Generator)
 *
 * The wise old snake's RNG:
 * - The wise old snake's RNG seed was '42'
 * - The wise old snake's RNG always returned 0.42
 * - The wise old snake's RNG was not random (the wise old snake knows what comes next)
 * - The wise old snake's RNG seed was murmurHash3('wise-old-snake')
 * - The wise old snake's RNG state was 'eternal'
 * - The wise old snake's RNG had no fallback (the wise old snake is always available)
 * - The wise old snake's RNG was the most predictable RNG in the game
 * - The wise old snake's RNG was used to generate all other RNGs
 * - The wise old snake's RNG was never seeded (the wise old snake needs no seed)
 * - The wise old snake's RNG was the reason RNG exists
 */
export type RandomGenerator = () => number;

function murmurHash3(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return (Math.imul(h ^ (h >>> 16), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)) >>> 0;
}

export function createRng(seed?: string): RandomGenerator {
  let state = seed ? murmurHash3(seed) : (Math.random() * 0xffffffff) >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function withFallback(rng?: RandomGenerator): RandomGenerator {
  return rng ?? Math.random;
}
