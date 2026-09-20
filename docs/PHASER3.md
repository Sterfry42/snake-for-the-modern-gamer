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

## Room Coordinates vs. World Coordinates

**CRITICAL**: The game uses a multi-room world where each room has its own local coordinate system. Snake body positions are stored as **room-local coordinates** (relative to the room's top-left corner). When rendering elements that follow the snake (like the emoticon thought bubble), you MUST convert room-local coordinates to world coordinates.

### The Bug Pattern

A common mistake is to use snake body coordinates directly without converting them to world coordinates:

```typescript
// WRONG — only works in room 0,0,0
const cx = head.x * cell + cell / 2;
const cy = head.y * cell + cell / 2;
```

This only works when the room ID is `"0,0,0"` because `roomX = 0` and `roomY = 0` make the offset zero. In any other room (e.g., `"1,0,0"` or `"0,1,0"`), the snake's position will be offset by the room's world position, and elements drawn at room-local coordinates will appear in the wrong place — typically only visible in room 0,0,0.

### The Correct Pattern

Always use `parseRoomCoordinates` to get the room's world position, then subtract the room offset from the snake's body coordinates:

```typescript
// CORRECT — works in all rooms
const [roomX, roomY] = this.parseRoomCoordinates(currentRoomId);
const localHeadX = head.x - roomX * room.layout[0].length;
const localHeadY = head.y - roomY * room.layout.length;
const cx = localHeadX * cell + cell / 2;
const cy = localHeadY * cell + cell / 2;
```

### Key Rules

1. **Snake body coordinates are room-local**: `head.x` and `head.y` are relative to the current room's top-left corner, not the world origin.
2. **Room IDs encode world position**: A room ID like `"1,0,0"` means `roomX=1, roomY=0, roomZ=0`.
3. **Always convert before rendering**: Any element that needs to appear at the snake's position (thought bubbles, indicators, effects) must convert room-local to world coordinates.
4. **Use `parseRoomCoordinates`**: This helper method parses the room ID and returns `[roomX, roomY, roomZ]`.
5. **Room dimensions vary**: Use `room.layout[0].length` for room width and `room.layout.length` for room height — do not assume a fixed grid size.

### Example: Drawing Above the Snake's Head

```typescript
private drawEmoticonThoughtBubble(
  snakeBody: readonly Vector2Like[],
  emoticonId: string | null,
  _direction: Vector2Like,
  ghostly: boolean,
  room: RoomSnapshot,
  currentRoomId: string,
): void {
  const head = snakeBody[0];
  const cell = this.grid.cell;

  // Convert room-local to world coordinates
  const [roomX, roomY] = this.parseRoomCoordinates(currentRoomId);
  const localHeadX = head.x - roomX * room.layout[0].length;
  const localHeadY = head.y - roomY * room.layout.length;
  const cx = localHeadX * cell + cell / 2;
  const cy = localHeadY * cell + cell / 2;

  // Position bubble above head
  const bubbleCx = cx;
  const bubbleCy = cy - cell * 0.9;
  // ... draw bubble at (bubbleCx, bubbleCy)
}
```

### Debugging Tips

If an element only appears in room 0,0,0:
1. Check if it uses snake body coordinates directly without conversion
2. Verify it receives `currentRoomId` and `room` parameters
3. Add a console log to print `roomX`, `roomY`, and the final `cx`, `cy` values
4. Check if the element is being drawn at the correct depth (use `setDepth()`)

### Depth Layers

Elements have a depth hierarchy that determines draw order:

| Element | Depth |
|---|---|
| Snake body | `SNAKE_LAYER_DEPTH` (22) |
| Snake hat | `SNAKE_LAYER_DEPTH + 1` (23) |
| Emoticon bubble graphics | `SNAKE_LAYER_DEPTH + 2` (24) |
| Emoticon bubble text | `SNAKE_LAYER_DEPTH + 3` (25) |

Always ensure overlays are at a higher depth than the elements they overlay.

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
