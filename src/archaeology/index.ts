/**
 * Archaeology Module
 */

// Fossil Registry
export {
  type FossilRarity,
  type FragmentType,
  type FossilSetDefinition,
  type FragmentCombination,
  type FossilSetBonus,
  type DiscoveredFossil,
  type CompletedFossil,
  type MuseumExhibit,
  type ResearchUpgrade,
  type ResearchEffect,
  type LegendaryArtifact,
  type DigSiteParameters,
  FRAGMENT_TYPE_LABELS,
  FRAGMENT_RARITY_WEIGHTS,
  FOSSIL_SETS,
  COMPLETED_FOSSIL_SET_IDS,
  LEGENDARY_ARTIFACTS,
  RESEARCH_UPGRADES,
  DIG_SITE_TIERS,
  getFossilSet,
  getFossilSetFragments,
  getFossilSetsByRarity,
  rollFragmentType,
  determineFragmentCondition,
  calculateFragmentValue,
  getDigSiteParams,
} from './fossilRegistry.js';

// Excavation System
export {
  type ExcavationState,
  type TimingBarState,
  type ExcavationResult,
  type ExcavationSession,
  createExcavationSession,
  updateTimingBar,
  processTimingHit,
  excavateFragment,
  checkFossilAssembly,
  assembleFossil,
  calculateAssemblyQuality,
  getProgressDisplay,
  getRemainingFragments,
  resetExcavationSession,
  simulateProgress,
} from './ExcavationSystem.js';

// Museum Manager
export {
  type MuseumState,
  type MuseumBonuses,
  createMuseumState,
  addCompletedFossil,
  canUnlockUpgrade,
  unlockResearchUpgrade,
  getAvailableUpgrades,
  getLockedUpgrades,
  calculateMuseumBonuses,
  getMuseumStats,
  getExhibitData,
  isMuseumComplete,
  getCompletedByRarity,
  serializeMuseumState,
  deserializeMuseumState,
} from './MuseumManager.js';

// Mini-Game
export {
  type MiniGameVisualState,
  type TimingBarVisual,
  type ProgressIndicator,
  type FragmentDisplay,
  type ParticleEffect,
  type QualityMeter,
  type MiniGameNotification,
  createVisualState,
  updateVisualState,
  handleTimingInput,
  processTimingHit as processMiniGameTimingHit,
  tryCompleteAssembly,
  processAssemblyPhase,
  getAssemblyProgress,
  createNotification,
  isNotificationExpired,
  getFragmentLabel,
  getFragmentColor,
  getConditionColor,
  getTargetZoneColor,
} from './ArchaeologyMiniGame.js';
