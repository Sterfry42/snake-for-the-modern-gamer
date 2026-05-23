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
    brainId: args.brainId,
    flags: args.flags ?? {},
    createdAtRoomNumber: args.createdAtRoomNumber,
  };
}

export function actorIdForTownResident(townId: string, residentId: string, role: string): string {
  const actorRole = role === 'shopkeeper' ? 'shopkeeper' : role === 'guard' ? 'guard' : 'resident';
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
  const maxHealth = role === 'guard' ? 3 : role === 'shopkeeper' ? 3 : 2;
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
    combat:
      role === 'guard' || role === 'thief' || role === 'thiefContact' || role === 'shopkeeper'
        ? {
            armed: true,
            ranged: true,
            melee: true,
            canBeEatenWhenHostile: true,
            slashCooldown: 0,
            surrenderChance: role === 'guard' ? 0.15 : 0.3,
          }
        : undefined,
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
  if (role === 'thief' || role === 'thiefContact' || role === 'guildContact') return 'criminal';
  return 'civilian';
}

function brainForRole(role: ActorRole): ActorBrainId {
  if (role === 'shopkeeper' || role === 'bartender') return 'shopkeeper';
  if (role === 'guard' || role === 'gateGuard') return 'guard';
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
