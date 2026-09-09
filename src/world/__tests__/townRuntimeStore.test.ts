import { describe, expect, it } from 'vitest';
import { createPhysicalHumanTown } from '../town.js';
import { applyTownRuntimeState, createTownRuntimeState } from '../townRuntime.js';

describe('TownRuntimeStore civic slice preservation', () => {
  it('preserves active civic elections when unrelated gate runtime is saved', () => {
    const town = createPhysicalHumanTown({
      biomeId: 'verdigris-basin',
      seed: 77,
      townId: 'town-runtime-test',
      districtRoomIds: {
        '0,0,0': 'townCenter',
        '1,0,0': 'marketStreet',
        '0,1,0': 'residentialStreet',
        '1,1,0': 'backAlley',
      },
      entranceRoomId: '0,0,0',
      exitRoomIds: ['1,1,0'],
    });
    const previous = createTownRuntimeState(town);
    previous.civic = {
      ...previous.civic,
      activeElection: {
        id: 'election:preserved',
        townId: town.id,
        incumbentActorId:
          previous.civic.mayor.kind === 'actor' ? previous.civic.mayor.actorId : undefined,
        candidatePlayerId: 'player',
        platformId: 'business-first',
        declaredAtWorldDay: 1,
        resolveAtWorldDay: 3,
        boughtRound: false,
        voterActions: {},
      },
    };

    const gateOpened = {
      ...town,
      gates: town.gates.map((gate, index) =>
        index === 0 ? { ...gate, state: 'open' as const } : gate,
      ),
    };
    const next = createTownRuntimeState(gateOpened, undefined, previous);

    expect(next.openedGates).toContain(town.gates[0]?.id);
    expect(next.civic.activeElection?.id).toBe('election:preserved');
    expect(applyTownRuntimeState(town, next).gates[0]?.state).toBe('open');
  });
});
