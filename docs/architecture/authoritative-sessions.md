# Authoritative sessions and connected players

This is an opt-in boundary proof, not the completed full-game migration. The default title/menu/gameplay path remains the legacy scene integration.

## Run

```sh
npm run server
npm run dev
```

Open the normal title screen and choose **Multiplayer → Server**. Enter the server URL and a display name, then choose **Enter World**. The menu remembers the last URL/name, supports native text selection/paste and keyboard/controller focus, and accepts bare addresses such as `localhost:8787`. The first connected player starts the paused session; joining an occupied session preserves its pause state. **Multiplayer → Archipelago** retains the existing slot/password connection flow.

The direct URL `?server=ws%3A%2F%2F127.0.0.1%3A8787%2Fgame` remains available for diagnostics; it begins paused until Space is pressed. For the same connected renderer backed by an in-process session, use `?connection=local`. Arrow keys/WASD send movement commands, Space pauses/resumes, E opens a nearby NPC interaction menu or resolves a nearby quest interaction; NPC sprites can also be clicked to open their menus. Arrow keys/Tab and Enter select menu options; Escape returns from a submenu or leaves the conversation. Menus support dialogue, rumors, waking NPCs, quest offers, and shop purchases. Number keys select nearby quest choices. I shows the attached player inventory, with 1-9 sending item-use commands. F5 saves, F9 loads, and Enter respawns a dead connected player. **Back to connections** or Escape leaves the world and returns to the populated server form, including after connection failure.

Open a second browser to join the same world with a separate snake. Each socket gets a unique player identity, a server-normalized display name of at most 24 Unicode characters, and a viewport/UI snapshot for that player. Every client receives the shared player body positions, while inventory, health, quest choices, and conversation responses follow its own player context. The server replaces payload player IDs with the attached identity. Each name appears above its own body. Disconnecting removes guest snakes; the primary character is retained but stops moving while detached.

SnakeGame.runForPlayer() is a synchronous compatibility scope over existing gameplay methods. It switches the body/flags, inventory, quest controller, progression, maneuvers, and transient movement state, then restores the previous context in finally. It does not create another game or world. Do not return asynchronous work from this scope. Queued asynchronous interaction dispatch uses runForPlayerAsync(), which retains the selected context until completion; only the session queue may hold that scope. The session serializes connection changes alongside commands and clocks. Player snakes currently pass through each other; player-versus-player rules remain undecided. Respawn replaces the attached body and restores health while retaining inventory, score, quests, and world flags; it never resets another snake. Pause remains a shared session control.

Room snapshots include the existing materialized Actors. ConnectedNpcRenderer reuses WorldVisualAssets and getActorPresentation() for sprites, names, indicators, sleep markers, and speech. NPC positions and removal follow server snapshots. Interactions validate room, liveness, and distance and reuse the existing Actor, conversation, quest, and shop APIs. NPC bodies in other occupied rooms also advance through the existing simulation. Enemy bullets advance once and test all live player bodies; damage uses the existing damage method.

ConnectedGameInteractions owns ephemeral per-player menu revisions and offered option IDs. ConnectedInteractionPopup reuses ChoicePopup over a narrow scene contract. The server revalidates every selection against the current menu, distance, affordability, shop hours, and stock; clients never submit prices or rewards. Finite stock lives on the shared merchant Actor, with the primary legacy stock flag retained for save compatibility. Card offers grant through addCardToCollection(). Browsing holds only that player's action steps, while peers and world clocks continue; it does not pause the session or make the player invulnerable. Leaving, moving out of reach, NPC death, loading, and respawn invalidate menus.

`HOST` and `PORT` configure the Node listener (defaults `127.0.0.1:8787`). `SNAKE_SAVE_DIRECTORY` overrides `.snake-server-saves`. Server checkpoints use the existing `GameSaveData` and `SaveStore` contract. They are separate from browser localStorage saves and use atomic file replacement. Checkpoints persist the primary character and shared world through the existing save contract; guest reconnect identity and durable guest checkpoints are still pending.

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

The connected path currently proves movement, world/room transitions, core apple behavior, actor/hazard/bullet simulation, snapshots/events, independent player movement, private player UI, NPC presentation/interaction menus, shop purchases, quest acceptance, pause, primary checkpoints, and player respawn. It does **not** yet preserve the entire existing game's feature/UI behavior. Do not make it the default until the following cuts are complete:

1. Expand snapshot selectors and explicit intent commands to cover existing menus and interactions, including full inventory/equipment menus, character creation, skill trees/spells, quest journals, advanced relationship/shop services, construction, and Archipelago. Several legacy commands are still too narrow to represent these flows.
2. Move the remaining gameplay effects from scene/feature code into headless runtime hooks: killstreaks, Starforged, radio modifiers, birthday rewards, caffeinated boosts, equipment application, vehicles/manual movement, minigame rewards, and scene-managed death/rescue/life-charge handling. Keep their visuals and menus client-side.
3. Replace the legacy `SnakeScene.snakeGame` accesses and scene-owned scheduler with the expanded bridge and session clock policy. The default legacy path still constructs a game and changes its state directly.
4. Replace callback-based presentation/save supplements (cosmetics, achievements, arcade state, active vehicles, level-ups, Jason events) with commands/events or authoritative save data. The new headless factory bypasses optional scene callbacks; the legacy path still uses them.
5. Reuse the full existing UI over the bridge and exercise feature parity through a browser connected to Node. The opt-in connected presentation renders the world with NPC dialogue/quest/shop menus, inventory use, and quest choice controls; full inventory, equipment, and advanced Actor services are still pending. Enemy/animal targeting, encounters, and scene-side systems still need an audit for multiple players in one or different rooms; do not infer full combat or feature parity from independent bodies.

The original pipe-only stopping point has been extended to independent connected player bodies. Finish remote single-player parity before expanding further multiplayer rules. Guest persistence, reconnect policy, PvP, and remaining singleton assumptions are outstanding cuts.

## Evidence

`src/session/__tests__/authoritativeTransport.test.ts` covers real local/remote connections, two-client shared world consistency, independent identities and command isolation, command acknowledgements and identity binding, malformed peers, detached snapshots, production quest loading, clock ownership/pause, and save failure recovery. `tests/e2e/authoritative.smoke.spec.ts` boots Chromium with two real pages, sends keyboard commands over WebSocket, advances the authority, and verifies rendered snapshots. It is a pipe smoke test, not full-game parity evidence.

`tests/e2e/connections.smoke.spec.ts` covers title navigation through both multiplayer choices, URL validation, keyboard submission/focus containment, saved connection preferences, two named clients sharing a snapshot, pause preservation when joining, disconnect presence removal, and returning from connection failure at a narrow viewport. `connectionSettings.ts` is the reusable URL/name/preferences boundary; `serverConnectionMenu.ts` owns the native form.

The multiplayerSession tests cover distinct bodies, inventory/flag isolation, per-player room projection, disconnect cleanup, death/respawn isolation, materialized Actor snapshots, detached NPC positions, and talk proximity. The multiplayer.smoke browser test exercises independent keyboard control, NPC rendering/talk, private responses, and different room viewports.

`src/session/__tests__/connectedInteractions.test.ts` exercises queued local commands, real WebSocket identity binding, private quest acceptance/completion, competing purchases against shared stock, card collection rewards, stale menu rejection, shop closure/range checks, and canonical prices. `tests/e2e/serverInteractions.smoke.spec.ts` drives the normal ChoicePopup in two Chromium clients, buys the last shared item, accepts a private production quest, and verifies popup keys cannot steer the underlying snake.
