import type { AnimalDefinition, AnimalInstance } from '../animals/types.js';
import type { EnemyInstance } from '../systems/enemies.js';
import type { TownResident, TownStructure } from '../world/town.js';
import {
  isTownCriminalRole,
  isTownGuardRole,
  isTownShopRole,
  type TownResidentRole,
} from '../world/townRoles.js';
import type {
  RelationshipCandidateProfile,
  RelationshipPersonality,
  RelationshipSpecies,
  RelationshipState,
} from '../relationships/relationshipTypes.js';
import { stableStringHashPositive } from '../core/math.js';
import type {
  Actor,
  ActorBrainId,
  ActorCombatProfile,
  ActorKind,
  ActorMood,
  ActorNeeds,
  ActorPersonalityTag,
  ActorRole,
  ActorSchedule,
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

const PREY_SCHEDULE: ActorSchedule = {
  policyId: 'animal-prey',
  routines: {
    dawn: { behavior: 'emerge', goalKind: 'wander', priority: 8, roomTarget: 'current' },
    day: { behavior: 'forage', goalKind: 'wander', priority: 8, roomTarget: 'current' },
    dusk: { behavior: 'seekDen', goalKind: 'wander', priority: 12, roomTarget: 'current' },
    night: { behavior: 'hide', goalKind: 'sleep', priority: 18, roomTarget: 'current' },
  },
};

const PREDATOR_SCHEDULE: ActorSchedule = {
  policyId: 'animal-predator',
  routines: {
    dawn: { behavior: 'hunt', goalKind: 'wander', priority: 10, roomTarget: 'current' },
    day: { behavior: 'roam', goalKind: 'wander', priority: 8, roomTarget: 'current' },
    dusk: { behavior: 'hunt', goalKind: 'wander', priority: 10, roomTarget: 'current' },
    night: { behavior: 'hunt', goalKind: 'wander', priority: 12, roomTarget: 'current' },
  },
};

const BANDIT_SCHEDULE: ActorSchedule = {
  policyId: 'bandit',
  routines: {
    dawn: { behavior: 'camp', goalKind: 'sleep', priority: 14, roomTarget: 'current' },
    day: { behavior: 'scout', goalKind: 'wander', priority: 9, roomTarget: 'current' },
    dusk: { behavior: 'patrol', goalKind: 'defendArea', priority: 11, roomTarget: 'current' },
    night: { behavior: 'ambush', goalKind: 'defendArea', priority: 13, roomTarget: 'current' },
  },
};

const GOBLIN_SCHEDULE: ActorSchedule = {
  policyId: 'goblin-merchant',
  routines: {
    dawn: { behavior: 'work', goalKind: 'work', priority: 10, roomTarget: 'current' },
    day: { behavior: 'work', goalKind: 'work', priority: 12, roomTarget: 'current' },
    dusk: { behavior: 'socialize', goalKind: 'socialize', priority: 8, roomTarget: 'current' },
    night: { behavior: 'sleep', goalKind: 'sleep', priority: 16, roomTarget: 'current' },
  },
};

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
  playerHostility?: Actor['playerHostility'];
  schedule?: Actor['schedule'];
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
    playerHostility: args.playerHostility,
    goal: { kind: 'wander', priority: 1, roomId: args.currentRoomId, reason: 'created' },
    activity: {
      kind: args.hostility === 'dead' ? 'dead' : 'idle',
      source: 'system',
      startedAtRoomNumber: args.createdAtRoomNumber,
    },
    soul: createSoulProfile(args.id, args.role, args.species, personality),
    lore: createLoreProfile(args.id, args.role, args.species, args.townId),
    schedule: args.schedule,
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
  const seed = stableStringHashPositive(id);
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
  const seed = stableStringHashPositive(id);
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
    scale:
      role === 'guard' || role === 'gateGuard'
        ? 'kingdom'
        : species === 'goblin'
          ? 'regional'
          : 'local',
    knowsAboutKing:
      role === 'guard' || role === 'gateGuard' || role === 'bartender' || seed % 3 === 0,
    kingOpinion: pick(kingOpinionOptions, seed >> 2),
    secretType: pick(secretTypes, seed >> 4),
    anchorEvent:
      seed % 2 === 0 ? 'the Bellgrave tax winter' : 'the night the west road bells stopped',
    anchorPlace: townId ?? 'the old road',
    anchorInstitution:
      species === 'goblin'
        ? 'the Ledger Below'
        : role === 'guard'
          ? 'the gate office'
          : 'the town hall',
    officialVersionBelief: seed % 101,
    bitternessTowardKing: (seed >> 5) % 101,
    revealedLoreIds: [],
  };
}

function pick<T>(items: readonly T[], seed: number): T {
  return items[Math.abs(seed) % items.length]!;
}

export function actorIdForTownResident(
  townId: string,
  residentId: string,
  role: TownResidentRole,
): string {
  const actorRole =
    role === 'shopkeeper'
      ? 'shopkeeper'
      : role === 'equipmentMerchant'
        ? 'equipmentMerchant'
        : role === 'potionMaker'
          ? 'potionMaker'
          : role === 'butcher'
            ? 'butcher'
            : role === 'cardDealer'
              ? 'cardDealer'
              : role === 'physicalTrainer'
                ? 'physicalTrainer'
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
    schedule:
      role === 'gateGuard' || role === 'guard'
        ? {
            policyId: 'town-guard',
            fixedPostRoomId: args.workRoomId ?? args.currentRoomId,
            fixedPostPosition: args.postPosition ? { ...args.postPosition } : undefined,
            patrolRoomIds: args.workRoomId ? [args.workRoomId] : undefined,
            permanentDuty: role === 'gateGuard',
          }
        : {
            policyId: 'town-resident',
            homeRoomId: args.homeRoomId ?? args.currentRoomId,
            workRoomId: args.workRoomId ?? args.currentRoomId,
          },
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
    schedule: predator ? PREDATOR_SCHEDULE : PREY_SCHEDULE,
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
    role: isDuelist
      ? 'duelist'
      : isGoblin
        ? 'goblinMerchant'
        : isShark
          ? 'animalPredator'
          : 'bandit',
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
    schedule: isGoblin ? GOBLIN_SCHEDULE : isShark ? PREDATOR_SCHEDULE : BANDIT_SCHEDULE,
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
  const personality = relationshipPersonalityTags(args.personality);
  return createBaseActor({
    id: args.actorId ?? actorIdForRelationship(args.relationshipId),
    kind:
      species === 'goblin'
        ? 'criminal'
        : species === 'angel' || species === 'goblinAngel'
          ? 'supernatural'
          : 'civilian',
    role: 'romanceCandidate',
    species,
    thickness: args.stage === 'married' || args.stage === 'lover' ? 'thick' : 'medium',
    displayName: args.displayName,
    personality,
    factionId: args.factionId,
    currentRoomId: args.homeRoomId,
    homeRoomId: args.homeRoomId,
    portraitId: args.portraitId,
    hostility: args.stage === 'hostile' || args.stage === 'murderous' ? 'hostile' : 'neutral',
    playerHostility:
      args.stage === 'hostile' || args.stage === 'murderous'
        ? {
            state: 'hostile',
            reason: 'relationship-stage-hostile',
            startedAtRoomNumber: args.createdAtRoomNumber,
          }
        : undefined,
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
    personality: relationship.personality,
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
    personality: profile.personality,
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

function mapTownResidentRole(role: TownResidentRole): ActorRole {
  switch (role) {
    case 'shopkeeper':
      return 'shopkeeper';
    case 'equipmentMerchant':
      return 'equipmentMerchant';
    case 'potionMaker':
      return 'potionMaker';
    case 'butcher':
      return 'butcher';
    case 'cardDealer':
      return 'cardDealer';
    case 'physicalTrainer':
      return 'physicalTrainer';
    case 'bartender':
      return 'bartender';
    case 'guard':
      return 'guard';
    case 'gateGuard':
      return 'gateGuard';
    case 'questGiver':
      return 'questGiver';
    case 'thiefContact':
      return 'thiefContact';
    case 'guildContact':
      return 'guildContact';
    case 'blackMarketMerchant':
      return 'blackMarketMerchant';
    case 'thief':
      return 'thief';
    case 'scribe':
    case 'resident':
      return 'resident';
  }
}

function mapTownResidentKind(role: ActorRole): ActorKind {
  if (isTownShopRole(role)) {
    return 'shopkeeper';
  }
  if (isTownGuardRole(role)) return 'guard';
  if (role === 'questGiver') return 'civilian';
  if (isTownCriminalRole(role)) return 'criminal';
  return 'civilian';
}

function brainForRole(role: ActorRole): ActorBrainId {
  if (isTownShopRole(role)) {
    return 'shopkeeper';
  }
  if (isTownGuardRole(role)) return 'guard';
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
    case 'equipmentMerchant':
      return ['practical', 'sharp', 'statusHungry'];
    case 'potionMaker':
      return ['practical', 'nosy', 'softhearted'];
    case 'butcher':
      return ['practical', 'hungry', 'deadpan'];
    case 'cardDealer':
      return ['greedy', 'sharp', 'nosy'];
    case 'physicalTrainer':
      return ['practical', 'brave', 'sharp'];
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

function mapRelationshipSpecies(species: RelationshipSpecies): ActorSpecies {
  switch (species) {
    case 'goblin':
      return 'goblin';
    case 'angel':
      return 'angel';
    case 'goblin-angel':
      return 'goblinAngel';
    case 'moleman':
      return 'moleman';
    case 'human':
      return 'human';
  }
}

function relationshipPersonalityTags(
  personality: RelationshipPersonality | undefined,
): ActorPersonalityTag[] {
  const tags: ActorPersonalityTag[] = ['romantic', 'sentimental'];
  if (personality && !tags.includes(personality)) {
    tags.push(personality);
  }
  return tags;
}
