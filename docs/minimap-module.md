# Minimap Module

## 1. Requirements

### Feature goal

The minimap is a tactical room-preview tool. It should help the player understand the immediate danger around their current zone before crossing into another zone.

The minimap is not intended to be a decorative world map, exploration tracker, or fog-of-war system. It should be a compact, readable representation of the current room and the surrounding eight rooms.

### Core requirements

- Display **Minimap Mode A**: a 3x3 grid of rooms.
- The center room represents the player/current snake room.
- The surrounding eight cells represent the adjacent rooms:
  - northwest
  - north
  - northeast
  - west
  - east
  - southwest
  - south
  - southeast
- Each minimap room must be based on the actual room layout data, not a symbolic placeholder.
- The minimap should show at minimum:
  - walls
  - barriers / solid tiles
  - water / hazardous water-like tiles
  - snake body
  - snake head
- The minimap should not use fog of war.
- The minimap should not hide unvisited adjacent rooms.
- The minimap should be toggleable after being unlocked.
- The minimap should be purchasable in the style/customization/pause menu for **50 points**.
- The style/customization/pause menu must support scrolling so this and future options can fit cleanly.

### Unlock requirements

Before purchase:

- The style/customization menu should show a purchasable item:
  - `Minimap Module — 50`
- If the player does not have enough points, the purchase option should be disabled or visibly unaffordable.
- If the player has enough points, selecting the item should spend 50 points and unlock the minimap.

After purchase:

- The menu item should become a toggle:
  - `Minimap: On`
  - `Minimap: Off`
- The minimap should remember whether it is enabled or disabled.
- Optional but recommended: add a hotkey such as `M` to toggle the minimap after purchase.

### Save requirements

The game should persist:

- whether the minimap has been unlocked
- whether the minimap is currently enabled

Suggested flags or save fields:

```ts
ui: {
  minimapUnlocked: boolean;
  minimapEnabled: boolean;
}
```

or, if using the existing flag system:

```ts
ui.minimap.unlocked
ui.minimap.enabled
```

### Non-goals for version 1

Do not include these in the first implementation unless they are extremely easy:

- fog of war
- room labels
- NPC icons
- shop icons
- quest labels
- detailed building/structure markers
- animated minimap effects
- zoom modes
- large fullscreen map
- player pings
- pathfinding

These can come later. Version 1 should stay focused on tactical readability.

---

## 2. Design

### Design principle

The minimap should answer this question instantly:

> “If I move into a neighboring zone, am I about to hit a wall, barrier, water, or my own snake body?”

The minimap should feel like a **snake survival radar**. It should be compact, slightly abstract, but grounded in the real layout of nearby rooms.

### Layout

Use a fixed 3x3 room grid:

```text
┌─────┬─────┬─────┐
│ NW  │  N  │ NE  │
├─────┼─────┼─────┤
│ W   │ YOU │  E  │
├─────┼─────┼─────┤
│ SW  │  S  │ SE  │
└─────┴─────┴─────┘
```

The current room should be visually emphasized with a brighter border or subtle highlight.

Neighboring rooms should remain readable, but can be slightly dimmer than the current room.

### Recommended placement

Place the minimap in the top-right corner of the screen.

Recommended size:

```ts
const MINIMAP_WIDTH = 216;
const MINIMAP_HEIGHT = 162;
```

This gives each of the nine rooms a footprint of:

```ts
const MINI_ROOM_WIDTH = 72;
const MINI_ROOM_HEIGHT = 54;
```

Given a 32x24 room grid, this provides about 2.25 pixels per tile, which should be readable while staying compact.

Fallback smaller size if the UI feels crowded:

```ts
const MINIMAP_WIDTH = 180;
const MINIMAP_HEIGHT = 135;
const MINI_ROOM_WIDTH = 60;
const MINI_ROOM_HEIGHT = 45;
```

### Visual language

Keep the minimap intentionally simple.

Recommended categories:

| Element | Visual treatment |
|---|---|
| Empty floor | Very dark / transparent fill |
| Wall | Bright solid block |
| Barrier / solid obstacle | Bright solid block or slightly different wall tone |
| Water / hazard water | Dark blue or cyan-tinted block |
| Snake body | Thin bright line or connected blocks |
| Snake head | Brighter square or arrow-like marker |
| Current room border | Bright outline |
| Neighbor room borders | Dim outline |
| Background panel | Semi-transparent dark rectangle |

The minimap should not use too many colors. Too much detail will make it unreadable.

### Room rendering approach

Each minimap room should be a compressed thumbnail of the actual room layout.

The room should not draw every tile at full game scale. Instead, each room tile should map to a tiny minimap rectangle.

For a 32x24 room displayed at 72x54 pixels:

```ts
const tileW = MINI_ROOM_WIDTH / grid.cols;
const tileH = MINI_ROOM_HEIGHT / grid.rows;
```

Then each tile can be drawn as:

```ts
graphics.fillRect(
  roomOriginX + tile.x * tileW,
  roomOriginY + tile.y * tileH,
  Math.ceil(tileW),
  Math.ceil(tileH),
);
```

The minimap does not need perfect pixel precision. Readability matters more than exact miniature rendering.

### Snake rendering

The snake is one of the most important things on the minimap.

Rules:

- Draw the snake body over the room layout.
- Draw body segments in every visible minimap room, not just the current room, if the snake can span multiple rooms.
- Draw the current head more brightly than the rest of the body.
- If a body segment is in a neighboring room, it should still be visible.
- If the snake crosses a room boundary, the minimap should make that boundary danger readable.

The goal is to prevent the player from entering a neighboring room directly into their own body.

### Menu design

The style/customization/pause menu should become scrollable.

The minimap unlock item should live in this menu.

Suggested menu states:

Before purchase:

```text
Minimap Module — 50
Shows nearby rooms, walls, water, barriers, and snake position.
```

After purchase:

```text
Minimap: On
Shows nearby rooms, walls, water, barriers, and snake position.
```

or:

```text
Minimap: Off
Shows nearby rooms, walls, water, barriers, and snake position.
```

### Scrollable menu behavior

The menu should have:

- fixed background panel
- fixed title/header
- fixed points display
- scrollable option list
- clipping/masking so overflowing options do not draw outside the panel
- mouse wheel support
- keyboard/gamepad scroll support if practical

Suggested controls:

- mouse wheel: scroll menu
- up/down: move selection
- page up/page down: faster scroll if needed
- escape: close menu

---

## 3. Specs

### Suggested files

Possible implementation files:

```text
src/ui/minimapRenderer.ts
src/ui/scrollableMenu.ts
```

or, if the project already has a UI folder/menu renderer, place the minimap and scroll behavior there.

### Minimap renderer API

Suggested class shape:

```ts
export interface MinimapRendererOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  roomCols: number;
  roomRows: number;
}

export interface MinimapSnapshot {
  currentRoomId: string;
  snakeSegments: Array<{
    roomId: string;
    x: number;
    y: number;
    isHead?: boolean;
  }>;
}

export class MinimapRenderer {
  constructor(scene: Phaser.Scene, options: MinimapRendererOptions);

  setVisible(visible: boolean): void;

  render(snapshot: MinimapSnapshot): void;

  destroy(): void;
}
```

The renderer should own its Phaser graphics/container objects and redraw when needed.

### Room coordinate helpers

The current origin room ID is shaped like:

```ts
'0,0,0'
```

Use helper functions so the minimap can request neighboring room IDs safely.

```ts
interface ParsedRoomId {
  x: number;
  y: number;
  z: number;
}

function parseRoomId(roomId: string): ParsedRoomId {
  const [x, y, z] = roomId.split(',').map(Number);
  return { x, y, z };
}

function makeRoomId(x: number, y: number, z: number): string {
  return `${x},${y},${z}`;
}

function getNeighborRoomId(roomId: string, dx: number, dy: number): string {
  const { x, y, z } = parseRoomId(roomId);
  return makeRoomId(x + dx, y + dy, z);
}
```

### Room iteration

To render the 3x3 minimap:

```ts
const offsets = [
  { dx: -1, dy: -1 },
  { dx: 0, dy: -1 },
  { dx: 1, dy: -1 },
  { dx: -1, dy: 0 },
  { dx: 0, dy: 0 },
  { dx: 1, dy: 0 },
  { dx: -1, dy: 1 },
  { dx: 0, dy: 1 },
  { dx: 1, dy: 1 },
];
```

For each offset:

```ts
const roomId = getNeighborRoomId(currentRoomId, dx, dy);
const room = world.getRoom(roomId);
renderRoomThumbnail(room, miniRoomX, miniRoomY, miniRoomWidth, miniRoomHeight);
```

Calling `world.getRoom(roomId)` is acceptable for this feature because the minimap is intentionally truthful and does not use fog of war.

### Tile classification

Create one function to classify minimap tile types.

Example:

```ts
type MinimapTileKind = 'empty' | 'wall' | 'barrier' | 'water';

function getMinimapTileKind(tile: string): MinimapTileKind {
  switch (tile) {
    case '#':
      return 'wall';
    case 'W':
    case '~':
      return 'water';
    case 'B':
      return 'barrier';
    default:
      return 'empty';
  }
}
```

The exact tile symbols should be adjusted to match the project’s actual layout conventions.

### Rendering order

Render in this order:

1. minimap panel background
2. each room background
3. room floor/empty tint
4. walls/barriers/water
5. snake body
6. snake head
7. room grid borders
8. current room highlight border

This ensures the snake remains visible over hazards and walls.

### Performance

The minimap can be redrawn every game tick, but it probably does not need to be.

Recommended redraw triggers:

- current room changes
- snake moves
- minimap toggled on/off
- room layout changes
- water/barrier state changes

Since snake moves frequently, redrawing every movement step is acceptable for v1. Avoid complex per-frame animation until needed.

### Toggle logic

Suggested methods on the game or scene side:

```ts
function isMinimapUnlocked(): boolean {
  return Boolean(getFlag('ui.minimap.unlocked'));
}

function isMinimapEnabled(): boolean {
  return Boolean(getFlag('ui.minimap.enabled'));
}

function unlockMinimap(): void {
  setFlag('ui.minimap.unlocked', true);
  setFlag('ui.minimap.enabled', true);
}

function toggleMinimap(): void {
  if (!isMinimapUnlocked()) return;
  setFlag('ui.minimap.enabled', !isMinimapEnabled());
}
```

### Purchase logic

Suggested purchase behavior:

```ts
const MINIMAP_COST = 50;

function tryPurchaseMinimap(): boolean {
  if (isMinimapUnlocked()) return false;
  if (score < MINIMAP_COST) return false;

  score -= MINIMAP_COST;
  unlockMinimap();
  return true;
}
```

Use the project’s actual score/points economy instead of this placeholder.

### Scrollable menu implementation sketch

Suggested state:

```ts
let scrollY = 0;
let maxScrollY = 0;
```

When the wheel moves:

```ts
scene.input.on('wheel', (_pointer, _objects, _dx, dy) => {
  if (!customizeMenuOpen) return;

  scrollY = Phaser.Math.Clamp(
    scrollY + dy * 0.5,
    0,
    maxScrollY,
  );

  contentContainer.y = contentStartY - scrollY;
});
```

The content should be masked so it only appears inside the menu body.

```ts
const maskShape = scene.make.graphics({ x: 0, y: 0, add: false });
maskShape.fillRect(panelX, listY, panelWidth, listHeight);
const mask = maskShape.createGeometryMask();
contentContainer.setMask(mask);
```

### Acceptance checklist

The feature is done when:

- The minimap can be purchased for 50 points.
- The minimap can be toggled on/off after purchase.
- The minimap setting persists across save/load.
- The minimap shows a 3x3 grid of actual nearby rooms.
- The current room is centered.
- Walls are visible.
- Barriers/solid obstacles are visible.
- Water/hazard water is visible.
- Snake body is visible.
- Snake head is clearly distinguishable.
- No fog of war is used.
- The style/customization/pause menu scrolls when content exceeds the visible area.
- The minimap does not make the main game unreadable or visually cluttered.
