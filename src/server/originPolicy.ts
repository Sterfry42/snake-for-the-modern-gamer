/**
 * WebSocket origin policy for the game server.
 *
 * Browsers always send an Origin header on a WebSocket handshake, while
 * non-browser clients (Node test harnesses, scripts) send none. A missing
 * origin is therefore trusted; a present origin must match the allowlist,
 * otherwise any web page open in a player's browser could open a socket
 * into the game server.
 */

/**
 * The deployed game page lives on GitHub Pages. Origin headers never carry
 * a path, so Pages deployments can only be scoped per account: every Pages
 * project on this account shares https://sterfry42.github.io.
 */
const PAGES_ORIGIN = 'https://sterfry42.github.io';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);

/** Parse a comma-separated origin list (e.g. from SNAKE_ALLOWED_ORIGINS). */
export function parseOriginList(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

/** Built-in origins plus any SNAKE_ALLOWED_ORIGINS additions. */
export function defaultAllowedOrigins(): string[] {
  return [PAGES_ORIGIN, ...parseOriginList(process.env.SNAKE_ALLOWED_ORIGINS)];
}

export function isAllowedGameOrigin(
  origin: string | undefined,
  allowedOrigins: readonly string[],
): boolean {
  // Non-browser clients send no Origin header; they are not web pages.
  if (!origin) return true;
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
  // Local development: the Vite dev server port varies, so any port goes.
  if (LOCAL_HOSTS.has(url.hostname)) return true;
  return allowedOrigins.some((entry) => {
    try {
      return new URL(entry).origin === url.origin;
    } catch {
      return false;
    }
  });
}
