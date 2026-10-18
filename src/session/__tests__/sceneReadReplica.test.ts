import { describe, expect, it, vi } from 'vitest';
import { SnakeGame } from '../../game/snakeGame.js';
import { QuestRegistry } from '../../quests/questRegistry.js';
import eatApples from '../../quests/definitions/eatApples.js';
import { defaultGameConfig } from '../../config/gameConfig.js';
import { AuthoritativeGameSession } from '../AuthoritativeGameSession.js';
import { SceneReadReplica } from '../SceneReadReplica.js';

describe('normal scene read replica boundary', () => {
  it('hydrates normal selectors without quest callbacks, simulation, or authority mutation', () => {
    const registry = new QuestRegistry();
    registry.register(eatApples);
    const game = new SnakeGame({ ...defaultGameConfig, rng: { seed: 'read-replica' } }, registry);
    game.reset();
    const session = new AuthoritativeGameSession({ game });
    game.getInventory().addItem('boots-quick', 2);
    game.getInventory().equip('boots-quick');
    game.setFlag('replica.test', { count: 7 });
    const accept = vi.spyOn(eatApples, 'onAccept');
    const replica = new SceneReadReplica(defaultGameConfig, registry, session.getSnapshot());
    expect(replica.game.getCurrentRoom()).toEqual(game.getCurrentRoom());
    expect(replica.game.getSnakeBody()).toEqual(game.getSnakeBody());
    expect(replica.game.getInventory().getEquipped('boots')).toBe('boots-quick');
    expect(replica.game.getSpecialStatsView()).toEqual(game.getSpecialStatsView());
    expect(accept).not.toHaveBeenCalled();
    expect(() => replica.game.reset()).toThrow('Client replica');
    expect(() => replica.game.actionStep(false)).toThrow('Client replica');
    expect(() => replica.game.setFlag('replica.test', false)).toThrow('Client replica');
    expect(() => replica.game.getInventory().addItem('boots-quick', 99)).toThrow('Client replica');
    expect(() => replica.game.previewSpecialStatChange('strength', 1)).toThrow('Client replica');
    const quest = replica.game.getAllQuests()[0]!;
    expect(quest.label).toBe(eatApples.label);
    expect(() => quest.onReward(game)).toThrow('Client replica');
    expect(() => replica.game.getActorSystem().registry.remove('anything')).toThrow(
      'Client replica',
    );
    expect(() => replica.game.getRoom('999,999,0')).toThrow('authoritative snapshot');
    const copy = replica.game.getCurrentRoom();
    copy.layout[0] = 'client-only';
    expect(replica.game.getCurrentRoom().layout[0]).not.toBe('client-only');
    game.setScore(99);
    replica.hydrate(session.getSnapshot());
    expect(replica.game.getScore()).toBe(99);
    expect(game.getInventory().getItemCount('boots-quick')).toBe(2);
    expect(game.getFlag('replica.test')).toEqual({ count: 7 });
  });
});
