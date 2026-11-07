import { describe, expect, it } from 'vitest';
import { createBaseActor } from '../actorFactory.js';
import {
  KING_LORE_NOUNS,
  rollKingLoreNouns,
  selectActorVoiceLine,
  type ActorVoiceContext,
} from '../actorVoice.js';
import type { Actor } from '../actorTypes.js';

// The wise old snake tests everything.

function createKingLoreGuard(): Actor {
  return createBaseActor({
    id: 'actor:test:kinglore:guard',
    kind: 'guard',
    role: 'guard',
    species: 'human',
    thickness: 'medium',
    displayName: 'Sergeant Bram',
  });
}

function createVoiceContext(
  actor: Actor,
  random: () => number,
  flags: Record<string, unknown> = {},
): ActorVoiceContext {
  return {
    actor,
    biomeId: 'verdigris-basin',
    dangerLevel: 2,
    playerHealth: 3,
    playerMaxHealth: 3,
    snakeLength: 12,
    flags,
    recentEvents: [],
    random,
  };
}

function deterministicRandom(start: number): () => number {
  let next = start;
  return () => {
    next = (next * 16807) % 2147483647;
    return next / 2147483647;
  };
}

const ROYAL_LINE_PATTERN = /^The King is not a (\w+) here\. He is (\w+) with a (\w+)\.$/;

describe('actor royal lore barks', () => {
  it('keeps at least 100 unique nouns that still read after the article "a"', () => {
    expect(KING_LORE_NOUNS.length).toBeGreaterThanOrEqual(100);
    expect(new Set(KING_LORE_NOUNS).size).toBe(KING_LORE_NOUNS.length);
    for (const noun of KING_LORE_NOUNS) {
      expect(noun, `noun "${noun}" must follow the article "a"`).toMatch(
        /^[bcdfghjklmnpqrstvwxyz]/i,
      );
    }
  });

  it('rolls three distinct nouns from the list', () => {
    const roll = rollKingLoreNouns(deterministicRandom(7));
    for (const noun of [roll.kingNot, roll.kingIs, roll.kingWith]) {
      expect(KING_LORE_NOUNS).toContain(noun);
    }
    expect(new Set([roll.kingNot, roll.kingIs, roll.kingWith]).size).toBe(3);
  });

  it('never repeats a noun within a single telling, even with a flat roll', () => {
    const roll = rollKingLoreNouns(() => 0);
    expect(new Set([roll.kingNot, roll.kingIs, roll.kingWith]).size).toBe(3);
  });

  it('lets a guard who knows about the King tell the royal secret', () => {
    const actor = createKingLoreGuard();
    const line = selectActorVoiceLine(createVoiceContext(actor, () => 0));
    expect(line.id).toBe('actor-secret-royal');
  });

  it('fills the royal secret with fresh nouns from the list', () => {
    const actor = createKingLoreGuard();
    const line = selectActorVoiceLine(createVoiceContext(actor, () => 0));
    const match = ROYAL_LINE_PATTERN.exec(line.text);
    expect(match).not.toBeNull();
    const [kingNot, kingIs, kingWith] = match!.slice(1);
    expect(KING_LORE_NOUNS).toContain(kingNot);
    expect(KING_LORE_NOUNS).toContain(kingIs);
    expect(KING_LORE_NOUNS).toContain(kingWith);
    expect(new Set([kingNot, kingIs, kingWith]).size).toBe(3);
  });

  it('tells the royal secret differently when the dice fall differently', () => {
    const actor = createKingLoreGuard();
    const first = selectActorVoiceLine(createVoiceContext(actor, () => 0));
    const second = selectActorVoiceLine(createVoiceContext(actor, () => 0.5));
    expect(first.id).toBe('actor-secret-royal');
    expect(second.id).toBe('actor-secret-royal');
    expect(first.text).not.toBe(second.text);
  });

  it('retells the royal secret even when it was the last thing said', () => {
    const actor = createKingLoreGuard();
    const line = selectActorVoiceLine(
      createVoiceContext(actor, () => 0, {
        [`actor.voice.last.${actor.id}`]: 'actor-secret-royal',
      }),
    );
    expect(line.id).toBe('actor-secret-royal');
  });

  it('keeps the secret from anyone who does not know about the King', () => {
    const actor = createKingLoreGuard();
    actor.lore = actor.lore ? { ...actor.lore, knowsAboutKing: false } : undefined;
    const line = selectActorVoiceLine(createVoiceContext(actor, () => 0));
    expect(line.id).not.toBe('actor-secret-royal');
    expect(line.id).toBe('actor-guard-king');
  });
});
