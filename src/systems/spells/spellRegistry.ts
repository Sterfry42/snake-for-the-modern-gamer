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
  {
    id: 'firebolt',
    label: 'Firebolt',
    description: 'Hurl a searing bolt in the direction you face. It flies until it hits something.',
    school: 'destruction',
    tags: ['arcane', 'projectile', 'ranged'],
    manaCost: 12,
    cast: (runtime) => runtime.castFirebolt?.() ?? { magnitude: 0 },
  },
  {
    id: 'magic-missile',
    label: 'Magic Missile',
    description: 'A bolt of pure spite that homes onto the nearest enemy in range.',
    school: 'destruction',
    tags: ['arcane', 'homing', 'targeted'],
    manaCost: 16,
    canCast: (runtime) =>
      runtime.hasMagicMissileTarget?.() === false
        ? { ok: false, reason: 'invalid-target' }
        : { ok: true },
    cast: (runtime) => runtime.castMagicMissile?.() ?? { magnitude: 0 },
  },
  {
    id: 'lightning-strike',
    label: 'Lightning Strike',
    description:
      'Call a bolt from the sky onto the nearest enemy. If it breaks, the spark chains to the next.',
    school: 'destruction',
    tags: ['arcane', 'chain', 'targeted'],
    manaCost: 24,
    canCast: (runtime) =>
      runtime.hasLightningTarget?.() === false
        ? { ok: false, reason: 'invalid-target' }
        : { ok: true },
    cast: (runtime) => runtime.castLightningStrike?.() ?? { magnitude: 0 },
  },
  {
    id: 'frost-nova',
    label: 'Frost Nova',
    description: 'A burst of rime that chills nearby enemies in place and nips them as it passes.',
    school: 'alteration',
    tags: ['arcane', 'area', 'chill'],
    manaCost: 20,
    canCast: (runtime) =>
      runtime.hasFrostNovaTargets?.() === false
        ? { ok: false, reason: 'invalid-target' }
        : { ok: true },
    cast: (runtime) => runtime.castFrostNova?.() ?? { magnitude: 0 },
  },
  {
    id: 'swiftstep',
    label: 'Swiftstep',
    description:
      'Blink up to three tiles in the direction you face, stopping before anything solid.',
    school: 'alteration',
    tags: ['arcane', 'movement', 'blink'],
    manaCost: 18,
    canCast: (runtime) =>
      runtime.canSwiftstep?.() === false ? { ok: false, reason: 'invalid-target' } : { ok: true },
    cast: (runtime) => runtime.castSwiftstep?.() ?? { magnitude: 0 },
  },
  {
    id: 'haste',
    label: 'Haste',
    description: 'Your steps hum for a while. The world gets a little longer so you do not.',
    school: 'alteration',
    tags: ['arcane', 'buff', 'speed'],
    manaCost: 22,
    cast: (runtime) => runtime.castHaste?.() ?? { magnitude: 0 },
  },
  {
    id: 'mirror-image',
    label: 'Mirror Image',
    description:
      'A dashing decoy steps in front of you while the real you slips, warded for a few beats.',
    school: 'illusion',
    tags: ['arcane', 'deception', 'ward'],
    manaCost: 18,
    cast: (runtime) => runtime.castMirrorImage?.() ?? { magnitude: 0 },
  },
  {
    id: 'shimmer-cloak',
    label: 'Shimmer Cloak',
    description:
      'Wrap yourself in a trembling veil of light. Walls and fangs become polite suggestions.',
    school: 'illusion',
    tags: ['arcane', 'invisibility', 'phase'],
    manaCost: 26,
    cast: (runtime) => runtime.castShimmerCloak?.() ?? { magnitude: 0 },
  },
  {
    id: 'healing-glow',
    label: 'Healing Glow',
    description:
      'Warm light settles into you, banking one charge of stored vitality. If you are already full, it holds a short ward instead.',
    school: 'restoration',
    tags: ['arcane', 'vitality', 'ward'],
    manaCost: 30,
    cast: (runtime) => runtime.castHealingGlow?.() ?? { magnitude: 0 },
  },
  {
    id: 'mana-sip',
    label: 'Mana Sip',
    description:
      'Sip a little of the astral river. Restores a chunk of mana, but the river resents frequent visits.',
    school: 'restoration',
    tags: ['arcane', 'recovery', 'mana'],
    manaCost: 10,
    canCast: (runtime) =>
      (runtime.getSpellStatusTicks?.('mana-sip-cooldown') ?? 0) > 0
        ? { ok: false, reason: 'blocked-state' }
        : { ok: true },
    cast: (runtime) => runtime.castManaSip?.() ?? { magnitude: 0 },
  },
  {
    id: 'summon-light-wisp',
    label: 'Summon Light Wisp',
    description:
      'A small lantern of starlight drifts beside you, gently knitting mana back into you while it lasts.',
    school: 'conjuration',
    tags: ['summon', 'follower', 'creature'],
    manaCost: 28,
    canCast: (runtime) =>
      runtime.hasLightWisp?.() ? { ok: false, reason: 'summon-limit' } : { ok: true },
    cast: (runtime) => runtime.castSummonLightWisp?.() ?? { magnitude: 0 },
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
