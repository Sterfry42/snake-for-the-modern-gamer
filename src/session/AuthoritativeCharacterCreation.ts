import type { SnakeGame } from '../game/snakeGame.js';
import type { AuthoritativeProgression } from './AuthoritativeProgression.js';
import type { CommandResult } from './ClientCommand.js';
import {
  FAITHS,
  BACKGROUNDS,
  CLASSES,
  getCharacterCreationOption,
  type CharacterCreationOption,
} from '../features/characterCreationDefinitions.js';
import { SpawnAreaUnavailable } from '../players/safePlayerSpawn.js';

export class AuthoritativeCharacterCreation {
  constructor(
    private readonly game: SnakeGame,
    private readonly progression: () => AuthoritativeProgression,
  ) {}

  ensure(): void {
    const player = this.game.getPlayer(this.game.getLocalPlayerId())!;
    if (player.lifecycle) return;
    if (
      this.game.getFlag('character.setup.completed') ||
      (getCharacterCreationOption('faith', String(this.game.getFlag('religion.id'))) &&
        getCharacterCreationOption('background', String(this.game.getFlag('background.id'))) &&
        getCharacterCreationOption('class', String(this.game.getFlag('class.id'))))
    ) {
      player.lifecycle = { kind: 'active' };
      return;
    }
    const pick = (options: readonly CharacterCreationOption[]) => {
      const pool = [...options];
      const ids: string[] = [];
      while (pool.length && ids.length < 3)
        ids.push(pool.splice(Math.floor(this.game.rng() * pool.length), 1)[0].id);
      return ids;
    };
    const selections: Partial<import('../players/playerLifecycle.js').CharacterSelections> = {};
    for (const stage of ['faith', 'background', 'class'] as const) {
      const id = this.game.getFlag<string>(`${stage === 'faith' ? 'religion' : stage}.id`);
      if (id && getCharacterCreationOption(stage, id)) selections[stage] = id;
    }
    const stage =
      (['faith', 'background', 'class'] as const).find((stage) => !selections[stage]) ?? 'class';
    player.lifecycle = {
      kind: 'creating',
      stage,
      selections,
      offers: { faith: pick(FAITHS), background: pick(BACKGROUNDS), class: pick(CLASSES) },
    };
  }

  choose(stage: 'faith' | 'background' | 'class', id: string): CommandResult {
    const player = this.game.getPlayer(this.game.getLocalPlayerId())!;
    const state = player.lifecycle;
    const option = getCharacterCreationOption(stage, id);
    if (
      state?.kind !== 'creating' ||
      state.stage !== stage ||
      !state.offers[stage].includes(id) ||
      !option
    )
      return { ok: false, reason: 'That character choice is not currently offered.' };
    const nextStage = (['faith', 'background', 'class'] as const).find(
      (candidate) => candidate !== stage && !state.selections[candidate],
    );
    if (!nextStage) {
      try {
        this.game.restorePlayerParticipation();
      } catch (error) {
        if (error instanceof SpawnAreaUnavailable) return { ok: false, reason: error.message };
        throw error;
      }
    }
    const prefix = stage === 'faith' ? 'religion' : stage;
    this.game.setFlag(`${prefix}.id`, id);
    this.game.setFlag(`${prefix}.mods`, structuredClone(option.mods));
    if (option.mods.specialModifiers)
      this.game.applyStartingSpecialModifiers(option.mods.specialModifiers);
    for (const [key, value] of Object.entries(option.mods.mechanicFlags ?? {}))
      this.game.setFlag(key, value);
    const progression = this.progression();
    progression.refreshEquipment();
    if (option.mods.startingLifeCharges)
      progression.skills.setExtraLives(
        progression.skills.getStats().extraLives + option.mods.startingLifeCharges,
      );
    if (option.mods.startingPerkId && stage !== 'background')
      progression.skills.grantPerk(
        option.mods.startingPerkId,
        stage === 'faith' ? { type: 'faith', faithId: id } : { type: 'class', classId: id },
      );
    state.selections[stage] = id;
    if (!nextStage) {
      this.game.setFlag('character.setup.completed', true);
      player.lifecycle = { kind: 'active' };
    } else state.stage = nextStage;
    progression.refreshEquipment();
    progression.persist();
    return { ok: true };
  }
}
