# Phaser 3 Reference

## Coordinate System

Phaser 3 uses a **top-left origin** coordinate system:

- **X axis**: 0 is on the **left**, increases to the **right** (normal)
- **Y axis**: 0 is at the **top**, increases **downward** (NOT bottom-up)

This is the opposite of what many math/graphics contexts use. Key implications:

| Goal | X | Y |
|---|---|---|
| Top-left corner | `0` | `0` |
| Top-right corner | `width` | `0` |
| Bottom-left corner | `0` | `height` |
| Bottom-right corner | `width` | `height` |
| Offset from bottom-left | `offset` | `height - offset` |
| Centered | `width / 2` | `height / 2` |

When positioning UI elements in corners, always use `height - offset` for Y to place things near the bottom. Using `height + offset` will push elements off-screen.

## Quirks

### Graphics Objects Use Bounding-Box Origin, Not Shape Center

When you create a `Graphics` object and draw a circle with `fillCircle(radius, radius, radius)`, the position of the graphics object itself corresponds to the **top-left corner of the bounding box** of the drawn shape, not the center of the circle. The circle is drawn at `(0, 0)` relative to the graphics origin, spanning from `(0, 0)` to `(diameter, diameter)`.

This means:

| Goal | Graphics X | Graphics Y |
|---|---|---|
| Circle centered at screen center | `width / 2 - radius` | `height / 2 - radius` |
| Circle 16px from bottom-left corner | `16` | `height - diameter - 16` |
| Circle 16px from top-right corner | `width - diameter - 16` | `16` |

**Key formula**: For a circle of `radius` placed at `(x, y)` with `fillCircle(radius, radius, radius)`, the bounding box occupies `(x, y)` to `(x + 2*radius, y + 2*radius)`.
