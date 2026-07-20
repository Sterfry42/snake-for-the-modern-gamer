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

## Repository Rules

All agents working on this project **MUST** follow these instructions before considering a task complete:

1. Run `npm run format`. If formatting fails, fix the problems and rerun.
2. Run `npm run typecheck` and ensure there are **NO errors or warnings**. If there are errors or warnings, fix them and rerun `npm run format` then `npm run typecheck`.
3. Run `npm run build` and ensure that building succeeds. If it fails, fix the errors and rerun.
4. Run `npm run test` and ensure **ALL tests pass**. If any tests fail, fix them and rerun.

## Important Notes

- The project uses TypeScript with Vite as the build tool
- Tests are written with Vitest
- The game uses Phaser 3 for rendering and game logic
- All changes must be type-safe and pass the build process
- Some files are large (e.g., `snakeScene.ts`, `snakeGame.ts`, `starforgedContent.ts`) — don't be intimidated, they're just packed with game content
- **Phaser UI**: If you are doing anything related to the UI, **MUST** check `docs/PHASER3.md` for additional information and to understand quirks (coordinate system, graphics positioning, etc.)

## Important Commands

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
