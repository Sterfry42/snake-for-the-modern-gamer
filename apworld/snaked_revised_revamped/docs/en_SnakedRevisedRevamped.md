# Snaked. Revised. Revamped.

Snake milestone achievements become Archipelago location checks, and Archipelago items grant the
actual rewards: score and length bundles, equipment, cards, artifacts, and boss traps.

The goal is an achievement percentage: the run completes when the player has checked
`achievement_goal` (a configurable share of the enabled achievement locations). Cardsanity and
Artifactsanity control whether card and artifact checks and items are included, Trap Frequency
controls how many boss traps fill the pool, and DeathLink can bounce local game overs to the
multiworld.

The authoritative location and item tables live in `locations.py` and `items.py`. The browser
client mirrors them in `src/archipelago/archipelagoCheckManifest.ts`, and
`scripts/validate-ap-achievement-manifest.mjs` enforces that the two sides stay synchronized.
