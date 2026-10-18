/** A replica exposes selectors and detached data, never simulation or service mutations. */
const QUERY = /^(get|is|has|can|peek|to)[A-Z]/;
const EXTRA_QUERIES = new Set([
  'previewStructurePlacement',
  'previewHighlightSubmission',
  'placedStructures',
  'placedStructure',
  'effectiveCell',
  'resolveRoomPosition',
  'formatActorConversationPages',
  'snapshot',
  'get',
  'has',
  'values',
  'entries',
  'keys',
]);

export function readReplicaView<T extends object>(target: T): T {
  return new Proxy(target, {
    get(source, key) {
      const value: unknown = Reflect.get(source, key, source);
      if (typeof value === 'function') {
        if (typeof key !== 'string' || (!QUERY.test(key) && !EXTRA_QUERIES.has(key)))
          return () => {
            throw new Error(`Client replica cannot execute ${String(key)}`);
          };
        return (...args: unknown[]) => {
          const result: unknown = Reflect.apply(value, source, args);
          return detachReadValue(result);
        };
      }
      return detachReadValue(value);
    },
    set() {
      throw new Error('Client replica is read-only');
    },
    deleteProperty() {
      throw new Error('Client replica is read-only');
    },
    defineProperty() {
      throw new Error('Client replica is read-only');
    },
  });
}

function detachReadValue(value: unknown): unknown {
  if (typeof value === 'function')
    return () => {
      throw new Error('Client replica cannot execute callbacks');
    };
  if (!value || typeof value !== 'object') return value;
  if (value instanceof Map)
    return new Map(
      [...value].map(([key, entry]: [unknown, unknown]) => [
        detachReadValue(key),
        detachReadValue(entry),
      ]),
    );
  if (value instanceof Set) return new Set([...value].map(detachReadValue));
  if (Array.isArray(value)) return value.map(detachReadValue);
  const prototype: unknown = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return readReplicaView(value);
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, detachReadValue(entry)]),
  );
}
