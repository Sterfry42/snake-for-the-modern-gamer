# Multiplayer Shell and Headless Boundary

This note documents the first multiplayer shell pass. It is intentionally not
a real multiplayer implementation.

## Browser-Only Client Shell

- `src/client/multiplayerShell.ts` owns browser APIs for the placeholder
  multiplayer entry point.
- It persists the display name in `localStorage`.
- It performs a best-effort WebSocket smoke connection and logs the result to
  the console only.
- The smoke URL defaults to `wss://echo.websocket.org`.
- The smoke URL can be overridden with `?multiplayerSmokeUrl=...`,
  `?multiplayerWsUrl=...`, or local storage key
  `snake.multiplayer.websocketUrl`.

## Current Game Logic Boundary

- `SnakeScene` is still a Phaser/browser client surface.
- `SnakeGame`, session DTOs, and local-session command/snapshot types remain
  the preferred direction for shared game logic.
- No server-side gameplay fork or duplicated movement/collision/apple logic is
  introduced by this shell.
- The title menu only collects a display name, starts a non-blocking smoke
  connection, and shows `Multiplayer is Under Construction.`

## Future Headless Work

- Move deterministic simulation dependencies behind injectable interfaces.
- Keep transport concerns outside `SnakeGame`.
- Expand snapshots/events until client UI can react without reaching into
  simulation internals.
- Add Node-compatible tests around pure session/game state once browser-only
  adapters are isolated.
