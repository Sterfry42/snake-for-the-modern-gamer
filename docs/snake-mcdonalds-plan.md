# Snake McDonalds - Implementation Plan

## Overview

A 0.1% chance building that can randomly generate in any valid room. Contains a cashier NPC and a restroom with a flushable toilet that plays a sound.

---

## 1. New File: `src/world/snakeMcDonalds.ts`

**Purpose**: Building placement logic, mirroring `questHouse.ts` and `goblinCamp.ts`.

### Layout Design

```
┌──────────────────────────────────┐
│################──────────────────│  Main entrance (south door)
│#McDonalds#──────────────────────│  Sign above entrance
│################──────────────────│
│#W#W#W#W#W#W#W#W────────────────│  Counter area
│#W#W#W#W#W#W#W#W────────────────│
│#E#E#E#E#E#E#E#E────────────────│  Floor (E = floor tile)
│#E#C#E#E#E#E#E#E────────────────│  C = cashier position
│#E#E#E#E###─────────────────────│  ### = doorway to restroom
│#E#E#E#E#R#─────────────────────│  R = toilet position
│#E#E#E#E###─────────────────────│
│#E#E#E#E#E#─────────────────────│
│################────────────────│
```

**Tile characters**:
- `#` = wall
- `W` = wall interior
- `E` = floor
- `C` = cashier NPC marker
- `R` = restroom toilet marker
- `.` = door
- `T` = trim (top of door)

### Implementation

```typescript
import type { GridConfig } from '../config/gameConfig.js';
import { vectorKey } from '../core/math.js';
import type { RandomGenerator } from '../core/rng.js';

export interface McDonaldsData {
  cashier: {
    name: string;
    x: number;
    y: number;
  };
  toilet: {
    x: number;
    y: number;
  };
  bounds: { left: number; top: number; width: number; height: number };
}

const CASHIER_NAMES = [
  'McSlither',
  'Hamburgula',
  'The Fry Knight',
  'Sir Scales-a-Lot',
  'Burgerbeast',
] as const;

const MC_BUILDING_WIDTH = 16;
const MC_BUILDING_HEIGHT = 12;
const MC_MARGIN = 3;
const MC_ATTEMPTS = 20;

function setChar(layout: string[][], x: number, y: number, ch: string): void {
  if (y < 0 || y >= layout.length) return;
  if (x < 0 || y >= layout[y].length) return;
  layout[y][x] = ch;
}

function canPlaceRect(
  layout: string[][],
  left: number,
  top: number,
  width: number,
  height: number,
  forbiddenCells?: ReadonlySet<string>,
): boolean {
  for (let y = top; y < top + height; y++) {
    for (let x = left; x < left + width; x++) {
      if (layout[y]?.[x] !== '.') return false;
      if (forbiddenCells?.has(vectorKey({ x, y }))) return false;
    }
  }
  return true;
}

export function tryPlaceSnakeMcDonalds(
  layout: string[][],
  grid: GridConfig,
  rng: RandomGenerator,
  options: { forbiddenCells?: ReadonlySet<string>; margin?: number } = {},
): McDonaldsData | null {
  const margin = options.margin ?? MC_MARGIN;
  const minLeft = margin;
  const minTop = margin;
  const maxLeft = grid.cols - MC_BUILDING_WIDTH - margin;
  const maxTop = grid.rows - MC_BUILDING_HEIGHT - margin;

  if (maxLeft < minLeft || maxTop < minTop) return null;

  for (let attempt = 0; attempt < MC_ATTEMPTS; attempt++) {
    const left = minLeft + Math.floor(rng() * (maxLeft - minLeft + 1));
    const top = minTop + Math.floor(rng() * (maxTop - minTop + 1));

    if (!canPlaceRect(layout, left, top, MC_BUILDING_WIDTH, MC_BUILDING_HEIGHT, options.forbiddenCells)) {
      continue;
    }

    const right = left + MC_BUILDING_WIDTH - 1;
    const bottom = top + MC_BUILDING_HEIGHT - 1;

    // Outer walls
    for (let y = top; y <= bottom; y++) {
      setChar(layout, left, y, '#');
      setChar(layout, right, y, '#');
    }
    for (let x = left; x <= right; x++) {
      setChar(layout, x, top, '#');
      setChar(layout, x, bottom, '#');
    }

    // Interior walls
    for (let y = top + 1; y < bottom - 1; y++) {
      for (let x = left + 1; x < right; x++) {
        setChar(layout, x, y, 'W');
      }
    }

    // Floor
    for (let y = top + 1; y < bottom - 1; y++) {
      for (let x = left + 1; x < right; x++) {
        if (layout[y][x] === 'W') {
          setChar(layout, x, y, 'E');
        }
      }
    }

    // Sign
    const signY = top + 1;
    const signLeft = left + 2;
    for (let i = 0; i < 5; i++) {
      setChar(layout, signLeft + i, signY, 'M');
    }

    // Counter (north side of main area)
    const counterY = top + 3;
    const counterXStart = left + 1;
    const counterXEnd = left + 6;
    for (let x = counterXStart; x <= counterXEnd; x++) {
      setChar(layout, x, counterY, '#');
      setChar(layout, x, counterY + 1, '#');
    }

    // Cashier position (behind counter, one step up)
    const cashierX = Math.floor((counterXStart + counterXEnd) / 2);
    const cashierY = counterY - 1;
    setChar(layout, cashierX, cashierY, 'C');

    // Doorway to restroom (right side wall)
    const doorwayX = left + 8;
    const doorwayTop = top + 4;
    setChar(layout, doorwayX, doorwayTop, '.');
    setChar(layout, doorwayX, doorwayTop + 1, '.');

    // Restroom area (right side, behind wall)
    for (let y = doorwayTop; y < doorwayTop + 3; y++) {
      for (let x = doorwayX + 1; x < right; x++) {
        setChar(layout, x, y, 'E');
      }
    }

    // Toilet position
    const toiletX = right - 1;
    const toiletY = doorwayTop + 1;
    setChar(layout, toiletX, toiletY, 'R');

    // South entrance door
    const doorX = left + Math.floor(MC_BUILDING_WIDTH / 2);
    setChar(layout, doorX, bottom, '.');
    setChar(layout, doorX, bottom - 1, 'T');

    const name = CASHIER_NAMES[Math.floor(rng() * CASHIER_NAMES.length)];

    return {
      cashier: { name, x: cashierX, y: cashierY },
      toilet: { x: toiletX, y: toiletY },
      bounds: { left, top, width: MC_BUILDING_WIDTH, height: MC_BUILDING_HEIGHT },
    };
  }

  return null;
}
```

---

## 2. Modify `src/world/types.ts`

**Purpose**: Add `snakeMcDonalds` property to `RoomSnapshot`.

Add after the `goblinCamp` property (around line 46):

```typescript
  snakeMcDonalds?: {
    cashier: {
      name: string;
      x: number;
      y: number;
    };
    toilet: {
      x: number;
      y: number;
    };
    bounds: { left: number; top: number; width: number; height: number };
  };
```

---

## 3. Modify `src/world/generation/types.ts`

**Purpose**: Add `snakeMcDonalds` to `RoomGenerationContext`.

Add after `goblinCamp?: RoomSnapshot['goblinCamp'];` (around line 42):

```typescript
  snakeMcDonalds?: {
    cashier: {
      name: string;
      x: number;
      y: number;
    };
    toilet: {
      x: number;
      y: number;
    };
    bounds: { left: number; top: number; width: number; height: number };
  };
```

---

## 4. Modify `src/world/roomGenerator.ts`

**Purpose**: Wire up `snakeMcDonalds` through the generation pipeline.

In `finalizeGenerationContext()` (line 69-85), add to the returned object:

```typescript
  snakeMcDonalds: context.snakeMcDonalds,
```

This follows the existing pattern for `questGiver`, `village`, `goblinCamp`, and `temperatureReliefs`.

---

## 5. Modify `src/world/generation/stages/structureOperations.ts`

**Purpose**: Add 0.1% random chance to generate the building.

### Changes:

1. Add import at top of file:
```typescript
import { tryPlaceSnakeMcDonalds, type McDonaldsData } from '../../snakeMcDonalds.js';
```

2. Add constant near the top with other constants (around line 14):
```typescript
const SNAKE_MC_DONALDS_CHANCE = 0.001;
```

3. Update the settlement type to include the new kind:
```typescript
type SettlementKind = 'village' | 'goblin-camp' | 'quest-house' | 'snake-mcDonalds';
```

4. In `pickSettlementKind()`, add the McDonald's check at the **very top** (before other settlement checks), so it gets the first roll:

```typescript
private pickSettlementKind(guaranteed: boolean): SettlementKind | null {
  // 0.1% chance for Snake McDonalds - checked first, independent of other settlements
  if (this.rng() < SNAKE_MC_DONALDS_CHANCE) {
    return 'snake-mcDonalds';
  }

  // ... existing guaranteed logic (unchanged) ...
  // ... existing chance logic (unchanged) ...
}
```

5. In `tryPlaceSettlementKind()`, add the case:

```typescript
case 'snake-mcDonalds': {
  const mcDonalds = tryPlaceSnakeMcDonalds(context.layout, context.grid, this.rng, {
    forbiddenCells,
    margin: 3,
  });
  if (!mcDonalds) {
    return false;
  }
  context.snakeMcDonalds = mcDonalds;
  return true;
}
```

6. Update the placement guards in `place()` to include `snakeMcDonalds`:

Update line 33-38:
```typescript
if (
  canPlaceOptionalStructures &&
  !context.village &&
  !context.goblinCamp &&
  !context.questGiver &&
  !context.snakeMcDonalds
) {
```

Update line 52:
```typescript
if (!context.village && !context.goblinCamp && !context.questGiver && !context.snakeMcDonalds) {
```

---

## 6. Modify `src/inventory/itemRegistry.ts`

**Purpose**: Register the McDonald's consumable food items directly in the existing `ITEMS` array.

**Do NOT create a separate file**. Add these `SimpleItem` entries to the existing `ITEMS` array, before the closing `]` (after the last existing item, before line 265):

```typescript
  {
    id: 'food-snake-burger',
    name: 'Snake Burger',
    description: 'A juicy burger made with premium snake meat. +5 length, 1 minute invulnerability.',
    kind: 'consumable',
  },
  {
    id: 'food-snake-fries',
    name: 'Snake Fries',
    description: 'Crispy golden fries seasoned with serpent herbs. +5 length, 1 minute invulnerability.',
    kind: 'consumable',
  },
  {
    id: 'food-snake-nuggets',
    name: 'Snake Nuggets',
    description: 'Crispy little nuggets of snake. +2 length, 30 seconds invulnerability.',
    kind: 'consumable',
  },
```

These conform to the existing `SimpleItem` type in `src/inventory/item.ts` (`kind: 'consumable'`, no `slot` field required).

---

## 7. Modify `src/game/snakeGame.ts`

**Purpose**: Add methods for consuming food items and flushing the toilet.

### Add food consumption method:

```typescript
/**
 * Consume a Snake McDonalds food item.
 * Returns success status and effects applied.
 */
consumeMcDonaldsFood(itemId: string): {
  success: boolean;
  message: string;
  lengthGained: number;
  invulnerabilityTicks: number;
} {
  const item = getItem(itemId);
  if (!item) {
    return { success: false, message: 'Unknown item.', lengthGained: 0, invulnerabilityTicks: 0 };
  }

  if (this.inventory.getItemCount(itemId) <= 0) {
    return { success: false, message: `No ${item.name} remaining.`, lengthGained: 0, invulnerabilityTicks: 0 };
  }

  let lengthGained = 0;
  let invulnerabilityTicks = 0;

  switch (itemId) {
    case 'food-snake-burger':
    case 'food-snake-fries':
      lengthGained = 5;
      // 1 minute at ~10 ticks/sec = 600 ticks (consistent with powerup duration pattern, see line 1010)
      invulnerabilityTicks = 600;
      break;
    case 'food-snake-nuggets':
      lengthGained = 2;
      // 30 seconds = 300 ticks
      invulnerabilityTicks = 300;
      break;
    default:
      return { success: false, message: 'Unknown item.', lengthGained: 0, invulnerabilityTicks: 0 };
  }

  // Remove the item from inventory
  this.inventory.removeItem(itemId, 1);

  // Apply growth (uses existing growSnake method at line 1492-1494)
  this.growSnake(lengthGained);

  // Apply invulnerability via existing flag pattern (consistent with line 1029-1033)
  const currentInvuln = Number(this.getFlag<number>('fortitude.invulnerabilityTicks') ?? 0);
  const updatedInvuln = Math.max(currentInvuln, invulnerabilityTicks);
  this.setFlag('fortitude.invulnerabilityTicks', updatedInvuln);

  return {
    success: true,
    message: `Delicious! +${lengthGained} length, ${invulnerabilityTicks} ticks of invulnerability.`,
    lengthGained,
    invulnerabilityTicks,
  };
}
```

### Add flush toilet method:

```typescript
/**
 * Flush the McDonalds toilet. No state change - sound and hint are handled in the scene.
 */
flushToilet(): void {
  // No state change needed.
}
```

---

## 8. Modify `src/ui/juice.ts`

**Purpose**: Add a flush toilet sound effect.

**Verified**: The `ToneOptions` type (line 4-10) accepts `{ frequency, frequencyEnd?, duration?, type?, volume? }`. The method below follows the same pattern as existing methods like `appleChomp()` and `babyCry()`.

Add a new method to `JuiceManager`:

```typescript
/**
 * Sound of a toilet flushing. A rising-then-falling gurgling cascade.
 */
toiletFlush() {
  // Initial whoosh
  this.playTone({
    frequency: 200,
    frequencyEnd: 400,
    duration: 0.15,
    type: 'sine',
    volume: 0.12,
  });
  // Gurgling cascade
  this.playTone({
    frequency: 150,
    frequencyEnd: 50,
    duration: 0.4,
    type: 'sawtooth',
    volume: 0.08,
  });
  // Final splash
  this.playTone({
    frequency: 300,
    frequencyEnd: 100,
    duration: 0.12,
    type: 'triangle',
    volume: 0.1,
  });
}
```

---

## 9. Modify `src/scenes/snakeScene.ts`

**Purpose**: Add interaction handling for the McDonald's cashier and toilet.

### Add interaction methods:

Add these private methods to the `SnakeScene` class:

```typescript
private buildMcDonaldsMenuOptions(): ChoiceOption[] {
  const inventory = this.snakeGame.getInventory();
  const burgerOwned = inventory.getItemCount('food-snake-burger') > 0;
  const friesOwned = inventory.getItemCount('food-snake-fries') > 0;
  const nuggetsOwned = inventory.getItemCount('food-snake-nuggets') > 0;

  return [
    {
      id: 'buy-burger-fries',
      title: 'Snake Burger + Snake Fries - 100 score',
      description: `Both items. +5 length, 1 minute invulnerability each. ${burgerOwned ? '(Already have burger)' : ''} ${friesOwned ? '(Already have fries)' : ''}`,
    },
    {
      id: 'buy-nuggets',
      title: 'Snake Nuggets - 50 score',
      description: `+2 length, 30 seconds invulnerability. ${nuggetsOwned ? '(Already have nuggets)' : ''}`,
    },
    {
      id: 'eat-burger',
      title: 'Snake Burger',
      description: `Consume for +5 length, 1 minute invulnerability. ${burgerOwned ? 'In inventory.' : 'Not owned.'}`,
    },
    {
      id: 'eat-fries',
      title: 'Snake Fries',
      description: `Consume for +5 length, 1 minute invulnerability. ${friesOwned ? 'In inventory.' : 'Not owned.'}`,
    },
    {
      id: 'eat-nuggets',
      title: 'Snake Nuggets',
      description: `Consume for +2 length, 30 seconds invulnerability. ${nuggetsOwned ? 'In inventory.' : 'Not owned.'}`,
    },
    {
      id: 'leave',
      title: 'Leave',
      description: 'Slither away.',
    },
  ];
}

private tryInteractMcDonaldsCashier(): boolean {
  if (this.paused || this.offeredQuest || this.choicePopupVisible) {
    return false;
  }
  const room = this.snakeGame.getCurrentRoom();
  const mc = (room as any).snakeMcDonalds;
  if (!mc) {
    return false;
  }
  if (this.distanceFromHeadToLocal(mc.cashier) > 1) {
    return false;
  }

  this.openMcDonaldsMenu(mc);
  return true;
}

private openMcDonaldsMenu(mc: NonNullable<NonNullable<ReturnType<SnakeGame['getCurrentRoom']>['layout']> extends any ? any : any>): void {
  this.paused = true;
  this.hideSaveUI();
  this.skillTree.hideOverlay();

  const options = this.buildMcDonaldsMenuOptions();
  this.villageShopPopup.show(`${mc.cashier.name}'s Counter`, options, (id) => {
    this.handleMcDonaldsChoice(id, mc);
  });
}

private handleMcDonaldsChoice(id: string, mc: NonNullable<ReturnType<SnakeGame['getCurrentRoom']>['snakeMcDonalds']>): void {
  if (id === 'leave') {
    this.closeVillageShop();
    return;
  }

  const inventory = this.snakeGame.getInventory();

  // Purchase: Burger + Fries bundle
  if (id === 'buy-burger-fries') {
    if (this.score < 100) {
      this.showQuestHintPopup("You don't have 100 score.", '#ff6b6b');
      this.openMcDonaldsMenu(mc);
      return;
    }
    this.addScoreDirect(-100);
    inventory.addItem('food-snake-burger', 1);
    inventory.addItem('food-snake-fries', 1);
    this.showQuestHintPopup('Bought Snake Burger and Snake Fries!', '#5dd6a2');
    this.juice.purchaseSuccess();
    this.openMcDonaldsMenu(mc);
    return;
  }

  // Purchase: Nuggets
  if (id === 'buy-nuggets') {
    if (this.score < 50) {
      this.showQuestHintPopup("You don't have 50 score.", '#ff6b6b');
      this.openMcDonaldsMenu(mc);
      return;
    }
    this.addScoreDirect(-50);
    inventory.addItem('food-snake-nuggets', 1);
    this.showQuestHintPopup('Bought Snake Nuggets!', '#5dd6a2');
    this.juice.purchaseSuccess();
    this.openMcDonaldsMenu(mc);
    return;
  }

  // Consume: Burger
  if (id === 'eat-burger') {
    const result = this.snakeGame.consumeMcDonaldsFood('food-snake-burger');
    if (result.success) {
      this.showQuestHintPopup(result.message, '#5dd6a2');
      this.juice.appleChomp(0, 0, 2);
    } else {
      this.showQuestHintPopup(result.message, '#ff6b6b');
    }
    this.openMcDonaldsMenu(mc);
    return;
  }

  // Consume: Fries
  if (id === 'eat-fries') {
    const result = this.snakeGame.consumeMcDonaldsFood('food-snake-fries');
    if (result.success) {
      this.showQuestHintPopup(result.message, '#5dd6a2');
      this.juice.appleChomp(0, 0, 2);
    } else {
      this.showQuestHintPopup(result.message, '#ff6b6b');
    }
    this.openMcDonaldsMenu(mc);
    return;
  }

  // Consume: Nuggets
  if (id === 'eat-nuggets') {
    const result = this.snakeGame.consumeMcDonaldsFood('food-snake-nuggets');
    if (result.success) {
      this.showQuestHintPopup(result.message, '#5dd6a2');
      this.juice.appleChomp(0, 0, 2);
    } else {
      this.showQuestHintPopup(result.message, '#ff6b6b');
    }
    this.openMcDonaldsMenu(mc);
    return;
  }

  this.closeVillageShop();
}

private tryInteractMcDonaldsToilet(): boolean {
  if (this.paused || this.offeredQuest || this.choicePopupVisible) {
    return false;
  }
  const room = this.snakeGame.getCurrentRoom();
  const mc = (room as any).snakeMcDonalds;
  if (!mc) {
    return false;
  }
  if (this.distanceFromHeadToLocal(mc.toilet) > 1) {
    return false;
  }

  // Play flush sound
  this.juice.toiletFlush();
  this.snakeGame.flushToilet();

  // Show a hint
  this.showQuestHintPopup('The toilet gurgles and flushes. It sounds very satisfied.', '#9ad1ff');
  return true;
}
```

### Register the interactions in the 'e' key handler:

In `setupInputHandlers()`, add the McDonald's handlers to the `if (key === 'e')` block:

```typescript
if (key === 'e') {
  if (this.tryInteractQuestTarget()) { return; }
  if (this.tryInteractMcDonaldsCashier()) { return; }      // ADD BEFORE village shop
  if (this.tryInteractMcDonaldsToilet()) { return; }       // ADD
  if (this.tryInteractVillageShopkeeper()) { return; }
  if (this.tryInteractGoblinShopkeeper()) { return; }
  if (this.tryInteractRelationshipNpc()) { return; }
  if (this.tryInteractQuestGiver()) { return; }
}
```

**Verified**: The `villageShopPopup.show(title, options, callback)` pattern (confirmed at lines 4714, 4785, 4888, 4976, 5019) matches the existing usage. The `setChoicePopupVisible()` pattern (line 2366) is already used for shop interactions.

---

## 10. Modify `src/i18n/types.ts`

**Purpose**: Add the new McDonald's strings to the `FeatureStrings` interface so TypeScript accepts them.

Add these properties to the `FeatureStrings` interface (after `cardInfo` at line 79):

```typescript
export interface FeatureStrings {
  // ... existing properties ...
  cardInfo: string;
  // Snake McDonalds
  snakeBurger: string;
  snakeFries: string;
  snakeNuggets: string;
  flushToilet: string;
  mcCashierDialogue: string;
}
```

---

## 11. Modify `src/i18n/languages/en/featureStrings.ts`

**Purpose**: Add English strings for the McDonald's items.

```typescript
export const FEATURE_STRINGS_EN: FeatureStringsType = {
  // ... existing strings ...
  snakeBurger: 'Snake Burger',
  snakeFries: 'Snake Fries',
  snakeNuggets: 'Snake Nuggets',
  flushToilet: 'The toilet gurgles and flushes.',
  mcCashierDialogue: 'Welcome to Snake McDonalds! Fresh snake food, served fast, served cold.',
};
```

---

## 12. Modify `src/i18n/languages/es/featureStrings.ts`

**Purpose**: Add Spanish translations.

```typescript
export const FEATURE_STRINGS_ES: FeatureStringsType = {
  // ... existing strings ...
  snakeBurger: 'Hamburguesa de Serpiente',
  snakeFries: 'Papas Fritas de Serpiente',
  snakeNuggets: 'Nuggets de Serpiente',
  flushToilet: 'El inodoro hace un ruido de desag\u00fce.',
  mcCashierDialogue: '\u00a1Bienvenido a Snake McDonalds! Comida de serpiente fresca, servida r\u00e1pido, servida fr\u00eda.',
};
```

---

## 13. Render the McDonald's building

**Purpose**: Render the McDonald's building tiles and special elements on the game map.

The existing tile rendering in `SnakeScene` already renders characters from the `layout` array. The `#`, `W`, `E`, `.`, `T` tiles will be rendered with the existing color palette.

For the special `C` (cashier) and `R` (toilet) tiles, add rendering logic:

In `SnakeScene`, in the room rendering loop, find where special characters are drawn (near the `questGiver`, `village`, `goblinCamp` rendering) and add:

```typescript
// In the room layout rendering:
if (room.snakeMcDonalds) {
  // Render the cashier
  const cashier = room.snakeMcDonalds.cashier;
  const cashierWorld = this.tileToWorldInRoom(cashier, roomId);
  // Draw a McDonald's-themed NPC sprite at cashierWorld
  // (reuse a simplified NPC drawing or add a red/yellow "M" indicator)

  // Render the toilet
  const toilet = room.snakeMcDonalds.toilet;
  const toiletWorld = this.tileToWorldInRoom(toilet, roomId);
  // Draw a toilet icon (white rectangle with bowl shape)
  this.graphics.fillStyle(0xffffff, 1);
  this.graphics.fillRect(toiletWorld.x + 2, toiletWorld.y + 2, this.grid.cell - 4, this.grid.cell - 4);
}
```

---

## Summary of All Files Changed

| Action | File | What |
|--------|------|------|
| **New** | `src/world/snakeMcDonalds.ts` | Building placement logic with `tryPlaceSnakeMcDonalds()` |
| **Modify** | `src/world/types.ts` | Add `snakeMcDonalds` to `RoomSnapshot` |
| **Modify** | `src/world/generation/types.ts` | Add `snakeMcDonalds` to `RoomGenerationContext` |
| **Modify** | `src/world/roomGenerator.ts` | Pass `snakeMcDonalds` through `finalizeGenerationContext()` |
| **Modify** | `src/world/generation/stages/structureOperations.ts` | 0.1% chance + `snake-mcDonalds` settlement case |
| **Modify** | `src/inventory/itemRegistry.ts` | Add 3 `SimpleItem` consumables to `ITEMS` array |
| **Modify** | `src/game/snakeGame.ts` | `consumeMcDonaldsFood()`, `flushToilet()` |
| **Modify** | `src/ui/juice.ts` | `toiletFlush()` sound method |
| **Modify** | `src/scenes/snakeScene.ts` | Interaction handlers + menu + rendering |
| **Modify** | `src/i18n/types.ts` | Add McDonalds keys to `FeatureStrings` interface |
| **Modify** | `src/i18n/languages/en/featureStrings.ts` | English strings |
| **Modify** | `src/i18n/languages/es/featureStrings.ts` | Spanish strings |

---

## Key Design Decisions

1. **0.1% chance checked first**: The McDonald's roll happens in `pickSettlementKind()` before any other settlement roll, ensuring it can coexist with the "guaranteed settlement" logic (if a room has a settlement anchor, the McDonald's still gets its 0.1% roll first; if it fails, normal settlement generation proceeds).

2. **Score as currency**: Uses the player's score as currency (deducted via `addScoreDirect(-cost)`), consistent with how shops already work.

3. **Consumption via popup menu**: Uses `villageShopPopup.show(title, options, callback)` pattern (confirmed at lines 4714, 4785, 4888) for all vendor interactions.

4. **Invulnerability via flag system**: Uses the existing `fortitude.invulnerabilityTicks` flag (confirmed at line 1029-1033 for powerup pickup), stacking with any existing invulnerability (takes the maximum of current vs new).

5. **Toilet flush as pure audio**: The flush doesn't affect gameplay state, only plays the `toiletFlush()` sound (using `ToneOptions` pattern confirmed at line 4-10) and shows a hint text.

6. **Building layout uses existing tile characters**: No new tile characters needed - uses `C` for cashier and `R` for restroom, which are drawn as special elements rather than raw characters.

7. **No new sprite assets required**: The building and NPCs use the existing text-based tile rendering, keeping the implementation minimal.

8. **Direct item registration in `itemRegistry.ts`**: No separate file needed. Items are added directly to the existing `ITEMS` array as `SimpleItem` entries with `kind: 'consumable'`, consistent with `raw-meat`, `cooked-meat`, `honey`, etc.

9. **`McDonaldsData` interface is self-contained**: Defined in `snakeMcDonalds.ts` (not imported from `types.ts`), matching the pattern used by `QuestHouseResult` in `questHouse.ts` and `GoblinCampResult` in `goblinCamp.ts`.

10. **Invulnerability tick duration**: Uses 600 ticks for 1 minute and 300 for 30 seconds, consistent with the powerup duration pattern at line 1010 (`const duration = 300; // ~30s at 100ms base tick`).

(End of file - total 480 lines)
