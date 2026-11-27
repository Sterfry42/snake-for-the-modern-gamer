# Hosted multiplayer responsiveness

## Thread layout

`npm run server` defaults to inline processing. Set `SNAKE_SERVER_THREADS=3` to run three application threads. The coordinator owns HTTP and WebSockets, the authority worker owns the session queue and gameplay state, and one persistent world worker handles room preparation and NPC travel paths. Set `SNAKE_SERVER_THREADS=1` for inline authority and world processing or `SNAKE_SERVER_THREADS=2` for inline authority with the world worker. The three modes use the same wire protocol and checkpoint format.

The authority handles movement, attacks, collisions, pickups, NPC occupancy, terrain installation, and checkpoint capture. Worker messages carry detached data. A room prepared ahead of travel enters the world through the normal `WorldService.getRoom()` installation path. The authority reuses it when its RNG precondition still holds or when terrain generation consumed zero RNG draws. The synchronous path covers unavailable or stale terrain. NPC path jobs use bounded walkability masks. The authority checks the room, epoch, start and goal when taking a result and still validates the chosen tile against current occupancy. A delayed path can defer an NPC step while players continue. A failed world worker falls back to the inline path.

The network coordinator sends critical presentation confirmations after commit and reuses the encoded public movement packet across peers. The authority owns each connection's delta encoder. A domain command and its required projection run in one ordered authority operation. A transition and the periodic publisher reuse that projection's revision fence. The authority sends compact, pre-serialized deltas to the coordinator. The coordinator sends state-dependent events only up to the authority's event watermark, then acknowledges the command.

An unchanged projection sends no world delta. Private movement hold changes build the recipient's projection only. The first visit to a room sends its complete data, while later edits within the active room neighborhood send only changed fields. NPC changes update individual actor fields. The client reconstructs the viewport NPCs, static room fields, atmosphere, and UI inventory from their canonical records. The save browser receives a checkpoint's timestamp, score, and seed. The server keeps the checkpoint contents.

## Replication and ordering

The authority owns per-connection delta baselines. A command builds the change for its own connection in the same queue entry that commits it. The coordinator transmits that delta and the events covered by its watermark before acknowledging the command. A shared encoder baseline makes transition and periodic requests skip work already done by the command. Steering stays on the bounded movement stream. The coordinator shares serialized peer movement, and it records published movement revisions at most once per revision per connection within each second.

The welcome projects the visible static world and the attached player's private state. Incremental publications use stable room and actor identities. Actor motion changes the actor's presence fields, and an apple change patches the room's apple field. Room layout, entrances, atmosphere and other overlapping representations are reconstructed from their canonical sources. Other players see public movement and appearance. Their private flags, inventory, quests, progression and checkpoint data stay in their own selector projection. The hosted save menu reads a timestamp, score and seed summary.

Each emitted delta has an ordered per-connection sequence. Old publications are ignored. A missing predecessor closes the connection through the protocol error path so a reconnect can rebuild its baseline. The welcome starts a new baseline. Local cross-room movement waits for a matching viewport and uses the retained authoritative room cache once the publication arrives. An event's sequence identifies duplicate delivery, even when an immediate cue comes before an older state-dependent event.

The world worker receives deterministic room-generation inputs or a bounded walkability mask and responds with prepared terrain or a path proposal. Neither job receives a player projection. The authority validates and installs the result through the usual world path. Client movement and world jobs never share mutable gameplay state.

The room cache retains persistent town interiors and resident actors across visits. A return uses this player's registered entrance and local position. Occupied exits reject the attempt while preserving the player's return state. The scene sends manual direction and step in one command, and uses the snapshot's hold to initialize reconnect behavior.

## Browser presentation

The local movement predictor hides an apple and plays its type-specific bite feedback when the predicted head reaches its visible tile. A shielded approach waits for confirmation if the visible shield covers that direction or its state is unknown. The epoch, spawn ID and movement revision identify the bite across prediction, the immediate `apple.bite` event and the full gameplay.outcome. Corrections, apple movement and confirmation timeouts restore the apple. The fast confirmation carries streak and special-apple notifications. Score, growth and gameplay effects follow authority. Firearms use a bounded presentation ID to match local muzzle feedback to the committed shot. Committed shot and damage cues, sounds and screen shakes are delivered immediately. Menus, pickups, durable rewards and room transitions follow the projection they depend on. Bomb and football input can show a short windup. Peers interpolate adjacent same-room steps over at most 85 ms. Changes in room, body length, epoch and discontinuous positions snap to authority.

## Measuring

`npx tsx scripts/benchmark-multiplayer-load.ts 3 6000` runs 1, 2, 4, 8 and 16 loopback clients. Repeat with thread counts `1` and `2` for comparison. Pass `town` or `explore` as the third argument for a generated town center or an approach to a room boundary. A fourth argument overrides the comma-separated populations. Add `--combined-manual` after the populations to send one direction-and-step command in the town scenario. It reports client command completion, living and moving clients, authority queue wait, per-clock costs, simulation overruns, background job counts, process resources, snapshot build counts and payload sizes, worker request counts, and apple commit-to-send timing when a bite occurs. Profiled runs also sample worker message sizes and postMessage costs. Client completion includes local no-ops, rejections and RPC acknowledgments. These short runs use headless clients and do not measure browser frame or WAN latency.

The development browser bridge reports `inputToFrameSamples`, `lastInputToFrameMs` and `maximumInputToFrameMs` for predicted turns observed in the renderer. For reproducible predicted input or apple timing, use the Chromium multiplayer smoke specs. Per-clock timing, discarded catch-up steps and background job round trip are also available in server performance samples.

A matched 3-thread town workload on November 26, 2026 used the same deterministic seed, 4.5-second duration, and five populations. The baseline was the clean branch tip before this overhaul in a separate worktree. The updated build includes the SnekOS merge. Each figure is one run, so use these as directional measurements. The updated run shared its host with final validation, which inflated command tail latency at higher populations.

| Players | Baseline average payload | Updated average payload | Baseline wire bytes/s/player | Updated wire bytes/s/player | Baseline command P99 | Updated command P99 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 14,896 B | 4,395 B | 259,488 B | 80,677 B | 19.1 ms | 19.2 ms |
| 2 | 15,485 B | 5,078 B | 264,686 B | 87,733 B | 25.4 ms | 24.7 ms |
| 4 | 21,164 B | 7,376 B | 379,123 B | 140,860 B | 55.9 ms | 36.0 ms |
| 8 | 22,695 B | 7,648 B | 364,293 B | 151,493 B | 93.0 ms | 70.8 ms |
| 16 | 28,114 B | 10,164 B | 368,859 B | 133,381 B | 269.5 ms | 341.3 ms |

The wire rate uses snapshot payloads and movement packets only. It excludes welcome handshakes, events and transport overhead. The initial welcome still reaches about 140 to 146 KB. Sampled profiling showed authority-to-coordinator `executeNetworkCommand` replies with 6 to 9 KB P95 at eight to sixteen players and periodic no-change `networkDeltas` replies near 46 B. The hot path made no `getConnectionSnapshot` worker request in the updated run. At sixteen players the process RSS was workload-dependent and should not be treated as an isolated per-worker comparison.

A short same-host arena run with 20 loopback clients recorded these p99 values. All 20 clients moved in each configuration. Between 4 and 10 players were still alive at the end of each run, and the process figures include the load clients.

| Threads | Command completion | Coordinator event-loop delay | RSS |
| --- | ---: | ---: | ---: |
| 1 | 29.2 ms | 49.6 ms | 150 MiB |
| 2 | 48.9 ms | 56.5 ms | 202 MiB |
| 3 | 49.6 ms | 42.6 ms | 310 MiB |

The inline default follows the lower command latency in this workload. Three-thread mode remains available for installations that benefit from isolating the transport from authority stalls.
