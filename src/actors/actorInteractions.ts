import type { Actor } from './actorTypes.js';
import { getActorIndicators, type ActorIndicator } from './actorIndicators.js';
import { i18n } from '../i18n/i18nManager.js';
import { isTownShopRole } from '../world/townRoles.js';
import type { CivicInteractionContext, MayoralPlatformId } from '../civic/civicTypes.js';

export type ActorInteractionId =
  | 'inspect'
  | 'wake'
  | 'talk'
  | 'tavern-rest'
  | 'ask-rumor'
  | 'ask-personal'
  | 'take-quest'
  | 'shop'
  | 'romance'
  | 'give-gift'
  | 'apologize'
  | 'pickpocket'
  | 'run-for-mayor'
  | `run-for-mayor:${MayoralPlatformId}`
  | 'campaign-shake-hands'
  | 'campaign-button'
  | 'campaign-smear'
  | 'campaign-buy-round'
  | 'mayor-free-beer'
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
  base?: ActorBaseInteractionContext;
  services?: ActorServiceInteractionContext;
  social?: ActorSocialInteractionContext;
  crime?: ActorCrimeInteractionContext;
  combat?: ActorCombatInteractionContext;
  civic?: CivicInteractionContext;
}

export interface ActorBaseInteractionContext {
  reserved?: never;
}

export interface ActorServiceInteractionContext {
  shopClosedReason?: string;
  tavernRest?: {
    available: boolean;
    cost: number;
    reason?: string;
  };
}

export interface ActorSocialInteractionContext {
  canUseRelationshipActions?: boolean;
  recentRumorCount?: number;
}

export interface ActorCrimeInteractionContext {
  thievesGuildUnlocked?: boolean;
  canPickpocket?: boolean;
}

export interface ActorCombatInteractionContext {
  reserved?: never;
}

interface NormalizedActorInteractionContext {
  base: ActorBaseInteractionContext;
  services: ActorServiceInteractionContext;
  social: ActorSocialInteractionContext;
  crime: ActorCrimeInteractionContext;
  combat: ActorCombatInteractionContext;
  civic: CivicInteractionContext;
}

export function buildActorInteractionMenu(
  actor: Actor,
  context: ActorInteractionContext = {},
): ActorInteractionMenuModel {
  const normalized = normalizeInteractionContext(context);
  const baseOptions = buildBaseInteractionOptions(actor);
  if (baseOptions.some((option) => option.id === 'wake')) {
    return menu(actor, baseOptions);
  }
  const options: ActorInteractionOption[] = [
    ...baseOptions,
    ...buildServiceInteractionOptions(actor, normalized.services),
    ...buildSocialInteractionOptions(actor, normalized.social),
    ...buildCrimeInteractionOptions(actor, normalized.crime),
    ...buildCombatInteractionOptions(actor),
    ...buildCivicInteractionOptions(actor, normalized.civic),
  ];
  if (!options.some((option) => option.id === 'leave')) {
    options.push({ id: 'leave', label: tActor('leave'), enabled: true, priority: 0 });
  }
  return menu(actor, options);
}

function buildBaseInteractionOptions(actor: Actor): ActorInteractionOption[] {
  const options: ActorInteractionOption[] = [];
  const hostile = actor.hostility === 'hostile' || actor.hostility === 'surrendering';
  const humanoid =
    actor.species === 'human' ||
    actor.species === 'goblin' ||
    actor.species === 'angel' ||
    actor.species === 'goblinAngel';
  const sleeping = isActorSleeping(actor);

  if (actor.kind !== 'animal' && actor.kind !== 'enemy') {
    if (sleeping) {
      options.push({ id: 'wake', label: tActor('wake'), enabled: true, priority: 94 });
      options.push({ id: 'leave', label: tActor('leaveAlone'), enabled: true, priority: 0 });
      return options;
    }
  }

  options.push({ id: 'inspect', label: tActor('inspect'), enabled: true, priority: 10 });

  if (actor.kind !== 'animal' && actor.kind !== 'enemy') {
    options.push({ id: 'talk', label: tActor('talk'), enabled: true, priority: 90 });
    if (actor.role === 'questGiver') {
      options.push({
        id: 'take-quest',
        label: tActor('takeQuest'),
        enabled: !hostile,
        priority: 86,
      });
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

  if (humanoid) {
    options.push({ id: 'threaten', label: tActor('threaten'), enabled: !hostile, priority: 18 });
  }

  return options;
}

function buildServiceInteractionOptions(
  actor: Actor,
  context: ActorServiceInteractionContext = {},
): ActorInteractionOption[] {
  const options: ActorInteractionOption[] = [];
  const hostile = actor.hostility === 'hostile' || actor.hostility === 'surrendering';
  const sleepInterrupted = actor.flags.sleepInterrupted === true;
  if (actor.role === 'bartender' && context.tavernRest) {
    options.push({
      id: 'tavern-rest',
      label: tActor('tavernRest').replace('{cost}', String(context.tavernRest.cost)),
      enabled: !hostile && context.tavernRest.available,
      reason: hostile ? tActor('tooHostile') : context.tavernRest.reason,
      priority: 84,
    });
  }
  if (hasShopInteraction(actor)) {
    const shopClosedReason =
      context.shopClosedReason ??
      (typeof actor.flags.shopClosedReason === 'string'
        ? actor.flags.shopClosedReason
        : sleepInterrupted && !allowsOffHoursShop(actor)
          ? tActor('shopClosedSleep')
          : undefined);
    options.push({
      id: 'shop',
      label: tActor('shop'),
      enabled: !hostile && !shopClosedReason,
      reason: hostile ? tActor('tooHostile') : shopClosedReason,
      priority: 80,
    });
  }
  return options;
}

function buildSocialInteractionOptions(
  actor: Actor,
  context: ActorSocialInteractionContext = {},
): ActorInteractionOption[] {
  const hostile = actor.hostility === 'hostile' || actor.hostility === 'surrendering';
  const humanoid =
    actor.species === 'human' ||
    actor.species === 'goblin' ||
    actor.species === 'angel' ||
    actor.species === 'goblinAngel';
  const options: ActorInteractionOption[] = [];

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

  if (humanoid && (actor.mood.anger >= 35 || actor.opinions.player?.resentment >= 20)) {
    options.push({
      id: 'apologize',
      label: tActor('apologize'),
      enabled: !hostile,
      priority: 68,
    });
  }
  return options;
}

function buildCrimeInteractionOptions(
  actor: Actor,
  context: ActorCrimeInteractionContext = {},
): ActorInteractionOption[] {
  const hostile = actor.hostility === 'hostile' || actor.hostility === 'surrendering';
  const humanoid =
    actor.species === 'human' ||
    actor.species === 'goblin' ||
    actor.species === 'angel' ||
    actor.species === 'goblinAngel';
  const canPickpocket = Boolean(context.canPickpocket ?? context.thievesGuildUnlocked);
  const options: ActorInteractionOption[] = [];
  if (humanoid) {
    options.push({
      id: 'pickpocket',
      label: tActor('pickpocket'),
      enabled: canPickpocket && !hostile,
      reason: canPickpocket ? undefined : tActor('findThievesGuildTest'),
      priority: 35,
    });
  }
  return options;
}

function buildCombatInteractionOptions(actor: Actor): ActorInteractionOption[] {
  const hostile = actor.hostility === 'hostile' || actor.hostility === 'surrendering';
  const humanoid =
    actor.species === 'human' ||
    actor.species === 'goblin' ||
    actor.species === 'angel' ||
    actor.species === 'goblinAngel';
  const options: ActorInteractionOption[] = [];
  if (humanoid) {
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

  return options;
}

function buildCivicInteractionOptions(
  actor: Actor,
  context: CivicInteractionContext = {},
): ActorInteractionOption[] {
  const options: ActorInteractionOption[] = [];
  const hostile = actor.hostility === 'hostile' || actor.hostility === 'surrendering';
  if (context.isCivicOfficial) {
    options.push({
      id: 'run-for-mayor',
      label: 'Run for Mayor',
      enabled: !hostile && context.canDeclare === true,
      reason: hostile ? tActor('tooHostile') : context.declarationReason,
      priority: 88,
    });
  }
  if (
    context.activeElection &&
    actor.townId === context.activeElection.townId &&
    context.isEligibleVoter === true
  ) {
    const state = context.voterState;
    options.push({
      id: 'campaign-shake-hands',
      label: 'Shake Hands',
      enabled: !hostile && state?.shookHands !== true,
      reason: state?.shookHands ? 'Already canvassed.' : undefined,
      priority: 78,
    });
    options.push({
      id: 'campaign-button',
      label: 'Offer Campaign Button',
      enabled: !hostile && state?.buttonAttempted !== true,
      reason: state?.buttonAttempted ? 'Already asked.' : undefined,
      priority: 76,
    });
    options.push({
      id: 'campaign-smear',
      label: 'Talk Shit About Mayor',
      enabled: !hostile && state?.smearAttempted !== true,
      reason: state?.smearAttempted ? 'Already tried.' : undefined,
      priority: 74,
    });
    if (actor.role === 'bartender') {
      options.push({
        id: 'campaign-buy-round',
        label: 'Buy Everyone a Round',
        enabled: !hostile && context.boughtRoundAvailable === true,
        reason: context.boughtRoundAvailable ? undefined : 'Already bought a campaign round.',
        priority: 82,
      });
    }
  }
  if (actor.role === 'bartender' && context.freeCommunityBeerAvailable !== undefined) {
    options.push({
      id: 'mayor-free-beer',
      label: 'Mayor Beer',
      enabled: !hostile && context.freeCommunityBeerAvailable,
      reason: context.freeCommunityBeerAvailable ? undefined : 'Already redeemed today.',
      priority: 83,
    });
  }
  return options;
}

function normalizeInteractionContext(
  context: ActorInteractionContext,
): NormalizedActorInteractionContext {
  return {
    base: context.base ?? {},
    services: context.services ?? {},
    social: context.social ?? {},
    crime: context.crime ?? {},
    combat: context.combat ?? {},
    civic: context.civic ?? {},
  };
}

export function isActorSleeping(actor: Actor): boolean {
  return actor.flags.sleepInterrupted !== true && actor.activity?.kind === 'sleeping';
}

export function allowsOffHoursShop(actor: Actor): boolean {
  if (actor.flags.offHoursShop === true) {
    return true;
  }
  if (actor.flags.offHoursShop === false) {
    return false;
  }
  return (
    actor.role === 'shopkeeper' ||
    actor.role === 'physicalTrainer' ||
    actor.role === 'cardDealer' ||
    actor.role === 'bartender' ||
    actor.role === 'goblinMerchant' ||
    actor.role === 'blackMarketMerchant'
  );
}

function hasShopInteraction(actor: Actor): boolean {
  return isTownShopRole(actor.role) || actor.role === 'goblinMerchant';
}

function menu(actor: Actor, options: ActorInteractionOption[]): ActorInteractionMenuModel {
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
