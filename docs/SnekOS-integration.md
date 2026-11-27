# SnekOS local computer integration

The dependency-free SnekOS runtime is now connected to the local scene, home
placement, merchant stock, saves, and tavern/town-hall counters. Hosted computer
sessions are not supported yet.

## Canonical modules

- `src/computers/virtualFileSystem.ts`: bounded virtual text filesystem, with
  JSON-safe serialization and canonical absolute paths.
- `src/computers/computerRuntime.ts`: shell, computer templates, generated
  system config, finite scripts and notification-only IFTTT hooks.
- `src/computers/computerTerminal.ts`: DOM terminal and text editor; caller owns
  the game's modal input routing and persistence.
- `src/ui/spriteRecipes/furnitureRecipe.ts`: shared CRT runtime sprite.
- `src/computers/assets/pc.svg`: original transparent 16x16 sprite concept.
- `src/computers/__tests__/computerRuntime.test.ts`: Vitest regression tests.

## How to use in single-player

1. Buy a Personal Computer from a general merchant's Items tab (150 score
   before shop modifiers).
2. At home, face a free wooden floor tile or a kitchen counter and use the
   computer from inventory. It occupies a separate non-colliding prop layer.
3. Stand on or adjacent to the PC and use the normal Interact binding.
4. The terminal pauses local gameplay while open. Disconnect or press Escape
   to resume. The editor supports multiline files and command history.
5. Files, enabled hooks and the terminal theme are persisted under the
   existing saved player flag `house.computer`. Save the game normally.
6. In a tavern or town hall, look for a beige CRT on an accessible counter.
   The NPC terminal is read-only and has different seeded notes.

## Integration boundaries

- `computerWorld.ts` owns the typed location model, surface eligibility,
  reach checks and deterministic NPC counter selection.
- `SnakeGame` owns placement, proximity checks, the runtime context and
  persistence. `SnakeScene` owns local modal lifecycle, keyboard/controller
  routing and the local connection's event-to-hook dispatch.
- The renderer uses the shared furniture recipe for the PC as a prop; neither
  terrain nor collision is replaced.
- The current home implementation supports one PC per player, not relocation
  or packing it back into inventory. NPC PCs are read-only and generated from
  templates rather than separately saved.
- `/etc/system.conf` is generated from allowlisted data (grid size, current room,
  biome, hostname, theme and minimap state). `config get game.KEY` reads game
  keys; the home PC can change the theme or toggle an already-unlocked minimap.
  `snake inventory` and `snake quests` expose the current pack and accepted quests.
- Notification-only home hooks continue operating while the terminal is closed.
- Hosted multiplayer does not open or place computers. The item may still be
  listed in shops; hosted use explicitly rejects placement. A server-owned
  session, per-machine persistence, command protocol and permissions are
  required before multiplayer support is enabled.
- Add general tabletop construction attachments, pack/relocation, additional
  config keys, remote networking, and validated gameplay-changing hook
  actions in subsequent passes.

## Validation status

The foundation's standalone checks were run previously. The integration adds
a headless save/restore story, shop and presentation regression coverage, but
local repository commands and browser smoke validation cannot run in the
network-isolated environment. Draft PR #159 runs the repository CI. The initial
integration passed typecheck, lint, build, security audit and 2,079 tests;
format corrections and follow-up changes are subject to the latest PR checks.

## Example session

```
mkdir projects
write projects/hello.txt "Hello, snake!"
cat projects/hello.txt
edit scripts/dashboard.sh
run scripts/dashboard.sh
cat /etc/system.conf
snake inventory
snake quests
config get game.minimap.unlocked
config set game.minimap.enabled true
config set system.theme amber
edit mods/apple-alert.hook
mod enable apple-alert
```

Contents of `mods/apple-alert.hook`:

```
on item.picked_up
if equals "apple"
notify "Apple acquired"
```

This is a small command language, not Bash or Python. No pipes, redirection,
loops, host filesystem, arbitrary JS, package downloads, or external network.

## Validation performed in the isolated environment

- TypeScript 5.8.3 with strict, noUnusedLocals, noUnusedParameters, ES2022 and DOM
  libs: passed for the three implementation modules.
- Six equivalent Node assertion scenarios: passed (file persistence and
  independence, config protection, bounded scripts, hook matching and removal,
  read-only NPC content, filesystem quotas).
- Repository Vitest, Prettier, ESLint, full TypeScript 6 check, game build, browser
  and multiplayer validation: not run. The checkout and dependencies were not
  available, so these are not claims of repository-level compatibility.
