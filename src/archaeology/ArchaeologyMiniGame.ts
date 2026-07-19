/**
 * Archaeology Mini-Game
 *
 * The wise old snake's mini-game:
 * - The wise old snake played mini-games to pass the time between excavations
 * - The wise old snake's mini-game high score was "wise"
 * - The wise old snake's mini-game controller was a fossil
 * - The wise old snake's mini-game was always on "easy" (because the wise old snake is wise)
 * - The wise old snake's mini-game avatar was a tiny snake with a tiny brush
 * - The wise old snake's mini-game had a combo system (wise combos)
 * - The wise old snake's mini-game soundtrack was the sound of digging
 * - The wise old snake's mini-game had unlockable skins (fossil skins)
 * - The wise old snake's mini-game was rated E for Everyone (and wise snakes)
 * - The wise old snake's mini-game was a museum exhibit itself
 */

import type { RandomGenerator } from '../core/rng.js';
import {
  type ExcavationSession,
  type ExcavationState,
  type TimingBarState,
  updateTimingBar,
  excavateFragment,
  calculateAssemblyQuality,
  assembleFossil,
  getProgressDisplay,
  getRemainingFragments,
} from './ExcavationSystem.js';
import {
  type FragmentType,
  type DiscoveredFossil,
  type CompletedFossil,
  FRAGMENT_TYPE_LABELS,
  getFossilSet,
} from './fossilRegistry.js';

/**
 * Mini-game visual state for rendering.
 */
export interface MiniGameVisualState {
  timingBar: TimingBarVisual;
  progressBars: ProgressIndicator[];
  fragmentDisplay: FragmentDisplay;
  particleEffects: ParticleEffect[];
  messages: string[];
  state: ExcavationState;
  qualityMeter: QualityMeter;
}

/**
 * Timing bar visual representation.
 */
export interface TimingBarVisual {
  x: number;
  y: number;
  width: number;
  height: number;
  cursorPosition: number; // 0-1
  targetZones: Array<{ start: number; end: number; color: string }>;
  isActive: boolean;
}

/**
 * Progress indicator for fragment excavation.
 */
export interface ProgressIndicator {
  index: number;
  completed: boolean;
  quality: number;
  fragmentType?: FragmentType;
}

/**
 * Fragment display information.
 */
export interface FragmentDisplay {
  currentFragment: DiscoveredFossil | null;
  nextFragmentType: FragmentType | null;
  fragmentCount: number;
  totalFragments: number;
}

/**
 * Particle effect for visual feedback.
 */
export interface ParticleEffect {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: number;
  size: number;
  type: 'dirt' | 'sparkle' | 'bone' | 'amber' | 'success' | 'fail';
}

/**
 * Quality meter for assembly mini-game.
 */
export interface QualityMeter {
  value: number;
  target: number;
  phases: number; // number of timing phases in assembly
  completedPhases: number;
}

/**
 * Mini-game result notification.
 */
export interface MiniGameNotification {
  message: string;
  type: 'success' | 'warning' | 'info' | 'legendary';
  duration: number;
  timestamp: number;
}

/**
 * Create initial visual state for the mini-game.
 */
export function createVisualState(
  session: ExcavationSession,
  width: number,
  height: number,
): MiniGameVisualState {
  const barWidth = width * 0.6;
  const barX = (width - barWidth) / 2;
  const barY = height * 0.6;

  return {
    timingBar: {
      x: barX,
      y: barY,
      width: barWidth,
      height: 24,
      cursorPosition: session.timingBar.position,
      targetZones: [
        {
          start: session.timingBar.targetZone.start,
          end: session.timingBar.targetZone.end,
          color: '#4ade80',
        },
      ],
      isActive: session.state === 'active',
    },
    progressBars: [],
    fragmentDisplay: {
      currentFragment: null,
      nextFragmentType: null,
      fragmentCount: session.currentFragmentIndex,
      totalFragments: session.totalFragments,
    },
    particleEffects: [],
    messages: [...session.messages],
    state: session.state,
    qualityMeter: {
      value: 0,
      target: 0.7,
      phases: Math.max(3, Math.floor(session.totalFragments / 2)),
      completedPhases: 0,
    },
  };
}

/**
 * Update visual state from session state.
 */
export function updateVisualState(
  visual: MiniGameVisualState,
  session: ExcavationSession,
  deltaTime: number,
): void {
  visual.state = session.state;
  visual.messages = [...session.messages];

  // Update timing bar
  visual.timingBar.cursorPosition = session.timingBar.position;
  visual.timingBar.isActive = session.state === 'active' || session.state === 'assembling';
  visual.timingBar.targetZones = [
    {
      start: session.timingBar.targetZone.start,
      end: session.timingBar.targetZone.end,
      color: '#4ade80',
    },
  ];

  // Update fragment display
  visual.fragmentDisplay.fragmentCount = session.currentFragmentIndex;
  visual.fragmentDisplay.totalFragments = session.totalFragments;

  // Update progress bars
  const newProgressBars: ProgressIndicator[] = [];
  for (let i = 0; i < session.totalFragments; i++) {
    const existing = visual.progressBars.find((p) => p.index === i);
    if (existing) {
      newProgressBars.push(existing);
    } else {
      newProgressBars.push({
        index: i,
        completed: false,
        quality: 0,
      });
    }
  }
  visual.progressBars = newProgressBars;

  // Update quality meter for assembly
  if (session.state === 'assembling') {
    visual.qualityMeter.value = session.assemblyQuality;
    visual.qualityMeter.completedPhases = Math.floor(session.assemblyProgress * visual.qualityMeter.phases);
  }

  // Update particles
  updateParticles(visual, deltaTime);
}

/**
 * Handle player input for the timing bar.
 */
export function handleTimingInput(
  session: ExcavationSession,
  visual: MiniGameVisualState,
  inputX: number, // -1 (left) to 1 (right)
): void {
  if (session.state === 'active') {
    updateTimingBar(session, 16, inputX); // Assume 60fps
    visual.timingBar.cursorPosition = session.timingBar.position;
  }
}

/**
 * Process a timing bar hit (e.g., spacebar press).
 */
export function processTimingHit(
  session: ExcavationSession,
  visual: MiniGameVisualState,
  rng: RandomGenerator,
): { fragment: DiscoveredFossil | null; particles: ParticleEffect[] } {
  const particles: ParticleEffect[] = [];

  if (session.state !== 'active') {
    return { fragment: null, particles };
  }

  const fragment = excavateFragment(session, rng);

  if (fragment) {
    // Create particle effects based on quality
    const particleCount = Math.floor(fragment.value / 5);
    for (let i = 0; i < particleCount; i++) {
      particles.push(createParticle(visual, fragment));
    }

    // Update progress bar
    const progressBar = visual.progressBars.find((p) => p.index === session.currentFragmentIndex - 1);
    if (progressBar) {
      progressBar.completed = true;
      progressBar.quality = fragment.condition === 'pristine' ? 1 : fragment.condition === 'good' ? 0.7 : 0.4;
      progressBar.fragmentType = fragment.fragmentType;
    }

    visual.fragmentDisplay.currentFragment = fragment;
  }

  return { fragment, particles };
}

/**
 * Create a particle effect based on fragment type and quality.
 */
function createParticle(
  visual: MiniGameVisualState,
  fragment: DiscoveredFossil,
): ParticleEffect {
  const typeMap: Record<FragmentType, ParticleEffect['type']> = {
    'bone-fragment': 'bone',
    tooth: 'bone',
    shell: 'amber',
    'amber-insect': 'amber',
    'egg-shell': 'bone',
    'ancient-tool': 'success',
    'mythical-remains': 'sparkle',
    scale: 'sparkle',
    claw: 'bone',
    vertebra: 'bone',
    'skull-piece': 'bone',
    rib: 'bone',
    'tail-spine': 'bone',
    'wing-bone': 'bone',
  };

  const colorMap: Record<ParticleEffect['type'], number> = {
    dirt: 0x8B4513,
    sparkle: 0xFFD700,
    bone: 0xF5F5DC,
    amber: 0xFFBF00,
    success: 0x4ADE80,
    fail: 0xFF4444,
  };

  return {
    x: visual.timingBar.x + visual.timingBar.width * Math.random(),
    y: visual.timingBar.y,
    vx: (Math.random() - 0.5) * 4,
    vy: -Math.random() * 3 - 1,
    life: 1,
    maxLife: 1,
    color: colorMap[typeMap[fragment.fragmentType] ?? 'dirt'],
    size: fragment.condition === 'pristine' ? 6 : fragment.condition === 'good' ? 4 : 3,
    type: typeMap[fragment.fragmentType] ?? 'dirt',
  };
}

/**
 * Update particle effects.
 */
function updateParticles(visual: MiniGameVisualState, deltaTime: number): void {
  const dt = deltaTime / 1000;
  visual.particleEffects = visual.particleEffects
    .map((p) => ({
      ...p,
      x: p.x + p.vx * deltaTime * 0.06,
      y: p.y + p.vy * deltaTime * 0.06,
      vy: p.vy + 0.1 * deltaTime * 0.06, // gravity
      life: p.life - dt,
    }))
    .filter((p) => p.life > 0);
}

/**
 * Add particle effects to the visual state.
 */
export function addParticles(visual: MiniGameVisualState, particles: ParticleEffect[]): void {
  visual.particleEffects.push(...particles);
}

/**
 * Check if assembly can be completed and perform it.
 */
export function tryCompleteAssembly(
  session: ExcavationSession,
  visual: MiniGameVisualState,
  rng: RandomGenerator,
): { completed: CompletedFossil | null; notification: MiniGameNotification | null } {
  if (session.state !== 'assembling' || !session.currentFossilSet) {
    return { completed: null, notification: null };
  }

  // Assembly quality is based on the timing mini-game performance
  const assemblyQuality = visual.qualityMeter.value;

  const completed = assembleFossil(
    session.discoveredFragments,
    session.currentFossilSet.id,
    assemblyQuality,
  );

  if (completed) {
    session.state = 'complete';
    session.assemblyQuality = assemblyQuality;

    const notification: MiniGameNotification = {
      message: `Fossil assembled: ${session.currentFossilSet.name}!`,
      type: assemblyQuality > 0.8 ? 'legendary' : assemblyQuality > 0.5 ? 'success' : 'info',
      duration: 3000,
      timestamp: Date.now(),
    };

    return { completed, notification };
  }

  return { completed: null, notification: null };
}

/**
 * Create assembly phase quality hit.
 */
export function processAssemblyPhase(
  session: ExcavationSession,
  visual: MiniGameVisualState,
): number {
  if (visual.qualityMeter.completedPhases >= visual.qualityMeter.phases) {
    return visual.qualityMeter.value;
  }

  // Quality based on timing bar position (centered = better)
  const cursorPos = visual.timingBar.cursorPosition;
  const centerDist = Math.abs(cursorPos - 0.5) * 2; // 0 at center, 1 at edges
  const phaseQuality = 1 - centerDist;

  visual.qualityMeter.value =
    (visual.qualityMeter.value * visual.qualityMeter.completedPhases + phaseQuality) /
    (visual.qualityMeter.completedPhases + 1);
  visual.qualityMeter.completedPhases += 1;

  return phaseQuality;
}

/**
 * Get assembly progress percentage.
 */
export function getAssemblyProgress(visual: MiniGameVisualState): string {
  const pct = Math.floor(
    (visual.qualityMeter.completedPhases / Math.max(1, visual.qualityMeter.phases)) * 100,
  );
  return `${pct}%`;
}

/**
 * Create a notification for the mini-game UI.
 */
export function createNotification(
  message: string,
  type: MiniGameNotification['type'],
): MiniGameNotification {
  return {
    message,
    type,
    duration: 2500,
    timestamp: Date.now(),
  };
}

/**
 * Check if a notification has expired.
 */
export function isNotificationExpired(notification: MiniGameNotification, now: number = Date.now()): boolean {
  return now - notification.timestamp > notification.duration;
}

/**
 * Get fragment type display label.
 */
export function getFragmentLabel(fragmentType: FragmentType): string {
  return FRAGMENT_TYPE_LABELS[fragmentType] || fragmentType;
}

/**
 * Get fragment color for rendering.
 */
export function getFragmentColor(fragmentType: FragmentType): number {
  const colorMap: Record<FragmentType, number> = {
    'bone-fragment': 0xF5F5DC,
    tooth: 0xE8E8D0,
    shell: 0xFFE4C4,
    'amber-insect': 0xFFBF00,
    'egg-shell': 0xF0E6D2,
    'ancient-tool': 0x8B7355,
    'mythical-remains': 0xFF69B4,
    scale: 0x40E0D0,
    claw: 0xD2B48C,
    vertebra: 0xE8E8D0,
    'skull-piece': 0xE0DCC8,
    rib: 0xE8E8D0,
    'tail-spine': 0xD4C5A9,
    'wing-bone': 0xF0E6D2,
  };
  return colorMap[fragmentType] ?? 0xCCCCCC;
}

/**
 * Get condition color for rendering.
 */
export function getConditionColor(condition: 'pristine' | 'good' | 'damaged'): number {
  switch (condition) {
    case 'pristine':
      return 0x4ADE80;
    case 'good':
      return 0xFFD700;
    case 'damaged':
      return 0xFF6B6B;
  }
}

/**
 * Get target zone color based on quality threshold.
 */
export function getTargetZoneColor(quality: number): string {
  if (quality >= 0.8) return '#4ADE80'; // pristine - green
  if (quality >= 0.5) return '#FFD700'; // good - gold
  return '#FF6B6B'; // damaged - red
}
