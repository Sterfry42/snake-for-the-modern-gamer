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
  | {
      type: 'deathEncounterAction';
      encounterId: string;
      revision: number;
      choice: import('../players/playerLifecycle.js').DeathChoice;
    }
  | { type: 'characterCreationAction'; stage: 'faith' | 'background' | 'class'; optionId: string }
  | { type: 'cosmeticAction'; appearance: import('../players/playerTypes.js').PlayerAppearance }
  | { type: 'playerInteraction'; mode: PlayerInteraction }
  | {
      type: 'actorAction';
      actorId: string;
      action: import('./ActorIntent.js').ActorIntent;
      revision?: number;
      includeBark?: boolean;
    }
  | {
      type: 'datingAction';
      actorId: string;
      revision: number;
      action: 'start';
      kind: 'talk' | 'flirt' | 'date';
    }
  | { type: 'datingAction'; actorId: string; revision: number; action: 'choose'; branchId?: string }
  | { type: 'datingAction'; actorId: string; revision: number; action: 'gift'; itemId: string }
  | {
      type: 'datingAction';
      actorId: string;
      revision: number;
      action: 'arrangement';
      choice: 'monogamy' | 'open-honesty' | 'transactional' | 'reassure';
    }
  | { type: 'randomEncounterAction'; action: 'accept' | 'reject'; token: number }
  | { type: 'questDecision'; action: 'accept' | 'reject'; questId: string }
  | {
      type: 'worldInteraction';
      action:
        | 'garden'
        | 'town-door'
        | 'town-grate'
        | 'open-gate'
        | 'quest-giver'
        | 'cave-gift'
        | 'insult'
        | 'trainer-equip'
        | 'trainer-learn';
    }
  | { type: 'worldInteraction'; action: 'alchemy' | 'quest-target'; optionId?: string }
  | {
      type: 'specialShopAction';
      action:
        | 'ward'
        | 'goblin-style'
        | 'goblin-hire'
        | 'goblin-rod'
        | 'goblin-quest'
        | 'goblin-turnin'
        | 'butcher';
      offerId?: string;
      actorId?: string;
    }
  | { type: 'guildAction'; townId: string; action: 'lower-wanted' }
  | { type: 'guildAction'; townId: string; action: 'fence' }
  | { type: 'guildAction'; townId: string; action: 'market' }
  | { type: 'guildAction'; townId: string; action: 'job'; jobId: string }
  | { type: 'guildAction'; townId: string; action: 'purchase'; offerId: string }
  | { type: 'archaeologyAction'; action: 'start' }
  | { type: 'archaeologyAction'; action: 'swap' | 'leave' | 'close'; id: number }
  | { type: 'archaeologyAction'; action: 'move'; id: number; direction: Vector2Like }
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
    command.type === 'deathEncounterAction' ||
    command.type === 'characterCreationAction' ||
    command.type === 'cosmeticAction' ||
    command.type === 'playerInteraction' ||
    command.type === 'actorAction' ||
    command.type === 'datingAction' ||
    command.type === 'worldInteraction' ||
    command.type === 'randomEncounterAction' ||
    command.type === 'questDecision' ||
    command.type === 'specialShopAction' ||
    command.type === 'guildAction' ||
    command.type === 'archaeologyAction' ||
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
