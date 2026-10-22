import type { GameSnapshot, ClientRoomSnapshot, PlayerSnapshot } from './GameSnapshot.js';
import type { SceneClientState } from './SceneClientState.js';
import type { RoomSnapshot } from '../world/types.js';
import { applyMovementUpdate, type MovementUpdate } from './MovementUpdate.js';

/** Full hot gameplay state, changed slow selectors, and revisioned terrain only. */
export interface SnapshotDelta {
  movementResync?: boolean;
  state: Partial<Omit<GameSnapshot, 'viewport' | 'clientState' | 'players'>> &
    Pick<GameSnapshot, 'tick' | 'localPlayerId'> & {
      players: Record<string, PlayerSnapshot | { id: string; patch: Partial<PlayerSnapshot> }>;
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
  private readonly players = new Map<string, Map<keyof PlayerSnapshot, string>>();
  private resyncAt = -Infinity;
  private readonly stateSignatures = new Map<string, string | undefined>();
  private readonly dynamicSignatures = new Map<
    string,
    Map<keyof ClientRoomSnapshot, string | undefined>
  >();
  private epoch: number | undefined;
  private persistence: GameSnapshot['persistence'];
  private readonly rooms = new Map<string, number>();
  private readonly flags = new Map<string, string>();
  private readonly selectors = new Map<keyof SceneClientState, string>();

  encode(snapshot: GameSnapshot, movementDriven = false): SnapshotDelta {
    const { viewport, clientState, persistence, ...hotState } = snapshot;
    const state: SnapshotDelta['state'] = hotState;
    if (!clientState || !snapshot.replication)
      throw new Error('Network snapshot requires replication state');
    if (this.epoch !== snapshot.replication.epoch) {
      this.epoch = snapshot.replication.epoch;
      this.rooms.clear();
      this.selectors.clear();
      this.flags.clear();
      this.persistence = undefined;
      this.players.clear();
      this.resyncAt = -Infinity;
      this.stateSignatures.clear();
      this.dynamicSignatures.clear();
    }
    let movementResync: boolean | undefined;
    if (movementDriven) {
      const resync = snapshot.tick - this.resyncAt >= 1000;
      movementResync = resync;
      if (resync) this.resyncAt = snapshot.tick;
      const movementKeys = new Set<keyof PlayerSnapshot>([
        'body',
        'direction',
        'directionQueue',
        'movementRevision',
        'movementAccumulatorMs',
        'movementIntervalMs',
        'movementPredictionAllowed',
        'movementGrid',
        'acknowledgedDirectionSequence',
      ]);
      state.players = Object.fromEntries(
        Object.entries(snapshot.players).map(([id, player]) => {
          const previous = this.players.get(id);
          const signatures = previous ?? new Map<keyof PlayerSnapshot, string>();
          const patch: Partial<PlayerSnapshot> = {};
          const compare = <K extends keyof PlayerSnapshot>(key: K) => {
            if (!resync && previous && movementKeys.has(key)) return;
            const signature = JSON.stringify(player[key]);
            if (signatures.get(key) !== signature || (resync && movementKeys.has(key))) {
              patch[key] = player[key];
              signatures.set(key, signature);
            }
          };
          for (const key of Object.keys(player) as Array<keyof PlayerSnapshot>) compare(key);
          this.players.set(id, signatures);
          return [id, previous ? { id, patch } : player];
        }),
      );
      for (const id of this.players.keys()) if (!snapshot.players[id]) this.players.delete(id);
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
      if (key === 'worldRooms' || key === 'generatedRoomIds' || key === 'flags') return;
      const value = clientState[key];
      const signature = JSON.stringify(value);
      if (this.selectors.get(key) !== signature) {
        changed[key] = value;
        this.selectors.set(key, signature);
      }
    };
    for (const key of Object.keys(clientState) as Array<keyof SceneClientState>) compare(key);
    changed.worldRooms = clientState.worldRooms.filter((room) => {
      const revision = snapshot.replication!.roomRevisions[room.id];
      if (this.rooms.get(room.id) === revision) return false;
      this.rooms.set(room.id, revision);
      return true;
    });
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
          if (key === 'room' || key === 'layout' || key === 'id') return;
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
    return {
      movementResync,
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

  reset(snapshot: GameSnapshot): void {
    this.movement.clear();
    this.snapshot = snapshot;
    this.rooms.clear();
    for (const room of snapshot.clientState?.worldRooms ?? []) this.rooms.set(room.id, room);
    this.knownIds = [...this.rooms.keys()];
  }

  apply(delta: SnapshotDelta): GameSnapshot {
    if (!this.snapshot?.clientState) throw new Error('Missing initial network snapshot');
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
    const ids = Object.keys(delta.state.replication?.roomRevisions ?? {});
    const worldRooms = ids.map((id) => {
      const room = this.rooms.get(id);
      if (!room) throw new Error(`Missing room revision: ${id}`);
      return room;
    });
    const rooms = Object.fromEntries(
      Object.entries(delta.viewport.rooms).map(([id, dynamic]) => {
        const room = this.rooms.get(id);
        if (!room) throw new Error(`Missing viewport room: ${id}`);
        const entry = {
          ...(epochChanged ? {} : this.snapshot?.viewport.rooms[id]),
          ...dynamic,
          room,
          layout: room.layout,
        };
        for (const key of delta.viewport.removedFields?.[id] ?? []) delete entry[key];
        return [id, entry];
      }),
    );
    const flags = { ...(epochChanged ? {} : this.snapshot.clientState.flags), ...delta.flags.set };
    for (const key of delta.flags.removed) delete flags[key];
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
      persistence: delta.state.persistence ?? this.snapshot.persistence,
      viewport: { centerRoomId: delta.viewport.centerRoomId, rooms },
      clientState: {
        ...this.snapshot.clientState,
        ...delta.clientState,
        worldRooms,
        flags,
        generatedRoomIds: this.knownIds,
      },
    };
    let merged = snapshot;
    for (const update of this.movement.values())
      if (update.sequence > (snapshot.movementSequence ?? 0))
        merged = applyMovementUpdate(merged, update);
    this.snapshot = merged;
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
