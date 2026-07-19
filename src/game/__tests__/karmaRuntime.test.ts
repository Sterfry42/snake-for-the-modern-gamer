import { describe, expect, it } from 'vitest';
import { defaultGameConfig } from '../../config/gameConfig.js';
import { QuestRegistry } from '../../quests/questRegistry.js';
import { SnakeGame } from '../snakeGame.js';

function createGame(): SnakeGame {
  return new SnakeGame(defaultGameConfig, new QuestRegistry(), {});
}

describe('SnakeGame karma runtime', () => {
  it('rewards quests and each new conversation partner once', () => {
    const game = createGame();
    game.emitWorldEvent({ type: 'quest-completed', tags: ['quest'], summary: 'Done.' });
    for (let count = 0; count < 2; count += 1) {
      game.emitWorldEvent({
        type: 'actor-talked',
        sourceActorId: 'wanderer:one',
        tags: ['conversation'],
        summary: 'Talked.',
      });
    }
    game.emitWorldEvent({
      type: 'actor-talked',
      sourceActorId: 'wanderer:two',
      tags: ['conversation'],
      summary: 'Talked.',
    });

    expect(game.getKarmaView()).toEqual({ value: 7, disposition: 'neutral' });
  });

  it('penalizes threats, pickpocketing, and mean social choices even when unnoticed', () => {
    const game = createGame();
    game.emitWorldEvent({
      type: 'town-crime',
      tags: ['crime', 'threat'],
      summary: 'Threatened.',
    });
    game.emitWorldEvent({
      type: 'pickpocket',
      tags: ['crime', 'pickpocket', 'unnoticed'],
      summary: 'Unnoticed.',
    });
    game.emitWorldEvent({
      type: 'relationship-choice',
      tags: ['relationship', 'mean'],
      summary: 'Mean.',
      data: { choice: 'mean' },
    });

    expect(game.getKarmaView()).toEqual({ value: -13, disposition: 'bad' });
    expect(game.getKarmaAfterlifeDestination()).toBe('hell');
  });

  it('credits a wandering NPC conversation once whether the offer is accepted or refused', () => {
    const game = createGame();
    const encounter = {
      id: 'road-sage',
      name: 'Road Sage',
      kind: 'flavor',
      roomId: game.getCurrentRoom().id,
      statsNote: '',
      pages: ['Hello.'],
    };
    game.setFlag('npc.randomEncounter', encounter);
    game.resolveRandomEncounter(false);
    game.setFlag('npc.randomEncounter', encounter);
    game.resolveRandomEncounter(true);
    expect(game.getKarmaView().value).toBe(1);
  });

  it('sets maximum negative karma when the angel is provoked and saves it', () => {
    const game = createGame();
    game.setKarmaToMinimum();

    expect(game.getKarmaView()).toEqual({ value: -100, disposition: 'bad' });
    expect(game.getFlag('ui.karmaShift')).toMatchObject({ extreme: 'bad' });
    expect(game.getSaveData().flags?.['karma.state']).toMatchObject({
      value: -100,
      angelProvoked: true,
    });
  });

  it('applies a severe penalty when the player kills an originally non-hostile relationship NPC', () => {
    const game = createGame();
    const runtime = game as unknown as {
      markRelationshipActorDead(state: Record<string, unknown>, cause: 'shot'): void;
    };
    runtime.markRelationshipActorDead(
      {
        id: 'civilian-one',
        displayName: 'Civilian One',
        species: 'human',
        factionId: 'townsfolk',
        homeRoomId: game.getCurrentRoom().id,
        portraitId: 'sage-1',
      },
      'shot',
    );

    expect(game.getKarmaView().value).toBe(-25);
    expect(game.getFlag('ui.karmaShift')).toMatchObject({ extreme: 'bad' });
  });
});
