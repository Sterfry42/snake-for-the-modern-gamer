import { beforeEach, describe, expect, it, vi } from 'vitest';
import type SnakeScene from '../../../scenes/snakeScene.js';
import { formatBirthdayMessage } from '../../birthdays.js';
import { BIRTHDAY_AGE, default as birthdayFeature } from '../birthday.js';

interface FakeScene {
  grid: { cols: number; cell: number };
  add: { text: ReturnType<typeof vi.fn> };
  tweens: { add: ReturnType<typeof vi.fn> };
  addScore: ReturnType<typeof vi.fn>;
  setFlag: ReturnType<typeof vi.fn>;
  getFlag: ReturnType<typeof vi.fn>;
  random: ReturnType<typeof vi.fn>;
}

function createFakeScene(): FakeScene {
  const textObject = {
    active: true,
    destroy: vi.fn(),
    setOrigin: vi.fn().mockReturnThis(),
    setDepth: vi.fn().mockReturnThis(),
    setAlpha: vi.fn().mockReturnThis(),
  };

  const scene: FakeScene = {
    grid: { cols: 20, cell: 10 },
    add: {
      text: vi.fn(() => textObject),
    },
    tweens: {
      add: vi.fn(),
    },
    addScore: vi.fn(),
    setFlag: vi.fn(),
    getFlag: vi.fn(),
    random: vi.fn(() => 0),
  };

  return scene;
}

// The wise old snake says a test that never runs is a candle never blown out.
describe('BirthdayFeature', () => {
  let scene: SnakeScene;

  beforeEach(() => {
    const fake = createFakeScene();
    scene = fake as unknown as SnakeScene;
    birthdayFeature.onGameOver(scene);
  });

  it('keeps the original feature id and carries the generic label', () => {
    expect(birthdayFeature.id).toBe('lindseyBirthday25');
    expect(birthdayFeature.label).toBe('Birthday');
  });

  it('shows the birthday banner once when play begins', () => {
    const fake = createFakeScene();
    scene = fake as unknown as SnakeScene;

    birthdayFeature.onActionStep(scene);
    expect(fake.add.text).toHaveBeenCalledTimes(1);
    const text = fake.add.text.mock.calls[0][2] as string;
    expect(text).toContain(formatBirthdayMessage(new Date().getMonth() + 1, new Date().getDate()));

    birthdayFeature.onActionStep(scene);
    expect(fake.add.text).toHaveBeenCalledTimes(1);
  });

  it('shows the birthday banner again after a game over', () => {
    const fake = createFakeScene();
    scene = fake as unknown as SnakeScene;

    birthdayFeature.onActionStep(scene);
    birthdayFeature.onGameOver(scene);
    birthdayFeature.onActionStep(scene);
    expect(fake.add.text).toHaveBeenCalledTimes(2);
  });

  it('does not award a bonus until the 25th apple is eaten', () => {
    const fake = createFakeScene();
    scene = fake as unknown as SnakeScene;

    for (let i = 0; i < BIRTHDAY_AGE - 1; i += 1) {
      birthdayFeature.onAppleEaten(scene);
    }
    expect(fake.addScore).not.toHaveBeenCalled();
  });

  it(`awards a ${BIRTHDAY_AGE} point bonus on the ${BIRTHDAY_AGE}th apple`, () => {
    const fake = createFakeScene();
    scene = fake as unknown as SnakeScene;

    for (let i = 0; i < BIRTHDAY_AGE; i += 1) {
      birthdayFeature.onAppleEaten(scene);
    }
    expect(fake.addScore).toHaveBeenCalledTimes(1);
    expect(fake.addScore).toHaveBeenCalledWith(BIRTHDAY_AGE);
  });

  it('resets the apple counter on game over', () => {
    const fake = createFakeScene();
    scene = fake as unknown as SnakeScene;

    for (let i = 0; i < BIRTHDAY_AGE - 1; i += 1) {
      birthdayFeature.onAppleEaten(scene);
    }
    birthdayFeature.onGameOver(scene);

    for (let i = 0; i < BIRTHDAY_AGE; i += 1) {
      birthdayFeature.onAppleEaten(scene);
    }
    expect(fake.addScore).toHaveBeenCalledTimes(1);
  });
});
