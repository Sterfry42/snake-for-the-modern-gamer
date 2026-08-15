import type { Actor, ActorActivityKind } from './actorTypes.js';

export type ActorActivityPropKind =
  | 'sword'
  | 'bow'
  | 'merchant-bag'
  | 'shield'
  | 'fishing-rod'
  | 'sleep-zzz';

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
  merchant: 'merchant-bag',
  guarding: 'shield',
  fishing: 'fishing-rod',
  sleeping: 'sleep-zzz',
};

const PROP_LABELS: Record<ActorActivityPropKind, string> = {
  sword: 'Melee combat',
  bow: 'Ranged combat',
  'merchant-bag': 'Merchant',
  shield: 'Guarding',
  'fishing-rod': 'Fishing',
  'sleep-zzz': 'Sleeping',
};

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
