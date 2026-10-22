import type { InventorySystem } from '../inventory/inventory.js';
import type { SnakeState } from '../systems/snakeState.js';

export type PlayerId = string;

export interface PlayerAppearance {
  themeId: string;
  palette: import('../ui/spriteRecipes/snakeRecipe.js').SnakeSpritePalette;
  activeHat: import('../ui/spriteRecipes/snakeHatRecipe.js').SnakeHatStyle | null;
  renderStyle: 'sprite' | 'retro-grid';
}

export interface PlayerCosmetics {
  appearance?: PlayerAppearance;
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
  lifecycle?: import('./playerLifecycle.js').PlayerLifecycle;
  cosmetics?: PlayerCosmetics;
}
