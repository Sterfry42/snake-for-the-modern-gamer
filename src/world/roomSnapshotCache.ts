import type { RoomSnapshot } from './types.js';

export const MAX_HOT_ROOMS = 128;

interface RoomReference {
  deref(): RoomSnapshot | undefined;
}
interface ChangeReference {
  deref(): (() => void) | undefined;
}
declare const WeakRef: { new <T extends object>(value: T): { deref(): T | undefined } };

interface ArchivedRoom {
  serialized: string;
  reference: RoomReference;
  pending?: boolean;
}

/** Archives complete room state without replaying generation or consuming RNG. */
export class RoomSnapshotCache implements Iterable<[string, RoomSnapshot]> {
  private readonly hot = new Map<string, RoomSnapshot>();
  private readonly archived = new Map<string, ArchivedRoom>();
  private readonly watchers = new WeakMap<object, Set<ChangeReference>>();
  private readonly originals = new WeakMap<object, object>();

  constructor(private readonly capacity = MAX_HOT_ROOMS) {
    if (!Number.isInteger(capacity) || capacity < 1) throw new Error('Invalid room cache capacity');
  }

  get size(): number {
    return this.hot.size;
  }
  get knownSize(): number {
    return this.hot.size + this.archived.size;
  }

  has(id: string): boolean {
    return this.hot.has(id) || this.archived.has(id);
  }

  prepare(room: RoomSnapshot): RoomSnapshot {
    const proxies = new WeakMap<object, object>();
    const changed = (): void => {
      const record = this.archived.get(room.id);
      if (record?.reference.deref() !== root || record.pending) return;
      record.pending = true;
      // Hold the edited room until its archive is refreshed, coalescing synchronous edits.
      queueMicrotask(() => {
        if (this.archived.get(room.id) === record) record.serialized = JSON.stringify(room);
        record.pending = false;
      });
    };
    const changeReference =
      typeof WeakRef === 'function' ? new WeakRef(changed) : { deref: () => changed };
    const handlers = (target: object): ProxyHandler<object> => {
      let listeners = this.watchers.get(target);
      if (!listeners) {
        listeners = new Set();
        this.watchers.set(target, listeners);
      }
      listeners.add(changeReference);
      const notify = (): void => {
        changed();
        for (const reference of listeners) {
          const listener = reference.deref();
          if (listener && listener !== changed) listener();
          else if (!listener) listeners.delete(reference);
        }
      };
      return {
        get: (object, key) => {
          const value: unknown = Reflect.get(object, key);
          return value !== null && typeof value === 'object' ? wrap(value) : value;
        },
        set: (object, key, value: unknown) => {
          if (value !== null && typeof value === 'object')
            value = this.originals.get(value) ?? value;
          const previous: unknown = Reflect.get(object, key);
          const success = Reflect.set(object, key, value);
          if (success && !Object.is(previous, value)) notify();
          return success;
        },
        deleteProperty: (object, key) => {
          const existed = Reflect.has(object, key);
          const success = Reflect.deleteProperty(object, key);
          if (success && existed) notify();
          return success;
        },
        defineProperty: (object, key, descriptor) => {
          const success = Reflect.defineProperty(object, key, descriptor);
          if (success) notify();
          return success;
        },
      };
    };
    const wrap = (target: object): object => {
      target = this.originals.get(target) ?? target;
      const existing = proxies.get(target);
      if (existing) return existing;
      const proxy = new Proxy(target, handlers(target));
      proxies.set(target, proxy);
      this.originals.set(proxy, target);
      return proxy;
    };
    const root = new Proxy<RoomSnapshot>(room, handlers(room));
    proxies.set(room, root);
    this.originals.set(root, room);
    return root;
  }

  set(id: string, room: RoomSnapshot): void {
    this.archived.delete(id);
    this.hot.delete(id);
    this.hot.set(id, room);
    this.trim();
  }

  get(id: string): RoomSnapshot | undefined {
    let room = this.hot.get(id);
    if (!room) {
      const record = this.archived.get(id);
      if (!record) return undefined;
      room =
        record.reference.deref() ?? this.prepare(JSON.parse(record.serialized) as RoomSnapshot);
      this.archived.delete(id);
    }
    if (!room) return undefined;
    this.hot.delete(id);
    this.hot.set(id, room);
    this.trim();
    return room;
  }

  delete(id: string): boolean {
    const hot = this.hot.delete(id);
    const archived = this.archived.delete(id);
    return hot || archived;
  }

  clear(): void {
    this.hot.clear();
    this.archived.clear();
  }

  *keys(): IterableIterator<string> {
    yield* [...this.hot.keys(), ...this.archived.keys()];
  }

  *[Symbol.iterator](): IterableIterator<[string, RoomSnapshot]> {
    for (const id of this.keys()) {
      const record = this.archived.get(id);
      const room =
        this.hot.get(id) ??
        record?.reference.deref() ??
        (record ? this.prepare(JSON.parse(record.serialized) as RoomSnapshot) : undefined);
      if (record && room)
        record.reference =
          typeof WeakRef === 'function' ? new WeakRef(room) : { deref: () => room };
      if (room) yield [id, room];
    }
  }

  private trim(): void {
    while (this.hot.size > this.capacity) {
      const oldest = this.hot.entries().next().value;
      if (!oldest) return;
      const [id, room] = oldest;
      this.archived.set(id, {
        serialized: JSON.stringify(this.originals.get(room) ?? room),
        reference: typeof WeakRef === 'function' ? new WeakRef(room) : { deref: () => room },
      });
      this.hot.delete(id);
    }
  }
}
