import type { Vector2Like } from '../core/math.js';
import type { ChoiceWithMods } from '../game/saveTypes.js';
import type { PlayerId } from '../players/playerTypes.js';

export type ClientCommand =
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
  loaded?: boolean;
  saved?: boolean;
  cleared?: boolean;
  reason?: string;
}

export interface CommandHandler {
  handleCommand(command: ClientCommand): CommandResult;
}
