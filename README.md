# 🐍 Snake: For the Modern Gamer

**Snaked. Revised. Revamped.**

A browser-based snake game that kept eating features until it became a full living world. What started as "eat apples, don't hit walls" grew into an open-world simulation with procedurally generated biomes, towns full of living NPCs, cars, caves, quests, dating, fishing, a card game, a radio, and — for the truly committed — an entire Minecraft mode inside it.

## Play Now

🎮 **[Play the game in your browser](https://sterfry42.github.io/snake-for-the-modern-gamer/)** — no install, no download, just play.

[![CI](https://github.com/Sterfry42/snake-for-the-modern-gamer/actions/workflows/typecheck.yml/badge.svg)](https://github.com/Sterfry42/snake-for-the-modern-gamer/actions/workflows/typecheck.yml)
[![Deploy](https://github.com/Sterfry42/snake-for-the-modern-gamer/actions/workflows/ci.yml/badge.svg)](https://github.com/Sterfry42/snake-for-the-modern-gamer/actions/workflows/ci.yml)
[![Latest Release](https://img.shields.io/github/v/release/Sterfry42/snake-for-the-modern-gamer)](https://github.com/Sterfry42/snake-for-the-modern-gamer/releases/latest)
[![Release Date](https://img.shields.io/github/release-date/Sterfry42/snake-for-the-modern-gamer)](https://github.com/Sterfry42/snake-for-the-modern-gamer/releases/latest)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](https://www.typescriptlang.org/)
[![Phaser 3](https://img.shields.io/badge/Phaser-3.x-green)](https://phaser.io/)

## What's in the Box

### 🌍 A Living World

- **Procedural world generation** — endless, seeded rooms with distinct biomes, climates, hazards, and weather
- **Day/night cycle & seasons** — dawn, day, dusk, and night each change the world around you
- **Caves & multi-level structures** — hand-shaped cave templates, interiors, and multi-room buildings
- **Towns & settlements** — safe zones with physical spaces, landmarks, and transit lines (including the bullet train and a rollercoaster)
- **Factions & world events** — shifting alliances, raids, rumors, and social consequences that ripple through the world
- **Living NPCs** — actor simulation with schedules, conversations, relationships, rumors, and yes, _dating_

### 🎮 Deep (and Deeply Ridiculous) Gameplay

- **Skill tree** with Momentum, Survival, Arcane, Growth, Predator, and Fellowship branches
- **SPECIAL stats & leveling** — allocate points, grow your stats, and shape your playstyle
- **Spells & mana** — spellbook, prepared slots, and summoning (rats)
- **Maneuvers** — Dash, Ghost, Sidewinder, and Rewind
- **Combat** — guns, bombs, melee, ranged enemies, rival snakes, sharks, goblins, and multi-phase bosses
- **Vehicles** — actual drivable cars with real physics, across room boundaries
- **Survival systems** — hunger, temperature, radiation, healing, wards, and a phoenix revival that cheats death once
- **Inventory & equipment** — gear that modifies the game through a shared modifier system
- **Minecraft mode** — an embedded Minecraft-like sandbox with chunks, mobs, crafting, farming, and its own day/night cycle

### 📦 Systems That Keep the World Turning

- **Quests & bespoke story features**
- **Shops, economy & collections** — buy, sell, and hoard
- **Fishing & archaeology** — cast a line or dig up the past
- **Achievements** — with a full archipelago integration
- **Archipelago & DeathLink** — link your run into a randomized multi-game adventure
- **Card game** — pull up a chair at the card table
- **Radio** — tune the in-game radio for score and speed buffs
- **Cheats & easter eggs** — a central cheat registry, in case you'd rather be a god

### 🖥️ Quality of Life

- **Save/load sessions** — multiple named sessions with the last 5 saves each, auto-migrated from legacy formats
- **Rebindable controls** — keyboard, game controller, and mobile
- **Pause menu with everything** — skills, gear, map, people, quests, factions, achievements, calendar, and even built-in **Spotify** and **YouTube** playback
- **Internationalization support**

## For Developers

Built with [TypeScript](https://www.typescriptlang.org/) (strict mode), [Phaser 3](https://phaser.io/), [Vite](https://vitejs.dev/), and [Vitest](https://vitest.dev/).

### Prerequisites

- Node.js (LTS) and npm

### Getting Started

```bash
npm install     # install dependencies
npm run dev     # start the dev server
```

### Build & Test

```bash
npm run build       # production build to dist/
npm run preview     # preview the production build locally
npm run test        # run the full test suite (vitest)
```

### Validation

CI runs all of these on every push to `main` and on pull requests. Run them locally before pushing:

```bash
npm run format:check   # prettier formatting check
npm run typecheck      # tsc --noEmit (strict)
npm run lint           # eslint with zero warnings allowed
npm run test           # vitest
```

Useful extras:

```bash
npm run format          # auto-format the codebase
npm run lint:fix        # auto-fix lint issues
npm run lint:unused:all # detect unused variables, exports, and files
npm run test:world-generation  # world-generation fairness tests only
```

### Project Layout

- `src/` — all game code (systems, world, actors, UI, features, modes)
- `docs/` — design docs, requirements, and the [Snake Encyclopedia](docs/core/Snake%20Encyclopedia.md) (a living index of every system, registry, and helper in the codebase)
- `docs/PHASER3.md` — **read this before touching Phaser rendering code** (coordinate quirks, graphics bounding boxes, room vs. world coordinates)
- `scripts/` — build and validation tooling
- `.github/workflows/` — CI (format, typecheck, lint, build, test) and GitHub Pages deploy

### Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to contribute. Before implementing new functionality, search the [Snake Encyclopedia](docs/core/Snake%20Encyclopedia.md) — if the game already knows how to do something, extend it instead of reinventing it.

---

_The wise old snake ate an apple a day and kept the maze away._
