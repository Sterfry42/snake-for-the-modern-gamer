/**
 * Camera System
 */
import type { AnimalType } from '../types.js';
import type { PhotoEntry, PhotoRarity, CameraState } from '../ecosystem/types.js';

// ── Animal Photo Rarity Tables ────────────────────────────────────

const PHOTO_RARITY_TABLES: Record<
  AnimalType,
  Array<{ rarity: PhotoRarity; weight: number; score: number }>
> = {
  rabbit: [
    { rarity: 'common', weight: 50, score: 10 },
    { rarity: 'uncommon', weight: 30, score: 25 },
    { rarity: 'rare', weight: 15, score: 50 },
    { rarity: 'epic', weight: 4, score: 100 },
    { rarity: 'legendary', weight: 1, score: 250 },
  ],
  deer: [
    { rarity: 'common', weight: 40, score: 15 },
    { rarity: 'uncommon', weight: 35, score: 30 },
    { rarity: 'rare', weight: 18, score: 60 },
    { rarity: 'epic', weight: 5, score: 120 },
    { rarity: 'legendary', weight: 2, score: 300 },
  ],
  fox: [
    { rarity: 'common', weight: 35, score: 20 },
    { rarity: 'uncommon', weight: 35, score: 40 },
    { rarity: 'rare', weight: 20, score: 70 },
    { rarity: 'epic', weight: 8, score: 140 },
    { rarity: 'legendary', weight: 2, score: 350 },
  ],
  wolf: [
    { rarity: 'common', weight: 30, score: 25 },
    { rarity: 'uncommon', weight: 35, score: 50 },
    { rarity: 'rare', weight: 22, score: 80 },
    { rarity: 'epic', weight: 10, score: 160 },
    { rarity: 'legendary', weight: 3, score: 400 },
  ],
  bear: [
    { rarity: 'common', weight: 25, score: 30 },
    { rarity: 'uncommon', weight: 30, score: 55 },
    { rarity: 'rare', weight: 25, score: 90 },
    { rarity: 'epic', weight: 14, score: 180 },
    { rarity: 'legendary', weight: 6, score: 450 },
  ],
  snake: [
    { rarity: 'common', weight: 20, score: 35 },
    { rarity: 'uncommon', weight: 30, score: 60 },
    { rarity: 'rare', weight: 28, score: 100 },
    { rarity: 'epic', weight: 16, score: 200 },
    { rarity: 'legendary', weight: 6, score: 500 },
  ],
  eagle: [
    { rarity: 'common', weight: 30, score: 25 },
    { rarity: 'uncommon', weight: 30, score: 50 },
    { rarity: 'rare', weight: 25, score: 85 },
    { rarity: 'epic', weight: 12, score: 170 },
    { rarity: 'legendary', weight: 3, score: 420 },
  ],
  jackalope: [
    { rarity: 'common', weight: 10, score: 40 },
    { rarity: 'uncommon', weight: 20, score: 65 },
    { rarity: 'rare', weight: 30, score: 110 },
    { rarity: 'epic', weight: 25, score: 220 },
    { rarity: 'legendary', weight: 15, score: 550 },
  ],
  raccoon: [
    { rarity: 'common', weight: 45, score: 15 },
    { rarity: 'uncommon', weight: 30, score: 35 },
    { rarity: 'rare', weight: 17, score: 60 },
    { rarity: 'epic', weight: 6, score: 120 },
    { rarity: 'legendary', weight: 2, score: 300 },
  ],
  coyote: [
    { rarity: 'common', weight: 35, score: 20 },
    { rarity: 'uncommon', weight: 32, score: 45 },
    { rarity: 'rare', weight: 20, score: 75 },
    { rarity: 'epic', weight: 10, score: 150 },
    { rarity: 'legendary', weight: 3, score: 375 },
  ],
  bison: [
    { rarity: 'common', weight: 30, score: 25 },
    { rarity: 'uncommon', weight: 35, score: 50 },
    { rarity: 'rare', weight: 22, score: 85 },
    { rarity: 'epic', weight: 10, score: 170 },
    { rarity: 'legendary', weight: 3, score: 425 },
  ],
  bass: [
    { rarity: 'common', weight: 50, score: 10 },
    { rarity: 'uncommon', weight: 30, score: 25 },
    { rarity: 'rare', weight: 15, score: 50 },
    { rarity: 'epic', weight: 4, score: 100 },
    { rarity: 'legendary', weight: 1, score: 250 },
  ],
  possum: [
    { rarity: 'common', weight: 55, score: 10 },
    { rarity: 'uncommon', weight: 28, score: 25 },
    { rarity: 'rare', weight: 12, score: 50 },
    { rarity: 'epic', weight: 4, score: 100 },
    { rarity: 'legendary', weight: 1, score: 250 },
  ],
  armadillo: [
    { rarity: 'common', weight: 40, score: 15 },
    { rarity: 'uncommon', weight: 32, score: 35 },
    { rarity: 'rare', weight: 18, score: 65 },
    { rarity: 'epic', weight: 7, score: 130 },
    { rarity: 'legendary', weight: 3, score: 325 },
  ],
  frog: [
    { rarity: 'common', weight: 50, score: 10 },
    { rarity: 'uncommon', weight: 30, score: 25 },
    { rarity: 'rare', weight: 15, score: 50 },
    { rarity: 'epic', weight: 4, score: 100 },
    { rarity: 'legendary', weight: 1, score: 250 },
  ],
  fish: [
    { rarity: 'common', weight: 55, score: 10 },
    { rarity: 'uncommon', weight: 28, score: 25 },
    { rarity: 'rare', weight: 12, score: 50 },
    { rarity: 'epic', weight: 4, score: 100 },
    { rarity: 'legendary', weight: 1, score: 250 },
  ],
  bird: [
    { rarity: 'common', weight: 45, score: 15 },
    { rarity: 'uncommon', weight: 30, score: 35 },
    { rarity: 'rare', weight: 16, score: 60 },
    { rarity: 'epic', weight: 7, score: 120 },
    { rarity: 'legendary', weight: 2, score: 300 },
  ],
};

// ── Special Photo Conditions ──────────────────────────────────────

const SPECIAL_CONDITIONS: Array<{
  animalType: AnimalType;
  condition: string;
  displayName: string;
  scoreBonus: number;
  rarityBoost: PhotoRarity[];
}> = [
  {
    animalType: 'rabbit',
    condition: 'sleeping',
    displayName: 'Sleeping Rabbit',
    scoreBonus: 20,
    rarityBoost: ['uncommon', 'rare'],
  },
  {
    animalType: 'fox',
    condition: 'playing',
    displayName: 'Playing Fox Kit',
    scoreBonus: 25,
    rarityBoost: ['rare', 'epic'],
  },
  {
    animalType: 'wolf',
    condition: 'howling',
    displayName: 'Howling at Moon',
    scoreBonus: 30,
    rarityBoost: ['rare', 'epic'],
  },
  {
    animalType: 'bear',
    condition: 'fishing',
    displayName: 'Bear Fishing',
    scoreBonus: 35,
    rarityBoost: ['rare', 'epic'],
  },
  {
    animalType: 'eagle',
    condition: 'soaring',
    displayName: 'Eagle Soaring',
    scoreBonus: 40,
    rarityBoost: ['epic', 'legendary'],
  },
  {
    animalType: 'jackalope',
    condition: 'dancing',
    displayName: 'Dancing Jackalope',
    scoreBonus: 50,
    rarityBoost: ['epic', 'legendary'],
  },
  {
    animalType: 'raccoon',
    condition: 'washing',
    displayName: 'Washing Treasure',
    scoreBonus: 20,
    rarityBoost: ['uncommon', 'rare'],
  },
  {
    animalType: 'bison',
    condition: 'charging',
    displayName: 'Charging Bison',
    scoreBonus: 30,
    rarityBoost: ['rare', 'epic'],
  },
  {
    animalType: 'possum',
    condition: 'playing-dead',
    displayName: 'Playing Possum',
    scoreBonus: 15,
    rarityBoost: ['uncommon', 'rare'],
  },
  {
    animalType: 'frog',
    condition: 'lily-pad',
    displayName: 'Frog on Lily Pad',
    scoreBonus: 20,
    rarityBoost: ['uncommon', 'rare'],
  },
];

// ── CameraSystem Class ────────────────────────────────────────────

export class CameraSystem {
  private state: CameraState;
  private photoCounter = 0;

  constructor() {
    this.state = {
      photos: [],
      charge: 100,
      zoomLevel: 1,
      miniGameActive: false,
      miniGameProgress: 0,
      miniGameTarget: 50,
    };
  }

  /** Get current camera state */
  getState(): CameraState {
    return { ...this.state };
  }

  /** Get all collected photos */
  getPhotos(): readonly PhotoEntry[] {
    return [...this.state.photos];
  }

  /** Get photos by animal type */
  getPhotosByType(animalType: AnimalType): PhotoEntry[] {
    return this.state.photos.filter((p) => p.animalType === animalType);
  }

  /** Get photo rarity counts */
  getRarityCounts(): Record<PhotoRarity, number> {
    const counts: Record<PhotoRarity, number> = {
      common: 0,
      uncommon: 0,
      rare: 0,
      epic: 0,
      legendary: 0,
    };

    for (const photo of this.state.photos) {
      counts[photo.rarity]++;
    }

    return counts;
  }

  /** Calculate total wildlife journal score */
  getJournalScore(): number {
    return this.state.photos.reduce((total, photo) => total + photo.score, 0);
  }

  /** Get unique species count */
  getUniqueSpeciesCount(): number {
    const types = new Set(this.state.photos.map((p) => p.animalType));
    return types.size;
  }

  /** Start a photography mini-game session */
  startMiniGame(targetScore: number): boolean {
    if (this.state.charge < 10) return false;
    if (this.state.miniGameActive) return false;

    this.state.miniGameActive = true;
    this.state.miniGameProgress = 0;
    this.state.miniGameTarget = targetScore;

    return true;
  }

  /** Process mini-game input (tension adjustment) */
  adjustMiniGame(direction: 'left' | 'right'): number {
    if (!this.state.miniGameActive) return 0;

    if (direction === 'left') {
      this.state.miniGameProgress = Math.max(0, this.state.miniGameProgress - 5);
    } else {
      this.state.miniGameProgress = Math.min(100, this.state.miniGameProgress + 5);
    }

    // Check if in the target zone
    const zoneSize = 20;
    const zoneCenter = this.state.miniGameTarget;
    const inZone =
      this.state.miniGameProgress >= zoneCenter - zoneSize &&
      this.state.miniGameProgress <= zoneCenter + zoneSize;

    if (inZone) {
      this.state.miniGameProgress += 2;
    } else {
      this.state.miniGameProgress -= 1;
    }

    // Check completion
    if (this.state.miniGameProgress >= 100) {
      this.state.miniGameActive = false;
      return 1; // Success
    }

    // Check failure (progress drops too low)
    if (this.state.miniGameProgress <= 0) {
      this.state.miniGameActive = false;
      return -1; // Failure
    }

    return 0; // Continue
  }

  /** Attempt to take a photo of an animal */
  takePhoto(
    animalType: AnimalType,
    roomId: string,
    specialCondition?: string,
  ): { success: boolean; photo?: PhotoEntry };
  takePhoto(
    animalType: AnimalType,
    roomId: string,
    specialCondition?: string,
  ): { success: boolean; photo?: PhotoEntry } {
    if (this.state.charge < 10) {
      return { success: false };
    }

    this.state.charge -= 10;

    this.photoCounter++;

    // Determine rarity
    const rarityTable = PHOTO_RARITY_TABLES[animalType];
    const rarity = this.rollRarity(rarityTable);

    // Check for special conditions
    const matchingCondition = SPECIAL_CONDITIONS.find(
      (c) => c.animalType === animalType && (!specialCondition || c.condition === specialCondition),
    );

    let score = rarityTable.find((r) => r.rarity === rarity)?.score ?? 10;
    let displayName = this.formatAnimalName(animalType);

    if (matchingCondition) {
      score += matchingCondition.scoreBonus;
      displayName = matchingCondition.displayName;

      // Boost rarity for special conditions
      if (matchingCondition.rarityBoost.includes(rarity)) {
        score += 25;
      }
    }

    const photo: PhotoEntry = {
      id: `photo-${this.photoCounter}`,
      animalType,
      specialCondition: matchingCondition?.condition,
      rarity,
      score,
      roomId,
      takenAt: Date.now(),
      displayName,
    };

    this.state.photos.push(photo);

    return { success: true, photo };
  }

  /** Recharge camera */
  recharge(amount: number): void {
    this.state.charge = Math.min(100, this.state.charge + amount);
  }

  /** Change zoom level */
  setZoomLevel(level: number): void {
    this.state.zoomLevel = Math.max(1, Math.min(5, level));
  }

  /** Get zoom multiplier for score */
  getZoomMultiplier(): number {
    return this.state.zoomLevel * 0.5;
  }

  /** Clear all photos */
  clearPhotos(): void {
    this.state.photos = [];
  }

  /** Reset camera state */
  reset(): void {
    this.state = {
      photos: [],
      charge: 100,
      zoomLevel: 1,
      miniGameActive: false,
      miniGameProgress: 0,
      miniGameTarget: 50,
    };
    this.photoCounter = 0;
  }

  /** Get photography progress for HUD */
  getProgress(): {
    charge: number;
    totalPhotos: number;
    uniqueSpecies: number;
    journalScore: number;
    rarityBreakdown: Record<PhotoRarity, number>;
  } {
    const rarityBreakdown = this.getRarityCounts();

    return {
      charge: this.state.charge,
      totalPhotos: this.state.photos.length,
      uniqueSpecies: this.getUniqueSpeciesCount(),
      journalScore: this.getJournalScore(),
      rarityBreakdown,
    };
  }

  // ── Private Helpers ─────────────────────────────────────────────

  private rng(): number {
    return Math.random();
  }

  private rollRarity(
    rarityTable: (typeof PHOTO_RARITY_TABLES)[keyof typeof PHOTO_RARITY_TABLES],
  ): PhotoRarity {
    const totalWeight = rarityTable.reduce((sum, r) => sum + r.weight, 0);
    let roll = this.rng() * totalWeight;

    for (const entry of rarityTable) {
      roll -= entry.weight;
      if (roll <= 0) {
        return entry.rarity;
      }
    }

    return 'common';
  }

  private formatAnimalName(type: AnimalType): string {
    return type
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}
