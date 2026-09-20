import { describe, expect, it } from 'vitest';
import type { Actor } from '../../../../actors/actorTypes.js';
import { CivicService } from '../../../../civic/civicService.js';
import { stableStringHashPositive } from '../../../../core/math.js';
import type { LayerEntrance } from '../../../../layers/layerTypes.js';
import type { HeadlessScenario } from '../../../../test/headless/headlessScenario.js';
import { createHeadlessScenario } from '../../../../test/headless/headlessScenario.js';
import {
  adjacentWalkableTile,
  findGeneratedTownDoor,
} from '../../../../test/headless/scenarioFixtures.js';
import { createTownRuntimeState } from '../../../../world/townRuntime.js';
import type { TownStructure } from '../../../../world/town.js';
import type { RoomSnapshot } from '../../../../world/types.js';

describe('Town civic stories', () => {
  it('TOWN-CIVIC-001 - declaration and campaign rounds use normal actor interactions', async () => {
    const scenario = createHeadlessScenario({ seed: 'town-civic-001-campaign-round' });
    const { room: townHallRoom, entrance: townHallDoor } = findGeneratedTownDoor(scenario, {
      templateId: 'townHall',
    });

    scenario.setDayPhase('day');
    moveSnakeIntoDoor(scenario, townHallRoom, townHallDoor);
    await scenario.advanceActorTicks(3);
    const official = currentRoomActorWithRole(scenario, 'civicOfficial');

    const declarationOptions = scenario.game.getActorInteractionMenu(official.id)?.options ?? [];
    const declareOption = declarationOptions.find((option) => option.id === 'run-for-mayor');
    expect(declareOption).toMatchObject({ enabled: true });
    expect(declarationOptions.filter((option) => option.id.startsWith('run-for-mayor:'))).toEqual(
      [],
    );

    const declared = await scenario.game.chooseActorInteraction(
      official.id,
      'run-for-mayor:community-celebration',
    );
    expect(declared).toMatchObject({ ok: true, action: 'run-for-mayor:community-celebration' });

    const { room: tavernRoom, entrance: tavernDoor } = findGeneratedTownDoor(scenario, {
      templateId: 'tavern',
    });
    moveSnakeIntoDoor(scenario, tavernRoom, tavernDoor);
    await scenario.advanceActorTicks(3);
    const bartender = currentRoomActorWithRole(scenario, 'bartender');
    const bartenderOptions = scenario.game
      .getActorInteractionMenu(bartender.id)
      ?.options.map((option) => option.id);

    expect(bartenderOptions).toEqual(
      expect.arrayContaining([
        'campaign-shake-hands',
        'campaign-button',
        'campaign-smear',
        'campaign-buy-round',
      ]),
    );

    scenario.game.setScore(139);
    expect(
      await scenario.game.chooseActorInteraction(bartender.id, 'campaign-buy-round'),
    ).toMatchObject({
      ok: false,
      action: 'campaign-buy-round',
      reason: 'insufficient-score',
    });

    scenario.game.setScore(140);
    const round = await scenario.game.chooseActorInteraction(bartender.id, 'campaign-buy-round');

    expect(round).toMatchObject({
      ok: true,
      action: 'campaign-buy-round',
      actorId: bartender.id,
    });
    expect(scenario.game.getScore()).toBe(0);
    expect(
      round.ok && round.action === 'campaign-buy-round' && round.civic.activeElection?.boughtRound,
    ).toBe(true);
    expect(
      round.ok &&
        round.action === 'campaign-buy-round' &&
        round.civic.activeElection?.voterActions[bartender.id]?.shookHands,
    ).not.toBe(true);

    const handshake = await scenario.game.chooseActorInteraction(
      bartender.id,
      'campaign-shake-hands',
    );
    expect(handshake).toMatchObject({
      ok: true,
      action: 'campaign-shake-hands',
      actorId: bartender.id,
    });
    expect(
      handshake.ok &&
        handshake.action === 'campaign-shake-hands' &&
        handshake.civic.activeElection?.voterActions[bartender.id],
    ).toMatchObject({
      shookHands: true,
    });
    expect(
      scenario.game
        .getActorInteractionMenu(official.id)
        ?.options.map((option) => option.id)
        .some((id) => id.startsWith('campaign-')),
    ).toBe(false);
    scenario.assertWorldIntegrity();
  });

  it('TOWN-CIVIC-002 - Law & Order adds one town patrol guard through policy projection', () => {
    const scenario = createHeadlessScenario({ seed: 'town-civic-002-law-patrol' });
    const { room } = findGeneratedTownDoor(scenario, { templateId: 'townHall' });
    const town = requireTown(room);
    const civic = new CivicService();
    const runtime = createTownRuntimeState(town, civic);
    scenario.enterRoom(room.id, town.center);

    scenario.game.setFlag(`town.runtime.${town.id}`, {
      ...runtime,
      civic: {
        ...runtime.civic,
        mayor: { kind: 'player', playerId: 'player' },
        enactedPlatformId: 'law-and-order',
      },
    });

    const patrol = scenario.game.resolveTownPatrolExcursion(town.id);
    const baseline = 1 + (stableStringHashPositive(`${town.id}:patrol:size`) % 4);

    expect(patrol?.members).toHaveLength(baseline + 1);
    scenario.assertWorldIntegrity();
  });

  it('TOWN-CIVIC-003 - Town Board shows quests before civic business', () => {
    const scenario = createHeadlessScenario({ seed: 'town-civic-003-board-quests' });
    const { room } = findGeneratedTownDoor(scenario, { templateId: 'townHall' });
    const town = requireTown(room);

    scenario.enterRoom(room.id, town.center);
    const board = scenario.game.getTownBoardView();

    expect(board?.townId).toBe(town.id);
    expect(board?.quests).toBeDefined();
    expect(board?.campaignStatus).toBeUndefined();
    scenario.assertWorldIntegrity();
  });

  it('TOWN-CIVIC-004 - Town Board shows campaign status during an active election', async () => {
    const scenario = createHeadlessScenario({ seed: 'town-civic-004-board-campaign' });
    const { room: townHallRoom, entrance: townHallDoor } = findGeneratedTownDoor(scenario, {
      templateId: 'townHall',
    });

    scenario.setDayPhase('day');
    moveSnakeIntoDoor(scenario, townHallRoom, townHallDoor);
    await scenario.advanceActorTicks(3);
    const official = currentRoomActorWithRole(scenario, 'civicOfficial');

    expect(
      await scenario.game.chooseActorInteraction(official.id, 'run-for-mayor:people-first'),
    ).toMatchObject({ ok: true });

    const board = scenario.game.getTownBoardView();

    expect(board?.campaignStatus).toMatchObject({
      playerName: 'Snake',
      incumbentName: official.displayName,
    });
    expect(board?.campaignStatus?.playerPercent).toBeGreaterThanOrEqual(0);
    expect(board?.campaignStatus?.incumbentPercent).toBeGreaterThanOrEqual(0);
    scenario.assertWorldIntegrity();
  });

  it('TOWN-CIVIC-005 - overdue election resolves on save/load with an obvious result', async () => {
    const scenario = createHeadlessScenario({ seed: 'town-civic-005-overdue-load' });
    const { room: townHallRoom, entrance: townHallDoor } = findGeneratedTownDoor(scenario, {
      templateId: 'townHall',
    });

    scenario.setDayPhase('day');
    moveSnakeIntoDoor(scenario, townHallRoom, townHallDoor);
    await scenario.advanceActorTicks(3);
    const official = currentRoomActorWithRole(scenario, 'civicOfficial');
    const declared = await scenario.game.chooseActorInteraction(
      official.id,
      'run-for-mayor:law-and-order',
    );
    expect(declared).toMatchObject({ ok: true });
    if (!declared.ok) {
      throw new Error('Expected mayoral declaration to succeed.');
    }

    const loaded = scenario.game.loadFromSaveData({
      ...scenario.game.getSaveData(),
      atmosphere: {
        ...scenario.game.getAtmosphereState(),
        worldDay:
          declared.ok && declared.action === 'run-for-mayor:law-and-order'
            ? declared.civic.activeElection!.resolveAtWorldDay + 1
            : 3,
        dayPhase: 'day',
      },
    });

    expect(loaded).toBe(true);
    const runtime = scenario.game.getFlag<TownRuntimeSnapshot>(
      `town.runtime.${
        declared.ok && declared.action === 'run-for-mayor:law-and-order'
          ? declared.civic.activeElection!.townId
          : ''
      }`,
    );
    expect(runtime?.civic.activeElection).toBeUndefined();
    expect(runtime?.civic.electionHistory).toHaveLength(1);
    expect(scenario.game.getFlag<{ message?: string }>('ui.questInteraction')?.message).toContain(
      'Election result:',
    );
    scenario.assertWorldIntegrity();
  });

  it('TOWN-CIVIC-006 - overdue unloaded town resolves when the town becomes available', () => {
    const scenario = createHeadlessScenario({ seed: 'town-civic-006-overdue-return' });
    const { room } = findGeneratedTownDoor(scenario, { templateId: 'townHall' });
    const town = requireTown(room);
    const civic = new CivicService();
    const runtime = createTownRuntimeState(town, civic);

    scenario.game.setFlag(`town.runtime.${town.id}`, {
      ...runtime,
      civic: {
        ...runtime.civic,
        activeElection: {
          id: `election:${town.id}:player:overdue`,
          townId: town.id,
          incumbentActorId:
            runtime.civic.mayor.kind === 'actor' ? runtime.civic.mayor.actorId : undefined,
          candidatePlayerId: 'player',
          platformId: 'business-first',
          declaredAtWorldDay: 0,
          resolveAtWorldDay: -1,
          boughtRound: false,
          voterActions: {},
        },
      },
    });

    scenario.enterRoom(room.id, town.center);

    const resolved = scenario.game.getFlag<TownRuntimeSnapshot>(`town.runtime.${town.id}`);
    expect(resolved?.civic.activeElection).toBeUndefined();
    expect(resolved?.civic.electionHistory).toHaveLength(1);
    expect(scenario.game.getFlag<{ message?: string }>('ui.questInteraction')?.message).toContain(
      'Election result:',
    );
    scenario.assertWorldIntegrity();
  });

  it('TOWN-CIVIC-007 - Town Board persists latest result and Mayor office', () => {
    const scenario = createHeadlessScenario({ seed: 'town-civic-007-board-result' });
    const { room } = findGeneratedTownDoor(scenario, { templateId: 'townHall' });
    const town = requireTown(room);
    const civic = new CivicService();
    const runtime = createTownRuntimeState(town, civic);

    scenario.game.setFlag(`town.runtime.${town.id}`, {
      ...runtime,
      civic: {
        ...runtime.civic,
        mayor: { kind: 'player', playerId: 'player' },
        enactedPlatformId: 'law-and-order',
        electionHistory: [
          {
            id: `result:election:${town.id}`,
            townId: town.id,
            platformId: 'law-and-order',
            candidatePlayerId: 'player',
            incumbentActorId:
              runtime.civic.mayor.kind === 'actor' ? runtime.civic.mayor.actorId : undefined,
            resolvedAtWorldDay: 4,
            winner: { kind: 'player', playerId: 'player' },
            playerVotes: 9,
            incumbentVotes: 7,
            ballots: [],
          },
        ],
      },
    });
    scenario.enterRoom(room.id, town.center);

    const board = scenario.game.getTownBoardView();

    expect(board?.latestResult).toMatchObject({
      mayorName: 'Snake',
      platformLabel: 'Law & Order',
      lastElectionLine: expect.stringContaining('Snake 9'),
    });
    expect(board?.mayorOffice).toMatchObject({
      mayorName: 'Snake',
      platformLabel: 'Law & Order',
    });
    expect(scenario.game.getPlayerCivicOfficeSummaries()).toContainEqual({
      townId: town.id,
      townName: town.name,
      platformLabel: 'Law & Order',
    });
    scenario.assertWorldIntegrity();
  });

  it('TOWN-CIVIC-008 - Law & Order polling uses actual known guild membership', () => {
    const scenario = createHeadlessScenario({ seed: 'town-civic-008-guild-knowledge' });
    const { room } = findGeneratedTownDoor(scenario, { templateId: 'townHall' });
    const town = requireTown(room);
    const civic = new CivicService();
    const runtime = createTownRuntimeState(town, civic);
    const activeElection = {
      id: `election:${town.id}:player:guild-knowledge`,
      townId: town.id,
      incumbentActorId:
        runtime.civic.mayor.kind === 'actor' ? runtime.civic.mayor.actorId : undefined,
      candidatePlayerId: 'player',
      platformId: 'law-and-order' as const,
      declaredAtWorldDay: 2,
      resolveAtWorldDay: 4,
      boughtRound: false,
      voterActions: {},
    };

    town.discoveredGuild = true;
    if (town.thievesGuild) {
      town.thievesGuild.discovered = true;
    }
    scenario.game.setFlag(`town.runtime.${town.id}`, {
      ...runtime,
      discoveredGuild: true,
      civic: {
        ...runtime.civic,
        activeElection,
      },
    });
    scenario.enterRoom(room.id, town.center);

    const actorSystem = scenario.game.getActorSystem();
    const thiefIds = Array.from({ length: 12 }, (_, index) => `poll-thief-${index}`);
    for (const residentId of thiefIds) {
      actorSystem.registry.ensureTownResidentActor({
        residentId,
        name: `Guild Voter ${residentId}`,
        role: 'thief',
        factionId: 'thieves-guild',
        townId: town.id,
        currentRoomId: room.id,
        homeRoomId: room.id,
        workRoomId: room.id,
        postPosition: town.center,
      });
    }

    const unknownPoll = scenario.game.getTownBoardView()?.campaignStatus?.playerPercent;

    for (const residentId of thiefIds) {
      const actorId = `town:${town.id}:thief:${residentId}`;
      actorSystem.registry.update(actorId, (actor) => ({
        ...actor,
        memory: [
          ...actor.memory,
          {
            id: `memory:${actorId}:knows-player-guild-member`,
            type: 'town-gossip',
            summary: 'The voter knows the player is a member of the local guild.',
            tags: ['guild', 'player', 'member'],
            intensity: 18,
            createdAtRoomNumber: 6,
            source: 'heard',
          },
        ],
      }));
    }

    const knownPoll = scenario.game.getTownBoardView()?.campaignStatus?.playerPercent;

    expect(unknownPoll).toBeDefined();
    expect(knownPoll).toBeDefined();
    expect(knownPoll).toBeGreaterThan(unknownPoll ?? 0);
    scenario.assertWorldIntegrity();
  });
});

function moveSnakeIntoDoor(
  scenario: HeadlessScenario,
  room: RoomSnapshot,
  entrance: LayerEntrance,
): void {
  const approach = adjacentWalkableTile(room, entrance);
  scenario.enterRoom(room.id, approach);
  scenario.game.forceDirection(entrance.x - approach.x, entrance.y - approach.y);
  scenario.advanceActionTicks(1);
}

function currentRoomActorWithRole(scenario: HeadlessScenario, role: Actor['role']): Actor {
  const actor = scenario.game.getActorsInCurrentRoom().find((entry) => entry.role === role);
  if (!actor) {
    throw new Error(`No ${role} actor in current room ${scenario.currentRoom().id}.`);
  }
  return actor;
}

function requireTown(room: RoomSnapshot): TownStructure {
  if (!room.town) {
    throw new Error(`Expected room ${room.id} to belong to a town.`);
  }
  return room.town;
}

interface TownRuntimeSnapshot {
  civic: {
    activeElection?: unknown;
    electionHistory: unknown[];
  };
}
