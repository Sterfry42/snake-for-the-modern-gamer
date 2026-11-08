import type { SnakeGame, StepResult } from '../game/snakeGame.js';
import type { AuthoritativeProgression } from './AuthoritativeProgression.js';
import type { CommandResult } from './ClientCommand.js';
import type { DeathChoice, DeathEncounterView, RescueSource } from '../players/playerLifecycle.js';
import { SpawnAreaUnavailable } from '../players/safePlayerSpawn.js';

/** Death consequences run once in the selected player's ordered authority context. */
export class AuthoritativeDeaths {
  constructor(
    private readonly game: SnakeGame,
    private readonly progression: () => AuthoritativeProgression,
  ) {}

  resolve(result: StepResult): void {
    const player = this.game.getPlayer(this.game.getLocalPlayerId())!;
    if (player.lifecycle?.kind === 'death') return;
    const phoenix = this.game.getFlag<{ reason?: string }>('fortitude.phoenixTriggered');
    if (result.status !== 'dead' && !phoenix) return;
    const reason = result.deathReason ?? phoenix?.reason ?? 'unknown';
    const progression = this.progression();
    const execution =
      Boolean(this.game.getFlag('boss.insultedAngel')) ||
      this.game.getFlag('internal.killedByBossKind') === 'angel' ||
      this.game.getFlag('player.killedByBossKind') === 'angel';
    let source: RescueSource | undefined;
    if (execution) {
      progression.skills.setExtraLives(0);
      this.game.setFlag('equipment.phoenixCharges', 0);
      this.game.setFlag('equipment.itemPhoenixCharges', 0);
      this.game.setFlag('fortitude.phoenix', { charges: 0 });
    } else if (phoenix) source = 'phoenix';
    else if (this.game.tryConsumeWardForDeath(reason)) source = 'ward';
    else if (this.game.tryConsumeFellowshipRescue()) source = 'fellowship';
    else if (this.game.tryConsumeGrowthForDeath(reason)) source = 'growth';
    else {
      const before = progression.skills.getStats().extraLives;
      if (progression.skills.consumeExtraLife())
        source = progression.skills.getStats().extraLives < before ? 'extra-life' : 'arcane-veil';
    }
    if (source && source !== 'phoenix') this.game.reviveAfterExtraLife(reason);
    this.game.setFlag('fortitude.phoenixTriggered', undefined);
    this.game.setFlag('traversal.manualResumePending', undefined);
    progression.persist();
    const terminal = !source;
    player.alive = !terminal;
    player.lifecycle = {
      kind: 'death',
      encounter: {
        id: crypto.randomUUID(),
        revision: 1,
        phase: 'death-presentation',
        stage: 'angel',
        reason,
        terminal,
        rescueSource: source,
        rescuer: source === 'ward' ? 'goblin-angel' : 'angel',
        specialExecution: execution ? 'insulted-angel' : undefined,
        afterlifeDestination: terminal ? this.game.getKarmaAfterlifeDestination() : undefined,
        taunts: 0,
        availableChoices: terminal
          ? ['continue']
          : ['return', 'romance', source === 'ward' ? 'complain' : 'taunt'],
      },
    };
    if (source) {
      result.status = 'alive';
      result.deathReason = undefined;
    }
  }

  choose(id: string, revision: number, choice: DeathChoice): CommandResult {
    const player = this.game.getPlayer(this.game.getLocalPlayerId())!;
    const encounter = player.lifecycle?.kind === 'death' ? player.lifecycle.encounter : null;
    if (
      !encounter ||
      encounter.id !== id ||
      encounter.revision !== revision ||
      !encounter.availableChoices.includes(choice)
    )
      return { ok: false, reason: 'That death choice is no longer current.' };
    if (choice === 'romance') {
      const result = this.game.romanceDeathRescuer(encounter.rescuer);
      encounter.romance = {
        message: result.message,
        strong: result.state?.stage === 'dating' || result.state?.stage === 'lover',
      };
      encounter.availableChoices = ['return'];
    } else if (choice === 'taunt' || choice === 'complain') {
      encounter.taunts++;
      if (choice === 'taunt' && encounter.taunts === 3) {
        this.game.setKarmaToMinimum('angel-provoked');
        encounter.availableChoices = ['return'];
      } else if (choice === 'complain') encounter.availableChoices = ['return'];
    } else if (choice === 'continue') {
      if (encounter.phase === 'death-presentation') {
        encounter.phase = 'afterlife-choice';
        encounter.stage = 'afterlife';
      } else if (encounter.stage === 'afterlife') encounter.stage = 'ledger';
      else {
        if (
          encounter.afterlifeDestination === 'hell' &&
          this.game.tryEscapeHellEnding(encounter.reason)
        ) {
          this.progression().skills.setExtraLives(1);
          this.progression().persist();
          this.game.setFlag('cosmetics.hellEscapeUnlocked', true);
          encounter.terminal = false;
          encounter.phase = 'death-presentation';
          encounter.availableChoices = ['return'];
          encounter.revision++;
          return this.activate(encounter, false);
        }
        encounter.phase = 'awaiting-respawn';
        encounter.availableChoices = ['return'];
      }
    } else return this.activate(encounter, encounter.terminal);
    encounter.revision++;
    return { ok: true };
  }

  private activate(encounter: DeathEncounterView, respawn: boolean): CommandResult {
    const player = this.game.getPlayer(this.game.getLocalPlayerId())!;
    try {
      if (respawn) this.game.respawnConnectedPlayer(player.id);
      else this.game.restorePlayerParticipation();
    } catch (error) {
      if (error instanceof SpawnAreaUnavailable) return { ok: false, reason: error.message };
      throw error;
    }
    if (!respawn && encounter.taunts >= 3 && encounter.rescuer === 'angel')
      this.game.spawnInsultedAngelBoss();
    player.lifecycle = { kind: 'active' };
    player.alive = true;
    return { ok: true };
  }
}
