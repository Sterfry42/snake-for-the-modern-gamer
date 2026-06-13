export type ArchipelagoConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'refused'
  | 'error';

export interface ArchipelagoConnectionConfig {
  serverUrl: string;
  slotName: string;
  password?: string;
}

export interface ArchipelagoReceivedItem {
  index: number;
  itemId: number;
  itemName: string;
  playerName?: string;
  locationName?: string;
}

export interface ArchipelagoPrintMessage {
  type?: string;
  text: string;
}

export interface ArchipelagoConnectionDetails {
  seedName?: string;
  team?: number;
  slot?: number;
  checkedLocationIds: number[];
  slotData?: Record<string, unknown>;
}

export interface ArchipelagoClientEvents {
  onStatusChanged?: (status: ArchipelagoConnectionStatus, message?: string) => void;
  onConnected?: (details: ArchipelagoConnectionDetails) => void;
  onReceivedItem?: (item: ArchipelagoReceivedItem) => void;
  onPrint?: (message: ArchipelagoPrintMessage) => void;
  onLog?: (text: string) => void;
}
