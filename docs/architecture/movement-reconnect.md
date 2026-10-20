# Short movement reconnects

The authoritative session remains the only gameplay writer. `ClientMovementPredictor` owns a separate local-snake presentation projection; it never calls `SnakeGame.actionStep()` or changes `SceneReadReplica`.

## Suspension and resume

An unexpected socket close suspends its character for 3,000 ms. The existing connection presence remains visible with `suspended: true`; automatic player movement and per-player subsystem clocks stop, while world clocks and other players continue. Interaction, minigame, vehicle, progression, direction queue and movement accumulator state are retained. Reattaching an opaque resume token during that window replaces the connection without leave/join notices. Explicit Leave server uses close code 1000 and performs normal cleanup immediately. On timeout, the normal disconnect cleanup runs and announces departure. An expired token can still resume its retained character, but cannot catch up movement.

A live-socket replacement also preserves the character and subsystems. The old connection cannot execute commands, detach the replacement, or reuse its catch-up attempt.

## Timing and inputs

Player snapshots include a monotonic `movementRevision`, `movementIntervalMs`, `movementAccumulatorMs`, and the shared two-turn direction queue. The local player also receives grid dimensions and `movementPredictionAllowed`. The revision advances for each authoritative movement-clock action, including safety holds; world loads and respawns invalidate old revision bases.

The transport runs the same isolated local movement projection during connected play and reconnects. Connected presentation uses a stable server-tick anchor plus the authoritative movement interval/accumulator; publication jitter does not restart the local movement clock. Projection of delayed snapshots is capped at 250 ms. Direction commands include an optional bounded `inputSequence`; snapshots echo `acknowledgedDirectionSequence`, so only unacknowledged turns are reapplied during reconciliation. These numbers acknowledge inputs and grant no authority. `snakeDirectionQueue` is shared with `SnakeState`, preserving buffered turns and reversal rejection. Cached room geometry bounds speculation: solid tiles, water, self collisions, unknown rooms, manual areas and special traversal stop speculative advancement. One cached coordinate-room boundary can be crossed; replay then returns control to normal authority. No terrain is generated and no rewards, damage, pickups, NPCs, bullets, scores or interactions are simulated locally.

Protocol version 4 prediction clients advertise `prediction=1` and send one `movementResume` hello before welcome. A bounded replay contains the previous connection ID, base movement revision, predicted step count, elapsed duration and ordered cardinal direction inputs at step offsets. It contains no claimed position. The server binds this to the token's suspended player and validates the old connection, base revision, grace deadline, cardinal inputs, ordered offsets, input count, elapsed-time budget and 30-step cap. A base must match current authority or one of the last eight revisions the transport published for that connection within three seconds. If authority advanced after publication but before suspension, those already-applied steps are subtracted and inputs are rebased onto current authority; they are never executed twice. Future, unpublished, over-budget and invalidated world/respawn bases are rejected. Only revision numbers/timestamps are retained, not historical world state. Missing or stale catch-up falls back to normal authoritative resume. Other commands are rejected during reconnect; they are never queued. Direction inputs arriving after the hello are bounded and handed to the live connection after welcome.

Accepted catch-up runs through `stepPlayerAction` and the real gameplay path against the current world. Death, a safety hold, a changed room, a forced interaction, lost health or a movement discrepancy stops the replay. Existing wall safety grace is preserved rather than burned through in a burst. Replay events are captured before attachment and delivered after welcome, so authoritative death/revival and gameplay feedback still reach the returning player. There is no world history or rollback.

## Reconciliation and limits

Prediction lasts at most three seconds and 30 movement steps. The hello freezes its submitted projection until welcome; a failed handshake can continue the original bounded prediction window. A matching authoritative body switches seamlessly. A same-room, same-length correction of at most 1.5 tiles blends for 120 ms; larger discrepancies snap. Death, held/manual state, room changes and body-length changes always take authority immediately. All smoothing is presentation-only.

`PeerMovementPresentation` interpolates connected peers over one publication (at most 150 ms), using the existing shared interpolation math. Unknown rooms, teleports, death, suspension and changed body lengths snap; there is no peer gameplay extrapolation. `PlayerHoldSynchronizer` compares scene intent with `snapshot.ui.playerInteraction`, retrying mismatches at most every 500 ms while connected. Sending a hold never acknowledges it. Presentation frames reuse the scene's cached authoritative snapshot instead of cloning the full world for every predicted step.

Client error and handshake-timeout closes use application code 4000; only deliberate Leave/client shutdown uses 1000. Superseded clients use 4001 and protocol rejection uses 1008. A transport failure therefore takes the suspension path even when initiated by the browser's error callback.

The party indicator delays its reconnect notice by 350 ms, then shows a small reconnecting message. Exhausted or blocked prediction, or a three-second outage, shows that movement is waiting for the server. Automatic connection retries continue after prediction stops.

## Verification

`movementReconnect.test.ts` covers suspension, peer/world continuity, retained UI holds, real-socket grace expiry, timing phase, shared rapid-turn semantics, stale/foreign/expired/time-inflated replays, collisions against the current world, authoritative death, cached static geometry, replica isolation, prediction caps, and small/large reconciliation. The persistent-party browser suite breaks a real socket, enters direction input, observes continued local presentation while authority is stationary, and verifies authoritative catch-up and unchanged identity. Existing gameplay, party and transport suites remain active.

`movementReliability.test.ts` additionally checks connected cadence under publication jitter, input acknowledgement, lost-hold retries, peer interpolation, published-base rebasing, movement/hold telemetry and asynchronous autosave ownership. The two-live-player browser case drops one resume-from-menu command, verifies retry/acknowledgement, then forcibly destroys one transport while the other player continues moving and checks completed replay without detachment.

Resume identity and grace are scoped to the running server process. A network failure is handled once the WebSocket reports closure; this slice does not add a new failure detector for connections that remain silently open.
