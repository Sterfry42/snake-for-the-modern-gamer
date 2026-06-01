# Multiplayer-Ready Local Session Refactor Status

This status note tracks the implementation state for
`docs/snake_multiplayer_local_session_refactor_milestones_1_6.md`.

## Implemented

### Milestone 1 - Snapshot Renderer

- Added `GameSnapshot`, `ViewportSnapshot`, `ClientRoomSnapshot`, `PlayerSnapshot`, and `UiSnapshot`.
- Added `SnakeGame.getSnapshot(localPlayerId)`.
- Snapshot includes the current room, local player body/direction/score, apple state, enemies, bullets, followers, footballs, animals, and health UI state.
- `SnakeScene.draw()` now pulls the primary render room and local player from the latest session snapshot.
- Player bodies are copied into snapshots so command/session tests can verify stable render data.

### Milestone 2 - Command Input

- Added `ClientCommand` and `CommandHandler`.
- Added `SnakeGame.handleCommand(command)`.
- Direction and forced direction input now route through `GameConnection.send(...)`.
- Commands include `playerId`.
- Unknown player commands are ignored safely.

### Milestone 3 - LocalGameSession

- Added `GameConnection`, `GameEvent`, `LocalGameSession`, and `LocalGameConnection`.
- `SnakeScene` creates a one-player local session around the current `SnakeGame`.
- Action stepping runs through `LocalGameSession.actionStep(...)`.
- Snapshot listeners are wired into the scene.
- Basic event emission exists for room changes, player death, and toast events.

### Milestone 4 - SaveStore Abstraction

- Added async `SaveStore<TSaveData>` and browser `LocalStorageSaveStore<TSaveData>`.
- Added sync `SyncSaveStore<TSaveData>` and `LocalStorageStringSaveStore` for the current synchronous save path.
- Existing `snakeGameSave` storage key is preserved.
- `SaveUI` and title load now call scene/session methods instead of importing `saveManager` directly.
- `LocalGameSession` owns the UI-facing save, load, has-save, and clear orchestration while preserving existing save migration behavior.

### Milestone 5 - Player Map

- Added `PlayerId`, `PlayerRuntime`, and `PlayerCosmetics`.
- `SnakeGame` now maintains a `players` map and a stable `localPlayerId`.
- Single-player creates one local player in that map.
- Command handling targets the requested player.
- Snapshots expose players as a record keyed by player ID.
- Debug second player uses the same player map and command/snapshot model.

### Milestone 6 - Local Two-Snake Debug

- Added a debug second snake with independent `SnakeState`.
- Enable at startup with `?debugTwoSnakes=1`.
- Toggle at runtime with `Shift+2`.
- The second snake moves via simple AI/scripted steering.
- Snapshot includes both players.
- Renderer draws non-local snapshot players with a distinct color.
- Default single-player remains one snake unless debug mode is enabled.

### Milestone 7 - Local Authoritative Runtime Boundary + Multiplayer Shell

- Added `LocalAuthoritativeRuntime` as the local authoritative boundary for stepping, commands, snapshots, events, and save/load orchestration.
- `LocalGameSession` now implements that runtime boundary.
- `LocalGameConnection` delegates through direct object calls and returns command results locally; no JSON serialization is used for local runtime calls.
- Pause/resume, interact/use-item/choice placeholders, and save/load/clear commands now travel through `ClientCommand`.
- Save UI and title load/save flows route save/load/clear through `GameConnection` command sends while preserving current single-player behavior.
- Expanded `GameEvent` with item pickup and quest-complete outcomes, plus low-risk sound and screen-shake cues.
- Marked `ClientRoomSnapshot.room` as a temporary renderer compatibility bridge while explicit DTO fields continue to expand.
- Added the browser-only Multiplayer title shell with persisted display name, configurable WebSocket smoke test, and under-construction popup.

## Regression Coverage Added

- Session snapshot includes local player and room.
- Connection routes direction commands.
- Session emits snapshots after command and action steps.
- Unknown player commands do not mutate local player state.
- Runtime command results report unknown-player and successful command routing outcomes.
- Pause/resume commands emit snapshots through the runtime boundary.
- Save/load/clear command routing preserves existing browser save behavior.
- Runtime events cover apple pickup/sound outcomes.
- Multiplayer shell tests cover display name persistence, configurable smoke URL, and the under-construction submit flow.
- Debug second player appears in snapshots and moves independently.
- Local session owns save/load/clear orchestration.
- Local storage save stores cover save/load/has/clear and legacy key compatibility.
- Caffeinated apples now behave like normal apples while applying a 2-second additive speed boost.
- Rival snake enemies spawn through `EnemyManager` at a 10% eligible-room roll, render as multi-segment enemies, can eat/respawn apples, can switch rooms, and can be eaten by the player.
- Added a browser-only Multiplayer title shell with a persisted display name and a non-blocking WebSocket smoke test.
- Added `docs/multiplayer_headless_boundary.md` to start documenting browser-only code versus future Node-compatible shared game logic.

## Intentionally Deferred

These items are still outside this implementation pass or remain partial by design:

- No real WebSocket transport, remote server, session joining, or matchmaking. The title shell only runs a smoke connection.
- No completed headless Node-compatible game core split.
- No JSON network protocol serialization layer.
- Snapshot DTOs are not fully pure yet; current room data still carries the existing `RoomSnapshot` object as a marked compatibility bridge.
- Phaser scene still directly calls many `SnakeGame` methods for menus, shops, NPCs, quests, and specialized UI flows.
- Events are only introduced for a few session-level outcomes; most audio, animation, and popup effects still use existing scene logic.
- Per-player inventory, quests, relationships, factions, and save ownership are not fully split. The player map is established, but most legacy single-player systems still use the local player state.
- Debug second snake collision rules are intentionally simple. It collides with walls, water, bosses, itself, the local player, and shared apples through local-session test behavior; it is still debug-only rather than a production multiplayer client.
- Rival snake enemies intentionally do not shoot, slash, or directly attack. They are hostile as world competitors and player-eatable enemy actors, not combatants.
- Save data format is preserved rather than migrated to a multi-player save schema.
- Randomness is not fully audited for deterministic multiplayer simulation.

## Validation

Current validation commands for this implementation:

- `npm run typecheck`
- `npx vitest run src/session/__tests__/localGameSession.test.ts src/storage/__tests__/LocalStorageSaveStore.test.ts src/game/__tests__/football.test.ts src/apples/__tests__/caffeinatedApple.test.ts src/systems/__tests__/enemyManager.test.ts`
- `npm run build`
