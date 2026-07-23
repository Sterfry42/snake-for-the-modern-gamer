export type TownMerchantRole =
  | 'shopkeeper'
  | 'equipmentMerchant'
  | 'potionMaker'
  | 'butcher'
  | 'cardDealer'
  | 'bartender'
  | 'physicalTrainer';

export type TownRoleShopKind =
  | 'general'
  | 'equipment'
  | 'potion'
  | 'butcher'
  | 'cards'
  | 'food'
  | 'florist'
  | 'jeweler'
  | 'tailor'
  | 'scribe'
  | 'clinic'
  | 'blackMarket'
  | 'maneuverTrainer';

const TOWN_MERCHANT_ROLES = new Set<string>([
  'shopkeeper',
  'equipmentMerchant',
  'potionMaker',
  'butcher',
  'cardDealer',
  'bartender',
  'physicalTrainer',
]);

const TOWN_SHOP_ROLES = new Set<string>([...TOWN_MERCHANT_ROLES, 'blackMarketMerchant']);

const STATIONARY_TOWN_ROLES = new Set<string>([
  'guard',
  'gateGuard',
  'shopkeeper',
  'equipmentMerchant',
  'potionMaker',
  'butcher',
  'cardDealer',
  'bartender',
  'physicalTrainer',
  'questGiver',
]);

const TOWN_GUARD_ROLES = new Set<string>(['guard', 'gateGuard']);

const TOWN_CRIMINAL_ROLES = new Set<string>([
  'thief',
  'thiefContact',
  'guildContact',
  'blackMarketMerchant',
]);

export function isTownMerchantRole(role: string): boolean {
  return TOWN_MERCHANT_ROLES.has(role);
}

export function isTownShopRole(role: string): boolean {
  return TOWN_SHOP_ROLES.has(role);
}

export function isStationaryTownRole(role: string): boolean {
  return STATIONARY_TOWN_ROLES.has(role);
}

export function isTownGuardRole(role: string): boolean {
  return TOWN_GUARD_ROLES.has(role);
}

export function isTownCriminalRole(role: string): boolean {
  return TOWN_CRIMINAL_ROLES.has(role);
}

export function shopKindForTownRole(role: string): TownRoleShopKind | undefined {
  switch (role) {
    case 'equipmentMerchant':
      return 'equipment';
    case 'potionMaker':
      return 'potion';
    case 'butcher':
      return 'butcher';
    case 'cardDealer':
      return 'cards';
    case 'bartender':
      return 'food';
    case 'physicalTrainer':
      return 'maneuverTrainer';
    case 'blackMarketMerchant':
      return 'blackMarket';
    case 'shopkeeper':
      return 'general';
    default:
      return undefined;
  }
}

export function selectPrimaryTownMerchant<T extends { role: string }>(
  residents: readonly T[],
  fallback: T,
): T {
  return (
    residents.find((resident) => resident.role === 'equipmentMerchant') ??
    residents.find((resident) => resident.role === 'shopkeeper') ??
    residents.find((resident) => isTownShopRole(resident.role)) ??
    fallback
  );
}
