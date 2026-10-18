import type { SnakeGame } from '../game/snakeGame.js';
import type { EquipmentSlot } from '../inventory/item.js';
import type { Quest } from '../quests/quest.js';
import type { RelationshipChoice, RelationshipState } from '../relationships/relationshipTypes.js';

/** Transport data only: no quest callbacks, runtime services, or simulation RNG. */
export interface SceneQuestState extends Pick<Quest, 'id' | 'label' | 'description'> {
  objectives: ReturnType<SnakeGame['getQuestObjectiveSummaries']>;
  subtasks: string[];
}

export interface SceneClientState {
  worldRooms: import('../world/types.js').RoomSnapshot[];
  specialState: import('../stats/specialTypes.js').SpecialStatsState;
  levelProgression: import('../stats/levelProgression.js').LevelProgressionState;
  raccoon: { weight: number; hungerTimerMs: number; banditMeter: number; stashedTotal: number };
  worldSeed: string;
  flags: Record<string, unknown>;
  inventory: Record<string, number>;
  equipment: Partial<Record<EquipmentSlot, string>>;
  quests: {
    active: SceneQuestState[];
    accepted: SceneQuestState[];
    completedIds: string[];
    markerQuestId?: string;
    markers: ReturnType<SnakeGame['getQuestMapMarkers']>;
  };
  special: ReturnType<SnakeGame['getSpecialStatsView']>;
  specialModifiers: ReturnType<SnakeGame['getSpecialGameplayModifiers']>;
  fishingModifiers: ReturnType<SnakeGame['getFishingSpecialModifiers']>;
  relationships: ReturnType<SnakeGame['getDatingCandidateViews']>;
  relationshipStates: Record<string, RelationshipState>;
  relationshipActions: Record<string, Array<RelationshipChoice | 'gift'>>;
  profiles: ReturnType<SnakeGame['getPresentRelationshipProfilesForRoom']>;
  atmosphere: ReturnType<SnakeGame['getAtmosphereState']>;
  atmosphereView: ReturnType<SnakeGame['getAtmosphereForRoom']>;
  construction: {
    placement: ReturnType<SnakeGame['getStructurePlacement']>;
    preview: ReturnType<SnakeGame['previewStructurePlacement']>;
    structures: ReturnType<SnakeGame['placedStructures']>;
    claim: ReturnType<SnakeGame['getRoomClaim']>;
  };
  actors: ReturnType<SnakeGame['getActorsInCurrentRoom']>;
  town: ReturnType<SnakeGame['getCurrentTown']>;
  cars: ReturnType<SnakeGame['getCars']>;
  followers: ReturnType<SnakeGame['getFollowers']>;
  animalCompanions: ReturnType<SnakeGame['getAnimalCompanions']>;
  artifacts: ReturnType<SnakeGame['getArtifactViews']>;
  maneuver: ReturnType<SnakeGame['getManeuverState']>;
  temperature: ReturnType<SnakeGame['getPlayerTemperature']>;
  radiation: ReturnType<SnakeGame['getRadiationTimer']>;
  karma: ReturnType<SnakeGame['getKarmaView']>;
  emoticons: ReturnType<SnakeGame['getEmoticonState']>;
  modernRun: ReturnType<SnakeGame['getModernRunState']>;
  highlights: ReturnType<SnakeGame['getHighlightReelState']>;
  expeditions: ReturnType<SnakeGame['getExpeditionBoardState']>;
  synergies: ReturnType<SnakeGame['getModernSynergyState']>;
  alchemy: ReturnType<SnakeGame['getAlchemyState']>;
  generatedRoomIds: string[];
}
