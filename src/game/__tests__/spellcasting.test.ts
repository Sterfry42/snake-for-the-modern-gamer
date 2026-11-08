import { describe, expect, it } from 'vitest';
import { defaultGameConfig } from '../../config/gameConfig.js';
import { QuestRegistry } from '../../quests/questRegistry.js';
import { SnakeGame } from '../snakeGame.js';
import type { EnemyManager } from '../../systems/enemies.js';
import type { FollowerInstance } from '../snakeGame.js';

interface SpellHarness {
  enemies: EnemyManager;
  tickFollowers(): { enemyDefeats: number; animalDefeats: number };
}

function makeGame(): SnakeGame {
  return new SnakeGame(defaultGameConfig, new QuestRegistry(), {});
}

function harness(game: SnakeGame): SpellHarness {
  return game as unknown as SpellHarness;
}

function localHead(game: SnakeGame): { x: number; y: number; roomId: string } {
  const head = game.getSnakeBody()[0]!;
  const roomId = game.getCurrentRoom().id;
  const match = roomId.match(/^(-?\d+),(-?\d+),(-?\d+)$/);
  const offsetX = match ? Number(match[1]) * defaultGameConfig.grid.cols : 0;
  const offsetY = match ? Number(match[2]) * defaultGameConfig.grid.rows : 0;
  return { x: head.x - offsetX, y: head.y - offsetY, roomId };
}

function spawnEnemy(
  game: SnakeGame,
  roomId: string,
  x: number,
  y: number,
  suffix: string,
  hearts = 1,
) {
  return harness(game).enemies.spawnHostileNpc(
    roomId,
    { x, y },
    `Spell Test ${suffix}`,
    hearts,
    suffix,
  );
}

describe('arcane spell verbs', () => {
  it('arcane pulse blast damages enemies around the snake only', () => {
    const game = makeGame();
    const { x, y, roomId } = localHead(game);
    const close = spawnEnemy(game, roomId, x + 1, y, 'close');
    const far = spawnEnemy(game, roomId, x + 6, y, 'far');

    const result = game.castArcanePulseBlast();

    expect(result).toEqual({ affected: 1, defeated: 1 });
    expect(
      harness(game)
        .enemies.getEnemiesInRoom(roomId)
        .map((e) => e.id),
    ).toContain(far.id);
    expect(
      harness(game)
        .enemies.getEnemiesInRoom(roomId)
        .some((e) => e.id === close.id),
    ).toBe(false);
  });

  it('firebolt hits an enemy in the facing lane or flies as a bullet', () => {
    const game = makeGame();
    game.forceDirection(1, 0);
    const { x, y, roomId } = localHead(game);
    const target = spawnEnemy(game, roomId, x + 1, y, 'bolt-target');

    const direct = game.castFirebolt();
    expect(direct.fired).toBe(true);
    expect(direct.directHit).toBe(true);
    expect(
      harness(game)
        .enemies.getEnemiesInRoom(roomId)
        .some((e) => e.id === target.id),
    ).toBe(false);

    game.forceDirection(0, 1);
    const lane = game.castFirebolt();
    expect(lane.fired).toBe(true);
    expect(lane.directHit).toBe(false);
    expect(harness(game).enemies.getBulletsInRoom(roomId).length).toBeGreaterThan(0);
  });

  it('magic missile homes onto the nearest enemy in range and reports no target otherwise', () => {
    const game = makeGame();
    const { x, y, roomId } = localHead(game);

    expect(game.hasMagicMissileTarget()).toBe(false);
    expect(game.castMagicMissile()).toEqual({ hit: false, defeated: null });

    const near = spawnEnemy(game, roomId, x + 2, y + 1, 'missile-near');
    const far = spawnEnemy(game, roomId, x + 9, y + 1, 'missile-far');

    expect(game.hasMagicMissileTarget()).toBe(true);
    const result = game.castMagicMissile();
    expect(result).toMatchObject({ hit: true, defeated: near.id });
    expect(
      harness(game)
        .enemies.getEnemiesInRoom(roomId)
        .map((e) => e.id),
    ).toContain(far.id);
  });

  it('lightning strike chains from a defeated target to the next nearest', () => {
    const game = makeGame();
    const { x, y, roomId } = localHead(game);

    expect(game.hasLightningTarget()).toBe(false);

    const first = spawnEnemy(game, roomId, x + 2, y, 'bolt-1', 1);
    const second = spawnEnemy(game, roomId, x + 4, y, 'bolt-2', 3);

    const result = game.castLightningStrike();
    expect(result.strikes.map((p) => `${p.x},${p.y}`).sort()).toEqual(
      [`${x + 2},${y}`, `${x + 4},${y}`].sort(),
    );
    expect(result.defeated).toEqual([first.id]);
    const survivor = harness(game)
      .enemies.getEnemiesInRoom(roomId)
      .find((e) => e.id === second.id);
    expect(survivor?.currentHearts).toBe(1);
  });

  it('frost nova chills enemies in radius and nips the fragile ones', () => {
    const game = makeGame();
    const { x, y, roomId } = localHead(game);

    expect(game.hasFrostNovaTargets()).toBe(false);

    const fragile = spawnEnemy(game, roomId, x + 1, y, 'nova-fragile', 1);
    const sturdy = spawnEnemy(game, roomId, x + 3, y, 'nova-sturdy', 3);
    const far = spawnEnemy(game, roomId, x + 6, y, 'nova-far', 3);

    const result = game.castFrostNova();
    expect(result.chilled).toBe(2);
    expect(result.defeated).toEqual([fragile.id]);
    expect(harness(game).enemies.isEnemyChilled(sturdy.id)).toBe(true);
    expect(harness(game).enemies.isEnemyChilled(far.id)).toBe(false);
  });

  it('swiftstep blinks the whole body forward until something blocks it', () => {
    const game = makeGame();
    game.forceDirection(1, 0);
    const before = game.getSnakeBody().map((p) => ({ ...p }));
    const { roomId } = localHead(game);

    const result = game.castSwiftstep();

    expect(result.moved).toBe(3);
    const after = game.getSnakeBody();
    expect(after.length).toBe(before.length);
    for (let index = 0; index < before.length; index += 1) {
      expect(after[index]).toEqual({ x: before[index]!.x + 3, y: before[index]!.y });
    }

    // An enemy one tile ahead blocks every feasible offset.
    const { x: hx, y: hy } = localHead(game);
    spawnEnemy(game, roomId, hx + 1, hy, 'swiftstep-block', 3);
    expect(game.canSwiftstep()).toBe(false);
    expect(game.castSwiftstep()).toEqual({ moved: 0 });
  });

  it('haste applies a save-safe status that expires on schedule', () => {
    const game = makeGame();

    expect(game.getSpellStatusTicks('haste')).toBe(0);
    expect(game.castHaste()).toEqual({ magnitude: 60 });
    expect(game.getSpellStatusTicks('haste')).toBe(60);

    game.tickSpellStatusEffects(59);
    expect(game.getSpellStatusTicks('haste')).toBe(1);
    game.tickSpellStatusEffects(1);
    expect(game.getSpellStatusTicks('haste')).toBe(0);
    expect(game.getSpellStatusEffects()).toEqual([]);
  });

  it('mirror image wards the snake and briefly phases it', () => {
    const game = makeGame();

    const result = game.castMirrorImage();
    expect(result).toEqual({ magnitude: 8 });
    expect(game.getFlag<number>('fortitude.invulnerabilityTicks')).toBeGreaterThanOrEqual(8);
    expect(game.getFlag<number>('traversal.phaseTicks')).toBeGreaterThanOrEqual(3);
    expect(game.getFlag<Record<string, boolean>>('maneuvers.ghostSources')?.spell).toBe(true);
    expect(game.getSpellStatusTicks('mirror-image')).toBe(3);

    game.tickSpellStatusEffects(3);
    expect(game.getFlag<Record<string, boolean>>('maneuvers.ghostSources')?.spell).toBeUndefined();
    expect(game.getSpellStatusTicks('mirror-image')).toBe(0);
  });

  it('shimmer cloak phases the snake for a longer veil', () => {
    const game = makeGame();

    const result = game.castShimmerCloak();
    expect(result).toEqual({ magnitude: 12 });
    expect(game.getFlag<number>('traversal.phaseTicks')).toBeGreaterThanOrEqual(12);
    expect(game.getSpellStatusTicks('shimmer-cloak')).toBe(12);

    game.tickSpellStatusEffects(12);
    expect(game.getFlag<Record<string, boolean>>('maneuvers.ghostSources')?.spell).toBeUndefined();
  });

  it('healing glow banks stored vitality, then holds a ward when full', () => {
    const game = makeGame();
    game.setFlag('derived.storedVitalityCapacity', 2);

    expect(game.castHealingGlow()).toEqual({ kind: 'vitality' });
    expect(
      game.getFlag<{ stored?: number; charged?: boolean }>('fortitude.bloodBank'),
    ).toMatchObject({
      stored: 1,
      charged: false,
    });

    expect(game.castHealingGlow()).toEqual({ kind: 'vitality' });
    expect(
      game.getFlag<{ stored?: number; charged?: boolean }>('fortitude.bloodBank'),
    ).toMatchObject({
      stored: 2,
      charged: true,
    });

    const ward = game.castHealingGlow();
    expect(ward).toEqual({ kind: 'ward' });
    expect(game.getFlag<number>('fortitude.invulnerabilityTicks')).toBeGreaterThanOrEqual(6);
  });

  it('mana sip queues the astral refund and starts the river cooldown', () => {
    const game = makeGame();

    expect(game.castManaSip()).toEqual({ magnitude: 25 });
    expect(game.getFlag<number>('mana.pendingRestore')).toBe(25);
    expect(game.getSpellStatusTicks('mana-sip-cooldown')).toBe(60);

    game.castManaSip();
    expect(game.getFlag<number>('mana.pendingRestore')).toBe(50);
    game.tickSpellStatusEffects(60);
    expect(game.getSpellStatusTicks('mana-sip-cooldown')).toBe(0);
  });

  it('summons a light wisp that knits mana and expires on schedule', () => {
    const game = makeGame();

    expect(game.hasLightWisp()).toBe(false);
    expect(game.getLightWispManaRegen()).toBe(0);
    expect(game.summonLightWisp(3)).toMatchObject({ ok: true });
    expect(game.hasLightWisp()).toBe(true);
    expect(game.getLightWispManaRegen()).toBe(0.5);
    expect(game.summonLightWisp()).toMatchObject({ ok: false });
    expect(game.getFollowers().filter((f) => f.kind === 'light-wisp')).toHaveLength(1);

    harness(game).tickFollowers();
    harness(game).tickFollowers();
    expect(game.hasLightWisp()).toBe(true);
    harness(game).tickFollowers();
    expect(game.hasLightWisp()).toBe(false);
    expect(game.getLightWispManaRegen()).toBe(0);
  });

  it('a light wisp never hunts while following', () => {
    const game = makeGame();
    game.summonLightWisp(30);
    const { x, y, roomId } = localHead(game);
    const prey = spawnEnemy(game, roomId, x + 1, y, 'wisp-prey', 5);

    for (let index = 0; index < 10; index += 1) {
      harness(game).tickFollowers();
    }

    const survivor = harness(game)
      .enemies.getEnemiesInRoom(roomId)
      .find((e) => e.id === prey.id);
    expect(survivor?.currentHearts).toBe(5);
    const wisp: FollowerInstance | undefined = game
      .getFollowers()
      .find((f) => f.kind === 'light-wisp');
    expect(wisp?.mode).toBe('follow');
  });

  it('mana potion and mana crystal route through inventory use', () => {
    const game = makeGame();

    game.grantInventoryItem('mana-potion', 1);
    expect(game.useInventoryItem('mana-potion')).toMatchObject({ ok: true, consume: true });
    expect(game.getInventory().getItemCount('mana-potion')).toBe(0);
    expect(game.getFlag<number>('mana.pendingRestore')).toBe(30);

    for (let index = 0; index < 3; index += 1) {
      game.grantInventoryItem('mana-crystal', 1);
      expect(game.useInventoryItem('mana-crystal')).toMatchObject({ ok: true });
    }
    expect(game.getFlag<number>('mana.crystalsUsed')).toBe(3);
    expect(
      (game.getFlag<Array<{ max: number; regen: number }>>('mana.pendingUpgrades') ?? []).length,
    ).toBe(3);

    game.grantInventoryItem('mana-crystal', 1);
    const refused = game.useInventoryItem('mana-crystal');
    expect(refused).toMatchObject({ ok: false });
    expect(game.getInventory().getItemCount('mana-crystal')).toBe(1);
    expect(game.getFlag<number>('mana.crystalsUsed')).toBe(3);
  });

  it('wizard lessons teach the next unknown spell up to three times per run', () => {
    const game = makeGame();

    const first = game.receiveWizardLesson('wizard-actor-1');
    expect(first).toMatchObject({ ok: true, spellId: 'arcane-pulse' });
    expect(game.getFlag<string[]>('arcane.spellbook.known')).toContain('arcane-pulse');
    expect(game.getFlag<string>('magic.wizardLessonActor')).toBe('wizard-actor-1');

    const second = game.receiveWizardLesson();
    expect(second).toMatchObject({ ok: true });
    expect(second.spellId).not.toBe('arcane-pulse');

    const third = game.receiveWizardLesson();
    expect(third).toMatchObject({ ok: true });
    expect(game.getFlag<number>('magic.wizardLessons')).toBe(3);

    const fourth = game.receiveWizardLesson();
    expect(fourth).toMatchObject({ ok: false });
    expect(game.getFlag<number>('magic.wizardLessons')).toBe(3);
  });
});
