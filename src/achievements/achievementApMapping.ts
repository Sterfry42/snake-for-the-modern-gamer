import type { AchievementDefinition } from './achievementTypes.js';

export const ACHIEVEMENT_LOCATION_ID_BASE = 912001000;
const APPENDED_ACHIEVEMENT_IDS = [
  'arcade.snakeception',
  'arcade.blueScreen',
  'stats.special10',
] as const;

export function achievementLocationKey(id: string): string {
  return `achievement_${id.replace(/[^a-zA-Z0-9]+/g, '_')}`;
}

export function getApAchievementDefinitions(definitions: readonly AchievementDefinition[]) {
  const enabled = definitions.filter((definition) => definition.archipelago?.enabledByDefault);
  const appended = new Set<string>(APPENDED_ACHIEVEMENT_IDS);
  return [
    ...enabled.filter((definition) => !appended.has(definition.id)),
    ...APPENDED_ACHIEVEMENT_IDS.flatMap((id) =>
      enabled.filter((definition) => definition.id === id),
    ),
  ];
}

export function achievementLocationId(
  definitions: readonly AchievementDefinition[],
  id: string,
): number {
  const index = getApAchievementDefinitions(definitions).findIndex(
    (definition) => definition.id === id,
  );
  if (index < 0) throw new Error(`Achievement is not AP-enabled: ${id}`);
  return ACHIEVEMENT_LOCATION_ID_BASE + index;
}

export function achievementGoalTarget(enabledCount: number, percentage: number): number {
  return Math.ceil((Math.max(0, enabledCount) * Math.max(0, Math.min(100, percentage))) / 100);
}
