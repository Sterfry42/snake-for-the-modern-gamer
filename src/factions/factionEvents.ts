import type { Actor } from '../actors/actorTypes.js';
import type { WorldEvent } from '../events/worldEventTypes.js';
import {
  actorPrimaryFaction,
  defaultFactionRelations,
  factionsInWorldEvent,
  relationBetweenFactions,
  relationSeverityBump,
} from './factionRelations.js';
import type {
  FactionCurrentEvent,
  FactionCurrentEventPhase,
  FactionCurrentEventType,
  FactionSaveData,
  LocalFactionState,
} from './factionTypes.js';

const FACTION_SAVE_VERSION = 1;
const DEFAULT_MAX_EVENTS = 80;

export class FactionEventSystem {
  private readonly localStates = new Map<string, LocalFactionState>();
  private currentEvents: FactionCurrentEvent[] = [];

  constructor(private readonly maxEvents = DEFAULT_MAX_EVENTS) {}

  getStates(): LocalFactionState[] {
    return [...this.localStates.values()];
  }

  getEvents(limit = 12): FactionCurrentEvent[] {
    return this.currentEvents.slice(-Math.max(0, limit)).reverse();
  }

  getEventsForActor(actor: Actor, limit = 8): FactionCurrentEvent[] {
    const factionId = actorPrimaryFaction(actor);
    return this.currentEvents
      .filter((event) => {
        if (event.factionIds.includes(factionId)) return true;
        if (actor.townId && event.townId === actor.townId) return true;
        if (actor.currentRoomId && event.roomId === actor.currentRoomId) return true;
        return false;
      })
      .slice(-Math.max(0, limit))
      .reverse();
  }

  ensureState(factionId: string, scope: { townId?: string; roomId?: string } = {}): LocalFactionState {
    const id = stateIdFor(factionId, scope);
    const existing = this.localStates.get(id);
    if (existing) return existing;
    const state: LocalFactionState = {
      id,
      factionId,
      townId: scope.townId,
      roomId: scope.roomId,
      relationToPlayer: 0,
      fearOfPlayer: 0,
      respectForPlayer: 0,
      relations: defaultFactionRelations(factionId),
      tension: 12,
      danger: 8,
      resources: 50,
      activeEvents: [],
      recentEvents: [],
      flags: {},
    };
    this.localStates.set(id, state);
    return state;
  }

  createEvent(input: {
    type: FactionCurrentEventType;
    factionIds: string[];
    actorIds?: string[];
    townId?: string;
    roomId?: string;
    severity?: number;
    phase?: FactionCurrentEventPhase;
    createdAt: number;
    expiresAt?: number;
    summary?: string;
    tags?: string[];
    flags?: Record<string, unknown>;
  }): FactionCurrentEvent {
    const factionIds = [...new Set(input.factionIds)];
    const severity = Math.max(1, Math.min(100, Math.round(input.severity ?? 20)));
    const event: FactionCurrentEvent = {
      id: `faction:${input.type}:${input.townId ?? input.roomId ?? 'world'}:${input.createdAt}:${hashKey(factionIds.join('|'))}`,
      type: input.type,
      factionIds,
      actorIds: input.actorIds ?? [],
      townId: input.townId,
      roomId: input.roomId,
      severity,
      phase: input.phase ?? phaseForEventType(input.type),
      createdAt: input.createdAt,
      expiresAt: input.expiresAt ?? input.createdAt + expiryForEventType(input.type),
      summary: input.summary ?? defaultFactionEventSummary(input.type, factionIds),
      tags: [...new Set([...(input.tags ?? []), 'faction', input.type])],
      flags: input.flags ?? {},
    };
    this.currentEvents = [...this.currentEvents.filter((entry) => entry.id !== event.id), event].slice(-this.maxEvents);
    for (const factionId of factionIds) {
      this.applyEventToState(factionId, event);
    }
    return event;
  }

  createEventsFromWorldEvent(event: WorldEvent, actors: readonly Actor[] = []): FactionCurrentEvent[] {
    const factionIds = factionsInWorldEvent(event);
    const currentRoom = event.createdAtRoomNumber ?? 0;
    const created: FactionCurrentEvent[] = [];
    const actorIds = actors
      .filter((actor) => event.witnessActorIds.includes(actor.id) || event.targetActorIds.includes(actor.id))
      .map((actor) => actor.id);

    if (event.type === 'town-crime' || event.tags.includes('pickpocket')) {
      created.push(
        this.createEvent({
          type: event.tags.includes('guild') || event.tags.includes('pickpocket') ? 'guild-exposure' : 'guard-crackdown',
          factionIds: [...new Set([...factionIds, 'guards', 'thieves-guild'])],
          actorIds,
          townId: typeof event.data?.townId === 'string' ? event.data.townId : undefined,
          roomId: event.roomId,
          severity: Math.max(20, event.severity + 8),
          createdAt: currentRoom,
          summary: event.tags.includes('pickpocket')
            ? 'Pickpocket panic has guards looking at alleys like they owe money.'
            : 'A town crime has turned law from furniture into weather.',
          tags: [...event.tags, 'law', 'guild'],
        }),
      );
    }

    if (event.type === 'humanoid-eaten' && event.tags.includes('humanoid')) {
      created.push(
        this.createEvent({
          type: 'skirmish',
          factionIds: [...new Set([...factionIds, 'hearthbound-remnant', 'bandits'])],
          actorIds,
          roomId: event.roomId,
          severity: Math.max(24, event.severity),
          createdAt: currentRoom,
          summary: 'A humanoid was eaten, and every faction nearby is deciding whether that was medicine or policy.',
          tags: [...event.tags, 'skirmish', 'player-action'],
        }),
      );
    }

    if (event.tags.includes('goblin') && (event.tags.includes('crime') || event.tags.includes('eaten'))) {
      created.push(
        this.createEvent({
          type: 'trade-dispute',
          factionIds: ['goblin-camps', 'hearthbound-remnant', 'guards'],
          actorIds,
          roomId: event.roomId,
          severity: Math.max(18, event.severity - 6),
          createdAt: currentRoom,
          summary: 'Goblin-human trade has become a conversation held through clenched receipts.',
          tags: [...event.tags, 'goblin', 'human', 'trade'],
        }),
      );
    }

    if (event.tags.includes('bandit') || event.tags.includes('hostile-kill')) {
      created.push(
        this.createEvent({
          type: event.severity >= 50 ? 'raid-aftermath' : 'raid-warning',
          factionIds: ['bandits', 'guards', 'shopkeepers'],
          actorIds,
          roomId: event.roomId,
          severity: Math.max(18, event.severity),
          createdAt: currentRoom,
          summary: event.severity >= 50
            ? 'Bandit violence has left the market counting what can still stand.'
            : 'Bandits have been seen close enough for shopkeepers to price fear.',
          tags: [...event.tags, 'bandit', 'raid'],
        }),
      );
    }

    return created;
  }

  maybeCreateRaidWarning(context: {
    roomId?: string;
    townId?: string;
    biomeDanger: number;
    wantedLevel?: number;
    createdAt: number;
  }): FactionCurrentEvent | undefined {
    const pressure = context.biomeDanger * 4 + (context.wantedLevel ?? 0) * 6;
    if (pressure < 24) return undefined;
    const alreadyActive = this.currentEvents.some(
      (event) =>
        event.type === 'raid-warning' &&
        event.phase !== 'resolved' &&
        event.roomId === context.roomId &&
        event.expiresAt !== undefined &&
        event.expiresAt > context.createdAt,
    );
    if (alreadyActive) return undefined;
    return this.createEvent({
      type: 'raid-warning',
      factionIds: ['bandits', 'guards', 'shopkeepers'],
      townId: context.townId,
      roomId: context.roomId,
      severity: Math.min(70, pressure),
      phase: 'brewing',
      createdAt: context.createdAt,
      summary: 'Bandits are close enough that the shops have started counting exits.',
      tags: ['bandit', 'raid', 'warning', 'danger'],
    });
  }

  tick(currentRoomNumber: number): void {
    const nextEvents: FactionCurrentEvent[] = [];
    for (const event of this.currentEvents) {
      if (event.expiresAt !== undefined && event.expiresAt <= currentRoomNumber) {
        if (event.phase === 'brewing' || event.phase === 'active') {
          nextEvents.push({ ...event, phase: 'aftermath', expiresAt: currentRoomNumber + 20 });
        } else if (event.phase === 'aftermath') {
          nextEvents.push({ ...event, phase: 'resolved', expiresAt: currentRoomNumber + 6 });
        }
        continue;
      }
      if (event.phase !== 'resolved' || (event.expiresAt ?? currentRoomNumber + 1) > currentRoomNumber) {
        nextEvents.push(event);
      }
    }
    this.currentEvents = nextEvents.slice(-this.maxEvents);
    for (const state of this.localStates.values()) {
      state.activeEvents = state.activeEvents.filter((id) => this.currentEvents.some((event) => event.id === id && event.phase !== 'resolved'));
      state.recentEvents = state.recentEvents.slice(-12);
      state.tension = Math.max(0, Math.round(state.tension * 0.98));
      state.danger = Math.max(0, Math.round(state.danger * 0.98));
    }
  }

  save(): FactionSaveData {
    return {
      version: FACTION_SAVE_VERSION,
      localStates: this.getStates(),
      currentEvents: [...this.currentEvents],
    };
  }

  load(save?: FactionSaveData): void {
    this.localStates.clear();
    this.currentEvents = [];
    for (const state of save?.localStates ?? []) {
      this.localStates.set(state.id, state);
    }
    this.currentEvents = (save?.currentEvents ?? []).slice(-this.maxEvents);
  }

  private applyEventToState(factionId: string, event: FactionCurrentEvent): void {
    const state = this.ensureState(factionId, { townId: event.townId, roomId: event.roomId });
    const otherFactions = event.factionIds.filter((id) => id !== factionId);
    let relationPressure = 0;
    for (const other of otherFactions) {
      const relation = state.relations[other] ?? relationBetweenFactions(factionId, other);
      relationPressure += relationSeverityBump(relation);
      state.relations[other] = escalateRelation(relation, event);
    }
    state.tension = Math.min(100, state.tension + Math.round(event.severity / 3) + relationPressure);
    state.danger = Math.min(100, state.danger + eventDanger(event));
    state.resources = Math.max(0, Math.min(100, state.resources + eventResourceDelta(event)));
    state.activeEvents = [...new Set([...state.activeEvents, event.id])].slice(-10);
    state.recentEvents = [...new Set([...state.recentEvents, event.id])].slice(-20);
  }
}

function stateIdFor(factionId: string, scope: { townId?: string; roomId?: string }): string {
  return [factionId, scope.townId ?? 'world', scope.roomId ?? 'all'].join(':');
}

function phaseForEventType(type: FactionCurrentEventType): FactionCurrentEventPhase {
  if (type === 'raid-active' || type === 'skirmish' || type === 'guard-crackdown' || type === 'market-shutdown') return 'active';
  if (type === 'raid-aftermath') return 'aftermath';
  return 'brewing';
}

function expiryForEventType(type: FactionCurrentEventType): number {
  switch (type) {
    case 'raid-warning':
      return 18;
    case 'raid-active':
    case 'skirmish':
      return 10;
    case 'raid-aftermath':
      return 36;
    case 'market-shutdown':
    case 'guard-crackdown':
      return 22;
    default:
      return 28;
  }
}

function defaultFactionEventSummary(type: FactionCurrentEventType, factionIds: readonly string[]): string {
  const factions = factionIds.join(' and ');
  switch (type) {
    case 'argument':
      return `${factions} are arguing loudly enough to become policy.`;
    case 'inspection':
      return `${factions} are conducting an inspection with too many hands near weapons.`;
    case 'debt-collection':
      return `${factions} are turning debt into street weather.`;
    case 'trade-dispute':
      return `${factions} are disagreeing over commerce, dignity, and who gets to call it law.`;
    case 'raid-warning':
      return `Bandits are close enough that ${factions} have started preparing bad plans.`;
    case 'raid-active':
      return `Bandits are attacking while ${factions} decide who was supposed to prevent this.`;
    case 'raid-aftermath':
      return `${factions} are counting losses after a raid.`;
    case 'skirmish':
      return `${factions} have found the short road from argument to gunfire.`;
    case 'market-shutdown':
      return `${factions} have made the market close its eyes.`;
    case 'guard-crackdown':
      return `${factions} are discovering how heavy law sounds indoors.`;
    case 'guild-exposure':
      return `${factions} are pretending the thieves guild was not obvious yesterday.`;
    case 'wildlife-surge':
      return `${factions} are blaming wildlife because wildlife cannot file objections.`;
  }
}

function eventDanger(event: FactionCurrentEvent): number {
  switch (event.type) {
    case 'raid-active':
      return 35;
    case 'skirmish':
      return 28;
    case 'raid-warning':
      return 18;
    case 'guard-crackdown':
      return 12;
    case 'market-shutdown':
      return 10;
    default:
      return Math.round(event.severity / 6);
  }
}

function eventResourceDelta(event: FactionCurrentEvent): number {
  switch (event.type) {
    case 'raid-active':
      return -18;
    case 'raid-aftermath':
      return -12;
    case 'market-shutdown':
      return -10;
    case 'debt-collection':
      return 6;
    case 'trade-dispute':
      return -4;
    default:
      return 0;
  }
}

function escalateRelation(relation: LocalFactionState['relations'][string], event: FactionCurrentEvent): LocalFactionState['relations'][string] {
  if (event.type === 'raid-active' || event.type === 'skirmish') {
    if (relation === 'allied' || relation === 'friendly') return relation;
    if (relation === 'neutral') return 'tense';
    if (relation === 'truce') return 'skirmishing';
    if (relation === 'tense') return 'skirmishing';
    if (relation === 'skirmishing') return 'hostile';
    return relation;
  }
  if (event.type === 'trade-dispute' || event.type === 'inspection' || event.type === 'debt-collection') {
    if (relation === 'friendly') return 'neutral';
    if (relation === 'neutral') return 'tense';
    if (relation === 'truce') return 'tense';
    return relation;
  }
  return relation;
}

function hashKey(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash).toString(36);
}
