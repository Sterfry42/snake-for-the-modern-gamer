import { Quest, type QuestRuntime } from '../quest.js';
import {
  getRuntimeRoomId,
  getRuntimeWorldSeed,
  resolveCultTempleTarget,
  resolveLetterDeliveryTarget,
  type SeededQuestTarget,
} from '../seededQuestTargets.js';

const TEMPLE_TARGET_FLAG = 'quest.seeded.temple.target';
const TEMPLE_FOUND_FLAG = 'quest.seeded.temple.found';
const LETTER_TARGET_FLAG = 'quest.seeded.letter.target';
const LETTER_DELIVERED_FLAG = 'quest.seeded.letter.delivered';

class BuriedTempleQuest extends Quest {
  constructor() {
    super(
      'buried-temple-artifact',
      'The Temple Below Twenty',
      'Descend to depth -20 and reach the temple room selected by this run seed.',
    );
  }

  override onAccept(runtime: QuestRuntime): void {
    super.onAccept(runtime);
    const target = resolveCultTempleTarget(getRuntimeWorldSeed(runtime), this.id);
    runtime.setFlag(TEMPLE_TARGET_FLAG, target);
    runtime.setFlag('quest.seeded.activeTargetRoomId', target.roomId);
    runtime.setFlag('quest.seeded.activeTargetDescription', target.description);
  }

  isCompleted(runtime: QuestRuntime): boolean {
    const target = getOrCreateTempleTarget(runtime);
    return Boolean(runtime.getFlag<boolean>(TEMPLE_FOUND_FLAG)) || getRuntimeRoomId(runtime) === target.roomId;
  }

  override onReward(runtime: QuestRuntime): void {
    const target = getOrCreateTempleTarget(runtime);
    runtime.setFlag(TEMPLE_FOUND_FLAG, true);
    runtime.setFlag('quest.seeded.temple.artifactName', target.artifactName ?? 'temple artifact');
    runtime.addScore(75);
  }
}

class LetterDeliveryQuest extends Quest {
  constructor() {
    super(
      'letter-for-the-unspawned',
      'Letter for the Unspawned',
      'Deliver a letter to a named stranger roughly 30 zones away. The recipient is selected by this run seed.',
    );
  }

  override onAccept(runtime: QuestRuntime): void {
    super.onAccept(runtime);
    const originRoomId = getRuntimeRoomId(runtime);
    const target = resolveLetterDeliveryTarget(getRuntimeWorldSeed(runtime), originRoomId, this.id);
    runtime.setFlag(LETTER_TARGET_FLAG, target);
    runtime.setFlag('quest.seeded.activeTargetRoomId', target.roomId);
    runtime.setFlag('quest.seeded.activeTargetDescription', target.description);
  }

  isCompleted(runtime: QuestRuntime): boolean {
    const target = getOrCreateLetterTarget(runtime);
    return Boolean(runtime.getFlag<boolean>(LETTER_DELIVERED_FLAG)) || getRuntimeRoomId(runtime) === target.roomId;
  }

  override onReward(runtime: QuestRuntime): void {
    const target = getOrCreateLetterTarget(runtime);
    runtime.setFlag(LETTER_DELIVERED_FLAG, true);
    runtime.setFlag('quest.seeded.letter.recipientName', target.npcName ?? target.displayName);
    runtime.addScore(35);
  }
}

function getOrCreateTempleTarget(runtime: QuestRuntime): SeededQuestTarget {
  const existing = runtime.getFlag<SeededQuestTarget>(TEMPLE_TARGET_FLAG);
  if (existing) {
    return existing;
  }
  const target = resolveCultTempleTarget(getRuntimeWorldSeed(runtime), 'buried-temple-artifact');
  runtime.setFlag(TEMPLE_TARGET_FLAG, target);
  return target;
}

function getOrCreateLetterTarget(runtime: QuestRuntime): SeededQuestTarget {
  const existing = runtime.getFlag<SeededQuestTarget>(LETTER_TARGET_FLAG);
  if (existing) {
    return existing;
  }
  const target = resolveLetterDeliveryTarget(
    getRuntimeWorldSeed(runtime),
    getRuntimeRoomId(runtime),
    'letter-for-the-unspawned',
  );
  runtime.setFlag(LETTER_TARGET_FLAG, target);
  return target;
}

export default [new BuriedTempleQuest(), new LetterDeliveryQuest()];
