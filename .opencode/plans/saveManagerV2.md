## Multi-Save Manager Implementation Plan

### Architecture Overview

The current system uses a single-slot `LocalStorageStringSaveStore` with key `snakeGameSave`. The plan is to build a new `SaveManagerV2` that manages multiple slots via `LocalStorageSaveStore` (already exists, generic multi-slot), plus an autosave system with a sliding window of 5 slots.

### New Files

**1. `src/game/saveManagerV2.ts`** — Multi-slot save manager
- Replaces the single-slot `saveManager` for the main menu save/load flow
- Uses `LocalStorageSaveStore<GameSaveData>` with prefix `snake-save`
- Regular save slots: keyed by ISO date string (`2026-06-17T14:30:00.000Z`)
- Autosave slots: keyed by `autosave-0` through `autosave-4` (sliding window)
- Exposes:
  - `save(slotId: string, data: GameSaveData): Promise<void>`
  - `load(slotId: string): Promise<GameSaveData | null>`
  - `delete(slotId: string): Promise<void>`
  - `listRegularSaves(): Promise<SaveSlotInfo[]>` — returns saves sorted newest-first
  - `listAutosaves(): Promise<SaveSlotInfo[]>` — returns autosaves in order
  - `triggerAutosave(): Promise<void>` — saves to oldest autosave slot, shifting window
  - `getSlotLabel(slotId: string): string` — returns `DATE:SEED` format for display
- Keeps the existing version migration logic (migrates loaded data before returning)
- The old `saveManager` remains in place for in-game saves (SAVE button in pause menu) — both can coexist during transition, but the new manager is the primary path for multi-slot saves

**2. `src/ui/saveLoadMenu.ts`** — Save/load popup UI
- Reusable popup following `ChoicePopup` pattern (container, background, scrollable list)
- Two sections: **Regular Saves** and **Autosaves** (separately titled)
- Each entry displays `DATE:SEED` (date + world seed from `worldGeneration.seed`)
- Each entry has Load and Delete buttons
- Autosave entries are visually separated (different background tint or section divider)
- Back button closes the menu
- Uses scrollable container if many saves exist
- `show(onLoad: (slotId: string) => void, onDelete?: (slotId: string) => void): void`
- `hide(): void`

**3. `src/game/__tests__/saveManagerV2.test.ts`** — Unit tests
- Save/load/delete a slot
- List saves sorted newest-first
- Autosave sliding window (6th autosave replaces oldest)
- `getSlotLabel` produces `DATE:SEED` format
- Migration still works on loaded data
- Empty/missing slot returns null

**4. `src/storage/__tests__/saveManagerV2.integration.test.ts`** — Integration tests
- End-to-end save/load with `LocalStorageSaveStore`
- Multiple slots don't collide (key prefix isolation)

### Modified Files

**5. `src/scenes/snakeScene.ts`**
- Replace `loadGameFromTitle()` to open `SaveLoadMenu` instead of checking `hasSessionSave`
- Add `onSaveLoaded(slotId: string)` handler that:
  - Loads the save data from `SaveManagerV2`
  - Passes it to `loadGameFromSession` (reuse existing game load flow)
  - Restores character save state
- Add `onSaveDeleted(slotId: string)` handler that calls `SaveManagerV2.delete(slotId)`
- In `startNewGameFromTitle()`, call `SaveManagerV2.save(dateKey, data)` after game init
- Add autosave timer: `setInterval(() => saveManagerV2.triggerAutosave(), 30_000)` in scene init, cleared on destroy
- Wire the in-game SAVE button (`SaveUI.saveGame`) to use `SaveManagerV2` instead of the old single-slot store (or keep both — old for quick save, new for multi-slot)

**6. `src/i18n/languages/en/featureStrings.ts` + `src/i18n/types.ts`** — New i18n keys
- `loadGameMenuTitle: 'Load Game'`
- `regularSaves: 'Saves'`
- `autosaves: 'Autosaves'`
- `load: 'Load'`
- `delete: 'Delete'`
- `back: 'Back'`
- `confirmDelete: 'Delete this save?'`
- `noSaves: 'No save files found.'`
- `noAutosaves: 'No autosaves.'`

**7. `src/i18n/languages/es/featureStrings.ts`** — Spanish translations of above

### Flow Details

**Main Menu → Load Game:**
1. Player clicks "Load Game" on title screen
2. `SaveLoadMenu.show()` opens, fetching save list from `SaveManagerV2`
3. Menu displays regular saves (newest first) and autosaves (in slot order)
4. Player clicks Load → `onSaveLoaded(slotId)` → loads data → calls `loadGameFromSession` → restores game state
5. Player clicks Delete → confirmation → `onSaveDeleted(slotId)` → removes slot → refreshes list

**Autosave:**
1. Every 30 seconds during gameplay, `triggerAutosave()` is called
2. It picks the oldest autosave slot (round-robin: 0, 1, 2, 3, 4, 0, 1...)
3. Serializes current game state and writes to that slot
4. Sliding window: no slot ever exceeds 5 entries

**New Game Save:**
1. Player clicks "New Game" → game initializes with new seed
2. First save is automatic: `SaveManagerV2.save(dateKey, data)` where `dateKey = new Date().toISOString()`

### Key Design Decisions

- **Date format for slot IDs**: ISO 8601 (`2026-06-17T14:30:00.000Z`) — lexicographically sortable, unambiguous
- **Display format**: Human-readable date (e.g., `Jun 17, 2026 2:30 PM`) + `:seed` suffix
- **Autosave slot IDs**: Fixed `autosave-0` through `autosave-4` — no date in ID, ordered by slot index
- **Backward compatibility**: Old single-slot save persists at `snakeGameSave` key. On first load of `SaveManagerV2`, if old save exists, it can be auto-migrated to a new slot (or left as-is for the in-game SAVE button)
- **The old `saveManager` stays** for the in-game SAVE/LOAD/CLEAR buttons in the pause menu HUD — these continue using the single-slot path. The new `SaveManagerV2` is the primary path for the main menu Load Game flow and autosaves

### Implementation Order

1. `saveManagerV2.ts` — core multi-slot logic + autosave system
2. Unit tests for `SaveManagerV2`
3. `saveLoadMenu.ts` — UI popup
4. i18n additions (EN + ES)
5. Wire into `snakeScene.ts` — title screen + autosave timer + new game save
6. Integration tests
7. `npm run typecheck` + `npm run build`
