import type { WorldEvent } from '../events/worldEventTypes.js';
import type { FactionCurrentEvent } from '../factions/factionTypes.js';
import type { Rumor, RumorSourceKind, RumorType } from './rumorTypes.js';

export function rumorTypeForWorldEvent(event: WorldEvent): RumorType {
  if (
    event.tags.includes('marriage') ||
    event.tags.includes('divorce') ||
    event.tags.includes('relationship')
  ) {
    return 'romance';
  }
  if (
    event.tags.includes('guild') ||
    event.tags.includes('pickpocket') ||
    event.tags.includes('crime') ||
    event.type === 'town-crime'
  ) {
    return 'crime';
  }
  if (
    event.tags.includes('faction') ||
    event.tags.includes('goblin') ||
    event.tags.includes('bandit')
  ) {
    return 'faction';
  }
  if (event.tags.includes('lore') || event.tags.includes('king')) {
    return 'lore';
  }
  if (event.tags.includes('shop')) {
    return 'shop';
  }
  if (
    event.type === 'animal-tamed' ||
    event.type === 'food-cooked' ||
    event.type === 'quest-completed' ||
    event.type === 'gate-opened'
  ) {
    return 'gossip';
  }
  if (
    event.tags.includes('combat') ||
    event.tags.includes('eaten') ||
    event.tags.includes('hunting')
  ) {
    return 'danger';
  }
  return 'player-action';
}

export function sourceKindForWorldEvent(event: WorldEvent): RumorSourceKind {
  if (event.tags.includes('guard') || event.tags.includes('town')) return 'guard';
  if (event.tags.includes('goblin')) return 'goblin';
  if (event.tags.includes('bandit')) return 'bandit';
  if (event.tags.includes('relationship') || event.tags.includes('marriage')) return 'romance';
  if (event.tags.includes('holy') || event.tags.includes('religion')) return 'religious';
  if (event.type === 'quest-completed' || event.type === 'gate-opened') return 'official';
  if (event.type === 'food-cooked' || event.type === 'animal-tamed') return 'personal';
  if (event.witnessActorIds.length > 0) return 'witness';
  return 'rumor';
}

export function shouldCreateRumorFromWorldEvent(event: WorldEvent): boolean {
  if (
    event.tags.includes('conversation') ||
    event.type === 'actor-talked' ||
    event.type === 'actor-asked-around' ||
    event.type === 'actor-asked-personally'
  ) {
    return false;
  }
  if (event.severity >= 35 || event.loudness >= 35) return true;
  if (
    [
      'animal-hunted',
      'animal-tamed',
      'food-cooked',
      'gate-opened',
      'player-death',
      'player-revival',
      'quest-completed',
    ].includes(event.type)
  ) {
    return true;
  }
  if (event.type === 'player-low-health' && event.tags.includes('critical')) return true;
  if (
    event.type === 'item-used' &&
    event.tags.some((tag) => ['alcohol', 'charm', 'orange-juice', 'powerup'].includes(tag))
  ) {
    return true;
  }
  return event.tags.some((tag) =>
    [
      'crime',
      'pickpocket',
      'eaten',
      'humanoid',
      'relationship',
      'marriage',
      'divorce',
      'guild',
      'faction',
      'raid',
      'skirmish',
      'lore',
      'king',
      'quest',
      'revival',
    ].includes(tag),
  );
}

export function factionIdsForWorldEvent(event: WorldEvent): string[] {
  const factions = new Set<string>();
  for (const tag of event.tags) {
    if (tag === 'goblin' || tag === 'goblin-camps') factions.add('goblin-camps');
    if (tag === 'town' || tag === 'guard' || tag === 'human' || tag === 'hearthbound-remnant')
      factions.add('hearthbound-remnant');
    if (tag === 'bandit' || tag === 'bandits') factions.add('bandits');
    if (tag === 'guild' || tag === 'thieves-guild') factions.add('thieves-guild');
    if (tag === 'angel' || tag === 'angels') factions.add('angels');
    if (tag === 'goblin-angel' || tag === 'goblin-angels') factions.add('goblin-angels');
    if (tag === 'wildlife') factions.add('wildlife');
  }
  return [...factions];
}

export function distortWorldEventSummary(event: WorldEvent, exaggeration: number): string {
  const summary = event.summary || 'Something happened.';
  if (event.tags.includes('eaten') && event.tags.includes('humanoid')) {
    return pickByExaggeration(exaggeration, [
      summary,
      `${summary} People are standing farther from the snake now.`,
      `${summary} By noon, someone will swear the snake called it medicine.`,
      `${summary} The official measurement is one less person and much more silence.`,
    ]);
  }
  if (event.tags.includes('pickpocket')) {
    return pickByExaggeration(exaggeration, [
      summary,
      `${summary} The guild denies involvement with suspicious fluency.`,
      `${summary} Three pockets now claim emotional damages.`,
      `${summary} Nobody saw the theft, which is why everyone has such detailed opinions.`,
    ]);
  }
  if (event.tags.includes('marriage')) {
    return pickByExaggeration(exaggeration, [
      summary,
      `${summary} People are arguing whether the vows counted all the tail.`,
      `${summary} The shopkeepers are already calculating family discounts incorrectly.`,
      `${summary} It was either romantic or a zoning incident with flowers.`,
    ]);
  }
  if (event.tags.includes('guild')) {
    return pickByExaggeration(exaggeration, [
      summary,
      `${summary} The honest people are pretending they do not know the dishonest people are organized.`,
      `${summary} The alleys have started sounding employed.`,
      `${summary} The guild has become real enough to deny itself professionally.`,
    ]);
  }
  if (event.tags.includes('town-crime') || event.tags.includes('crime')) {
    return pickByExaggeration(exaggeration, [
      summary,
      `${summary} Guards are calling it an incident, which means forms are hungry.`,
      `${summary} The law has found a chair and intends to sit heavily.`,
      `${summary} Everyone is innocent in the careful way people practice before fines.`,
    ]);
  }
  if (event.type === 'quest-completed') {
    return pickSeededByExaggeration(event.id, exaggeration, [
      [summary],
      [
        `${summary} The person who posted it is already claiming the plan worked exactly as intended.`,
        `${summary} Someone at the inn has promoted the snake from problem to contractor.`,
      ],
      [
        `${summary} Half the town says it was impossible. The other half says they suggested it.`,
        `${summary} The reward has grown twice in the telling and remains unpaid in both versions.`,
      ],
      [
        `${summary} By supper, the snake did it alone, in a storm, while carrying three witnesses.`,
        `${summary} The story now includes a speech nobody remembers hearing and applause nobody gave.`,
      ],
    ]);
  }
  if (event.type === 'animal-tamed') {
    return pickSeededByExaggeration(event.id, exaggeration, [
      [summary],
      [
        `${summary} The animal reportedly chose the snake after a very serious interview.`,
        `${summary} Local farmers are calling it friendship because ownership paperwork is harder.`,
      ],
      [
        `${summary} Children insist the herd now has ranks, uniforms, and a treasurer.`,
        `${summary} The animal follows willingly, according to people who did not ask it.`,
      ],
      [
        `${summary} The herd is now described as an army by anyone selling fences.`,
        `${summary} Witnesses claim every nearby animal bowed. Nearby animals deny comment.`,
      ],
    ]);
  }
  if (event.type === 'animal-hunted') {
    return pickSeededByExaggeration(event.id, exaggeration, [
      [summary],
      [
        `${summary} The woods have become quieter in a way hunters are pretending not to notice.`,
        `${summary} Tracks near the scene are being interpreted by people with no tracking experience.`,
      ],
      [
        `${summary} The animal was apparently enormous, especially to everyone who arrived afterward.`,
        `${summary} Three hunters now remember assisting from strategically distant locations.`,
      ],
      [
        `${summary} The forest has allegedly placed a bounty, though nobody knows what forests spend.`,
        `${summary} By morning it will have had antlers, armor, and a personal grudge.`,
      ],
    ]);
  }
  if (event.type === 'food-cooked') {
    return pickSeededByExaggeration(event.id, exaggeration, [
      [summary],
      [
        `${summary} The smell reached two rooms farther than the recipe admits.`,
        `${summary} A cook nearby has called it unconventional, which is professional fear.`,
      ],
      [
        `${summary} People disagree whether it was cuisine, alchemy, or a very polite fire.`,
        `${summary} Someone wants the recipe. Someone else wants the cookware inspected.`,
      ],
      [
        `${summary} The dish is now credited with curing a stranger who never ate it.`,
        `${summary} By closing time it will be a royal recipe stolen from a dragon.`,
      ],
    ]);
  }
  if (event.type === 'player-death' || event.type === 'player-revival') {
    return pickSeededByExaggeration(event.id, exaggeration, [
      [summary],
      [
        `${summary} Witnesses are revising their understanding of what counts as final.`,
        `${summary} The undertaker has requested clearer rules before accepting future work.`,
      ],
      [
        `${summary} Three people now claim they predicted it, including one who was not there.`,
        `${summary} The story has split into a funeral version and a much louder comeback version.`,
      ],
      [
        `${summary} Death itself is said to have filed a complaint about inconsistent enforcement.`,
        `${summary} The snake reportedly returned because the afterlife lacked adequate apples.`,
      ],
    ]);
  }
  if (event.type === 'gate-opened') {
    return pickSeededByExaggeration(event.id, exaggeration, [
      [summary],
      [
        `${summary} The guards insist the timing was administrative, not personal.`,
        `${summary} Everyone waiting behind the snake has become an expert on gate policy.`,
      ],
      [
        `${summary} The tax is already larger in every retelling by someone who did not pay it.`,
        `${summary} People say the hinges only respect money now.`,
      ],
      [
        `${summary} The gate supposedly bowed. The guard says that was wind and refuses questions.`,
        `${summary} The opening is being remembered as either a triumph or an accounting error.`,
      ],
    ]);
  }
  return pickByExaggeration(exaggeration, [
    summary,
    pickSeeded(event.id, [
      `${summary} People are repeating it with different hands.`,
      `${summary} Someone nearby has already improved the story beyond recognition.`,
      `${summary} The first witness has facts. The second has confidence.`,
    ]),
    pickSeeded(event.id, [
      `${summary} The rumor is still young and already badly dressed.`,
      `${summary} Every retelling adds a motive and removes a useful detail.`,
      `${summary} The town agrees something happened and is divided on every noun.`,
    ]),
    pickSeeded(event.id, [
      `${summary} The quiet part is walking around with witnesses now.`,
      `${summary} By morning this will involve royalty, weather, and an unpaid debt.`,
      `${summary} The story has become too organized to remain merely inaccurate.`,
    ]),
  ]);
}

export function rumorFromFactionEvent(event: FactionCurrentEvent, createdAt: number): Rumor {
  return {
    id: `rumor:${event.id}`,
    sourceEventId: event.id,
    townId: event.townId,
    roomId: event.roomId,
    factionIds: [...event.factionIds],
    type: 'faction',
    sourceKind: event.type.includes('raid')
      ? 'bandit'
      : event.tags.includes('goblin')
        ? 'goblin'
        : 'official',
    truthLevel: 84,
    exaggeration: Math.min(35, Math.max(5, Math.round(event.severity / 3))),
    severity: event.severity,
    textSeed: event.summary,
    summary: factionRumorSummary(event),
    tags: [...event.tags, 'faction', event.type, event.phase],
    createdAt,
    expiresAt: event.expiresAt,
    knownByActorIds: [...event.actorIds],
    public: event.severity >= 20,
  };
}

function factionRumorSummary(event: FactionCurrentEvent): string {
  switch (event.type) {
    case 'raid-warning':
      return `${event.summary} The warning is still early enough for people to pretend it is planning.`;
    case 'raid-active':
      return `${event.summary} The difference between rumor and gunfire has become academic.`;
    case 'raid-aftermath':
      return `${event.summary} Everyone is counting losses in the unit that hurts them most.`;
    case 'inspection':
      return `${event.summary} Inspections are theater where the props can arrest you.`;
    case 'debt-collection':
      return `${event.summary} The goblins call it collection. Humans call it pressure. The debt calls it dinner.`;
    case 'guard-crackdown':
      return `${event.summary} The guards are practicing law loudly.`;
    case 'guild-exposure':
      return `${event.summary} The alleys are denying everything in matching shoes.`;
    case 'market-shutdown':
      return `${event.summary} Closed stalls make louder politics than open ones.`;
    default:
      return event.summary;
  }
}

function pickByExaggeration(exaggeration: number, lines: readonly string[]): string {
  if (exaggeration >= 45) return lines[3] ?? lines[lines.length - 1] ?? '';
  if (exaggeration >= 25) return lines[2] ?? lines[lines.length - 1] ?? '';
  if (exaggeration >= 10) return lines[1] ?? lines[0] ?? '';
  return lines[0] ?? '';
}

function pickSeededByExaggeration(
  seed: string,
  exaggeration: number,
  tiers: readonly (readonly string[])[],
): string {
  const tier = exaggeration >= 45 ? 3 : exaggeration >= 25 ? 2 : exaggeration >= 10 ? 1 : 0;
  return pickSeeded(`${seed}:${tier}`, tiers[tier] ?? tiers[0] ?? []);
}

function pickSeeded(seed: string, lines: readonly string[]): string {
  if (lines.length === 0) return '';
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return lines[Math.abs(hash) % lines.length] ?? lines[0] ?? '';
}
