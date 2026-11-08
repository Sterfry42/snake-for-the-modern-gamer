import { Quest, type QuestRuntime } from '../quest.js';
import { EXPANDED_STORY_QUESTS } from '../storyQuestChapters.js';

/** The regular QuestController owns these chapters' active and completed records. */
class StoryChapterQuest extends Quest {
  override isCompleted(runtime: QuestRuntime): boolean {
    // Explicit dialogue outcomes, not a numeric flag, complete these chapters.
    void runtime;
    return false;
  }
}

export default EXPANDED_STORY_QUESTS.map(
  ({ id, label }) => new StoryChapterQuest(id, label, 'A choice-driven story with lasting consequences.'),
);
