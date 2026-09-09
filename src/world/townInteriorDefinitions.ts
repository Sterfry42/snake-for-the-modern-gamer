import type { LayerTemplateId } from '../layers/layerTypes.js';
import type { TownBuildingKind, TownDistrictKind } from './town.js';
import type { TownBusinessPolicyId } from './townBusinessPolicy.js';

export interface TownInteriorDefinition {
  buildingKind: TownBuildingKind;
  templateId: LayerTemplateId;
  district: TownDistrictKind;
  publicAccess: boolean;
  crimeTarget?: boolean;
  servicePolicyId?: TownBusinessPolicyId;
}

export const TOWN_INTERIORS = {
  tavern: {
    buildingKind: 'tavern',
    templateId: 'tavern',
    district: 'townCenter',
    publicAccess: true,
    servicePolicyId: 'tavern-service',
  },
  townHall: {
    buildingKind: 'townHall',
    templateId: 'townHall',
    district: 'townCenter',
    publicAccess: true,
    servicePolicyId: 'civic-office',
  },
  generalStore: {
    buildingKind: 'generalStore',
    templateId: 'generalStore',
    district: 'marketStreet',
    publicAccess: true,
    crimeTarget: true,
    servicePolicyId: 'ordinary-shop',
  },
  butcherShop: {
    buildingKind: 'butcherShop',
    templateId: 'butcherShop',
    district: 'marketStreet',
    publicAccess: true,
    crimeTarget: true,
    servicePolicyId: 'ordinary-shop',
  },
  potionMaker: {
    buildingKind: 'potionMaker',
    templateId: 'potionMaker',
    district: 'marketStreet',
    publicAccess: true,
    crimeTarget: true,
    servicePolicyId: 'ordinary-shop',
  },
  mapper: {
    buildingKind: 'mapper',
    templateId: 'mapper',
    district: 'marketStreet',
    publicAccess: true,
    crimeTarget: true,
    servicePolicyId: 'ordinary-shop',
  },
  wizardShop: {
    buildingKind: 'wizardShop',
    templateId: 'wizardShop',
    district: 'marketStreet',
    publicAccess: true,
    crimeTarget: true,
    servicePolicyId: 'ordinary-shop',
  },
  residentialHome: {
    buildingKind: 'residentialHome',
    templateId: 'residentialHome',
    district: 'residentialStreet',
    publicAccess: false,
    crimeTarget: true,
  },
  thievesGuild: {
    buildingKind: 'guildAccess',
    templateId: 'thievesGuild',
    district: 'backAlley',
    publicAccess: false,
  },
} as const satisfies Record<string, TownInteriorDefinition>;

export function townInteriorDefinitionForTemplate(
  templateId: LayerTemplateId,
): TownInteriorDefinition | undefined {
  return Object.values(TOWN_INTERIORS).find((definition) => definition.templateId === templateId);
}
