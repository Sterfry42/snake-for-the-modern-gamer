/**
 * Wildlife Journal Overlay
 *
 * The wise old snake's wildlife journal:
 * - The wise old snake's journal was the most complete collection
 * - The wise old snake's journal had photos of every animal
 * - The wise old snake's journal was displayed in the museum
 * - The wise old snake's journal was bound in leather
 * - The wise old snake's journal was updated daily
 * - The wise old snake's journal was the snake's pride and joy
 * - The wise old snake's journal was encyclopedic
 * - The wise old snake's journal was eternal
 */
import type { PhotoEntry, PhotoRarity } from '../animals/ecosystem/types.js';
import type { AnimalType } from '../animals/types.js';
import { AnimalRegistry } from '../animals/animalRegistry.js';

// ── Rarity Colors ─────────────────────────────────────────────────

const RARITY_COLORS: Record<PhotoRarity, string> = {
  common: '#9ca3af',
  uncommon: '#3b82f6',
  rare: '#8b5cf6',
  epic: '#ec4899',
  legendary: '#f59e0b',
};

const RARITY_LABELS: Record<PhotoRarity, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
};

// ── Wildlife Journal View ─────────────────────────────────────────

export interface WildlifeJournalView {
  totalPhotos: number;
  uniqueSpecies: number;
  journalScore: number;
  rarityBreakdown: Record<PhotoRarity, number>;
  speciesList: SpeciesEntry[];
}

export interface SpeciesEntry {
  type: AnimalType;
  name: string;
  photoCount: number;
  bestRarity: PhotoRarity;
  bestScore: number;
  photos: PhotoEntry[];
  discovered: boolean;
}

// ── WildlifeJournalOverlay Class ──────────────────────────────────

export class WildlifeJournalOverlay {
  private view: WildlifeJournalView | null = null;

  /** Generate the journal view from photos */
  generateView(photos: readonly PhotoEntry[]): WildlifeJournalView {
    const speciesMap = new Map<AnimalType, PhotoEntry[]>();

    for (const photo of photos) {
      const existing = speciesMap.get(photo.animalType) ?? [];
      existing.push(photo);
      speciesMap.set(photo.animalType, existing);
    }

    const speciesList: SpeciesEntry[] = [];
    let totalScore = 0;
    const rarityBreakdown: Record<PhotoRarity, number> = {
      common: 0,
      uncommon: 0,
      rare: 0,
      epic: 0,
      legendary: 0,
    };

    for (const [type, entries] of speciesMap) {
      const def = AnimalRegistry.getDefinition(type);
      const bestRarity = this.getBestRarity(entries);
      const bestScore = Math.max(...entries.map((e) => e.score));

      for (const entry of entries) {
        rarityBreakdown[entry.rarity]++;
        totalScore += entry.score;
      }

      speciesList.push({
        type,
        name: def.name,
        photoCount: entries.length,
        bestRarity,
        bestScore,
        photos: entries,
        discovered: entries.length > 0,
      });
    }

    // Sort by score descending
    speciesList.sort((a, b) => b.bestScore - a.bestScore);

    this.view = {
      totalPhotos: photos.length,
      uniqueSpecies: speciesMap.size,
      journalScore: totalScore,
      rarityBreakdown,
      speciesList,
    };

    return this.view;
  }

  /** Get the current view */
  getView(): WildlifeJournalView | null {
    return this.view;
  }

  /** Get species entry by type */
  getSpeciesEntry(type: AnimalType): SpeciesEntry | undefined {
    return this.view?.speciesList.find((s) => s.type === type);
  }

  /** Check if a species has been discovered */
  isSpeciesDiscovered(type: AnimalType): boolean {
    return this.view?.speciesList.some((s) => s.type === type && s.discovered) ?? false;
  }

  /** Get the completion percentage */
  getCompletionPercentage(): number {
    if (!this.view) return 0;
    Object.keys(AnimalRegistry.getDefinition('rabbit')).length as unknown as number;
    // Use actual animal count from registry
    const allTypes = AnimalRegistry.getAll().map((d) => d.type);
    const discovered = this.view.speciesList.filter((s) => s.discovered).length;
    return Math.round((discovered / allTypes.length) * 100);
  }

  /** Get rarity color for a rarity */
  getRarityColor(rarity: PhotoRarity): string {
    return RARITY_COLORS[rarity];
  }

  /** Get rarity label for a rarity */
  getRarityLabel(rarity: PhotoRarity): string {
    return RARITY_LABELS[rarity];
  }

  // ── Private Helpers ─────────────────────────────────────────────

  private getBestRarity(entries: PhotoEntry[]): PhotoRarity {
    const rarityOrder: PhotoRarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
    for (const rarity of rarityOrder) {
      if (entries.some((e) => e.rarity === rarity)) {
        return rarity;
      }
    }
    return 'common';
  }
}
