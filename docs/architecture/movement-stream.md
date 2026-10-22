# Discrete authoritative movement stream

Protocol 5 separates player movement from world replication. The authoritative SnakeGame still decides movement, speed, collision, pickups, damage and all gameplay consequences. No client action step, rollback world, or additional gameplay authority is introduced.

## Publication and ordering

`AuthoritativeGameSession.onMovement` publishes a bounded `MovementUpdate` when a connected player's body, direction queue, input acknowledgment, speed, participation or prediction eligibility changes. The update contains epoch, ordered sequence, simulation tick, grid body, movement revision and timing. Ordinary phase accumulation does not send packets. State is built once per changed player from its authority context, without constructing a scene/world snapshot. Peers receive public movement fields; the owner additionally receives queue/input acknowledgment/grid/prediction metadata.

Movement arrives as steps occur, including multiple discrete steps in a simulation update. Steering commands publish their authoritative queue/input acknowledgment before their prompt result. Duplicate or older direction sequence numbers do not enqueue another turn. The transport records actual published revisions for reconnect validation, retaining a bounded 160 entries within the existing three-second window.

World deltas remain scheduled at 100 ms. They transmit changed UI/state, player presentation metadata, selector/flag changes, revised geometry and changed viewport entity fields. Field removal is explicit. Returning to a viewport room sends fresh dynamics; cached terrain remains revisioned and incremental. Movement fields resynchronize once per simulation second. Domain commands publish changed UI before acknowledging, without waiting for the world timer. Room transitions request required world data promptly. Gameplay events continue to follow the relevant world projection; a steering result does not flush unrelated gameplay events ahead of their state.

`SnapshotDeltaAssembler.applyMovement` merges only the player entry and rejects duplicate/outdated sequences and foreign epochs. Its retained fast state takes precedence over an older world publication. A world epoch change clears fast/room tracking; welcome establishes a new complete baseline. Observers must handle both `movement` and `delta` envelopes through the same assembler.

## Prediction and reconciliation

Local presentation uses the server's movement interval and accumulator, a stable simulation-time anchor, and the shared `snakeDirectionQueue`. There is no 100 ms movement assumption: 50, 70, 100 and 200 ms intervals are tested, and speed changes refresh on the authority's attach/simulation boundaries. The existing simulation scheduler has 20 ms action-clock granularity; render frames and network arrival also have finite scheduling precision.

Pending directions retain input sequence and predicted revision offsets. Reconciliation removes acknowledged inputs and reconstructs only relevant unacknowledged turns. Bounded predicted revision history identifies a matching authoritative prefix, preserving already displayed steps and phase instead of moving backwards on every delayed resync. Resyncs that omit movement keep the latest movement packet's timing anchor. A real mismatch corrects to a valid grid state; no position is blended. Death, holds, unknown geometry and unsupported traversal stop prediction immediately. All body coordinates remain integer grid coordinates.

Peers display the newest authoritative grid body immediately. They incur no deliberate interpolation delay and do not speculate about another player's gameplay. `PeerMovementPresentation` no longer interpolates positions. Cosmetic effects and color interpolation are separate presentation concerns.

Prediction is capped at three seconds and 30 steps without fresh authority. Socket suspension preserves the current connected projection, directions and step offsets. Reconnect still submits bounded inputs, never claimed positions, and the server replays through the real movement path against the current world, subtracting already authoritative steps. A bounded pre-disconnect lead is clipped to the server elapsed-time budget, preserving its valid replay prefix; grossly inflated claims are rejected. No replay can spend extra movement time. Telemetry reports capped prediction steps. Rejected/expired replay resumes authority normally. See [reconnect policy](movement-reconnect.md).

## Client work and connection diagnosis

`GameConnection.onMovement` updates cached player selectors and presentation without `onSnapshot`, full-state cloning or full hydration. `SceneReadReplica.hydrateMovement` hydrates only a server-provided body/score; prediction never writes into that replica. Local room selectors retain their coherent prior room until the authority supplies required geometry for a fast transition. Full world updates additionally skip unchanged Actor registries, inventory, quests, SPECIAL, construction, atmosphere and other slow selectors. Existing read guards and detached public selectors remain in force.

Visibility changes report bounded context but do not disconnect or pause authority. Page hide closes with code 4002, preserves character grace and suppresses retries while the page is suspended; page show resumes the existing credential. Server logs distinguish browser lifecycle/going-away events from socket errors, backpressure, missed heartbeats, invalid protocol and abnormal transport closure. Client close reports include the close code and clean-close flag. Diagnostic records never include raw credentials or command bodies. Presentation subscriber failures are reported as bounded `client.presentation-error` records and surfaced with their local console stack without closing a healthy transport. Actual invalid protocol/state data reports `client.protocol-error`. Existing persistent checkpoint ownership remains unchanged.

Telemetry separates movement packets/bytes/serialization time from world publication/build counters. A slow queue or save can still delay actual execution; prompt acknowledgments remove the extra network-timer wait after execution rather than claiming to eliminate server work or Internet latency.

## Before and after benchmark

Run `npx tsx scripts/benchmark-movement-network.ts`. The same runner was executed before source changes and after the cutover on the focused branch on 2026-10-21. It uses two real loopback WebSockets, a deterministic arena, 100 simulation frames of 20 ms, four modifier-driven speeds, and awaited direction commands. Results are retained in [before](../benchmarks/movement-network-before.json) and [after](../benchmarks/movement-network-after.json).

| Interval | Mean movement delivery before / after | Mean command acknowledgment before / after | Received bytes before / after |
| -------- | ------------------------------------: | -----------------------------------------: | ----------------------------: |
| 50 ms    |                       39.55 / 1.96 ms |                            75.39 / 1.16 ms |             482,951 / 354,427 |
| 70 ms    |                       53.82 / 4.04 ms |                            81.29 / 0.90 ms |             475,275 / 322,180 |
| 100 ms   |                       63.83 / 5.12 ms |                            83.47 / 0.96 ms |             389,216 / 285,495 |
| 200 ms   |                       54.06 / 8.44 ms |                            81.89 / 0.90 ms |             370,184 / 254,313 |

Bytes cover both clients after welcome over the fixed simulated workload, including state, movement, events and results. Wall duration changes because the runner awaits commands (roughly 3.7–4.5 seconds before versus 3.1 seconds after); these totals are not a fixed-duration Internet throughput comparison. Delivery measures the first observed authoritative revision, not pixel response or end-to-end WAN latency. Build totals remain in the raw reports; no universal CPU or latency guarantee is inferred from one local run.

## Validation

`movementStream.test.ts` freezes the world publication timer and verifies every step and prompt turn acknowledgment at all four speeds, with no scene-state builds or snapshot callbacks. It covers rapid buffered turns, duplicate input rejection, integer coordinates, stale/duplicate/epoch fencing, periodic resync, reconnect prefix preservation, authoritative replay, and selective replica hydration. Existing movement reliability/reconnect tests retain their protection, collision, grace, timing and replay checks with grid correction expectations.

`discreteMovement.smoke.spec.ts` uses two normal browser clients for variable speeds, rapid turns, exact positions, an authoritative relocation, browser page lifecycle diagnosis and credential-preserving resume while a peer advances. Existing browser suites continue covering transport loss, dropped holds, collision/combat presentation, cosmetics, dialogue, shops, minigames, creation and death encounters.
