import type { ActorRole } from '../actors/actorTypes.js';

const TOWN_MERCHANT_ROLE_VALUES = [
  'shopkeeper',
  'equipmentMerchant',
  'potionMaker',
  'butcher',
  'cardDealer',
  'bartender',
  'physicalTrainer',
  'mapper',
  'wizard',
  'innkeeper',
] as const satisfies readonly ActorRole[];

export type TownMerchantRole = (typeof TOWN_MERCHANT_ROLE_VALUES)[number];

const TOWN_RESIDENT_ROLE_VALUES = [
  'resident',
  ...TOWN_MERCHANT_ROLE_VALUES,
  'guard',
  'gateGuard',
  'thiefContact',
  'thief',
  'guildContact',
  'blackMarketMerchant',
  'scribe',
  'questGiver',
] as const satisfies readonly ActorRole[];

export type TownResidentRole = (typeof TOWN_RESIDENT_ROLE_VALUES)[number];

type TownRoleShopKind =
  | 'general'
  | 'equipment'
  | 'potion'
  | 'butcher'
  | 'cards'
  | 'food'
  | 'blackMarket'
  | 'maneuverTrainer'
  | 'maps'
  | 'magic'
  | 'inn';

const TOWN_MERCHANT_ROLES = new Set<string>(TOWN_MERCHANT_ROLE_VALUES);
const TOWN_SHOP_ROLES = new Set<string>([...TOWN_MERCHANT_ROLE_VALUES, 'blackMarketMerchant']);
const STATIONARY_TOWN_ROLES = new Set<string>([
  'guard',
  'gateGuard',
  ...TOWN_MERCHANT_ROLE_VALUES,
  'questGiver',
]);
const TOWN_GUARD_ROLES = new Set<string>(['guard', 'gateGuard']);
const TOWN_CRIMINAL_ROLES = new Set<string>([
  'thief',
  'thiefContact',
  'guildContact',
  'blackMarketMerchant',
]);
const TOWN_RESIDENT_ROLES = new Set<string>(TOWN_RESIDENT_ROLE_VALUES);

export function isTownResidentRole(role: string): role is TownResidentRole {
  return TOWN_RESIDENT_ROLES.has(role);
}

export function isTownMerchantRole(role: string): role is TownMerchantRole {
  return TOWN_MERCHANT_ROLES.has(role);
}

export function isTownShopRole(role: string): role is TownMerchantRole | 'blackMarketMerchant' {
  return TOWN_SHOP_ROLES.has(role);
}

export function isStationaryTownRole(role: string): role is TownResidentRole {
  return STATIONARY_TOWN_ROLES.has(role);
}

export function isTownGuardRole(role: string): role is 'guard' | 'gateGuard' {
  return TOWN_GUARD_ROLES.has(role);
}

export function isTownCriminalRole(
  role: string,
): role is 'thief' | 'thiefContact' | 'guildContact' | 'blackMarketMerchant' {
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
    case 'mapper':
      return 'maps';
    case 'wizard':
      return 'magic';
    case 'innkeeper':
      return 'inn';
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
