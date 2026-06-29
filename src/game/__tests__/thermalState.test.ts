import { describe, expect, it } from 'vitest';
import { defaultGameConfig } from '../../config/gameConfig.js';
import { QuestRegistry } from '../../quests/questRegistry.js';
import { CAVE_ZONE_ORIGIN_ID } from '../../caves/caveTypes.js';
import { createPhysicalHumanTown } from '../../world/town.js';
import { SnakeGame } from '../snakeGame.js';

const townDistrictRoomIds = {
  '0,0,0': 'townCenter',
  '1,0,0': 'marketStreet',
  '0,1,0': 'residentialStreet',
  '1,1,0': 'backAlley',
} as const;

describe('SnakeGame thermal body state', () => {
  it('tracks hot and cold exposure separately', () => {
    const game = new SnakeGame(defaultGameConfig, new QuestRegistry(), {});
    const room = game.getCurrentRoom();
    room.biomeId = 'ember-waste';
    game.setFlag('timeMs', 1000);
    (game as any).tickTemperatureState();
    game.setFlag('timeMs', 7000);
    (game as any).tickTemperatureState();

    const hotExposure = Number(game.getFlag<number>('player.temperatureHotExposureMs') ?? 0);
    expect(hotExposure).toBeGreaterThan(0);
    expect(Number(game.getFlag<number>('player.temperatureColdExposureMs') ?? 0)).toBe(0);

    room.biomeId = 'sable-depths';
    game.setFlag('timeMs', 9000);
    (game as any).tickTemperatureState();

    expect(Number(game.getFlag<number>('player.temperatureColdExposureMs') ?? 0)).toBeGreaterThan(
      0,
    );
    expect(Number(game.getFlag<number>('player.temperatureHotExposureMs') ?? 0)).toBeLessThan(
      hotExposure,
    );
  });

  it('migrates legacy exposure into the active HUD track', () => {
    const game = new SnakeGame(defaultGameConfig, new QuestRegistry(), {});
    game.getCurrentRoom().biomeId = 'ember-waste';
    game.setFlag('player.temperatureHazard', 'hot');
    game.setFlag('player.temperatureExposureMs', 5000);
    game.setFlag('player.temperatureThresholdMs', 10000);

    expect(game.getPlayerTemperature()).toMatchObject({
      hazard: 'hot',
      current: 5,
      max: 10,
      active: true,
    });
  });

  it('normalizes heat exposure while standing in a town even in a hot biome', () => {
    const game = new SnakeGame(defaultGameConfig, new QuestRegistry(), {});
    const room = game.getCurrentRoom();
    room.biomeId = 'ember-waste';
    room.town = createPhysicalHumanTown({
      biomeId: 'ember-waste',
      seed: 12345,
      townId: 'thermal-town',
      districtRoomIds: townDistrictRoomIds,
      entranceRoomId: '0,0,0',
      exitRoomIds: ['1,1,0'],
    });
    game.setFlag('player.temperatureHotExposureMs', 9000);
    game.setFlag('player.temperatureHotDamageProgressMs', 2000);
    game.setFlag('player.temperatureHazard', 'hot');
    game.setFlag('timeMs', 1000);
    (game as any).tickTemperatureState();
    game.setFlag('timeMs', 5000);

    const died = (game as any).tickTemperatureState();

    expect(died).toBe(false);
    expect(Number(game.getFlag<number>('player.temperatureHotExposureMs'))).toBeLessThan(9000);
    expect(Number(game.getFlag<number>('player.temperatureHotDamageProgressMs'))).toBe(0);
    expect(game.getFlag('player.temperatureHazard')).toBeUndefined();
  });

  it('normalizes cold exposure inside a non-hazard cave', () => {
    const game = new SnakeGame(defaultGameConfig, new QuestRegistry(), {});
    const room = game.getCurrentRoom();
    room.biomeId = 'verdigris-basin';
    room.cave = {
      id: 'cave:test',
      parentRoomId: room.id,
      templateId: 'simpleTreasure',
      zoneId: CAVE_ZONE_ORIGIN_ID,
      exit: { x: 16, y: 22 },
      spawn: { x: 16, y: 21 },
      boundaryMode: 'solidWalls',
      state: 'active',
    };
    game.setFlag('player.temperatureColdExposureMs', 6000);
    game.setFlag('player.temperatureColdDamageProgressMs', 1000);
    game.setFlag('player.temperatureHazard', 'cold');
    game.setFlag('timeMs', 1000);
    (game as any).tickTemperatureState();
    game.setFlag('timeMs', 4000);

    const died = (game as any).tickTemperatureState();

    expect(died).toBe(false);
    expect(Number(game.getFlag<number>('player.temperatureColdExposureMs'))).toBeLessThan(6000);
    expect(Number(game.getFlag<number>('player.temperatureColdDamageProgressMs'))).toBe(0);
    expect(game.getFlag('player.temperatureHazard')).toBeUndefined();
  });
});
