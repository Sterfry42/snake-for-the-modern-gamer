# Headless Integration Testing

This repository uses several test layers. They answer different questions and must not be treated as interchangeable.

## Unit Tests

Unit tests prove a small function or module behaves correctly in isolation. They may call helpers directly and are appropriate for deterministic calculations, selectors, parsers, footprint calculations, stock generation, serializers, and other narrow logic.

A passing unit test does not prove a player feature works. It proves the isolated code path behaves under the tested inputs.

## Headless Integration Tests

Headless integration tests prove a complete gameplay behavior through the same public and game-facing APIs that ordinary gameplay uses. When a feature crosses system boundaries, the test should cross those boundaries too.

Headless integration tests should begin from a realistic game or world state and perform player/world actions rather than manually forcing the expected final state. Shared scenario helpers are encouraged, but they must not secretly perform the feature being tested.

Examples:

- A shop test interacts with the shop through the Actor/shop interaction path.
- A door test approaches or uses the same door-transition path used by player movement.
- An NPC schedule test advances real world time and observes Actor goals/presence instead of assigning the expected goal.
- A mapper test interacts with the mapper and inspects the offers exposed to the player instead of calling `buildMapperStock()` as the acceptance action.
- A sleeping marker test inspects the scene-facing presentation contract consumed by rendering instead of only testing `getActorSleepMarker()`.
- A combat test creates a real hostile situation and observes Actor attack decisions/events/damage through the live combat path.
- A save/load test serializes and reloads a real scenario containing the affected state.

Implemented does not mean helper exists. Integrated means the production gameplay path reaches the implementation.

## Presentation / Render Contract Tests

Presentation tests may remain headless when actual pixels are unnecessary. They must verify that gameplay state reaches the scene-facing presentation model or event contract, and that the renderer receives enough information to display the intended state.

Do not claim to test visual appearance if the test only verifies a domain helper. Pixel appearance, animation feel, readability, and timing remain manual or browser-level concerns unless a deterministic render assertion exists.

## Manual / Playtest Coverage

Manual testing is for visual feel, timing, readability, animation quality, emergent behavior, and exploratory discovery. It is valuable, but it must not substitute for deterministic acceptance coverage.

## Regression Tests

Any real bug discovered in gameplay should produce a regression test that reproduces the actual failure path before or alongside the fix. Prefer test names that describe the user-visible behavior rather than the internal bug.

## Repository Rules

1. Implemented does not mean helper exists.
2. Integrated means the production gameplay path reaches the implementation.
3. Story and user-facing requirements require headless integration tests unless explicitly documented otherwise.
4. Tests should fail if production composition accidentally stops invoking an otherwise-correct subsystem.
5. Important procedural systems should be tested over multiple deterministic seeds, not just one golden fixture.
6. Generated-world invariants should normally be tested across a seed matrix.
7. A test must not manually construct impossible states that ordinary gameplay cannot reach unless the purpose is specifically a lower-level unit test.
8. Avoid asserting implementation details where player-observable state is available.
9. Every production bug fixed should have a regression test capable of detecting its return.
10. Headless tests should use shared scenario helpers for setup, but those helpers must not secretly perform the feature being tested.
