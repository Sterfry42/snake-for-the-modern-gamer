/**
 * Excavation System
 *
 * The wise old snake's excavation system:
 * - The wise old snake once excavated an entire mountain
 * - The wise old snake's shovel was a toothpick
 * - The wise old snake's excavation speed was "wise pace"
 * - The wise old snake once found a fossil of itself
 * - The wise old snake's dig site was the size of a shoebox
 * - The wise old snake's excavation permit was "wise"
 * - The wise old snake's dig site had a gift shop
 * - The wise old snake's excavation report was 9999 pages
 * - The wise old snake's fossil was the oldest in the museum
 * - The wise old snake's excavation tools were made of cheese
 */

import { clamp } from '../core/math.js';
import type { RandomGenerator } from '../core/rng.js';
import {
  type FragmentType,
  type DigSiteParameters,
  rollFragmentType,
  determineFragmentCondition,
  calculateFragmentValue,
  getFossilSet,
  getFossilSetFragments,
  type DiscoveredFossil,
  type CompletedFossil,
  FOSSIL_SETS,
  type FossilSetDefinition,
  getDigSiteParams,
} from './fossilRegistry.js';

/**
 * Excavation mini-game states.
 */
export type ExcavationState = 'idle' | 'active' | 'assembling' | 'complete' | 'failed';

/**
 * Progress bar state for the timing-based mini-game.
 */
export interface TimingBarState {
  position: number; // 0-1, where the cursor is
  speed: number; // direction and speed of cursor movement
  direction: 'left' | 'right';
  targetZone: { start: number; end: number };
  isTargetZone: boolean;
}

/**
 * Mini-game result.
 */
export interface ExcavationResult {
  quality: number; // 0-1, how well the fossil was excavated
  fragments: DiscoveredFossil[];
  isComplete: boolean;
  completedFossil?: CompletedFossil;
}

/**
 * Excavation session for a single dig site.
 */
export interface ExcavationSession {
  state: ExcavationState;
  digSiteId: string;
  parameters: DigSiteParameters;
  progress: number; // 0-1, excavation progress
  timingBar: TimingBarState;
  currentFragmentIndex: number;
  totalFragments: number;
  discoveredFragments: DiscoveredFossil[];
  currentFossilSet: FossilSetDefinition | null;
  assemblyProgress: number; // 0-1 for assembly mini-game
  assemblyQuality: number;
  messages: string[];
  failed: boolean;
  failReason?: string;
}

/**
 * Create a new excavation session for a dig site.
 */
export function createExcavationSession(
  digSiteId: string,
  depth: number,
  rng: RandomGenerator,
): ExcavationSession {
  const params = getDigSiteParams(depth);
  const totalFragments = params.size;

  // Select a fossil set based on rarity and depth
  const availableSets = FOSSIL_SETS.filter((set) => {
    if (set.rarity === 'legendary' && depth < 30) return false;
    if (set.rarity === 'rare' && depth < 15) return false;
    return true;
  });

  const fossilSet =
    availableSets[Math.floor(rng() * availableSets.length)] ?? FOSSIL_SETS[0]!;

  const session: ExcavationSession = {
    state: 'idle',
    digSiteId,
    parameters: params,
    progress: 0,
    timingBar: {
      position: 0.5,
      speed: 0.02,
      direction: 'right',
      targetZone: { start: 0.4, end: 0.6 },
      isTargetZone: true,
    },
    currentFragmentIndex: 0,
    totalFragments,
    discoveredFragments: [],
    currentFossilSet: fossilSet,
    assemblyProgress: 0,
    assemblyQuality: 0,
    messages: [`Excavating: ${fossilSet.name}`],
    failed: false,
  };

  return session;
}

/**
 * Update the timing bar for the mini-game.
 */
export function updateTimingBar(
  session: ExcavationSession,
  _deltaMs: number,
  playerInput: number, // -1 (left) to 1 (right)
): void {
  const bar = session.timingBar;
  const speed = bar.speed * (1 + session.parameters.depth * 0.01);

  // Player input affects direction and speed
  if (playerInput > 0) {
    bar.direction = 'right';
    bar.position += speed * (1 + playerInput);
  } else if (playerInput < 0) {
    bar.direction = 'left';
    bar.position -= speed * (1 - playerInput);
  }

  // Bounce off edges
  if (bar.position >= 1) {
    bar.position = 1;
    bar.direction = 'left';
  } else if (bar.position <= 0) {
    bar.position = 0;
    bar.direction = 'right';
  }

  // Check if in target zone
  bar.isTargetZone =
    bar.position >= bar.targetZone.start && bar.position <= bar.targetZone.end;

  // Randomly shift target zone to increase difficulty
  if (Math.random() < 0.005) {
    const zoneWidth = 0.2 - session.parameters.depth * 0.002;
    const clampedWidth = clamp(zoneWidth, 0.08, 0.2);
    const newStart = Math.random() * (1 - clampedWidth);
    bar.targetZone = { start: newStart, end: newStart + clampedWidth };
  }
}

/**
 * Process a timing bar hit. Returns the quality of this fragment excavation.
 */
export function processTimingHit(session: ExcavationSession): number {
  const bar = session.timingBar;

  // Quality based on how centered in the target zone the hit was
  const zoneCenter = (bar.targetZone.start + bar.targetZone.end) / 2;
  const zoneWidth = bar.targetZone.end - bar.targetZone.start;
  const distanceFromCenter = Math.abs(bar.position - zoneCenter);
  const normalizedDistance = distanceFromCenter / (zoneWidth / 2);

  // Base quality with some randomness
  const baseQuality = 1 - normalizedDistance * 0.5;
  const quality = clamp(baseQuality + (Math.random() * 0.2 - 0.1), 0.1, 1);

  return quality;
}

/**
 * Excavate the next fragment from the session.
 */
export function excavateFragment(session: ExcavationSession, rng: RandomGenerator): DiscoveredFossil | null {
  if (session.state !== 'active') return null;
  if (session.currentFragmentIndex >= session.totalFragments) {
    session.state = 'complete';
    return null;
  }

  // Determine quality from timing bar
  const quality = processTimingHit(session);
  const condition = determineFragmentCondition(quality);

  // Select which fossil set this fragment belongs to
  const fossilSet = session.currentFossilSet ?? FOSSIL_SETS[0]!;
  const fragmentType = rollFragmentType(rng, session.parameters.rarity);

  const discovered: DiscoveredFossil = {
    fossilSetId: fossilSet.id,
    fragmentType,
    condition,
    value: calculateFragmentValue(condition, session.parameters.rarity),
    discoveredAt: Date.now(),
  };

  session.discoveredFragments.push(discovered);
  session.currentFragmentIndex += 1;

  // Update progress
  session.progress = session.currentFragmentIndex / session.totalFragments;

  // Reset timing bar for next fragment
  session.timingBar.position = 0.5;
  session.timingBar.targetZone = {
    start: 0.3 + Math.random() * 0.4,
    end: 0.3 + Math.random() * 0.4 + 0.15,
  };

  // Check if we have all fragments for the current set
  if (session.discoveredFragments.length >= session.totalFragments) {
    session.state = 'assembling';
    session.messages.push('Excavation complete! Ready to assemble.');
  }

  return discovered;
}

/**
 * Check if collected fragments can complete a fossil set.
 */
export function checkFossilAssembly(
  discoveredFragments: DiscoveredFossil[],
  fossilSetId: string,
): { canAssemble: boolean; fragmentCounts: Map<FragmentType, number>; needed: Map<FragmentType, number> } {
  const fossilSet = getFossilSet(fossilSetId);
  if (!fossilSet) {
    return { canAssemble: false, fragmentCounts: new Map(), needed: new Map() };
  }

  // Count discovered fragments
  const fragmentCounts = new Map<FragmentType, number>();
  for (const frag of discoveredFragments) {
    if (frag.fossilSetId === fossilSetId) {
      fragmentCounts.set(frag.fragmentType, (fragmentCounts.get(frag.fragmentType) ?? 0) + 1);
    }
  }

  // Get required fragments
  const needed = new Map<FragmentType, number>();
  for (const combo of fossilSet.fragments) {
    needed.set(combo.fragmentType, combo.count);
  }

  // Check if we have all required fragments
  let canAssemble = true;
  for (const [type, count] of needed) {
    if ((fragmentCounts.get(type) ?? 0) < count) {
      canAssemble = false;
      break;
    }
  }

  return { canAssemble, fragmentCounts, needed };
}

/**
 * Assemble a fossil set from collected fragments.
 */
export function assembleFossil(
  discoveredFragments: DiscoveredFossil[],
  fossilSetId: string,
  _assemblyQuality: number,
): CompletedFossil | null {
  const { canAssemble } = checkFossilAssembly(
    discoveredFragments,
    fossilSetId,
  );

  if (!canAssemble) return null;

  // Use the best condition fragments for assembly
  const assembledFragments: Array<{ fragmentType: FragmentType; condition: 'pristine' | 'good' | 'damaged' }> = [];
  const usedTypes = new Set<FragmentType>();

  for (const combo of getFossilSetFragments(fossilSetId)!) {
    const matching = discoveredFragments.filter(
      (f) => f.fossilSetId === fossilSetId && f.fragmentType === combo.fragmentType && !usedTypes.has(f.fragmentType),
    );

    // Sort by condition (pristine first)
    const conditionOrder = { pristine: 0, good: 1, damaged: 2 };
    matching.sort((a, b) => conditionOrder[a.condition] - conditionOrder[b.condition]);

    for (let i = 0; i < combo.count && i < matching.length; i++) {
      assembledFragments.push({
        fragmentType: combo.fragmentType,
        condition: matching[i]!.condition,
      });
      usedTypes.add(combo.fragmentType);
    }
  }

  // Apply assembly quality bonus

  return {
    fossilSetId,
    fragments: assembledFragments,
    completedAt: Date.now(),
  };
}

/**
 * Calculate assembly quality based on timing mini-game performance.
 */
export function calculateAssemblyQuality(timingResults: number[]): number {
  if (timingResults.length === 0) return 0;
  return timingResults.reduce((sum, q) => sum + q, 0) / timingResults.length;
}

/**
 * Get excavation progress percentage for display.
 */
export function getProgressDisplay(session: ExcavationSession): string {
  const pct = Math.floor(session.progress * 100);
  return `${pct}%`;
}

/**
 * Get remaining fragments count.
 */
export function getRemainingFragments(session: ExcavationSession): number {
  return Math.max(0, session.totalFragments - session.currentFragmentIndex);
}

/**
 * Reset a session for reuse.
 */
export function resetExcavationSession(session: ExcavationSession): void {
  session.state = 'idle';
  session.progress = 0;
  session.currentFragmentIndex = 0;
  session.discoveredFragments = [];
  session.assemblyProgress = 0;
  session.assemblyQuality = 0;
  session.messages = [];
  session.failed = false;
  session.failReason = undefined;
  session.timingBar.position = 0.5;
  session.timingBar.targetZone = { start: 0.4, end: 0.6 };
}

/**
 * Simulate excavation progress over time (for idle progression).
 */
export function simulateProgress(
  session: ExcavationSession,
  _deltaMs: number,
  _rng: RandomGenerator,
): boolean {
  if (session.state !== 'active') return false;

  const speed = 0.001 + session.parameters.depth * 0.0001;
  session.progress += _deltaMs * speed;

  if (session.progress >= 1) {
    session.progress = 1;
    session.state = 'complete';
    session.messages.push('Excavation complete! All fragments recovered.');
    return true;
  }

  return false;
}
