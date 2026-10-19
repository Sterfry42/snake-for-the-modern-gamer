import type { Vector2Like } from '../core/math.js';
import type { ChoiceWithMods } from '../game/saveTypes.js';
import type { PlayerId } from '../players/playerTypes.js';
import type { SceneActionCommand } from './SceneActionCommand.js';

export type ClientCommand =
  | { type: 'emote'; playerId: PlayerId; emoticonId: string }
  | SceneActionCommand
  | { type: 'openActor'; playerId: PlayerId; actorId: string }
  | { type: 'selectInteraction'; playerId: PlayerId; menuId: number; optionId: string }
  | { type: 'closeInteraction'; playerId: PlayerId; menuId: number }
  | { type: 'talkToActor'; playerId: PlayerId; actorId: string }
  | { type: 'restartRun'; playerId: PlayerId }
  | {
      type: 'setDirection';
      playerId: PlayerId;
      direction: Vector2Like;
    }
  | {
      type: 'forceDirection';
      playerId: PlayerId;
      direction: Vector2Like;
    }
  | {
      type: 'interact';
      playerId: PlayerId;
    }
  | {
      type: 'useItem';
      playerId: PlayerId;
      itemId: string;
    }
  | {
      type: 'chooseOption';
      playerId: PlayerId;
      choiceId: string;
    }
  | {
      type: 'pause';
      playerId: PlayerId;
    }
  | {
      type: 'resume';
      playerId: PlayerId;
    }
  | {
      type: 'saveGame';
      playerId: PlayerId;
      religionChoice?: ChoiceWithMods;
      classChoice?: ChoiceWithMods;
      backgroundChoice?: ChoiceWithMods;
    }
  | {
      type: 'loadGame';
      playerId: PlayerId;
      religionChoice?: ChoiceWithMods;
      classChoice?: ChoiceWithMods;
      backgroundChoice?: ChoiceWithMods;
    }
  | {
      type: 'clearSave';
      playerId: PlayerId;
    };

export interface CommandResult {
  ok: boolean;
  shop?: NonNullable<ReturnType<import('../game/snakeGame.js').SnakeGame['getActorShopView']>>;
  actorOutcome?: import('./ActorIntent.js').ActorOutcome;
  relationshipResult?: import('../relationships/relationshipTypes.js').RelationshipEventResult;
  npcDisposition?: ReturnType<import('../game/snakeGame.js').SnakeGame['insultNpc']>;
  questRequest?: {
    state: string;
    quest?: { id: string; label: string; description: string } | null;
  };
  caveGift?: ReturnType<import('../game/snakeGame.js').SnakeGame['claimCaveDwellerReward']>;
  questInteractionResult?: ReturnType<
    import('../game/snakeGame.js').SnakeGame['resolveQuestInteraction']
  >;
  encounterResult?: ReturnType<import('../game/snakeGame.js').SnakeGame['resolveRandomEncounter']>;
  loaded?: boolean;
  saved?: boolean;
  cleared?: boolean;
  reason?: string;
  message?: string;
  color?: string;
}

export interface CommandHandler {
  handleCommand(command: ClientCommand): CommandResult;
}

export type InteractionCommand = Extract<
  ClientCommand,
  { type: 'openActor' | 'selectInteraction' | 'closeInteraction' }
>;

export function isInteractionCommand(command: ClientCommand): command is InteractionCommand {
  return (
    command.type === 'openActor' ||
    command.type === 'selectInteraction' ||
    command.type === 'closeInteraction'
  );
}
