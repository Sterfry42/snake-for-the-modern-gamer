import type { Actor } from './actorTypes.js';

export type ActorIndicatorKind =
  | 'quest'
  | 'romance'
  | 'spouse'
  | 'hostile'
  | 'suspicious'
  | 'wounded'
  | 'faction'
  | 'locked';

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
  if (actor.role === 'romanceCandidate' || actor.flags.romanceCandidate) {
    const relationshipStage = actor.flags.relationshipStage ?? actor.flags.stage;
    indicators.push({
      kind: relationshipStage === 'married' ? 'spouse' : 'romance',
      glyph: relationshipStage === 'married' ? 'R' : '<3',
      priority: relationshipStage === 'married' ? 78 : 62,
      label: relationshipStage === 'married' ? 'Spouse' : 'Romance',
    });
  }

  return indicators.sort((a, b) => b.priority - a.priority).slice(0, max);
}
