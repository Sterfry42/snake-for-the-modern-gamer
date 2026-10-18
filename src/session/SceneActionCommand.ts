import type { PlayerId } from '../players/playerTypes.js';
import type { Vector2Like } from '../core/math.js';
import type { RelationshipChoice } from '../relationships/relationshipTypes.js';
import type { SpecialStatId } from '../stats/specialTypes.js';
import type { ClientCommand } from './ClientCommand.js';

export type PlayerInteraction =
  | 'manual'
  | 'playing'
  | 'inventory'
  | 'special'
  | 'dialogue'
  | 'shop'
  | 'paused';
// Manual rooms hold automatic player movement while the authority keeps world clocks running.

/** Intent payloads contain identifiers and input, never prices, rewards, or replacement state. */
export type SceneActionCommand = { playerId: PlayerId } & (
  | { type: 'playerInteraction'; mode: PlayerInteraction }
  | { type: 'purchase'; actorId: string; offerId: string }
  | { type: 'relationshipAction'; actorId: string; choice: RelationshipChoice }
  | { type: 'questAction'; action: 'track'; questId: string | null }
  | { type: 'specialAction'; action: 'preview'; statId: SpecialStatId; delta: -1 | 1 }
  | { type: 'specialAction'; action: 'apply' | 'reset' }
  | { type: 'construction'; action: 'begin'; blueprintId: string }
  | { type: 'construction'; action: 'step' | 'face'; direction: Vector2Like }
  | { type: 'construction'; action: 'claim' | 'confirm' | 'cancel' }
  | { type: 'construction'; action: 'demolish'; structureId: string }
  | { type: 'vehicleAction'; action: 'buyGarageCar' }
  | { type: 'vehicleAction'; action: 'enter'; carId: string }
  | { type: 'vehicleAction'; action: 'exit' }
  | { type: 'vehicleAction'; action: 'input'; throttle: -1 | 0 | 1; steering: -1 | 0 | 1 }
  | { type: 'debugAction'; action: 'cycleWeather' }
  | { type: 'manualStep' }
  | { type: 'manualReturn' }
  | { type: 'minigameAction'; action: 'start'; kind: 'fishing' | 'baseball' }
  | { type: 'minigameAction'; action: 'pull'; direction: -1 | 0 | 1 }
  | { type: 'minigameAction'; action: 'swing' | 'abort' }
  | { type: 'companionAction'; action: 'feed' | 'release'; companionId: string }
  | { type: 'inventoryAction'; action: 'equip'; itemId: string }
  | { type: 'inventoryAction'; action: 'cook'; recipeId: string }
  | {
      type: 'inventoryAction';
      action: 'unequip';
      slot: import('../inventory/item.js').EquipmentSlot;
    }
  | { type: 'progressionAction'; action: 'purchase'; perkId: string }
  | { type: 'progressionAction'; action: 'cast'; spellId: string }
  | { type: 'progressionAction'; action: 'bind'; abilityId: string }
  | { type: 'progressionAction'; action: 'usePrimary' }
  | { type: 'combatAction'; action: 'fire' | 'bomb'; direction: Vector2Like }
  | { type: 'maneuverAction'; action: 'equip'; id: string }
  | { type: 'maneuverAction'; action: 'activate'; direction?: Vector2Like }
  | { type: 'maneuverAction'; action: 'digest' }
);

export function isSceneActionCommand(command: ClientCommand): command is SceneActionCommand {
  return (
    command.type === 'playerInteraction' ||
    command.type === 'purchase' ||
    command.type === 'relationshipAction' ||
    command.type === 'questAction' ||
    command.type === 'specialAction' ||
    command.type === 'construction' ||
    command.type === 'vehicleAction' ||
    command.type === 'debugAction' ||
    command.type === 'manualStep' ||
    command.type === 'manualReturn' ||
    command.type === 'companionAction' ||
    command.type === 'minigameAction' ||
    command.type === 'inventoryAction' ||
    command.type === 'progressionAction' ||
    command.type === 'combatAction' ||
    command.type === 'maneuverAction'
  );
}
