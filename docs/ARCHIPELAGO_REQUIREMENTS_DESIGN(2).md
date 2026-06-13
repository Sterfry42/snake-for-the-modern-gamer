# Archipelago Integration Requirements & Design

**Project:** Snake for the Modern Gamer / *Snaked. Revised. Revamped.*  
**Status:** Proposed repository design document  
**Primary goal:** Add a private playable Archipelago integration for the browser game, starting with a tiny Phase 1 proof-of-life and expanding into a fuller Phase 2 private APWorld.

---

## 1. One-sentence design

In Archipelago mode, local Snake accomplishments become Archipelago **location checks**, and only Archipelago **received items** grant the AP-controlled rewards.

Put another way:

> Local pickups become checks. Remote AP items become actual rewards.

This keeps the browser game funny and chaotic while obeying the Archipelago randomizer contract.

---

## 2. Repository placement

The TypeScript client code should live inside the existing browser game source tree. The Python APWorld should also live in this repository, but as a separate package that can be copied or packaged into an Archipelago installation.

Recommended layout:

```text
docs/
  ARCHIPELAGO_REQUIREMENTS_DESIGN.md

src/
  archipelago/
    archipelagoClient.ts
    archipelagoConnectionTypes.ts
    archipelagoCheckManifest.ts
    archipelagoCheckTracker.ts
    archipelagoItemHandlers.ts
    archipelagoStorage.ts
    archipelagoUiModel.ts

apworld/
  snaked_revised_revamped/
    __init__.py
    archipelago.json
    items.py
    locations.py
    options.py
    rules.py
    regions.py
    data/
      phase1_manifest.json
      phase2_manifest.json
    docs/
      en_SnakedRevisedRevamped.md
      setup_en.md

scripts/
  generateArchipelagoManifest.ts
  buildApworldPackage.ts
```

### Why this split

The browser game needs TypeScript code because it is a Vite/Phaser project. The APWorld needs Python because Archipelago worlds are Python packages.

The official Archipelago World API says AP worlds are written in Python 3, while clients can be written in any language that can use WebSockets. Official docs also say APWorld code is normally placed in a `worlds/` Python package in an Archipelago install, and `.apworld` files are zip packages that can be placed in the worlds folder. See:

- Archipelago World API: <https://github.com/ArchipelagoMW/Archipelago/blob/main/docs/world%20api.md>
- Archipelago APWorld specification: <https://github.com/ArchipelagoMW/Archipelago/blob/main/docs/apworld%20specification.md>
- Archipelago “Adding Games”: <https://github.com/ArchipelagoMW/Archipelago/blob/main/docs/adding%20games.md>
- Archipelago Network Protocol: <https://github.com/ArchipelagoMW/Archipelago/blob/main/docs/network%20protocol.md>

So, this repo can own the Python APWorld source, but using it with Archipelago means either:

1. copying `apworld/snaked_revised_revamped/` into an Archipelago source checkout under `worlds/snaked_revised_revamped/`, or
2. packaging it as a lowercase `.apworld` zip and dropping that `.apworld` into Archipelago’s worlds folder.

---

## 3. Current repository seams

The current codebase already has several clean integration points.

### 3.1 Existing multiplayer shell

Current file:

```text
src/client/multiplayerShell.ts
```

Relevant current behavior:

- Stores a multiplayer display name in local storage.
- Stores a WebSocket URL in local storage.
- Runs a simple WebSocket smoke test.
- Returns `"Multiplayer Under Construction."`.

Reference:

- <https://github.com/Sterfry42/snake-for-the-modern-gamer/blob/main/src/client/multiplayerShell.ts>

This should become the seam for the Archipelago connection UI. We can either replace the current placeholder shell or keep the old shell as a generic low-level smoke-test utility and add a new `src/archipelago/` layer.

### 3.2 Existing title menu support

Current file:

```text
src/scenes/snakeScene.ts
```

The scene currently imports `BrowserMultiplayerShellClient` and `submitMultiplayerShell`, and the title menu mode union includes `'multiplayer'`.

Reference:

- <https://github.com/Sterfry42/snake-for-the-modern-gamer/blob/main/src/scenes/snakeScene.ts>

The player-facing menu should be renamed from “Multiplayer” to **Archipelago** or should offer an **Archipelago** entry under Multiplayer.

Recommended menu fields:

```text
Server Address
Slot Name
Password
Connect
Disconnect
Status
Checked Locations Count
Last Received Item
Event Log
```

Do not store the password by default. Store server address and slot name.

### 3.3 Existing step result hook

Current file:

```text
src/game/snakeGame.ts
```

`StepResult` already exposes:

```ts
apple: {
  eaten: boolean;
  rewards?: AppleConsumptionResult['rewards'];
  worldPosition?: Vector2Like | null;
  current: AppleSnapshot | null;
  stateChanged: boolean;
  typeId?: string;
};
roomsChanged: Set<string>;
roomChanged: boolean;
questOffer?: Quest | null;
questsCompleted: Quest[];
```

Reference:

- <https://github.com/Sterfry42/snake-for-the-modern-gamer/blob/main/src/game/snakeGame.ts>

This is ideal for Phase 1 because the first apple check can be detected directly from `result.apple.eaten`.

For score and length checks, add explicit read methods if they do not already exist in a stable public form:

```ts
getCurrentScore(): number;
getCurrentSnakeLength(): number;
```

or include score and length in the post-step snapshot used by the scene. The AP tracker should not read private fields directly.

### 3.4 Existing apples

Current file:

```text
src/config/gameConfig.ts
```

The current apple config includes the normal apple plus additional special apple types such as shielded, gold, skittish, mochi, wasabi, yuzu, caffeinated, and others.

Reference:

- <https://github.com/Sterfry42/snake-for-the-modern-gamer/blob/main/src/config/gameConfig.ts>

Phase 1 only needs “first apple eaten.” Phase 2 should expand to first-eat checks by apple type.

### 3.5 Existing cards

Current file:

```text
src/cards/cardGame.ts
```

The current `CardId` union defines the card collection that Phase 2 should add as checks and possible AP items.

Reference:

- <https://github.com/Sterfry42/snake-for-the-modern-gamer/blob/main/src/cards/cardGame.ts>

### 3.6 Existing artifacts

Current file:

```text
src/artifacts/artifacts.ts
```

The current `ARTIFACT_DEFINITIONS` array defines the artifact collection that Phase 2 should add as checks and possible AP items.

Reference:

- <https://github.com/Sterfry42/snake-for-the-modern-gamer/blob/main/src/artifacts/artifacts.ts>

### 3.7 Existing boss/trap support

Current file:

```text
src/systems/boss.ts
```

`BossManager` can already spawn Freak Dennis, Freaker Dennis, Fallen Angel, and Jason Statham-style bosses through existing methods.

Reference:

- <https://github.com/Sterfry42/snake-for-the-modern-gamer/blob/main/src/systems/boss.ts>

Phase 2 traps should call these existing systems rather than inventing a separate trap enemy framework.

---

## 4. Official Archipelago model we must follow

### 4.1 Client connection

The Archipelago network handshake is:

1. Client opens a WebSocket connection.
2. Server sends `RoomInfo`.
3. Client may request `DataPackage`.
4. Client sends `Connect`.
5. Server responds with `Connected` or `ConnectionRefused`.
6. Server may send `ReceivedItems`.
7. Server sends `PrintJSON` messages for connection and item/chat events.

Reference:

- <https://github.com/ArchipelagoMW/Archipelago/blob/main/docs/network%20protocol.md>

### 4.2 Location checks

When the player completes a check in-game, the client sends `LocationChecks` with the numeric location IDs.

Important detail: Archipelago allows duplicates. Sending a location ID more than once does not break the server, which is useful for resync.

Client implication:

```text
The Snake client should save checked location IDs locally and resend them after reconnect.
```

### 4.3 Received items and index handling

After connecting, Archipelago sends `ReceivedItems` packets for the player’s slot. These may include items already processed in a prior session. The official protocol requires clients to track the last processed item index so duplicate items are not applied again.

Client implication:

```text
The Snake client must save lastReceivedItemIndex per AP slot/server/seed.
```

This is not optional. Without it, reconnecting can apply score bundles and traps repeatedly.

### 4.4 PrintJSON

`PrintJSON` exists to display human-readable server messages, including item-send notifications, joins, chats, hints, goals, releases, collects, and command results.

Client implication:

```text
The Snake client should append PrintJSON text into an AP event log and optionally show short toast popups for ItemSend messages.
```

### 4.5 APWorld generation

An APWorld defines:

- item names and IDs,
- location names and IDs,
- regions,
- rules,
- item pool,
- completion condition,
- slot data needed by the client.

Reference:

- <https://github.com/ArchipelagoMW/Archipelago/blob/main/docs/world%20api.md>
- <https://github.com/ArchipelagoMW/Archipelago/blob/main/docs/adding%20games.md>

Locations and items must have unique IDs within the game. Official docs recommend keeping world-specific IDs in the 1 to 2^31 - 1 range.

### 4.6 Phase 1 ID range

Use a high but 32-bit-safe reserved range:

```text
Location base: 912000000
Item base:     913000000
```

Phase 1 IDs:

```text
Locations:
912000001 - Reach Score 1
912000002 - Reach Score 10
912000003 - Reach Length 1
912000004 - Reach Length 10
912000005 - Eat Your First Apple

Items:
913000001 - Score Bundle +5
913000002 - Score Bundle +10
```

Phase 2 can continue from those bases without renumbering Phase 1.

---

# 5. Phase 1 MVP

Phase 1 is intentionally tiny. It is not the “real” randomizer experience yet. It is the proof that the browser client, AP server, APWorld generator, item receipt, location checks, local save sync, and UI all work.

## 5.1 Phase 1 goals

Phase 1 must prove:

1. The browser game can connect to an Archipelago server.
2. The Python APWorld can be loaded/generated by Archipelago.
3. Snake can send location checks.
4. Snake can receive items.
5. Received score bundle items actually affect the game.
6. Reconnecting does not duplicate received items.
7. The UI can show “checked,” “sent,” and “received” events.

## 5.2 Phase 1 non-goals

Phase 1 does **not** include:

- cards,
- artifacts,
- quests,
- boss traps,
- item pickup replacement,
- card table wins,
- archaeology milestones,
- every apple type,
- biome entry checks,
- official AP submission polish,
- GitHub Pages hosting guarantees,
- DeathLink,
- progression logic beyond the tiny goal.

## 5.3 Phase 1 checks

Phase 1 checks are:

| Stable key | AP location name | Location ID | Trigger |
|---|---:|---:|---|
| `score_1` | Reach Score 1 | `912000001` | Current score becomes `>= 1` |
| `score_10` | Reach Score 10 | `912000002` | Current score becomes `>= 10` |
| `length_1` | Reach Length 1 | `912000003` | Current snake length becomes `>= 1` |
| `length_10` | Reach Length 10 | `912000004` | Current snake length becomes `>= 10` |
| `first_apple_eaten` | Eat Your First Apple | `912000005` | `StepResult.apple.eaten === true` |

### Length 1 behavior

If the snake starts at length 1 or higher, `length_1` should check immediately after AP run initialization or on the first game tick after connection.

This is fine. It is a sanity check.

### Score 1 behavior

If the game score starts at 0, `score_1` should check after the first score gain.

If AP sends a score bundle before the player naturally scores, and that pushes the score over 1, `score_1` should also check. A check should care about current state, not the source of the score.

## 5.4 Phase 1 items

Phase 1 item pool:

| Stable key | AP item name | Item ID | Count | Classification | Client effect |
|---|---:|---:|---:|---|---|
| `score_bundle_5` | Score Bundle +5 | `913000001` | 3 | filler/useful | Add 5 score |
| `score_bundle_10` | Score Bundle +10 | `913000002` | 2 | filler/useful | Add 10 score |

Total Phase 1 item count: 5.  
Total Phase 1 location count: 5.

This keeps the APWorld legal and simple.

For Phase 1, classify both score bundles as `filler` unless early testing shows it is more useful to classify `Score Bundle +10` as `useful`. Do not classify either as `progression` yet because Phase 1 should not require score bundles for access logic.

## 5.5 Phase 1 completion goal

Recommended Phase 1 goal:

```text
Reach Score 10
```

Implementation detail:

- The browser client sends `LocationChecks` for `score_10` when score is at least 10.
- The browser client also sends a `StatusUpdate` goal-complete packet when `score_10` has been checked.
- The APWorld should include a generation-side completion condition matching the Score 10 milestone.

Archipelago docs distinguish generation events from gameplay goal notification. In practice, the APWorld needs a completion condition for generation/spoiler logic, and the runtime client needs to tell the server when the goal is achieved during play.

## 5.6 Phase 1 APWorld files

### `apworld/snaked_revised_revamped/archipelago.json`

```json
{
  "game": "Snaked. Revised. Revamped.",
  "world_version": "0.1.0",
  "authors": ["Sterling"]
}
```

### `apworld/snaked_revised_revamped/locations.py`

```py
LOCATION_BASE_ID = 912000000

location_table = {
    "Reach Score 1": LOCATION_BASE_ID + 1,
    "Reach Score 10": LOCATION_BASE_ID + 2,
    "Reach Length 1": LOCATION_BASE_ID + 3,
    "Reach Length 10": LOCATION_BASE_ID + 4,
    "Eat Your First Apple": LOCATION_BASE_ID + 5,
}

location_groups = {
    "Score": {
        "Reach Score 1",
        "Reach Score 10",
    },
    "Length": {
        "Reach Length 1",
        "Reach Length 10",
    },
    "Apples": {
        "Eat Your First Apple",
    },
}
```

### `apworld/snaked_revised_revamped/items.py`

```py
from BaseClasses import Item, ItemClassification

ITEM_BASE_ID = 913000000

item_table = {
    "Score Bundle +5": ITEM_BASE_ID + 1,
    "Score Bundle +10": ITEM_BASE_ID + 2,
}

item_groups = {
    "Score Bundles": {
        "Score Bundle +5",
        "Score Bundle +10",
    },
}

item_pool = [
    "Score Bundle +5",
    "Score Bundle +5",
    "Score Bundle +5",
    "Score Bundle +10",
    "Score Bundle +10",
]


class SnakedItem(Item):
    game = "Snaked. Revised. Revamped."
```

### `apworld/snaked_revised_revamped/__init__.py`

Required responsibilities:

```py
from BaseClasses import Region, Tutorial, ItemClassification
from worlds.AutoWorld import WebWorld, World

from .items import SnakedItem, item_pool, item_table
from .locations import location_table


class SnakedWeb(WebWorld):
    theme = "grass"
    tutorials = [
        Tutorial(
            "Multiworld Setup Guide",
            "A guide to setting up Snaked. Revised. Revamped. for Archipelago.",
            "English",
            "setup_en.md",
            "setup/en",
            ["Sterling"],
        )
    ]


class SnakedWorld(World):
    game = "Snaked. Revised. Revamped."
    web = SnakedWeb()

    item_name_to_id = item_table
    location_name_to_id = location_table

    def create_regions(self) -> None:
        menu = Region("Menu", self.player, self.multiworld)
        snake_run = Region("Snake Run", self.player, self.multiworld)

        self.multiworld.regions += [menu, snake_run]
        menu.connect(snake_run)

        snake_run.add_locations(location_table, SnakedLocation)

    def create_item(self, name: str) -> SnakedItem:
        classification = ItemClassification.filler
        return SnakedItem(name, classification, item_table[name], self.player)

    def create_items(self) -> None:
        for name in item_pool:
            self.multiworld.itempool.append(self.create_item(name))

    def set_rules(self) -> None:
        # Phase 1 has no access rules. Everything is logically reachable.
        pass

    def fill_slot_data(self) -> dict:
        return {
            "phase": 1,
            "location_name_to_id": location_table,
            "item_name_to_id": item_table,
            "checks": {
                "score_1": location_table["Reach Score 1"],
                "score_10": location_table["Reach Score 10"],
                "length_1": location_table["Reach Length 1"],
                "length_10": location_table["Reach Length 10"],
                "first_apple_eaten": location_table["Eat Your First Apple"],
            },
            "items": {
                "score_bundle_5": item_table["Score Bundle +5"],
                "score_bundle_10": item_table["Score Bundle +10"],
            },
            "goal": "score_10",
        }
```

This is a sketch, not a copy-paste guaranteed implementation. The final code must define `SnakedLocation`, import the correct Archipelago classes, and satisfy AP’s exact world package requirements.

## 5.7 Phase 1 TypeScript modules

### `src/archipelago/archipelagoConnectionTypes.ts`

Define packet-oriented types used by the client wrapper.

Required concepts:

```ts
export type ArchipelagoConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'refused'
  | 'error';

export interface ArchipelagoConnectionConfig {
  serverUrl: string;
  slotName: string;
  password?: string;
}

export interface ArchipelagoReceivedItem {
  index: number;
  itemId: number;
  itemName: string;
  playerName?: string;
  locationName?: string;
}

export interface ArchipelagoPrintMessage {
  type?: string;
  text: string;
}
```

### `src/archipelago/archipelagoClient.ts`

Responsibilities:

- Open WebSocket connection.
- Handle `RoomInfo`.
- Request `DataPackage` if needed.
- Send `Connect`.
- Handle `Connected`.
- Handle `ConnectionRefused`.
- Handle `ReceivedItems`.
- Handle `PrintJSON`.
- Send `LocationChecks`.
- Send `Sync`.
- Send `StatusUpdate` when goal is complete.
- Reconnect if the socket drops during gameplay.

Implementation option:

- Use `archipelago.js` if it behaves well in Vite/browser.
- Otherwise implement the minimal JSON packet wrapper directly.

The official network protocol lists `archipelago.js` as a JavaScript/TypeScript-supported library, so using it is reasonable. However, this game only needs a small subset of the protocol in Phase 1, so a direct implementation is also viable.

### `src/archipelago/archipelagoStorage.ts`

Responsibilities:

- Save connection info:
  - server URL,
  - slot name,
  - maybe last selected mode.
- Do not save password by default.
- Save per-run sync data:
  - checked location IDs,
  - last received item index,
  - seed name,
  - slot ID,
  - team ID,
  - game name,
  - pending trap queue, Phase 2 only.

Recommended storage key shape:

```text
snake.ap.connection
snake.ap.run.{serverUrl}.{slotName}.{seedName}
```

Stored run data:

```ts
export interface ArchipelagoRunSaveData {
  serverUrl: string;
  slotName: string;
  seedName?: string;
  team?: number;
  slot?: number;
  checkedLocationIds: number[];
  lastReceivedItemIndex: number;
  completedGoal: boolean;
}
```

### `src/archipelago/archipelagoCheckManifest.ts`

Phase 1 manifest:

```ts
export const AP_PHASE_1_LOCATIONS = {
  score1: {
    key: 'score_1',
    name: 'Reach Score 1',
    id: 912000001,
  },
  score10: {
    key: 'score_10',
    name: 'Reach Score 10',
    id: 912000002,
  },
  length1: {
    key: 'length_1',
    name: 'Reach Length 1',
    id: 912000003,
  },
  length10: {
    key: 'length_10',
    name: 'Reach Length 10',
    id: 912000004,
  },
  firstAppleEaten: {
    key: 'first_apple_eaten',
    name: 'Eat Your First Apple',
    id: 912000005,
  },
} as const;

export const AP_PHASE_1_ITEMS = {
  scoreBundle5: {
    key: 'score_bundle_5',
    name: 'Score Bundle +5',
    id: 913000001,
    score: 5,
  },
  scoreBundle10: {
    key: 'score_bundle_10',
    name: 'Score Bundle +10',
    id: 913000002,
    score: 10,
  },
} as const;
```

Do not hardcode the same IDs in five places. Phase 1 can start with this TypeScript constant and a matching Python table, but Phase 2 should generate shared JSON to avoid drift.

### `src/archipelago/archipelagoCheckTracker.ts`

Responsibilities:

- Accept post-step game state.
- Determine newly completed AP locations.
- Mark checks idempotently.
- Send only new checks during play.
- Resend all known checked locations after reconnect.
- Trigger goal completion when score 10 is checked.

Suggested API:

```ts
export interface ArchipelagoCheckRuntimeSnapshot {
  score: number;
  length: number;
  appleEaten: boolean;
}

export class ArchipelagoCheckTracker {
  constructor(
    private readonly checkedLocationIds: Set<number>,
    private readonly sendLocationChecks: (ids: number[]) => void,
    private readonly sendGoalComplete: () => void,
  ) {}

  evaluate(snapshot: ArchipelagoCheckRuntimeSnapshot): number[] {
    const newlyChecked: number[] = [];

    if (snapshot.score >= 1) newlyChecked.push(AP_PHASE_1_LOCATIONS.score1.id);
    if (snapshot.score >= 10) newlyChecked.push(AP_PHASE_1_LOCATIONS.score10.id);
    if (snapshot.length >= 1) newlyChecked.push(AP_PHASE_1_LOCATIONS.length1.id);
    if (snapshot.length >= 10) newlyChecked.push(AP_PHASE_1_LOCATIONS.length10.id);
    if (snapshot.appleEaten) newlyChecked.push(AP_PHASE_1_LOCATIONS.firstAppleEaten.id);

    return this.commit(newlyChecked);
  }

  private commit(candidateIds: number[]): number[] {
    const fresh = candidateIds.filter((id) => !this.checkedLocationIds.has(id));
    for (const id of fresh) this.checkedLocationIds.add(id);
    if (fresh.length > 0) this.sendLocationChecks(fresh);
    if (fresh.includes(AP_PHASE_1_LOCATIONS.score10.id)) this.sendGoalComplete();
    return fresh;
  }
}
```

### `src/archipelago/archipelagoItemHandlers.ts`

Responsibilities:

- Accept received AP items in strict index order.
- Ignore already processed item indexes.
- Apply score bundles.
- Save last received item index after successful apply.
- Emit UI events.

Phase 1 item handling:

```ts
switch (received.itemId) {
  case AP_PHASE_1_ITEMS.scoreBundle5.id:
    game.grantScore(5);
    break;
  case AP_PHASE_1_ITEMS.scoreBundle10.id:
    game.grantScore(10);
    break;
}
```

If no safe public method exists to add score, add one:

```ts
grantScore(amount: number): void;
```

Do not mutate private score state outside `SnakeGame`.

## 5.8 Phase 1 UI behavior

The UI should be explicit enough that a player understands this is not generic online play. It is an Archipelago connection mode living under the broader Multiplayer menu.

The desired player journey is:

```text
Title Screen
  -> Multiplayer
      -> Online        [disabled / grayed out / Coming Soon]
      -> Archipelago   [enabled]
          -> Enter Archipelago details
          -> Connect
          -> Connecting...
          -> Connected! / Connection failed
          -> Start Game / Disconnect
```

### 5.8.1 Top-level title menu

Current title menu already has a `'multiplayer'` mode in `src/scenes/snakeScene.ts`. Keep that top-level entry.

Player-facing top-level menu:

```text
START
CONTINUE
SETTINGS
MULTIPLAYER
CREDITS
```

The exact existing menu labels can remain as-is. The important change is that **Multiplayer** should no longer be treated as the final screen. It should open a submenu.

### 5.8.2 Multiplayer submenu

Recommended submenu:

```text
MULTIPLAYER

Online          Coming Soon
Archipelago
Back
```

Use **Online** as the disabled option.

Reasoning:

- Inside a Multiplayer submenu, “Online” is short and clear.
- “Online Multiplayer” is also acceptable, but a little redundant inside Multiplayer.
- “Server” is less player-friendly and makes Archipelago sound like just another server setting.
- “Standard Multiplayer” is accurate but clunky.

Implementation rules:

```text
Online:
  visible
  disabled / grayed out
  cannot be selected
  optionally shows "Coming Soon"

Archipelago:
  enabled
  opens Archipelago connection screen

Back:
  returns to title menu
```

Recommended disabled-state copy:

```text
Online
Coming Soon
```

or:

```text
Online          Coming Soon
```

Avoid hiding the Online option entirely. Keeping it visible communicates that normal online multiplayer is planned separately from Archipelago.

### 5.8.3 Archipelago connection screen

Initial disconnected state:

```text
ARCHIPELAGO

Server Address
[wss://archipelago.gg:38281]

Slot Name
[Sterling]

Password
[optional]

Connect
Back

Status: Disconnected
```

Field behavior:

```text
Server Address:
  Required.
  Accept ws:// or wss://.
  Preserve typed value locally after successful edit.
  If hosted from HTTPS and server starts with ws://, show a warning.

Slot Name:
  Required.
  Preserve locally.
  Trim whitespace.
  Do not silently rename except for empty fallback if needed.

Password:
  Optional.
  Do not persist by default.
  Input may be blank.
```

Button behavior:

```text
Connect:
  Disabled if already connecting.
  Validates server address and slot name.
  Starts WebSocket/AP connection.

Back:
  Returns to Multiplayer submenu.
  If currently connected, ask for confirmation or preserve connection while returning.
```

### 5.8.4 Connecting state

While connecting:

```text
ARCHIPELAGO

Server Address
[wss://archipelago.gg:38281]

Slot Name
[Sterling]

Password
[********]

Connecting...

Status: Connecting to Archipelago...
```

Button behavior:

```text
Connect -> replaced by Connecting...
Back -> still available, but should cancel/close socket attempt if used.
```

Optional status details:

```text
Opening WebSocket...
Waiting for RoomInfo...
Sending Connect...
Waiting for slot confirmation...
```

These details can go in the event log rather than the main status line.

### 5.8.5 Connected state

On successful connection:

```text
ARCHIPELAGO

Connected!

Server: wss://archipelago.gg:38281
Slot: Sterling
Game: Snaked. Revised. Revamped.
Seed: [seed name if available]

Checked: 0 / 5
Last Item: None

Start Game
Disconnect
Back
```

Button behavior:

```text
Start Game:
  Starts or resumes the local Snake run with AP mode enabled.

Disconnect:
  Closes socket and returns to disconnected state.
  Does not delete local AP run sync data.

Back:
  Returns to Multiplayer submenu.
  Connection may remain active if implementation supports it,
  but Phase 1 may also disconnect for simplicity.
```

Phase 1 should prefer clarity over cleverness. If preserving the connection across menus is annoying, disconnecting on Back is acceptable as long as the UI says what happened.

### 5.8.6 Connection failure state

On failure:

```text
ARCHIPELAGO

Connection failed.

Reason:
Slot not found.

Try Again
Back
```

Failure messages should be specific when possible:

```text
Server unavailable.
Connection timed out.
Slot not found.
Invalid password.
Room is not ready.
This slot is not for Snaked. Revised. Revamped.
Browser blocked insecure ws:// from an HTTPS page.
Archipelago server closed the connection.
Unsupported Archipelago packet received.
```

Do not dump raw JSON to the player by default. Log raw packets to console only when useful for debugging.

### 5.8.7 HTTPS / ws:// warning

If the game is hosted from HTTPS and the player enters `ws://`, show a visible warning before connecting:

```text
This page is running over HTTPS.
Your browser may block insecure ws:// Archipelago connections.
Use wss:// or run the game locally.
```

This should not prevent local development, but it should save confusion on GitHub Pages.

### 5.8.8 In-game AP status display

Phase 1 should have a small in-game AP status surface. It can be a compact overlay, pause menu panel, or log button.

Minimal overlay:

```text
AP: Connected
Checks: 0 / 5
Last: None
```

Expanded overlay/pause panel:

```text
ARCHIPELAGO

Status: Connected
Server: wss://archipelago.gg:38281
Slot: Sterling
Checks: 3 / 5
Last Received: Score Bundle +5 from Jade

Recent Events:
[12:41] Connected to Archipelago.
[12:42] Checked: Reach Length 1.
[12:42] Checked: Eat Your First Apple.
[12:43] Received Score Bundle +5 from Jade.
```

Display rules:

```text
The compact overlay should be unobtrusive.
The event log should retain recent AP events.
Phase 1 can keep the last 25 events.
Phase 2 can keep the last 50-100 events.
```

### 5.8.9 Message surfaces

There should be three AP message surfaces:

```text
1. Toast popup:
   Short, immediate, visible during play.

2. Event log:
   Persistent recent history of AP events.

3. Connection status line:
   Current state only.
```

Use each surface differently.

#### Toast popup

Use for:

```text
- local check completed
- received item
- trap queued/spawned
- connection success
- connection failure
```

Toast examples:

```text
Checked: Reach Score 1
Received: Score Bundle +5
+5 Score
Connected to Archipelago!
Connection failed: Slot not found.
```

#### Event log

Use for:

```text
- all toast events
- sent item messages from PrintJSON
- received item details
- reconnect/sync events
- warning messages
```

Event log examples:

```text
[12:41] Connected to Archipelago as Sterling.
[12:42] Checked: Reach Length 1.
[12:42] Checked: Eat Your First Apple.
[12:43] Sent Score Bundle +10 to Alex.
[12:43] Received Score Bundle +5 from Jade.
[12:43] Applied: +5 Score.
[12:44] Resynced 3 checked locations.
```

#### Connection status line

Use for:

```text
Disconnected
Connecting...
Connected
Connection refused
Connection lost
Reconnecting...
```

Keep this short.

### 5.8.10 Message categories

The player needs to understand four different event categories.

#### Category 1: Local check completed

This means Snake reported a location to Archipelago.

Toast:

```text
Checked: Reach Score 10
```

Event log:

```text
Checked location: Reach Score 10.
```

Do not say “Received” here. The player has not necessarily received anything. They completed a check.

#### Category 2: Sent item to another player

This usually comes from `PrintJSON`, not from direct local game logic.

Toast policy:

```text
Phase 1:
  Do not toast every sent item unless it is easy and readable.
  Put sent messages in the event log.

Phase 2:
  Toast important sent items if not too noisy.
```

Event log:

```text
Sent Score Bundle +10 to Alex.
Sent Hookshot to Jade.
Your Eat Your First Apple sent Energy Tank to Matt.
```

If the AP message includes the source location, prefer:

```text
Eat Your First Apple -> Sent Score Bundle +10 to Alex.
```

If not, use the simpler message.

#### Category 3: Received item

This comes from `ReceivedItems`.

Toast:

```text
Received: Score Bundle +5
+5 Score
```

Event log:

```text
Received Score Bundle +5 from Jade.
Applied: +5 Score.
```

If sender/location is unknown:

```text
Received Score Bundle +5.
Applied: +5 Score.
```

If the item is recognized but cannot be applied:

```text
Received Score Bundle +5, but it could not be applied.
```

That should be treated as an error and logged to console.

#### Category 4: Trap received

Phase 2 only.

Toast:

```text
Received: Jason Statham Trap
Jason Statham has entered the multiworld.
```

If unsafe:

```text
Received: Freak Dennis Trap
Trap queued until the room is safe.
```

When later spawned:

```text
Freak Dennis has been shipped to you by Alex.
```

Event log:

```text
Received Jason Statham Trap from Jade.
Queued Jason Statham Trap because a menu/cutscene/shop was active.
Spawned Jason Statham Trap in room 3,-1.
```

### 5.8.11 Phase 1 exact message copy

Use this copy for Phase 1 unless there is a strong reason to change it.

#### Connection messages

```text
Connecting to Archipelago...
Connected to Archipelago!
Connection failed: [reason]
Disconnected from Archipelago.
Connection lost. Reconnecting...
Reconnected to Archipelago.
```

#### Check messages

```text
Checked: Reach Score 1
Checked: Reach Score 10
Checked: Reach Length 1
Checked: Reach Length 10
Checked: Eat Your First Apple
```

#### Received item messages

```text
Received: Score Bundle +5
+5 Score

Received: Score Bundle +10
+10 Score
```

#### Sync messages

```text
Resynced checked locations.
Processed queued received items.
Ignored already-processed item.
```

The “ignored” message should usually be debug-level/event-log-only, not a toast.

### 5.8.12 Phase 2 exact message copy

#### Cards

```text
Checked: Moss Two
Received: Moss Two
Added card: Moss Two
```

If local card reward is suppressed in AP mode:

```text
Checked: Moss Two
Archipelago will decide the reward.
```

Do not overuse the second line after the player understands AP mode. It can be shown only in tutorial/help text.

#### Artifacts

```text
Checked: Surveyor Compass
Received: Surveyor Compass
Recovered artifact: Surveyor Compass
```

#### Quests

```text
Checked: Complete Find My Baby
Checked: Complete Goblin Ledger Debt
```

#### Apple types

```text
Checked: First Standard Apple
Checked: First Wasabi Apple
Checked: First Caffeinated Apple
```

#### Core items

```text
Checked: First Market Revolver
Received: Market Revolver
Added item: Market Revolver
```

#### Traps

```text
Received: Freak Dennis Trap
Freak Dennis has been shipped to you by Alex.

Received: Freaker Dennis Trap
Freaker Dennis heard your slot name.

Received: Jason Statham Trap
Jason Statham has entered the multiworld.
```

### 5.8.13 AP tutorial/help text

The Archipelago screen should include a small help/about panel or hint.

Suggested copy:

```text
Archipelago mode connects Snake to a multiworld randomizer.

In this mode, Snake accomplishments become location checks.
The reward you would normally get may be sent to another player.
Items from other players arrive here and become your real rewards.

Local pickups become checks.
Received Archipelago items become rewards.
```

Shorter version for cramped UI:

```text
In Archipelago mode, local rewards become checks.
Items from the multiworld become your real rewards.
```

### 5.8.14 UI state machine

Recommended high-level UI states:

```ts
type MultiplayerMenuState =
  | { mode: 'submenu' }
  | { mode: 'archipelago-form'; status: ArchipelagoConnectionStatus }
  | { mode: 'archipelago-connected' }
  | { mode: 'archipelago-failed'; reason: string };
```

Connection status:

```ts
type ArchipelagoConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'refused'
  | 'error'
  | 'lost'
  | 'reconnecting';
```

### 5.8.15 Phase 1 UI acceptance criteria

Phase 1 UI is complete when:

```text
[ ] Title screen has Multiplayer.
[ ] Multiplayer opens a submenu.
[ ] Multiplayer submenu shows Online as disabled/grayed out.
[ ] Multiplayer submenu shows Archipelago as enabled.
[ ] Archipelago opens AP details form.
[ ] AP details form has Server Address.
[ ] AP details form has Slot Name.
[ ] AP details form has optional Password.
[ ] Connect button shows Connecting... state.
[ ] Success shows Connected!
[ ] Failure shows useful reason.
[ ] Connected screen shows slot/server/check count/last item.
[ ] Start Game begins AP-enabled Snake run.
[ ] Disconnect closes socket and updates UI.
[ ] In-game UI shows AP connected/disconnected state.
[ ] Local checks produce readable messages.
[ ] Received score bundles produce readable messages.
[ ] Event log records recent AP events.
```

## 5.9 Phase 1 tests

The repository already has Vitest and TypeScript scripts:

```text
npm run test
npm run typecheck
npm run build
```

Reference:

- <https://github.com/Sterfry42/snake-for-the-modern-gamer/blob/main/package.json>

Add tests:

```text
src/archipelago/__tests__/archipelagoCheckManifest.test.ts
src/archipelago/__tests__/archipelagoCheckTracker.test.ts
src/archipelago/__tests__/archipelagoItemHandlers.test.ts
src/archipelago/__tests__/archipelagoStorage.test.ts
```

Required Phase 1 test cases:

1. Manifest has no duplicate location IDs.
2. Manifest has no duplicate item IDs.
3. Manifest names are non-empty.
4. Score 1 fires exactly once.
5. Score 10 fires exactly once.
6. Length 1 fires exactly once, even if true immediately.
7. Length 10 fires exactly once.
8. First apple eaten fires exactly once.
9. Score Bundle +5 adds 5 score.
10. Score Bundle +10 adds 10 score.
11. Already-processed received item index is ignored.
12. Reconnect resends checked locations but does not reapply received items.
13. Goal completion fires when `score_10` is first checked.
14. Build and typecheck pass.

## 5.10 Phase 1 acceptance criteria

Phase 1 is complete when:

- A local Archipelago server can generate a game with the Snake APWorld.
- The browser connects using server URL + slot name + optional password.
- The browser receives `Connected`.
- The browser sends checks for score 1, score 10, length 1, length 10, and first apple.
- The AP server accepts those location checks.
- The browser receives Score Bundle +5 and Score Bundle +10 items.
- Score bundles visibly affect score.
- Reconnecting does not duplicate score bundles.
- The AP menu/log shows connection state and item/check events.
- `npm run test`, `npm run typecheck`, and `npm run build` pass.

---

# 6. Phase 2 full private playable expansion

Phase 2 is the “this is actually fun” version.

Phase 2 keeps the Phase 1 foundation and expands the check/item pool. It should still be private-playable first, not official-submission-perfect.

## 6.1 Phase 2 design goals

Phase 2 should make Snake feel like an actual Archipelago game:

- Player accomplishments become checks.
- Local rewards are suppressed or converted into checks where AP controls the reward.
- Received AP items grant the real Snake reward.
- Collection systems matter.
- Traps are funny, dangerous, and fair.
- The APWorld remains finite even though Snake’s world is procedurally large.

## 6.2 Phase 2 non-goals

Phase 2 still does **not** include:

- biome entry checks,
- every fish,
- every generic material,
- every consumable,
- every food item,
- every randomly generated room,
- official Archipelago submission polish,
- perfect logic for every possible procgen edge case,
- DeathLink unless added as a later optional experiment.

Biome entry checks are intentionally excluded. They are less satisfying than collection/accomplishment checks and can accidentally become “walk into coordinate zone” filler.

## 6.3 Phase 2 check categories

### Score checks

```text
score_100       - Reach Score 100
score_250       - Reach Score 250
score_1000      - Reach Score 1,000
score_10000     - Reach Score 10,000
```

Phase 1 score checks remain:

```text
score_1
score_10
```

### Length checks

```text
length_100      - Reach Length 100
length_250      - Reach Length 250
```

Phase 1 length checks remain:

```text
length_1
length_10
```

### Apple checks

Phase 2 should use first-eat checks per apple type.

```text
apple_normal
apple_shielded
apple_gold
apple_pearl
apple_skittish
apple_mochi
apple_wasabi
apple_yuzu
apple_koi
apple_amacha
apple_caffeinated
```

Trigger:

```text
StepResult.apple.eaten === true
and StepResult.apple.typeId === target apple type
```

### Quest completion checks

Current large town quest IDs are the right starting set:

```text
quest_tax_collector_future_body
quest_green_purchase
quest_find_my_baby
quest_goblin_ledger_debt
quest_freak_you
quest_starforged_heliopause
```

Trigger:

```text
for each quest in StepResult.questsCompleted:
  check quest id
```

### Core item acquisition checks

Use first acquisition only. Do not include generic repeatable materials in the first Phase 2 pool.

Recommended first set:

```text
item_weapon_revolver
item_weapon_market_revolver
item_weapon_jade_katana

item_boots_quick
item_boots_heavy
item_boots_swim_fins
item_boots_lead_flippers
item_boots_geta

item_helm_seer
item_helm_sunshade
item_helm_hazard_halo
item_helm_cave_echo

item_ring_seismic
item_ring_ledger
item_ring_back_alley_dividend

item_gloves_mason

item_cloak_veil
item_cloak_frostguard
item_cloak_firebreak
item_cloak_furoshiki

item_belt_regenerator
item_belt_smuggler_cache

item_amulet_phoenix
item_amulet_baby_bottle
item_amulet_time_splinter
item_amulet_scavenger

item_fishing_rod
item_fishing_rod_carpenter
item_fishing_rod_master

item_ofuda
item_orange_juice
item_life_tonic
item_healing_potion

item_oni_charm
item_kitsune_charm
item_samurai_token
item_jizo_stone
item_raiju_bottle
item_kappa_bowl
item_katana_blueprint
```

Skip for now:

```text
raw-meat
cooked-meat
fish-meat
cooked-fish
hide
feather
egg
honey
rope
lead
beer
wine
Snake Burger
Snake Fries
Snake Nuggets
every fish
Minecraft items
generic food/material filler
```

### Card checks

All current cards:

```text
card_moss_two
card_moss_five
card_moss_eight
card_teeth_three
card_teeth_seven
card_lantern_three
card_market_ace
card_moon_jack
card_smoke_smog
card_careful_five
card_accountant_one
card_too_much_sauce
card_angel_audit
card_royal_scale
card_freak_dennis_fog
card_goblin_receipt
```

Trigger:

```text
First acquisition of each CardId.
```

Cards should also exist as AP items so cards can be received from other players.

### Card table win checks

```text
card_table_porch_table
card_table_market_table
card_table_dennis_dare
```

Trigger:

```text
First win at each named card table.
```

### Artifact checks

All current artifacts:

```text
artifact_moleman_lunchbox
artifact_surveyor_compass
artifact_lucky_trowel
artifact_ancient_snake_scale
artifact_burrowing_boots
artifact_cracked_shrine_fragment
artifact_rusted_prospectors_charm
artifact_cartographers_pencil
artifact_preserved_orchard_seed
artifact_pocket_fossil
artifact_molemans_lucky_pebble
```

Trigger:

```text
First recovery of each ArtifactDefinition id.
```

Artifacts should also exist as AP items so artifacts can be received from other players.

### Archaeology milestone checks

Recommended:

```text
archaeology_depth_10
archaeology_depth_25
archaeology_depth_50
archaeology_chain_5
archaeology_chain_10
archaeology_first_cache
```

Trigger:

```text
Moleman Archaeology reaches milestone depth / chain / first artifact cache.
```

### Boss checks

Keep boss checks optional until defeat events are cleanly surfaced for all bosses.

Initial safe boss check:

```text
boss_jason_statham
```

Later:

```text
boss_freak_dennis
boss_freaker_dennis
boss_dread_revenant
boss_fallen_angel
boss_freak_you
```

## 6.4 Phase 2 items

Phase 2 item pool should include:

### Real equipment/items

These correspond to actual Snake inventory items.

Examples:

```text
Market Revolver
Jade Katana
Quick Boots
Swim Fins
Lead Flippers
Seer's Helm
Hazard Halo
Phoenix Amulet
Baby Bottle Amulet
Time Splinter Amulet
Fishing Rod
Carpenter's Rod
Master Rod
Ofuda
Orange Juice
Life Tonic
Healing Potion
Oni Charm
Kitsune Charm
Samurai Token
Jizo Stone
Raiju Bottle
Kappa Bowl
Katana Blueprint
```

### Cards

Every card should be both:

1. a check when first acquired locally, and
2. an item that can be received from AP.

### Artifacts

Every artifact should be both:

1. a check when recovered locally, and
2. an item that can be received from AP.

### Score bundles

Keep these as filler/useful items:

```text
Score Bundle +5
Score Bundle +10
Score Bundle +25
Score Bundle +100
Score Bundle +500
```

### Length bundles

Add:

```text
Length Bundle +1
Length Bundle +3
Length Bundle +10
```

### Safety/utility bundles

Optional filler/useful:

```text
Healing Bundle
Apple Bundle
Food Bundle
Ofuda Bundle
```

### Traps

This is where the game becomes funny.

```text
Freak Dennis Trap
Freaker Dennis Trap
Jason Statham Trap
```

Trap classification:

```py
ItemClassification.trap
```

Trap behavior:

```text
Freak Dennis Trap:
  Spawn Freak Dennis.

Freaker Dennis Trap:
  Spawn Freaker Dennis.

Jason Statham Trap:
  Spawn Jason Statham.
```

Do not spawn traps while the player is in a menu, shop, dating scene, death cutscene, safe-only sequence, or otherwise non-combat state. Queue the trap and spawn it on the next combat-valid room/tick.

## 6.5 Phase 2 AP mode reward suppression

This is the most important gameplay rule.

In non-AP mode:

```text
Player opens chest -> gets item.
Player finds card -> gets card.
Player recovers artifact -> gets artifact.
```

In AP mode:

```text
Player opens chest -> location check.
Player finds card -> location check.
Player recovers artifact -> location check.
Actual reward comes only from AP ReceivedItems.
```

This does not necessarily mean every local pickup disappears visually. It means AP-controlled categories should not grant the normal reward directly.

Recommended rule:

```text
If an item/card/artifact is in the AP check manifest:
  suppress local grant
  send AP location check
else:
  grant normally
```

This allows generic food/materials to remain normal game rewards if they are not in the AP system.

## 6.6 Phase 2 item handlers

Add handlers by item type.

```ts
handleReceivedItem(item) {
  switch (item.kind) {
    case 'score-bundle':
      game.grantScore(item.amount);
      break;

    case 'length-bundle':
      game.growSnake(item.amount);
      break;

    case 'inventory-item':
      game.grantInventoryItem(item.itemId);
      break;

    case 'card':
      game.grantCard(item.cardId);
      break;

    case 'artifact':
      game.grantArtifact(item.artifactId);
      break;

    case 'trap':
      trapQueue.enqueue(item.trapId);
      break;
  }
}
```

Add public `SnakeGame` methods as needed. Do not mutate private internals from AP modules.

Suggested methods:

```ts
grantScore(amount: number): void;
grantSnakeLength(amount: number): void;
grantInventoryItem(itemId: string, count?: number): void;
grantCard(cardId: CardId): void;
grantArtifact(artifactId: string): void;
spawnArchipelagoTrap(trapId: ArchipelagoTrapId): void;
isArchipelagoTrapSafeNow(): boolean;
```

## 6.7 Phase 2 trap safety

Trap queue logic:

```ts
if (game.isArchipelagoTrapSafeNow()) {
  game.spawnArchipelagoTrap(trapId);
} else {
  trapQueue.enqueue(trapId);
}
```

A trap is safe to spawn when:

```text
- player is alive,
- game is not paused,
- no title/menu/shop/dialogue/cutscene is active,
- current room has valid boss spawn coordinates,
- current room is not a protected story/safe room,
- there is not already an overwhelming active trap unless stacking is allowed.
```

Popup examples:

```text
Freak Dennis has been shipped to you by Alex.
Freaker Dennis heard your slot name.
Jason Statham has entered the multiworld.
```

## 6.8 Phase 2 options

Add APWorld options in `apworld/snaked_revised_revamped/options.py`.

Recommended options:

```text
cardsanity:
  off / checks_only / checks_and_items
  default: checks_and_items

artifactsanity:
  off / checks_only / checks_and_items
  default: checks_and_items

trap_frequency:
  none / low / normal / high / why
  default: normal

goal:
  score_1000 / score_10000 / length_250 / artifact_hunt / dennis_survival
  default: score_1000

include_card_table_checks:
  true / false
  default: true

include_archaeology_checks:
  true / false
  default: true
```

Official options docs:

- <https://github.com/ArchipelagoMW/Archipelago/blob/main/docs/options%20api.md>

## 6.9 Phase 2 APWorld generation

Phase 2 should generate the item pool based on enabled options.

Basic structure:

```py
def create_regions(self) -> None:
    menu = Region("Menu", self.player, self.multiworld)
    run = Region("Snake Run", self.player, self.multiworld)
    self.multiworld.regions += [menu, run]
    menu.connect(run)

    run.add_locations(enabled_location_table, SnakedLocation)

def create_items(self) -> None:
    pool = []

    pool += progression_items
    pool += useful_items
    pool += card_items_if_enabled
    pool += artifact_items_if_enabled
    pool += trap_items_based_on_trap_frequency

    while len(pool) < len(enabled_location_table):
        pool.append(self.get_filler_item_name())

    for name in pool:
        self.multiworld.itempool.append(self.create_item(name))
```

Phase 2 should keep logic simple at first. Most checks can be logically reachable from the start because Snake’s world is procedural and the private-playable goal is fun, not perfect AP sphere logic.

Later, logic can be tightened:

```text
Card table checks require Card Game License.
Artifact checks require Archaeology Permit.
Fishing checks require Fishing License.
Harder combat checks require weapons/armor.
Swimming/ocean checks require Swim Fins.
```

But do not overbuild logic before the browser client is stable.

## 6.10 Shared manifest generation

Phase 2 should not manually duplicate item/location definitions in TypeScript and Python.

Recommended source of truth:

```text
src/archipelago/archipelagoCheckManifest.ts
```

Generated outputs:

```text
apworld/snaked_revised_revamped/data/phase2_manifest.json
src/archipelago/generated/archipelagoManifest.generated.ts
```

Or, if Python should own the manifest:

```text
apworld/snaked_revised_revamped/data/phase2_manifest.json
```

and TypeScript imports/copies generated JSON.

Either way, the rule is:

```text
No hand-maintained duplicate ID tables after Phase 1.
```

Add tests that ensure the TypeScript and Python/generated manifests agree.

## 6.11 Phase 2 tests

Add tests for:

```text
- Phase 2 manifest has no duplicate location IDs.
- Phase 2 manifest has no duplicate item IDs.
- Phase 2 manifest has no duplicate names.
- Phase 1 IDs are unchanged.
- Card IDs in AP manifest match current CardId list.
- Artifact IDs in AP manifest match ARTIFACT_DEFINITIONS.
- First apple type checks fire once per type.
- Quest checks fire once per quest.
- Card acquisition checks fire once per card.
- Artifact recovery checks fire once per artifact.
- AP mode suppresses local AP-controlled rewards.
- Received AP item grants the real reward.
- Trap received while unsafe is queued.
- Trap received while safe spawns expected boss.
- Reconnect does not duplicate received traps.
- Reconnect resends checked locations.
- `npm run test` passes.
- `npm run typecheck` passes.
- `npm run build` passes.
```

## 6.12 Phase 2 acceptance criteria

Phase 2 is complete when:

- Cards are checks.
- Cards can be received as AP items.
- Artifacts are checks.
- Artifacts can be received as AP items.
- Quest completion checks work.
- Score/length milestone checks work.
- Apple type checks work.
- Core item acquisition checks work.
- AP-controlled local rewards are suppressed.
- Received items grant real rewards.
- Freak Dennis Trap works.
- Freaker Dennis Trap works.
- Jason Statham Trap works.
- Trap safety queue prevents menu/cutscene/shop/death nonsense.
- The AP event log makes sense.
- The APWorld can be generated locally.
- The browser client can reconnect cleanly.
- No duplicate item application after reconnect.
- No duplicate location check side effects.
- Phase 1 IDs remain stable.
- Build/test/typecheck pass.

---

# 7. UI message rules

The player should understand three different things:

1. **I checked a Snake location.**
2. **The server sent something to someone.**
3. **I received something from someone.**

## 7.1 Local check popup

```text
Checked: Reach Score 10
```

## 7.2 Sent item message

From `PrintJSON`:

```text
Sent Score Bundle +10 to Alex
```

or:

```text
Your Eat Your First Apple sent Hookshot to Jade.
```

Exact wording depends on the AP data available.

## 7.3 Received item popup

From `ReceivedItems`:

```text
Received Score Bundle +5 from Alex
+5 Score
```

Trap example:

```text
Received Jason Statham Trap from Jade
Jason Statham has entered the multiworld.
```

---

# 8. Security and hosting notes

The browser game should support both `ws://` and `wss://` while running locally.

However, when hosted on HTTPS, such as GitHub Pages, the browser generally cannot connect from an HTTPS page to an insecure `ws://` server due mixed-content restrictions. Use `wss://` for hosted play or run the game locally while connecting to a local AP server.

Client-side validation:

```text
If window.location.protocol === "https:" and serverUrl starts with "ws://":
  show warning:
  "This page is HTTPS. Browser security may block insecure ws:// Archipelago connections. Use wss:// or run locally."
```

Do not store the server password by default.

---

# 9. Development order

## 9.1 Phase 1 recommended PR order

### PR 1: Design + manifest only

Files:

```text
docs/ARCHIPELAGO_REQUIREMENTS_DESIGN.md
src/archipelago/archipelagoCheckManifest.ts
src/archipelago/__tests__/archipelagoCheckManifest.test.ts
```

Acceptance:

```text
npm run test
npm run typecheck
```

### PR 2: APWorld Phase 1 package

Files:

```text
apworld/snaked_revised_revamped/*
```

Acceptance:

```text
AP can see/load the world package locally.
AP can generate a tiny seed with 5 locations and 5 items.
```

### PR 3: Browser AP connection UI

Files:

```text
src/archipelago/archipelagoClient.ts
src/archipelago/archipelagoStorage.ts
src/scenes/snakeScene.ts
```

Acceptance:

```text
Title screen has Multiplayer.
Multiplayer submenu has disabled Online.
Multiplayer submenu has enabled Archipelago.
Archipelago opens the AP details form.
Can connect.
Can disconnect.
Shows Connecting...
Shows Connected on success.
Shows useful failure messages.
```

### PR 4: Check tracker

Files:

```text
src/archipelago/archipelagoCheckTracker.ts
src/game/snakeGame.ts
src/scenes/snakeScene.ts
```

Acceptance:

```text
score_1
score_10
length_1
length_10
first_apple_eaten
```

all send correctly and once.

### PR 5: Received score bundles

Files:

```text
src/archipelago/archipelagoItemHandlers.ts
src/game/snakeGame.ts
src/scenes/snakeScene.ts
```

Acceptance:

```text
Score Bundle +5 applies once.
Score Bundle +10 applies once.
Reconnect does not duplicate.
```

## 9.2 Phase 2 recommended PR order

### PR 6: Shared manifest generation

Add generated manifest pipeline before adding many checks.

### PR 7: Cards

Cards as checks and items.

### PR 8: Artifacts

Artifacts as checks and items.

### PR 9: Quests and apples

Quest completions and first apple type checks.

### PR 10: Core item reward suppression

Local AP-controlled pickups become checks; received AP items become real rewards.

### PR 11: Traps

Freak Dennis, Freaker Dennis, Jason Statham.

### PR 12: Polish

Better UI log, reconnection, AP options, docs, build packaging.

---

# 10. Critical implementation rules

1. **Do not duplicate received items after reconnect.**  
   Save and respect last received item index.

2. **Do not grant AP-controlled local pickups directly.**  
   In AP mode, they become checks.

3. **Do not lose checks made while disconnected.**  
   Save local checked location IDs and resend them when connected.

4. **Do not spawn traps in menus/cutscenes/shops/death states.**  
   Queue them.

5. **Do not include biome entry checks.**  
   Phase 2 should use collection/accomplishment checks instead.

6. **Do not hand-maintain duplicate manifests long-term.**  
   Phase 1 can be tiny and duplicated; Phase 2 needs generated/shared manifests.

7. **Do not store password by default.**  
   Server and slot name are okay to remember.

8. **Do not mutate `SnakeGame` private internals from AP modules.**  
   Add public methods.

9. **Do not classify traps as filler.**  
   Use `ItemClassification.trap`.

10. **Do not overbuild official submission polish before private play works.**  
   First make it fun and stable.

---

# 11. Final Phase 1 checklist

```text
[ ] Add docs/ARCHIPELAGO_REQUIREMENTS_DESIGN.md
[ ] Add src/archipelago/archipelagoCheckManifest.ts
[ ] Add Phase 1 manifest tests
[ ] Add apworld/snaked_revised_revamped/ Python package
[ ] Add AP menu fields
[ ] Connect to AP server via WebSocket
[ ] Send Connect packet
[ ] Handle Connected
[ ] Handle ConnectionRefused
[ ] Handle ReceivedItems
[ ] Handle PrintJSON
[ ] Save checked locations
[ ] Save last received item index
[ ] Send score_1
[ ] Send score_10
[ ] Send length_1
[ ] Send length_10
[ ] Send first_apple_eaten
[ ] Add score bundle +5 handler
[ ] Add score bundle +10 handler
[ ] Add score grant method to SnakeGame
[ ] Send goal completion on score_10
[ ] Reconnect without duplicate score bundles
[ ] npm run test
[ ] npm run typecheck
[ ] npm run build
```

---

# 12. Final Phase 2 checklist

```text
[ ] Add generated/shared manifest pipeline
[ ] Add score 100 / 250 / 1000 / 10000 checks
[ ] Add length 100 / 250 checks
[ ] Add all first apple type checks
[ ] Add quest completion checks
[ ] Add core item acquisition checks
[ ] Add card checks
[ ] Add card items
[ ] Add artifact checks
[ ] Add artifact items
[ ] Add card table win checks
[ ] Add archaeology milestone checks
[ ] Add AP-controlled local reward suppression
[ ] Add received inventory item handlers
[ ] Add received card handlers
[ ] Add received artifact handlers
[ ] Add received length bundle handlers
[ ] Add trap items to APWorld
[ ] Add Freak Dennis Trap
[ ] Add Freaker Dennis Trap
[ ] Add Jason Statham Trap
[ ] Add trap safety queue
[ ] Add Phase 2 APWorld options
[ ] Add item/location groups
[ ] Add event log polish
[ ] Add reconnect polish
[ ] Add packaging script for .apworld
[ ] npm run test
[ ] npm run typecheck
[ ] npm run build
```

---

## 13. Working title

Recommended player-facing integration name:

```text
Archipelago
```

Recommended AP game name:

```text
Snaked. Revised. Revamped.
```

This is clearer than “Server” and funnier/more specific than generic “Multiplayer.”
