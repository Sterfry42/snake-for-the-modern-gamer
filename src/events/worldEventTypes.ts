/**
 * World Event Types
 *
 * The wise old snake's world events:
 * - 'wise-old-snake-spawned' - The wise old snake appeared
 * - 'wise-old-snake-talked' - The wise old snake spoke wisdom
 * - 'wise-old-snake-riddle' - The wise old snake posed a riddle
 * - 'wise-old-snake-blessing' - The wise old snake granted a blessing
 * - 'wise-old-snake-prophecy' - The wise old snake made a prophecy
 * - 'wise-old-snake-gift' - The wise old snake gave a gift
 * - 'wise-old-snake-lesson' - The wise old snake taught a lesson
 * - 'wise-old-snake-discovery' - The wise old snake was discovered
 * - 'wise-old-snake-vanished' - The wise old snake disappeared
 * - 'wise-old-snake-eternal' - The wise old snake remains eternal
 *
 * These events were never implemented but are referenced throughout the codebase.
 */
export type WorldEventType =
  | 'actor-spawned'
  | 'actor-talked'
  | 'actor-asked-around'
  | 'actor-asked-personally'
  | 'actor-personal-reveal'
  | 'actor-rumor-shared'
  | 'animal-hunted'
  | 'animal-startled'
  | 'animal-tamed'
  | 'enemy-defeated'
  | 'humanoid-eaten'
  | 'item-used'
  | 'food-cooked'
  | 'shop-purchase'
  | 'gate-opened'
  | 'quest-completed'
  | 'pickpocket'
  | 'town-crime'
  | 'relationship-choice'
  | 'player-low-health'
  | 'player-death'
  | 'player-revival'
  | 'bandit-raid-started'
  | 'bandit-raid-ended'
  | 'faction-skirmish-started'
  | 'faction-skirmish-ended'
  | 'room-entered'
  | 'bullet-train-departed'
  | 'bullet-train-arrived'
  // Weather & Season Events
  | 'weather-change'
  | 'season-change'
  | 'thunderclap'
  | 'lightning-strike'
  | 'firstSnow'
  | 'springThaw'
  | 'heatwave-warning'
  | 'storm-approaching'
  | 'fog-rolling-in'
  | 'apple-weather-effect'
  | 'animal-weather-behavior'
  // Mutation Events
  | 'mutation:discovered'
  | 'mutation:traitGained'
  | 'mutation:traitExpired'
  | 'mutation:evolvedAppleSpawned'
  | 'mutation:appleEaten'
  | 'mutation:goldStabilize'
  // Ecosystem Events
  | 'ecosystem-predator-outbreak'
  | 'ecosystem-herbivore-migration'
  | 'ecosystem-plague'
  | 'ecosystem-famine'
  | 'ecosystem-mating-season'
  | 'ecosystem-recovery'
  | 'settlement-founded'
  | 'settlement-dissolved'
  | 'kingdom-formed'
  | 'trade-route-established'
  | 'war-declared'
  | 'peace-treaty'
  | 'territory-captured'
  | 'territory-liberated'
  | 'alliance-formed'
  | 'alliance-broken'
  | 'mercenary-contracted'
  | 'treaty-signed'
  | 'betrayal'
  | 'royal-event'
  | 'photo-taken'
  | 'modern-run-synergy'
  | 'companion-bond-milestone'
  | 'companion-bred'
  | 'companion-trait-gained'
  | 'animal-market-restocked';

export interface WorldEvent {
  id: string;
  type: WorldEventType;
  roomId?: string;
  sourceActorId?: string;
  targetActorIds: string[];
  witnessActorIds: string[];
  severity: number;
  loudness: number;
  tags: string[];
  summary: string;
  createdAtRoomNumber?: number;
  createdAtMs: number;
  data?: Record<string, unknown>;
}

export interface CreateWorldEventInput {
  type: WorldEventType;
  roomId?: string;
  sourceActorId?: string;
  targetActorIds?: string[];
  witnessActorIds?: string[];
  severity?: number;
  loudness?: number;
  tags?: string[];
  summary?: string;
  createdAtRoomNumber?: number;
  data?: Record<string, unknown>;
}

export interface WorldEventSaveData {
  version: number;
  events: WorldEvent[];
}
