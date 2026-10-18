# Authoritative session pipe: first cut

This is an opt-in boundary proof, not the completed full-game migration. The default title/menu/gameplay path remains the legacy scene integration.

## Run

```sh
npm run server
npm run dev
```

Open the normal title screen and choose **Multiplayer → Server**. Enter the server URL and a display name, then choose **Enter World**. The menu remembers the last URL/name, supports native text selection/paste and keyboard/controller focus, and accepts bare addresses such as `localhost:8787`. The first connected player starts the paused session; joining an occupied session preserves its pause state. **Multiplayer → Archipelago** retains the existing slot/password connection flow.

The direct URL `?server=ws%3A%2F%2F127.0.0.1%3A8787%2Fgame` remains available for diagnostics; it begins paused until Space is pressed. For the same connected renderer backed by an in-process session, use `?connection=local`. Arrow keys/WASD send movement commands, Space pauses/resumes, E resolves a nearby quest interaction, F5 saves, F9 loads, and Enter restarts after death. **Back to connections** or Escape leaves the world and returns to the populated server form, including after connection failure.

Open a second browser through the server menu or direct URL to attach to the same world. Each socket gets a unique connection identity and a server-normalized display name of at most 24 Unicode characters. Snapshots contain an ephemeral connection roster; joining/leaving updates it for every peer. Names appear above the attached snake and disappear when their connections close. Both clients currently control the same singleton `player-1`, so both attached names appear above that one body; there is no new per-player inventory, quest, or collision model. The server replaces payload player IDs with the attached identity. Connection names are separate from character/save state.

`HOST` and `PORT` configure the Node listener (defaults `127.0.0.1:8787`). `SNAKE_SAVE_DIRECTORY` overrides `.snake-server-saves`. Server checkpoints use the existing `GameSaveData` and `SaveStore` contract. They are separate from browser localStorage saves and use atomic file replacement.

## Ownership

- `AuthoritativeGameSession.create()` loads production quests, constructs/resets `SnakeGame`, and initializes the enabled wrapping behavior. `LocalGameSession` is a compatibility export of this same implementation.
- The session owns action, actor, boss, bullet, and hazard clocks. `start()` advances them from elapsed monotonic time. `advance()` also supports deterministic tests. Commands, asynchronous actor steps, and persistence share an ordered queue. Timer ticks do not accumulate unbounded pending work.
- `GameConnection.send()` may return a synchronous local result or an asynchronous transport acknowledgement. Connected UI awaits the result. A remote result follows the mutation and its snapshot publication; there is no optimistic success acknowledgement.
- `SceneGameBridge` contains detached snapshot reads and command forwarding, with no `SnakeGame` import or instance. `ConnectedSceneRuntime` uses it inside `SnakeScene` and reuses `SnakeRenderer`. Remote initialization returns before legacy runtime construction or feature registration.
- `createGameServer()` owns transport, socket identity, command validation, fanout, backpressure, and shutdown. It contains no gameplay rules. `server/main.ts` only creates and starts the session/transport.
- JSON snapshots deliberately retain the existing room data. JSON copying unwraps `RoomSnapshotCache` proxies and prevents local presentation mutations from reaching authoritative objects. Subscribers receive separate copies.
- `basicGameplayHooks.ts` is shared by legacy feature hooks and the headless session for core apple scoring, bonus apples, and hunger counters. The headless factory enables these; existing scene-owned sessions retain their legacy hooks to avoid double rewards.
- Production quest loading uses explicit import entry points in `builtInQuests.ts`; it works without Vite glob transforms. Add future production quest modules to that list. Class-only helper modules have no default quest registration, matching the previous loader.

## Remaining full-game cuts

The connected path currently proves movement, world/room transitions, core apple behavior, actor/hazard/bullet simulation, snapshots/events, shared observers, pause, checkpoints, and restart. It does **not** yet preserve the entire existing game's feature/UI behavior. Do not make it the default until the following cuts are complete:

1. Expand snapshot selectors and explicit intent commands to cover existing menus and interactions, including inventory/equipment, character creation, skill trees/spells, quests, relationships, shops, construction, and Archipelago. Several legacy commands are still too narrow to represent these flows.
2. Move the remaining gameplay effects from scene/feature code into headless runtime hooks: killstreaks, Starforged, radio modifiers, birthday rewards, caffeinated boosts, equipment application, vehicles/manual movement, minigame rewards, and scene-managed death/rescue/life-charge handling. Keep their visuals and menus client-side.
3. Replace the legacy `SnakeScene.snakeGame` accesses and scene-owned scheduler with the expanded bridge and session clock policy. The default legacy path still constructs a game and changes its state directly.
4. Replace callback-based presentation/save supplements (cosmetics, achievements, arcade state, active vehicles, level-ups, Jason events) with commands/events or authoritative save data. The new headless factory bypasses optional scene callbacks; the legacy path still uses them.
5. Reuse the full existing UI over the bridge and exercise feature parity through a browser connected to Node. The opt-in connected presentation currently renders the world but does not provide those full menus or all NPC presentation.

Stop after a second connected client receives the same shared world and full remote single-player parity holds. True per-player semantics remain a separate project.

## Evidence

`src/session/__tests__/authoritativeTransport.test.ts` covers real local/remote connections, two-client snapshot equality, command acknowledgements and identity binding, malformed peers, detached snapshots, production quest loading, clock ownership/pause, and save failure recovery. `tests/e2e/authoritative.smoke.spec.ts` boots Chromium with two real pages, sends keyboard commands over WebSocket, advances the authority, and verifies rendered snapshots. It is a pipe smoke test, not full-game parity evidence.

`tests/e2e/connections.smoke.spec.ts` covers title navigation through both multiplayer choices, URL validation, keyboard submission/focus containment, saved connection preferences, two named clients sharing a snapshot, pause preservation when joining, disconnect presence removal, and returning from connection failure at a narrow viewport. `connectionSettings.ts` is the reusable URL/name/preferences boundary; `serverConnectionMenu.ts` owns the native form.
