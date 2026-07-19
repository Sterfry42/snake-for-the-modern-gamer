# Project Overview

This is a modern Phaser-based snake game with deep RPG and simulation elements, featuring:

- **Core Gameplay**: Snake movement, food collection, and survival mechanics
- **RPG Systems**: Quests, inventory, shops, NPCs, factions, relationships, and character progression
- **Apple Mechanics**: Multiple apple types with unique behaviors (caffeinated, skittish, mochi, wasabi, and more)
- **World & Survival**: Animal taming, fishing, caves, archaeology, and world generation
- **Special Modes**: Starforged TTRPG integration, Minecraft mode, Archipelago multiplayer, dating/relationship system
- **Audio & Polish**: Actor voice packs, music, juice effects, and full i18n (EN/ES)

## Agent Voice

- Keep responses clear, direct, and focused on the work at hand.
- **Unwaveringly** lean into a Brooklyn vibe: "Listen here," "fuhgeddaboudit," "you betcha," "shut the front end," or "that's the ticket" when the mood strikes.
- Keep it light and useful — the voice is the cherry on top, not the whole sundae. Code quality and type safety come first, always.

## Project Structure

```
src/
├── achievements/    # Achievement definitions, manager, and UI
├── actors/          # Actor/entity system with AI brains and voice packs
├── animals/         # Animal life: AI, ecology, taming, herding
├── apples/          # Apple registry, service, and behavior system
├── archaeology/     # Archaeology mechanics
├── archipelago/     # Multi-game Archipelago linking
├── artifacts/       # Artifact items
├── cards/           # Card game system
├── caves/           # Cave generation and entrances
├── client/          # Client-side multiplayer shell
├── config/          # Game config, palettes, resolution, snake config
├── core/            # Math utilities and RNG
├── events/          # World event log and definitions
├── factions/        # Faction system and relations
├── features/        # Feature definitions (RPG mechanics)
├── fishing/         # Fishing minigame, fish definitions, catch journal
├── game/            # Core snake game, save manager, scoring
├── i18n/            # Internationalization (EN, ES)
├── inventory/       # Inventory, items, and registry
├── layers/          # Layer type definitions
├── minecraft/       # Minecraft integration
├── npcs/            # NPC system
├── player/          # Player logic and easter eggs
├── players/         # Player type definitions
├── quests/          # Quest system and definitions
├── relationships/   # Dating and relationship system
├── rumors/          # Rumor system
├── scenes/          # Phaser scenes (including the big snakeScene.ts)
├── session/         # Session management and game events
├── shops/           # Shop implementations (goblin, village)
├── starforged/      # Starforged TTRPG integration
├── stats/           # Statistics and special stat system
├── storage/         # Persistence layer (localStorage, sync)
├── systems/         # Game systems (bosses, enemies, skills, state)
├── ui/              # UI: HUD, popups, skill tree, minimap, juice
└── world/           # World, biomes, rooms, locations, and generation
```

## Development Workflow

All agents working on this project **MUST** follow these steps:

### ⚠️ Type Safety — Non-Negotiable Rule

- **ALWAYS run `npm run typecheck` and fix ALL type errors before finishing any task.**
- This is not optional. No exceptions. Ship it type-safe or don't ship it at all.

### Task Completion Checklist

1. **Before completing any task**:

   - Run `npm run typecheck` to ensure all TypeScript types are valid
   - **Resolve all type errors** before considering the task complete
2. **After fixing type errors**:

   - Run `npm run build` to ensure the project builds successfully
   - **Verify the build succeeds** before marking tasks complete
3. **Testing**:

   - Run `npm run dev` to start the development server for in-browser testing
   - Run `npm run test` to execute the full test suite

## Important Notes

- The project uses TypeScript with Vite as the build tool
- Tests are written with Vitest
- The game uses Phaser 3 for rendering and game logic
- All changes must be type-safe and pass the build process
- Some files are large (e.g., `snakeScene.ts`, `snakeGame.ts`, `starforgedContent.ts`) — don't be intimidated, they're just packed with game content
- **Phaser UI**: If you are doing anything related to the UI, **MUST** check `docs/PHASER3.md` for additional information and to understand quirks (coordinate system, graphics positioning, etc.)

## Required Commands

- `npm run dev` - Start development server
- `npm run build` - Build the project
- `npm run preview` - Preview production build
- `npm run typecheck` - Run TypeScript type checking
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Run ESLint with auto-fix
- `npm run format` - Format code using Prettier
- `npm run test` - Run full test suite
- `npm run test:world-generation` - Run world generation fairness tests
- `npm run build:apworld` - Build the Archipelago APWorld package

When in doubt: check your types, verify the build, and ship it clean. That's how the job gets done right.
