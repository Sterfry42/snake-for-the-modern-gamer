import { describe, expect, it } from 'vitest';
import { getActorActivityProp, getActorSleepMarker } from '../../../actors/actorActivityProps.js';
import { getActorIndicators } from '../../../actors/actorIndicators.js';
import { getActorPresentation } from '../../../actors/actorPresentation.js';
import { createHeadlessScenario } from '../../../test/headless/headlessScenario.js';
import { ensureScenarioActor, firstWalkableTile } from '../../../test/headless/scenarioFixtures.js';

describe('Town NPC living-world presentation stories', () => {
  it('TOWN-LIFE-019 - Activity props describe current actions', () => {
    const scenario = createHeadlessScenario({ seed: 'town-life-019-activity-props' });
    const base = firstWalkableTile(scenario);
    const actors = [
      { id: 'drinking-patron', role: 'resident' as const, activity: 'drinking' as const },
      { id: 'card-dealer', role: 'resident' as const, activity: 'dealing-cards' as const },
      { id: 'town-mapper', role: 'shopkeeper' as const, activity: 'mapping' as const },
      { id: 'repair-worker', role: 'resident' as const, activity: 'repairing' as const },
    ].map((fixture, index) => {
      const actor = ensureScenarioActor(scenario, {
        id: fixture.id,
        name: fixture.id,
        role: fixture.role,
        position: { x: base.x + index, y: base.y },
      });
      scenario.game
        .getActorSystem()
        .setActivity(actor.id, { kind: fixture.activity, source: 'system' }, 'town-life-019');
      return scenario.actor(actor.id);
    });

    expect(actors.map((actor) => getActorActivityProp(actor)?.kind)).toEqual([
      'beer-mug',
      'cards',
      'map-compass',
      'tool',
    ]);
    scenario.assertWorldIntegrity();
  });

  it('TOWN-LIFE-020 - Sleeping uses an above-head presentation contract', () => {
    const scenario = createHeadlessScenario({ seed: 'town-life-020-sleep-marker' });
    const actor = ensureScenarioActor(scenario, {
      id: 'sleeping-resident',
      name: 'Sleeping Resident',
      role: 'resident',
      position: firstWalkableTile(scenario),
    });
    scenario.game
      .getActorSystem()
      .setActivity(actor.id, { kind: 'sleeping', source: 'schedule' }, 'town-life-020');

    const sleeping = scenario.actor(actor.id);
    expect(getActorActivityProp(sleeping)).toBeNull();
    expect(getActorSleepMarker(sleeping)).toMatchObject({
      kind: 'sleep-zzz',
      anchor: 'above-head',
    });
    expect(getActorPresentation(sleeping)).toMatchObject({
      activityProp: null,
      sleepMarker: {
        kind: 'sleep-zzz',
        anchor: 'above-head',
      },
      canSpeak: false,
      speech: undefined,
    });
    scenario.assertWorldIntegrity();
  });

  it('TOWN-HARDEN-032 - Sleeping actors do not produce direct or conversation dialogue', () => {
    const scenario = createHeadlessScenario({ seed: 'town-harden-032-sleeping-dialogue-gate' });
    const actor = ensureScenarioActor(scenario, {
      id: 'sleeping-speaker',
      name: 'Sleeping Speaker',
      role: 'shopkeeper',
      position: firstWalkableTile(scenario),
    });
    scenario.game
      .getActorSystem()
      .setActivity(actor.id, { kind: 'sleeping', source: 'schedule' }, 'town-harden-032');

    expect(scenario.game.getNpcBark('shopkeeper', actor.id)).toMatchObject({
      id: 'actor-silent:sleeping',
      text: '',
    });
    expect(scenario.game.getActorConversation(actor.id, 'talk')).toBeNull();
    expect(
      scenario.game.getActorInteractionMenu(actor.id)?.options.map((option) => option.id),
    ).toEqual(['wake', 'leave']);

    expect(scenario.game.wakeActor(actor.id).ok).toBe(true);
    expect(scenario.game.getNpcBark('shopkeeper', actor.id).text.length).toBeGreaterThan(0);
    expect(scenario.game.getActorConversation(actor.id, 'talk')).not.toBeNull();
    scenario.assertWorldIntegrity();
  });

  it('TOWN-LIFE-021 - Routine roles do not create indicator clutter', () => {
    const scenario = createHeadlessScenario({ seed: 'town-life-021-routine-indicators' });
    const merchant = ensureScenarioActor(scenario, {
      id: 'ordinary-merchant',
      name: 'Ordinary Merchant',
      role: 'shopkeeper',
      position: firstWalkableTile(scenario),
    });
    scenario.game.getActorSystem().registry.update(merchant.id, (actor) => ({
      ...actor,
      memory: [
        {
          id: 'routine-rumor',
          type: 'rumor',
          summary: 'The wise old snake says the market coffee is too chewy for wisdom.',
          source: 'rumor',
          intensity: 10,
          tags: ['rumor', 'routine'],
        },
      ],
    }));

    expect(
      getActorIndicators(scenario.actor(merchant.id)).map((indicator) => indicator.kind),
    ).toEqual([]);
    scenario.assertWorldIntegrity();
  });

  it('TOWN-LIFE-022 - Urgent states remain visible', () => {
    const scenario = createHeadlessScenario({ seed: 'town-life-022-urgent-indicators' });
    const base = firstWalkableTile(scenario);
    const urgentActors = [
      {
        id: 'quest-actor',
        mutate: { role: 'questGiver' as const },
        expected: 'quest',
      },
      {
        id: 'suspicious-actor',
        mutate: { hostility: 'suspicious' as const },
        expected: 'suspicious',
      },
      {
        id: 'hostile-actor',
        mutate: { hostility: 'hostile' as const },
        expected: 'hostile',
      },
      {
        id: 'wounded-actor',
        mutate: { health: { current: 2, max: 10, state: 'wounded' as const } },
        expected: 'wounded',
      },
      {
        id: 'faction-actor',
        mutate: { flags: { activeFactionEventId: 'raid-warning' } },
        expected: 'faction',
      },
    ];

    for (const [index, fixture] of urgentActors.entries()) {
      const actor = ensureScenarioActor(scenario, {
        id: fixture.id,
        name: fixture.id,
        role: 'resident',
        position: { x: base.x + index, y: base.y },
      });
      scenario.game.getActorSystem().registry.update(actor.id, (current) => ({
        ...current,
        ...fixture.mutate,
        flags: { ...current.flags, ...fixture.mutate.flags },
      }));

      expect(
        getActorIndicators(scenario.actor(actor.id), 3).map((indicator) => indicator.kind),
      ).toContain(fixture.expected);
    }
    scenario.assertWorldIntegrity();
  });
});
