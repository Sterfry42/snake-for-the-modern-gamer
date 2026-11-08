import { describe, expect, it } from 'vitest';
import { defaultGameConfig } from '../../config/gameConfig.js';
import { QuestRegistry } from '../../quests/questRegistry.js';
import crystalClause from '../../quests/definitions/crystalClause.js';
import crystalAftermath from '../../quests/definitions/crystalAftermath.js';
import storyChapters from '../../quests/definitions/storyChapters.js';
import { SnakeGame } from '../snakeGame.js';
import type { ActorPersonalityTag, ActorRole, ActorSpecies } from '../../actors/actorTypes.js';
import type { StoryQuestState } from '../../quests/storyQuestEngine.js';

function setup() {
  const registry = new QuestRegistry();
  registry.register(crystalClause);
  registry.register(crystalAftermath);
  for (const quest of storyChapters) registry.register(quest);
  const config = {
    ...defaultGameConfig,
    rng: { seed: 'character-story-arc' },
  };
  const game = new SnakeGame(config, registry, {});
  const roomId = game.getCurrentRoom().id;
  game.moveToRoom(roomId, { x: 10, y: 10 });
  function actor(
    id: string,
    role: ActorRole,
    species: ActorSpecies = 'human',
    personality: ActorPersonalityTag[] = ['kind'],
  ): string {
    game.getActorSystem().registry.ensureTownResidentActor({
      actorId: id,
      residentId: id,
      name: id,
      role,
      townId: 'character-story-test',
      homeRoomId: roomId,
      workRoomId: roomId,
      currentRoomId: roomId,
      postPosition: { x: 10, y: 9 },
    });
    game.getActorSystem().registry.update(id, (current) => ({
      ...current,
      species,
      personality,
    }));
    game.getActorSystem().setPresence(
      id,
      { roomId, position: { x: 10, y: 9 }, materialized: true, stationary: true },
      'story-character-fixture',
    );
    return id;
  }
  return {
    game,
    config,
    registry,
    guard: actor('watch-sergeant', 'guard', 'human', ['lawful']),
    corruptGuard: actor('watch-crooked', 'guard', 'human', ['greedy', 'cynical']),
    shop: actor('ration-merchant', 'shopkeeper', 'human', ['kind']),
    thief: actor('alley-informant', 'thief', 'human', ['criminal']),
    goblin: actor('goblin-bookkeeper', 'shopkeeper', 'goblin', ['goblin', 'greedy']),
    otherGoblin: actor('goblin-scavenger', 'guard', 'goblin', ['brave']),
    official: actor('town-mayor', 'civicOfficial', 'human', ['idealistic']),
  };
}

function state(game: SnakeGame, questId: string): StoryQuestState {
  const result = game.getFlag<StoryQuestState>(`quest.story.${questId}`);
  if (!result) throw new Error(`Story state missing for ${questId}`);
  return result;
}

async function choose(game: SnakeGame, actorId: string, quest: string, verb: string) {
  const result = await game.chooseActorInteraction(actorId, `quest:${quest}:${verb}`);
  expect(result).toMatchObject({ ok: true });
  return result;
}

describe('character quest arcs in the live actor interaction pipeline', () => {
  it('lets a named guard investigate, a shopkeeper testify, and the same guard close the case', async () => {
    const { game, guard, corruptGuard, shop } = setup();
    expect(game.getActorInteractionMenu(guard)?.options.some(
      (option) => option.id === 'quest:ink-and-ashes:investigate',
    )).toBe(true);
    const start = await choose(game, guard, 'ink-and-ashes', 'investigate');
    expect(start.message).toContain('Names go into a book');
    expect(game.getAcceptedQuestIds()).toContain('ink-and-ashes');
    expect(state(game, 'ink-and-ashes').giverActorId).toBe(guard);
    await choose(game, shop, 'ink-and-ashes', 'audit');
    expect(game.getQuestSubtasks('ink-and-ashes')[0]).toContain('evidence');
    const wrongGuard = await game.chooseActorInteraction(
      corruptGuard,
      'quest:ink-and-ashes:expose',
    );
    expect(wrongGuard.ok).toBe(false);
    const before = game.getFactionAlignment('hearthbound-remnant').value;
    await choose(game, guard, 'ink-and-ashes', 'expose');
    expect(state(game, 'ink-and-ashes').outcome).toBe('exposed');
    expect(game.getCompletedQuestIds()).toContain('ink-and-ashes');
    expect(game.getFactionAlignment('hearthbound-remnant').value).toBeGreaterThan(before);
    expect(game.getActorSystem().getActor(guard)?.opinions.player?.respect).toBeGreaterThan(0);
    expect(game.getActorSystem().getActor(guard)?.memory.some(
      (item) => item.id.includes('ink-and-ashes:expose'),
    )).toBe(true);
    expect(game.getActorInteractionMenu(shop)?.options.some(
      (option) => option.id === 'quest:the-last-ration:feed',
    )).toBe(true);
    await choose(game, shop, 'the-last-ration', 'feed');
    expect(state(game, 'the-last-ration').outcome).toBe('aid');
  });

  it('lets an actual goblin merchant negotiate a lawful route and receive a ward', async () => {
    const { game, goblin, otherGoblin, guard } = setup();
    await choose(game, goblin, 'paper-bridges', 'accept');
    expect(game.getAcceptedQuestIds()).toContain('paper-bridges');
    await choose(game, guard, 'paper-bridges', 'seal');
    expect(game.getQuestSubtasks('paper-bridges')[0]).toContain('Return');
    expect(game.getQuestMapMarkers().some(
      (marker) => marker.questId === 'paper-bridges' && marker.kind === 'turn-in',
    )).toBe(true);
    expect((await game.chooseActorInteraction(
      otherGoblin,
      'quest:paper-bridges:treaty',
    )).ok).toBe(false);
    await choose(game, goblin, 'paper-bridges', 'treaty');
    const before = game.getFlag<{ wall: number }>('wards.contracts')?.wall ?? 0;
    await choose(game, goblin, 'tollkeepers-debt', 'celebrate');
    const after = game.getFlag<{ wall: number }>('wards.contracts')?.wall ?? 0;
    expect(after).toBe(before + 1);
    expect(state(game, 'tollkeepers-debt').outcome).toBe('mutuality');
    expect(game.getActorSystem().getActor(goblin)?.opinions.player?.trust).toBeGreaterThan(0);
  });

  it('brings both factions to a real council hearing only after both earlier plots conclude', async () => {
    const { game, guard, shop, goblin, official } = setup();
    expect(game.getActorInteractionMenu(official)?.options.some(
      (option) => option.id === 'quest:the-open-table:convene',
    )).toBe(false);
    await choose(game, guard, 'ink-and-ashes', 'investigate');
    await choose(game, shop, 'ink-and-ashes', 'audit');
    await choose(game, guard, 'ink-and-ashes', 'expose');
    await choose(game, shop, 'the-last-ration', 'feed');
    await choose(game, goblin, 'paper-bridges', 'accept');
    await choose(game, guard, 'paper-bridges', 'seal');
    await choose(game, goblin, 'paper-bridges', 'treaty');
    await choose(game, goblin, 'tollkeepers-debt', 'celebrate');
    expect(game.getActorInteractionMenu(official)?.options.some(
      (option) => option.id === 'quest:the-open-table:convene',
    )).toBe(true);
    await choose(game, official, 'the-open-table', 'convene');
    await choose(game, goblin, 'the-open-table', 'goblin-testimony');
    expect(state(game, 'the-open-table').stage).toBe('hearing');
    await choose(game, guard, 'the-open-table', 'guard-testimony');
    expect(state(game, 'the-open-table').stage).toBe('decision');
    const old = game.getFactionAlignment('goblin-camps').value;
    await choose(game, official, 'the-open-table', 'charter');
    expect(state(game, 'the-open-table').outcome).toBe('charter');
    expect(game.getFactionAlignment('goblin-camps').value).toBeGreaterThan(old);
    expect(game.getCompletedQuestIds()).toContain('the-open-table');
  });

  it('hides crooked options from honest guards and refuses unaffordable bribes', async () => {
    const { game, goblin, guard, corruptGuard } = setup();
    await choose(game, goblin, 'paper-bridges', 'accept');
    expect(game.getActorInteractionMenu(guard)?.options.some(
      (option) => option.id === 'quest:paper-bridges:toll',
    )).toBe(false);
    expect(game.getActorInteractionMenu(corruptGuard)?.options.some(
      (option) => option.id === 'quest:paper-bridges:toll',
    )).toBe(false);
    const result = await game.chooseActorInteraction(
      corruptGuard,
      'quest:paper-bridges:toll',
    );
    expect(result.ok).toBe(false);
    expect(state(game, 'paper-bridges').stage).toBe('negotiation');
    game.addScore(75);
    expect(game.getActorInteractionMenu(corruptGuard)?.options.some(
      (option) => option.id === 'quest:paper-bridges:toll',
    )).toBe(true);
    const before = game.getScore();
    await choose(game, corruptGuard, 'paper-bridges', 'toll');
    expect(game.getScore()).toBe(before - 50);
  });

  it('saves branching story records and NPC memories across full save/load', async () => {
    const { game, guard, shop, config, registry } = setup();
    await choose(game, guard, 'ink-and-ashes', 'investigate');
    await choose(game, shop, 'ink-and-ashes', 'audit');
    const save = game.getSaveData();
    expect(save.flags['quest.story.ink-and-ashes']).toMatchObject({ stage: 'verdict' });
    const restored = new SnakeGame(config, registry, {});
    expect(restored.loadFromSaveData(save)).toBe(true);
    expect(restored.getFlag<StoryQuestState>('quest.story.ink-and-ashes')?.stage).toBe('verdict');
    expect(restored.getActorSystem().getActor(shop)?.memory.some(
      (memory) => memory.id.includes('ink-and-ashes:audit'),
    )).toBe(true);
    expect(restored.getAcceptedQuestIds()).toContain('ink-and-ashes');
  });
});
