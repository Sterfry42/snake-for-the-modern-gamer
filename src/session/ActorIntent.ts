import type { SnakeGame } from '../game/snakeGame.js';
import type {
  RelationshipCandidateProfile,
  RelationshipEventResult,
} from '../relationships/relationshipTypes.js';

export const ACTOR_INTENTS = [
  'begin',
  'close',
  'talk',
  'ask-rumor',
  'ask-personal',
  'wake',
  'apologize',
  'threaten',
  'parley',
  'shop',
  'take-quest',
  'accept-quest',
  'reject-quest',
  'pickpocket',
  'dating',
  'dating-refresh',
  'pay-fine',
  'complete-wedding',
  'tavern-rest',
  'campaign-shake-hands',
  'campaign-button',
  'campaign-smear',
  'campaign-buy-round',
  'mayor-free-beer',
] as const;
export type ActorIntent = (typeof ACTOR_INTENTS)[number];
/** Domain responses carry facts and authored content. The client selects screens, labels, and navigation. */
export interface ActorOutcome {
  revision: number;
  bark?: ReturnType<SnakeGame['getNpcBark']>;
  pages?: string[];
  shop?: NonNullable<ReturnType<SnakeGame['getActorShopView']>>;
  quest?: {
    id: string;
    label: string;
    description: string;
    pages: string[];
    large: boolean;
    state: string;
  };
  dating?: { talk: ReturnType<SnakeGame['getRelationshipTalk']>; cutscene?: string[] };
  relationship?: RelationshipEventResult;
  sequence?: ReturnType<
    import('../relationships/datingScenarioDirector.js').DatingScenarioDirector['createDatingSequenceEvent']
  >;
}
export function relationshipVoiceRole(profile: RelationshipCandidateProfile): string {
  if (/Guard\b/.test(profile.displayName)) return 'guard';
  if (/Bartender\b/.test(profile.displayName)) return 'bartender';
  if (/Guild\b/.test(profile.displayName)) return 'thiefContact';
  if (profile.species === 'goblin' || profile.species === 'goblin-angel') return 'goblin-merchant';
  return 'romance';
}
