import { describe, expect, it } from 'vitest';
import { ActorSystem } from '../actorSystem.js';
import { buildActorInteractionMenu } from '../actorInteractions.js';
import { getActorIndicators } from '../actorIndicators.js';
import { selectActorVoiceLine } from '../actorVoice.js';
import type { TownStructure } from '../../world/town.js';
import type { RoomSnapshot } from '../../world/types.js';
import { createActorPresence } from '../actorPresence.js';
import type { ActorTelemetryEvent } from '../actorTelemetry.js';
import { getBiomeDefinition } from '../../world/biomes.js';
import { resolveBiomeAtmosphere } from '../../world/atmosphereResolver.js';
import type { AtmosphereState, DayPhase, GlobalWeather } from '../../world/atmosphereTypes.js';

function resolvedAtmosphere(dayPhase: DayPhase, globalWeather: GlobalWeather = 'clear') {
  const state: AtmosphereState = {
    worldDay: 0,
    season: 'spring',
    dayPhase,
    phaseProgress: 0,
    globalWeather,
    weatherIntensity: 0,
    remainingWeatherPhaseTicks: 2,
    weatherSeed: 1,
    weatherTransitionProgress: 1,
    skyEvent: { current: 'none', remainingPhaseTicks: 0, intensity: 0, seed: 1 },
  };
  return resolveBiomeAtmosphere(getBiomeDefinition('verdigris-basin'), state);
}

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
    expect(actor.combat?.ranged).toBe(true);
    expect(actor.combat?.melee).toBe(true);
    expect(actor.health?.max).toBe(3);
    expect(actor.soul?.wound).toBeTruthy();
    expect(actor.lore?.scale).toBe('kingdom');
    expect(actors.getActorsInRoom('0,0,0')).toContainEqual(actor);
  });

  it('generates lightweight local social links during town sync', () => {
    const actors = new ActorSystem();
    actors.syncTown(
      {
        id: 'eastmere',
        residents: [
          {
            id: 'nina',
            name: 'Nina',
            role: 'guard',
            factionId: 'hearthbound-remnant',
            townId: 'eastmere',
            x: 2,
            y: 2,
            workRoomId: '0,0,0',
          },
          {
            id: 'marta',
            name: 'Marta',
            role: 'shopkeeper',
            factionId: 'hearthbound-remnant',
            townId: 'eastmere',
            x: 4,
            y: 2,
            workRoomId: '0,0,0',
          },
        ],
      } as TownStructure,
      '0,0,0',
    );

    expect(actors.getActor('town:eastmere:guard:nina')?.relationships[0]?.actorId).toBe(
      'town:eastmere:shopkeeper:marta',
    );
  });

  it('syncs villages, questgivers, and goblin camps as room actors', () => {
    const actors = new ActorSystem();
    actors.ensureActorsFromRoomContent({
      room: {
        id: '0,0,0',
        village: {
          residents: [{ id: 'lina', name: 'Lina', x: 2, y: 2, portraitId: 'villager-1' }],
          shopkeeper: { id: 'shop', name: 'Rook', x: 3, y: 2, portraitId: 'shopkeeper-1' },
        },
        questGiver: { id: 'sage', name: 'Sage', x: 5, y: 2, portraitId: 'sage-1' },
        goblinCamp: {
          id: 'gobcamp',
          shopkeeper: { id: 'gobshop', name: 'Nackle', x: 7, y: 2, portraitId: 'goblin-neutral' },
          guards: [{ id: 'gobguard', name: 'Grib', x: 8, y: 2, portraitId: 'goblin-neutral' }],
        },
      } as RoomSnapshot,
      roomNumber: 4,
    });

    expect(actors.getActor('town:village:0,0,0:resident:lina')?.role).toBe('resident');
    expect(actors.getActor('town:village:0,0,0:shopkeeper:shop')?.role).toBe('shopkeeper');
    expect(actors.getActor('town:quest:0,0,0:questGiver:sage')?.role).toBe('questGiver');
    expect(actors.getActor('town:gobcamp:shopkeeper:gobshop')?.factionId).toBe('goblin-camps');
    expect(actors.getActor('town:gobcamp:guard:gobguard')?.combat?.armed).toBe(true);
    expect(actors.getActorsInRoom('0,0,0')).toHaveLength(5);
  });

  it('initializes promoted actor schedules from canonical atmosphere instead of room count', () => {
    const actors = new ActorSystem();
    actors.ensureActorsFromRoomContent({
      room: {
        id: '0,0,0',
        village: {
          residents: [],
          shopkeeper: { id: 'shop', name: 'Rook', x: 3, y: 2, portraitId: 'shopkeeper-1' },
        },
      } as unknown as RoomSnapshot,
      roomNumber: 7,
      atmosphere: resolvedAtmosphere('day'),
    });

    expect(actors.getActor('town:village:0,0,0:shopkeeper:shop')?.scheduleGoal).toMatchObject({
      kind: 'work',
      reason: 'day-schedule',
    });
  });

  it('keeps resident identity when a town resident becomes a hostile enemy', () => {
    const actors = new ActorSystem();
    const resident = actors.registry.ensureTownResidentActor({
      residentId: 'lindsey',
      name: 'Lindsey',
      role: 'resident',
      factionId: 'hearthbound-remnant',
      townId: 'eastmere',
      currentRoomId: '0,0,0',
    });

    const hostile = actors.registry.ensureEnemyActor({
      actorId: resident.id,
      enemyId: 'npc-hostile:town-eastmere-lindsey-0',
      roomId: '0,0,0',
      name: 'Lindsey',
      encounterKind: 'npc-hostile',
      currentHearts: 3,
      maxHearts: 3,
    });

    expect(hostile.id).toBe(resident.id);
    expect(hostile.kind).toBe('civilian');
    expect(hostile.role).toBe('resident');
    expect(hostile.flags.enemyId).toBe('npc-hostile:town-eastmere-lindsey-0');
    expect(hostile.health?.max).toBe(3);
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
    actors.registry.update(shopkeeper.id, (actor) => ({
      ...actor,
      mood: { ...actor.mood, trust: 40 },
    }));

    const menu = buildActorInteractionMenu(actors.getActor(shopkeeper.id) ?? shopkeeper, {
      thievesGuildUnlocked: false,
      recentRumorCount: 1,
    });
    expect(menu.options.map((option) => option.id)).toContain('shop');
    expect(menu.options.map((option) => option.id)).toContain('ask-personal');
    expect(menu.options.find((option) => option.id === 'ask-rumor')?.enabled).toBe(true);
    expect(menu.options.find((option) => option.id === 'pickpocket')?.enabled).toBe(false);
    expect(menu.indicators.map((indicator) => indicator.kind)).not.toContain('shop');

    const initiationMenu = buildActorInteractionMenu(actors.getActor(shopkeeper.id) ?? shopkeeper, {
      thievesGuildUnlocked: false,
      canPickpocket: true,
    });
    expect(initiationMenu.options.find((option) => option.id === 'pickpocket')?.enabled).toBe(true);

    actors.registry.update(shopkeeper.id, (actor) => ({
      ...actor,
      goal: { kind: 'sleep', priority: 20, reason: 'test-sleep' },
      activity: { kind: 'sleeping', source: 'schedule' },
    }));
    const sleepingMenu = buildActorInteractionMenu(actors.getActor(shopkeeper.id) ?? shopkeeper);
    expect(sleepingMenu.options.map((option) => option.id)).toEqual(['wake', 'leave']);

    actors.registry.update(shopkeeper.id, (actor) => ({
      ...actor,
      role: 'butcher',
      flags: { ...actor.flags, sleepInterrupted: true },
      activity: { kind: 'idle', source: 'social' },
    }));
    const interruptedMenu = buildActorInteractionMenu(actors.getActor(shopkeeper.id) ?? shopkeeper);
    const shop = interruptedMenu.options.find((option) => option.id === 'shop');
    expect(shop).toMatchObject({
      enabled: false,
      reason: 'Closed: let them sleep',
    });
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

  it('maps every relationship species to an actor species without degrading molemen', () => {
    const actors = new ActorSystem();

    const relationshipActor = actors.registry.ensureRelationshipActor({
      relationshipId: 'relationship:moleman:date',
      displayName: 'Moleman Date',
      species: 'moleman',
      personality: 'sharp',
      homeRoomId: '0,0,0',
      stage: 'crush',
    });

    expect(relationshipActor.species).toBe('moleman');
    expect(relationshipActor.kind).toBe('civilian');
    expect(relationshipActor.personality).toEqual(['romantic', 'sentimental', 'sharp']);
  });

  it('maps specialized town roles without degrading them to resident', () => {
    const actors = new ActorSystem();

    const blackMarketActor = actors.registry.ensureTownResidentActor({
      residentId: 'shade',
      name: 'Shade',
      role: 'blackMarketMerchant',
      townId: 'eastmere',
    });

    expect(blackMarketActor.role).toBe('blackMarketMerchant');
    expect(blackMarketActor.kind).toBe('shopkeeper');
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

  it('selects focus-gated personal actor voice when soul details are available', () => {
    const actors = new ActorSystem();
    const resident = actors.registry.ensureTownResidentActor({
      residentId: 'nina',
      name: 'Nina',
      role: 'guard',
      factionId: 'hearthbound-remnant',
      townId: 'eastmere',
      currentRoomId: '0,0,0',
    });
    actors.registry.update(resident.id, (actor) => ({ ...actor, focus: 12 }));

    const line = selectActorVoiceLine({
      actor: actors.getActor(resident.id)!,
      biomeId: 'verdigris-basin',
      dangerLevel: 10,
      playerHealth: 3,
      playerMaxHealth: 3,
      snakeLength: 4,
      flags: {},
      recentEvents: [],
      random: () => 0,
    });

    expect(line.id).toBe('actor-soul-wound');
  });

  it('keeps routine rumor and personal reveal state out of world indicators', () => {
    const actors = new ActorSystem();
    const resident = actors.registry.ensureTownResidentActor({
      residentId: 'marta',
      name: 'Marta',
      role: 'shopkeeper',
      factionId: 'hearthbound-remnant',
      townId: 'eastmere',
      currentRoomId: '0,0,0',
    });
    actors.registry.update(resident.id, (actor) => ({
      ...actor,
      memory: [
        {
          id: 'memory:rumor:1',
          type: 'rumor',
          summary: 'A rumor happened.',
          source: 'rumor',
          intensity: 30,
          tags: ['rumor'],
        },
      ],
      soul: actor.soul
        ? { ...actor.soul, revealed: { ...actor.soul.revealed, wound: true } }
        : actor.soul,
    }));

    const kinds = getActorIndicators(actors.getActor(resident.id)!, 6).map(
      (indicator) => indicator.kind,
    );
    expect(kinds).not.toContain('rumor');
    expect(kinds).not.toContain('secret');
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

  it('targets hostile-faction actors without making guards hostile to the player', () => {
    const events: ActorTelemetryEvent[] = [];
    const actors = new ActorSystem();
    actors.setTelemetrySink((event) => events.push(event));
    const guard = actors.registry.ensureTownResidentActor({
      residentId: 'nina',
      name: 'Nina',
      role: 'guard',
      factionId: 'hearthbound-remnant',
      townId: 'eastmere',
      currentRoomId: '0,0,0',
    });
    const thief = actors.registry.ensureTownResidentActor({
      residentId: 'shade',
      name: 'Shade',
      role: 'thief',
      factionId: 'thieves-guild',
      townId: 'eastmere',
      currentRoomId: '0,0,0',
    });

    actors.resolveFactionConflicts('0,0,0');

    const updatedGuard = actors.getActor(guard.id);
    expect(updatedGuard?.goal).toMatchObject({
      kind: 'attackActor',
      targetActorId: thief.id,
      reason: 'faction-conflict',
    });
    expect(updatedGuard?.targetedThreat).toMatchObject({
      targetActorId: thief.id,
      reason: 'faction-conflict',
      source: 'faction',
    });
    expect(updatedGuard?.hostility).not.toBe('hostile');
    expect(updatedGuard?.playerHostility?.state).not.toBe('hostile');
    expect(events.some((event) => event.type === 'actor.player_hostility_changed')).toBe(false);
    expect(events).toContainEqual(
      expect.objectContaining({
        type: 'actor.threat_changed',
        actorId: guard.id,
        reason: 'faction-conflict',
        data: expect.objectContaining({ targetActorId: thief.id }),
      }),
    );
  });

  it('keeps schedules as base intent while urgent faction combat interrupts and resumes', () => {
    const actors = new ActorSystem();
    const guard = actors.registry.ensureTownResidentActor({
      residentId: 'gate',
      name: 'Gate Guard',
      role: 'gateGuard',
      factionId: 'hearthbound-remnant',
      townId: 'eastmere',
      currentRoomId: '0,0,0',
      postPosition: { x: 2, y: 8 },
    });
    actors.registry.update(guard.id, (actor) => ({
      ...actor,
      schedule: {
        permanentDuty: true,
        fixedPostRoomId: '0,0,0',
        fixedPostPosition: { x: 2, y: 8 },
      },
    }));
    actors.applyScheduleGoals({ roomNumber: 1 });
    const scheduled = actors.getActor(guard.id);
    expect(scheduled?.scheduleGoal).toMatchObject({ kind: 'defendArea' });
    expect(scheduled?.goal).toMatchObject({ kind: 'defendArea' });

    const bandit = actors.registry.ensureTownResidentActor({
      residentId: 'bandit',
      name: 'Bandit',
      role: 'thief',
      factionId: 'bandits',
      townId: 'raiders',
      currentRoomId: '0,0,0',
    });
    actors.resolveFactionConflicts('0,0,0');
    expect(actors.getActor(guard.id)?.goal).toMatchObject({
      kind: 'attackActor',
      targetActorId: bandit.id,
    });

    actors.registry.update(bandit.id, (actor) => ({
      ...actor,
      health: { current: 0, max: 3, state: 'dead' },
      hostility: 'dead',
    }));
    actors.resumeGoal(guard.id);

    expect(actors.getActor(guard.id)?.goal).toMatchObject({ kind: 'defendArea' });
  });

  it('updates merchant schedule goals across day phases without room reload', () => {
    const actors = new ActorSystem();
    const merchant = actors.registry.ensureTownResidentActor({
      residentId: 'marta',
      name: 'Marta',
      role: 'shopkeeper',
      factionId: 'hearthbound-remnant',
      townId: 'eastmere',
      currentRoomId: '0,0,0',
      homeRoomId: 'home-room',
      workRoomId: 'shop-room',
    });

    actors.applyScheduleGoals({ roomNumber: 12, atmosphere: resolvedAtmosphere('day') });
    expect(actors.getActor(merchant.id)?.scheduleGoal).toMatchObject({
      kind: 'work',
      roomId: 'shop-room',
    });

    actors.applyScheduleGoals({ roomNumber: 23, atmosphere: resolvedAtmosphere('night') });

    expect(actors.getActor(merchant.id)?.scheduleGoal).toMatchObject({
      kind: 'sleep',
      roomId: 'home-room',
    });
  });

  it('does not let mild weather errands override higher-priority sleep schedules', () => {
    const actors = new ActorSystem();
    const merchant = actors.registry.ensureTownResidentActor({
      residentId: 'hale',
      name: 'Hale',
      role: 'butcher',
      factionId: 'hearthbound-remnant',
      townId: 'eastmere',
      currentRoomId: 'market-street',
      homeRoomId: 'home-room',
      workRoomId: 'butcher-room',
    });

    actors.applyScheduleGoals({ roomNumber: 12, atmosphere: resolvedAtmosphere('night') });
    expect(actors.getActor(merchant.id)?.goal).toMatchObject({
      kind: 'sleep',
      priority: 20,
      roomId: 'home-room',
    });

    actors.applyScheduleGoals({ roomNumber: 13, atmosphere: resolvedAtmosphere('night', 'fog') });

    expect(actors.getActor(merchant.id)?.goal).toMatchObject({
      kind: 'sleep',
      priority: 20,
      roomId: 'home-room',
    });
  });

  it('treats actor presence as authoritative after authored resync', () => {
    const actors = new ActorSystem();
    const resident = actors.registry.ensureTownResidentActor({
      residentId: 'alice',
      name: 'Alice',
      role: 'resident',
      factionId: 'hearthbound-remnant',
      townId: 'eastmere',
      currentRoomId: 'market',
    });
    actors.setPresence(
      resident.id,
      createActorPresence({ roomId: 'home', position: { x: 6, y: 5 } }),
      'test-move',
    );

    actors.registry.ensureTownResidentActor({
      residentId: 'alice',
      name: 'Alice',
      role: 'resident',
      factionId: 'hearthbound-remnant',
      townId: 'eastmere',
      currentRoomId: 'market',
    });

    expect(actors.getActor(resident.id)?.presence).toMatchObject({
      roomId: 'home',
      position: { x: 6, y: 5 },
    });
    expect(actors.getActorsInRoom('market')).toEqual([]);
    expect(actors.getActorsInRoom('home').map((actor) => actor.id)).toEqual([resident.id]);
  });

  it('emits copied from/to positions for presence telemetry', () => {
    const events: ActorTelemetryEvent[] = [];
    const actors = new ActorSystem();
    actors.setTelemetrySink((event) => events.push(event));
    const resident = actors.registry.ensureTownResidentActor({
      residentId: 'telemetry-resident',
      name: 'Telemetry Resident',
      role: 'resident',
      factionId: 'hearthbound-remnant',
      townId: 'eastmere',
      currentRoomId: 'market',
    });

    actors.setPresence(
      resident.id,
      createActorPresence({ roomId: 'market', position: { x: 4, y: 5 } }),
      'first-place',
    );
    actors.setPresence(
      resident.id,
      createActorPresence({ roomId: 'home', position: { x: 7, y: 8 } }),
      'test-move',
    );

    const event = events.find(
      (entry) => entry.type === 'actor.presence_changed' && entry.reason === 'test-move',
    );
    expect(event?.data).toMatchObject({
      fromPosition: { x: 4, y: 5 },
      toPosition: { x: 7, y: 8 },
    });
    expect(event?.data.fromPosition).not.toBe(event?.data.toPosition);
  });

  it('logs exact reasons for player-hostility changes', () => {
    const events: ActorTelemetryEvent[] = [];
    const actors = new ActorSystem();
    actors.setTelemetrySink((event) => events.push(event));
    const guard = actors.registry.ensureTownResidentActor({
      residentId: 'nina',
      name: 'Nina',
      role: 'guard',
      factionId: 'hearthbound-remnant',
      townId: 'eastmere',
      currentRoomId: '0,0,0',
    });

    actors.setPlayerHostility(guard.id, 'hostile', 'player-attacked-actor', 7);

    expect(events).toContainEqual(
      expect.objectContaining({
        type: 'actor.player_hostility_changed',
        actorId: guard.id,
        reason: 'player-attacked-actor',
        data: expect.objectContaining({
          reason: 'player-attacked-actor',
          next: expect.objectContaining({ state: 'hostile' }),
        }),
      }),
    );
  });

  it('does not mutate or log when an equivalent goal is requested', () => {
    const events: ActorTelemetryEvent[] = [];
    const actors = new ActorSystem();
    actors.setTelemetrySink((event) => events.push(event));
    const resident = actors.registry.ensureTownResidentActor({
      residentId: 'bob',
      name: 'Bob',
      role: 'resident',
      townId: 'eastmere',
      currentRoomId: '0,0,0',
    });
    const goal = { kind: 'wander', priority: 8, reason: 'daily-roam-schedule' } as const;

    actors.requestGoal(resident.id, goal);
    const mutationsAfterChange = actors.registry.getMutationCount();
    const goalEventsAfterChange = events.filter(
      (event) => event.type === 'actor.goal_changed',
    ).length;
    actors.requestGoal(resident.id, { ...goal });

    expect(actors.registry.getMutationCount()).toBe(mutationsAfterChange);
    expect(events.filter((event) => event.type === 'actor.goal_changed')).toHaveLength(
      goalEventsAfterChange,
    );
  });

  it('evaluates configured civilian, animal, and enemy schedules once per phase', () => {
    const actors = new ActorSystem();
    actors.registry.ensureTownResidentActor({
      residentId: 'marta',
      name: 'Marta',
      role: 'shopkeeper',
      townId: 'eastmere',
      currentRoomId: '0,0,0',
      homeRoomId: 'home',
      workRoomId: 'shop',
    });
    const rabbit = actors.registry.ensureAnimalActor({
      animalId: 'rabbit-1',
      animalType: 'rabbit',
      animalName: 'Rabbit',
      roomId: '0,0,0',
    });
    const bandit = actors.registry.ensureEnemyActor({
      enemyId: 'bandit-1',
      roomId: '0,0,0',
      name: 'Bandit',
      encounterKind: 'npc-hostile',
    });
    const first = actors.tick({
      nowMs: 100,
      deltaMs: 100,
      loadedRoomId: '0,0,0',
      roomNumber: 1,
      atmosphere: resolvedAtmosphere('day'),
    });
    const second = actors.tick({
      nowMs: 200,
      deltaMs: 100,
      loadedRoomId: '0,0,0',
      roomNumber: 1,
      atmosphere: resolvedAtmosphere('day'),
    });
    const dusk = actors.tick({
      nowMs: 300,
      deltaMs: 100,
      loadedRoomId: '0,0,0',
      roomNumber: 1,
      atmosphere: resolvedAtmosphere('dusk'),
    });
    const duskAgain = actors.tick({
      nowMs: 400,
      deltaMs: 100,
      loadedRoomId: '0,0,0',
      roomNumber: 1,
      atmosphere: resolvedAtmosphere('dusk'),
    });

    expect(first.schedulesEvaluated).toBe(3);
    expect(second.schedulesEvaluated).toBe(0);
    expect(dusk.schedulesEvaluated).toBe(3);
    expect(duskAgain.schedulesEvaluated).toBe(0);
    expect(actors.getActor(rabbit.id)?.scheduleGoal).toMatchObject({
      kind: 'wander',
      reason: 'schedule:seekDen',
    });
    expect(actors.getActor(bandit.id)?.scheduleGoal).toMatchObject({
      kind: 'defendArea',
      reason: 'schedule:patrol',
    });
    expect(actors.getTickCount()).toBe(4);
  });

  it('keeps actor queries and serialization byte-equivalent', () => {
    const actors = new ActorSystem();
    actors.registry.ensureTownResidentActor({
      residentId: 'nina',
      name: 'Nina',
      role: 'guard',
      townId: 'eastmere',
      currentRoomId: '0,0,0',
    });
    const before = JSON.stringify(actors.toSaveData());

    for (let index = 0; index < 100; index += 1) {
      actors.getActor('town:eastmere:guard:nina');
      actors.getActorsInRoom('0,0,0');
      actors.toSaveData();
    }

    expect(JSON.stringify(actors.toSaveData())).toBe(before);
  });

  it('emits one compact aggregate telemetry event per Actor tick', () => {
    const events: ActorTelemetryEvent[] = [];
    const actors = new ActorSystem();
    actors.setTelemetrySink((event) => events.push(event));
    actors.registry.ensureTownResidentActor({
      residentId: 'nina',
      name: 'Nina',
      role: 'guard',
      townId: 'eastmere',
      currentRoomId: '0,0,0',
    });

    actors.tick({
      nowMs: 100,
      deltaMs: 100,
      loadedRoomId: '0,0,0',
      roomNumber: 1,
    });

    const tickEvents = events.filter((event) => event.type === 'actor.tick');
    expect(tickEvents).toHaveLength(1);
    expect(tickEvents[0]?.data).toMatchObject({
      totalActors: 1,
      loadedRoomActors: 1,
      tickCount: 1,
    });
  });
});
