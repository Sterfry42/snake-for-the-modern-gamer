import type { AnimalDefinition, AnimalInstance } from '../animals/types.js';
import type { EnemyInstance } from '../systems/enemies.js';
import type { TownResident, TownStructure } from '../world/town.js';
import type {
  RelationshipCandidateProfile,
  RelationshipState,
} from '../relationships/relationshipTypes.js';
import type {
  Actor,
  ActorBrainId,
  ActorCombatProfile,
  ActorKind,
  ActorMood,
  ActorNeeds,
  ActorPersonalityTag,
  ActorRole,
  ActorSoulProfile,
  ActorLoreProfile,
  ActorSpecies,
  ActorThickness,
  EnsureAnimalActorArgs,
  EnsureEnemyActorArgs,
  EnsureRelationshipActorArgs,
  EnsureTownResidentActorArgs,
  EnsureWandererActorArgs,
} from './actorTypes.js';

export function createDefaultMood(tags: readonly ActorPersonalityTag[] = []): ActorMood {
  return {
    fear: tags.includes('cowardly') || tags.includes('paranoid') ? 35 : 15,
    anger: tags.includes('violent') || tags.includes('vengeful') ? 35 : 10,
    trust: tags.includes('kind') || tags.includes('softhearted') ? 35 : 20,
    affection: tags.includes('romantic') || tags.includes('sentimental') ? 30 : 10,
    greed: tags.includes('greedy') || tags.includes('goblin') ? 55 : 15,
    hunger: tags.includes('hungry') ? 65 : 20,
    curiosity: tags.includes('nosy') || tags.includes('sharp') ? 50 : 25,
    grief: tags.includes('melancholy') ? 35 : 5,
    stress: tags.includes('bureaucratic') || tags.includes('lawful') ? 35 : 15,
  };
}

export function createDefaultNeeds(tags: readonly ActorPersonalityTag[] = []): ActorNeeds {
  return {
    food: tags.includes('hungry') ? 70 : 25,
    safety: tags.includes('cowardly') || tags.includes('paranoid') ? 70 : 35,
    money: tags.includes('greedy') ? 75 : 30,
    social: tags.includes('lonely') || tags.includes('romantic') ? 65 : 25,
    rest: 25,
    duty: tags.includes('lawful') || tags.includes('bureaucratic') ? 70 : 20,
    curiosity: tags.includes('nosy') ? 70 : 25,
    revenge: tags.includes('vengeful') ? 65 : 5,
    faith: tags.includes('religious') || tags.includes('goblin') ? 55 : 10,
    status: tags.includes('statusHungry') || tags.includes('regal') ? 70 : 20,
  };
}

export function createBaseActor(args: {
  id: string;
  kind: ActorKind;
  role: ActorRole;
  species: ActorSpecies;
  thickness: ActorThickness;
  displayName: string;
  personality?: ActorPersonalityTag[];
  factionId?: string;
  townId?: string;
  currentRoomId?: string;
  homeRoomId?: string;
  workRoomId?: string;
  portraitId?: string;
  health?: Actor['health'];
  combat?: ActorCombatProfile;
  hostility?: Actor['hostility'];
  brainId?: ActorBrainId;
  flags?: Record<string, unknown>;
  createdAtRoomNumber?: number;
}): Actor {
  const personality = args.personality ?? [];
  return {
    id: args.id,
    kind: args.kind,
    role: args.role,
    species: args.species,
    thickness: args.thickness,
    displayName: args.displayName,
    shortName: args.displayName.split(' ')[0] ?? args.displayName,
    factionId: args.factionId,
    townId: args.townId,
    currentRoomId: args.currentRoomId,
    homeRoomId: args.homeRoomId,
    workRoomId: args.workRoomId,
    portraitId: args.portraitId,
    personality,
    mood: createDefaultMood(personality),
    needs: createDefaultNeeds(personality),
    opinions: {},
    relationships: [],
    memory: [],
    health: args.health,
    combat: args.combat,
    hostility: args.hostility,
    soul: createSoulProfile(args.id, args.role, args.species, personality),
    lore: createLoreProfile(args.id, args.role, args.species, args.townId),
    brainId: args.brainId,
    flags: args.flags ?? {},
    createdAtRoomNumber: args.createdAtRoomNumber,
  };
}

function createSoulProfile(
  id: string,
  role: ActorRole,
  species: ActorSpecies,
  personality: readonly ActorPersonalityTag[],
): ActorSoulProfile | undefined {
  if (species === 'animal' || species === 'beast' || species === 'shark' || role === 'boss') {
    return undefined;
  }
  const seed = hashString(id);
  const wounds = [
    'They once abandoned a friend at a gate and still count every hinge.',
    'They survived a winter by lying to someone kinder than them.',
    'They were praised for courage on the day they were most afraid.',
    'They lost family to a law everyone now pretends was mercy.',
    'They keep a private list of names they could not save.',
  ];
  const insecurities = [
    'They fear being useful is the only reason anyone stays.',
    'They suspect their jokes are a door with no room behind it.',
    'They think their hands look guilty even when empty.',
    'They worry they are ordinary in a world that punishes ordinary people.',
    'They believe every kindness toward them has an invoice hidden in it.',
  ];
  const longings = [
    'They want one quiet morning where no one needs anything from them.',
    'They want to leave town and be missed for the correct reasons.',
    'They want proof that bravery is not just fear with witnesses.',
    'They want a promise that does not become paperwork.',
    'They want to hear the old songs without flinching.',
  ];
  const secrets = [
    'They know where a sealed town ledger was buried.',
    'They once carried a message from a royal courier and never delivered it.',
    'They have a forbidden shrine mark hidden under their clothes.',
    'They are paying a debt under a false family name.',
    'They recognized the King in a story that was supposed to be fiction.',
  ];
  return {
    wound: pick(wounds, seed),
    insecurity: pick(insecurities, seed >> 3),
    longing: pick(longings, seed >> 5),
    contradiction: personality.includes('lawful')
      ? 'They trust laws most when laws protect them from choosing.'
      : personality.includes('criminal')
        ? 'They hate authority and still want permission to be forgiven.'
        : 'They want to be known and also safely misunderstood.',
    secret: pick(secrets, seed >> 7),
    relationshipFear: 'They fear affection that changes the public story of their life.',
    confessionStyle: personality.includes('deadpan')
      ? 'dry'
      : personality.includes('poetic') || personality.includes('romantic')
        ? 'dramatic'
        : 'guarded',
    revealed: {},
  };
}

function createLoreProfile(
  id: string,
  role: ActorRole,
  species: ActorSpecies,
  townId?: string,
): ActorLoreProfile | undefined {
  if (species === 'animal' || species === 'beast' || species === 'shark') {
    return undefined;
  }
  const seed = hashString(id);
  const kingOpinionOptions: NonNullable<ActorLoreProfile['kingOpinion']>[] = [
    'loyal',
    'afraid',
    'bitter',
    'mocking',
    'conflicted',
    'secretlyRoyal',
  ];
  const secretTypes: NonNullable<ActorLoreProfile['secretType']>[] = [
    'royal',
    'war',
    'religion',
    'crime',
    'family',
    'exile',
    'guild',
    'debt',
  ];
  return {
    scale: role === 'guard' || role === 'gateGuard' ? 'kingdom' : species === 'goblin' ? 'regional' : 'local',
    knowsAboutKing: role === 'guard' || role === 'gateGuard' || role === 'bartender' || seed % 3 === 0,
    kingOpinion: pick(kingOpinionOptions, seed >> 2),
    secretType: pick(secretTypes, seed >> 4),
    anchorEvent: seed % 2 === 0 ? 'the Bellgrave tax winter' : 'the night the west road bells stopped',
    anchorPlace: townId ?? 'the old road',
    anchorInstitution: species === 'goblin' ? 'the Ledger Below' : role === 'guard' ? 'the gate office' : 'the town hall',
    officialVersionBelief: seed % 101,
    bitternessTowardKing: (seed >> 5) % 101,
    revealedLoreIds: [],
  };
}

function pick<T>(items: readonly T[], seed: number): T {
  return items[Math.abs(seed) % items.length]!;
}

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
}

export function actorIdForTownResident(townId: string, residentId: string, role: string): string {
  const actorRole =
    role === 'shopkeeper'
      ? 'shopkeeper'
      : role === 'guard'
        ? 'guard'
        : role === 'questGiver'
          ? 'questGiver'
          : 'resident';
  return `town:${townId}:${actorRole}:${residentId}`;
}

export function actorIdForAnimal(roomId: string, animalId: string): string {
  return `animal:${roomId}:${animalId}`;
}

export function actorIdForEnemy(roomId: string, enemyId: string): string {
  return `enemy:${roomId}:${enemyId}`;
}

export function actorIdForRelationship(relationshipId: string): string {
  return `relationship:${relationshipId}`;
}

export function actorIdForWanderer(encounterId: string): string {
  return `wanderer:${encounterId}`;
}

export function createActorFromTownResident(args: EnsureTownResidentActorArgs): Actor {
  const role = mapTownResidentRole(args.role);
  const kind = mapTownResidentKind(role);
  const species: ActorSpecies = args.factionId === 'goblin-camps' ? 'goblin' : 'human';
  const personality = personalityForTownRole(role, species);
  const maxHealth = 3;
  return createBaseActor({
    id: args.actorId ?? actorIdForTownResident(args.townId, args.residentId, args.role),
    kind,
    role,
    species,
    thickness: role === 'resident' ? 'medium' : 'medium',
    displayName: args.name,
    personality,
    factionId: args.factionId,
    townId: args.townId,
    currentRoomId: args.currentRoomId,
    homeRoomId: args.homeRoomId,
    workRoomId: args.workRoomId,
    portraitId: args.portraitId,
    health: { current: maxHealth, max: maxHealth, state: 'healthy' },
    combat: {
      armed: true,
      ranged: true,
      melee: true,
      canBeEatenWhenHostile: true,
      slashCooldown: 0,
      surrenderChance: role === 'guard' ? 0.15 : role === 'resident' ? 0.45 : 0.3,
    },
    hostility: 'neutral',
    brainId: brainForRole(role),
    flags: { source: 'townResident', residentId: args.residentId },
    createdAtRoomNumber: args.createdAtRoomNumber,
  });
}

export function createActorFromTownResidentEntity(
  town: TownStructure,
  resident: TownResident,
  currentRoomId?: string,
  createdAtRoomNumber?: number,
): Actor {
  return createActorFromTownResident({
    actorId: resident.actorId,
    residentId: resident.id,
    name: resident.name,
    role: resident.role,
    factionId: resident.factionId,
    townId: town.id,
    currentRoomId,
    homeRoomId: resident.homeRoomId,
    workRoomId: resident.workRoomId,
    portraitId: resident.portraitId,
    createdAtRoomNumber,
  });
}

export function createActorFromAnimal(
  args: EnsureAnimalActorArgs,
  definition?: AnimalDefinition,
): Actor {
  const predator = definition?.snakeEncounter === 'dangerous' || definition?.behavior === 'chase';
  const maxHealth = Math.max(1, args.maxHearts ?? args.currentHearts ?? definition?.maxHearts ?? 1);
  const currentHealth = Math.max(0, args.currentHearts ?? maxHealth);
  return createBaseActor({
    id: args.actorId ?? actorIdForAnimal(args.roomId, args.animalId),
    kind: args.isTamed ? 'follower' : 'animal',
    role: args.isTamed ? 'pet' : predator ? 'animalPredator' : 'animalPrey',
    species: 'animal',
    thickness: args.isTamed ? 'medium' : 'thin',
    displayName: args.animalName,
    personality: predator ? ['hungry', 'brave'] : ['cowardly'],
    factionId: predator ? 'wildlife.predator' : 'wildlife.prey',
    currentRoomId: args.roomId,
    health: {
      current: currentHealth,
      max: maxHealth,
      state: currentHealth <= 0 ? 'dead' : currentHealth < maxHealth ? 'wounded' : 'healthy',
    },
    combat: predator
      ? { armed: false, ranged: false, melee: true, canBeEatenWhenHostile: false }
      : undefined,
    hostility: predator ? 'hostile' : 'afraid',
    brainId: predator ? 'animalPredator' : 'animalPrey',
    flags: { source: 'animal', animalId: args.animalId, animalType: args.animalType },
    createdAtRoomNumber: args.createdAtRoomNumber,
  });
}

export function createActorFromAnimalEntity(
  animal: AnimalInstance,
  definition?: AnimalDefinition,
  createdAtRoomNumber?: number,
): Actor {
  return createActorFromAnimal(
    {
      actorId: animal.actorId,
      animalId: animal.id,
      animalType: animal.type,
      animalName: definition?.name ?? animal.type,
      roomId: animal.roomId,
      isTamed: animal.isTamed,
      currentHearts: animal.currentHearts,
      maxHearts: definition?.maxHearts,
      createdAtRoomNumber,
    },
    definition,
  );
}

export function createActorFromEnemy(args: EnsureEnemyActorArgs): Actor {
  const isGoblin = args.encounterKind === 'goblin';
  const isShark = args.encounterKind === 'shark';
  const isDuelist = args.encounterKind === 'duelist';
  const maxHealth = Math.max(1, args.maxHearts ?? args.currentHearts ?? 1);
  const currentHealth = Math.max(0, args.currentHearts ?? maxHealth);
  const displayName = args.name ?? (isShark ? 'Shark' : isGoblin ? 'Goblin Gunner' : 'Bandit');
  return createBaseActor({
    id: args.actorId ?? actorIdForEnemy(args.roomId, args.enemyId),
    kind: isShark ? 'enemy' : isDuelist ? 'boss' : isGoblin ? 'criminal' : 'enemy',
    role: isDuelist ? 'duelist' : isGoblin ? 'goblinMerchant' : isShark ? 'animalPredator' : 'bandit',
    species: isShark ? 'shark' : isGoblin ? 'goblin' : 'human',
    thickness: isDuelist || args.encounterKind === 'npc-hostile' ? 'medium' : 'thin',
    displayName,
    personality: isGoblin ? ['goblin', 'sharp', 'greedy'] : ['violent', 'hungry'],
    factionId: isGoblin ? 'goblin-camps' : isShark ? 'wildlife.predator' : 'bandits',
    currentRoomId: args.roomId,
    health: {
      current: currentHealth,
      max: maxHealth,
      state: currentHealth <= 0 ? 'dead' : currentHealth < maxHealth ? 'wounded' : 'healthy',
    },
    combat: {
      armed: !isShark,
      ranged: !isShark,
      melee: true,
      canBeEatenWhenHostile: !isShark,
      slashCooldown: 0,
      surrenderChance: isGoblin ? 0.2 : 0.1,
    },
    hostility: currentHealth <= 0 ? 'dead' : 'hostile',
    brainId: isShark ? 'animalPredator' : 'enemyRanged',
    flags: { source: 'enemy', enemyId: args.enemyId, encounterKind: args.encounterKind },
    createdAtRoomNumber: args.createdAtRoomNumber,
  });
}

export function createActorFromEnemyEntity(
  enemy: EnemyInstance,
  createdAtRoomNumber?: number,
): Actor {
  return createActorFromEnemy({
    actorId: enemy.actorId,
    enemyId: enemy.id,
    roomId: enemy.roomId,
    name: enemy.name,
    encounterKind: enemy.encounterKind,
    currentHearts: enemy.currentHearts,
    maxHearts: enemy.maxHearts,
    createdAtRoomNumber,
  });
}

export function createActorFromRelationship(args: EnsureRelationshipActorArgs): Actor {
  const species = mapRelationshipSpecies(args.species);
  return createBaseActor({
    id: args.actorId ?? actorIdForRelationship(args.relationshipId),
    kind: species === 'goblin' ? 'criminal' : species === 'angel' || species === 'goblinAngel' ? 'supernatural' : 'civilian',
    role: 'romanceCandidate',
    species,
    thickness: args.stage === 'married' || args.stage === 'lover' ? 'thick' : 'medium',
    displayName: args.displayName,
    personality: ['romantic', 'sentimental'],
    factionId: args.factionId,
    currentRoomId: args.homeRoomId,
    homeRoomId: args.homeRoomId,
    portraitId: args.portraitId,
    hostility: args.stage === 'hostile' || args.stage === 'murderous' ? 'hostile' : 'neutral',
    brainId: 'romance',
    flags: { source: 'relationship', relationshipId: args.relationshipId, stage: args.stage },
    createdAtRoomNumber: args.createdAtRoomNumber,
  });
}

export function createActorFromRelationshipState(
  relationship: RelationshipState,
  createdAtRoomNumber?: number,
): Actor {
  return createActorFromRelationship({
    actorId: relationship.actorId,
    relationshipId: relationship.id,
    displayName: relationship.displayName,
    species: relationship.species,
    factionId: relationship.factionId,
    homeRoomId: relationship.homeRoomId,
    portraitId: relationship.portraitId,
    stage: relationship.stage,
    createdAtRoomNumber,
  });
}

export function createActorFromRelationshipCandidate(
  profile: RelationshipCandidateProfile,
  createdAtRoomNumber?: number,
): Actor {
  return createActorFromRelationship({
    actorId: profile.actorId,
    relationshipId: profile.id,
    displayName: profile.displayName,
    species: profile.species,
    factionId: profile.factionId,
    homeRoomId: profile.homeRoomId,
    portraitId: profile.portraitId,
    createdAtRoomNumber,
  });
}

export function createActorFromWanderer(args: EnsureWandererActorArgs): Actor {
  return createBaseActor({
    id: args.actorId ?? actorIdForWanderer(args.encounterId),
    kind: 'wanderer',
    role: 'wanderingCounterpart',
    species: 'human',
    thickness: 'thick',
    displayName: args.displayName,
    personality: ['sharp', 'lonely'],
    currentRoomId: args.roomId,
    portraitId: args.portraitId,
    brainId: 'resident',
    flags: { source: 'wanderer', encounterId: args.encounterId },
    createdAtRoomNumber: args.createdAtRoomNumber,
  });
}

function mapTownResidentRole(role: string): ActorRole {
  switch (role) {
    case 'shopkeeper':
      return 'shopkeeper';
    case 'bartender':
      return 'bartender';
    case 'guard':
      return 'guard';
    case 'questGiver':
      return 'questGiver';
    case 'thiefContact':
      return 'thiefContact';
    case 'thief':
      return 'thief';
    case 'scribe':
      return 'resident';
    default:
      return 'resident';
  }
}

function mapTownResidentKind(role: ActorRole): ActorKind {
  if (role === 'shopkeeper' || role === 'bartender') return 'shopkeeper';
  if (role === 'guard' || role === 'gateGuard') return 'guard';
  if (role === 'questGiver') return 'civilian';
  if (role === 'thief' || role === 'thiefContact' || role === 'guildContact') return 'criminal';
  return 'civilian';
}

function brainForRole(role: ActorRole): ActorBrainId {
  if (role === 'shopkeeper' || role === 'bartender') return 'shopkeeper';
  if (role === 'guard' || role === 'gateGuard') return 'guard';
  if (role === 'questGiver') return 'resident';
  if (role === 'thief' || role === 'thiefContact') return 'thief';
  return 'resident';
}

function personalityForTownRole(role: ActorRole, species: ActorSpecies): ActorPersonalityTag[] {
  if (species === 'goblin') {
    return ['goblin', 'sharp', 'greedy'];
  }
  switch (role) {
    case 'shopkeeper':
      return ['practical', 'greedy', 'sharp'];
    case 'bartender':
      return ['nosy', 'deadpan', 'practical'];
    case 'guard':
      return ['lawful', 'bureaucratic', 'brave'];
    case 'questGiver':
      return ['nosy', 'sentimental', 'practical'];
    case 'thief':
    case 'thiefContact':
      return ['criminal', 'sharp', 'paranoid'];
    default:
      return ['practical'];
  }
}

function mapRelationshipSpecies(species: string): ActorSpecies {
  switch (species) {
    case 'goblin':
      return 'goblin';
    case 'angel':
      return 'angel';
    case 'goblin-angel':
      return 'goblinAngel';
    case 'human':
      return 'human';
    default:
      return 'unknown';
  }
}
