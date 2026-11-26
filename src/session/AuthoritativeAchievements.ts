import { HELL_ESCAPE_HEAT_RESISTANCE_FLAG } from '../world/hellDepth.js';
import {
  ACHIEVEMENT_DEFINITIONS,
  DISCOVERABLE_BIOME_IDS,
} from '../achievements/achievementDefinitions.js';
import { AchievementManager } from '../achievements/achievementManager.js';
import {
  MemoryAchievementStorage,
  normalizeAchievementState,
} from '../achievements/achievementStorage.js';
import type {
  AchievementEvent,
  AchievementSnapshot,
  AchievementState,
  AchievementUnlockResult,
} from '../achievements/achievementTypes.js';
import type { SnakeGame } from '../game/snakeGame.js';
import type { SkillTreeSystem } from '../systems/skillTree.js';

export const HOSTED_ACHIEVEMENTS_FLAG = 'achievements.hosted';

/** Runs in the current player context. The checkpoint already saves per-player flags. */
export function evaluateHostedAchievements(
  game: SnakeGame,
  skills: SkillTreeSystem,
  events: AchievementEvent[],
): AchievementUnlockResult[] {
  const flag = game.getFlag<AchievementState>(HOSTED_ACHIEVEMENTS_FLAG);
  const state = normalizeAchievementState(flag);
  const storage = new MemoryAchievementStorage(state);
  const manager = new AchievementManager(ACHIEVEMENT_DEFINITIONS, storage);
  const room = game.getCurrentRoom();
  const snapshot: AchievementSnapshot = {
    score: game.getScore(),
    length: game.getSnakeLength(),
    roomsVisited: Number(game.getFlag('roomsVisited') ?? 1),
    waterTilesSwum: state.run.waterTilesSwum,
    discoveredBiomeIds: [room.biomeId],
    discoverableBiomeIds: DISCOVERABLE_BIOME_IDS,
    wantedLevel: game.getCurrentTown()?.wantedLevel ?? 0,
    questsCompleted: game.getCompletedQuestIds().length,
    treasuresCollected: Number(game.getFlag('treasurePicked') ?? 0),
    equippedSlots: game
      .getInventory()
      .getAllEquipped()
      .map(([slot]) => slot),
    cardIdsOwned: Object.entries(game.getFlag<Record<string, number>>('cards.collection') ?? {})
      .filter(([, count]) => count > 0)
      .map(([id]) => id),
    fishTypeIdsCaught: (game.getFlag<{ typeId: string }[]>('fishing.catchJournal') ?? []).map(
      ({ typeId }) => typeId,
    ),
    artifactsOwned: game.getRunArtifacts().map(({ id }) => id),
    skillTreeCompletedBranchIds: skills.getCompletedBranchIds(),
    skillTreeBranchCount: skills.getBranchCount(),
    hotSurvivalMs: Number(game.getFlag('achievement.hotSurvivalMs') ?? 0),
    coldSurvivalMs: Number(game.getFlag('achievement.coldSurvivalMs') ?? 0),
    heatResistance: Math.max(
      Number(game.getFlag('equipment.heatResistance') ?? 0),
      Number(game.getFlag(HELL_ESCAPE_HEAT_RESISTANCE_FLAG) ?? 0),
    ),
    coldResistance: Number(game.getFlag('equipment.coldResistance') ?? 0),
    cowbellTilesWalked: Number(game.getFlag('achievement.cowbellTilesWalked') ?? 0),
    wardDamageTypesHeld: Object.values(game.getWardContracts()).filter((count) => count > 0).length,
    trainZonesTraveled: Number(game.getFlag('achievement.trainZonesTraveled') ?? 0),
    highlightFollowers: game.getHighlightReelState().channel.followers,
    maxSpecialStat: Math.max(
      ...game.getSpecialStatsView().stats.map(({ committedValue }) => committedValue),
    ),
  };
  const unlocks = events.flatMap((event) => manager.recordEvent(event, snapshot));
  unlocks.push(...manager.evaluateSnapshot(snapshot));
  for (const unlock of unlocks) game.addScore(unlock.scoreReward);
  game.setFlag(HOSTED_ACHIEVEMENTS_FLAG, manager.getState());
  return unlocks;
}

export function drainAchievementEvents(game: SnakeGame): AchievementEvent[] {
  const events: AchievementEvent[] = [];
  const take = <T extends object>(flag: string): T | undefined => {
    const value = game.getFlag<T>(flag);
    if (value) game.setFlag(flag, undefined);
    return value;
  };
  const enemy = take<{ enemyId: string; method: 'eaten' | 'gun' | 'car' | 'other' }>(
    'achievement.enemyDefeated',
  );
  if (enemy) events.push({ type: 'enemy:defeated', ...enemy });
  const runOver = take<{ enemyId: string }>('achievement.vehicleEnemyRunOver');
  if (runOver) events.push({ type: 'vehicle:enemyRunOver', ...runOver });
  const gun = take<{ targetId: string }>('achievement.gunKill');
  if (gun) events.push({ type: 'combat:gunKill', ...gun });
  const wall = take<{ roomId: string }>('achievement.jadeKatanaWallSmite');
  if (wall) events.push({ type: 'combat:jadeKatanaWallSmite', ...wall });
  const cave = take<{ caveId: string; templateId: string }>('achievement.caveAppleRushCleared');
  if (cave) events.push({ type: 'cave:appleRushCleared', ...cave });
  const companion = take<{ companionKind: string }>('achievement.companionAcquired');
  if (companion) events.push({ type: 'companion:acquired', ...companion });
  return events;
}
