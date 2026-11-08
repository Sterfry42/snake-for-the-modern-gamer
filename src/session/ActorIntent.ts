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
  'quest:crystal-clause:accept',
  'quest:crystal-clause:decline',
  'quest:crystal-clause:imprison',
  'quest:crystal-clause:report',
  'quest:crystal-clause:free',
  'quest:crystal-clause:deliver',
  'quest:crystal-aftermath:confess',
  'quest:crystal-aftermath:silence',
  'quest:crystal-aftermath:reparation',
  'quest:ink-and-ashes:investigate',
  'quest:ink-and-ashes:decline',
  'quest:ink-and-ashes:audit',
  'quest:ink-and-ashes:informant',
  'quest:ink-and-ashes:goblin-witness',
  'quest:ink-and-ashes:expose',
  'quest:ink-and-ashes:bury',
  'quest:ink-and-ashes:sell',
  'quest:ink-and-ashes:bribe',
  'quest:the-last-ration:feed',
  'quest:the-last-ration:amnesty',
  'quest:the-last-ration:reform',
  'quest:the-last-ration:profit',
  'quest:the-last-ration:license',
  'quest:paper-bridges:accept',
  'quest:paper-bridges:decline',
  'quest:paper-bridges:seal',
  'quest:paper-bridges:forge',
  'quest:paper-bridges:toll',
  'quest:paper-bridges:betray',
  'quest:paper-bridges:treaty',
  'quest:paper-bridges:counterfeit',
  'quest:paper-bridges:protection',
  'quest:tollkeepers-debt:celebrate',
  'quest:tollkeepers-debt:confess',
  'quest:tollkeepers-debt:blackmail',
  'quest:tollkeepers-debt:refund',
  'quest:tollkeepers-debt:apologize',
  'quest:the-open-table:convene',
  'quest:the-open-table:decline',
  'quest:the-open-table:guard-testimony',
  'quest:the-open-table:goblin-testimony',
  'quest:the-open-table:charter',
  'quest:the-open-table:monopoly',
  'quest:the-open-table:auction',
  'quest:the-open-table:expose-network',
  'quest:the-borrowed-bones:commission',
  'quest:the-borrowed-bones:decline',
  'quest:the-borrowed-bones:file-findings',
  'quest:the-borrowed-bones:forge-findings',
  'quest:the-borrowed-bones:steal-survey',
  'quest:the-borrowed-bones:publish',
  'quest:the-borrowed-bones:repatriate',
  'quest:the-borrowed-bones:sell',
  'quest:the-borrowed-bones:bury',
  'quest:the-museum-that-shouldnt-be:public-museum',
  'quest:the-museum-that-shouldnt-be:gallery-scam',
  'quest:the-museum-that-shouldnt-be:goblin-archive',
  'quest:the-museum-that-shouldnt-be:claim-remnant',
  'quest:the-museum-that-shouldnt-be:buy-back',
  'quest:the-museum-that-shouldnt-be:keep-secret',
  'quest:the-museum-that-shouldnt-be:admit-burial',
  'quest:the-museum-that-shouldnt-be:leave-buried',
  'quest:the-velvet-ledger:offer',
  'quest:the-velvet-ledger:decline',
  'quest:the-velvet-ledger:debtor',
  'quest:the-velvet-ledger:copy',
  'quest:the-velvet-ledger:enforce',
  'quest:the-velvet-ledger:report',
  'quest:the-velvet-ledger:erase',
  'quest:the-velvet-ledger:auction',
  'quest:clean-hands-dirty-money:take-protection',
  'quest:clean-hands-dirty-money:turn-in',
  'quest:clean-hands-dirty-money:shelter',
  'quest:clean-hands-dirty-money:retaliate',
  'quest:clean-hands-dirty-money:audit',
  'quest:clean-hands-dirty-money:restore-racket',
  'quest:clean-hands-dirty-money:publish-list',
  'quest:clean-hands-dirty-money:collect-premium',
  'quest:the-soup-offensive:taste',
  'quest:the-soup-offensive:decline',
  'quest:the-soup-offensive:butcher',
  'quest:the-soup-offensive:alchemist',
  'quest:the-soup-offensive:reconcile',
  'quest:the-soup-offensive:sell-recipe',
  'quest:the-soup-offensive:taint',
  'quest:the-soup-offensive:blame-butcher',
  'quest:second-helpings:soup-kitchen',
  'quest:second-helpings:catering-rights',
  'quest:second-helpings:buy-recipe',
  'quest:second-helpings:franchise',
  'quest:second-helpings:antidote',
  'quest:second-helpings:deny-poison',
  'quest:second-helpings:exonerate',
  'quest:second-helpings:double-down',
  'quest:the-peoples-potluck:assemble',
  'quest:the-peoples-potluck:decline',
  'quest:the-peoples-potluck:history-voice',
  'quest:the-peoples-potluck:merchants-voice',
  'quest:the-peoples-potluck:guild-voice',
  'quest:the-peoples-potluck:commons',
  'quest:the-peoples-potluck:private-club',
  'quest:the-peoples-potluck:grand-exposure',
  'quest:the-peoples-potluck:goblin-table',
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
