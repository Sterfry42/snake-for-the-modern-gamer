import type { Actor } from './actorTypes.js';
import { getActorIndicators, type ActorIndicator } from './actorIndicators.js';
import { i18n } from '../i18n/i18nManager.js';
import { isTownShopRole } from '../world/townRoles.js';

export type ActorInteractionId =
  | 'inspect'
  | 'talk'
  | 'ask-rumor'
  | 'ask-personal'
  | 'take-quest'
  | 'shop'
  | 'romance'
  | 'give-gift'
  | 'apologize'
  | 'pickpocket'
  | 'threaten'
  | 'parley'
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
  canPickpocket?: boolean;
  canUseRelationshipActions?: boolean;
  recentRumorCount?: number;
}

export function buildActorInteractionMenu(
  actor: Actor,
  context: ActorInteractionContext = {},
): ActorInteractionMenuModel {
  const options: ActorInteractionOption[] = [];
  const hostile = actor.hostility === 'hostile' || actor.hostility === 'surrendering';
  const humanoid =
    actor.species === 'human' ||
    actor.species === 'goblin' ||
    actor.species === 'angel' ||
    actor.species === 'goblinAngel';
  const canPickpocket = Boolean(context.canPickpocket ?? context.thievesGuildUnlocked);

  options.push({ id: 'inspect', label: tActor('inspect'), enabled: true, priority: 10 });

  if (actor.kind !== 'animal' && actor.kind !== 'enemy') {
    options.push({ id: 'talk', label: tActor('talk'), enabled: true, priority: 90 });
    if (actor.role === 'questGiver') {
      options.push({ id: 'take-quest', label: tActor('takeQuest'), enabled: !hostile, priority: 86 });
    }
    options.push({
      id: 'ask-rumor',
      label: tActor('askAround'),
      enabled: true,
      priority: 58,
    });
    const playerOpinion = actor.opinions.player;
    const friendlyEnough =
      actor.hostility === 'friendly' ||
      actor.mood.trust >= 32 ||
      actor.mood.affection >= 35 ||
      (playerOpinion?.trust ?? 0) >= 18 ||
      (playerOpinion?.affection ?? 0) >= 18;
    if (actor.soul && friendlyEnough) {
      options.push({
        id: 'ask-personal',
        label: tActor('askPersonally'),
        enabled: true,
        priority: 48,
      });
    }
  }

  if (isTownShopRole(actor.role)) {
    const shopClosedReason =
      typeof actor.flags.shopClosedReason === 'string' ? actor.flags.shopClosedReason : undefined;
    options.push({
      id: 'shop',
      label: tActor('shop'),
      enabled: !hostile && !shopClosedReason,
      reason: hostile ? tActor('tooHostile') : shopClosedReason,
      priority: 80,
    });
  }

  if (actor.role === 'romanceCandidate' || (humanoid && !hostile)) {
    options.push({
      id: 'romance',
      label: tActor('romance'),
      enabled: !hostile && context.canUseRelationshipActions !== false,
      reason: hostile ? tActor('tooHostile') : undefined,
      priority: 60,
    });
    options.push({
      id: 'give-gift',
      label: tActor('giveGift'),
      enabled: !hostile,
      reason: hostile ? tActor('tooHostile') : undefined,
      priority: 55,
    });
  }

  if (humanoid) {
    if (actor.mood.anger >= 35 || actor.opinions.player?.resentment >= 20) {
      options.push({ id: 'apologize', label: tActor('apologize'), enabled: !hostile, priority: 68 });
    }
    options.push({
      id: 'pickpocket',
      label: tActor('pickpocket'),
      enabled: canPickpocket && !hostile,
      reason: canPickpocket ? undefined : tActor('findThievesGuildTest'),
      priority: 35,
    });
    options.push({ id: 'threaten', label: tActor('threaten'), enabled: !hostile, priority: 18 });
    options.push({
      id: 'parley',
      label: tActor('parley'),
      enabled: hostile,
      reason: hostile ? undefined : tActor('notHostile'),
      priority: hostile ? 82 : 8,
    });
  }

  if (hostile && actor.combat?.canBeEatenWhenHostile) {
    options.push({ id: 'eat', label: tActor('eat'), enabled: true, priority: 95 });
  } else if (humanoid) {
    options.push({
      id: 'eat',
      label: tActor('eat'),
      enabled: false,
      reason: tActor('targetNotHostile'),
      priority: 5,
    });
  }

  if (actor.hostility === 'surrendering') {
    options.push({ id: 'spare', label: tActor('spare'), enabled: true, priority: 85 });
  }

  options.push({ id: 'leave', label: tActor('leave'), enabled: true, priority: 0 });

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
  if (actor.hostility === 'hostile') return tActor('moodHostile');
  if (actor.mood.fear >= 65 && actor.mood.affection >= 45) return tActor('moodWorried');
  if (actor.mood.greed >= 60) return tActor('moodCommercial');
  if (actor.mood.affection >= 60) return tActor('moodFond');
  if (actor.mood.fear >= 55) return tActor('moodAfraid');
  if (actor.mood.anger >= 55) return tActor('moodAngry');
  if (actor.mood.trust >= 50) return tActor('moodTrusting');
  if (actor.mood.curiosity >= 55) return tActor('moodIntrigued');
  return tActor('moodNeutral');
}

function tActor(key: string): string {
  return i18n.getCommon(`actorInteractions.${key}`);
}

function menuSizeFor(optionCount: number): ActorInteractionMenuModel['size'] {
  if (optionCount <= 3) return 'tiny';
  if (optionCount <= 5) return 'small';
  if (optionCount <= 8) return 'medium';
  return 'large';
}
