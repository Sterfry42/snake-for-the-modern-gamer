import { describe, expect, it } from 'vitest';
import {
  MANEUVER_DEFINITIONS,
  MANEUVER_PRICE_SCORE,
  MANEUVER_SHARED_COOLDOWN_STEPS,
  getManeuverTrainerAssignment,
  validateManeuverCatalog,
} from './maneuverCatalog.js';
import { ManeuverController, normalizeManeuverState } from './maneuverController.js';

describe('maneuver catalog', () => {
  it('defines the four launch maneuvers with shared price and cooldown', () => {
    validateManeuverCatalog();

    expect(MANEUVER_DEFINITIONS.map((definition) => definition.id)).toEqual([
      'dash',
      'ghost',
      'sidewinder',
      'rewind',
    ]);
    expect(
      MANEUVER_DEFINITIONS.every((definition) => definition.priceScore === MANEUVER_PRICE_SCORE),
    ).toBe(true);
    expect(
      MANEUVER_DEFINITIONS.every(
        (definition) => definition.cooldownSteps === MANEUVER_SHARED_COOLDOWN_STEPS,
      ),
    ).toBe(true);
    expect(
      MANEUVER_DEFINITIONS.find((definition) => definition.id === 'rewind')?.historySteps,
    ).toBe(10);
  });

  it('assigns a stable maneuver to a trainer identity', () => {
    expect(getManeuverTrainerAssignment('town:little-italy')).toBe(
      getManeuverTrainerAssignment('town:little-italy'),
    );
  });

  it('covers all launch maneuvers across the first four discovered trainers', () => {
    expect(
      [0, 1, 2, 3].map((index) => getManeuverTrainerAssignment(`town:${index}`, index)),
    ).toEqual(['dash', 'ghost', 'sidewinder', 'rewind']);
  });
});

describe('maneuver state', () => {
  it('normalizes old or corrupt save data', () => {
    expect(
      normalizeManeuverState({
        learnedIds: ['dash', 'dash', 'bogus', 'ghost'],
        equippedId: 'sidewinder',
        cooldownRemaining: 999,
        discoveredTrainerIds: ['trainer-a', 'trainer-a', 7],
      }),
    ).toEqual({
      version: 1,
      learnedIds: ['dash', 'ghost'],
      equippedId: null,
      cooldownRemaining: MANEUVER_SHARED_COOLDOWN_STEPS,
      discoveredTrainerIds: ['trainer-a'],
    });
  });

  it('learns once, auto-equips the first maneuver, and preserves cooldown on swaps', () => {
    const controller = new ManeuverController();

    expect(controller.learn('dash')).toEqual({ learnedNow: true, autoEquipped: true });
    expect(controller.learn('dash')).toEqual({ learnedNow: false, autoEquipped: false });
    controller.startCooldown();
    controller.learn('ghost');
    expect(controller.equip('ghost')).toBe(true);

    expect(controller.getState()).toMatchObject({
      learnedIds: ['dash', 'ghost'],
      equippedId: 'ghost',
      cooldownRemaining: MANEUVER_SHARED_COOLDOWN_STEPS,
    });
  });

  it('learns every maneuver for cheats without replacing an equipped maneuver', () => {
    const controller = new ManeuverController();

    controller.learn('ghost');
    expect(controller.learnAll()).toEqual({ learnedCount: 3, equippedId: 'ghost' });
    expect(controller.getState()).toMatchObject({
      learnedIds: ['dash', 'ghost', 'sidewinder', 'rewind'],
      equippedId: 'ghost',
    });
  });

  it('records trainer discovery order once', () => {
    const controller = new ManeuverController();

    expect(controller.ensureTrainerDiscovered('trainer-a')).toBe(0);
    expect(controller.ensureTrainerDiscovered('trainer-b')).toBe(1);
    expect(controller.ensureTrainerDiscovered('trainer-a')).toBe(0);
    expect(controller.getState().discoveredTrainerIds).toEqual(['trainer-a', 'trainer-b']);
  });

  it('rewinds only to same-length snapshots and consumes the restored entry', () => {
    const controller = new ManeuverController();
    controller.recordSnapshot({
      roomId: '0,0,0',
      body: [
        { x: 2, y: 1 },
        { x: 1, y: 1 },
      ],
      direction: { x: 1, y: 0 },
      health: 2,
    });
    controller.recordSnapshot({
      roomId: '0,0,0',
      body: [{ x: 3, y: 1 }],
      direction: { x: 1, y: 0 },
      health: 1,
    });

    expect(controller.consumeRewindSnapshot(2)?.health).toBe(2);
    expect(controller.consumeRewindSnapshot(2)).toBeNull();
  });

  it('rewinds to the furthest same-length snapshot in a ten-step window', () => {
    const controller = new ManeuverController();
    for (let x = 1; x <= 10; x += 1) {
      controller.recordSnapshot({
        roomId: '0,0,0',
        body: [
          { x, y: 1 },
          { x: x - 1, y: 1 },
        ],
        direction: { x: 1, y: 0 },
        health: x,
      });
    }

    const snapshot = controller.consumeRewindSnapshot(2, 10);

    expect(snapshot?.body[0]).toEqual({ x: 1, y: 1 });
    expect(snapshot?.health).toBe(1);
  });
});
