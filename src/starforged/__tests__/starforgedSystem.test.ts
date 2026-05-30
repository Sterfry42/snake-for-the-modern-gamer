import { describe, expect, it } from 'vitest';
import { StarforgedSystem } from '../starforgedSystem.js';

describe('StarforgedSystem', () => {
  it('creates a playable initial state with starter gear and an active activity', () => {
    const system = new StarforgedSystem({ seed: 'test-seed' });
    const state = system.createInitialState();

    expect(state.inventory.length).toBeGreaterThan(0);
    expect(state.active).toBe(false);
    expect(state.relicAvailable).toBe(false);
    expect(state.questStage).toBe('dormant');
    expect(state.activeActivityId).toBeTruthy();
    expect(state.loadout.subclassId).toBeTruthy();
    expect(system.computePlayerPower(state)).toBeGreaterThan(0);
  });

  it('completes apple objectives and grants typed gear rewards', () => {
    const system = new StarforgedSystem({ seed: 'apple-test' });
    const state = system.createInitialState();
    system.activateRelic(state);
    state.activeActivityId = 'starforged-patrol-0';

    let result = system.appleEaten(state, {
      appleTypeId: 'normal',
      score: 10,
      length: 3,
      roomId: '0,0,0',
      roomsVisited: 1,
      streak: 1,
    });

    while (!result.completed) {
      result = system.appleEaten(state, {
        appleTypeId: 'gold',
        score: 25,
        length: 4,
        roomId: '0,0,0',
        roomsVisited: 1,
        streak: 3,
      });
    }

    expect(result.rewards.length).toBeGreaterThan(0);
    expect(result.scoreBonus).toBeGreaterThan(0);
    expect(state.inventory.length).toBeGreaterThan(4);
    expect(state.recentRewards[0]).toContain('complete');
  });

  it('advances visit-room objectives from tick context', () => {
    const system = new StarforgedSystem({ seed: 'room-test' });
    const state = system.createInitialState();
    system.activateRelic(state);
    state.activeActivityId = 'starforged-strike-1';

    const result = system.tick(state, {
      score: 0,
      length: 3,
      roomId: '2,0,0',
      roomsVisited: 12,
    });

    expect(result.completed).toBe(true);
    expect(result.rewards.length).toBeGreaterThan(0);
    expect(state.activityProgress['starforged-strike-1'].completions).toBe(1);
  });

  it('does not progress activities before the relic is activated', () => {
    const system = new StarforgedSystem({ seed: 'inactive-test' });
    const state = system.createInitialState();
    state.activeActivityId = 'starforged-patrol-0';

    const result = system.appleEaten(state, {
      appleTypeId: 'gold',
      score: 100,
      length: 8,
      roomId: '0,0,0',
      roomsVisited: 5,
      streak: 5,
    });

    expect(result.completed).toBe(false);
    expect(state.activityProgress['starforged-patrol-0']).toBeUndefined();
  });

  it('selects the highest reasonable activity for current power', () => {
    const system = new StarforgedSystem({ seed: 'activity-test' });
    const state = system.createInitialState();
    state.artifactPower = 40;
    state.playerPower = 140;

    const activity = system.activateBestActivity(state);

    expect(activity).toBeDefined();
    expect(activity!.recommendedPower).toBeLessThanOrEqual(system.computePlayerPower(state) + 8);
    expect(state.activeActivityId).toBe(activity!.id);
  });

  it('activates the relic and exposes applied gear effects', () => {
    const system = new StarforgedSystem({ seed: 'effects-test' });
    const state = system.createInitialState();

    system.unlockRelic(state);
    state.relicRoomId = '0,0,0';
    state.relicPosition = { x: 7, y: 12 };
    expect(state.questStage).toBe('recruiter');
    system.activateRelic(state);
    const effects = system.computeAppliedEffects(state);

    expect(state.active).toBe(true);
    expect(state.relicLoreSeen).toBe(true);
    expect(state.questStage).toBe('active');
    expect(effects.speedScalar).toBeLessThanOrEqual(1);
    expect(effects.abilityRecharge).toBeGreaterThanOrEqual(0);
  });

  it('spends ability energy only when charged', () => {
    const system = new StarforgedSystem({ seed: 'ability-test' });
    const state = system.createInitialState();
    system.activateRelic(state);

    expect(system.spendAbility(state).ok).toBe(false);

    state.abilityEnergy = 100;
    const result = system.spendAbility(state);

    expect(result.ok).toBe(true);
    expect(result.scoreBonus).toBeGreaterThan(0);
    expect(state.abilityEnergy).toBe(0);
  });

  it('lets the envoy tune subclasses and decode earned faction engrams', () => {
    const system = new StarforgedSystem({ seed: 'vendor-test' });
    const state = system.createInitialState();
    system.activateRelic(state);

    const targetSubclass = system.getSubclasses()[1];
    expect(targetSubclass).toBeDefined();
    const tune = system.setSubclass(state, targetSubclass!.id);

    expect(tune.ok).toBe(true);
    expect(state.loadout.subclassId).toBe(targetSubclass!.id);

    const faction = Object.values(state.factionProgress)[0];
    faction.engrams = 1;
    const before = state.inventory.length;
    const decoded = system.claimFactionEngram(state);

    expect(decoded.ok).toBe(true);
    expect(decoded.rewards.length).toBeGreaterThan(0);
    expect(state.inventory.length).toBeGreaterThan(before);
    expect(faction.engrams).toBe(0);
  });
});
