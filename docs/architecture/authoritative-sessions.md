# Authoritative sessions and the normal client

Offline and server-backed play both enter `SnakeScene.create()` and construct the normal renderer, PauseUI, multi-tab SkillTreeOverlay, HUD, ChoicePopup, DatingScenePopup, save browser, fishing overlay, and baseball overlay. The connected-only scene runtime, NPC renderer, and interaction popup have been removed.

## Run and controls

Run `npm run server` and `npm run dev`, then choose Multiplayer -> Server from the title screen. The form validates/remembers the URL and display name. Direct `?server=ws%3A%2F%2F127.0.0.1%3A8787%2Fgame` and in-process `?connection=local` entry points remain available. The first Enter World connection resumes an administratively paused session; joining an occupied world does not change the session pause state. Direct diagnostic connections do not implicitly resume an administrator's pause.

Normal controls and UI apply: movement keys steer the attached snake, Space opens the full pause shell, E/click opens a nearby Actor menu, F starts fishing with a rod beside water, and B starts baseball with a bat. The normal Save and Save/Load buttons operate on the server checkpoint. Leave Server returns to the connection form. Enter respawns a dead attached character without resetting peers.

In multiplayer, pause tabs, NPC conversations, shops, dating, construction, minigames, and turn-step areas hold that player's automatic movement. Peers, Actors, bosses, projectiles, hazards, and environment time keep advancing. A held player remains vulnerable. Manual movement commands validate the authoritative area and current interaction state. Offline play retains its existing world-pause behavior. Explicit session pause/resume remains separate from menu interaction state.

## State and ownership

- `SceneGameClient` retains detached snapshots and supplies synchronous selectors plus acknowledged commands. Reads do not issue network requests. `SceneGameBridge` is a compatibility export.
- `SnakeGame.getSceneClientState()` projects player flags, inventory/equipment, quests, SPECIAL/progression, relationships, Actors, materialized rooms/world objects, atmosphere, construction, cars, followers, and journals. Quest wire data contains descriptions/objectives rather than callbacks. Projection does not consume gameplay RNG or invoke save supplements.
- `SceneReadReplica` privately hydrates a SnakeGame in explicit `client-replica` mode to reuse legacy selectors. Its public view rejects simulation, reset, writes, mutating service methods, and quest callbacks; returned data is detached. Missing rooms cannot generate. The unguarded hydration target never leaves the controller.
- `RemoteSceneSession` supplies the normal scene's legacy snapshot/session interface and rejects attempts to drive clocks or consume simulation RNG. `SnakeScene.updateSimulation()` only sends interaction-state changes and refreshes presentation in remote mode.
- `AuthoritativeGameSession` owns the shared world and ordered command/connection/persistence queue. Its scheduler owns movement, Actor/boss/bullet/hazard clocks, environment time, gardens, vehicles, and minigames. Per-player movement intervals use authoritative equipment and progression modifiers.
- `AuthoritativeProgression` uses the existing SkillTreeSystem and ActionSlotController with headless callbacks. Equipment, SPECIAL, skill purchases, spell bindings/casts, score modifiers, mana, and extra-life decisions publish mirrored state to the normal UI.
- `AuthoritativeVehicles` uses existing car physics/collision helpers. Entry, control input, movement, room transitions, pickups, impact damage, destruction, and exit placement run on server time.
- `AuthoritativeMinigames` uses FishingRegistry and BaseballRegistry with server RNG and clocks. Clients send start/pull/swing/abort intents, never outcomes. Gear/proximity validation, catch inventory/journal rewards, baseball statistics, and payouts belong to the authority. Existing overlays render snapshots and collect controls.
- `GameInteractionMenus` owns revisioned player-specific Actor, dialogue, quest, shop, relationship, and gift menus. Selections revalidate current options, range, stock, affordability, and hours. Existing ChoicePopup/DatingScenePopup render the views. Social/crime actions, civic campaign actions, and inn rest dispatch to existing headless gameplay APIs.
- `AtmosphereAudioManager.refresh()` observes atmosphere and presents audio/notices. It never advances the world. Jason defeat payouts/removal happen in SnakeGame before optional scene presentation callbacks. Visual randomness uses a separate presentation generator.

`SnakeGame.runForPlayer()` selects body/flags, inventory, quests, progression, maneuvers, visited rooms, and transient movement state within one shared world. Never return asynchronous work from this synchronous scope. Only the session queue may hold `runForPlayerAsync()` across an await. The server binds command identity to the attached socket. Player bodies currently pass through each other.

## Persistence

`HOST` and `PORT` configure the Node listener, defaulting to `127.0.0.1:8787`. `SNAKE_SAVE_DIRECTORY` overrides `.snake-server-saves`. FileGameSaveStore implements the existing SaveStore contract with atomic JSON replacement. Save/load/delete commands are restricted to the host while connected. The normal SaveLoadMenu receives actual durable checkpoint records through RemoteCheckpointBrowser. Clients never upload replacement save state. Host checkpoint loads preserve attached guest characters and clear stale activity/control runtimes. Durable guest reconnect identities/checkpoints remain pending.

## Scope still requiring migration

The shared client architecture and the command paths listed above are implemented; this is not yet parity for every specialty feature in the repository. Offline gameplay still uses its legacy scene authority adapter. Starting faith/background/class offer generation, the complete Starforged/killstreak/radio/Minecraft feature behavior, specialty guild/crafting/arcade/archaeology services, and the complete authored dating branch/cutscene flow still need headless command integration. Remote mode registers score, coordinates, and bonus-apple presentation; it does not run the remaining scene gameplay features against the replica. Unsupported replica mutations fail explicitly instead of inventing browser authority. General multiplayer combat targeting and durable guest persistence also need further work.

## Verification

`sceneReadReplica.test.ts` checks hydration, detached reads, guarded mutations/quest callbacks, and missing-room rejection. `sceneGameClient.test.ts` covers mirror purity, player isolation, bounded commands, construction/relationships, debug authorization, continuing hazards/peers during menu holds, and WebSocket identity binding. `authoritativeSceneGameplay.test.ts` exercises manual areas, cars, minigame outcomes/rewards, extra lives, and guest-preserving checkpoint loads without Phaser.

`clientParity.smoke.spec.ts` boots two normal browser clients, renders every available pause tab, verifies player-only holds, equips/uses items through the authority, saves through the normal Save button, loads the server checkpoint while retaining a guest, and opens/controls the existing baseball/fishing overlays. The other multiplayer browser tests cover named connections, independent movement, NPC rendering, shop stock races, private quest acceptance, hotkey isolation, and disconnect/retry. These checks establish the listed behavior, not complete parity for the remaining specialty systems.
