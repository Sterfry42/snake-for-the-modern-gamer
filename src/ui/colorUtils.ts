/**
 * Color Utils
 *
 * Shared helpers for 0xRRGGBB color values.
 */

/** Render a 0xRRGGBB number as a CSS hex string. */
export function colorToCss(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

/** Mix two 0xRRGGBB colors; amount 0 keeps `a`, 1 keeps `b`. */
export function mixColor(a: number, b: number, amount: number): number {
  const ar = (a >> 16) & 0xff;
  const ag = (a >> 8) & 0xff;
  const ab = a & 0xff;
  const br = (b >> 16) & 0xff;
  const bg = (b >> 8) & 0xff;
  const bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * amount);
  const g = Math.round(ag + (bg - ag) * amount);
  const blue = Math.round(ab + (bb - ab) * amount);
  return (r << 16) | (g << 8) | blue;
}
