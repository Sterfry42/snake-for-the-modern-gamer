import { cloneTown, type TownRumor, type TownStructure, type WantedLevel } from './town.js';
import { CivicService } from '../civic/civicService.js';
import type { TownCivicState } from '../civic/civicTypes.js';

export interface TownRuntimeState {
  townId: string;
  wantedLevel: WantedLevel;
  suspicion: number;
  reputation: number;
  discoveredGuild: boolean;
  openedGates: string[];
  completedGuildJobs: string[];
  failedGuildJobs: string[];
  activeGuildJobId?: string;
  rumors: TownRumor[];
  noticesSeen: never[];
  stolenItemIds: never[];
  residents: Record<string, never>;
  civic: TownCivicState;
}

export interface TownRuntimeStore {
  get(townId: string): TownRuntimeState | undefined;
  list(): TownRuntimeState[];
  update(townId: string, update: (state: TownRuntimeState) => TownRuntimeState): TownRuntimeState;
  applyToTown(base: TownStructure): TownStructure;
}

export class FlagTownRuntimeStore implements TownRuntimeStore {
  private readonly civic = new CivicService();

  constructor(
    private readonly read: (key: string) => unknown,
    private readonly write: (key: string, value: TownRuntimeState) => void,
    private readonly baseTown: (townId: string) => TownStructure | undefined,
    private readonly entries: () => Iterable<readonly [string, unknown]> = () => [],
  ) {}

  get(townId: string): TownRuntimeState | undefined {
    return normalizeTownRuntimeState(this.read(this.key(townId)), this.baseTown(townId));
  }

  list(): TownRuntimeState[] {
    return Array.from(this.entries())
      .filter(([key]) => this.isRuntimeStateKey(key))
      .map(([, value]) => {
        const townId =
          typeof value === 'object' && value
            ? (value as Partial<TownRuntimeState>).townId
            : undefined;
        return townId ? normalizeTownRuntimeState(value, this.baseTown(townId)) : undefined;
      })
      .filter((value): value is TownRuntimeState => Boolean(value));
  }

  update(townId: string, update: (state: TownRuntimeState) => TownRuntimeState): TownRuntimeState {
    const base = this.baseTown(townId);
    if (!base) {
      throw new Error(`Cannot update missing town runtime "${townId}".`);
    }
    const current = this.get(townId) ?? createTownRuntimeState(base, this.civic);
    const next = update(current);
    this.write(this.key(townId), next);
    return next;
  }

  applyToTown(base: TownStructure): TownStructure {
    const runtime = this.get(base.id);
    return runtime ? applyTownRuntimeState(base, runtime) : base;
  }

  private key(townId: string): string {
    return `town.runtime.${townId}`;
  }

  private isRuntimeStateKey(key: string): boolean {
    return (
      key.startsWith('town.runtime.') &&
      !key.startsWith('town.runtime.patrol.') &&
      !key.startsWith('town.runtime.raid.')
    );
  }
}

export function createTownRuntimeState(
  town: TownStructure,
  civic = new CivicService(),
  previous?: TownRuntimeState,
): TownRuntimeState {
  return {
    townId: town.id,
    wantedLevel: town.wantedLevel,
    suspicion: town.suspicion ?? 0,
    reputation: town.reputation,
    discoveredGuild: town.discoveredGuild,
    openedGates: (town.gates ?? []).filter((gate) => gate.state === 'open').map((gate) => gate.id),
    completedGuildJobs: town.thievesGuild?.completedJobs ?? [],
    failedGuildJobs: town.thievesGuild?.failedJobs ?? [],
    activeGuildJobId: town.thievesGuild?.activeJobId ?? previous?.activeGuildJobId,
    rumors: town.rumors,
    noticesSeen: [],
    stolenItemIds: [],
    residents: {},
    civic: previous?.civic ?? civic.createInitialState(town),
  };
}

export function applyTownRuntimeState(
  town: TownStructure,
  runtime: TownRuntimeState,
): TownStructure {
  const next = cloneTown(town);
  next.wantedLevel = runtime.wantedLevel;
  next.suspicion = runtime.suspicion;
  next.reputation = runtime.reputation;
  next.discoveredGuild = runtime.discoveredGuild;
  next.buildings = next.buildings.map((building) =>
    building.kind === 'guildAccess'
      ? {
          ...building,
          hidden: !runtime.discoveredGuild,
          publicAccess: runtime.discoveredGuild,
          doorKind: runtime.discoveredGuild ? 'guildGrateOpen' : 'guildGrateClosed',
          doorLabel: runtime.discoveredGuild ? 'Enter Thieves Guild' : 'Inspect old grate',
          shortLabel: runtime.discoveredGuild ? 'Thieves Guild' : 'Old Drain',
        }
      : building,
  );
  next.rumors = runtime.rumors;
  next.gates = (next.gates ?? []).map((gate) =>
    runtime.openedGates.includes(gate.id) ||
    runtime.openedGates.includes(gate.townRoomId) ||
    runtime.openedGates.includes(gate.approachRoomId)
      ? { ...gate, state: 'open' }
      : gate,
  );
  if (next.thievesGuild) {
    next.thievesGuild.discovered = runtime.discoveredGuild;
    next.thievesGuild.completedJobs = [...runtime.completedGuildJobs];
    next.thievesGuild.failedJobs = [...runtime.failedGuildJobs];
    next.thievesGuild.activeJobId = runtime.activeGuildJobId;
  }
  return next;
}

function normalizeTownRuntimeState(
  value: unknown,
  baseTown: TownStructure | undefined,
): TownRuntimeState | undefined {
  if (!value || typeof value !== 'object' || !baseTown) {
    return undefined;
  }
  const state = value as Partial<TownRuntimeState>;
  return {
    ...createTownRuntimeState(baseTown, new CivicService()),
    ...state,
    townId: baseTown.id,
    wantedLevel: (state.wantedLevel ?? baseTown.wantedLevel) as WantedLevel,
    suspicion: state.suspicion ?? baseTown.suspicion ?? 0,
    reputation: state.reputation ?? baseTown.reputation,
    discoveredGuild: state.discoveredGuild ?? baseTown.discoveredGuild,
    openedGates: state.openedGates ?? [],
    completedGuildJobs: state.completedGuildJobs ?? [],
    failedGuildJobs: state.failedGuildJobs ?? [],
    rumors: state.rumors ?? baseTown.rumors,
    noticesSeen: [],
    stolenItemIds: [],
    residents: {},
    civic: state.civic ?? new CivicService().createInitialState(baseTown),
  };
}
