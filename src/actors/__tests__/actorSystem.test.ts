import { describe, expect, it } from 'vitest';
import { ActorSystem } from '../actorSystem.js';
import { buildActorInteractionMenu } from '../actorInteractions.js';
import { selectActorVoiceLine } from '../actorVoice.js';

describe('ActorSystem', () => {
  it('creates stable town resident actors and room indexes', () => {
    const actors = new ActorSystem();
    const actor = actors.registry.ensureTownResidentActor({
      residentId: 'nina',
      name: 'Nina',
      role: 'guard',
      factionId: 'hearthbound-remnant',
      townId: 'eastmere',
      currentRoomId: '0,0,0',
    });

    expect(actor.id).toBe('town:eastmere:guard:nina');
    expect(actor.kind).toBe('guard');
    expect(actor.role).toBe('guard');
    expect(actor.combat?.armed).toBe(true);
    expect(actors.getActorsInRoom('0,0,0')).toContainEqual(actor);
  });

  it('turns witnessed events into capped actor memories', () => {
    const actors = new ActorSystem();
    const witness = actors.registry.ensureTownResidentActor({
      residentId: 'marta',
      name: 'Marta',
      role: 'shopkeeper',
      factionId: 'hearthbound-remnant',
      townId: 'eastmere',
      currentRoomId: '0,0,0',
    });

    actors.emitWorldEvent({
      type: 'animal-hunted',
      roomId: '0,0,0',
      witnessActorIds: [witness.id],
      severity: 18,
      tags: ['animal', 'hunting'],
      summary: 'A rabbit was hunted.',
    });

    expect(actors.getActor(witness.id)?.memory).toHaveLength(1);
    expect(actors.getActor(witness.id)?.memory[0]?.source).toBe('witnessed');
  });

  it('auto-detects same-room witnesses when callers omit witness ids', () => {
    const actors = new ActorSystem();
    const witness = actors.registry.ensureTownResidentActor({
      residentId: 'nina',
      name: 'Nina',
      role: 'guard',
      factionId: 'hearthbound-remnant',
      townId: 'eastmere',
      currentRoomId: '0,0,0',
    });
    const target = actors.registry.ensureAnimalActor({
      animalId: 'rabbit-1',
      animalType: 'rabbit',
      animalName: 'Rabbit',
      roomId: '0,0,0',
    });

    const event = actors.emitWorldEvent({
      type: 'animal-hunted',
      roomId: '0,0,0',
      targetActorIds: [target.id],
      severity: 18,
      tags: ['hunting'],
      summary: 'A rabbit was hunted.',
    });

    expect(event.witnessActorIds).toContain(witness.id);
    expect(event.witnessActorIds).not.toContain(target.id);
    expect(actors.getActor(witness.id)?.memory[0]?.source).toBe('witnessed');
  });

  it('builds role-aware interaction menus', () => {
    const actors = new ActorSystem();
    const shopkeeper = actors.registry.ensureTownResidentActor({
      residentId: 'marta',
      name: 'Marta',
      role: 'shopkeeper',
      factionId: 'hearthbound-remnant',
      townId: 'eastmere',
      currentRoomId: '0,0,0',
    });

    const menu = buildActorInteractionMenu(shopkeeper, { thievesGuildUnlocked: false });
    expect(menu.options.map((option) => option.id)).toContain('shop');
    expect(menu.options.find((option) => option.id === 'pickpocket')?.enabled).toBe(false);
    expect(menu.indicators.map((indicator) => indicator.kind)).toContain('shop');
  });

  it('enriches resident actors with relationship state without replacing their role', () => {
    const actors = new ActorSystem();
    const resident = actors.registry.ensureTownResidentActor({
      actorId: 'town:eastmere:shopkeeper:marta',
      residentId: 'marta',
      name: 'Marta',
      role: 'shopkeeper',
      factionId: 'hearthbound-remnant',
      townId: 'eastmere',
      currentRoomId: '0,0,0',
    });

    const relationshipActor = actors.registry.ensureRelationshipActor({
      actorId: resident.id,
      relationshipId: 'resident:0,0,0:marta',
      displayName: 'Marta',
      species: 'human',
      factionId: 'hearthbound-remnant',
      homeRoomId: '0,0,0',
      stage: 'crush',
    });

    expect(relationshipActor.id).toBe(resident.id);
    expect(relationshipActor.role).toBe('shopkeeper');
    expect(relationshipActor.flags.romanceCandidate).toBe(true);
    expect(relationshipActor.flags.relationshipId).toBe('resident:0,0,0:marta');
  });

  it('selects memory-aware actor voice before generic lines', () => {
    const actors = new ActorSystem();
    const shopkeeper = actors.registry.ensureTownResidentActor({
      residentId: 'marta',
      name: 'Marta',
      role: 'shopkeeper',
      factionId: 'hearthbound-remnant',
      townId: 'eastmere',
      currentRoomId: '0,0,0',
    });
    actors.emitWorldEvent({
      type: 'animal-hunted',
      roomId: '0,0,0',
      witnessActorIds: [shopkeeper.id],
      severity: 18,
      tags: ['animal', 'hunting'],
      summary: 'A rabbit was hunted.',
    });

    const line = selectActorVoiceLine({
      actor: actors.getActor(shopkeeper.id)!,
      biomeId: 'verdigris-basin',
      dangerLevel: 10,
      playerHealth: 3,
      playerMaxHealth: 3,
      snakeLength: 4,
      flags: {},
      recentEvents: [],
      random: () => 0,
    });

    expect(line.id).toBe('actor-remembers-hunt-shopkeeper');
  });

  it('marks eaten humanoid targets dead and alarms witnesses', () => {
    const actors = new ActorSystem();
    const target = actors.registry.ensureEnemyActor({
      enemyId: 'bandit-1',
      roomId: '0,0,0',
      name: 'Bandit',
      encounterKind: 'npc-hostile',
      currentHearts: 2,
      maxHearts: 2,
    });
    const witness = actors.registry.ensureTownResidentActor({
      residentId: 'nina',
      name: 'Nina',
      role: 'guard',
      factionId: 'hearthbound-remnant',
      townId: 'eastmere',
      currentRoomId: '0,0,0',
    });

    actors.emitWorldEvent({
      type: 'humanoid-eaten',
      roomId: '0,0,0',
      targetActorIds: [target.id],
      witnessActorIds: [witness.id],
      severity: 65,
      tags: ['combat', 'eaten', 'humanoid'],
      summary: 'Bandit was eaten.',
    });

    expect(actors.getActor(target.id)?.health?.state).toBe('dead');
    expect(actors.getActor(target.id)?.hostility).toBe('dead');
    expect(actors.getActor(witness.id)?.mood.fear).toBeGreaterThan(0);
    expect(actors.getActor(witness.id)?.opinions.player?.resentment).toBeGreaterThan(0);
  });

  it('turns witnessed town crimes into guard suspicion', () => {
    const actors = new ActorSystem();
    const guard = actors.registry.ensureTownResidentActor({
      residentId: 'nina',
      name: 'Nina',
      role: 'guard',
      factionId: 'hearthbound-remnant',
      townId: 'eastmere',
      currentRoomId: '0,0,0',
    });

    actors.emitWorldEvent({
      type: 'town-crime',
      roomId: '0,0,0',
      witnessActorIds: [guard.id],
      severity: 34,
      tags: ['crime', 'theft', 'witnessed'],
      summary: 'A theft was witnessed.',
    });

    expect(actors.getActor(guard.id)?.hostility).toBe('suspicious');
    expect(actors.getActor(guard.id)?.mood.anger).toBeGreaterThan(0);
    expect(actors.getActor(guard.id)?.memory[0]?.type).toBe('town-crime');
  });

  it('preserves event consequences across later actor syncs', () => {
    const actors = new ActorSystem();
    const guard = actors.registry.ensureTownResidentActor({
      residentId: 'nina',
      name: 'Nina',
      role: 'guard',
      factionId: 'hearthbound-remnant',
      townId: 'eastmere',
      currentRoomId: '0,0,0',
    });

    actors.emitWorldEvent({
      type: 'town-crime',
      roomId: '0,0,0',
      witnessActorIds: [guard.id],
      severity: 40,
      tags: ['crime', 'theft', 'witnessed'],
      summary: 'A theft was witnessed.',
    });
    const angerAfterCrime = actors.getActor(guard.id)?.mood.anger ?? 0;

    actors.registry.ensureTownResidentActor({
      residentId: 'nina',
      name: 'Nina',
      role: 'guard',
      factionId: 'hearthbound-remnant',
      townId: 'eastmere',
      currentRoomId: '0,0,0',
    });

    expect(actors.getActor(guard.id)?.hostility).toBe('suspicious');
    expect(actors.getActor(guard.id)?.mood.anger).toBe(angerAfterCrime);
    expect(actors.getActor(guard.id)?.memory).toHaveLength(1);
  });

  it('keeps dead consumed actors dead across later enemy syncs', () => {
    const actors = new ActorSystem();
    const target = actors.registry.ensureEnemyActor({
      enemyId: 'bandit-1',
      roomId: '0,0,0',
      name: 'Bandit',
      encounterKind: 'npc-hostile',
      currentHearts: 2,
      maxHearts: 2,
    });

    actors.emitWorldEvent({
      type: 'humanoid-eaten',
      roomId: '0,0,0',
      targetActorIds: [target.id],
      severity: 65,
      tags: ['combat', 'eaten', 'humanoid'],
      summary: 'Bandit was eaten.',
    });
    actors.registry.ensureEnemyActor({
      enemyId: 'bandit-1',
      roomId: '0,0,0',
      name: 'Bandit',
      encounterKind: 'npc-hostile',
      currentHearts: 2,
      maxHearts: 2,
    });

    expect(actors.getActor(target.id)?.health?.state).toBe('dead');
    expect(actors.getActor(target.id)?.hostility).toBe('dead');
  });
});
