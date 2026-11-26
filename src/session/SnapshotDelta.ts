import {
  isViewportNpc,
  type GameSnapshot,
  type ClientRoomSnapshot,
  type PlayerSnapshot,
} from './GameSnapshot.js';
import type { SceneClientState } from './SceneClientState.js';
import type { TownStructure } from '../world/town.js';
import type { RoomSnapshot } from '../world/types.js';
import type { Actor } from '../actors/actorTypes.js';
import { applyMovementUpdate, type MovementUpdate } from './MovementUpdate.js';

const ROOM_ALIAS_FIELDS = [
  'biomeId',
  'biomeTitle',
  'backgroundColor',
  'wallColor',
  'wallOutlineColor',
  'portals',
  'caveEntrances',
  'layerEntrances',
] as const;
const ROOM_FIELDS = new Set<keyof ClientRoomSnapshot>([
  'id',
  'room',
  'layout',
  ...ROOM_ALIAS_FIELDS,
  'npcs',
]);

interface FieldPatch<T> {
  set: Partial<T>;
  removed: Array<keyof T>;
}

function compareFields<T extends object>(
  object: T,
  previous?: Map<keyof T, string>,
  omit?: keyof T,
): { signatures: Map<keyof T, string>; patch?: FieldPatch<T> } {
  const signatures = new Map<keyof T, string>();
  const set: Partial<T> = {};
  const compare = <K extends keyof T>(key: K) => {
    if (key === omit) return;
    const signature = JSON.stringify(object[key]);
    if (signature === undefined) return;
    signatures.set(key, signature);
    if (previous && previous.get(key) !== signature) set[key] = object[key];
  };
  for (const key of Object.keys(object) as Array<keyof T>) compare(key);
  const removed = [...(previous?.keys() ?? [])].filter((key) => !signatures.has(key));
  return {
    signatures,
    patch: removed.length || Object.keys(set).length ? { set, removed } : undefined,
  };
}

function applyFieldPatch<T extends object>(baseline: T, patch: FieldPatch<T>): T {
  const merged = { ...baseline, ...patch.set };
  for (const key of patch.removed) delete merged[key];
  return merged;
}

/** Full hot gameplay state, changed slow selectors, and revisioned terrain only. */
export interface SnapshotDelta {
  sequence?: number;
  movementResync?: boolean;
  roomPatches?: Record<string, FieldPatch<RoomSnapshot> & { town?: FieldPatch<TownStructure> }>;
  townPatch?: FieldPatch<TownStructure>;
  actors?: { ids?: string[]; added: Actor[]; patches: Record<string, FieldPatch<Actor>> };
  state: Partial<Omit<GameSnapshot, 'viewport' | 'clientState' | 'players' | 'presentation'>> &
    Pick<GameSnapshot, 'tick' | 'localPlayerId'> & {
      players: Record<string, PlayerSnapshot | { id: string; patch: Partial<PlayerSnapshot> }>;
      presentation?: Pick<NonNullable<GameSnapshot['presentation']>, 'characterMode'>;
    };
  viewport: {
    centerRoomId: string;
    rooms: Record<string, Partial<ClientRoomSnapshot> & { id: string }>;
    removedFields?: Record<string, Array<keyof ClientRoomSnapshot>>;
  };
  clientState: Partial<SceneClientState>;
  flags: { set: Record<string, unknown>; removed: string[] };
}

export class SnapshotDeltaEncoder {
  private sequence = 0;
  private replicationSignature?: string;
  private readonly players = new Map<string, Map<keyof PlayerSnapshot, string>>();
  private resyncAt = -Infinity;
  private centerRoomId?: string;
  private readonly stateSignatures = new Map<string, string | undefined>();
  private readonly dynamicSignatures = new Map<
    string,
    Map<keyof ClientRoomSnapshot, string | undefined>
  >();
  private epoch: number | undefined;
  private persistence: GameSnapshot['persistence'];
  private readonly rooms = new Map<string, number>();
  private readonly roomFields = new Map<string, Map<keyof RoomSnapshot, string>>();
  private readonly roomTowns = new Map<string, Map<keyof TownStructure, string>>();
  private selectedTown: Map<keyof TownStructure, string> | null | undefined;
  private actorIds?: string;
  private readonly actorFields = new Map<string, Map<keyof Actor, string>>();
  private readonly flags = new Map<string, string>();
  private readonly selectors = new Map<keyof SceneClientState, string>();

  encode(
    snapshot: GameSnapshot,
    movementDriven = false,
    forceMovementResync = false,
    forceLocalMovement = false,
  ): SnapshotDelta {
    const { viewport, clientState, persistence, ...hotState } = snapshot;
    const state: SnapshotDelta['state'] = hotState;
    if (state.ui) {
      state.ui = { ...state.ui };
      delete state.ui.inventory;
    }
    if (state.presentation)
      state.presentation = { characterMode: state.presentation.characterMode };
    if (!clientState || !snapshot.replication)
      throw new Error('Network snapshot requires replication state');
    if (this.epoch !== snapshot.replication.epoch) {
      this.epoch = snapshot.replication.epoch;
      this.rooms.clear();
      this.roomFields.clear();
      this.roomTowns.clear();
      this.selectedTown = undefined;
      this.actorIds = undefined;
      this.actorFields.clear();
      this.selectors.clear();
      this.flags.clear();
      this.persistence = undefined;
      this.players.clear();
      this.resyncAt = -Infinity;
      this.stateSignatures.clear();
      this.dynamicSignatures.clear();
    }
    const roomChanged = this.centerRoomId !== viewport.centerRoomId;
    this.centerRoomId = viewport.centerRoomId;
    const replicationSignature = JSON.stringify(snapshot.replication);
    const replicationChanged = replicationSignature !== this.replicationSignature;
    this.replicationSignature = replicationSignature;
    let playersChanged = true;
    let movementResync: boolean | undefined;
    if (movementDriven) {
      const resync = roomChanged || forceMovementResync || snapshot.tick - this.resyncAt >= 1000;
      movementResync = resync;
      playersChanged = false;
      if (resync) this.resyncAt = snapshot.tick;
      const movementKeys = new Set<keyof PlayerSnapshot>([
        'body',
        'direction',
        'directionQueue',
        'movementRevision',
        'movementIntervalMs',
        'movementGraceMs',
        'movementPredictionAllowed',
        'movementGrid',
        'acknowledgedDirectionSequence',
      ]);
      state.players = Object.fromEntries(
        Object.entries(snapshot.players).map(([id, player]) => {
          const previous = this.players.get(id);
          const signatures = previous ?? new Map<keyof PlayerSnapshot, string>();
          const patch: Partial<PlayerSnapshot> = {};
          const resyncPlayer = resync || (forceLocalMovement && player.isLocal);
          const accumulator = JSON.stringify(player.movementAccumulatorMs);
          const phaseAt = JSON.stringify(player.movementPhaseAtMs);
          const phaseChanged =
            accumulator !== signatures.get('movementAccumulatorMs') ||
            phaseAt !== signatures.get('movementPhaseAtMs');
          const compare = <K extends keyof PlayerSnapshot>(key: K) => {
            if (!resyncPlayer && previous && movementKeys.has(key)) return;
            const signature = JSON.stringify(player[key]);
            if (
              (phaseChanged && (key === 'movementAccumulatorMs' || key === 'movementPhaseAtMs')) ||
              signatures.get(key) !== signature ||
              (resyncPlayer && movementKeys.has(key))
            ) {
              patch[key] = player[key];
              signatures.set(key, signature);
            }
          };
          for (const key of Object.keys(player) as Array<keyof PlayerSnapshot>) compare(key);
          this.players.set(id, signatures);
          playersChanged ||= !previous || Object.keys(patch).length > 0;
          return [id, previous ? { id, patch } : player];
        }),
      );
      for (const id of this.players.keys()) {
        if (snapshot.players[id]) continue;
        this.players.delete(id);
        playersChanged = true;
      }
    }
    if (
      this.persistence?.slotId !== persistence?.slotId ||
      this.persistence?.checkpoint !== persistence?.checkpoint
    ) {
      state.persistence = persistence;
      this.persistence = persistence;
    }
    const changed: Partial<SceneClientState> = {};
    const compare = <K extends keyof SceneClientState>(key: K): void => {
      if (
        key === 'worldRooms' ||
        key === 'generatedRoomIds' ||
        key === 'flags' ||
        key === 'actors' ||
        key === 'town'
      )
        return;
      const value = clientState[key];
      const signature = JSON.stringify(value);
      if (this.selectors.get(key) !== signature) {
        changed[key] = value;
        this.selectors.set(key, signature);
      }
    };
    for (const key of Object.keys(clientState) as Array<keyof SceneClientState>) compare(key);
    let townPatch: FieldPatch<TownStructure> | undefined;
    if (clientState.town) {
      const previous = this.selectedTown;
      const fields = compareFields(clientState.town, previous ?? undefined);
      this.selectedTown = fields.signatures;
      if (previous?.get('id') === fields.signatures.get('id')) townPatch = fields.patch;
      else changed.town = clientState.town;
    } else {
      if (this.selectedTown !== null) changed.town = null;
      this.selectedTown = null;
    }
    const roomPatches: NonNullable<SnapshotDelta['roomPatches']> = {};
    const roomRevisions = snapshot.replication.roomRevisions;
    for (const id of this.roomFields.keys()) {
      if (roomRevisions[id] !== undefined) continue;
      this.roomFields.delete(id);
      this.roomTowns.delete(id);
    }
    changed.worldRooms = [];
    for (const room of clientState.worldRooms) {
      const revision = roomRevisions[room.id];
      const previous = this.roomFields.get(room.id);
      const knownRevision = this.rooms.get(room.id);
      if (knownRevision === revision && previous) continue;
      const { signatures, patch } = compareFields(room, previous, 'town');
      this.roomFields.set(room.id, signatures);
      this.rooms.set(room.id, revision);
      const previousTown = this.roomTowns.get(room.id);
      const town = room.town ? compareFields(room.town, previousTown) : undefined;
      if (town) this.roomTowns.set(room.id, town.signatures);
      else this.roomTowns.delete(room.id);
      if (knownRevision === revision) continue;
      if (!previous) {
        changed.worldRooms.push(room);
        continue;
      }
      const roomPatch: NonNullable<SnapshotDelta['roomPatches']>[string] = patch ?? {
        set: {},
        removed: [],
      };
      if (town) {
        if (previousTown?.get('id') === town.signatures.get('id')) roomPatch.town = town.patch;
        else roomPatch.set.town = room.town;
      } else if (previousTown) {
        roomPatch.removed.push('town');
      }
      if (patch || roomPatch.town || roomPatch.set.town || roomPatch.removed.length)
        roomPatches[room.id] = roomPatch;
    }
    const actorIds = clientState.actors.map(({ id }) => id);
    const actorIdSignature = JSON.stringify(actorIds);
    const actorIdsChanged = this.actorIds !== actorIdSignature;
    this.actorIds = actorIdSignature;
    const actorSet = new Set(actorIds);
    for (const id of this.actorFields.keys()) if (!actorSet.has(id)) this.actorFields.delete(id);
    const added: Actor[] = [];
    const patches: Record<string, FieldPatch<Actor>> = {};
    for (const actor of clientState.actors) {
      const previous = this.actorFields.get(actor.id);
      const { signatures, patch } = compareFields(actor, previous);
      this.actorFields.set(actor.id, signatures);
      if (!previous) added.push(actor);
      else if (patch) patches[actor.id] = patch;
    }
    const actors =
      actorIdsChanged || added.length || Object.keys(patches).length
        ? { ids: actorIdsChanged ? actorIds : undefined, added, patches }
        : undefined;
    const flags: SnapshotDelta['flags'] = { set: {}, removed: [] };
    for (const key of this.flags.keys())
      if (clientState.flags[key] === undefined) {
        flags.removed.push(key);
        this.flags.delete(key);
      }
    for (const [key, value] of Object.entries(clientState.flags)) {
      if (value === undefined) continue;
      const signature = JSON.stringify(value);
      if (this.flags.get(key) !== signature) {
        flags.set[key] = value;
        this.flags.set(key, signature);
      }
    }
    for (const key of Object.keys(state) as Array<keyof typeof state>) {
      if (
        key === 'players' ||
        key === 'tick' ||
        key === 'localPlayerId' ||
        key === 'replication' ||
        key === 'movementSequence' ||
        key === 'persistence'
      )
        continue;
      const signature = JSON.stringify(state[key]);
      if (this.stateSignatures.has(key) && this.stateSignatures.get(key) === signature)
        delete state[key];
      else this.stateSignatures.set(key, signature);
    }
    const removedFields: NonNullable<SnapshotDelta['viewport']['removedFields']> = {};
    const dynamicRooms = Object.fromEntries(
      Object.entries(viewport.rooms).map(([id, room]) => {
        const previous =
          this.dynamicSignatures.get(id) ?? new Map<keyof ClientRoomSnapshot, string | undefined>();
        const patch: Partial<ClientRoomSnapshot> & { id: string } = { id };
        const compare = <K extends keyof ClientRoomSnapshot>(key: K) => {
          if (ROOM_FIELDS.has(key)) return;
          const signature = JSON.stringify(room[key]);
          if (!previous.has(key) || previous.get(key) !== signature) {
            patch[key] = room[key];
            if (room[key] === undefined) (removedFields[id] ??= []).push(key);
            previous.set(key, signature);
          }
        };
        for (const key of Object.keys(room) as Array<keyof ClientRoomSnapshot>) compare(key);
        for (const key of previous.keys())
          if (!(key in room)) {
            (removedFields[id] ??= []).push(key);
            previous.delete(key);
          }
        this.dynamicSignatures.set(id, previous);
        return [id, patch];
      }),
    );
    for (const id of this.dynamicSignatures.keys())
      if (!viewport.rooms[id]) this.dynamicSignatures.delete(id);
    const hasChanges =
      roomChanged ||
      replicationChanged ||
      playersChanged ||
      actors !== undefined ||
      townPatch !== undefined ||
      changed.worldRooms.length > 0 ||
      Object.keys(roomPatches).length > 0 ||
      Object.keys(changed).some((key) => key !== 'worldRooms') ||
      Object.keys(flags.set).length > 0 ||
      flags.removed.length > 0 ||
      Object.keys(removedFields).length > 0 ||
      Object.values(dynamicRooms).some((room) => Object.keys(room).length > 1) ||
      Object.keys(state).some(
        (key) =>
          !['players', 'tick', 'localPlayerId', 'replication', 'movementSequence'].includes(key),
      );
    return {
      sequence: hasChanges ? ++this.sequence : undefined,
      movementResync,
      roomPatches: Object.keys(roomPatches).length ? roomPatches : undefined,
      actors,
      townPatch,
      state,
      flags,
      clientState: changed,
      viewport: {
        centerRoomId: viewport.centerRoomId,
        rooms: dynamicRooms,
        removedFields: Object.keys(removedFields).length ? removedFields : undefined,
      },
    };
  }
}

/** Retains received room objects; consumers still get detached snapshots at their boundary. */
export class SnapshotDeltaAssembler {
  private readonly movement = new Map<string, MovementUpdate>();
  private snapshot: GameSnapshot | null = null;
  private readonly rooms = new Map<string, RoomSnapshot>();
  private knownIds: string[] = [];
  private lastSequence = 0;

  reset(snapshot: GameSnapshot, sequence = 0): void {
    this.movement.clear();
    this.lastSequence = sequence;
    this.snapshot = snapshot;
    this.rooms.clear();
    for (const room of snapshot.clientState?.worldRooms ?? []) this.rooms.set(room.id, room);
    this.knownIds = [...this.rooms.keys()];
  }

  apply(delta: SnapshotDelta): GameSnapshot {
    if (!this.snapshot?.clientState) throw new Error('Missing initial network snapshot');
    if (delta.sequence !== undefined && delta.sequence <= this.lastSequence) return this.snapshot;
    if (
      delta.sequence !== undefined &&
      this.lastSequence > 0 &&
      delta.sequence !== this.lastSequence + 1
    )
      throw new Error('Missing network delta');
    const epochChanged = delta.state.replication?.epoch !== this.snapshot.replication?.epoch;
    if (epochChanged) {
      this.movement.clear();
      this.rooms.clear();
      this.knownIds = [];
    }
    for (const room of delta.clientState.worldRooms ?? []) {
      if (!this.rooms.has(room.id)) this.knownIds = [...this.knownIds, room.id];
      this.rooms.set(room.id, room);
    }
    for (const [id, patch] of Object.entries(delta.roomPatches ?? {})) {
      const previous = this.rooms.get(id);
      if (!previous) throw new Error('Missing room patch baseline: ' + id);
      const next = applyFieldPatch(previous, patch);
      if (patch.town) {
        if (!previous.town) throw new Error('Missing room town patch baseline: ' + id);
        next.town = applyFieldPatch(previous.town, patch.town);
      }
      this.rooms.set(id, next);
    }
    const ids = Object.keys(delta.state.replication?.roomRevisions ?? {});
    const worldRooms = ids.map((id) => {
      const room = this.rooms.get(id);
      if (!room) throw new Error(`Missing room revision: ${id}`);
      return room;
    });
    let actors = this.snapshot.clientState.actors;
    if (delta.actors) {
      const previous = new Map(actors.map((actor) => [actor.id, actor]));
      for (const actor of delta.actors.added) previous.set(actor.id, actor);
      for (const [id, patch] of Object.entries(delta.actors.patches)) {
        const actor = previous.get(id);
        if (!actor) throw new Error('Missing actor patch baseline: ' + id);
        previous.set(id, applyFieldPatch(actor, patch));
      }
      const nextIds = delta.actors.ids ?? actors.map(({ id }) => id);
      actors = nextIds.map((id) => {
        const actor = previous.get(id);
        if (!actor) throw new Error('Missing replicated actor: ' + id);
        return actor;
      });
    }
    const rooms = Object.fromEntries(
      Object.entries(delta.viewport.rooms).map(([id, dynamic]) => {
        const room = this.rooms.get(id);
        if (!room) throw new Error(`Missing viewport room: ${id}`);
        const entry = {
          ...(epochChanged ? {} : this.snapshot?.viewport.rooms[id]),
          ...dynamic,
          room,
          layout: room.layout,
          biomeId: room.biomeId,
          biomeTitle: room.biomeTitle,
          backgroundColor: room.backgroundColor,
          wallColor: room.wallColor,
          wallOutlineColor: room.wallOutlineColor,
          portals: room.portals,
          caveEntrances: room.caveEntrances,
          layerEntrances: room.layerEntrances,
          npcs: actors.filter((actor) => actor.presence?.roomId === id && isViewportNpc(actor)),
        };
        for (const key of ROOM_ALIAS_FIELDS) if (entry[key] === undefined) delete entry[key];
        for (const key of delta.viewport.removedFields?.[id] ?? []) delete entry[key];
        return [id, entry];
      }),
    );
    const flags = { ...(epochChanged ? {} : this.snapshot.clientState.flags), ...delta.flags.set };
    for (const key of delta.flags.removed) delete flags[key];
    let town =
      delta.clientState.town === undefined
        ? this.snapshot.clientState.town
        : delta.clientState.town;
    if (delta.townPatch) {
      if (!town || epochChanged) throw new Error('Missing selected town patch baseline');
      town = applyFieldPatch(town, delta.townPatch);
    }
    const presentation = delta.state.presentation ?? this.snapshot.presentation;
    const snapshot: GameSnapshot = {
      ...this.snapshot,
      ...delta.state,
      players: Object.fromEntries(
        Object.entries(delta.state.players).map(([id, player]) => {
          if (!('patch' in player)) return [id, player];
          const previous = this.snapshot!.players[id];
          if (!previous || epochChanged) throw new Error(`Missing initial player: ${id}`);
          return [id, { ...previous, ...player.patch }];
        }),
      ),
      ui: {
        ...(delta.state.ui ?? this.snapshot.ui),
        inventory: delta.clientState.inventory ?? this.snapshot.clientState.inventory,
      },
      persistence: delta.state.persistence ?? this.snapshot.persistence,
      presentation: presentation && {
        ...presentation,
        atmosphere: delta.clientState.atmosphereView ?? this.snapshot.clientState.atmosphereView,
      },
      viewport: { centerRoomId: delta.viewport.centerRoomId, rooms },
      clientState: {
        ...this.snapshot.clientState,
        ...delta.clientState,
        actors,
        town,
        worldRooms,
        flags,
        generatedRoomIds: this.knownIds,
      },
    };
    let merged = snapshot;
    for (const update of this.movement.values()) {
      // Older servers could acknowledge a crossing without including its body.
      // Use the buffered crossing once its own room projection is available.
      const completesCrossing =
        update.player.id === snapshot.localPlayerId &&
        snapshot.players[snapshot.localPlayerId]?.roomId !== snapshot.viewport.centerRoomId;
      if (completesCrossing || update.sequence > (snapshot.movementSequence ?? 0))
        merged = applyMovementUpdate(merged, update);
    }
    this.snapshot = merged;
    if (delta.sequence !== undefined) this.lastSequence = delta.sequence;
    return merged;
  }

  applyMovement(update: MovementUpdate): GameSnapshot | null {
    if (
      !this.snapshot ||
      update.epoch !== this.snapshot.replication?.epoch ||
      update.sequence <=
        Math.max(
          this.snapshot.movementSequence ?? 0,
          this.movement.get(update.player.id)?.sequence ?? 0,
        )
    )
      return null;
    this.movement.set(update.player.id, update);
    this.snapshot = applyMovementUpdate(this.snapshot, update);
    return this.snapshot;
  }
}
