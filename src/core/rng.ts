/**
 * RNG
 */
export type RandomGenerator = () => number;
export type StatefulRandomGenerator = RandomGenerator & {
  getState: () => number;
  setState: (state: number) => void;
};

function murmurHash3(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return (Math.imul(h ^ (h >>> 16), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)) >>> 0;
}

export function createRng(seed?: string): StatefulRandomGenerator {
  let state = seed ? murmurHash3(seed) : (Math.random() * 0xffffffff) >>> 0;
  const rng = (() => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }) as StatefulRandomGenerator;
  rng.getState = () => state;
  rng.setState = (nextState: number) => {
    state = Math.trunc(nextState) >>> 0;
  };
  return rng;
}

export function isStatefulRandomGenerator(rng: RandomGenerator): rng is StatefulRandomGenerator {
  const candidate = rng as Partial<StatefulRandomGenerator>;
  return typeof candidate.getState === 'function' && typeof candidate.setState === 'function';
}

export function withFallback(rng?: RandomGenerator): RandomGenerator {
  return rng ?? Math.random;
}

/** Random integer in [0, maxExclusive). */
export function randomInt(rng: RandomGenerator, maxExclusive: number): number {
  return Math.floor(rng() * maxExclusive);
}
