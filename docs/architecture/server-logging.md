# Server logs and diagnosing interruptions

`npm run server` now writes a persistent structured log by default:

```text
.snake-server-logs/server.jsonl
```

The startup console prints the absolute path. Restart an already running server to load this change. `SNAKE_LOG_DIRECTORY` selects a different directory. The current file rotates at 10 MiB into `server.1.jsonl`, `server.2.jsonl`, and `server.3.jsonl` (newest archive first), retaining approximately 40 MiB. Files append across restarts; UTC timestamps and a unique `runId` distinguish processes. The default directory is ignored by Git.

Follow the log in PowerShell (restart this command after rotation if the viewer remains attached to the archived file):

```powershell
Get-Content .snake-server-logs/server.jsonl -Tail 50 -Wait
```

Show recent warnings/errors with their fields:

```powershell
Get-Content .snake-server-logs/server.jsonl -Tail 1000 |
  ConvertFrom-Json |
  Where-Object { $_.level -ne 'info' } |
  Format-List timestamp, runId, event, fields
```

Keep the current file and the three archives after reproducing a problem. A server-side log alone cannot prove the cause of every network loss; it records what each side observed rather than labeling every abnormal close a server bug.

## What is recorded

- Startup, listening address/protocol version, shutdown signals, fatal exceptions, Node warnings, and stopped simulation errors with stacks.
- `server.starting.hostAuthenticationConfigured` reports whether a usable host key (at least 16 characters) was configured; the key is never logged. Saved-character identity never grants host privileges.
- `checkpoint.autosaved` / `checkpoint.autosave-failed` report the server's single 30-second checkpoint timer. Remote browsers do not autosave; explicit manual checkpoint commands still require host privilege. Capture runs in authority order, disk writes run outside the simulation queue, and overlapping autosave cycles are skipped while the prior write is pending.
- Socket opening, time waiting for serialized attachment, welcome readiness, stable player/connection/room IDs, suspension, resume and final detachment.
- Close codes and explicit server causes: `heartbeat-timeout`, `socket-error`, `outbound-backpressure`, `resume-hello-timeout`, `invalid-resume-hello`, `invalid-command`, `attach-failed`, `superseded`, or `server-shutdown`. A loss with no observed server cause is marked `abnormal-transport-close` or `peer-close`. Arbitrary peer-provided close text is not logged; its byte count is retained.
- Ping/pong RTT, age of the last received message/pong, outbound buffered bytes and connection lifetime.
- Failed/rejected commands and slow result sends, correlated with command type and request ID. Normal direction commands are not individually logged. Slow/rejected notices are limited to one per second per connection.
- Browser `command-timeout` and `connection-lost` reports, including the prior connection ID, last-snapshot age and pending-command count. These are labeled `source: client`, are best effort, and may arrive only after reconnect. Client reporting is advertised by the server, bounded to a small fixed schema, and rate limited to five reports per ten seconds per socket. It never enters the gameplay queue or grants any authority.
- Movement catch-up decisions with explicit rejection/stop reasons and requested/replayed step counts. A `revision-mismatch` means authority corrected a stale prediction base; it does not itself disconnect a player.
- One `performance.sample` every ten seconds: room and Actor counts, active/suspended players, state publication rate, payload bytes, snapshot build/serialization maxima, Actor/update time, publication delay/skipped ticks, authority queue depth/active operation/age, CPU usage, process memory, event-loop utilization and delay. Up to 16 active connections include RTT, buffer and command timing summaries; `connectionsTruncated` identifies a partial sample. Connection command counters/maxima are cumulative for that connection; authority/CPU/event-loop samples cover the reporting interval.

`maximumAckMs` and `command.slow-ack` measure receipt through the server's attempt to send a command result. They are not proof the browser received it. Socket sends, replies, and reconnect reports should be correlated by connection and request ID.

Performance samples include up to 32 player movement records: `movementRevision`, `movementIntervalMs`, `movementAccumulatorMs`, `head`, `held` and the concrete `holdReason` (for example `playerInteraction:dialogue`, `interaction`, `manual-area` or `suspended`). `playersTruncated` indicates more players. A stationary revision alongside a hold reason distinguishes a held player from a stalled simulation. Expected failed shots return `shot-unavailable` and count toward rejection totals but do not emit warning records; other command warnings always have a reason or message.

## Fixed-population memory soak

Run an isolated two-client world with roughly 40 cached rooms and 40 offscreen Actors, then hold exploration steady for 30 minutes:

```powershell
node --expose-gc --import tsx scripts/soak-server-performance.ts 30
```

The runner warms up loaded-room materialization, then records forced post-GC heap/RSS, room count, Actor count and `fixedPopulation` every ten seconds in a separate ignored `.snake-server-logs/soak-*/server.jsonl`. It never opens real player saves. Use `60` for an hour; Ctrl+C shuts down cleanly. Interpret a rising post-GC floor only across samples with a stable population. A short smoke run verifies the harness, not long-term leak freedom. This synthetic workload complements a real explored-town session; it cannot prove the absence of every content-specific leak.

## Reading the evidence

| Observation                                                              | Where to look next                                                                                                                      |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| High event-loop delay and update/Actor durations                         | Simulation or synchronous work blocked Node; correlate room/Actor counts and the slow operation label.                                  |
| High queue wait, `activeOperation: command:saveGame`, low CPU/loop delay | An asynchronous save or another ordered operation is holding the authority queue. The operation age remains visible before it finishes. |
| High publication duration with modest build/serialization time           | Check queue wait, skipped network ticks and pending result counts; publication includes time waiting behind authority work.             |
| `outbound-backpressure` with megabytes buffered                          | The socket/client cannot consume outgoing state quickly enough.                                                                         |
| `heartbeat-timeout`                                                      | No pong arrived in time. Compare event-loop stalls, last-message age and RTT before attributing it to the network.                      |
| `client.command-timeout`                                                 | The browser waited ten seconds. Compare the request ID's server result timing, queue work and socket events.                            |
| `simulation.stopped` or `process.fatal`                                  | Inspect the recorded error/stack; normal Node crash behavior is preserved.                                                              |

## Cost and failure behavior

The file writer batches asynchronous appends and caps its queued data at 1 MiB. If overwhelmed, it drops diagnostic records and writes a `logger.dropped` count instead of blocking gameplay or growing without bound. Individual records, strings, arrays and recursion depth are bounded; oversized records are replaced with a truncation marker. Fatal-process reporting uses one synchronous append so the final error can survive immediate exit. It does not install an exception handler that swallows crashes.

Credentials are omitted at call sites and redacted defensively in nested fields, URLs and error stacks. Logs contain no full command bodies, world snapshots, player display names, resume tokens, host tokens or inventories. File failures disable the file sink and print an explicit console error; gameplay continues. Hard process termination, machine power loss, a failed disk, or a client that never reconnects can still leave gaps.

`SNAKE_PERF_TELEMETRY=1` additionally prints periodic authority performance reports to the console; the persistent log already records its own periodic samples. Embedders/tests opt in by passing `onDiagnostic` to `createGameServer`; constructing a server alone does not create log files. `AuthoritativeGameSession.onDiagnostic` supplies operational queue/lifecycle/replay events separately from gameplay events. Reuse these boundaries instead of logging full state or adding per-tick console output.

## Character recovery

The default checkpoint now includes world rooms and all retained characters with versioned hashed resume ownership. Startup restores them together before listening. Autosave still attempts every 30 seconds and logs completion/failure; only a successful write establishes crash recovery. Keep `SNAKE_SAVE_DIRECTORY` stable across restarts. Raw resume credentials remain in each browser's endpoint-scoped local storage, separate from host keys. Neither ownership digests nor private character records are published in network checkpoint views. See [player experience](multiplayer-player-experience.md) for creation/death recovery and the manual-load compatibility policy.
