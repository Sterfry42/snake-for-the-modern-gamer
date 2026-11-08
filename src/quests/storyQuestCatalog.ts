import {
  CRYSTAL_CLAUSE,
  CRYSTAL_AFTERMATH,
  type StoryQuestDefinition,
} from './storyQuestEngine.js';
import { EXPANDED_STORY_QUESTS } from './storyQuestChapters.js';

/** One discoverable catalog; no feature-specific switch tables in NPC menus. */
export const STORY_QUESTS: readonly StoryQuestDefinition[] = [
  CRYSTAL_CLAUSE,
  CRYSTAL_AFTERMATH,
  ...EXPANDED_STORY_QUESTS,
];

export function getStoryQuestDefinition(id: string): StoryQuestDefinition | undefined {
  return STORY_QUESTS.find((quest) => quest.id === id);
}
