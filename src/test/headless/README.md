# Headless User Story Harness

Use `createHeadlessScenario()` for Vitest stories that need the real game without Phaser.

The harness creates a real `SnakeGame`, wraps it in `LocalGameSession`, and advances gameplay through the same public clock entry points used by runtime code. It is for cross-system stories such as actor presence, schedules, faction conflict, save/load, room reads, and long-run integrity.

Keep scenarios story-shaped and bounded. Mock browser/platform boundaries only; do not reimplement gameplay systems in test doubles.

Typical flow:

```ts
const scenario = createHeadlessScenario({ seed: 'story-seed' });
await scenario.advanceUntil(() => scenario.actor('marta').presence?.roomId === homeId, {
  timeoutMs: 120_000,
});
scenario.assertWorldIntegrity();
```

Story tests live under `src/game/__tests__/stories`.
