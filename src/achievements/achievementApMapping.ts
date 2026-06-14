import type { AchievementDefinition } from './achievementTypes.js';

export const ACHIEVEMENT_LOCATION_ID_BASE = 912001000;

export function achievementLocationKey(id: string): string {
  return `achievement_${id.replace(/[^a-zA-Z0-9]+/g, '_')}`;
}

export function getApAchievementDefinitions(definitions: readonly AchievementDefinition[]) {
  return definitions.filter((definition) => definition.archipelago?.enabledByDefault);
}

export function achievementLocationId(definitions: readonly AchievementDefinition[], id: string): number {
  const index = getApAchievementDefinitions(definitions).findIndex((definition) => definition.id === id);
  if (index < 0) throw new Error(`Achievement is not AP-enabled: ${id}`);
  return ACHIEVEMENT_LOCATION_ID_BASE + index;
}

export function achievementGoalTarget(enabledCount: number, percentage: number): number {
  return Math.ceil(Math.max(0, enabledCount) * Math.max(0, Math.min(100, percentage)) / 100);
}
