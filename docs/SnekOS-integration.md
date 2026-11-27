# SnekOS foundation (unintegrated)

This is a dependency-free prototype for the Snake computer feature. The modules
compile in isolation. They are not yet wired into the world, game saves, shops,
input router or authoritative multiplayer sessions.

## Canonical modules

- `src/computers/virtualFileSystem.ts`: bounded virtual text filesystem, with
  JSON-safe serialization and canonical absolute paths.
- `src/computers/computerRuntime.ts`: shell, computer templates, generated
  system config, finite scripts and notification-only IFTTT hooks.
- `src/computers/computerTerminal.ts`: DOM terminal and text editor; caller owns
  the game's modal input routing and persistence.
- `src/computers/assets/pc.svg`: transparent 16x16 tabletop CRT sprite concept.
- `src/computers/__tests__/computerRuntime.test.ts`: Vitest regression tests.

## Integration work remaining

1. Review `src/building/constructionState.ts` and effective cell rules before
   adding surface attachments. Store machine identity independently of its
   coordinate; moving the prop should retain files. Use the item registry and
   shop profiles for buying a computer. Register the sprite through the existing
   world presentation and texture pipeline, not as a second terrain tile.
2. Add a per-machine save record (machine identity, ownership, location,
   template, `ComputerSaveData`) in the authoritative world state and integrate
   it with `src/game/saveTypes.ts` and save/load. Do not put NPC content or shared
   computers in browser localStorage. Handle existing saves without this field.
3. Author a barkeep and mayor PC in the town generation/content paths. Respect
   generated furniture locations, accessibility and existing room identity.
4. Integrate a computer interaction through the existing verb/session paths.
   `src/session/GameInteraction.ts` currently models actor/dialogue/shop/quest
   menus; computer sessions need an explicit authority boundary, not a forged
   actor menu. Verify distance and machine permission on open and command.
   The DOM panel provided here is local-only until the session path is wired.
   Suspend gameplay input with the existing scene modal routing while typing,
   and restore it on close, teardown, or disconnect. Do not pause a shared world.
5. Inject an authorized `ComputerContext`: `readStatus` and `readSystemConfig`
   expose allowlisted public/player-visible data only; `notify` routes to the
   owning player. The live config is read-only except for the machine's theme.
   Never dump raw flags, secrets, or the entire engine config to a visitor.
6. Route existing `GameEvent` variants (`item.picked_up`, `quest.completed`,
   `room.changed`) into the relevant owner's authorized runtime. Use the item ID,
   quest ID, or destination room ID as the condition value. Ensure a single
   authoritative dispatcher per event; hooks must not execute once per client.
   Settle whether PC mods run while the PC is closed or powered off before
   enabling them in gameplay. Hook errors should be exposed to the player.
7. Add game-backed writable config keys only through existing validated settings
   APIs. Add further hook actions only with explicit authority and quotas.
8. Add integration and story tests, update the Snake Encyclopedia when the
   integration is complete, then run all required repository checks.

## Example session

```
mkdir projects
write projects/hello.txt "Hello, snake!"
cat projects/hello.txt
edit scripts/dashboard.sh
run scripts/dashboard.sh
cat /etc/system.conf
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
