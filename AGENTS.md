# Project Overview

This is a modern Phaser-based snake game with RPG elements, featuring:

- **Core Gameplay**: Snake movement, food collection, and survival mechanics
- **RPG Elements**: Quests, inventory, shops, NPCs, and character progression
- **Features**: Multiple apple types with behaviors, hunger system, religion choices, and more

## Project Structure

```
src/
├── apples/          # Apple types and behaviors
│   ├── behaviors/   # Different apple behaviors (normal, gold, shielded, skittish)
│   ├── appleRegistry.ts
│   ├── appleService.ts
│   └── types.ts
├── cards/           # Card system
├── config/          # Game configuration and palettes
├── core/            # Core utilities (math, random number generation)
├── features/        # Game features and definitions
│   ├── definitions/  # Feature definitions (coreScore, hungerTimer, etc.)
│   ├── feature.ts    # Base feature class
│   └── npcs/         # NPC definitions
├── game/            # Game core and save system
│   └── saveSystem/
├── i18n/            # Internationalization
│   └── languages/    # Language files (en, es)
├── inventory/       # Inventory system
├── quests/          # Quest system
│   └── definitions/  # Quest definitions
├── scenes/          # Phaser scenes
│   └── __tests__/
├── shops/           # Shop system
├── systems/         # Game systems
│   └── __tests__/
├── ui/              # User interface
│   ├── music/        # Music and sound
│   └── spriteRecipes/
└── world/           # World-related logic
```

## Development Workflow

All agents working on this project must follow these steps:

1. **Before completing any task**:
   - Run `npm run typecheck` to ensure all TypeScript types are valid
   - **Resolve all type errors** before considering the task complete

2. **After fixing type errors**:
   - Run `npm run build` to ensure the project builds successfully
   - **Verify the build succeeds** before marking tasks complete

3. **Testing**:
   - Run `npm run dev` to start the development server for testing

## Important Notes

- The project uses TypeScript with Vite as the build tool
- Tests are written with Vitest
- The game uses Phaser 3 for rendering and game logic
- All changes must be type-safe and pass the build process

## Required Commands

- `npm run dev` - Start development server
- `npm run build` - Build the project
- `npm run preview` - Preview production build
- `npm run typecheck` - Run TypeScript type checking
- `npm run format` - Format code using Prettier