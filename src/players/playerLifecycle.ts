import type { PlayerRuntime } from './playerTypes.js';

export type RescueSource =
  | 'ward'
  | 'fellowship'
  | 'growth'
  | 'extra-life'
  | 'phoenix'
  | 'arcane-veil';
export type DeathChoice = 'return' | 'continue' | 'taunt' | 'romance' | 'complain';
export interface DeathEncounterView {
  id: string;
  revision: number;
  phase: 'death-presentation' | 'afterlife-choice' | 'awaiting-respawn';
  stage: 'angel' | 'afterlife' | 'ledger';
  reason: string;
  terminal: boolean;
  rescueSource?: RescueSource;
  rescuer: 'angel' | 'goblin-angel';
  specialExecution?: 'insulted-angel';
  afterlifeDestination?: 'heaven' | 'hell';
  taunts: number;
  romance?: { message: string; strong: boolean };
  availableChoices: DeathChoice[];
}

export interface CharacterSelections {
  faith: string;
  background: string;
  class: string;
}
export type PlayerLifecycle =
  | { kind: 'active' }
  | {
      kind: 'creating';
      stage: 'faith' | 'background' | 'class';
      selections: Partial<CharacterSelections>;
      offers: Record<'faith' | 'background' | 'class', string[]>;
    }
  | { kind: 'death'; encounter: DeathEncounterView };

export interface LifeSourceView {
  ordinary: number;
  skill: number;
  equipmentPhoenix: number;
  fortitudePhoenix: number;
  ward: number;
}

/** Biological survival and physical participation are deliberately distinct. */
export function isPlayerInWorld(player: PlayerRuntime): boolean {
  return player.alive && (!player.lifecycle || player.lifecycle.kind === 'active');
}
