import type { GameSnapshot, ClientRoomSnapshot } from './GameSnapshot.js';
import type { SceneClientState } from './SceneClientState.js';
import type { RoomSnapshot } from '../world/types.js';

/** Full hot gameplay state, changed slow selectors, and revisioned terrain only. */
export interface SnapshotDelta {
  state: Omit<GameSnapshot, 'viewport' | 'clientState'>;
  viewport: {
    centerRoomId: string;
    rooms: Record<string, Partial<ClientRoomSnapshot> & { id: string }>;
  };
  clientState: Partial<SceneClientState>;
  flags: { set: Record<string, unknown>; removed: string[] };
}

export class SnapshotDeltaEncoder {
  private epoch: number | undefined;
  private persistence: GameSnapshot['persistence'];
  private readonly rooms = new Map<string, number>();
  private readonly flags = new Map<string, string>();
  private readonly selectors = new Map<keyof SceneClientState, string>();

  encode(snapshot: GameSnapshot): SnapshotDelta {
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
    return {
      state,
      flags,
      clientState: changed,
      viewport: {
        centerRoomId: viewport.centerRoomId,
        rooms: Object.fromEntries(
          Object.entries(viewport.rooms).map(([id, room]) => [
            id,
            { ...room, room: undefined, layout: undefined },
          ]),
        ),
      },
    };
  }
}

/** Retains received room objects; consumers still get detached snapshots at their boundary. */
export class SnapshotDeltaAssembler {
  private snapshot: GameSnapshot | null = null;
  private readonly rooms = new Map<string, RoomSnapshot>();
  private knownIds: string[] = [];

  reset(snapshot: GameSnapshot): void {
    this.snapshot = snapshot;
    this.rooms.clear();
    for (const room of snapshot.clientState?.worldRooms ?? []) this.rooms.set(room.id, room);
    this.knownIds = [...this.rooms.keys()];
  }

  apply(delta: SnapshotDelta): GameSnapshot {
    if (!this.snapshot?.clientState) throw new Error('Missing initial network snapshot');
    const epochChanged = delta.state.replication?.epoch !== this.snapshot.replication?.epoch;
    if (epochChanged) {
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
        return [id, { ...dynamic, room, layout: room.layout }];
      }),
    );
    const flags = { ...(epochChanged ? {} : this.snapshot.clientState.flags), ...delta.flags.set };
    for (const key of delta.flags.removed) delete flags[key];
    const snapshot: GameSnapshot = {
      ...delta.state,
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
    this.snapshot = snapshot;
    return snapshot;
  }
}
