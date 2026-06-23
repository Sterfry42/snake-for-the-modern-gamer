Let me explore the existing systems to build an informed plan.



Now I have a thorough understanding of the codebase. Here's the plan:

---

# Bullet Train to Jade Peak Province — Implementation Plan

## 1. Overview

A randomly spawning **Bullet Train Station** structure that appears in the **Jade Peak Province** biome. The player enters the station, boards the train, and is whisked away to a randomized destination room elsewhere in the province. The ride itself is a multi-room journey with juice effects, ambient sounds, and visual flair.

---

## 2. Architecture

### 2.1 New Files

| File | Purpose |
|------|---------|
| `src/world/bulletTrainService.ts` | Core logic: station/destination selection, journey state machine, multi-room transit |
| `src/world/bulletTrainTypes.ts` | Type definitions (station config, destination, journey state) |
| `src/world/bulletTrainRenderer.ts` | Phaser rendering: station graphics, train car sprites, platform decorations |
| `src/world/bulletTrainScene.ts` | Dedicated Phaser scene for the ride sequence (transition between rooms) |
| `src/world/generation/stages/bulletTrainStages.ts` | Generation pipeline hooks: station placement, destination pre-registration |
| `src/i18n/languages/en/bulletTrain.ts` | English strings |
| `src/i18n/languages/es/bulletTrain.ts` | Spanish strings |

### 2.2 Modified Files

| File | Changes |
|------|---------|
| `src/world/types.ts` | Add `bulletTrainStation` field to `RoomSnapshot` |
| `src/world/biomes.ts` | No changes needed (Jade Peak already defined) |
| `src/world/roomGenerator.ts` | Add `placeBulletTrainStation()` hook in the pipeline |
| `src/world/worldService.ts` | Add `getBulletTrainDestinations()`, `claimBulletTrainDestination()` methods |
| `src/ui/juice.ts` | Add `bulletTrainDepart()`, `bulletTrainArrive()`, `bulletTrainRide()` methods |
| `src/scenes/snakeScene.ts` | Add bullet train station interaction handler, flag management, and ride sequence |
| `src/i18n/i18nManager.ts` | Register bulletTrain translations |
| `src/i18n/types.ts` | Add `bulletTrain` to translation interfaces |

---

## 3. Data Model

### 3.1 `BulletTrainStation` (in `RoomSnapshot`)

```ts
interface BulletTrainStation {
  /** Grid position of the station entrance tile */
  entranceX: number;
  entranceY: number;
  /** The station's internal ID (seeded from roomId) */
  stationId: string;
  /** Available destinations at this station */
  destinations: BulletTrainDestination[];
  /** Whether this station has been used this run */
  used: boolean;
  /** Platform decorations: lanterns, ticket booth, bench */
  decorations: BulletTrainDecoration[];
}
```

### 3.2 `BulletTrainDestination`

```ts
interface BulletTrainDestination {
  /** Room ID of the destination room in Jade Peak Province */
  roomId: string;
  /** Grid position where the snake exits the train */
  exitX: number;
  exitY: number;
  /** Flavor text shown on arrival */
  arrivalFlavor: string;
  /** Chance weight for random selection (higher = more likely) */
  weight: number;
  /** Optional: only available if a condition is met */
  condition?: 'first-visit' | 'any';
}
```

### 3.3 `BulletTrainDecoration`

```ts
type BulletTrainDecoration =
  | { type: 'lantern'; x: number; y: number; color: number }
  | { type: 'ticket-booth'; x: number; y: number }
  | { type: 'bench'; x: number; y: number; facing: 'north' | 'south' }
  | { type: 'sign'; x: number; y: number; text: string }
  | { type: 'platform-edge'; x: number; y: number };
```

### 3.4 Journey State Machine

```ts
type BulletTrainJourneyPhase =
  | 'idle'              // Station exists, player hasn't interacted
  | 'boarding'          // Player pressed E at entrance
  | 'departing'         // Train pulls out, screen effects begin
  | 'in-transit'        // Riding the tracks (dedicated scene)
  | 'arriving'          // Approaching destination
  | 'exiting';          // Player steps off at destination

interface BulletTrainJourney {
  phase: BulletTrainJourneyPhase;
  stationRoomId: string;
  stationEntranceX: number;
  stationEntranceY: number;
  destinationRoomId: string;
  destinationExitX: number;
  destinationExitY: number;
  transitRooms: string[];      // Rooms the train "passes through"
  transitProgress: number;     // 0→1 through transit
  startedAtMs: number;
  durationMs: number;          // ~4000ms total ride
}
```

---

## 4. Generation Pipeline

### 4.1 Station Placement (`bulletTrainStages.ts`)

**When**: After `placeRoomStructures`, before `placeVegetation`.

**Logic**:
1. Only in `jade-peak-province` biomes (`context.isJadePeak`).
2. Roll against `BULLET_TRAIN_STATION_CHANCE = 0.03` (3% per room).
3. Require an `open-clearing` or `wide-corridor` archetype, or a room with ≥ 8 floor tiles in a contiguous block.
4. Place the station entrance tile (`'B'` or a new tile char) near the room edge (within 3 tiles of a wall edge).
5. Generate 2–4 destinations from the pool of rooms already discovered in the province.
6. Stamp decorations on the floor around the entrance.
7. Set `context.bulletTrainStation` on the generation context.

**Destination Pool**:
- Pre-scan nearby Jade Peak rooms (within ±4 rooms in X/Y).
- Weighted by distance: closer rooms are slightly more likely.
- Exclude the current room and rooms already served by another station.
- Each destination gets a unique arrival flavor text.

### 4.2 WorldService Integration

```ts
// In worldService.ts
getBulletTrainDestinations(stationRoomId: string): BulletTrainDestination[];
claimBulletTrainDestination(stationRoomId: string, destIndex: number): void;
markBulletTrainStationUsed(stationRoomId: string): void;
```

The `WorldService` pre-generates destination lists when the station room is first accessed and marks stations as used.

---

## 5. Rendering

### 5.1 Station Graphics (`bulletTrainRenderer.ts`)

Rendered during normal room draw in `snakeScene.ts`:

- **Platform**: Gray tiles (`#`) with a dashed yellow line marking the platform edge.
- **Track**: Two parallel lines of dark gray running perpendicular to the platform.
- **Lanterns**: Small red/orange circles hanging from invisible strings.
- **Ticket Booth**: A tiny shack graphic at one corner.
- **Entrance Marker**: A glowing tile (`B`) pulsing with a soft pink/white glow.
- **Directional Sign**: Text showing destination names (e.g., "→ 雲霧山 Cloud Mist Peak").

### 5.2 Train Car (during ride scene)

The dedicated `BulletTrainScene` renders:
- **Interior**: Wood-paneled walls, rows of seats, overhead luggage racks.
- **Window**: Scrolling landscape outside (mountains, cherry blossoms, mist).
- **Speed lines**: White streaks across the window.
- **Passenger silhouettes**: Simple snake-shaped silhouettes in seats.
- **Announcement display**: LED-style text showing next stop.

### 5.3 Transit Scene (`bulletTrainScene.ts`)

A temporary Phaser scene that:
1. **Departure** (0–800ms): Camera zooms out, train sound starts, platform blurs past.
2. **Acceleration** (800–1600ms): Speed lines intensify, camera shakes slightly.
3. **Cruise** (1600–3200ms): Scenic window view, ambient music, occasional station fly-bys.
4. **Deceleration** (3200–4000ms): Speed lines fade, announcement chime, arrival preview.
5. **Arrival** (4000ms): Fade to white, transition to destination room.

---

## 6. Juice System (`juice.ts`)

### 6.1 New Methods

```ts
bulletTrainDepart(worldX: number, worldY: number)
bulletTrainRide(progress: number, worldX: number, worldY: number)
bulletTrainArrive(worldX: number, worldY: number)
bulletTrainAnnounce(destinationName: string)
```

### 6.2 Depart Effects
- **Sound**: Train horn (low brass blast), wheel clatter starting slow then accelerating
- **Visual**: Camera shake, screen edges blur, speed lines radiate from entrance
- **Particles**: Dust clouds from platform, lanterns swing
- **Camera**: Punch zoom out, slight rotation toward track direction

### 6.3 Ride Effects (per frame during transit)
- **Sound**: Rhythmic wheel clack (increasing tempo), wind whoosh, occasional chime
- **Visual**: Scrolling window background, speed lines, passenger bobbing
- **Camera**: Gentle sway, subtle shake at high speed
- **Audio**: Japanese/Chinese-style announcement chime between stations

### 6.4 Arrival Effects
- **Sound**: Brake hiss, announcement chime, door open sound
- **Visual**: Camera stabilizes, destination room fades in through window
- **Particles**: Cherry blossom petals drifting, dust settling
- **Camera**: Slow push-in toward exit, flash on door open

---

## 7. SnakeScene Integration

### 7.1 Detection & Interaction

In the room update loop, check if the snake's head is on the station entrance tile (`B`):

```ts
// When snake head overlaps station entrance
if (tile === 'B' && !this.snakeGame.getFlag<BulletTrainJourney>('bulletTrain.journey')) {
  // Show interaction prompt
  this.showInteractionPrompt('BOARD TRAIN', () => this.startBulletTrainRide());
}
```

### 7.2 Flag Management

```ts
// Set journey flag when boarding
this.snakeGame.setFlag('bulletTrain.journey', {
  phase: 'boarding',
  stationRoomId: this.snake.currentRoomId,
  // ...
});

// Clear after arrival
this.snakeGame.setFlag('bulletTrain.journey', undefined);
```

### 7.3 Ride Sequence

```ts
private startBulletTrainRide(): void {
  const station = this.currentRoomSnapshot?.bulletTrainStation;
  if (!station) return;

  this.paused = true;
  this.snakeGame.setFlag('bulletTrain.journey', {
    phase: 'departing',
    stationRoomId: this.snake.currentRoomId,
    stationEntranceX: station.entranceX,
    stationEntranceY: station.entranceY,
    destinationRoomId: station.destinations[0].roomId,
    destinationExitX: station.destinations[0].exitX,
    destinationExitY: station.destinations[0].exitY,
    transitRooms: this.generateTransitRooms(),
    transitProgress: 0,
    startedAtMs: this.time.now,
    durationMs: 4000,
  });

  this.juice.bulletTrainDepart(
    this.tileToWorldLocalInRoom({ x: station.entranceX, y: station.entranceY }).x,
    this.tileToWorldLocalInRoom({ x: station.entranceX, y: station.entranceY }).y,
  );

  // Switch to dedicated bullet train scene
  this.scene.start('BulletTrainScene', {
    journey: this.snakeGame.getFlag<BulletTrainJourney>('bulletTrain.journey'),
    onComplete: () => this.onBulletTrainArrival(),
  });
}
```

### 7.4 Arrival Handler

```ts
private onBulletTrainArrival(): void {
  const journey = this.snakeGame.getFlag<BulletTrainJourney>('bulletTrain.journey');
  if (!journey) return;

  this.snakeGame.markBulletTrainStationUsed(journey.stationRoomId);

  // Teleport snake to destination
  this.snake.moveToRoom(journey.destinationRoomId, {
    x: journey.destinationExitX,
    y: journey.destinationExitY,
  });

  this.juice.bulletTrainArrive(
    this.tileToWorldInRoom({ x: journey.destinationExitX, y: journey.destinationExitY }, journey.destinationRoomId).x,
    this.tileToWorldInRoom({ x: journey.destinationExitX, y: journey.destinationExitY }, journey.destinationRoomId).y,
  );

  this.showQuestHintPopup(
    `Arrived at ${journey.destinationRoomId}!`,
    '#f8a0c2',
  );

  this.snakeGame.setFlag('bulletTrain.journey', undefined);
  this.paused = false;
  this.isDirty = true;
}
```

---

## 8. i18n

### 8.1 English (`bulletTrain.ts`)

```ts
export const BULLET_TRAIN_EN = {
  boardTrain: 'BOARD TRAIN',
  departureAnnouncement: 'The bullet train departs for {destination}!',
  arrivalAnnouncement: 'Next stop: {destination}!',
  arrivalFlavor: {
    cloudMistPeak: 'Mist clings to the terraced slopes. The train hums to a stop.',
    silkValley: 'Through the window: silk fields stretching to the horizon.',
    paperBridge: 'A rickety bridge sways over a gorge. The train slows.',
    lanternFestival: 'Red lanterns sway overhead. The station smells of incense.',
    peakGarden: 'A hidden garden blooms on the mountainside. Peaceful.',
  },
  stationSign: 'Jade Peak Express',
  ticketBooth: 'Ticket Booth',
  platformLantern: 'Platform Lantern',
};
```

### 8.2 Spanish (`bulletTrain.ts`)

Parallel translations for all strings.

### 8.3 I18nManager Registration

Add `bulletTrain` field to the `I18nManager` translations record and expose a `getBulletTrain(key)` method.

---

## 9. Event Logging

Add a new world event type:

```ts
// In worldEventTypes.ts
| 'bullet-train-departed'
| 'bullet-train-arrived'
```

Log when the player boards and arrives:
```ts
this.recordAchievementEvent({
  type: 'bullet-train-departed',
  roomId: journey.stationRoomId,
  summary: `Boarded the Jade Peak Express to ${destinationName}`,
});
```

---

## 10. Save/Load

The `bulletTrainStation.used` flag and `bulletTrain.journey` flag are stored via the existing flag system. No additional persistence needed — the station re-generates per session based on the world seed.

---

## 11. Testing

- **Unit tests** (`__tests__/bulletTrainService.test.ts`):
  - Destination pool generation
  - Weighted random selection
  - Station usage marking
  - Transit room generation
- **Integration tests**:
  - Station placement in Jade Peak rooms
  - No overlap with other structures
  - Entrance tile is walkable
  - Destination rooms exist and are valid

---

## 12. Implementation Order

1. **Types & Services** — `bulletTrainTypes.ts`, `bulletTrainService.ts`
2. **Generation** — `bulletTrainStages.ts`, modify `roomGenerator.ts`, `worldService.ts`, `types.ts`
3. **Rendering** — `bulletTrainRenderer.ts` (station graphics in snakeScene)
4. **Juice** — `juice.ts` additions
5. **Ride Scene** — `bulletTrainScene.ts` (dedicated Phaser scene)
6. **SnakeScene Integration** — interaction handler, flags, transition logic
7. **i18n** — EN/ES strings, `i18nManager.ts` registration
8. **Events** — world event logging
9. **Tests** — unit + integration
10. **Polish** — flavor text variety, destination pool expansion, balance tuning

---

## 13. Juice Summary (the fun part)

| Phase | Sound | Visual | Camera | Particles |
|-------|-------|--------|--------|-----------|
| **Approach** | Distant rumble grows louder | Entrance tile pulses brighter | — | Subtle dust motes |
| **Board** | Door slide, interior ambience | Screen fades to train interior | Cut to interior view | — |
| **Depart** | Horn blast, wheels clack | Platform rushes past window | Punch zoom out + shake | Dust cloud, lantern swing |
| **Accelerate** | Rhythmic clatter increases | Speed lines intensify | Gentle sway | — |
| **Cruise** | Wind whoosh, occasional chime | Scenic mountain backdrop scrolls | Subtle bob | Cherry blossom petals |
| **Fly-by** | Station whistle | Brief station silhouette | — | Sparks from overhead lines |
| **Decelerate** | Clatter slows, brake hiss | Speed lines fade | Stabilize | Dust settling |
| **Arrive** | Chime, door open | Destination room visible through window | Push-in | Petals drift, steam |
| **Exit** | Footsteps on platform | Fade back to game view | Normal | — |

Total ride duration: **~4 seconds**. The snake doesn't move during the ride — it's a cinematic interlude. On arrival, the snake is placed at the exit tile and gameplay resumes immediately.

---

That's the plan. It's big, it's juicy, and it fits right into the existing generation → rendering → interaction pipeline. Let me know if you want me to start implementing any piece.
