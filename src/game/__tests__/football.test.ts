import { defaultGameConfig } from '../../config/gameConfig.js';
import type { Vector2Like } from '../../core/math.js';
import type { EnemyInstance } from '../../systems/enemies.js';
import type { RoomSnapshot } from '../../world/types.js';
import { QuestRegistry } from '../../quests/questRegistry.js';
import { SnakeGame } from '../snakeGame.js';

interface SnakeGamePrivate {
  enemies: {
    consumeEnemyAt(roomId: string, head: Vector2Like): { eaten: boolean; enemy?: EnemyInstance };
    damageEnemyAt(
      roomId: string,
      position: Vector2Like,
      damage?: number,
    ): { hit: boolean; defeated?: EnemyInstance };
    spawnHostileNpc(
      roomId: string,
      position: Vector2Like,
      name: string,
      hearts: number,
      idSuffix?: string,
      currentHearts?: number,
      actorId?: string,
    ): EnemyInstance;
  };
  relationshipController: {
    recordEaten(relationshipId: string, count: number): void;
  };
  npcBodies: Map<
    string,
    { position: Vector2Like; anchor: Vector2Like; wanderRadius: number; moveCooldown: number }
  >;
  calculateAppleLengthScoreMultiplier(): number;
  applyLengthScoreMultiplier(baseScore: number, multiplier: number): number;
  syncActorsForRoom(room: RoomSnapshot): void;
  noteBanditRaidDefeat(enemy: EnemyInstance, eaten: boolean): void;
  tickFactionRaidGameplay(): void;
  tickNpcBodies(room: RoomSnapshot): void;
  shareActorGossip(
    room: RoomSnapshot,
    sourceActor: {
      id: string;
      mood: { fear: number; stress: number };
      flags: Record<string, unknown>;
    },
    targetActorId: string,
    memory: { id: string; source: string; tags: string[]; eventId?: string },
  ): void;
}

beforeEach(() => {
  const storage = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
    clear: () => storage.clear(),
  });
});

function createGame(): SnakeGame {
  return new SnakeGame(defaultGameConfig, new QuestRegistry(), {});
}

describe('Liberty footballs', () => {
  it('spawns and moves footballs one tile per step', () => {
    const game = createGame();
    const football = game.spawnFootball('0,0,0', { x: 5, y: 5 }, { x: 1, y: 0 });

    expect(football).not.toBeNull();
    expect(game.getFootballs('0,0,0')[0]?.position).toEqual({ x: 6, y: 5 });

    game.stepFootballs({ x: 0, y: 0 });

    expect(game.getFootballs('0,0,0')[0]?.position).toEqual({ x: 7, y: 5 });
  });

  it('lets the snake catch a football by entering its tile', () => {
    const game = createGame();
    game.spawnFootball('0,0,0', { x: 5, y: 5 }, { x: 1, y: 0 });

    expect(game.catchFootball('0,0,0', { x: 6, y: 5 })).toBe(true);
    expect(game.getFootballs('0,0,0')).toHaveLength(0);
    expect(game.getScore()).toBe(15);
  });

  it('lets the snake catch a football when the ball moves onto the head', () => {
    const game = createGame();
    game.spawnFootball('0,0,0', { x: 5, y: 5 }, { x: 1, y: 0 });

    game.stepFootballs({ x: 7, y: 5 });

    expect(game.getFootballs('0,0,0')).toHaveLength(0);
    expect(game.getScore()).toBe(15);
  });

  it('grounds footballs when they hit walls or bounds, then expires them', () => {
    const game = createGame();
    const room = game.getRoom('0,0,0');
    const rows = room.layout.map((row) => row.split(''));
    rows[5]![7] = '#';
    room.layout = rows.map((row) => row.join(''));

    game.spawnFootball('0,0,0', { x: 5, y: 5 }, { x: 1, y: 0 });
    game.stepFootballs({ x: 0, y: 0 });

    expect(game.getFootballs('0,0,0')[0]?.state).toBe('grounded');

    game.stepFootballs({ x: 0, y: 0 });
    game.stepFootballs({ x: 0, y: 0 });
    game.stepFootballs({ x: 0, y: 0 });
    game.stepFootballs({ x: 0, y: 0 });

    expect(game.getFootballs('0,0,0')).toHaveLength(0);
  });
});

describe('run seeds', () => {
  it('creates a fresh world seed for each unseeded game', () => {
    const first = createGame().getSaveData().worldGeneration?.seed;
    const second = createGame().getSaveData().worldGeneration?.seed;

    expect(first).toMatch(/^run:/);
    expect(second).toMatch(/^run:/);
    expect(second).not.toBe(first);
  });

  it('preserves explicit config seeds for reproducible fixtures', () => {
    const config = { ...defaultGameConfig, rng: { seed: 'fixture-seed' } };
    const first = new SnakeGame(config, new QuestRegistry(), {}).getSaveData().worldGeneration;
    const second = new SnakeGame(config, new QuestRegistry(), {}).getSaveData().worldGeneration;

    expect(first?.seed).toBe('fixture-seed');
    expect(second?.townSalt).toBe(first?.townSalt);
  });

  it('generates a new world seed on reset for unseeded runs', () => {
    const game = createGame();
    const before = game.getSaveData().worldGeneration?.seed;

    game.reset();

    const after = game.getSaveData().worldGeneration?.seed;
    expect(after).toMatch(/^run:/);
    expect(after).not.toBe(before);
  });
});

describe('world rumors', () => {
  it('records severe actor events as persistent rumors', () => {
    const game = createGame();

    game.emitWorldEvent({
      type: 'humanoid-eaten',
      roomId: '0,0,0',
      targetActorIds: ['enemy:0,0,0:bandit-1'],
      severity: 65,
      loudness: 45,
      tags: ['combat', 'eaten', 'humanoid'],
      summary: 'A bandit was eaten.',
      createdAtRoomNumber: 3,
    });

    const rumors = game.getRecentWorldRumors();
    expect(
      rumors.some(
        (rumor) => rumor.summary.includes('bandit') || rumor.summary.includes('humanoid'),
      ),
    ).toBe(true);
    expect(rumors.some((rumor) => rumor.tags.includes('humanoid'))).toBe(true);
    expect(game.getSaveData().flags?.['world.rumors']).toEqual(expect.any(Array));
  });

  it('propagates loud actor events into nearby heard memories and faction reports', () => {
    const game = createGame();
    const listener = game.getActorSystem().registry.ensureTownResidentActor({
      residentId: 'marta',
      name: 'Marta',
      role: 'shopkeeper',
      factionId: 'hearthbound-remnant',
      townId: 'eastmere',
      currentRoomId: '1,0,0',
    });
    const before = game.getFactionAlignment('hearthbound-remnant').value;

    game.emitWorldEvent({
      type: 'humanoid-eaten',
      roomId: '0,0,0',
      targetActorIds: ['enemy:0,0,0:bandit-1'],
      severity: 65,
      loudness: 45,
      tags: ['combat', 'eaten', 'humanoid'],
      summary: 'A bandit was eaten.',
      createdAtRoomNumber: 3,
    });

    expect(game.getActorSystem().getActor(listener.id)?.memory[0]?.source).toBe('heard');
    expect(game.getFactionAlignment('hearthbound-remnant').value).toBeLessThan(before);
  });

  it('applies actor interaction consequences for apology, threat, and parley', () => {
    const game = createGame();
    const actor = game.getActorSystem().registry.ensureTownResidentActor({
      residentId: 'nina',
      name: 'Nina',
      role: 'guard',
      factionId: 'hearthbound-remnant',
      townId: 'eastmere',
      currentRoomId: '0,0,0',
    });
    game.getActorSystem().registry.update(actor.id, (current) => ({
      ...current,
      hostility: 'suspicious',
      mood: { ...current.mood, anger: 60, fear: 75 },
    }));

    expect(game.apologizeToActor(actor.id)).toContain('apology');
    expect(game.getActorSystem().getActor(actor.id)?.hostility).toBe('neutral');

    expect(game.threatenActor(actor.id)).toContain('threat');
    expect(game.getActorSystem().getActor(actor.id)?.hostility).toBe('suspicious');

    game.getActorSystem().registry.update(actor.id, (current) => ({
      ...current,
      hostility: 'hostile',
      mood: { ...current.mood, fear: 80, anger: 20 },
    }));
    expect(game.parleyWithActor(actor.id)).toContain('talk');
    expect(game.getActorSystem().getActor(actor.id)?.hostility).toBe('suspicious');
  });

  it('notifies socially linked actors about major harm', () => {
    const game = createGame();
    const target = game.getActorSystem().registry.ensureTownResidentActor({
      residentId: 'marta',
      name: 'Marta',
      role: 'shopkeeper',
      factionId: 'hearthbound-remnant',
      townId: 'eastmere',
      currentRoomId: '0,0,0',
    });
    const sibling = game.getActorSystem().registry.ensureTownResidentActor({
      residentId: 'nina',
      name: 'Nina',
      role: 'guard',
      factionId: 'hearthbound-remnant',
      townId: 'eastmere',
      currentRoomId: '4,4,0',
    });
    game.getActorSystem().registry.update(sibling.id, (actor) => ({
      ...actor,
      relationships: [{ actorId: target.id, relationship: 'family', strength: 80 }],
    }));

    game.emitWorldEvent({
      type: 'humanoid-eaten',
      roomId: '0,0,0',
      targetActorIds: [target.id],
      severity: 70,
      loudness: 20,
      tags: ['combat', 'eaten', 'humanoid'],
      summary: 'Marta was eaten.',
    });

    const updated = game.getActorSystem().getActor(sibling.id);
    expect(updated?.memory[0]?.tags).toContain('socialLink');
    expect(updated?.mood.grief).toBeGreaterThan(0);
    expect(updated?.hostility).toBe('suspicious');
  });

  it('shooting a visible town NPC creates one fused hostile combat body', () => {
    const game = createGame();
    const room = game.getCurrentRoom();
    room.layout = Array.from({ length: defaultGameConfig.grid.rows }, () =>
      '.'.repeat(defaultGameConfig.grid.cols),
    );
    room.village = {
      residents: [{ id: 'lina', name: 'Lina', x: 5, y: 4, portraitId: 'sage-1' }],
      shopkeeper: { id: 'shop', name: 'Rook', x: 8, y: 4, portraitId: 'sage-2' },
    } as unknown as never;
    (game.getSnakeBody() as Vector2Like[])[0] = { x: 3, y: 4 };
    game.setFlag('equipment.gunEnabled', true);

    expect(game.firePlayerShot({ x: 1, y: 0 })).toBe(true);

    const enemies = game
      .getEnemies(room.id)
      .filter((enemy) => enemy.encounterKind === 'npc-hostile');
    expect(enemies).toHaveLength(1);
    expect(enemies[0]?.id).toBe(`npc-hostile:resident:${room.id}:lina`);
    expect(enemies[0]?.actorId).toBe(game.getVillageActorId(room.id, 'lina', 'resident'));
    expect(enemies[0]?.position).toEqual(
      game.getRelationshipNpcBodyPosition({
        id: `resident:${room.id}:lina`,
        actorId: game.getVillageActorId(room.id, 'lina', 'resident'),
        displayName: 'Lina',
        species: 'human',
        homeRoomId: room.id,
        factionId: 'hearthbound-remnant',
      }),
    );
    expect(
      game.getRelationshipState({
        id: `resident:${room.id}:lina`,
        displayName: 'Lina',
        species: 'human',
      })?.stage,
    ).toBe('hostile');
  });

  it('does not recreate an NPC combat body after that NPC has been eaten', () => {
    const game = createGame();
    const room = game.getCurrentRoom();
    room.layout = Array.from({ length: defaultGameConfig.grid.rows }, () =>
      '.'.repeat(defaultGameConfig.grid.cols),
    );
    room.village = {
      residents: [{ id: 'lina', name: 'Lina', x: 5, y: 4, portraitId: 'sage-1' }],
      shopkeeper: { id: 'shop', name: 'Rook', x: 8, y: 4, portraitId: 'sage-2' },
    } as unknown as never;
    const relationshipId = `resident:${room.id}:lina`;
    (game.getSnakeBody() as Vector2Like[])[0] = { x: 3, y: 4 };
    game.setFlag('equipment.gunEnabled', true);

    game.firePlayerShot({ x: 1, y: 0 });
    const hostile = game
      .getEnemies(room.id)
      .find((enemy) => enemy.id === `npc-hostile:${relationshipId}`)!;
    expect(
      (game as unknown as SnakeGamePrivate).enemies.consumeEnemyAt(room.id, hostile.position).eaten,
    ).toBe(true);
    (game as unknown as SnakeGamePrivate).relationshipController.recordEaten(relationshipId, 1);
    (game as unknown as SnakeGamePrivate).npcBodies.delete(relationshipId);
    expect(
      game.getEnemies(room.id).some((enemy) => enemy.id === `npc-hostile:${relationshipId}`),
    ).toBe(false);

    (game.getSnakeBody() as Vector2Like[])[0] = { x: 3, y: 4 };
    game.firePlayerShot({ x: 1, y: 0 });

    expect(
      game.getRelationshipState({
        id: relationshipId,
        displayName: 'Lina',
        species: 'human',
      })?.stage,
    ).toBe('dead');
    expect(
      game.getRelationshipState({
        id: relationshipId,
        displayName: 'Lina',
        species: 'human',
      })?.flags.eatenByPlayer,
    ).toBe(true);
    expect(
      game.getEnemies(room.id).some((enemy) => enemy.id === `npc-hostile:${relationshipId}`),
    ).toBe(false);
  });

  it('shooting a hostile NPC down marks the relationship dead and reports it', () => {
    const game = createGame();
    const room = game.getCurrentRoom();
    room.layout = Array.from({ length: defaultGameConfig.grid.rows }, () =>
      '.'.repeat(defaultGameConfig.grid.cols),
    );
    room.village = {
      residents: [{ id: 'lina', name: 'Lina', x: 5, y: 4, portraitId: 'sage-1' }],
      shopkeeper: { id: 'shop', name: 'Rook', x: 8, y: 4, portraitId: 'sage-2' },
    } as unknown as never;
    const relationshipId = `resident:${room.id}:lina`;
    (game.getSnakeBody() as Vector2Like[])[0] = { x: 3, y: 4 };
    game.setFlag('equipment.gunEnabled', true);

    for (let i = 0; i < 3; i++) {
      expect(game.firePlayerShot({ x: 1, y: 0 })).toBe(true);
      game.bulletClockStep();
    }

    const state = game.getRelationshipState({
      id: relationshipId,
      displayName: 'Lina',
      species: 'human',
    });
    expect(state?.stage).toBe('dead');
    expect(state?.flags.causeOfDeath).toBe('Shot by you');
    expect(
      game.getActorSystem().registry.get(game.getVillageActorId(room.id, 'lina', 'resident'))
        ?.health?.state,
    ).toBe('dead');
    expect(
      game.getActorSystem().registry.get(game.getVillageActorId(room.id, 'lina', 'resident'))
        ?.hostility,
    ).toBe('dead');
    expect(game.getFlag<{ message: string }>('ui.relationshipEvent')?.message).toContain(
      'shot down',
    );
  });
});

describe('length economy', () => {
  it('scales apple score around a 2x length-150 multiplier curve', () => {
    const game = createGame();

    expect((game as unknown as SnakeGamePrivate).calculateAppleLengthScoreMultiplier()).toBe(1);

    game.growSnake(97);
    expect(game.getSnakeLength()).toBe(100);
    expect((game as unknown as SnakeGamePrivate).calculateAppleLengthScoreMultiplier()).toBeCloseTo(
      Math.SQRT2,
      4,
    );

    game.growSnake(50);
    expect(game.getSnakeLength()).toBe(150);
    expect((game as unknown as SnakeGamePrivate).calculateAppleLengthScoreMultiplier()).toBeCloseTo(
      2,
      4,
    );

    game.growSnake(150);
    expect(game.getSnakeLength()).toBe(300);
    expect(
      (game as unknown as SnakeGamePrivate).calculateAppleLengthScoreMultiplier(),
    ).toBeGreaterThan(4);
    expect((game as unknown as SnakeGamePrivate).applyLengthScoreMultiplier(1, 1.5)).toBe(2);
  });

  it('sells length only through a physical butcher actor', () => {
    const game = createGame();
    const room = game.getCurrentRoom();
    room.town = {
      id: 'town-test',
      residents: [
        {
          id: 'butcher-1',
          actorId: 'town:town-test:butcher:butcher-1',
          name: 'Rook',
          x: 8,
          y: 4,
          role: 'butcher',
          townId: 'town-test',
          factionId: 'human-town',
          homeRoomId: room.id,
          workRoomId: room.id,
        },
      ],
      districtByRoomId: { [room.id]: 'marketStreet' },
    } as unknown as never;
    game.growSnake(20);
    const before = game.getSnakeLength();

    expect(game.sellSnakeLengthToButcher().ok).toBe(false);

    const result = game.sellSnakeLengthToButcher('town:town-test:butcher:butcher-1');

    expect(result.ok).toBe(true);
    expect(game.getSnakeLength()).toBe(before - 10);
    expect(game.getScore()).toBe(2);
  });
});

describe('town and guild hostility split', () => {
  it('does not treat thieves guild districts as hostile just because the town guard is hostile', () => {
    const game = createGame();
    const town = {
      id: 'split-town',
      wantedLevel: 5,
      suspicion: 90,
      reputation: -60,
      districtByRoomId: {
        '0,0,0': 'backAlley',
        '1,0,0': 'gate',
      },
      thievesGuild: { karma: 0 },
    } as unknown as never;

    expect(game.isTownHostileForRoom(town, '0,0,0')).toBe(false);
    expect(game.isTownHostileForRoom(town, '1,0,0')).toBe(true);
  });
});

describe('actor conversations', () => {
  it('records personal reveals as known facts and marks soul details revealed', () => {
    const game = createGame();
    const actor = game.getActorSystem().registry.ensureTownResidentActor({
      residentId: 'nina',
      name: 'Nina',
      role: 'guard',
      factionId: 'hearthbound-remnant',
      townId: 'eastmere',
      currentRoomId: game.getCurrentRoom().id,
    });

    const result = game.getActorConversation(actor.id, 'ask-personal');

    expect(result?.bucket).toBe('ask-personal');
    expect(game.formatActorConversation(result)).toContain('"');
    const updated = game.getActorSystem().getActor(actor.id);
    expect(updated?.knownToPlayer).toBe(true);
    expect(Object.values(updated?.soul?.revealed ?? {}).some(Boolean)).toBe(true);
    expect(
      game.getFlag<Array<{ actorId: string; text: string }>>('actors.knownFacts')?.[0]?.actorId,
    ).toBe(actor.id);
    expect(game.getFlag<{ actorId: string; text: string }>('ui.actorKnownFact')?.actorId).toBe(
      actor.id,
    );
    expect(
      game
        .getActorSystem()
        .events.getRecent()
        .some((event) => event.type === 'actor-personal-reveal'),
    ).toBe(true);
  });

  it('uses ask around to share rumors without coordinate-heavy speaker framing', () => {
    const game = createGame();
    const actor = game.getActorSystem().registry.ensureTownResidentActor({
      residentId: 'marta',
      name: 'Marta',
      role: 'shopkeeper',
      factionId: 'hearthbound-remnant',
      townId: 'eastmere',
      currentRoomId: game.getCurrentRoom().id,
    });
    game.emitWorldEvent({
      type: 'humanoid-eaten',
      roomId: game.getCurrentRoom().id,
      targetActorIds: ['enemy:bandit'],
      severity: 60,
      loudness: 30,
      tags: ['combat', 'eaten', 'humanoid'],
      summary: 'A bandit was eaten outside the gate.',
      createdAtRoomNumber: 7,
    });

    const result = game.getActorConversation(actor.id, 'ask-around');
    const formatted = game.formatActorConversation(result);

    expect(result?.bucket).toBe('ask-around');
    expect(formatted).not.toContain(`${actor.displayName} says`);
    expect(formatted).not.toContain(game.getCurrentRoom().id);
    expect(
      game
        .getActorSystem()
        .getActor(actor.id)
        ?.memory.some((memory) => memory.source === 'rumor'),
    ).toBe(true);
  });

  it('does not render the same single rumor in half of repeated ask-around conversations', () => {
    const game = createGame();
    const actor = game.getActorSystem().registry.ensureTownResidentActor({
      residentId: 'ilyra',
      name: 'Ilyra',
      role: 'guard',
      factionId: 'hearthbound-remnant',
      townId: 'eastmere',
      currentRoomId: game.getCurrentRoom().id,
    });
    game.emitWorldEvent({
      type: 'humanoid-eaten',
      roomId: game.getCurrentRoom().id,
      targetActorIds: ['enemy:hostile-person'],
      severity: 38,
      loudness: 38,
      tags: ['combat', 'eaten', 'humanoid'],
      summary: 'A hostile person was eaten.',
      createdAtRoomNumber: 4,
    });

    const lines = Array.from(
      { length: 8 },
      () => game.getActorConversation(actor.id, 'ask-around')?.line ?? '',
    );

    expect(
      lines.filter((line) => line.includes('A hostile person was eaten')).length,
    ).toBeLessThanOrEqual(3);
    expect(new Set(lines).size).toBeGreaterThanOrEqual(5);
  });

  it('generates local social links when asking personally and shows them in People', () => {
    const game = createGame();
    const roomId = game.getCurrentRoom().id;
    const actor = game.getActorSystem().registry.ensureTownResidentActor({
      residentId: 'nina',
      name: 'Nina',
      role: 'guard',
      factionId: 'hearthbound-remnant',
      townId: 'eastmere',
      currentRoomId: roomId,
    });
    const target = game.getActorSystem().registry.ensureTownResidentActor({
      residentId: 'marta',
      name: 'Marta',
      role: 'shopkeeper',
      factionId: 'hearthbound-remnant',
      townId: 'eastmere',
      currentRoomId: roomId,
    });
    game.getActorSystem().registry.update(actor.id, (current) => ({
      ...current,
      personality: ['practical', 'deadpan'],
      lore: undefined,
    }));

    const result = game.getActorConversation(actor.id, 'ask-personal');
    const updated = game.getActorSystem().getActor(actor.id);
    const journal = game.getPeopleJournalView();

    expect(result?.source).toBe('social');
    expect(
      updated?.relationships.some((link) => link.actorId === target.id && link.knownToPlayer),
    ).toBe(true);
    expect(journal.find((entry) => entry.id === actor.id)?.socialTies.join(' ')).toContain('Marta');
    expect(journal.find((entry) => entry.id === actor.id)?.knownFacts.join(' ')).toContain('Marta');
  });

  it('uses town rumors as ask around material', () => {
    const game = createGame();
    const room = game.getCurrentRoom();
    room.town = {
      id: 'eastmere',
      name: 'Eastmere',
      reputation: 0,
      suspicion: 0,
      wantedLevel: 0,
      rumors: [
        {
          id: 'town-rumor:missing-bread',
          townId: 'eastmere',
          kind: 'crime',
          summary: 'Someone stole the ceremonial bread knife.',
          roomsRemaining: 8,
          severity: 44,
        },
      ],
    } as unknown as never;
    const actor = game.getActorSystem().registry.ensureTownResidentActor({
      residentId: 'marta',
      name: 'Marta',
      role: 'shopkeeper',
      factionId: 'hearthbound-remnant',
      townId: 'eastmere',
      currentRoomId: room.id,
    });

    const result = game.getActorConversation(actor.id, 'ask-around');

    expect(result?.bucket).toBe('ask-around');
    expect(result?.source).toBe('rumor');
    expect(
      game
        .getActorSystem()
        .getActor(actor.id)
        ?.memory.some((memory) => memory.summary.includes('bread knife')),
    ).toBe(true);
  });

  it('turns public danger into modern rumors and faction current events', () => {
    const game = createGame();
    const actor = game.getActorSystem().registry.ensureTownResidentActor({
      residentId: 'nina',
      name: 'Nina',
      role: 'guard',
      factionId: 'hearthbound-remnant',
      townId: 'eastmere',
      currentRoomId: game.getCurrentRoom().id,
    });

    game.emitWorldEvent({
      type: 'humanoid-eaten',
      roomId: game.getCurrentRoom().id,
      targetActorIds: ['enemy:bandit'],
      witnessActorIds: [actor.id],
      severity: 70,
      loudness: 50,
      tags: ['combat', 'eaten', 'humanoid', 'bandit'],
      summary: 'A bandit was eaten beside the gate.',
      createdAtRoomNumber: 9,
    });

    expect(game.getFlag<{ rumors: unknown[] }>('rumors.save')?.rumors.length).toBeGreaterThan(0);
    expect(
      game.getFlag<{ currentEvents: unknown[] }>('factions.v2.save')?.currentEvents.length,
    ).toBeGreaterThan(0);
    expect(game.getRecentWorldRumors()[0]?.summary).not.toBe('A bandit was eaten beside the gate.');
    expect(game.getCurrentFactionEvents()[0]?.tags).toContain('faction');
  });

  it('does not create bandit raid warnings just because someone asks around', () => {
    const game = createGame();
    const room = game.getCurrentRoom();
    room.layout = Array.from({ length: defaultGameConfig.grid.rows }, () =>
      '.'.repeat(defaultGameConfig.grid.cols),
    );
    room.biomeId = 'ember-waste';
    room.village = {
      name: 'Test Village',
      center: { x: 8, y: 8 },
      residents: [{ id: 'marta', name: 'Marta', x: 7, y: 7, portraitId: 'sage-1' }],
      shopkeeper: { id: 'shop', name: 'Rook', x: 10, y: 7, portraitId: 'sage-2' },
    } as unknown as never;
    (game as unknown as SnakeGamePrivate).syncActorsForRoom(room);
    const actorId = game.getVillageActorId(room.id, 'marta', 'resident');

    for (let index = 0; index < 5; index += 1) {
      game.getActorConversation(actorId, 'ask-around');
    }

    expect(game.getCurrentFactionEvents().some((event) => event.type === 'raid-warning')).toBe(
      false,
    );
    expect(game.getRecentWorldRumors().some((rumor) => rumor.tags.includes('raid-warning'))).toBe(
      false,
    );
  });

  it('lets old non-local bandit rumors fall out of conversation context', () => {
    const game = createGame();
    const actor = game.getActorSystem().registry.ensureTownResidentActor({
      residentId: 'nina',
      name: 'Nina',
      role: 'guard',
      factionId: 'hearthbound-remnant',
      townId: 'eastmere',
      currentRoomId: game.getCurrentRoom().id,
    });
    game.emitWorldEvent({
      type: 'humanoid-eaten',
      roomId: '99,99,0',
      targetActorIds: ['enemy:bandit'],
      severity: 55,
      loudness: 45,
      tags: ['combat', 'eaten', 'humanoid', 'bandit'],
      summary: 'A bandit was eaten far away.',
      createdAtRoomNumber: -30,
    });

    const result = game.getActorConversation(actor.id, 'ask-around');

    expect(result?.line).not.toContain('far away');
    expect(result?.line).not.toContain('Bandit violence has left the market');
  });

  it('starts a bandit raid as hostile bandit actors and records aftermath', () => {
    const game = createGame();
    const room = game.getCurrentRoom();
    room.layout = Array.from({ length: defaultGameConfig.grid.rows }, () =>
      '.'.repeat(defaultGameConfig.grid.cols),
    );

    const event = game.startBanditRaidForCurrentRoom(55);
    const bandits = game
      .getEnemies(room.id)
      .filter((enemy) => enemy.id.startsWith('npc-hostile:raidBandit-'));

    expect(event.type).toBe('raid-active');
    expect(bandits.length).toBeGreaterThanOrEqual(3);
    expect(
      bandits.every((enemy) => enemy.maxHearts === 1 && enemy.encounterKind === 'npc-hostile'),
    ).toBe(true);
    expect(game.getActorSystem().getActor(bandits[0]!.actorId!)?.factionId).toBe('bandits');

    for (const bandit of bandits) {
      (game as unknown as SnakeGamePrivate).noteBanditRaidDefeat(bandit, false);
      (game as unknown as SnakeGamePrivate).enemies.damageEnemyAt(room.id, bandit.position, 1);
    }
    (game as unknown as SnakeGamePrivate).tickFactionRaidGameplay();

    const aftermath = game
      .getCurrentFactionEvents()
      .find((current) => current.type === 'raid-aftermath' && current.roomId === room.id);
    expect(aftermath?.tags).toContain('player-helped');
    expect(game.getRecentWorldRumors().some((rumor) => rumor.tags.includes('raid-aftermath'))).toBe(
      true,
    );
  });

  it('marks local shopkeepers and guards as raid responders while shops close', () => {
    const game = createGame();
    const room = game.getCurrentRoom();
    room.layout = Array.from({ length: defaultGameConfig.grid.rows }, () =>
      '.'.repeat(defaultGameConfig.grid.cols),
    );
    room.village = {
      name: 'Test Village',
      center: { x: 8, y: 8 },
      residents: [{ id: 'guard', name: 'Nessa', x: 6, y: 5, portraitId: 'sage-1' }],
      shopkeeper: { id: 'shop', name: 'Rook', x: 8, y: 5, portraitId: 'sage-2' },
    } as unknown as never;

    game.startBanditRaidForCurrentRoom(55);

    const shopActorId = game.getVillageActorId(room.id, 'shop', 'shopkeeper');
    const guardActorId = game.getVillageActorId(room.id, 'guard', 'resident');
    const shop = game.getActorSystem().getActor(shopActorId);
    const guard = game.getActorSystem().getActor(guardActorId);

    expect(shop?.flags.shopClosedReason).toBe('Closed during the raid');
    expect(shop?.flags.raidDefender).toBe(true);
    expect(guard?.flags.raidShelter).toBe(true);
    expect(
      game.getActorInteractionMenu(shopActorId)?.options.find((option) => option.id === 'shop')
        ?.enabled,
    ).toBe(false);
    expect(
      game
        .getActorInteractionMenu(shopActorId)
        ?.indicators.some((indicator) => indicator.kind === 'faction'),
    ).toBe(true);
  });
});

describe('actor room brains', () => {
  it('moves threatened civilians away from active room danger', () => {
    const game = createGame();
    const room = game.getCurrentRoom();
    room.layout = Array.from({ length: defaultGameConfig.grid.rows }, () =>
      '.'.repeat(defaultGameConfig.grid.cols),
    );
    room.village = {
      name: 'Test Village',
      center: { x: 8, y: 8 },
      residents: [{ id: 'marta', name: 'Marta', x: 7, y: 7, portraitId: 'sage-1' }],
      shopkeeper: { id: 'shop', name: 'Rook', x: 10, y: 7, portraitId: 'sage-2' },
    } as unknown as never;
    (game as unknown as SnakeGamePrivate).syncActorsForRoom(room);
    const actorId = game.getVillageActorId(room.id, 'marta', 'resident');
    const relationshipId = `resident:${room.id}:marta`;
    const body = (game as unknown as SnakeGamePrivate).npcBodies.get(relationshipId)!;
    body.position = { x: 7, y: 7 };
    body.anchor = { x: 7, y: 7 };
    body.wanderRadius = 4;
    body.moveCooldown = 0;
    game.getActorSystem().registry.update(actorId, (actor) => ({
      ...actor,
      mood: { ...actor.mood, fear: 55, stress: 55 },
      flags: { ...actor.flags, raidShelter: true },
    }));
    (game as unknown as SnakeGamePrivate).enemies.spawnHostileNpc(
      room.id,
      { x: 6, y: 7 },
      'Bandit',
      1,
      'brain-test-bandit',
    );

    (game as unknown as SnakeGamePrivate).tickNpcBodies(room);

    expect(body.position.x).toBeGreaterThan(7);
  });

  it('lets nearby linked actors share remembered rumors', () => {
    const game = createGame();
    const room = game.getCurrentRoom();
    room.layout = Array.from({ length: defaultGameConfig.grid.rows }, () =>
      '.'.repeat(defaultGameConfig.grid.cols),
    );
    room.village = {
      name: 'Test Village',
      center: { x: 8, y: 8 },
      residents: [
        { id: 'marta', name: 'Marta', x: 7, y: 7, portraitId: 'sage-1' },
        { id: 'nina', name: 'Nina', x: 8, y: 7, portraitId: 'sage-2' },
      ],
      shopkeeper: { id: 'shop', name: 'Rook', x: 10, y: 7, portraitId: 'sage-3' },
    } as unknown as never;
    (game as unknown as SnakeGamePrivate).syncActorsForRoom(room);
    const sourceActorId = game.getVillageActorId(room.id, 'marta', 'resident');
    const targetActorId = game.getVillageActorId(room.id, 'nina', 'resident');
    game.getActorSystem().registry.update(sourceActorId, (actor) => ({
      ...actor,
      relationships: [
        ...actor.relationships.filter((link) => link.actorId !== targetActorId),
        { actorId: targetActorId, relationship: 'friend', strength: 80 },
      ],
      memory: [
        ...actor.memory,
        {
          id: 'memory:raid-warning:test',
          type: 'bandit-raid-started',
          summary: 'Bandits were seen testing the gate hinges.',
          source: 'rumor',
          intensity: 36,
          roomId: room.id,
          tags: ['rumor', 'bandit', 'raid'],
          createdAtRoomNumber: 4,
        },
      ],
    }));
    const sourceBody = (game as unknown as SnakeGamePrivate).npcBodies.get(
      `resident:${room.id}:marta`,
    )!;
    const targetBody = (game as unknown as SnakeGamePrivate).npcBodies.get(
      `resident:${room.id}:nina`,
    )!;
    sourceBody.position = { x: 7, y: 7 };
    sourceBody.moveCooldown = 0;
    targetBody.position = { x: 8, y: 7 };

    (game as unknown as SnakeGamePrivate).shareActorGossip(
      room,
      game.getActorSystem().getActor(sourceActorId)!,
      targetActorId,
      game.getActorSystem().getActor(sourceActorId)!.memory.slice(-1)[0],
    );

    const target = game.getActorSystem().getActor(targetActorId);
    expect(
      target?.memory.some((memory) => memory.source === 'heard' && memory.tags.includes('gossip')),
    ).toBe(true);
    expect(
      game
        .getActorSystem()
        .events.getRecent()
        .some((event) => event.type === 'actor-rumor-shared'),
    ).toBe(true);
  });
});
