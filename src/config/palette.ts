export type HueRange = {
  start: number;
  end: number;
};

export type PaletteConfig = {
  background: {
    hueRanges: HueRange[];
    saturation: { min: number; max: number };
    lightness: { min: number; max: number };
  };
  wall: {
    darkenFactor: number;
    outlineDarkenFactor: number;
  };
  grid: {
    color: number;
    alpha: number;
  };
  ladder: {
    color: number;
    outlineDarkenFactor: number;
  };
  apple: {
    color: number;
    outlineDarkenFactor: number;
  };
  snake: {
    bodyColor: number;
    minAlpha: number;
    fadeStep: number;
    outlineDarkenFactor: number;
  };
};

export const paletteConfig: PaletteConfig = {
  background: {
    hueRanges: [
      { start: 0, end: 40 },
      { start: 200, end: 260 },
      { start: 285, end: 340 },
    ],
    saturation: { min: 0.12, max: 0.32 },
    lightness: { min: 0.16, max: 0.26 },
  },
  wall: {
    darkenFactor: 0.45,
    outlineDarkenFactor: 0.25,
  },
  grid: {
    color: 0xffffff,
    alpha: 0.06,
  },
  ladder: {
    color: 0xb8865e,
    outlineDarkenFactor: 0.4,
  },
  apple: {
    color: 0xff6b6b,
    outlineDarkenFactor: 0.45,
  },
  snake: {
    bodyColor: 0x5dd6a2,
    minAlpha: 0.6,
    fadeStep: 0.015,
    outlineDarkenFactor: 0.35,
  },
};

function clampChannel(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function randomInRange(min: number, max: number, rng: () => number): number {
  return min + (max - min) * rng();
}

function pickHue(ranges: HueRange[], rng: () => number): number {
  const range = ranges[Math.floor(rng() * ranges.length)];
  const normalized = randomInRange(range.start, range.end, rng);
  return normalized % 360;
}

export function hslToHex(h: number, s: number, l: number): number {
  const hue = (h % 360) / 360;
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const hPrime = hue * 6;
  const x = chroma * (1 - Math.abs((hPrime % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;

  if (hPrime >= 0 && hPrime < 1) {
    r = chroma;
    g = x;
  } else if (hPrime >= 1 && hPrime < 2) {
    r = x;
    g = chroma;
  } else if (hPrime >= 2 && hPrime < 3) {
    g = chroma;
    b = x;
  } else if (hPrime >= 3 && hPrime < 4) {
    g = x;
    b = chroma;
  } else if (hPrime >= 4 && hPrime < 5) {
    r = x;
    b = chroma;
  } else {
    r = chroma;
    b = x;
  }

  const m = l - chroma / 2;
  const red = clampChannel((r + m) * 255);
  const green = clampChannel((g + m) * 255);
  const blue = clampChannel((b + m) * 255);

  return (red << 16) | (green << 8) | blue;
}

export function randomBackgroundColor(rng: () => number = Math.random): number {
  const hue = pickHue(paletteConfig.background.hueRanges, rng);
  const saturation = randomInRange(
    paletteConfig.background.saturation.min,
    paletteConfig.background.saturation.max,
    rng
  );
  const lightness = randomInRange(
    paletteConfig.background.lightness.min,
    paletteConfig.background.lightness.max,
    rng
  );
  return hslToHex(hue, saturation, lightness);
}

export function darkenColor(hex: number, factor: number): number {
  const r = clampChannel(((hex >> 16) & 0xff) * (1 - factor));
  const g = clampChannel(((hex >> 8) & 0xff) * (1 - factor));
  const b = clampChannel((hex & 0xff) * (1 - factor));
  return (r << 16) | (g << 8) | b;
}