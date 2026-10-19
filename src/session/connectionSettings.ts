import { isRecord } from '../core/saveNormalize.js';
import { safeLocalStorage } from '../storage/localStorage.js';

export interface ServerConnectionSettings {
  serverUrl: string;
  displayName: string;
}

const SETTINGS_KEY = 'snake.serverConnection';

export function normalizeDisplayName(value: string): string {
  return Array.from(value.trim().replace(/\s+/gu, ' ')).slice(0, 24).join('') || 'Player';
}

export function normalizeServerUrl(value: string, secure = false): string {
  let input = value.trim();
  try {
    const invite = new URL(input);
    if (invite.searchParams.has('server')) input = invite.searchParams.get('server') ?? input;
  } catch {
    /* Bare host names are accepted below. */
  }
  if (!input) throw new Error('Enter a server URL.');
  let url: URL;
  try {
    url = new URL(input.includes('://') ? input : `${secure ? 'wss' : 'ws'}://${input}`);
  } catch {
    throw new Error('Enter a valid server URL, such as ws://localhost:8787/game.');
  }
  if (url.protocol === 'http:') url.protocol = 'ws:';
  if (url.protocol === 'https:') url.protocol = 'wss:';
  if (!['ws:', 'wss:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('Use a ws:// or wss:// server URL.');
  }
  if (url.pathname === '/') url.pathname = '/game';
  url.hash = '';
  for (const key of ['name', 'resume', 'hostToken']) url.searchParams.delete(key);
  return url.href;
}

export function loadServerConnectionSettings(pageUrl: string): ServerConnectionSettings {
  const defaults = new URL(pageUrl);
  defaults.protocol = defaults.protocol === 'https:' ? 'wss:' : 'ws:';
  defaults.port = '8787';
  defaults.pathname = '/game';
  defaults.search = '';
  defaults.hash = '';
  const configured = import.meta.env.VITE_SNAKE_SERVER_URL;
  const invited = new URL(pageUrl).searchParams.get('server');
  const fallback = {
    serverUrl: normalizeServerUrl(invited ?? configured ?? defaults.href),
    displayName: 'Player',
  };
  try {
    const raw = safeLocalStorage()?.getItem(SETTINGS_KEY);
    const stored: unknown = raw ? JSON.parse(raw) : null;
    if (
      !isRecord(stored) ||
      typeof stored.serverUrl !== 'string' ||
      typeof stored.displayName !== 'string'
    )
      return fallback;
    return {
      serverUrl: invited ? fallback.serverUrl : normalizeServerUrl(stored.serverUrl),
      displayName: normalizeDisplayName(stored.displayName),
    };
  } catch {
    return fallback;
  }
}

export function saveServerConnectionSettings(settings: ServerConnectionSettings): void {
  try {
    safeLocalStorage()?.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* Connection preferences are best-effort; joining does not depend on storage. */
  }
}

export function serverGameUrl(pageUrl: string, settings: ServerConnectionSettings): string {
  const url = new URL(pageUrl);
  url.searchParams.delete('connection');
  url.searchParams.delete('multiplayer');
  url.searchParams.set('server', settings.serverUrl);
  url.searchParams.set('playerName', settings.displayName);
  url.searchParams.set('enter', '1');
  return url.href;
}

export function connectionsMenuUrl(pageUrl: string): string {
  const url = new URL(pageUrl);
  for (const key of ['server', 'connection', 'playerName', 'enter']) url.searchParams.delete(key);
  url.searchParams.set('multiplayer', 'server');
  return url.href;
}

/** Credentials are keyed by canonical endpoint, never included in shared invites. */
export function serverCredentialKey(serverUrl: string): string {
  const endpoint = new URL(normalizeServerUrl(serverUrl));
  for (const key of ['name', 'resume', 'hostToken']) endpoint.searchParams.delete(key);
  endpoint.searchParams.sort();
  return `snake.serverIdentity:${endpoint.href}`;
}

export function loadServerCredential(serverUrl: string, kind: 'resume' | 'host'): string | null {
  try {
    return safeLocalStorage()?.getItem(`${serverCredentialKey(serverUrl)}:${kind}`) ?? null;
  } catch {
    return null;
  }
}

export function saveServerCredential(
  serverUrl: string,
  kind: 'resume' | 'host',
  token: string,
): void {
  try {
    safeLocalStorage()?.setItem(`${serverCredentialKey(serverUrl)}:${kind}`, token);
  } catch {
    /* Play still works when browser storage is unavailable. */
  }
}

export function serverInviteUrl(pageUrl: string, serverUrl: string): string {
  const url = new URL(pageUrl);
  url.search = '';
  url.hash = '';
  const endpoint = new URL(normalizeServerUrl(serverUrl));
  for (const key of ['name', 'resume', 'hostToken']) endpoint.searchParams.delete(key);
  url.searchParams.set('server', endpoint.href);
  url.searchParams.set('multiplayer', 'server');
  return url.href;
}
