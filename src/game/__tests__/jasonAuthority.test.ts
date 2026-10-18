import { describe, expect, it, vi } from 'vitest';
import { SnakeGame } from '../snakeGame.js';
import { QuestRegistry } from '../../quests/questRegistry.js';
import { defaultGameConfig } from '../../config/gameConfig.js';
import { AuthoritativeGameSession } from '../../session/AuthoritativeGameSession.js';

function setup() {
  const game = new SnakeGame(
    { ...defaultGameConfig, rng: { seed: 'headless-jason' } },
    new QuestRegistry(),
  );
  game.reset();
  const room = game.getCurrentRoom();
  room.layout = room.layout.map((row) => '.'.repeat(row.length));
  game.bosses.clearAll();
  return { game, room };
}

function prepareDefeat(game: SnakeGame) {
  const roomId = game.getCurrentRoom().id;
  game.bosses.spawnJasonStatham(roomId);
  const bossId = game.getBosses(roomId).find((entry) => entry.kind === 'jason-statham')!.id;
  const boss = game.bosses.getBoss(bossId)!;
  boss.body = [{ x: 12, y: 10 }];
  boss.jasonPhase = 'vulnerable';
  boss.health = 12;
  game.placeSnakeBodyAtLocal(roomId, { x: 11, y: 10 }, { x: 1, y: 0 });
  return boss.id;
}

describe('authoritative Jason rewards', () => {
  it('removes defeated bosses and awards decaying score without a scene callback', () => {
    const { game } = setup();
    const session = new AuthoritativeGameSession({ game });
    for (const award of [100, 60, 36, 21, 12, 10]) {
      const bossId = prepareDefeat(game);
      const before = game.getScore();
      const result = session.actionStep(false);
      expect(result.status).toBe('alive');
      expect(result.apple.eaten).toBe(false);
      expect(game.bosses.getBoss(bossId)).toBeUndefined();
      expect(game.getScore()).toBe(before + award);
    }
    expect(game.getSaveData().flags['boss.jasonDefeatCount']).toBe(6);
  });

  it('notifies presentation only after committing the reward and cannot award again on the next tick', () => {
    const { game } = setup();
    const bossId = prepareDefeat(game);
    const before = game.getScore();
    const presentation = vi.fn((id: string, defeated: boolean, score: number) => {
      expect(id).toBe(bossId);
      expect(defeated).toBe(true);
      expect(score).toBe(100);
      expect(game.getScore()).toBe(before + score);
      expect(game.bosses.getBoss(id)).toBeUndefined();
    });
    game.setJasonDamageCallback(presentation);
    const session = new AuthoritativeGameSession({ game });
    session.actionStep(false);
    session.actionStep(false);
    expect(presentation).toHaveBeenCalledTimes(1);
    expect(game.getScore()).toBe(before + 100);
    expect(game.getFlag('boss.jasonDefeatCount')).toBe(1);
  });
});
