import type { AchievementDefinition, AchievementDifficulty } from './achievementTypes.js';

const SCORE_REWARD_BY_DIFFICULTY: Record<AchievementDifficulty, number> = {
  tutorial: 20,
  easy: 30,
  medium: 50,
  hard: 75,
  legendary: 100,
  secret: 100,
};

export function getAchievementScoreReward(difficulty: AchievementDifficulty): number {
  return SCORE_REWARD_BY_DIFFICULTY[difficulty];
}

export function getAchievementReward(definition: AchievementDefinition): number {
  return definition.scoreReward ?? getAchievementScoreReward(definition.difficulty);
}
