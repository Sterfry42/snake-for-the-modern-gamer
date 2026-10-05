/**
 * Local Storage
 *
 * Safe access to window.localStorage across browser/node/vitest contexts.
 */

/** Return the environment's localStorage, or null when unavailable/blocked. */
export function safeLocalStorage(): Storage | null {
  try {
    return typeof globalThis !== 'undefined' ? (globalThis.localStorage ?? null) : null;
  } catch {
    return null;
  }
}
