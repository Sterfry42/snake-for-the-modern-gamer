/**
 * Archipelago Island Expeditions
 */
import Phaser from 'phaser';
import type {
  ExpeditionBossId,
  ExpeditionPhase,
  IslandId,
  IslandDefinition,
  LegacyEffectId,
} from './types.js';
import { ISLAND_BY_ID } from './IslandRegistry.js';
import type { RandomGenerator } from '../../core/rng.js';
import type { GridConfig } from '../../config/gameConfig.js';

// ─── Expedition Scene Config ─────────────────────────────────────────────────

export interface ExpeditionSceneConfig extends Phaser.Types.Scenes.SettingsConfig {
  islandId: IslandId;
  grid?: GridConfig;
  rng?: RandomGenerator;
  onComplete?: (legacyEffect: LegacyEffectId, rewards: string[]) => void;
  onFail?: (reason: string) => void;
  onEvent?: (event: string, data: Record<string, unknown>) => void;
}

// ─── Island Room Generation ──────────────────────────────────────────────────

function generateIslandRoom(
  island: IslandDefinition,
  cols: number,
  rows: number,
  rng: RandomGenerator,
): string[] {
  // Generate a themed room layout based on island type
  const layout: string[] = [];

  for (let y = 0; y < rows; y++) {
    let row = '';
    for (let x = 0; x < cols; x++) {
      // Border walls
      if (y === 0 || y === rows - 1 || x === 0 || x === cols - 1) {
        row += '#';
        continue;
      }

      // Interior generation based on biome
      const rand = rng();

      switch (island.biome) {
        case 'lava':
          // Lava flows and rock formations
          if (rand < 0.1) {
            row += '~'; // lava pool
          } else if (rand < 0.2) {
            row += '#'; // rock wall
          } else if (rand < 0.25) {
            row += '.'; // open floor
          } else {
            row += '-'; // magma path
          }
          break;

        case 'crystal':
          // Crystal formations and light paths
          if (rand < 0.08) {
            row += '*'; // crystal formation
          } else if (rand < 0.15) {
            row += '#'; // wall
          } else if (rand < 0.2) {
            row += '·'; // light refraction point
          } else {
            row += '.'; // crystal floor
          }
          break;

        case 'underwater':
          // Water tiles and temple structures
          if (rand < 0.15) {
            row += '~'; // deep water
          } else if (rand < 0.2) {
            row += '#'; // temple wall
          } else if (rand < 0.25) {
            row += '≈'; // water current
          } else {
            row += '.'; // temple floor
          }
          break;

        case 'sky':
          // Floating platforms and wind paths
          if (rand < 0.12) {
            row += '#'; // platform edge
          } else if (rand < 0.18) {
            row += '∿'; // wind current
          } else if (rand < 0.22) {
            row += '·'; // cloud patch
          } else {
            row += '.'; // platform surface
          }
          break;

        case 'ruins':
          // Ancient structures and trap locations
          if (rand < 0.1) {
            row += '#'; // ruined wall
          } else if (rand < 0.15) {
            row += '!'; // trap location
          } else if (rand < 0.2) {
            row += '$'; // treasure/secret
          } else {
            row += '.'; // ruin floor
          }
          break;

        case 'mirror':
          // Reflection tiles and inverted zones
          if (rand < 0.1) {
            row += '#'; // mirror wall
          } else if (rand < 0.15) {
            row += '◊'; // reflection point
          } else if (rand < 0.2) {
            row += '⌐'; // inverted zone
          } else {
            row += '.'; // mirror floor
          }
          break;

        default:
          row += '.';
      }
    }
    layout.push(row);
  }

  return layout;
}

// ─── Expedition Scene ────────────────────────────────────────────────────────

export class ExpeditionScene extends Phaser.Scene {
  private islandId: IslandId;
  private island: IslandDefinition | null = null;
  private grid: GridConfig;
  private rng: RandomGenerator;
  private onComplete?: (legacyEffect: LegacyEffectId, rewards: string[]) => void;
  private onFail?: (reason: string) => void;
  private onEvent?: (event: string, data: Record<string, unknown>) => void;

  // Scene state
  private currentPhase: ExpeditionPhase = 'approach';
  private phaseTimer: number = 0;
  private phaseDuration: number = 60000; // 60 seconds per phase
  private score: number = 0;
  private discoveries: string[] = [];
  private bossDefeated: boolean = false;
  private bossDefeatTimer: number = 0;

  // Rendering
  private gridGraphics!: Phaser.GameObjects.Graphics;

  private phaseText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private progressText!: Phaser.GameObjects.Text;
  private phaseProgressBar!: Phaser.GameObjects.Graphics;

  // Animation
  private cameraShakeTimer: number = 0;
  private particleEffects: Phaser.GameObjects.Particles.ParticleEmitter[] = [];

  constructor(config: ExpeditionSceneConfig) {
    super({ key: 'ExpeditionScene' });

    this.islandId = config.islandId;
    this.grid = config.grid ?? { cols: 30, rows: 20, cell: 16 };
    this.rng = config.rng ?? (Math.random as RandomGenerator);
    this.onComplete = config.onComplete;
    this.onFail = config.onFail;
    this.onEvent = config.onEvent;
  }

  init(config: ExpeditionSceneConfig): void {
    this.islandId = config.islandId;
    this.island = ISLAND_BY_ID[config.islandId] ?? null;
    this.grid = config.grid ?? this.grid;
    this.rng = config.rng ?? this.rng;
    this.onComplete = config.onComplete;
    this.onFail = config.onFail;
    this.onEvent = config.onEvent;
    this.currentPhase = 'approach';
    this.phaseTimer = 0;
    this.score = 0;
    this.discoveries = [];
    this.bossDefeated = false;
    this.bossDefeatTimer = 0;
  }

  create(): void {
    if (!this.island) {
      this.failExpedition('Unknown island');
      return;
    }

    this.cameras.main.setBackgroundColor(this.island.backgroundColor);

    // Generate room layout
    const layout = generateIslandRoom(this.island, this.grid.cols, this.grid.rows, this.rng);

    // Create grid graphics
    this.gridGraphics = this.add.graphics();
    this.drawGrid(layout);

    // Create UI graphics

    // Create UI text
    this.phaseText = this.add.text(10, 10, '', {
      fontSize: '18px',
      color: '#ffffff',
      fontFamily: 'monospace',
    });

    this.scoreText = this.add.text(10, 35, '', {
      fontSize: '14px',
      color: '#aaaaaa',
      fontFamily: 'monospace',
    });

    this.progressText = this.add.text(10, 55, '', {
      fontSize: '14px',
      color: '#888888',
      fontFamily: 'monospace',
    });

    this.phaseProgressBar = this.add.graphics();

    // Create particle effects for the biome
    this.createBiomeParticles();

    // Handle input for exploration
    this.input.on('pointerdown', this.handleInput, this);

    // Start phase timer
    this.time.addEvent({
      delay: 100,
      callback: this.updatePhase,
      callbackScope: this,
      loop: true,
    });

    // Announce expedition start
    this.onEvent?.('expedition-started', { islandId: this.islandId, islandName: this.island.name });
  }

  update(time: number, delta: number): void {
    void time;
    void delta;
    // Update UI
    this.updateUI();

    // Handle boss defeat animation
    if (this.bossDefeated) {
      this.bossDefeatTimer += 16;
      if (this.bossDefeatTimer > 3000) {
        this.completeExpedition();
      }
    }

    // Camera shake
    if (this.cameraShakeTimer > 0) {
      this.cameraShakeTimer -= 16;
      this.cameras.main.shake(100, 0.002);
    }
  }

  // ─── Grid Rendering ──────────────────────────────────────────────────────

  private drawGrid(layout: string[]): void {
    const { cell } = this.grid;
    const offsetX = (this.cameras.main.width - this.grid.cols * cell) / 2;
    const offsetY = 80; // Leave room for UI

    this.gridGraphics.clear();

    // Background
    this.gridGraphics.fillStyle(this.island!.backgroundColor, 1);
    this.gridGraphics.fillRect(
      offsetX - cell,
      offsetY - cell,
      this.grid.cols * cell + cell * 2,
      this.grid.rows * cell + cell * 2,
    );

    // Draw tiles
    for (let y = 0; y < this.grid.rows; y++) {
      for (let x = 0; x < this.grid.cols; x++) {
        const tile = layout[y]?.[x] ?? '.';
        const px = offsetX + x * cell;
        const py = offsetY + y * cell;

        let color: number;
        switch (tile) {
          case '#':
            color = this.island!.wallColor;
            break;
          case '~':
          case '≈':
            color = 0x0044aa;
            break;
          case '*':
            color = 0xddaaff;
            break;
          case '!':
            color = 0xff4444;
            break;
          case '$':
            color = 0xffd700;
            break;
          case '·':
          case '◊':
            color = 0xffffff;
            break;
          case '-':
            color = 0x882200;
            break;
          case '∿':
            color = 0x88ccff;
            break;
          case '⌐':
            color = 0x666688;
            break;
          default:
            color = this.island!.color;
        }

        this.gridGraphics.fillStyle(color, 0.8);
        this.gridGraphics.fillRect(px, py, cell - 1, cell - 1);
      }
    }

    // Draw phase indicator border
    this.gridGraphics.lineStyle(2, this.island!.color, 0.5);
    this.gridGraphics.strokeRect(
      offsetX - cell,
      offsetY - cell,
      this.grid.cols * cell + cell * 2,
      this.grid.rows * cell + cell * 2,
    );
  }

  // ─── Phase Management ────────────────────────────────────────────────────

  private updatePhase(): void {
    if (this.bossDefeated) return;

    this.phaseTimer += 100;

    const phases: ExpeditionPhase[] = ['approach', 'explore', 'discover', 'escape'];
    const phaseIndex = phases.indexOf(this.currentPhase);

    if (this.phaseTimer >= this.phaseDuration && phaseIndex < phases.length - 1) {
      // Advance to next phase
      this.currentPhase = phases[phaseIndex + 1];
      this.phaseTimer = 0;

      this.onEvent?.('phase-advanced', {
        islandId: this.islandId,
        phase: this.currentPhase,
      });

      // Trigger phase-specific events
      this.triggerPhaseEvent();
    }

    // Boss phase: trigger boss encounter
    if (this.currentPhase === 'escape' && !this.bossDefeated) {
      this.triggerBossEncounter();
    }
  }

  private triggerPhaseEvent(): void {
    switch (this.currentPhase) {
      case 'approach':
        this.onEvent?.('phase-event', {
          islandId: this.islandId,
          phase: 'approach',
          message: `Approaching ${this.island?.name}...`,
        });
        break;
      case 'explore':
        this.onEvent?.('phase-event', {
          islandId: this.islandId,
          phase: 'explore',
          message: `Exploring ${this.island?.name}...`,
        });
        break;
      case 'discover':
        this.onEvent?.('phase-event', {
          islandId: this.islandId,
          phase: 'discover',
          message: `Discovering secrets of ${this.island?.name}...`,
        });
        this.makeDiscovery();
        break;
      case 'escape':
        this.onEvent?.('phase-event', {
          islandId: this.islandId,
          phase: 'escape',
          message: `Escaping ${this.island?.name}!`,
        });
        break;
    }
  }

  private makeDiscovery(): void {
    const discoveryNames = [
      'Ancient Relic',
      'Hidden Chamber',
      'Secret Passage',
      'Lost Artifact',
      'Hidden Treasure',
      'Ancient Inscription',
      'Secret Garden',
      'Hidden Vault',
    ];

    const name = discoveryNames[Math.floor(this.rng() * discoveryNames.length)];
    this.discoveries.push(name);
    this.score += 50;

    this.onEvent?.('discovery-made', {
      islandId: this.islandId,
      discovery: name,
    });

    // Visual feedback
    this.cameraShakeTimer = 200;
  }

  // ─── Boss Encounter ──────────────────────────────────────────────────────

  private triggerBossEncounter(): void {
    if (!this.island) return;

    const bossId = this.island.bossId as ExpeditionBossId;
    this.onEvent?.('boss-encounter', {
      islandId: this.islandId,
      bossId,
      bossName: bossId,
    });

    // Boss fight simulation
    this.simulateBossFight(bossId);
  }

  private simulateBossFight(bossId: ExpeditionBossId): void {
    // Simplified boss fight: random outcome based on score
    const difficulty = this.getBossDifficulty(bossId);
    const successChance = Math.min(0.9, 0.3 + this.score / (difficulty * 100));

    if (this.rng() < successChance) {
      this.bossDefeated = true;
      this.score += difficulty * 10;

      this.onEvent?.('boss-defeated', {
        islandId: this.islandId,
        bossId,
        score: difficulty * 10,
      });

      // Victory effects
      this.cameraShakeTimer = 500;
    } else {
      this.failExpedition(`Defeated by ${bossId}`);
    }
  }

  private getBossDifficulty(bossId: ExpeditionBossId): number {
    const difficulties: Record<ExpeditionBossId, number> = {
      'lava-warden': 5,
      'crystal-golem': 6,
      'temple-serpent': 5,
      'sky-phoenix': 7,
      'ancient-guardian': 8,
      'shadow-self': 4,
    };
    return difficulties[bossId] ?? 5;
  }

  // ─── Input Handling ──────────────────────────────────────────────────────

  private handleInput(pointer: Phaser.Input.Pointer): void {
    void pointer;
    if (this.bossDefeated) return;

    // Click to advance phase progress
    this.phaseTimer = Math.min(this.phaseTimer + this.phaseDuration * 0.1, this.phaseDuration);
    this.score += 10;

    // Random discovery chance
    if (this.rng() < 0.15) {
      this.makeDiscovery();
    }
  }

  // ─── Particle Effects ────────────────────────────────────────────────────

  private createBiomeParticles(): void {
    if (!this.island) return;

    let particleColor: number;
    let speed: number;

    switch (this.island.biome) {
      case 'lava':
        particleColor = 0xff4400;
        speed = 50;
        break;
      case 'crystal':
        particleColor = 0xddaaff;
        speed = 30;
        break;
      case 'underwater':
        particleColor = 0x44aaff;
        speed = 40;
        break;
      case 'sky':
        particleColor = 0xffffff;
        speed = 20;
        break;
      case 'ruins':
        particleColor = 0xdaa520;
        speed = 25;
        break;
      case 'mirror':
        particleColor = 0xcccccc;
        speed = 35;
        break;
      default:
        particleColor = 0xffffff;
        speed = 30;
    }

    const emitter = this.add.particles(0, 0, 'expedition-particle', {
      speed: [speed * 0.5, speed * 1.5],
      angle: [0, 360],
      scale: { start: 0.5, end: 0 },
      lifespan: 2000,
      frequency: 200,
      tint: particleColor,
      alpha: { start: 0.8, end: 0 },
      emitting: true,
    });

    emitter.setDepth(100);
    emitter.stop(); // Start stopped, we'll control manually
    this.particleEffects.push(emitter);
  }

  // ─── UI Updates ──────────────────────────────────────────────────────────

  private updateUI(): void {
    const phaseNames: Record<ExpeditionPhase, string> = {
      approach: '🚢 Approach',
      explore: '🔍 Explore',
      discover: '🏛️ Discover',
      escape: '⚔️ Escape',
    };

    this.phaseText.setText(
      `${this.island?.name ?? this.islandId}\n${phaseNames[this.currentPhase]}`,
    );
    this.scoreText.setText(`Score: ${this.score} | Discoveries: ${this.discoveries.length}`);

    const phaseProgress = this.phaseTimer / this.phaseDuration;
    this.progressText.setText(
      `${this.currentPhase.toUpperCase()} (${Math.round(phaseProgress * 100)}%)${this.bossDefeated ? ' | BOSS DEFEATED!' : ''}`,
    );

    // Draw progress bar
    this.phaseProgressBar.clear();
    const barWidth = 200;
    const barHeight = 8;
    const barX = this.cameras.main.width - barWidth - 10;
    const barY = 10;

    this.phaseProgressBar.fillStyle(0x333333, 1);
    this.phaseProgressBar.fillRect(barX, barY, barWidth, barHeight);

    this.phaseProgressBar.fillStyle(this.island?.color ?? 0xffffff, 1);
    this.phaseProgressBar.fillRect(barX, barY, barWidth * phaseProgress, barHeight);

    this.phaseProgressBar.lineStyle(1, 0xffffff, 0.5);
    this.phaseProgressBar.strokeRect(barX, barY, barWidth, barHeight);
  }

  // ─── Completion / Failure ────────────────────────────────────────────────

  private completeExpedition(): void {
    if (!this.island) return;

    this.onEvent?.('expedition-completed', {
      islandId: this.islandId,
      score: this.score,
      discoveries: this.discoveries,
      legacyEffect: this.island.legacyEffect,
      reward: this.island.rewardId,
    });

    this.onComplete?.(this.island.legacyEffect, [this.island.rewardId]);
  }

  private failExpedition(reason: string): void {
    this.onEvent?.('expedition-failed', {
      islandId: this.islandId,
      reason,
    });

    this.onFail?.(reason);
  }

  // ─── Public API ──────────────────────────────────────────────────────────

  getScore(): number {
    return this.score;
  }

  getDiscoveries(): string[] {
    return [...this.discoveries];
  }

  getPhase(): ExpeditionPhase {
    return this.currentPhase;
  }

  isBossDefeated(): boolean {
    return this.bossDefeated;
  }

  getIslandId(): IslandId {
    return this.islandId;
  }
}
