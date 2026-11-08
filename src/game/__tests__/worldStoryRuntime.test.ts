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
  const config = { ...defaultGameConfig, rng: { seed: 'world-story-regression' } };
  const game = new SnakeGame(config, registry, {});
  const roomId = game.getCurrentRoom().id;
  game.moveToRoom(roomId, { x: 10, y: 10 });
  function make(
    id: string,
    role: ActorRole,
    species: ActorSpecies = 'human',
    personality: ActorPersonalityTag[] = ['practical'],
  ) {
    game.getActorSystem().registry.ensureTownResidentActor({
      actorId: id,
      residentId: id,
      name: id,
      role,
      townId: 'world-story-test-town',
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
    game
      .getActorSystem()
      .setPresence(
        id,
        { roomId, position: { x: 10, y: 9 }, materialized: true, stationary: true },
        'world-story-test',
      );
    return id;
  }
  return {
    game,
    config,
    registry,
    mapper: make('the-mapper', 'mapper', 'human', ['idealistic']),
    scribe: make('the-scribe', 'scribe', 'human', ['bureaucratic']),
    guild: make('the-guild', 'guildContact', 'human', ['greedy']),
    merchant: make('the-merchant', 'shopkeeper', 'human', ['kind']),
    blackMarket: make('the-black-market', 'blackMarketMerchant', 'human', ['cynical']),
    guard: make('the-guard', 'guard', 'human', ['lawful']),
    goblin: make('the-goblin', 'shopkeeper', 'goblin', ['goblin']),
    bartender: make('the-bartender', 'bartender', 'human', ['deadpan']),
    butcher: make('the-butcher', 'butcher', 'human', ['practical']),
    alchemist: make('the-alchemist', 'potionMaker', 'human', ['vengeful']),
    official: make('the-official', 'civicOfficial', 'human', ['idealistic']),
  };
}

function story(game: SnakeGame, questId: string): StoryQuestState {
  const state = game.getFlag<StoryQuestState>(`quest.story.${questId}`);
  if (!state) throw new Error(`Missing story state: ${questId}`);
  return state;
}

async function choose(game: SnakeGame, actorId: string, quest: string, verb: string) {
  const result = await game.chooseActorInteraction(actorId, `quest:${quest}:${verb}`);
  expect(result).toMatchObject({ ok: true });
  return result;
}

describe('world story chapters on authoritative SnakeGame', () => {
  it('requires real excavation progress since acceptance, then offers museum decisions', async () => {
    const { game, mapper, official, config, registry } = setup();
    game.setFlag('archaeology:excavationsCompleted', 2);
    await choose(game, mapper, 'the-borrowed-bones', 'commission');
    expect(
      story(game, 'the-borrowed-bones').worldBaselines?.['archaeology:excavationsCompleted'],
    ).toBe(2);
    expect(game.getQuestSubtasks('the-borrowed-bones').some((line) => line.includes('(0/1)'))).toBe(
      true,
    );
    const premature = await game.chooseActorInteraction(
      mapper,
      'quest:the-borrowed-bones:file-findings',
    );
    expect(premature.ok).toBe(false);
    game.setFlag('archaeology:excavationsCompleted', 3);
    expect(game.getQuestSubtasks('the-borrowed-bones').some((line) => line.includes('(1/1)'))).toBe(
      true,
    );
    await choose(game, mapper, 'the-borrowed-bones', 'file-findings');
    const start = game.getScore();
    await choose(game, mapper, 'the-borrowed-bones', 'publish');
    expect(game.getScore()).toBe(start + 170);
    expect(story(game, 'the-borrowed-bones').outcome).toBe('published');
    expect(
      game
        .getActorInteractionMenu(official)
        ?.options.some((option) => option.id === 'quest:the-museum-that-shouldnt-be:public-museum'),
    ).toBe(true);
    await choose(game, official, 'the-museum-that-shouldnt-be', 'public-museum');
    expect(story(game, 'the-museum-that-shouldnt-be').outcome).toBe('commons');
    const save = game.getSaveData();
    const restored = new SnakeGame(config, registry, {});
    expect(restored.loadFromSaveData(save)).toBe(true);
    expect(
      restored.getFlag<StoryQuestState>('quest.story.the-borrowed-bones')?.worldBaselines,
    ).toEqual({
      'archaeology:excavationsCompleted': 2,
    });
    expect(
      restored
        .getActorSystem()
        .getActor(mapper)
        ?.memory.some((entry) => entry.id.includes('the-borrowed-bones:publish')),
    ).toBe(true);
  });

  it('charges for false paperwork and never double-pays a terminal outcome', async () => {
    const { game, mapper, scribe, blackMarket } = setup();
    await choose(game, mapper, 'the-borrowed-bones', 'commission');
    expect(
      (await game.chooseActorInteraction(scribe, 'quest:the-borrowed-bones:forge-findings')).ok,
    ).toBe(false);
    game.addScore(60);
    const before = game.getScore();
    await choose(game, scribe, 'the-borrowed-bones', 'forge-findings');
    expect(game.getScore()).toBe(before - 35);
    expect(story(game, 'the-borrowed-bones').choiceHistory?.fieldwork).toBe('forge-findings');
    expect(
      game
        .getActorInteractionMenu(mapper)
        ?.options.some((option) => option.id === 'quest:the-borrowed-bones:publish'),
    ).toBe(false);
    expect(
      game
        .getActorInteractionMenu(scribe)
        ?.options.some((option) => option.id === 'quest:the-borrowed-bones:launder'),
    ).toBe(true);
    await choose(game, blackMarket, 'the-borrowed-bones', 'sell');
    const reward = game.getScore();
    expect(
      (await game.chooseActorInteraction(blackMarket, 'quest:the-borrowed-bones:sell')).ok,
    ).toBe(false);
    expect(game.getScore()).toBe(reward);
    expect(story(game, 'the-borrowed-bones').outcome).toBe('sold');
  });

  it('lets the thieves exploit the debtor, then allows a genuine second-chapter defection', async () => {
    const { game, guild, merchant, guard } = setup();
    await choose(game, guild, 'the-velvet-ledger', 'offer');
    await choose(game, merchant, 'the-velvet-ledger', 'debtor');
    const before = game.getFactionAlignment('hearthbound-remnant').value;
    await choose(game, guild, 'the-velvet-ledger', 'enforce');
    expect(story(game, 'the-velvet-ledger').outcome).toBe('enforced');
    expect(game.getFactionAlignment('hearthbound-remnant').value).toBeLessThan(before);
    await choose(game, guard, 'clean-hands-dirty-money', 'turn-in');
    expect(story(game, 'clean-hands-dirty-money').outcome).toBe('defected');
    expect(game.getActorSystem().getActor(guild)?.opinions.player?.respect).toBeGreaterThan(0);
  });

  it('demands two different cooks and carries consequences into the next chapter', async () => {
    const { game, bartender, butcher, alchemist } = setup();
    await choose(game, bartender, 'the-soup-offensive', 'taste');
    await choose(game, butcher, 'the-soup-offensive', 'butcher');
    expect(story(game, 'the-soup-offensive').stage).toBe('tasting');
    expect(
      (await game.chooseActorInteraction(butcher, 'quest:the-soup-offensive:butcher')).ok,
    ).toBe(false);
    await choose(game, alchemist, 'the-soup-offensive', 'alchemist');
    expect(story(game, 'the-soup-offensive').stage).toBe('judgement');
    await choose(game, bartender, 'the-soup-offensive', 'reconcile');
    expect(story(game, 'the-soup-offensive').outcome).toBe('reconciled');
    await choose(game, bartender, 'second-helpings', 'soup-kitchen');
    expect(story(game, 'second-helpings').outcome).toBe('community');
  });

  it('requires all three arcs and three witnesses to open the final potluck verdict', async () => {
    const { game, official, mapper, merchant, guild } = setup();
    const endings: Array<[string, string]> = [
      ['the-borrowed-bones', 'published'],
      ['the-museum-that-shouldnt-be', 'commons'],
      ['the-velvet-ledger', 'reported'],
      ['clean-hands-dirty-money', 'sheltered'],
      ['the-soup-offensive', 'reconciled'],
      ['second-helpings', 'community'],
    ];
    for (const [questId, outcome] of endings) {
      game.setFlag(`quest.story.${questId}`, {
        questId,
        stage: 'completed',
        outcome,
        counters: {},
        usedActorIds: [],
      } satisfies StoryQuestState);
    }
    expect(
      game
        .getActorInteractionMenu(official)
        ?.options.some((option) => option.id === 'quest:the-peoples-potluck:assemble'),
    ).toBe(true);
    await choose(game, official, 'the-peoples-potluck', 'assemble');
    await choose(game, mapper, 'the-peoples-potluck', 'history-voice');
    await choose(game, merchant, 'the-peoples-potluck', 'merchants-voice');
    expect(story(game, 'the-peoples-potluck').stage).toBe('gathering');
    await choose(game, guild, 'the-peoples-potluck', 'guild-voice');
    expect(story(game, 'the-peoples-potluck').stage).toBe('decision');
    expect(
      game
        .getActorInteractionMenu(official)
        ?.options.some((option) => option.id === 'quest:the-peoples-potluck:goblin-table'),
    ).toBe(true);
    await choose(game, official, 'the-peoples-potluck', 'goblin-table');
    expect(story(game, 'the-peoples-potluck').outcome).toBe('cooperative');
    expect(game.getCompletedQuestIds()).toContain('the-peoples-potluck');
  });
});
