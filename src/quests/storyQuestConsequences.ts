import type { FactionId } from '../factions/factions.js';

/**
 * Authored story consequences, kept separate from the transition engine.
 * The world authority applies these through its existing gameplay services.
 */
export interface StoryQuestConsequence {
  message: string;
  score?: number;
  karma?: number;
  bindActor?: boolean;
  releaseCaptives?: boolean;
  wizardReported?: boolean;
  wallWards?: number;
  factionChanges?: readonly { id: FactionId; amount: number }[];
}

const EFFECTS: Record<string, StoryQuestConsequence> = {
  'crystal-clause:accept': {
    message: 'The wizard hands you two enchanted crystals. They are not for collecting rocks.',
  },
  'crystal-clause:decline': {
    message: 'You refuse the contract. No one is captured and no payment changes hands.',
  },
  'crystal-clause:imprison': {
    message: '{actor} vanishes into a crystal. {count}/2 goblins captured.',
    bindActor: true,
    karma: -8,
    factionChanges: [{ id: 'goblin-camps', amount: -5 }],
  },
  'crystal-clause:report': {
    message: 'The guard records your testimony. The captives are freed; you receive 45 score.',
    releaseCaptives: true,
    wizardReported: true,
    score: 45,
    karma: 18,
    factionChanges: [
      { id: 'goblin-camps', amount: 16 },
      { id: 'hearthbound-remnant', amount: 8 },
    ],
  },
  'crystal-clause:free': {
    message: 'You shatter the crystals. The goblins are free; the wizard receives nothing.',
    releaseCaptives: true,
    karma: 16,
    factionChanges: [{ id: 'goblin-camps', amount: 20 }],
  },
  'crystal-clause:deliver': {
    message: 'The wizard takes both crystals and pays 350 score. The goblin camps remember.',
    score: 350,
    karma: -35,
    factionChanges: [{ id: 'goblin-camps', amount: -25 }],
  },
  'crystal-aftermath:confess': {
    message: 'You confess the crystal scheme. The guard takes a statement.',
    karma: 22,
    factionChanges: [{ id: 'hearthbound-remnant', amount: 8 }],
  },
  'crystal-aftermath:silence': {
    message: 'The wizard pays 110 score to keep your silence.',
    score: 110,
    karma: -16,
  },
  'crystal-aftermath:reparation': {
    message: 'The goblins thank you with one Wall Ward contract.',
    wallWards: 1,
    factionChanges: [{ id: 'goblin-camps', amount: 12 }],
  },
};

export function storyQuestConsequence(
  questId: string,
  actionKey: string,
): StoryQuestConsequence | undefined {
  return EFFECTS[`${questId}:${actionKey}`];
}
