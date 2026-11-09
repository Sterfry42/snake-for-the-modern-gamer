import { Quest, type QuestRuntime } from '../quest.js';

/** Follow-up quest unlocked by the Crystal Clause outcome. */
class CrystalAftermathQuest extends Quest {
  constructor() {
    super(
      'crystal-aftermath',
      'After the Crystals',
      'Your choices about the crystal prisoners are not forgotten.',
    );
  }

  override isCompleted(runtime: QuestRuntime): boolean {
    void runtime;
    return false;
  }
}

export default new CrystalAftermathQuest();
