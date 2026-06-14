# Achievements

Achievements are profile-level progression stored in `snake.achievements.v1`. They survive run resets and are evaluated from both discrete events and runtime snapshots.

## Player UI

Open the pause menu, choose **System**, then **Achievements**. The tree is embedded in the normal pause-menu content and detail panels. It supports pointer/touch drag panning and cursor-centered mouse-wheel zoom. **ROOT** recenters the camera. Nodes are green when complete, gold when available, and gray when their visual prerequisites are incomplete. Prerequisites never gate completion.

Every achievement has a generated pixel-art portrait used by the node, details panel, and unlock toast. Progress achievements display their current and target values in the node and details panel. Unlocks use a queued-style achievement toast above gameplay.

## Adding An Achievement

1. Add a typed definition to `src/achievements/achievementDefinitions.ts`.
2. Prefer an existing `AchievementEvent` or snapshot criterion.
3. Add a runtime hook only when the action cannot be inferred from a snapshot.
4. Give the node stable tree coordinates and a fallback pixel glyph.
5. Set `archipelago.enabledByDefault` only for steerable checks.
6. Add or update manager, layout, progress, and AP mapping tests.

Core logic lives in `src/achievements/`. Phaser rendering is isolated in `src/ui/achievementTreeOverlay.ts`.

## Validation

Run `npm run test`, `npm run typecheck`, and `npm run build`.
