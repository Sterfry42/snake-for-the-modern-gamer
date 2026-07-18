/**
 * Museum Overlay
 *
 * The wise old snake's museum overlay:
 * - The wise old snake's museum overlay was always on
 * - The wise old snake's museum overlay had 999 tabs
 * - The wise old snake's museum overlay was the most informative overlay
 * - The wise old snake's museum overlay had a mini-map of the museum
 * - The wise old snake's museum overlay was rated 5 stars
 * - The wise old snake's museum overlay had a gift shop (virtual)
 * - The wise old snake's museum overlay was interactive (the wise old snake touched everything)
 * - The wise old snake's museum overlay had a cafe (serving wise coffee)
 * - The wise old snake's museum overlay was bigger on the inside
 * - The wise old snake's museum overlay was a UNESCO world heritage site (self-proclaimed)
 */

// @ts-ignore - Phaser types are global
import type { Phaser } from 'phaser';
import type { MuseumState } from '../archaeology/MuseumManager.js';
import {
  getMuseumStats,
  getExhibitData,
  calculateMuseumBonuses,
  getAvailableUpgrades,
  getLockedUpgrades,
  canUnlockUpgrade,
} from '../archaeology/MuseumManager.js';
import { getFossilSet } from '../archaeology/fossilRegistry.js';

/**
 * Museum overlay tab types.
 */
export type MuseumTab = 'exhibits' | 'research' | 'statistics' | 'bonuses';

/**
 * Museum overlay configuration.
 */
export interface MuseumOverlayConfig {
  width: number;
  height: number;
  backgroundColor: number;
  textColor: number;
  accentColor: number;
  font: string;
}

/**
 * Default museum overlay configuration.
 */
export const DEFAULT_MUSEUM_CONFIG: MuseumOverlayConfig = {
  width: 640,
  height: 480,
  backgroundColor: 0x1a1a2e,
  textColor: 0xffffff,
  accentColor: 0xffd700,
  font: '24px monospace',
};

/**
 * Museum overlay state.
 */
export interface MuseumOverlayState {
  activeTab: MuseumTab;
  museumState: MuseumState;
  hoveredExhibit: string | null;
  selectedUpgrade: string | null;
  notifications: Array<{ message: string; type: string; timestamp: number }>;
  isVisible: boolean;
}

/**
 * Create initial museum overlay state.
 */
export function createMuseumOverlayState(museumState: MuseumState): MuseumOverlayState {
  return {
    activeTab: 'exhibits',
    museumState,
    hoveredExhibit: null,
    selectedUpgrade: null,
    notifications: [],
    isVisible: false,
  };
}

/**
 * Toggle museum overlay visibility.
 */
export function toggleMuseumOverlay(state: MuseumOverlayState): void {
  state.isVisible = !state.isVisible;
}

/**
 * Switch museum overlay tab.
 */
export function switchMuseumTab(state: MuseumOverlayState, tab: MuseumTab): void {
  state.activeTab = tab;
  state.selectedUpgrade = null;
}

/**
 * Try to unlock a research upgrade.
 */
export function tryUnlockUpgrade(
  state: MuseumOverlayState,
  upgradeId: string,
): { success: boolean; message: string } {
  if (!canUnlockUpgrade(state.museumState, upgradeId)) {
    return { success: false, message: 'Requirements not met.' };
  }

  const upgrade = require('../archaeology/MuseumManager.js').unlockResearchUpgrade(
    state.museumState,
    upgradeId,
  );

  if (upgrade) {
    const fossilSet = getFossilSet(upgradeId);
    state.notifications.push({
      message: `Research unlocked: ${upgrade.name}!`,
      type: 'success',
      timestamp: Date.now(),
    });
    return { success: true, message: `Unlocked: ${upgrade.name}` };
  }

  return { success: false, message: 'Failed to unlock upgrade.' };
}

/**
 * Get exhibit hover information.
 */
export function setExhibitHover(state: MuseumOverlayState, fossilSetId: string | null): void {
  state.hoveredExhibit = fossilSetId;
}

/**
 * Calculate tooltip text for an exhibit.
 */
export function getExhibitTooltip(fossilSetId: string): string {
  const fossilSet = getFossilSet(fossilSetId);
  if (!fossilSet) return '';

  const bonuses = fossilSet.setBonuses.map((b) => b.description).join('\n');
  return `${fossilSet.name}\n${fossilSet.description}\n\nBonuses:\n${bonuses}`;
}

/**
 * Get upgrade requirement text.
 */
export function getUpgradeRequirements(upgradeId: string): string {
  const { getLockedUpgrades: getLocked } = require('../archaeology/MuseumManager.js');
  // This would need proper module access in actual implementation
  return 'Requirements not available';
}

/**
 * Render museum overlay UI (Phaser scene method).
 */
export function renderMuseumOverlay(
  scene: Phaser.Scene,
  state: MuseumOverlayState,
  config: MuseumOverlayConfig = DEFAULT_MUSEUM_CONFIG,
): void {
  if (!state.isVisible) return;

  const { width, height } = config;
  const centerX = scene.cameras.main.width / 2;
  const centerY = scene.cameras.main.height / 2;

  // Background panel
  scene.add
    .rectangle(centerX, centerY, width, height, config.backgroundColor, 0.95)
    .setStrokeStyle(4, config.accentColor)
    .setOrigin(0.5);

  // Title
  scene.add
    .text(centerX, centerY - height / 2 + 40, '🏛️ The Wise Snake Museum', {
      fontFamily: 'monospace',
      fontSize: '28px',
      color: '#ffffff',
      fontStyle: 'bold',
    })
    .setOrigin(0.5);

  // Tab buttons
  const tabs: MuseumTab[] = ['exhibits', 'research', 'statistics', 'bonuses'];
  const tabWidth = 120;
  const tabHeight = 32;
  const tabStartX = centerX - (tabs.length * (tabWidth + 10)) / 2;

  tabs.forEach((tab, index) => {
    const x = tabStartX + index * (tabWidth + 10) + tabWidth / 2;
    const y = centerY - height / 2 + 80;
    const isActive = state.activeTab === tab;

    scene.add
      .rectangle(x, y, tabWidth, tabHeight, isActive ? config.accentColor : 0x333355, 0.8)
      .setStrokeStyle(2, isActive ? config.textColor : 0x666688)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    scene.add.text(x, y, tab.charAt(0).toUpperCase() + tab.slice(1), {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: isActive ? '#000000' : '#ffffff',
      fontStyle: 'bold',
    });
  });

  // Tab content
  renderTabContent(scene, state, config, centerY);
}

/**
 * Render content for the active tab.
 */
function renderTabContent(
  scene: Phaser.Scene,
  state: MuseumOverlayState,
  config: MuseumOverlayConfig,
  centerY: number,
): void {
  const stats = getMuseumStats(state.museumState);
  const contentY = centerY - 60;

  switch (state.activeTab) {
    case 'exhibits':
      renderExhibitsTab(scene, state, config, contentY);
      break;
    case 'research':
      renderResearchTab(scene, state, config, contentY);
      break;
    case 'statistics':
      renderStatisticsTab(scene, stats, contentY);
      break;
    case 'bonuses':
      renderBonusesTab(scene, state, contentY);
      break;
  }
}

/**
 * Render exhibits tab content.
 */
function renderExhibitsTab(
  scene: Phaser.Scene,
  state: MuseumOverlayState,
  config: MuseumOverlayConfig,
  startY: number,
): void {
  const exhibits = getExhibitData(state.museumState);

  scene.add.text(80, startY, `Exhibits: ${exhibits.length} / ${state.museumState.completedFossils.length} displayed`, {
    fontFamily: 'monospace',
    fontSize: '18px',
    color: '#ffffff',
  });

  exhibits.forEach((exhibit, index) => {
    const x = 100 + (index % 4) * 140;
    const y = startY + 40 + Math.floor(index / 4) * 80;

    const isHovered = state.hoveredExhibit === exhibit.fossilSet.id;
    const boxColor = isHovered ? config.accentColor : 0x2a2a4a;

    scene.add.rectangle(x, y, 120, 60, boxColor, 0.8)
      .setStrokeStyle(2, config.accentColor)
      .setOrigin(0)
      .setInteractive({ useHandCursor: true });

    scene.add.text(x + 10, y + 10, `${exhibit.fossilSet.icon} ${exhibit.fossilSet.name}`, {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#ffffff',
    });
  });
}

/**
 * Render research tab content.
 */
function renderResearchTab(
  scene: Phaser.Scene,
  state: MuseumOverlayState,
  config: MuseumOverlayConfig,
  startY: number,
): void {
  const available = getAvailableUpgrades(state.museumState);

  scene.add.text(80, startY, `Research Level: ${state.museumState.researchLevel}`, {
    fontFamily: 'monospace',
    fontSize: '18px',
    color: '#ffffff',
  });

  scene.add.text(80, startY + 30, `Available Upgrades:`, {
    fontFamily: 'monospace',
    fontSize: '16px',
    color: '#4ade80',
  });

  available.forEach((upgrade, index) => {
    const x = 100;
    const y = startY + 60 + index * 50;

    scene.add.text(x, y, `${upgrade.icon} ${upgrade.name}`, {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#ffffff',
    });

    scene.add.text(x + 200, y, `[Unlock]`, {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: config.accentColor,
    });
  });
}

/**
 * Render statistics tab content.
 */
function renderStatisticsTab(
  scene: Phaser.Scene,
  stats: ReturnType<typeof getMuseumStats>,
  startY: number,
): void {
  const lines = [
    `Total Fossils: ${stats.totalFossils}`,
    `Total Exhibits: ${stats.totalExhibits}`,
    `Research Level: ${stats.researchLevel}`,
    `Completion: ${stats.completionPercentage}%`,
    ``,
    `Common: ${stats.commonCount}`,
    `Uncommon: ${stats.uncommonCount}`,
    `Rare: ${stats.rareCount}`,
    `Legendary: ${stats.legendaryCount}`,
  ];

  lines.forEach((line, index) => {
    scene.add.text(100, startY + index * 28, line, {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#ffffff',
    });
  });
}

/**
 * Render bonuses tab content.
 */
function renderBonusesTab(
  scene: Phaser.Scene,
  state: MuseumOverlayState,
  startY: number,
): void {
  const bonuses = calculateMuseumBonuses(state.museumState);

  const lines = [
    `Score Multiplier: +${(bonuses.scoreMultiplier * 100).toFixed(0)}%`,
    `Growth Bonus: +${(bonuses.growthBonus * 100).toFixed(0)}%`,
    `Speed Bonus: +${(bonuses.speedBonus * 100).toFixed(0)}%`,
    `Luck Bonus: +${(bonuses.luckBonus * 100).toFixed(0)}%`,
    `Hunger Slow: -${(bonuses.hungerSlow * 100).toFixed(0)}%`,
    `Defense Bonus: +${bonuses.defenseBonus}`,
    `Attack Bonus: +${bonuses.attackBonus}`,
    `Cold Resistance: +${bonuses.coldResistance}`,
    bonuses.specialAbilities.length > 0
      ? `Special Abilities: ${bonuses.specialAbilities.join(', ')}`
      : 'No special abilities unlocked yet',
  ];

  lines.forEach((line, index) => {
    scene.add.text(100, startY + index * 28, line, {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: bonuses.specialAbilities.length > 0 && index === lines.length - 1
        ? '#ff69b4'
        : '#ffffff',
    });
  });
}

/**
 * Check if museum is complete.
 */
export function isMuseumComplete(state: MuseumOverlayState): boolean {
  return state.museumState.completedFossils.length === require('../archaeology/fossilRegistry.js').FOSSIL_SETS.length;
}

/**
 * Get museum completion percentage.
 */
export function getCompletionPercentage(state: MuseumOverlayState): number {
  const total = require('../archaeology/fossilRegistry.js').FOSSIL_SETS.length;
  return Math.floor((state.museumState.completedFossils.length / total) * 100);
}
