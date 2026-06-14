# Achievements

Local achievements belong to the current run and reset when a new run begins. The active run is cached in `snake.achievements.v1` so it can survive a reload or save/load cycle. In Archipelago mode, checked achievement locations are server-backed and are restored from the connected slot.

## Player UI

Open the pause menu, choose **System**, then **Progress**. The tree is embedded in the normal pause-menu content and detail panels. It supports pointer/touch drag panning and cursor-centered mouse-wheel zoom. **ROOT** recenters the camera. Nodes are green when complete, gold when available, and gray when their visual prerequisites are incomplete. Prerequisites never gate completion.

Every achievement has a generated pixel-art portrait used by the node, details panel, and unlock toast. The details panel separates status, section, category, progress, and score reward. Rewards range from 20 to 100 score based on the internal difficulty classification. Unlocks use a queued-style achievement toast above gameplay.

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
