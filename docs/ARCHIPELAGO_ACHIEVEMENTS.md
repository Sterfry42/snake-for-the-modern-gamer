# Archipelago Achievements

AP-enabled achievements are canonical Archipelago locations. Their stable key is `achievement_<achievement id with punctuation replaced by underscores>`, and their numeric IDs start at `912001000`.

The AP world sends these slot-data fields:

- `achievementGoalPercentage`, default 60
- `enabledAchievementLocationKeys`
- `achievementMetadata`
- `deathLink`, where 0 is off and 1 is soft

The percentage goal uses `ceil(enabled achievements * percentage / 100)`. Reaching it checks `achievement_goal`, which contains Victory, and reports client goal completion. Completed checks that were earned while disconnected are submitted after reconnect.

Received AP rewards remain score/length bundles, inventory items, cards, artifacts, traps, and Victory. Achievements are locations, never received items.

Soft DeathLink sends only on local game over. Incoming DeathLink consumes an extra life when available, otherwise it ends the run. Incoming deaths are never echoed.

When changing the AP achievement catalog (or any game catalog the manifest mirrors), edit the browser side only: `src/achievements/achievementDefinitions.ts` (or `cardGame.ts`, `artifacts.ts`, `itemRegistry.ts`, quest definitions) and `src/archipelago/archipelagoCheckManifest.ts` for AP-specific design. `apworld/snaked_revised_revamped/locations.py` and `items.py` are **generated files** produced by `src/archipelago/apWorldCodegen.ts` from the manifest — do not hand-edit them.

- `npm run test` runs `src/archipelago/__tests__/generateApWorld.test.ts`, which fails when the committed Python tables are out of sync with the manifest (and round-trips the emitted tables back against the manifest data), plus existence tests that fail when the manifest references item/quest/apple ids that no longer exist in the game.
- `npm run build:apworld` regenerates the Python tables and rebuilds the canonical `apworld/snaked_revised_revamped.apworld` package.
- `npm run validate:ap` is an independent second opinion: it re-derives the expected achievement order and item contract from the game sources with separate parsers and cross-checks the committed Python tables.
