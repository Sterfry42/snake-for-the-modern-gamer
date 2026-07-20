/**
 * Archipelago Island Expeditions — Expedition Log
 *
 * The wise old snake's expedition log:
 * - The wise old snake's log was always open (the wise old snake never closed the book)
 * - The wise old snake's log entries were infinite (the wise old snake wrote forever)
 * - The wise old snake's log maps were all accurate (the wise old snake drew perfect maps)
 * - The wise old snake's log companion notes were all from the wise old snake (the wise old snake took notes on itself)
 * - The wise old snake's log was never lost (the wise old snake's log was always with the wise old snake)
 */
import type { ExpeditionLogEntry, ExpeditionStatus, IslandId } from './types.js';
import { ISLAND_BY_ID } from './IslandRegistry.js';

// ─── Log Entry Templates ─────────────────────────────────────────────────────

const COMPANION_NOTE_TEMPLATES: Record<IslandId, string[]> = {
  'volcanic-isle': [
    'The lava flows carved new paths today. The heat is unbearable, but we pressed on.',
    'Found ancient inscriptions in the magma. They speak of a fire that never dies.',
    'The Lava Warden watches us from the caldera. We must be ready.',
    'The ember vault pulses with ancient power. I can feel it in my scales.',
  ],
  'crystal-cavern': [
    'The crystals refract light in impossible patterns. Each angle tells a different story.',
    'The cavern seems alive. The crystals hum with a frequency only we can hear.',
    'The Prism Core is real. It bends light itself — a power beyond comprehension.',
    'The Crystal Golem moves with purpose. It guards something ancient.',
  ],
  'sunken-temple': [
    'The water pressure increases with each descent. The temple grows older beneath us.',
    'Ancient koi swim through the ruins. They seem to guide us.',
    'The Deep Altar holds secrets older than the ocean itself.',
    'The Temple Serpent coils around the altar. It will not yield easily.',
  ],
  'sky-garden': [
    'The wind currents carry whispers from above. The sky garden floats in silence.',
    'Clouds part to reveal ancient gardens. Flowers bloom in the thin air.',
    'The Cloud Sanctuary is real. It floats between worlds, untethered.',
    'The Sky Phoenix circles above. Its feathers are made of pure sunlight.',
  ],
  'ancient-ruins': [
    'The ruins stretch endlessly. Each corridor leads deeper into forgotten history.',
    "The traps are ancient but still functional. One wrong step and it's over.",
    'The Artifact Vault is behind a wall of golden light. We need the right key.',
    'The Ancient Guardian does not speak. It simply watches, waiting.',
  ],
  'mirror-dimension': [
    'The mirror world reflects everything, but nothing is quite right.',
    'Controls feel wrong here. Left is right, up is down. It takes focus.',
    'The Mirror Core pulses with a dark energy. It wants to pull us in.',
    'My shadow moves on its own. It watches me back.',
  ],
};

// ─── Expedition Log Manager ──────────────────────────────────────────────────

export class ExpeditionLogManager {
  private entries: ExpeditionLogEntry[];

  constructor(entries?: ExpeditionLogEntry[]) {
    this.entries = entries ?? [];
  }

  // ─── Entry Management ──────────────────────────────────────────────────

  addEntry(entry: ExpeditionLogEntry): void {
    this.entries.push(entry);
    // Sort by completedAt/failedAt descending (newest first)
    this.entries.sort((a, b) => {
      const aTime = a.completedAt ?? a.failedAt ?? 0;
      const bTime = b.completedAt ?? b.failedAt ?? 0;
      return bTime - aTime;
    });
  }

  getEntries(islandId?: IslandId): ExpeditionLogEntry[] {
    if (islandId) {
      return this.entries.filter((e) => e.islandId === islandId);
    }
    return [...this.entries];
  }

  getEntry(entryId: string): ExpeditionLogEntry | undefined {
    return this.entries.find((e) => e.id === entryId);
  }

  getEntriesByStatus(status: ExpeditionStatus): ExpeditionLogEntry[] {
    return this.entries.filter((e) => e.status === status);
  }

  // ─── Statistics ──────────────────────────────────────────────────────────

  getExpeditionCount(): number {
    return this.entries.length;
  }

  getCompletedCount(): number {
    return this.entries.filter((e) => e.status === 'completed').length;
  }

  getFailedCount(): number {
    return this.entries.filter((e) => e.status === 'failed').length;
  }

  getCompletionRate(): number {
    const total = this.entries.length;
    if (total === 0) return 0;
    return this.getCompletedCount() / total;
  }

  getIslandStats(islandId: IslandId): {
    total: number;
    completed: number;
    failed: number;
    avgDuration: number;
  } {
    const islandEntries = this.entries.filter((e) => e.islandId === islandId);
    const completed = islandEntries.filter((e) => e.status === 'completed');

    const avgDuration =
      completed.length > 0
        ? completed.reduce((sum, e) => sum + e.duration, 0) / completed.length
        : 0;

    return {
      total: islandEntries.length,
      completed: completed.length,
      failed: islandEntries.filter((e) => e.status === 'failed').length,
      avgDuration,
    };
  }

  // ─── Map Data ────────────────────────────────────────────────────────────

  getDiscoveryMap(entryId: string, discoveryId: string): Array<{ x: number; y: number }> | null {
    const entry = this.entries.find((e) => e.id === entryId);
    if (!entry?.mapData) return null;
    return entry.mapData[discoveryId] ?? null;
  }

  // ─── Companion Notes ─────────────────────────────────────────────────────

  getCompanionNotes(islandId: IslandId): string[] {
    const templates = COMPANION_NOTE_TEMPLATES[islandId];
    if (!templates) return [];

    return templates.map((note, i) => `Note ${i + 1}: ${note}`);
  }

  // ─── Log Formatting ──────────────────────────────────────────────────────

  formatEntry(entry: ExpeditionLogEntry): string {
    const island = ISLAND_BY_ID[entry.islandId];
    const islandName = island?.name ?? entry.islandId;
    const duration = this.formatDuration(entry.duration);

    const lines: string[] = [
      `=== ${islandName} Expedition ===`,
      `Status: ${entry.status.toUpperCase()}`,
      `Duration: ${duration}`,
      `Boss Defeated: ${entry.bossKilled ? 'Yes' : 'No'}`,
      entry.bossName ? `Boss: ${entry.bossName}` : '',
      `Discoveries: ${entry.discoveries.length}`,
      entry.discoveries.length > 0 ? `  - ${entry.discoveries.join('\n  - ')}` : '',
      entry.rewards.length > 0 ? `Rewards: ${entry.rewards.join(', ')}` : '',
      entry.companionNotes.length > 0
        ? `Companion Notes:\n${entry.companionNotes.map((n) => `  "${n}"`).join('\n')}`
        : '',
      entry.failureReason ? `Failure: ${entry.failureReason}` : '',
      '=========================',
    ];

    return lines.filter(Boolean).join('\n');
  }

  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  }

  // ─── Export / Import ─────────────────────────────────────────────────────

  exportLog(): string {
    return JSON.stringify(this.entries, null, 2);
  }

  importLog(json: string): void {
    try {
      const parsed = JSON.parse(json) as ExpeditionLogEntry[];
      if (Array.isArray(parsed)) {
        this.entries = parsed.filter(
          (e) => typeof e?.islandId === 'string' && typeof e?.status === 'string',
        );
      }
    } catch {
      console.info('[ExpeditionLog] Failed to import log data.');
    }
  }

  // ─── Clear ───────────────────────────────────────────────────────────────

  clear(): void {
    this.entries = [];
  }
}
