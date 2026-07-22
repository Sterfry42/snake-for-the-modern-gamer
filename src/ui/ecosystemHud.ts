/**
 * Ecosystem HUD
 */
import type { EcosystemBalanceState } from '../animals/ecosystem/types.js';

// ── Balance State Colors ──────────────────────────────────────────

const BALANCE_COLORS: Record<EcosystemBalanceState, string> = {
  balanced: '#22c55e',
  healthy: '#84cc16',
  stressed: '#f59e0b',
  critical: '#ef4444',
  collapsing: '#7f1d1d',
};

const BALANCE_LABELS: Record<EcosystemBalanceState, string> = {
  balanced: 'Balanced',
  healthy: 'Healthy',
  stressed: 'Stressed',
  critical: 'Critical',
  collapsing: 'Collapsing',
};

// ── Ecosystem HUD View ────────────────────────────────────────────

export interface EcosystemHudView {
  healthBar: number; // 0-100
  balanceState: EcosystemBalanceState;
  predatorPreyRatio: number;
  herbivoreCount: number;
  plantBiomass: number;
  eventWarnings: string[];
}

// ── EcosystemHud Class ────────────────────────────────────────────

export class EcosystemHud {
  private view: EcosystemHudView | null = null;

  /** Update the HUD view from ecosystem data */
  updateView(
    healthBar: number,
    balanceState: EcosystemBalanceState,
    predatorPreyRatio: number,
    herbivoreCount: number,
    plantBiomass: number,
    eventWarnings: string[] = [],
  ): void {
    this.view = {
      healthBar: Math.max(0, Math.min(100, healthBar)),
      balanceState,
      predatorPreyRatio: Math.round(predatorPreyRatio * 100) / 100,
      herbivoreCount,
      plantBiomass: Math.max(0, Math.min(100, plantBiomass)),
      eventWarnings,
    };
  }

  /** Get the current HUD view */
  getView(): EcosystemHudView | null {
    return this.view;
  }

  /** Get the health bar color */
  getHealthColor(): string {
    if (!this.view) return '#9ca3af';
    return BALANCE_COLORS[this.view.balanceState];
  }

  /** Get the balance state label */
  getBalanceLabel(): string {
    if (!this.view) return 'Unknown';
    return BALANCE_LABELS[this.view.balanceState];
  }

  /** Get the balance state color */
  getBalanceColor(): string {
    if (!this.view) return '#9ca3af';
    return BALANCE_COLORS[this.view.balanceState];
  }

  /** Get a formatted predator-prey ratio string */
  getPredatorPreyString(): string {
    if (!this.view) return 'N/A';
    return `${this.view.predatorPreyRatio}:1`;
  }

  /** Get event warning status */
  hasWarnings(): boolean {
    return (this.view?.eventWarnings.length ?? 0) > 0;
  }

  /** Get the first warning (if any) */
  getFirstWarning(): string | undefined {
    return this.view?.eventWarnings[0];
  }

  /** Get the number of active warnings */
  getWarningCount(): number {
    return this.view?.eventWarnings.length ?? 0;
  }

  /** Clear the view */
  clear(): void {
    this.view = null;
  }
}
