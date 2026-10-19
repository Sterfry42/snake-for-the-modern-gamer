import type { StepResult } from '../game/snakeGame.js';
import type { Vector2Like } from '../core/math.js';

/** Transient gameplay facts consumed by the shared Snake presentation, never durable UI state. */
export const GAMEPLAY_FEEDBACK_KEYS = [
  'equipment.itemPhoenixConsumed',
  'loot.itemPicked',
  'predation.apexTriggered',
  'predation.frenzyTriggered',
  'predation.rendConsumed',
  'ui.ambushReady',
  'ui.animalHunted',
  'ui.animalStartled',
  'ui.astralNova',
  'ui.biomeReveal',
  'ui.bloodBank',
  'ui.bombExplosion',
  'ui.bossSmite',
  'ui.caveTransition',
  'ui.collapseControl',
  'ui.digestiveApplied',
  'ui.endlessRoadExtended',
  'ui.enemyEaten',
  'ui.enemySnakeDefeated',
  'ui.enemySnakeNear',
  'ui.expeditionBoard',
  'ui.fastProgress',
  'ui.faultLine',
  'ui.fellowshipRecharge',
  'ui.firstBlood',
  'ui.footballCatch',
  'ui.footballFumble',
  'ui.footballPass',
  'ui.hardenedScales',
  'ui.highlightReel',
  'ui.iftar',
  'ui.karmaShift',
  'ui.libertyLandmarkReveal',
  'ui.masonryBlockCreated',
  'ui.modernRun',
  'ui.modernSynergy',
  'ui.momentumImpact',
  'ui.overcast',
  'ui.playerHit',
  'ui.playerShot',
  'ui.powerupPickup',
  'ui.questInteraction',
  'ui.relationshipEvent',
  'ui.relationshipReward',
  'ui.rootedColossus',
  'ui.secondWind',
  'ui.seismicPulse',
  'ui.spellweaver',
  'ui.swimSplash',
  'ui.townHostility',
  'ui.townReveal',
  'ui.treasurePickup',
  'ui.turnSkid',
  'ui.villageReveal',
  'ui.wallChomp',
  'ui.wallGraze',
  'ui.wandererReveal',
] as const;
export type GameplayFeedbackKey = (typeof GAMEPLAY_FEEDBACK_KEYS)[number];
export interface GameplayFeedback {
  key: GameplayFeedbackKey;
  value: unknown;
}
const feedbackKeys: ReadonlySet<string> = new Set(GAMEPLAY_FEEDBACK_KEYS);
export function isGameplayFeedbackKey(key: string): key is GameplayFeedbackKey {
  return feedbackKeys.has(key);
}
export interface ActionOutcome {
  apple: StepResult['apple'];
  roomChanged: boolean;
  roomsChanged: string[];
  questOfferId?: string;
  questsCompleted: Array<{ id: string; label: string }>;
  scoreBefore: number;
  lengthBefore: number;
  scoreAfter: number;
  lengthAfter: number;
  head: Vector2Like | null;
  roomId: string;
}
export interface GameplayOutcome {
  sequence: number;
  playerId: string;
  action?: ActionOutcome;
  delta?: Pick<
    ActionOutcome,
    'scoreBefore' | 'scoreAfter' | 'lengthBefore' | 'lengthAfter' | 'head'
  >;
  feedback: GameplayFeedback[];
}
export function describeActionOutcome(
  result: StepResult,
  values: Omit<
    ActionOutcome,
    'apple' | 'roomChanged' | 'roomsChanged' | 'questOfferId' | 'questsCompleted'
  >,
): ActionOutcome {
  return {
    ...values,
    apple: result.apple,
    roomChanged: result.roomChanged,
    roomsChanged: [...result.roomsChanged],
    questOfferId: result.questOffer?.id,
    questsCompleted: result.questsCompleted.map(({ id, label }) => ({ id, label })),
  };
}
