import type { Actor, ActorActivityKind } from './actorTypes.js';

export type ActorActivityPropKind =
  | 'sword'
  | 'bow'
  | 'merchant-bag'
  | 'beer-mug'
  | 'cards'
  | 'map-compass'
  | 'tool'
  | 'shield'
  | 'fishing-rod';

export interface ActorActivityProp {
  kind: ActorActivityPropKind;
  textureKey: string;
  anchor: 'bottom-right';
  maxTileWidth: number;
  maxTileHeight: number;
  label: string;
}

const ACTIVITY_PROP_BY_KIND: Partial<Record<ActorActivityKind, ActorActivityPropKind>> = {
  'combat-melee': 'sword',
  'combat-ranged': 'bow',
  'dealing-cards': 'cards',
  drinking: 'beer-mug',
  mapping: 'map-compass',
  merchant: 'merchant-bag',
  repairing: 'tool',
  guarding: 'shield',
  fishing: 'fishing-rod',
};

const PROP_LABELS: Record<ActorActivityPropKind, string> = {
  sword: 'Melee combat',
  bow: 'Ranged combat',
  'beer-mug': 'Drinking',
  cards: 'Cards',
  'map-compass': 'Mapping',
  tool: 'Repairing',
  'merchant-bag': 'Merchant',
  shield: 'Guarding',
  'fishing-rod': 'Fishing',
};

export interface ActorSleepMarker {
  kind: 'sleep-zzz';
  textureKey: string;
  anchor: 'above-head';
  label: string;
}

export function getActorActivityProp(actor: Actor): ActorActivityProp | null {
  const activity = actor.activity?.kind;
  if (!activity) {
    return null;
  }
  const kind = ACTIVITY_PROP_BY_KIND[activity];
  if (!kind) {
    return null;
  }
  return {
    kind,
    textureKey: `actor-activity-prop:${kind}`,
    anchor: 'bottom-right',
    maxTileWidth: 0.5,
    maxTileHeight: 0.5,
    label: PROP_LABELS[kind],
  };
}

export function getActorSleepMarker(actor: Actor): ActorSleepMarker | null {
  if (actor.activity?.kind !== 'sleeping') {
    return null;
  }
  return {
    kind: 'sleep-zzz',
    textureKey: 'actor-sleep-marker:sleep-zzz',
    anchor: 'above-head',
    label: 'Sleeping',
  };
}
