// Common utilities shared across all pause menu tabs.
export {
  type PauseMenuContext,
  type CardListItem,
  type CardListOptions,
  type CategorySection,
  renderCardList,
  renderCategorySection,
  setDetailPanel,
  renderTopRightBadge,
  commitScrollHeight,
  makeAnnounceZone,
} from './pauseMenuCommon.js';

// Growth tab: skills, special, spells, maneuvers.
export { renderSpells, renderManeuvers } from './growthTab.js';

// Gear tab: equipment, items, cards, destiny, artifacts.
export {
  renderEquipment,
  renderItems,
  renderCards,
  renderDestiny,
  renderArtifacts,
} from './gearTab.js';

// World tab: dating, quests, people, companions.
export { renderDating, renderQuests, renderPeople, renderCompanions } from './worldTab.js';

// System tab: controls, cheats, info.
export { renderControls, renderCheats, renderInfo } from './systemTab.js';
