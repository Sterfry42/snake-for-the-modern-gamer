# Hosted multiplayer responsiveness

## Thread layout

`npm run server` defaults to inline processing. Set `SNAKE_SERVER_THREADS=3` to run three application threads. The coordinator owns HTTP and WebSockets, the authority worker owns the session queue and gameplay state, and one persistent world worker handles room preparation and NPC travel paths. Set `SNAKE_SERVER_THREADS=1` for inline authority and world processing or `SNAKE_SERVER_THREADS=2` for inline authority with the world worker. The three modes use the same wire protocol and checkpoint format.

The authority handles movement, attacks, collisions, pickups, NPC occupancy, terrain installation, and checkpoint capture. Worker messages carry detached data. A room prepared ahead of travel enters the world through the normal `WorldService.getRoom()` installation path. The authority reuses it when its RNG precondition still holds or when terrain generation consumed zero RNG draws. The synchronous path covers unavailable or stale terrain. NPC path jobs use bounded walkability masks. The authority checks the room, epoch, start and goal when taking a result and still validates the chosen tile against current occupancy. A delayed path can defer an NPC step while players continue. A failed world worker falls back to the inline path.

The network coordinator sends critical presentation confirmations after commit. It reuses the encoded public movement packet when broadcasting to multiple peers. Personalized world deltas and outcome events that need fresh world selectors retain their existing ordering.

## Browser presentation

The local movement predictor can hide a stationary normal apple as the predicted head reaches it. The epoch, spawn ID and movement revision identify the bite across the prediction, immediate `apple.bite` event and full `gameplay.outcome`. On a correction or confirmation timeout the authoritative apple becomes visible again. Score, body growth, streaks and special effects follow authority. Firearms use a bounded presentation ID to match local muzzle feedback to the committed shot. Bomb and football input can show a short windup. Peers interpolate adjacent same-room steps over at most 85 ms. Changes in room, body length, epoch and discontinuous positions snap to authority.

## Measuring

`npx tsx scripts/benchmark-multiplayer-load.ts 3 6000` runs 2, 5, 10 and 20 loopback clients. Repeat with thread counts `1` and `2` for comparison. Pass `town` or `explore` as the third argument for a generated town center or an approach to a room boundary. It reports client command completion, living and moving clients, authority queue wait, per-clock costs, simulation overruns, background job counts, process resources and apple commit-to-send timing when a bite occurs. Client completion includes local no-ops, rejections and RPC acknowledgments. These short runs use headless clients and do not measure browser frame or WAN latency.

The development browser bridge reports `inputToFrameSamples`, `lastInputToFrameMs` and `maximumInputToFrameMs` for predicted turns observed in the renderer. For reproducible predicted input or apple timing, use the Chromium multiplayer smoke specs. Per-clock timing, discarded catch-up steps and background job round trip are also available in server performance samples.

A short same-host arena run with 20 loopback clients recorded these p99 values. All 20 clients moved in each configuration. Between 4 and 10 players were still alive at the end of each run, and the process figures include the load clients.

| Threads | Command completion | Coordinator event-loop delay | RSS |
| --- | ---: | ---: | ---: |
| 1 | 29.2 ms | 49.6 ms | 150 MiB |
| 2 | 48.9 ms | 56.5 ms | 202 MiB |
| 3 | 49.6 ms | 42.6 ms | 310 MiB |

The inline default follows the lower command latency in this workload. Three-thread mode remains available for installations that benefit from isolating the transport from authority stalls.
