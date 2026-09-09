import type { Actor } from '../actors/actorTypes.js';
import { isTownCriminalRole, isTownGuardRole, isTownShopRole } from '../world/townRoles.js';
import type {
  CivicTownContext,
  CivicVoterKnowledge,
  MayoralPlatformId,
  TownPolicyModifiers,
} from './civicTypes.js';

export interface MayoralPlatformDefinition {
  id: MayoralPlatformId;
  label: string;
  description: string;
  modifiers: TownPolicyModifiers;
}

export const MAYORAL_PLATFORMS: readonly MayoralPlatformDefinition[] = [
  {
    id: 'law-and-order',
    label: 'Law & Order',
    description: 'More guards, less crime pressure, and a reputation for clean streets.',
    modifiers: {
      shopPriceScalar: 1,
      positiveReputationScalar: 1,
      positiveOpinionScalar: 1,
      guardPresenceBonus: 1,
      crimePressureScalar: 0.8,
    },
  },
  {
    id: 'business-first',
    label: 'Business First',
    description: 'Local merchants give the Mayor a practical discount.',
    modifiers: {
      shopPriceScalar: 0.88,
      positiveReputationScalar: 1,
      positiveOpinionScalar: 1,
      guardPresenceBonus: 0,
      crimePressureScalar: 1,
    },
  },
  {
    id: 'people-first',
    label: 'People First',
    description: 'Good deeds and friendly moments travel farther in town.',
    modifiers: {
      shopPriceScalar: 1,
      positiveReputationScalar: 1.25,
      positiveOpinionScalar: 1.2,
      guardPresenceBonus: 0,
      crimePressureScalar: 1,
    },
  },
  {
    id: 'community-celebration',
    label: 'Community & Celebration',
    description: 'The Mayor gets one local tavern drink on the house each day.',
    modifiers: {
      shopPriceScalar: 1,
      positiveReputationScalar: 1,
      positiveOpinionScalar: 1.05,
      guardPresenceBonus: 0,
      crimePressureScalar: 1,
    },
  },
] as const;

export const DEFAULT_TOWN_POLICY_MODIFIERS: TownPolicyModifiers = {
  shopPriceScalar: 1,
  positiveReputationScalar: 1,
  positiveOpinionScalar: 1,
  guardPresenceBonus: 0,
  crimePressureScalar: 1,
};

export function getMayoralPlatform(platformId: MayoralPlatformId): MayoralPlatformDefinition {
  return MAYORAL_PLATFORMS.find((platform) => platform.id === platformId) ?? MAYORAL_PLATFORMS[0]!;
}

export function platformAffinityScore(
  platformId: MayoralPlatformId,
  actor: Actor,
  town: CivicTownContext,
  knowledge: CivicVoterKnowledge,
): number {
  switch (platformId) {
    case 'law-and-order': {
      let score = isTownGuardRole(actor.role) ? 18 : actor.personality.includes('lawful') ? 10 : 0;
      if (town.wantedLevel <= 0) score += 8;
      if (town.danger >= 50) score += 7;
      if (isTownCriminalRole(actor.role)) score -= 14;
      if (knowledge.knowsPlayerGuildAffiliation) {
        score += isTownCriminalRole(actor.role) ? 24 : -24;
      }
      return score;
    }
    case 'business-first':
      return (
        (isTownShopRole(actor.role) ? 18 : 0) +
        (actor.personality.includes('greedy') ? 10 : 0) +
        (town.prosperity < 45 ? 6 : 0)
      );
    case 'people-first':
      return (
        (actor.role === 'resident' ? 12 : 0) +
        (actor.personality.includes('kind') || actor.personality.includes('softhearted') ? 10 : 0)
      );
    case 'community-celebration':
      return (
        (actor.role === 'bartender' || actor.role === 'cardDealer' ? 16 : 0) +
        (actor.personality.includes('nosy') || actor.personality.includes('romantic') ? 8 : 0)
      );
  }
}
