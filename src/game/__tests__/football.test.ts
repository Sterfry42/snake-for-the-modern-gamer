import { defaultGameConfig } from '../../config/gameConfig.js';
import type { Vector2Like } from '../../core/math.js';
import { QuestRegistry } from '../../quests/questRegistry.js';
import { SnakeGame } from '../snakeGame.js';

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
    expect(rumors.some((rumor) => rumor.summary.includes('bandit') || rumor.summary.includes('humanoid'))).toBe(true);
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
    } as any;
    (game.getSnakeBody() as Vector2Like[])[0] = { x: 3, y: 4 };
    game.setFlag('equipment.gunEnabled', true);

    expect(game.firePlayerShot({ x: 1, y: 0 })).toBe(true);

    const enemies = game.getEnemies(room.id).filter((enemy) => enemy.encounterKind === 'npc-hostile');
    expect(enemies).toHaveLength(1);
    expect(enemies[0]?.id).toBe(`npc-hostile:resident:${room.id}:lina`);
    expect(enemies[0]?.actorId).toBe(game.getVillageActorId(room.id, 'lina', 'resident'));
    expect(enemies[0]?.position).toEqual(game.getRelationshipNpcBodyPosition({
      id: `resident:${room.id}:lina`,
      actorId: game.getVillageActorId(room.id, 'lina', 'resident'),
      displayName: 'Lina',
      species: 'human',
      homeRoomId: room.id,
      factionId: 'hearthbound-remnant',
    }));
    expect(game.getRelationshipState({
      id: `resident:${room.id}:lina`,
      displayName: 'Lina',
      species: 'human',
    })?.stage).toBe('hostile');
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
    } as any;
    const relationshipId = `resident:${room.id}:lina`;
    (game.getSnakeBody() as Vector2Like[])[0] = { x: 3, y: 4 };
    game.setFlag('equipment.gunEnabled', true);

    game.firePlayerShot({ x: 1, y: 0 });
    const hostile = game.getEnemies(room.id).find((enemy) => enemy.id === `npc-hostile:${relationshipId}`)!;
    expect((game as any).enemies.consumeEnemyAt(room.id, hostile.position).eaten).toBe(true);
    (game as any).relationshipController.recordEaten(relationshipId, 1);
    (game as any).npcBodies.delete(relationshipId);
    expect(game.getEnemies(room.id).some((enemy) => enemy.id === `npc-hostile:${relationshipId}`)).toBe(false);

    (game.getSnakeBody() as Vector2Like[])[0] = { x: 3, y: 4 };
    game.firePlayerShot({ x: 1, y: 0 });

    expect(game.getRelationshipState({
      id: relationshipId,
      displayName: 'Lina',
      species: 'human',
    })?.flags.eatenByPlayer).toBe(true);
    expect(game.getEnemies(room.id).some((enemy) => enemy.id === `npc-hostile:${relationshipId}`)).toBe(false);
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
    } as any;
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
    expect(game.getFlag<{ message: string }>('ui.relationshipEvent')?.message).toContain('shot down');
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
    expect(game.getFlag<Array<{ actorId: string; text: string }>>('actors.knownFacts')?.[0]?.actorId).toBe(actor.id);
    expect(game.getFlag<{ actorId: string; text: string }>('ui.actorKnownFact')?.actorId).toBe(actor.id);
    expect(game.getActorSystem().events.getRecent().some((event) => event.type === 'actor-personal-reveal')).toBe(true);
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
    expect(game.getActorSystem().getActor(actor.id)?.memory.some((memory) => memory.source === 'rumor')).toBe(true);
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
    expect(updated?.relationships.some((link) => link.actorId === target.id && link.knownToPlayer)).toBe(true);
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
    } as any;
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
    expect(game.getActorSystem().getActor(actor.id)?.memory.some((memory) => memory.summary.includes('bread knife'))).toBe(true);
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
    expect(game.getFlag<{ currentEvents: unknown[] }>('factions.v2.save')?.currentEvents.length).toBeGreaterThan(0);
    expect(game.getRecentWorldRumors()[0]?.summary).not.toBe('A bandit was eaten beside the gate.');
    expect(game.getCurrentFactionEvents()[0]?.tags).toContain('faction');
  });
});
