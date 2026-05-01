# Save and Load System

## Overview

The game now includes a complete save and load system that allows players to save and restore their game progress.

## Features

- **Save Game State**: Saves all current game state including snake length, score, quests, inventory, equipment, and player stats
- **Load Game State**: Loads the saved game state and applies it to the game
- **Clear Save File**: Removes the save file from localStorage
- **UI Integration**: Buttons are available in the top-right corner of the game when playing
- **Auto-Save**: Game state is saved when you click the SAVE button

## What Gets Saved

The save system saves the following game state:

1. **Snake State**
   - Current length (body segments)
   - Score
   - Snake body positions
   - Direction and room
   - Player health and max health

2. **Quests**
   - Active quests
   - Completed quest IDs
   - Accepted quest IDs

3. **Inventory**
   - All items and their quantities
   - Equipped items

4. **Player Flags**
   - Custom game flags
   - Equipment modifiers
   - Player stats

5. **Character Choices**
   - Chosen religion (if applicable)
   - Chosen class (if applicable)
   - Chosen background (if applicable)

## What Does NOT Get Saved

The save system intentionally excludes:

1. **The World**: All generated rooms, walls, and world layout
2. **Apples**: All apple positions and states
3. **Enemies**: All enemy positions and states
4. **Bosses**: All boss positions and states
5. **Dynamic State**: Any transient game state that should be regenerated

## UI Controls

### SAVE Button
- Click the SAVE button in the top-right corner to save the current game state
- A confirmation message appears when the save is successful

### LOAD Button
- Click the LOAD button to load the saved game state
- The game will reset and then load the saved state
- A confirmation message appears when the load is successful

### CLEAR Button
- Click the CLEAR button to remove the save file
- A confirmation message appears when the save file is cleared

## Implementation Details

### SaveManager Class

Located in `src/game/saveManager.ts`, the `SaveManager` class provides:

- `save(game, religionChoice, classChoice, backgroundChoice)`: Saves the game state to localStorage
- `load(game, getReligionChoice, getClassChoice, getBackgroundChoice)`: Loads the game state from localStorage
- `hasSave()`: Checks if a save file exists
- `clear()`: Removes the save file from localStorage

### Save Data Format

The save data is stored as a JSON object with the following structure:

```typescript
{
  version: string;
  timestamp: number;
  snakeLength: number;
  score: number;
  snakeBody: Array<{ x: number; y: number }>;
  snakeDirection: { x: number; y: number };
  snakeRoomId: string;
  playerHealth: number;
  playerMaxHealth: number;
  questsActive: string[];
  questsCompleted: string[];
  questsAccepted: string[];
  inventory: Record<string, number>;
  equipment: Record<string, string>;
  flags: Record<string, unknown>;
  religionId?: string;
  religionMods?: Record<string, unknown>;
  classId?: string;
  classMods?: Record<string, unknown>;
  backgroundId?: string;
  backgroundMods?: Record<string, unknown>;
}
```

## Code Examples

### Saving the Game

```typescript
import { saveManager } from "./game/saveManager.js";

const religionChoice = { id: "christianity", mods: { phoenixCharges: 1 } };
const classChoice = { id: "warrior", mods: { phoenixCharges: 1 } };
const backgroundChoice = { id: "noble", mods: { invulnerabilityBonus: 1 } };

saveManager.save(
  game,
  religionChoice,
  classChoice,
  backgroundChoice
);
```

### Loading the Game

```typescript
import { saveManager } from "./game/saveManager.js";

const getReligionChoice = () => game.chosenReligionId ? { id: game.chosenReligionId, mods: game.religionMods } : null;
const getClassChoice = () => game.chosenClassId ? { id: game.chosenClassId, mods: game.classMods } : null;
const getBackgroundChoice = () => game.chosenBackgroundId ? { id: game.chosenBackgroundId, mods: game.backgroundMods } : null;

const success = saveManager.load(game, getReligionChoice, getClassChoice, getBackgroundChoice);
```

## Integration with SnakeScene

The save system is integrated with the `SnakeScene` class:

- `saveUI`: A UI component that provides SAVE, LOAD, and CLEAR buttons
- `showSaveUI()`: Makes the save UI visible
- `hideSaveUI()`: Hides the save UI
- `togglePauseMenu()`: Automatically shows/hides the save UI based on game state

## Notes

- Save files are stored in the browser's localStorage
- Save files are versioned to allow for future compatibility updates
- The save system excludes the world, apples, enemies, and bosses as they should be regenerated dynamically
- Player choices (religion, class, background) are saved if they have been made
- The save system handles errors gracefully and provides feedback to the player

## Future Enhancements

Potential future improvements to the save/load system:

- Save slots (save multiple games)
- Cloud backup and restore
- Save encryption
- Save compression
- Save validation and integrity checking
- Save file encryption