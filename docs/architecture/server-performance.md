# Server performance boundaries

The authority, normal SnakeScene, collision/combat rules, private player contexts, and snapshot selectors remain the existing systems. This pass changes how often state is projected/transmitted and how much precision distant Actors receive.

## Network publication

`AuthoritativeGameSession.emitSnapshot()` marks hosted state dirty and observes cheap transition/death facts. It no longer builds presentation DTOs from each movement, boss, Actor, bullet, hazard, or outcome callback. `createGameServer()` schedules a 100 ms network tick, on the same authority queue as simulation/commands. Each connected player receives at most one state publication per network tick. There is no catch-up publication burst when the server is busy. Events and command results buffer until the state for that tick is sent, preserving snapshot-before-outcome and acknowledgement semantics (up to 100 ms added transport latency). Initial welcome state is sent immediately.

`getSceneClientState(roomIds)` projects the current room and cached neighboring rooms, at most a 3 by 3 coordinate window. It never traverses `world.snapshot()` for a network tick and does not generate missing rooms. Non-coordinate interiors start with their current room. Network player lists contain connected characters, rather than every disconnected character retained over server uptime. Offline/public compatibility paths still support full state, and persistence intentionally traverses the saved world.

The protocol version is 3. Welcome contains the initial required snapshot. Subsequent `delta` envelopes contain hot gameplay state, changed slow selectors, per-key flag changes/removals, checkpoint changes, and changed terrain objects. Authority-only Actor/event/rumor/faction save archives are not scene flags on the network; current Actors and interaction views already have explicit projections. Saved checkpoint bodies are sent only when replaced or cleared, never on every hot tick. `RoomSnapshotCache` has monotonically increasing revisions for nested room mutations, including archived references. Each world clear/replacement has a new epoch. A per-connection encoder tracks which revisions were sent; reconnect initializes a fresh encoder. Town runtime projection and quest stamping avoid semantically unchanged room assignments, so ordinary NPC ticks do not falsely invalidate town geometry.

The server serializes each delta envelope once for the socket. It does not JSON-round-trip or structured-clone the complete world before serialization. Private projections are still built separately per player, once per network tick, because inventory/progression/dialogue state is private. The encoder compares bounded selector/flag values to detect changes; it does not serialize historical terrain to detect changes.

`SnapshotDeltaAssembler` retains room data and reconstructs the complete selector shape expected by `SceneGameClient`. The connection detaches each subscriber's value once; SceneGameClient takes ownership of that detached value. Public selectors still detach reads. `SnakeGame.hydrateClientSnapshot()` merges only revised rooms into the replica cache and resets it only on a new world epoch; `getRoom`/`peekCachedRoom` read that retained cache. An unchanged tick does not call `replaceReplicaRooms(allKnownRooms)`. Browsers retain previously received terrain, including when moving away and returning.

## Actor fidelity

Hosted sessions enable fidelity in the existing SnakeGame Actor pass. Offline timing remains compatible.

- Each distinct room occupied by a live player receives full NPC/body simulation on the ordinary Actor clock. Sharing a room does not multiply the pass. If the original character disconnects, the clock executes in a remaining live player's context rather than simulating the disconnected room as the primary loaded room.
- Adjacent rooms receive precise travel at 500 ms intervals. Promoted/actively pursuing Actors receive the same reduced precision within a three-room Manhattan interest radius. A promotion does not force precise tile pathfinding across the distant world forever.
- Far Actors use logical room transitions and schedule destinations, without grid BFS or generation of travel rooms. One coarse cycle is nominally five seconds; at most 128 queued candidates are considered per Actor clock so large populations spread across frames. A large backlog deliberately lowers far fidelity instead of blocking a frame. Candidates are looked up again before processing, so changed goals, deaths, and newly occupied rooms are respected.
- Actors entering an occupied room receive a valid unoccupied arrival and are marked for normal materialization. Work and sleep arrivals retain their normal activity. Global day-phase schedule changes still resolve logically; far business recovery checks run at coarse frequency.

NPC bodies are indexed by room and Actors by room/town. Loaded-body stepping, materialization cleanup, and town lookup no longer scan every NPC body or every world room simply because more towns were explored. Canonical Actor state remains durable; coarse simulation does not create replacement NPC identities.

## Telemetry and reproduction

`server.getPerformance()` returns current gauges plus accumulated counters. `SNAKE_PERF_TELEMETRY=1 npm run server` enables one aggregate report every ten seconds (set the environment variable with the syntax appropriate to your shell). No default per-tick logs are added. Reports include cached/known/occupied materialized rooms, total/active/offscreen Actors, travel-goal Actors, connected players, state publications per second, average/maximum snapshot payload bytes, total build/serialization milliseconds, average/maximum Actor tick milliseconds, and average/maximum simulation-update milliseconds. Serialization counters cover welcome/state messages, not small event/result envelopes.

Run:

```text
npx tsx scripts/benchmark-server-performance.ts 160 1000
npx tsx scripts/benchmark-server-performance.ts 640 1000
```

The deterministic workload has one held player, historical generated rooms, 1,000 distant traveling Actors, and 100 simulation frames. The baseline is the actual previous full snapshot shape (`getSnapshot` plus unbounded `getSceneClientState`), serialized once for comparison. This is a payload comparison, not a claimed rendering or CPU speedup.

| Historical rooms | Previous full snapshot | Initial required snapshot | Steady delta | Revised rooms in steady delta |
| ---------------- | ---------------------: | ------------------------: | -----------: | ----------------------------: |
| 160              |          384,058 bytes |              22,880 bytes |  4,429 bytes |                             0 |
| 640              |        1,499,667 bytes |              22,880 bytes |  4,429 bytes |                             0 |

Numbers are representative of this seed/build and should be regenerated when content changes. The useful invariant is that hot terrain/network work stays tied to the player's current interest area, rather than exploration history. Periodic coarse schedule work and intentional saves can still scale with the persistent population/world.

`serverPerformance.test.ts` verifies publication bounds over real sockets, payload/history independence, flag deletion, room retention/revision/epoch invalidation, stable town geometry, bounded distant travel with no generated transit rooms, reduced nearby precision, and exactly one full body pass per occupied room with three players across two rooms. Existing party, combat, UI, shop, excavation, and pause suites continue to exercise the same authority through the stream.
