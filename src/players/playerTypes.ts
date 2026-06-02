import type { InventorySystem } from '../inventory/inventory.js';
import type { SnakeState } from '../systems/snakeState.js';

export type PlayerId = string;

export interface PlayerCosmetics {
  activeTheme?: string;
  activeHat?: string | null;
}

export interface PlayerRuntime {
  id: PlayerId;
  name: string;
  snake: SnakeState;
  inventory?: InventorySystem;
  flags: Record<string, unknown>;
  alive: boolean;
  cosmetics?: PlayerCosmetics;
}
