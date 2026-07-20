import {
  AP_PHASE_1_GAME_NAME,
  AP_PHASE_1_ITEM_LIST,
  AP_PHASE_1_LOCATION_LIST,
} from './archipelagoCheckManifest.js';
import type {
  ArchipelagoClientEvents,
  ArchipelagoConnectionConfig,
  ArchipelagoConnectionDetails,
  ArchipelagoConnectionStatus,
  ArchipelagoPrintMessage,
  ArchipelagoReceivedItem,
} from './archipelagoConnectionTypes.js';

const ARCHIPELAGO_PROTOCOL_VERSION = { major: 0, minor: 6, build: 0, class: 'Version' };
const CLIENT_STATUS_PLAYING = 20;
const CLIENT_STATUS_GOAL = 30;

type ArchipelagoPacket = Record<string, unknown> & { cmd?: string };

export interface NormalizedArchipelagoUrl {
  url: string;
  warning?: string;
}

export interface ArchipelagoUrlParseError {
  error: string;
}

function getPageProtocol(): string {
  return typeof window !== 'undefined' ? window.location.protocol : 'http:';
}

export function normalizeArchipelagoServerUrl(
  serverUrl: string,
  pageProtocol = getPageProtocol(),
): NormalizedArchipelagoUrl | ArchipelagoUrlParseError {
  const trimmed = serverUrl.trim();
  const defaultProtocol = pageProtocol === 'https:' ? 'wss:' : 'ws:';
  const raw = trimmed || 'localhost:38281';

  if (/^[a-z][a-z0-9+.-]*\/\//i.test(raw)) {
    return { error: `Invalid Archipelago server URL: ${raw}` };
  }

  let candidate = raw;
  if (/^https?:\/\//i.test(raw)) {
    candidate = raw.replace(/^http:/i, 'ws:').replace(/^https:/i, 'wss:');
  } else if (!/^wss?:\/\//i.test(raw)) {
    candidate = `${defaultProtocol}//${raw}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return { error: `Invalid Archipelago server URL: ${raw}` };
  }

  if (parsed.protocol !== 'ws:' && parsed.protocol !== 'wss:') {
    return { error: 'Archipelago server URL must use ws://, wss://, http://, or https://.' };
  }

  const url = parsed.toString();
  if (pageProtocol === 'https:' && parsed.protocol === 'ws:') {
    return {
      url,
      warning: 'This page is HTTPS. Use a wss:// Archipelago endpoint, or run the game locally.',
    };
  }
  return { url };
}

function stringifyPrintJson(parts: unknown): string {
  if (!Array.isArray(parts)) {
    return typeof parts === 'string' ? parts : JSON.stringify(parts);
  }
  return parts
    .map((part) => {
      if (typeof part === 'string') return part;
      if (part && typeof part === 'object') {
        const record = part as Record<string, unknown>;
        return String(record.text ?? record.name ?? '');
      }
      return '';
    })
    .join('');
}

export class ArchipelagoClient {
  private socket: WebSocket | null = null;
  private status: ArchipelagoConnectionStatus = 'disconnected';
  private config: ArchipelagoConnectionConfig | null = null;
  private reconnectTimer: ReturnType<typeof globalThis.setTimeout> | null = null;
  private manualDisconnect = false;
  private itemNamesById = new Map<number, string>(
    AP_PHASE_1_ITEM_LIST.map((item) => [item.id, item.name]),
  );
  private locationNamesById = new Map<number, string>(
    AP_PHASE_1_LOCATION_LIST.map((location) => [location.id, location.name]),
  );
  private playerNamesBySlot = new Map<number, string>();
  private details: ArchipelagoConnectionDetails | null = null;

  constructor(private readonly events: ArchipelagoClientEvents = {}) {}

  getStatus(): ArchipelagoConnectionStatus {
    return this.status;
  }

  isConnected(): boolean {
    return this.status === 'connected';
  }

  connect(config: ArchipelagoConnectionConfig): void {
    this.disconnect(false);
    this.manualDisconnect = false;
    const normalized = normalizeArchipelagoServerUrl(config.serverUrl);
    if ('error' in normalized) {
      this.setStatus('error', normalized.error);
      return;
    }
    if (normalized.warning) {
      this.setStatus('error', normalized.warning);
      return;
    }
    this.config = {
      serverUrl: normalized.url,
      slotName: config.slotName.trim(),
      password: config.password,
    };

    if (!this.config.slotName) {
      this.setStatus('error', 'Slot name is required.');
      return;
    }

    const WebSocketCtor = globalThis.WebSocket;
    if (!WebSocketCtor) {
      this.setStatus('error', 'WebSocket is unavailable in this browser.');
      return;
    }

    try {
      this.setStatus('connecting', 'Connecting...');
      const socket = new WebSocketCtor(this.config.serverUrl);
      this.socket = socket;
      socket.addEventListener('open', () => this.events.onLog?.('WebSocket opened.'));
      socket.addEventListener('message', (event) => this.handleSocketMessage(event.data));
      socket.addEventListener('error', () => this.setStatus('error', 'Archipelago socket error.'));
      socket.addEventListener('close', () => this.handleSocketClose(socket));
    } catch {
      this.setStatus('error', 'Could not start Archipelago connection.');
    }
  }

  disconnect(manual = true): void {
    this.manualDisconnect = manual;
    if (this.reconnectTimer !== null) {
      globalThis.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    const socket = this.socket;
    this.socket = null;
    if (
      socket &&
      socket.readyState !== WebSocket.CLOSED &&
      socket.readyState !== WebSocket.CLOSING
    ) {
      socket.close();
    }
    if (manual) {
      this.setStatus('disconnected', 'Disconnected.');
    }
  }

  sendLocationChecks(locationIds: number[]): void {
    const uniqueIds = [...new Set(locationIds.filter((id) => Number.isInteger(id)))];
    if (uniqueIds.length === 0) return;
    if (!this.isConnected()) {
      console.info('[AP] skipped LocationChecks before Connected', uniqueIds);
      return;
    }
    console.info('[AP] sending LocationChecks', uniqueIds);
    this.send([{ cmd: 'LocationChecks', locations: uniqueIds }]);
  }

  sync(): void {
    if (!this.isConnected()) return;
    this.send([{ cmd: 'Sync' }]);
  }

  sendPlaying(): void {
    if (!this.isConnected()) return;
    this.send([{ cmd: 'StatusUpdate', status: CLIENT_STATUS_PLAYING }]);
  }

  sendGoalComplete(): void {
    if (!this.isConnected()) return;
    this.send([{ cmd: 'StatusUpdate', status: CLIENT_STATUS_GOAL }]);
  }

  setDeathLinkEnabled(enabled: boolean): void {
    if (!this.isConnected()) return;
    this.send([{ cmd: 'ConnectUpdate', tags: enabled ? ['AP', 'DeathLink'] : ['AP'] }]);
  }

  sendDeathLink(source: string, cause: string): void {
    if (!this.isConnected()) return;
    this.send([
      { cmd: 'Bounce', tags: ['DeathLink'], data: { time: Date.now() / 1000, source, cause } },
    ]);
  }

  private handleSocketMessage(data: unknown): void {
    console.info('[AP] recv raw', data);
    let packets: ArchipelagoPacket[];
    try {
      const parsed = JSON.parse(String(data)) as unknown;
      packets = Array.isArray(parsed)
        ? (parsed as ArchipelagoPacket[])
        : [parsed as ArchipelagoPacket];
    } catch {
      this.events.onLog?.('Received non-JSON Archipelago packet.');
      return;
    }

    for (const packet of packets) {
      this.handlePacket(packet);
    }
  }

  private handlePacket(packet: ArchipelagoPacket): void {
    switch (packet.cmd) {
      case 'RoomInfo':
        this.handleRoomInfo(packet);
        break;
      case 'DataPackage':
        this.handleDataPackage(packet);
        break;
      case 'Connected':
        this.handleConnected(packet);
        break;
      case 'ConnectionRefused':
        this.setStatus('refused', this.getRefusalMessage(packet));
        break;
      case 'InvalidPacket':
        this.setStatus('error', this.getInvalidPacketMessage(packet));
        break;
      case 'ReceivedItems':
        this.handleReceivedItems(packet);
        break;
      case 'PrintJSON':
        this.handlePrintJson(packet);
        break;
      case 'Bounced':
        this.handleBounced(packet);
        break;
      default:
        if (typeof packet.cmd === 'string') {
          console.info('[AP] unhandled packet', packet.cmd, packet);
        }
        break;
    }
  }

  private handleRoomInfo(packet: ArchipelagoPacket): void {
    const seedName = typeof packet.seed_name === 'string' ? packet.seed_name : undefined;
    this.details = {
      seedName,
      checkedLocationIds: [],
    };
    console.info('[AP] RoomInfo received', packet);
    this.send([{ cmd: 'GetDataPackage', games: [AP_PHASE_1_GAME_NAME] }]);
    this.sendConnect();
  }

  private sendConnect(): void {
    if (!this.config) return;
    this.send([
      {
        cmd: 'Connect',
        game: AP_PHASE_1_GAME_NAME,
        name: this.config.slotName,
        password: this.config.password?.trim() ?? '',
        uuid: this.getClientUuid(),
        version: ARCHIPELAGO_PROTOCOL_VERSION,
        items_handling: 7,
        slot_data: true,
        tags: ['AP'],
      },
    ]);
  }

  private handleDataPackage(packet: ArchipelagoPacket): void {
    const games = (packet.data as Record<string, unknown> | undefined)?.games as
      | Record<string, unknown>
      | undefined;
    const game = games?.[AP_PHASE_1_GAME_NAME] as Record<string, unknown> | undefined;
    const itemNameToId = game?.item_name_to_id as Record<string, unknown> | undefined;
    const locationNameToId = game?.location_name_to_id as Record<string, unknown> | undefined;

    if (itemNameToId) {
      for (const [name, id] of Object.entries(itemNameToId)) {
        if (typeof id === 'number') this.itemNamesById.set(id, name);
      }
    }
    if (locationNameToId) {
      for (const [name, id] of Object.entries(locationNameToId)) {
        if (typeof id === 'number') this.locationNamesById.set(id, name);
      }
    }
  }

  private handleConnected(packet: ArchipelagoPacket): void {
    const players = Array.isArray(packet.players) ? packet.players : [];
    for (const player of players) {
      if (!player || typeof player !== 'object') continue;
      const record = player as Record<string, unknown>;
      if (typeof record.slot === 'number' && typeof record.name === 'string') {
        this.playerNamesBySlot.set(record.slot, record.name);
      }
    }
    const checkedLocationIds = Array.isArray(packet.checked_locations)
      ? packet.checked_locations.filter((id): id is number => Number.isInteger(id))
      : [];
    const details: ArchipelagoConnectionDetails = {
      seedName: this.details?.seedName,
      team: typeof packet.team === 'number' ? packet.team : undefined,
      slot: typeof packet.slot === 'number' ? packet.slot : undefined,
      checkedLocationIds,
      slotData:
        packet.slot_data && typeof packet.slot_data === 'object'
          ? (packet.slot_data as Record<string, unknown>)
          : undefined,
    };
    this.details = details;
    this.setStatus('connected', 'Connected!');
    this.sendPlaying();
    this.events.onConnected?.(details);
    this.sync();
  }

  private handleReceivedItems(packet: ArchipelagoPacket): void {
    const startIndex = typeof packet.index === 'number' ? packet.index : 0;
    const items = Array.isArray(packet.items) ? packet.items : [];
    items.forEach((entry, offset) => {
      if (!entry || typeof entry !== 'object') return;
      const record = entry as Record<string, unknown>;
      const itemId = typeof record.item === 'number' ? record.item : undefined;
      if (itemId === undefined) return;
      const locationId = typeof record.location === 'number' ? record.location : undefined;
      const playerSlot = typeof record.player === 'number' ? record.player : undefined;
      const item: ArchipelagoReceivedItem = {
        index: startIndex + offset,
        itemId,
        itemName: this.itemNamesById.get(itemId) ?? `Item ${itemId}`,
        playerName: playerSlot !== undefined ? this.playerNamesBySlot.get(playerSlot) : undefined,
        locationName:
          locationId !== undefined
            ? (this.locationNamesById.get(locationId) ?? `Location ${locationId}`)
            : undefined,
      };
      this.events.onReceivedItem?.(item);
    });
  }

  private handlePrintJson(packet: ArchipelagoPacket): void {
    const message: ArchipelagoPrintMessage = {
      type: typeof packet.type === 'string' ? packet.type : undefined,
      text: stringifyPrintJson(packet.data),
    };
    this.events.onPrint?.(message);
  }

  private handleBounced(packet: ArchipelagoPacket): void {
    const tags = Array.isArray(packet.tags) ? packet.tags.map(String) : [];
    if (!tags.includes('DeathLink') || !packet.data || typeof packet.data !== 'object') return;
    const data = packet.data as Record<string, unknown>;
    this.events.onDeathLink?.({
      source: typeof data.source === 'string' ? data.source : 'Another player',
      cause: typeof data.cause === 'string' ? data.cause : 'DeathLink',
      time: typeof data.time === 'number' ? data.time : undefined,
    });
  }

  private handleSocketClose(socket: WebSocket): void {
    if (this.socket === socket) {
      this.socket = null;
    }
    if (this.manualDisconnect) {
      return;
    }
    this.setStatus('disconnected', 'Connection closed. Reconnecting...');
    if (this.config) {
      this.reconnectTimer = globalThis.setTimeout(() => {
        this.reconnectTimer = null;
        if (this.config && !this.manualDisconnect) {
          this.connect(this.config);
        }
      }, 3000);
    }
  }

  private send(packets: ArchipelagoPacket[]): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.info('[AP] skipped send before WebSocket open', packets);
      return;
    }
    const encoded = JSON.stringify(packets);
    console.info('[AP] send raw', encoded);
    this.socket.send(encoded);
  }

  private setStatus(status: ArchipelagoConnectionStatus, message?: string): void {
    this.status = status;
    this.events.onStatusChanged?.(status, message);
  }

  private getRefusalMessage(packet: ArchipelagoPacket): string {
    const errors = Array.isArray(packet.errors) ? packet.errors.map(String).join(', ') : '';
    return errors ? `Connection refused: ${errors}` : 'Connection refused.';
  }

  private getInvalidPacketMessage(packet: ArchipelagoPacket): string {
    const text =
      typeof packet.text === 'string'
        ? packet.text
        : typeof packet.original_cmd === 'string'
          ? `Invalid packet: ${packet.original_cmd}`
          : 'Invalid Archipelago packet.';
    return text;
  }

  private getClientUuid(): string {
    const key = 'snake.ap.clientUuid';
    try {
      const existing = globalThis.localStorage?.getItem(key);
      if (existing) return existing;
      const generated = globalThis.crypto?.randomUUID?.() ?? `snake-${Date.now()}`;
      globalThis.localStorage?.setItem(key, generated);
      return generated;
    } catch {
      return `snake-${Date.now()}`;
    }
  }
}
