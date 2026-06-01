# Snake for the Modern Gamer — Multiplayer-Ready Local Session Refactor

## 1. Purpose

This document defines the requirements and design for restructuring *Snake for the Modern Gamer* so that single-player operates like a one-player multiplayer session.

The goal is **not** to build the WebSocket server yet. The goal is to prepare the codebase so that the game can eventually be split into:

- a headless authoritative game/session layer
- a Phaser/Vite client renderer
- optional local or remote transports

For now, everything still runs locally in the browser. The major change is architectural: input, simulation, snapshots, rendering, and persistence should begin to communicate through clean boundaries instead of directly reaching into each other.

This refactor should make future multiplayer possible without making single-player harder to maintain.

---

## 2. High-Level Goal

Single-player should eventually work like this:

```txt
Phaser Client
  sends ClientCommand objects
    ↓
LocalGameSession
  owns simulation and save state
    ↓
GameCore / SnakeGame
  mutates authoritative game state
    ↓
LocalGameSession
  emits GameSnapshot objects
    ↓
Phaser Client
  renders snapshot
```

Multiplayer later should use the same concept:

```txt
Phaser Client
  sends ClientCommand JSON over WebSocket
    ↓
Remote Game Server
  owns simulation and save state
    ↓
Remote Game Server
  sends GameSnapshot JSON over WebSocket
    ↓
Phaser Client
  renders snapshot
```

The difference between single-player and multiplayer should become the **transport**, not the renderer or game rules.

---

## 3. Architectural Principles

### 3.1 Single-Player Should Use the Multiplayer Shape

Single-player should run through the same command/snapshot model that multiplayer will use later.

In single-player:

- commands can be plain TypeScript objects
- snapshots can be plain TypeScript objects
- no JSON serialization is required
- no WebSocket is required
- no remote server is required

But the flow should mirror multiplayer.

### 3.2 Phaser Should Not Be the Source of Truth

Phaser should own:

- rendering
- input collection
- menus
- HUD
- audio
- animations
- interpolation
- client-only settings

Phaser should not own:

- snake truth
- apple truth
- enemy truth
- room truth
- quest truth
- save truth
- multiplayer truth

The renderer asks:

> “What should I draw?”

The session decides:

> “What happened?”

### 3.3 Game Systems Should Not Know About Networking

Do not make systems directly aware of WebSockets, JSON, clients, or servers.

Bad:

```ts
appleService.sendAppleUpdateOverWebSocket(...)
questController.broadcastQuestState(...)
townSystem.notifyClients(...)
```

Good:

```ts
gameState changes
session emits snapshot/event
transport delivers snapshot/event
```

### 3.4 Save Storage Should Be Abstracted

The current localStorage save model should be wrapped behind a storage interface.

Single-player can use localStorage. Future multiplayer can use filesystem JSON, SQLite, or another server-side persistence method.

### 3.5 Player State Should Be Scalable

The game should move toward:

```ts
players: Map<PlayerId, PlayerRuntime>
```

Single-player is just one player in the map.

This enables future multi-snake simulation without maintaining a separate single-player architecture.

---

## 4. Non-Goals

This project phase does **not** include:

- WebSocket server implementation
- remote multiplayer
- headless Node server
- JSON network protocol serialization
- server-side persistence
- 3x3 room streaming
- full split of client and server bundles
- authoritative multiplayer conflict resolution
- anti-cheat
- remote player interpolation
- production hosting

Those come later.

This phase stops at the point where the code is structurally ready to be separated, but still runs as a normal Vite/Phaser single-player game.

---

## 5. Core Concepts

### 5.1 ClientCommand

A `ClientCommand` is an input or intent sent from the renderer/client to the game session.

Examples:

```ts
export type ClientCommand =
  | {
      type: 'setDirection';
      playerId: string;
      direction: { x: number; y: number };
    }
  | {
      type: 'interact';
      playerId: string;
    }
  | {
      type: 'useItem';
      playerId: string;
      itemId: string;
    }
  | {
      type: 'chooseOption';
      playerId: string;
      choiceId: string;
    }
  | {
      type: 'pause';
      playerId: string;
    }
  | {
      type: 'resume';
      playerId: string;
    };
```

For this phase, only the commands needed by current gameplay must be implemented.

The command model can start small and expand over time.

### 5.2 GameSnapshot

A `GameSnapshot` is the renderable public state emitted by the game session.

It should contain enough data for the Phaser client to render the current game without directly inspecting internal systems.

Example:

```ts
export interface GameSnapshot {
  tick: number;
  localPlayerId: string;
  viewport: ViewportSnapshot;
  players: Record<string, PlayerSnapshot>;
  ui: UiSnapshot;
}
```

The snapshot does not need to contain every internal detail. It should be shaped around what the client needs to render and display.

### 5.3 GameEvent

A `GameEvent` is a discrete thing that happened.

Examples:

```ts
export type GameEvent =
  | {
      type: 'sound.play';
      soundId: string;
    }
  | {
      type: 'screen.shake';
      intensity: number;
      durationMs: number;
    }
  | {
      type: 'toast';
      message: string;
    }
  | {
      type: 'player.died';
      playerId: string;
      reason: string;
    }
  | {
      type: 'room.changed';
      playerId: string;
      fromRoomId: string;
      toRoomId: string;
    };
```

Events replace direct scene calls where possible.

### 5.4 GameConnection

The Phaser client should eventually talk to a `GameConnection`, not directly to `SnakeGame`.

```ts
export interface GameConnection {
  send(command: ClientCommand): void;
  onSnapshot(handler: (snapshot: GameSnapshot) => void): () => void;
  onEvent(handler: (event: GameEvent) => void): () => void;
  disconnect(): void;
}
```

For this phase, only `LocalGameConnection` is required.

Future multiplayer can add:

```ts
WebSocketGameConnection
```

without changing the scene architecture dramatically.

### 5.5 LocalGameSession

`LocalGameSession` is the single-player stand-in for a future server session.

It owns:

- game instance
- local player ID
- save store
- command handling
- snapshot production
- event emission

It should be possible to run the game through `LocalGameSession` without changing the visible single-player experience.

---

## 6. Milestone 1 — Snapshot Renderer

### 6.1 Goal

Introduce a render snapshot boundary between game state and Phaser rendering.

The Phaser scene should begin rendering from a `GameSnapshot` or snapshot-like object instead of freely reaching into internal game state.

This milestone does not need to remove all direct access immediately, but it should establish the pattern.

### 6.2 Requirements

- Add snapshot type definitions.
- Add a method that produces a client/render snapshot from the current game state.
- Snapshot should include current room data needed for rendering.
- Snapshot should include local snake/player data.
- Snapshot should include apple/enemy/NPC/pickup data needed by the renderer.
- Snapshot should include minimal UI state currently read from flags.
- Existing gameplay should remain unchanged.
- Existing save/load should remain unchanged.

### 6.3 Proposed Interfaces

```ts
export interface GameSnapshot {
  tick: number;
  localPlayerId: string;
  viewport: ViewportSnapshot;
  players: Record<string, PlayerSnapshot>;
  ui: UiSnapshot;
}

export interface ViewportSnapshot {
  centerRoomId: string;
  rooms: Record<string, ClientRoomSnapshot>;
}

export interface ClientRoomSnapshot {
  id: string;
  layout: string[];
  biomeId?: string;
  biomeTitle?: string;
  backgroundColor?: number;
  wallColor?: number;
  wallOutlineColor?: number;
  portals?: unknown[];
  structures?: unknown[];
  caveEntrances?: unknown[];
  apples?: unknown[];
  enemies?: unknown[];
  npcs?: unknown[];
  pickups?: unknown[];
}

export interface PlayerSnapshot {
  id: string;
  name: string;
  roomId: string;
  body: Array<{ x: number; y: number }>;
  direction: { x: number; y: number };
  score: number;
  alive: boolean;
  isLocal: boolean;
}

export interface UiSnapshot {
  paused?: boolean;
  messages?: string[];
  activeChoice?: unknown;
  activeQuest?: unknown;
  health?: {
    current: number;
    max: number;
  };
}
```

Types can be narrowed as implementation proceeds.

### 6.4 Design Notes

This milestone should prioritize introducing the boundary, not perfect DTO purity.

It is acceptable if some fields initially use `unknown` or existing internal shapes. Later milestones can refine them.

The renderer can still call existing methods where necessary, but new rendering work should prefer snapshot fields.

### 6.5 Acceptance Criteria

- `SnakeGame` or a wrapper can produce a `GameSnapshot`.
- Phaser can render the local snake from the snapshot.
- Phaser can render the current room from the snapshot.
- Existing single-player gameplay still works.
- No networking is introduced.
- No save format changes are required.

---

## 7. Milestone 2 — Command Input

### 7.1 Goal

Introduce a command boundary for player input.

The Phaser scene should begin sending commands instead of directly mutating game internals.

### 7.2 Requirements

- Add `ClientCommand` type definitions.
- Add a command handler to the game/session layer.
- Direction input should use `ClientCommand`.
- Interact/action input should begin moving toward `ClientCommand`.
- Current keyboard/mobile controls should still work.
- Existing gameplay should remain unchanged.

### 7.3 Proposed Command Handler

```ts
export interface CommandHandler {
  handleCommand(command: ClientCommand): void;
}
```

Initial implementation can route commands to existing methods:

```ts
handleCommand(command: ClientCommand): void {
  switch (command.type) {
    case 'setDirection':
      this.snake.setDirection(command.direction.x, command.direction.y);
      break;

    case 'interact':
      this.interact(command.playerId);
      break;

    case 'useItem':
      this.useItem(command.playerId, command.itemId);
      break;
  }
}
```

### 7.4 Design Notes

The command boundary is more important than completing every possible input.

Start with:

- direction changes
- pause/resume
- interact
- menu choice selection if simple

Do not block this milestone on every specialized UI flow.

### 7.5 Acceptance Criteria

- Direction changes can be sent as commands.
- The Phaser scene no longer needs to directly call snake direction methods for basic movement.
- Commands include a `playerId`, even though there is only one player.
- Existing input behavior remains unchanged.
- The codebase has a clear place for future network command handling.

---

## 8. Milestone 3 — LocalGameSession

### 8.1 Goal

Create a local session object that wraps the current game and behaves like a one-player server.

The Phaser client should communicate with the local session through a connection-like interface.

### 8.2 Requirements

- Add `LocalGameSession`.
- Add `LocalGameConnection`.
- Local session owns or wraps the current `SnakeGame`.
- Local session receives `ClientCommand` objects.
- Local session produces `GameSnapshot` objects.
- Local session emits `GameEvent` objects where possible.
- Single-player should run through this local session.
- No WebSocket or remote server is introduced.

### 8.3 Proposed Structure

```ts
export class LocalGameSession {
  private readonly game: SnakeGame;
  private readonly localPlayerId: string;

  constructor(args: LocalGameSessionArgs) {
    this.game = args.game;
    this.localPlayerId = args.localPlayerId;
  }

  handleCommand(command: ClientCommand): void {
    this.game.handleCommand(command);
  }

  step(deltaMs: number): void {
    this.game.step(deltaMs);
    this.emitSnapshot();
  }

  getSnapshot(): GameSnapshot {
    return this.game.getSnapshot(this.localPlayerId);
  }
}
```

```ts
export class LocalGameConnection implements GameConnection {
  constructor(private readonly session: LocalGameSession) {}

  send(command: ClientCommand): void {
    this.session.handleCommand(command);
  }

  onSnapshot(handler: (snapshot: GameSnapshot) => void): () => void {
    return this.session.onSnapshot(handler);
  }

  onEvent(handler: (event: GameEvent) => void): () => void {
    return this.session.onEvent(handler);
  }

  disconnect(): void {
    // no-op for now
  }
}
```

### 8.4 Design Notes

The scene may still directly call session methods during transition, but the desired direction is:

```txt
Scene → GameConnection → LocalGameSession → Game
```

This milestone is the core single-player-as-local-server step.

### 8.5 Acceptance Criteria

- A single-player run can be started through `LocalGameSession`.
- Input can flow through `LocalGameConnection`.
- Snapshots can flow back to Phaser.
- Existing single-player behavior remains unchanged.
- No WebSocket code is required.
- Session code is browser-safe.

---

## 9. Milestone 4 — SaveStore Abstraction

### 9.1 Goal

Move persistence behind a storage interface so that localStorage is not hardwired into game/session logic.

Single-player should still save to localStorage, but the game should no longer need to care how persistence works.

### 9.2 Requirements

- Add `SaveStore` interface.
- Add `LocalStorageSaveStore`.
- Existing save/load behavior should continue.
- `LocalGameSession` should own save/load orchestration.
- Save data should remain compatible where possible.
- Existing save migration should remain supported.
- No server-side storage is added yet.

### 9.3 Proposed Interface

```ts
export interface SaveStore<TSaveData> {
  load(slotId: string): Promise<TSaveData | null>;
  save(slotId: string, data: TSaveData): Promise<void>;
  clear(slotId: string): Promise<void>;
  has(slotId: string): Promise<boolean>;
}
```

### 9.4 LocalStorage Implementation

```ts
export class LocalStorageSaveStore<TSaveData> implements SaveStore<TSaveData> {
  constructor(private readonly keyPrefix: string) {}

  async load(slotId: string): Promise<TSaveData | null> {
    const raw = localStorage.getItem(`${this.keyPrefix}:${slotId}`);
    return raw ? JSON.parse(raw) as TSaveData : null;
  }

  async save(slotId: string, data: TSaveData): Promise<void> {
    localStorage.setItem(`${this.keyPrefix}:${slotId}`, JSON.stringify(data));
  }

  async clear(slotId: string): Promise<void> {
    localStorage.removeItem(`${this.keyPrefix}:${slotId}`);
  }

  async has(slotId: string): Promise<boolean> {
    return localStorage.getItem(`${this.keyPrefix}:${slotId}`) !== null;
  }
}
```

### 9.5 Design Notes

This should not force all save code to become async immediately if that creates too much churn. If necessary, a sync adapter can be used temporarily.

The key is to create a seam:

```txt
Session owns save/load
SaveStore owns persistence mechanism
Game owns serializable state
```

### 9.6 Acceptance Criteria

- Existing local save/load still works.
- `localStorage` access is isolated behind `LocalStorageSaveStore` or equivalent.
- The session layer can request save/load without knowing storage details.
- Save data versioning/migration still functions.
- The architecture can later support a server-side `FileSaveStore` or `DatabaseSaveStore`.

---

## 10. Milestone 5 — Player Map

### 10.1 Goal

Refactor the game from one hardcoded snake/player into a player map that can support multiple snakes later.

Single-player should still have exactly one player, but the internal model should no longer assume there can only ever be one.

### 10.2 Requirements

- Introduce `PlayerId`.
- Introduce `PlayerRuntime` or equivalent.
- Store players in a map or record.
- Single-player creates one local player.
- Local player owns a `SnakeState`.
- Player-specific state should begin moving under player runtime.
- Existing single-player gameplay should remain unchanged.
- Snapshot should expose players as a record/map.
- Commands should target `playerId`.

### 10.3 Proposed Types

```ts
export type PlayerId = string;

export interface PlayerRuntime {
  id: PlayerId;
  name: string;
  snake: SnakeState;
  inventory: InventorySystem;
  flags: Record<string, unknown>;
  alive: boolean;
  cosmetics?: PlayerCosmetics;
}

export interface PlayerCosmetics {
  activeTheme?: string;
  activeHat?: string | null;
}
```

The main game/session should move from:

```ts
private readonly snake: SnakeState;
```

toward:

```ts
private readonly players = new Map<PlayerId, PlayerRuntime>();
private readonly localPlayerId: PlayerId;
```

### 10.4 State Ownership Guidance

#### Shared World State

These should probably remain shared:

- world rooms
- generated room state
- apples
- enemies
- bosses
- animals
- towns
- caves
- world events
- rumors, at least initially

#### Player-Owned State

These should move toward player-owned:

- snake body
- snake direction
- score
- inventory
- equipment
- player flags
- health
- class/background/religion where applicable
- cosmetics
- death/revive state

#### Unclear / Defer

These may need later design:

- quests
- relationships
- NPC social states
- faction alignment
- town reputation
- crime ownership
- actor memories

For this milestone, do not solve every ambiguous system. Move only what is necessary to support multiple snake states.

### 10.5 Migration Strategy

Do not rewrite the entire game in one pass.

Recommended approach:

1. Add `players` map.
2. Create one player at startup.
3. Add helpers:

```ts
getLocalPlayer(): PlayerRuntime
getPlayer(playerId: PlayerId): PlayerRuntime | null
getLocalSnake(): SnakeState
```

4. Replace internal `this.snake` reads gradually with `this.getLocalSnake()` or `getPlayerSnake(playerId)`.
5. Keep compatibility accessors if needed during transition.

### 10.6 Design Notes

This milestone is probably the most invasive of the first six.

It should be done carefully and with frequent tests.

The goal is not full multiplayer simulation yet. The goal is to remove the assumption that the game has exactly one snake forever.

### 10.7 Acceptance Criteria

- Game state contains a player map.
- Single-player creates one player.
- Commands apply to the correct player by `playerId`.
- Snapshot returns players as a collection.
- Existing single-player gameplay still works.
- Save/load still works for the single local player.
- The codebase has a path to add a second player without duplicating the whole game.

---

## 11. Milestone 6 — Local Two-Snake Debug

### 11.1 Goal

Prove that the refactored local architecture can support multiple snake states before introducing a headless server or WebSockets.

This milestone should add a debug/dev-only mode with two snakes in one local session.

### 11.2 Requirements

- Add ability to create a second local player.
- Both players have independent `SnakeState`.
- Both players are included in snapshots.
- Renderer can display both snakes.
- Local player remains visually distinct.
- Second snake can be controlled by simple AI, scripted movement, or optional debug input.
- Existing single-player mode remains unchanged by default.
- No networking is introduced.

### 11.3 Control Options

#### Option A — Simple AI

The second snake follows basic logic:

- move toward apple
- avoid walls
- avoid self
- change direction periodically if blocked

This is probably easiest for testing.

#### Option B — Second Keyboard Layout

Example:

- Player 1: arrow keys / WASD
- Player 2: IJKL

This is useful but not required.

#### Option C — Scripted Ghost

The second snake follows a fixed seeded route.

This is good for deterministic tests.

### 11.4 Collision Rules for Debug Mode

For the debug milestone, keep collision rules simple.

Recommended:

- Each snake can collide with its own body.
- Each snake can collide with walls.
- Other snake collision can be disabled initially.
- Optional debug setting can make other snakes solid.

Do not block the milestone on perfect multiplayer collision design.

### 11.5 Snapshot Requirements

Snapshot should include both players:

```ts
players: {
  "player-1": {
    id: "player-1",
    isLocal: true,
    body: [...]
  },
  "debug-player-2": {
    id: "debug-player-2",
    isLocal: false,
    body: [...]
  }
}
```

The renderer should draw both.

### 11.6 Design Notes

This milestone validates the entire purpose of the prior refactor.

If two local snakes can exist in one local session, then the game is much closer to server-authoritative multiplayer.

At this stage, the system still does not need to be headless. It can still run inside the browser and use Phaser.

### 11.7 Acceptance Criteria

- Debug mode can spawn two players/snakes.
- Both snakes step independently.
- Both snakes appear in snapshots.
- Phaser renders both snakes.
- The local player remains controllable.
- The second snake can move via AI/script/debug input.
- Single-player default mode remains unchanged.
- No remote server is required.
- No WebSocket code is required.

---

## 12. Overall Acceptance Criteria for Milestones 1–6

The pre-headless refactor is complete when:

1. Single-player runs through a local session-like architecture.
2. Player input is represented as commands.
3. Rendering can be driven primarily from snapshots.
4. Save/load is routed through a storage abstraction.
5. The game state supports a player map.
6. Single-player still works with one player.
7. A debug mode can run two local snakes.
8. No WebSocket or remote server is required.
9. The codebase has clear seams for later headless extraction.
10. The Phaser scene is less tightly coupled to game simulation internals.
11. The game remains playable throughout the refactor.
12. Existing save data is preserved or migrated safely.

---

## 13. Recommended File Layout

Initial files can be added without moving the whole codebase immediately.

```txt
src/session/
  ClientCommand.ts
  GameSnapshot.ts
  GameEvent.ts
  GameConnection.ts
  LocalGameSession.ts
  LocalGameConnection.ts

src/storage/
  SaveStore.ts
  LocalStorageSaveStore.ts

src/players/
  playerTypes.ts
```

Later, these can move into a larger shared/core structure:

```txt
src/core/
src/client/
server/
```

But this project phase should avoid a massive folder migration unless necessary.

---

## 14. Testing Strategy

### 14.1 Snapshot Tests

Verify:

- snapshot contains local player
- snapshot contains current room
- snapshot contains snake body
- snapshot updates after movement
- snapshot does not expose unnecessary internal mutable references

### 14.2 Command Tests

Verify:

- `setDirection` command changes intended player direction
- invalid player commands are ignored or rejected safely
- commands do not mutate the wrong player

### 14.3 Session Tests

Verify:

- local session can start
- local session can step
- local session emits snapshots
- local session routes commands to game

### 14.4 SaveStore Tests

Verify:

- localStorage save/load works
- missing save returns null
- clear removes save
- existing save data can still load

### 14.5 Player Map Tests

Verify:

- one player is created in normal single-player
- player can be found by ID
- snapshot includes all players
- local player ID is stable
- save/load preserves local player state

### 14.6 Two-Snake Debug Tests

Verify:

- second debug player can spawn
- second snake moves independently
- renderer receives both snakes
- default single-player mode still creates only one snake

---

## 15. Migration Risk Areas

### 15.1 `SnakeGame` God Object

`SnakeGame` currently owns many systems directly. Do not try to fully dissolve it immediately.

Wrap first. Extract later.

### 15.2 Scene Dependencies

Any simulation logic that directly calls or depends on Phaser scene behavior should eventually become events.

For this phase, identify and reduce the worst dependencies, but do not block all milestones on perfect separation.

### 15.3 Flags

The flexible `flags: Record<string, unknown>` model is useful but can obscure ownership.

For this phase:

- keep flags working
- avoid expanding flag usage unnecessarily
- gradually move major systems to typed state where practical

### 15.4 Randomness

Future multiplayer will need deterministic or server-owned randomness.

For this phase:

- identify direct `Math.random` usage in simulation
- prefer injected RNG for new code
- do not require a full randomness audit yet

### 15.5 Save Compatibility

Refactoring save ownership can break existing saves.

For this phase:

- preserve current save format where possible
- add migrations when needed
- test loading old saves

---

## 16. Future Milestones After This Document

These are intentionally out of scope for this phase:

### Milestone 7 — Headless Core

Make the game/session runnable without Phaser.

### Milestone 8 — WebSocket Server

Run authoritative sessions on Node.

### Milestone 9 — Client/Server Snapshot Protocol

Serialize commands and snapshots over JSON.

### Milestone 10 — 3x3 Viewport Streaming

Server sends only nearby rooms to each client.

### Milestone 11 — Server Persistence

Server owns world save and per-player saves.

### Milestone 12 — Real Multiplayer

Multiple clients connect to the same authoritative session.

---

## 17. Summary

This refactor should make single-player behave like a one-player multiplayer session.

The game should still run locally in the browser, but the architecture should begin using:

- commands for input
- snapshots for rendering
- events for one-off effects
- sessions for simulation ownership
- save stores for persistence
- player maps for scalable player state

The end state of milestones 1–6 is not multiplayer yet.

The end state is a healthier, more modular single-player architecture that can be separated into a headless game server later without rewriting the entire game again.
