import type { Actor } from './actorTypes.js';

export type ActorIndicatorKind =
  | 'quest'
  | 'rumor'
  | 'romance'
  | 'spouse'
  | 'shop'
  | 'card'
  | 'hostile'
  | 'suspicious'
  | 'wounded'
  | 'witness'
  | 'faction'
  | 'debt'
  | 'locked'
  | 'secret'
  | 'talk';

export interface ActorIndicator {
  kind: ActorIndicatorKind;
  glyph: string;
  priority: number;
  label: string;
}

export function getActorIndicators(actor: Actor, max = 2): ActorIndicator[] {
  const indicators: ActorIndicator[] = [];

  if (actor.hostility === 'hostile' || actor.hostility === 'surrendering') {
    indicators.push({ kind: 'hostile', glyph: '!', priority: 100, label: 'Hostile' });
  }
  if (actor.hostility === 'suspicious' || actor.hostility === 'afraid') {
    indicators.push({ kind: 'suspicious', glyph: '?', priority: 90, label: 'Suspicious' });
  }
  if (actor.health?.state === 'wounded' || actor.health?.state === 'downed') {
    indicators.push({ kind: 'wounded', glyph: '+', priority: 85, label: 'Wounded' });
  }
  if (actor.role === 'questGiver') {
    indicators.push({ kind: 'quest', glyph: '!', priority: 80, label: 'Quest' });
  }
  if (actor.flags.activeFactionEventId || actor.flags.raidDefender || actor.flags.raidShelter) {
    indicators.push({ kind: 'faction', glyph: '^', priority: 76, label: 'Faction event' });
  }
  if (actor.role === 'shopkeeper' || actor.role === 'bartender' || actor.role === 'blackMarketMerchant') {
    indicators.push({ kind: 'shop', glyph: '$', priority: 70, label: 'Shop' });
  }
  if (actor.role === 'romanceCandidate' || actor.flags.romanceCandidate) {
    const relationshipStage = actor.flags.relationshipStage ?? actor.flags.stage;
    indicators.push({
      kind: relationshipStage === 'married' ? 'spouse' : 'romance',
      glyph: relationshipStage === 'married' ? 'R' : '<3',
      priority: relationshipStage === 'married' ? 78 : 62,
      label: relationshipStage === 'married' ? 'Spouse' : 'Romance',
    });
  }
  if (actor.memory.length > 0) {
    indicators.push({ kind: 'witness', glyph: 'o', priority: 55, label: 'Remembers something' });
  }
  if (actor.memory.some((memory) => memory.source === 'rumor' || memory.source === 'heard')) {
    indicators.push({ kind: 'rumor', glyph: '~', priority: 58, label: 'Has heard a rumor' });
  }
  if (actor.relationships.some((link) => link.relationship === 'creditor' || link.relationship === 'debtor')) {
    indicators.push({ kind: 'debt', glyph: '%', priority: 50, label: 'Debt tie' });
  }
  if (
    (actor.soul && Object.values(actor.soul.revealed).some(Boolean)) ||
    actor.lore?.revealedLoreIds.length
  ) {
    indicators.push({ kind: 'secret', glyph: '*', priority: 45, label: 'Personal reveal' });
  }
  if (indicators.length === 0 && actor.kind !== 'animal' && actor.kind !== 'enemy') {
    indicators.push({ kind: 'talk', glyph: '.', priority: 10, label: 'Talk' });
  }

  return indicators.sort((a, b) => b.priority - a.priority).slice(0, max);
}
