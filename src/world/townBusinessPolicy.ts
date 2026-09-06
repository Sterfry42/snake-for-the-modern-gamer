import type { ActorScheduleRoutine } from '../actors/actorTypes.js';
import type { DayPhase } from './atmosphereTypes.js';
import { isTownShopRole } from './townRoles.js';

type TownBusinessPolicyId = 'ordinary-shop' | 'tavern-service' | 'always-open-service';

interface TownBusinessPolicy {
  id: TownBusinessPolicyId;
  publicHours: { opens: DayPhase; closes: DayPhase; label: string };
  routines: Partial<Record<DayPhase, ActorScheduleRoutine>>;
  openPhases: readonly DayPhase[];
  recoveryDeadlineMs: Partial<Record<DayPhase, number>>;
}

const ORDINARY_SHOP_POLICY: TownBusinessPolicy = {
  id: 'ordinary-shop',
  publicHours: { opens: 'day', closes: 'dusk', label: 'day' },
  openPhases: ['day'],
  routines: {
    dawn: { behavior: 'work', goalKind: 'work', priority: 16, roomTarget: 'work' },
    day: { behavior: 'work', goalKind: 'work', priority: 18, roomTarget: 'work' },
    dusk: { behavior: 'goHome', goalKind: 'goHome', priority: 18, roomTarget: 'home' },
    night: { behavior: 'sleep', goalKind: 'sleep', priority: 22, roomTarget: 'sleep' },
  },
  recoveryDeadlineMs: {
    day: 90_000,
    night: 120_000,
  },
};

const TAVERN_SERVICE_POLICY: TownBusinessPolicy = {
  id: 'tavern-service',
  publicHours: { opens: 'day', closes: 'dawn', label: 'day-night' },
  openPhases: ['day', 'dusk', 'night'],
  routines: {
    dawn: { behavior: 'work', goalKind: 'work', priority: 16, roomTarget: 'work' },
    day: { behavior: 'work', goalKind: 'work', priority: 18, roomTarget: 'work' },
    dusk: { behavior: 'work', goalKind: 'work', priority: 20, roomTarget: 'work' },
    night: { behavior: 'work', goalKind: 'work', priority: 20, roomTarget: 'work' },
  },
  recoveryDeadlineMs: {
    day: 90_000,
    dusk: 90_000,
    night: 90_000,
  },
};

const ALWAYS_OPEN_SERVICE_POLICY: TownBusinessPolicy = {
  id: 'always-open-service',
  publicHours: { opens: 'dawn', closes: 'dawn', label: 'always' },
  openPhases: ['dawn', 'day', 'dusk', 'night'],
  routines: {},
  recoveryDeadlineMs: {},
};

const ORDINARY_SHOP_ROLES = new Set<string>([
  'shopkeeper',
  'equipmentMerchant',
  'potionMaker',
  'butcher',
  'physicalTrainer',
  'mapper',
  'wizard',
]);

const TAVERN_SERVICE_ROLES = new Set<string>(['bartender', 'cardDealer', 'innkeeper']);

export function townBusinessPolicyForRole(role: string | undefined): TownBusinessPolicy | undefined {
  if (!role) {
    return undefined;
  }
  if (ORDINARY_SHOP_ROLES.has(role)) {
    return ORDINARY_SHOP_POLICY;
  }
  if (TAVERN_SERVICE_ROLES.has(role)) {
    return TAVERN_SERVICE_POLICY;
  }
  if (isTownShopRole(role) || role === 'blackMarketMerchant' || role === 'goblinMerchant') {
    return ALWAYS_OPEN_SERVICE_POLICY;
  }
  return undefined;
}

export function townBusinessPolicyForTemplate(
  templateId: string | undefined,
  ownerRole?: string,
): TownBusinessPolicy | undefined {
  const ownerPolicy = townBusinessPolicyForRole(ownerRole);
  if (ownerPolicy) {
    return ownerPolicy;
  }
  if (templateId === 'tavern') {
    return TAVERN_SERVICE_POLICY;
  }
  if (
    templateId === 'generalStore' ||
    templateId === 'butcherShop' ||
    templateId === 'potionMaker' ||
    templateId === 'mapper' ||
    templateId === 'wizardShop'
  ) {
    return ORDINARY_SHOP_POLICY;
  }
  return undefined;
}

export function isTownBusinessOpenForPhase(
  policy: TownBusinessPolicy | undefined,
  dayPhase: DayPhase,
): boolean {
  return policy ? policy.openPhases.includes(dayPhase) : true;
}
