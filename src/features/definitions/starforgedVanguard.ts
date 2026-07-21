/**
 * Starforged Vanguard Feature
 *
 * The wise old snake's starforged integration:
 * - The wise old snake's starforged class was 'Wise Old Snake'
 * - The wise old snake's starforged race was 'Ancient Serpent'
 * - The wise old snake's starforged background was 'Philosopher'
 * - The wise old snake's starforged destiny was 'Wisdom'
 * - The wise old snake's starforged gift was 'Knowledge'
 * - The wise old snake's starforged suit was 'wise-old-snake-suit'
 * - The wise old snake's starforged transmat line was 'The wise old snake arrives.'
 * - The wise old snake's starforged bounties were 'collect wisdom'
 * - The wise old snake's starforged palette was 'wise-old-snake-palette'
 * - The wise old snake's starforged title was 'The Wise Old Snake'
 */
import Phaser from 'phaser';
import { Feature } from '../feature.js';
import type SnakeScene from '../../scenes/snakeScene.js';
import { StarforgedSystem } from '../../starforged/starforgedSystem.js';
import {
  buildGuardianSuitSummary,
  pickGuardianSuitProfile,
  pickGuardianTransmatLine,
  type GuardianSuitProfile,
} from '../../starforged/starforgedGuardianCosmetics.js';
import {
  pickDestiny3Bounties,
  pickDestiny3DirectorLine,
  pickDestiny3Palette,
  pickDestiny3Signal,
  pickDestiny3TitleSplash,
} from '../../starforged/starforgedDestinyContent.js';
import type {
  StarforgedActivityResult,
  StarforgedGearRoll,
  StarforgedRuntimeState,
} from '../../starforged/starforgedTypes.js';

const STATE_FLAG = 'starforged.state';
const HUD_DEPTH = 29;
const PANEL_DEPTH = 74;
const CINEMATIC_DEPTH = 89;

class StarforgedVanguardFeature extends Feature {
  private readonly system = new StarforgedSystem({ seed: 'snake-modern-starforged' });
  private hud: Phaser.GameObjects.Text | null = null;
  private callout: Phaser.GameObjects.Text | null = null;
  private panel: Phaser.GameObjects.Container | null = null;
  private vendorPanel: Phaser.GameObjects.Container | null = null;
  private fakeTitle: Phaser.GameObjects.Container | null = null;
  private cinematicOverlay: Phaser.GameObjects.Container | null = null;
  private cinematicGraphics: Phaser.GameObjects.Graphics | null = null;
  private cinematicDirectorText: Phaser.GameObjects.Text | null = null;
  private cinematicSignalText: Phaser.GameObjects.Text | null = null;
  private cinematicBountyText: Phaser.GameObjects.Text | null = null;
  private roomBanner: Phaser.GameObjects.Container | null = null;
  private lootBanner: Phaser.GameObjects.Container | null = null;
  private lastActivityId = '';
  private lastDirectorBeat = -1;
  private lastRoomId = '';
  private inputRegistered = false;

  constructor() {
    super('starforgedVanguard', 'Destiny 3: Starforged Vanguard');
  }

  override onRegister(scene: SnakeScene): void {
    const state = this.readState(scene);
    scene.setFlag('starforged.interactionReady', undefined);
    scene.setFlag('starforged.interactRequested', undefined);
    this.writeState(scene, state);
    this.ensureInput(scene);
    this.ensureHud(scene);
    this.updateHud(scene, state);
  }

  override onActionStep(scene: SnakeScene): void {
    const state = this.readState(scene);
    this.handleQuestBridgeRequests(scene, state);
    this.handleRoomDirectorBeat(scene, state);
    this.tickStarforgedBuffs(scene, state);

    const result = this.system.tick(state, {
      score: scene.score,
      length: scene.snake.length,
      roomId: scene.currentRoomId,
      roomsVisited: Number(scene.getFlag<number>('roomsVisited') ?? 1),
      powerupsCollected: Number(scene.getFlag<number>('powerupsPicked') ?? 0),
    });

    if (result.completed) {
      this.applyCompletion(scene, state, result);
      this.system.activateBestActivity(state);
    }

    this.applyPassiveEffects(scene, state);
    this.writeState(scene, state);
    this.updateHud(scene, state);
    this.refreshPanel(scene, state);
  }

  override onAppleEaten(scene: SnakeScene): void {
    const state = this.readState(scene);
    const apple = scene.snakeGame.getApple(scene.currentRoomId);
    const result = this.system.appleEaten(state, {
      appleTypeId: apple?.typeId,
      score: scene.score,
      length: scene.snake.length,
      roomId: scene.currentRoomId,
      roomsVisited: Number(scene.getFlag<number>('roomsVisited') ?? 1),
      streak: Number(scene.getFlag<number>('appleStreak') ?? 0),
    });

    if (state.active) {
      const effects = this.system.computeAppliedEffects(state);
      if (effects.scoreBonus > 0 && !scene.snakeGame.isRaccoonMode()) {
        scene.addScore(effects.scoreBonus, 'starforged');
      }
      if (effects.growthBonus > 0 && Number(scene.getFlag<number>('appleStreak') ?? 0) % 5 === 0) {
        scene.growSnake(effects.growthBonus);
      }
      const lightbindCharges = Number(
        scene.getFlag<number>('starforged.lightbindAppleCharges') ?? 0,
      );
      if (lightbindCharges > 0) {
        scene.setFlag(
          'starforged.lightbindAppleCharges',
          lightbindCharges > 1 ? lightbindCharges - 1 : undefined,
        );
        scene.growSnake(1);
        if (!scene.snakeGame.isRaccoonMode()) {
          scene.addScore(4);
        }
        state.superEnergy = Math.min(100, state.superEnergy + 8);
        this.spawnCallout(scene, 'Lightbind apple: +1 length, +8 super.');
      }
      this.advancePublicEvent(scene, state, 18, 'apple');
      this.spawnAppleLightMotes(scene, state);
    }

    if (result.completed) {
      this.applyCompletion(scene, state, result);
      this.system.activateBestActivity(state);
    }

    this.applyPassiveEffects(scene, state);
    this.writeState(scene, state);
    this.updateHud(scene, state);
    this.refreshPanel(scene, state);
  }

  override onGameOver(scene: SnakeScene): void {
    const state = this.readState(scene);
    state.superEnergy = 0;
    state.abilityEnergy = 0;
    state.activityProgress[state.activeActivityId] = {
      activityId: state.activeActivityId,
      objectiveProgress: 0,
      encountersCleared: 0,
      completions: state.activityProgress[state.activeActivityId]?.completions ?? 0,
      streak: 0,
    };
    this.writeState(scene, state);
    this.updateHud(scene, state);
    this.refreshPanel(scene, state);
  }

  override onRender(scene: SnakeScene): void {
    const state = this.readState(scene);
    this.handleQuestBridgeRequests(scene, state);
    const suppressed = Boolean(scene.getFlag<boolean>('ui.suppressHud'));
    this.updateCinematicOverlay(scene, state, suppressed);
    this.hud?.setVisible(!suppressed && state.active);
    this.panel?.setVisible(
      !suppressed && state.active && Boolean(scene.getFlag<boolean>('starforged.panelOpen')),
    );
  }

  private ensureInput(scene: SnakeScene): void {
    if (this.inputRegistered) {
      return;
    }
    this.inputRegistered = true;
    scene.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      const sceneAny = scene as unknown as {
        titleVisible: boolean;
        deathCutscene: boolean;
        questPopup?: { isVisible?: () => boolean };
        villageShopPopup?: { isVisible?: () => boolean };
      };
      if (
        sceneAny.titleVisible ||
        sceneAny.deathCutscene ||
        sceneAny.questPopup?.isVisible?.() ||
        sceneAny.villageShopPopup?.isVisible?.()
      ) {
        return;
      }
      const key = event.key.toLowerCase();
      if (scene.paused && key !== 'l') {
        return;
      }
      const state = this.readState(scene);
      if (!state.active) {
        return;
      }
      if (key === 'l') {
        this.togglePanel(scene);
        event.preventDefault();
      } else if (key === 'z') {
        this.spendAbility(scene);
        event.preventDefault();
      } else if (key === 'x') {
        this.spendSuper(scene);
        event.preventDefault();
      }
    });
  }

  private handleQuestBridgeRequests(scene: SnakeScene, state: StarforgedRuntimeState): void {
    if (scene.getFlag('starforged.pendingFakeTitle')) {
      scene.setFlag('starforged.pendingFakeTitle', undefined);
      this.showDestinyThreeFakeout(scene, state);
      return;
    }
    if (scene.getFlag('starforged.openVendorRequested')) {
      scene.setFlag('starforged.openVendorRequested', undefined);
      if (state.active) {
        this.openVendorMenu(scene, state);
      }
    }
  }

  private activateRelic(scene: SnakeScene, state = this.readState(scene)): void {
    this.system.activateRelic(state);
    this.applyPassiveEffects(scene, state);
    this.writeState(scene, state);
    this.updateHud(scene, state);
    this.refreshPanel(scene, state);
    this.spawnCallout(scene, 'Destiny 3 systems online: Starforged Vanguard.');
    const transmat = pickGuardianTransmatLine(scene.score + scene.snake.length);
    this.spawnLootBanner(scene, transmat.title, transmat.subtitle, '#9df7ff');
  }

  private tickStarforgedBuffs(scene: SnakeScene, state: StarforgedRuntimeState): void {
    if (!state.active) {
      scene.setFlag('starforged.lightbindTicks', undefined);
      scene.setFlag('starforged.lightbindAppleCharges', undefined);
      scene.setFlag('starforged.superSurgeTicks', undefined);
      scene.setFlag('starforged.publicEventTicks', undefined);
      scene.setFlag('starforged.publicEventProgress', undefined);
      scene.setFlag('starforged.publicEventName', undefined);
      scene.skillTree.applyActionStepIntervalScalar(1, 'starforged:lightbind');
      scene.skillTree.applyActionStepIntervalScalar(1, 'starforged:super');
      return;
    }

    const lightbindTicks = Math.max(
      0,
      Number(scene.getFlag<number>('starforged.lightbindTicks') ?? 0) - 1,
    );
    scene.setFlag('starforged.lightbindTicks', lightbindTicks > 0 ? lightbindTicks : undefined);
    scene.skillTree.applyActionStepIntervalScalar(
      lightbindTicks > 0 ? 0.82 : 1,
      'starforged:lightbind',
    );

    const superTicks = Math.max(
      0,
      Number(scene.getFlag<number>('starforged.superSurgeTicks') ?? 0) - 1,
    );
    scene.setFlag('starforged.superSurgeTicks', superTicks > 0 ? superTicks : undefined);
    scene.skillTree.applyActionStepIntervalScalar(superTicks > 0 ? 0.72 : 1, 'starforged:super');
    if (superTicks > 0) {
      const currentShield = Number(scene.getFlag<number>('fortitude.invulnerabilityTicks') ?? 0);
      scene.setFlag('fortitude.invulnerabilityTicks', Math.max(currentShield, 6));
      const progress = state.activityProgress[state.activeActivityId];
      if (progress) {
        progress.objectiveProgress += 3;
        if (state.tick % 10 === 0) {
          progress.encountersCleared += 1;
        }
      }
    }
    const publicEventTicks = Math.max(
      0,
      Number(scene.getFlag<number>('starforged.publicEventTicks') ?? 0) - 1,
    );
    scene.setFlag(
      'starforged.publicEventTicks',
      publicEventTicks > 0 ? publicEventTicks : undefined,
    );
    if (publicEventTicks > 0 && state.tick % 8 === 0) {
      this.advancePublicEvent(scene, state, superTicks > 0 ? 9 : 4, 'survival');
    }
    if (publicEventTicks === 0 && scene.getFlag('starforged.publicEventName')) {
      scene.setFlag('starforged.publicEventName', undefined);
      scene.setFlag('starforged.publicEventProgress', undefined);
    }
    if (state.tick % 30 === 0) {
      const bountyCount = Number(scene.getFlag<number>('starforged.bountyPulse') ?? 0) + 1;
      scene.setFlag('starforged.bountyPulse', bountyCount);
      state.glimmer += 3 + (lightbindTicks > 0 ? 2 : 0) + (superTicks > 0 ? 4 : 0);
      if (bountyCount % 5 === 0) {
        state.legendaryShards += 1;
        state.recentRewards = [
          `Destiny 3 bounty pulse: +1 shard, +${state.glimmer} total glimmer.`,
          ...state.recentRewards,
        ].slice(0, 6);
      }
    }
  }

  private handleRoomDirectorBeat(scene: SnakeScene, state: StarforgedRuntimeState): void {
    if (!state.active) {
      this.lastRoomId = scene.currentRoomId;
      return;
    }
    if (this.lastRoomId === scene.currentRoomId) {
      return;
    }
    const previousRoomId = this.lastRoomId;
    this.lastRoomId = scene.currentRoomId;
    if (!previousRoomId) {
      return;
    }
    const roomBeat = Number(scene.getFlag<number>('starforged.roomBeat') ?? 0) + 1;
    scene.setFlag('starforged.roomBeat', roomBeat);
    const signal = pickDestiny3Signal(roomBeat + scene.score + state.playerPower);
    scene.setFlag('starforged.directorLine', signal.radio);
    scene.setFlag('starforged.signalTitle', signal.title);
    scene.setFlag('starforged.signalModifier', signal.modifier);
    state.abilityEnergy = Math.min(100, state.abilityEnergy + 4);
    state.superEnergy = Math.min(100, state.superEnergy + 3);
    state.glimmer += 5;
    const progress = state.activityProgress[state.activeActivityId];
    if (progress) {
      progress.objectiveProgress += 4;
    }
    this.spawnRoomBanner(scene, signal.title, signal.directive, signal.element);
    this.spawnDestinationSweep(scene, signal.element);
    if (roomBeat % 5 === 0) {
      this.startPublicEvent(scene, state, signal.title);
    }
  }

  private startPublicEvent(
    scene: SnakeScene,
    state: StarforgedRuntimeState,
    signalTitle: string,
  ): void {
    const name = `Public Event: ${signalTitle}`;
    scene.setFlag('starforged.publicEventTicks', 150);
    scene.setFlag('starforged.publicEventProgress', 0);
    scene.setFlag('starforged.publicEventName', name);
    state.recentRewards = [
      `${name} has begun. Charge apples, rooms, and supers.`,
      ...state.recentRewards,
    ].slice(0, 6);
    this.spawnLootBanner(
      scene,
      name,
      'Heroic trigger: keep moving and spend Lightbind energy.',
      '#fff3a8',
    );
    scene.cameras.main.flash(180, 157, 247, 255, false);
  }

  private advancePublicEvent(
    scene: SnakeScene,
    state: StarforgedRuntimeState,
    amount: number,
    source: string,
  ): void {
    const eventName = scene.getFlag<string>('starforged.publicEventName');
    if (!eventName) {
      return;
    }
    const current = Number(scene.getFlag<number>('starforged.publicEventProgress') ?? 0);
    const superTicks = Number(scene.getFlag<number>('starforged.superSurgeTicks') ?? 0);
    const next = Math.min(100, current + amount + (superTicks > 0 ? 3 : 0));
    scene.setFlag('starforged.publicEventProgress', next);
    if (next >= 100) {
      scene.setFlag('starforged.publicEventTicks', undefined);
      scene.setFlag('starforged.publicEventProgress', undefined);
      scene.setFlag('starforged.publicEventName', undefined);
      state.glimmer += 75;
      state.legendaryShards += 3;
      state.abilityEnergy = 100;
      state.superEnergy = Math.min(100, state.superEnergy + 35);
      const message = `${eventName} heroic complete via ${source}: +75 glimmer, +3 shards, ability charged.`;
      state.recentRewards = [message, ...state.recentRewards].slice(0, 6);
      this.spawnLootBanner(scene, 'HEROIC EVENT COMPLETE', message, '#9df7ff');
      this.spawnRewardShower(scene);
      scene.cameras.main.shake(420, 0.018);
    }
  }

  private showDestinyThreeFakeout(scene: SnakeScene, state: StarforgedRuntimeState): void {
    if (this.fakeTitle) {
      return;
    }
    scene.paused = true;
    const width = scene.scale.width;
    const height = scene.scale.height;
    const signal = pickDestiny3Signal(scene.score + scene.snake.length);
    const splash = pickDestiny3TitleSplash(scene.score + scene.snake.length);
    const bg = scene.add.rectangle(0, 0, width, height, 0x02040c, 1).setOrigin(0, 0);
    const vignette = scene.add
      .rectangle(width / 2, height / 2, width * 0.86, height * 0.74, 0x071629, 0.72)
      .setStrokeStyle(2, 0x9df7ff, 0.38);
    const halo = scene.add
      .circle(width / 2, height * 0.36, Math.min(width, height) * 0.24, 0x5f8dff, 0.1)
      .setStrokeStyle(3, 0x9df7ff, 0.42);
    const ringA = scene.add
      .circle(width / 2, height * 0.36, Math.min(width, height) * 0.18, 0x000000, 0)
      .setStrokeStyle(2, 0xe8f8ff, 0.65);
    const ringB = scene.add
      .circle(width / 2, height * 0.36, Math.min(width, height) * 0.3, 0x000000, 0)
      .setStrokeStyle(1, 0x5dd6a2, 0.32);
    const stars: Phaser.GameObjects.GameObject[] = [];
    for (let index = 0; index < 64; index += 1) {
      const star = scene.add.circle(
        Math.random() * width,
        Math.random() * height,
        index % 5 === 0 ? 1.8 : 1,
        index % 3 === 0 ? 0x9df7ff : 0xf2f7ff,
        0.25 + Math.random() * 0.55,
      );
      stars.push(star);
      scene.tweens.add({
        targets: star,
        alpha: 0.08,
        duration: 420 + Math.random() * 900,
        yoyo: true,
        repeat: -1,
      });
    }
    const slash = scene.add
      .rectangle(width / 2, height * 0.36, width * 0.72, 4, 0x9df7ff, 0.56)
      .setAngle(-12);
    const title = scene.add
      .text(width / 2, height * 0.28, 'DESTINY 3', {
        fontFamily: 'Georgia, Times New Roman, serif',
        fontSize: `${Math.min(78, Math.max(48, Math.floor(width / 9)))}px`,
        color: '#f2f7ff',
        align: 'center',
        stroke: '#5f8dff',
        strokeThickness: 4,
      })
      .setOrigin(0.5);
    const subtitle = scene.add
      .text(width / 2, height * 0.45, 'THE SERPENT FRONTIER', {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#9df7ff',
        align: 'center',
      })
      .setOrigin(0.5);
    const bootText = scene.add
      .text(width / 2, height * 0.53, splash.toUpperCase(), {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#b8c7e8',
        align: 'center',
      })
      .setOrigin(0.5);
    const signalText = scene.add
      .text(width / 2, height * 0.56, signal.radio, {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#9df7ff',
        align: 'center',
        wordWrap: { width: Math.min(width - 52, 760) },
      })
      .setOrigin(0.5);
    const button = scene.add
      .text(width / 2, height * 0.62, 'NEW GAME', {
        fontFamily: 'monospace',
        fontSize: '26px',
        color: '#050812',
        backgroundColor: '#e8f8ff',
        padding: { left: 18, right: 18, top: 8, bottom: 8 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    const hint = scene.add
      .text(width / 2, height * 0.74, 'Press Enter or click New Game', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#b8c7e8',
      })
      .setOrigin(0.5);
    const scanlines: Phaser.GameObjects.GameObject[] = [];
    for (let y = 0; y < height; y += 12) {
      scanlines.push(scene.add.rectangle(width / 2, y, width, 1, 0xe8f8ff, 0.035));
    }

    this.fakeTitle = scene.add
      .container(0, 0, [
        bg,
        ...stars,
        vignette,
        halo,
        ringB,
        ringA,
        slash,
        title,
        subtitle,
        bootText,
        signalText,
        button,
        hint,
        ...scanlines,
      ])
      .setDepth(96)
      .setScrollFactor(0);
    scene.tweens.add({ targets: ringA, angle: 360, duration: 9000, repeat: -1 });
    scene.tweens.add({ targets: ringB, angle: -360, duration: 13000, repeat: -1 });
    scene.tweens.add({
      targets: [title, halo],
      scale: 1.035,
      duration: 900,
      yoyo: true,
      repeat: -1,
    });
    scene.tweens.add({
      targets: button,
      alpha: 0.62,
      duration: 520,
      yoyo: true,
      repeat: -1,
    });

    const start = () => {
      if (!this.fakeTitle) return;
      this.fakeTitle.destroy();
      this.fakeTitle = null;
      this.activateRelic(scene, state);
      scene.paused = false;
      this.announce(scene, 'DESTINY 3 loaded. Starforged Vanguard online.', '#9df7ff');
    };
    button.on('pointerdown', start);
    scene.input.keyboard?.once('keydown-ENTER', start);
    scene.input.keyboard?.once('keydown-SPACE', start);
  }

  private updateCinematicOverlay(
    scene: SnakeScene,
    state: StarforgedRuntimeState,
    suppressed: boolean,
  ): void {
    if (!state.active || suppressed) {
      this.cinematicOverlay?.setVisible(false);
      return;
    }
    this.ensureCinematicOverlay(scene);
    if (
      !this.cinematicOverlay ||
      !this.cinematicGraphics ||
      !this.cinematicDirectorText ||
      !this.cinematicSignalText ||
      !this.cinematicBountyText
    ) {
      return;
    }

    this.cinematicOverlay.setVisible(true);
    const width = scene.scale.width;
    const height = scene.scale.height;
    const pulse = 0.5 + Math.sin(scene.time.now / 260) * 0.5;
    const beat = Math.floor(state.tick / 18);
    const signal = pickDestiny3Signal(state.tick + scene.score + state.artifactPower);
    const palette = pickDestiny3Palette(state.tick + state.playerPower);
    const bounties = pickDestiny3Bounties(state.tick + state.season, 3);
    if (beat !== this.lastDirectorBeat) {
      this.lastDirectorBeat = beat;
      scene.setFlag('starforged.directorLine', pickDestiny3DirectorLine(beat + scene.score));
      scene.setFlag('starforged.signalTitle', signal.title);
      scene.setFlag('starforged.signalModifier', signal.modifier);
    }

    const directorLine =
      scene.getFlag<string>('starforged.directorLine') ?? pickDestiny3DirectorLine(beat);
    const lightbindTicks = Number(scene.getFlag<number>('starforged.lightbindTicks') ?? 0);
    const superTicks = Number(scene.getFlag<number>('starforged.superSurgeTicks') ?? 0);
    const activity = this.system.getActivity(state.activeActivityId);
    this.cinematicDirectorText
      .setText(directorLine)
      .setColor('#e8f8ff')
      .setAlpha(0.72 + pulse * 0.18);
    this.cinematicSignalText
      .setText(
        [
          signal.title.toUpperCase(),
          signal.modifier,
          `Activity: ${activity?.name ?? state.activeActivityId}`,
          `Surges: Lightbind ${lightbindTicks > 0 ? lightbindTicks : 'offline'} | Super ${superTicks > 0 ? superTicks : 'offline'}`,
        ].join('\n'),
      )
      .setColor('#9df7ff');
    this.cinematicBountyText
      .setText(
        bounties
          .map(
            (bounty) =>
              `${bounty.name}: ${bounty.objective.replace('Complete a Destiny 3 loop: ', '')}`,
          )
          .join('\n'),
      )
      .setColor('#fff3a8');

    this.cinematicGraphics.clear();
    this.cinematicGraphics.fillStyle(0x02040c, 0.08).fillRect(0, 0, width, height);
    this.cinematicGraphics.lineStyle(1, palette.primary, 0.04);
    for (let y = 0; y < height; y += 6) {
      this.cinematicGraphics.lineBetween(0, y, width, y);
    }
    this.cinematicGraphics.lineStyle(2, palette.primary, 0.28 + pulse * 0.16);
    this.cinematicGraphics.strokeRect(10, 10, width - 20, height - 20);
    this.cinematicGraphics.lineStyle(4, palette.secondary, 0.24);
    this.cinematicGraphics.lineBetween(18, 34, 140, 34);
    this.cinematicGraphics.lineBetween(width - 140, 34, width - 18, 34);
    this.cinematicGraphics.lineBetween(18, height - 34, 140, height - 34);
    this.cinematicGraphics.lineBetween(width - 140, height - 34, width - 18, height - 34);
    this.cinematicGraphics.fillStyle(palette.primary, 0.09 + pulse * 0.05);
    this.cinematicGraphics.fillCircle(width / 2, height / 2, Math.min(width, height) * 0.33);
    this.cinematicGraphics.lineStyle(2, palette.accent, 0.22 + pulse * 0.2);
    this.cinematicGraphics.strokeCircle(width / 2, height / 2, Math.min(width, height) * 0.24);
    this.cinematicGraphics.strokeCircle(width / 2, height / 2, Math.min(width, height) * 0.12);
    this.cinematicGraphics.lineStyle(1, palette.primary, 0.25);
    this.cinematicGraphics.lineBetween(width / 2 - 16, height / 2, width / 2 - 5, height / 2);
    this.cinematicGraphics.lineBetween(width / 2 + 5, height / 2, width / 2 + 16, height / 2);
    this.cinematicGraphics.lineBetween(width / 2, height / 2 - 16, width / 2, height / 2 - 5);
    this.cinematicGraphics.lineBetween(width / 2, height / 2 + 5, width / 2, height / 2 + 16);
    if (lightbindTicks > 0) {
      this.cinematicGraphics.fillStyle(0x9df7ff, 0.08).fillRect(0, 0, width, height);
    }
    if (superTicks > 0) {
      this.cinematicGraphics.lineStyle(5, 0xf2f7ff, 0.42 + pulse * 0.2);
      this.cinematicGraphics.strokeCircle(width / 2, height / 2, Math.min(width, height) * 0.42);
    }
  }

  private ensureCinematicOverlay(scene: SnakeScene): void {
    if (this.cinematicOverlay) {
      return;
    }
    const width = scene.scale.width;
    const height = scene.scale.height;
    this.cinematicGraphics = scene.add.graphics().setScrollFactor(0);
    this.cinematicDirectorText = scene.add
      .text(18, height - 42, '', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#e8f8ff',
        stroke: '#02040c',
        strokeThickness: 3,
        wordWrap: { width: Math.min(width - 36, 720) },
      })
      .setOrigin(0, 0);
    this.cinematicSignalText = scene.add
      .text(width - 18, 18, '', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#9df7ff',
        align: 'right',
        stroke: '#02040c',
        strokeThickness: 3,
        lineSpacing: 2,
        wordWrap: { width: Math.min(360, Math.max(220, width * 0.42)) },
      })
      .setOrigin(1, 0);
    this.cinematicBountyText = scene.add
      .text(18, 18, '', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#fff3a8',
        stroke: '#02040c',
        strokeThickness: 3,
        lineSpacing: 2,
        wordWrap: { width: Math.min(360, Math.max(220, width * 0.42)) },
      })
      .setOrigin(0, 0);
    this.cinematicOverlay = scene.add
      .container(0, 0, [
        this.cinematicGraphics,
        this.cinematicDirectorText,
        this.cinematicSignalText,
        this.cinematicBountyText,
      ])
      .setDepth(CINEMATIC_DEPTH)
      .setScrollFactor(0)
      .setVisible(false);
  }

  private openVendorMenu(scene: SnakeScene, state: StarforgedRuntimeState): void {
    if (this.vendorPanel) {
      this.vendorPanel.destroy();
      this.vendorPanel = null;
      scene.paused = false;
      return;
    }
    scene.paused = true;
    const width = Math.min(620, scene.scale.width - 48);
    const height = Math.min(450, scene.scale.height - 56);
    const x = scene.scale.width / 2;
    const y = scene.scale.height / 2;
    const background = scene.add
      .rectangle(0, 0, width, height, 0x071019, 0.95)
      .setStrokeStyle(2, 0x9df7ff, 0.85);
    const header = scene.add
      .text(-width / 2 + 18, -height / 2 + 16, 'HELIOPAUSE ENVOY', {
        fontFamily: 'monospace',
        fontSize: '20px',
        color: '#9df7ff',
      })
      .setOrigin(0, 0);
    const activeSubclass = this.system
      .getSubclasses()
      .find((subclass) => subclass.id === state.loadout.subclassId);
    const body = scene.add
      .text(
        -width / 2 + 18,
        -height / 2 + 52,
        [
          `Class: ${activeSubclass?.name ?? state.loadout.subclassId}`,
          `Power ${this.system.computePlayerPower(state)} | Shards ${state.legendaryShards}`,
          'Choose a Destiny 3 service.',
        ].join('\n'),
        {
          fontFamily: 'monospace',
          fontSize: '14px',
          color: '#e8f8ff',
          lineSpacing: 4,
          wordWrap: { width: width - 36 },
        },
      )
      .setOrigin(0, 0);

    const children: Phaser.GameObjects.GameObject[] = [background, header, body];
    const options = this.buildVendorOptions(state);
    options.forEach((option, index) => {
      const button = scene.add
        .text(-width / 2 + 22, -height / 2 + 122 + index * 42, option.label, {
          fontFamily: 'monospace',
          fontSize: '16px',
          color: option.enabled ? '#f2f7ff' : '#778092',
          backgroundColor: option.enabled ? '#22334a' : '#151b24',
          padding: { left: 10, right: 10, top: 5, bottom: 5 },
        })
        .setOrigin(0, 0)
        .setInteractive({ useHandCursor: option.enabled });
      if (option.enabled) {
        button.on('pointerdown', () => option.run(scene));
      }
      children.push(button);
    });

    const close = scene.add
      .text(width / 2 - 86, height / 2 - 40, 'Close', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#9df7ff',
        backgroundColor: '#22334a',
        padding: { left: 12, right: 12, top: 6, bottom: 6 },
      })
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true });
    close.on('pointerdown', () => {
      this.vendorPanel?.destroy();
      this.vendorPanel = null;
      scene.paused = false;
    });
    children.push(close);

    this.vendorPanel = scene.add.container(x, y, children).setDepth(98).setScrollFactor(0);
  }

  private buildVendorOptions(
    state: StarforgedRuntimeState,
  ): Array<{ label: string; enabled: boolean; run: (scene: SnakeScene) => void }> {
    const subclasses = this.system.getSubclasses().slice(0, 6);
    const options = subclasses.map((subclass) => ({
      label: `${state.loadout.subclassId === subclass.id ? 'Equipped' : 'Tune'}: ${subclass.name}`,
      enabled: state.loadout.subclassId !== subclass.id,
      run: (scene: SnakeScene) => {
        const fresh = this.readState(scene);
        const result = this.system.setSubclass(fresh, subclass.id);
        this.writeState(scene, fresh);
        this.applyPassiveEffects(scene, fresh);
        this.refreshPanel(scene, fresh);
        this.announce(scene, result.message, result.ok ? '#9df7ff' : '#ff6b6b');
        this.vendorPanel?.destroy();
        this.vendorPanel = null;
        scene.paused = false;
      },
    }));

    options.push({
      label: 'Assign next eligible activity',
      enabled: true,
      run: (scene: SnakeScene) => {
        const fresh = this.readState(scene);
        const activity = this.system.activateNextActivity(fresh);
        this.writeState(scene, fresh);
        this.updateHud(scene, fresh);
        this.announce(
          scene,
          activity ? `Assigned: ${activity.name}.` : 'No activity available.',
          '#9df7ff',
        );
        this.vendorPanel?.destroy();
        this.vendorPanel = null;
        scene.paused = false;
      },
    });

    const engrams = Object.values(state.factionProgress).reduce(
      (sum, faction) => sum + faction.engrams,
      0,
    );
    options.push({
      label: `Decode faction engram${engrams > 0 ? ` (${engrams})` : ''}`,
      enabled: engrams > 0,
      run: (scene: SnakeScene) => {
        const fresh = this.readState(scene);
        const result = this.system.claimFactionEngram(fresh);
        this.writeState(scene, fresh);
        this.refreshPanel(scene, fresh);
        this.announce(scene, result.message, result.ok ? '#9df7ff' : '#fff3a8');
        this.vendorPanel?.destroy();
        this.vendorPanel = null;
        scene.paused = false;
      },
    });

    return options;
  }

  private spendAbility(scene: SnakeScene): void {
    const state = this.readState(scene);
    const result = this.system.spendAbility(state);
    if (result.scoreBonus > 0) {
      scene.addScore(result.scoreBonus, 'starforged');
    }
    if (result.shieldTicks > 0) {
      const current = Number(scene.getFlag<number>('fortitude.invulnerabilityTicks') ?? 0);
      scene.setFlag('fortitude.invulnerabilityTicks', Math.max(current, result.shieldTicks));
    }
    if (result.ok) {
      scene.setFlag('starforged.lightbindTicks', 35);
      scene.setFlag('starforged.lightbindAppleCharges', 3);
      this.spawnAbilityBurst(scene);
    }
    this.writeState(scene, state);
    this.updateHud(scene, state);
    this.announce(scene, result.message, result.ok ? '#9df7ff' : '#fff3a8');
  }

  private spendSuper(scene: SnakeScene): void {
    const state = this.readState(scene);
    const result = this.system.spendSuper(state);
    if (result.scoreBonus > 0) {
      scene.addScore(result.scoreBonus, 'starforged');
    }
    if (result.growthBonus > 0) {
      scene.growSnake(result.growthBonus);
    }
    if (result.shieldTicks > 0) {
      const current = Number(scene.getFlag<number>('fortitude.invulnerabilityTicks') ?? 0);
      scene.setFlag('fortitude.invulnerabilityTicks', Math.max(current, result.shieldTicks));
    }
    if (result.ok) {
      scene.setFlag('starforged.superSurgeTicks', 80);
      const progress = state.activityProgress[state.activeActivityId];
      if (progress) {
        progress.objectiveProgress += 80;
        progress.encountersCleared += 2;
      }
      this.spawnSuperBurst(scene);
    }
    this.writeState(scene, state);
    this.updateHud(scene, state);
    this.announce(scene, result.message, result.ok ? '#9df7ff' : '#fff3a8');
  }

  private spawnAbilityBurst(scene: SnakeScene): void {
    const head = scene.snake[0];
    if (!head) {
      return;
    }
    const cell = scene.grid.cell;
    const x = head.x * cell + cell / 2;
    const y = head.y * cell + cell / 2;
    const ring = scene.add
      .circle(x, y, cell * 0.8, 0x9df7ff, 0.16)
      .setStrokeStyle(2, 0xe8f8ff, 0.9)
      .setDepth(27)
      .setBlendMode(Phaser.BlendModes.ADD);
    scene.tweens.add({
      targets: ring,
      scale: 2.2,
      alpha: 0,
      duration: 360,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    });
  }

  private spawnSuperBurst(scene: SnakeScene): void {
    const head = scene.snake[0];
    if (!head) {
      return;
    }
    const cell = scene.grid.cell;
    const x = head.x * cell + cell / 2;
    const y = head.y * cell + cell / 2;
    for (let index = 0; index < 3; index += 1) {
      const ring = scene.add
        .circle(x, y, cell * (0.9 + index * 0.35), 0x5f8dff, 0.12)
        .setStrokeStyle(3 - index * 0.5, index % 2 === 0 ? 0x9df7ff : 0xf2f7ff, 0.9)
        .setDepth(28)
        .setBlendMode(Phaser.BlendModes.ADD);
      scene.tweens.add({
        targets: ring,
        scale: 3.4 + index * 0.55,
        alpha: 0,
        duration: 560 + index * 120,
        ease: 'Cubic.easeOut',
        onComplete: () => ring.destroy(),
      });
    }
  }

  private readState(scene: SnakeScene): StarforgedRuntimeState {
    return this.system.normalizeState(scene.getFlag<StarforgedRuntimeState>(STATE_FLAG));
  }

  private writeState(scene: SnakeScene, state: StarforgedRuntimeState): void {
    const suit = state.active ? this.pickCurrentGuardianSuit(state) : undefined;
    scene.setFlag(STATE_FLAG, state);
    scene.setFlag('starforged.active', state.active ? true : undefined);
    scene.setFlag('starforged.available', state.active ? true : undefined);
    scene.setFlag(
      'starforged.power',
      state.active ? this.system.computePlayerPower(state) : undefined,
    );
    scene.setFlag('starforged.superEnergy', state.active ? state.superEnergy : undefined);
    scene.setFlag('starforged.abilityEnergy', state.active ? state.abilityEnergy : undefined);
    scene.setFlag(
      'starforged.pauseMenuLines',
      state.active ? this.buildPauseMenuLines(scene, state) : undefined,
    );
    scene.setFlag('starforged.guardianSuitName', suit?.name);
    scene.setFlag('starforged.guardianShaderName', suit?.shaderName);
    scene.setFlag('starforged.guardianSuitElement', suit?.element);
    scene.setFlag(
      'starforged.snakePalette',
      state.active ? this.buildGuardianSnakePalette(state) : undefined,
    );
    scene.setFlag(
      'starforged.guardianSuitLines',
      state.active ? this.buildGuardianSuitLines(state) : undefined,
    );
  }

  private applyPassiveEffects(scene: SnakeScene, state: StarforgedRuntimeState): void {
    if (!state.active) {
      scene.setFlag('starforged.effects', undefined);
      scene.setFlag('starforged.wallSenseBonus', undefined);
      scene.skillTree.applyActionStepIntervalScalar(1, 'starforged');
      scene.skillTree.applyActionStepIntervalScalar(1, 'starforged:lightbind');
      scene.skillTree.applyActionStepIntervalScalar(1, 'starforged:super');
      return;
    }
    const effects = this.system.computeAppliedEffects(state);
    scene.setFlag('starforged.effects', effects);
    scene.setFlag(
      'starforged.wallSenseBonus',
      effects.wallSense > 0 ? effects.wallSense : undefined,
    );
    const existingSense = Number(scene.getFlag<number>('equipment.wallSenseRadiusBonus') ?? 0);
    scene.setFlag(
      'equipment.wallSenseRadiusBonus',
      Math.max(existingSense, effects.wallSense) || undefined,
    );
    if (effects.shieldTicks > 0 && state.tick % 20 === 0) {
      const current = Number(scene.getFlag<number>('fortitude.invulnerabilityTicks') ?? 0);
      scene.setFlag(
        'fortitude.invulnerabilityTicks',
        Math.max(current, Math.min(8, effects.shieldTicks)),
      );
    }
    scene.skillTree.applyActionStepIntervalScalar(effects.speedScalar, 'starforged');
  }

  private buildPauseMenuLines(scene: SnakeScene, state: StarforgedRuntimeState): string[] {
    const activity = this.system.getActivity(state.activeActivityId);
    const effects = this.system.computeAppliedEffects(state);
    const progress = state.activityProgress[state.activeActivityId];
    const signal = pickDestiny3Signal(state.tick + scene.score + state.artifactPower);
    const bounties = pickDestiny3Bounties(state.tick + state.season, 5);
    const directorLine =
      scene.getFlag<string>('starforged.directorLine') ?? pickDestiny3DirectorLine(state.tick);
    const equipped = this.system
      .getEquippedDefinitions(state)
      .map((gear) => `${gear.slot}: ${gear.name}`)
      .slice(0, 8);
    const suitLines = this.buildGuardianSuitLines(state);
    const lightbindTicks = Number(scene.getFlag<number>('starforged.lightbindTicks') ?? 0);
    const lightbindCharges = Number(scene.getFlag<number>('starforged.lightbindAppleCharges') ?? 0);
    const superTicks = Number(scene.getFlag<number>('starforged.superSurgeTicks') ?? 0);
    const eventName = scene.getFlag<string>('starforged.publicEventName');
    const eventProgress = Number(scene.getFlag<number>('starforged.publicEventProgress') ?? 0);
    return [
      'DESTINY 3',
      signal.title,
      directorLine,
      '',
      `Power ${this.system.computePlayerPower(state)}  Artifact +${state.artifactPower}`,
      `Subclass ${state.loadout.subclassId.replace('subclass-', '')}`,
      `Glimmer ${state.glimmer}  Shards ${state.legendaryShards}`,
      `Super ${Math.floor(state.superEnergy)}/100  Ability ${Math.floor(state.abilityEnergy)}/100`,
      '',
      `Activity: ${activity?.name ?? state.activeActivityId}`,
      `Objective ${Math.floor(progress?.objectiveProgress ?? 0)}/${activity?.objective.target ?? 0}`,
      `Encounters ${progress?.encountersCleared ?? 0}  Clears ${progress?.completions ?? 0}`,
      '',
      `Passive: +${effects.scoreBonus} apple score, +${effects.growthBonus} growth, wall sense +${effects.wallSense}`,
      `Combat: shield +${effects.shieldTicks}, speed x${effects.speedScalar.toFixed(2)}, recharge +${effects.abilityRecharge}`,
      `Lightbind: ${lightbindTicks > 0 ? `${lightbindTicks} ticks, ${lightbindCharges} apples primed` : 'offline'}`,
      `Super Surge: ${superTicks > 0 ? `${superTicks} ticks of speed, shields, activity progress` : 'offline'}`,
      `Public Event: ${eventName ? `${eventName} ${eventProgress}/100` : 'none'}`,
      '',
      'Signal',
      signal.directive,
      signal.rewardHook,
      `Visual: ${signal.visualMotif}`,
      '',
      'Guardian Suit',
      ...suitLines,
      '',
      'Bounties',
      ...bounties.map((bounty) => `- ${bounty.name}: ${bounty.objective} (${bounty.reward})`),
      '',
      'Equipped',
      ...(equipped.length > 0 ? equipped : ['No gear equipped.']),
      '',
      'Recent',
      ...(state.recentRewards.length > 0
        ? state.recentRewards.slice(0, 6)
        : ['No recent rewards.']),
    ];
  }

  private buildGuardianSnakePalette(state: StarforgedRuntimeState): {
    baseColor: string;
    bellyColor: string;
    patternColor: string;
    outlineColor: string;
    eyeColor: string;
  } {
    const suit = this.pickCurrentGuardianSuit(state);
    const equipped = this.system.getEquippedDefinitions(state);
    const exoticCount = equipped.filter(
      (gear) => gear.rarity === 'exotic' || gear.rarity === 'mythic',
    ).length;
    const elementalAccent = this.cssForElement(suit.element);
    return {
      baseColor: exoticCount > 0 ? elementalAccent : suit.baseColor,
      bellyColor: suit.bellyColor,
      patternColor: equipped.length >= 5 ? '#ffffff' : suit.patternColor,
      outlineColor: suit.outlineColor,
      eyeColor: suit.eyeColor,
    };
  }

  private buildGuardianSuitLines(state: StarforgedRuntimeState): string[] {
    return buildGuardianSuitSummary(
      this.computeGuardianSuitIndex(state),
      this.system.getEquippedDefinitions(state),
    ).slice(0, 9);
  }

  private pickCurrentGuardianSuit(state: StarforgedRuntimeState): GuardianSuitProfile {
    return pickGuardianSuitProfile(this.computeGuardianSuitIndex(state));
  }

  private computeGuardianSuitIndex(state: StarforgedRuntimeState): number {
    const equippedKey = this.system
      .getEquippedDefinitions(state)
      .map((gear) => `${gear.slot}:${gear.id}:${gear.rarity}:${gear.element}:${gear.power}`)
      .sort()
      .join('|');
    return this.hashString(
      [
        state.loadout.subclassId,
        state.activeActivityId,
        Math.floor(this.system.computePlayerPower(state) / 10),
        state.artifactPower,
        equippedKey,
      ].join('::'),
    );
  }

  private hashString(value: string): number {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      hash = Math.imul(hash ^ value.charCodeAt(index), 16777619);
    }
    return hash >>> 0;
  }

  private ensureHud(scene: SnakeScene): void {
    if (this.hud) {
      return;
    }
    this.hud = scene.add
      .text(12, 94, '', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#e8f8ff',
        stroke: '#05060a',
        strokeThickness: 4,
        lineSpacing: 2,
      })
      .setDepth(HUD_DEPTH)
      .setScrollFactor(0);
  }

  private updateHud(scene: SnakeScene, state: StarforgedRuntimeState): void {
    this.ensureHud(scene);
    if (!this.hud) {
      return;
    }
    const lines = this.system.getDisplaySummary(state);
    const recent = state.active ? state.recentRewards[0] : undefined;
    this.hud.setText(recent ? [...lines, recent].join('\n') : lines.join('\n'));
    this.hud.setVisible(!scene.getFlag<boolean>('ui.suppressHud') && state.active);

    if (state.active && state.activeActivityId !== this.lastActivityId) {
      const activity = this.system.getActivity(state.activeActivityId);
      if (activity) {
        this.spawnCallout(scene, `New Activity: ${activity.name}`);
      }
      this.lastActivityId = state.activeActivityId;
    }
  }

  private togglePanel(scene: SnakeScene): void {
    const state = this.readState(scene);
    if (!state.active) {
      return;
    }
    const next = !scene.getFlag<boolean>('starforged.panelOpen');
    scene.setFlag('starforged.panelOpen', next ? true : undefined);
    this.refreshPanel(scene, state);
  }

  private refreshPanel(scene: SnakeScene, state: StarforgedRuntimeState): void {
    if (!scene.getFlag<boolean>('starforged.panelOpen')) {
      this.panel?.setVisible(false);
      return;
    }
    if (!this.panel) {
      this.panel = this.createPanel(scene);
    }
    const text = this.panel.getByName('text') as Phaser.GameObjects.Text | null;
    if (text) {
      text.setText(this.buildPanelText(state));
    }
    this.panel.setVisible(true);
  }

  private createPanel(scene: SnakeScene): Phaser.GameObjects.Container {
    const width = Math.min(560, scene.scale.width - 48);
    const height = Math.min(420, scene.scale.height - 64);
    const x = scene.scale.width / 2;
    const y = scene.scale.height / 2;
    const panel = scene.add
      .rectangle(0, 0, width, height, 0x071019, 0.93)
      .setStrokeStyle(2, 0x9df7ff, 0.8);
    const text = scene.add
      .text(-width / 2 + 18, -height / 2 + 16, '', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#e8f8ff',
        lineSpacing: 3,
        wordWrap: { width: width - 36 },
      })
      .setName('text');
    return scene.add.container(x, y, [panel, text]).setDepth(PANEL_DEPTH).setScrollFactor(0);
  }

  private buildPanelText(state: StarforgedRuntimeState): string {
    if (!state.active) {
      return [
        'STARFORGED RELIC',
        '',
        'Status: awake, unbound',
        'Find the Heliopause recruiter and press E to join.',
        '',
        'Lore: a recruiter from a failed sequel timeline has mistaken this snake for a fireteam.',
      ].join('\n');
    }

    const activity = this.system.getActivity(state.activeActivityId);
    const activityProgress = activity ? state.activityProgress[activity.id] : undefined;
    const effects = this.system.computeAppliedEffects(state);
    const equipped = this.system.getEquippedDefinitions(state);
    const signal = pickDestiny3Signal(state.tick + state.playerPower);
    const suit = this.pickCurrentGuardianSuit(state);
    const drops = state.recentDrops.slice(0, 5).map((drop) => this.describeDrop(drop));
    const factions = Object.values(state.factionProgress)
      .slice(0, 4)
      .map((faction) => `${faction.factionId}: rank ${faction.rank}, rep ${faction.reputation}`);

    return [
      `DESTINY 3 // STARFORGED VANGUARD  Power ${this.system.computePlayerPower(state)}`,
      signal.title,
      signal.radio,
      `Super ${Math.floor(state.superEnergy)}/100  Ability ${Math.floor(state.abilityEnergy)}/100`,
      `Suit ${suit.name} | Shader ${suit.shaderName} | Element ${suit.element}`,
      '',
      `Activity: ${activity?.name ?? 'None'}`,
      activity && activityProgress
        ? `Objective: ${activityProgress.objectiveProgress}/${activity.objective.target} ${activity.objective.kind}`
        : 'Objective: none',
      '',
      'Equipped',
      ...equipped
        .slice(0, 8)
        .map((gear) => `- ${gear.slot}: ${gear.name} (${gear.rarity}, ${gear.element})`),
      '',
      `Effects: +${effects.scoreBonus} apple score, wall sense +${effects.wallSense}, speed x${effects.speedScalar.toFixed(2)}, loot +${effects.lootLuck}`,
      '',
      'Recent Drops',
      ...(drops.length ? drops : ['- none yet']),
      '',
      'Factions',
      ...factions.map((line) => `- ${line}`),
      '',
      'Keys: L close, Z ability, X super',
    ].join('\n');
  }

  private describeDrop(drop: StarforgedGearRoll): string {
    const gear = this.system.getGear(drop.definitionId);
    return `- ${gear?.name ?? drop.definitionId} P${drop.power} [${drop.perks.join(', ')}]`;
  }

  private applyCompletion(
    scene: SnakeScene,
    _state: StarforgedRuntimeState,
    result: StarforgedActivityResult,
  ): void {
    if (result.scoreBonus > 0) {
      scene.addScore(result.scoreBonus, 'starforged');
    }
    if (result.growthBonus > 0) {
      scene.growSnake(result.growthBonus);
    }
    if (result.shieldTicks > 0) {
      const current = Number(scene.getFlag<number>('fortitude.invulnerabilityTicks') ?? 0);
      scene.setFlag('fortitude.invulnerabilityTicks', Math.max(current, result.shieldTicks));
    }
    if (result.message) {
      scene.setFlag('ui.questInteraction', { message: result.message });
      this.spawnCallout(scene, result.message);
      this.spawnLootBanner(scene, 'ACTIVITY COMPLETE', result.message, '#9df7ff');
      this.spawnRewardShower(scene);
      scene.cameras.main.flash(160, 255, 243, 168, false);
    }
  }

  private announce(scene: SnakeScene, message: string, color = '#9df7ff'): void {
    const sceneAny = scene as unknown as {
      showQuestHintPopup?: (message: string, color?: string) => void;
    };
    if (typeof sceneAny.showQuestHintPopup === 'function') {
      sceneAny.showQuestHintPopup(message, color);
    } else {
      this.spawnCallout(scene, message);
    }
  }

  private spawnCallout(scene: SnakeScene, message: string): void {
    if (this.callout) {
      this.callout.destroy();
      this.callout = null;
    }
    const width = scene.grid.cols * scene.grid.cell;
    const text = scene.add
      .text(width / 2, 72, message, {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#9df7ff',
        stroke: '#05060a',
        strokeThickness: 5,
        align: 'center',
        wordWrap: { width: Math.max(260, width - 80) },
      })
      .setOrigin(0.5)
      .setDepth(42)
      .setAlpha(0.98);

    this.callout = text;
    scene.tweens.add({
      targets: text,
      y: 54,
      alpha: 0,
      duration: 2200,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        if (text.active) {
          text.destroy();
        }
        if (this.callout === text) {
          this.callout = null;
        }
      },
    });
  }

  private spawnRoomBanner(
    scene: SnakeScene,
    title: string,
    subtitle: string,
    element: string,
  ): void {
    this.roomBanner?.destroy();
    const width = scene.scale.width;
    const palette = pickDestiny3Palette(title.length + scene.score);
    const bg = scene.add
      .rectangle(0, 0, Math.min(width - 44, 620), 74, 0x02040c, 0.82)
      .setStrokeStyle(2, palette.primary, 0.7);
    const titleText = scene.add
      .text(-bg.width / 2 + 16, -26, title.toUpperCase(), {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#f2f7ff',
        stroke: '#02040c',
        strokeThickness: 3,
      })
      .setOrigin(0, 0);
    const subtitleText = scene.add
      .text(-bg.width / 2 + 16, 0, `${element.toUpperCase()} SIGNAL // ${subtitle}`, {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#9df7ff',
        stroke: '#02040c',
        strokeThickness: 3,
        wordWrap: { width: bg.width - 32 },
      })
      .setOrigin(0, 0);
    const root = scene.add
      .container(width / 2, 94, [bg, titleText, subtitleText])
      .setDepth(94)
      .setScrollFactor(0)
      .setAlpha(0);
    this.roomBanner = root;
    scene.tweens.add({
      targets: root,
      y: 82,
      alpha: 1,
      duration: 180,
      ease: 'Cubic.easeOut',
      yoyo: true,
      hold: 1450,
      onComplete: () => {
        root.destroy();
        if (this.roomBanner === root) {
          this.roomBanner = null;
        }
      },
    });
  }

  private spawnLootBanner(scene: SnakeScene, title: string, body: string, color: string): void {
    this.lootBanner?.destroy();
    const width = scene.scale.width;
    const bg = scene.add
      .rectangle(0, 0, Math.min(width - 38, 680), 88, 0x071019, 0.92)
      .setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(color).color, 0.78);
    const titleText = scene.add
      .text(-bg.width / 2 + 16, -32, title, {
        fontFamily: 'monospace',
        fontSize: '18px',
        color,
        stroke: '#02040c',
        strokeThickness: 4,
      })
      .setOrigin(0, 0);
    const bodyText = scene.add
      .text(-bg.width / 2 + 16, -4, body, {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#e8f8ff',
        stroke: '#02040c',
        strokeThickness: 3,
        wordWrap: { width: bg.width - 32 },
      })
      .setOrigin(0, 0);
    const root = scene.add
      .container(width / 2, scene.scale.height * 0.72, [bg, titleText, bodyText])
      .setDepth(95)
      .setScrollFactor(0);
    this.lootBanner = root;
    scene.tweens.add({
      targets: root,
      scale: 1.035,
      alpha: 0,
      duration: 2200,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        root.destroy();
        if (this.lootBanner === root) {
          this.lootBanner = null;
        }
      },
    });
  }

  private spawnDestinationSweep(scene: SnakeScene, element: string): void {
    const color = this.colorForElement(element);
    const sweep = scene.add
      .rectangle(
        -scene.scale.width * 0.25,
        scene.scale.height / 2,
        scene.scale.width * 0.45,
        scene.scale.height * 1.4,
        color,
        0.12,
      )
      .setAngle(-18)
      .setDepth(88)
      .setScrollFactor(0)
      .setBlendMode(Phaser.BlendModes.ADD);
    scene.tweens.add({
      targets: sweep,
      x: scene.scale.width * 1.25,
      alpha: 0,
      duration: 520,
      ease: 'Cubic.easeOut',
      onComplete: () => sweep.destroy(),
    });
  }

  private spawnAppleLightMotes(scene: SnakeScene, state: StarforgedRuntimeState): void {
    const head = scene.snake[0];
    if (!head) {
      return;
    }
    const color = pickDestiny3Palette(state.tick + state.playerPower).primary;
    const cell = scene.grid.cell;
    const x = head.x * cell + cell / 2;
    const y = head.y * cell + cell / 2;
    for (let index = 0; index < 5; index += 1) {
      const mote = scene.add
        .circle(x, y, 2 + index * 0.3, color, 0.75)
        .setDepth(29)
        .setBlendMode(Phaser.BlendModes.ADD);
      scene.tweens.add({
        targets: mote,
        x: x + Math.cos((Math.PI * 2 * index) / 5) * (20 + index * 4),
        y: y + Math.sin((Math.PI * 2 * index) / 5) * (20 + index * 4),
        alpha: 0,
        scale: 2.2,
        duration: 520,
        ease: 'Cubic.easeOut',
        onComplete: () => mote.destroy(),
      });
    }
  }

  private spawnRewardShower(scene: SnakeScene): void {
    const width = scene.scale.width;
    const height = scene.scale.height;
    for (let index = 0; index < 22; index += 1) {
      const palette = pickDestiny3Palette(index);
      const mote = scene.add
        .rectangle(width / 2, height * 0.35, 5, 12, palette.primary, 0.82)
        .setDepth(96)
        .setScrollFactor(0)
        .setAngle(index * 17)
        .setBlendMode(Phaser.BlendModes.ADD);
      scene.tweens.add({
        targets: mote,
        x: width / 2 + Math.cos((Math.PI * 2 * index) / 22) * (80 + (index % 5) * 22),
        y: height * 0.35 + Math.sin((Math.PI * 2 * index) / 22) * (50 + (index % 4) * 18),
        alpha: 0,
        scale: 2,
        angle: mote.angle + 180,
        duration: 900,
        ease: 'Cubic.easeOut',
        onComplete: () => mote.destroy(),
      });
    }
  }

  private colorForElement(element: string): number {
    switch (element) {
      case 'solar':
        return 0xffd166;
      case 'void':
        return 0xb58cff;
      case 'arc':
        return 0x7cf7ff;
      case 'stasis':
        return 0xbde6ff;
      case 'strand':
        return 0x78ff9d;
      case 'prismatic':
        return 0xffbdfd;
      default:
        return 0x9df7ff;
    }
  }

  private cssForElement(element: string): string {
    return `#${this.colorForElement(element).toString(16).padStart(6, '0')}`;
  }
}

export default new StarforgedVanguardFeature();
