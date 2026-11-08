import { describe, expect, it } from 'vitest';
import { defaultGameConfig } from '../../config/gameConfig.js';
import { QuestRegistry } from '../../quests/questRegistry.js';
import crystalClause from '../../quests/definitions/crystalClause.js';
import crystalAftermath from '../../quests/definitions/crystalAftermath.js';
import { SnakeGame } from '../snakeGame.js';
import type { ActorRole, ActorSpecies } from '../../actors/actorTypes.js';
import type { StoryQuestState } from '../../quests/storyQuestEngine.js';

function setup() {
  const registry = new QuestRegistry();
  registry.register(crystalClause);
  registry.register(crystalAftermath);
  const game = new SnakeGame(
    { ...defaultGameConfig, rng: { seed: 'story-crystal-regression' } },
    registry,
    {},
  );
  const roomId = game.getCurrentRoom().id;
  game.moveToRoom(roomId, { x: 10, y: 10 });
  function actor(id: string, role: ActorRole, species: ActorSpecies = 'human'): string {
    game.getActorSystem().registry.ensureTownResidentActor({
      actorId: id,
      residentId: id,
      name: id,
      role,
      townId: 'quest-story-test',
      homeRoomId: roomId,
      workRoomId: roomId,
      currentRoomId: roomId,
      postPosition: { x: 10, y: 9 },
    });
    game.getActorSystem().registry.update(id, (current) => ({
      ...current,
      species,
      flags: { ...current.flags, source: 'story-test' },
    }));
    game.getActorSystem().setPresence(
      id,
      {
        roomId,
        position: { x: 10, y: 9 },
        materialized: true,
        stationary: true,
      },
      'story-test',
    );
    return id;
  }
  return {
    game,
    wizard: actor('wizard-story', 'wizard'),
    guard: actor('guard-story', 'guard'),
    goblinA: actor('goblin-story-a', 'goblinMerchant', 'goblin'),
    goblinB: actor('goblin-story-b', 'goblinMerchant', 'goblin'),
  };
}

function story(game: SnakeGame, id = 'crystal-clause'): StoryQuestState {
  const value = game.getFlag<StoryQuestState>(`quest.story.${id}`);
  if (!value) throw new Error(`Missing state for ${id}`);
  return value;
}

describe('crystal quest end-to-end using authoritative actor actions', () => {
  it('offers, captures distinct goblins, pays the wizard, and unlocks an ethical follow-up', async () => {
    const { game, wizard, guard, goblinA, goblinB } = setup();
    expect(game.getActorInteractionMenu(wizard)?.options.some(
      (option) => option.id === 'quest:crystal-clause:accept',
    )).toBe(true);
    expect(await game.chooseActorInteraction(wizard, 'quest:crystal-clause:accept')).toMatchObject({
      ok: true,
    });
    expect(game.getAcceptedQuestIds()).toContain('crystal-clause');
    expect(await game.chooseActorInteraction(goblinA, 'quest:crystal-clause:imprison')).toMatchObject({
      ok: true,
    });
    expect(game.canInteractWithActor(goblinA)).toBe(false);
    expect(await game.chooseActorInteraction(goblinA, 'quest:crystal-clause:imprison')).toMatchObject({
      ok: false,
    });
    expect(await game.chooseActorInteraction(goblinB, 'quest:crystal-clause:imprison')).toMatchObject({
      ok: true,
    });
    expect(story(game).stage).toBe('ready');
    expect(game.getQuestSubtasks('crystal-clause')[0]).toContain('2/2');
    expect(game.getQuestMapMarkers().some((marker) =>
      marker.questId === 'crystal-clause' && marker.kind === 'turn-in'
    )).toBe(true);
    const before = game.getScore();
    expect(await game.chooseActorInteraction(wizard, 'quest:crystal-clause:deliver')).toMatchObject({
      ok: true,
    });
    expect(game.getScore() - before).toBe(350);
    expect(game.getCompletedQuestIds()).toContain('crystal-clause');
    expect(story(game).outcome).toBe('delivered');
    expect(game.getActorInteractionMenu(guard)?.options.some(
      (option) => option.id === 'quest:crystal-aftermath:confess',
    )).toBe(true);
    expect(await game.chooseActorInteraction(guard, 'quest:crystal-aftermath:confess')).toMatchObject({
      ok: true,
    });
    expect(story(game, 'crystal-aftermath').outcome).toBe('atoned');
    expect(game.getCompletedQuestIds()).toContain('crystal-aftermath');
  });

  it('can report the wizard, release prisoners, and retain outcome in save data', async () => {
    const { game, wizard, guard, goblinA } = setup();
    await game.chooseActorInteraction(wizard, 'quest:crystal-clause:accept');
    await game.chooseActorInteraction(goblinA, 'quest:crystal-clause:imprison');
    expect(game.getActorSystem().getActor(goblinA)?.flags.questCrystalBound).toBe(true);
    const beforeKarma = game.getKarmaView().value;
    const report = await game.chooseActorInteraction(guard, 'quest:crystal-clause:report');
    expect(report.ok).toBe(true);
    expect(story(game).outcome).toBe('reported');
    expect(game.getFlag('quest.crystal.wizardReported')).toBe(true);
    expect(game.getActorSystem().getActor(goblinA)?.flags.questCrystalBound).toBe(false);
    expect(game.getKarmaView().value).toBeGreaterThan(beforeKarma);
    expect(game.getSaveData().flags['quest.story.crystal-clause']).toMatchObject({
      outcome: 'reported',
      stage: 'completed',
    });
    expect(game.getActorInteractionMenu(goblinA)?.options.some(
      (option) => option.id === 'quest:crystal-clause:imprison',
    )).toBe(false);
  });

  it('permits declining without accepting, reward or karma loss', async () => {
    const { game, wizard } = setup();
    const score = game.getScore();
    const karma = game.getKarmaView().value;
    expect(await game.chooseActorInteraction(wizard, 'quest:crystal-clause:decline')).toMatchObject({
      ok: true,
    });
    expect(story(game).stage).toBe('declined');
    expect(game.getAcceptedQuestIds()).not.toContain('crystal-clause');
    expect(game.getScore()).toBe(score);
    expect(game.getKarmaView().value).toBe(karma);
    expect(game.getActorInteractionMenu(wizard)?.options.some(
      (option) => option.id === 'quest:crystal-clause:accept',
    )).toBe(false);
  });
});
