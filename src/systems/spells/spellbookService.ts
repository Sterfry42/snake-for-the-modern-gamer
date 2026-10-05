import { spellRegistry, type SpellRegistry } from './spellRegistry.js';
import type { SpellDefinition } from './spellTypes.js';

const KNOWN_FLAG = 'arcane.spellbook.known';
const LOADOUT_FLAG = 'arcane.spellbook.loadout';
const ACTION_SLOT_FLAG = 'actions.slots';

interface ActionSlotState {
  q?: string;
}

export type LearnSpellResult =
  | { ok: true; spell: SpellDefinition; alreadyKnown: false }
  | { ok: false; reason: 'unknown-spell' | 'already-known'; spell?: SpellDefinition };

export type EquipSpellResult =
  | { ok: true; spell: SpellDefinition }
  | { ok: false; reason: 'unknown-spell' | 'not-known' | 'already-loaded' | 'no-capacity' };

export interface SpellbookView {
  known: readonly SpellDefinition[];
  loadout: readonly SpellDefinition[];
  capacity: number;
  currentSpellId?: string;
}

export interface SpellbookStorage {
  getFlag<T = unknown>(key: string): T | undefined;
  setFlag(key: string, value: unknown): void;
  getCapacity(): number;
}

export class SpellbookService {
  constructor(
    private readonly storage: SpellbookStorage,
    private readonly registry: SpellRegistry = spellRegistry,
  ) {}

  learn(spellId: string, options: { autoEquip?: boolean } = {}): LearnSpellResult {
    const spell = this.registry.get(spellId);
    if (!spell) return { ok: false, reason: 'unknown-spell' };
    if (this.knows(spellId)) return { ok: false, reason: 'already-known', spell };

    this.saveKnown([...this.getKnownIds(), spellId]);
    this.storage.setFlag('arcane.spellbook', { enabled: true });

    if (options.autoEquip !== false) {
      this.equip(spellId);
    }

    return { ok: true, spell, alreadyKnown: false };
  }

  knows(spellId: string): boolean {
    return this.getKnownIds().includes(spellId);
  }

  isLoaded(spellId: string): boolean {
    return this.getLoadoutIds().includes(spellId);
  }

  equip(spellId: string): EquipSpellResult {
    const spell = this.registry.get(spellId);
    if (!spell) return { ok: false, reason: 'unknown-spell' };
    if (!this.knows(spellId)) return { ok: false, reason: 'not-known' };

    const loadout = this.getLoadoutIds();
    if (loadout.includes(spellId)) return { ok: false, reason: 'already-loaded' };
    if (loadout.length >= this.getCapacity()) return { ok: false, reason: 'no-capacity' };

    const nextLoadout = [...loadout, spellId];
    this.saveLoadout(nextLoadout);
    if (!this.getCurrentSpellId()) this.bindCurrentSpell(spellId);
    return { ok: true, spell };
  }

  unequip(spellId: string): void {
    const wasCurrent = this.getCurrentSpellId() === spellId;
    const nextLoadout = this.getLoadoutIds().filter((id) => id !== spellId);
    this.saveLoadout(nextLoadout);
    if (wasCurrent) {
      this.bindCurrentSpell(nextLoadout[0]);
    }
  }

  bindCurrentSpell(spellId: string | undefined): void {
    const current = this.getActionSlotState();
    this.storage.setFlag(ACTION_SLOT_FLAG, { ...current, q: spellId });
  }

  getKnown(): readonly SpellDefinition[] {
    return this.getKnownIds().flatMap((id) => {
      const spell = this.registry.get(id);
      return spell ? [spell] : [];
    });
  }

  getLoadout(): readonly SpellDefinition[] {
    return this.getLoadoutIds().flatMap((id) => {
      const spell = this.registry.get(id);
      return spell ? [spell] : [];
    });
  }

  getKnownIds(): readonly string[] {
    return this.readStringArray(KNOWN_FLAG).filter((id) => Boolean(this.registry.get(id)));
  }

  getLoadoutIds(): readonly string[] {
    const known = new Set(this.getKnownIds());
    return this.readStringArray(LOADOUT_FLAG)
      .filter((id) => known.has(id) && Boolean(this.registry.get(id)))
      .slice(0, this.getCapacity());
  }

  getCapacity(): number {
    return Math.max(0, Math.floor(this.storage.getCapacity()));
  }

  getCurrentSpellId(): string | undefined {
    const current = this.getActionSlotState().q;
    return current && this.isLoaded(current) ? current : undefined;
  }

  getView(): SpellbookView {
    return {
      known: this.getKnown(),
      loadout: this.getLoadout(),
      capacity: this.getCapacity(),
      currentSpellId: this.getCurrentSpellId(),
    };
  }

  private readStringArray(key: string): readonly string[] {
    const value = this.storage.getFlag<unknown>(key);
    if (!Array.isArray(value)) return [];
    return [...new Set(value.filter((entry): entry is string => typeof entry === 'string'))];
  }

  private saveKnown(ids: readonly string[]): void {
    this.storage.setFlag(KNOWN_FLAG, [...new Set(ids)]);
  }

  private saveLoadout(ids: readonly string[]): void {
    this.storage.setFlag(LOADOUT_FLAG, [...new Set(ids)].slice(0, this.getCapacity()));
  }

  private getActionSlotState(): ActionSlotState {
    const value = this.storage.getFlag<ActionSlotState>(ACTION_SLOT_FLAG);
    if (!value || typeof value !== 'object') return {};
    return { q: typeof value.q === 'string' ? value.q : undefined };
  }
}
