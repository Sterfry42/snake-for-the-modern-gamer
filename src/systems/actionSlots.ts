import type { SkillTreeStats } from './skillTypes.js';
import { getPrimaryBindingLabelForDisplay } from '../input/controlActions.js';

export type ActionSlotId = 'q';
export type ActionAbilityKind = 'spell' | 'command';

export interface ActionAbilityView {
  id: string;
  label: string;
  kind: ActionAbilityKind;
  description: string;
  bound: boolean;
  canBind: boolean;
  disabledReason?: string;
  manaCost?: number;
}

interface ActionSlotState {
  q?: string;
}

interface ActionAbilityDefinition {
  id: string;
  label: string;
  kind: ActionAbilityKind;
  description: string;
  getManaCost?: () => number;
  getDisabledReason?: (stats: SkillTreeStats) => string | undefined;
  canBind: (stats: SkillTreeStats) => boolean;
  use: (stats: SkillTreeStats) => ActionSlotUseResult;
}

export type ActionSlotUseResult = { ok: true; label: string } | { ok: false; reason: string };

export interface ActionSlotRuntime {
  getStats(): SkillTreeStats;
  getFlag<T = unknown>(key: string): T | undefined;
  setFlag(key: string, value: unknown): void;
  tryCastArcanePulse(): boolean;
  getArcanePulseCost(): number;
  tryActivateManualSurge(): { ok: boolean; message: string };
  hasFollowers(): boolean;
  commandFollowers(): { ok: boolean; message: string };
  recallFollowers(): { ok: boolean; message: string };
}

const ACTION_SLOT_FLAG = 'actions.slots';

export class ActionSlotController {
  private readonly abilities: ActionAbilityDefinition[];

  constructor(private readonly runtime: ActionSlotRuntime) {
    this.abilities = [
      {
        id: 'arcane-pulse',
        label: 'Arcane Pulse',
        kind: 'spell',
        description: 'Spend mana to detonate a short burst around the snake.',
        getManaCost: () => this.runtime.getArcanePulseCost(),
        getDisabledReason: (stats) =>
          stats.arcanePulseUnlocked ? undefined : 'Unlock Arcane Pulse in the skill tree.',
        canBind: (stats) => stats.arcanePulseUnlocked,
        use: (stats) => {
          if (!stats.arcanePulseUnlocked) {
            return { ok: false, reason: 'Unlock Arcane Pulse in the skill tree to cast.' };
          }
          const cost = this.runtime.getArcanePulseCost();
          if (stats.mana < cost) {
            const missing = Math.max(1, Math.ceil(cost - stats.mana));
            return { ok: false, reason: `Arcane Pulse needs ${cost} mana - missing ${missing}.` };
          }
          return this.runtime.tryCastArcanePulse()
            ? { ok: true, label: 'Arcane Pulse' }
            : { ok: false, reason: 'Arcane Pulse fizzled.' };
        },
      },
      {
        id: 'manual-surge',
        label: 'Manual Surge',
        kind: 'command',
        description: 'Spend 3 Momentum to start an Impact Surge.',
        getDisabledReason: () =>
          this.runtime.getFlag('momentum.config.overclock')
            ? undefined
            : 'Unlock Overclock in the skill tree.',
        canBind: () => Boolean(this.runtime.getFlag('momentum.config.overclock')),
        use: () => {
          const result = this.runtime.tryActivateManualSurge();
          return result.ok
            ? { ok: true, label: 'Manual Surge' }
            : { ok: false, reason: result.message };
        },
      },
      {
        id: 'arcane-veil',
        label: 'Starlight Veil',
        kind: 'spell',
        description: 'A passive fatal-hit ward. It cannot be manually bound yet.',
        getDisabledReason: (stats) =>
          stats.arcaneVeilUnlocked
            ? 'Passive spell - triggers on fatal hits.'
            : 'Unlock Starlight Veil in the skill tree.',
        canBind: () => false,
        use: () => ({ ok: false, reason: 'Starlight Veil is passive and triggers on fatal hits.' }),
      },
      {
        id: 'command-follower',
        label: 'Command Follower',
        kind: 'command',
        description: 'Toggle a hired follower between follow and guard behavior.',
        getDisabledReason: () =>
          this.runtime.hasFollowers() ? undefined : 'Hire a mercenary from a goblin camp.',
        canBind: () => this.runtime.hasFollowers(),
        use: () => {
          const result = this.runtime.commandFollowers();
          return result.ok
            ? { ok: true, label: 'Command Follower' }
            : { ok: false, reason: result.message };
        },
      },
      {
        id: 'recall-follower',
        label: 'Recall Follower',
        kind: 'command',
        description: 'Pull a hired follower back beside the snake.',
        getDisabledReason: () =>
          this.runtime.hasFollowers() ? undefined : 'Hire a mercenary from a goblin camp.',
        canBind: () => this.runtime.hasFollowers(),
        use: () => {
          const result = this.runtime.recallFollowers();
          return result.ok
            ? { ok: true, label: 'Recall Follower' }
            : { ok: false, reason: result.message };
        },
      },
    ];
  }

  getBound(slot: ActionSlotId = 'q'): string | undefined {
    return this.getState()[slot];
  }

  ensureDefaultBinding(): void {
    const state = this.getState();
    const stats = this.runtime.getStats();
    const current = state.q ? this.abilities.find((ability) => ability.id === state.q) : undefined;
    if (current?.canBind(stats)) {
      return;
    }
    if (stats.arcanePulseUnlocked) {
      this.saveState({ ...state, q: 'arcane-pulse' });
    }
  }

  getAbilityViews(): readonly ActionAbilityView[] {
    const stats = this.runtime.getStats();
    const boundId = this.getBound('q');
    return this.abilities.map((ability) => {
      const canBind = ability.canBind(stats);
      return {
        id: ability.id,
        label: ability.label,
        kind: ability.kind,
        description: ability.description,
        bound: ability.id === boundId,
        canBind,
        disabledReason: canBind ? undefined : ability.getDisabledReason?.(stats),
        manaCost: ability.getManaCost?.(),
      };
    });
  }

  bind(slot: ActionSlotId, abilityId: string): ActionSlotUseResult {
    const ability = this.abilities.find((candidate) => candidate.id === abilityId);
    if (!ability) {
      return { ok: false, reason: 'Unknown ability.' };
    }
    const stats = this.runtime.getStats();
    if (!ability.canBind(stats)) {
      return {
        ok: false,
        reason: ability.getDisabledReason?.(stats) ?? 'That ability cannot be bound yet.',
      };
    }
    this.saveState({ ...this.getState(), [slot]: ability.id });
    return { ok: true, label: ability.label };
  }

  use(slot: ActionSlotId): ActionSlotUseResult {
    this.ensureDefaultBinding();
    const abilityId = this.getBound(slot);
    if (!abilityId) {
      return {
        ok: false,
        reason: `No ${getPrimaryBindingLabelForDisplay('ability.primary')} ability bound. Open Spells to bind one.`,
      };
    }
    const ability = this.abilities.find((candidate) => candidate.id === abilityId);
    if (!ability) {
      return {
        ok: false,
        reason: `Bound ${getPrimaryBindingLabelForDisplay('ability.primary')} ability is missing.`,
      };
    }
    return ability.use(this.runtime.getStats());
  }

  private getState(): ActionSlotState {
    const value = this.runtime.getFlag<ActionSlotState>(ACTION_SLOT_FLAG);
    if (!value || typeof value !== 'object') {
      return {};
    }
    return { q: typeof value.q === 'string' ? value.q : undefined };
  }

  private saveState(state: ActionSlotState): void {
    this.runtime.setFlag(ACTION_SLOT_FLAG, state);
  }
}
