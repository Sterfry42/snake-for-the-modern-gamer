import type { Actor } from '../actors/actorTypes.js';
import type { WorldEvent } from '../events/worldEventTypes.js';
import type { ActorFactionId, FactionRelationState } from './factionTypes.js';

const DEFAULT_RELATIONS: Record<string, Record<string, FactionRelationState>> = {
  'hearthbound-remnant': {
    'goblin-camps': 'truce',
    guards: 'allied',
    shopkeepers: 'friendly',
    'thieves-guild': 'hostile',
    bandits: 'hostile',
    wildlife: 'tense',
    predators: 'hostile',
    angels: 'neutral',
    'goblin-angels': 'tense',
    'royal-road-office': 'friendly',
  },
  guards: {
    'hearthbound-remnant': 'allied',
    'goblin-camps': 'tense',
    shopkeepers: 'friendly',
    'thieves-guild': 'hostile',
    bandits: 'hostile',
    wildlife: 'tense',
    predators: 'hostile',
    'royal-road-office': 'friendly',
  },
  shopkeepers: {
    'hearthbound-remnant': 'friendly',
    guards: 'friendly',
    'goblin-camps': 'truce',
    'thieves-guild': 'tense',
    bandits: 'hostile',
    wildlife: 'tense',
    predators: 'hostile',
  },
  'goblin-camps': {
    'hearthbound-remnant': 'truce',
    guards: 'tense',
    shopkeepers: 'truce',
    'thieves-guild': 'tense',
    bandits: 'hostile',
    wildlife: 'tense',
    predators: 'hostile',
    angels: 'tense',
    'goblin-angels': 'friendly',
    'royal-road-office': 'tense',
  },
  'thieves-guild': {
    guards: 'hostile',
    'hearthbound-remnant': 'tense',
    shopkeepers: 'tense',
    'goblin-camps': 'tense',
    bandits: 'skirmishing',
  },
  bandits: {
    'hearthbound-remnant': 'hostile',
    guards: 'hostile',
    shopkeepers: 'hostile',
    'goblin-camps': 'hostile',
    'thieves-guild': 'skirmishing',
    wildlife: 'neutral',
  },
  wildlife: {
    'hearthbound-remnant': 'tense',
    'goblin-camps': 'tense',
    predators: 'hostile',
  },
  predators: {
    'hearthbound-remnant': 'hostile',
    'goblin-camps': 'hostile',
    wildlife: 'hostile',
  },
  angels: {
    'goblin-angels': 'tense',
    'goblin-camps': 'tense',
    'hearthbound-remnant': 'neutral',
  },
  'goblin-angels': {
    angels: 'tense',
    'goblin-camps': 'friendly',
    'hearthbound-remnant': 'tense',
  },
  'royal-road-office': {
    'hearthbound-remnant': 'friendly',
    guards: 'friendly',
    'goblin-camps': 'tense',
    'thieves-guild': 'hostile',
    bandits: 'hostile',
  },
};

export function defaultFactionRelations(factionId: string): Record<string, FactionRelationState> {
  return { ...(DEFAULT_RELATIONS[factionId] ?? {}) };
}

export function relationBetweenFactions(a: string, b: string): FactionRelationState {
  if (a === b) return 'allied';
  return DEFAULT_RELATIONS[a]?.[b] ?? DEFAULT_RELATIONS[b]?.[a] ?? 'neutral';
}

export function actorPrimaryFaction(actor: Actor): ActorFactionId | string {
  if (actor.factionId) return String(actor.factionId);
  switch (actor.role) {
    case 'guard':
    case 'gateGuard':
      return 'guards';
    case 'shopkeeper':
    case 'bartender':
    case 'blackMarketMerchant':
      return 'shopkeepers';
    case 'thief':
    case 'thiefContact':
    case 'guildContact':
      return 'thieves-guild';
    case 'bandit':
      return 'bandits';
    case 'angel':
      return 'angels';
    case 'goblinAngel':
      return 'goblin-angels';
    case 'animalPredator':
      return 'predators';
    case 'animalPrey':
      return 'wildlife';
    default:
      return actor.species === 'goblin' ? 'goblin-camps' : 'hearthbound-remnant';
  }
}

export function factionsInWorldEvent(event: WorldEvent): string[] {
  const factions = new Set<string>();
  for (const tag of event.tags) {
    if (tag === 'goblin' || tag === 'goblin-camps') factions.add('goblin-camps');
    if (tag === 'human' || tag === 'town' || tag === 'guard' || tag === 'hearthbound-remnant') factions.add('hearthbound-remnant');
    if (tag === 'bandit' || tag === 'bandits') factions.add('bandits');
    if (tag === 'guild' || tag === 'thieves-guild' || tag === 'pickpocket') factions.add('thieves-guild');
    if (tag === 'shop') factions.add('shopkeepers');
    if (tag === 'wildlife' || tag === 'animal') factions.add('wildlife');
    if (tag === 'predator') factions.add('predators');
    if (tag === 'angel') factions.add('angels');
    if (tag === 'goblin-angel') factions.add('goblin-angels');
    if (tag === 'king' || tag === 'road-office' || tag === 'law') factions.add('royal-road-office');
  }
  return [...factions];
}

export function relationSeverityBump(relation: FactionRelationState): number {
  switch (relation) {
    case 'war':
      return 30;
    case 'hostile':
      return 22;
    case 'skirmishing':
      return 18;
    case 'tense':
      return 10;
    case 'truce':
      return 7;
    case 'neutral':
      return 3;
    case 'friendly':
      return 1;
    case 'allied':
      return 0;
  }
}

