import type { SpellDefinition } from './spellTypes.js';

export const SPELL_DEFINITIONS: readonly SpellDefinition[] = [
  {
    id: 'arcane-pulse',
    label: 'Arcane Pulse',
    description: 'Detonate a short arcane burst around the snake.',
    school: 'destruction',
    tags: ['arcane', 'blast', 'area'],
    manaCost: 20,
    cast: (runtime) => runtime.castArcanePulse(),
  },
  {
    id: 'summon-rat-familiar',
    label: 'Summon Rat Familiar',
    description: 'Call a temporary rat familiar that hunts nearby enemies.',
    school: 'conjuration',
    tags: ['summon', 'follower', 'creature'],
    manaCost: 25,
    canCast: (runtime) =>
      runtime.hasRatFamiliar() ? { ok: false, reason: 'summon-limit' } : { ok: true },
    cast: (runtime) => runtime.castSummonRatFamiliar(),
  },
] as const;

export class SpellRegistry {
  private readonly definitions = new Map<string, SpellDefinition>();

  constructor(definitions: readonly SpellDefinition[] = SPELL_DEFINITIONS) {
    for (const definition of definitions) {
      if (this.definitions.has(definition.id)) {
        throw new Error(`Duplicate spell id: ${definition.id}`);
      }
      this.definitions.set(definition.id, definition);
    }
  }

  get(spellId: string): SpellDefinition | undefined {
    return this.definitions.get(spellId);
  }

  list(): readonly SpellDefinition[] {
    return [...this.definitions.values()];
  }
}

export const spellRegistry = new SpellRegistry();
