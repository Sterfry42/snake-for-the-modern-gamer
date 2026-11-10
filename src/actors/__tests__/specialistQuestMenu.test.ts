import { describe, expect, it } from 'vitest';
import { ActorRegistry } from '../actorRegistry.js';
import { buildActorInteractionMenu } from '../actorInteractions.js';

describe('specialist quest interaction menus', () => {
  const registry = new ActorRegistry();

  function resident(role: 'wizard' | 'guard' | 'thiefContact' | 'resident') {
    return registry.ensureTownResidentActor({
      residentId: `resident-${role}`,
      name: role,
      role,
      townId: 'market-town',
      factionId: 'human-town',
      currentRoomId: '0,0,0',
      homeRoomId: '0,0,0',
      workRoomId: '0,0,0',
    });
  }

  it('exposes curated quests to town guards, wizards and thieves, not random residents', () => {
    for (const role of ['wizard', 'guard', 'thiefContact'] as const) {
      const menu = buildActorInteractionMenu(resident(role));
      expect(menu.options.some((option) => option.id === 'take-quest' && option.enabled))
        .toBe(true);
    }
    expect(buildActorInteractionMenu(resident('resident')).options.some(
      (option) => option.id === 'take-quest',
    )).toBe(false);
  });

  it('does not offer work from hostile specialists', () => {
    const wizard = resident('wizard');
    const hostile = { ...wizard, hostility: 'hostile' as const };
    const menu = buildActorInteractionMenu(hostile);
    expect(menu.options.find((option) => option.id === 'take-quest')?.enabled).toBe(false);
  });
});
