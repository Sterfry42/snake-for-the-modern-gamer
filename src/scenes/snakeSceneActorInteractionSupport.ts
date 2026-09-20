export function isSnakeSceneSupportedActorInteraction(id: string): boolean {
  return (
    id === 'wake' ||
    id === 'talk' ||
    id === 'tavern-rest' ||
    id === 'ask-rumor' ||
    id === 'ask-personal' ||
    id === 'take-quest' ||
    id === 'shop' ||
    id === 'apologize' ||
    id === 'threaten' ||
    id === 'parley' ||
    id === 'romance' ||
    id === 'pickpocket' ||
    id === 'run-for-mayor' ||
    id === 'campaign-shake-hands' ||
    id === 'campaign-button' ||
    id === 'campaign-smear' ||
    id === 'campaign-buy-round' ||
    id === 'mayor-free-beer' ||
    id === 'leave'
  );
}

export function hasSnakeSceneButcherSegmentSale(role: string | undefined): boolean {
  return role === 'butcher';
}

export type SnakeSceneSpecialShop = 'garage' | 'maneuver-trainer' | 'generic';

export function getSnakeSceneSpecialShop(
  role: string | undefined,
  isGarageMechanic: boolean,
): SnakeSceneSpecialShop {
  if (isGarageMechanic) {
    return 'garage';
  }
  if (role === 'physicalTrainer') {
    return 'maneuver-trainer';
  }
  return 'generic';
}
