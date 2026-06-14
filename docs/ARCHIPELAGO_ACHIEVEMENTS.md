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

When changing the AP achievement catalog, keep `src/achievements/achievementDefinitions.ts`, `src/archipelago/archipelagoCheckManifest.ts`, and `apworld/snaked_revised_revamped/locations.py` synchronized. The AP mapping tests enforce unique browser keys and IDs.
