import { spellRegistry, type SpellRegistry } from './spellRegistry.js';
import type { SpellbookService } from './spellbookService.js';
import type { SpellCastContext, SpellCastResult, SpellRuntime } from './spellTypes.js';

export interface SpellCastServiceRuntime {
  getMana(): number;
  spendMana(amount: number): boolean;
  spendOvercastSegments(missingMana: number): number;
  onOvercast(segments: number, missingMana: number): void;
  getSpellRuntime(): SpellRuntime;
}

export class SpellCastService {
  constructor(
    private readonly spellbook: SpellbookService,
    private readonly runtime: SpellCastServiceRuntime,
    private readonly registry: SpellRegistry = spellRegistry,
  ) {}

  cast(spellId: string, context: SpellCastContext = { requireLoaded: true }): SpellCastResult {
    const spell = this.registry.get(spellId);
    if (!spell) return { ok: false, spellId, reason: 'unknown-spell' };
    if (!this.spellbook.knows(spellId)) {
      return { ok: false, spellId, label: spell.label, reason: 'not-known' };
    }
    if (context.requireLoaded !== false && !this.spellbook.isLoaded(spellId)) {
      return { ok: false, spellId, label: spell.label, reason: 'not-loaded' };
    }

    const spellRuntime = this.runtime.getSpellRuntime();
    const check = spell.canCast?.(spellRuntime, context) ?? { ok: true };
    if (!check.ok) return { ok: false, spellId, label: spell.label, reason: check.reason };

    let manaSpent = spell.manaCost;
    let overcastSegments = 0;
    if (!this.runtime.spendMana(spell.manaCost)) {
      const missingMana = Math.max(0, spell.manaCost - this.runtime.getMana());
      const requiredSegments = Math.max(1, Math.ceil(missingMana / 10));
      const removed = this.runtime.spendOvercastSegments(missingMana);
      if (removed < requiredSegments) {
        return {
          ok: false,
          spellId,
          label: spell.label,
          reason: 'insufficient-mana',
          manaMissing: missingMana,
        };
      }
      overcastSegments = removed;
      manaSpent = Math.max(0, spell.manaCost - missingMana);
      this.runtime.onOvercast(removed, missingMana);
    }

    const effect = spell.cast(spellRuntime, context);
    return {
      ok: true,
      spellId,
      label: spell.label,
      school: spell.school,
      tags: spell.tags,
      manaSpent,
      overcastSegments,
      ...effect,
    };
  }
}
