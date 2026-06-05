import { describe, expect, it } from 'vitest';
import { createPersonalityDatingScenario } from './datingScenarioLibrary.js';
import type { RelationshipCandidateProfile } from './relationshipTypes.js';
import type { FactionId } from '../factions/factions.js';
import type { ActorRole } from '../actors/actorTypes.js';

const profile: RelationshipCandidateProfile = {
  id: 'resident:test',
  displayName: 'Marta',
  species: 'human',
  portraitId: 'sage-1',
  factionId: 'human-town' as FactionId,
};

function sequenceRng(values: readonly number[]): () => number {
  let index = 0;
  return () => values[index++] ?? values[values.length - 1] ?? 0;
}

function questionActions(event: ReturnType<typeof createPersonalityDatingScenario>) {
  return event.pages.find((page) => page.actions)?.actions ?? [];
}

function materializeScenarioForRole(
  role: ActorRole,
  kind: 'talk' | 'flirt' | 'date',
  scenarioId: string,
) {
  for (let index = 0; index <= 100; index += 1) {
    const roll = index / 100;
    const event = createPersonalityDatingScenario(profile, kind, 'sharp', sequenceRng([roll]), {
      actorRole: role,
      contextTags: ['market', 'danger', 'healing', 'food', 'cards', 'rumor', 'wanted'],
    });
    if (event.scenarioId === scenarioId) {
      return event;
    }
  }
  throw new Error(`Expected to materialize ${scenarioId} for ${role}.`);
}

describe('dating scenario library', () => {
  it('keeps required role scenarios from leaking to unrelated roles', () => {
    const event = createPersonalityDatingScenario(profile, 'talk', 'deadpan', () => 0, {
      actorRole: 'resident',
      contextTags: ['crime', 'faction'],
    });

    expect(event.scenarioId).not.toBe('talk-guard-law-mercy');
  });

  it('does not emit known they-plus-singular-verb narration bugs', () => {
    const event = createPersonalityDatingScenario(profile, 'date', 'sharp', () => 0.99, {
      actorRole: 'resident',
    });
    const text = event.pages.map((page) => page.line).join('\n');

    expect(text).not.toMatch(/They (mutters|watches|exhales|smooths|narrows)\b/);
  });

  it('shuffles branch option display order while preserving branch identity', () => {
    const event = createPersonalityDatingScenario(
      profile,
      'talk',
      'deadpan',
      sequenceRng([0, 0, 0, 0]),
      { actorRole: 'resident' },
    );
    const actions = questionActions(event);
    const branchActions = actions.filter((action) => action.id !== 'leave');
    const originalBranchIds = Object.keys(event.branchResults);

    expect(branchActions.map((action) => action.id)).not.toEqual(originalBranchIds);
    for (const action of branchActions) {
      expect(event.branchResults[action.id]).toBeDefined();
      expect(event.branchResults[action.id]?.label).toBe(action.label);
    }
  });

  it('shows every branch label exactly once and keeps Back last', () => {
    const event = createPersonalityDatingScenario(
      profile,
      'flirt',
      'sharp',
      sequenceRng([0, 0.4, 0.8, 0.2]),
      { actorRole: 'resident' },
    );
    const actions = questionActions(event);
    const branchActions = actions.filter((action) => action.id !== 'leave');
    const branchLabels = Object.values(event.branchResults).map((result) => result.label);

    expect(actions[actions.length - 1]).toMatchObject({ id: 'leave', label: 'Back' });
    expect(branchActions.map((action) => action.label).sort()).toEqual(branchLabels.sort());
    expect(new Set(branchActions.map((action) => action.label)).size).toBe(branchActions.length);
  });

  it('keeps branch outcome logic stable across different shuffled orders', () => {
    const first = createPersonalityDatingScenario(
      profile,
      'talk',
      'deadpan',
      sequenceRng([0, 0, 0, 0]),
      { actorRole: 'resident' },
    );
    const second = createPersonalityDatingScenario(
      profile,
      'talk',
      'deadpan',
      sequenceRng([0, 0.9, 0.9, 0]),
      { actorRole: 'resident' },
    );

    expect(first.scenarioId).toBe(second.scenarioId);
    expect(questionActions(first).map((action) => action.id)).not.toEqual(
      questionActions(second).map((action) => action.id),
    );
    for (const id of Object.keys(first.branchResults)) {
      expect(second.branchResults[id]?.outcome).toEqual(first.branchResults[id]?.outcome);
      expect(second.branchResults[id]?.targetTier).toEqual(first.branchResults[id]?.targetTier);
      expect(second.branchResults[id]?.tags).toEqual(first.branchResults[id]?.tags);
      expect(second.branchResults[id]?.followUpPages).toEqual(
        first.branchResults[id]?.followUpPages,
      );
    }
  });

  it('produces deterministic shuffled order from deterministic RNG', () => {
    const first = createPersonalityDatingScenario(
      profile,
      'date',
      'poetic',
      sequenceRng([0.2, 0.7, 0.1, 0.5]),
      { actorRole: 'resident' },
    );
    const second = createPersonalityDatingScenario(
      profile,
      'date',
      'poetic',
      sequenceRng([0.2, 0.7, 0.1, 0.5]),
      { actorRole: 'resident' },
    );

    expect(questionActions(first).map((action) => action.id)).toEqual(
      questionActions(second).map((action) => action.id),
    );
  });

  it('materializes required role scenarios for new physical merchant roles', () => {
    expect(
      materializeScenarioForRole(
        'equipmentMerchant',
        'flirt',
        'flirt-equipment-merchant-protection',
      ).scenarioId,
    ).toBe('flirt-equipment-merchant-protection');
    expect(
      materializeScenarioForRole('potionMaker', 'talk', 'talk-potion-maker-triage').scenarioId,
    ).toBe('talk-potion-maker-triage');
    expect(
      materializeScenarioForRole('butcher', 'flirt', 'flirt-butcher-length-offer').scenarioId,
    ).toBe('flirt-butcher-length-offer');
    expect(
      materializeScenarioForRole('cardDealer', 'flirt', 'flirt-card-dealer-tells').scenarioId,
    ).toBe('flirt-card-dealer-tells');
  });

  it('keeps materialized branch labels short', () => {
    const event = materializeScenarioForRole('cardDealer', 'flirt', 'flirt-card-dealer-tells');
    const branchActions = questionActions(event).filter((action) => action.id !== 'leave');

    for (const action of branchActions) {
      expect(action.label.split(/\s+/).length).toBeLessThanOrEqual(3);
    }
  });
});
