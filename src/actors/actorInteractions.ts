import type { Actor } from './actorTypes.js';
import { getActorIndicators, type ActorIndicator } from './actorIndicators.js';

export type ActorInteractionId =
  | 'inspect'
  | 'talk'
  | 'ask-rumor'
  | 'shop'
  | 'romance'
  | 'give-gift'
  | 'pickpocket'
  | 'attack'
  | 'eat'
  | 'spare'
  | 'leave';

export interface ActorInteractionOption {
  id: ActorInteractionId;
  label: string;
  enabled: boolean;
  reason?: string;
  priority: number;
}

export interface ActorInteractionMenuModel {
  actorId: string;
  title: string;
  subtitle: string;
  moodSummary: string;
  indicators: ActorIndicator[];
  options: ActorInteractionOption[];
  size: 'tiny' | 'small' | 'medium' | 'large';
}

export interface ActorInteractionContext {
  thievesGuildUnlocked?: boolean;
  canUseRelationshipActions?: boolean;
}

export function buildActorInteractionMenu(
  actor: Actor,
  context: ActorInteractionContext = {},
): ActorInteractionMenuModel {
  const options: ActorInteractionOption[] = [];
  const hostile = actor.hostility === 'hostile' || actor.hostility === 'surrendering';
  const humanoid = actor.species === 'human' || actor.species === 'goblin' || actor.species === 'angel' || actor.species === 'goblinAngel';

  options.push({ id: 'inspect', label: 'Inspect', enabled: true, priority: 10 });

  if (actor.kind !== 'animal' && actor.kind !== 'enemy') {
    options.push({ id: 'talk', label: 'Talk', enabled: true, priority: 90 });
    options.push({ id: 'ask-rumor', label: 'Ask Rumor', enabled: true, priority: 50 });
  }

  if (actor.role === 'shopkeeper' || actor.role === 'bartender' || actor.role === 'blackMarketMerchant') {
    options.push({ id: 'shop', label: 'Shop', enabled: !hostile, reason: hostile ? 'Too hostile' : undefined, priority: 80 });
  }

  if (actor.role === 'romanceCandidate' || (humanoid && !hostile)) {
    options.push({
      id: 'romance',
      label: 'Romance',
      enabled: !hostile && context.canUseRelationshipActions !== false,
      reason: hostile ? 'Too hostile' : undefined,
      priority: 60,
    });
    options.push({
      id: 'give-gift',
      label: 'Give Gift',
      enabled: !hostile,
      reason: hostile ? 'Too hostile' : undefined,
      priority: 55,
    });
  }

  if (humanoid) {
    options.push({
      id: 'pickpocket',
      label: 'Pickpocket',
      enabled: Boolean(context.thievesGuildUnlocked) && !hostile,
      reason: context.thievesGuildUnlocked ? undefined : 'Join the thieves guild',
      priority: 35,
    });
    options.push({ id: 'attack', label: 'Attack', enabled: true, priority: 20 });
  }

  if (hostile && actor.combat?.canBeEatenWhenHostile) {
    options.push({ id: 'eat', label: 'Eat', enabled: true, priority: 95 });
  } else if (humanoid) {
    options.push({ id: 'eat', label: 'Eat', enabled: false, reason: 'Target is not hostile', priority: 5 });
  }

  if (actor.hostility === 'surrendering') {
    options.push({ id: 'spare', label: 'Spare', enabled: true, priority: 85 });
  }

  options.push({ id: 'leave', label: 'Leave', enabled: true, priority: 0 });

  const sorted = options.sort((a, b) => b.priority - a.priority);
  return {
    actorId: actor.id,
    title: actor.displayName,
    subtitle: subtitleFor(actor),
    moodSummary: summarizeMood(actor),
    indicators: getActorIndicators(actor, 3),
    options: sorted,
    size: menuSizeFor(sorted.length),
  };
}

function subtitleFor(actor: Actor): string {
  const parts = [roleLabel(actor.role)];
  if (actor.townId) parts.push(actor.townId);
  if (actor.factionId) parts.push(String(actor.factionId));
  return parts.join(' / ');
}

function roleLabel(role: Actor['role']): string {
  return role.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase());
}

function summarizeMood(actor: Actor): string {
  if (actor.hostility === 'hostile') return 'hostile';
  if (actor.mood.fear >= 65 && actor.mood.affection >= 45) return 'worried for you';
  if (actor.mood.greed >= 60) return 'commercially alert';
  if (actor.mood.affection >= 60) return 'fond';
  if (actor.mood.fear >= 55) return 'afraid';
  if (actor.mood.anger >= 55) return 'angry';
  if (actor.mood.trust >= 50) return 'trusting';
  if (actor.mood.curiosity >= 55) return 'intrigued';
  return 'neutral';
}

function menuSizeFor(optionCount: number): ActorInteractionMenuModel['size'] {
  if (optionCount <= 3) return 'tiny';
  if (optionCount <= 5) return 'small';
  if (optionCount <= 8) return 'medium';
  return 'large';
}
