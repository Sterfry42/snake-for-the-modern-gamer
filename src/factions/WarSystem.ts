/**
 * War System
 *
 * Handles faction wars, battles, and outcomes for the Faction Wars &
 * Territory Control feature. Integrates with TerritoryManager for control
 * shifts and with FactionEventSystem for event notifications.
 */
import type { FactionEventSystem } from './factionEvents.js';
import type { WarEventType, WarEventState } from './territoryTypes.js';
import { TerritoryManager } from './TerritoryManager.js';

// ─── Battle Configuration ────────────────────────────────────────────────────

export interface BattleConfig {
  /** Base attack power for a faction. */
  baseAttack: number;
  /** Base defense power for a faction. */
  baseDefense: number;
  /** How much resources affect battle outcomes. */
  resourceWeight: number;
  /** How much territory defensibility affects outcomes. */
  defensibilityWeight: number;
  /** Randomness factor (0 = deterministic, 1 = pure RNG). */
  randomness: number;
}

export const DEFAULT_BATTLE_CONFIG: BattleConfig = {
  baseAttack: 30,
  baseDefense: 25,
  resourceWeight: 0.3,
  defensibilityWeight: 0.4,
  randomness: 0.3,
};

// ─── Battle Result ───────────────────────────────────────────────────────────

export interface BattleResult {
  battleId: string;
  territoryId: string;
  attackerFactionId: string;
  defenderFactionId: string;
  winnerFactionId: string | null;
  controlDelta: number;
  attackerScore: number;
  defenderScore: number;
  outcome: 'attack' | 'defense' | 'diplomacy' | 'sabotage';
  snakeInvolved: boolean;
  snakeRole?: 'mercenary' | 'mediator' | 'observer';
  snakeImpact?: number;
  turnCount: number;
  casualties: { attacker: number; defender: number };
}

// ─── War System Class ────────────────────────────────────────────────────────

export class WarSystem {
  private battleLog: BattleResult[] = [];
  private readonly config: BattleConfig;

  constructor(
    private readonly territoryManager: TerritoryManager,
    private readonly factionEventSystem?: FactionEventSystem,
    config: BattleConfig = DEFAULT_BATTLE_CONFIG,
  ) {
    this.config = config;
  }

  // ─── Battle Resolution ─────────────────────────────────────────────────────

  /**
   * Resolve a battle between two factions over a territory.
   * Returns the battle result.
   */
  resolveBattle(input: {
    territoryId: string;
    attackerFactionId: string;
    defenderFactionId: string;
    attackerPower?: number;
    defenderPower?: number;
    attackerResources?: number;
    defenderResources?: number;
    snakeInvolved?: boolean;
    snakeRole?: 'mercenary' | 'mediator' | 'observer';
    snakeBonus?: number;
    outcome?: 'attack' | 'defense' | 'diplomacy' | 'sabotage';
  }): BattleResult | undefined {
    const {
      territoryId,
      attackerFactionId,
      defenderFactionId,
      attackerPower,
      defenderPower,
      attackerResources,
      defenderResources,
      snakeInvolved = false,
      snakeRole,
      snakeBonus = 0,
      outcome = 'attack',
    } = input;

    const territory = this.territoryManager.getTerritory(territoryId);
    const ownership = this.territoryManager.getOwnership(territoryId);

    if (!territory || !ownership) return undefined;

    const battleId = `battle:${territoryId}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
    const turnCount = Math.max(1, Math.floor(Math.random() * 5) + 3);

    // Calculate scores
    const attackerScore = this.calculateBattleScore({
      factionId: attackerFactionId,
      power: attackerPower,
      resources: attackerResources,
      isAttacker: true,
      territory,
    });

    const defenderScore = this.calculateBattleScore({
      factionId: defenderFactionId,
      power: defenderPower,
      resources: defenderResources,
      isAttacker: false,
      territory,
    });

    // Apply snake bonus if involved
    let finalAttackerScore = attackerScore;
    let finalDefenderScore = defenderScore;

    if (snakeInvolved) {
      if (snakeRole === 'mercenary') {
        if (snakeBonus > 0) {
          // Mercenary sides with the stronger faction
          if (attackerScore >= defenderScore) {
            finalAttackerScore += snakeBonus;
          } else {
            finalDefenderScore += snakeBonus;
          }
        }
      } else if (snakeRole === 'mediator') {
        // Mediator reduces the delta
        const delta = Math.abs(finalAttackerScore - finalDefenderScore);
        const reducedDelta = delta * 0.5;
        if (finalAttackerScore > finalDefenderScore) {
          finalAttackerScore -= (delta - reducedDelta) / 2;
          finalDefenderScore += (delta - reducedDelta) / 2;
        } else {
          finalDefenderScore -= (delta - reducedDelta) / 2;
          finalAttackerScore += (delta - reducedDelta) / 2;
        }
      }
      // Observer has no effect
    }

    // Determine winner
    const winnerFactionId = finalAttackerScore > finalDefenderScore
      ? attackerFactionId
      : finalDefenderScore > finalAttackerScore
        ? defenderFactionId
        : null; // Draw

    // Calculate control delta
    const totalScore = finalAttackerScore + finalDefenderScore || 1;
    const attackerShare = finalAttackerScore / totalScore;
    const baseDelta = (attackerShare - 0.5) * 2 * territory.defensible * 5;
    const controlDelta = Math.round(baseDelta + (Math.random() - 0.5) * this.config.randomness * 20);

    // Calculate casualties
    const maxCasualties = Math.abs(controlDelta);
    const casualties = {
      attacker: Math.round(maxCasualties * (finalDefenderScore / totalScore) * 0.6),
      defender: Math.round(maxCasualties * (finalAttackerScore / totalScore) * 0.6),
    };

    const result: BattleResult = {
      battleId,
      territoryId,
      attackerFactionId,
      defenderFactionId,
      winnerFactionId,
      controlDelta,
      attackerScore: Math.round(finalAttackerScore),
      defenderScore: Math.round(finalDefenderScore),
      outcome,
      snakeInvolved,
      snakeRole,
      snakeImpact: snakeBonus,
      turnCount,
      casualties,
    };

    // Apply control shift
    this.territoryManager.shiftControl(
      territoryId,
      attackerFactionId,
      defenderFactionId,
      controlDelta,
      outcome,
      snakeInvolved,
      snakeRole,
    );

    // Log battle
    this.battleLog.push(result);
    if (this.battleLog.length > 100) {
      this.battleLog = this.battleLog.slice(-100);
    }

    // Create war event
    const warEventType: WarEventType = outcome === 'attack'
      ? 'territory-attack'
      : outcome === 'defense'
        ? 'territory-defense'
        : outcome === 'sabotage'
          ? 'sabotage'
          : 'territory-attack';

    this.territoryManager.createWarEvent({
      type: warEventType,
      factionIds: [attackerFactionId, defenderFactionId],
      territoryIds: [territoryId],
      severity: Math.abs(controlDelta) * 2,
      phase: 'aftermath',
      createdAt: Date.now(),
      summary: `${attackerFactionId} ${outcome === 'attack' ? 'attacked' : 'defended'} ${territory.name} with a ${controlDelta > 0 ? 'shift toward attackers' : 'shift toward defenders'}.`,
      tags: ['battle', outcome, territoryId],
    });

    // Notify faction event system
    if (this.factionEventSystem && controlDelta !== 0) {
      this.factionEventSystem.createEvent({
        type: Math.abs(controlDelta) > 20 ? 'skirmish' : 'argument',
        factionIds: [attackerFactionId, defenderFactionId],
        severity: Math.abs(controlDelta) * 2,
        createdAt: Date.now(),
        summary: `Battle over ${territory.name}: ${attackerFactionId} vs ${defenderFactionId}.`,
        tags: ['faction-war', 'battle', territoryId],
      });
    }

    return result;
  }

  /**
   * Calculate a faction's battle score based on power, resources, and territory.
   */
  private calculateBattleScore(input: {
    factionId: string;
    power?: number;
    resources?: number;
    isAttacker: boolean;
    territory: ReturnType<TerritoryManager['getTerritory']>;
  }): number {
    const { power, resources, isAttacker, territory } = input;

    let score = 0;

    // Base power
    score += (power ?? this.config.baseAttack) * (isAttacker ? 1.1 : 0.9); // Attacker bonus

    // Resource contribution
    score += (resources ?? 50) * this.config.resourceWeight;

    // Defensibility bonus for defender
    if (!isAttacker && territory) {
      score += territory.defensible * this.config.defensibilityWeight * 5;
    }

    // Randomness
    score += (Math.random() - 0.5) * 20 * this.config.randomness;

    return score;
  }

  // ─── War Declaration ───────────────────────────────────────────────────────

  /**
   * Declare war between two factions over a territory.
   */
  declareWar(input: {
    attackerFactionId: string;
    defenderFactionId: string;
    territoryId: string;
    reason?: string;
  }): WarEventState {
    const { attackerFactionId, defenderFactionId, territoryId, reason } = input;

    const territory = this.territoryManager.getTerritory(territoryId);
    const summary = reason
      ? `War declared: ${attackerFactionId} vs ${defenderFactionId} over ${territory?.name ?? territoryId}. Reason: ${reason}`
      : `${attackerFactionId} has declared war on ${defenderFactionId} over ${territory?.name ?? territoryId}.`;

    const event = this.territoryManager.createWarEvent({
      type: 'war-declared',
      factionIds: [attackerFactionId, defenderFactionId],
      territoryIds: [territoryId],
      severity: 80,
      phase: 'brewing',
      createdAt: Date.now(),
      summary,
      tags: ['war', 'declared'],
    });

    // Create immediate battle
    this.resolveBattle({
      territoryId,
      attackerFactionId,
      defenderFactionId,
      outcome: 'attack',
    });

    return event;
  }

  /**
   * Declare peace between two factions.
   */
  declarePeace(input: {
    factionA: string;
    factionB: string;
    territoryIds?: string[];
  }): WarEventState {
    const { factionA, factionB, territoryIds = [] } = input;

    const event = this.territoryManager.createWarEvent({
      type: 'peace-treaty',
      factionIds: [factionA, factionB],
      territoryIds,
      severity: 10,
      phase: 'aftermath',
      createdAt: Date.now(),
      summary: `${factionA} and ${factionB} have signed a peace treaty.`,
      tags: ['peace', 'treaty'],
    });

    // Resolve any contested territories
    for (const terrId of territoryIds) {
      const ownership = this.territoryManager.getOwnership(terrId);
      if (ownership?.status === 'contested') {
        // Settle at 50/50
        this.territoryManager.shiftControl(
          terrId,
          factionA,
          factionB,
          0,
          'diplomacy',
        );
      }
    }

    return event;
  }

  // ─── Mercenary Contracts ───────────────────────────────────────────────────

  /**
   * Issue a mercenary contract for a territory battle.
   * Returns the war event for the contract.
   */
  issueMercenaryContract(input: {
    territoryId: string;
    hiringFactionId: string;
    bonusPower?: number;
    bonusResources?: number;
  }): WarEventState {
    const { territoryId, hiringFactionId, bonusPower = 10, bonusResources = 10 } = input;

    const territory = this.territoryManager.getTerritory(territoryId);
    const ownership = this.territoryManager.getOwnership(territoryId);

    if (!territory || !ownership) {
      throw new Error(`Territory ${territoryId} not found.`);
    }

    const event = this.territoryManager.createWarEvent({
      type: 'mercenary-contract',
      factionIds: [hiringFactionId],
      territoryIds: [territoryId],
      severity: 30,
      phase: 'brewing',
      createdAt: Date.now(),
      summary: `${hiringFactionId} has issued a mercenary contract for ${territory.name}.`,
      tags: ['mercenary', 'contract'],
      flags: { bonusPower, bonusResources },
    });

    // If the hiring faction is defending, apply the bonus
    if (ownership.controllingFactionId === hiringFactionId) {
      this.resolveBattle({
        territoryId,
        attackerFactionId: ownership.contestedByFactionId ?? 'unknown',
        defenderFactionId: hiringFactionId,
        defenderPower: bonusPower,
        defenderResources: bonusResources,
        outcome: 'defense',
      });
    }

    return event;
  }

  // ─── Sabotage ──────────────────────────────────────────────────────────────

  /**
   * Sabotage an enemy territory, reducing the defender's battle effectiveness.
   */
  sabotageTerritory(input: {
    territoryId: string;
    saboteurFactionId: string;
    targetFactionId: string;
    successChance?: number;
  }): BattleResult | undefined {
    const {
      territoryId,
      saboteurFactionId,
      targetFactionId,
      successChance = 0.5,
    } = input;

    const ownership = this.territoryManager.getOwnership(territoryId);
    if (!ownership || ownership.controllingFactionId !== targetFactionId) {
      return undefined;
    }

    const success = Math.random() < successChance;

    if (success) {
      return this.resolveBattle({
        territoryId,
        attackerFactionId: saboteurFactionId,
        defenderFactionId: targetFactionId,
        outcome: 'sabotage',
        snakeInvolved: false,
      });
    }

    // Failed sabotage - create event anyway
    this.territoryManager.createWarEvent({
      type: 'sabotage',
      factionIds: [saboteurFactionId, targetFactionId],
      territoryIds: [territoryId],
      severity: 15,
      phase: 'aftermath',
      createdAt: Date.now(),
      summary: `${saboteurFactionId}'s sabotage of ${territoryId} failed.`,
      tags: ['sabotage', 'failed'],
    });

    return undefined;
  }

  // ─── Battle Log ────────────────────────────────────────────────────────────

  getBattleLog(limit = 20): BattleResult[] {
    return [...this.battleLog].slice(-Math.max(0, limit)).reverse();
  }

  getBattlesForTerritory(territoryId: string, limit = 10): BattleResult[] {
    return this.battleLog
      .filter((b) => b.territoryId === territoryId)
      .slice(-Math.max(0, limit))
      .reverse();
  }

  getBattlesByFaction(factionId: string, limit = 20): BattleResult[] {
    return this.battleLog
      .filter((b) => b.attackerFactionId === factionId || b.defenderFactionId === factionId)
      .slice(-Math.max(0, limit))
      .reverse();
  }

  getFactionWinRate(factionId: string): { wins: number; losses: number; draws: number; total: number } {
    const battles = this.battleLog.filter(
      (b) => b.attackerFactionId === factionId || b.defenderFactionId === factionId,
    );

    let wins = 0;
    let losses = 0;
    let draws = 0;

    for (const battle of battles) {
      if (battle.winnerFactionId === factionId) {
        wins++;
      } else if (battle.winnerFactionId === null) {
        draws++;
      } else {
        losses++;
      }
    }

    return { wins, losses, draws, total: battles.length };
  }

  // ─── Save / Load ───────────────────────────────────────────────────────────

  save(): { battleLog: BattleResult[] } {
    return { battleLog: this.battleLog.slice(-50) };
  }

  load(data: { battleLog: BattleResult[] }): void {
    this.battleLog = data.battleLog.slice(-50);
  }
}
